import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { logger } from "../lib/logger.js";
import { isMongoConnected, upsertGuildDoc, getAllGuildDocs } from "../lib/db.js";

const DATA_DIR   = join(process.cwd(), "data");
const STORE_PATH = join(DATA_DIR, "prefixes.json");

export const DEFAULT_PREFIX = "!";

let store: Record<string, string> = {};

// ── JSON fallback helpers ─────────────────────────────────────────────────────

function loadFromJson(): void {
  if (!existsSync(STORE_PATH)) return;
  try {
    store = JSON.parse(readFileSync(STORE_PATH, "utf8")) as Record<string, string>;
  } catch (err) {
    logger.warn({ err }, "Could not load prefixes.json — using defaults");
  }
}

function saveToJson(): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    logger.error({ err }, "Could not save prefixes.json");
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

export async function initPrefixStore(): Promise<void> {
  if (!isMongoConnected()) {
    loadFromJson();
    logger.info({ count: Object.keys(store).length }, "Prefix store loaded from JSON (no MongoDB)");
    return;
  }
  const guilds = await getAllGuildDocs();
  for (const guild of guilds) {
    if (guild.prefix) {
      store[guild._id] = guild.prefix;
    }
  }
  logger.info({ count: Object.keys(store).length }, "Prefix store loaded from MongoDB");
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getPrefix(guildId: string | null | undefined): string {
  if (!guildId) return DEFAULT_PREFIX;
  return store[guildId] ?? DEFAULT_PREFIX;
}

export function setPrefix(guildId: string, prefix: string): void {
  store[guildId] = prefix;
  if (isMongoConnected()) {
    upsertGuildDoc(guildId, { prefix })
      .catch(err => logger.error({ err, guildId }, "Failed to persist prefix to MongoDB"));
  } else {
    saveToJson();
  }
}

export function resetPrefix(guildId: string): void {
  delete store[guildId];
  if (isMongoConnected()) {
    upsertGuildDoc(guildId, { prefix: DEFAULT_PREFIX })
      .catch(err => logger.error({ err, guildId }, "Failed to reset prefix in MongoDB"));
  } else {
    saveToJson();
  }
}
