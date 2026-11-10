import { Unzip, UnzipInflate } from "fflate";
import { parse } from "csv-parse";
import { finished } from "node:stream/promises";
import { setImmediate as yieldToLoop } from "node:timers/promises";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import {
  addDays, localDate, serviceRunsOn, scheduledEpoch, parseGtfsStaticMetadata, routeTypeToMode,
  type GtfsStaticMetadata, type GtfsRouteAtStops,
} from "./gtfs-realtime.js";

type Row = Record<string, string | undefined>;
interface Visit {
  stopId: string;
  sequence: number;
  departure: string;
  arrival: string;
  pickup: boolean;
  dropoff: boolean;
}
export interface JourneyStop {
  id: string;
  name: string;
  parent: string;
}
export interface JourneyIndex {
  metadata: GtfsStaticMetadata;
  routeId: string;
  visits: Map<string, Visit[]>;
  stops: Map<string, JourneyStop>;
  connectionsUnavailable?: boolean;
  connections?: {
    network: JourneyIndex;
    rules: TransferRule[];
    limited: boolean;
    frequencyTrips: Set<string>;
  };
}
export interface TransferRule {
  from: string; to: string; type: number; minimum: number | null;
  fromRoute: string; toRoute: string; fromTrip: string; toTrip: string;
}
export interface JourneyPair { tripId: string; origin: Visit; destination: Visit }
export interface JourneyTime { tripId: string; departureAt: number; arrivalAt: number | null; realtime: boolean; serviceDate?: string }
export type JourneyRealtimeFeed = ReturnType<typeof GtfsRealtimeBindings.transit_realtime.FeedMessage.decode>;
export function decodeJourneyFeed(bytes: Uint8Array): JourneyRealtimeFeed {
  return GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(bytes);
}

/** Inflate and parse CSV incrementally; never retain a national stop_times table or shapes. */
export async function scanRows(zip: Uint8Array, name: string, onRow: (row: Row) => void): Promise<void> {
  const parser = parse({
    columns: true, bom: true, skip_empty_lines: true, relax_column_count: true, max_record_size: 20_000,
    on_record(row: Row) { onRow(row); return null; },
  });
  parser.resume();
  const done = finished(parser);
  void done.catch(() => undefined);
  let found = false;
  let inflateError: Error | undefined;
  const unzip = new Unzip((file) => {
    if (file.name.split("/").at(-1)?.toLowerCase() !== name) return;
    if (found || (file.originalSize ?? 0) > 700 * 1024 * 1024) {
      inflateError = new Error("Transport CSV exceeds the supported size");
      return;
    }
    found = true;
    file.ondata = (error, data, final) => {
      if (error) { inflateError = error; return; }
      parser.write(data);
      if (final) parser.end();
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  try {
    for (let offset = 0; offset < zip.length; offset += 32_768) {
      unzip.push(zip.subarray(offset, offset + 32_768), offset + 32_768 >= zip.length);
      if (inflateError) throw inflateError;
      if (parser.destroyed) { await done; break; }
      await yieldToLoop();
    }
    if (!found) parser.end();
    await done;
  } catch (error) {
    parser.destroy();
    throw error;
  }
}

export async function scanRoutesAtStops(zip: Uint8Array, ids: ReadonlySet<string>): Promise<GtfsRouteAtStops[]> {
  const { routes, trips } = parseGtfsStaticMetadata(zip);
  const selected = new Map<string, Set<string>>();
  await scanRows(zip, "stop_times.txt", (row) => {
    const stopId = row.stop_id?.trim() ?? "";
    if (!ids.has(stopId)) return;
    const routeId = trips.get(row.trip_id?.trim() ?? "")?.routeId;
    if (!routeId) return;
    const stops = selected.get(routeId) ?? new Set<string>();
    stops.add(stopId);
    selected.set(routeId, stops);
  });
  return [...selected].flatMap(([routeId, stopIds]) => {
    const route = routes.get(routeId);
    return route ? [{ routeId, shortName: route.shortName, longName: route.longName,
      mode: routeTypeToMode(route.type), stopIds: [...stopIds] }] : [];
  });
}

export async function buildJourneyIndex(zip: Uint8Array, routeId: string, extraRoutes: ReadonlySet<string> = new Set(),
  suppliedMetadata?: GtfsStaticMetadata): Promise<JourneyIndex> {
  const metadata = suppliedMetadata ? { ...suppliedMetadata } : parseGtfsStaticMetadata(zip);
  metadata.trips = new Map([...metadata.trips].filter(([, trip]) => trip.routeId === routeId || extraRoutes.has(trip.routeId)));
  metadata.routes = new Map([...metadata.routes].filter(([id]) => id === routeId || extraRoutes.has(id)));
  const visits = new Map<string, Visit[]>();
  const stopIds = new Set<string>();
  let count = 0;
  await scanRows(zip, "stop_times.txt", (row) => {
    const tripId = row.trip_id?.trim() ?? "";
    if (!metadata.trips.has(tripId)) return;
    const stopId = row.stop_id?.trim() ?? "";
    const sequence = Number(row.stop_sequence);
    if (!stopId || !Number.isFinite(sequence)) return;
    if (++count > 150_000) throw new Error("Transport journey index exceeds the supported size");
    const stops = visits.get(tripId) ?? [];
    stops.push({ stopId, sequence, departure: row.departure_time?.trim() || row.arrival_time?.trim() || "",
      arrival: row.arrival_time?.trim() || row.departure_time?.trim() || "",
      pickup: !row.pickup_type || row.pickup_type === "0", dropoff: !row.drop_off_type || row.drop_off_type === "0" });
    visits.set(tripId, stops);
    stopIds.add(stopId);
  });
  for (const stops of visits.values()) stops.sort((a, b) => a.sequence - b.sequence);
  const stops = new Map<string, JourneyStop>();
  await scanRows(zip, "stops.txt", (row) => {
    const id = row.stop_id?.trim() ?? "";
    if (stopIds.has(id)) stops.set(id, { id, name: row.stop_name?.trim() || id, parent: row.parent_station?.trim() ?? "" });
  });
  return { metadata, routeId, visits, stops };
}

export function journeyPairs(index: JourneyIndex, origins: ReadonlySet<string>, destinations: ReadonlySet<string>): JourneyPair[] {
  return [...index.visits].flatMap(([tripId, visits]) => {
    const pairs: JourneyPair[] = [];
    for (const origin of visits) {
      if (!origin.pickup || !origins.has(origin.stopId)) continue;
      const destination = visits.find((visit) => visit.sequence > origin.sequence && visit.dropoff && destinations.has(visit.stopId));
      if (destination) pairs.push({ tripId, origin, destination });
    }
    return pairs;
  });
}

export function scheduledJourneys(index: JourneyIndex, pairs: JourneyPair[], now: number): JourneyTime[] {
  const timezone = index.metadata.timezone || "Europe/Paris";
  const dates = [-1, 0, 1].map((offset) => addDays(localDate(now, timezone), offset));
  const results: JourneyTime[] = [];
  for (const pair of pairs) {
    const service = index.metadata.trips.get(pair.tripId)?.serviceId;
    if (!service) continue;
    for (const date of dates) {
      if (!serviceRunsOn(index.metadata, service, date)) continue;
      const departureAt = scheduledEpoch(date, pair.origin.departure, timezone);
      if (departureAt == null || departureAt < now - 20 || departureAt > now + 24 * 3600) continue;
      const arrivalAt = scheduledEpoch(date, pair.destination.arrival, timezone);
      results.push({ tripId: pair.tripId, departureAt,
        arrivalAt: arrivalAt != null && arrivalAt >= departureAt ? arrivalAt : null, realtime: false,
        serviceDate: date.replaceAll("-", "") });
    }
  }
  return results.sort((a, b) => a.departureAt - b.departureAt);
}

export function realtimeJourneys(bytes: Uint8Array | JourneyRealtimeFeed, pairs: JourneyPair[], now: number) {
  const feed = bytes instanceof Uint8Array ? decodeJourneyFeed(bytes) : bytes;
  const timestamp = Number(feed.header.timestamp);
  const fresh = Number.isFinite(timestamp) && now - timestamp <= 8 * 60 && now - timestamp >= -300;
  const cancelled = new Set<string>();
  const results: JourneyTime[] = [];
  if (!fresh) return { fresh, cancelled, results };
  for (const entity of feed.entity) {
    const update = entity.tripUpdate;
    if (!update) continue;
    if (Object.hasOwn(update, "timestamp") && (now - Number(update.timestamp) > 8 * 60 || now - Number(update.timestamp) < -300)) continue;
    const tripId = update.trip.tripId ?? "";
    const matches = pairs.filter((pair) => pair.tripId === tripId);
    if (!matches.length) continue;
    if (update.trip.scheduleRelationship === 3) { cancelled.add(tripId); continue; }
    for (const pair of matches) {
      const origin = update.stopTimeUpdate?.find((stop) => Object.hasOwn(stop, "stopSequence")
        ? stop.stopSequence === pair.origin.sequence : stop.stopId === pair.origin.stopId);
      const destination = update.stopTimeUpdate?.find((stop) => Object.hasOwn(stop, "stopSequence")
        ? stop.stopSequence === pair.destination.sequence : stop.stopId === pair.destination.stopId);
      if (origin?.scheduleRelationship === 1 || destination?.scheduleRelationship === 1) {
        cancelled.add(tripId);
        continue;
      }
      if (origin?.scheduleRelationship === 2) continue;
      const departureAt = Number(origin?.departure?.time ?? origin?.arrival?.time);
      if (!Number.isFinite(departureAt) || departureAt < now - 20 || departureAt > now + 24 * 3600) continue;
      const arrivalAt = destination?.scheduleRelationship === 2 ? NaN : Number(destination?.arrival?.time ?? destination?.departure?.time);
      results.push({ tripId, departureAt,
        arrivalAt: Number.isFinite(arrivalAt) && arrivalAt >= departureAt ? arrivalAt : null, realtime: true,
        ...(update.trip.startDate ? { serviceDate: update.trip.startDate } : {}) });
    }
  }
  return { fresh, cancelled, results };
}
