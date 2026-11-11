import { scheduledJourneys, type JourneyIndex, type JourneyPair, type JourneyTime } from "./gtfs-journey.js";

export type ArrivalDisplay = {
  kind: "realtime" | "scheduled" | "approximate" | "unavailable";
  at: number | null;
};

export function arrivalForDisplay(time: JourneyTime): ArrivalDisplay {
  if (time.arrivalAt != null && Number.isFinite(time.arrivalAt) && time.arrivalAt >= time.departureAt)
    return { kind: time.realtime ? "realtime" : "scheduled", at: time.arrivalAt };
  const estimate = time.arrivalApproximation;
  if (estimate && Number.isFinite(estimate.at) && estimate.at > time.departureAt)
    return { kind: "approximate", at: estimate.at };
  return { kind: "unavailable", at: null };
}

/** Enrich display data, never the raw arrival used by connection calculations.
 * A known GTFS trip uses its own service. A separate live-reference system
 * requires an official terminal AND one unambiguous published forward pattern.
 * Nearest departure chooses a duration, not a match to the live vehicle. */
export function withArrivalApproximations(index: JourneyIndex, pairs: JourneyPair[], times: JourneyTime[],
  excludedTrips: ReadonlySet<string> = new Set()): JourneyTime[] {
  const missing = times.filter(time => time.realtime && time.arrivalAt == null && !time.arrivalApproximation);
  if (!missing.length) return times;
  const anchor = Math.min(...missing.map(time => time.departureAt));
  const published = scheduledJourneys(index, pairs, anchor - 6 * 3600, 2);
  const pairMap = new Map<string, JourneyPair | null>();
  for (const pair of pairs) {
    const key = JSON.stringify([pair.tripId, pair.origin.stopId, pair.destination.stopId]);
    pairMap.set(key, pairMap.has(key) ? null : pair);
  }
  const sameStation = (a: string, b: string) => a === b || !!index.stops.get(a)?.parent &&
    index.stops.get(a)?.parent === index.stops.get(b)?.parent;
  const patternCache = new Map<JourneyPair, string>();
  const pattern = (pair: JourneyPair) => {
    let key = patternCache.get(pair);
    if (!key) {
      // Full forward pattern: don't borrow an express, a different branch, or a
      // different alighting point just because its terminal has the same name.
      key = JSON.stringify((index.visits.get(pair.tripId) ?? []).filter(v => v.sequence >= pair.origin.sequence)
        .map(v => [v.stopId, v.pickup, v.dropoff, v.sequence === pair.destination.sequence]));
      patternCache.set(pair, key);
    }
    return key;
  };
  return times.map(time => {
    if (!time.realtime || time.arrivalAt != null || time.arrivalApproximation || !time.departureStopId) return time;
    const knownTrip = index.metadata.trips.has(time.tripId);
    if (!knownTrip && !time.terminalStopId) return time;
    const candidates = published.flatMap(source => {
      if (excludedTrips.has(source.tripId) || source.departureStopId !== time.departureStopId || source.arrivalAt == null ||
        time.arrivalStopId && source.arrivalStopId !== time.arrivalStopId ||
        Math.abs(source.departureAt - time.departureAt) > 6 * 3600 ||
        time.serviceDate && source.serviceDate !== time.serviceDate) return [];
      const pair = pairMap.get(JSON.stringify([source.tripId, source.departureStopId, source.arrivalStopId]));
      if (!pair || index.metadata.trips.get(pair.tripId)?.routeId !== index.routeId) return [];
      if (knownTrip ? source.tripId !== time.tripId :
        !sameStation(index.visits.get(pair.tripId)?.at(-1)?.stopId ?? "", time.terminalStopId!)) return [];
      const duration = source.arrivalAt - source.departureAt;
      if (!(duration > 0 && duration <= 86400)) return [];
      return [{ source, duration, pattern: pattern(pair) }];
    });
    if (!candidates.length || new Set(candidates.map(c => c.pattern)).size !== 1) return time;
    candidates.sort((a, b) => Math.abs(a.source.departureAt - time.departureAt) - Math.abs(b.source.departureAt - time.departureAt) ||
      a.source.departureAt - b.source.departureAt || a.source.tripId.localeCompare(b.source.tripId));
    const chosen = candidates[0]!;
    const durations = candidates.map(c => c.duration);
    return { ...time, arrivalApproximation: { at: time.departureAt + chosen.duration,
      earliestAt: time.departureAt + Math.min(...durations), latestAt: time.departureAt + Math.max(...durations),
      sourceTripId: chosen.source.tripId, serviceDate: chosen.source.serviceDate! } };
  });
}
