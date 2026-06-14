import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { logger } from "../lib/logger.js";
import { isDbReady, patchUserData, getAllUserDocs } from "../lib/db.js";

const DATA_DIR   = join(process.cwd(), "data");
const STORE_PATH = join(DATA_DIR, "suggest-prefs.json");

// true = opted in, false = opted out, missing = not yet asked
let store: Record<string, boolean> = {};

// ── JSON fallback helpers ─────────────────────────────────────────────────────

function loadFromJson(): void {
  if (!existsSync(STORE_PATH)) return;
  try {
    store = JSON.parse(readFileSync(STORE_PATH, "utf8")) as Record<string, boolean>;
  } catch (err) {
    logger.warn({ err }, "Could not load suggest-prefs.json — using defaults");
  }
}

function saveToJson(): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    logger.error({ err }, "Could not save suggest-prefs.json");
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

export async function initSuggestPrefs(): Promise<void> {
  if (!isDbReady()) {
    loadFromJson();
    logger.info({ count: Object.keys(store).length }, "Suggest-prefs loaded from JSON (no MongoDB)");
    return;
  }
  const users = await getAllUserDocs();
  for (const { data } of users) {
    if (typeof data.suggestPref === "boolean" && data.discordId) {
      store[data.discordId] = data.suggestPref;
    }
  }
  logger.info({ count: Object.keys(store).length }, "Suggest-prefs loaded from MongoDB");
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns true if opted in, false if opted out, undefined if never asked. */
export function getSuggestPref(userId: string): boolean | undefined {
  return store[userId];
}

export function setSuggestPref(userId: string, value: boolean): void {
  store[userId] = value;
  if (isDbReady()) {
    patchUserData(userId, { suggestPref: value })
      .catch(err => logger.error({ err, userId }, "Failed to persist suggest-pref to MongoDB"));
  } else {
    saveToJson();
  }
}
