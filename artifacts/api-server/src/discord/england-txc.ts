import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { JourneyIndex } from "./gtfs-journey.js";
import { addDays, localDate } from "./gtfs-realtime.js";
import { TransportDataError } from "./transport-data-error.js";

type Element = Record<string, unknown>;
export const element = (value: unknown): Element => value && typeof value === "object" && !Array.isArray(value) ? value as Element : {};
export const elements = (value: unknown): Element[] => (Array.isArray(value) ? value : value == null ? [] : [value]).map(element);
export const value = (node: Element, name: string): string => {
  const raw = node[name]; return typeof raw === "string" ? raw : typeof raw === "number" ? String(raw)
    : typeof element(raw)["#text"] === "string" ? element(raw)["#text"] as string : "";
};
export function xmlDocument(xml: string): Element {
  if (xml.length > 8 * 1024 * 1024 || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new TransportDataError("XML anglais hors limites ou non autorisé.");
  let depth = 0;
  for (const token of xml.matchAll(/<\/?[A-Za-z][^>]*>/g)) {
    if (token[0].startsWith("</")) depth--;
    else if (!token[0].endsWith("/>")) depth++;
    if (depth > 64) throw new TransportDataError("XML anglais trop imbriqué.");
  }
  if (XMLValidator.validate(xml) !== true) throw new TransportDataError("XML anglais invalide.");
  return new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "$", parseTagValue: false,
    removeNSPrefix: true, trimValues: true }).parse(xml) as Element;
}
export interface BankHoliday { date: string; title: string }
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS: Record<string, number[]> = Object.fromEntries(DAY_NAMES.map((day, i) => [day, [i]]));
Object.assign(DAYS, { MondayToFriday: [1, 2, 3, 4, 5], MondayToSaturday: [1, 2, 3, 4, 5, 6],
  MondayToSunday: [0, 1, 2, 3, 4, 5, 6], Weekend: [0, 6], WeekendDays: [0, 6] });
const HOLIDAYS: Record<string, RegExp> = {
  NewYearsDay: /new year/i, NewYearsDayHoliday: /new year/i, GoodFriday: /good friday/i, EasterMonday: /easter monday/i,
  MayDay: /early may/i, SpringBank: /spring bank/i, LateSummerBankHolidayNotScotland: /summer bank/i,
  ChristmasDay: /christmas day/i, ChristmasDayHoliday: /christmas day/i, BoxingDay: /boxing day/i, BoxingDayHoliday: /boxing day/i,
};
const SCOTTISH = /Scotland|StAndrews|Jan2nd/;
function bankDay(tag: string, date: string, holidays: BankHoliday[]) {
  if (tag === "ChristmasEve") return date.endsWith("-12-24");
  if (tag === "NewYearsEve") return date.endsWith("-12-31");
  if (SCOTTISH.test(tag)) return false;
  if (tag === "AllBankHolidays") return holidays.some(h => h.date === date);
  const match = HOLIDAYS[tag];
  if (!match) throw new Error("Unsupported bank-holiday rule");
  // Actual calendar days and substitute public holidays have distinct meanings.
  if (tag === "ChristmasDay" && date.endsWith("-12-25") || tag === "BoxingDay" && date.endsWith("-12-26") ||
    tag === "NewYearsDay" && date.endsWith("-01-01")) return true;
  return holidays.some(h => h.date === date && match.test(h.title) &&
    (tag.endsWith("Holiday") || !/substitute/i.test(h.title)));
}
function inRanges(raw: unknown, date: string) {
  const container = element(raw);
  const keys = Object.keys(container).filter(k => !k.startsWith("$"));
  if (keys.some(k => !["DateRange", "Date"].includes(k))) throw new Error("Unsupported special-day rule");
  const dates = Array.isArray(container.Date) ? container.Date : container.Date == null ? [] : [container.Date];
  return dates.includes(date) || elements(container.DateRange).some(range => {
    const from = value(range, "StartDate"), to = value(range, "EndDate");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new Error("Invalid date range");
    return from <= date && date <= to;
  });
}
export function txcRuns(profile: Element, date: string, holidays: BankHoliday[]) {
  const supported = ["RegularDayType", "SpecialDaysOperation", "BankHolidayOperation"];
  if (Object.keys(profile).some(k => !k.startsWith("$") && !supported.includes(k))) throw new Error("Unsupported operating profile");
  const days = element(element(profile.RegularDayType).DaysOfWeek), tags = Object.keys(days);
  if (!tags.length || tags.some(t => !DAYS[t])) throw new Error("Unverified weekly calendar");
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  let runs = tags.some(t => DAYS[t]!.includes(weekday));
  const bank = element(profile.BankHolidayOperation);
  if (Object.keys(bank).length) {
    if (!holidays.some(h => h.date.startsWith(date.slice(0, 4)))) throw new Error("Bank-holiday year unavailable");
    const operate = Object.keys(element(bank.DaysOfOperation)), exclude = Object.keys(element(bank.DaysOfNonOperation));
    if (operate.some(t => bankDay(t, date, holidays))) runs = true;
    if (exclude.some(t => bankDay(t, date, holidays))) runs = false;
  }
  const special = element(profile.SpecialDaysOperation);
  if (inRanges(special.DaysOfOperation, date)) runs = true;
  if (inRanges(special.DaysOfNonOperation, date)) runs = false;
  return runs;
}
const duration = (raw: string) => {
  const m = raw.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/);
  if (!m || !m.slice(1).some(v => v != null)) throw new Error("Invalid published running time");
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
};
const clock = (seconds: number) => `${Math.floor(seconds / 3600).toString().padStart(2, "0")}:${
  Math.floor(seconds / 60 % 60).toString().padStart(2, "0")}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
const seconds = (time: string) => {
  if (!/^\d{2}:[0-5]\d:[0-5]\d$/.test(time)) throw new Error("Invalid published departure");
  const [h, m, s] = time.split(":").map(Number); return h! * 3600 + m! * 60 + s!;
};
function activity(node: Element, fallback?: Element) {
  const name = value(node, "Activity") || (fallback ? value(fallback, "Activity") : "") || "pickUpAndSetDown";
  if (!["pickUp", "setDown", "pickUpAndSetDown", "pass"].includes(name)) throw new Error("Unverified stopping activity");
  return { pickup: name === "pickUp" || name === "pickUpAndSetDown", dropoff: name === "setDown" || name === "pickUpAndSetDown" };
}

/** Convert only explicitly supported TXC journeys. Calendars remain in RAM.
 * Unresolved school calendars, inherited journeys and unknown extensions are
 * excluded, rather than being interpreted as everyday services. */
export function appendTxc(index: JourneyIndex, xml: string, lineName: string, holidays: BankHoliday[], now: number, fileId: string) {
  const root = element(xmlDocument(xml).TransXChange);
  const services = elements(element(root.Services).Service).filter(service =>
    elements(element(service.Lines).Line).some(line => value(line, "LineName").toLowerCase() === lineName.toLowerCase()));
  if (!services.length) return { accepted: 0, excluded: 0 };
  const sections = new Map(elements(element(root.JourneyPatternSections).JourneyPatternSection).map(s => [value(s, "$id"), s]));
  const stops = [...elements(element(root.StopPoints).AnnotatedStopPointRef), ...elements(element(root.StopPoints).StopPoint)];
  for (const stop of stops) {
    const id = value(stop, "StopPointRef") || value(stop, "AtcoCode");
    if (id) index.stops.set(id, { id, name: value(stop, "CommonName") || id, parent: "" });
  }
  let accepted = 0, excluded = 0;
  const today = localDate(now, "Europe/London"), dates = Array.from({ length: 10 }, (_, i) => addDays(today, i - 1));
  const journeys = elements(element(root.VehicleJourneys).VehicleJourney);
  for (const service of services) {
    const serviceCode = value(service, "ServiceCode"), period = element(service.OperatingPeriod);
    const start = value(period, "StartDate"), end = value(period, "EndDate");
    const lines = elements(element(service.Lines).Line).filter(line => value(line, "LineName").toLowerCase() === lineName.toLowerCase());
    const patterns = new Map(elements(element(service.StandardService).JourneyPattern).map(p => [value(p, "$id"), p]));
    for (const journey of journeys.filter(j => value(j, "ServiceRef") === serviceCode &&
      (!value(j, "LineRef") || lines.some(l => value(l, "$id") === value(j, "LineRef"))))) {
      try {
        if (journey.VehicleJourneyRef || journey.Frequency || journey.FrequencyService || journey.DepartureDayShift)
          throw new Error("Unsupported journey inheritance or frequency");
        const pattern = patterns.get(value(journey, "JourneyPatternRef"));
        if (!pattern || !/^\d{4}-\d{2}-\d{2}$/.test(start) || end && !/^\d{4}-\d{2}-\d{2}$/.test(end))
          throw new Error("Unverified pattern or period");
        const profile = element(journey.OperatingProfile ?? pattern.OperatingProfile ?? service.OperatingProfile);
        // Evaluate the entire window first. An unsupported rule must exclude the
        // whole journey, not leave partially inserted calendar exceptions behind.
        const operatingDates = dates.filter(date => date >= start && (!end || date <= end) && txcRuns(profile, date, holidays));
        const refs = value(pattern, "JourneyPatternSectionRefs").split(/\s+/).filter(Boolean);
        if (!refs.length || refs.some(ref => !sections.has(ref))) throw new Error("Missing timing section");
        const links = refs.flatMap(ref => elements(sections.get(ref)!.JourneyPatternTimingLink));
        if (!links.length || links.length > 500) throw new Error("Unsupported route length");
        const overrides = elements(journey.VehicleJourneyTimingLink);
        if (overrides.some(o => !links.some(l => value(l, "$id") === value(o, "JourneyPatternTimingLinkRef"))))
          throw new Error("Unresolved timing override");
        const visits: NonNullable<ReturnType<JourneyIndex["visits"]["get"]>> = [];
        let at = seconds(value(journey, "DepartureTime"));
        for (const [i, link] of links.entries()) {
          const override = overrides.find(o => value(o, "JourneyPatternTimingLinkRef") === value(link, "$id")) ?? {};
          const from = element(link.From), to = element(link.To), fromOverride = element(override.From), toOverride = element(override.To);
          const fromId = value(from, "StopPointRef"), toId = value(to, "StopPointRef");
          if (!fromId || !toId || !index.stops.has(fromId) || !index.stops.has(toId) || i && visits.at(-1)?.stopId !== fromId)
            throw new Error("Unresolved stop continuity");
          const wait = value(fromOverride, "WaitTime") || value(from, "WaitTime");
          if (!i) visits.push({ stopId: fromId, sequence: 0, arrival: clock(at), departure: clock(at), ...activity(fromOverride, from) });
          else {
            const previous = visits.at(-1)!;
            if (wait) at += duration(wait);
            previous.departure = clock(at);
            Object.assign(previous, activity(fromOverride, from));
          }
          at += duration(value(override, "RunTime") || value(link, "RunTime"));
          const arrived = at, dwell = value(toOverride, "WaitTime") || value(to, "WaitTime");
          if (dwell) at += duration(dwell);
          if (at > 48 * 3600) throw new Error("Unverified multi-day timing");
          visits.push({ stopId: toId, sequence: i + 1, arrival: clock(arrived), departure: clock(at), ...activity(toOverride, to) });
        }
        const id = `${fileId}:${value(journey, "VehicleJourneyCode")}`;
        if (!value(journey, "VehicleJourneyCode") || index.visits.has(id)) throw new Error("Ambiguous journey identifier");
        if (index.visits.size >= 8000) throw new TransportDataError("Trop de courses dans la ligne anglaise.");
        index.visits.set(id, visits);
        index.metadata.trips.set(id, { routeId: index.routeId, serviceId: id,
          directionId: value(pattern, "Direction"), headsign: value(pattern, "DestinationDisplay") });
        for (const date of operatingDates) index.metadata.calendarExceptions.set(`${date.replaceAll("-", "")}:${id}`, 1);
        accepted++;
      } catch (error) {
        if (error instanceof TransportDataError) throw error;
        excluded++;
      }
    }
  }
  return { accepted, excluded };
}
