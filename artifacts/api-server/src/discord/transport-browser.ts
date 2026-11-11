import {
  FranceTransportClient, isStaticScheduleResource, isGtfsRealtimeResource, modeMatches,
  type CatalogResource, type CatalogDataset, type TransportLocation, type TransportSource,
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
import { withArrivalApproximations } from "./transport-arrivals.js";
import type { APIEmbed } from "discord.js";
import { isIdfmGtfs, type GtfsSelection } from "./gtfs-selective.js";
import { IdfmLiveClient, idfmLineCode, idfmTimeAllowed, ruleActive, stopAffected, stopClosed, type IdfmTraffic } from "./idfm-live.js";
import type { TransportProvider, TransportTerritory } from "./transport-provider.js";
import { QuebecTransportClient } from "./quebec-transport.js";
import { inBounds, sourceLimitations } from "./quebec-sources.js";
import { parseGtfsAlerts } from "./gtfs-alerts.js";
import { localDate } from "./gtfs-realtime.js";
import { TransportDataError } from "./transport-data-error.js";
import { isRegionName, regionalNetworks, type TransportRegion } from "./transport-regions.js";
import { resourceVersion } from "./transport-metadata-cache.js";
import { createHash } from "node:crypto";
import { routeMatchesRequested } from "./transport-query.js";
import { EnglandTransportClient } from "./england-transport.js";

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
  territory?: TransportTerritory;
  alerts?: CatalogResource[];
  allStops?: boolean;
}
export interface StopGroup { label: string; ids: string[]; viaTransfer?: boolean }
export interface LineListing { lines: TransportLine[]; unavailable: number; targeted?: boolean; networkScoped?: boolean; issues?: string[]; centerFallback?: boolean }
export interface TransportDepartureResult {
  content: string;
  source: TransportSource;
  embed?: APIEmbed;
  expandedEmbed?: APIEmbed;
  expandedContent?: string;
  hasMore?: boolean;
}
export const MODE_NAMES: Record<TransitMode, string> = { bus: "Bus", metro: "Métro", tram: "Tram", rail: "Train / RER" };
export const modeName = (mode: TransitMode, territory?: TransportTerritory) =>
  (territory === "qc" || territory === "en") && mode === "rail" ? "Train" : territory === "qc" && mode === "tram" ? "Train léger / tram" : MODE_NAMES[mode];

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
  const stopById = new Map(stops.map(stop => [stop.id, stop]));
  for (const stop of stops) {
    // Only an official parent_station establishes that differently named
    // platforms belong to the same station; never infer it from proximity.
    const key = stop.parent ? `station:${stop.parent}` : `name:${normalizeTransitText(stop.name)}`;
    const group = groups.get(key) ?? { label: stop.stationName || stop.name, ids: [] };
    if (!group.ids.includes(stop.id)) group.ids.push(stop.id);
    groups.set(key, group);
  }
  const result = [...groups.values()];
  const labels = new Map<string, number>();
  for (const group of result) labels.set(normalizeTransitText(group.label), (labels.get(normalizeTransitText(group.label)) ?? 0) + 1);
  for (const group of result) {
    if ((labels.get(normalizeTransitText(group.label)) ?? 0) < 2) continue;
    const letters = [...new Set(group.ids.flatMap(id => {
      const letter = stopById.get(id)?.stopLetter?.trim();
      return letter ? [letter.replace(/^->/, "→")] : [];
    }))];
    if (letters.length) group.label = `${group.label} (${letters.join("/")})`;
  }
  return result.sort((a, b) => a.label.localeCompare(b.label, "fr", { numeric: true }));
}

export function originOptions(index: JourneyIndex, line: TransportLine): StopGroup[] {
  const nearby = new Set(line.nearbyStopIds);
  const nearbyStations = new Set([...index.stops.values()].filter((stop) => nearby.has(stop.id) && stop.parent)
    .map((stop) => stop.parent));
  // A selected IDFM metro line is a city-wide route, not a set of stops near
  // the municipality anchor. The selective line index already contains its
  // complete official stop sequence, so allow every boardable station.
  const fullMetroLine = line.mode === "metro" && isIdfmGtfs(line.resource);
  const boarding = new Set([...index.visits.values()].flatMap((visits) =>
    visits.filter((visit, i) => visit.pickup && visits.some((next, j) => j > i && next.dropoff && next.stopId !== visit.stopId) && (line.allStops || fullMetroLine || nearby.has(visit.stopId) ||
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
  private alertCache = new Map<string, { checked: number; good: number; traffic: IdfmTraffic }>();

  readonly territories = ["fr", "qc", "en"] as const;
  constructor(readonly provider: TransportProvider = new FranceTransportClient(), private readonly now = Date.now,
    readonly idfm = new IdfmLiveClient(fetch, now), readonly quebec: TransportProvider = new QuebecTransportClient(fetch, now),
    readonly england = new EnglandTransportClient()) {}

  private providerFor(territory?: TransportTerritory) { return territory === "qc" ? this.quebec : this.provider; }

  async region(place: string, territory: TransportTerritory = "fr"): Promise<TransportRegion | null> {
    if (territory !== "fr" || !isRegionName(place)) return null;
    const provider = this.provider as FranceTransportClient;
    if (!provider.region) throw new TransportDataError("Référentiel des régions indisponible.");
    return provider.region(place);
  }
  async regionNetworks(region: TransportRegion, mode: TransitMode) {
    return regionalNetworks(await this.provider.getCatalog(), region, mode);
  }
  async regionLines(network: CatalogDataset, mode: TransitMode, requestedLine = ""): Promise<LineListing> {
    const provider = this.providerFor(network.territory);
    if (!provider.referenceRoutes) throw new TransportDataError("Le catalogue des lignes de cette source est indisponible.");
    const lines: TransportLine[] = [];
    let unavailable = 0;
    // Current operator source before a future snapshot of the same network.
    const resources = network.resources.filter(r => isStaticScheduleResource(r) && modeMatches(mode, publishedModes(r)))
      .sort((a, b) => Number(/avenir|future/i.test(a.title)) - Number(/avenir|future/i.test(b.title)) ||
        (b.updated ?? "").localeCompare(a.updated ?? ""));
    for (const resource of resources) {
      try {
        const routes = await provider.referenceRoutes(resource);
        for (const route of routes) if (route.mode === mode && (!requestedLine ||
          routeMatchesRequested(route.routeId, route.shortName, route.longName, requestedLine))) {
          lines.push({ routeId: route.routeId, label: route.shortName || route.longName || route.routeId,
            description: route.longName || network.title, mode, nearbyStopIds: [], allStops: true, resource,
            realtime: network.resources.filter(isGtfsRealtimeResource).slice(0, 2),
            source: { name: network.title, url: network.page_url, updated: resource.updated },
            ...(network.territory ? { territory: network.territory } : {}) });
        }
        if (lines.length) break;
      } catch (error) {
        unavailable++; logger.warn({ resourceId: resource.id, err: error }, "Transport regional route catalogue unavailable");
      }
    }
    return { lines: [...new Map(lines.map(line => [line.routeId, line])).values()]
      .sort((a, b) => a.label.localeCompare(b.label, "fr", { numeric: true })), unavailable, networkScoped: true };
  }

  async networks(city: TransportLocation, mode: TransitMode) {
    if (city.territory === "en") return this.england.networks(city, mode);
    if (city.territory !== "qc") return [];
    return (await this.quebec.getCatalog()).filter(d =>
      (!d.bounds || inBounds(d.bounds, city.latitude, city.longitude)) &&
      (!d.modes || modeMatches(mode, d.modes)) &&
      (d.resources.some(r => isStaticScheduleResource(r) && modeMatches(mode, publishedModes(r))) || !d.resources.length));
  }

  private usesIdfm(line: TransportLine) { return (!line.territory || line.territory === "fr") && isIdfmGtfs(line.resource) && !!idfmLineCode(line.routeId); }

  private async traffic(line: TransportLine, index: JourneyIndex): Promise<IdfmTraffic | null> {
    if (this.usesIdfm(line)) return this.idfm.traffic(line.routeId);
    if (!line.alerts?.length) return null;
    const key = `${line.territory}:${line.resource.id}:${line.routeId}`, old = this.alertCache.get(key), now = this.now();
    if (old && now - old.checked < 12_000) return old.traffic;
    let traffic: IdfmTraffic;
    try {
      const feeds = await Promise.all(line.alerts.map(async r => parseGtfsAlerts(
        await this.providerFor(line.territory).realtimeFeed(r), index, Math.floor(now / 1000))));
      traffic = { available: feeds.every(f => f.available), rules: feeds.flatMap(f => f.rules) };
    } catch { traffic = { available: false, rules: [] }; }
    if (!traffic.available && old && now - old.good < 30 * 60_000) traffic.rules = old.traffic.rules;
    if (this.alertCache.size >= 64) this.alertCache.delete(this.alertCache.keys().next().value!);
    this.alertCache.set(key, { checked: now, good: traffic.available ? now : old?.good ?? 0, traffic });
    return traffic;
  }

  async availableStops(line: TransportLine, index: JourneyIndex, groups: StopGroup[], language: string) {
    if (line.territory === "en") return { options: groups, note: index.sourceWarning ?? "" };
    const traffic = await this.traffic(line, index), at = Math.floor(this.now() / 1000), fr = language === "fr";
    if (!traffic) return { options: groups, note: index.sourceWarning ?? "" };
    const unknown = traffic.rules.some(r => r.blocking && !r.tripIds?.size && r.unresolved && ruleActive(r, at));
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
      index.sourceWarning ?? "",
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

  cities(place: string, territory: TransportTerritory = "fr", mode?: TransitMode | null): Promise<TransportLocation[]> {
    if (territory === "en") return this.england.cities(place, mode);
    if (territory === "fr" && mode === "rail" && this.provider.railLocations) return this.provider.railLocations(place);
    return this.providerFor(territory).municipalities(place);
  }

  async inferTerritory(place: string): Promise<TransportTerritory | undefined> {
    const query = normalizeTransitText(place.replace(/(?:\s+|\s*\()(\d{2,5}|2[ab])\)?$/i, ""));
    if (!query) return undefined;
    if (query === "london" || query === "londres") return "en";
    const [france, quebec] = await Promise.allSettled([
      this.cities(place, "fr", "bus"), this.cities(place, "qc", "bus"),
    ]);
    // A failed gazetteer cannot prove that the other territory is unique.
    if (france.status !== "fulfilled" || quebec.status !== "fulfilled") return undefined;
    const matches = new Set<TransportTerritory>();
    if (france.value.some(city => normalizeTransitText(city.name) === query)) matches.add("fr");
    if (quebec.value.some(city => normalizeTransitText(city.name) === query)) matches.add("qc");
    return matches.size === 1 ? [...matches][0] : undefined;
  }

  async lines(city: TransportLocation, mode: TransitMode, requestedLine = "", networkId?: string): Promise<LineListing> {
    const key = `${city.territory ?? "fr"}:${city.id}:${mode}:${normalizeTransitText(requestedLine)}:${networkId ?? "*"}`;
    const cached = this.listings.get(key);
    if (cached && cached.expires > this.now()) return cached.value;
    const pending = this.pending.get(key);
    if (pending) return pending as Promise<LineListing>;
    const work = this.loadLines(city, mode, requestedLine, networkId).then((value) => {
      if (this.listings.size >= 20) this.listings.delete(this.listings.keys().next().value!);
      this.listings.set(key, { value, expires: this.now() + (value.lines.length && (!value.unavailable || requestedLine) ? 15 * 60_000 : 30_000) });
      return value;
    }).finally(() => this.pending.delete(key));
    this.pending.set(key, work);
    return work;
  }

  private async loadLines(city: TransportLocation, mode: TransitMode, requestedLine: string, networkId?: string): Promise<LineListing> {
    if (city.territory === "en") return this.england.lines(city, mode, requestedLine, networkId);
    const provider = this.providerFor(city.territory);
    let catalogue, nearby, centerFallback = false;
    if (city.territory === "qc") {
      if (!networkId) throw new Error("Select a Québec transport network");
      catalogue = (await provider.getCatalog()).filter(d => d.id === networkId);
      if (catalogue.length !== 1) throw new Error("Unknown Québec network");
      const resources = catalogue.flatMap(d => d.resources.filter(isStaticScheduleResource));
      nearby = await provider.nearbyStopsForResources!(city.latitude, city.longitude, resources);
    } else {
      let anchor = city;
      if (provider.transportAnchor) {
        try { anchor = await provider.transportAnchor(city); }
        catch { centerFallback = true; }
      }
      [catalogue, nearby] = await Promise.all([provider.getCatalog(), provider.nearbyStops(anchor.latitude, anchor.longitude, 0.025)]);
    }
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
      .sort((a, b) => Number(!publishedModes(a.resource)?.length) - Number(!publishedModes(b.resource)?.length) ||
        Number(/agr[eé]gat/i.test(a.dataset.title)) - Number(/agr[eé]gat/i.test(b.dataset.title)) ||
        Number(/a[_ ]venir|future/i.test(`${a.resource.title} ${a.resource.original_url ?? ""}`)) -
        Number(/a[_ ]venir|future/i.test(`${b.resource.title} ${b.resource.original_url ?? ""}`)) ||
        // Try smaller operator feeds before European/national bundles. A local
        // numbered line should not wait for unrelated long-distance operators.
        publishedRouteCount(a.resource) - publishedRouteCount(b.resource));
    let unavailable = nearby.unavailableResourceIds?.length ?? 0;
    const issues: string[] = [];
    let networkScoped = false;
    const found: TransportLine[] = [];
    for (const [id, until] of this.unavailableUntil) if (until <= this.now()) this.unavailableUntil.delete(id);
    // Serialize download + scan together, so a second large ZIP cannot accumulate during parsing.
    let next = 0;
    // Numbered-line and metro requests stop at the first matching official network.
    // Report that scope instead of waiting for unrelated or duplicate bundles.
    const selectiveMetro = mode === "metro";
    await Promise.all(Array.from({ length: Math.min(requestedLine || selectiveMetro ? 1 : 2, groups.length) }, async () => {
      while (next < groups.length) {
        const { dataset, resource, stopIds } = groups[next++]!;
        if ((this.unavailableUntil.get(resource.id) ?? 0) > this.now()) { unavailable++; continue; }
        try {
          const selection: GtfsSelection | undefined = city.territory === "qc"
            ? { mode, ...(requestedLine ? { line: requestedLine } : { discoveryStops: [...stopIds] }) }
            : mode === "metro" && isIdfmGtfs(resource)
            ? { mode, ...(requestedLine ? { line: requestedLine } : { discoveryStops: [...stopIds] }) } : undefined;
          const load = () => this.scan(async () =>
            scanRoutesAtStops(await provider.staticFeed(resource, selection), stopIds, requestedLine));
          const routes = provider.metadata ? await provider.metadata.get({
            territory: city.territory ?? "fr", provider: city.territory === "qc" ? "donneesquebec" : "pan", kind: "routes",
            source: `nearby-routes:${resource.id}:${createHash("sha256").update(JSON.stringify([[...stopIds].sort(), requestedLine, mode])).digest("hex")}`,
            version: resourceVersion(resource),
          }, 60 * 60_000, load) : await load();
          for (const route of routes) {
            if (route.mode !== mode) continue;
            found.push({ routeId: route.routeId, mode, label: route.shortName || route.longName || route.routeId,
              description: route.longName || dataset.title, nearbyStopIds: route.stopIds, resource,
              realtime: dataset.resources.filter(isGtfsRealtimeResource).slice(0, 2),
              source: { name: dataset.title, url: dataset.page_url, ...(city.territory === "qc" ? {
                updated: resource.updated, attribution: `${dataset.title} · ${dataset.licence}`, limitations: sourceLimitations(dataset),
              } : {}) }, ...(city.territory === "qc" ? { territory: "qc" as const,
                alerts: dataset.resources.filter(r => r.is_available && /alerts?/i.test(r.title) && /gtfs.rt/i.test(r.format)) } : {}),
              ...(selection ? { selection } : {}) });
          }
          if (found.length && (requestedLine || selection || selectiveMetro)) {
            networkScoped = !!selection || selectiveMetro;
            break;
          }
        } catch (error) {
          unavailable++;
          if (error instanceof TransportDataError) issues.push(`${dataset.title} : ${error.message}`);
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
       unavailable, ...(centerFallback ? { centerFallback: true } : {}), ...(issues.length ? { issues } : {}), ...(requestedLine ? { targeted: true } : {}), ...(networkScoped ? { networkScoped: true } : {}) };
  }

  async index(line: TransportLine): Promise<JourneyIndex> {
    const key = `index:${line.territory ?? "fr"}:${resourceVersion(line.resource)}:${line.routeId}`;
    const cached = this.indexes.get(key);
    if (cached && cached.expires > this.now()) return cached.value;
    const pending = this.pending.get(key);
    if (pending) return pending as Promise<JourneyIndex>;
    const work = (async () => {
      const value = await this.scan(async () => {
        if (line.territory === "en") return this.england.index(line);
        const selection = line.selection?.discoveryStops ? { mode: line.mode, line: line.label } : line.selection ??
          (line.mode === "metro" && isIdfmGtfs(line.resource) ? { mode: line.mode, line: line.label } : undefined);
        const zip = await this.providerFor(line.territory).staticFeed(line.resource, selection);
        const index = await buildJourneyIndex(zip, line.routeId);
        if (line.territory === "qc") {
          if (!index.metadata.timezone) throw new TransportDataError("Le flux ne précise pas de fuseau horaire utilisable; horaires non confirmés.");
          new Intl.DateTimeFormat("fr", { timeZone: index.metadata.timezone }).format(0);
          const services = new Set([...index.metadata.trips.values()].map(t => t.serviceId));
          const end = [...index.metadata.calendars].filter(([id]) => services.has(id)).map(([, c]) => c.endDate)
            .concat([...index.metadata.calendarExceptions].filter(([key, type]) => type === 1 && services.has(key.slice(9))).map(([key]) => key.slice(0, 8)))
            .sort().at(-1);
          if (end && end < localDate(Math.floor(this.now() / 1000), index.metadata.timezone).replaceAll("-", ""))
            index.sourceWarning = `Données périmées : calendrier publié jusqu’au ${end.slice(6)}/${end.slice(4, 6)}/${end.slice(0, 4)}. Desserte actuelle non confirmée.`;
          if ([...index.frequencies?.values() ?? []].some(entries => entries.some(e => !e.exact)))
            index.sourceWarning = [index.sourceWarning, "Fréquences non exactes publiées : aucun horaire précis n’est inventé à partir d’un intervalle."].filter(Boolean).join(" ");
        }
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
      const deliberateDirectOnly = line.territory === "en" || !!line.selection || line.mode === "metro" && isIdfmGtfs(line.resource);
      this.indexes.set(key, { value, expires: this.now() + (line.mode === "metro" && isIdfmGtfs(line.resource)
        ? 15 * 60_000 : value.connectionsUnavailable && !deliberateDirectOnly ? 30_000 : 300_000) });
      return value;
    })().finally(() => this.pending.delete(key));
    this.pending.set(key, work);
    return work;
  }

  /** Resolve reverse boarding platforms from official IDs/parents, then query fresh
   * departures in that direction. Never reverse times or match stops by their name. */
  async reverse(line: TransportLine, previous: JourneyIndex, origin: StopGroup, arrival: StopGroup, language: string) {
    const oldStops = new Map([...(previous.connections?.network.stops ?? []), ...previous.stops]);
    const identities = (group: StopGroup) => new Set(group.ids.flatMap(id => {
      const stop = oldStops.get(id); return [id, ...(stop?.parent ? [stop.parent] : [])];
    }));
    const from = identities(arrival), to = identities(origin);
    const matches = (id: string, stop: JourneyStop, keys: Set<string>) => keys.has(id) || !!stop.parent && keys.has(stop.parent);
    const provider: Pick<TransportProvider, "referenceRoutes"> = line.territory === "en" ? {} : this.providerFor(line.territory);
    let candidates = [line];
    if (provider.referenceRoutes) {
      const routes = await provider.referenceRoutes(line.resource);
      const ids = arrival.viaTransfer && previous.connections
        ? new Set([...previous.connections.network.visits].filter(([, visits]) =>
          visits.some(v => v.pickup && matches(v.stopId, oldStops.get(v.stopId) ?? { id: v.stopId, name: "", parent: "" }, from)))
          .map(([trip]) => previous.connections!.network.metadata.trips.get(trip)?.routeId)) : null;
      candidates = routes.filter(r => ids ? ids.has(r.routeId) :
        r.mode === line.mode && (r.routeId === line.routeId || routeMatchesRequested(r.routeId, r.shortName, r.longName, line.label)))
        .map(r => ({ ...line, routeId: r.routeId, label: r.shortName || r.longName || r.routeId,
          mode: r.mode ?? line.mode, selection: undefined, allStops: true }));
      // Keep large IDFM indexes selective, with the chosen real public line.
      for (const candidate of candidates) if (isIdfmGtfs(candidate.resource))
        candidate.selection = { mode: candidate.mode, line: candidate.label };
    }
    if (candidates.length > 12) throw new TransportDataError("Trop de variantes pour vérifier le retour. Précise les arrêts avec Modifier.");
    let empty: { line: TransportLine; index: JourneyIndex; origin: StopGroup; arrival: StopGroup } | null = null;
    for (const candidate of candidates) {
      const index = await this.index(candidate);
      const starting = groupStops([...index.stops.values()].filter(s => matches(s.id, s, from)));
      const boardable = originOptions(index, { ...candidate, allStops: true });
      const start = { label: arrival.label, ids: starting.flatMap(g => g.ids).filter(id => boardable.some(g => g.ids.includes(id))) };
      if (!start.ids.length) continue;
      const destinations = arrivalOptions(index, start);
      const lookup = new Map([...(index.connections?.network.stops ?? []), ...index.stops]);
      for (const destination of destinations) {
        const ids = destination.ids.filter(id => matches(id, lookup.get(id) ?? { id, name: "", parent: "" }, to));
        if (!ids.length) continue;
        const end = { ...destination, label: origin.label, ids };
        const availableStart = await this.availableStops(candidate, index, [start], language);
        const availableEnd = await this.availableStops(candidate, index, [end], language);
        if (!availableStart.options.length || !availableEnd.options.length) continue;
        const route = { line: candidate, index, origin: availableStart.options[0]!, arrival: availableEnd.options[0]! };
        // A structurally valid reverse journey still reports calendar/live absence honestly.
        empty ??= route;
        if (journeyPairs(index, new Set(route.origin.ids), new Set(route.arrival.ids)).length || route.arrival.viaTransfer) return route;
      }
    }
    return empty;
  }

  async departures(line: TransportLine, index: JourneyIndex, origin: StopGroup, arrival: StopGroup, language: string): Promise<TransportDepartureResult> {
    if (line.territory === "en") return this.england.departures(line, index, origin, arrival, language);
    const french = language === "fr";
    const now = Math.floor(this.now() / 1000);
    const traffic = await this.traffic(line, index);
    const activeRules = traffic?.rules.filter(r => ruleActive(r, now)) ?? [];
    const uncertain = activeRules.find(r => r.blocking && !r.tripIds?.size && r.unresolved);
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
        try { return await this.providerFor(line.territory).realtimeFeed(resource); }
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
      try { return realtimeJourneys(await this.providerFor(line.territory).realtimeFeed(resource), pairs, now); }
      catch (error) {
        logger.debug({ resourceId: resource.id, err: error }, "Transport journey realtime unavailable");
        return null;
      }
    })), this.usesIdfm(line) ? this.idfm.passages(line.routeId, index, pairs) : Promise.resolve(null)]);
    const fresh = updates.filter((update) => update?.fresh);
    const cancelled = new Set(fresh.flatMap((update) => [...update!.cancelled]));
    const estimates = idfmLive?.times.length ? idfmLive.times :
      fresh.flatMap((update) => update!.results).filter((time) => !cancelled.has(time.tripId));
    const times = idfmLive?.cancelled ? [] : estimates.length ? estimates : (schedules.length ? schedules : laterSchedules)
      .filter((time) => time.departureAt > now + 24 * 3600 || !cancelled.has(time.tripId));
    const enriched = withArrivalApproximations(index, pairs, times, cancelled);
    const allowed = enriched.filter(time => !traffic || idfmTimeAllowed(traffic, index, time, origin.ids, arrival.ids));
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
      ...activeRules.filter(r => !r.blocking && [...origin.ids, ...arrival.ids].some(id => stopAffected(r, index, id)))
        .slice(0, 2).map(r => r.message),
    ].filter(Boolean) : [];
    const attribution = line.source.attribution ? `${french ? "Source" : "Source"} : ${line.source.attribution}${
      line.source.updated && Number.isFinite(Date.parse(line.source.updated)) ? ` · ${
        french ? "mise à jour" : "updated"} ${new Intl.DateTimeFormat(french ? "fr-FR" : "en-GB", {
          timeZone: timezone, day: "2-digit", month: "2-digit", year: "numeric",
        }).format(new Date(line.source.updated))}` : ""}` : "";
    return { ...departureCards({ title: `${modeName(line.mode, line.territory)} ${line.label}`, origin: origin.label, arrival: arrival.label,
      multiPlatform: origin.ids.length > 1, stops: index.stops, times: deduped, timezone, now, french,
      realtime: deduped.some(t => t.realtime) || !!idfmLive?.cancelled,
      notes: [later, warning, cancellation, ...disruptionNotes, index.sourceWarning ?? "", attribution, ...(line.source.limitations ?? [])].filter(Boolean),
      empty: idfmLive?.cancelled || times.length !== allowed.length ? (french
        ? "Aucun passage confirmé pour ce trajet après prise en compte des perturbations."
        : "No confirmed departure for this journey after accounting for disruptions.") : empty }), source: line.source };
  }
}
