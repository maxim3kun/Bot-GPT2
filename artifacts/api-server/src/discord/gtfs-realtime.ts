import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { parse } from "csv-parse/sync";
import { unzipSync, strFromU8 } from "fflate";
import type { TransitMode } from "./transport-query.js";

export interface GtfsStaticMetadata {
  routes: Map<string, { shortName: string; longName: string; type: number | null }>;
  trips: Map<string, { routeId: string; headsign: string; directionId: string }>;
  timezone: string | null;
}

export interface RealtimeDeparture {
  stopId: string;
  tripId: string;
  routeId: string;
  line: string;
  destination: string;
  directionId: string;
  mode: TransitMode | null;
  departureAt: number;
  delaySeconds: number | null;
}

export interface DecodedGtfsRealtime {
  departures: RealtimeDeparture[];
  updatedAt: number | null;
}

type CsvRow = Record<string, string | undefined>;
type ProtoTime = number | string | { toNumber?: () => number; low?: number; high?: number } | null | undefined;
type ProtoFeed = {
  header?: { timestamp?: ProtoTime };
  entity?: Array<{
    tripUpdate?: {
      trip?: { tripId?: string; routeId?: string; directionId?: number };
      stopTimeUpdate?: Array<{
        stopId?: string;
        arrival?: { time?: ProtoTime; delay?: number };
        departure?: { time?: ProtoTime; delay?: number };
      }>;
    };
  }>;
};

function safeCsvRows(bytes: Uint8Array | undefined): CsvRow[] {
  if (!bytes) return [];
  return parse(strFromU8(bytes), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
    max_record_size: 20_000,
  }) as CsvRow[];
}

export function parseGtfsStaticMetadata(zipBytes: Uint8Array): GtfsStaticMetadata {
  const files = unzipSync(zipBytes);
  const find = (name: string) => Object.entries(files).find(([path]) => path.split("/").at(-1)?.toLowerCase() === name)?.[1];
  const agency = safeCsvRows(find("agency.txt"))[0];

  const routes = new Map<string, GtfsStaticMetadata["routes"] extends Map<string, infer V> ? V : never>();
  for (const row of safeCsvRows(find("routes.txt"))) {
    const id = row.route_id?.trim();
    if (!id) continue;
    const routeType = Number(row.route_type);
    routes.set(id, {
      shortName: row.route_short_name?.trim() ?? "",
      longName: row.route_long_name?.trim() ?? "",
      type: Number.isFinite(routeType) ? routeType : null,
    });
  }

  const trips = new Map<string, GtfsStaticMetadata["trips"] extends Map<string, infer V> ? V : never>();
  for (const row of safeCsvRows(find("trips.txt"))) {
    const id = row.trip_id?.trim();
    if (!id) continue;
    trips.set(id, {
      routeId: row.route_id?.trim() ?? "",
      headsign: row.trip_headsign?.trim() ?? "",
      directionId: row.direction_id?.trim() ?? "",
    });
  }

  return { routes, trips, timezone: agency?.agency_timezone?.trim() || null };
}

function asNumber(value: ProtoTime): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
  if (value && typeof value === "object") {
    if (typeof value.toNumber === "function") {
      const number = value.toNumber();
      return Number.isFinite(number) ? number : null;
    }
    if (typeof value.low === "number" && typeof value.high === "number") {
      return value.high * 0x1_0000_0000 + (value.low >>> 0);
    }
  }
  return null;
}

export function routeTypeToMode(type: number | null): TransitMode | null {
  if (type === 0) return "tram";
  if (type === 1 || type === 12) return "metro";
  if (type === 2 || type === 100 || type === 101 || type === 102 || type === 103 || type === 104 || type === 105 || type === 106 || type === 107 || type === 108) return "rail";
  if (type === 3 || type === 11) return "bus";
  return null;
}

export function decodeGtfsRealtime(
  bytes: Uint8Array,
  stopIds: ReadonlySet<string>,
  staticData?: GtfsStaticMetadata,
  nowSeconds = Math.floor(Date.now() / 1000),
): DecodedGtfsRealtime {
  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(bytes) as unknown as ProtoFeed;
  const updatedAt = asNumber(feed.header?.timestamp ?? null);
  const departures: RealtimeDeparture[] = [];

  for (const entity of feed.entity ?? []) {
    const update = entity.tripUpdate;
    if (!update) continue;

    const tripId = update.trip?.tripId ?? "";
    const tripMetadata = tripId ? staticData?.trips.get(tripId) : undefined;
    const routeId = update.trip?.routeId || tripMetadata?.routeId || "";
    const route = routeId ? staticData?.routes.get(routeId) : undefined;
    const routeType = route?.type ?? null;
    const routeName = route?.shortName || route?.longName || routeId || "Ligne";
    const destination = tripMetadata?.headsign || "";
    const directionId = String(update.trip?.directionId ?? tripMetadata?.directionId ?? "");

    for (const stopUpdate of update.stopTimeUpdate ?? []) {
      if (!stopUpdate.stopId || !stopIds.has(stopUpdate.stopId)) continue;
      const event = stopUpdate.departure?.time != null ? stopUpdate.departure : stopUpdate.arrival;
      const departureAt = asNumber(event?.time ?? null);
      if (departureAt == null || departureAt < nowSeconds - 20 || departureAt > nowSeconds + 3 * 60 * 60) continue;

      const delay = typeof event?.delay === "number" && Number.isFinite(event.delay) ? event.delay : null;
      departures.push({
        stopId: stopUpdate.stopId,
        tripId,
        routeId,
        line: routeName,
        destination,
        directionId,
        mode: routeTypeToMode(routeType),
        departureAt,
        delaySeconds: delay,
      });
    }
  }

  const deduped = new Map<string, RealtimeDeparture>();
  for (const departure of departures) {
    deduped.set(`${departure.tripId}|${departure.stopId}|${departure.departureAt}`, departure);
  }
  return {
    departures: [...deduped.values()].sort((a, b) => a.departureAt - b.departureAt),
    updatedAt,
  };
}
