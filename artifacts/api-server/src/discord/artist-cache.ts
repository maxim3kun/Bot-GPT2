import { logger } from "../lib/logger.js";
import { artistCacheCol } from "../lib/db.js";

// ── In-memory set of known artist names (lowercase) ───────────────────────────
// Backed by MongoDB collection "artist_cache".
// Lookup is O(1) — no noticeable bot overhead.

const knownArtists = new Set<string>();

export async function initArtistCache(): Promise<void> {
  if (!artistCacheCol) {
    logger.warn("Artist cache: no MongoDB — in-memory only this session");
    return;
  }
  try {
    const docs = await artistCacheCol.find({}).toArray();
    for (const doc of docs) knownArtists.add(doc._id);
    logger.info({ count: docs.length }, "Artist cache loaded from MongoDB");
  } catch (err) {
    logger.error({ err }, "Artist cache load failed");
  }
}

/** Returns true if this word is a known artist name (case-insensitive). */
export function isKnownArtist(word: string): boolean {
  return knownArtists.has(word.toLowerCase().trim());
}

/**
 * Returns cached artist names that start with the given prefix (case-insensitive).
 * Results are title-cased and sorted alphabetically.
 */
export function getMatchingArtists(prefix: string, limit = 25): string[] {
  if (!prefix.trim()) return [];
  const q = prefix.toLowerCase().trim();
  const matches: string[] = [];
  for (const name of knownArtists) {
    if (name.startsWith(q)) {
      // Title-case each word
      matches.push(name.replace(/\b\w/g, c => c.toUpperCase()));
    }
  }
  return matches.sort().slice(0, limit);
}

/**
 * Persist a new artist name.
 * Called after the user picks a search result whose title matches "Artist - Song".
 */
export async function saveArtist(name: string): Promise<void> {
  const key = name.toLowerCase().trim();
  if (!key || knownArtists.has(key)) return;
  knownArtists.add(key);
  if (!artistCacheCol) return;
  try {
    await artistCacheCol.updateOne(
      { _id: key },
      { $set: { updatedAt: new Date() } },
      { upsert: true },
    );
    logger.debug({ artist: key }, "Artist cache: new artist saved");
  } catch (err) {
    logger.error({ err, artist: key }, "Artist cache: save failed");
  }
}
