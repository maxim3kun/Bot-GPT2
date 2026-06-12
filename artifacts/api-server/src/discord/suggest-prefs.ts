import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { logger } from "../lib/logger";

const DATA_DIR  = join(process.cwd(), "data");
const STORE_PATH = join(DATA_DIR, "suggest-prefs.json");

// true = opted in, false = opted out, missing = not yet asked
let store: Record<string, boolean> = {};

if (existsSync(STORE_PATH)) {
  try {
    store = JSON.parse(readFileSync(STORE_PATH, "utf8")) as Record<string, boolean>;
  } catch (err) {
    logger.warn({ err }, "Could not load suggest-prefs.json — using defaults");
  }
}

function save(): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    logger.error({ err }, "Could not save suggest-prefs.json");
  }
}

/** Returns true if opted in, false if opted out, undefined if never asked. */
export function getSuggestPref(userId: string): boolean | undefined {
  return store[userId];
}

export function setSuggestPref(userId: string, value: boolean): void {
  store[userId] = value;
  save();
}
