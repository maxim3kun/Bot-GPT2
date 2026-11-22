import type { ItineraryPage, ItineraryView } from "./transport-itinerary-presentation.js";
import { ROAD_SOURCE } from "./ign-road-planner.js";
import { TRANSPORT_CARD_COLOR } from "./transport-presentation.js";
export function walkingAccessibilityNote(fr: boolean) {
  return fr
    ? "Accessibilité non vérifiée : l’IGN ne confirme ni l’absence d’escaliers ni l’accessibilité PMR."
    : "Accessibility not verified: IGN does not confirm that the route is stair-free or wheelchair-accessible.";
}
export function roadPages(view: ItineraryView, fr: boolean): ItineraryPage[] {
  const road = view.journey.road!;
  const km = (meters: number) => `${(meters / 1000).toLocaleString(fr ? "fr-FR" : "en-GB", { maximumFractionDigits: 1 })} km`;
  const time = (epoch: number) => new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", {
    timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit",
  }).format(epoch * 1000);
  const date = (epoch: number) => new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", {
    timeZone: "Europe/Paris", day: "2-digit", month: "2-digit",
  }).format(epoch * 1000);
  const durationMinutes = Math.ceil((view.journey.arrival - view.journey.departure) / 60);
  const duration = durationMinutes >= 60
    ? `${Math.floor(durationMinutes / 60)} h${durationMinutes % 60 ? ` ${durationMinutes % 60} min` : ""}`
    : `${durationMinutes} min`;
  const sameDay = date(view.journey.departure) === date(view.journey.arrival);
  const departureDay = date(view.journey.departure) === date(view.now)
    ? (fr ? "Aujourd’hui" : "Today")
    : date(view.journey.departure) === date(view.now + 24 * 60 * 60)
      ? (fr ? "Demain" : "Tomorrow") : date(view.journey.departure);
  const placeName = (place: ItineraryView["origin"]) => place.name.trim() || place.label;
  const title = `${road.mode === "walk" ? "🚶" : road.mode === "bike" ? "🚲" : "🚗"} ${
    placeName(view.origin)} → ${placeName(view.destination)}`;
  const locationContext = (place: ItineraryView["origin"]) => {
    const context = place.label.split("·").at(-1)?.trim();
    if (!context) return "";
    const parts = context.split(",").map(part => part.trim()).filter(Boolean);
    return parts[0] && /^(?:\d{2,3}|2[ab])$/i.test(parts[0]) ? parts[1] ?? "" : parts[0] ?? "";
  };
  const contexts = [locationContext(view.origin), locationContext(view.destination)];
  const regionLine = contexts.some(Boolean) ? contexts.join(" → ") : "";
  const timeLabel = sameDay
    ? `${departureDay} · ${fr ? "Départ prévu" : "Planned"} ${time(view.journey.departure)} → ${
      fr ? "Arrivée estimée" : "estimated arrival"} ${time(view.journey.arrival)}`
    : `${date(view.journey.departure)} ${time(view.journey.departure)} → ${date(view.journey.arrival)} ${time(view.journey.arrival)}`;
  const description = [
    regionLine ? `*${regionLine}*` : "",
    `**${duration} · ${km(road.distanceMeters)}**`,
    timeLabel,
  ].filter(Boolean).join("\n");
  const routePreviewNote = !road.geometry
    ? (fr ? "Aucun aperçu IGN vérifié · Google Maps peut recalculer le trajet."
      : "No verified IGN preview · Google Maps may recalculate the route.")
    : (fr ? "La carte Google peut recalculer un autre trajet." : "Google Maps may recalculate a different route.");
  const footer = road.mode === "walk"
    ? `${fr ? "IGN · réseau piéton" : "IGN · pedestrian network"} · ${routePreviewNote}`
    : `${fr ? "IGN · estimation sans trafic en temps réel" : "IGN · estimate without live traffic"} · ${routePreviewNote}`;
  const accessibilityField = road.mode === "walk"
    ? [{ name: fr ? "Accessibilité non vérifiée" : "Accessibility not verified",
      value: fr ? "L’IGN ne confirme ni l’absence d’escaliers ni l’accès PMR."
        : "IGN does not confirm that the route is stair-free or wheelchair-accessible." }]
    : [];
  const groups: string[][] = [[]];
  road.steps.forEach((step, index) => {
    const text = `${index + 1}. ${step.instruction} (${km(step.distanceMeters)})`;
    const group = groups.at(-1)!;
    if (group.length >= 6 || group.join("\n").length + text.length > 700) groups.push([]);
    groups.at(-1)!.push(text);
  });
  const footerText = footer;
  const summaryPage: ItineraryPage = {
    embed: { color: TRANSPORT_CARD_COLOR, title, url: ROAD_SOURCE, description,
      fields: accessibilityField, footer: { text: footerText } },
    content: `**${title}**\n${description}${accessibilityField.length
      ? `\n\n**${accessibilityField[0]!.name}** · ${accessibilityField[0]!.value}` : ""}\n\n${footerText}\n[IGN / Géoplateforme](${ROAD_SOURCE})`,
  };
  const detailPages = groups.filter(items => items.length).map((items, index) => {
    const suffix = groups.length > 1
      ? ` · ${fr ? "Instructions" : "Directions"} ${index + 1}/${groups.length}`
      : ` · ${fr ? "Instructions" : "Directions"}`;
    const steps = items.join("\n");
    const directions = `**${fr ? "Départ" : "From"}** ${view.origin.label} → **${fr ? "Arrivée" : "To"}** ${view.destination.label}`;
    return { embed: { color: TRANSPORT_CARD_COLOR, title: title + suffix, url: ROAD_SOURCE, description: directions,
      fields: [{ name: fr ? "Instructions du trajet" : "Route directions", value: steps }],
      footer: { text: footerText } },
      content: `**${title}${suffix}**\n${directions}\n\n${steps}\n\n${footerText}\n[IGN / Géoplateforme](${ROAD_SOURCE})` };
  });
  return [summaryPage, ...detailPages];
}
