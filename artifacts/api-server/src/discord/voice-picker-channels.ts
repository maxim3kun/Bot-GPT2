import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { logger } from "../lib/logger.js";
import { isMongoConnected, getGuildDoc, upsertGuildDoc } from "../lib/db.js";

const DATA_DIR   = join(process.cwd(), "data");
const STORE_PATH = join(DATA_DIR, "voice-picker-channels.json");

let store: Record<string, string[]> = {};

function loadFromJson(): void {
  if (!existsSync(STORE_PATH)) return;
  try {
    store = JSON.parse(readFileSync(STORE_PATH, "utf8")) as Record<string, string[]>;
  } catch (err) {
    logger.warn({ err }, "Could not load voice-picker-channels.json — using defaults");
  }
}

function saveToJson(): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    logger.error({ err }, "Could not save voice-picker-channels.json");
  }
}

export async function initVoicePickerChannels(): Promise<void> {
  if (!isMongoConnected()) {
    loadFromJson();
    logger.info({ count: Object.keys(store).length }, "Voice-picker channels loaded from JSON (no MongoDB)");
    return;
  }
  logger.info("Voice-picker channels store ready (MongoDB)");
}

export function getVoicePickerChannels(guildId: string): string[] {
  if (isMongoConnected()) {
    getGuildDoc(guildId).then(doc => {
      if (doc?.voicePickerChannelIds) store[guildId] = doc.voicePickerChannelIds;
    }).catch(() => null);
  }
  return store[guildId] ?? [];
}

export async function setVoicePickerChannels(guildId: string, channelIds: string[]): Promise<void> {
  store[guildId] = channelIds;
  if (isMongoConnected()) {
    await upsertGuildDoc(guildId, { voicePickerChannelIds: channelIds } as Parameters<typeof upsertGuildDoc>[1]);
  } else {
    saveToJson();
  }
}
