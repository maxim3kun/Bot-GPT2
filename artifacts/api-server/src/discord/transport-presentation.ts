import type { APIEmbed } from "discord.js";
import { addDays, localDate } from "./gtfs-realtime.js";
import type { JourneyStop, JourneyTime } from "./gtfs-journey.js";
import { arrivalForDisplay } from "./transport-arrivals.js";

export const TRANSPORT_CARD_COLOR = 0x5865f2;

interface CardInput {
  title: string;
  origin: string;
  arrival: string;
  multiPlatform: boolean;
  stops: ReadonlyMap<string, JourneyStop>;
  times: JourneyTime[];
  timezone: string;
  now: number;
  french: boolean;
  realtime: boolean;
  notes: string[];
  empty: string;
}

/** Keep the official stop name, but normalize the all-caps municipality prefix. */
export function readableStop(label: string): string {
  return label.replace(/^(.+?)\s+-\s+/, (_, city: string) =>
    `${city.toLocaleLowerCase("fr").replace(/(^|[\s'-])\p{L}/gu, (letter) => letter.toLocaleUpperCase("fr"))} · `).slice(0, 160);
}

function platformName(stop: JourneyStop | undefined): string {
  if (!stop) return "";
  return (stop.name.match(/\bquai\s+.+$/i)?.[0] ?? readableStop(stop.name)).slice(0, 80);
}

export function departureCards(input: CardInput) {
  const { french: fr, timezone, times, now } = input;
  const clock = new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit" });
  const date = new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", { timeZone: timezone, day: "2-digit", month: "2-digit" });
  const weekday = new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", { timeZone: timezone, weekday: "long" });
  const today = localDate(now, timezone);
  const tomorrow = addDays(today, 1);
  const normalizedName = (name: string) => name.normalize("NFKD").replace(/\p{M}/gu, "")
    .toLocaleLowerCase("fr").replace(/[^\p{L}\p{N}]/gu, "");
  const endpoints = new Set([normalizedName(input.origin), normalizedName(input.arrival)]);
  const boardingDetail = (time: JourneyTime) => {
    const stop = input.stops.get(time.departureStopId ?? "");
    return stop && !endpoints.has(normalizedName(stop.name)) ? platformName(stop) : "";
  };
  const format = (limit: number) => {
    const shown = times.slice(0, limit);
    const platforms = new Set(shown.map(boardingDetail));
    const commonPlatform = platforms.size === 1 ? [...platforms][0] : "";
    const description = [
      `**${fr ? "Départ" : "From"}**  ${readableStop(input.origin)}`,
      `**${fr ? "Arrivée" : "To"}**  ${readableStop(input.arrival)}`,
      ...(commonPlatform ? [`**${fr ? "Embarquement" : "Boarding"}**  ${commonPlatform}`] : []),
    ].join("\n");
    const days = new Map<string, { name: string; rows: string[] }>();
    for (const time of shown) {
      const day = localDate(time.departureAt, timezone);
      const departure = new Date(time.departureAt * 1000);
      const label = day === today ? (fr ? "Aujourd’hui" : "Today") : day === tomorrow ? (fr ? "Demain" : "Tomorrow")
        : weekday.format(departure);
      const group = days.get(day) ?? { name: `${label} · ${date.format(departure)}`, rows: [] };
      const display = arrivalForDisplay(time), approximate = display.kind === "approximate";
      const arrival = display.at == null ? ` → ${fr ? "arrivée indisponible" : "arrival unavailable"}` :
        ` → ${approximate ? "≈ " : ""}${clock.format(new Date(display.at * 1000))}${
          localDate(display.at, timezone) !== day ? ` (${date.format(new Date(display.at * 1000))})` : ""}`;
      const duration = display.at == null ? "" : ` · ${approximate ? "≈ " : ""}${Math.round((display.at - time.departureAt) / 60)} min`;
      const platform = !commonPlatform ? boardingDetail(time) : "";
      const scheduled = !time.realtime && shown.some(t => t.realtime) ? (fr ? " · prévu" : " · scheduled") : "";
      group.rows.push(`**${clock.format(departure)}**${arrival}${duration}${scheduled}${platform ? ` · ${platform}` : ""}`);
      days.set(day, group);
    }
    const fields = [...days.values()].map((day) => ({ name: day.name, value: day.rows.join("\n"), inline: false }));
    if (!shown.length) fields.push({ name: fr ? "Départs" : "Departures", value: input.empty, inline: false });
    if (input.notes.length) fields.push({ name: fr ? "À savoir" : "Please note", value: input.notes.join("\n"), inline: false });
    const displays = shown.map(arrivalForDisplay);
    const hasApproximate = displays.some(a => a.kind === "approximate");
    const hasUnavailable = displays.some(a => a.kind === "unavailable");
    const live = shown.some(t => t.realtime), planned = shown.some(t => !t.realtime);
    const reliability = hasApproximate
      ? `${live ? (planned ? (fr ? "Départs temps réel / prévus" : "Live / scheduled departures")
        : (fr ? "Départs temps réel" : "Live departures")) : (fr ? "Départs prévus" : "Scheduled departures")} · ${
        fr ? "≈ arrivée approximative" : "≈ approximate arrival"}`
      : live && hasUnavailable ? (fr ? "Départs temps réel · arrivées selon disponibilité" : "Live departures · arrivals where available")
      : live && planned ? (fr ? "Temps réel / horaires prévus" : "Live / scheduled times")
      : live ? (fr ? "Estimations en temps réel" : "Real-time estimates")
      : input.realtime && !times.length ? (fr ? "Informations en temps réel" : "Real-time information")
      : (fr ? "Horaires théoriques · non temps réel" : "Scheduled times · not real-time");
    const footer = `${reliability} · ${timezone}`;
    const embed: APIEmbed = { color: TRANSPORT_CARD_COLOR, title: input.title.slice(0, 256), description, fields, footer: { text: footer } };
    const content = [`**${input.title}**`, description,
      ...fields.map((field) => `**${field.name}**\n${field.value}`), footer].join("\n\n");
    return { embed, content };
  };
  const compact = format(3);
  const expanded = format(6);
  return { ...compact, expandedEmbed: expanded.embed, expandedContent: expanded.content, hasMore: times.length > 3 };
}
