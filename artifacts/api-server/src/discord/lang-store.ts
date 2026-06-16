import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { logger } from "../lib/logger.js";
import { isDbReady, upsertGuildDoc, getAllGuildDocs } from "../lib/db.js";

export type GuildLang = "en" | "fr" | "es";

export const DEFAULT_LANG: GuildLang = "en";

const DATA_DIR   = join(process.cwd(), "data");
const STORE_PATH = join(DATA_DIR, "langs.json");

let store: Record<string, GuildLang> = {};

// ── JSON fallback helpers ─────────────────────────────────────────────────────

function loadFromJson(): void {
  if (!existsSync(STORE_PATH)) return;
  try {
    store = JSON.parse(readFileSync(STORE_PATH, "utf8")) as Record<string, GuildLang>;
  } catch (err) {
    logger.warn({ err }, "Could not load langs.json — using defaults");
  }
}

function saveToJson(): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    logger.error({ err }, "Could not save langs.json");
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

export async function initLangStore(): Promise<void> {
  if (!isDbReady()) {
    loadFromJson();
    logger.info({ count: Object.keys(store).length }, "Lang store loaded from JSON (no MongoDB)");
    return;
  }
  const guilds = await getAllGuildDocs();
  for (const guild of guilds) {
    if (guild.lang && (guild.lang === "en" || guild.lang === "fr" || guild.lang === "es")) {
      store[guild._id] = guild.lang as GuildLang;
    }
  }
  logger.info({ count: Object.keys(store).length }, "Lang store loaded from MongoDB");
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getLang(guildId: string | null | undefined): GuildLang {
  if (!guildId) return DEFAULT_LANG;
  return store[guildId] ?? DEFAULT_LANG;
}

export function setLang(guildId: string, lang: GuildLang): void {
  store[guildId] = lang;
  if (isDbReady()) {
    upsertGuildDoc(guildId, { lang })
      .catch(err => logger.error({ err, guildId }, "Failed to persist lang to MongoDB"));
  } else {
    saveToJson();
  }
}
