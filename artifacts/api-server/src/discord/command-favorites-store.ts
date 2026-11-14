import type { Collection } from "mongodb";
import { decrypt, encrypt, getCommandFavoritesCollection, hashUserId, isDbReady } from "../lib/db.js";
import { logger } from "../lib/logger.js";

interface CommandFavoritesDoc {
  _id: string;
  encryptedData: string;
  updatedAt: Date;
}

interface FavoritesData {
  commandIds: string[];
}

interface StoreOptions {
  collection: () => Collection<CommandFavoritesDoc> | null;
  ready: () => boolean;
  hash: (userId: string) => string;
  encrypt: (value: string) => string;
  decrypt: (value: string) => string;
}

export interface CommandFavoritesStore {
  get(userId: string): Promise<string[] | null>;
  toggle(userId: string, commandId: string): Promise<{
    ok: boolean; saved: boolean; removed?: boolean; limitReached?: boolean;
  }>;
}

const MAX_FAVORITES = 25;
const validCommandId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-z][a-z0-9:_-]{0,63}$/.test(value);

function parseFavorites(serialized: string): FavoritesData {
  const value: unknown = JSON.parse(serialized);
  if (!value || typeof value !== "object") throw new Error("Invalid command favorites");
  const data = value as Partial<FavoritesData>;
  if (!Array.isArray(data.commandIds) || data.commandIds.length > MAX_FAVORITES ||
      !data.commandIds.every(validCommandId) || new Set(data.commandIds).size !== data.commandIds.length) {
    throw new Error("Invalid command favorites");
  }
  return { commandIds: data.commandIds };
}

export function createCommandFavoritesStore(options: StoreOptions): CommandFavoritesStore {
  const locks = new Map<string, Promise<void>>();

  async function read(userId: string): Promise<string[] | null | undefined> {
    if (!options.ready()) return undefined;
    const collection = options.collection();
    if (!collection) return undefined;
    try {
      const document = await collection.findOne({ _id: options.hash(userId) });
      return document ? parseFavorites(options.decrypt(document.encryptedData)).commandIds : [];
    } catch (error) {
      logger.warn({ err: error }, "Could not read encrypted command favorites");
      return undefined;
    }
  }

  async function update(userId: string, change: (current: string[]) => string[]): Promise<boolean> {
    const key = options.hash(userId);
    const previous = locks.get(key) ?? Promise.resolve();
    const current = previous.then(async () => {
      if (!options.ready()) return false;
      const collection = options.collection();
      if (!collection) return false;
      const stored = await read(userId);
      if (stored === undefined || stored === null) return false;
      try {
        const commandIds = change(stored);
        const encryptedData = options.encrypt(JSON.stringify({ commandIds }));
        await collection.updateOne({ _id: key }, { $set: { encryptedData, updatedAt: new Date() } }, { upsert: true });
        return true;
      } catch (error) {
        logger.warn({ err: error }, "Could not save encrypted command favorites");
        return false;
      }
    });
    const tail = current.then(() => undefined, () => undefined);
    locks.set(key, tail);
    try { return await current; }
    finally { if (locks.get(key) === tail) locks.delete(key); }
  }

  return {
    async get(userId) {
      return (await read(userId)) ?? null;
    },
    async toggle(userId, commandId) {
      if (!validCommandId(commandId)) return { ok: false, saved: false };
      let saved = false;
      let removed = false;
      let limitReached = false;
      const ok = await update(userId, current => {
        if (current.includes(commandId)) {
          removed = true;
          return current.filter(id => id !== commandId);
        }
        if (current.length >= MAX_FAVORITES) {
          limitReached = true;
          return current;
        }
        saved = true;
        return [...current, commandId];
      });
      return {
        ok, saved: ok && saved,
        ...(ok && removed ? { removed: true } : {}),
        ...(ok && limitReached ? { limitReached: true } : {}),
      };
    },
  };
}

export const commandFavorites = createCommandFavoritesStore({
  collection: getCommandFavoritesCollection,
  ready: isDbReady,
  hash: hashUserId,
  encrypt,
  decrypt,
});
