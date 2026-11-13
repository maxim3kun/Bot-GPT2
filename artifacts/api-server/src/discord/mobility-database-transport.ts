import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { isStaticScheduleResource, type CatalogDataset, type CatalogResource, type StopCollection, type TransportLocation } from "./public-transport.js";
import { TransportMetadataCache } from "./transport-metadata-cache.js";
import { mobilityCountryCodeForTerritory, type TransportTerritory } from "./transport-provider.js";
import { scanRoutesAtStops, scanRows } from "./gtfs-journey.js";
import { parseGtfsStaticMetadata, routeTypeToMode } from "./gtfs-realtime.js";
import type { ReferenceRoute, ReferenceStop } from "./transport-reference-tables.js";
import { logger } from "../lib/logger.js";
import { administrativeRegions, type AdministrativeRegionBoundary } from "./administrative-region-boundaries.js";
import { scanRoutesInRegions } from "./gtfs-journey.js";
import { resourceVersion } from "./transport-metadata-cache.js";
import type { GeoJsonBoundary } from "./transport-regions.js";
import type { TransitMode } from "./transport-query.js";

const API = "https://api.mobilitydatabase.org";
const RESOURCE_PROVIDER = "mobilitydatabase";
const MAX_FEED_BYTES = 80 * 1024 * 1024;
const MAX_REALTIME_FEED_BYTES = 12 * 1024 * 1024;
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
  territory: "mobility", provider: "mobilitydatabase", kind: "mobilityCountryDirectory",
  source: "country-locations", version: "v2",
} as const;
const COUNTRY_COVERAGE_CACHE_KEY = {
  territory: "mobility", provider: "mobilitydatabase", kind: "mobilityCoverage",
  source: "verified-open-gtfs-routes-by-country", version: "v2",
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
  id?: unknown; data_type?: unknown; name?: unknown; feed_name?: unknown; provider?: unknown;
  status?: unknown; official?: unknown; entity_types?: unknown; feed_references?: unknown;
  source_info?: { license_id?: unknown; license_is_spdx?: unknown; license_url?: unknown;
    producer_url?: unknown; authentication_type?: unknown };
  locations?: Array<{ country_code?: unknown }>;
  bounding_box?: BoundingBox;
  latest_dataset?: MobilityDataset;
};
type TokenResponse = { access_token?: unknown; expiration_datetime_utc?: unknown };
export interface MobilityCountry { code: string; name: string }
export interface MobilityCountryCoverage {
  countries: Array<MobilityCountry & { covered: boolean; modes: TransitMode[]; routeCount: number }>;
  complete: boolean;
}
export interface MobilityRegionalIndex {
  boundaryId: string;
  incomplete: boolean;
  regions: Array<{ code: string; name: string; networkIds: string[] }>;
}
export type MobilityRegionIndexStatus = "building" | "ready" | "unavailable";
type MobilityLocation = {
  location_type?: unknown; name?: unknown; country_code?: unknown; country_name?: unknown;
};
type MobilityLocationPage = { total?: unknown; results?: unknown };
type OSMResult = {
  lat?: unknown; lon?: unknown; name?: unknown; display_name?: unknown; class?: unknown; category?: unknown; type?: unknown;
  address?: {
    country_code?: unknown; state?: unknown; county?: unknown; house_number?: unknown; road?: unknown;
  };
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

function safeMobilityRealtimeUrl(value: string): URL {
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const ipHostname = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1) : hostname;
  if (url.protocol !== "https:" || (url.port && url.port !== "443") ||
    url.username || url.password || url.hash || url.href.length > 2_048 ||
    !hostname || isIP(ipHostname) || hostname === "localhost" ||
    hostname.endsWith(".localhost") || hostname.endsWith(".local") ||
    hostname.endsWith(".internal") || hostname.endsWith(".test")) {
    throw new Error("Mobility Database returned an unsupported public GTFS-Realtime URL");
  }
  return url;
}

function mobilityRealtimeLink(staticFeedId: string, realtimeFeedId: string): string {
  return `mobilitydatabase-gtfs-rt:${encodeURIComponent(JSON.stringify([staticFeedId, realtimeFeedId]))}`;
}

function mobilityRealtimeFeedIds(resource: CatalogResource): [string, string] | undefined {
  const prefix = "mobilitydatabase-gtfs-rt:";
  if (!resource.type?.startsWith(prefix)) return undefined;
  try {
    const value: unknown = JSON.parse(decodeURIComponent(resource.type.slice(prefix.length)));
    if (!Array.isArray(value) || value.length !== 2 ||
      typeof value[0] !== "string" || !SAFE_FEED_ID.test(value[0]) ||
      typeof value[1] !== "string" || !SAFE_FEED_ID.test(value[1])) return undefined;
    return [value[0], value[1]];
  } catch { return undefined; }
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
  private readonly realtimeResourcesCache = new Map<string, { expiresAt: number; resources: CatalogResource[] }>();
  private readonly realtimeResourcesPending = new Map<string, Promise<CatalogResource[]>>();
  private readonly realtimeFiles = new Map<number, { expiresAt: number; bytes: Uint8Array }>();
  private readonly realtimeFilePending = new Map<number, Promise<Uint8Array>>();
  private readonly realtimeFailedUntil = new Map<number, number>();
  private readonly regionIndexStatuses = new Map<string, MobilityRegionIndexStatus>();
  private readonly addressCache = new Map<string, { expiresAt: number; value: TransportLocation[] }>();
  private readonly addressPending = new Map<string, Promise<TransportLocation[]>>();

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

  private async readBody(response: Response, maxBytes: number, timeoutMs: number): Promise<Uint8Array> {
    if (!response.body) throw new Error("Mobility Database response is empty");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    let timedOut = false;
    const reading = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > maxBytes) {
          await reader.cancel().catch(() => undefined);
          throw new Error("Mobility Database response is too large");
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      return bytes;
    })();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        void reader.cancel().catch(() => undefined);
        reject(new Error("Mobility Database response body timed out"));
      }, timeoutMs);
      timer.unref?.();
    });
    try { return await Promise.race([reading, timeout]); }
    finally {
      if (timer) clearTimeout(timer);
      if (timedOut) {
        await reader.cancel().catch(() => undefined);
        await reading.catch(() => undefined);
      }
      reader.releaseLock();
    }
  }

  private async json<T>(response: Response, timeoutMs = 5_000): Promise<T> {
    if (!response.ok) throw new Error(`Mobility Database returned HTTP ${response.status}`);
    const length = Number(response.headers.get("content-length"));
    if (Number.isFinite(length) && length > 4 * 1024 * 1024) throw new Error("Mobility Database response is too large");
    const text = new TextDecoder().decode(await this.readBody(response, 4 * 1024 * 1024, timeoutMs));
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

  private async apiJson<T>(url: string, timeoutMs = 5_000): Promise<T> {
    const token = await this.token();
    const response = await this.request(url, { headers: { authorization: `Bearer ${token}` } }, timeoutMs);
    return this.json<T>(response, timeoutMs);
  }

  async countries(): Promise<MobilityCountry[]> {
    return (await this.countryDirectory()).countries;
  }

  private async countryDirectory(): Promise<{ countries: MobilityCountry[]; complete: boolean }> {
    const cached = await this.metadata.staleWhileRevalidate<{ countries: MobilityCountry[]; complete: boolean }>(
      COUNTRY_LIST_CACHE_KEY, 24 * 60 * 60_000, 7 * 24 * 60 * 60_000,
      async () => {
        const token = await this.token();
        const unique = new Map<string, MobilityCountry>();
        let total = 0, complete = true, received = 0;
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
          if (offset === 0) total = page.total;
          else if (page.total !== total) complete = false;
          if (total > 1_000) complete = false;
          received += page.results.length;
          for (const item of page.results as MobilityLocation[]) {
            const code = typeof item.country_code === "string" ? item.country_code.trim().toUpperCase() : "";
            const name = typeof item.country_name === "string" ? item.country_name.trim()
              : typeof item.name === "string" ? item.name.trim() : "";
            if (item.location_type === "country" && /^[A-Z]{2}$/.test(code) && name && !unique.has(code)) {
              unique.set(code, { code, name });
            }
          }
          if (offset + page.results.length >= total) break;
          if (page.results.length < 100) { complete = false; break; }
        }
        if (received < total) complete = false;
        return {
          countries: [...unique.values()].sort((a, b) => a.name.localeCompare(b.name, "en")),
          complete,
        };
      });
    return cached.value;
  }

  /**
   * Public, shared coverage metadata. A cold cache starts the catalogue scan
   * in the background and returns no unverified countries to the menu.
   */
  async countryCoverage(): Promise<MobilityCountryCoverage> {
    const cached = await this.metadata.staleWhileRevalidate<MobilityCountryCoverage>(
      COUNTRY_COVERAGE_CACHE_KEY, 24 * 60 * 60_000, 7 * 24 * 60 * 60_000,
      async () => {
        const directory = await this.countryDirectory();
        const countries = directory.countries;
        let next = 0;
        const coverage = new Array<MobilityCountryCoverage["countries"][number]>(countries.length);
        // A route check downloads a real GTFS archive. Keep parallel downloads low
        // so a country-wide refresh cannot compete with interactive searches.
        const workers = Array.from({ length: Math.min(2, countries.length) }, async () => {
          while (true) {
            const index = next++;
            const country = countries[index];
            if (!country) return;
            try {
              const result = await this.countryRouteCoverage(country.code);
              coverage[index] = { code: country.code, name: country.name, covered: result.covered,
                modes: result.modes, routeCount: result.routeCount };
            } catch (error) {
              coverage[index] = { ...country, covered: false, modes: [], routeCount: 0 };
              logger.debug({ country: country.code, err: error }, "Mobility country route coverage unavailable");
            }
          }
        });
        await Promise.all(workers);
        return { countries: coverage, complete: directory.complete };
      }, undefined, { countries: [], complete: false });
    return cached.value;
  }

  private async countryRouteCoverage(countryCode: string): Promise<{
    covered: boolean; modes: TransitMode[]; routeCount: number;
  }> {
    const catalog = await this.catalogForCountry(countryCode);
    const candidates = catalog.flatMap(dataset => dataset.resources
      .filter(isStaticScheduleResource)
      .map(resource => ({ resource, official: /source officielle/i.test(dataset.title),
        size: Number(resource.metadata?.zippedFolderSizeMb) }))
    ).sort((a, b) => Number(b.official) - Number(a.official) ||
      (Number.isFinite(a.size) ? a.size : Number.MAX_SAFE_INTEGER) -
      (Number.isFinite(b.size) ? b.size : Number.MAX_SAFE_INTEGER))
      .slice(0, 2);

    const modes = new Set<TransitMode>();
    let routeCount = 0;
    for (const { resource } of candidates) {
      try {
        const routes = await this.referenceRoutes(resource);
        const usable = routes.filter(route => route.mode !== null);
        if (!usable.length) continue;
        routeCount += usable.length;
        for (const route of usable) modes.add(route.mode!);
      } catch {
        // A bad feed must not keep this country's other routes or countries
        // from being verified.
      }
    }
    return {
      covered: routeCount > 0 && modes.size > 0,
      modes: [...modes].sort(),
      routeCount,
    };
  }

  async municipalities(place: string, countryCode: string): Promise<TransportLocation[]> {
    const code = countryCode.trim().toUpperCase();
    const query = normalizePlace(place);
    if (!/^[A-Z]{2}$/.test(code) || query.length < 2 || query.length > 100) return [];
    const privateQuery = /\d/.test(place) ||
      /\b(?:street|road|avenue|rue|route|chemin|boulevard|lane|drive|square|platz|strasse|calle|avenida|rua)\b/i.test(query);
    const cacheKey = `${code}:${query}`;
    if (privateQuery) {
      const cached = this.addressCache.get(cacheKey);
      if (cached && cached.expiresAt > this.now()) return cached.value;
      const pending = this.addressPending.get(cacheKey);
      if (pending) return pending;
      const request = queueMobilityGeocode(() => this.fetchGeocodedPlaces(place, query, code));
      this.addressPending.set(cacheKey, request);
      try {
        const value = await request;
        this.addressCache.set(cacheKey, { expiresAt: this.now() + 5 * 60_000, value });
        return value;
      } finally {
        this.addressPending.delete(cacheKey);
      }
    }
    return this.metadata.get<TransportLocation[]>({
      territory: `mobility:${code}`, provider: "nominatim", kind: "locations",
      source: `settlements:${query}`, version: "mobility-country-geocoder-v2",
    }, 24 * 60 * 60_000, () => queueMobilityGeocode(() => this.fetchGeocodedPlaces(place, query, code)));
  }

  private async fetchGeocodedPlaces(place: string, query: string, code: string): Promise<TransportLocation[]> {
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
      const resultClass = result.class ?? result.category;
      const resultType = String(result.type ?? "");
      const isPlace = resultClass === "place" &&
        ["city", "town", "village", "municipality", "hamlet"].includes(resultType);
      const isExactBoundary = resultClass === "boundary" && resultType === "administrative" &&
        normalizePlace(String(result.name ?? "")) === query;
      const isStop = resultClass === "highway" && resultType === "bus_stop" ||
        resultClass === "amenity" && ["bus_station", "bus_stop"].includes(resultType) ||
        resultClass === "public_transport" && ["platform", "stop_position", "station"].includes(resultType) ||
        resultClass === "railway" && ["station", "halt", "tram_stop", "subway_entrance"].includes(resultType);
      const hasAddress = typeof result.address?.road === "string" &&
        (typeof result.address.house_number === "string" || resultType === "house" ||
          resultClass === "highway" && ["road", "residential", "service", "tertiary", "secondary", "primary"].includes(resultType));
      const isAddress = hasAddress || resultClass === "building" && resultType === "house";
      if ((!isPlace && !isExactBoundary && !isStop && !isAddress) ||
        String(result.address?.country_code ?? "").toUpperCase() !== code) return [];
      const latitude = Number(result.lat), longitude = Number(result.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return [];
      const road = typeof result.address?.road === "string" ? result.address.road.trim() : "";
      const number = typeof result.address?.house_number === "string" ? result.address.house_number.trim() : "";
      const fallbackName = isAddress ? [number, road].filter(Boolean).join(" ")
        : typeof result.display_name === "string" ? result.display_name.split(",")[0]?.trim() ?? "" : "";
      const name = typeof result.name === "string" && result.name.trim() ? result.name.trim() : fallbackName;
      if (!name) return [];
      const area = typeof result.address?.state === "string" ? result.address.state
        : typeof result.address?.county === "string" ? result.address.county : undefined;
      const displayName = typeof result.display_name === "string" ? result.display_name.trim() : "";
      const label = (isStop || isAddress) && displayName
        ? displayName.slice(0, 180) : [name, area, countryName].filter(Boolean).join(" · ");
      const id = `osm:mobility:${code}:${createHash("sha256")
        .update(`${normalizePlace(name)}:${latitude.toFixed(5)}:${longitude.toFixed(5)}`).digest("hex").slice(0, 16)}`;
      return [{
        id, name, label, ...(area ? { area } : {}), latitude, longitude,
        territory: `mobility:${code}` as TransportTerritory, mobilityCountryCode: code,
        ...((isStop || isAddress) ? { kind: "address" as const } : {}),
      }];
    });
    const exact = places.filter(location => normalizePlace(location.name) === query);
    const ordered = exact.length
      ? [...exact, ...places.filter(location => !exact.includes(location))]
      : places;
    return ordered.slice(0, 25);
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

  /** Country-wide candidate feeds are public metadata; schedules remain in the source archive. */
  async catalogForCountry(countryCode: string, territory: TransportTerritory = `mobility:${countryCode.toUpperCase()}`): Promise<CatalogDataset[]> {
    const code = countryCode.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) return [];
    const cached = await this.metadata.staleWhileRevalidate<CatalogDataset[]>({
      territory, provider: RESOURCE_PROVIDER, kind: "catalog",
      source: `country-feeds:${code}`, version: "mobility-country-open-gtfs-v2",
    }, CACHE_FRESH_MS, CACHE_RETAIN_MS, () => this.fetchCountryCatalog(code, territory));
    return cached.value;
  }

  private async fetchCountryCatalog(countryCode: string, territory: TransportTerritory): Promise<CatalogDataset[]> {
    const output: CatalogDataset[] = [];
    for (let offset = 0; offset < MAX_CATALOG_FEEDS; offset += PAGE_SIZE) {
      const url = new URL(`${API}/v1/gtfs_feeds`);
      url.searchParams.set("country_code", countryCode);
      url.searchParams.set("limit", String(PAGE_SIZE));
      url.searchParams.set("offset", String(offset));
      const page = await this.apiJson<unknown>(url.href);
      if (!Array.isArray(page)) throw new Error("Mobility Database feed list has an unexpected format");
      for (const item of page) {
        const dataset = this.toCatalogDataset(item as MobilityFeed, countryCode, territory);
        if (dataset) output.push(dataset);
      }
      if (page.length < PAGE_SIZE) break;
    }
    const seen = new Set<string>();
    return output.filter(dataset => {
      if (seen.has(dataset.id)) return false;
      seen.add(dataset.id); return true;
    });
  }

  async countryRegionalIndex(
    countryCode: string,
    mode: TransitMode,
    territory: TransportTerritory = `mobility:${countryCode.toUpperCase()}`,
    schedule: (refresh: () => void) => void = refresh => {
      const timer = setTimeout(refresh, 2_000);
      timer.unref?.();
    },
    regionNameFilter: (name: string) => boolean = () => true,
  ): Promise<MobilityRegionalIndex> {
    const code = countryCode.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) return { boundaryId: "", incomplete: true, regions: [] };
    const statusKey = `${territory}:${mode}`;
    let boundaries: Awaited<ReturnType<typeof administrativeRegions>>;
    try { boundaries = await administrativeRegions(code, this.fetcher, this.now); }
    catch {
      this.regionIndexStatuses.set(statusKey, "unavailable");
      return { boundaryId: "", incomplete: true, regions: [] };
    }
    const key = {
      territory, provider: RESOURCE_PROVIDER, kind: "regionIndex" as const,
      source: `administrative-routes:${code}:${mode}`, version: boundaries.boundaryId,
    };
    const empty: MobilityRegionalIndex = { boundaryId: boundaries.boundaryId, incomplete: true, regions: [] };
    if (this.regionIndexStatuses.get(statusKey) === "building") return empty;
    const scopedBoundaries = boundaries.regions.filter(region => regionNameFilter(region.name));
    const load = async () => {
      this.regionIndexStatuses.set(statusKey, "building");
      try {
        const result = await this.buildCountryRegionalIndex(code, territory, mode, scopedBoundaries, boundaries.boundaryId);
        this.regionIndexStatuses.set(statusKey, result.regions.length || !result.incomplete ? "ready" : "unavailable");
        return result;
      } catch (error) {
        this.regionIndexStatuses.set(statusKey, "unavailable");
        throw error;
      }
    };
    const result = await this.metadata.staleWhileRevalidate<MobilityRegionalIndex>(
      key, 12 * 60 * 60_000, 7 * 24 * 60 * 60_000, load, schedule, empty,
    );
    if (result.stale && !result.value.regions.length) this.regionIndexStatuses.set(statusKey, "building");
    else this.regionIndexStatuses.set(statusKey, result.value.regions.length || !result.value.incomplete ? "ready" : "unavailable");
    return result.value;
  }

  regionIndexStatus(countryCode: string, mode: TransitMode, territory = `mobility:${countryCode.toUpperCase()}`) {
    return this.regionIndexStatuses.get(`${territory}:${mode}`) ?? "building";
  }

  private async buildCountryRegionalIndex(
    countryCode: string,
    territory: TransportTerritory,
    mode: TransitMode,
    boundaries: AdministrativeRegionBoundary[],
    boundaryId: string,
  ): Promise<MobilityRegionalIndex> {
    const catalog = await this.catalogForCountry(countryCode, territory);
    const regions = new Map(boundaries.map(region => [region.code, { code: region.code, name: region.name, networkIds: [] as string[] }]));
    let failedFeeds = 0;
    for (const dataset of catalog) {
      for (const resource of dataset.resources.filter(isStaticScheduleResource)) {
        try {
          const routesByRegion = await this.routesInRegions(resource, boundaries);
          for (const [regionCode, routes] of routesByRegion) {
            const selected = routes.filter(route => route.mode === mode);
            if (!selected.length) continue;
            const region = regions.get(regionCode);
            if (!region) continue;
            if (!region.networkIds.includes(dataset.id)) region.networkIds.push(dataset.id);
            const cachedRoutes = selected.map(route => ({
              routeId: route.routeId, shortName: route.shortName, longName: route.longName,
              mode: route.mode, stopIds: [],
            }));
            await this.metadata.get({
              territory, provider: RESOURCE_PROVIDER, kind: "routes",
              source: `region-routes:${countryCode}:${resource.id}:${regionCode}:${mode}`,
              version: `${resourceVersion(resource)}:${boundaryId}`,
            }, 7 * 24 * 60 * 60_000, async () => cachedRoutes);
          }
        } catch (error) {
          failedFeeds++;
          logger.debug({ territory, resourceId: resource.id, err: error }, "Mobility regional route scan failed");
        }
      }
    }
    return {
      boundaryId,
      incomplete: failedFeeds > 0 || catalog.length >= MAX_CATALOG_FEEDS,
      regions: [...regions.values()].filter(region => region.networkIds.length)
        .map(region => ({ ...region, networkIds: [...new Set(region.networkIds)] }))
        .sort((a, b) => a.name.localeCompare(b.name, "fr")),
    };
  }

  async routesInRegions(
    resource: CatalogResource,
    regions: Array<Pick<AdministrativeRegionBoundary, "code" | "boundary">>,
  ): Promise<Map<string, Awaited<ReturnType<typeof scanRoutesInRegions>>[number]["routes"]>> {
    const routes = await scanRoutesInRegions(await this.staticFeed(resource), regions);
    return new Map(routes.map(area => [area.code, area.routes]));
  }

  async routesForRegion(
    resource: CatalogResource,
    countryCode: string,
    region: { code: string; boundary: GeoJsonBoundary },
    mode: TransitMode,
    territory: TransportTerritory,
    boundaryId: string,
  ): Promise<ReferenceRoute[]> {
    const source = `region-routes:${countryCode}:${resource.id}:${region.code}:${mode}`;
    return this.metadata.get({
      territory, provider: RESOURCE_PROVIDER, kind: "routes", source,
      version: `${resourceVersion(resource)}:${boundaryId}`,
    }, 7 * 24 * 60 * 60_000, async () => {
      const routes = await this.routesInRegions(resource, [region]);
      return (routes.get(region.code) ?? []).filter(route => route.mode === mode)
        .map(route => ({ routeId: route.routeId, shortName: route.shortName, longName: route.longName,
          mode: route.mode, stopIds: [] }));
    });
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
      feed.data_type !== undefined && feed.data_type !== "gtfs" ||
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
      is_available: true, metadata: {
        mobilityFeedId: id, mobilityCountryCode: countryCode,
        ...(typeof size === "number" ? { zippedFolderSizeMb: size } : {}),
      },
      ...(typeof latest.downloaded_at === "string" ? { updated: latest.downloaded_at } : {}),
    };
    return {
      id: `${RESOURCE_PROVIDER}:${id}`,
      title: `${title} · ${official ? "source officielle" : "Mobility Database"}`,
      slug: id, page_url: "https://mobilitydatabase.org/", type: "public-transit",
      licence: license, resources: [resource], territory, bounds,
      limitations: [
        `Catalogue Mobility Database · licence ${license}.`,
        "GTFS statique; mode et desserte à confirmer dans le flux sélectionné.",
        "Le temps réel n’est utilisé que si Mobility Database le relie explicitement au GTFS sélectionné.",
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

  /** Only use trip-update feeds explicitly associated with this selected static GTFS feed. */
  async realtimeResources(staticResource: CatalogResource, selectedStaticFeedId?: string): Promise<CatalogResource[]> {
    if (!isMobilityDatabaseResource(staticResource)) return [];
    const resourceFeedId = staticResource.metadata?.mobilityFeedId;
    if (selectedStaticFeedId && typeof resourceFeedId === "string" && resourceFeedId !== selectedStaticFeedId) return [];
    const feedId = selectedStaticFeedId ?? resourceFeedId;
    if (typeof feedId !== "string" || !SAFE_FEED_ID.test(feedId)) return [];
    const cached = this.realtimeResourcesCache.get(feedId);
    if (cached && cached.expiresAt > this.now()) return cached.resources;
    const pending = this.realtimeResourcesPending.get(feedId);
    if (pending) return pending;

    const work = (async () => {
      const response = await this.apiJson<unknown>(
        `${API}/v1/gtfs_feeds/${encodeURIComponent(feedId)}/gtfs_rt_feeds`, 2_000);
      if (!Array.isArray(response)) throw new Error("Mobility Database returned an invalid GTFS-Realtime list");
      const resources = response.flatMap((entry: MobilityFeed) => {
        const realtimeId = typeof entry.id === "string" ? entry.id : "";
        const references = Array.isArray(entry.feed_references) ? entry.feed_references : [];
        const entityTypes = Array.isArray(entry.entity_types) ? entry.entity_types : [];
        const auth = entry.source_info?.authentication_type;
        const producerUrl = entry.source_info?.producer_url;
        if (!SAFE_FEED_ID.test(realtimeId) || entry.data_type !== "gtfs_rt" ||
          String(entry.status).toLowerCase() !== "active" ||
          !references.includes(feedId) || !entityTypes.includes("tu") ||
          (auth !== undefined && auth !== null && auth !== 0 && auth !== "0") ||
          typeof producerUrl !== "string") return [];
        let url: URL;
        try { url = safeMobilityRealtimeUrl(producerUrl); } catch { return []; }
        const id = resourceId(`mobilitydatabase-realtime:${realtimeId}`);
        return [{
          id, provider: RESOURCE_PROVIDER, title: "GTFS-Realtime · Mobility Database",
          format: "GTFS-RT", type: mobilityRealtimeLink(feedId, realtimeId), url: url.href, original_url: url.href,
          is_available: true,
        } satisfies CatalogResource];
      }).slice(0, 2);
      this.realtimeResourcesCache.set(feedId, { resources, expiresAt: this.now() + 15 * 60_000 });
      return resources;
    })().finally(() => this.realtimeResourcesPending.delete(feedId));
    this.realtimeResourcesPending.set(feedId, work);
    return work;
  }

  async realtimeFeed(resource: CatalogResource): Promise<Uint8Array> {
    const [staticFeedId, realtimeFeedId] = mobilityRealtimeFeedIds(resource) ?? [];
    if (!isMobilityDatabaseResource(resource) || resource.format !== "GTFS-RT" ||
      !staticFeedId || !realtimeFeedId) {
      throw new Error("Unsupported Mobility Database GTFS-Realtime resource");
    }
    const cached = this.realtimeFiles.get(resource.id);
    if (cached && cached.expiresAt > this.now()) return cached.bytes;
    const failedUntil = this.realtimeFailedUntil.get(resource.id) ?? 0;
    if (failedUntil > this.now()) throw new Error("Mobility Database GTFS-Realtime feed is temporarily unavailable");
    if (failedUntil) this.realtimeFailedUntil.delete(resource.id);
    const pending = this.realtimeFilePending.get(resource.id);
    if (pending) return pending;
    const work = (async () => {
      const url = safeMobilityRealtimeUrl(resource.url);
      const response = await this.request(url.href, { method: "GET" }, 3_000);
      if (!response.ok) throw new Error(`Mobility Database GTFS-Realtime returned HTTP ${response.status}`);
      const length = Number(response.headers.get("content-length"));
      if (Number.isFinite(length) && length > MAX_REALTIME_FEED_BYTES)
        throw new Error("Mobility Database GTFS-Realtime feed exceeds its size limit");
      const bytes = await this.readBody(response, MAX_REALTIME_FEED_BYTES, 2_500);
      if (!bytes.length) throw new Error("Mobility Database GTFS-Realtime response is empty");
      for (const [id, entry] of this.realtimeFiles) if (entry.expiresAt <= this.now()) this.realtimeFiles.delete(id);
      while (this.realtimeFiles.size >= 16) this.realtimeFiles.delete(this.realtimeFiles.keys().next().value!);
      this.realtimeFiles.set(resource.id, { bytes, expiresAt: this.now() + 12_000 });
      return bytes;
    })().catch(error => {
      for (const [id, until] of this.realtimeFailedUntil) if (until <= this.now()) this.realtimeFailedUntil.delete(id);
      while (this.realtimeFailedUntil.size >= 16)
        this.realtimeFailedUntil.delete(this.realtimeFailedUntil.keys().next().value!);
      this.realtimeFailedUntil.set(resource.id, this.now() + 10_000);
      throw error;
    }).finally(() => this.realtimeFilePending.delete(resource.id));
    this.realtimeFilePending.set(resource.id, work);
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
    const feedId = typeof resource.metadata?.mobilityFeedId === "string"
      ? resource.metadata.mobilityFeedId : String(resource.id);
    const countryCode = typeof resource.metadata?.mobilityCountryCode === "string"
      ? resource.metadata.mobilityCountryCode.toUpperCase() : "ZZ";
    const territory = `mobility:${countryCode}` as TransportTerritory;
    return this.metadata.get({
      territory, provider: RESOURCE_PROVIDER, kind: "routes",
      source: `feed-routes:${feedId}`, version: resourceVersion(resource),
    }, 7 * 24 * 60 * 60_000, async () => {
      const metadata = parseGtfsStaticMetadata(await this.staticFeed(resource));
      const scheduledServices = new Set(metadata.calendars.keys());
      for (const key of metadata.calendarExceptions.keys()) scheduledServices.add(key.slice(key.indexOf(":") + 1));
      const scheduledRoutes = new Set([...metadata.trips.values()]
        .filter(trip => scheduledServices.has(trip.serviceId)).map(trip => trip.routeId));
      return [...metadata.routes].flatMap(([routeId, route]) => {
        const mode = routeTypeToMode(route.type);
        return mode && scheduledRoutes.has(routeId)
          ? [{ routeId, shortName: route.shortName, longName: route.longName, mode, stopIds: [] }]
          : [];
      });
    });
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

}
