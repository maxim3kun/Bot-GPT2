import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";
import { guildsCol } from "./db.js";

// ── All known feature names ───────────────────────────────────────────────────

export const ALL_FEATURES = [
  "music", "radio", "youtube", "karaoke", "voice_tts", "shazam", "suno",
  "trivia", "connect4", "minesweeper", "geoguessr", "blindtest", "guesslogo",
  "ai_chat", "ai_battle", "image_generation", "conspiracy",
  "food", "quests",
] as const;

export type FeatureName = (typeof ALL_FEATURES)[number];

export interface FeatureEntry { name: string; enabled: boolean }

// ── JSON fallback for global features ────────────────────────────────────────

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR    = path.resolve(__dirname, "..", "..", "data");
const GLOBAL_FILE = path.join(DATA_DIR, "features.json");

function loadGlobalJson(): Record<string, boolean> {
  try {
    if (fs.existsSync(GLOBAL_FILE)) {
      return JSON.parse(fs.readFileSync(GLOBAL_FILE, "utf8")) as Record<string, boolean>;
    }
  } catch { /* ignore */ }
  return {};
}

function saveGlobalJson(map: Record<string, boolean>): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(GLOBAL_FILE, JSON.stringify(map, null, 2));
  } catch (err) {
    logger.warn({ err }, "features: failed to persist JSON");
  }
}

let globalCache: Record<string, boolean> = loadGlobalJson();

// ── Global feature CRUD ───────────────────────────────────────────────────────

export function getGlobalFeatures(): FeatureEntry[] {
  return ALL_FEATURES.map((name) => ({
    name,
    enabled: globalCache[name] ?? true, // default: enabled
  }));
}

export function setGlobalFeature(name: string, enabled: boolean): void {
  globalCache[name] = enabled;
  saveGlobalJson(globalCache);
}

export function getGlobalEnabledCount(): number {
  return ALL_FEATURES.filter((n) => globalCache[n] !== false).length;
}

// ── Per-guild feature CRUD ────────────────────────────────────────────────────

export async function getGuildFeatures(guildId: string): Promise<FeatureEntry[]> {
  let overrides: Record<string, boolean> = {};
  if (guildsCol) {
    try {
      const doc = await guildsCol.findOne({ _id: guildId });
      overrides = (doc as any)?.features ?? {};
    } catch (err) {
      logger.warn({ err, guildId }, "getGuildFeatures: MongoDB error");
    }
  }
  return ALL_FEATURES.map((name) => ({
    name,
    // guild override → then global → then default true
    enabled: overrides[name] ?? globalCache[name] ?? true,
  }));
}

export async function setGuildFeature(
  guildId: string,
  name: string,
  enabled: boolean,
): Promise<void> {
  if (!guildsCol) {
    logger.warn("setGuildFeature: no MongoDB, change lost");
    return;
  }
  try {
    await guildsCol.updateOne(
      { _id: guildId },
      { $set: { [`features.${name}`]: enabled, updatedAt: new Date() } },
      { upsert: true },
    );
  } catch (err) {
    logger.error({ err, guildId, name }, "setGuildFeature failed");
  }
}

export async function getGuildEnabledCount(guildId: string): Promise<number> {
  const features = await getGuildFeatures(guildId);
  return features.filter((f) => f.enabled).length;
}
