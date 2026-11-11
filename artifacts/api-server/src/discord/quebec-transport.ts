import { createHash } from "node:crypto";
import type { CatalogDataset, CatalogResource, StopCollection, TransportLocation } from "./public-transport.js";
import { normalizeTransitText } from "./transport-query.js";
import type { TransportProvider } from "./transport-provider.js";
import { GtfsRangeArchive } from "./gtfs-range.js";
import { selectiveGtfs, type GtfsSelection } from "./gtfs-selective.js";
import { scanRows } from "./gtfs-journey.js";
import { inBounds, networkBounds, QUEBEC_SUPPLEMENTS, safeQuebecUrl } from "./quebec-sources.js";

type CkanResource = { id: string; name: string; format: string; url: string; last_modified?: string };
type CkanDataset = { id: string; name: string; title: string; license_id: string; organization?: { title: string }; resources: CkanResource[] };
type Stop = { id: string; name: string; latitude: number; longitude: number; type: number };
const idFor = (key: string) => -1 - createHash("sha256").update(`qc:${key}`).digest().readUIntBE(0, 6);
const MAX_BINARY = 80 * 1024 * 1024;

export class QuebecTransportClient implements TransportProvider {
  private cache = new Map<string, { until: number; value: unknown }>();
  private pending = new Map<string, Promise<unknown>>();
  private binaries = new Map<string, { until: number; bytes: Uint8Array }>();
  private tail: Promise<unknown> = Promise.resolve();
  private queued = 0;
  constructor(private fetcher: typeof fetch = fetch, private now = Date.now) {}

  private async cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
    const entry = this.cache.get(key);
    if (entry && entry.until > this.now()) return entry.value as T;
    const pending = this.pending.get(key); if (pending) return pending as Promise<T>;
    const work = load().then(value => {
      if (key.startsWith("stops:")) {
        const old = [...this.cache.keys()].filter(k => k.startsWith("stops:"));
        if (old.length >= 6) this.cache.delete(old[0]!);
      }
      if (this.cache.size >= 64) this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(key, { value, until: this.now() + ttl }); return value;
    }).finally(() => this.pending.delete(key));
    this.pending.set(key, work); return work;
  }
  private async serial<T>(load: () => Promise<T>) {
    if (this.queued >= 8) throw new Error("Québec transport lookup queue is full");
    this.queued++;
    const work = this.tail.catch(() => undefined).then(load); this.tail = work.catch(() => undefined);
    try { return await work; } finally { this.queued--; }
  }
  private async response(value: string, headers: Record<string, string> = {}) {
    let url = safeQuebecUrl(value);
    for (let i = 0; i <= 3; i++) {
      const response = await this.fetcher(url.href, {
        redirect: "manual", signal: AbortSignal.timeout(20_000),
        headers: { accept: "*/*", "user-agent": "MaximeGPT public transport", ...headers },
      });
      if (![301, 302, 303, 307, 308].includes(response.status)) return response;
      const target = response.headers.get("location"); await response.body?.cancel();
      if (!target) throw new Error("Missing Québec transport redirect");
      url = safeQuebecUrl(new URL(target, url).href);
    }
    throw new Error("Too many Québec transport redirects");
  }
  private async bytes(response: Response, max: number) {
    if (!response.ok || Number(response.headers.get("content-length")) > max) {
      await response.body?.cancel(); throw new Error(`Québec source unavailable or oversized (${response.status})`);
    }
    const reader = response.body?.getReader(); if (!reader) throw new Error("Empty Québec transport response");
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.length; if (size > max) throw new Error("Québec transport response exceeds its budget");
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
    const result = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
    return result;
  }
  private async json<T>(url: string): Promise<T> {
    return JSON.parse(new TextDecoder().decode(await this.bytes(await this.response(url), 8 * 1024 * 1024))) as T;
  }
  async getCatalog(): Promise<CatalogDataset[]> {
    return this.cached("catalogue", 60 * 60_000, async () => {
      const result = await this.json<{ success: boolean; result: { count: number; results: CkanDataset[] } }>(
        "https://www.donneesquebec.ca/recherche/api/3/action/package_search?q=GTFS&rows=100");
      if (!result.success || !Array.isArray(result.result.results)) throw new Error("Invalid Québec catalogue");
      const all = [...result.result.results];
      // Bounded pagination, with an explicit failure rather than silently dropping newer operators.
      for (let start = 100; start < result.result.count; start += 100) {
        if (start >= 500) throw new Error("Québec catalogue exceeds discovery budget");
        const page = await this.json<typeof result>(`https://www.donneesquebec.ca/recherche/api/3/action/package_search?q=GTFS&rows=100&start=${start}`);
        if (!page.success) throw new Error("Incomplete Québec catalogue"); all.push(...page.result.results);
      }
      const datasets: CatalogDataset[] = [];
      for (const d of all) {
        if (/travers|temps.reel|avant20|traces-des-lignes/i.test(normalizeTransitText(d.name))) continue;
        const exo = d.organization?.title.toLowerCase() === "exo";
        const modes = /exo-trains/.test(d.name) ? ["rail"] : /stm/.test(d.name) ? ["bus", "metro"] : ["bus"];
        const resources: CatalogResource[] = d.resources.flatMap(r => {
          let url = r.url;
          if (exo) {
            const sector = url.match(/xdata\/([^/]+)\//)?.[1];
            if (sector) url = `https://exo.quebec/uploads/ressources-telechargeables/a-propos/donnees-ouvertes/${sector}/google_transit.zip`;
          }
          if (d.name === "transport-sts") {
            if (url.includes("/gtfs/client")) url = "https://gtfs.sts.qc.ca:8443/gtfs/client/GTFS_clients.zip";
            else return []; // historical ZIP and directory are not current feeds
          }
          try { safeQuebecUrl(url); } catch { return []; }
          if (!/\.zip(?:\?|$)/i.test(url) || !/^(gtfs|zip)$/i.test(r.format)) return [];
          return [{ id: idFor(r.id), title: r.name, format: "GTFS", url, is_available: true, updated: r.last_modified, modes,
            metadata: { territory: "qc", bounds: networkBounds(d.name) } }];
        }).slice(0, 1);
        if (d.name === "transport-sts") {
          resources.push({ id: idFor("sherbrooke-trips"), title: "GTFS-RT trip updates", format: "gtfs-rt",
            url: "https://gtfs.sts.qc.ca:8443/gtfsrt/tripUpdates.pb", is_available: true });
          resources.push({ id: idFor("sherbrooke-alerts"), title: "GTFS-RT service alerts", format: "gtfs-rt",
            url: "https://gtfs.sts.qc.ca:8443/gtfsrt/Alerts.pb", is_available: true });
        }
        if (resources.length || d.resources.some(r => /^(gtfs|zip)$/i.test(r.format))) datasets.push({
          id: `qc:${d.id}`, title: d.name === "transport-sts" ? "STS · Sherbrooke" : d.title, slug: d.name,
          page_url: `https://www.donneesquebec.ca/recherche/dataset/${encodeURIComponent(d.name)}`,
          type: "public-transit", licence: d.license_id, resources, publisher: d.organization?.title,
          territory: "qc", bounds: networkBounds(d.name), modes,
          ...(!resources.length ? { limitations: ["La ressource publiée n’est pas un GTFS actuel téléchargeable sur un domaine vérifié."] } : {}) });
      }
      for (const entry of QUEBEC_SUPPLEMENTS) datasets.push({
        id: `qc:${entry.key}`, title: entry.name, slug: entry.key, page_url: entry.page, type: "public-transit",
        licence: entry.licence, publisher: entry.name, territory: "qc", bounds: networkBounds(entry.key),
        limitations: [entry.limitation], resources: entry.feed ? [{ id: idFor(entry.key), title: entry.name,
          format: "GTFS", url: entry.feed, is_available: true, modes: entry.modes,
          metadata: { territory: "qc", bounds: networkBounds(entry.key) } }] : [],
        modes: entry.modes,
      });
      return datasets;
    });
  }
  async municipalities(place: string): Promise<TransportLocation[]> {
    return this.cached(`cities:${normalizeTransitText(place)}`, 6 * 3600_000, async () => {
      const url = new URL("https://geogratis.gc.ca/services/geoname/fr/geonames.json");
      for (const [key, value] of Object.entries({ q: place, province: "24", category: "O", concise: "CITY,TOWN,VILG,UNP", num: "100" })) url.searchParams.set(key, value);
      const data = await this.json<{ items?: Array<{ id: string; name: string; category: string; province: { code: string };
        concise: { code: string }; location: string; latitude: number; longitude: number }> }>(url.href);
      let items = (data.items ?? []).filter(x => x.category === "O" && x.province?.code === "24" &&
        ["CITY", "TOWN", "VILG", "UNP"].includes(x.concise?.code) && Number.isFinite(x.latitude) && Number.isFinite(x.longitude));
      const exact = items.filter(x => normalizeTransitText(x.name) === normalizeTransitText(place));
      if (exact.length) items = exact;
      // CGNDB can contain both a municipality and a populated-place record for it.
      const cities = items.filter(x => x.concise.code !== "UNP");
      if (cities.length) items = items.filter(x => x.concise.code !== "UNP" || !cities.some(c =>
        normalizeTransitText(c.name) === normalizeTransitText(x.name) && c.location === x.location));
      return items.slice(0, 30).map(x => ({ id: `qc:${x.id}`, name: x.name, label: `${x.name} — ${x.location} · Québec`,
        latitude: x.latitude, longitude: x.longitude, territory: "qc" }));
    });
  }
  private archive(resource: CatalogResource) {
    return new GtfsRangeArchive(async (range, validator) => {
      const response = await this.response(resource.url, { ...validator, range });
      const updated = response.headers.get("last-modified"); if (updated) resource.updated = updated;
      return response;
    });
  }
  async staticFeed(resource: CatalogResource, selection?: GtfsSelection): Promise<Uint8Array> {
    const key = `${resource.id}:${selection?.mode ?? "*"}:${selection?.line ?? (selection?.discoveryStops ? createHash("sha256")
      .update([...selection.discoveryStops].sort().join("\n")).digest("hex").slice(0, 20) : "*")}`;
    const cached = this.binaries.get(key); if (cached && cached.until > this.now()) return cached.bytes;
    const pendingKey = `binary:${key}`, pending = this.pending.get(pendingKey);
    if (pending) return pending as Promise<Uint8Array>;
    const work = this.serial(async () => {
      let bytes: Uint8Array;
      // Only fall back on servers without range support; corrupt/changed ZIPs must fail.
      try {
        if (!selection) throw new Error("full-file");
        bytes = await selectiveGtfs((range, validator) => this.response(resource.url, { ...validator, range }),
          { ...selection, serviceWindowFrom: Math.floor(this.now() / 1000) });
      } catch (error) {
        if (!(error instanceof Error) || !(error.message === "full-file" || error.message.includes("usable ZIP range (200)"))) throw error;
        const response = await this.response(resource.url);
        const modified = response.headers.get("last-modified"); if (modified) resource.updated = modified;
        bytes = await this.bytes(response, MAX_BINARY);
        // Reject HTML login pages/directories immediately.
        if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error("Québec source is not a GTFS ZIP");
      }
      for (const [key, value] of this.binaries) if (value.until <= this.now()) this.binaries.delete(key);
      let size = [...this.binaries.values()].reduce((n, v) => n + v.bytes.length, 0);
      while (this.binaries.size && size + bytes.length > MAX_BINARY) {
        const oldest = this.binaries.keys().next().value!; size -= this.binaries.get(oldest)!.bytes.length; this.binaries.delete(oldest);
      }
      this.binaries.set(key, { bytes, until: this.now() + 15 * 60_000 }); return bytes;
    }).finally(() => this.pending.delete(pendingKey));
    this.pending.set(pendingKey, work); return work;
  }
  async realtimeFeed(resource: CatalogResource) {
    return this.cached(`live:${resource.id}`, 12_000, async () => this.bytes(await this.response(resource.url), 8 * 1024 * 1024));
  }
  async nearbyStopsForResources(latitude: number, longitude: number, resources: CatalogResource[]): Promise<StopCollection> {
    const features: NonNullable<StopCollection["features"]> = [];
    const failures: number[] = [];
    for (const resource of resources) {
      try {
        const stops = await this.cached(`stops:${resource.id}`, 15 * 60_000, () => this.serial(async () => {
          const stops: Stop[] = [];
          const row = (r: Record<string, string | undefined>) => {
            const lat = Number(r.stop_lat), lon = Number(r.stop_lon), type = Number(r.location_type || 0);
            if (!r.stop_id || !Number.isFinite(lat) || !Number.isFinite(lon) || !inBounds([-80, 44, -57, 63], lat, lon)) return;
            if (stops.length >= 50_000) throw new Error("Québec stop index exceeds its budget");
            stops.push({ id: r.stop_id, name: r.stop_name ?? r.stop_id, latitude: lat, longitude: lon, type });
          };
          try { const archive = this.archive(resource); await archive.open(); if (!await archive.rows("stops.txt", row)) throw new Error("Missing Québec stops"); }
          catch (error) {
            if (!(error instanceof Error) || !error.message.includes("usable ZIP range (200)")) throw error;
            // Some small operator ZIPs don't support HTTP ranges.
            const bytes = await this.bytes(await this.response(resource.url), MAX_BINARY);
            if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error("Québec source is not GTFS");
            await scanRows(bytes, "stops.txt", row);
          }
          return stops;
        }));
        for (const stop of stops) if (Math.abs(stop.latitude - latitude) <= 0.04 && Math.abs(stop.longitude - longitude) <= 0.06)
          features.push({ properties: { resource_id: resource.id, stop_id: stop.id, stop_name: stop.name, location_type: stop.type } });
      } catch { failures.push(resource.id); }
    }
    return { features, unavailableResourceIds: failures };
  }
  async nearbyStops(): Promise<StopCollection> {
    throw new Error("Select a Québec network before loading its stops");
  }
}
