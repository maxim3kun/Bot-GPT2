import { MongoClient, type Db, type Collection, type Filter } from "mongodb";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";
import { logger } from "./logger.js";

// ── Config ────────────────────────────────────────────────────────────

// DATABASE_URL is the sole project database secret. Never interpret a
// PostgreSQL connection string as a MongoDB address.
const _dbUrl = process.env["DATABASE_URL"] ?? "";
const mongoUrl = /^mongodb(?:\+srv)?:\/\//.test(_dbUrl) ? _dbUrl : "";
const ENCRYPTION_KEY_HEX = process.env["ENCRYPTION_KEY"] ?? "";

let encKey: Buffer | null = null;

if (ENCRYPTION_KEY_HEX) {
  if (ENCRYPTION_KEY_HEX.length !== 64) {
    logger.warn("ENCRYPTION_KEY must be a 64-character hex string (32 bytes) — encryption disabled");
  } else {
    encKey = Buffer.from(ENCRYPTION_KEY_HEX, "hex");
  }
}

// ── SHA-256 hashing ───────────────────────────────────────────────────────

export function hashUserId(discordId: string): string {
  return createHash("sha256").update(discordId).digest("hex");
}

// ── AES-256-GCM encryption ─────────────────────────────────────────────────────

export function encrypt(plaintext: string): string {
  if (!encKey) throw new Error("ENCRYPTION_KEY not configured");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey, iv);
  const ct  = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${ct.toString("hex")}`;
}

export function decrypt(data: string): string {
  if (!encKey) throw new Error("ENCRYPTION_KEY not configured");
  const parts = data.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted format");
  const iv      = Buffer.from(parts[0]!, "hex");
  const tag     = Buffer.from(parts[1]!, "hex");
  const ct      = Buffer.from(parts[2]!, "hex");
  const decipher = createDecipheriv("aes-256-gcm", encKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

// ── Document types ─────────────────────────────────────────────────────────

export interface UserDoc {
  _id: string;
  encryptedData: string;
  birthdayDay?: number;
  birthdayMonth?: number;
  updatedAt: Date;
}

export interface GuildDoc {
  _id: string;
  prefix?: string;
  lang?: string;
  birthdayChannelId?: string | null;
  adminChannelId?: string | null;
  playlists?: Record<string, string[]>;
  voicePickerChannelIds?: string[];
  updatedAt: Date;
}

export interface LikedTrack {
  title: string;
  url: string;
  likedAt: string; // ISO 8601
}

export interface UserData {
  discordId?: string;
  questProfile?: Record<string, unknown>;
  suggestPref?: boolean;
  birthday?: { day: number; month: number; userName: string };
  likes?: LikedTrack[];
}

export interface AiMemoryEntry {
  id: string;
  text: string;
  createdAt: string;
}

export type AiPersonaVisibility = "public" | "private";

export interface AiPersonaMemory {
  messageId: string;
  summary: string;
  interestScore: number;
  createdAt: string;
}

export type AiPersonaStyleCategory = "brevity" | "warmth" | "humor" | "questions" | "formality";
export type AiPersonaStyleValue =
  | "concise" | "detailed"
  | "warm" | "neutral"
  | "playful" | "serious"
  | "more" | "fewer"
  | "informal" | "formal";

export type AiPersonaStylePreferences = Partial<Record<AiPersonaStyleCategory, AiPersonaStyleValue>>;

export interface AiPersonaUserLearning {
  userId: string;
  learningConsent: boolean;
  knowledgeMemories: AiPersonaMemory[];
  processedMessageIds: string[];
  messagesAnalyzedTotal: number;
  stylePreferences: AiPersonaStylePreferences;
  updatedAt: string;
}

export interface AiPersonaRecord {
  id: string;
  ownerId: string;
  guildId: string | null;
  name: string;
  description: string;
  profile: string;
  visualDescription?: string;
  visualSeed?: number;
  visibility: AiPersonaVisibility;
  avatarConsent: boolean;
  generatedAvatarBase64?: string;
  customAvatarBase64?: string;
  avatarCdnUrl?: string;
  avatarCdnUpdatedAt?: string;
  avatarImageOptimized?: boolean;
  recentReplyMessageIds?: string[];
  knowledgeSummaries: string[];
  knowledgeMemories?: AiPersonaMemory[];
  learnedMessageIds: string[];
  processedMessageIds?: string[];
  userLearning?: AiPersonaUserLearning[];
  messagesAnalyzedTotal: number;
  learningConsent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiPersonaSessionRecord {
  userId: string;
  guildId: string | null;
  activePersonaId: string | null;
  lastPersonaId?: string;
  pendingDraft?: {
    name: string;
    description: string;
    waitingFor: "name" | "description";
  };
}

interface AiMemoryDoc {
  _id: string;
  encryptedData: string;
  updatedAt: Date;
}

interface AiPersonaDoc {
  _id: string;
  ownerKey: string;
  guildKey: string | null;
  visibility: AiPersonaVisibility;
  encryptedData: string;
  updatedAt: Date;
}

interface AiPersonaSessionDoc {
  _id: string;
  ownerKey: string;
  scopeKey: string;
  encryptedData: string;
  updatedAt: Date;
}

export interface AiTimezoneDoc {
  _id: string; // hashed Discord user id
  place: string;
  timezone: string;
  updatedAt: Date;
}

export interface BetaTesterDoc {
  _id: string; // Discord user id
  addedBy: string;
  addedAt: Date;
}

// ── MongoDB client ────────────────────────────────────────────────────────

// ── Logo brands cache ───────────────────────────────────────────────────────

export interface LogoBrandCacheDoc {
  _id: "logo_brands";
  brands: unknown[];
  updatedAt: Date;
}

// ── Logo brands store (per-brand documents with OCR test results) ──────────────

export interface LogoBrandMongoDoc {
  _id: string;           // domain, e.g. "apple.com"
  name: string;
  aliases: string[];
  domain: string;
  category: string;
  country: string;
  tier: 1 | 2 | 3;
  hints: string[];
  textLogo?: boolean;    // manual flag (pre-OCR era)
  // Image test results
  imageOk: boolean | null;
  imageSizeBytes: number | null;
  hasTextLogo: boolean | null;   // OCR detected brand name in image
  detectedText: string | null;   // raw OCR output
  lastTested: Date | null;
  // Admin overrides
  manualExclude: boolean;
  approved: boolean;     // imageOk && !hasTextLogo && !manualExclude
  updatedAt: Date;
}

export interface ArtistCacheDoc {
  _id: string;
  updatedAt: Date;
}

export interface CustomStationDoc {
  _id: string;
  name: string;
  url: string;
  emoji: string;
  genre: string;
  lang: "fr" | "es" | "en";
  addedBy: string;
  addedAt: Date;
}

// ── Food history ─────────────────────────────────────────────────────────

export interface FoodHistoryEntry {
  productName: string;
  brand: string;
  nutriscoreGrade: string;
  code: string;
  detectedAs: string; // "manual", "OCR: ...", "AI: ..."
  lookedUpAt: Date;
}

export interface FoodHistoryDoc {
  _id: string;           // hashed userId
  entries: FoodHistoryEntry[];
  updatedAt: Date;
}

export const FOOD_HISTORY_MAX = 10;

let mongoClient: MongoClient | null = null;
let db: Db | null = null;
let mongoHealthy = false;
export function getConversationMemoryCollection<T extends import("mongodb").Document>(): Collection<T> | null {
  return db?.collection<T>("ai_conversation_memory") ?? null;
}
/** Only dedicated, metadata-only bot telemetry collections are exposed here. */
export function getBotTelemetryCollection<T extends import("mongodb").Document>(
  name: "ai_response_feedback" | "ai_response_registry" | "bot_diagnostic_events" | "bot_diagnostic_deliveries",
): Collection<T> | null {
  return db?.collection<T>(name) ?? null;
}
interface DailyImageQuotaDoc {
  _id: string;
  count: number;
  updatedAt: Date;
}

export let usersCol: Collection<UserDoc> | null = null;
export let guildsCol: Collection<GuildDoc> | null = null;
export let logoBrandsCacheCol: Collection<LogoBrandCacheDoc> | null = null;
export let logoBrandsCol: Collection<LogoBrandMongoDoc> | null = null;
export let artistCacheCol: Collection<ArtistCacheDoc> | null = null;
export let customStationsCol: Collection<CustomStationDoc> | null = null;
export let foodHistoryCol: Collection<FoodHistoryDoc> | null = null;
export let aiConsentCol: Collection<{ userId: string; status: "accepted" | "declined" }> | null = null;
export let aiMemoryCol: Collection<AiMemoryDoc> | null = null;
export let aiPersonasCol: Collection<AiPersonaDoc> | null = null;
export let aiPersonaSessionsCol: Collection<AiPersonaSessionDoc> | null = null;
export let aiTimezoneCol: Collection<AiTimezoneDoc> | null = null;
export let dailyImageQuotaCol: Collection<DailyImageQuotaDoc> | null = null;
export let betaTestersCol: Collection<BetaTesterDoc> | null = null;
export let mgLeaderboardCol: Collection<{
  userId: string; guildId: string; username: string; avatarUrl?: string;
  bestScore: number; gamesPlayed: number; totalWon: number; wins: number; lastPlayed: Date;
}> | null = null;
export let sgStatsCol: Collection<{
  userId: string;
  gamesPlayed: number; wins: number; losses: number;
  currentStreak: number; bestStreak: number;
  coinsEarned: number; xpEarned: number; diamondsFound: number; jackpotsFound: number;
  dailyRewardsClaimed: number; lastPlayed: Date;
  dailyCoinDate: string | null; dailyCoinCount: number;
}> | null = null;

/** True when MongoDB is connected AND encryption key is ready (required for user-data CRUD). */
export function isDbReady(): boolean {
  return db !== null && encKey !== null;
}

/** True when MongoDB is connected (no encryption key required). Used for non-sensitive collections like logo_brands. */
export function isMongoConnected(): boolean {
  return db !== null;
}

/** Reports the latest known MongoDB heartbeat state without changing JSON fallback behavior. */
export function isMongoAvailable(): boolean {
  return db !== null && mongoHealthy;
}

export async function connectDb(): Promise<void> {
  if (!mongoUrl) {
    mongoHealthy = false;
    logger.warn("DATABASE_URL is missing or is not a MongoDB URL — running without MongoDB (JSON fallback active)");
    return;
  }
  if (!encKey) {
    logger.warn("ENCRYPTION_KEY not set — user-data encryption disabled; logo/guild data will still use MongoDB if DATABASE_URL is configured");
  }
  try {
    mongoClient = new MongoClient(mongoUrl, {
      connectTimeoutMS: 10_000,
      serverSelectionTimeoutMS: 10_000,
    });
    mongoClient.on("serverHeartbeatSucceeded", () => {
      mongoHealthy = true;
    });
    mongoClient.on("serverHeartbeatFailed", () => {
      mongoHealthy = false;
    });
    await mongoClient.connect();
    db = mongoClient.db();
    mongoHealthy = true;
    usersCol  = db.collection<UserDoc>("users");
    guildsCol = db.collection<GuildDoc>("guilds");
    logoBrandsCacheCol = db.collection<LogoBrandCacheDoc>("logo_brands_cache");
    logoBrandsCol = db.collection<LogoBrandMongoDoc>("logo_brands");
    artistCacheCol = db.collection<ArtistCacheDoc>("artist_cache");
    customStationsCol = db.collection<CustomStationDoc>("custom_radio_stations");
    foodHistoryCol = db.collection<FoodHistoryDoc>("food_history");
    aiConsentCol = db.collection("ai_consent");
    aiMemoryCol = db.collection<AiMemoryDoc>("ai_memory");
    aiPersonasCol = db.collection<AiPersonaDoc>("ai_personas");
    aiPersonaSessionsCol = db.collection<AiPersonaSessionDoc>("ai_persona_sessions");
    aiTimezoneCol = db.collection<AiTimezoneDoc>("ai_timezones");
    dailyImageQuotaCol = db.collection<DailyImageQuotaDoc>("daily_image_quotas");
    betaTestersCol = db.collection<BetaTesterDoc>("beta_testers");
    await aiConsentCol.createIndex({ userId: 1 }, { unique: true });
    await aiMemoryCol.createIndex({ updatedAt: -1 });
    await aiPersonasCol.createIndex({ ownerKey: 1, updatedAt: -1 });
    await aiPersonasCol.createIndex({ guildKey: 1, visibility: 1, updatedAt: -1 });
    await aiPersonaSessionsCol.createIndex({ ownerKey: 1, scopeKey: 1 }, { unique: true });
    await aiTimezoneCol.createIndex({ updatedAt: -1 });
    await dailyImageQuotaCol.createIndex({ updatedAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });
    await betaTestersCol.createIndex({ addedAt: -1 });
    mgLeaderboardCol = db.collection("mg_leaderboard");
    await mgLeaderboardCol.createIndex({ guildId: 1, bestScore: -1 });
    await mgLeaderboardCol.createIndex({ userId: 1, guildId: 1 }, { unique: true });
    sgStatsCol = db.collection("sg_stats");
    await sgStatsCol.createIndex({ userId: 1 }, { unique: true });
    await logoBrandsCol.createIndex({ tier: 1, approved: 1 });
    await usersCol.createIndex({ birthdayDay: 1, birthdayMonth: 1 }, { sparse: true });
    logger.info("MongoDB connected");
  } catch (err) {
    logger.error({ err }, "MongoDB connection failed — running without MongoDB (JSON fallback active)");
    mongoHealthy = false;
    mongoClient = null;
    db          = null;
    usersCol    = null;
    guildsCol   = null;
    dailyImageQuotaCol = null;
    aiMemoryCol = null;
    betaTestersCol = null;
  }
}

// ── Beta tester access ──────────────────────────────────────────────────────

export async function addBetaTester(userId: string, addedBy: string): Promise<boolean> {
  if (!betaTestersCol) return false;
  try {
    const existing = await betaTestersCol.findOne({ _id: userId });
    if (existing) return false;
    await betaTestersCol.insertOne({ _id: userId, addedBy, addedAt: new Date() });
    return true;
  } catch (err) {
    logger.error({ err }, "addBetaTester failed");
    return false;
  }
}

export async function removeBetaTester(userId: string): Promise<boolean> {
  if (!betaTestersCol) return false;
  try {
    const result = await betaTestersCol.deleteOne({ _id: userId });
    return result.deletedCount > 0;
  } catch (err) {
    logger.error({ err }, "removeBetaTester failed");
    return false;
  }
}

export async function isBetaTester(userId: string): Promise<boolean> {
  if (!betaTestersCol) return false;
  try {
    const doc = await betaTestersCol.findOne({ _id: userId });
    return !!doc;
  } catch (err) {
    logger.error({ err }, "isBetaTester failed");
    return false;
  }
}

export async function listBetaTesters(): Promise<BetaTesterDoc[]> {
  if (!betaTestersCol) return [];
  try {
    return await betaTestersCol.find({}).sort({ addedAt: -1 }).toArray();
  } catch (err) {
    logger.error({ err }, "listBetaTesters failed");
    return [];
  }
}

// ── AI timezone preference ───────────────────────────────────────────────────

export async function getAiTimezone(discordId: string): Promise<AiTimezoneDoc | null> {
  if (!aiTimezoneCol) return null;
  try {
    return await aiTimezoneCol.findOne({ _id: hashUserId(discordId) });
  } catch (err) {
    logger.error({ err }, "getAiTimezone failed");
    return null;
  }
}

export async function saveAiTimezone(discordId: string, place: string, timezone: string): Promise<void> {
  if (!aiTimezoneCol) return;
  try {
    await aiTimezoneCol.updateOne(
      { _id: hashUserId(discordId) },
      { $set: { place, timezone, updatedAt: new Date() } },
      { upsert: true },
    );
  } catch (err) {
    logger.error({ err }, "saveAiTimezone failed");
  }
}

// ── AI memory CRUD ────────────────────────────────────────────────────────
// Memory is always encrypted and keyed by a one-way hash of the Discord scope.
// User memories use guildId + userId; server memories use guildId + "server".

function aiMemoryId(guildId: string, userId: string): string {
  return `${hashUserId(guildId)}:${hashUserId(userId)}`;
}

export async function getAiMemory(guildId: string, userId: string): Promise<AiMemoryEntry[]> {
  if (!aiMemoryCol || !encKey) return [];
  try {
    const doc = await aiMemoryCol.findOne({ _id: aiMemoryId(guildId, userId) });
    if (!doc) return [];
    const parsed = JSON.parse(decrypt(doc.encryptedData)) as { entries?: AiMemoryEntry[] };
    return Array.isArray(parsed.entries) ? parsed.entries.slice(-20) : [];
  } catch (err) {
    logger.error({ err }, "getAiMemory failed");
    return [];
  }
}

export async function saveAiMemory(
  guildId: string,
  userId: string,
  entries: AiMemoryEntry[],
): Promise<boolean> {
  if (!aiMemoryCol || !encKey) return false;
  try {
    const bounded = entries
      .filter((entry) => entry.text.trim().length > 0)
      .slice(-20)
      .map((entry) => ({ ...entry, text: entry.text.trim().slice(0, 500) }));
    await aiMemoryCol.updateOne(
      { _id: aiMemoryId(guildId, userId) },
      {
        $set: {
          encryptedData: encrypt(JSON.stringify({ entries: bounded })),
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
    return true;
  } catch (err) {
    logger.error({ err }, "saveAiMemory failed");
    return false;
  }
}

export async function clearAiMemory(guildId: string, userId: string): Promise<boolean> {
  if (!aiMemoryCol) return false;
  try {
    await aiMemoryCol.deleteOne({ _id: aiMemoryId(guildId, userId) });
    return true;
  } catch (err) {
    logger.error({ err }, "clearAiMemory failed");
    return false;
  }
}

// ── AI personas ─────────────────────────────────────────────────────────────
// Persona content and generated avatar bytes are encrypted; searchable scope
// keys are one-way hashes so private records aren't indexed by Discord IDs.

function decodeAiPersona(doc: AiPersonaDoc): AiPersonaRecord {
  return JSON.parse(decrypt(doc.encryptedData)) as AiPersonaRecord;
}

function requireAiPersonaStorage(): Collection<AiPersonaDoc> {
  if (!aiPersonasCol || !encKey) {
    throw new Error("MongoDB and ENCRYPTION_KEY are required for persona storage");
  }
  return aiPersonasCol;
}

export async function listAiPersonasOwnedBy(ownerId: string): Promise<AiPersonaRecord[]> {
  const collection = requireAiPersonaStorage();
  const docs = await collection.find({ ownerKey: hashUserId(ownerId) })
    .sort({ updatedAt: -1 })
    .limit(100)
    .toArray();
  return docs.map(decodeAiPersona);
}

export async function listVisibleAiPersonas(
  guildId: string | null,
  userId: string,
): Promise<AiPersonaRecord[]> {
  const collection = requireAiPersonaStorage();
  const filters: Filter<AiPersonaDoc>[] = [{ ownerKey: hashUserId(userId) }];
  if (guildId) {
    filters.push({ guildKey: hashUserId(guildId), visibility: "public" });
  }
  const docs = await collection.find({ $or: filters })
    .sort({ updatedAt: -1 })
    .limit(100)
    .toArray();
  return docs
    .map(decodeAiPersona)
    .filter((persona) =>
      (persona.visibility === "private" && persona.ownerId === userId)
      || (persona.visibility === "public" && Boolean(guildId) && persona.guildId === guildId),
    );
}

export async function getAiPersona(id: string): Promise<AiPersonaRecord | null> {
  const collection = requireAiPersonaStorage();
  const doc = await collection.findOne({ _id: id });
  return doc ? decodeAiPersona(doc) : null;
}

const AI_PERSONA_STYLE_OPTIONS: Record<AiPersonaStyleCategory, AiPersonaStyleValue[]> = {
  brevity: ["concise", "detailed"],
  warmth: ["warm", "neutral"],
  humor: ["playful", "serious"],
  questions: ["more", "fewer"],
  formality: ["informal", "formal"],
};

function sanitizePersonaStylePreferences(
  preferences: AiPersonaStylePreferences | undefined,
): AiPersonaStylePreferences {
  const sanitized: AiPersonaStylePreferences = {};
  for (const [category, value] of Object.entries(preferences ?? {})) {
    if (
      category in AI_PERSONA_STYLE_OPTIONS
      && AI_PERSONA_STYLE_OPTIONS[category as AiPersonaStyleCategory].includes(value as AiPersonaStyleValue)
    ) {
      sanitized[category as AiPersonaStyleCategory] = value as AiPersonaStyleValue;
    }
  }
  return sanitized;
}

export async function saveAiPersona(persona: AiPersonaRecord): Promise<void> {
  const collection = requireAiPersonaStorage();
  if (persona.visibility === "public" && !persona.guildId) {
    throw new Error("A public persona must belong to a Discord server");
  }
  const bounded: AiPersonaRecord = {
    ...persona,
    name: persona.name.trim().slice(0, 50),
    description: persona.description.trim().slice(0, 2_000),
    profile: persona.profile.trim().slice(0, 2_000),
    visualDescription: persona.visualDescription?.trim().slice(0, 2_000),
    visualSeed: Number.isInteger(persona.visualSeed)
      && (persona.visualSeed ?? -1) >= 0
      && (persona.visualSeed ?? 0) <= 0x7fffffff
      ? persona.visualSeed
      : undefined,
    knowledgeSummaries: persona.knowledgeSummaries
      .map((summary) => summary.trim().slice(0, 1_000))
      .filter(Boolean)
      .slice(-20),
    knowledgeMemories: (persona.knowledgeMemories ?? [])
      .map((memory) => ({
        messageId: memory.messageId.trim().slice(0, 64),
        summary: memory.summary.trim().slice(0, 300),
        interestScore: Math.max(0, Math.min(10, Math.floor(memory.interestScore))),
        createdAt: memory.createdAt,
      }))
      .filter((memory) => memory.messageId && memory.summary)
      .sort((a, b) => b.interestScore - a.interestScore || a.createdAt.localeCompare(b.createdAt))
      .slice(0, 2_000),
    learnedMessageIds: [...new Set(persona.learnedMessageIds)].slice(-2_000),
    processedMessageIds: [...new Set([
      ...(persona.processedMessageIds ?? []),
      ...persona.learnedMessageIds,
    ])].slice(-5_000),
    userLearning: (persona.userLearning ?? [])
      .filter((learning) => learning.userId && learning.learningConsent)
      .map((learning) => ({
        userId: learning.userId.slice(0, 64),
        learningConsent: true,
        knowledgeMemories: (learning.knowledgeMemories ?? [])
          .map((memory) => ({
            messageId: memory.messageId.trim().slice(0, 64),
            summary: memory.summary.trim().slice(0, 300),
            interestScore: Math.max(0, Math.min(10, Math.floor(memory.interestScore))),
            createdAt: memory.createdAt,
          }))
          .filter((memory) => memory.messageId && memory.summary)
          .sort((a, b) => b.interestScore - a.interestScore || a.createdAt.localeCompare(b.createdAt))
          .slice(0, 40),
        processedMessageIds: [...new Set(learning.processedMessageIds ?? [])].slice(-300),
        messagesAnalyzedTotal: Math.max(0, Math.min(1_000_000_000, Math.floor(learning.messagesAnalyzedTotal))),
        stylePreferences: sanitizePersonaStylePreferences(learning.stylePreferences),
        updatedAt: learning.updatedAt.slice(0, 40),
      }))
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
      .slice(-100),
    messagesAnalyzedTotal: Math.max(0, Math.min(1_000_000_000, Math.floor(persona.messagesAnalyzedTotal))),
    generatedAvatarBase64: persona.generatedAvatarBase64?.slice(0, 6_000_000),
    customAvatarBase64: persona.customAvatarBase64?.slice(0, 400_000),
    avatarCdnUrl: persona.avatarCdnUrl?.slice(0, 2_000),
    avatarCdnUpdatedAt: persona.avatarCdnUpdatedAt?.slice(0, 40),
    avatarImageOptimized: persona.avatarImageOptimized === true,
    recentReplyMessageIds: [...new Set(persona.recentReplyMessageIds ?? [])].slice(-300),
  };
  const updatedAt = new Date();
  bounded.updatedAt = updatedAt.toISOString();
  await collection.updateOne(
    { _id: bounded.id },
    {
      $set: {
        ownerKey: hashUserId(bounded.ownerId),
        guildKey: bounded.guildId ? hashUserId(bounded.guildId) : null,
        visibility: bounded.visibility,
        encryptedData: encrypt(JSON.stringify(bounded)),
        updatedAt,
      },
    },
    { upsert: true },
  );
}

function aiPersonaSessionId(userId: string, guildId: string | null): string {
  return hashUserId(`ai-persona-session:${guildId ?? "dm"}:${userId}`);
}

function requireAiPersonaSessionStorage(): Collection<AiPersonaSessionDoc> {
  if (!aiPersonaSessionsCol || !encKey) {
    throw new Error("MongoDB and ENCRYPTION_KEY are required for persona sessions");
  }
  return aiPersonaSessionsCol;
}

export async function getAiPersonaSession(
  userId: string,
  guildId: string | null,
): Promise<AiPersonaSessionRecord | null> {
  const collection = requireAiPersonaSessionStorage();
  const doc = await collection.findOne({ _id: aiPersonaSessionId(userId, guildId) });
  if (!doc) return null;
  const session = JSON.parse(decrypt(doc.encryptedData)) as AiPersonaSessionRecord;
  return session.userId === userId && session.guildId === guildId ? session : null;
}

export async function saveAiPersonaSession(session: AiPersonaSessionRecord): Promise<void> {
  const collection = requireAiPersonaSessionStorage();
  const id = aiPersonaSessionId(session.userId, session.guildId);
  if (!session.activePersonaId && !session.lastPersonaId && !session.pendingDraft) {
    await collection.deleteOne({ _id: id, ownerKey: hashUserId(session.userId) });
    return;
  }
  const bounded: AiPersonaSessionRecord = {
    userId: session.userId,
    guildId: session.guildId,
    activePersonaId: session.activePersonaId?.slice(0, 64) ?? null,
    ...(session.lastPersonaId ? { lastPersonaId: session.lastPersonaId.slice(0, 64) } : {}),
    ...(session.pendingDraft ? {
      pendingDraft: {
        name: session.pendingDraft.name.trim().slice(0, 50),
        description: session.pendingDraft.description.trim().slice(0, 2_000),
        waitingFor: session.pendingDraft.waitingFor,
      },
    } : {}),
  };
  const scopeKey = hashUserId(session.guildId ?? "dm");
  await collection.updateOne(
    { _id: id },
    {
      $set: {
        ownerKey: hashUserId(session.userId),
        scopeKey,
        encryptedData: encrypt(JSON.stringify(bounded)),
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
}

export type DailyImageQuotaResult = "reserved" | "limit_reached" | "unavailable";

export async function reserveDailyImageQuota(dayKey: string, limit: number): Promise<DailyImageQuotaResult> {
  const collection = dailyImageQuotaCol;
  if (!collection || !/^\d{4}-\d{2}-\d{2}(?::image)?$/.test(dayKey) || !Number.isInteger(limit) || limit < 1) {
    return "unavailable";
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await collection.updateOne(
        { _id: dayKey, count: { $lt: limit } },
        { $inc: { count: 1 }, $set: { updatedAt: new Date() } },
        { upsert: true },
      );
      return "reserved";
    } catch (error) {
      const isDuplicateKey = typeof error === "object"
        && error !== null
        && "code" in error
        && error.code === 11000;
      if (isDuplicateKey) {
        const current = await collection.findOne({ _id: dayKey }).catch(() => null);
        if ((current?.count ?? 0) >= limit) return "limit_reached";
        continue;
      }
      logger.error({ error }, "Could not reserve daily image quota");
      return "unavailable";
    }
  }
  return "unavailable";
}

export async function releaseDailyImageQuota(dayKey: string): Promise<void> {
  const collection = dailyImageQuotaCol;
  if (!collection || !/^\d{4}-\d{2}-\d{2}(?::image)?$/.test(dayKey)) return;
  try {
    await collection.updateOne(
      { _id: dayKey, count: { $gt: 0 } },
      { $inc: { count: -1 }, $set: { updatedAt: new Date() } },
    );
  } catch (error) {
    logger.error({ error }, "Could not release daily image quota");
  }
}

export async function deleteAiPersona(id: string, ownerId: string): Promise<boolean> {
  const collection = requireAiPersonaStorage();
  const result = await collection.deleteOne({ _id: id, ownerKey: hashUserId(ownerId) });
  return result.deletedCount > 0;
}

// ── User CRUD ──────────────────────────────────────────────────────────

export async function getUserData(discordId: string): Promise<UserData | null> {
  if (!usersCol || !encKey) return null;
  try {
    const doc = await usersCol.findOne({ _id: hashUserId(discordId) });
    if (!doc) return null;
    return JSON.parse(decrypt(doc.encryptedData)) as UserData;
  } catch (err) {
    logger.error({ err }, "getUserData failed");
    return null;
  }
}

export async function upsertUserData(discordId: string, data: UserData): Promise<void> {
  if (!usersCol || !encKey) return;
  try {
    const hash          = hashUserId(discordId);
    const dataWithId: UserData = { ...data, discordId };
    const encryptedData = encrypt(JSON.stringify(dataWithId));
    if (dataWithId.birthday) {
      await usersCol.updateOne(
        { _id: hash },
        { $set: { encryptedData, birthdayDay: dataWithId.birthday.day, birthdayMonth: dataWithId.birthday.month, updatedAt: new Date() } },
        { upsert: true },
      );
    } else {
      await usersCol.updateOne(
        { _id: hash },
        { $set: { encryptedData, updatedAt: new Date() }, $unset: { birthdayDay: "", birthdayMonth: "" } },
        { upsert: true },
      );
    }
  } catch (err) {
    logger.error({ err }, "upsertUserData failed");
  }
}

/**
 * Read-modify-write: merges `patch` over the stored UserData for a given Discord user.
 * Bug 3 fix: per-user mutex (Promise chain) so concurrent writes for the same user
 * are serialized instead of overwriting each other.
 */
const _patchLocks = new Map<string, Promise<void>>();

export async function patchUserData(discordId: string, patch: Partial<UserData>): Promise<void> {
  if (!usersCol || !encKey) return;
  const key = hashUserId(discordId);
  const prev = _patchLocks.get(key) ?? Promise.resolve();
  const next = prev.then(async () => {
    try {
      const existing = (await getUserData(discordId)) ?? {};
      const merged: UserData = { ...existing, ...patch };
      await upsertUserData(discordId, merged);
    } catch (err) {
      logger.error({ err }, "patchUserData failed");
    }
  });
  _patchLocks.set(key, next);
  next.finally(() => {
    if (_patchLocks.get(key) === next) _patchLocks.delete(key);
  }).catch(() => null);
  await next;
}

export async function getAllUserDocs(): Promise<Array<{ hash: string; data: UserData }>> {
  if (!usersCol || !encKey) return [];
  try {
    const docs = await usersCol.find({}).toArray();
    const out: Array<{ hash: string; data: UserData }> = [];
    for (const doc of docs) {
      try {
        out.push({ hash: doc._id, data: JSON.parse(decrypt(doc.encryptedData)) as UserData });
      } catch (err) {
        logger.error({ err, hash: doc._id }, "Failed to decrypt user doc — skipping");
      }
    }
    return out;
  } catch (err) {
    logger.error({ err }, "getAllUserDocs failed");
    return [];
  }
}

export async function getUsersWithBirthday(day: number, month: number): Promise<UserData[]> {
  if (!usersCol || !encKey) return [];
  try {
    const docs = await usersCol.find({ birthdayDay: day, birthdayMonth: month }).toArray();
    const out: UserData[] = [];
    for (const doc of docs) {
      try {
        out.push(JSON.parse(decrypt(doc.encryptedData)) as UserData);
      } catch (err) {
        logger.error({ err, hash: doc._id }, "Failed to decrypt birthday doc — skipping");
      }
    }
    return out;
  } catch (err) {
    logger.error({ err }, "getUsersWithBirthday failed");
    return [];
  }
}

// ── Guild CRUD ──────────────────────────────────────────────────────────

export async function getGuildDoc(guildId: string): Promise<GuildDoc | null> {
  if (!guildsCol) return null;
  try {
    return await guildsCol.findOne({ _id: guildId });
  } catch (err) {
    logger.error({ err }, "getGuildDoc failed");
    return null;
  }
}

export async function upsertGuildDoc(
  guildId: string,
  patch: Partial<Omit<GuildDoc, "_id" | "updatedAt">>,
): Promise<void> {
  if (!guildsCol) return;
  try {
    await guildsCol.updateOne(
      { _id: guildId },
      { $set: { ...patch, updatedAt: new Date() } },
      { upsert: true },
    );
  } catch (err) {
    logger.error({ err }, "upsertGuildDoc failed");
  }
}

export async function getAllGuildDocs(): Promise<GuildDoc[]> {
  if (!guildsCol) return [];
  try {
    return await guildsCol.find({}).toArray();
  } catch (err) {
    logger.error({ err }, "getAllGuildDocs failed");
    return [];
  }
}

// ── Food history CRUD ───────────────────────────────────────────────────────

export async function saveFoodHistory(discordId: string, entry: FoodHistoryEntry): Promise<void> {
  if (!foodHistoryCol) return;
  try {
    const hash = hashUserId(discordId);
    await foodHistoryCol.updateOne(
      { _id: hash },
      {
        $push: {
          entries: {
            $each: [entry],
            $slice: -FOOD_HISTORY_MAX,
          },
        } as never,
        $set: { updatedAt: new Date() },
      },
      { upsert: true },
    );
  } catch (err) {
    logger.error({ err }, "saveFoodHistory failed");
  }
}

export async function getFoodHistory(discordId: string): Promise<FoodHistoryEntry[]> {
  if (!foodHistoryCol) return [];
  try {
    const doc = await foodHistoryCol.findOne({ _id: hashUserId(discordId) });
    return doc?.entries ?? [];
  } catch (err) {
    logger.error({ err }, "getFoodHistory failed");
    return [];
  }
}

export async function clearFoodHistory(discordId: string): Promise<void> {
  if (!foodHistoryCol) return;
  try {
    await foodHistoryCol.deleteOne({ _id: hashUserId(discordId) });
  } catch (err) {
    logger.error({ err }, "clearFoodHistory failed");
  }
}

// ── DB storage stats ────────────────────────────────────────────────────────

export interface DbStats {
  dataSize: number;    // bytes — uncompressed data
  storageSize: number; // bytes — allocated on disk
  objects: number;     // total document count
  collections: number;
}

export async function getDbStats(): Promise<DbStats | null> {
  if (!db) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s: any = await db.command({ dbStats: 1 });
    return {
      dataSize:    Number(s.dataSize    ?? 0),
      storageSize: Number(s.storageSize ?? 0),
      objects:     Number(s.objects     ?? 0),
      collections: Number(s.collections ?? 0),
    };
  } catch (err) {
    logger.error({ err }, "getDbStats failed");
    return null;
  }
}
