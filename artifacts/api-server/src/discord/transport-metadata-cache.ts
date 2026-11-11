import { createHash } from "node:crypto";
import type { Collection } from "mongodb";
import { getTransportMetadataCollection } from "../lib/db.js";
import { logger } from "../lib/logger.js";

// Closed public DTOs. In particular, never serialize a JourneyIndex, trips,
// calendars, stop_times, predictions, raw provider metadata or a GTFS archive.
type Shape = "string" | "number" | "boolean" | { [key: string]: Shape } | readonly [Shape];
const strings: Shape = ["string"];
const resource: Shape = { id: "number", title: "string", format: "string", type: "string", url: "string",
  original_url: "string", is_available: "boolean", modes: strings, updated: "string",
  metadata: { modes: strings, stats: { routes_count: "number" } } };
const shapes = {
  catalog: [{ id: "string", title: "string", slug: "string", page_url: "string", type: "string", licence: "string",
    resources: [resource], territory: "string", bounds: ["number"], modes: strings, limitations: strings,
    covered_area: [{ insee: "string", nom: "string", type: "string" }] }],
  areas: [{ code: "string", nom: "string", codesRegions: strings, codesDepartements: strings }],
  nearby: { features: [{ properties: { resource_id: "number", stop_id: "string", stop_name: "string", location_type: "number" } }] },
  routes: [{ routeId: "string", shortName: "string", longName: "string", mode: "string", stopIds: strings }],
  stops: [{ id: "string", name: "string", parent: "string", latitude: "number", longitude: "number", type: "number" }],
  locations: [{ id: "string", name: "string", label: "string", latitude: "number", longitude: "number",
    territory: "string", area: "string" }],
  patterns: [{ id: "string", routeId: "string", direction: "string", stopIds: strings }],
} satisfies Record<string, Shape>;
export type MetadataKind = keyof typeof shapes;
export interface MetadataKey { territory: "fr" | "qc" | "en"; provider: string; kind: MetadataKind; source: string; version: string }
export interface MetadataDocument {
  _id: string; schema: number; territory: string; provider: string; kind: MetadataKind;
  source: string; version: string; value: unknown; fetchedAt: Date; expiresAt: Date;
}
const SCHEMA = 1, MAX_BYTES = 4 * 1024 * 1024;

/** Projection on both write AND read: adding a field upstream cannot persist it accidentally. */
export function publicMetadata(kind: MetadataKind, value: unknown): unknown {
  function project(shape: Shape, input: unknown): unknown {
    if (typeof shape === "string") {
      if (typeof input !== shape || typeof input === "number" && !Number.isFinite(input) ||
        typeof input === "string" && input.length > 4000) throw Error("Invalid public transport metadata");
      return input;
    }
    if (Array.isArray(shape)) {
      if (!Array.isArray(input) || input.length > 60_000) throw Error("Oversized public transport metadata");
      return input.map(v => project(shape[0]!, v));
    }
    if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("Invalid public transport metadata object");
    return Object.fromEntries(Object.entries(shape).flatMap(([key, field]) => {
      const v = (input as Record<string, unknown>)[key];
      return v == null ? [] : [[key, project(field, v)]];
    }));
  }
  const result = project(shapes[kind], value);
  const rows = Array.isArray(result) ? result as Array<Record<string, unknown>> : [];
  if (kind === "catalog" && rows.some(row => typeof row.id !== "string" || !Array.isArray(row.resources)) ||
    kind === "areas" && rows.some(row => typeof row.code !== "string" || typeof row.nom !== "string") ||
    kind === "routes" && rows.some(row => typeof row.routeId !== "string" || typeof row.shortName !== "string" ||
      typeof row.longName !== "string" || !Array.isArray(row.stopIds)) ||
    kind === "stops" && rows.some(row => typeof row.id !== "string" || typeof row.name !== "string" ||
      typeof row.latitude !== "number" || typeof row.longitude !== "number") ||
    kind === "locations" && rows.some(row => typeof row.id !== "string" || typeof row.name !== "string" ||
      typeof row.label !== "string" || typeof row.latitude !== "number" || typeof row.longitude !== "number") ||
    kind === "patterns" && rows.some(row => typeof row.id !== "string" || typeof row.routeId !== "string" ||
      typeof row.direction !== "string" || !Array.isArray(row.stopIds)) ||
    kind === "nearby" && !Array.isArray((result as { features?: unknown }).features))
    throw Error("Incomplete public transport metadata");
  return result;
}
export function resourceVersion(resource: { id: number; updated?: string; url: string; original_url?: string; referenceVersion?: string }) {
  if (resource.referenceVersion) return resource.referenceVersion;
  return createHash("sha256").update(JSON.stringify([resource.id, resource.updated ?? "", resource.url, resource.original_url ?? ""])).digest("hex");
}

/** Best-effort shared metadata cache. All source errors propagate; cache errors do not become empty data. */
export class TransportMetadataCache {
  private readonly memory = new Map<string, { expires: number; value: unknown }>();
  private readonly pending = new Map<string, Promise<unknown>>();
  private initialized = new WeakSet<object>();
  private unavailableUntil = 0;
  private housekeepingAt = 0;
  constructor(private readonly collection: () => Collection<MetadataDocument> | null = getTransportMetadataCollection,
    private readonly now = Date.now) {}

  async get<T>(key: MetadataKey, ttl: number, load: () => Promise<T>): Promise<T> {
    const id = createHash("sha256").update(JSON.stringify([SCHEMA, key.territory, key.provider, key.kind, key.source, key.version])).digest("hex");
    const old = this.memory.get(id);
    if (old && old.expires > this.now()) return structuredClone(old.value) as T;
    const pending = this.pending.get(id);
    if (pending) return structuredClone(await pending) as T;
    const work = this.resolve(id, key, Math.min(ttl, 24 * 3600_000), load).finally(() => this.pending.delete(id));
    this.pending.set(id, work);
    return structuredClone(await work) as T;
  }
  private remember(id: string, value: unknown, expires: number) {
    for (const [key, entry] of this.memory) if (entry.expires <= this.now()) this.memory.delete(key);
    if (this.memory.size >= 128) this.memory.delete(this.memory.keys().next().value!);
    let retained = Buffer.byteLength(JSON.stringify(value));
    for (const entry of this.memory.values()) retained += Buffer.byteLength(JSON.stringify(entry.value));
    while (this.memory.size && retained > 24 * 1024 * 1024) {
      const oldest = this.memory.keys().next().value!;
      retained -= Buffer.byteLength(JSON.stringify(this.memory.get(oldest)!.value));
      this.memory.delete(oldest);
    }
    this.memory.set(id, { value, expires });
  }
  private failed() {
    this.unavailableUntil = this.now() + 30_000;
    logger.warn("Transport metadata cache unavailable; using official source");
  }
  private async resolve<T>(id: string, key: MetadataKey, ttl: number, load: () => Promise<T>): Promise<unknown> {
    let col = this.now() >= this.unavailableUntil ? this.collection() : null;
    try {
      if (col) {
        const doc = await col.findOne({ _id: id }, { timeoutMS: 800 });
        if (doc && doc.schema === SCHEMA && doc.expiresAt instanceof Date && doc.expiresAt.getTime() > this.now() &&
          doc.expiresAt.getTime() <= this.now() + ttl && doc.source === key.source && doc.version === key.version) {
          const value = publicMetadata(key.kind, doc.value);
          if (Buffer.byteLength(JSON.stringify(value)) <= MAX_BYTES) {
            this.remember(id, value, doc.expiresAt.getTime()); return value;
          }
        }
      }
    } catch { this.failed(); col = null; }
    const value = publicMetadata(key.kind, await load());
    // Bounds apply before retaining or writing; do not silently deliver truncated inventories.
    if (Buffer.byteLength(JSON.stringify(value)) > MAX_BYTES) throw Error("Public transport metadata exceeds its cache budget");
    const expires = this.now() + ttl;
    this.remember(id, value, expires);
    if (col) try {
      if (!this.initialized.has(col)) {
        await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, timeoutMS: 800 });
        this.initialized.add(col);
      }
      await col.updateOne({ _id: id }, { $set: { schema: SCHEMA, ...key, value,
        fetchedAt: new Date(this.now()), expiresAt: new Date(expires) } }, { upsert: true, timeoutMS: 800 });
      if (this.housekeepingAt <= this.now()) {
        this.housekeepingAt = this.now() + 60_000;
        await col.deleteMany({ expiresAt: { $lte: new Date(this.now()) } }, { timeoutMS: 800 });
        const excess = await col.find({}, { projection: { _id: 1 }, timeoutMS: 800 })
          .sort({ fetchedAt: -1 }).skip(1024).limit(128).toArray();
        if (excess.length) await col.deleteMany({ _id: { $in: excess.map(d => d._id) } }, { timeoutMS: 800 });
      }
    } catch { this.failed(); }
    return value;
  }
}
