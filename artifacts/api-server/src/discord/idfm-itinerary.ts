import { scheduledEpoch } from "./gtfs-realtime.js";
import { PlannerError, type OfficialPlace, type VerifiedJourney, type VerifiedLeg } from "./transport-planner-types.js";

export type Json = Record<string, unknown>;
export const obj = (v: unknown): Json => v && typeof v === "object" && !Array.isArray(v) ? v as Json : {};
export const list = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
export const text = (v: unknown): string => typeof v === "string" ? v : "";
export const display = (v: unknown): string => text(v).replace(/<[^>]*>/g, "").replace(/[@*_`~|<>]/g, "")
  .replace(/\s+/g, " ").trim().slice(0, 140);
export const placeKey = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export const idfmId = (id: string) => /^(?:stop_area|stop_point):IDFM:[\w:-]{1,120}$/.test(id);

export function idfmDate(value: unknown): number | null {
  const m = text(value).match(/^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)$/);
  if (!m) return null;
  const date = `${m[1]}-${m[2]}-${m[3]}`, clock = `${m[4]}:${m[5]}:${m[6]}`;
  const at = scheduledEpoch(date, clock, "Europe/Paris");
  if (at == null) return null;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(at * 1000);
  const get = (type: string) => parts.find(p => p.type === type)?.value;
  return `${get("year")}${get("month")}${get("day")}T${get("hour")}${get("minute")}${get("second")}` === value ? at : null;
}
export function plannerDate(at: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(at * 1000);
  const get = (type: string) => parts.find(p => p.type === type)?.value;
  return `${get("year")}${get("month")}${get("day")}T${get("hour")}${get("minute")}${get("second")}`;
}

export function parsePlaces(body: unknown): OfficialPlace[] {
  const root = obj(body);
  if (!Array.isArray(root.places)) throw new PlannerError("invalid");
  const places = root.places.flatMap(value => {
    const p = obj(value), type = text(p.embedded_type), embedded = obj(p[type]);
    const id = text(p.id), name = display(embedded.name || p.name), label = display(embedded.label || p.name);
    const lat = Number(obj(embedded.coord).lat), lon = Number(obj(embedded.coord).lon);
    if (!name || !label || !["stop_area", "address", "poi"].includes(type)) return [];
    if (type === "stop_area") {
      if (!idfmId(id) || !id.startsWith("stop_area:")) return [];
    } else if (!Number.isFinite(lat) || !Number.isFinite(lon) || lon < 1 || lon > 4 || lat < 48 || lat > 49.5) return [];
    const ids = [id, ...list(embedded.stop_points).map(v => text(obj(v).id)).filter(idfmId)];
    // Coordinates are used only when they are actually supplied by the official place service.
    return [{ id: type === "stop_area" ? id : `${lon};${lat}`, name, label, ids,
      ...(Number.isFinite(lat) && Number.isFinite(lon) ? { latitude: lat, longitude: lon } : {}) }];
  });
  return [...new Map(places.map(p => [p.id, p])).values()];
}

function refs(value: unknown): Set<string> {
  const p = obj(value), type = text(p.embedded_type), embedded = obj(p[type]);
  return new Set([text(p.id), text(embedded.id), text(obj(embedded.stop_area).id)].filter(Boolean));
}
const intersects = (a: Set<string>, b: Set<string>) => [...a].some(id => b.has(id));
function continuous(a: unknown, b: unknown) {
  const first = text(obj(a).id), second = text(obj(b).id);
  if (first.startsWith("stop_point:") && second.startsWith("stop_point:")) return first === second;
  return intersects(refs(a), refs(b));
}
function endpointMatches(value: unknown, place: OfficialPlace) {
  if (intersects(refs(value), new Set(place.ids.concat(place.id)))) return true;
  // Address IDs may be returned in canonical coordinate form. No proximity-based station merging.
  if (place.id.startsWith("stop_area:")) return false;
  const p = obj(value), coord = obj(obj(p[text(p.embedded_type)]).coord);
  return place.latitude != null && place.longitude != null &&
    Math.abs(Number(coord.lat) - place.latitude) < 0.000001 && Math.abs(Number(coord.lon) - place.longitude) < 0.000001;
}
function blocking(section: Json, root: Json, departure: number, arrival: number) {
  if (section.status === "NO_SERVICE") return true;
  const linked = new Set([section, obj(section.from), obj(section.to),
    obj(obj(section.from).stop_point), obj(obj(section.to).stop_point)].flatMap(p =>
    list(p.links).map(obj).filter(l => l.type === "disruption").map(l => text(l.id))));
  return list(root.disruptions).map(obj).some(d => {
    if (!linked.has(text(d.id)) || obj(d.severity).effect !== "NO_SERVICE") return false;
    const points = list(d.impacted_objects).map(obj).map(p => text(obj(p.pt_object).id));
    const from = refs(section.from), to = refs(section.to);
    if (points.length && points.every(id => idfmId(id) && !from.has(id) && !to.has(id))) return false;
    const at = points.some(id => to.has(id)) ? arrival : departure;
    if (list(d.application_patterns).length) return true;
    const periods = list(d.application_periods).map(obj);
    return !periods.length || periods.some(p => {
      const begin = idfmDate(p.begin), end = idfmDate(p.end);
      return begin == null || end == null || at >= begin && at < end;
    });
  });
}

/** Invalid or contradictory alternatives are dropped, never repaired using model knowledge. */
export function parseItineraries(body: unknown, from: OfficialPlace, to: OfficialPlace, at: number,
  represents: "arrival" | "departure"): VerifiedJourney[] {
  const root = obj(body);
  if (obj(root.context).timezone && obj(root.context).timezone !== "Europe/Paris") throw new PlannerError("invalid");
  if (!Array.isArray(root.journeys)) throw new PlannerError("invalid");
  const journeys: VerifiedJourney[] = [];
  for (const j of root.journeys.map(obj).sort((a, b) => Number(b.type === "best") - Number(a.type === "best"))) {
    const dep = idfmDate(j.departure_date_time), arr = idfmDate(j.arrival_date_time), sections = list(j.sections).map(obj);
    if (dep == null || arr == null || arr < dep || arr - dep > 48 * 3600 || j.status === "NO_SERVICE" ||
      sections.length < 1 || sections.length > 24 || !endpointMatches(sections[0]!.from, from) ||
      !endpointMatches(sections.at(-1)!.to, to) ||
      (represents === "departure" ? dep < at - 30 : arr > at + 30)) continue;
    const duration = Number(j.duration);
    if (!Number.isFinite(duration) || Math.abs(arr - dep - duration) > 1) continue;
    const legs: VerifiedLeg[] = [];
    let valid = true, previousEnd = dep, previousPlace: unknown;
    for (const raw of sections) {
      // Navitia omits the endpoints of a waiting section. It stays at the
      // previously verified endpoint; it cannot create a new connection.
      const s = raw.type === "waiting" && !raw.from && !raw.to && previousPlace
        ? { ...raw, from: previousPlace, to: previousPlace } : raw;
      const departure = idfmDate(s.departure_date_time), arrival = idfmDate(s.arrival_date_time);
      const fromName = display(obj(s.from).name), toName = display(obj(s.to).name);
      const kind = s.type === "public_transport" ? "transit"
        : s.type === "street_network" || s.type === "crow_fly" ? "walk"
        : s.type === "transfer" ? "transfer" : s.type === "waiting" ? "wait" : null;
      const info = obj(s.display_informations), mode = text(obj(s.street_network).mode || s.mode);
      if (!kind || departure == null || arrival == null || arrival < departure || departure !== previousEnd ||
        !fromName || !toName || blocking(s, root, departure, arrival) ||
        (previousPlace && !continuous(previousPlace, s.from)) ||
        kind === "walk" && mode !== "walking") { valid = false; break; }
      const line = display(info.code || info.label), direction = display(info.direction);
      const visits = list(s.stop_date_times);
      if (kind === "transit" && (!line || !direction ||
        [visits[0], visits.at(-1)].filter(Boolean).some(v => ["skipped", "deleted", "cancelled"].includes(text(obj(v).departure_status)) ||
          ["skipped", "deleted", "cancelled"].includes(text(obj(v).arrival_status))))) { valid = false; break; }
      legs.push({ kind, from: fromName, to: toName, departure, arrival, ...(kind === "transit" ? {
        line: `${display(info.commercial_mode || info.physical_mode)} ${line}`.trim(), direction,
        freshness: text(s.data_freshness),
      } : {}) });
      previousEnd = arrival; previousPlace = s.to;
    }
    if (valid && legs.some(l => l.kind === "transit") && previousEnd === arr && legs.length <= 14)
      journeys.push({ departure: dep, arrival: arr, legs, warning: !!j.status && j.status !== "NO_SERVICE" });
  }
  if (!journeys.length && root.journeys.length) throw new PlannerError("invalid");
  return journeys;
}
