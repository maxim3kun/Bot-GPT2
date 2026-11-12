import type { APIEmbed } from "discord.js";
import { connectionPaths, type ConnectionPath } from "./gtfs-connections.js";
import { decodeJourneyFeed, realtimeJourneys, scheduledJourneys, type JourneyIndex, type JourneyPair, type JourneyTime, type JourneyRealtimeFeed } from "./gtfs-journey.js";
import { routeTypeToMode } from "./gtfs-realtime.js";
import type { StopGroup, TransportLine } from "./transport-browser.js";
import { TRANSPORT_CARD_COLOR } from "./transport-presentation.js";

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
  }, (pair) => times(pair).length > 0);
  return [...results.values()].sort(rank);
}

export function connectionCards(line: TransportLine, index: JourneyIndex, origin: StopGroup, arrival: StopGroup,
  journeys: ConnectedJourney[], language: string, realtimeUnavailable: boolean): { embed: APIEmbed; content: string } {
  const fr = language === "fr";
  const data = index.connections!;
  const network = data.network;
  const timezone = network.metadata.timezone || "Europe/Paris";
  const clock = (at: number) => new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", {
    timeZone: timezone, weekday: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(at * 1000));
  const duration = (seconds: number) => {
    const mins = Math.max(0, Math.round(seconds / 60));
    return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, "0")}`;
  };
  const reliability = (time: JourneyTime) => time.realtime ? (fr ? "temps réel" : "real-time")
    : (fr ? "théorique" : "scheduled");
  const name = (id: string) => (network.stops.get(id)?.name ?? id).slice(0, 80);
  const modeNames = { bus: "Bus", metro: "Métro", tram: "Tram", rail: "Train / RER" };
  const leg = (pair: JourneyPair, time: JourneyTime) => {
    const route = network.metadata.routes.get(network.metadata.trips.get(pair.tripId)!.routeId)!;
    const mode = routeTypeToMode(route.type)!;
    return `**${modeNames[mode] ?? ""} ${(route.shortName || route.longName).slice(0, 40)}** · ${
      name(pair.origin.stopId)} → ${name(pair.destination.stopId)}\n${clock(time.departureAt)} → ${clock(time.arrivalAt!)} · ${reliability(time)}`;
  };
  const scope = journeys.length
    ? fr ? "1 correspondance · même source officielle · autres réseaux et marche non calculés."
      : "1 transfer · same official source · other networks and walking not calculated."
    : fr ? "Une correspondance publiée existe, mais aucun horaire compatible n’a confirmé ce trajet."
      : "A published transfer exists, but no compatible timetable confirms this journey.";
  const rows = journeys.slice(0, 2).map(({ path, first, second }, i) => {
    const from = name(path.first.destination.stopId);
    const to = name(path.second.origin.stopId);
    const transferLocation = from === to ? from : `${from} → ${to}`;
    return {
      name: `${fr ? "Option" : "Option"} ${i + 1} · ${clock(first.departureAt)} → ${clock(second.arrivalAt!)}`.slice(0, 256),
      value: `${leg(path.first, first)}\n↔ **${fr ? "Changement à" : "Change at"} ${transferLocation}** · ${
        duration(second.departureAt - first.arrivalAt!)} ${fr ? "d’attente" : "waiting"} · ${
        fr ? "minimum officiel" : "official minimum"} ${duration(path.rule.minimum!)}\n${leg(path.second, second)}`.slice(0, 1024),
      inline: false,
    };
  });
  const empty = fr ? "Aucune correspondance vérifiable dans les prochaines 24 h : horaires incompatibles, délai insuffisant ou desserte indisponible."
    : "No verifiable transfer in the next 24 hours: incompatible times, insufficient transfer time or unavailable service.";
  const warning = !journeys.length ? "" : realtimeUnavailable ? (fr ? "Temps réel absent, périmé ou incomplet : ces horaires théoriques ne garantissent pas la correspondance."
    : "Live data absent, stale or incomplete: these scheduled times do not guarantee the transfer.") : (fr
      ? "Estimations susceptibles de changer; correspondance non garantie." : "Estimates may change; transfer not guaranteed.");
  const limit = data.limited ? (fr ? "Recherche partielle : limite de lignes atteinte." : "Partial search: route limit reached.") : "";
  const fields: NonNullable<APIEmbed["fields"]> = rows.length ? rows
    : [{ name: fr ? "Départs" : "Departures", value: empty, inline: false }];
  if (warning || limit) fields.push({ name: fr ? "À savoir" : "Please note",
    value: [warning, limit].filter(Boolean).join("\n").slice(0, 1024), inline: false });
  const title = `${origin.label.slice(0, 68)} → ${arrival.label.slice(0, 68)}${
    journeys.length ? "" : fr ? " · trajet non confirmé" : " · unconfirmed"}`;
  const description = `**${fr ? "Départ" : "From"}**  ${origin.label.slice(0, 100)}\n**${fr ? "Arrivée" : "To"}**  ${
    arrival.label.slice(0, 100)}\n${scope}`;
  const footer = `${fr ? "Horaires théoriques · correspondance non garantie" : "Scheduled times · transfer not guaranteed"} · ${timezone}`;
  const embed: APIEmbed = { color: TRANSPORT_CARD_COLOR, title, description, fields, footer: { text: footer.slice(0, 2048) } };
  const content = [`**${title}**`, description, ...fields.map((field) => `**${field.name}**\n${field.value}`), footer].join("\n\n");
  return { embed, content: content.length <= 1850 ? content : `${content.slice(0, 1800)}…` };
}

export function formatConnections(line: TransportLine, index: JourneyIndex, origin: StopGroup, arrival: StopGroup,
  journeys: ConnectedJourney[], language: string, realtimeUnavailable: boolean): string {
  return connectionCards(line, index, origin, arrival, journeys, language, realtimeUnavailable).content;
}
