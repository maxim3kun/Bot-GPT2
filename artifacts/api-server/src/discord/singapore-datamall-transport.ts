import { deflateSync, inflateSync } from "node:zlib";
import { parse } from "csv-parse/sync";
import { strFromU8, unzipSync } from "fflate";
import { createHash } from "node:crypto";
import type { CatalogDataset, CatalogResource, StopCollection, TransportLocation } from "./public-transport.js";
import type { TransportProvider, TransportTerritory } from "./transport-provider.js";
import type { TransitMode } from "./transport-query.js";
import { normalizeTransitText, routeMatchesRequested } from "./transport-query.js";
import { TransportMetadataCache, resourceVersion } from "./transport-metadata-cache.js";
import { TransportDataError } from "./transport-data-error.js";
import { parseGtfsRoutesAtStops, type GtfsRouteAtStops } from "./gtfs-realtime.js";
import { buildJourneyIndex, journeyPairs, type JourneyIndex, type JourneyTime } from "./gtfs-journey.js";
import { departureCards } from "./transport-presentation.js";
import { localDate, scheduledEpoch } from "./gtfs-realtime.js";
import type { ReferenceRoute, ReferenceStop } from "./transport-reference-tables.js";
import type { StopGroup, TransportLine, TransportTimeOptions } from "./transport-browser.js";

const API = "https://datamall2.mytransport.sg/ltaodataservice";
const PAGE = "https://datamall.lta.gov.sg/content/datamall/en.html";
const API_ACCESS = "https://datamall.lta.gov.sg/content/datamall/en/request-for-api.html";
const TIMEZONE = "Asia/Singapore";
const BOUNDS: [number, number, number, number] = [103.59, 1.15, 104.1, 1.48];
const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;
const MAX_JSON_BYTES = 16 * 1024 * 1024;
const MAX_TRAIN_GTFS_BYTES = 40 * 1024 * 1024;
const MAX_TRAIN_FEED_BYTES = 8 * 1024 * 1024;

interface BusStopRow {
  BusStopCode?: string; RoadName?: string; Description?: string; Latitude?: number | string; Longitude?: number | string;
}
interface BusRouteRow {
  ServiceNo?: string; Operator?: string; Direction?: number | string; StopSequence?: number | string;
  BusStopCode?: string; Distance?: number | string;
  WD_FirstBus?: string; WD_LastBus?: string; SAT_FirstBus?: string; SAT_LastBus?: string;
  SUN_FirstBus?: string; SUN_LastBus?: string;
}
interface BusServiceRow {
  ServiceNo?: string; Operator?: string; Direction?: number | string; Category?: string;
  AM_Peak_Freq?: string; AM_Offpeak_Freq?: string; PM_Peak_Freq?: string; PM_Offpeak_Freq?: string;
}
interface ODataPage<T> { value?: T[] }
interface DownloadLink { Link?: string; link?: string }
interface BusArrivalItem {
  EstimatedArrival?: string; Monitored?: number | string; OriginCode?: string; DestinationCode?: string;
}
interface BusArrivalService { ServiceNo?: string; NextBus?: BusArrivalItem; NextBus2?: BusArrivalItem; NextBus3?: BusArrivalItem }
interface BusArrivalResponse { Services?: BusArrivalService[] }
type PackedIndex = { payload: string };
type Csv = Record<string, string | undefined>;
type CachedBusRow = ReferenceRoute & {
  serviceNo: string; direction: string; operator: string; stopSequence: number; busStopCode: string;
  wdFirstBus?: string; wdLastBus?: string; satFirstBus?: string; satLastBus?: string;
  sunFirstBus?: string; sunLastBus?: string; category?: string;
  amPeakFrequency?: string; amOffpeakFrequency?: string; pmPeakFrequency?: string; pmOffpeakFrequency?: string;
};

function cachedBusRoute(row: BusRouteRow): CachedBusRow | null {
  const serviceNo = row.ServiceNo?.trim() ?? "", direction = String(row.Direction ?? "");
  const busStopCode = row.BusStopCode?.trim() ?? "", stopSequence = Number(row.StopSequence);
  if (!serviceNo || !/^[12]$/.test(direction) || !/^\d{5}$/.test(busStopCode) || !Number.isFinite(stopSequence)) return null;
  return { routeId: `lta-row:${serviceNo}:${direction}:${stopSequence}`, shortName: serviceNo,
    longName: String(row.Operator ?? ""), mode: "bus", stopIds: [busStopCode],
    serviceNo, direction, operator: String(row.Operator ?? ""), stopSequence, busStopCode,
    ...(row.WD_FirstBus ? { wdFirstBus: row.WD_FirstBus } : {}),
    ...(row.WD_LastBus ? { wdLastBus: row.WD_LastBus } : {}),
    ...(row.SAT_FirstBus ? { satFirstBus: row.SAT_FirstBus } : {}),
    ...(row.SAT_LastBus ? { satLastBus: row.SAT_LastBus } : {}),
    ...(row.SUN_FirstBus ? { sunFirstBus: row.SUN_FirstBus } : {}),
    ...(row.SUN_LastBus ? { sunLastBus: row.SUN_LastBus } : {}) };
}

function busRouteFromCache(row: CachedBusRow): BusRouteRow {
  return { ServiceNo: row.serviceNo, Direction: row.direction, Operator: row.operator,
    StopSequence: row.stopSequence, BusStopCode: row.busStopCode,
    ...(row.wdFirstBus ? { WD_FirstBus: row.wdFirstBus } : {}),
    ...(row.wdLastBus ? { WD_LastBus: row.wdLastBus } : {}),
    ...(row.satFirstBus ? { SAT_FirstBus: row.satFirstBus } : {}),
    ...(row.satLastBus ? { SAT_LastBus: row.satLastBus } : {}),
    ...(row.sunFirstBus ? { SUN_FirstBus: row.sunFirstBus } : {}),
    ...(row.sunLastBus ? { SUN_LastBus: row.sunLastBus } : {}) };
}

function cachedBusService(row: BusServiceRow): CachedBusRow | null {
  const serviceNo = row.ServiceNo?.trim() ?? "", direction = String(row.Direction ?? "");
  if (!serviceNo || !/^[12]$/.test(direction)) return null;
  return { routeId: `lta-service:${serviceNo}:${direction}`, shortName: serviceNo,
    longName: String(row.Operator ?? ""), mode: "bus", stopIds: [], serviceNo, direction,
    operator: String(row.Operator ?? ""), stopSequence: 0, busStopCode: "",
    ...(row.Category ? { category: row.Category } : {}),
    ...(row.AM_Peak_Freq ? { amPeakFrequency: row.AM_Peak_Freq } : {}),
    ...(row.AM_Offpeak_Freq ? { amOffpeakFrequency: row.AM_Offpeak_Freq } : {}),
    ...(row.PM_Peak_Freq ? { pmPeakFrequency: row.PM_Peak_Freq } : {}),
    ...(row.PM_Offpeak_Freq ? { pmOffpeakFrequency: row.PM_Offpeak_Freq } : {}) };
}

function busServiceFromCache(row: CachedBusRow): BusServiceRow {
  return { ServiceNo: row.serviceNo, Direction: row.direction, Operator: row.operator,
    ...(row.category ? { Category: row.category } : {}),
    ...(row.amPeakFrequency ? { AM_Peak_Freq: row.amPeakFrequency } : {}),
    ...(row.amOffpeakFrequency ? { AM_Offpeak_Freq: row.amOffpeakFrequency } : {}),
    ...(row.pmPeakFrequency ? { PM_Peak_Freq: row.pmPeakFrequency } : {}),
    ...(row.pmOffpeakFrequency ? { PM_Offpeak_Freq: row.pmOffpeakFrequency } : {}) };
}

async function boundedBytes(response: Response, maximum: number, description: string): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) throw new TransportDataError(`${description} est vide.`);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximum) {
        await reader.cancel();
        throw new TransportDataError(`${description} dépasse la limite de taille.`);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}

const stableId = (value: string) => -1 - createHash("sha256").update(`sg:${value}`).digest().readUIntBE(0, 6);
const inBounds = (latitude: number, longitude: number) =>
  longitude >= BOUNDS[0] && latitude >= BOUNDS[1] && longitude <= BOUNDS[2] && latitude <= BOUNDS[3];
const routeIdForBus = (service: string, direction: string) => `sg:bus:${encodeURIComponent(service)}:${direction}`;

function parseGtfsFiles(bytes: Uint8Array) {
  if (bytes.byteLength > MAX_TRAIN_GTFS_BYTES) throw new TransportDataError("Le GTFS des trains LTA dépasse la limite de taille autorisée.");
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, { filter: file => /(?:^|\/)(?:agency|routes|trips|stops|stop_times|calendar|calendar_dates)\.txt$/i.test(file.name) });
  } catch { throw new TransportDataError("L’archive GTFS des trains LTA est illisible."); }
  const table = (name: string) => {
    const entry = Object.entries(files).find(([path]) => path.split("/").at(-1)?.toLowerCase() === name);
    if (!entry) throw new TransportDataError(`Le GTFS des trains LTA ne contient pas ${name}.`);
    try {
      const rows = parse(strFromU8(entry[1]), { columns: true, bom: true, skip_empty_lines: true,
        relax_column_count: true, max_record_size: 20_000 }) as Csv[];
      if (rows.length > 300_000) throw new Error("too many rows");
      return rows;
    } catch { throw new TransportDataError(`La table ${name} du GTFS LTA est illisible.`); }
  };
  return { table };
}

function encodeIndex(index: JourneyIndex): PackedIndex {
  const payload = deflateSync(Buffer.from(JSON.stringify({
    routeId: index.routeId,
    metadata: {
      routes: [...index.metadata.routes], trips: [...index.metadata.trips],
      calendars: [...index.metadata.calendars], calendarExceptions: [...index.metadata.calendarExceptions],
      timezone: index.metadata.timezone,
    },
    visits: [...index.visits], stops: [...index.stops],
  }))).toString("base64");
  if (payload.length > 3_800_000) throw new TransportDataError("L’horaire des trains LTA dépasse la taille maximale du cache réutilisable.");
  return { payload };
}

function decodeIndex(value: PackedIndex): JourneyIndex {
  try {
    const dto = JSON.parse(inflateSync(Buffer.from(value.payload, "base64"), { maxOutputLength: 32 * 1024 * 1024 }).toString("utf8"));
    const metadata = dto.metadata;
    return { routeId: dto.routeId, metadata: {
      routes: new Map(metadata.routes), trips: new Map(metadata.trips), calendars: new Map(metadata.calendars),
      calendarExceptions: new Map(metadata.calendarExceptions), timezone: metadata.timezone,
    }, visits: new Map(dto.visits), stops: new Map(dto.stops), connectionsUnavailable: true };
  } catch { throw new TransportDataError("Le cache GTFS LTA du trajet est illisible."); }
}

function busIndex(routeId: string, routes: BusRouteRow[], stops: ReferenceStop[]): JourneyIndex {
  const [service, direction] = routeId.match(/^sg:bus:([^:]+):([12])$/)?.slice(1) ?? [];
  const serviceNo = service ? decodeURIComponent(service) : "";
  const route = routes.filter(row => row.ServiceNo === serviceNo && String(row.Direction) === direction)
    .sort((a, b) => Number(a.StopSequence) - Number(b.StopSequence));
  if (!serviceNo || route.length < 2) throw new TransportDataError("Le parcours de bus LTA n’est plus disponible.");
  const stopMap = new Map(stops.map(stop => [stop.id, stop]));
  const visits = route.flatMap((row, sequence) => {
    const id = row.BusStopCode?.trim() ?? "", stop = stopMap.get(id);
    return id && stop ? [{ id, name: stop.name, sequence }] : [];
  });
  if (visits.length < 2) throw new TransportDataError("Le parcours LTA ne contient pas deux arrêts vérifiables.");
  const syntheticTrip = `sg-route:${serviceNo}:${direction}`;
  return { routeId, metadata: {
    routes: new Map([[routeId, { shortName: serviceNo, longName: `Direction ${direction}`, type: 3 }]]),
    trips: new Map([[syntheticTrip, { routeId, headsign: "", directionId: direction, serviceId: syntheticTrip }]]),
    calendars: new Map(), calendarExceptions: new Map(), timezone: TIMEZONE,
  }, visits: new Map([[syntheticTrip, visits.map(({ id, sequence }) => ({
    stopId: id, sequence, arrival: "00:00:00", departure: "00:00:00", pickup: true, dropoff: true,
  }))]]), stops: new Map(visits.map(({ id, name }) => [id, { id, name, parent: "" }])),
  connectionsUnavailable: true };
}

/** LTA schedules and live arrivals are kept separate; no GTFS trips are invented for buses. */
export class SingaporeDataMallTransportClient implements TransportProvider {
  readonly territory: TransportTerritory = "sg";
  readonly metadata: TransportMetadataCache;
  private trainFeedPromise?: Promise<Uint8Array>;
  private trainTablesPromise?: Promise<{ routes: ReferenceRoute[]; stops: ReferenceStop[] }>;
  private trainFeedExpires = 0;
  private readonly trainRoutes = new Map<number, ReferenceRoute[]>();
  private readonly trainStops = new Map<number, ReferenceStop[]>();
  private requestQueue: Promise<unknown> = Promise.resolve();
  private lastApiRequestAt = 0;
  private blockedUntil = 0;

  constructor(private readonly fetcher: typeof fetch = fetch, private readonly now: () => number = Date.now,
    metadata?: TransportMetadataCache, private readonly key: () => string | undefined = () => process.env.DATAMALL_API_KEY) {
    this.metadata = metadata ?? new TransportMetadataCache(undefined, now);
  }

  async availableModes(): Promise<TransitMode[]> { return ["bus", "rail"]; }

  private apiUrl(path: string) {
    const url = new URL(path.replace(/^\/+/, ""), `${API}/`);
    if (url.protocol !== "https:" || url.hostname !== "datamall2.mytransport.sg" ||
      !url.pathname.startsWith("/ltaodataservice/") || url.username || url.password || url.port) {
      throw new TransportDataError("Adresse de l’API LTA refusée.");
    }
    return url;
  }

  private async apiJson<T>(path: string): Promise<T> {
    const key = this.key()?.trim();
    if (!key) throw new TransportDataError(`Accès DataMall indisponible : configure la clé DATAMALL_API_KEY après inscription et acceptation des conditions LTA (${API_ACCESS}).`);
    const now = this.now();
    if (now < this.blockedUntil) {
      throw new TransportDataError("Limite de requêtes DataMall atteinte. Réessaie dans une minute.");
    }
    const url = this.apiUrl(path);
    const request = this.requestQueue.then(async () => {
      const wait = Math.max(0, this.lastApiRequestAt + 100 - Date.now());
      if (wait) await new Promise(resolve => setTimeout(resolve, wait));
      this.lastApiRequestAt = Date.now();
      return this.fetcher(url, { headers: { accept: "application/json", AccountKey: key },
        signal: AbortSignal.timeout(20_000), redirect: "error" });
    });
    this.requestQueue = request.then(() => undefined, () => undefined);
    const response = await request.catch(() => {
      throw new TransportDataError("DataMall LTA n’a pas répondu; aucune nouvelle donnée n’est confirmée.");
    });
    if (response.status === 429) this.blockedUntil = now + 60_000;
    if (!response.ok) {
      await response.body?.cancel();
      if ([401, 403].includes(response.status)) throw new TransportDataError("DataMall LTA refuse la clé ou l’accès n’a pas été autorisé.");
      throw new TransportDataError(`DataMall LTA est indisponible (HTTP ${response.status}); aucune ligne n’est confirmée.`);
    }
    const length = Number(response.headers.get("content-length"));
    if (Number.isFinite(length) && length > MAX_JSON_BYTES) {
      await response.body?.cancel(); throw new TransportDataError("La réponse DataMall dépasse sa limite de taille.");
    }
    const body = new TextDecoder().decode(await boundedBytes(response, MAX_JSON_BYTES, "La réponse DataMall"));
    try { return JSON.parse(body) as T; }
    catch { throw new TransportDataError("La réponse DataMall est illisible."); }
  }

  private async allPages<T>(path: string): Promise<T[]> {
    const rows: T[] = [];
    for (let skip = 0; skip < 100_000; skip += 500) {
      const data = await this.apiJson<ODataPage<T>>(`${path}${path.includes("?") ? "&" : "?"}$skip=${skip}`);
      if (!Array.isArray(data.value) || data.value.length > 500) throw new TransportDataError("La pagination DataMall est invalide.");
      rows.push(...data.value);
      if (data.value.length < 500) return rows;
    }
    throw new TransportDataError("Le catalogue DataMall dépasse la limite de pagination.");
  }

  private async busRoutes(): Promise<BusRouteRow[]> {
    const rows: BusRouteRow[] = [];
    for (let skip = 0; skip < 100_000; skip += 500) {
      const result = await this.metadata.staleWhileRevalidate<{ records: CachedBusRow[]; count: number }>({
        territory: "sg", provider: "lta-datamall", kind: "busRoutePages",
        source: `bus-routes-page:${skip}`, version: "lta-routes-v1",
      }, 24 * HOUR, 7 * DAY, async () => {
        const page = await this.apiJson<ODataPage<BusRouteRow>>(`/BusRoutes?$skip=${skip}`);
        if (!Array.isArray(page.value) || page.value.length > 500) {
          throw new TransportDataError("La page des lignes de bus LTA est invalide.");
        }
        return { count: page.value.length, records: page.value.flatMap(row => cachedBusRoute(row) ?? []) };
      });
      rows.push(...result.value.records.map(busRouteFromCache));
      if (result.value.count < 500) return rows;
    }
    throw new TransportDataError("Le catalogue des lignes de bus LTA dépasse la limite de pagination.");
  }

  private async busRoutesForStops(stopIds: ReadonlySet<string>): Promise<BusRouteRow[]> {
    const codes = [...stopIds].filter(code => /^\d{5}$/.test(code)).sort();
    const codeSet = new Set(codes);
    return (await this.busRoutes()).filter(row => codeSet.has(row.BusStopCode?.trim() ?? ""));
  }

  private busRoutesForService(serviceNo: string, direction?: string): Promise<BusRouteRow[]> {
    return this.busRoutes().then(rows => rows.filter(row => row.ServiceNo === serviceNo &&
      (!direction || String(row.Direction) === direction)));
  }

  private busStops(): Promise<ReferenceStop[]> {
    return this.metadata.staleWhileRevalidate({
      territory: "sg", provider: "lta-datamall", kind: "stops", source: "bus-stops", version: "lta-stops-v1",
    }, 24 * HOUR, 7 * DAY, async () => {
      const rows = await this.allPages<BusStopRow>("/BusStops");
      return rows.flatMap(row => {
        const id = row.BusStopCode?.trim() ?? "", latitude = Number(row.Latitude), longitude = Number(row.Longitude);
        if (!/^\d{5}$/.test(id) || !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
          !inBounds(latitude, longitude)) return [];
        return [{ id, name: [row.RoadName, row.Description].filter(Boolean).join(" · ") || id,
          parent: "", latitude, longitude, type: 0 }];
      });
    }).then(result => result.value);
  }

  private busServices(): Promise<BusServiceRow[]> {
    return this.metadata.staleWhileRevalidate<CachedBusRow[]>({
      territory: "sg", provider: "lta-datamall", kind: "routes", source: "bus-services", version: "lta-services-v1",
    }, 24 * HOUR, 7 * DAY, async () => (await this.allPages<BusServiceRow>("/BusServices"))
      .flatMap(row => cachedBusService(row) ?? [])).then(result => result.value.map(busServiceFromCache));
  }

  private async trainFeed(): Promise<Uint8Array> {
    if (this.trainFeedPromise && this.trainFeedExpires > this.now()) return this.trainFeedPromise;
    this.trainRoutes.clear();
    this.trainStops.clear();
    const work = (async () => {
      const response = await this.apiJson<ODataPage<DownloadLink>>("/GTFSScheduleTrain");
      const download = response.value?.[0];
      const link = download?.Link ?? download?.link;
      if (!link) throw new TransportDataError("DataMall n’a pas fourni le lien du GTFS train.");
      let url: URL;
      try { url = new URL(link); } catch { throw new TransportDataError("Le lien du GTFS train LTA est invalide."); }
      if (url.protocol !== "https:" || !/^[a-z0-9-]+\.s3\.ap-southeast-1\.amazonaws\.com$/i.test(url.hostname) ||
        url.username || url.password || url.port || !url.pathname.toLowerCase().endsWith(".zip")) {
        throw new TransportDataError("Le lien temporaire du GTFS train ne correspond pas au stockage LTA autorisé.");
      }
      const feed = await this.fetcher(url, { signal: AbortSignal.timeout(45_000), redirect: "error" })
        .catch(() => { throw new TransportDataError("Le fichier GTFS train LTA n’a pas répondu."); });
      if (!feed.ok) { await feed.body?.cancel(); throw new TransportDataError(`Le fichier GTFS train LTA est indisponible (HTTP ${feed.status}).`); }
      const length = Number(feed.headers.get("content-length"));
      if (Number.isFinite(length) && length > MAX_TRAIN_GTFS_BYTES) {
        await feed.body?.cancel(); throw new TransportDataError("Le GTFS train LTA dépasse sa limite de taille.");
      }
      const bytes = await boundedBytes(feed, MAX_TRAIN_GTFS_BYTES, "Le GTFS train LTA");
      if (!bytes.length) throw new TransportDataError("Le GTFS train LTA est vide.");
      parseGtfsFiles(bytes);
      return bytes;
    })();
    this.trainFeedPromise = work;
    this.trainFeedExpires = this.now() + 6 * HOUR;
    try { return await work; }
    catch (error) { if (this.trainFeedPromise === work) { this.trainFeedPromise = undefined; this.trainFeedExpires = 0; } throw error; }
  }

  private async trainTables(resource: CatalogResource) {
    const loadTables = async () => {
      if (this.trainTablesPromise) return this.trainTablesPromise;
      const work = (async () => {
        const { table } = parseGtfsFiles(await this.trainFeed());
        const routes = table("routes.txt").flatMap(row => {
          const routeId = row.route_id?.trim() ?? "", number = Number(row.route_type);
          const mode: TransitMode | null = number === 2 || number === 1 ? "rail" : null;
          return routeId && mode ? [{ routeId, shortName: row.route_short_name?.trim() ?? "",
            longName: row.route_long_name?.trim() ?? "", mode, stopIds: [] }] : [];
        });
        const stops = table("stops.txt").flatMap(row => {
          const id = row.stop_id?.trim() ?? "", latitude = Number(row.stop_lat), longitude = Number(row.stop_lon);
          if (!id || !Number.isFinite(latitude) || !Number.isFinite(longitude) || !inBounds(latitude, longitude)) return [];
          return [{ id, name: row.stop_name?.trim() || id, parent: row.parent_station?.trim() ?? "",
            latitude, longitude, type: Number(row.location_type || 0) }];
        });
        if (!routes.length || !stops.length) throw new TransportDataError("Le GTFS train LTA ne publie pas de lignes et d’arrêts exploitables.");
        return { routes, stops };
      })();
      this.trainTablesPromise = work;
      try { return await work; }
      finally { if (this.trainTablesPromise === work) this.trainTablesPromise = undefined; }
    };
    const [routeResult, stopResult] = await Promise.all([
      this.metadata.staleWhileRevalidate<ReferenceRoute[]>({
        territory: "sg", provider: "lta-datamall", kind: "routes",
        source: `train-static-routes:${resource.id}`, version: `lta-train-v2:${resourceVersion(resource)}`,
      }, 6 * HOUR, 7 * DAY, async () => (await loadTables()).routes),
      this.metadata.staleWhileRevalidate<ReferenceStop[]>({
        territory: "sg", provider: "lta-datamall", kind: "stops",
        source: `train-static-stops:${resource.id}`, version: resourceVersion(resource),
      }, 6 * HOUR, 7 * DAY, async () => (await loadTables()).stops),
    ]);
    this.trainRoutes.set(resource.id, routeResult.value);
    this.trainStops.set(resource.id, stopResult.value);
    return { routes: routeResult.value, stops: stopResult.value };
  }

  async getCatalog(): Promise<CatalogDataset[]> {
    const bus: CatalogResource = { id: stableId("bus-routes"), title: "Lignes et premier/dernier bus LTA",
      format: "LTA Bus Routes", type: "public-transit", url: `${API}/BusRoutes`, original_url: `${API}/BusRoutes`,
      is_available: true, modes: ["bus"], referenceVersion: "lta-bus-routes-v1" };
    const train: CatalogResource = { id: stableId("train-gtfs"), title: "GTFS Schedule (Train) · LTA",
      format: "GTFS", type: "public-transit", url: `${API}/GTFSScheduleTrain`,
      original_url: `${API}/GTFSScheduleTrain`, is_available: true, modes: ["rail"],
      referenceVersion: "lta-train-schedule-v1" };
    const updates: CatalogResource = { id: stableId("train-trip-updates"), title: "GTFS Realtime Train Trip Updates · LTA",
      format: "GTFS-RT", type: "public-transit", url: `${API}/GTFSRealtimeTrainTripUpdates`,
      original_url: `${API}/GTFSRealtimeTrainTripUpdates`, is_available: true, modes: ["rail"] };
    const alerts: CatalogResource = { id: stableId("train-service-alerts"), title: "GTFS Realtime Train Service Alerts · LTA",
      format: "GTFS-RT", type: "public-transit", url: `${API}/GTFSRealTimeTrainServiceAlerts`,
      original_url: `${API}/GTFSRealTimeTrainServiceAlerts`, is_available: true, modes: ["rail"] };
    return [
      { id: "sg:lta:bus", title: "LTA · Bus", slug: "sg-lta-bus", page_url: PAGE,
        type: "public-transit", licence: "Singapore Open Data Licence · accès API LTA",
        resources: [bus], territory: "sg", bounds: BOUNDS, modes: ["bus"], publisher: "Land Transport Authority",
        limitations: ["LTA publie les tracés, premiers/derniers bus et fréquences; les horaires complets de chaque départ ne sont pas publiés ici.",
          "Les estimations d’arrivée à l’arrêt sont consultées en temps réel via Bus Arrival."] },
      { id: "sg:lta:train", title: "LTA · Train", slug: "sg-lta-train", page_url: PAGE,
        type: "public-transit", licence: "Singapore Open Data Licence · accès API LTA",
        resources: [train, updates, alerts], territory: "sg", bounds: BOUNDS, modes: ["rail"],
        publisher: "Land Transport Authority",
        limitations: ["Horaires théoriques du GTFS LTA; les mises à jour temps réel sont affichées séparément lorsqu’elles sont disponibles."] },
    ];
  }

  async municipalities(place: string): Promise<TransportLocation[]> {
    const query = normalizeTransitText(place);
    if (query.length < 2 || query.length > 100) return [];
    return this.metadata.get({ territory: "sg", provider: "nominatim", kind: "locations",
      source: `singapore-places:${query}`, version: "nominatim-v1" }, DAY, async () => {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", place); url.searchParams.set("format", "jsonv2");
      url.searchParams.set("addressdetails", "1"); url.searchParams.set("limit", "15");
      url.searchParams.set("countrycodes", "sg");
      const response = await this.fetcher(url, { headers: { accept: "application/json",
        "user-agent": "MaximeGPT public transport/1.0" }, signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new TransportDataError("Le géocodage de Singapour est temporairement indisponible.");
      const body = await response.text();
      if (Buffer.byteLength(body) > 1024 * 1024) throw new TransportDataError("Le géocodage de Singapour dépasse sa limite de taille.");
      let rows: Array<Record<string, unknown>>;
      try { rows = JSON.parse(body) as Array<Record<string, unknown>>; }
      catch { throw new TransportDataError("Le résultat de géocodage de Singapour est illisible."); }
      return rows.flatMap(row => {
        const address = row.address as Record<string, unknown> | undefined;
        const latitude = Number(row.lat), longitude = Number(row.lon);
        const type = String(row.type ?? "");
        if (address?.country_code !== "sg" || !inBounds(latitude, longitude) ||
          !["city", "town", "village", "suburb", "neighbourhood", "administrative"].includes(type)) return [];
        const name = String(row.name ?? String(row.display_name ?? "").split(",")[0]).trim();
        if (!name) return [];
        const id = `osm:sg:${createHash("sha256").update(`${normalizeTransitText(name)}:${latitude.toFixed(5)}:${longitude.toFixed(5)}`).digest("hex").slice(0, 16)}`;
        return [{ id, name, label: `${name} · Singapour`, latitude, longitude, territory: "sg" as const }];
      }).slice(0, 25);
    });
  }

  async networks(_city: TransportLocation, mode: TransitMode): Promise<CatalogDataset[]> {
    return (await this.getCatalog()).filter(dataset => dataset.modes?.includes(mode));
  }

  async referenceRoutes(resource: CatalogResource): Promise<ReferenceRoute[]> {
    if (resource.format === "LTA Bus Routes") {
      throw new TransportDataError("Les lignes bus LTA doivent être découvertes à partir des arrêts proches, pas du catalogue complet.");
    }
    return (await this.trainTables(resource)).routes;
  }

  async reverseBusRoutes(resource: CatalogResource, routeId: string): Promise<ReferenceRoute[]> {
    if (resource.format !== "LTA Bus Routes") throw new TransportDataError("La recherche du sens retour LTA est réservée aux bus.");
    const match = routeId.match(/^sg:bus:([^:]+):([12])$/);
    if (!match) throw new TransportDataError("Identifiant de ligne bus LTA invalide.");
    const serviceNo = decodeURIComponent(match[1]!);
    const rows = await this.busRoutesForService(serviceNo);
    const result = new Map<string, ReferenceRoute>();
    for (const row of rows) {
      const service = row.ServiceNo?.trim() ?? "", direction = String(row.Direction ?? "");
      const stop = row.BusStopCode?.trim() ?? "";
      if (service !== serviceNo || !/^[12]$/.test(direction) || !/^\d{5}$/.test(stop)) continue;
      const id = routeIdForBus(service, direction);
      const route = result.get(id) ?? { routeId: id, shortName: service,
        longName: `${service} · direction ${direction}`, mode: "bus" as const, stopIds: [] };
      if (!route.stopIds.includes(stop)) route.stopIds.push(stop);
      result.set(id, route);
    }
    return [...result.values()];
  }

  async referenceStops(resource: CatalogResource): Promise<ReferenceStop[]> {
    return resource.format === "LTA Bus Routes" ? this.busStops() : (await this.trainTables(resource)).stops;
  }

  async discoverRoutesAtStops(resource: CatalogResource, stopIds: ReadonlySet<string>, mode: TransitMode,
    requestedLine = ""): Promise<GtfsRouteAtStops[]> {
    if (resource.format === "LTA Bus Routes") {
      const rows = await this.busRoutesForStops(stopIds);
      const matches = new Map<string, GtfsRouteAtStops>();
      for (const row of rows) {
        const service = row.ServiceNo?.trim() ?? "", direction = String(row.Direction ?? "");
        const id = routeIdForBus(service, direction), stop = row.BusStopCode?.trim() ?? "";
        if (!service || !stop || !/^[12]$/.test(direction) ||
          requestedLine && !routeMatchesRequested(id, service, `${service} · direction ${direction}`, requestedLine)) continue;
        const route = matches.get(id) ?? { routeId: id, shortName: service,
          longName: `${service} · direction ${direction}`, mode: "bus" as const, stopIds: [] };
        if (stopIds.has(stop) && !route.stopIds.includes(stop)) route.stopIds.push(stop);
        matches.set(id, route);
      }
      return [...matches.values()].filter(route => route.mode === mode && route.stopIds.length);
    }
    const key = createHash("sha256").update([...stopIds].sort().join("\n")).digest("hex");
    const result = await this.metadata.staleWhileRevalidate<GtfsRouteAtStops[]>({
      territory: "sg", provider: "lta-datamall", kind: "routes",
      source: `train-routes-at-stops:${resource.id}:${mode}:${normalizeTransitText(requestedLine)}:${key}`,
      version: `lta-train-v2:${resourceVersion(resource)}`,
    }, HOUR, 7 * DAY, async () => parseGtfsRoutesAtStops(await this.trainFeed(), stopIds)
      .filter(route => (route.mode === "metro" || route.mode === "rail") && (!requestedLine ||
        routeMatchesRequested(route.routeId, route.shortName, route.longName, requestedLine)))
      .map(route => ({ ...route, mode: "rail" as const })));
    return result.value;
  }

  async nearbyStopsForResources(latitude: number, longitude: number, resources: CatalogResource[]): Promise<StopCollection> {
    const features: NonNullable<StopCollection["features"]> = [], failed: number[] = [];
    const latRadius = 0.015, lonRadius = latRadius / Math.max(0.2, Math.cos(latitude * Math.PI / 180));
    for (const resource of resources) {
      try {
        const stops = await this.referenceStops(resource);
        for (const stop of stops) if (Math.abs(stop.latitude - latitude) <= latRadius &&
          Math.abs(stop.longitude - longitude) <= lonRadius) {
          features.push({ properties: { resource_id: resource.id, stop_id: stop.id, stop_name: stop.name, location_type: stop.type } });
        }
      } catch { failed.push(resource.id); }
    }
    return { features, ...(failed.length ? { unavailableResourceIds: failed } : {}) };
  }

  async nearbyStops(latitude: number, longitude: number): Promise<StopCollection> {
    const catalog = await this.getCatalog();
    return this.nearbyStopsForResources(latitude, longitude, catalog.flatMap(dataset => dataset.resources.slice(0, 1)));
  }

  async staticFeed(resource: CatalogResource): Promise<Uint8Array> {
    if (resource.format === "LTA Bus Routes") {
      throw new TransportDataError("Les horaires de bus LTA sont décrits par les premier/dernier départs publiés et les arrivées temps réel, pas par un GTFS de bus.");
    }
    if (resource.id !== stableId("train-gtfs")) throw new TransportDataError("Ressource statique LTA inconnue.");
    return this.trainFeed();
  }

  async journeyIndex(resource: CatalogResource, routeId: string, mode: TransitMode): Promise<JourneyIndex> {
    if (resource.format === "LTA Bus Routes") {
      const result = await this.metadata.staleWhileRevalidate({
        territory: "sg", provider: "lta-datamall", kind: "journeyIndexes",
        source: `bus-route-index:${routeId}`, version: "lta-bus-route-index-v1",
      }, 24 * HOUR, 7 * DAY, async () => {
        const match = routeId.match(/^sg:bus:([^:]+):([12])$/);
        if (!match) throw new TransportDataError("Identifiant de ligne bus LTA invalide.");
        const serviceNo = decodeURIComponent(match[1]!);
        const [routes, stops] = await Promise.all([
          this.busRoutesForService(serviceNo, match[2]), this.busStops(),
        ]);
        return encodeIndex(busIndex(routeId, routes, stops));
      });
      return decodeIndex(result.value);
    }
    const result = await this.metadata.staleWhileRevalidate({
      territory: "sg", provider: "lta-datamall", kind: "journeyIndexes",
      source: `train-journey-index:${resource.id}:${routeId}:${mode}`, version: resourceVersion(resource),
    }, 6 * HOUR, 7 * DAY, async () => encodeIndex(await buildJourneyIndex(await this.trainFeed(), routeId)));
    const index = decodeIndex(result.value);
    if (index.metadata.timezone !== TIMEZONE) throw new TransportDataError("Le GTFS train LTA ne confirme pas le fuseau Asia/Singapore.");
    if (result.stale) index.sourceWarning = "La copie GTFS en cache est conservée pendant l’actualisation LTA.";
    return index;
  }

  async realtimeFeed(resource: CatalogResource): Promise<Uint8Array> {
    if (resource.url !== `${API}/GTFSRealtimeTrainTripUpdates` &&
      resource.url !== `${API}/GTFSRealTimeTrainServiceAlerts`) {
      throw new TransportDataError("Aucun flux temps réel bus Strætó ou LTA non reconnu n’est utilisé.");
    }
    const response = await this.apiJson<ODataPage<DownloadLink>>(new URL(resource.url).pathname.replace("/ltaodataservice/", "/"));
    const download = response.value?.[0];
    const link = download?.Link ?? download?.link;
    if (!link) throw new TransportDataError("DataMall n’a pas fourni le lien du flux temps réel train.");
    let url: URL;
    try { url = new URL(link); } catch { throw new TransportDataError("Le lien temps réel LTA est invalide."); }
    if (url.protocol !== "https:" || !/^[a-z0-9-]+\.s3\.ap-southeast-1\.amazonaws\.com$/i.test(url.hostname) ||
      url.username || url.password || url.port) throw new TransportDataError("Le stockage du flux temps réel LTA n’est pas autorisé.");
    const feed = await this.fetcher(url, { signal: AbortSignal.timeout(20_000), redirect: "error" })
      .catch(() => { throw new TransportDataError("Le flux temps réel train LTA n’a pas répondu."); });
    if (!feed.ok) { await feed.body?.cancel(); throw new TransportDataError(`Le flux temps réel train LTA est indisponible (HTTP ${feed.status}).`); }
    const length = Number(feed.headers.get("content-length"));
    if (Number.isFinite(length) && length > MAX_TRAIN_FEED_BYTES) {
      await feed.body?.cancel(); throw new TransportDataError("Le flux temps réel train LTA dépasse sa limite de taille.");
    }
    return boundedBytes(feed, MAX_TRAIN_FEED_BYTES, "Le flux temps réel train LTA");
  }

  async departures(line: TransportLine, index: JourneyIndex, origin: StopGroup, arrival: StopGroup,
    language: string, options: TransportTimeOptions = {}) {
    if (line.mode !== "bus" || line.resource.format !== "LTA Bus Routes") {
      throw new TransportDataError("Les trajets de train utilisent le GTFS LTA et ses mises à jour temps réel.");
    }
    const pairs = journeyPairs(index, new Set(origin.ids), new Set(arrival.ids));
    if (!pairs.length) return { content: language === "fr" ? "Aucun bus publié ne relie ces arrêts dans ce sens."
      : "No published bus route connects these stops in this direction.", source: line.source };
    const routeId = line.routeId;
    const serviceNo = routeId.match(/^sg:bus:([^:]+):/)?.[1] ? decodeURIComponent(routeId.match(/^sg:bus:([^:]+):/)![1]!) : "";
    if (!serviceNo) throw new TransportDataError("Identifiant de ligne bus LTA invalide.");
    const stopId = origin.ids[0]!;
    const now = Math.floor(this.now() / 1000), french = language === "fr";
    const directionRows = (await this.busRoutesForService(serviceNo, routeId.split(":").at(-1)))
      .sort((a, b) => Number(a.StopSequence) - Number(b.StopSequence));
    const routeRows = directionRows.filter(row => row.BusStopCode === stopId);
    const row = routeRows[0];
    const stop = index.stops.get(stopId);
    if (!row || !stop) throw new TransportDataError("LTA ne publie plus l’arrêt choisi dans cette direction.");
    const weekday = new Intl.DateTimeFormat("en", { timeZone: TIMEZONE, weekday: "short" }).format(new Date(now * 1000));
    const fields = weekday === "Sat" ? ["SAT_FirstBus", "SAT_LastBus"] :
      weekday === "Sun" ? ["SUN_FirstBus", "SUN_LastBus"] : ["WD_FirstBus", "WD_LastBus"];
    const day = localDate(now, TIMEZONE);
    const times: JourneyTime[] = [];
    for (const field of fields) {
      const raw = String(row[field as keyof BusRouteRow] ?? "").trim();
      if (!/^\d{4}$/.test(raw)) continue;
      const clock = `${raw.slice(0, 2)}:${raw.slice(2)}:00`;
      const at = scheduledEpoch(day, clock, TIMEZONE);
      if (at !== null && at >= Math.max(now, options.departureAfter ?? now)) {
        times.push({ tripId: `lta:${serviceNo}:${routeId}:${field}:${day}`, departureAt: at,
          arrivalAt: null, realtime: false, departureStopId: stopId, arrivalStopId: arrival.ids[0] });
      }
    }
    const serviceData = await this.busServices();
    const service = serviceData.find(item => item.ServiceNo === serviceNo && String(item.Direction) === routeId.split(":").at(-1));
    const response = await this.apiJson<BusArrivalResponse>(`/v3/BusArrival?BusStopCode=${encodeURIComponent(stopId)}&ServiceNo=${encodeURIComponent(serviceNo)}`);
    const live = (response.Services ?? []).filter(item => item.ServiceNo === serviceNo)
      .flatMap(item => [item.NextBus, item.NextBus2, item.NextBus3].filter((bus): bus is BusArrivalItem => !!bus))
      .flatMap((bus, index) => {
        if (bus.OriginCode !== directionRows[0]?.BusStopCode ||
          bus.DestinationCode !== directionRows.at(-1)?.BusStopCode) return [];
        const at = Date.parse(bus.EstimatedArrival ?? "") / 1000;
        if (!Number.isFinite(at) || at < now - 30 || at > now + 4 * 3600) return [];
        const monitored = Number(bus.Monitored) === 1;
        return [{ tripId: `lta-arrival:${serviceNo}:${stopId}:${index}:${at}`, departureAt: at, arrivalAt: null,
          realtime: monitored, departureStopId: stopId, arrivalStopId: arrival.ids[0] }];
      });
    const allTimes = [...times, ...live].sort((a, b) => a.departureAt - b.departureAt)
      .filter((item, i, values) => values.findIndex(other => Math.abs(other.departureAt - item.departureAt) < 60) === i)
      .slice(0, 6);
    const frequency = [service?.AM_Peak_Freq, service?.AM_Offpeak_Freq, service?.PM_Peak_Freq, service?.PM_Offpeak_Freq]
      .filter(Boolean).join(" · ");
    const note = french
      ? `LTA publie ici les premiers/derniers départs et une fréquence, pas l’horaire complet de chaque bus.${frequency ? ` Fréquences publiées (min) : ${frequency}.` : ""} Les arrivées consultées à l’arrêt sont marquées prévu ou temps réel selon LTA; aucune heure d’arrivée à destination n’est inventée.`
      : `LTA publishes the first/last departures and service frequency here, not a complete timetable for every bus.${frequency ? ` Published frequencies (min): ${frequency}.` : ""} Stop arrivals are marked scheduled or real-time according to LTA; no destination arrival time is invented.`;
    const source = { ...line.source, limitations: [note] };
    return { ...departureCards({ title: `Bus ${serviceNo}`, origin: origin.label, arrival: arrival.label,
      multiPlatform: false, stops: index.stops, times: allTimes, timezone: TIMEZONE, now, french,
      realtime: true, notes: [note], empty: french
        ? "Aucun premier/dernier départ ni bus annoncé prochainement par LTA pour cet arrêt."
        : "No first/last departure or upcoming bus is currently published by LTA for this stop." }), source };
  }
}
