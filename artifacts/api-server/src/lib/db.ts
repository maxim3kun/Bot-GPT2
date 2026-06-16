import { MongoClient, type Db, type Collection } from "mongodb";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";
import { logger } from "./logger.js";

// ── Config ─────────────────────────────────────────────────────────────────────

const DATABASE_URL      = process.env["DATABASE_URL"] ?? "";
const ENCRYPTION_KEY_HEX = process.env["ENCRYPTION_KEY"] ?? "";

let encKey: Buffer | null = null;

if (ENCRYPTION_KEY_HEX) {
  if (ENCRYPTION_KEY_HEX.length !== 64) {
    logger.warn("ENCRYPTION_KEY must be a 64-character hex string (32 bytes) — encryption disabled");
  } else {
    encKey = Buffer.from(ENCRYPTION_KEY_HEX, "hex");
  }
}

// ── SHA-256 hashing ────────────────────────────────────────────────────────────

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

// ── Document types ─────────────────────────────────────────────────────────────

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

// ── MongoDB client ─────────────────────────────────────────────────────────────

let mongoClient: MongoClient | null = null;
let db: Db | null = null;
export let usersCol: Collection<UserDoc> | null = null;
export let guildsCol: Collection<GuildDoc> | null = null;

export function isDbReady(): boolean {
  return db !== null && encKey !== null;
}

export async function connectDb(): Promise<void> {
  if (!DATABASE_URL) {
    logger.warn("DATABASE_URL not set — running without MongoDB (JSON fallback active)");
    return;
  }
  if (!encKey) {
    logger.warn("ENCRYPTION_KEY not set — running without MongoDB (JSON fallback active)");
    return;
  }
  try {
    mongoClient = new MongoClient(DATABASE_URL);
    await mongoClient.connect();
    db = mongoClient.db();
    usersCol  = db.collection<UserDoc>("users");
    guildsCol = db.collection<GuildDoc>("guilds");
    await usersCol.createIndex({ birthdayDay: 1, birthdayMonth: 1 }, { sparse: true });
    logger.info("MongoDB connected");
  } catch (err) {
    logger.error({ err }, "MongoDB connection failed — running without MongoDB (JSON fallback active)");
    mongoClient = null;
    db          = null;
    usersCol    = null;
    guildsCol   = null;
  }
}

// ── User CRUD ──────────────────────────────────────────────────────────────────

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
 * This ensures one module's write (e.g. quest progress) never clobbers another's (e.g. birthday).
 */
export async function patchUserData(discordId: string, patch: Partial<UserData>): Promise<void> {
  if (!usersCol || !encKey) return;
  try {
    const existing = (await getUserData(discordId)) ?? {};
    const merged: UserData = { ...existing, ...patch };
    await upsertUserData(discordId, merged);
  } catch (err) {
    logger.error({ err }, "patchUserData failed");
  }
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

// ── Guild CRUD ─────────────────────────────────────────────────────────────────

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
