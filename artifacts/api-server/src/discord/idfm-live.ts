import { scheduledEpoch } from "./gtfs-realtime.js";
import type { JourneyIndex, JourneyPair, JourneyTime } from "./gtfs-journey.js";

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => v !== null && typeof v === "object" ? v as Json : {};
const list = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const str = (v: unknown): string => typeof v === "string" ? v : typeof obj(v).value === "string" ? String(obj(v).value) : "";
const epoch = (v: unknown) => typeof v === "string" && /(?:Z|[+-]\d\d:\d\d)$/.test(v) ? Date.parse(v) / 1000 : NaN;
const clean = (v: unknown) => str(v).replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
  .replace(/[@*_`~|<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 400);
const pointId = (v: unknown) => str(v).match(/^(?:stop_point:)?(IDFM:\d+)$/)?.[1];
const areaId = (v: unknown) => str(v).match(/^stop_area:(IDFM:\d+)$/)?.[1];
const siriPoint = (v: unknown) => str(v).match(/^STIF:StopPoint:Q:(\d+):$/)?.[1];
export const idfmLineCode = (id: string) => id.match(/^IDFM:(C\d+)$/)?.[1];

export interface TrafficRule {
  points: Set<string>;
  areas: Set<string>;
  wholeLine: boolean;
  unresolved: boolean;
  blocking: boolean;
  periods: Array<{ begin: number; end: number }>;
  message: string;
}
export interface IdfmTraffic { available: boolean; rules: TrafficRule[] }
const navitiaTime = (value: unknown) => {
  const match = str(value).match(/^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)$/);
  return match ? scheduledEpoch(`${match[1]}-${match[2]}-${match[3]}`, `${match[4]}:${match[5]}:${match[6]}`, "Europe/Paris") : null;
};

/** IDs and line-report links establish scope; neither names nor a shared station
 * code establish that another line's platforms are closed. */
export function parseIdfmTraffic(body: unknown, routeId: string): TrafficRule[] {
  const root = obj(body);
  if (!Array.isArray(root.line_reports) || !Array.isArray(root.disruptions)) throw new Error("Invalid PRIM traffic response");
  const linked = new Set<string>();
  for (const reportValue of root.line_reports) {
    const report = obj(reportValue);
    if (str(obj(report.line).id) !== `line:${routeId}`) continue;
    const add = (entity: Json) => {
      for (const link of list(entity.links).map(obj)) if (link.type === "disruption") linked.add(str(link.id));
    };
    add(obj(report.line));
    for (const value of list(report.pt_objects)) {
      const entity = obj(value); add(entity); add(obj(entity[str(entity.embedded_type)]));
    }
  }
  const rules: TrafficRule[] = [];
  for (const value of root.disruptions) {
    const d = obj(value);
    if (!linked.has(str(d.id))) continue;
    const periods = list(d.application_periods).map(obj).map(p => ({ begin: navitiaTime(p.begin), end: navitiaTime(p.end) }))
      .filter((p): p is { begin: number; end: number } => p.begin != null && p.end != null && p.end > p.begin);
    const rule: TrafficRule = { points: new Set(), areas: new Set(), wholeLine: false, unresolved: false,
      blocking: obj(d.severity).effect === "NO_SERVICE", periods, message: "" };
    const messages = list(d.messages).map(obj);
    rule.message = clean(messages.find(m => str(obj(m.channel).name) === "moteur")?.text ??
      messages.find(m => list(obj(m.channel).types).includes("title"))?.text ?? messages[0]?.text);
    for (const impactValue of list(d.impacted_objects)) {
      const impact = obj(impactValue); const entity = obj(impact.pt_object);
      const point = pointId(entity.id); const area = areaId(entity.id);
      if (point) rule.points.add(point);
      else if (area) rule.areas.add(area);
      else if (entity.id === `line:${routeId}` && !impact.impacted_section && !impact.impacted_stops) rule.wholeLine = true;
      else rule.unresolved = true;
    }
    // Unsupported section/daily-pattern restrictions must not be mistaken for
    // an unrestricted working service, nor guessed into a whole-line closure.
    if (!periods.length || list(d.application_patterns).length ||
      (!rule.points.size && !rule.areas.size && !rule.wholeLine)) rule.unresolved = true;
    rules.push(rule);
  }
  return rules;
}

export function ruleActive(rule: TrafficRule, at: number): boolean {
  return !rule.periods.length || rule.periods.some(p => at >= p.begin && at < p.end);
}
export function stopAffected(rule: TrafficRule, index: JourneyIndex, id: string): boolean {
  return rule.wholeLine || rule.points.has(id) || rule.areas.has(index.stops.get(id)?.parent ?? "");
}
export function stopClosed(traffic: IdfmTraffic, index: JourneyIndex, id: string, at: number): boolean {
  return traffic.rules.some(r => r.blocking && !r.unresolved && ruleActive(r, at) && stopAffected(r, index, id));
}

export function idfmTimeAllowed(traffic: IdfmTraffic, index: JourneyIndex, time: JourneyTime,
  origins: string[], arrivals: string[]): boolean {
  for (const rule of traffic.rules) {
    if (!rule.blocking) continue;
    if (rule.unresolved) { if (ruleActive(rule, time.departureAt)) return false; continue; }
    if (stopAffected(rule, index, time.departureStopId ?? origins[0] ?? "") && ruleActive(rule, time.departureAt)) return false;
    const affectedArrival = (time.arrivalStopId ? [time.arrivalStopId] : arrivals).some(id => stopAffected(rule, index, id));
    if (!affectedArrival) continue;
    if (time.arrivalAt != null) { if (ruleActive(rule, time.arrivalAt)) return false; }
    else if (!rule.periods.length || rule.periods.some(p => p.end > time.departureAt && p.begin < time.departureAt + 86400)) return false;
  }
  return true;
}

interface Visit { vehicle: string; point: string; terminal: string; departure: number; arrival: number; cancelled: boolean }
export function parseIdfmVisits(body: unknown, point: string, code: string, now: number): Visit[] {
  const delivery = obj(obj(obj(body).Siri).ServiceDelivery);
  const fresh = (time: unknown) => { const at = epoch(time); return Number.isFinite(at) && now - at <= 480 && now - at >= -300; };
  if (!fresh(delivery.ResponseTimestamp)) throw new Error("Stale PRIM passages");
  if (!Array.isArray(delivery.StopMonitoringDelivery)) throw new Error("Invalid PRIM passages");
  const result: Visit[] = [];
  for (const value of delivery.StopMonitoringDelivery) {
    const data = obj(value);
    if (data.Status !== true && data.Status !== "true") throw new Error("PRIM passages unavailable");
    for (const entry of list(data.MonitoredStopVisit).map(obj)) {
      const journey = obj(entry.MonitoredVehicleJourney), call = obj(journey.MonitoredCall);
      if (siriPoint(entry.MonitoringRef) !== point || str(journey.LineRef) !== `STIF:Line::${code}:` ||
        journey.Monitored === false || journey.Monitored === "false" || !fresh(entry.RecordedAtTime)) continue;
      const reference = obj(journey.FramedVehicleJourneyRef);
      const datedVehicle = str(reference.DatedVehicleJourneyRef);
      const terminal = siriPoint(journey.DestinationRef);
      if (!datedVehicle || !terminal) continue;
      const vehicle = JSON.stringify([str(reference.DataFrameRef), datedVehicle]);
      const departure = epoch(call.ExpectedDepartureTime || call.ExpectedArrivalTime);
      const cancelled = call.DepartureStatus === "cancelled" || call.ArrivalStatus === "cancelled";
      if (!cancelled && (!Number.isFinite(departure) || departure < now - 20 || departure > now + 86400)) continue;
      result.push({ vehicle, point: `IDFM:${point}`, terminal: `IDFM:${terminal}`, departure,
        arrival: epoch(call.ExpectedArrivalTime || call.ExpectedDepartureTime), cancelled });
    }
  }
  return result;
}

export class IdfmLiveClient {
  private cache = new Map<string, { until: number; value?: unknown; failed?: boolean }>();
  private pending = new Map<string, Promise<unknown>>();
  private previousTraffic = new Map<string, { at: number; rules: TrafficRule[] }>();
  constructor(private fetcher: typeof fetch = fetch, private now = Date.now,
    private key: () => string | undefined = () => process.env.IDFM_PRIM_API_KEY) {}

  private async request(path: string, ttl: number): Promise<unknown> {
    if (!this.key()) throw new Error("PRIM access not configured");
    const hit = this.cache.get(path);
    if (hit && hit.until > this.now()) {
      if (hit.failed) throw new Error("PRIM temporarily unavailable");
      return hit.value;
    }
    if (this.pending.has(path)) return this.pending.get(path)!;
    if (this.pending.size >= 6) throw new Error("PRIM requests busy");
    const work = (async () => {
      try {
        // Fixed provider, no redirects: never forward a credential to catalogue URLs.
        const response = await this.fetcher(`https://prim.iledefrance-mobilites.fr/marketplace/${path}`, {
          headers: { apikey: this.key()!, accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) { await response.body?.cancel(); throw new Error(`PRIM HTTP ${response.status}`); }
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Empty PRIM response");
        const chunks: Uint8Array[] = []; let length = 0;
        try {
          while (true) {
            const { done, value } = await reader.read(); if (done) break;
            length += value.length; if (length > 4 * 1024 * 1024) throw new Error("PRIM response too large");
            chunks.push(value);
          }
        } finally { await reader.cancel().catch(() => undefined); }
        const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (this.cache.size >= 128) this.cache.delete(this.cache.keys().next().value!);
        this.cache.set(path, { until: this.now() + ttl, value });
        return value;
      } catch {
        if (this.cache.size >= 128 && !this.cache.has(path)) this.cache.delete(this.cache.keys().next().value!);
        this.cache.set(path, { until: this.now() + 15000, failed: true });
        // Do not log fetch errors, headers or credentials.
        throw new Error("PRIM service unavailable");
      }
    })().finally(() => this.pending.delete(path));
    this.pending.set(path, work); return work;
  }

  async traffic(routeId: string): Promise<IdfmTraffic> {
    if (!idfmLineCode(routeId)) return { available: false, rules: [] };
    try {
      const rules = parseIdfmTraffic(await this.request(
        `v2/navitia/line_reports/lines/${encodeURIComponent(`line:${routeId}`)}/line_reports?count=100`, 120000), routeId);
      if (this.previousTraffic.size >= 32) this.previousTraffic.delete(this.previousTraffic.keys().next().value!);
      this.previousTraffic.set(routeId, { at: this.now(), rules });
      return { available: true, rules };
    } catch {
      const previous = this.previousTraffic.get(routeId);
      return { available: false, rules: previous && this.now() - previous.at < 1800000 ? previous.rules : [] };
    }
  }

  async passages(routeId: string, index: JourneyIndex, pairs: JourneyPair[]): Promise<{ times: JourneyTime[]; available: boolean; cancelled: boolean }> {
    const code = idfmLineCode(routeId), now = Math.floor(this.now() / 1000);
    if (!code || !pairs.length) return { times: [], available: false, cancelled: false };
    const origins = new Set(pairs.map(p => p.origin.stopId));
    const destinations = new Set(pairs.map(p => p.destination.stopId));
    const points = [...new Set([...origins, ...destinations])].filter(id => /^IDFM:\d+$/.test(id));
    const visits: Visit[] = []; let available = points.length > 0 && points.length <= 4;
    // Bound per-query requests and avoid exceeding the provider's burst quota.
    for (const id of points.slice(0, 4)) {
      try {
        const point = id.slice(5);
        visits.push(...parseIdfmVisits(await this.request(
          `stop-monitoring?MonitoringRef=${encodeURIComponent(`STIF:StopPoint:Q:${point}:`)}`, 12000), point, code, now));
      } catch { available = false; }
    }
    const sameStop = (a: string, b: string) => a === b || !!index.stops.get(a)?.parent &&
      index.stops.get(a)?.parent === index.stops.get(b)?.parent;
    const times: JourneyTime[] = []; let matched = 0; let cancelled = 0;
    for (const visit of visits.filter(v => origins.has(v.point))) {
      const relevant = pairs.find(p => p.origin.stopId === visit.point &&
        sameStop(index.visits.get(p.tripId)?.at(-1)?.stopId ?? "", visit.terminal));
      if (!relevant) continue;
      matched++;
      const arrival = visits.find(v => destinations.has(v.point) && v.vehicle === visit.vehicle &&
        sameStop(v.terminal, visit.terminal));
      if (visit.cancelled || arrival?.cancelled) { cancelled++; continue; }
      const arrivalAt = arrival && arrival.arrival >= visit.departure ? arrival.arrival : null;
      times.push({ tripId: visit.vehicle, departureAt: visit.departure, arrivalAt, departureStopId: visit.point,
        arrivalStopId: arrival?.point ?? relevant.destination.stopId, realtime: true });
    }
    return { times, available, cancelled: matched > 0 && cancelled === matched };
  }
}
