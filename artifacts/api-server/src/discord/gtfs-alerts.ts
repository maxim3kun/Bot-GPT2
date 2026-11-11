import { decodeJourneyFeed, type JourneyIndex } from "./gtfs-journey.js";
import type { IdfmTraffic, TrafficRule } from "./idfm-live.js";

/** Standard GTFS-RT service alerts, scoped to a single resource and route.
 * Never widen a trip-specific cancellation into a closed station. */
export function parseGtfsAlerts(bytes: Uint8Array, index: JourneyIndex, now: number): IdfmTraffic {
  const feed = decodeJourneyFeed(bytes), timestamp = Number(feed.header.timestamp);
  if (!Object.hasOwn(feed.header, "timestamp") || !Number.isFinite(timestamp) ||
    now - timestamp > 480 || now - timestamp < -300) return { available: false, rules: [] };
  const rules: TrafficRule[] = [];
  for (const entity of feed.entity) {
    const alert = entity.alert; if (!alert || entity.isDeleted) continue;
    const texts = alert.headerText?.translation ?? [];
    const text = texts.find(t => t.language === "fr") ?? texts[0];
    const message = (text?.text ?? "Perturbation signalée par l’exploitant.").replace(/[@*_`~|<>]/g, "").slice(0, 400);
    const periods = (alert.activePeriod ?? []).map(p => ({
      begin: Object.hasOwn(p, "start") ? Number(p.start) : -Infinity,
      end: Object.hasOwn(p, "end") ? Number(p.end) : Infinity,
    })).filter(p => p.end > p.begin);
    if (alert.activePeriod?.length && !periods.length) continue;
    const selectors = alert.informedEntity?.length ? alert.informedEntity : [{}];
    for (const selector of selectors) {
      if (selector.routeId && selector.routeId !== index.routeId) continue;
      const trip = selector.trip?.tripId;
      if (trip && index.metadata.trips.get(trip)?.routeId !== index.routeId) continue;
      if (selector.stopId && !index.stops.has(selector.stopId) &&
        ![...index.stops.values()].some(s => s.parent === selector.stopId)) continue;
      const point = selector.stopId && index.stops.has(selector.stopId) ? selector.stopId : undefined;
      const area = selector.stopId && !point ? selector.stopId : undefined;
      const routeType = index.metadata.routes.get(index.routeId)?.type;
      if (Object.hasOwn(selector, "routeType") && selector.routeType !== routeType) continue;
      rules.push({ points: new Set(point ? [point] : []), areas: new Set(area ? [area] : []),
        wholeLine: !selector.stopId, tripIds: trip ? new Set([trip]) : undefined,
        unresolved: Object.hasOwn(selector, "directionId") || !!selector.trip && !trip,
        blocking: alert.effect === 1, periods, message });
    }
  }
  return { available: true, rules };
}
