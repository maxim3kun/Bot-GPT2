import { deflateSync, inflateSync } from "node:zlib";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { CatalogDataset, CatalogResource, StopCollection, TransportLocation } from "./public-transport.js";
import type { TransportProvider, TransportTerritory } from "./transport-provider.js";
import type { TransitMode } from "./transport-query.js";
import { normalizeTransitText, routeMatchesRequested } from "./transport-query.js";
import { GtfsRangeArchive } from "./gtfs-range.js";
import type { JourneyIndex, JourneyStop } from "./gtfs-journey.js";
import type { GtfsStaticMetadata } from "./gtfs-realtime.js";
import { addDays, localDate } from "./gtfs-realtime.js";
import { TransportMetadataCache } from "./transport-metadata-cache.js";
import { TransportDataError } from "./transport-data-error.js";
import { createHash } from "node:crypto";
import type { GtfsRouteAtStops } from "./gtfs-realtime.js";

const PAGE = "https://developer.entur.no/open-data/timetable";
const IMPORT_DATES = "https://api.entur.io/timetable-public/v1/timetable-import-info/import_date";
const NORWAY_BOUNDS: [number, number, number, number] = [-10.9, 57.9, 33.5, 72];
const HOURS = 60 * 60_000;
const FEEDS = [
  { code: "ost", name: "Østfold kollektivtrafikk", counties: ["østfold"], mode: "bus" },
  { code: "rut", name: "Ruter", counties: ["oslo", "akershus", "viken"], mode: "local" },
  { code: "inn", name: "Innlandstrafikk", counties: ["innlandet", "hedmark", "oppland"], mode: "bus" },
  { code: "bra", name: "Brakar", counties: ["buskerud", "viken"], mode: "bus" },
  { code: "vkt", name: "Vestfold kollektivtrafikk", counties: ["vestfold", "vestfold og telemark"], mode: "bus" },
  { code: "tel", name: "Farte", counties: ["telemark", "vestfold og telemark"], mode: "bus" },
  { code: "akt", name: "AKT", counties: ["agder", "aust-agder", "vest-agder"], mode: "bus" },
  { code: "kol", name: "Kolumbus", counties: ["rogaland"], mode: "bus" },
  { code: "sky", name: "Skyss", counties: ["vestland", "hordaland"], mode: "bus" },
  { code: "sof", name: "Kringom", counties: ["vestland", "sogn og fjordane"], mode: "bus" },
  { code: "mor", name: "FRAM", counties: ["møre og romsdal"], mode: "bus" },
  { code: "atb", name: "AtB", counties: ["trøndelag", "sør-trøndelag", "nord-trøndelag"], mode: "bus" },
  { code: "nor", name: "Nordland fylkeskommune", counties: ["nordland"], mode: "bus" },
  { code: "tro", name: "Troms fylkestrafikk", counties: ["troms"], mode: "bus" },
  { code: "fin", name: "Snelandia", counties: ["finnmark"], mode: "bus" },
  { code: "goa", name: "Go-Ahead Nordic", mode: "rail" },
  { code: "sjn", name: "SJ Nord", mode: "rail" },
  { code: "vyg", name: "Vy Rail", mode: "rail" },
  { code: "flt", name: "Flytoget", mode: "rail" },
] as const;
type Feed = typeof FEEDS[number];
const FEED_BY_CODE = new Map<string, Feed>(FEEDS.map(feed => [feed.code, feed]));
type XmlNode = Record<string, unknown>;
type PackedJourneyIndex = { payload: string };
type ImportDates = Record<string, string>;

const asNode = (value: unknown): XmlNode =>
  value && typeof value === "object" && !Array.isArray(value) ? value as XmlNode : {};
function text(node: XmlNode, key: string): string {
  const raw = node[key];
  return typeof raw === "string" ? raw : typeof raw === "number" ? String(raw) :
    typeof asNode(raw)["#text"] === "string" ? asNode(raw)["#text"] as string : "";
}
const attr = (node: XmlNode, key: string) => text(node, `$${key}`);
const ref = (node: XmlNode, key: string) => attr(asNode(node[key]), "ref");
function* walk(value: unknown, depth = 0): Generator<XmlNode> {
  if (depth > 64) throw new TransportDataError("Le NeTEx norvégien dépasse la profondeur XML autorisée.");
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) yield* walk(item, depth + 1);
    return;
  }
  const node = value as XmlNode;
  yield node;
  for (const [key, child] of Object.entries(node)) if (!key.startsWith("$") && key !== "#text") {
    yield* walk(child, depth + 1);
  }
}
function findAll(root: unknown, name: string): unknown[] {
  const found: unknown[] = [];
  for (const node of walk(root)) if (Object.hasOwn(node, name)) {
    if (Array.isArray(node[name])) found.push(...node[name] as unknown[]);
    else if (node[name] != null) found.push(node[name]);
  }
  return found;
}
const leafText = (value: unknown) => typeof value === "string" || typeof value === "number"
  ? String(value) : text(asNode(value), "#text");
function ensureSafeXml(bytes: Uint8Array): XmlNode {
  if (bytes.byteLength > 32 * 1024 * 1024) throw new TransportDataError("Le fichier NeTEx dépasse la limite de taille autorisée.");
  const xml = Buffer.from(bytes).toString("utf8");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) {
    throw new TransportDataError("Le fichier NeTEx est invalide ou contient une déclaration XML interdite.");
  }
  const parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "$", parseTagValue: false,
    removeNSPrefix: true, trimValues: true, processEntities: false }).parse(xml) as XmlNode;
  return parsed;
}
function supportedMode(raw: string): TransitMode | null {
  const mode = normalizeTransitText(raw).replace(/[^a-z]+/g, "");
  if (["bus", "trolleybus"].includes(mode)) return "bus";
  if (["metro", "subway"].includes(mode)) return "metro";
  if (["tram", "tramway"].includes(mode)) return "tram";
  if (["rail", "train", "funicular"].includes(mode)) return "rail";
  return null;
}
function entryRouteId(resource: CatalogResource, entry: string) {
  return `netex:${resource.id}:${entry}`;
}
function entryFromRouteId(resource: CatalogResource, routeId: string) {
  const prefix = `netex:${resource.id}:`;
  if (!routeId.startsWith(prefix)) throw new TransportDataError("La ligne NeTEx ne correspond pas au réseau sélectionné.");
  return routeId.slice(prefix.length).toLowerCase();
}
function routeFromEntry(resource: CatalogResource, entry: string): { routeId: string; shortName: string; longName: string; mode: TransitMode | null } | null {
  const match = entry.match(/-line-([^_]+)_([^_]+)_(.+)\.xml$/i);
  if (!match) return null;
  const code = FEEDS.find(feed => resource.url.includes(`rb_${feed.code}-aggregated-netex.zip`));
  if (!code) return null;
  const publicCode = match[2]!.trim();
  let mode: TransitMode | null = code.mode === "rail" ? "rail" : "bus";
  if (code.code === "rut" && /^\d+$/.test(publicCode)) {
    const number = Number(publicCode);
    if (number >= 1 && number <= 5) mode = "metro";
    else if (number >= 11 && number <= 19) mode = "tram";
  }
  const longName = match[3]!.replace(/\.xml$/i, "").replace(/[_-]+/g, " ").trim();
  return { routeId: entryRouteId(resource, entry), shortName: publicCode, longName, mode };
}
function dateText(value: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}
function textBool(value: string, fallback = true) {
  if (!value) return fallback;
  return !["false", "0", "no"].includes(value.toLowerCase());
}

function encodeJourneyIndex(index: JourneyIndex, sourceUpdated: string): PackedJourneyIndex {
  const dto = {
    routeId: index.routeId, sourceUpdated, sourceWarning: index.sourceWarning,
    metadata: {
      routes: [...index.metadata.routes], trips: [...index.metadata.trips],
      calendars: [...index.metadata.calendars], calendarExceptions: [...index.metadata.calendarExceptions],
      timezone: index.metadata.timezone,
    },
    visits: [...index.visits], stops: [...index.stops],
  };
  const payload = deflateSync(Buffer.from(JSON.stringify(dto))).toString("base64");
  if (payload.length > 3_800_000) {
    throw new TransportDataError("L’horaire publié pour cette ligne dépasse la taille maximale du cache réutilisable.");
  }
  return { payload };
}
function decodeJourneyIndex(value: PackedJourneyIndex, currentUpdated: string): JourneyIndex {
  let dto: ReturnType<typeof JSON.parse>;
  try { dto = JSON.parse(inflateSync(Buffer.from(value.payload, "base64"), { maxOutputLength: 32 * 1024 * 1024 }).toString("utf8")); }
  catch { throw new TransportDataError("Le cache NeTEx du trajet est illisible."); }
  const metadata = dto.metadata as GtfsStaticMetadata;
  const index: JourneyIndex = { routeId: dto.routeId as string, metadata: {
    routes: new Map(metadata.routes), trips: new Map(metadata.trips), calendars: new Map(metadata.calendars),
    calendarExceptions: new Map(metadata.calendarExceptions), timezone: metadata.timezone,
  }, visits: new Map(dto.visits), stops: new Map(dto.stops), connectionsUnavailable: true };
  const cachedUpdate = typeof dto.sourceUpdated === "string" ? dto.sourceUpdated : "";
  if (currentUpdated && cachedUpdate && currentUpdated !== cachedUpdate) {
    index.sourceWarning = `La dernière copie exploitable de l’horaire date du ${cachedUpdate.slice(0, 10)}; la nouvelle version Entur n’a pas encore pu être intégrée.`;
  } else if (typeof dto.sourceWarning === "string") index.sourceWarning = dto.sourceWarning;
  return index;
}

function placeCounties(city: TransportLocation) {
  return normalizeTransitText(city.area ?? city.label);
}
const BUS_FEEDS = FEEDS.filter(feed => feed.mode !== "rail");
const RAIL_FEEDS = FEEDS.filter(feed => feed.mode === "rail");
const SUPPORTED_MODES: TransitMode[] = ["bus", "metro", "tram", "rail"];

/** Entur publishes operator-specific NeTEx ZIPs. Only the chosen line XML and
 * its shared reference member are fetched; the large parent ZIP is never downloaded. */
export class NorwayNetexTransportClient implements TransportProvider {
  readonly territory: TransportTerritory = "no";
  readonly metadata: TransportMetadataCache;

  constructor(private readonly fetcher: typeof fetch = fetch, private readonly now: () => number = Date.now,
    metadata?: TransportMetadataCache) {
    this.metadata = metadata ?? new TransportMetadataCache(undefined, now);
  }

  async availableModes(): Promise<TransitMode[]> {
    const published = new Set((await this.getCatalog()).flatMap(dataset => dataset.modes ?? []));
    return SUPPORTED_MODES.filter(mode => published.has(mode));
  }

  private async importDates(): Promise<ImportDates> {
    const response = await this.fetcher(IMPORT_DATES, {
      headers: { accept: "application/json", "user-agent": "MaximeGPT public transport/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new TransportDataError(`Les dates de mise à jour Entur sont indisponibles (HTTP ${response.status}).`);
    const length = Number(response.headers.get("content-length"));
    if (Number.isFinite(length) && length > 64 * 1024) throw new TransportDataError("Les métadonnées Entur dépassent leur limite de taille.");
    const body = await response.text();
    if (Buffer.byteLength(body) > 64 * 1024) throw new TransportDataError("Les métadonnées Entur dépassent leur limite de taille.");
    try {
      const dates = JSON.parse(body) as ImportDates;
      if (!dates || typeof dates !== "object" || Array.isArray(dates)) throw new Error("invalid");
      return Object.fromEntries(Object.entries(dates).filter(([code, value]) =>
        FEED_BY_CODE.has(code) && typeof value === "string" && Number.isFinite(Date.parse(value))));
    } catch { throw new TransportDataError("Les dates de publication Entur sont illisibles."); }
  }

  private async loadCatalog(): Promise<CatalogDataset[]> {
    const dates = await this.importDates();
    return FEEDS.flatMap(feed => {
      const updated = dates[feed.code];
      if (!updated) return [];
      const id = -1 - createHash("sha256").update(`no:${feed.code}`).digest().readUIntBE(0, 6);
      const modes = feed.code === "rut" ? ["bus", "metro", "tram"] : [feed.mode === "rail" ? "rail" : "bus"];
      const resource: CatalogResource = {
        id, title: `Horaire NeTEx · ${feed.name}`, format: "NeTEx", type: "public-transit",
        url: `https://storage.googleapis.com/marduk-production/outbound/netex/rb_${feed.code}-aggregated-netex.zip`,
        original_url: `https://storage.googleapis.com/marduk-production/outbound/netex/rb_${feed.code}-aggregated-netex.zip`,
        is_available: true, modes, ...(updated ? { updated: new Date(updated).toISOString() } : {}),
        referenceVersion: `entur-netex-${feed.code}-v1`,
      };
      return [{
        id: `no:entur:${feed.code}`, title: feed.name, slug: `no-entur-${feed.code}`,
        page_url: PAGE, type: "public-transit", licence: "NLOD", resources: [resource],
        territory: "no", bounds: NORWAY_BOUNDS, modes, publisher: "Entur",
        limitations: ["Horaires statiques NeTEx uniquement; aucun temps réel Entur n’est intégré.",
          "La couverture dépend des opérateurs et des courses effectivement publiés dans ce flux."],
      }];
    });
  }

  async getCatalog(): Promise<CatalogDataset[]> {
    const result = await this.metadata.staleWhileRevalidate<CatalogDataset[]>({
      territory: "no", provider: "entur-netex", kind: "catalog", source: "entur:operator-netex-feeds",
      version: "entur-timetable-index-v1",
    }, 6 * HOURS, 7 * 24 * HOURS, () => this.loadCatalog());
    return result.value;
  }

  private locateNetworks(city: TransportLocation, mode: TransitMode) {
    if (mode === "rail") return RAIL_FEEDS.map(feed => feed.code);
    const counties = placeCounties(city);
    if (mode === "metro" || mode === "tram") {
      return (/\b(?:oslo|akershus|viken)\b/.test(counties) ? ["rut"] : []) as string[];
    }
    return BUS_FEEDS.filter(feed => feed.counties?.some(county =>
      counties.includes(normalizeTransitText(county)))).map(feed => feed.code);
  }

  async networks(city: TransportLocation, mode: TransitMode): Promise<CatalogDataset[]> {
    const matching = new Set(this.locateNetworks(city, mode));
    return (await this.getCatalog()).filter(dataset =>
      [...matching].some(code => dataset.id === `no:entur:${code}`) &&
      dataset.resources.some(resource => resource.modes?.includes(mode)));
  }

  async municipalities(place: string): Promise<TransportLocation[]> {
    const query = normalizeTransitText(place);
    if (query.length < 2 || query.length > 100) return [];
    return this.metadata.get<TransportLocation[]>({
      territory: "no", provider: "nominatim", kind: "locations",
      source: `norway-places:${query}`, version: "norway-nominatim-v1",
    }, 24 * HOURS, async () => {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", place);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("limit", "15");
      url.searchParams.set("countrycodes", "no");
      const response = await this.fetcher(url.href, {
        headers: { accept: "application/json", "user-agent": "MaximeGPT public transport/1.0" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new TransportDataError("Le géocodage norvégien est temporairement indisponible.");
      const length = Number(response.headers.get("content-length"));
      if (Number.isFinite(length) && length > 1024 * 1024) throw new TransportDataError("Le résultat de géocodage dépasse sa limite de taille.");
      const body = await response.text();
      if (Buffer.byteLength(body) > 1024 * 1024) throw new TransportDataError("Le résultat de géocodage dépasse sa limite de taille.");
      let results: Array<Record<string, unknown>>;
      try { results = JSON.parse(body) as Array<Record<string, unknown>>; }
      catch { throw new TransportDataError("Le résultat de géocodage est illisible."); }
      if (!Array.isArray(results)) throw new TransportDataError("Le résultat de géocodage est invalide.");
      return results.flatMap(result => {
        const address = asNode(result.address);
        if (address.country_code !== "no") return [];
        const lat = Number(result.lat), lon = Number(result.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || lon < NORWAY_BOUNDS[0] ||
          lat < NORWAY_BOUNDS[1] || lon > NORWAY_BOUNDS[2] || lat > NORWAY_BOUNDS[3]) return [];
        const className = String(result.class ?? result.category ?? "");
        const type = String(result.type ?? "");
        if (!(className === "place" && ["city", "town", "village", "municipality", "hamlet"].includes(type))) return [];
        const name = String(result.name ?? "").trim() || String(result.display_name ?? "").split(",")[0]!.trim();
        const county = String(address.county ?? address.state ?? address.region ?? "").trim();
        if (!name) return [];
        const id = `osm:no:${createHash("sha256").update(`${normalizeTransitText(name)}:${lat.toFixed(5)}:${lon.toFixed(5)}`).digest("hex").slice(0, 16)}`;
        return [{ id, name, label: [name, county, "Norvège"].filter(Boolean).join(" · "),
          latitude: lat, longitude: lon, territory: "no" as const, area: county }];
      });
    });
  }

  private async rangeArchive(resource: CatalogResource) {
    const url = new URL(resource.url);
    if (url.protocol !== "https:" || url.hostname !== "storage.googleapis.com" ||
      !/^\/marduk-production\/outbound\/netex\/rb_[a-z0-9]+-aggregated-netex\.zip$/i.test(url.pathname)) {
      throw new TransportDataError("L’adresse du flux NeTEx Entur n’est pas autorisée.");
    }
    return new GtfsRangeArchive(async (range, validator) => {
      const headers = new Headers({ range, "accept-encoding": "identity", "user-agent": "MaximeGPT public transport/1.0" });
      for (const [key, value] of Object.entries(validator ?? {})) headers.set(key, value);
      return this.fetcher(url.href, { headers, redirect: "manual", signal: AbortSignal.timeout(25_000) });
    });
  }

  async referenceRoutes(resource: CatalogResource) {
    const result = await this.metadata.staleWhileRevalidate({
      territory: "no", provider: "entur-netex", kind: "routes",
      source: `netex-routes:${resource.id}`, version: "netex-directory-v1",
    }, 24 * HOURS, 7 * 24 * HOURS, async () => {
      const archive = await this.rangeArchive(resource);
      await archive.open();
      const routes = archive.entryNames().flatMap(name => {
        const route = routeFromEntry(resource, name);
        return route ? [{ ...route, stopIds: [] as string[] }] : [];
      });
      if (!routes.length) throw new TransportDataError("Aucune ligne NeTEx exploitable n’est publiée dans ce réseau.");
      return routes;
    });
    return result.value;
  }

  async discoverRoutesAtStops(resource: CatalogResource, _stopIds: ReadonlySet<string>, mode: TransitMode,
    requestedLine = ""): Promise<GtfsRouteAtStops[]> {
    return (await this.referenceRoutes(resource)).filter(route => route.mode === mode &&
      (!requestedLine || routeMatchesRequested(route.routeId, route.shortName, route.longName, requestedLine)))
      .map(route => ({ ...route, stopIds: [] }));
  }

  async nearbyStopsForResources(_latitude: number, _longitude: number, resources: CatalogResource[]): Promise<StopCollection> {
    return { features: resources.map(resource => ({ properties: {
      resource_id: resource.id, stop_id: `netex-network:${resource.id}`, stop_name: resource.title, location_type: 0,
    } })) };
  }

  async nearbyStops(latitude: number, longitude: number): Promise<StopCollection> {
    const catalog = await this.getCatalog();
    return this.nearbyStopsForResources(latitude, longitude, catalog.flatMap(dataset => dataset.resources));
  }

  async staticFeed(_resource: CatalogResource): Promise<Uint8Array> {
    throw new TransportDataError("Les horaires NeTEx sont lus ligne par ligne, sans télécharger l’archive complète.");
  }

  async realtimeFeed(_resource: CatalogResource): Promise<Uint8Array> {
    throw new TransportDataError("Aucun flux temps réel norvégien vérifié n’est utilisé.");
  }

  private async loadJourneyIndex(resource: CatalogResource, routeId: string, mode: TransitMode): Promise<JourneyIndex> {
    const entry = entryFromRouteId(resource, routeId);
    const code = FEEDS.find(feed => resource.url.includes(`rb_${feed.code}-aggregated-netex.zip`));
    if (!code) throw new TransportDataError("Le réseau NeTEx Entur n’est pas reconnu.");
    const route = routeFromEntry(resource, entry);
    if (!route || route.mode !== mode) throw new TransportDataError("La ligne ne correspond pas au mode sélectionné.");
    const archive = await this.rangeArchive(resource);
    await archive.open();
    const names = archive.entryNames();
    const sharedName = names.find(name => new RegExp(`^_${code.code}_shared_data\\.xml$`, "i").test(name));
    if (!sharedName) throw new TransportDataError("Le fichier de références partagées du réseau est absent.");
    const [sharedBytes, routeBytes] = await Promise.all([
      archive.entryBytes(sharedName, 8 * 1024 * 1024, 32 * 1024 * 1024),
      archive.entryBytes(entry, 8 * 1024 * 1024, 32 * 1024 * 1024),
    ]);
    if (!sharedBytes || !routeBytes) throw new TransportDataError("Le fichier de la ligne ou ses références ont disparu.");
    const shared = ensureSafeXml(sharedBytes);
    const routeData = ensureSafeXml(routeBytes);
    const actualLine = findAll(routeData, "Line").map(asNode).find(item => text(item, "Name") || text(item, "PublicCode"));
    if (!actualLine || supportedMode(text(actualLine, "TransportMode")) !== mode) {
      throw new TransportDataError("Le mode publié de cette ligne ne correspond pas au mode choisi.");
    }
    const timezone = findAll(shared, "TimeZone")[0];
    if (!timezone || leafText(timezone) !== "Europe/Oslo") {
      throw new TransportDataError("Le flux ne confirme pas le fuseau horaire Europe/Oslo.");
    }
    const nowSeconds = Math.floor(this.now() / 1000);
    const firstDate = addDays(localDate(nowSeconds, "Europe/Oslo"), -1);
    const lastDate = addDays(localDate(nowSeconds, "Europe/Oslo"), 8);
    const operatingDates = new Map<string, Set<string>>();
    for (const assignmentValue of findAll(shared, "DayTypeAssignment")) {
      const assignment = asNode(assignmentValue);
      const dayTypeId = ref(assignment, "DayTypeRef");
      const rawDate = ref(assignment, "OperatingDayRef").split(":").at(-1) ?? "";
      const date = dateText(rawDate);
      if (!dayTypeId || !date || date < firstDate || date > lastDate) continue;
      const dates = operatingDates.get(dayTypeId) ?? new Set<string>();
      dates.add(date);
      operatingDates.set(dayTypeId, dates);
    }
    const stopNames = new Map<string, string>();
    for (const stopValue of findAll(shared, "ScheduledStopPoint")) {
      const stop = asNode(stopValue);
      const id = attr(stop, "id"), name = text(stop, "Name");
      if (id && name && stopNames.size < 100_000) stopNames.set(id, name);
    }
    const patterns = new Map<string, { points: Array<{ id: string; stopId: string; pickup: boolean; dropoff: boolean }>; headsign: string; direction: string }>();
    for (const patternValue of findAll(routeData, "JourneyPattern")) {
      const pattern = asNode(patternValue);
      const id = attr(pattern, "id");
      if (!id) continue;
      const points = findAll(pattern.pointsInSequence, "StopPointInJourneyPattern").flatMap(pointValue => {
        const point = asNode(pointValue);
        const pointId = attr(point, "id"), stopId = ref(point, "ScheduledStopPointRef");
        if (!pointId || !stopId || !stopNames.has(stopId)) return [];
        return [{ id: pointId, stopId, pickup: textBool(text(point, "ForBoarding")),
          dropoff: textBool(text(point, "ForAlighting")) }];
      });
      if (points.length >= 2 && points.length <= 500) patterns.set(id, {
        points, headsign: findAll(pattern, "FrontText").map(leafText).find(Boolean) ?? "",
        direction: text(pattern, "DirectionType") || text(asNode(pattern.RouteRef), "ref"),
      });
    }
    if (!patterns.size) throw new TransportDataError("Aucun parcours avec des arrêts vérifiés n’est publié pour cette ligne.");
    const metadata: GtfsStaticMetadata = { routes: new Map(), trips: new Map(), calendars: new Map(),
      calendarExceptions: new Map(), timezone: "Europe/Oslo" };
    const visits = new Map<string, NonNullable<JourneyIndex["visits"] extends Map<string, infer V> ? V : never>>();
    const stops = new Map<string, JourneyStop>();
    let excluded = 0;
    for (const journeyValue of findAll(routeData, "ServiceJourney")) {
      const journey = asNode(journeyValue);
      const tripId = attr(journey, "id"), patternId = ref(journey, "JourneyPatternRef");
      const pattern = patterns.get(patternId);
      const dayTypes = findAll(journey.dayTypes, "DayTypeRef").map(item => attr(asNode(item), "ref")).filter(Boolean);
      if (!tripId || !pattern || !dayTypes.length) { excluded++; continue; }
      const times = findAll(journey.passingTimes, "TimetabledPassingTime");
      const byPoint = new Map(times.flatMap(passingValue => {
        const passing = asNode(passingValue);
        const pointId = ref(passing, "StopPointInJourneyPatternRef");
        const arrival = text(passing, "ArrivalTime"), departure = text(passing, "DepartureTime");
        if (!pointId || !/^\d{1,3}:[0-5]\d:[0-5]\d$/.test(arrival || departure) ||
          arrival && !/^\d{1,3}:[0-5]\d:[0-5]\d$/.test(arrival) ||
          departure && !/^\d{1,3}:[0-5]\d:[0-5]\d$/.test(departure)) return [];
        return [[pointId, { arrival: arrival || departure, departure: departure || arrival }] as const];
      }));
      const ordered = pattern.points.flatMap((point, sequence) => {
        const time = byPoint.get(point.id);
        return time ? [{ ...point, ...time, sequence }] : [];
      });
      if (ordered.length < 2 || ordered.length !== pattern.points.length || visits.size >= 8_000 ||
        ordered.length + [...visits.values()].reduce((sum, value) => sum + value.length, 0) > 150_000) {
        excluded++; continue;
      }
      const serviceId = tripId;
      const routeCode = text(actualLine, "PublicCode") || text(actualLine, "PrivateCode") || route.shortName;
      metadata.routes.set(routeId, { shortName: routeCode, longName: text(actualLine, "Name") || route.longName, type: null });
      metadata.trips.set(tripId, { routeId, serviceId, directionId: pattern.direction, headsign: pattern.headsign });
      const serviceDates = new Set(dayTypes.flatMap(dayTypeId => [...(operatingDates.get(dayTypeId) ?? [])]));
      for (const date of serviceDates) metadata.calendarExceptions.set(`${date.replaceAll("-", "")}:${serviceId}`, 1);
      if (!serviceDates.size) { metadata.trips.delete(tripId); excluded++; continue; }
      const tripVisits = ordered.map(point => {
        const name = stopNames.get(point.stopId);
        if (!name) throw new TransportDataError("Un arrêt de la ligne ne possède pas de nom publié.");
        stops.set(point.stopId, { id: point.stopId, name, parent: "" });
        return { stopId: point.stopId, sequence: point.sequence, arrival: point.arrival, departure: point.departure,
          pickup: point.pickup, dropoff: point.dropoff };
      });
      visits.set(tripId, tripVisits);
    }
    if (!visits.size) throw new TransportDataError("Aucune course exploitable n’est publiée dans les prochains jours pour cette ligne.");
    return { metadata, routeId, visits, stops, connectionsUnavailable: true,
      ...(excluded ? { sourceWarning: `${excluded} courses ou variantes non interprétables ont été écartées; seuls les horaires complets publiés sont affichés.` } : {}) };
  }

  async journeyIndex(resource: CatalogResource, routeId: string, mode: TransitMode): Promise<JourneyIndex> {
    const result = await this.metadata.staleWhileRevalidateMemory<PackedJourneyIndex>({
      territory: "no", provider: "entur-netex", kind: "journeyIndexes",
      source: `netex-journey:${resource.id}:${routeId}`, version: "netex-journey-index-v1",
    }, 24 * HOURS, 7 * 24 * HOURS,
    async () => encodeJourneyIndex(await this.loadJourneyIndex(resource, routeId, mode), resource.updated ?? ""),
    schedule => {
      const timer = setTimeout(schedule, 2_000);
      timer.unref?.();
    });
    const index = decodeJourneyIndex(result.value, resource.updated ?? "");
    if (result.stale) {
      index.sourceWarning = [index.sourceWarning,
        "La copie d’horaire en cache est conservée pendant l’actualisation Entur; ses heures peuvent ne pas inclure les derniers changements."].filter(Boolean).join(" ");
    }
    return index;
  }
}
