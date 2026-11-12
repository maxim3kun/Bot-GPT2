import { createHash } from "node:crypto";
import type { TransportLine, StopGroup, LineListing, TransportTimeOptions } from "./transport-browser.js";
import type { JourneyIndex, JourneyTime } from "./gtfs-journey.js";
import { journeyPairs } from "./gtfs-journey.js";
import { departureCards } from "./transport-presentation.js";
import { TransportMetadataCache } from "./transport-metadata-cache.js";
import { EnglandHttp } from "./england-http.js";
import { TransportDataError } from "./transport-data-error.js";
import { normalizeTransitText, type TransitMode } from "./transport-query.js";
import type { EnglandLocation } from "./england-locations.js";
import { addDays, localDate, scheduledEpoch } from "./gtfs-realtime.js";
import { logger } from "../lib/logger.js";

interface TflStop { id: string; name: string; parentId?: string; stationId?: string; topMostParentId?: string;
  stopLetter?: string; lat: number; lon: number }
interface Sequence { branchId: number; direction: string; nextBranchIds: number[]; prevBranchIds: number[]; stopPoint: TflStop[] }
interface Pattern { id: string; routeId: string; direction: string; stopIds: string[] }
interface StopReference { id: string; name: string; parent: string; latitude: number; longitude: number; stopLetter?: string }
interface Prediction {
  id: string; vehicleId: string; naptanId: string; lineId: string; direction: string;
  destinationNaptanId: string; expectedArrival: string; timestamp: string; tripId?: string;
}
interface TimetableInterval { stopId?: string; timeToArrival?: number | string }
interface TimetableKnownJourney { hour?: number | string; minute?: number | string; intervalId?: number | string }
interface TimetableSchedule { name?: string; knownJourneys?: TimetableKnownJourney[] }
interface TimetableRoute {
  stationIntervals?: Array<{ id?: number | string; intervals?: TimetableInterval[] }>;
  schedules?: TimetableSchedule[];
}
interface TimetableResponse {
  lineId?: string;
  timetable?: { departureStopId?: string; routes?: TimetableRoute[] };
}
interface Disruption { atcoCode?: string; stationAtcoCode?: string; type?: string; description?: string; fromDate?: string; toDate?: string; mode?: string }
interface Status { lineStatuses?: Array<{ statusSeverity: number; reason?: string; statusSeverityDescription: string }> }

function lineId(line: TransportLine) {
  const id = line.routeId.replace(/^tfl:/, "");
  if (!/^[a-z0-9-]{1,80}$/.test(id)) throw new TransportDataError("Identifiant TfL invalide.");
  return id;
}
const numberId = (id: string) => createHash("sha256").update(id).digest().readUInt32BE(0);
const encoded = (id: string) => encodeURIComponent(id);

/** Only join explicitly linked branches sharing their official endpoint. */
export function tflPatterns(sequences: Sequence[], routeId: string): Pattern[] {
  if (!sequences.length || sequences.length > 100) throw new TransportDataError("Branches TfL indisponibles.");
  const result: Pattern[] = [];
  const walk = (sequence: Sequence, ids: string[], seen: Set<number>) => {
    if (seen.has(sequence.branchId)) throw new TransportDataError("Boucle de branches TfL non prise en charge.");
    const stops = sequence.stopPoint.map(s => s.id);
    if (!stops.length || ids.length && ids.at(-1) !== stops[0])
      throw new TransportDataError("La continuité des branches TfL ne peut pas être vérifiée.");
    const path = [...ids, ...stops.slice(ids.length ? 1 : 0)], visited = new Set([...seen, sequence.branchId]);
    const next = (sequence.nextBranchIds ?? []).map(id => sequences.find(s => s.branchId === id && s.direction === sequence.direction));
    if (path.length > 500 || result.length >= 80 || next.some(s => !s))
      throw new TransportDataError("Parcours TfL incomplet ou trop complexe.");
    if (!next.length) result.push({ id: `${sequence.direction}:${result.length}`, routeId, direction: sequence.direction, stopIds: path });
    else for (const child of next) walk(child!, path, visited);
  };
  const starts = sequences.filter(s => !(s.prevBranchIds?.length));
  if (!starts.length) throw new TransportDataError("Aucun début de branche TfL vérifié.");
  for (const start of starts) walk(start, [], new Set());
  return result;
}

export function tflTimes(index: JourneyIndex, origin: StopGroup, arrival: StopGroup,
  boarding: Prediction[], alighting: Prediction[], now: number): JourneyTime[] {
  const pairs = journeyPairs(index, new Set(origin.ids), new Set(arrival.ids));
  const fresh = (p: Prediction) => {
    const stamp = Date.parse(p.timestamp) / 1000;
    return Number.isFinite(stamp) && now - stamp <= 120 && now - stamp >= -30;
  };
  return boarding.filter(fresh).flatMap(p => {
    if (`tfl:${p.lineId}` !== index.routeId || !origin.ids.includes(p.naptanId)) return [];
    const departureAt = Date.parse(p.expectedArrival) / 1000;
    if (!Number.isFinite(departureAt) || departureAt < now - 10 || departureAt > now + 3600) return [];
    // The announced terminal must reach the chosen destination on this same
    // official branch; never infer a direction from a destination's text.
    const sameVehicleAt = (q: Prediction, stopId: string) => fresh(q) && q.lineId === p.lineId && q.direction === p.direction &&
      q.destinationNaptanId === p.destinationNaptanId && q.naptanId === stopId &&
      /^[a-z0-9_-]{1,80}$/i.test(p.vehicleId) && !/^0+$/.test(p.vehicleId) && q.vehicleId === p.vehicleId &&
      (!p.tripId || q.tripId === p.tripId) &&
      Date.parse(q.expectedArrival) / 1000 > departureAt && Date.parse(q.expectedArrival) / 1000 - departureAt <= 3 * 3600;
    const pair = pairs.find(pair => {
      const trip = index.metadata.trips.get(pair.tripId), visits = index.visits.get(pair.tripId)!;
      // The official line branch proves this route serves the selected stop.
      // A prediction's terminal can confirm or rule out that stop only when its
      // ID matches the branch. If TfL omits/uses an unknown terminal ID, keep
      // the real departure and leave its arrival time explicitly unconfirmed.
      const terminalOnBranch = visits.some(v => v.stopId === p.destinationNaptanId);
      const terminalAfterArrival = visits.some(v => v.sequence >= pair.destination.sequence &&
        v.stopId === p.destinationNaptanId);
      const reaches = !p.destinationNaptanId || terminalAfterArrival || !terminalOnBranch;
      return trip?.directionId === p.direction && pair.origin.stopId === p.naptanId && reaches;
    });
    if (!pair) return [];
    const candidates = [...new Set(alighting.filter(q => sameVehicleAt(q, pair.destination.stopId))
      .map(q => Date.parse(q.expectedArrival) / 1000))];
    const arrivalAt = candidates.length === 1 ? candidates[0]! : null;
    return [{ tripId: p.id, departureAt, arrivalAt, realtime: true,
      departureStopId: p.naptanId, arrivalStopId: pair.destination.stopId }];
  }).sort((a, b) => a.departureAt - b.departureAt)
    .filter((p, i, all) => all.findIndex(q => q.tripId === p.tripId && q.departureAt === p.departureAt) === i).slice(0, 6);
}

const DAY_NAMES = new Map([
  ["monday", 1], ["mondays", 1], ["mon", 1], ["mo", 1],
  ["tuesday", 2], ["tuesdays", 2], ["tue", 2], ["tu", 2],
  ["wednesday", 3], ["wednesdays", 3], ["wed", 3], ["we", 3],
  ["thursday", 4], ["thursdays", 4], ["thu", 4], ["th", 4],
  ["friday", 5], ["fridays", 5], ["fri", 5], ["fr", 5],
  ["saturday", 6], ["saturdays", 6], ["sat", 6], ["sa", 6],
  ["sunday", 0], ["sundays", 0], ["sun", 0], ["su", 0],
]);

function scheduleWeekdays(name: string): Set<number> {
  const normalized = normalizeTransitText(name);
  if (/\b(?:daily|every day|all days|all week)\b/.test(normalized)) return new Set([0, 1, 2, 3, 4, 5, 6]);
  if (/\bweekdays?\b/.test(normalized)) return new Set([1, 2, 3, 4, 5]);
  if (/\bweekends?\b/.test(normalized)) return new Set([0, 6]);
  // TfL labels overnight schedules by the evening service day, e.g.
  // "Mo-Th Nights/Tu-Fr Morning"; only the first half identifies that day.
  const label = normalized.split(/[\\/;]/, 1)[0]!;
  const aliases = "monday|mondays|mon|mo|tuesday|tuesdays|tue|tu|wednesday|wednesdays|wed|we|thursday|thursdays|thu|th|friday|fridays|fri|fr|saturday|saturdays|sat|sa|sunday|sundays|sun|su";
  const range = label.match(new RegExp(`\\b(${aliases})\\s*(?:-|\\bto\\b)\\s*(${aliases})\\b`));
  if (range) {
    const start = DAY_NAMES.get(range[1]!), end = DAY_NAMES.get(range[2]!);
    if (start === undefined || end === undefined) return new Set();
    const days = new Set<number>();
    for (let day = start, count = 0; count < 7; day = (day + 1) % 7, count++) {
      days.add(day);
      if (day === end) break;
    }
    return days;
  }
  return new Set((label.match(/[a-z]+/g) ?? []).flatMap(token => {
    const day = DAY_NAMES.get(token);
    return day === undefined ? [] : [day];
  }));
}

function weekday(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay();
}

export function tflTimetableTimes(data: TimetableResponse, origin: StopGroup, arrival: StopGroup, now: number) {
  const routes = data.timetable?.routes ?? [];
  const matchedRoutes = routes.filter(route => route.stationIntervals?.some(interval =>
    interval.intervals?.some(stop => arrival.ids.includes(stop.stopId ?? ""))));
  const schedules = matchedRoutes.flatMap(route => (route.schedules ?? []).map(schedule =>
    ({ route, schedule, days: scheduleWeekdays(schedule.name ?? "") })));
  const hasPublishedSchedule = schedules.some(({ schedule }) => (schedule.knownJourneys?.length ?? 0) > 0);
  const hasUsableSchedule = schedules.some(({ schedule, days }) => (schedule.knownJourneys?.length ?? 0) > 0 && days.size > 0);
  const today = localDate(now, "Europe/London");
  const times: JourneyTime[] = [];

  for (let offset = -1; offset <= 7; offset++) {
    const serviceDate = addDays(today, offset);
    for (const { route, schedule, days } of schedules) {
      if (!days.has(weekday(serviceDate))) continue;
      for (const [index, journey] of (schedule.knownJourneys ?? []).entries()) {
        const hour = Number(journey.hour), minute = Number(journey.minute);
        if (journey.intervalId === undefined || journey.intervalId === null ||
          !Number.isInteger(hour) || hour < 0 || hour > 47 || !Number.isInteger(minute) || minute < 0 || minute > 59) continue;
        const departureAt = scheduledEpoch(serviceDate,
          `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`, "Europe/London");
        if (departureAt === null || departureAt <= now || departureAt > now + 7 * 24 * 3600) continue;
        const interval = route.stationIntervals?.find(value => String(value.id) === String(journey.intervalId));
        const duration = interval?.intervals?.find(stop => arrival.ids.includes(stop.stopId ?? ""))?.timeToArrival;
        const minutes = Number(duration);
        if (!interval || !Number.isFinite(minutes) || minutes < 0 || minutes > 360) continue;
        const departureStopId = data.timetable?.departureStopId ?? origin.ids[0];
        if (!origin.ids.includes(departureStopId)) continue;
        times.push({ tripId: `tfl-schedule:${serviceDate}:${schedule.name ?? "service"}:${index}`,
          departureAt, arrivalAt: departureAt + minutes * 60, realtime: false,
          departureStopId, arrivalStopId: arrival.ids.find(id => interval.intervals?.some(stop => stop.stopId === id)) });
      }
    }
  }
  const unique = [...new Map(times.sort((a, b) => a.departureAt - b.departureAt)
    .map(time => [`${time.departureAt}:${time.arrivalStopId}`, time])).values()].slice(0, 6);
  return { times: unique, hasPublishedSchedule, hasUsableSchedule };
}

export class TflTransportClient {
  private pendingReferences = new Map<string, Promise<{ patterns: Pattern[]; stops: StopReference[] }>>();
  constructor(readonly http = new EnglandHttp("tfl"), readonly metadata = new TransportMetadataCache(), private now = Date.now) {}

  async london(): Promise<EnglandLocation[]> {
    return this.metadata.get({ territory: "en", provider: "tfl", kind: "locations", source: "London", version: "v1" }, 24 * 3600_000, async () => {
      // A real official central station is an anchor for the TfL network, not
      // an invented city coordinate or a journey endpoint.
      const stop = await this.http.json<TflStop>("/StopPoint/940GZZLUCHX");
      if (!Number.isFinite(stop.lat) || !Number.isFinite(stop.lon)) throw new TransportDataError("Repère londonien TfL indisponible.");
      return [{ id: "tfl:london", name: "London / Londres", label: "London / Londres · réseau TfL · Angleterre",
        latitude: stop.lat, longitude: stop.lon, territory: "en", area: "490" }];
    });
  }
  async lines(mode: TransitMode, requested: string): Promise<LineListing> {
    if (mode === "rail") throw new TransportDataError("Trains anglais : accès National Rail en attente de validation. Aucun horaire train n’est confirmé.");
    const apiMode = mode === "metro" ? "tube" : mode;
    const load = async (path: string) => {
      const data = await this.http.json<Array<{ id: string; name: string; modeName: string }>>(path);
      if (!Array.isArray(data)) throw new TransportDataError("Catalogue TfL illisible.");
      return data.filter(l => l.modeName === apiMode && /^[a-z0-9-]+$/.test(l.id))
        .map(l => ({ routeId: `tfl:${l.id}`, shortName: l.name, longName: l.name, mode, stopIds: [] as string[] }));
    };
    const lineId = requested.trim();
    const exactId = /^[a-z0-9-]{1,12}$/i.test(lineId);
    let rows: Awaited<ReturnType<typeof load>>;
    if (exactId) {
      const path = `/Line/${encodeURIComponent(lineId)}`;
      try {
        rows = await this.metadata.get({ territory: "en", provider: "tfl", kind: "routes",
          source: path, version: "v1" }, 6 * 3600_000, () => load(path));
      } catch (error) {
        // An unknown route ID may be a display name; use the cached complete
        // mode list only for a genuine 404, not after a slow or failed request.
        if (!(error instanceof TransportDataError) || !/HTTP 404/.test(error.message)) throw error;
        rows = await this.metadata.get({ territory: "en", provider: "tfl", kind: "routes",
          source: `/Line/Mode/${apiMode}`, version: "v1" }, 6 * 3600_000, () => load(`/Line/Mode/${apiMode}`));
      }
    } else {
      const path = `/Line/Mode/${apiMode}`;
      rows = await this.metadata.get({ territory: "en", provider: "tfl", kind: "routes",
        source: path, version: "v1" }, 6 * 3600_000, () => load(path));
    }
    const wanted = normalizeTransitText(requested);
    return { lines: rows.filter(r => !wanted || [r.shortName, r.routeId.slice(4)].some(s => normalizeTransitText(s) === wanted))
      .map(r => ({ routeId: r.routeId, label: r.shortName, description: "Transport for London", mode, nearbyStopIds: [],
        allStops: true, territory: "en" as const, realtime: [], source: {
          name: "Transport for London", url: `https://tfl.gov.uk/modes/${mode === "metro" ? "tube" : mode === "bus" ? "buses" : "trams"}/`,
          attribution: "Powered by TfL Open Data",
        }, resource: { id: numberId(r.routeId), title: r.longName, format: "TfL JSON", is_available: true,
          url: `https://api.tfl.gov.uk/Line/${r.routeId.slice(4)}/Route/Sequence/all` } })),
      unavailable: 0, networkScoped: true };
  }

  private async reference(id: string) {
    const key = { territory: "en" as const, provider: "tfl", source: `/Line/${id}/Route/Sequence/all`, version: "v1" };
    const load = () => {
      const old = this.pendingReferences.get(id); if (old) return old;
      const work = this.http.json<{ stopPointSequences: Sequence[] }>(key.source).then(data => {
        const sequences = data.stopPointSequences;
        if (!Array.isArray(sequences)) throw new TransportDataError("Arrêts TfL indisponibles.");
        const patterns = tflPatterns(sequences, `tfl:${id}`);
        const stops = [...new Map(sequences.flatMap(s => s.stopPoint.map(p => [p.id, {
          id: p.id, name: p.name, parent: p.parentId || (p.stationId !== p.id ? p.stationId : "") || "",
          latitude: p.lat, longitude: p.lon, ...(p.stopLetter ? { stopLetter: p.stopLetter } : {}),
        }] as const))).values()];
        return { patterns, stops };
      });
      this.pendingReferences.set(id, work);
      return work;
    };
    try {
      const [patterns, stops] = await Promise.all([
        this.metadata.get({ ...key, kind: "patterns" }, 6 * 3600_000, async () => (await load()).patterns),
        this.metadata.get({ ...key, kind: "stops" }, 6 * 3600_000, async () => (await load()).stops),
      ]);
      return { patterns, stops };
    } finally { this.pendingReferences.delete(id); }
  }
  async index(line: TransportLine): Promise<JourneyIndex> {
    const { patterns, stops } = await this.reference(lineId(line));
    const index: JourneyIndex = { routeId: line.routeId, stops: new Map(stops.map(s => [s.id, { ...s }])), visits: new Map(),
      connectionsUnavailable: true, metadata: { routes: new Map(), trips: new Map(), calendars: new Map(),
        calendarExceptions: new Map(), timezone: "Europe/London" } };
    // These are topology-only branches, NOT fabricated trips or timetables.
    // Departures always go through the fresh TfL predictions below.
    for (const pattern of patterns) {
      index.metadata.trips.set(pattern.id, { routeId: line.routeId, directionId: pattern.direction, headsign: "", serviceId: "" });
      index.visits.set(pattern.id, pattern.stopIds.map((stopId, sequence) =>
        ({ stopId, sequence, pickup: true, dropoff: true, arrival: "", departure: "" })));
    }
    return index;
  }
  private async traffic(line: TransportLine, stops: string[]) {
    const [statuses, disruptions] = await Promise.all([
      this.http.json<Status[]>(`/Line/${lineId(line)}/Status`),
      this.http.json<Disruption[]>(`/StopPoint/${stops.map(encoded).join(",")}/Disruption`),
    ]);
    const at = this.now(), active = disruptions.filter(d => (!d.fromDate || Date.parse(d.fromDate) <= at) &&
      (!d.toDate || Date.parse(d.toDate) > at));
    return { statuses: statuses.flatMap(s => s.lineStatuses ?? []), disruptions: active };
  }
  private async fixedBusTimes(line: TransportLine, index: JourneyIndex, origin: StopGroup, arrival: StopGroup, now: number) {
    const pairs = journeyPairs(index, new Set(origin.ids), new Set(arrival.ids));
    const endpoints = [...new Map(pairs.map(pair => [`${pair.origin.stopId}:${pair.destination.stopId}`,
      { from: pair.origin.stopId, to: pair.destination.stopId }])).values()].slice(0, 3);
    let checked = false, hasPublishedSchedule = false, hasUsableSchedule = false;
    for (const endpoint of endpoints) {
      try {
        const data = await this.http.json<TimetableResponse>(
          `/Line/${encoded(lineId(line))}/Timetable/${encoded(endpoint.from)}/to/${encoded(endpoint.to)}`);
        checked = true;
        if (data.lineId && data.lineId.toLowerCase() !== lineId(line).toLowerCase()) continue;
        const result = tflTimetableTimes(data,
          { label: origin.label, ids: [endpoint.from] }, { label: arrival.label, ids: [endpoint.to] }, now);
        hasPublishedSchedule ||= result.hasPublishedSchedule;
        hasUsableSchedule ||= result.hasUsableSchedule;
        if (result.times.length) return { ...result, checked };
      } catch (error) {
        logger.debug({ routeId: line.routeId, err: error }, "TfL fixed timetable unavailable; keeping live result");
      }
    }
    return { times: [] as JourneyTime[], checked, hasPublishedSchedule, hasUsableSchedule };
  }
  async departures(line: TransportLine, index: JourneyIndex, origin: StopGroup, arrival: StopGroup, language: string,
    options: TransportTimeOptions = {}) {
    const french = language === "fr", id = lineId(line), now = Math.floor(this.now() / 1000);
    const notBefore = Math.max(now, options.departureAfter ?? now);
    const stops = [...new Set([...origin.ids, ...arrival.ids])];
    if (stops.length > 12) throw new TransportDataError("Trop de quais TfL sélectionnés. Précise les arrêts.");
    let traffic: Awaited<ReturnType<TflTransportClient["traffic"]>>;
    try { traffic = await this.traffic(line, stops); }
    catch { throw new TransportDataError("Perturbations TfL indisponibles : aucun trajet n’est confirmé pour le moment."); }
    const suspended = traffic.statuses.some(s => s.statusSeverity === 2);
    // A line cannot be inferred from prose: a stop closure with no verified line
    // scope blocks confirmation conservatively instead of closing another line.
    const closed = traffic.disruptions.some(d => /^(?:closure|stopclosed|stationclosed)$/i.test(d.type ?? ""));
    if (suspended || closed) return { content: french
      ? "Trajet non confirmé : fermeture ou interruption signalée par TfL aux arrêts choisis."
      : "Journey not confirmed: TfL reports a closure or suspension at the selected stops.", source: line.source };
    const predictions = await Promise.all(stops.map(stop =>
      this.http.json<Prediction[]>(`/Line/${id}/Arrivals/${encoded(stop)}`)));
    const all = predictions.flat();
    let times = tflTimes(index, origin, arrival, all, all, now).filter(time => time.departureAt >= notBefore);
    const notes = [...new Set([
      ...traffic.statuses.filter(s => s.statusSeverity !== 10).map(s => s.reason || s.statusSeverityDescription),
      ...traffic.disruptions.map(d => d.description ?? ""),
    ].filter(Boolean))].slice(0, 3).map(s => s.slice(0, 350));
    if (!times.length && line.mode === "bus") {
      const fallback = await this.fixedBusTimes(line, index, origin, arrival, now);
      times = fallback.times.filter(time => time.departureAt >= notBefore);
      if (times.length) notes.push(french ? "Horaires fixes publiés par TfL · non temps réel." : "TfL published timetable · not real time.");
      else if (!fallback.checked) notes.push(french
        ? "Horaires fixes TfL indisponibles pour cette recherche." : "TfL fixed timetable unavailable for this search.");
      else if (!fallback.hasPublishedSchedule) notes.push(french
        ? "Aucun horaire fixe TfL publié pour ces arrêts." : "No fixed TfL timetable is published for these stops.");
      else if (!fallback.hasUsableSchedule) notes.push(french
        ? "Les jours de service des horaires TfL publiés ne permettent pas de confirmer les prochains passages."
        : "The published TfL timetable days do not allow the next departures to be confirmed.");
      else notes.push(french
        ? "Aucun départ prévu dans les 7 prochains jours selon les horaires TfL publiés."
        : "No departure is scheduled in the next 7 days in the published TfL timetable.");
    }
    if (times.some(t => t.arrivalAt == null)) notes.push(french
      ? "Arrivée non publiée pour le même véhicule : aucune heure d’arrivée n’est inventée."
      : "No arrival prediction for the same vehicle: no arrival time is invented.");
    notes.push("Powered by TfL Open Data · trajets directs / direct journeys");
    return { ...departureCards({ title: `${line.mode === "metro" ? "Métro" : line.mode === "bus" ? "Bus" : "Tram"} ${line.label}`,
      origin: origin.label, arrival: arrival.label, multiPlatform: origin.ids.length > 1, stops: index.stops,
      times, timezone: "Europe/London", now, french, realtime: true, notes,
      empty: french ? "Aucun passage en temps réel confirmé pour ces arrêts et ce sens. Cela ne signifie pas que la ligne n’existe pas."
        : "No live departure confirmed for these stops in this direction. This does not mean the route does not exist." }),
      source: line.source };
  }
}
