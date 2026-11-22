import type { APIEmbed } from "discord.js";
import { addDays, localDate } from "./gtfs-realtime.js";
import { TRANSPORT_CARD_COLOR } from "./transport-presentation.js";
import type { OfficialPlace, VerifiedJourney, JourneyComparison } from "./transport-planner-types.js";
import { roadPages, walkingAccessibilityNote } from "./road-presentation.js";
import { ROAD_SOURCE } from "./ign-road-planner.js";
import { BIKE_SOURCE, OSM_ATTRIBUTION } from "./osm-bike-planner.js";

export const ITINERARY_SOURCE = "https://prim.iledefrance-mobilites.fr/fr/apis/idfm-navitia-general-v2";
export const itinerarySource = (journey: VerifiedJourney) => journey.road
  ? journey.road.source === "openstreetmap" ? BIKE_SOURCE : ROAD_SOURCE : ITINERARY_SOURCE;
export type MapRouteMode = "walk" | "car" | "bike" | "transit";
export function mapsDirectionsUrl(origin: OfficialPlace, destination: OfficialPlace, mode: MapRouteMode) {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("origin", origin.label);
  url.searchParams.set("destination", destination.label);
  url.searchParams.set("travelmode", mode === "walk" ? "walking" : mode === "car" ? "driving"
    : mode === "bike" ? "bicycling" : "transit");
  return url.toString();
}
export const journeyMapMode = (journey: VerifiedJourney): MapRouteMode => journey.road?.mode ?? "transit";
export function routeMapCaption(journey: VerifiedJourney, fr: boolean) {
  const mode = journey.road?.mode;
  const modeName = mode === "walk" ? (fr ? "à pied" : "walking")
    : mode === "car" ? (fr ? "en voiture" : "driving")
    : mode === "bike" ? (fr ? "à vélo" : "cycling")
    : (fr ? "en transports" : "public transit");
  const routeSource = journey.road?.source === "openstreetmap"
    ? (fr ? "routeur vélo OpenStreetMap · © OpenStreetMap contributors" : "OpenStreetMap bike router · © OpenStreetMap contributors")
    : journey.road ? (fr ? "calculateur IGN / Géoplateforme" : "IGN / Géoplateforme router")
      : (fr ? "Île-de-France Mobilités" : "Île-de-France Mobilités");
  const partial = journey.mapGeometryPartial
    ? (fr ? " · aperçu partiel, sections sans géométrie omises" : " · partial preview, sections without geometry omitted")
    : "";
  return `${fr ? "Aperçu" : "Preview"} · ${modeName} · ${routeSource} · ${fr ? "fond cartographique" : "basemap"} © IGN${partial}`;
}
export const hasRouteGeometry = (journey: VerifiedJourney) =>
  !!journey.road?.geometry?.length || !!journey.mapGeometry?.length;
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
const bikeSurfaceNames: Record<string, [string, string]> = {
  asphalt: ["asphalte", "asphalt"], concrete: ["béton", "concrete"], paving_stones: ["pavés", "paving stones"],
  sett: ["pavés taillés", "sett"], cobblestone: ["pavés irréguliers", "cobblestone"],
  compacted: ["sol compacté", "compacted"], fine_gravel: ["gravillon fin", "fine gravel"],
  gravel: ["gravier", "gravel"], ground: ["sol naturel", "ground"], dirt: ["terre", "dirt"],
  earth: ["terre", "earth"], grass: ["herbe", "grass"], grass_paver: ["dalles engazonnées", "grass pavers"],
  sand: ["sable", "sand"], wood: ["bois", "wood"], metal: ["métal", "metal"],
  mud: ["boue", "mud"], snow: ["neige", "snow"], ice: ["glace", "ice"], unpaved: ["non revêtu", "unpaved"],
};
const bikeFacilityNames: Record<string, [string, string]> = {
  track: ["piste cyclable", "cycle track"], lane: ["bande cyclable", "cycle lane"],
  shared_lane: ["voie partagée avec marquage", "shared lane marking"], shared: ["voie partagée", "shared"],
  opposite: ["circulation cyclable à contresens", "contraflow cycling"],
  opposite_lane: ["bande cyclable à contresens", "contraflow cycle lane"],
  opposite_track: ["piste cyclable à contresens", "contraflow cycle track"],
  share_busway: ["voie de bus partagée", "shared bus lane"], shoulder: ["accotement", "shoulder"],
  separate: ["aménagement séparé", "separate cycleway"], no: ["aucun aménagement indiqué", "no cycleway indicated"],
};
function bikeTagSummary(steps: NonNullable<VerifiedJourney["road"]>["steps"], tag: "surface" | "cycleway", fr: boolean) {
  const totals = new Map<string, number>();
  let unknown = 0;
  for (const step of steps) {
    if (step.distanceMeters <= 0) continue;
    const value = step[tag];
    if (value && (tag === "surface" ? bikeSurfaceNames[value] : bikeFacilityNames[value]))
      totals.set(value, (totals.get(value) ?? 0) + step.distanceMeters);
    else unknown += step.distanceMeters;
  }
  const names = tag === "surface" ? bikeSurfaceNames : bikeFacilityNames;
  const formatDistance = (meters: number) => meters < 50 ? (fr ? "<0,1 km" : "<0.1 km")
    : `${(meters / 1000).toLocaleString(fr ? "fr-FR" : "en-GB", { maximumFractionDigits: 1 })} km`;
  const parts = [...totals].map(([value, meters]) => `${names[value]![fr ? 0 : 1]} ${formatDistance(meters)}`);
  if (unknown > 0 || !parts.length) parts.push(`${fr ? "inconnu" : "unknown"} ${formatDistance(unknown)}`);
  const label = tag === "surface" ? (fr ? "Revêtement OSM" : "OSM surface")
    : (fr ? "Aménagement cyclable OSM" : "OSM cycling facility");
  return `${label} : ${parts.join(" · ")}`;
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
      ? route.source === "openstreetmap" ? `${t("Réseau vélo OpenStreetMap · estimation sans trafic en temps réel, France métropolitaine",
        "OpenStreetMap cycling network · no live-traffic data, metropolitan France")} · ${bikeTagSummary(route.steps, "surface", fr)} · ${bikeTagSummary(route.steps, "cycleway", fr)}`
      : entry.mode === "walk" ? `${t("estimation IGN, réseau piéton", "IGN pedestrian-network estimate")} · ${walkingAccessibilityNote(fr)}`
        : t("estimation IGN, sans trafic en direct", "IGN estimate, no live traffic")
      : `${reliability(entry.journey, fr)} · ${entry.journey.legs.filter(leg => leg.kind === "transit").length} ${t("étape(s)", "leg(s)")}${entry.journey.warning ? ` · ${t("perturbation signalée", "disruption reported")}` : ""}`;
    return { name: labels[entry.mode], value: `**${duration(entry.journey)}${distance}**\n${quality}${recommendation}`, inline: false };
  });
  const title = t("Comparaison des trajets", "Journey comparison");
  const previewJourney = comparison.entries.find(entry => entry.mode === comparison.recommended && entry.journey)?.journey
    ?? comparison.entries.find(entry => entry.journey)?.journey;
  const previewNote = previewJourney
    ? hasRouteGeometry(previewJourney)
      ? routeMapCaption(previewJourney, fr)
      : t("Aucun aperçu du tracé : le calculateur n’a pas fourni de géométrie vérifiée. Google Maps peut recalculer un autre trajet.",
        "No route preview: the router did not provide verified geometry. Google Maps may recalculate a different route.")
    : "";
  const origin = comparison.entries[0]?.origin.label ?? "";
  const destination = comparison.entries[0]?.destination.label ?? "";
  const description = `**${t("Départ", "From")}** ${origin}\n**${t("Arrivée", "To")}** ${destination}`;
  const footer = [t("Les durées viennent des sources indiquées. Le vélo est calculé en France métropolitaine si un trajet est trouvé. La carte externe peut proposer un autre trajet ou une autre durée.",
    "Durations come from the listed sources. Cycling is calculated in metropolitan France when a route is found. The external map may suggest a different route or duration."), previewNote].filter(Boolean).join(" ");
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
  const previewNote = hasRouteGeometry(journey)
    ? fr
      ? `Géométrie fournie par Île-de-France Mobilités${journey.mapGeometryPartial ? " · sections sans géométrie et accès en ligne droite omis" : ""}.`
      : `Geometry supplied by Île-de-France Mobilités${journey.mapGeometryPartial ? " · sections without geometry and straight-line access omitted" : ""}.`
    : fr
      ? "Aucun aperçu du tracé : le calculateur de transports n’a pas fourni de géométrie vérifiée. Google Maps peut recalculer un autre trajet."
      : "No route preview: the transit planner did not provide verified geometry. Google Maps may recalculate a different route.";
  const footer = `${reliability(journey, fr)} · ${tz} · ${previewNote}`;
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
