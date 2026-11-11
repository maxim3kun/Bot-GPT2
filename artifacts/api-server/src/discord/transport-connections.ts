import { connectionPaths, type ConnectionPath } from "./gtfs-connections.js";
import { decodeJourneyFeed, realtimeJourneys, scheduledJourneys, type JourneyIndex, type JourneyPair, type JourneyTime, type JourneyRealtimeFeed } from "./gtfs-journey.js";
import { routeTypeToMode } from "./gtfs-realtime.js";
import type { StopGroup, TransportLine } from "./transport-browser.js";

export interface ConnectedJourney { path: ConnectionPath; first: JourneyTime; second: JourneyTime }

/** Merge estimates per service instance; an unrelated live trip must not hide scheduled services. */
function legTimes(index: JourneyIndex, pair: JourneyPair, feeds: JourneyRealtimeFeed[], now: number): JourneyTime[] {
  const scheduled = scheduledJourneys(index, [pair], now);
  const updates = feeds.map((feed) => realtimeJourneys(feed, [pair], now)).filter((update) => update.fresh);
  if (updates.some((update) => update.cancelled.has(pair.tripId))) return [];
  const estimates = updates.flatMap((update) => update.results);
  const replacements = new Map<JourneyTime, JourneyTime>();
  for (const estimate of estimates) {
    const candidates = scheduled.filter((time) => estimate.serviceDate
      ? time.serviceDate === estimate.serviceDate : Math.abs(time.departureAt - estimate.departureAt) < 6 * 3600);
    candidates.sort((a, b) => Math.abs(a.departureAt - estimate.departureAt) - Math.abs(b.departureAt - estimate.departureAt));
    if (candidates[0]) replacements.set(candidates[0], estimate);
  }
  // A fresh update with no complete absolute estimate (e.g. delay-only) must not
  // silently confirm a transfer using the original, possibly missed timetable.
  const incompleteDates = feeds.flatMap((feed) => {
    const timestamp = Number(feed.header.timestamp);
    if (now - timestamp > 480 || now - timestamp < -300 || !Number.isFinite(timestamp)) return [];
    return feed.entity.flatMap((entity) => {
      const update = entity.tripUpdate;
      if (!update || update.trip.tripId !== pair.tripId) return [];
      if (Object.hasOwn(update, "timestamp") && (now - Number(update.timestamp) > 480 || now - Number(update.timestamp) < -300)) return [];
      if (estimates.some((estimate) => !update.trip.startDate || estimate.serviceDate === update.trip.startDate)) return [];
      return [update.trip.startDate || "*"];
    });
  });
  return scheduled.flatMap((time) => {
    const replacement = replacements.get(time);
    if (replacement) return [replacement];
    return incompleteDates.some((date) => date === "*" || date === time.serviceDate) ? [] : [time];
  });
}

export function connectedJourneys(index: JourneyIndex, origin: StopGroup, arrival: StopGroup, now: number, feeds: Uint8Array[] = []): ConnectedJourney[] {
  const network = index.connections?.network;
  if (!network) return [];
  // Decode once for the whole search, not once per candidate leg.
  const decoded = feeds.flatMap((feed) => {
    try { return [decodeJourneyFeed(feed)]; } catch { return []; }
  });
  const cache = new Map<string, JourneyTime[]>();
  const times = (pair: JourneyPair) => {
    const key = `${pair.tripId}:${pair.origin.sequence}:${pair.destination.sequence}`;
    if (cache.has(key)) return cache.get(key)!;
    const result = legTimes(network, pair, decoded, now);
    cache.set(key, result);
    return result;
  };
  const results = new Map<string, ConnectedJourney>();
  const rank = (a: ConnectedJourney, b: ConnectedJourney) =>
    a.second.arrivalAt! - b.second.arrivalAt! || a.first.departureAt - b.first.departureAt;
  connectionPaths(index, new Set(origin.ids), new Set(arrival.ids), (path) => {
    for (const first of times(path.first)) {
      if (first.arrivalAt === null || first.departureAt < now) continue;
      for (const second of times(path.second)) {
        if (second.departureAt - first.arrivalAt < path.rule.minimum! ||
          second.arrivalAt === null || second.arrivalAt > now + 24 * 3600) continue;
        const result = { path, first, second };
        const key = `${first.tripId}:${first.departureAt}:${path.first.destination.stopId}:${second.tripId}:${second.departureAt}`;
        if (results.has(key)) continue;
        const best = [...results.values(), result].sort(rank).slice(0, 3);
        results.clear();
        for (const candidate of best) {
          results.set(`${candidate.first.tripId}:${candidate.first.departureAt}:${candidate.path.first.destination.stopId}:${candidate.second.tripId}:${candidate.second.departureAt}`, candidate);
        }
      }
    }
  });
  return [...results.values()].sort(rank);
}

export function formatConnections(line: TransportLine, index: JourneyIndex, origin: StopGroup, arrival: StopGroup,
  journeys: ConnectedJourney[], language: string, realtimeUnavailable: boolean): string {
  const fr = language === "fr";
  const data = index.connections!;
  const network = data.network;
  const clock = (at: number) => new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", {
    timeZone: network.metadata.timezone || "Europe/Paris", weekday: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(at * 1000));
  const reliability = (time: JourneyTime) => time.realtime ? (fr ? "temps réel" : "real-time")
    : (fr ? "théorique" : "scheduled");
  const name = (id: string) => (network.stops.get(id)?.name ?? id).slice(0, 80);
  const modeNames = { bus: "Bus", metro: "Métro", tram: "Tram", rail: "Train / RER" };
  const leg = (pair: JourneyPair, time: JourneyTime) => {
    const route = network.metadata.routes.get(network.metadata.trips.get(pair.tripId)!.routeId)!;
    const mode = routeTypeToMode(route.type)!;
    return `${modeNames[mode] ?? ""} ${(route.shortName || route.longName).slice(0, 40)}: ${name(pair.origin.stopId)} ${clock(time.departureAt)} → ${name(pair.destination.stopId)} ${clock(time.arrivalAt!)} [${reliability(time)}]`;
  };
  const heading = `**${origin.label.slice(0, 80)} → ${arrival.label.slice(0, 80)} · ${fr ? "1 correspondance" : "1 transfer"}**`;
  const scope = fr ? "Même source officielle, une correspondance avec délai publié. Autres réseaux et marche non calculés."
    : "Same official source, one transfer with a published minimum. Other networks and walking not calculated.";
  const rows = journeys.slice(0, 2).map(({ path, first, second }, i) =>
    `${i + 1}. ${leg(path.first, first)}\n${fr ? "Changement" : "Change"}: ${name(path.first.destination.stopId)} → ${name(path.second.origin.stopId)}, ${second.departureAt - first.arrivalAt!} s (${fr ? "minimum officiel" : "official minimum"} ${path.rule.minimum} s).\n${leg(path.second, second)}`);
  const empty = fr ? "Aucune correspondance vérifiable dans les prochaines 24 h : horaires incompatibles, délai insuffisant ou desserte indisponible."
    : "No verifiable transfer in the next 24 hours: incompatible times, insufficient transfer time or unavailable service.";
  const warning = realtimeUnavailable ? (fr ? "\nTemps réel absent, périmé ou incomplet : les étapes théoriques ne garantissent pas la correspondance."
    : "\nLive data absent, stale or incomplete: scheduled legs do not guarantee the transfer.") : (fr
      ? "\nEstimations susceptibles de changer; correspondance non garantie." : "\nEstimates may change; transfer not guaranteed.");
  const limit = data.limited ? (fr ? "\nRecherche partielle : limite de lignes atteinte." : "\nPartial search: route limit reached.") : "";
  // Keep complete itineraries rather than cutting off the second leg at Discord's limit.
  let body = rows.join("\n\n") || empty;
  if (`${heading}\n${scope}\n${body}${warning}${limit}`.length > 1850) body = rows[0] || empty;
  return `${heading}\n${scope}\n${body}${warning}${limit}`;
}
