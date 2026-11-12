import type { Collection } from "mongodb";
import { decrypt, encrypt, getTransportPreferencesCollection, hashUserId, isDbReady } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import type { TransportTerritory } from "./transport-provider.js";
import type { TransitMode } from "./transport-query.js";

export interface TransportFavorite {
  key: string;
  territory: TransportTerritory;
  mode: TransitMode;
  place: string;
  cityId?: string;
  region?: string;
  networkId?: string;
  routeId: string;
  resourceId: number;
  lineLabel: string;
  originIds: string[];
  originLabel: string;
  arrivalIds: string[];
  arrivalLabel: string;
  arrivalViaTransfer?: boolean;
}

export interface TransportPreferences {
  preferredTerritory?: TransportTerritory;
  favorites: TransportFavorite[];
}

interface TransportPreferencesDoc {
  _id: string;
  encryptedData: string;
  updatedAt: Date;
}

export interface TransportPreferencesStore {
  get(discordId: string): Promise<TransportPreferences | null>;
  setPreferredTerritory(discordId: string, territory: TransportTerritory): Promise<boolean>;
  toggleFavorite(discordId: string, favorite: TransportFavorite): Promise<{ ok: boolean; saved: boolean }>;
}

type RepositoryOptions = {
  collection: () => Collection<TransportPreferencesDoc> | null;
  ready: () => boolean;
  hash: (discordId: string) => string;
  encrypt: (plaintext: string) => string;
  decrypt: (ciphertext: string) => string;
};

const territories = new Set<TransportTerritory>(["fr", "qc", "en"]);
const modes = new Set<TransitMode>(["bus", "metro", "tram", "rail"]);
const MAX_FAVORITES = 20;

function isFavorite(value: unknown): value is TransportFavorite {
  if (!value || typeof value !== "object") return false;
  const favorite = value as Partial<TransportFavorite>;
  return typeof favorite.key === "string" && territories.has(favorite.territory as TransportTerritory) &&
    modes.has(favorite.mode as TransitMode) && typeof favorite.place === "string" &&
    typeof favorite.routeId === "string" && Number.isSafeInteger(favorite.resourceId) &&
    typeof favorite.lineLabel === "string" && Array.isArray(favorite.originIds) &&
    favorite.originIds.every(id => typeof id === "string") && typeof favorite.originLabel === "string" &&
    Array.isArray(favorite.arrivalIds) && favorite.arrivalIds.every(id => typeof id === "string") &&
    typeof favorite.arrivalLabel === "string" &&
    (favorite.arrivalViaTransfer === undefined || typeof favorite.arrivalViaTransfer === "boolean");
}

function parsePreferences(serialized: string): TransportPreferences {
  const value: unknown = JSON.parse(serialized);
  if (!value || typeof value !== "object") throw new Error("Invalid transport preferences");
  const data = value as Partial<TransportPreferences>;
  if (data.preferredTerritory !== undefined && !territories.has(data.preferredTerritory)) {
    throw new Error("Invalid preferred transport territory");
  }
  if (!Array.isArray(data.favorites) || data.favorites.length > MAX_FAVORITES ||
      !data.favorites.every(isFavorite)) throw new Error("Invalid transport favorites");
  return { ...(data.preferredTerritory ? { preferredTerritory: data.preferredTerritory } : {}),
    favorites: data.favorites };
}

export function createTransportPreferencesStore(options: RepositoryOptions): TransportPreferencesStore {
  const locks = new Map<string, Promise<void>>();

  async function read(discordId: string): Promise<TransportPreferences | null | undefined> {
    if (!options.ready()) return undefined;
    const collection = options.collection();
    if (!collection) return undefined;
    try {
      const document = await collection.findOne({ _id: options.hash(discordId) });
      return document ? parsePreferences(options.decrypt(document.encryptedData)) : { favorites: [] };
    } catch (error) {
      logger.warn({ err: error }, "Could not read encrypted transport preferences");
      return undefined;
    }
  }

  async function update(
    discordId: string,
    change: (current: TransportPreferences) => TransportPreferences,
  ): Promise<boolean> {
    const key = options.hash(discordId);
    const previous = locks.get(key) ?? Promise.resolve();
    const current = previous.then(async () => {
      if (!options.ready()) return false;
      const collection = options.collection();
      if (!collection) return false;
      const stored = await read(discordId);
      if (stored === undefined || stored === null) return false;
      try {
        const encryptedData = options.encrypt(JSON.stringify(change(stored)));
        await collection.updateOne({ _id: key }, { $set: { encryptedData, updatedAt: new Date() } }, { upsert: true });
        return true;
      } catch (error) {
        logger.warn({ err: error }, "Could not save encrypted transport preferences");
        return false;
      }
    });
    const tail = current.then(() => undefined, () => undefined);
    locks.set(key, tail);
    try { return await current; }
    finally { if (locks.get(key) === tail) locks.delete(key); }
  }

  return {
    async get(discordId) {
      const value = await read(discordId);
      return value ?? null;
    },
    async setPreferredTerritory(discordId, territory) {
      if (!territories.has(territory)) return false;
      return update(discordId, current => ({ ...current, preferredTerritory: territory }));
    },
    async toggleFavorite(discordId, favorite) {
      if (!isFavorite(favorite)) return { ok: false, saved: false };
      let saved = false;
      const ok = await update(discordId, current => {
        const existing = current.favorites.some(item => item.key === favorite.key);
        saved = !existing;
        return { ...current, favorites: existing
          ? current.favorites.filter(item => item.key !== favorite.key)
          : [...current.favorites.slice(-(MAX_FAVORITES - 1)), favorite] };
      });
      return { ok, saved: ok && saved };
    },
  };
}

export const transportPreferences = createTransportPreferencesStore({
  collection: getTransportPreferencesCollection,
  ready: isDbReady,
  hash: hashUserId,
  encrypt,
  decrypt,
});
