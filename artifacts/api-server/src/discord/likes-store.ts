import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { logger } from "../lib/logger.js";
import { isDbReady, patchUserData, getAllUserDocs, type LikedTrack } from "../lib/db.js";

export type { LikedTrack };

const DATA_DIR   = join(process.cwd(), "data");
const STORE_PATH = join(DATA_DIR, "likes.json");

// In-memory cache: userId → liked tracks (most recent last)
let store: Record<string, LikedTrack[]> = {};

// ── JSON fallback helpers ──────────────────────────────────────────────────────

function loadFromJson(): void {
  if (!existsSync(STORE_PATH)) return;
  try {
    store = JSON.parse(readFileSync(STORE_PATH, "utf8")) as Record<string, LikedTrack[]>;
  } catch (err) {
    logger.warn({ err }, "Could not load likes.json — using empty store");
  }
}

function saveToJson(): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    logger.error({ err }, "Could not save likes.json");
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

export async function initLikesStore(): Promise<void> {
  if (!isDbReady()) {
    loadFromJson();
    const count = Object.values(store).reduce((s, arr) => s + arr.length, 0);
    logger.info({ count }, "Likes store loaded from JSON (no MongoDB)");
    return;
  }
  const allUsers = await getAllUserDocs();
  for (const { data } of allUsers) {
    if (data.discordId && data.likes?.length) {
      store[data.discordId] = data.likes;
    }
  }
  const count = Object.values(store).reduce((s, arr) => s + arr.length, 0);
  logger.info({ count }, "Likes store loaded from MongoDB");
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getLikes(userId: string): LikedTrack[] {
  return store[userId] ?? [];
}

export function isLiked(userId: string, url: string): boolean {
  return (store[userId] ?? []).some(t => t.url === url);
}

/** Returns true if the track was added, false if it was already liked. */
export async function addLike(
  userId: string,
  track: { title: string; url: string },
): Promise<boolean> {
  if (isLiked(userId, track.url)) return false;

  const liked: LikedTrack = { ...track, likedAt: new Date().toISOString() };
  store[userId] = [...(store[userId] ?? []), liked];

  if (isDbReady()) {
    await patchUserData(userId, { likes: store[userId] }).catch(err =>
      logger.error({ err, userId }, "Failed to persist like to MongoDB"),
    );
  } else {
    saveToJson();
  }
  return true;
}

/** Unlike a track by URL. No-op if not liked. */
export async function removeLike(userId: string, url: string): Promise<void> {
  store[userId] = (store[userId] ?? []).filter(t => t.url !== url);

  if (isDbReady()) {
    await patchUserData(userId, { likes: store[userId] }).catch(err =>
      logger.error({ err, userId }, "Failed to remove like from MongoDB"),
    );
  } else {
    saveToJson();
  }
}
