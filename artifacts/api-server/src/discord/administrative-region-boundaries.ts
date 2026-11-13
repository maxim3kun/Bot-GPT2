import type { GeoJsonBoundary } from "./transport-regions.js";

const GEOB_BOUNDARY_API = "https://www.geoboundaries.org/api/current/gbOpen";
const MAX_METADATA_BYTES = 64 * 1024;
const MAX_GEOJSON_BYTES = 16 * 1024 * 1024;
const MAX_FEATURES = 1_000;
const MAX_VERTICES = 1_500_000;

const ISO_ALPHA3: Readonly<Record<string, string>> = {
  AL: "ALB", DZ: "DZA", AU: "AUS", AT: "AUT", BE: "BEL", BO: "BOL", BG: "BGR", CA: "CAN",
  CN: "CHN", HR: "HRV", CZ: "CZE", DK: "DNK", EG: "EGY", FI: "FIN", FR: "FRA", DE: "DEU",
  GR: "GRC", HU: "HUN", IT: "ITA", JP: "JPN", LA: "LAO", LU: "LUX", MT: "MLT", MA: "MAR",
  NL: "NLD", NZ: "NZL", PL: "POL", PT: "PRT", RS: "SRB", SK: "SVK", SI: "SVN", ES: "ESP",
  LK: "LKA", CH: "CHE", TH: "THA", TN: "TUN", TR: "TUR", UA: "UKR", GB: "GBR", US: "USA",
  IE: "IRL", NO: "NOR", IS: "ISL", SG: "SGP", LV: "LVA",
};

export interface AdministrativeRegionBoundary {
  code: string;
  name: string;
  boundary: GeoJsonBoundary;
}

export interface AdministrativeBoundarySet {
  countryCode: string;
  iso3: string;
  boundaryId: string;
  boundaryYear: string;
  canonicalName: string;
  license: string;
  sourceName: string;
  sourceUrl: string;
  regions: AdministrativeRegionBoundary[];
}

export type PreparedAdministrativeBoundary = (latitude: number, longitude: number) => boolean;

type GeoBoundaryMetadata = {
  boundaryID?: unknown;
  boundaryType?: unknown;
  boundaryYearRepresented?: unknown;
  boundaryCanonical?: unknown;
  boundaryLicense?: unknown;
  boundarySource?: unknown;
  boundarySourceURL?: unknown;
  simplifiedGeometryGeoJSON?: unknown;
};

type GeoJsonFeatureCollection = {
  type?: unknown;
  features?: unknown;
};

const boundaryCache = new Map<string, { expiresAt: number; value: AdministrativeBoundarySet }>();
const boundaryPending = new Map<string, Promise<AdministrativeBoundarySet>>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

async function readBoundedJson<T>(response: Response, maxBytes: number): Promise<T> {
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > maxBytes) throw new Error("Administrative boundary response exceeds its size limit");
  if (!response.body) {
    const text = await response.text();
    if (Buffer.byteLength(text) > maxBytes) throw new Error("Administrative boundary response exceeds its size limit");
    return JSON.parse(text) as T;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new Error("Administrative boundary response exceeds its size limit");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

function geoBoundary(value: unknown, vertexCount: { value: number }): GeoJsonBoundary | undefined {
  if (!isRecord(value) || (value.type !== "Polygon" && value.type !== "MultiPolygon") ||
    !Array.isArray(value.coordinates)) return undefined;
  const polygons = value.type === "Polygon" ? [value.coordinates] : value.coordinates;
  if (!polygons.length) return undefined;
  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || !polygon.length) return undefined;
    for (const ring of polygon) {
      if (!Array.isArray(ring) || ring.length < 4) return undefined;
      vertexCount.value += ring.length;
      if (vertexCount.value > MAX_VERTICES) return undefined;
      for (const point of ring) {
        if (!Array.isArray(point) || point.length < 2 || typeof point[0] !== "number" ||
          typeof point[1] !== "number" || !Number.isFinite(point[0]) || !Number.isFinite(point[1]) ||
          Math.abs(point[0]) > 180 || Math.abs(point[1]) > 90) return undefined;
      }
    }
  }
  return value as unknown as GeoJsonBoundary;
}

function prepareRing(value: number[][]) {
  let minLongitude = Infinity, maxLongitude = -Infinity, minLatitude = Infinity, maxLatitude = -Infinity;
  for (const point of value) {
    minLongitude = Math.min(minLongitude, point[0]!);
    maxLongitude = Math.max(maxLongitude, point[0]!);
    minLatitude = Math.min(minLatitude, point[1]!);
    maxLatitude = Math.max(maxLatitude, point[1]!);
  }
  return { points: value, minLongitude, maxLongitude, minLatitude, maxLatitude };
}

function insideRing(ring: ReturnType<typeof prepareRing>, latitude: number, longitude: number): boolean {
  if (longitude < ring.minLongitude || longitude > ring.maxLongitude ||
    latitude < ring.minLatitude || latitude > ring.maxLatitude) return false;
  let inside = false;
  for (let i = 0, j = ring.points.length - 1; i < ring.points.length; j = i++) {
    const [xi, yi] = ring.points[i]!, [xj, yj] = ring.points[j]!;
    const cross = (longitude - xi!) * (yj! - yi!) - (latitude - yi!) * (xj! - xi!);
    if (Math.abs(cross) < 1e-10 && longitude >= Math.min(xi!, xj!) && longitude <= Math.max(xi!, xj!) &&
      latitude >= Math.min(yi!, yj!) && latitude <= Math.max(yi!, yj!)) return true;
    if ((yi! > latitude) !== (yj! > latitude) &&
      longitude < (xj! - xi!) * (latitude - yi!) / (yj! - yi!) + xi!) inside = !inside;
  }
  return inside;
}

export function prepareAdministrativeBoundary(boundary: GeoJsonBoundary): PreparedAdministrativeBoundary {
  const polygons = boundary.type === "Polygon" ? [boundary.coordinates] : boundary.coordinates;
  const prepared = polygons.flatMap(polygon => {
    const [outer, ...holes] = polygon.map(prepareRing);
    return outer ? [{ outer, holes }] : [];
  });
  return (latitude, longitude) => prepared.some(polygon =>
    insideRing(polygon.outer, latitude, longitude) &&
    !polygon.holes.some(hole => insideRing(hole, latitude, longitude)));
}

function allowedGeoJsonUrl(value: unknown, iso3: string): URL {
  if (typeof value !== "string") throw new Error("Administrative boundary URL is missing");
  const url = new URL(value);
  const expectedFile = `geoBoundaries-${iso3}-ADM1_simplified.geojson`;
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash ||
    url.hostname !== "github.com" ||
    !url.pathname.startsWith(`/wmgeolab/geoBoundaries/raw/`) ||
    !url.pathname.includes(`/releaseData/gbOpen/${iso3}/ADM1/${expectedFile}`) || url.search) {
    throw new Error("Administrative boundary URL is not an approved GeoBoundaries file");
  }
  return url;
}

function validFinalGeoJsonUrl(value: string, iso3: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && !url.hash &&
      (url.hostname === "media.githubusercontent.com" || url.hostname === "raw.githubusercontent.com") &&
      url.pathname.includes(`/wmgeolab/geoBoundaries/`) &&
      url.pathname.includes(`/gbOpen/${iso3}/ADM1/`) &&
      url.pathname.endsWith(`geoBoundaries-${iso3}-ADM1_simplified.geojson`);
  } catch { return false; }
}

async function fetchBoundarySet(countryCode: string, fetcher: typeof fetch): Promise<AdministrativeBoundarySet> {
  const iso3 = ISO_ALPHA3[countryCode];
  if (!iso3) throw new Error("No ISO alpha-3 mapping is configured for this country");
  const metadataUrl = `${GEOB_BOUNDARY_API}/${iso3}/ADM1/`;
  const metadataResponse = await fetcher(metadataUrl, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!metadataResponse.ok) throw new Error(`GeoBoundaries metadata returned HTTP ${metadataResponse.status}`);
  const metadata = await readBoundedJson<GeoBoundaryMetadata>(metadataResponse, MAX_METADATA_BYTES);
  if (metadata.boundaryType !== "ADM1" || typeof metadata.boundaryID !== "string" ||
    typeof metadata.boundaryLicense !== "string" || !metadata.boundaryLicense.trim()) {
    throw new Error("GeoBoundaries did not return a licensed ADM1 boundary set");
  }
  const fileUrl = allowedGeoJsonUrl(metadata.simplifiedGeometryGeoJSON, iso3);
  const fileResponse = await fetcher(fileUrl.href, {
    headers: { accept: "application/geo+json, application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!fileResponse.ok) throw new Error(`GeoBoundaries geometry returned HTTP ${fileResponse.status}`);
  if (!validFinalGeoJsonUrl(fileResponse.url || fileUrl.href, iso3)) {
    throw new Error("GeoBoundaries geometry redirected to an unapproved host");
  }
  const geojson = await readBoundedJson<GeoJsonFeatureCollection>(fileResponse, MAX_GEOJSON_BYTES);
  if (geojson.type !== "FeatureCollection" || !Array.isArray(geojson.features) ||
    !geojson.features.length || geojson.features.length > MAX_FEATURES) {
    throw new Error("GeoBoundaries returned an invalid administrative feature collection");
  }
  const regions: AdministrativeRegionBoundary[] = [];
  const codes = new Set<string>(), names = new Set<string>();
  const vertexCount = { value: 0 };
  for (const raw of geojson.features) {
    if (!isRecord(raw) || !isRecord(raw.properties)) continue;
    const name = typeof raw.properties.shapeName === "string" ? raw.properties.shapeName.trim() : "";
    const code = typeof raw.properties.shapeISO === "string" && raw.properties.shapeISO.trim()
      ? raw.properties.shapeISO.trim()
      : typeof raw.properties.shapeID === "string" ? raw.properties.shapeID.trim() : "";
    const boundary = geoBoundary(raw.geometry, vertexCount);
    if (!name || !code || !boundary || codes.has(code)) continue;
    codes.add(code);
    const normalized = name.normalize("NFKC").toLowerCase();
    if (names.has(normalized)) continue;
    names.add(normalized);
    regions.push({ code, name, boundary });
  }
  if (!regions.length) throw new Error("GeoBoundaries contains no usable administrative regions");
  return {
    countryCode, iso3, boundaryId: metadata.boundaryID,
    boundaryYear: typeof metadata.boundaryYearRepresented === "string" ? metadata.boundaryYearRepresented : "",
    canonicalName: typeof metadata.boundaryCanonical === "string" ? metadata.boundaryCanonical : "administrative areas",
    license: metadata.boundaryLicense,
    sourceName: typeof metadata.boundarySource === "string" ? metadata.boundarySource : "GeoBoundaries",
    sourceUrl: typeof metadata.boundarySourceURL === "string" ? metadata.boundarySourceURL : "https://www.geoboundaries.org/",
    regions,
  };
}

/** Download only open GeoBoundaries ADM1 sets; cache one copy per country per process. */
export async function administrativeRegions(
  countryCode: string,
  fetcher: typeof fetch = fetch,
  now = Date.now,
): Promise<AdministrativeBoundarySet> {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) throw new Error("Invalid ISO alpha-2 country code");
  const cached = boundaryCache.get(code);
  if (cached && cached.expiresAt > now()) return structuredClone(cached.value);
  const pending = boundaryPending.get(code);
  if (pending) return structuredClone(await pending);
  const work = fetchBoundarySet(code, fetcher).then(value => {
    boundaryCache.set(code, { value, expiresAt: now() + 7 * 24 * 60 * 60_000 });
    while (boundaryCache.size > 4) boundaryCache.delete(boundaryCache.keys().next().value!);
    return value;
  }).finally(() => boundaryPending.delete(code));
  boundaryPending.set(code, work);
  return structuredClone(await work);
}

