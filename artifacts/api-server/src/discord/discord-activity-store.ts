import { randomUUID } from "node:crypto";
import {
  decrypt,
  encrypt,
  getDiscordActivitySessionsCollection,
  getDiscordActivityStoriesCollection,
  isDbReady,
} from "../lib/db.js";
import type { DiscordActivitySessionDoc, DiscordActivityStoryDoc } from "../lib/db.js";
import { discordActivityGuildKey, discordActivityMemberKey } from "./discord-activity-security.js";

const ACTIVE_SESSION_TTL_MS = 4 * 60 * 60 * 1_000;
const STORY_MAX_LENGTH = 4_000;

export interface ActivitySession {
  sessionId: string;
  expiresAt: string;
}

export interface PrivateActivityStory {
  consentAccepted: boolean;
  story: string;
  updatedAt: string | null;
}

export interface PrivateActivityStoryRepository {
  findById(id: string): Promise<DiscordActivityStoryDoc | null>;
  acceptConsent(id: string, now: Date): Promise<void>;
  withdrawConsent(id: string): Promise<void>;
  saveEncryptedStoryIfConsented(id: string, encryptedStory: string, now: Date): Promise<boolean>;
  deleteStoryIfConsented(id: string, now: Date): Promise<boolean>;
}

export function createPrivateActivityStoryService(
  repository: PrivateActivityStoryRepository,
  codec: { encrypt(value: string): string; decrypt(value: string): string },
  ready: () => boolean,
) {
  return {
    async get(guildId: string, userId: string): Promise<PrivateActivityStory> {
      if (!ready()) throw new Error("discord_activity_encrypted_storage_unavailable");
      const record = await repository.findById(discordActivityStoryKey(guildId, userId));
      if (!record?.consentAccepted) {
        return { consentAccepted: false, story: "", updatedAt: null };
      }
      return {
        consentAccepted: true,
        story: record.encryptedStory ? codec.decrypt(record.encryptedStory) : "",
        updatedAt: record.encryptedStory ? record.updatedAt.toISOString() : null,
      };
    },
    async setConsent(guildId: string, userId: string, accepted: boolean, now = new Date()): Promise<void> {
      if (!ready()) throw new Error("discord_activity_encrypted_storage_unavailable");
      const id = discordActivityStoryKey(guildId, userId);
      if (accepted) await repository.acceptConsent(id, now);
      else await repository.withdrawConsent(id);
    },
    async save(guildId: string, userId: string, story: string, now = new Date()): Promise<boolean> {
      if (!ready()) throw new Error("discord_activity_encrypted_storage_unavailable");
      const text = story.trim();
      if (!text || text.length > STORY_MAX_LENGTH) throw new Error("invalid_activity_story");
      return repository.saveEncryptedStoryIfConsented(
        discordActivityStoryKey(guildId, userId),
        codec.encrypt(text),
        now,
      );
    },
    async delete(guildId: string, userId: string, now = new Date()): Promise<boolean> {
      if (!ready()) throw new Error("discord_activity_encrypted_storage_unavailable");
      return repository.deleteStoryIfConsented(discordActivityStoryKey(guildId, userId), now);
    },
  };
}

function requireMongo() {
  const sessions = getDiscordActivitySessionsCollection();
  const stories = getDiscordActivityStoriesCollection();
  if (!sessions || !stories) throw new Error("discord_activity_storage_unavailable");
  return { sessions, stories };
}

const privateStoryService = createPrivateActivityStoryService({
  async findById(id) {
    return requireMongo().stories.findOne({ _id: id });
  },
  async acceptConsent(id, now) {
    await requireMongo().stories.updateOne(
      { _id: id },
      {
        $set: { consentAccepted: true, consentAcceptedAt: now, updatedAt: now },
      },
      { upsert: true },
    );
  },
  async withdrawConsent(id) {
    // Withdrawal also erases the encrypted story and consent record.
    await requireMongo().stories.deleteOne({ _id: id });
  },
  async saveEncryptedStoryIfConsented(id, encryptedStory, now) {
    const result = await requireMongo().stories.updateOne(
      { _id: id, consentAccepted: true },
      { $set: { encryptedStory, updatedAt: now } },
    );
    return result.matchedCount === 1;
  },
  async deleteStoryIfConsented(id, now) {
    const result = await requireMongo().stories.updateOne(
      { _id: id, consentAccepted: true },
      { $unset: { encryptedStory: "" }, $set: { updatedAt: now } },
    );
    return result.matchedCount === 1;
  },
}, { encrypt, decrypt }, isDbReady);

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: unknown }).code === 11000;
}

export async function ensureDiscordActivitySession(
  guildId: string,
  now = new Date(),
): Promise<ActivitySession> {
  const { sessions } = requireMongo();
  const guildKey = discordActivityGuildKey(guildId);
  const active = await sessions.findOne({ _id: guildKey, expiresAt: { $gt: now } });
  if (active) {
    const expiresAt = new Date(now.getTime() + ACTIVE_SESSION_TTL_MS);
    await sessions.updateOne(
      { _id: guildKey, sessionId: active.sessionId, expiresAt: { $gt: now } },
      { $set: { updatedAt: now, expiresAt } },
    );
    const refreshed = await sessions.findOne({ _id: guildKey, sessionId: active.sessionId, expiresAt: { $gt: now } });
    if (refreshed) return { sessionId: refreshed.sessionId, expiresAt: refreshed.expiresAt.toISOString() };
  }

  const expiresAt = new Date(now.getTime() + ACTIVE_SESSION_TTL_MS);
  const sessionId = randomUUID();
  try {
    await sessions.updateOne(
      {
        _id: guildKey,
        $or: [{ expiresAt: { $lte: now } }, { expiresAt: { $exists: false } }],
      },
      { $set: { sessionId, createdAt: now, updatedAt: now, expiresAt } },
      { upsert: true },
    );
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    // Another process created the guild's active session first. Join it instead.
  }

  const current = await sessions.findOne({ _id: guildKey, expiresAt: { $gt: now } });
  if (!current) throw new Error("discord_activity_session_unavailable");
  return { sessionId: current.sessionId, expiresAt: current.expiresAt.toISOString() };
}

export async function isCurrentDiscordActivitySession(
  guildId: string,
  sessionId: string,
  now = new Date(),
): Promise<boolean> {
  const { sessions } = requireMongo();
  return Boolean(await sessions.findOne({
    _id: discordActivityGuildKey(guildId),
    sessionId,
    expiresAt: { $gt: now },
  }));
}

export function discordActivityStoryKey(guildId: string, userId: string): string {
  return discordActivityMemberKey(guildId, userId);
}

export async function getPrivateActivityStory(
  guildId: string,
  userId: string,
): Promise<PrivateActivityStory> {
  return privateStoryService.get(guildId, userId);
}

export async function setPrivateActivityStoryConsent(
  guildId: string,
  userId: string,
  accepted: boolean,
  now = new Date(),
): Promise<void> {
  return privateStoryService.setConsent(guildId, userId, accepted, now);
}

export async function savePrivateActivityStory(
  guildId: string,
  userId: string,
  story: string,
  now = new Date(),
): Promise<boolean> {
  return privateStoryService.save(guildId, userId, story, now);
}

export async function deletePrivateActivityStory(
  guildId: string,
  userId: string,
  now = new Date(),
): Promise<boolean> {
  return privateStoryService.delete(guildId, userId, now);
}

export function isValidActivityStoryRecord(record: DiscordActivityStoryDoc | null): boolean {
  return Boolean(record?.consentAccepted && record.encryptedStory);
}

export function isValidActivitySessionRecord(
  record: DiscordActivitySessionDoc | null,
  now = new Date(),
): boolean {
  return Boolean(record && record.expiresAt.getTime() > now.getTime());
}

