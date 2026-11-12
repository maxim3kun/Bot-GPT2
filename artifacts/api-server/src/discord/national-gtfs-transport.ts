import { createHash } from "node:crypto";
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
  category?: string; address?: { county?: string; state?: string; city?: string; town?: string; village?: string } };
type NationalConfig = {
  territory: "ie" | "lu"; provider: "nta" | "atp"; timezone: string; title: string; page: string;
  licence: string; bounds: Bounds; resourceName: string; feedHost: string; feedPathPrefix: string;
  limitations: string[];
};

const CONFIG: Record<"ie" | "lu", NationalConfig> = {
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
};
const idFor = (territory: TransportTerritory, source: string) =>
  -1 - createHash("sha256").update(`${territory}:${source}`).digest().readUIntBE(0, 6);

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

/** National static GTFS sources only. ZIP entries are read with bounded HTTP ranges;
 * no national archive, trip, calendar or stop-time data is written to MongoDB. */
export class NationalGtfsTransportClient implements TransportProvider {
  readonly metadata: TransportMetadataCache;
  private readonly config: NationalConfig;

  constructor(readonly territory: "ie" | "lu", private readonly fetcher: typeof fetch = fetch,
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

  private safeFeedUrl(value: string): URL {
    let url: URL;
    try { url = new URL(value); } catch { throw new TransportDataError("L’adresse du flux GTFS national est invalide."); }
    if (url.protocol !== "https:" || url.hostname !== this.config.feedHost || url.username || url.password ||
      url.port || !(this.territory === "ie" ? url.pathname === this.config.feedPathPrefix
        : url.pathname.startsWith(this.config.feedPathPrefix))) {
      throw new TransportDataError("Le catalogue national a publié une adresse de flux non autorisée.");
    }
    return url;
  }

  private async rangeResponse(resource: CatalogResource, range: string, validator?: Record<string, string>) {
    const url = this.safeFeedUrl(resource.url);
    const response = await this.fetcher(url.href, {
      headers: { accept: "application/zip", "user-agent": "MaximeGPT public transport/1.0",
        range, ...validator },
      signal: AbortSignal.timeout(90_000), redirect: "manual",
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (!location || this.safeFeedUrl(new URL(location, url).href).href !== url.href) {
        throw new TransportDataError("Le flux GTFS national a redirigé vers une adresse non autorisée.");
      }
      throw new TransportDataError("Le flux GTFS national redirige au lieu de répondre aux requêtes par plages.");
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
    } else {
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
    }
    await this.probe(resource);
    return [{
      id: `${this.territory}:national-gtfs`, title, slug: `${this.territory}-national-gtfs`,
      page_url: this.config.page, type: "public-transit", licence, resources: [resource],
      territory: this.territory, bounds: this.config.bounds, limitations: this.config.limitations,
      publisher: this.config.provider === "nta" ? "National Transport Authority" : "Administration des transports publics",
    }];
  }

  async getCatalog(): Promise<CatalogDataset[]> {
    const result = await this.metadata.staleWhileRevalidate({
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
        return [{ id, name, label: [name, county, this.territory === "ie" ? "Irlande" : "Luxembourg"]
          .filter(Boolean).join(" · "), latitude, longitude, territory: this.territory }];
      });
      const exact = places.filter(location => normalizeTransitText(location.name) === query);
      return (exact.length ? exact : places).slice(0, 25);
    }));
  }

  municipalities(place: string): Promise<TransportLocation[]> { return this.geocode(place); }

  private async routeTable(resource: CatalogResource): Promise<ReferenceRoute[]> {
    return this.metadata.get({
      territory: this.territory, provider: this.config.provider, kind: "routes",
      source: `routes:${resource.id}`, version: resourceVersion(resource),
    }, 6 * 60 * 60_000, async () => {
      const request = (range: string, validator?: Record<string, string>) =>
        this.rangeResponse(resource, range, validator);
      return referenceTable(resource, "routes.txt", request, async () => {
        throw new TransportDataError("Le catalogue des lignes exige la lecture bornée du flux GTFS.");
      });
    });
  }

  async referenceRoutes(resource: CatalogResource): Promise<ReferenceRoute[]> { return this.routeTable(resource); }

  async discoverRoutesAtStops(resource: CatalogResource, stopIds: ReadonlySet<string>, mode: TransitMode,
    requestedLine = ""): Promise<GtfsRouteAtStops[]> {
    if (!stopIds.size) return [];
    const stopKey = createHash("sha256").update([...stopIds].sort().join("\n")).digest("hex");
    return this.metadata.get<GtfsRouteAtStops[]>({
      territory: this.territory, provider: this.config.provider, kind: "routes",
      source: `nearby-routes:${resource.id}:${mode}:${normalizeTransitText(requestedLine)}:${stopKey}`,
      version: resourceVersion(resource),
    }, 60 * 60_000, async () => {
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
    });
  }

  private async stopTable(resource: CatalogResource): Promise<ReferenceStop[]> {
    return this.metadata.get<ReferenceStop[]>({
      territory: this.territory, provider: this.config.provider, kind: "stops",
      source: `stops:${resource.id}`, version: resourceVersion(resource),
    }, 6 * 60 * 60_000, async () => {
      const request = (range: string, validator?: Record<string, string>) =>
        this.rangeResponse(resource, range, validator);
      const stops = await referenceTable<ReferenceStop>(resource, "stops.txt", request, async () => {
        throw new TransportDataError("Le catalogue des arrêts exige la lecture bornée du flux GTFS.");
      });
      return stops.filter(stop => inBounds(this.config.bounds, stop.latitude, stop.longitude));
    });
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

export function nationalTimezone(territory: "ie" | "lu") { return CONFIG[territory].timezone; }
export function nationalTimezoneMatches(territory: "ie" | "lu", timezone: string) {
  const expected = nationalTimezone(territory);
  if (timezone === expected) return true;
  const verifiedSourceZones: Record<"ie" | "lu", string[]> = {
    ie: ["Europe/London"], lu: ["Europe/Berlin"],
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
export function nationalSourceProvider(territory: "ie" | "lu") { return CONFIG[territory].provider; }
export function nationalSourceInfo(territory: "ie" | "lu") {
  const config = CONFIG[territory];
  return { name: config.title, url: config.page, attribution: `${config.title} · ${config.licence}`,
    limitations: config.limitations };
}
export function hasRouteMode(routes: ReferenceRoute[], mode: "bus" | "metro" | "tram" | "rail") {
  return routes.some(route => route.mode === mode);
}
