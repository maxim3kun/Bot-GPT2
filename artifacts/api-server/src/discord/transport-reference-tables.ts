import type { CatalogResource } from "./public-transport.js";
import { GtfsRangeArchive, type RangeRequest } from "./gtfs-range.js";
import { scanRows } from "./gtfs-journey.js";
import { routeTypeToMode } from "./gtfs-realtime.js";
import type { TransitMode } from "./transport-query.js";

export interface ReferenceRoute { routeId: string; shortName: string; longName: string; mode: TransitMode | null; stopIds: string[] }
export interface ReferenceStop { id: string; name: string; parent?: string; latitude: number; longitude: number; type: number }

/** Only the selected network's routes/stops table; schedules are never parsed or returned here. */
export async function referenceTable<T>(resource: CatalogResource, name: "routes.txt" | "stops.txt",
  request: RangeRequest, fallback: () => Promise<Uint8Array>): Promise<T[]> {
  const rows: T[] = [];
  const add = (row: Record<string, string | undefined>) => {
    if (rows.length >= 60_000) throw Error("Transport reference table exceeds its budget");
    if (name === "routes.txt") {
      if (!row.route_id) return;
      rows.push({ routeId: row.route_id, shortName: row.route_short_name ?? "",
        longName: row.route_long_name ?? "", mode: routeTypeToMode(Number(row.route_type)), stopIds: [] } as T);
    } else {
      const lat = Number(row.stop_lat), lon = Number(row.stop_lon);
      if (!row.stop_id || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
      rows.push({ id: row.stop_id, name: row.stop_name ?? row.stop_id, parent: row.parent_station ?? "",
        latitude: lat, longitude: lon, type: Number(row.location_type || 0) } as T);
    }
  };
  try {
    const archive = new GtfsRangeArchive(request); await archive.open();
    if (!await archive.rows(name, add)) throw Error(`Missing ${name} in transport source ${resource.id}`);
  } catch (error) {
    // Some otherwise valid public GTFS hosts return a server error to Range
    // requests. Retry once through the existing size-bounded full-feed path.
    // A regular HTTP 200 (range ignored) uses the same fallback.
    if (!(error instanceof Error) ||
      !/Transport server does not provide a usable ZIP range \((?:200|403|405|406|416|500|502|503)\)/.test(error.message)) throw error;
    rows.length = 0;
    await scanRows(await fallback(), name, add);
  }
  if (!rows.length) throw Error(`No usable ${name} in transport source ${resource.id}`);
  return rows;
}
