import { Transform } from "node:stream";
import { StringDecoder } from "node:string_decoder";
import { zipSync, strToU8 } from "fflate";
import { GtfsRangeArchive, type GtfsRow, type RangeRequest } from "./gtfs-range.js";
import { routeTypeToMode, serviceRunsOn, localDate, addDays, type GtfsStaticMetadata } from "./gtfs-realtime.js";
import { routeMatchesRequested, type TransitMode } from "./transport-query.js";
import { TransportDataError } from "./transport-data-error.js";

export interface GtfsSelection { mode: TransitMode; line?: string; routeId?: string; discoveryStops?: readonly string[]; serviceWindowFrom?: number }
const MAX_RETAINED = 48 * 1024 * 1024;

export function isIdfmGtfs(resource: { original_url?: string }): boolean {
  if (!resource.original_url) return false;
  try {
    const url = new URL(resource.original_url);
    return url.protocol === "https:" && url.hostname === "eu.ftp.opendatasoft.com" &&
      url.pathname === "/stif/GTFS/IDFM-gtfs.zip" && !url.username && !url.password;
  } catch { return false; }
}

/** Discard irrelevant stop-time records before allocating CSV row objects.
 * Quoted multiline records and escaped quotes are preserved. If trip_id is not
 * first, let the ordinary CSV parser do the filtering instead.
 */
export class GtfsTripFilter extends Transform {
  private decoder = new StringDecoder("utf8");
  private rest = "";
  private record = "";
  private quoted = false;
  private header = true;
  private fast = true;

  constructor(private readonly ids: ReadonlySet<string>) { super(); }

  private line(line: string) {
    this.record += line;
    if (this.record.length > 20_000) throw new Error("Transport CSV record exceeds its size limit");
    for (const quote of line.matchAll(/"/g)) { void quote; this.quoted = !this.quoted; }
    if (this.quoted) return;
    const record = this.record;
    this.record = "";
    if (this.header) {
      this.header = false;
      this.fast = record.replace(/^\uFEFF/, "").split(",")[0]?.replaceAll('"', "").trim() === "trip_id";
      this.push(record);
      return;
    }
    let id: string;
    if (record.startsWith('"')) id = record.match(/^"((?:[^"]|"")*)"\s*,/s)?.[1]?.replaceAll('""', '"') ?? "";
    else id = record.slice(0, record.indexOf(","));
    if (!this.fast || this.ids.has(id.trim())) this.push(record);
  }

  private consume(text: string, final = false) {
    this.rest += text;
    let end = 0;
    let next: number;
    while ((next = this.rest.indexOf("\n", end)) !== -1) {
      this.line(this.rest.slice(end, next + 1));
      end = next + 1;
    }
    this.rest = this.rest.slice(end);
    if (this.rest.length + this.record.length > 20_000) throw new Error("Transport CSV record exceeds its size limit");
    if (final && this.rest) { this.line(this.rest); this.rest = ""; }
    if (final && (this.quoted || this.record)) throw new Error("Transport CSV contains an incomplete quoted record");
  }

  override _transform(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    try { this.consume(this.decoder.write(chunk)); callback(); } catch (error) { callback(error as Error); }
  }

  override _flush(callback: (error?: Error | null) => void) {
    try { this.consume(this.decoder.end(), true); callback(); } catch (error) { callback(error as Error); }
  }
}

/** Build a small, compatible GTFS ZIP; shapes, extension tables and the
 * original 111+ MiB archive never enter the binary cache.
 */
export async function selectiveGtfs(request: RangeRequest, selection: GtfsSelection): Promise<Uint8Array> {
  if (!selection.line && !selection.routeId && !selection.discoveryStops?.length)
    throw new Error("A large network lookup requires a route or nearby stops");
  const archive = new GtfsRangeArchive(request);
  await archive.open();
  const files: Record<string, Uint8Array> = {};
  let retained = 0;
  const routes = new Set<string>();
  const trips = new Set<string>();
  const tripRoutes = new Map<string, string>();
  const services = new Set<string>();
  const stops = new Set<string>();
  const nearby = selection.discoveryStops ? new Set(selection.discoveryStops) : null;
  const discovered = new Set<string>();
  const table = async (name: string, keep: (row: GtfsRow) => boolean, filter?: Transform) => {
    const rows: string[] = [];
    let columns: string[] | undefined;
    const escape = (value: string) => /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
    const add = (line: string) => {
      retained += Buffer.byteLength(line);
      if (retained > MAX_RETAINED) throw new Error("Selected transport tables exceed the memory budget");
      rows.push(line);
    };
    const found = await archive.rows(name, (row) => {
      if (!columns) { columns = Object.keys(row); add(`${columns.map(escape).join(",")}\n`); }
      if (keep(row)) add(`${columns.map((column) => escape(row[column] ?? "")).join(",")}\n`);
    }, filter);
    if (found && rows.length) files[name] = strToU8(rows.join(""));
    return found;
  };
  if (!await table("routes.txt", (row) => {
    if (routeTypeToMode(Number(row.route_type)) !== selection.mode ||
      selection.routeId && row.route_id?.trim() !== selection.routeId ||
      (selection.line && !routeMatchesRequested(row.route_id || "", row.route_short_name || "", row.route_long_name || "", selection.line))) return false;
    routes.add(row.route_id!.trim());
    return true;
  })) throw new Error("Transport archive has no routes table");
  if (!routes.size) return zipSync(files, { level: 1 });
  let activeServices: Set<string> | undefined;
  if (selection.serviceWindowFrom != null) {
    const metadata: GtfsStaticMetadata = { routes: new Map(), trips: new Map(), calendars: new Map(),
      calendarExceptions: new Map(), timezone: null };
    await archive.rows("agency.txt", row => { metadata.timezone ??= row.agency_timezone || null; });
    if (!metadata.timezone) throw new TransportDataError("Le flux ne précise pas de fuseau horaire utilisable; horaires non confirmés.");
    await archive.rows("calendar.txt", row => metadata.calendars.set(row.service_id, {
      startDate: row.start_date!, endDate: row.end_date!,
      weekdays: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map(d => row[d] === "1"),
    }));
    await archive.rows("calendar_dates.txt", row => {
      if (row.exception_type === "1" || row.exception_type === "2")
        metadata.calendarExceptions.set(`${row.date}:${row.service_id}`, Number(row.exception_type));
    });
    const services = new Set([...metadata.calendars.keys(), ...[...metadata.calendarExceptions.keys()].map(k => k.slice(9))]);
    const dates = Array.from({ length: 9 }, (_, i) => addDays(localDate(selection.serviceWindowFrom!, metadata.timezone!), i - 1));
    activeServices = new Set([...services].filter(id => dates.some(d => serviceRunsOn(metadata, id, d))));
    if (!activeServices.size) throw new TransportDataError("Le calendrier publié ne couvre aucun service dans les 7 prochains jours; données anciennes ou service hors période.");
  }
  // A national mode may contain far more trips than can fit in a city-level
  // discovery extract. Find only trips that actually serve the selected stops
  // before retaining their trip metadata, rather than raising the trip budget.
  const discoveryTrips = nearby ? new Set<string>() : null;
  if (discoveryTrips) {
    if (!await archive.rows("stop_times.txt", row => {
      if (!nearby!.has(row.stop_id?.trim() ?? "")) return;
      const trip = row.trip_id?.trim() ?? "";
      if (!trip) return;
      discoveryTrips.add(trip);
      if (discoveryTrips.size > 50_000) throw new Error("Nearby transport discovery exceeds its trip budget");
    })) throw new Error("Transport archive has no stop times table");
  }
  if (!await table("trips.txt", (row) => {
    if (!routes.has(row.route_id?.trim() ?? "") || activeServices && !activeServices.has(row.service_id?.trim() ?? "")) return false;
    if (discoveryTrips && !discoveryTrips.has(row.trip_id?.trim() ?? "")) return false;
    if (trips.size >= 50_000) throw new Error("Too many selected transport trips");
    trips.add(row.trip_id!.trim());
    tripRoutes.set(row.trip_id!.trim(), row.route_id!.trim());
    services.add(row.service_id!.trim());
    return true;
  })) throw new Error("Transport archive has no trips table");
  if (!await table("stop_times.txt", (row) => {
    if (!trips.has(row.trip_id?.trim() ?? "")) return false;
    if (nearby) {
      const stop = row.stop_id?.trim() ?? "";
      if (!nearby.has(stop)) return false;
      // Discovery needs evidence that a route serves a nearby stop, not every
      // departure of every metro line. Never use this subset as a journey index.
      const key = JSON.stringify([tripRoutes.get(row.trip_id!.trim()), stop]);
      if (discovered.has(key)) return false;
      discovered.add(key);
    }
    stops.add(row.stop_id!.trim());
    return true;
  }, new GtfsTripFilter(trips))) throw new Error("Transport archive has no stop times table");
  await Promise.all([
    table("stops.txt", (row) => stops.has(row.stop_id?.trim() ?? "") || row.location_type?.trim() === "1"),
    table("calendar.txt", (row) => services.has(row.service_id?.trim() ?? "")),
    table("calendar_dates.txt", (row) => services.has(row.service_id?.trim() ?? "")),
    table("agency.txt", () => true),
    table("frequencies.txt", (row) => trips.has(row.trip_id?.trim() ?? "")),
  ]);
  if (!files["stops.txt"] || (!files["calendar.txt"] && !files["calendar_dates.txt"])) {
    throw new Error("Selected transport data has no usable stops or service calendar");
  }
  return zipSync(files, { level: 1 });
}
