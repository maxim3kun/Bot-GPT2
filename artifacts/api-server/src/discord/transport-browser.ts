import {
  FranceTransportClient, isStaticScheduleResource, isGtfsRealtimeResource, modeMatches,
  type CatalogResource, type TransportLocation, type TransportSource,
} from "./public-transport.js";
import { normalizeTransitText, type TransitMode } from "./transport-query.js";
import {
  scanRoutesAtStops, buildJourneyIndex, journeyPairs, scheduledJourneys, realtimeJourneys,
  type JourneyIndex, type JourneyStop,
} from "./gtfs-journey.js";
import { logger } from "../lib/logger.js";
import { addConnections, connectionPaths } from "./gtfs-connections.js";
import { connectedJourneys, formatConnections } from "./transport-connections.js";
import { departureCards } from "./transport-presentation.js";
import type { APIEmbed } from "discord.js";
import { isIdfmGtfs, type GtfsSelection } from "./gtfs-selective.js";
import { IdfmLiveClient, idfmLineCode, idfmTimeAllowed, ruleActive, stopAffected, stopClosed, type IdfmTraffic } from "./idfm-live.js";

export interface TransportLine {
  routeId: string;
  label: string;
  description: string;
  mode: TransitMode;
  nearbyStopIds: string[];
  resource: CatalogResource;
  realtime: CatalogResource[];
  source: TransportSource;
  selection?: GtfsSelection;
}
export interface StopGroup { label: string; ids: string[]; viaTransfer?: boolean }
export interface LineListing { lines: TransportLine[]; unavailable: number; targeted?: boolean; networkScoped?: boolean }
export interface TransportDepartureResult {
  content: string;
  source: TransportSource;
  embed?: APIEmbed;
  expandedEmbed?: APIEmbed;
  expandedContent?: string;
  hasMore?: boolean;
}
export const MODE_NAMES: Record<TransitMode, string> = { bus: "Bus", metro: "Métro", tram: "Tram", rail: "Train / RER" };

function publishedRouteCount(resource: CatalogResource): number {
  const stats = resource.metadata?.stats;
  const count = stats && typeof stats === "object" && "routes_count" in stats ? Number(stats.routes_count) : NaN;
  return Number.isFinite(count) && count > 0 ? count : Number.MAX_SAFE_INTEGER;
}

function publishedModes(resource: CatalogResource): string[] | undefined {
  const modes = resource.modes ?? resource.metadata?.modes;
  return Array.isArray(modes) && modes.every((mode) => typeof mode === "string") ? modes : undefined;
}

export function groupStops(stops: JourneyStop[]): StopGroup[] {
  const groups = new Map<string, StopGroup>();
  for (const stop of stops) {
    // Only an official parent_station establishes that differently named
    // platforms belong to the same station; never infer it from proximity.
    const key = stop.parent ? `station:${stop.parent}` : `name:${normalizeTransitText(stop.name)}`;
    const group = groups.get(key) ?? { label: stop.stationName || stop.name, ids: [] };
    if (!group.ids.includes(stop.id)) group.ids.push(stop.id);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label, "fr", { numeric: true }));
}

export function originOptions(index: JourneyIndex, line: TransportLine): StopGroup[] {
  const nearby = new Set(line.nearbyStopIds);
  const nearbyStations = new Set([...index.stops.values()].filter((stop) => nearby.has(stop.id) && stop.parent)
    .map((stop) => stop.parent));
  const boarding = new Set([...index.visits.values()].flatMap((visits) =>
    visits.filter((visit) => visit.pickup && (nearby.has(visit.stopId) ||
      nearbyStations.has(index.stops.get(visit.stopId)?.parent ?? ""))).map((visit) => visit.stopId)));
  return groupStops([...index.stops.values()].filter((stop) => boarding.has(stop.id)));
}

export function arrivalOptions(index: JourneyIndex, origin: StopGroup): StopGroup[] {
  const ids = new Set(origin.ids);
  const reachable = new Set<string>();
  for (const visits of index.visits.values()) {
    let boarded = false;
    for (const visit of visits) {
      if (boarded && visit.dropoff && !ids.has(visit.stopId)) reachable.add(visit.stopId);
      if (visit.pickup && ids.has(visit.stopId)) boarded = true;
    }
  }
  const direct = groupStops([...index.stops.values()].filter((stop) => reachable.has(stop.id)));
  let connected = new Set<string>();
  try { connected = new Set(connectionPaths(index, ids).map((path) => path.second.destination.stopId)); }
  catch (error) {
    index.connectionsUnavailable = true;
    logger.warn({ err: error }, "Transport connection choices exceed supported limits");
  }
  const transfers = groupStops([...(index.connections?.network.stops.values() ?? [])].filter((stop) => connected.has(stop.id)))
    .map((stop) => ({ ...stop, viaTransfer: true }));
  return [...direct, ...transfers];
}

export class TransportBrowserClient {
  private readonly listings = new Map<string, { expires: number; value: LineListing }>();
  private readonly indexes = new Map<string, { expires: number; value: JourneyIndex }>();
  private readonly pending = new Map<string, Promise<unknown>>();
  private readonly unavailableUntil = new Map<number, number>();
  private scanTail: Promise<unknown> = Promise.resolve();
  private queuedScans = 0;

  constructor(readonly provider = new FranceTransportClient(), private readonly now = Date.now,
    readonly idfm = new IdfmLiveClient(fetch, now)) {}

  private usesIdfm(line: TransportLine) { return isIdfmGtfs(line.resource) && !!idfmLineCode(line.routeId); }

  async availableStops(line: TransportLine, index: JourneyIndex, groups: StopGroup[], language: string) {
    if (!this.usesIdfm(line)) return { options: groups, note: "" };
    const traffic = await this.idfm.traffic(line.routeId), at = Math.floor(this.now() / 1000), fr = language === "fr";
    const unknown = traffic.rules.some(r => r.blocking && r.unresolved && ruleActive(r, at));
    if (unknown) return { options: [], note: fr
      ? "Une interruption est signalée mais son périmètre ne peut pas être vérifié. Aucun trajet n’est confirmé."
      : "A disruption is reported but its scope cannot be verified. No journey is confirmed." };
    const closed: string[] = [];
    const options = groups.flatMap(group => {
      const ids = group.ids.filter(id => !stopClosed(traffic, index, id, at));
      if (ids.length !== group.ids.length) closed.push(group.label);
      return ids.length ? [{ ...group, ids }] : [];
    });
    return { options, note: [
      closed.length ? (fr ? "Fermetures prises en compte sur cette ligne : " : "Closures accounted for on this line: ") +
        [...new Set(closed)].join(", ").slice(0, 450) + "." : "",
      !traffic.available ? (fr ? "Alertes de perturbation indisponibles : desserte non confirmée."
        : "Disruption alerts unavailable: service not confirmed.") : "",
    ].filter(Boolean).join("\n") };
  }

  private async scan<T>(load: () => Promise<T>): Promise<T> {
    if (this.queuedScans >= 8) throw new Error("Transport lookups are busy");
    this.queuedScans++;
    const previous = this.scanTail;
    const request = previous.catch(() => undefined).then(load);
    this.scanTail = request.catch(() => undefined);
    try { return await request; } finally { this.queuedScans--; }
  }

  cities(place: string): Promise<TransportLocation[]> { return this.provider.municipalities(place); }

  async lines(city: TransportLocation, mode: TransitMode, requestedLine = ""): Promise<LineListing> {
    const key = `${city.id}:${mode}:${normalizeTransitText(requestedLine)}`;
    const cached = this.listings.get(key);
    if (cached && cached.expires > this.now()) return cached.value;
    const pending = this.pending.get(key);
    if (pending) return pending as Promise<LineListing>;
    const work = this.loadLines(city, mode, requestedLine).then((value) => {
      if (this.listings.size >= 20) this.listings.delete(this.listings.keys().next().value!);
      this.listings.set(key, { value, expires: this.now() + (value.lines.length && (!value.unavailable || requestedLine) ? 300_000 : 30_000) });
      return value;
    }).finally(() => this.pending.delete(key));
    this.pending.set(key, work);
    return work;
  }

  private async loadLines(city: TransportLocation, mode: TransitMode, requestedLine: string): Promise<LineListing> {
    const [catalogue, nearby] = await Promise.all([
      this.provider.getCatalog(), this.provider.nearbyStops(city.latitude, city.longitude, 0.025),
    ]);
    const stopsByResource = new Map<number, Set<string>>();
    for (const feature of nearby.features ?? []) {
      const stop = feature.properties;
      if (!stop?.stop_id || stop.location_type === 2 || stop.location_type === 3 || stop.location_type === 4) continue;
      const resource = Number(stop.resource_id);
      const ids = stopsByResource.get(resource) ?? new Set<string>();
      ids.add(stop.stop_id);
      stopsByResource.set(resource, ids);
    }
    const groups = catalogue.filter((dataset) => dataset.type === "public-transit").flatMap((dataset) =>
      dataset.resources.filter((resource) => stopsByResource.has(resource.id) &&
        isStaticScheduleResource(resource) && modeMatches(mode, publishedModes(resource)))
        .map((resource) => ({ dataset, resource, stopIds: stopsByResource.get(resource.id)! })))
      .sort((a, b) => Number(/agr[eé]gat/i.test(a.dataset.title)) - Number(/agr[eé]gat/i.test(b.dataset.title)) ||
        // Try smaller operator feeds before European/national bundles. A local
        // numbered line should not wait for unrelated long-distance operators.
        publishedRouteCount(a.resource) - publishedRouteCount(b.resource));
    let unavailable = 0;
    let networkScoped = false;
    const found: TransportLine[] = [];
    for (const [id, until] of this.unavailableUntil) if (until <= this.now()) this.unavailableUntil.delete(id);
    // Serialize download + scan together, so a second large ZIP cannot accumulate during parsing.
    let next = 0;
    // A numbered-line request stops at the first official source serving that line
    // locally. Do not make it wait for unrelated networks or aggregate feeds.
    const selectiveMetro = mode === "metro" && groups.some(({ resource }) => isIdfmGtfs(resource));
    await Promise.all(Array.from({ length: Math.min(requestedLine || selectiveMetro ? 1 : 2, groups.length) }, async () => {
      while (next < groups.length) {
        const { dataset, resource, stopIds } = groups[next++]!;
        if ((this.unavailableUntil.get(resource.id) ?? 0) > this.now()) { unavailable++; continue; }
        try {
          const selection: GtfsSelection | undefined = mode === "metro" && isIdfmGtfs(resource)
            ? { mode, ...(requestedLine ? { line: requestedLine } : { discoveryStops: [...stopIds] }) } : undefined;
          const routes = await this.scan(async () =>
            scanRoutesAtStops(await this.provider.staticFeed(resource, selection), stopIds, requestedLine));
          for (const route of routes) {
            if (route.mode !== mode) continue;
            found.push({ routeId: route.routeId, mode, label: route.shortName || route.longName || route.routeId,
              description: route.longName || dataset.title, nearbyStopIds: route.stopIds, resource,
              realtime: dataset.resources.filter(isGtfsRealtimeResource).slice(0, 2),
              source: { name: dataset.title, url: dataset.page_url }, ...(selection ? { selection } : {}) });
          }
          if (found.length && (requestedLine || selection)) {
            networkScoped = !!selection;
            break;
          }
        } catch (error) {
          unavailable++;
          if (this.unavailableUntil.size >= 64) this.unavailableUntil.delete(this.unavailableUntil.keys().next().value!);
          this.unavailableUntil.set(resource.id, this.now() + 60_000);
          logger.warn({ resourceId: resource.id, err: error }, "Transport browser source unavailable");
        }
      }
    }));
    // An aggregate and its underlying operator often publish the exact same routes.
    const unique = new Map<string, TransportLine>();
    for (const line of found.sort((a, b) =>
      Number(/agr[eé]gat/i.test(a.source.name)) - Number(/agr[eé]gat/i.test(b.source.name)))) {
      const fingerprint = `${line.mode}:${normalizeTransitText(line.label)}:${normalizeTransitText(line.description)}`;
      if (!unique.has(fingerprint)) unique.set(fingerprint, line);
    }
    return { lines: [...unique.values()].sort((a, b) =>
      a.label.localeCompare(b.label, "fr", { numeric: true }) || a.source.name.localeCompare(b.source.name, "fr")),
      unavailable, ...(requestedLine ? { targeted: true } : {}), ...(networkScoped ? { networkScoped: true } : {}) };
  }

  async index(line: TransportLine): Promise<JourneyIndex> {
    const key = `index:${line.resource.id}:${line.routeId}`;
    const cached = this.indexes.get(key);
    if (cached && cached.expires > this.now()) return cached.value;
    const pending = this.pending.get(key);
    if (pending) return pending as Promise<JourneyIndex>;
    const work = (async () => {
      const value = await this.scan(async () => {
        const selection = line.selection?.discoveryStops ? { mode: line.mode, line: line.label } : line.selection ??
          (line.mode === "metro" && isIdfmGtfs(line.resource) ? { mode: line.mode, line: line.label } : undefined);
        const zip = await this.provider.staticFeed(line.resource, selection);
        const index = await buildJourneyIndex(zip, line.routeId);
        if (selection) {
          // A selective large-network feed intentionally excludes transfers.
          // Do not claim that the whole IDFM network was searched for changes.
          index.connectionsUnavailable = true;
          return index;
        }
        try { await addConnections(zip, index); }
        catch (error) {
          index.connectionsUnavailable = true;
          logger.warn({ err: error, resourceId: line.resource.id }, "Transport connections unavailable; direct index retained");
        }
        return index;
      });
      if (this.indexes.size >= 3) this.indexes.delete(this.indexes.keys().next().value!);
      const deliberateDirectOnly = line.mode === "metro" && isIdfmGtfs(line.resource);
      this.indexes.set(key, { value, expires: this.now() + (value.connectionsUnavailable && !deliberateDirectOnly ? 30_000 : 300_000) });
      return value;
    })().finally(() => this.pending.delete(key));
    this.pending.set(key, work);
    return work;
  }

  async departures(line: TransportLine, index: JourneyIndex, origin: StopGroup, arrival: StopGroup, language: string): Promise<TransportDepartureResult> {
    const french = language === "fr";
    const now = Math.floor(this.now() / 1000);
    const traffic: IdfmTraffic | null = this.usesIdfm(line) ? await this.idfm.traffic(line.routeId) : null;
    const activeRules = traffic?.rules.filter(r => ruleActive(r, now)) ?? [];
    const uncertain = activeRules.find(r => r.blocking && r.unresolved);
    const endpointsClosed = traffic && [origin, arrival].some(group => group.ids.every(id => stopClosed(traffic, index, id, now)));
    if (uncertain || endpointsClosed) {
      const message = uncertain?.message ?? activeRules.find(r => r.blocking &&
        [...origin.ids, ...arrival.ids].some(id => stopAffected(r, index, id)))?.message;
      return { content: (french ? `**${MODE_NAMES[line.mode]} ${line.label} · Trajet non proposé**\n` +
        (endpointsClosed ? "Un arrêt choisi n’est pas desservi actuellement sur cette ligne." : "Une interruption empêche de confirmer ce trajet.")
        : `**${MODE_NAMES[line.mode]} ${line.label} · Journey not offered**\n` +
        (endpointsClosed ? "A selected stop is not served on this line currently." : "A disruption prevents confirming this journey.")) +
        (message ? `\n${message}` : ""), source: line.source };
    }
    if (arrival.viaTransfer) {
      const feeds = (await Promise.all(line.realtime.map(async (resource) => {
        try { return await this.provider.realtimeFeed(resource); }
        catch (error) {
          logger.debug({ resourceId: resource.id, err: error }, "Transport connection realtime unavailable");
          return null;
        }
      }))).filter((feed): feed is Uint8Array => feed !== null);
      const journeys = connectedJourneys(index, origin, arrival, now, feeds);
      return { content: formatConnections(line, index, origin, arrival, journeys, language,
        !journeys.length || journeys.some((journey) => !journey.first.realtime || !journey.second.realtime)), source: line.source };
    }
    const pairs = journeyPairs(index, new Set(origin.ids), new Set(arrival.ids));
    if (!pairs.length) return { content: french ? "Aucun trajet direct ne relie ces deux arrêts dans ce sens."
      : "No direct journey connects these stops in this direction.", source: line.source };
    const schedules = scheduledJourneys(index, pairs, now);
    // A holiday or the last evening service must not look like a broken lookup.
    // Widen only if the ordinary window is empty, retaining the official calendar.
    const laterSchedules = schedules.length ? [] : scheduledJourneys(index, pairs, now, 7);
    const [updates, idfmLive] = await Promise.all([Promise.all(line.realtime.map(async (resource) => {
      try { return realtimeJourneys(await this.provider.realtimeFeed(resource), pairs, now); }
      catch (error) {
        logger.debug({ resourceId: resource.id, err: error }, "Transport journey realtime unavailable");
        return null;
      }
    })), traffic ? this.idfm.passages(line.routeId, index, pairs) : Promise.resolve(null)]);
    const fresh = updates.filter((update) => update?.fresh);
    const cancelled = new Set(fresh.flatMap((update) => [...update!.cancelled]));
    const estimates = idfmLive?.times.length ? idfmLive.times :
      fresh.flatMap((update) => update!.results).filter((time) => !cancelled.has(time.tripId));
    const times = idfmLive?.cancelled ? [] : estimates.length ? estimates : (schedules.length ? schedules : laterSchedules)
      .filter((time) => time.departureAt > now + 24 * 3600 || !cancelled.has(time.tripId));
    const allowed = times.filter(time => !traffic || idfmTimeAllowed(traffic, index, time, origin.ids, arrival.ids));
    const deduped = [...new Map(allowed.map((time) => [`${time.tripId}:${time.departureAt}`, time])).values()]
      .sort((a, b) => a.departureAt - b.departureAt).slice(0, 6);
    const timezone = index.metadata.timezone || "Europe/Paris";
    const later = !estimates.length && !schedules.length && deduped.length
      ? (french ? "Aucun départ prévu dans les prochaines 24 h. Recherche étendue à 7 jours selon le calendrier publié."
        : "No departures scheduled in the next 24 hours. Published-calendar search extended to 7 days.") : "";
    const empty = french ? "Aucun départ trouvé dans les 7 prochains jours selon le calendrier publié pour ces arrêts. Cela ne signifie pas que la ligne n’existe pas."
      : "No departure found within the next 7 days in the published calendar for these stops. This does not mean the route does not exist.";
    const warning = !estimates.length && !idfmLive?.cancelled && (line.realtime.length || traffic)
      ? (french ? "Temps réel indisponible pour ce trajet." : "Live estimates unavailable for this journey.") : "";
    const cancellation = cancelled.size ? (french ? "Courses annulées ou sans desserte exclues."
      : "Cancelled trips and skipped stops excluded.") : "";
    const disruptionNotes = traffic ? [
      !traffic.available ? (french ? "Alertes indisponibles : desserte non confirmée." : "Alerts unavailable: service not confirmed.") : "",
      times.length !== allowed.length ? (french ? "Passages touchés par une fermeture exclus." : "Departures affected by a closure excluded.") : "",
      idfmLive?.cancelled ? (french ? "Passages annoncés supprimés par l’exploitant." : "Reported departures cancelled by the operator.") : "",
      estimates.some(t => t.arrivalAt == null) ? (french ? "Heure d’arrivée non communiquée en temps réel."
        : "Real-time arrival estimate not provided.") : "",
      ...activeRules.filter(r => !r.blocking && [...origin.ids, ...arrival.ids].some(id => stopAffected(r, index, id)))
        .slice(0, 2).map(r => r.message),
    ].filter(Boolean) : [];
    return { ...departureCards({ title: `${MODE_NAMES[line.mode]} ${line.label}`, origin: origin.label, arrival: arrival.label,
      multiPlatform: origin.ids.length > 1, stops: index.stops, times: deduped, timezone, now, french,
      realtime: deduped.some(t => t.realtime) || !!idfmLive?.cancelled, notes: [later, warning, cancellation, ...disruptionNotes].filter(Boolean),
      empty: idfmLive?.cancelled || times.length !== allowed.length ? (french
        ? "Aucun passage confirmé pour ce trajet après prise en compte des perturbations."
        : "No confirmed departure for this journey after accounting for disruptions.") : empty }), source: line.source };
  }
}
