import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { logger } from "../lib/logger";

const DATA_DIR = join(process.cwd(), "data");
const STORE_PATH = join(DATA_DIR, "prefixes.json");

export const DEFAULT_PREFIX = "!";

let store: Record<string, string> = {};

if (existsSync(STORE_PATH)) {
  try {
    store = JSON.parse(readFileSync(STORE_PATH, "utf8")) as Record<string, string>;
    logger.info({ count: Object.keys(store).length }, "Loaded custom prefixes");
  } catch (err) {
    logger.warn({ err }, "Could not load prefixes.json — using defaults");
  }
}

function save(): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    logger.error({ err }, "Could not save prefixes.json");
  }
}

export function getPrefix(guildId: string | null | undefined): string {
  if (!guildId) return DEFAULT_PREFIX;
  return store[guildId] ?? DEFAULT_PREFIX;
}

export function setPrefix(guildId: string, prefix: string): void {
  store[guildId] = prefix;
  save();
}

export function resetPrefix(guildId: string): void {
  delete store[guildId];
  save();
}
