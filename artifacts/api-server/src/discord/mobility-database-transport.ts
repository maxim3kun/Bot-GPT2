import { createHash } from "node:crypto";
import type { CatalogDataset, CatalogResource, StopCollection, TransportLocation } from "./public-transport.js";
import { TransportMetadataCache } from "./transport-metadata-cache.js";
import { mobilityCountryCodeForTerritory, type TransportTerritory } from "./transport-provider.js";
import { scanRoutesAtStops, scanRows } from "./gtfs-journey.js";
import { parseGtfsStaticMetadata, routeTypeToMode } from "./gtfs-realtime.js";
import type { ReferenceRoute, ReferenceStop } from "./transport-reference-tables.js";
import { logger } from "../lib/logger.js";

const API = "https://api.mobilitydatabase.org";
const RESOURCE_PROVIDER = "mobilitydatabase";
const MAX_FEED_BYTES = 80 * 1024 * 1024;
const PAGE_SIZE = 250;
const MAX_CATALOG_FEEDS = 500;
const MAX_VISIBLE_FEEDS = 20;
const CACHE_FRESH_MS = 6 * 60 * 60_000;
const CACHE_RETAIN_MS = 3 * 24 * 60 * 60_000;
const SAFE_FEED_ID = /^[a-z0-9][a-z0-9._:-]{0,119}$/i;
const COUNTRY_CODES: Partial<Record<TransportTerritory, string>> = {
  fr: "FR", qc: "CA", en: "GB", ie: "IE", lu: "LU", ch: "CH", no: "NO",
  is: "IS", sg: "SG", lv: "LV", cz: "CZ", pt: "PT", au: "AU", ua: "UA",
};
const COUNTRY_LIST_CACHE_KEY = {
  territory: "mobility", provider: "mobilitydatabase", kind: "mobilityCountries",
  source: "country-locations", version: "v1",
} as const;
const OPEN_LICENSES = new Set([
  "0bsd", "cc0-1.0", "cc-by-3.0", "cc-by-4.0", "cc-by-sa-3.0", "cc-by-sa-4.0",
  "odbl-1.0", "mit", "apache-2.0", "ogl-uk-3.0",
]);

type BoundingBox = { minimum_latitude?: unknown; maximum_latitude?: unknown;
  minimum_longitude?: unknown; maximum_longitude?: unknown };
type MobilityDataset = {
  id?: unknown; hosted_url?: unknown; downloaded_at?: unknown; service_date_range_end?: unknown;
  zipped_folder_size_mb?: unknown; bounding_box?: BoundingBox;
};
type MobilityFeed = {
  id?: unknown; name?: unknown; feed_name?: unknown; provider?: unknown; status?: unknown; official?: unknown;
  source_info?: { license_id?: unknown; license_is_spdx?: unknown; license_url?: unknown };
  locations?: Array<{ country_code?: unknown }>;
  bounding_box?: BoundingBox;
  latest_dataset?: MobilityDataset;
};
type TokenResponse = { access_token?: unknown; expiration_datetime_utc?: unknown };
export interface MobilityCountry { code: string; name: string }
type MobilityLocation = {
  location_type?: unknown; name?: unknown; country_code?: unknown; country_name?: unknown;
};
type MobilityLocationPage = { total?: unknown; results?: unknown };
type OSMResult = {
  lat?: unknown; lon?: unknown; name?: unknown; display_name?: unknown; class?: unknown; type?: unknown;
  address?: { country_code?: unknown; state?: unknown; county?: unknown };
};

let geocodeQueue: Promise<unknown> = Promise.resolve();
let lastGeocodeAt = 0;
function queueMobilityGeocode<T>(load: () => Promise<T>): Promise<T> {
  const request = geocodeQueue.catch(() => undefined).then(async () => {
    const delay = Math.max(0, 1_000 - (Date.now() - lastGeocodeAt));
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    lastGeocodeAt = Date.now();
    return load();
  });
  geocodeQueue = request.catch(() => undefined);
  return request;
}
function normalizePlace(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("en").trim();
}

export function isMobilityDatabaseResource(resource: CatalogResource): boolean {
  return resource.provider === RESOURCE_PROVIDER;
}

/** MobilityData-hosted archives only; never fetch the producer URL or an arbitrary redirect. */
export function safeMobilityDatasetUrl(value: string): URL {
  const url = new URL(value);
  const filePathParts = url.pathname.split("/").filter(Boolean);
  const isGoogleDataset = url.hostname === "storage.googleapis.com" &&
    (url.pathname.startsWith("/mobilitydata-datasets-prod/") ||
      url.pathname.startsWith("/storage/v1/b/mdb-latest/o/")) &&
    [...url.searchParams.keys()].every(key => key === "alt") &&
    (!url.searchParams.has("alt") || url.searchParams.get("alt") === "media");
  const isMobilityFilesDataset = url.hostname === "files.mobilitydatabase.org" &&
    filePathParts.length === 3 && filePathParts.every(part => /^[a-z0-9._-]+$/i.test(part)) &&
    /\.zip$/i.test(filePathParts[2] ?? "") && url.search === "";
  if (url.protocol !== "https:" || url.port || url.username || url.password || url.hash ||
    !(isGoogleDataset || isMobilityFilesDataset)) {
    throw new Error("Mobility Database returned an unsupported hosted dataset URL");
  }
  return url;
}

function numericBounds(value: BoundingBox | undefined): CatalogDataset["bounds"] | undefined {
  const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : undefined;
  const south = number(value?.minimum_latitude), north = number(value?.maximum_latitude);
  const west = number(value?.minimum_longitude), east = number(value?.maximum_longitude);
  if (south === undefined || north === undefined || west === undefined || east === undefined ||
    south < -90 || north > 90 ||
    west < -180 || east > 180 || south > north || west > east) return undefined;
  return [west, south, east, north];
}

function boxIntersects(a: NonNullable<CatalogDataset["bounds"]>, b: NonNullable<CatalogDataset["bounds"]>) {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

function licenseId(feed: MobilityFeed): string | undefined {
  const value = typeof feed.source_info?.license_id === "string"
    ? feed.source_info.license_id.trim().toLowerCase() : "";
  return feed.source_info?.license_is_spdx === true && OPEN_LICENSES.has(value) ? value : undefined;
}

function resourceId(id: string): number {
  return -1 - createHash("sha256").update(`mobilitydatabase:${id}`).digest().readUIntBE(0, 6);
}

export class MobilityDatabaseTransportClient {
  private accessToken?: { value: string; expiresAt: number };
  private tokenPending?: Promise<string>;
  private readonly files = new Map<number, { expiresAt: number; bytes: Uint8Array }>();
  private readonly filePending = new Map<number, Promise<Uint8Array>>();

  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly now = Date.now,
    readonly metadata = new TransportMetadataCache(),
    private readonly refreshToken: () => string | undefined = () => process.env.MOBILITY_DATABASE_REFRESH_TOKEN,
  ) {}

  private async request(url: string, init: RequestInit, timeoutMs = 5_000): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    timer.unref?.();
    try { return await this.fetcher(url, { redirect: "error", ...init, signal: controller.signal }); }
    catch { throw new Error("Mobility Database request failed or timed out"); }
    finally { clearTimeout(timer); }
  }

  private async json<T>(response: Response): Promise<T> {
    if (!response.ok) throw new Error(`Mobility Database returned HTTP ${response.status}`);
    const length = Number(response.headers.get("content-length"));
    if (Number.isFinite(length) && length > 4 * 1024 * 1024) throw new Error("Mobility Database response is too large");
    const text = await response.text();
    if (Buffer.byteLength(text) > 4 * 1024 * 1024) throw new Error("Mobility Database response is too large");
    try { return JSON.parse(text) as T; } catch { throw new Error("Mobility Database returned invalid JSON"); }
  }

  private token(): Promise<string> {
    if (this.accessToken && this.accessToken.expiresAt > this.now() + 60_000) return Promise.resolve(this.accessToken.value);
    if (this.tokenPending) return this.tokenPending;
    const refresh = this.refreshToken()?.trim();
    if (!refresh) return Promise.reject(new Error("Mobility Database OAuth is not configured"));
    const pending = (async () => {
      const response = await this.request(`${API}/v1/tokens/access`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      const body = await this.json<TokenResponse>(response);
      if (typeof body.access_token !== "string" || !body.access_token) {
        throw new Error("Mobility Database did not return an access token");
      }
      const publishedExpiry = typeof body.expiration_datetime_utc === "string"
        ? Date.parse(body.expiration_datetime_utc) : NaN;
      const expiresAt = Number.isFinite(publishedExpiry) ? publishedExpiry : this.now() + 55 * 60_000;
      this.accessToken = { value: body.access_token, expiresAt };
      return body.access_token;
    })().finally(() => { this.tokenPending = undefined; });
    this.tokenPending = pending;
    return pending;
  }

  private async apiJson<T>(url: string): Promise<T> {
    const token = await this.token();
    const response = await this.request(url, { headers: { authorization: `Bearer ${token}` } });
    return this.json<T>(response);
  }

  async countries(): Promise<MobilityCountry[]> {
    const cached = await this.metadata.staleWhileRevalidate<MobilityCountry[]>(
      COUNTRY_LIST_CACHE_KEY, 24 * 60 * 60_000, 7 * 24 * 60 * 60_000,
      async () => {
        const token = await this.token();
        const unique = new Map<string, MobilityCountry>();
        let total = 0;
        for (let offset = 0; offset < 1_000 && offset < Math.max(total, 100); offset += 100) {
          const url = new URL("/v1/locations", API);
          url.searchParams.set("location_type", "country");
          url.searchParams.set("limit", "100");
          url.searchParams.set("offset", String(offset));
          const response = await this.request(url.href, { headers: { authorization: `Bearer ${token}` } });
          const page = await this.json<MobilityLocationPage>(response);
          if (!Array.isArray(page.results) || typeof page.total !== "number" ||
            !Number.isSafeInteger(page.total) || page.total < 0) {
            throw new Error("Mobility Database returned an invalid country list");
          }
          total = Math.min(page.total, 1_000);
          for (const item of page.results as MobilityLocation[]) {
            const code = typeof item.country_code === "string" ? item.country_code.trim().toUpperCase() : "";
            const name = typeof item.country_name === "string" ? item.country_name.trim()
              : typeof item.name === "string" ? item.name.trim() : "";
            if (item.location_type === "country" && /^[A-Z]{2}$/.test(code) && name && !unique.has(code)) {
              unique.set(code, { code, name });
            }
          }
          if (page.results.length < 100 || offset + 100 >= total) break;
        }
        return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name, "en"));
      });
    return cached.value;
  }

  async municipalities(place: string, countryCode: string): Promise<TransportLocation[]> {
    const code = countryCode.trim().toUpperCase();
    const query = normalizePlace(place);
    if (!/^[A-Z]{2}$/.test(code) || query.length < 2 || query.length > 100) return [];
    return this.metadata.get<TransportLocation[]>({
      territory: `mobility:${code}`, provider: "nominatim", kind: "locations",
      source: `settlements:${query}`, version: "mobility-country-geocoder-v1",
    }, 24 * 60 * 60_000, () => queueMobilityGeocode(async () => {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", place.trim());
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("limit", "15");
      url.searchParams.set("countrycodes", code.toLowerCase());
      let response: Response;
      try {
        response = await this.request(url.href, {
          headers: { accept: "application/json", "user-agent": "MaximeGPT public transport/1.0" },
        }, 8_000);
      } catch {
        throw new Error("OpenStreetMap geocoding failed or timed out");
      }
      let body: unknown;
      try { body = await this.json<unknown>(response); }
      catch { throw new Error("OpenStreetMap returned an invalid location response"); }
      if (!Array.isArray(body)) throw new Error("OpenStreetMap returned an invalid location list");
      const countryName = new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
      const places = (body as OSMResult[]).flatMap(result => {
        const resultClass = result.class;
        const isPlace = resultClass === "place" &&
          ["city", "town", "village", "municipality", "hamlet"].includes(String(result.type ?? ""));
        const isExactBoundary = result.type === "administrative" &&
          normalizePlace(String(result.name ?? "")) === query;
        if ((!isPlace && !isExactBoundary) ||
          String(result.address?.country_code ?? "").toUpperCase() !== code) return [];
        const latitude = Number(result.lat), longitude = Number(result.lon);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
          Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return [];
        const name = typeof result.name === "string" ? result.name.trim()
          : typeof result.display_name === "string" ? result.display_name.split(",")[0]?.trim() ?? "" : "";
        if (!name) return [];
        const area = typeof result.address?.state === "string" ? result.address.state
          : typeof result.address?.county === "string" ? result.address.county : undefined;
        const id = `osm:mobility:${code}:${createHash("sha256")
          .update(`${normalizePlace(name)}:${latitude.toFixed(5)}:${longitude.toFixed(5)}`).digest("hex").slice(0, 16)}`;
        return [{
          id, name, label: [name, area, countryName].filter(Boolean).join(" · "),
          ...(area ? { area } : {}), latitude, longitude, territory: `mobility:${code}` as TransportTerritory,
          mobilityCountryCode: code,
        }];
      });
      const exact = places.filter(location => normalizePlace(location.name) === query);
      return (exact.length ? exact : places).slice(0, 25);
    }));
  }

  /** Return usable, licensed feeds whose published geographic bounds overlap the chosen town. */
  async catalogForLocation(city: TransportLocation, budgetMs = 350): Promise<CatalogDataset[]> {
    const countryCode = city.mobilityCountryCode?.toUpperCase() ??
      mobilityCountryCodeForTerritory(city.territory) ?? COUNTRY_CODES[city.territory ?? "fr"];
    if (!countryCode || !this.refreshToken()?.trim() ||
      !Number.isFinite(city.latitude) || !Number.isFinite(city.longitude)) return [];
    const latCell = Math.floor(city.latitude * 10) / 10;
    const lonCell = Math.floor(city.longitude * 10) / 10;
    const source = `active:${countryCode}:${latCell.toFixed(1)}:${lonCell.toFixed(1)}`;
    const work = this.metadata.staleWhileRevalidate<CatalogDataset[]>({
      territory: city.territory ?? "fr", provider: RESOURCE_PROVIDER, kind: "catalog",
      source, version: "mobility-gtfs-catalog-v2",
    }, CACHE_FRESH_MS, CACHE_RETAIN_MS, () => this.fetchCatalog(countryCode, city.territory ?? "fr", latCell, lonCell))
      .then(result => result.value)
      .catch(error => {
        // Do not log request URLs or response bodies. The OAuth value is never part of this context.
        logger.debug({ territory: city.territory ?? "fr" }, "Mobility Database catalog unavailable; existing transport sources remain active");
        return [] as CatalogDataset[];
      });
    if (budgetMs <= 0) return [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<null>(resolve => {
      timer = setTimeout(() => resolve(null), budgetMs);
      timer.unref?.();
    });
    const result = await Promise.race([work, timeout]);
    if (timer) clearTimeout(timer);
    if (!result) return [];
    const reach = 0.06;
    const lonReach = Math.min(0.6, reach / Math.max(0.2, Math.cos(city.latitude * Math.PI / 180)));
    const local: NonNullable<CatalogDataset["bounds"]> = [
      city.longitude - lonReach, city.latitude - reach, city.longitude + lonReach, city.latitude + reach,
    ];
    return result.filter(dataset => dataset.bounds && boxIntersects(dataset.bounds, local))
      .sort((a, b) => Number(!/source officielle/i.test(a.title)) - Number(!/source officielle/i.test(b.title)) ||
        a.title.localeCompare(b.title, "fr", { numeric: true }))
      .slice(0, MAX_VISIBLE_FEEDS);
  }

  private async fetchCatalog(countryCode: string, territory: TransportTerritory,
    latCell: number, lonCell: number): Promise<CatalogDataset[]> {
    const south = latCell - 0.06, north = latCell + 0.16;
    const west = lonCell - 0.06, east = lonCell + 0.16;
    const output: CatalogDataset[] = [];
    for (let offset = 0; offset < MAX_CATALOG_FEEDS; offset += PAGE_SIZE) {
      const url = new URL(`${API}/v1/gtfs_feeds`);
      url.searchParams.set("country_code", countryCode);
      url.searchParams.set("dataset_latitudes", `${south.toFixed(4)},${north.toFixed(4)}`);
      url.searchParams.set("dataset_longitudes", `${west.toFixed(4)},${east.toFixed(4)}`);
      url.searchParams.set("bounding_filter_method", "partially_enclosed");
      url.searchParams.set("limit", String(PAGE_SIZE));
      url.searchParams.set("offset", String(offset));
      const page = await this.apiJson<unknown>(url.href);
      if (!Array.isArray(page)) throw new Error("Mobility Database feed list has an unexpected format");
      for (const item of page) {
        const dataset = this.toCatalogDataset(item as MobilityFeed, countryCode, territory);
        if (dataset) output.push(dataset);
      }
      if (page.length < PAGE_SIZE || output.length >= MAX_CATALOG_FEEDS) break;
    }
    return [...new Map(output.map(dataset => [dataset.id, dataset])).values()];
  }

  private toCatalogDataset(feed: MobilityFeed, countryCode: string, territory: TransportTerritory): CatalogDataset | null {
    const id = typeof feed.id === "string" ? feed.id : "";
    const latest = feed.latest_dataset;
    const bounds = numericBounds(latest?.bounding_box ?? feed.bounding_box);
    const license = licenseId(feed);
    const locations = Array.isArray(feed.locations) ? feed.locations : [];
    const size = latest?.zipped_folder_size_mb;
    if (!SAFE_FEED_ID.test(id) || String(feed.status).toLowerCase() !== "active" ||
      !latest || typeof latest.hosted_url !== "string" || !bounds || !license ||
      size !== undefined && (typeof size !== "number" || !Number.isFinite(size) || size <= 0 || size > 80) ||
      locations.length && !locations.some(location => location.country_code === countryCode)) return null;
    let hostedUrl: URL;
    try { hostedUrl = safeMobilityDatasetUrl(latest.hosted_url); } catch { return null; }
    const title = typeof feed.provider === "string" && feed.provider.trim()
      ? feed.provider.trim().slice(0, 120)
      : typeof feed.feed_name === "string" && feed.feed_name.trim() ? feed.feed_name.trim().slice(0, 120) : id;
    const official = feed.official === true;
    const resource: CatalogResource = {
      id: resourceId(id), provider: RESOURCE_PROVIDER, title: "GTFS · Mobility Database",
      format: "GTFS", type: "static_schedule", url: hostedUrl.href, original_url: hostedUrl.href,
      is_available: true, ...(typeof latest.downloaded_at === "string" ? { updated: latest.downloaded_at } : {}),
    };
    return {
      id: `${RESOURCE_PROVIDER}:${id}`,
      title: `${title} · ${official ? "source officielle" : "Mobility Database"}`,
      slug: id, page_url: "https://mobilitydatabase.org/", type: "public-transit",
      licence: license, resources: [resource], territory, bounds,
      limitations: [
        `Catalogue Mobility Database · licence ${license}.`,
        "GTFS statique; mode et desserte à confirmer dans le flux sélectionné.",
        "Aucun temps réel n’est annoncé par cette entrée de catalogue.",
      ],
    };
  }

  async staticFeed(resource: CatalogResource): Promise<Uint8Array> {
    if (!isMobilityDatabaseResource(resource)) throw new Error("Unsupported Mobility Database resource");
    const cached = this.files.get(resource.id);
    if (cached && cached.expiresAt > this.now()) return cached.bytes;
    const pending = this.filePending.get(resource.id);
    if (pending) return pending;
    const work = this.downloadHostedArchive(resource.url).then(bytes => {
      for (const [id, entry] of this.files) if (entry.expiresAt <= this.now()) this.files.delete(id);
      while (this.files.size >= 1) this.files.delete(this.files.keys().next().value!);
      this.files.set(resource.id, { bytes, expiresAt: this.now() + 15 * 60_000 });
      return bytes;
    }).finally(() => this.filePending.delete(resource.id));
    this.filePending.set(resource.id, work);
    return work;
  }

  private async downloadHostedArchive(initial: string): Promise<Uint8Array> {
    let current = safeMobilityDatasetUrl(initial);
    for (let redirects = 0; redirects <= 3; redirects++) {
      const response = await this.request(current.href, { redirect: "manual" }, 15_000);
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location || redirects === 3) throw new Error("Mobility Database dataset redirect is invalid");
        try { current = safeMobilityDatasetUrl(new URL(location, current).href); }
        catch { throw new Error("Mobility Database dataset redirect is not an approved hosted URL"); }
        continue;
      }
      if (!response.ok) throw new Error(`Mobility Database dataset returned HTTP ${response.status}`);
      const size = Number(response.headers.get("content-length"));
      if (Number.isFinite(size) && size > MAX_FEED_BYTES) throw new Error("Mobility Database GTFS archive exceeds its size limit");
      if (!response.body) throw new Error("Mobility Database dataset response is empty");
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.length;
          if (total > MAX_FEED_BYTES) {
            await reader.cancel().catch(() => undefined);
            throw new Error("Mobility Database GTFS archive exceeds its size limit");
          }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      if (!bytes.length) throw new Error("Mobility Database dataset response is empty");
      return bytes;
    }
    throw new Error("Mobility Database dataset redirect limit exceeded");
  }

  async nearbyStopsForResources(latitude: number, longitude: number, resources: CatalogResource[]): Promise<StopCollection> {
    const features: NonNullable<StopCollection["features"]> = [];
    const radiusMeters = 8_000;
    for (const resource of resources.slice(0, 1)) {
      const rows: Array<{ id: string; name: string; latitude: number; longitude: number; type: number }> = [];
      await scanRows(await this.staticFeed(resource), "stops.txt", row => {
        if (rows.length >= 60_000 || !row.stop_id) return;
        const lat = Number(row.stop_lat), lon = Number(row.stop_lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
        const type = Number(row.location_type || 0);
        const dLat = (lat - latitude) * Math.PI / 180, dLon = (lon - longitude) * Math.PI / 180;
        const haversine = 2 * 6_371_000 * Math.asin(Math.sqrt(
          Math.sin(dLat / 2) ** 2 + Math.cos(latitude * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
          Math.sin(dLon / 2) ** 2));
        if (haversine <= radiusMeters) rows.push({ id: row.stop_id, name: row.stop_name || row.stop_id, latitude: lat, longitude: lon, type });
      });
      for (const stop of rows) features.push({ properties: { resource_id: resource.id, stop_id: stop.id,
        stop_name: stop.name, location_type: stop.type } });
    }
    return { features };
  }

  async referenceRoutes(resource: CatalogResource): Promise<ReferenceRoute[]> {
    const metadata = parseGtfsStaticMetadata(await this.staticFeed(resource));
    return [...metadata.routes].map(([routeId, route]) => ({
      routeId, shortName: route.shortName, longName: route.longName,
      mode: routeTypeToMode(route.type), stopIds: [],
    }));
  }

  async referenceStops(resource: CatalogResource): Promise<ReferenceStop[]> {
    const stops: ReferenceStop[] = [];
    await scanRows(await this.staticFeed(resource), "stops.txt", row => {
      if (stops.length >= 60_000 || !row.stop_id) return;
      const latitude = Number(row.stop_lat), longitude = Number(row.stop_lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;
      stops.push({ id: row.stop_id, name: row.stop_name || row.stop_id,
        parent: row.parent_station || "", latitude, longitude, type: Number(row.location_type || 0) });
    });
    if (!stops.length) throw new Error("Mobility Database GTFS contains no usable stops");
    return stops;
  }

  async discoverRoutesAtStops(resource: CatalogResource, stopIds: ReadonlySet<string>, _mode: "bus" | "metro" | "tram" | "rail",
    requestedLine = "") {
    return scanRoutesAtStops(await this.staticFeed(resource), stopIds, requestedLine);
  }

  async realtimeFeed(): Promise<Uint8Array> {
    throw new Error("Mobility Database catalog entries are not validated real-time feeds");
  }
}
