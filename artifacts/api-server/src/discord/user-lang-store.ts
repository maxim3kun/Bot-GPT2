import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { logger } from "../lib/logger.js";

export type UserLang = "en" | "fr" | "es" | "de" | "pt" | "it" | "ja" | "nl" | "ru" | "pl" | "tr";
export const DEFAULT_USER_LANG: UserLang = "en";

export const USER_LANG_NAMES: Record<UserLang, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
  de: "German",
  pt: "Portuguese",
  it: "Italian",
  ja: "Japanese",
  nl: "Dutch",
  ru: "Russian",
  pl: "Polish",
  tr: "Turkish",
};

export const USER_LANG_LABELS: Record<UserLang, string> = {
  en: "🇬🇧 English",
  fr: "🇫🇷 Français",
  es: "🇪🇸 Español",
  de: "🇩🇪 Deutsch",
  pt: "🇧🇷 Português",
  it: "🇮🇹 Italiano",
  ja: "🇯🇵 日本語",
  nl: "🇳🇱 Nederlands",
  ru: "🇷🇺 Русский",
  pl: "🇵🇱 Polski",
  tr: "🇹🇷 Türkçe",
};

const VALID_USER_LANGS: UserLang[] = ["en", "fr", "es", "de", "pt", "it", "ja", "nl", "ru", "pl", "tr"];

const DATA_DIR   = join(process.cwd(), "data");
const STORE_PATH = join(DATA_DIR, "user-langs.json");

let store: Record<string, UserLang> = {};

function loadFromJson(): void {
  if (!existsSync(STORE_PATH)) return;
  try {
    store = JSON.parse(readFileSync(STORE_PATH, "utf8")) as Record<string, UserLang>;
  } catch (err) {
    logger.warn({ err }, "Could not load user-langs.json — using defaults");
  }
}

function saveToJson(): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    logger.error({ err }, "Could not save user-langs.json");
  }
}

export async function initUserLangStore(): Promise<void> {
  loadFromJson();
  logger.info({ count: Object.keys(store).length }, "User lang store loaded from JSON");
}

export function getUserLang(userId: string): UserLang {
  return store[userId] ?? DEFAULT_USER_LANG;
}

export function isValidUserLang(lang: string): lang is UserLang {
  return VALID_USER_LANGS.includes(lang as UserLang);
}

export function setUserLang(userId: string, lang: UserLang): void {
  store[userId] = lang;
  saveToJson();
}
