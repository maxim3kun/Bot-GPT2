import { Unzip, UnzipInflate, type AsyncFlateStreamHandler, type UnzipDecoder } from "fflate";
import { parse } from "csv-parse";
import { finished } from "node:stream/promises";
import { setImmediate as yieldToLoop } from "node:timers/promises";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { routeMatchesRequested } from "./transport-query.js";
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
  stationName?: string;
  stopLetter?: string;
}
export interface JourneyIndex {
  metadata: GtfsStaticMetadata;
  routeId: string;
  visits: Map<string, Visit[]>;
  stops: Map<string, JourneyStop>;
  connectionsUnavailable?: boolean;
  sourceWarning?: string;
  frequencies?: Map<string, Array<{ start: number; end: number; headway: number; exact: boolean }>>;
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
export interface ArrivalApproximation {
  at: number;
  earliestAt: number;
  latestAt: number;
  sourceTripId: string;
  serviceDate: string;
}
export interface JourneyTime {
  tripId: string;
  departureAt: number;
  arrivalAt: number | null;
  realtime: boolean;
  serviceDate?: string;
  departureStopId?: string;
  arrivalStopId?: string;
  terminalStopId?: string;
  /** Display-only calculation; never a measured arrival or transfer guarantee. */
  arrivalApproximation?: ArrivalApproximation;
}
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

export const MAX_STREAMED_GTFS_ARCHIVE_BYTES = 128 * 1024 * 1024;
const MAX_STREAMED_GTFS_TABLE_BYTES = 8 * 1024 * 1024;
const MAX_STREAMED_GTFS_ROW_COUNT = 60_000;

/** Inflate only the requested table while draining every other ZIP entry without retaining it. */
class SelectedTableInflate implements UnzipDecoder {
  static compression = 8;
  ondata: AsyncFlateStreamHandler = () => undefined;
  private readonly inflater?: UnzipInflate;

  constructor(filename: string) {
    if (filename.split("/").at(-1)?.toLowerCase() === "routes.txt") {
      this.inflater = new UnzipInflate();
      this.inflater.ondata = (error, data, final) => this.ondata(error, data, final);
    }
  }

  push(chunk: Uint8Array, final: boolean) {
    this.inflater?.push(chunk, final);
  }
}

/** Parse one GTFS CSV from a bounded response stream without retaining the ZIP or other tables. */
export async function scanRowsStream(
  body: ReadableStream<Uint8Array>, name: string, onRow: (row: Row) => void,
): Promise<{ archiveBytes: number; tableBytes: number; rows: number }> {
  if (name.toLowerCase() !== "routes.txt") throw Error("Streaming GTFS import only accepts routes.txt");
  let archiveBytes = 0, tableBytes = 0, rowCount = 0, found = false, tableEnded = false;
  let streamError: Error | undefined, parserError: Error | undefined;
  const parser = parse({
    columns: true, bom: true, skip_empty_lines: true, relax_column_count: true, max_record_size: 20_000,
    on_record(row: Row) { countRow(row); return null; },
  });
  parser.resume();
  const parsed = finished(parser);
  void parsed.catch((error) => { parserError = error instanceof Error ? error : new Error(String(error)); });
  const unzip = new Unzip((file) => {
    if (file.compression !== 0 && file.compression !== 8) {
      streamError = new Error("Unsupported compression in public GTFS archive");
      return;
    }
    if (file.name.split("/").at(-1)?.toLowerCase() === name.toLowerCase()) {
      if (found) {
        streamError = new Error("Duplicate GTFS routes.txt entries");
        return;
      }
      found = true;
      if ((file.size ?? 0) > MAX_STREAMED_GTFS_TABLE_BYTES ||
        (file.originalSize ?? 0) > MAX_STREAMED_GTFS_TABLE_BYTES) {
        streamError = new Error("GTFS routes.txt exceeds its streaming size limit");
        return;
      }
      file.ondata = (error, data, final) => {
        if (error) { streamError = error; return; }
        if (data?.byteLength) {
          tableBytes += data.byteLength;
          if (tableBytes > MAX_STREAMED_GTFS_TABLE_BYTES) {
            streamError = new Error("GTFS routes.txt exceeds its streaming size limit");
            return;
          }
          parser.write(data);
        }
        if (final) { tableEnded = true; parser.end(); }
      };
    } else {
      file.ondata = (error) => { if (error) streamError = error; };
    }
    file.start();
  });
  // The route table is the only entry inflated; all other entries are drained as compressed bytes.
  unzip.register(SelectedTableInflate);
  const reader = body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      archiveBytes += value.byteLength;
      if (archiveBytes > MAX_STREAMED_GTFS_ARCHIVE_BYTES) {
        throw new Error("Public GTFS archive exceeds its streaming size limit");
      }
      unzip.push(value, false);
      if (streamError) throw streamError;
      if (parserError) throw parserError;
      await yieldToLoop();
    }
    unzip.push(new Uint8Array(), true);
    if (streamError) throw streamError;
    if (!found) throw new Error("Public GTFS archive has no routes.txt");
    if (!tableEnded) throw new Error("Public GTFS routes.txt ended unexpectedly");
    await parsed;
    return { archiveBytes, tableBytes, rows: rowCount };
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    parser.destroy();
    await parsed.catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
  function countRow(row: Row) {
    rowCount++;
    if (rowCount > MAX_STREAMED_GTFS_ROW_COUNT) throw new Error("GTFS routes.txt exceeds its row limit");
    onRow(row);
  }
}

export async function scanRoutesAtStops(zip: Uint8Array, ids: ReadonlySet<string>, requestedLine = ""): Promise<GtfsRouteAtStops[]> {
  const { routes, trips } = parseGtfsStaticMetadata(zip);
  const wanted = requestedLine ? new Set([...routes].filter(([id, route]) =>
    routeMatchesRequested(id, route.shortName, route.longName, requestedLine)).map(([id]) => id)) : null;
  if (wanted && !wanted.size) return [];
  const selected = new Map<string, Set<string>>();
  await scanRows(zip, "stop_times.txt", (row) => {
    const stopId = row.stop_id?.trim() ?? "";
    if (!ids.has(stopId)) return;
    const routeId = trips.get(row.trip_id?.trim() ?? "")?.routeId;
    if (!routeId || (wanted && !wanted.has(routeId))) return;
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
  const stationNames = new Map<string, string>();
  await scanRows(zip, "stops.txt", (row) => {
    const id = row.stop_id?.trim() ?? "";
    if (row.location_type?.trim() === "1" && row.stop_name?.trim()) stationNames.set(id, row.stop_name.trim());
    if (stopIds.has(id)) stops.set(id, { id, name: row.stop_name?.trim() || id, parent: row.parent_station?.trim() ?? "" });
  });
  for (const stop of stops.values()) {
    if (stop.parent && stationNames.has(stop.parent)) stop.stationName = stationNames.get(stop.parent);
  }
  const frequencies: NonNullable<JourneyIndex["frequencies"]> = new Map();
  await scanRows(zip, "frequencies.txt", row => {
    const id = row.trip_id?.trim() ?? ""; if (!visits.has(id)) return;
    const start = gtfsSeconds(row.start_time ?? ""), end = gtfsSeconds(row.end_time ?? ""), headway = Number(row.headway_secs);
    if (start == null || end == null || end <= start || !Number.isInteger(headway) || headway < 1) return;
    const list = frequencies.get(id) ?? [];
    list.push({ start, end, headway, exact: row.exact_times === "1" }); frequencies.set(id, list);
  });
  return { metadata, routeId, visits, stops, frequencies };
}

function gtfsSeconds(value: string): number | null {
  const m = value.match(/^(\d{1,3}):([0-5]\d):([0-5]\d)$/);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null;
}
function gtfsClock(seconds: number) {
  return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
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

export function scheduledJourneys(index: JourneyIndex, pairs: JourneyPair[], now: number, horizonDays = 1): JourneyTime[] {
  const timezone = index.metadata.timezone || "Europe/Paris";
  const horizon = Math.max(1, Math.min(7, Math.floor(horizonDays)));
  const dates = Array.from({ length: horizon + 2 }, (_, i) => addDays(localDate(now, timezone), i - 1));
  const results: JourneyTime[] = [];
  for (const pair of pairs) {
    const service = index.metadata.trips.get(pair.tripId)?.serviceId;
    if (!service) continue;
    const frequencies = index.frequencies?.get(pair.tripId);
    const base = gtfsSeconds(index.visits.get(pair.tripId)?.[0]?.departure ?? "");
    const originSeconds = gtfsSeconds(pair.origin.departure), destinationSeconds = gtfsSeconds(pair.destination.arrival);
    const offsets = !frequencies ? [0] : frequencies.flatMap(f => {
      // Non-exact headways are intervals, never precise timetable departures.
      if (!f.exact || base == null) return [];
      if ((f.end - f.start) / f.headway > 10_000) throw new Error("Transport frequency exceeds its budget");
      return Array.from({ length: Math.ceil((f.end - f.start) / f.headway) }, (_, i) => f.start + i * f.headway - base);
    });
    for (const date of dates) {
      if (!serviceRunsOn(index.metadata, service, date)) continue;
      for (const offset of offsets) {
      const departureClock = offset && originSeconds != null ? gtfsClock(originSeconds + offset) : pair.origin.departure;
      const arrivalClock = offset && destinationSeconds != null ? gtfsClock(destinationSeconds + offset) : pair.destination.arrival;
      const departureAt = scheduledEpoch(date, departureClock, timezone);
      if (departureAt == null || departureAt < now - 20 || departureAt > now + horizon * 24 * 3600) continue;
      const arrivalAt = scheduledEpoch(date, arrivalClock, timezone);
      results.push({ tripId: pair.tripId, departureAt, departureStopId: pair.origin.stopId,
        arrivalStopId: pair.destination.stopId,
        arrivalAt: arrivalAt != null && arrivalAt >= departureAt ? arrivalAt : null, realtime: false,
        serviceDate: date.replaceAll("-", "") });
      if (results.length > 50_000) throw new Error("Transport timetable exceeds its budget");
      }
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
      results.push({ tripId, departureAt, departureStopId: pair.origin.stopId,
        arrivalStopId: pair.destination.stopId,
        arrivalAt: Number.isFinite(arrivalAt) && arrivalAt >= departureAt ? arrivalAt : null, realtime: true,
        ...(update.trip.startDate ? { serviceDate: update.trip.startDate } : {}) });
    }
  }
  return { fresh, cancelled, results };
}
