/**
 * One-time migration from local JSON files to MongoDB.
 * Safe to run multiple times — all writes are upserts.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { logger } from "./logger.js";
import { isDbReady, patchUserData, upsertGuildDoc } from "./db.js";

const DATA_DIR = join(process.cwd(), "data");

interface QuestStore {
  [userId: string]: {
    userId: string;
    username: string;
    quests: unknown[];
    totalPoints: number;
    completedCount: number;
    createdAt: string;
    [key: string]: unknown;
  };
}

interface BirthdayEntry {
  userId: string;
  userName: string;
  day: number;
  month: number;
}

interface BirthdayData {
  birthdays: BirthdayEntry[];
  announcementChannelId: string | null;
}

type SuggestPrefs = Record<string, boolean>;
type Prefixes = Record<string, string>;
type Playlists = Record<string, Record<string, string[]>>;

function readJson<T>(filename: string): T | null {
  const path = join(DATA_DIR, filename);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return null;
  }
}

export async function runMigration(): Promise<void> {
  if (!isDbReady()) return;

  let migrated = 0;

  // ── quests.json ─────────────────────────────────────────────────────────────
  const quests = readJson<QuestStore>("quests.json");
  if (quests) {
    for (const [userId, profile] of Object.entries(quests)) {
      await patchUserData(userId, { questProfile: profile as Record<string, unknown> });
      migrated++;
    }
    logger.info({ count: Object.keys(quests).length }, "Migrated quests");
  }

  // ── birthdays.json ───────────────────────────────────────────────────────────
  const bdays = readJson<BirthdayData>("birthdays.json");
  if (bdays) {
    for (const entry of bdays.birthdays) {
      await patchUserData(entry.userId, {
        birthday: { day: entry.day, month: entry.month, userName: entry.userName },
      });
      migrated++;
    }
    if (bdays.announcementChannelId) {
      logger.warn(
        { channelId: bdays.announcementChannelId },
        "Birthday announcement channel was global — per-guild storage now required. Re-run !birthday channel in your server.",
      );
    }
    logger.info({ count: bdays.birthdays.length }, "Migrated birthdays");
  }

  // ── suggest-prefs.json ───────────────────────────────────────────────────────
  const prefs = readJson<SuggestPrefs>("suggest-prefs.json");
  if (prefs) {
    for (const [userId, value] of Object.entries(prefs)) {
      await patchUserData(userId, { suggestPref: value });
      migrated++;
    }
    logger.info({ count: Object.keys(prefs).length }, "Migrated suggest-prefs");
  }

  // ── prefixes.json ────────────────────────────────────────────────────────────
  const prefixes = readJson<Prefixes>("prefixes.json");
  if (prefixes) {
    for (const [guildId, prefix] of Object.entries(prefixes)) {
      await upsertGuildDoc(guildId, { prefix });
      migrated++;
    }
    logger.info({ count: Object.keys(prefixes).length }, "Migrated prefixes");
  }

  // ── playlists.json ───────────────────────────────────────────────────────────
  const playlists = readJson<Playlists>("playlists.json");
  if (playlists) {
    for (const [guildId, guildPlaylists] of Object.entries(playlists)) {
      await upsertGuildDoc(guildId, { playlists: guildPlaylists });
      migrated++;
    }
    logger.info({ count: Object.keys(playlists).length }, "Migrated playlists");
  }

  if (migrated > 0) {
    logger.info({ migrated }, "Migration complete");
  }
}
