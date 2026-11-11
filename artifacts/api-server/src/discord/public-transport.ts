import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  StringSelectMenuBuilder,
  type Message,
} from "discord.js";
import { logger } from "../lib/logger.js";
import {
  decodeGtfsRealtime,
  decodeGtfsScheduledDepartures,
  parseGtfsRoutesAtStops,
  parseGtfsStaticMetadata,
  type GtfsRouteAtStops,
  type GtfsStaticMetadata,
  type RealtimeDeparture,
  type ScheduledDepartures,
} from "./gtfs-realtime.js";
import { normalizeTransitText, parsePublicTransportQuery, type PublicTransportQuery, type TransitMode } from "./transport-query.js";
import { normalizeCityName, resolveBusJourney } from "./bus-journey.js";
import { isIdfmGtfs, selectiveGtfs, type GtfsSelection } from "./gtfs-selective.js";
import { createHash } from "node:crypto";
import type { TransportTerritory } from "./transport-provider.js";
import { safeQuebecUrl, type Bounds } from "./quebec-sources.js";
import { FranceLocations } from "./france-locations.js";
import { TransportMetadataCache, resourceVersion } from "./transport-metadata-cache.js";
import { regionName, type TransportRegion } from "./transport-regions.js";
import { referenceTable, type ReferenceRoute, type ReferenceStop } from "./transport-reference-tables.js";

const PAN_API = "https://transport.data.gouv.fr/api";
const GEOCODER_API = "https://api-adresse.data.gouv.fr/search/";
const MAX_JSON_BYTES = 25 * 1024 * 1024;
const MAX_STATIC_FEED_BYTES = 80 * 1024 * 1024;
const MAX_REALTIME_FEED_BYTES = 12 * 1024 * 1024;
const MAX_FEED_AGE_SECONDS = 8 * 60;

export interface CatalogResource {
  id: number;
  title: string;
  format: string;
  type?: string;
  url: string;
  original_url?: string;
  is_available: boolean;
  modes?: string[];
  updated?: string;
  /** Catalogue identity, pinned before live downloads update the displayed Last-Modified date. */
  referenceVersion?: string;
  metadata?: Record<string, unknown>;
}

export interface CatalogDataset {
  id: string;
  title: string;
  slug: string;
  page_url: string;
  type: string;
  licence: string;
  resources: CatalogResource[];
  territory?: TransportTerritory;
  bounds?: Bounds;
  modes?: string[];
  limitations?: string[];
  publisher?: { name?: string } | string;
  covered_area?: Array<{ insee?: string; nom?: string; type?: string }>;
}

interface CatalogStop {
  properties?: {
    resource_id?: number;
    stop_id?: string;
    stop_name?: string;
    location_type?: number;
    dataset_title?: string;
  };
}

export interface StopCollection {
  features?: CatalogStop[];
  unavailableResourceIds?: number[];
}

interface GeocodeFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: { type?: string; city?: string; label?: string; name?: string; citycode?: string; postcode?: string; context?: string; depcode?: string };
}

interface GeocodeResponse {
  features?: GeocodeFeature[];
}

interface ResolvedStopGroup {
  dataset: CatalogDataset;
  staticResource: CatalogResource;
  stopIds: Set<string>;
  stopName: string;
  score: number;
}

interface FeedResult {
  departures: RealtimeDeparture[];
  updatedAt: number | null;
  timezone: string;
  sourceName: string;
  sourceUrl: string;
  stopName: string;
  stale: boolean;
}

interface ScheduleResult extends ScheduledDepartures {
  sourceName: string;
  sourceUrl: string;
  stopName: string;
}

interface BusLineListing {
  label: string;
  stopNames: string[];
}

interface BusNetworkListing {
  area: string;
  title: string;
  realtime: boolean;
  lines: BusLineListing[];
}

interface SearchCandidate {
  group: ResolvedStopGroup;
  resources: CatalogResource[];
  staticResource?: CatalogResource;
}

export interface TransportStopChoice {
  value: string;
  label: string;
  description: string;
}

export interface TransportSource {
  name: string;
  url: string;
  updated?: string;
  attribution?: string;
  limitations?: string[];
}

export interface TransportLocation {
  id: string;
  name: string;
  label: string;
  latitude: number;
  longitude: number;
  territory?: TransportTerritory;
  kind?: "station";
}

export type TransportSearchResult =
  | { kind: "answer"; content: string; source?: TransportSource }
  | { kind: "choose-stop"; content: string; choices: TransportStopChoice[] };

type CacheEntry = { expiresAt: number; value: unknown };

function safeHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "gouv.fr" || host.endsWith(".gouv.fr") ||
    host === "api.oisemob.cityway.fr" || host === "geocatalogue.hautsdefrance.fr" ||
    host === "data.toulouse-metropole.fr" || host === "media.ilevia.fr" ||
    host === "ressources.data.sncf.com" || host === "chouette.enroute.mobi" || host === "ara-api.enroute.mobi" ||
    host === "eu.ftp.opendatasoft.com";
}

function safeUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || !safeHostname(url.hostname) || url.username || url.password) {
    throw new Error("Transport provider returned an unsupported resource URL");
  }
  return url;
}

function maxBytesExceeded(response: Response, maxBytes: number): boolean {
  const headerLength = Number(response.headers.get("content-length"));
  return Number.isFinite(headerLength) && headerLength > maxBytes;
}

function normalizeMode(value: string): string {
  return normalizeTransitText(value).replace(/[^a-z0-9]+/g, "");
}

export function modeMatches(mode: TransitMode | null, values: string[] | undefined): boolean {
  if (!mode || !values?.length) return true;
  const normalized = values.map(normalizeMode);
  const accepted: Record<TransitMode, string[]> = {
    bus: ["bus"],
    metro: ["metro", "subway", "underground"],
    rail: ["rail", "train", "rer", "ter", "transilien", "longdistance", "regionalrail"],
    tram: ["tram", "tramway", "streetcar"],
  };
  return normalized.some((value) => accepted[mode].some((candidate) => value.includes(candidate)));
}

function stopScore(query: string, stopName: string): number {
  const ignored = new Set(["de", "du", "des", "la", "le", "les", "l", "a", "au", "aux", "et", "en", "france"]);
  const queryTokens = [...new Set(normalizeTransitText(query).split(/[^a-z0-9]+/).filter((token) => token && !ignored.has(token)))];
  if (!queryTokens.length) return 0;
  const stopTokens = normalizeTransitText(stopName).split(/[^a-z0-9]+/).filter(Boolean);
  if (normalizeTransitText(query) === normalizeTransitText(stopName)) return 1;
  const matches = queryTokens.filter((token) => stopTokens.some((candidate) =>
    candidate === token || candidate.startsWith(token) || token.startsWith(candidate),
  )).length;
  return matches / queryTokens.length;
}

export function isGtfsRealtimeResource(resource: CatalogResource): boolean {
  if (!resource.is_available || !normalizeMode(resource.format).includes("gtfsrt")) return false;
  const descriptor = normalizeTransitText(`${resource.title} ${resource.url}`);
  return !/(service alerts?|situation exchange|alertes?|vehicle.?positions?|position des vehicules|vehicule.?position)/.test(descriptor);
}

export function isStaticScheduleResource(resource: CatalogResource): boolean {
  if (!resource.is_available || normalizeMode(resource.format) !== "gtfs") return false;
  return !/\b(?:tad|flex)\b/i.test(normalizeTransitText(resource.title));
}

export function lineMatches(requestedLine: string, values: Array<string | undefined>): boolean {
  const line = normalizeTransitText(requestedLine);
  if (!line) return false;
  return values.some((value) => {
    const candidate = normalizeTransitText(value ?? "");
    if (!candidate) return false;
    if (/^\d+$/.test(line)) return new RegExp(`(^|\\D)${line}(\\D|$)`).test(candidate);
    return candidate.includes(line);
  });
}

function formatClock(epochSeconds: number, timezone: string, language: string): string {
  const locale = language === "fr" ? "fr-FR" : language === "es" ? "es-ES" : "en-GB";
  try {
    return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(new Date(epochSeconds * 1000));
  } catch {
    return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(epochSeconds * 1000));
  }
}

function filterDepartures(
  departures: RealtimeDeparture[],
  query: PublicTransportQuery,
  datasetModes: string[] | undefined,
): RealtimeDeparture[] {
  return departures.filter((departure) => {
    if (query.mode && departure.mode && departure.mode !== query.mode) return false;
    if (query.mode && !departure.mode && !modeMatches(query.mode, datasetModes)) return false;
    if (query.line && !lineMatches(query.line, [departure.line, departure.routeId])) return false;
    if (query.direction && !normalizeTransitText(departure.destination).includes(normalizeTransitText(query.direction))) return false;
    return true;
  });
}

function makeReply(results: FeedResult[], query: PublicTransportQuery, language: string, nowSeconds: number): string {
  const french = language === "fr";
  const usable = results.filter((result) => !result.stale);
  if (!usable.length) {
    const latest = results
      .filter((result) => result.updatedAt != null)
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];
    if (latest?.updatedAt != null) {
      const age = Math.max(1, Math.round((nowSeconds - latest.updatedAt) / 60));
      return french
        ? `Le flux de ${latest.sourceName} n’a pas été actualisé depuis ${age} min. Je ne peux pas présenter ses horaires comme du temps réel fiable.`
        : `${latest.sourceName}'s feed has not updated for ${age} minutes. I can't present its times as reliable real-time data.`;
    }
    return french
      ? "Le flux de ce réseau ne fournit pas d’horodatage fiable. Je préfère ne pas annoncer un temps d’attente comme s’il était à jour."
      : "This network feed does not provide a reliable update timestamp, so I won't present its wait times as current.";
  }

  const departures = usable.flatMap((result) => result.departures.map((departure) => ({ result, departure })))
    .sort((a, b) => a.departure.departureAt - b.departure.departureAt)
    .slice(0, 8);
  if (!departures.length) {
    const stopName = usable[0]?.stopName ?? query.place;
    const routeHint = query.line ? ` de la ligne **${query.line}**` : "";
    const directionHint = query.direction ? ` en direction de **${query.direction}**` : "";
    return french
      ? `Je n’ai trouvé aucun passage${routeHint}${directionHint} à **${stopName}** dans les flux temps réel disponibles.`
      : `I found no matching real-time departures${routeHint}${directionHint} at **${stopName}** in the available feeds.`;
  }

  const lines = departures.map(({ departure, result }) => {
    const minutes = Math.max(0, Math.round((departure.departureAt - nowSeconds) / 60));
    const time = formatClock(departure.departureAt, result.timezone, language);
    const wait = minutes <= 1
      ? (french ? "à l’instant" : "now")
      : (french ? `dans ${minutes} min` : `in ${minutes} min`);
    const destination = departure.destination ? ` → ${departure.destination}` : "";
    const delay = departure.delaySeconds == null || Math.abs(departure.delaySeconds) < 60
      ? ""
      : departure.delaySeconds > 0
        ? (french ? ` · retard ${Math.round(departure.delaySeconds / 60)} min` : ` · ${Math.round(departure.delaySeconds / 60)} min late`)
        : (french ? ` · ${Math.round(Math.abs(departure.delaySeconds) / 60)} min d’avance` : ` · ${Math.round(Math.abs(departure.delaySeconds) / 60)} min early`);
    return `• **${departure.line}**${destination} — ${wait} (${time})${delay}`;
  });

  const stopNames = [...new Set(usable.map((result) => result.stopName))];
  const latestUpdated = Math.max(...usable.map((result) => result.updatedAt ?? 0));
  const updatedNote = latestUpdated
    ? (french ? `Flux actualisé à ${formatClock(latestUpdated, usable[0]?.timezone ?? "Europe/Paris", language)}.` : `Feed updated at ${formatClock(latestUpdated, usable[0]?.timezone ?? "Europe/Paris", language)}.`)
    : (french ? "Horodatage du flux indisponible." : "Feed timestamp unavailable.");
  const stopLine = stopNames.length === 1 ? stopNames[0]! : stopNames.join(" / ");
  const primarySource = departures[0]?.result.sourceName;
  const sourcesLine = primarySource ? `\nSource : ${primarySource}` : "";
  return `${french ? "Prochains passages" : "Next departures"} à **${stopLine}**\n${lines.join("\n")}\n\n${french ? "Temps réel · " : "Real time · "}${updatedNote}${sourcesLine}`;
}

function makeScheduledReply(results: ScheduleResult[], query: PublicTransportQuery, language: string, nowSeconds: number): string {
  const french = language === "fr";
  const departures = results.flatMap((result) => result.departures.map((departure) => ({ result, departure })))
    .sort((a, b) => a.departure.departureAt - b.departure.departureAt)
    .slice(0, 8);
  const stopNames = [...new Set(results.map((result) => result.stopName))];
  const stopLine = stopNames.length ? stopNames.join(" / ") : query.place;
  if (!departures.length) {
    const routeHint = query.line ? ` de la ligne **${query.line}**` : "";
    const directionHint = query.direction ? ` en direction de **${query.direction}**` : "";
    return french
      ? `Je n’ai pas trouvé de passage programmé${routeHint}${directionHint} dans les trois prochaines heures à **${stopLine}**. Les horaires disponibles sont théoriques, pas en temps réel.`
      : `I found no scheduled departure${routeHint}${directionHint} in the next three hours at **${stopLine}**. Available timetable data is scheduled, not real time.`;
  }

  const lines = departures.map(({ departure, result }) => {
    const minutes = Math.max(0, Math.round((departure.departureAt - nowSeconds) / 60));
    const time = formatClock(departure.departureAt, result.timezone, language);
    const wait = minutes <= 1
      ? (french ? "à l’instant" : "now")
      : (french ? `dans ${minutes} min` : `in ${minutes} min`);
    const destination = departure.destination ? ` → ${departure.destination}` : "";
    return `• **${departure.line}**${destination} — ${wait} (${time})`;
  });
  const primarySource = departures[0]?.result.sourceName;
  const sourcesLine = primarySource ? `\nSource : ${primarySource}` : "";
  return `${french ? "Horaires théoriques (non temps réel)" : "Scheduled times (not real time)"} à **${stopLine}**\n${lines.join("\n")}${sourcesLine}`;
}

export function sourceButton(source: TransportSource | undefined, language: string): ActionRowBuilder<ButtonBuilder>[] {
  if (!source) return [];
  try {
    const url = new URL(source.url);
    if (url.protocol !== "https:") return [];
    if (!["transport.data.gouv.fr", "tfl.gov.uk", "data.bus-data.dft.gov.uk"].includes(url.hostname)) {
      try { safeQuebecUrl(url.href); } catch { return []; }
    }
    return [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel(language === "fr" ? "Ouvrir la source" : "Open source")
          .setStyle(ButtonStyle.Link)
          .setURL(url.href),
      ),
    ];
  } catch {
    return [];
  }
}

export class FranceTransportClient {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly pending = new Map<string, Promise<unknown>>();
  private readonly staticFiles = new Map<string, { bytes: Uint8Array; expiresAt: number }>();
  private staticDownloads = 0;
  private readonly downloadQueue: Array<() => void> = [];
  private readonly locations = new FranceLocations((url, maxBytes) =>
    this.cached(`locations:${url}`, 6 * 60 * 60_000, () => this.fetchJson(url, maxBytes)));

  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly now: () => number = Date.now,
    readonly metadata = new TransportMetadataCache(undefined, now),
  ) {}

  private async cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const currentTime = this.now();
    for (const [cacheKey, entry] of this.cache) {
      if (entry.expiresAt <= currentTime) this.cache.delete(cacheKey);
    }
    const existing = this.cache.get(key);
    if (existing && existing.expiresAt > currentTime) return existing.value as T;
    const inFlight = this.pending.get(key);
    if (inFlight) return inFlight as Promise<T>;

    const request = load().then((value) => {
      if (this.cache.size >= 500) this.cache.delete(this.cache.keys().next().value as string);
      this.cache.set(key, { value, expiresAt: this.now() + ttlMs });
      return value;
    }).finally(() => this.pending.delete(key));
    this.pending.set(key, request);
    return request;
  }

  private async fetchPublic(url: string, accept: string, options: { headers?: Record<string, string>; timeoutMs?: number } = {}): Promise<Response> {
    let current = safeUrl(url);
    for (let redirect = 0; redirect <= 3; redirect++) {
      const response = await this.fetcher(current.href, {
        headers: { accept, "user-agent": "MaximeGPT public-transport lookup", ...options.headers },
        signal: AbortSignal.timeout(options.timeoutMs ?? 9_000),
        redirect: "manual",
      });
      if (![301, 302, 303, 307, 308].includes(response.status)) return response;
      const location = response.headers.get("location");
      await response.body?.cancel().catch(() => undefined);
      if (!location) throw new Error("Transport resource redirect is missing its target");
      current = safeUrl(new URL(location, current).href);
    }
    throw new Error("Transport resource exceeded the redirect limit");
  }

  private async fetchJson<T>(url: string, maxBytes = MAX_JSON_BYTES): Promise<T> {
    const response = await this.fetchPublic(url, "application/json");
    if (!response.ok) throw new Error(`Transport data request returned ${response.status}`);
    if (maxBytesExceeded(response, maxBytes)) throw new Error("Transport JSON response exceeds its size limit");
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > maxBytes) throw new Error("Transport JSON response exceeds its size limit");
    return JSON.parse(text) as T;
  }

  async fetchBytes(url: string, maxBytes: number): Promise<Uint8Array> {
    const response = await this.fetchPublic(url, "application/octet-stream, application/zip, application/x-protobuf, */*");
    if (!response.ok) throw new Error(`Transport feed request returned ${response.status}`);
    if (maxBytesExceeded(response, maxBytes)) throw new Error("Transport feed exceeds its size limit");
    const reader = response.body?.getReader();
    if (!reader) return new Uint8Array();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > maxBytes) throw new Error("Transport feed exceeds its size limit");
        chunks.push(value);
      }
    } catch (error) {
      await reader.cancel().catch(() => undefined);
      throw error;
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return bytes;
  }

  getCatalog(): Promise<CatalogDataset[]> {
    return this.metadata.get({ territory: "fr", provider: "pan", kind: "catalog", source: `${PAN_API}/datasets`, version: "catalog-v1" },
      15 * 60_000, () => this.fetchJson<CatalogDataset[]>(`${PAN_API}/datasets`));
  }

  async region(place: string): Promise<TransportRegion | null> {
    if (!regionName(place) || /\d/.test(place)) return null;
    const areas = (source: string) => this.metadata.get<Array<{ code: string; nom: string; codesRegions?: string[] }>>(
      { territory: "fr", provider: "geo", kind: "areas", source, version: "administration-v1" },
      24 * 3600_000, () => this.fetchJson(source, 2_000_000));
    const regions = await areas("https://geo.api.gouv.fr/regions");
    const region = regions.find(r => regionName(r.nom) === regionName(place));
    if (!region) return null;
    const [departments, epcis] = await Promise.all([
      areas(`https://geo.api.gouv.fr/regions/${region.code}/departements`),
      areas("https://geo.api.gouv.fr/epcis?fields=code,nom,codesRegions,codesDepartements"),
    ]);
    return { code: region.code, name: region.nom, departmentCodes: departments.map(d => d.code),
      epciCodes: epcis.filter(e => e.codesRegions?.includes(region.code)).map(e => e.code) };
  }

  private referenceRequest(resource: CatalogResource) {
    let url = resource.url;
    try { if (resource.original_url) url = safeUrl(resource.original_url).href; } catch { /* Catalogue fallback. */ }
    return (range: string, validator?: Record<string, string>) => this.fetchPublic(url, "application/zip",
      { headers: { ...validator, range }, timeoutMs: 20_000 });
  }
  referenceRoutes(resource: CatalogResource): Promise<ReferenceRoute[]> {
    return this.metadata.get({ territory: "fr", provider: "pan", kind: "routes", source: `routes:${resource.id}`, version: resourceVersion(resource) },
      6 * 3600_000, () => referenceTable(resource, "routes.txt", this.referenceRequest(resource), () => this.staticFeed(resource)));
  }
  referenceStops(resource: CatalogResource): Promise<ReferenceStop[]> {
    return this.metadata.get({ territory: "fr", provider: "pan", kind: "stops", source: `stops:${resource.id}`, version: resourceVersion(resource) },
      6 * 3600_000, () => referenceTable(resource, "stops.txt", this.referenceRequest(resource), () => this.staticFeed(resource)));
  }

  async municipalities(place: string): Promise<TransportLocation[]> {
    const normalized = normalizeTransitText(place);
    return this.metadata.get({ territory: "fr", provider: "geo", kind: "locations",
      source: `commune-search:${normalized}`, version: "geo-api-v1" }, 24 * 3600_000, async () =>
      await this.locations.numeric(place) ?? this.locations.named(place));
  }

  async railLocations(place: string): Promise<TransportLocation[]> {
    const cities = await this.municipalities(place);
    return this.locations.stations(place, cities);
  }
  transportAnchor(city: TransportLocation): Promise<TransportLocation> { return this.locations.anchor(city); }

  async staticFeed(resource: CatalogResource, selection?: GtfsSelection): Promise<Uint8Array> {
    for (const [id, entry] of this.staticFiles) {
      if (entry.expiresAt <= this.now()) this.staticFiles.delete(id);
    }
    const selective = selection?.mode === "metro" && isIdfmGtfs(resource);
    const scope = selection?.discoveryStops
      ? `stops:${createHash("sha256").update([...selection.discoveryStops].sort().join("\n")).digest("hex").slice(0, 24)}`
      : normalizeTransitText(selection?.line ?? "*");
    const cacheId = selective ? `${resource.id}:metro:${scope}` : String(resource.id);
    const hit = this.staticFiles.get(cacheId);
    if (hit) return hit.bytes;
    const key = `static-file:${cacheId}`;
    const pending = this.pending.get(key);
    if (pending) return pending as Promise<Uint8Array>;
    const load = selective ? this.withStaticSlot(() => selectiveGtfs((range, validator) =>
      this.fetchPublic(resource.original_url!, "application/zip", { headers: { ...validator, range }, timeoutMs: 35_000 }),
    selection)) : this.downloadStaticResource(resource);
    const request = load.then((bytes) => {
      // Binary feeds have their own small memory budget, not the generic 500-entry cache.
      if (bytes.length <= MAX_STATIC_FEED_BYTES) {
        let size = [...this.staticFiles.values()].reduce((sum, item) => sum + item.bytes.length, 0);
        while (size + bytes.length > MAX_STATIC_FEED_BYTES && this.staticFiles.size) {
          const id = this.staticFiles.keys().next().value!;
          size -= this.staticFiles.get(id)!.bytes.length;
          this.staticFiles.delete(id);
        }
        this.staticFiles.set(cacheId, { bytes, expiresAt: this.now() + 15 * 60_000 });
      }
      return bytes;
    }).finally(() => this.pending.delete(key));
    this.pending.set(key, request);
    return request;
  }

  private async downloadStaticResource(resource: CatalogResource): Promise<Uint8Array> {
    // The catalogue redirect service can be slow/down while the published
    // operator URL still works. Apply the same allowlist to both paths.
    let direct: string | undefined;
    if (resource.original_url && resource.original_url !== resource.url) {
      try { direct = safeUrl(resource.original_url).href; } catch { /* Use the catalogue URL instead. */ }
    }
    if (direct) {
      try { return await this.downloadStatic(direct); }
      catch (error) {
        logger.debug({ resourceId: resource.id, err: error }, "Transport operator download unavailable; trying catalogue");
      }
    }
    return this.downloadStatic(resource.url);
  }

  private async downloadStatic(url: string): Promise<Uint8Array> {
    return this.withStaticSlot(() => this.fetchBytes(url, MAX_STATIC_FEED_BYTES));
  }

  private async withStaticSlot<T>(load: () => Promise<T>): Promise<T> {
    if (this.staticDownloads >= 1) {
      if (this.downloadQueue.length >= 8) throw new Error("Transport downloads are busy");
      await new Promise<void>((resolve) => this.downloadQueue.push(resolve));
    } else this.staticDownloads++;
    try {
      return await load();
    } finally {
      const next = this.downloadQueue.shift();
      if (next) next();
      else this.staticDownloads--;
    }
  }

  private geocode(place: string, municipalityOnly = false): Promise<GeocodeFeature | null> {
    const url = new URL(GEOCODER_API);
    url.searchParams.set("q", place);
    url.searchParams.set("limit", "1");
    if (municipalityOnly) url.searchParams.set("type", "municipality");
    return this.cached(`geocode:${municipalityOnly ? "city" : "any"}:${normalizeTransitText(place)}`, 6 * 60 * 60_000, async () => {
      const result = await this.fetchJson<GeocodeResponse>(url.href, 1_000_000);
      return result.features?.[0] ?? null;
    });
  }

  private isExactCity(feature: GeocodeFeature | null, place: string): boolean {
    return feature?.properties?.type === "municipality" &&
      normalizeCityName(feature.properties.city ?? feature.properties.name ?? "") === normalizeCityName(place);
  }

  private async locateCityOrStop(place: string): Promise<GeocodeFeature | null> {
    const city = await this.geocode(place, true);
    return this.isExactCity(city, place) ? city : this.geocode(place);
  }

  async resolveBusQuery(location: string, line: string): Promise<PublicTransportQuery> {
    const journey = await resolveBusJourney(location, async (name) => {
      const city = await this.geocode(name, true);
      return this.isExactCity(city, name) ? city!.properties!.city ?? city!.properties!.name ?? name : null;
    });
    return { ...journey, mode: "bus", line, allowNearbyStops: true };
  }

  nearbyStops(latitude: number, longitude: number, radius = 0.009): Promise<StopCollection> {
    const longitudeRadius = radius / Math.max(0.2, Math.cos(latitude * Math.PI / 180));
    const url = new URL(`${PAN_API}/gtfs-stops`);
    url.searchParams.set("south", String(latitude - radius));
    url.searchParams.set("north", String(latitude + radius));
    url.searchParams.set("west", String(longitude - longitudeRadius));
    url.searchParams.set("east", String(longitude + longitudeRadius));
    return this.metadata.get({ territory: "fr", provider: "pan", kind: "nearby", source: url.href, version: "stop-reference-v1" },
      60 * 60_000, () => this.fetchJson<StopCollection>(url.href, 15 * 1024 * 1024));
  }

  private staticMetadata(resource: CatalogResource): Promise<GtfsStaticMetadata | null> {
    if (!resource.url || !resource.is_available) return Promise.resolve(null);
    return this.cached(`gtfs-static:${resource.id}`, 12 * 60 * 60_000, async () => {
      try {
        const bytes = await this.fetchBytes(resource.url, MAX_STATIC_FEED_BYTES);
        return parseGtfsStaticMetadata(bytes);
      } catch (error) {
        logger.debug({ resourceId: resource.id, err: error }, "GTFS static metadata unavailable");
        return null;
      }
    });
  }

  private routesAtStops(resource: CatalogResource, stopIds: ReadonlySet<string>): Promise<GtfsRouteAtStops[]> {
    if (!resource.url || !isStaticScheduleResource(resource) || !stopIds.size) return Promise.resolve([]);
    const stopKey = [...stopIds].sort().join(",");
    return this.cached(`gtfs-routes:${resource.id}:${stopKey}`, 12 * 60 * 60_000, async () => {
      const bytes = await this.fetchBytes(resource.url, MAX_STATIC_FEED_BYTES);
      return parseGtfsRoutesAtStops(bytes, stopIds);
    }).catch((error) => {
      logger.debug({ resourceId: resource.id, err: error }, "GTFS routes at stops unavailable");
      return [];
    });
  }

  realtimeFeed(resource: CatalogResource): Promise<Uint8Array> {
    return this.cached(`gtfs-realtime:${resource.id}`, 12_000, () =>
      this.fetchBytes(resource.url, MAX_REALTIME_FEED_BYTES),
    );
  }

  private scheduledDepartures(resource: CatalogResource, stopIds: ReadonlySet<string>, nowSeconds: number): Promise<ScheduledDepartures> {
    const stopKey = [...stopIds].sort().join(",");
    return this.cached(`gtfs-schedule:${resource.id}:${stopKey}`, 60_000, async () => {
      const bytes = await this.fetchBytes(resource.url, MAX_STATIC_FEED_BYTES);
      return decodeGtfsScheduledDepartures(bytes, stopIds, nowSeconds);
    });
  }

  private resolveGroups(
    features: CatalogStop[],
    catalog: CatalogDataset[],
    query: PublicTransportQuery,
  ): ResolvedStopGroup[] {
    const resourceToDataset = new Map<number, { dataset: CatalogDataset; resource: CatalogResource }>();
    for (const dataset of catalog) {
      if (dataset.type !== "public-transit") continue;
      for (const resource of dataset.resources ?? []) resourceToDataset.set(resource.id, { dataset, resource });
    }

    const groups = new Map<string, ResolvedStopGroup>();
    for (const feature of features) {
      const stop = feature.properties;
      const stopId = stop?.stop_id;
      const stopName = stop?.stop_name?.trim();
      if (!stopId || !stopName || stop.location_type === 2 || stop.location_type === 3 || stop.location_type === 4) continue;
      const match = resourceToDataset.get(Number(stop.resource_id));
      if (!match || !modeMatches(query.mode, match.resource.modes)) continue;
      if (normalizeMode(match.resource.format) === "gtfs" && !isStaticScheduleResource(match.resource)) continue;
      const score = stopScore(query.place, stopName);
      if (!query.allowNearbyStops && score < 0.45) continue;

      const key = `${match.dataset.id}:${match.resource.id}`;
      const current = groups.get(key);
      if (current) {
        current.stopIds.add(stopId);
        if (score > current.score) {
          current.stopName = stopName;
          current.score = score;
        }
      } else {
        groups.set(key, {
          dataset: match.dataset,
          staticResource: match.resource,
          stopIds: new Set([stopId]),
          stopName,
          score,
        });
      }
    }
    return [...groups.values()].sort((a, b) => b.score - a.score).slice(0, query.allowNearbyStops ? 40 : 8);
  }

  private async filterGroupsByLine(
    groups: ResolvedStopGroup[],
    query: PublicTransportQuery,
    features: CatalogStop[],
  ): Promise<ResolvedStopGroup[]> {
    if (!query.line) return groups;
    const stopNames = new Map((features ?? []).flatMap((feature) => {
      const stopId = feature.properties?.stop_id;
      const stopName = feature.properties?.stop_name?.trim();
      return stopId && stopName ? [[stopId, stopName] as const] : [];
    }));

    const matched = await Promise.all(groups.map(async (group) => {
      const staticResource = isStaticScheduleResource(group.staticResource)
        ? group.staticResource
        : group.dataset.resources.find(isStaticScheduleResource);
      if (!staticResource) return [];

      const routes = await this.routesAtStops(staticResource, group.stopIds);
      const routeMatches = routes.filter((route) =>
        lineMatches(query.line!, [route.shortName, route.longName, route.routeId]) &&
        (!query.mode || route.mode === query.mode || (route.mode == null && modeMatches(query.mode, staticResource.modes))),
      );
      if (!routeMatches.length) return [];

      const servedStopIds = new Set(routeMatches.flatMap((route) => route.stopIds));
      const stopIds = [...group.stopIds].filter((stopId) => servedStopIds.has(stopId));
      if (!query.allowNearbyStops) {
        return stopIds.length ? [{ ...group, stopIds: new Set(stopIds) }] : [];
      }
      return stopIds.map((stopId) => ({
        ...group,
        stopIds: new Set([stopId]),
        stopName: stopNames.get(stopId) ?? group.stopName,
      }));
    }));

    return matched.flat().sort((a, b) => b.score - a.score).slice(0, 25);
  }

  async listBusDirectory(language: string, prefix = "!"): Promise<string> {
    const catalog = await this.getCatalog();
    const french = language === "fr";
    const entries = catalog
      .filter((dataset) => {
        const publisher = typeof dataset.publisher === "string" ? dataset.publisher : dataset.publisher?.name ?? "";
        const coversOise = dataset.covered_area?.some((area) => area.insee === "60");
        const isOiseMobility = normalizeTransitText(publisher).includes("oise mobilite");
        const hasUsableData = dataset.resources.some((resource) =>
          isStaticScheduleResource(resource) || isGtfsRealtimeResource(resource),
        );
        return dataset.type === "public-transit" && (coversOise || isOiseMobility) && hasUsableData &&
          !normalizeTransitText(dataset.title).startsWith("tad ");
      })
      .map((dataset) => ({
        area: dataset.covered_area?.map((area) => area.nom).filter(Boolean).join(", ") || (french ? "Oise" : "Oise, France"),
        title: dataset.title,
        realtime: dataset.resources.some(isGtfsRealtimeResource),
      }))
      .sort((a, b) => a.area.localeCompare(b.area, language) || a.title.localeCompare(b.title, language));

    if (!entries.length) {
      return french
        ? "Je n’arrive pas à charger le catalogue des réseaux de bus pour le moment. Réessaie dans quelques instants."
        : "I can't load the bus-network directory right now. Please try again shortly.";
    }

    const items = entries.map((entry) =>
      `• **${entry.area}** — ${entry.title} · ${entry.realtime
        ? (french ? "temps réel référencé" : "real-time feed listed")
        : (french ? "horaires théoriques" : "scheduled times")}`,
    );
    const header = french
      ? "Réseaux de bus référencés dans l’Oise :"
      : "Bus networks listed for Oise, France:";
    const footer = french
      ? `\nLa disponibilité réelle est contrôlée à chaque recherche. \`${prefix}bus <ville>\` liste les lignes ; \`${prefix}bus <ville> <ligne>\` donne les prochains passages. La recherche fonctionne aussi ailleurs en France.`
      : `\nFeed availability is checked for each lookup. \`${prefix}bus <city>\` lists routes; \`${prefix}bus <city> <line>\` shows upcoming departures. The lookup also works elsewhere in France.`;
    let body = items.join("\n");
    while (`${header}\n${body}${footer}`.length > 1_900 && items.length > 1) {
      items.pop();
      body = items.join("\n");
    }
    return `${header}\n${body}${footer}`;
  }

  async listBusCity(city: string, language: string, prefix = "!"): Promise<string> {
    const french = language === "fr";
    const [catalog, geocoded] = await Promise.all([this.getCatalog(), this.locateCityOrStop(city)]);
    const coordinates = geocoded?.geometry?.coordinates;
    if (!coordinates || !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1])) {
      return french
        ? `Je ne trouve pas « ${city} » en France. Vérifie le nom de la ville.`
        : `I couldn't locate “${city}” in France. Check the city name.`;
    }

    const features = (await this.nearbyStops(coordinates[1], coordinates[0], 0.025)).features ?? [];
    const query: PublicTransportQuery = { place: city, mode: "bus", allowNearbyStops: true };
    const groups = this.resolveGroups(features, catalog, query);
    const stopNames = new Map(features.flatMap((feature) => {
      const stopId = feature.properties?.stop_id;
      const stopName = feature.properties?.stop_name?.trim();
      return stopId && stopName ? [[stopId, stopName] as const] : [];
    }));

    const networkResults = await Promise.all(groups.map(async (group): Promise<BusNetworkListing | null> => {
      const resource = isStaticScheduleResource(group.staticResource)
        ? group.staticResource
        : group.dataset.resources.find(isStaticScheduleResource);
      if (!resource) return null;
      const routes = await this.routesAtStops(resource, group.stopIds);
      const busRoutes = routes.filter((route) =>
        route.mode === "bus" || (route.mode == null && modeMatches("bus", resource.modes)),
      );
      if (!busRoutes.length) return null;

      const lines = new Map<string, Set<string>>();
      for (const route of busRoutes) {
        const label = route.shortName || route.longName || route.routeId;
        const names = lines.get(label) ?? new Set<string>();
        for (const stopId of route.stopIds) {
          const stopName = stopNames.get(stopId);
          if (stopName) names.add(stopName);
        }
        lines.set(label, names);
      }
      return {
        area: group.dataset.covered_area?.map((area) => area.nom).filter(Boolean).join(", ") || group.dataset.title,
        title: group.dataset.title,
        realtime: group.dataset.resources.some(isGtfsRealtimeResource),
        lines: [...lines.entries()]
          .map(([label, names]) => ({ label, stopNames: [...names].sort((a, b) => a.localeCompare(b, language)) }))
          .sort((a, b) => a.label.localeCompare(b.label, language, { numeric: true })),
      };
    }));

    const byNetwork = new Map<string, BusNetworkListing>();
    for (const result of networkResults) {
      if (!result) continue;
      const current = byNetwork.get(result.title);
      if (!current) {
        byNetwork.set(result.title, result);
        continue;
      }
      const merged = new Map(current.lines.map((line) => [line.label, new Set(line.stopNames)]));
      for (const line of result.lines) {
        const names = merged.get(line.label) ?? new Set<string>();
        line.stopNames.forEach((name) => names.add(name));
        merged.set(line.label, names);
      }
      current.lines = [...merged.entries()]
        .map(([label, names]) => ({ label, stopNames: [...names].sort((a, b) => a.localeCompare(b, language)) }))
        .sort((a, b) => a.label.localeCompare(b.label, language, { numeric: true }));
    }

    const networks = [...byNetwork.values()].sort((a, b) =>
      Number(b.realtime) - Number(a.realtime) || a.title.localeCompare(b.title, language),
    );
    if (!networks.length) {
      return french
        ? `Aucune ligne de bus avec horaires ouverts n’a été repérée près de **${city}**. Essaie une ville voisine ou un nom d’arrêt précis.`
        : `No bus routes with open timetable data were found near **${city}**. Try a nearby city or an exact stop name.`;
    }

    const header = french
      ? `Lignes de bus repérées près de **${city}** :`
      : `Bus routes found near **${city}**:`;
    const body = networks.slice(0, 10).map((network) => {
      const labels = network.lines.slice(0, 18).map((line) => `\`${line.label}\``).join(", ");
      const more = network.lines.length > 18 ? (french ? ", …" : ", …") : "";
      const status = network.realtime
        ? (french ? "temps réel référencé" : "real-time feed listed")
        : (french ? "horaires théoriques" : "scheduled times");
      return `• **${network.title}** · ${status}\n  ${french ? "Lignes" : "Routes"} : ${labels}${more}`;
    });
    const footer = french
      ? `\nPour les passages : \`${prefix}bus ${city} <ligne>\`, ou \`${prefix}bus ${city} vers <destination> <ligne>\`. Si plusieurs arrêts correspondent, le bot te demandera de choisir.`
      : `\nFor departures: \`${prefix}bus ${city} <line>\`, or \`${prefix}bus ${city} to <destination> <line>\`. If several stops match, the bot will ask you to choose.`;
    let content = `${header}\n${body.join("\n")}${footer}`;
    while (content.length > 1_900 && body.length > 1) {
      body.pop();
      content = `${header}\n${body.join("\n")}${footer}`;
    }
    return content.length > 1_900 ? `${content.slice(0, 1_895)}…` : content;
  }

  async search(query: PublicTransportQuery, language: string, selectedChoice?: string): Promise<TransportSearchResult> {
    if (query.place.length < 2) {
      return {
        kind: "answer",
        content: language === "fr"
          ? "Indique l’arrêt ou la gare recherché, avec sa ville (par exemple : « métro à Châtelet, Paris »)."
          : "Please include a stop or station and its city (for example: “metro at Châtelet, Paris”).",
      };
    }

    const [catalog, geocoded] = await Promise.all([
      this.getCatalog(),
      query.allowNearbyStops ? this.locateCityOrStop(query.place) : this.geocode(query.place),
    ]);
    const coordinates = geocoded?.geometry?.coordinates;
    if (!coordinates || !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1])) {
      return {
        kind: "answer",
        content: language === "fr"
          ? `Je ne trouve pas « ${query.place} » en France. Essaie avec le nom exact de l’arrêt et sa ville.`
          : `I couldn't locate “${query.place}” in France. Try the exact stop name and city.`,
      };
    }
    const latitude = coordinates[1];
    const longitude = coordinates[0];
    const geocodeType = normalizeTransitText(geocoded.properties?.type ?? "");
    const placeTokens = normalizeTransitText(query.place).split(/[^a-z0-9]+/).filter(Boolean);
    const includesStopHint = /\b(?:gare|station|arr[eê]t|stop|halte|a[eé]roport)\b/i.test(query.place);
    const cityTokens = normalizeTransitText(geocoded.properties?.city ?? "").split(/[^a-z0-9]+/).filter(Boolean);
    const hasSpecificPlace = placeTokens.some((token) => !cityTokens.includes(token) && token !== "france");
    if (geocodeType === "municipality" && !includesStopHint && !hasSpecificPlace && !query.allowNearbyStops) {
      return {
        kind: "answer",
        content: language === "fr"
          ? `Dans quelle gare ou à quel arrêt de ${geocoded.properties?.city ?? query.place} veux-tu les prochains passages ?`
          : `Which station or stop in ${geocoded.properties?.city ?? query.place} do you want departures for?`,
      };
    }

    const stopData = await this.nearbyStops(latitude, longitude, query.allowNearbyStops ? 0.025 : 0.009);
    const groups = this.resolveGroups(stopData.features ?? [], catalog, query);
    if (!groups.length) {
      return {
        kind: "answer",
        content: language === "fr"
          ? `Je ne trouve pas d’arrêt correspondant à « ${query.place} » dans les données nationales référencées. Précise le nom exact de l’arrêt et la ville.`
          : `I couldn't find a matching stop for “${query.place}” in the national transport catalogue. Please give the exact stop name and city.`,
      };
    }

    const lineGroups = query.line
      ? await this.filterGroupsByLine(groups, query, stopData.features ?? [])
      : groups;
    if (query.line && !lineGroups.length) {
      return {
        kind: "answer",
        content: language === "fr"
          ? `Je ne trouve pas la ligne **${query.line}** dans les horaires de bus autour de **${query.place}**. Utilise \`!bus ${query.place}\` pour voir les lignes repérées.`
          : `I couldn't find line **${query.line}** in the bus timetables around **${query.place}**. Use \`!bus ${query.place}\` to see detected lines.`,
      };
    }

    const allCandidates: SearchCandidate[] = lineGroups.map((group) => ({
      group,
      resources: group.dataset.resources.filter(isGtfsRealtimeResource).slice(0, 2),
      staticResource: isStaticScheduleResource(group.staticResource)
        ? group.staticResource
        : group.dataset.resources.find(isStaticScheduleResource),
    })).filter((candidate) => candidate.resources.length > 0 || candidate.staticResource != null);

    if (selectedChoice !== undefined) {
      const selectedIndex = Number(selectedChoice);
      if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= allCandidates.length) {
        return {
          kind: "answer",
          content: language === "fr" ? "Ce choix d’arrêt n’est plus disponible. Relance ta demande." : "That stop choice is no longer available. Please ask again.",
        };
      }
    } else {
      const topScore = allCandidates[0]?.group.score ?? 0;
      const likelyCandidates = allCandidates.filter((candidate) => candidate.group.score >= topScore - 0.16);
      const distinctStops = new Set(likelyCandidates.map((candidate) => normalizeTransitText(candidate.group.stopName)));
      if (distinctStops.size > 1) {
        const choices: TransportStopChoice[] = allCandidates.slice(0, 25).map((candidate, index) => ({
          value: String(index),
          label: candidate.group.stopName.slice(0, 100),
          description: candidate.group.dataset.title.slice(0, 100),
        }));
        return {
          kind: "choose-stop",
          content: language === "fr"
            ? "Plusieurs arrêts proches correspondent. Choisis celui que tu veux :"
            : "Several nearby stops match. Choose the one you mean:",
          choices,
        };
      }
    }

    const candidates = selectedChoice === undefined
      ? allCandidates
      : [allCandidates[Number(selectedChoice)]!];

    if (!candidates.length) {
      return {
        kind: "answer",
        content: language === "fr"
          ? `Je n’ai trouvé aucun flux ni horaire GTFS ouvert pour **${groups[0]?.stopName ?? query.place}**.`
          : `I found no open real-time feed or GTFS timetable for **${groups[0]?.stopName ?? query.place}**.`,
      };
    }

    const nowSeconds = Math.floor(this.now() / 1000);
    const realtimeCandidates = candidates.filter((candidate) => candidate.resources.length > 0);
    if (!realtimeCandidates.length) {
      const schedules = await this.loadSchedules(candidates, query, nowSeconds);
      const primary = schedules.find((result) => result.departures.length);
      return {
        kind: "answer",
        content: makeScheduledReply(schedules, query, language, nowSeconds),
        ...(primary ? { source: { name: primary.sourceName, url: primary.sourceUrl } } : {}),
      };
    }

    const results = await Promise.all(realtimeCandidates.flatMap(({ group, resources, staticResource }) =>
      resources.map(async (resource): Promise<FeedResult | null> => {
        try {
          const [bytes, metadata] = await Promise.all([
            this.realtimeFeed(resource),
            staticResource ? this.staticMetadata(staticResource) : Promise.resolve(null),
          ]);
          const decoded = decodeGtfsRealtime(bytes, group.stopIds, metadata ?? undefined, nowSeconds);
          const departures = filterDepartures(decoded.departures, query, group.staticResource.modes)
            .filter((departure) => departure.departureAt >= nowSeconds - 20)
            .slice(0, 12);
          const updatedAt = decoded.updatedAt;
          const age = updatedAt == null ? null : nowSeconds - updatedAt;
          return {
            departures,
            updatedAt,
            timezone: metadata?.timezone || "Europe/Paris",
            sourceName: group.dataset.title,
            sourceUrl: group.dataset.page_url,
            stopName: group.stopName,
            stale: age == null || age < -5 * 60 || age > MAX_FEED_AGE_SECONDS,
          };
        } catch (error) {
          logger.debug({ resourceId: resource.id, err: error }, "GTFS-RT feed unavailable");
          return null;
        }
      }),
    ));

    const validResults = results.filter((result): result is FeedResult => result !== null);
    if (!validResults.length) {
      const schedules = await this.loadSchedules(candidates, query, nowSeconds);
      const primary = schedules.find((result) => result.departures.length);
      if (primary) {
        return {
          kind: "answer",
          content: makeScheduledReply(schedules, query, language, nowSeconds),
          source: { name: primary.sourceName, url: primary.sourceUrl },
        };
      }
      return {
        kind: "answer",
        content: language === "fr"
          ? "Les flux de ce réseau sont momentanément indisponibles et aucun horaire programmé exploitable n’a été trouvé. Réessaie dans quelques instants."
          : "This network's live feeds are temporarily unavailable, and no usable scheduled timetable was found. Please try again shortly.",
      };
    }
    const primary = validResults
      .filter((result) => !result.stale && result.departures.length)
      .sort((a, b) => a.departures[0]!.departureAt - b.departures[0]!.departureAt)[0];
    return {
      kind: "answer",
      content: makeReply(validResults, query, language, nowSeconds),
      ...(primary ? { source: { name: primary.sourceName, url: primary.sourceUrl } } : {}),
    };
  }

  private async loadSchedules(candidates: SearchCandidate[], query: PublicTransportQuery, nowSeconds: number): Promise<ScheduleResult[]> {
    return (await Promise.all(candidates
      .filter((candidate): candidate is SearchCandidate & { staticResource: CatalogResource } => candidate.staticResource != null)
      .map(async ({ group, staticResource }) => {
        try {
          const decoded = await this.scheduledDepartures(staticResource, group.stopIds, nowSeconds);
          return {
            ...decoded,
            departures: filterDepartures(decoded.departures, query, group.staticResource.modes),
            sourceName: group.dataset.title,
            sourceUrl: group.dataset.page_url,
            stopName: group.stopName,
          };
        } catch (error) {
          logger.debug({ resourceId: staticResource.id, err: error }, "GTFS scheduled timetable unavailable");
          return null;
        }
      }))).filter((result): result is ScheduleResult => result !== null);
  }
}

const franceTransport = new FranceTransportClient();

async function replyWithTransportResult(
  message: Message,
  query: PublicTransportQuery,
  result: TransportSearchResult,
  language: string,
  menuId: string,
): Promise<void> {
  if (result.kind === "answer") {
    await message.reply({
      content: result.content,
      components: sourceButton(result.source, language),
      allowedMentions: { parse: [] },
    });
    return;
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(menuId)
    .setPlaceholder(language === "fr" ? "Choisir un arrêt" : "Choose a stop")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(result.choices.map((choice) => ({
      label: choice.label,
      value: choice.value,
      description: choice.description,
    })));
  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
  const prompt = await message.reply({
    content: result.content,
    components: [row],
    allowedMentions: { parse: [] },
  });
  const collector = prompt.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 60_000,
  });
  collector.on("collect", async (interaction) => {
    if (interaction.user.id !== message.author.id) {
      await interaction.reply({
        content: language === "fr" ? "Seule la personne qui a demandé les horaires peut choisir l’arrêt." : "Only the person who requested the departures can choose the stop.",
        ephemeral: true,
      }).catch(() => undefined);
      return;
    }
    collector.stop("selected");
    await interaction.deferUpdate().catch(() => undefined);
    try {
      const selected = await franceTransport.search(query, language, interaction.values[0]);
      await prompt.edit({
        content: selected.kind === "answer" ? selected.content : result.content,
        components: selected.kind === "answer" ? sourceButton(selected.source, language) : [],
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      logger.warn({ err: error }, "Selected public transport lookup failed");
      await prompt.edit({
        content: language === "fr"
          ? "Je n’arrive pas à récupérer les données de transport pour le moment. Réessaie dans quelques instants."
          : "I can't retrieve transport data right now. Please try again shortly.",
        components: [],
      }).catch(() => undefined);
    }
  });
  collector.on("end", (_collected, reason) => {
    if (reason !== "selected") void prompt.edit({ components: [] }).catch(() => undefined);
  });
}

export async function handlePublicTransportRequest(message: Message, text: string, language: string): Promise<boolean> {
  const query = parsePublicTransportQuery(text);
  if (!query) return false;

  try {
    if (message.channel.isSendable()) await message.channel.sendTyping().catch(() => undefined);
    const result = await franceTransport.search(query, language);
    await replyWithTransportResult(message, query, result, language, "public_transport_stop_choice");
  } catch (error) {
    logger.warn({ err: error }, "Public transport lookup failed");
    await message.reply(language === "fr"
      ? "Je n’arrive pas à récupérer les données de transport pour le moment. Réessaie dans quelques instants."
      : "I can't retrieve transport data right now. Please try again shortly.");
  }
  return true;
}

export async function handleBusCommand(
  message: Message,
  args: string[],
  language: string,
  prefix = "!",
): Promise<void> {
  const { handleTransportCommand } = await import("./transport-menu.js");
  await handleTransportCommand(message, args, language, prefix, "bus");
}
