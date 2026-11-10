import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { parse } from "csv-parse/sync";
import { unzipSync, strFromU8 } from "fflate";
import type { TransitMode } from "./transport-query.js";

export interface GtfsStaticMetadata {
  routes: Map<string, { shortName: string; longName: string; type: number | null }>;
  trips: Map<string, { routeId: string; headsign: string; directionId: string; serviceId: string }>;
  calendars: Map<string, { startDate: string; endDate: string; weekdays: boolean[] }>;
  calendarExceptions: Map<string, number>;
  timezone: string | null;
}

export interface GtfsRouteAtStops {
  routeId: string;
  shortName: string;
  longName: string;
  mode: TransitMode | null;
  stopIds: string[];
}

export interface ScheduledDepartures {
  departures: RealtimeDeparture[];
  timezone: string;
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

function safeStopTimeRows(bytes: Uint8Array | undefined, stopIds: ReadonlySet<string>): CsvRow[] {
  if (!bytes || !stopIds.size) return [];
  const selected: CsvRow[] = [];
  parse(strFromU8(bytes), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
    max_record_size: 20_000,
    on_record(record: CsvRow) {
      if (record.stop_id && stopIds.has(record.stop_id.trim())) selected.push(record);
      return null;
    },
  });
  return selected;
}

function parseStaticFeed(zipBytes: Uint8Array, requestedStopIds?: ReadonlySet<string>) {
  const wanted = new Set(["agency.txt", "routes.txt", "trips.txt", "calendar.txt", "calendar_dates.txt",
    ...(requestedStopIds ? ["stop_times.txt"] : [])]);
  const files = unzipSync(zipBytes, { filter: (file) => wanted.has(file.name.split("/").at(-1)?.toLowerCase() ?? "") });
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
      serviceId: row.service_id?.trim() ?? "",
    });
  }

  const calendars = new Map<string, GtfsStaticMetadata["calendars"] extends Map<string, infer V> ? V : never>();
  for (const row of safeCsvRows(find("calendar.txt"))) {
    const serviceId = row.service_id?.trim();
    if (!serviceId) continue;
    calendars.set(serviceId, {
      startDate: row.start_date?.trim() ?? "",
      endDate: row.end_date?.trim() ?? "",
      weekdays: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
        .map((day) => row[day]?.trim() === "1"),
    });
  }

  const calendarExceptions = new Map<string, number>();
  for (const row of safeCsvRows(find("calendar_dates.txt"))) {
    const serviceId = row.service_id?.trim();
    const date = row.date?.trim();
    const exceptionType = Number(row.exception_type);
    if (serviceId && date && (exceptionType === 1 || exceptionType === 2)) {
      calendarExceptions.set(`${date}:${serviceId}`, exceptionType);
    }
  }

  return {
    metadata: {
      routes,
      trips,
      calendars,
      calendarExceptions,
      timezone: agency?.agency_timezone?.trim() || null,
    } satisfies GtfsStaticMetadata,
    stopTimes: requestedStopIds ? safeStopTimeRows(find("stop_times.txt"), requestedStopIds) : [],
  };
}

export function parseGtfsStaticMetadata(zipBytes: Uint8Array): GtfsStaticMetadata {
  return parseStaticFeed(zipBytes).metadata;
}

export function parseGtfsRoutesAtStops(zipBytes: Uint8Array, stopIds: ReadonlySet<string>): GtfsRouteAtStops[] {
  if (!stopIds.size) return [];
  const { metadata, stopTimes } = parseStaticFeed(zipBytes, stopIds);
  const stopsByRoute = new Map<string, Set<string>>();

  for (const row of stopTimes) {
    const trip = metadata.trips.get(row.trip_id?.trim() ?? "");
    const stopId = row.stop_id?.trim();
    if (!trip?.routeId || !stopId) continue;
    const routeStops = stopsByRoute.get(trip.routeId) ?? new Set<string>();
    routeStops.add(stopId);
    stopsByRoute.set(trip.routeId, routeStops);
  }

  return [...stopsByRoute.entries()].flatMap(([routeId, routeStops]) => {
    const route = metadata.routes.get(routeId);
    if (!route) return [];
    return [{
      routeId,
      shortName: route.shortName,
      longName: route.longName,
      mode: routeTypeToMode(route.type),
      stopIds: [...routeStops],
    }];
  });
}

export function addDays(date: string, amount: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(Date.UTC(year!, month! - 1, day! + amount));
  return `${result.getUTCFullYear()}-${String(result.getUTCMonth() + 1).padStart(2, "0")}-${String(result.getUTCDate()).padStart(2, "0")}`;
}

function gtfsDate(date: string): string {
  return date.replaceAll("-", "");
}

export function localDate(epochSeconds: number, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(epochSeconds * 1000));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function serviceRunsOn(metadata: GtfsStaticMetadata, serviceId: string, date: string): boolean {
  const exception = metadata.calendarExceptions.get(`${gtfsDate(date)}:${serviceId}`);
  if (exception === 1) return true;
  if (exception === 2) return false;

  const calendar = metadata.calendars.get(serviceId);
  if (!calendar || gtfsDate(date) < calendar.startDate || gtfsDate(date) > calendar.endDate) return false;
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay();
  return calendar.weekdays[weekday] ?? false;
}

export function scheduledEpoch(date: string, time: string, timezone: string): number | null {
  const match = time.match(/^(\d{1,3}):([0-5]\d):([0-5]\d)$/);
  if (!match) return null;
  const totalHours = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3]);
  if (!Number.isFinite(totalHours) || totalHours < 0) return null;

  const serviceDate = addDays(date, Math.floor(totalHours / 24));
  const hour = totalHours % 24;
  const [year, month, day] = serviceDate.split("-").map(Number);
  const targetUtc = Date.UTC(year!, month! - 1, day!, hour, minute, second);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  let estimate = targetUtc;
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = formatter.formatToParts(new Date(estimate));
    const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((entry) => entry.type === type)?.value ?? 0);
    const representedUtc = Date.UTC(
      part("year"),
      part("month") - 1,
      part("day"),
      part("hour"),
      part("minute"),
      part("second"),
    );
    const difference = targetUtc - representedUtc;
    if (difference === 0) break;
    estimate += difference;
  }
  return Math.floor(estimate / 1000);
}

export function decodeGtfsScheduledDepartures(
  zipBytes: Uint8Array,
  stopIds: ReadonlySet<string>,
  nowSeconds = Math.floor(Date.now() / 1000),
  horizonSeconds = 3 * 60 * 60,
): ScheduledDepartures {
  const { metadata, stopTimes } = parseStaticFeed(zipBytes, stopIds);
  const timezone = metadata.timezone || "Europe/Paris";
  const dates = [-1, 0, 1].map((offset) => addDays(localDate(nowSeconds, timezone), offset));
  const departures: RealtimeDeparture[] = [];

  for (const row of stopTimes) {
    const tripId = row.trip_id?.trim() ?? "";
    const trip = metadata.trips.get(tripId);
    const time = row.departure_time?.trim() || row.arrival_time?.trim();
    const stopId = row.stop_id?.trim() ?? "";
    if (!trip?.serviceId || !time || !stopId) continue;

    for (const date of dates) {
      if (!serviceRunsOn(metadata, trip.serviceId, date)) continue;
      const departureAt = scheduledEpoch(date, time, timezone);
      if (departureAt == null || departureAt < nowSeconds - 20 || departureAt > nowSeconds + horizonSeconds) continue;
      const route = metadata.routes.get(trip.routeId);
      departures.push({
        stopId,
        tripId,
        routeId: trip.routeId,
        line: route?.shortName || route?.longName || trip.routeId || "Ligne",
        destination: trip.headsign,
        directionId: trip.directionId,
        mode: routeTypeToMode(route?.type ?? null),
        departureAt,
        delaySeconds: null,
      });
    }
  }

  const deduped = new Map<string, RealtimeDeparture>();
  for (const departure of departures) {
    deduped.set(`${departure.tripId}|${departure.stopId}|${departure.departureAt}`, departure);
  }
  return {
    departures: [...deduped.values()].sort((a, b) => a.departureAt - b.departureAt),
    timezone,
  };
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
  if (type === 3 || type === 11 || (type != null && type >= 700 && type < 800)) return "bus";
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
