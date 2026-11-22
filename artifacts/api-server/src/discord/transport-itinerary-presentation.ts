import type { APIEmbed } from "discord.js";
import { addDays, localDate } from "./gtfs-realtime.js";
import { TRANSPORT_CARD_COLOR } from "./transport-presentation.js";
import type { OfficialPlace, VerifiedJourney, JourneyComparison } from "./transport-planner-types.js";
import { roadPages } from "./road-presentation.js";
import { ROAD_SOURCE } from "./ign-road-planner.js";
import { BIKE_SOURCE, OSM_ATTRIBUTION } from "./osm-bike-planner.js";

export const ITINERARY_SOURCE = "https://prim.iledefrance-mobilites.fr/fr/apis/idfm-navitia-general-v2";
export const itinerarySource = (journey: VerifiedJourney) => journey.road
  ? journey.road.source === "openstreetmap" ? BIKE_SOURCE : ROAD_SOURCE : ITINERARY_SOURCE;
export interface ItineraryView {
  journey: VerifiedJourney;
  origin: OfficialPlace;
  destination: OfficialPlace;
  now: number;
}
export interface ItineraryPage { embed: APIEmbed; content: string }
const minutes = (s: number) => `${Math.ceil(s / 60)} min`;
function reliability(journey: VerifiedJourney, fr: boolean) {
  const legs = journey.legs.filter(l => l.kind === "transit");
  const live = legs.filter(l => l.freshness === "realtime").length;
  return live && live === legs.length ? (fr ? "Prévisions temps réel" : "Real-time estimates")
    : live ? (fr ? "Prévisions et horaires théoriques" : "Predictions and scheduled times")
    : (fr ? "Horaires théoriques · non temps réel" : "Scheduled times · not real-time");
}

/** Compact side-by-side summary; every displayed duration comes from an official planner. */
export function comparisonPage(comparison: JourneyComparison, french: boolean): ItineraryPage {
  const fr = french, t = (a: string, b: string) => fr ? a : b;
  const labels = {
    walk: t("À pied", "On foot"),
    car: t("En voiture", "By car"),
    bike: t("À vélo", "By bike"),
    transit: t("Transports en commun", "Public transit"),
  } as const;
  const elapsed = (journey: VerifiedJourney) => {
    const mins = Math.ceil((journey.arrival - journey.departure) / 60);
    return mins < 60 ? minutes(mins * 60) : `${Math.floor(mins / 60)} h ${mins % 60} min`;
  };
  const duration = (journey: VerifiedJourney) => `${elapsed(journey)} · ${
    new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", {
      timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit",
    }).format(journey.departure * 1000)} → ${new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", {
      timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit",
    }).format(journey.arrival * 1000)}`;
  const entries = comparison.entries.map(entry => {
    const recommendation = comparison.recommended === entry.mode ? ` · ${t("plus rapide parmi les résultats vérifiés", "fastest verified option")}` : "";
    if (!entry.journey) return { name: labels[entry.mode], value: entry.unavailable ?? t("non disponible", "unavailable"), inline: false };
    const route = entry.journey.road;
    const distance = route ? ` · ${(route.distanceMeters / 1000).toLocaleString(fr ? "fr-FR" : "en-GB", { maximumFractionDigits: 1 })} km` : "";
    const quality = route
      ? route.source === "openstreetmap" ? t("Réseau vélo OpenStreetMap · estimation sans trafic en temps réel, France métropolitaine",
        "OpenStreetMap cycling network · no live-traffic data, metropolitan France")
      : entry.mode === "walk" ? t("estimation IGN, réseau piéton", "IGN pedestrian-network estimate") : t("estimation IGN, sans trafic en direct", "IGN estimate, no live traffic")
      : `${reliability(entry.journey, fr)} · ${entry.journey.legs.filter(leg => leg.kind === "transit").length} ${t("étape(s)", "leg(s)")}${entry.journey.warning ? ` · ${t("perturbation signalée", "disruption reported")}` : ""}`;
    return { name: labels[entry.mode], value: `**${duration(entry.journey)}${distance}**\n${quality}${recommendation}`, inline: false };
  });
  const title = t("Comparaison des trajets", "Journey comparison");
  const origin = comparison.entries[0]?.origin.label ?? "";
  const destination = comparison.entries[0]?.destination.label ?? "";
  const description = `**${t("Départ", "From")}** ${origin}\n**${t("Arrivée", "To")}** ${destination}`;
  const footer = t("Les durées proviennent des sources de calcul disponibles; elles ne sont pas toutes du temps réel. Le vélo est calculé en France métropolitaine uniquement, et seulement si le routeur OpenStreetMap renvoie un trajet.",
    "Durations come from available routing sources; they are not all real-time. Cycling is calculated only in metropolitan France, and only when the OpenStreetMap router returns a route.");
  const content = [`**${title}**`, description, ...entries.map(item => `**${item.name}**\n${item.value}`), footer,
    `[IGN / Géoplateforme](${ROAD_SOURCE}) · [OpenStreetMap bike router](${BIKE_SOURCE}) · [© OpenStreetMap contributors](${OSM_ATTRIBUTION}) · [Île-de-France Mobilités](${ITINERARY_SOURCE})`].join("\n\n");
  return {
    embed: { color: TRANSPORT_CARD_COLOR, title, description, fields: entries, footer: { text: footer } },
    content,
  };
}

/** Same hierarchy and colour as !metro, but every connection comes from the planner. */
export function itineraryPages(view: ItineraryView, french: boolean): ItineraryPage[] {
  if (view.journey.road) return roadPages(view, french);
  const { journey, origin, destination, now } = view, fr = french;
  const tz = "Europe/Paris";
  const clock = new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  const date = new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", { timeZone: tz, day: "2-digit", month: "2-digit" });
  const today = localDate(now, tz), day = localDate(journey.departure, tz);
  const dayName = day === today ? (fr ? "Aujourd’hui" : "Today")
    : day === addDays(today, 1) ? (fr ? "Demain" : "Tomorrow")
    : new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", { timeZone: tz, weekday: "long" }).format(journey.departure * 1000);
  const hour = (at: number) => clock.format(at * 1000);
  const arrivalDay = localDate(journey.arrival, tz) === day ? "" : ` (${date.format(journey.arrival * 1000)})`;
  const transit = journey.legs.filter(l => l.kind === "transit");
  const title = fr ? "Itinéraire en transports" : "Public transit journey";
  const description = `**${fr ? "Départ" : "From"}**  ${origin.label}\n**${fr ? "Arrivée" : "To"}**  ${destination.label}`;
  const timing = { name: `${dayName} · ${date.format(journey.departure * 1000)}`,
    value: `**${hour(journey.departure)} → ${hour(journey.arrival)}${arrivalDay}** · ${minutes(journey.arrival - journey.departure)}`, inline: false };
  const mixed = transit.some(l => l.freshness === "realtime") && transit.some(l => l.freshness !== "realtime");
  const fields = journey.legs.filter(l => l.kind === "transit" || l.arrival > l.departure).map((leg) => {
    const stops = leg.from === leg.to ? leg.from : `${leg.from} → ${leg.to}`;
    if (leg.kind === "transit") return {
      name: leg.line!,
      value: `**${hour(leg.departure)} → ${hour(leg.arrival)}**\n${stops}\n${fr ? "Direction" : "Towards"} **${leg.direction}**${
        mixed ? ` · ${leg.freshness === "realtime" ? (fr ? "temps réel" : "live") : (fr ? "prévu" : "scheduled")}` : ""}`,
      inline: false,
    };
    const name = leg.kind === "transfer" ? (fr ? "Correspondance" : "Transfer")
      : leg.kind === "wait" ? (fr ? "Attente" : "Waiting") : (fr ? "À pied" : "Walk");
    return { name, value: `${stops} · ${minutes(leg.arrival - leg.departure)}`, inline: false };
  });
  if (journey.warning) fields.push({ name: fr ? "À savoir" : "Please note",
    value: fr ? "Perturbation signalée : vérifie les informations de l’exploitant." : "Disruption reported: check operator information.", inline: false });
  const footer = `${reliability(journey, fr)} · ${tz}`;
  // Bound BOTH the embed and its text fallback. Additional pages retain all legs;
  // none are truncated to fit a Discord message.
  const groups: typeof fields[] = [];
  let group: typeof fields = [];
  const asText = (items: typeof fields) => [`**${title}**`, description, `**${timing.name}**\n${timing.value}`,
    ...items.map(f => `**${f.name}**\n${f.value}`), footer].join("\n\n");
  for (const field of fields) {
    if (group.length && (group.length >= 4 || asText([...group, field]).length > 1700)) {
      groups.push(group); group = [];
    }
    group.push(field);
  }
  groups.push(group);
  return groups.map((items, i) => {
    const suffix = groups.length > 1 ? ` · ${i + 1}/${groups.length}` : "";
    return {
      embed: { color: TRANSPORT_CARD_COLOR, title: title + suffix, url: ITINERARY_SOURCE, description,
        fields: [timing, ...items], footer: { text: footer } },
      content: `${asText(items)}${suffix}\n[Île-de-France Mobilités](${ITINERARY_SOURCE})`,
    };
  });
}

/** Compatibility text for callers which are not rendering Discord cards. */
export function formatItinerary(journey: VerifiedJourney, origin: OfficialPlace, destination: OfficialPlace, french: boolean) {
  if (journey.road) return roadPages({ journey, origin, destination, now: journey.departure }, french)[0]!.content;
  const clock = (at: number) => new Intl.DateTimeFormat(french ? "fr-FR" : "en-GB", {
    timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(at * 1000);
  const legs = journey.legs.filter(l => l.kind === "transit" || l.arrival > l.departure && l.kind !== "wait").map((leg) =>
    leg.kind === "transit" ? `• **${leg.line}** · ${french ? "direction" : "towards"} **${leg.direction}**\n  ${leg.from} → ${leg.to}`
      : `• ${french ? leg.kind === "transfer" ? "Correspondance" : "À pied" : leg.kind === "transfer" ? "Transfer" : "Walk"} : ${
        leg.from === leg.to ? leg.from : `${leg.from} → ${leg.to}`} · ${minutes(leg.arrival - leg.departure)}`);
  const result = `**${origin.label} → ${destination.label}**\n${french ? "Départ" : "Departure"} ${clock(journey.departure)} · ${
    french ? "Arrivée" : "Arrival"} ${clock(journey.arrival)} · ${minutes(journey.arrival - journey.departure)}\n\n${legs.join("\n")}\n\n${
    journey.warning ? (french ? "Perturbation signalée; vérifie les informations de l’exploitant.\n" : "A disruption is reported; check operator information.\n") : ""}${
    reliability(journey, french)} · Europe/Paris\n[Île-de-France Mobilités](${ITINERARY_SOURCE})`;
  return result.length <= 1950 ? result : (french
    ? "Le trajet officiel comporte trop de détails pour une réponse lisible. Précise un trajet plus court; je ne tronque pas ses correspondances."
    : "This official journey is too detailed for a readable reply. Narrow the trip; I won't omit its transfers.");
}
