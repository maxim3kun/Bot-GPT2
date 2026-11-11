import type { ItineraryPage, ItineraryView } from "./transport-itinerary-presentation.js";
import { ROAD_SOURCE } from "./ign-road-planner.js";
import { TRANSPORT_CARD_COLOR } from "./transport-presentation.js";
export function roadPages(view: ItineraryView, fr: boolean): ItineraryPage[] {
  const road = view.journey.road!;
  const km = (meters: number) => `${(meters / 1000).toLocaleString(fr ? "fr-FR" : "en-GB", { maximumFractionDigits: 1 })} km`;
  const clock = (epoch: number) => new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", {
    timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(epoch * 1000);
  const title = fr ? "Itinéraire en voiture" : "Driving route";
  const description = `**${fr ? "Départ" : "From"}** ${view.origin.label}\n**${fr ? "Arrivée" : "To"}** ${view.destination.label}`;
  const summary = `${km(road.distanceMeters)} · **${Math.ceil((view.journey.arrival - view.journey.departure) / 60)} min**\n${
    fr ? "Départ prévu" : "Planned departure"} ${clock(view.journey.departure)} → ${fr ? "Arrivée estimée" : "Estimated arrival"} ${clock(view.journey.arrival)}`;
  const note = fr ? "Durée estimée IGN, sans trafic en temps réel. Vérifie la signalisation et les conditions sur place."
    : "IGN estimated duration, no live traffic. Check road signs and local conditions. Instructions are supplied in French.";
  const footer = `IGN / Géoplateforme · Europe/Paris${road.resourceVersion ? ` · ${road.resourceVersion}` : ""}`;
  const groups: string[][] = [[]];
  road.steps.forEach((step, index) => {
    const text = `${index + 1}. ${step.instruction} (${km(step.distanceMeters)})`;
    const group = groups.at(-1)!;
    if (group.length >= 6 || group.join("\n").length + text.length > 700) groups.push([]);
    groups.at(-1)!.push(text);
  });
  return groups.map((items, index) => {
    const suffix = groups.length > 1 ? ` · ${index + 1}/${groups.length}` : "";
    const steps = items.join("\n");
    return { embed: { color: TRANSPORT_CARD_COLOR, title: title + suffix, url: ROAD_SOURCE, description,
      fields: [{ name: fr ? "Distance et estimation" : "Distance and estimate", value: summary },
        { name: fr ? "Instructions routières" : "Road instructions", value: steps },
        { name: fr ? "À savoir" : "Please note", value: note }], footer: { text: footer } },
      content: `**${title}${suffix}**\n${description}\n\n${summary}\n\n${steps}\n\n${note}\n${footer}\n[IGN / Géoplateforme](${ROAD_SOURCE})` };
  });
}
