import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { WebSearchResult } from "../lib/web-search.js";

const SOURCE_TTL_MS = 10 * 60 * 1_000;
let counter = 0;
const sources = new Map<string, {
  userId: string;
  results: WebSearchResult[];
  expiresAt: number;
}>();

export function getSearchSources(key: string) {
  const entry = sources.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry;
  sources.delete(key);
  return undefined;
}

export function createSearchSourceButton(results: WebSearchResult[], userId: string) {
  if (results.length === 0) return null;
  const now = Date.now();
  for (const [key, entry] of sources) {
    if (entry.expiresAt <= now) sources.delete(key);
  }
  // Bound retained page text even under sustained use.
  if (sources.size >= 500) sources.delete(sources.keys().next().value!);
  const key = `${now.toString(36)}_${(counter++).toString(36)}`;
  sources.set(key, { userId, results, expiresAt: now + SOURCE_TTL_MS });
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ai_sources:${key}`).setLabel("🔎").setStyle(ButtonStyle.Secondary),
  );
}
