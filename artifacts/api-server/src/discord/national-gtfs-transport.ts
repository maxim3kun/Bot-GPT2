import { createHash } from "node:crypto";
import { deflateSync, inflateSync } from "node:zlib";
import type { CatalogDataset, CatalogResource, StopCollection, TransportLocation } from "./public-transport.js";
import { normalizeTransitText, routeMatchesRequested } from "./transport-query.js";
import { selectiveGtfs, type GtfsSelection } from "./gtfs-selective.js";
import { GtfsRangeArchive } from "./gtfs-range.js";
import { TransportMetadataCache, resourceVersion } from "./transport-metadata-cache.js";
import { TransportDataError } from "./transport-data-error.js";
import { inBounds, type Bounds } from "./quebec-sources.js";
import { referenceTable, type ReferenceRoute, type ReferenceStop } from "./transport-reference-tables.js";
import type { TransportProvider, TransportTerritory } from "./transport-provider.js";
import type { TransitMode } from "./transport-query.js";
import { routeTypeToMode, type GtfsRouteAtStops } from "./gtfs-realtime.js";
import { localDate } from "./gtfs-realtime.js";
import { buildJourneyIndex, type JourneyIndex } from "./gtfs-journey.js";
import type { TransportRegion, GeoJsonBoundary } from "./transport-regions.js";
import { irelandCountyFromSearch, irelandCountyByCode } from "./ireland-regions.js";

type IrelandPackage = {
  success?: boolean;
  result?: {
    title?: string; name?: string; license_id?: string; license_title?: string; metadata_modified?: string;
    url?: string; resources?: Array<{ name?: string; format?: string; url?: string; last_modified?: string }>;
  };
};
type LuxembourgDataset = {
  title?: string; license?: string; page?: string; resources?: Array<{ title?: string; url?: string; filesize?: number }>;
};
type GeocodeResult = { lat?: string; lon?: string; name?: string; display_name?: string; class?: string; type?: string;
  category?: string; addresstype?: string; osm_type?: string; osm_id?: number; geojson?: unknown;
  address?: { county?: string; state?: string; region?: string; country_code?: string; city?: string; town?: string; village?: string } };
type NationalConfig = {
  territory: "ie" | "lu" | "ch" | "is"; provider: "nta" | "atp" | "odmch" | "straeto"; timezone: string; title: string; page: string;
  licence: string; bounds: Bounds; resourceName: string; feedHost: string; feedPathPrefix: string;
  limitations: string[];
};

const CONFIG: Record<"ie" | "lu" | "ch" | "is", NationalConfig> = {
  ie: {
    territory: "ie", provider: "nta", timezone: "Europe/Dublin", title: "National Transport Authority · Irlande",
    page: "https://data.gov.ie/dataset/nta-gtfs", licence: "CC BY 4.0", bounds: [-11.2, 51.2, -5.2, 55.6],
    resourceName: "GTFS", feedHost: "www.transportforireland.ie", feedPathPrefix: "/transitData/Data/GTFS_All.zip",
    limitations: ["Horaires GTFS théoriques uniquement; le flux temps réel NTA n’est pas utilisé.",
      "La couverture se limite aux lignes et arrêts publiés dans le GTFS national."],
  },
  lu: {
    territory: "lu", provider: "atp", timezone: "Europe/Luxembourg",
    title: "Administration des transports publics · Luxembourg",
    page: "https://data.public.lu/fr/datasets/horaires-et-arrets-des-transport-publics-gtfs/",
    licence: "CC BY", bounds: [5.7, 49.4, 6.6, 50.2],
    resourceName: "GTFS hebdomadaire", feedHost: "download.data.public.lu",
    feedPathPrefix: "/resources/horaires-et-arrets-des-transport-publics-gtfs/",
    limitations: ["Horaires GTFS théoriques uniquement; aucun flux temps réel n’est intégré.",
      "La couverture se limite aux lignes et arrêts publiés dans le GTFS national."],
  },
  ch: {
    territory: "ch", provider: "odmch", timezone: "Europe/Zurich",
    title: "Horaire national · Open Data Mobilité Suisse",
    page: "https://data.opentransportdata.swiss/dataset/timetable-2026-gtfs2020",
    licence: "Conditions d’utilisation Open Data Mobilité Suisse (citation de la source requise)",
    bounds: [5.8, 45.7, 10.6, 47.9],
    resourceName: "GTFS 2026", feedHost: "data.opentransportdata.swiss",
    feedPathPrefix: "/dataset/3d2c18f9-9ef1-463f-a249-5c67604efd74/resource/",
    limitations: ["Horaires GTFS théoriques uniquement; aucun flux temps réel n’est utilisé.",
      "La couverture est celle des lignes et arrêts publiés dans l’horaire national 2026; le flux est actualisé deux fois par semaine."],
  },
  is: {
    territory: "is", provider: "straeto", timezone: "Atlantic/Reykjavik",
    title: "Strætó · autobus d’Islande", page: "https://www.straeto.is/en/about-straeto/open-data",
    licence: "Licence non précisée sur la page open data Strætó",
    bounds: [-25, 63, -13, 67.5], resourceName: "GTFS",
    feedHost: "opendata.straeto.is", feedPathPrefix: "/data/gtfs/gtfs.zip",
    limitations: ["Horaires théoriques GTFS Strætó uniquement; aucun temps réel islandais n’est utilisé.",
      "La couverture se limite aux bus, arrêts et horaires présents dans le flux Strætó."],
  },
};
const idFor = (territory: TransportTerritory, source: string) =>
  -1 - createHash("sha256").update(`${territory}:${source}`).digest().readUIntBE(0, 6);
type PackedNationalJourney = { payload: string };

function packNationalJourney(index: JourneyIndex): PackedNationalJourney {
  const payload = deflateSync(Buffer.from(JSON.stringify({
    routeId: index.routeId, sourceWarning: index.sourceWarning,
    metadata: { routes: [...index.metadata.routes], trips: [...index.metadata.trips],
      calendars: [...index.metadata.calendars], calendarExceptions: [...index.metadata.calendarExceptions],
      timezone: index.metadata.timezone },
    visits: [...index.visits], stops: [...index.stops],
    frequencies: index.frequencies ? [...index.frequencies] : [],
  }))).toString("base64");
  if (payload.length > 3_800_000) throw new TransportDataError("L’horaire GTFS national dépasse la taille maximale du cache réutilisable.");
  return { payload };
}

function unpackNationalJourney(value: PackedNationalJourney): JourneyIndex {
  try {
    const dto = JSON.parse(inflateSync(Buffer.from(value.payload, "base64"),
      { maxOutputLength: 32 * 1024 * 1024 }).toString("utf8"));
    const metadata = dto.metadata;
    return { routeId: dto.routeId, metadata: {
      routes: new Map(metadata.routes), trips: new Map(metadata.trips), calendars: new Map(metadata.calendars),
      calendarExceptions: new Map(metadata.calendarExceptions), timezone: metadata.timezone,
    }, visits: new Map(dto.visits), stops: new Map(dto.stops), connectionsUnavailable: true,
    frequencies: new Map(dto.frequencies ?? []),
    ...(typeof dto.sourceWarning === "string" ? { sourceWarning: dto.sourceWarning } : {}) };
  } catch { throw new TransportDataError("Le cache GTFS national du trajet est illisible."); }
}

let geocodeQueue: Promise<unknown> = Promise.resolve();
let lastGeocodeAt = 0;
function queueGeocode<T>(load: () => Promise<T>): Promise<T> {
  const request = geocodeQueue.catch(() => undefined).then(async () => {
    const delay = Math.max(0, 1_000 - (Date.now() - lastGeocodeAt));
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    lastGeocodeAt = Date.now();
    return load();
  });
  geocodeQueue = request.catch(() => undefined);
  return request;
}

function scheduleMetadataRefresh(refresh: () => void) {
  const timer = setTimeout(refresh, 2_000);
  timer.unref?.();
}

function validBoundary(value: unknown): value is GeoJsonBoundary {
  if (!value || typeof value !== "object") return false;
  const geometry = value as { type?: unknown; coordinates?: unknown };
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] :
    geometry.type === "MultiPolygon" ? geometry.coordinates : null;
  if (!Array.isArray(polygons) || polygons.length > 10_000) return false;
  let points = 0;
  return polygons.every(polygon => Array.isArray(polygon) && polygon.length > 0 &&
    polygon.every(ring => Array.isArray(ring) && ring.length >= 4 && ring.every(point => {
      points++;
      return points <= 200_000 && Array.isArray(point) && point.length >= 2 &&
        Number.isFinite(point[0]) && Number.isFinite(point[1]) &&
        Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90;
    })));
}

type PreparedRing = { points: number[][]; minX: number; maxX: number; minY: number; maxY: number };
function prepareRing(points: number[][]): PreparedRing {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point[0]!); maxX = Math.max(maxX, point[0]!);
    minY = Math.min(minY, point[1]!); maxY = Math.max(maxY, point[1]!);
  }
  return { points, minX, maxX, minY, maxY };
}
function insideRing(ring: PreparedRing, longitude: number, latitude: number): boolean {
  if (longitude < ring.minX || longitude > ring.maxX || latitude < ring.minY || latitude > ring.maxY) return false;
  let inside = false;
  const points = ring.points;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i]!, [xj, yj] = points[j]!;
    const cross = (longitude - xi!) * (yj! - yi!) - (latitude - yi!) * (xj! - xi!);
    if (Math.abs(cross) < 1e-10 && longitude >= Math.min(xi!, xj!) && longitude <= Math.max(xi!, xj!) &&
      latitude >= Math.min(yi!, yj!) && latitude <= Math.max(yi!, yj!)) return true;
    if ((yi! > latitude) !== (yj! > latitude) &&
      longitude < (xj! - xi!) * (latitude - yi!) / (yj! - yi!) + xi!) inside = !inside;
  }
  return inside;
}

type PreparedPolygon = { outer: PreparedRing; holes: PreparedRing[] };
function prepareBoundary(boundary: GeoJsonBoundary): PreparedPolygon[] {
  const polygons = boundary.type === "Polygon" ? [boundary.coordinates] : boundary.coordinates;
  return polygons.flatMap(polygon => {
    const [outer, ...holes] = polygon.map(prepareRing);
    return outer ? [{ outer, holes }] : [];
  });
}
function insideBoundary(polygons: PreparedPolygon[], latitude: number, longitude: number): boolean {
  return polygons.some(polygon => insideRing(polygon.outer, longitude, latitude) &&
    !polygon.holes.some(hole => insideRing(hole, longitude, latitude)));
}

/** GeoJSON boundaries are used only to scope public stops; no centroid approximation. */
export function boundaryContains(boundary: GeoJsonBoundary, latitude: number, longitude: number): boolean {
  return insideBoundary(prepareBoundary(boundary), latitude, longitude);
}

async function boundedJson<T>(response: Response, maximumBytes: number): Promise<T> {
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > maximumBytes) {
    await response.body?.cancel();
    throw new TransportDataError("La limite de taille des limites administratives est dépassée.");
  }
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    if (Buffer.byteLength(text) > maximumBytes) throw new TransportDataError("La limite de taille des limites administratives est dépassée.");
    try { return JSON.parse(text) as T; }
    catch { throw new TransportDataError("La géométrie administrative est illisible."); }
  }
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel();
        throw new TransportDataError("La limite de taille des limites administratives est dépassée.");
      }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks, total).toString("utf8")) as T; }
  catch { throw new TransportDataError("La géométrie administrative est illisible."); }
}

/** National static GTFS sources only. ZIP entries are read with bounded HTTP ranges;
 * no national archive, trip, calendar or stop-time data is written to MongoDB. */
export class NationalGtfsTransportClient implements TransportProvider {
  readonly metadata: TransportMetadataCache;
  private readonly config: NationalConfig;

  constructor(readonly territory: "ie" | "lu" | "ch" | "is", private readonly fetcher: typeof fetch = fetch,
    private readonly now: () => number = Date.now, metadata?: TransportMetadataCache) {
    this.config = CONFIG[territory];
    this.metadata = metadata ?? new TransportMetadataCache(undefined, now);
  }

  private async json<T>(url: string, maximum = 2 * 1024 * 1024): Promise<T> {
    const response = await this.fetcher(url, {
      headers: { accept: "application/json", "user-agent": "MaximeGPT public transport/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new TransportDataError(`Le catalogue ${this.config.title} est indisponible (HTTP ${response.status}).`);
    const length = Number(response.headers.get("content-length"));
    if (Number.isFinite(length) && length > maximum) {
      await response.body?.cancel();
      throw new TransportDataError("Le catalogue national dépasse sa limite de taille.");
    }
    const body = await response.text();
    if (Buffer.byteLength(body) > maximum) throw new TransportDataError("Le catalogue national dépasse sa limite de taille.");
    try { return JSON.parse(body) as T; }
    catch { throw new TransportDataError("Le catalogue national est illisible."); }
  }

  private async html(url: string, maximum = 2 * 1024 * 1024): Promise<string> {
    const response = await this.fetcher(url, {
      headers: { accept: "text/html", "user-agent": "MaximeGPT public transport/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new TransportDataError(`Le catalogue ${this.config.title} est indisponible (HTTP ${response.status}).`);
    const length = Number(response.headers.get("content-length"));
    if (Number.isFinite(length) && length > maximum) {
      await response.body?.cancel();
      throw new TransportDataError("Le catalogue national dépasse sa limite de taille.");
    }
    const body = await response.text();
    if (Buffer.byteLength(body) > maximum) throw new TransportDataError("Le catalogue national dépasse sa limite de taille.");
    return body;
  }

  private safeFeedUrl(value: string): URL {
    let url: URL;
    try { url = new URL(value); } catch { throw new TransportDataError("L’adresse du flux GTFS national est invalide."); }
    if (url.protocol !== "https:" || url.hostname !== this.config.feedHost || url.username || url.password ||
      url.port || !(this.territory === "ie" || this.territory === "is"
        ? url.pathname === this.config.feedPathPrefix
        : this.territory === "ch"
          ? url.pathname.startsWith(this.config.feedPathPrefix) &&
            /\/download\/gtfs_fp2026_[\d-]+\.zip$/i.test(url.pathname)
          : url.pathname.startsWith(this.config.feedPathPrefix))) {
      throw new TransportDataError("Le catalogue national a publié une adresse de flux non autorisée.");
    }
    return url;
  }

  private async rangeResponse(resource: CatalogResource, range: string, validator?: Record<string, string>) {
    const url = this.safeFeedUrl(resource.url);
    const headers = { accept: "application/zip", "user-agent": "MaximeGPT public transport/1.0",
      range, ...validator };
    let response = await this.fetcher(url.href, {
      headers,
      signal: AbortSignal.timeout(90_000), redirect: "manual",
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get("location");
      let target: URL | undefined;
      try { if (location) target = new URL(location, url); } catch { /* Reject malformed redirects below. */ }
      const resourceId = url.pathname.match(/\/resource\/([a-f\d-]{36})\/download\//i)?.[1]?.toLowerCase();
      const signedSwissDownload = this.territory === "ch" && target?.protocol === "https:" &&
        /^[a-z\d-]+\.eu\.r2\.cloudflarestorage\.com$/i.test(target.hostname) &&
        !target.username && !target.password && !target.port && !!resourceId &&
        target.pathname.includes(`/resources/${resourceId}/`);
      if (signedSwissDownload) {
        response = await this.fetcher(target!.href, {
          headers, signal: AbortSignal.timeout(90_000), redirect: "manual",
        });
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          await response.body?.cancel();
          throw new TransportDataError("Le stockage du flux GTFS suisse a redirigé vers une adresse non autorisée.");
        }
      } else if (!target || this.safeFeedUrl(target.href).href !== url.href) {
        throw new TransportDataError("Le flux GTFS national a redirigé vers une adresse non autorisée.");
      } else {
        throw new TransportDataError("Le flux GTFS national redirige au lieu de répondre aux requêtes par plages.");
      }
    }
    const modified = response.headers.get("last-modified");
    if (modified && Number.isFinite(Date.parse(modified))) resource.updated = modified;
    return response;
  }

  private async probe(resource: CatalogResource): Promise<void> {
    const response = await this.rangeResponse(resource, "bytes=-1");
    if (response.status !== 206 || !/^bytes \d+-\d+\/\d+$/.test(response.headers.get("content-range") ?? "")) {
      await response.body?.cancel();
      throw new TransportDataError("Le flux GTFS national ne prend pas en charge la lecture bornée par plages.");
    }
    const reader = response.body?.getReader();
    if (!reader) throw new TransportDataError("Le flux GTFS national est vide.");
    try {
      const { done, value } = await reader.read();
      if (done || !value?.length || value.length > 1) throw new TransportDataError("La validation du flux GTFS national a échoué.");
    } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
  }

  private async loadCatalog(): Promise<CatalogDataset[]> {
    let resource: CatalogResource;
    let title = this.config.title;
    let licence = this.config.licence;
    let updated: string | undefined;
    if (this.territory === "ie") {
      const data = await this.json<IrelandPackage>("https://data.gov.ie/api/3/action/package_show?id=nta-gtfs");
      const entry = data.success && data.result;
      if (!entry || !Array.isArray(entry.resources) ||
        !/CC-BY-4\.0/i.test(`${entry.license_id ?? ""} ${entry.license_title ?? ""}`)) {
        throw new TransportDataError("La source NTA ne confirme pas actuellement la licence CC BY 4.0.");
      }
      const feed = entry.resources.find(item => item.name?.trim().toLowerCase() === this.config.resourceName.toLowerCase() &&
        /^(?:csv\.zip|zip)$/i.test(item.format ?? ""));
      if (!feed?.url) throw new TransportDataError("Le flux GTFS statique NTA n’est pas publié dans le catalogue.");
      const url = this.safeFeedUrl(feed.url).href;
      updated = feed.last_modified || entry.metadata_modified;
      resource = { id: idFor(this.territory, url), title: "GTFS national NTA", format: "GTFS", url,
        original_url: url, is_available: true, ...(updated ? { updated } : {}) };
      title = entry.title || title;
      licence = "CC BY 4.0";
    } else if (this.territory === "lu") {
      const data = await this.json<LuxembourgDataset>(
        "https://data.public.lu/api/1/datasets/horaires-et-arrets-des-transport-publics-gtfs/");
      if (!Array.isArray(data.resources) || !/^cc-by$/i.test(data.license ?? "")) {
        throw new TransportDataError("La source luxembourgeoise ne confirme pas actuellement sa licence CC BY.");
      }
      const feed = data.resources.find(item => item.url && /\.zip(?:\?|$)/i.test(item.url) &&
        /^gtfs-/i.test(item.title ?? ""));
      if (!feed?.url) throw new TransportDataError("Le flux GTFS hebdomadaire luxembourgeois est indisponible.");
      const url = this.safeFeedUrl(feed.url).href;
      resource = { id: idFor(this.territory, url), title: feed.title || this.config.resourceName, format: "GTFS",
        url, original_url: url, is_available: true };
      title = data.title || title;
      licence = "CC BY";
    } else if (this.territory === "ch") {
      const html = await this.html(this.config.page);
      const candidates = [...html.matchAll(/href=["'](https:\/\/data\.opentransportdata\.swiss\/dataset\/3d2c18f9-9ef1-463f-a249-5c67604efd74\/resource\/[a-f\d-]{36}\/download\/gtfs_fp2026_([\d-]+)\.zip)["']/gi)]
        .map(match => ({ url: match[1]!, version: match[2]!.replaceAll("-", "") }))
        .sort((a, b) => b.version.localeCompare(a.version));
      const feed = candidates[0];
      if (!feed) throw new TransportDataError("Le flux GTFS national suisse n’est pas publié dans le catalogue.");
      const url = this.safeFeedUrl(feed.url).href;
      updated = feed.version;
      resource = { id: idFor(this.territory, url), title: `GTFS national 2026 · ${feed.version}`,
        format: "GTFS", url, original_url: url, is_available: true, updated };
    } else {
      const url = this.safeFeedUrl(`https://${this.config.feedHost}${this.config.feedPathPrefix}`).href;
      resource = { id: idFor(this.territory, url), title: this.config.resourceName, format: "GTFS",
        url, original_url: url, is_available: true };
    }
    await this.probe(resource);
    return [{
      id: `${this.territory}:national-gtfs`, title, slug: `${this.territory}-national-gtfs`,
      page_url: this.config.page, type: "public-transit", licence, resources: [resource],
      territory: this.territory, bounds: this.config.bounds, limitations: this.config.limitations,
      publisher: this.config.provider === "nta" ? "National Transport Authority" :
        this.config.provider === "atp" ? "Administration des transports publics" :
          this.config.provider === "odmch" ? "Open Data Mobilité Suisse" : "Strætó",
    }];
  }

  async getCatalog(): Promise<CatalogDataset[]> {
    const result = await this.metadata.staleWhileRevalidate<CatalogDataset[]>({
      territory: this.territory, provider: this.config.provider, kind: "catalog",
      source: `${this.config.provider}:national-static-gtfs`, version: "catalog-v1",
    }, 60 * 60_000, 7 * 24 * 60 * 60_000, () => this.loadCatalog());
    return result.value;
  }

  private async geocode(place: string): Promise<TransportLocation[]> {
    const query = normalizeTransitText(place);
    if (query.length < 2 || query.length > 100) return [];
    return this.metadata.get<TransportLocation[]>({
      territory: this.territory, provider: "nominatim", kind: "locations",
      source: `settlements:${query}`, version: "nominatim-settlements-v1",
    }, 24 * 60 * 60_000, () => queueGeocode(async () => {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", place);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("limit", "15");
      url.searchParams.set("countrycodes", this.territory);
      const response = await this.fetcher(url.href, {
        headers: { accept: "application/json", "user-agent": "MaximeGPT public transport/1.0" },
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) throw new TransportDataError("Le géocodage OpenStreetMap est temporairement indisponible.");
      if (Number(response.headers.get("content-length")) > 1024 * 1024) {
        await response.body?.cancel();
        throw new TransportDataError("La réponse de géocodage dépasse sa limite de taille.");
      }
      const body = await response.text();
      if (Buffer.byteLength(body) > 1024 * 1024) throw new TransportDataError("La réponse de géocodage dépasse sa limite de taille.");
      let results: GeocodeResult[];
      try { results = JSON.parse(body) as GeocodeResult[]; }
      catch { throw new TransportDataError("La réponse de géocodage est illisible."); }
      if (!Array.isArray(results)) throw new TransportDataError("La réponse de géocodage est invalide.");
      const places = results.flatMap(result => {
        const normalizedName = normalizeTransitText(result.name ?? "");
        const resultClass = result.class ?? result.category;
        const place = resultClass === "place" &&
          ["city", "town", "village", "municipality", "hamlet"].includes(result.type ?? "");
        // Nominatim sometimes represents major cities as administrative boundary
        // relations rather than `place=city` nodes (e.g. Dublin and Luxembourg).
        const cityBoundary = resultClass === "boundary" && result.type === "administrative" && normalizedName === query;
        if (!place && !cityBoundary) return [];
        const latitude = Number(result.lat), longitude = Number(result.lon);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
          !inBounds(this.config.bounds, latitude, longitude)) return [];
        const name = result.name?.trim() || result.display_name?.split(",")[0]?.trim() || "";
        if (!name) return [];
        const county = result.address?.county || result.address?.state;
        const id = `osm:${this.territory}:${result.type}:${createHash("sha256")
          .update(`${normalizeTransitText(name)}:${latitude.toFixed(5)}:${longitude.toFixed(5)}`).digest("hex").slice(0, 16)}`;
        const countryName = this.territory === "ie" ? "Irlande" : this.territory === "lu" ? "Luxembourg" :
          this.territory === "ch" ? "Suisse" : "Islande";
        return [{ id, name, label: [name, county, countryName]
          .filter(Boolean).join(" · "), latitude, longitude, territory: this.territory }];
      });
      const exact = places.filter(location => normalizeTransitText(location.name) === query);
      return (exact.length ? exact : places).slice(0, 25);
    }));
  }

  municipalities(place: string): Promise<TransportLocation[]> { return this.geocode(place); }

  private async routeTable(resource: CatalogResource): Promise<ReferenceRoute[]> {
    const result = await this.metadata.staleWhileRevalidate<ReferenceRoute[]>({
      territory: this.territory, provider: this.config.provider, kind: "routes",
      source: `routes:${resource.id}`, version: resourceVersion(resource),
    }, 6 * 60 * 60_000, 7 * 24 * 60 * 60_000, async () => {
      const request = (range: string, validator?: Record<string, string>) =>
        this.rangeResponse(resource, range, validator);
      return referenceTable(resource, "routes.txt", request, async () => {
        throw new TransportDataError("Le catalogue des lignes exige la lecture bornée du flux GTFS.");
      });
    }, scheduleMetadataRefresh);
    return result.value;
  }

  async referenceRoutes(resource: CatalogResource): Promise<ReferenceRoute[]> { return this.routeTable(resource); }

  async discoverRoutesAtStops(resource: CatalogResource, stopIds: ReadonlySet<string>, mode: TransitMode,
    requestedLine = ""): Promise<GtfsRouteAtStops[]> {
    if (!stopIds.size) return [];
    const stopKey = createHash("sha256").update([...stopIds].sort().join("\n")).digest("hex");
    const result = await this.metadata.staleWhileRevalidate<GtfsRouteAtStops[]>({
      territory: this.territory, provider: this.config.provider, kind: "routes",
      source: `nearby-routes:${resource.id}:${mode}:${normalizeTransitText(requestedLine)}:${stopKey}`,
      version: resourceVersion(resource),
    }, 60 * 60_000, 7 * 24 * 60 * 60_000,
    () => this.scanRoutesAtStops(resource, stopIds, mode, requestedLine), scheduleMetadataRefresh);
    return result.value;
  }

  private async scanRoutesAtStops(resource: CatalogResource, stopIds: ReadonlySet<string>, mode: TransitMode,
    requestedLine = ""): Promise<GtfsRouteAtStops[]> {
    if (!stopIds.size) return [];
    const archive = new GtfsRangeArchive((range, validator) => this.rangeResponse(resource, range, validator));
    await archive.open();
    const routes = new Map<string, { shortName: string; longName: string; mode: TransitMode; stopIds: Set<string> }>();
    if (!await archive.rows("routes.txt", row => {
      const routeMode = routeTypeToMode(Number(row.route_type));
      const id = row.route_id?.trim() ?? "";
      if (!id || routeMode !== mode || requestedLine &&
        !routeMatchesRequested(id, row.route_short_name ?? "", row.route_long_name ?? "", requestedLine)) return;
      if (routes.size >= 60_000) throw new TransportDataError("Le catalogue national dépasse sa limite de lignes.");
      routes.set(id, { shortName: row.route_short_name ?? "", longName: row.route_long_name ?? "",
        mode, stopIds: new Set() });
    })) throw new TransportDataError("Le flux national ne contient pas de table de lignes.");
    if (!routes.size) return [];

    const tripRoutes = new Map<string, string>();
    if (!await archive.rows("trips.txt", row => {
      const trip = row.trip_id?.trim() ?? "", route = row.route_id?.trim() ?? "";
      if (!trip || !routes.has(route)) return;
      if (tripRoutes.size >= 400_000) throw new TransportDataError("Le catalogue national dépasse sa limite de courses.");
      tripRoutes.set(trip, route);
    })) throw new TransportDataError("Le flux national ne contient pas de table de courses.");

    if (!await archive.rows("stop_times.txt", row => {
      const stop = row.stop_id?.trim() ?? "";
      if (!stopIds.has(stop)) return;
      const routeId = tripRoutes.get(row.trip_id?.trim() ?? "");
      if (routeId) routes.get(routeId)?.stopIds.add(stop);
    })) throw new TransportDataError("Le flux national ne contient pas de table de passages.");
    return [...routes].flatMap(([routeId, route]) => route.stopIds.size
      ? [{ routeId, shortName: route.shortName, longName: route.longName, mode: route.mode, stopIds: [...route.stopIds] }]
      : []);
  }

  private async routeStopIndex(resource: CatalogResource, mode: TransitMode): Promise<GtfsRouteAtStops[]> {
    const result = await this.metadata.staleWhileRevalidate<GtfsRouteAtStops[]>({
      territory: this.territory, provider: this.config.provider, kind: "routes",
      source: `route-stop-index:${resource.id}:${mode}`, version: resourceVersion(resource),
    }, 24 * 60 * 60_000, 7 * 24 * 60 * 60_000, async () => {
      const stops = await this.stopTable(resource);
      return this.scanRoutesAtStops(resource, new Set(stops.map(stop => stop.id)), mode);
    });
    return result.value;
  }

  private async stopTable(resource: CatalogResource): Promise<ReferenceStop[]> {
    const result = await this.metadata.staleWhileRevalidate<ReferenceStop[]>({
      territory: this.territory, provider: this.config.provider, kind: "stops",
      source: `stops:${resource.id}`, version: resourceVersion(resource),
    }, 6 * 60 * 60_000, 7 * 24 * 60 * 60_000, async () => {
      const request = (range: string, validator?: Record<string, string>) =>
        this.rangeResponse(resource, range, validator);
      const stops = await referenceTable<ReferenceStop>(resource, "stops.txt", request, async () => {
        throw new TransportDataError("Le catalogue des arrêts exige la lecture bornée du flux GTFS.");
      });
      return stops.filter(stop => inBounds(this.config.bounds, stop.latitude, stop.longitude));
    }, scheduleMetadataRefresh);
    return result.value;
  }

  async referenceStops(resource: CatalogResource): Promise<ReferenceStop[]> { return this.stopTable(resource); }

  async nearbyStopsForResources(latitude: number, longitude: number, resources: CatalogResource[]): Promise<StopCollection> {
    const features: NonNullable<StopCollection["features"]> = [];
    const failures: number[] = [];
    const latRadius = 0.025, lonRadius = latRadius / Math.max(0.2, Math.cos(latitude * Math.PI / 180));
    for (const resource of resources) {
      try {
        const stops = await this.stopTable(resource);
        for (const stop of stops) if (Math.abs(stop.latitude - latitude) <= latRadius &&
          Math.abs(stop.longitude - longitude) <= lonRadius) {
          features.push({ properties: { resource_id: resource.id, stop_id: stop.id, stop_name: stop.name, location_type: stop.type } });
        }
      } catch { failures.push(resource.id); }
    }
    return { features, unavailableResourceIds: failures };
  }

  async nearbyStops(latitude: number, longitude: number): Promise<StopCollection> {
    const catalog = await this.getCatalog();
    return this.nearbyStopsForResources(latitude, longitude, catalog.flatMap(dataset => dataset.resources));
  }

  async staticFeed(resource: CatalogResource, selection?: GtfsSelection): Promise<Uint8Array> {
    if (!selection) {
      throw new TransportDataError("Une ligne doit être sélectionnée pour extraire un horaire national sans télécharger l’archive complète.");
    }
    return selectiveGtfs((range, validator) => this.rangeResponse(resource, range, validator), {
      ...selection, serviceWindowFrom: Math.floor(this.now() / 1000),
    });
  }

  async journeyIndex(resource: CatalogResource, routeId: string, mode: TransitMode): Promise<JourneyIndex> {
    const result = await this.metadata.staleWhileRevalidate<PackedNationalJourney>({
      territory: this.territory, provider: this.config.provider, kind: "journeyIndexes",
      source: `gtfs-journey:${resource.id}:${routeId}:${mode}`, version: resourceVersion(resource),
    }, 6 * 60 * 60_000, 7 * 24 * 60 * 60_000, async () => {
      const index = await buildJourneyIndex(await this.staticFeed(resource, { mode, routeId }), routeId);
      if (!index.metadata.timezone) throw new TransportDataError("Le flux ne précise pas de fuseau horaire utilisable; horaires non confirmés.");
      new Intl.DateTimeFormat("fr", { timeZone: index.metadata.timezone }).format(0);
      if (!nationalTimezoneMatches(this.territory, index.metadata.timezone)) {
        throw new TransportDataError(`Le fuseau du flux ne correspond pas à ${nationalTimezone(this.territory)}; horaires non confirmés.`);
      }
      index.metadata.timezone = nationalTimezone(this.territory);
      const services = new Set([...index.metadata.trips.values()].map(trip => trip.serviceId));
      const end = [...index.metadata.calendars].filter(([id]) => services.has(id)).map(([, calendar]) => calendar.endDate)
        .concat([...index.metadata.calendarExceptions].filter(([key, type]) =>
          type === 1 && services.has(key.slice(9))).map(([key]) => key.slice(0, 8))).sort().at(-1);
      const today = localDate(Math.floor(this.now() / 1000), index.metadata.timezone).replaceAll("-", "");
      if (end && end < today) {
        index.sourceWarning = `Données périmées : calendrier publié jusqu’au ${end.slice(6)}/${end.slice(4, 6)}/${end.slice(0, 4)}. Desserte actuelle non confirmée.`;
      }
      if ([...(index.frequencies?.values() ?? [])].some(entries => entries.some(entry => !entry.exact))) {
        index.sourceWarning = [index.sourceWarning,
          "Fréquences non exactes publiées : aucun horaire précis n’est inventé à partir d’un intervalle."].filter(Boolean).join(" ");
      }
      return packNationalJourney(index);
    }, scheduleMetadataRefresh);
    const index = unpackNationalJourney(result.value);
    if (result.stale) index.sourceWarning = [index.sourceWarning,
      "La copie d’horaire en cache est conservée pendant l’actualisation de la source."].filter(Boolean).join(" ");
    return index;
  }

  async realtimeFeed(): Promise<Uint8Array> {
    throw new TransportDataError("Aucun flux temps réel public validé n’est configuré pour cette source.");
  }

  async networks(city: TransportLocation, mode: TransitMode): Promise<CatalogDataset[]> {
    const catalog = await this.getCatalog();
    const supported = new Set<(typeof mode)>();
    for (const dataset of catalog) {
      for (const resource of dataset.resources.filter(item => item.is_available)) {
        for (const route of await this.routeTable(resource)) if (route.mode) supported.add(route.mode);
      }
    }
    if (!supported.has(mode)) {
      const names = [...supported].map(value => ({ bus: "bus", metro: "métro", tram: "tram", rail: "train" })[value]);
      throw new TransportDataError(names.length
        ? `Ce mode n’est pas publié par cette source. Modes confirmés : ${names.join(", ")}.`
        : "Aucun mode exploitable n’est actuellement confirmé dans le GTFS national.");
    }
    const datasets = catalog.flatMap(dataset => {
      if (dataset.territory !== city.territory || !dataset.bounds ||
        !inBounds(dataset.bounds, city.latitude, city.longitude)) return [];
      const modes = [...supported];
      if (!modes.includes(mode) || !dataset.resources.some(resource => resource.is_available)) return [];
      return [{ ...dataset, modes, resources: dataset.resources.map(resource => ({ ...resource, modes })) }];
    });
    return datasets;
  }

  async availableModes(): Promise<TransitMode[]> {
    const catalog = await this.getCatalog();
    const modes = new Set<TransitMode>();
    for (const dataset of catalog) for (const resource of dataset.resources) {
      for (const route of await this.routeTable(resource)) if (route.mode) modes.add(route.mode);
    }
    return [...modes].sort((a, b) => a.localeCompare(b));
  }

  region(place: string): TransportRegion | null {
    if (this.territory !== "ie") return null;
    const county = irelandCountyFromSearch(place);
    return county ? { code: county.code, name: county.osmName, parentName: county.province,
      territory: "ie", departmentCodes: [], epciCodes: [] } : null;
  }

  private async countyBoundary(region: TransportRegion): Promise<GeoJsonBoundary> {
    if (this.territory !== "ie" || region.territory !== "ie") {
      throw new TransportDataError("Les limites par comté ne sont pas disponibles pour ce territoire.");
    }
    const county = irelandCountyByCode(region.code);
    if (!county) throw new TransportDataError("Le comté choisi n’est pas reconnu dans le référentiel irlandais.");
    return queueGeocode(async () => {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", `${county.osmName}, Ireland`);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("polygon_geojson", "1");
      url.searchParams.set("limit", "3");
      url.searchParams.set("countrycodes", "ie");
      const response = await this.fetcher(url.href, {
        headers: { accept: "application/json", "user-agent": "MaximeGPT public transport/1.0" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new TransportDataError("Les limites du comté sont temporairement indisponibles.");
      const results = await boundedJson<GeocodeResult[]>(response, 3 * 1024 * 1024);
      if (!Array.isArray(results)) throw new TransportDataError("Le référentiel des comtés est illisible.");
      const result = results.find(item => normalizeTransitText(item.name ?? "") === normalizeTransitText(county.osmName) &&
        (item.category ?? item.class) === "boundary" && item.type === "administrative" &&
        item.addresstype === "county" && item.address?.country_code === "ie" &&
        normalizeTransitText(item.address.region ?? "") === normalizeTransitText(county.province));
      if (!result || !validBoundary(result.geojson)) {
        throw new TransportDataError(`La limite officielle de ${county.osmName} n’a pas pu être vérifiée.`);
      }
      return result.geojson;
    });
  }

  async routesInRegion(resource: CatalogResource, region: TransportRegion, mode: TransitMode, requestedLine = ""):
    Promise<GtfsRouteAtStops[]> {
    if (region.territory !== this.territory || this.territory !== "ie") {
      throw new TransportDataError("Le découpage par zones n’est pas disponible pour cette source.");
    }
    const stopCollection = await this.metadata.get<StopCollection>({
      territory: this.territory, provider: this.config.provider, kind: "nearby",
      source: `county-stops:${resource.id}:${region.code}`, version: resourceVersion(resource),
    }, 24 * 60 * 60_000, async () => {
      const boundary = await this.countyBoundary(region);
      const preparedBoundary = prepareBoundary(boundary);
      const stops = await this.stopTable(resource);
      return { features: stops.filter(stop => ![2, 3, 4].includes(stop.type) &&
        insideBoundary(preparedBoundary, stop.latitude, stop.longitude)).map(stop => ({
          properties: { resource_id: resource.id, stop_id: stop.id, stop_name: stop.name, location_type: stop.type },
        })) };
    });
    const stopIds = new Set((stopCollection.features ?? []).flatMap(feature =>
      feature.properties?.stop_id ? [feature.properties.stop_id] : []));
    if (!stopIds.size) return [];
    return this.metadata.get<GtfsRouteAtStops[]>({
      territory: this.territory, provider: this.config.provider, kind: "routes",
      source: `county-routes:${resource.id}:${region.code}:${mode}:${normalizeTransitText(requestedLine)}`,
      version: resourceVersion(resource),
    }, 60 * 60_000, async () => {
      const allRoutes = await this.routeStopIndex(resource, mode);
      return allRoutes.flatMap(route => {
        if (requestedLine && !routeMatchesRequested(route.routeId, route.shortName, route.longName, requestedLine)) return [];
        const countyStops = route.stopIds.filter(stopId => stopIds.has(stopId));
        return countyStops.length ? [{ ...route, stopIds: countyStops }] : [];
      });
    });
  }

  async prewarmRegionIndex(mode: TransitMode): Promise<void> {
    if (this.territory !== "ie") return;
    const catalog = await this.getCatalog();
    const resource = catalog.flatMap(dataset => dataset.resources).find(item => item.is_available);
    if (!resource) throw new TransportDataError("Le flux GTFS irlandais est indisponible.");
    await this.routeStopIndex(resource, mode);
  }
}

export class IrelandTransportClient extends NationalGtfsTransportClient {
  constructor(fetcher: typeof fetch = fetch, now: () => number = Date.now, metadata?: TransportMetadataCache) {
    super("ie", fetcher, now, metadata);
  }
}

export class LuxembourgTransportClient extends NationalGtfsTransportClient {
  constructor(fetcher: typeof fetch = fetch, now: () => number = Date.now, metadata?: TransportMetadataCache) {
    super("lu", fetcher, now, metadata);
  }
}

export class SwitzerlandTransportClient extends NationalGtfsTransportClient {
  constructor(fetcher: typeof fetch = fetch, now: () => number = Date.now, metadata?: TransportMetadataCache) {
    super("ch", fetcher, now, metadata);
  }
}

export function nationalTimezone(territory: "ie" | "lu" | "ch" | "is") { return CONFIG[territory].timezone; }
export function nationalTimezoneMatches(territory: "ie" | "lu" | "ch" | "is", timezone: string) {
  const expected = nationalTimezone(territory);
  if (timezone === expected) return true;
  const verifiedSourceZones: Record<"ie" | "lu" | "ch" | "is", string[]> = {
    ie: ["Europe/London"], lu: ["Europe/Berlin"], ch: [], is: [],
  };
  if (!verifiedSourceZones[territory].includes(timezone)) return false;
  try {
    const offset = (zone: string, year: number, month: number) => new Intl.DateTimeFormat("en", {
      timeZone: zone, timeZoneName: "longOffset",
    }).formatToParts(new Date(Date.UTC(year, month - 1, 15))).find(part => part.type === "timeZoneName")?.value;
    return Array.from({ length: 6 }, (_, index) => 2026 + index).every(year =>
      [1, 3, 4, 7, 10, 12].every(month => offset(timezone, year, month) === offset(expected, year, month)));
  } catch { return false; }
}
export function nationalSourceProvider(territory: "ie" | "lu" | "ch" | "is") { return CONFIG[territory].provider; }
export function nationalSourceInfo(territory: "ie" | "lu" | "ch" | "is") {
  const config = CONFIG[territory];
  return { name: config.title, url: config.page, attribution: `${config.title} · ${config.licence}`,
    limitations: config.limitations };
}
export function hasRouteMode(routes: ReferenceRoute[], mode: "bus" | "metro" | "tram" | "rail") {
  return routes.some(route => route.mode === mode);
}
