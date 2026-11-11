import { parseGtfsStaticMetadata, routeTypeToMode } from "./gtfs-realtime.js";
import { buildJourneyIndex, scanRows, type JourneyIndex, type JourneyPair, type TransferRule } from "./gtfs-journey.js";

/** Only published transfer minima are usable. No name/proximity-based footpaths. */
export async function addConnections(zip: Uint8Array, index: JourneyIndex): Promise<void> {
  const fromIds = new Set([...index.stops.values()].flatMap((stop) => [stop.id, stop.parent]).filter(Boolean));
  const rules: TransferRule[] = [];
  let limited = false;
  await scanRows(zip, "transfers.txt", (row) => {
    const from = row.from_stop_id?.trim() ?? "";
    const to = row.to_stop_id?.trim() ?? "";
    if (!fromIds.has(from) || !to) return;
    if (row.from_route_id && row.from_route_id !== index.routeId) return;
    if (row.from_trip_id && !index.metadata.trips.has(row.from_trip_id)) return;
    if (rules.length >= 5_000) throw new Error("Too many official transfer rules");
    const raw = row.min_transfer_time?.trim() ?? "";
    rules.push({ from, to, type: Number(row.transfer_type || 0),
      minimum: /^\d+$/.test(raw) && Number.isSafeInteger(Number(raw)) ? Number(raw) : null,
      fromRoute: row.from_route_id?.trim() ?? "", toRoute: row.to_route_id?.trim() ?? "",
      fromTrip: row.from_trip_id?.trim() ?? "", toTrip: row.to_trip_id?.trim() ?? "" });
  });
  const usable = rules.filter((rule) => rule.type === 2 && rule.minimum !== null);
  if (!usable.length) {
    index.connections = { network: index, rules, limited: false, frequencyTrips: new Set() };
    return;
  }
  const targetIds = new Set(usable.map((rule) => rule.to));
  const boarding = new Set<string>();
  await scanRows(zip, "stops.txt", (row) => {
    const id = row.stop_id?.trim() ?? "";
    if (targetIds.has(id) || targetIds.has(row.parent_station?.trim() ?? "")) {
      if (boarding.size >= 20_000) throw new Error("Too many transfer boarding stops");
      boarding.add(id);
    }
  });
  const metadata = parseGtfsStaticMetadata(zip);
  const routes = new Set<string>();
  if (boarding.size) await scanRows(zip, "stop_times.txt", (row) => {
    if (!boarding.has(row.stop_id?.trim() ?? "") || row.pickup_type === "1") return;
    const tripId = row.trip_id?.trim() ?? "";
    const routeId = metadata.trips.get(tripId)?.routeId;
    if (!routeId || routeId === index.routeId || !routeTypeToMode(metadata.routes.get(routeId)?.type ?? null)) return;
    if (!usable.some((rule) => (!rule.toRoute || rule.toRoute === routeId) && (!rule.toTrip || rule.toTrip === tripId))) return;
    if (routes.size >= 40 && !routes.has(routeId)) { limited = true; return; }
    routes.add(routeId);
  });
  const network = routes.size ? await buildJourneyIndex(zip, index.routeId, routes, metadata) : index;
  const frequencyTrips = new Set<string>();
  await scanRows(zip, "frequencies.txt", (row) => {
    const id = row.trip_id?.trim() ?? "";
    if (network.metadata.trips.has(id)) frequencyTrips.add(id);
  });
  index.connections = { network, rules, limited, frequencyTrips };
}

export interface ConnectionPath {
  first: JourneyPair;
  second: JourneyPair;
  rule: TransferRule;
}

function specificity(rule: TransferRule): number {
  const trips = Number(Boolean(rule.fromTrip)) + Number(Boolean(rule.toTrip));
  const routes = Number(Boolean(rule.fromRoute)) + Number(Boolean(rule.toRoute));
  return trips === 2 ? 6 : trips === 1 ? (routes ? 5 : 4) : routes === 2 ? 3 : routes ? 2 : 1;
}

/** Respect GTFS rule precedence, including specific forbidden/unsupported overrides. */
function preferredTransferRule(matching: TransferRule[]): TransferRule | undefined {
  const rank = Math.max(...matching.map(specificity));
  const best = matching.filter((rule) => specificity(rule) === rank);
  // Ambiguous equal-precedence rules fail closed rather than allowing a prohibited change.
  return best.length === 1 && best[0]!.type === 2 && best[0]!.minimum !== null ? best[0] : undefined;
}

export function connectionPaths(index: JourneyIndex, origins: ReadonlySet<string>, destinations?: ReadonlySet<string>,
  onPath?: (path: ConnectionPath) => void, relevantPair?: (pair: JourneyPair) => boolean): ConnectionPath[] {
  const data = index.connections;
  if (!data || data.network === index) return [];
  const network = data.network;
  let budget = 0;
  const spend = () => {
    if (++budget > 500_000) throw new Error("Transfer search exceeds the supported work budget");
  };
  const permittedFrom = new Set<string>();
  for (const rule of data.rules) {
    spend();
    if (rule.type === 2 && rule.minimum !== null) permittedFrom.add(rule.from);
  }
  const fromStops = new Set([...index.stops.values()]
    .filter((stop) => permittedFrom.has(stop.id) || permittedFrom.has(stop.parent))
    .map((stop) => stop.id));
  const firstPairs: JourneyPair[] = [];
  for (const [tripId, visits] of index.visits) {
    for (let position = 0; position < visits.length; position++) {
      spend();
      const origin = visits[position]!;
      if (!origin.pickup || !origins.has(origin.stopId)) continue;
      for (const destination of visits.slice(position + 1)) {
        spend();
        if (destination.sequence > origin.sequence && destination.dropoff && fromStops.has(destination.stopId)) {
          const pair = { tripId, origin, destination };
          if (relevantPair && !relevantPair(pair)) continue;
          firstPairs.push(pair);
          if (firstPairs.length > 10_000) throw new Error("Too many transfer approach legs");
        }
      }
    }
  }
  const paths: ConnectionPath[] = [];
  const listedDestinations = !destinations && !onPath ? new Set<string>() : undefined;
  const children = new Map<string, string[]>();
  for (const stop of network.stops.values()) {
    if (stop.parent) {
      const ids = children.get(stop.parent) ?? [];
      ids.push(stop.id); children.set(stop.parent, ids);
    }
  }
  const rulesByFrom = new Map<string, TransferRule[]>();
  const specificFromTrips = new Set<string>();
  const specificToTrips = new Set<string>();
  for (const rule of data.rules) {
    const entries = rulesByFrom.get(rule.from) ?? [];
    entries.push(rule);
    rulesByFrom.set(rule.from, entries);
    if (rule.fromTrip) specificFromTrips.add(rule.fromTrip);
    if (rule.toTrip) specificToTrips.add(rule.toTrip);
  }
  type Boarding = { tripId: string; visits: JourneyIndex["visits"] extends Map<string, infer V> ? V : never; position: number };
  const boardings = new Map<string, Boarding[]>();
  for (const [tripId, visits] of network.visits) {
    if (network.metadata.trips.get(tripId)?.routeId === index.routeId || data.frequencyTrips.has(tripId)) continue;
    visits.forEach((visit, position) => {
      if (!visit.pickup) return;
      const nextDropoff = visits.slice(position + 1).find((candidate) => candidate.dropoff);
      if (!nextDropoff || (relevantPair && !relevantPair({ tripId, origin: visit, destination: nextDropoff }))) return;
      const entries = boardings.get(visit.stopId) ?? [];
      entries.push({ tripId, visits, position }); boardings.set(visit.stopId, entries);
    });
  }
  const listedFirstGroups = new Set<string>();
  const listedBoardingGroups = new Set<string>();
  for (const first of firstPairs) {
    if (data.frequencyTrips.has(first.tripId)) continue;
    const firstRoute = network.metadata.trips.get(first.tripId)?.routeId;
    const firstGroup = `${first.destination.stopId}:${firstRoute ?? ""}:${specificFromTrips.has(first.tripId) ? first.tripId : "*"}`;
    if (listedDestinations) {
      if (listedFirstGroups.has(firstGroup)) continue;
      listedFirstGroups.add(firstGroup);
    }
    const firstStop = network.stops.get(first.destination.stopId);
    const rules = [...(rulesByFrom.get(first.destination.stopId) ?? []),
      ...(firstStop?.parent && firstStop.parent !== first.destination.stopId ? rulesByFrom.get(firstStop.parent) ?? [] : [])];
    if (!rules.length) continue;
    const rulesByTo = new Map<string, TransferRule[]>();
    for (const rule of rules) {
      const entries = rulesByTo.get(rule.to) ?? [];
      entries.push(rule);
      rulesByTo.set(rule.to, entries);
    }
    const targets = new Set(rules.flatMap((rule) => [rule.to, ...(children.get(rule.to) ?? [])]));
    for (const target of targets) {
      for (const { tripId, visits, position } of boardings.get(target) ?? []) {
        spend();
        const boarding = visits[position]!;
        const secondRoute = network.metadata.trips.get(tripId)?.routeId;
        if (listedDestinations) {
          const boardingGroup = `${firstGroup}:${boarding.stopId}:${secondRoute ?? ""}:${specificToTrips.has(tripId) ? tripId : "*"}`;
          if (listedBoardingGroups.has(boardingGroup)) continue;
          listedBoardingGroups.add(boardingGroup);
        }
        const boardingStop = network.stops.get(boarding.stopId);
        const candidates = [...(rulesByTo.get(boarding.stopId) ?? []),
          ...(boardingStop?.parent && boardingStop.parent !== boarding.stopId ? rulesByTo.get(boardingStop.parent) ?? [] : [])];
        budget += candidates.length;
        spend();
        const rule = preferredTransferRule(candidates.filter((candidate) =>
          (!candidate.fromRoute || candidate.fromRoute === firstRoute) &&
          (!candidate.toRoute || candidate.toRoute === secondRoute) &&
          (!candidate.fromTrip || candidate.fromTrip === first.tripId) &&
          (!candidate.toTrip || candidate.toTrip === tripId)));
        if (!rule) continue;
        for (const destination of visits.slice(position + 1)) {
          spend();
          if (destination.sequence <= boarding.sequence || !destination.dropoff || origins.has(destination.stopId) ||
            (destinations && !destinations.has(destination.stopId))) continue;
          const second = { tripId, origin: boarding, destination };
          if (relevantPair && !relevantPair(second)) continue;
          const path = { first, second, rule };
          if (onPath) onPath(path);
          else if (listedDestinations) {
            // Arrival pickers need proof that a stop is reachable, not every
            // timetable combination that reaches that same stop.
            if (!listedDestinations.has(destination.stopId)) {
              listedDestinations.add(destination.stopId);
              paths.push(path);
            }
          } else {
            paths.push(path);
            if (paths.length > 10_000) throw new Error("Too many possible transfer paths");
          }
        }
      }
    }
  }
  return paths;
}
