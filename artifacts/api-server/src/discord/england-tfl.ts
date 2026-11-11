import { createHash } from "node:crypto";
import type { TransportLine, StopGroup, LineListing } from "./transport-browser.js";
import type { JourneyIndex, JourneyTime } from "./gtfs-journey.js";
import { journeyPairs } from "./gtfs-journey.js";
import { departureCards } from "./transport-presentation.js";
import { TransportMetadataCache } from "./transport-metadata-cache.js";
import { EnglandHttp } from "./england-http.js";
import { TransportDataError } from "./transport-data-error.js";
import { normalizeTransitText, type TransitMode } from "./transport-query.js";
import type { EnglandLocation } from "./england-locations.js";

interface TflStop { id: string; name: string; parentId?: string; stationId?: string; topMostParentId?: string;
  stopLetter?: string; lat: number; lon: number }
interface Sequence { branchId: number; direction: string; nextBranchIds: number[]; prevBranchIds: number[]; stopPoint: TflStop[] }
interface Pattern { id: string; routeId: string; direction: string; stopIds: string[] }
interface StopReference { id: string; name: string; parent: string; latitude: number; longitude: number; stopLetter?: string }
interface Prediction {
  id: string; vehicleId: string; naptanId: string; lineId: string; direction: string;
  destinationNaptanId: string; expectedArrival: string; timestamp: string; tripId?: string;
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
    const rows = await this.metadata.get({ territory: "en", provider: "tfl", kind: "routes",
      source: `/Line/Mode/${apiMode}`, version: "v1" }, 6 * 3600_000, async () => {
      const data = await this.http.json<Array<{ id: string; name: string; modeName: string }>>(`/Line/Mode/${apiMode}`);
      if (!Array.isArray(data)) throw new TransportDataError("Catalogue TfL illisible.");
      return data.filter(l => l.modeName === apiMode && /^[a-z0-9-]+$/.test(l.id))
        .map(l => ({ routeId: `tfl:${l.id}`, shortName: l.name, longName: l.name, mode, stopIds: [] as string[] }));
    });
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
  async departures(line: TransportLine, index: JourneyIndex, origin: StopGroup, arrival: StopGroup, language: string) {
    const french = language === "fr", id = lineId(line), now = Math.floor(this.now() / 1000);
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
    const times = tflTimes(index, origin, arrival, all, all, now);
    const notes = [...new Set([
      ...traffic.statuses.filter(s => s.statusSeverity !== 10).map(s => s.reason || s.statusSeverityDescription),
      ...traffic.disruptions.map(d => d.description ?? ""),
    ].filter(Boolean))].slice(0, 3).map(s => s.slice(0, 350));
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
