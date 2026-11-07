import { randomUUID } from "node:crypto";
import { decrypt, encrypt, getConversationMemoryCollection, hashUserId } from "../lib/db.js";
import { createConversationRepository, type ConversationMemoryDoc } from "./ai-conversation-repository.js";
function collection() {
  const value = getConversationMemoryCollection<ConversationMemoryDoc>();
  if (!value) throw new Error("Conversation memory storage unavailable");
  return value;
}
function key(scope: string, userId: string) { return `${hashUserId(scope)}:${hashUserId(userId)}`; }

export const conversationMemoryRepository = createConversationRepository(collection, { encrypt, decrypt }, key, randomUUID);

export async function setConversationMemory(scope: string, userId: string, enabled: boolean): Promise<void> {
  // Encrypt first: never enable storage when the encryption key is missing.
  const empty = encrypt("");
  const now = new Date();
  await collection().updateOne({ _id: key(scope, userId) }, {
    $set: { enabled, enabledAt: now, revision: randomUUID(), updatedAt: now, ...(!enabled ? { encryptedSummary: empty } : {}) },
    $setOnInsert: { userKey: hashUserId(userId), ...(enabled ? { encryptedSummary: empty } : {}) },
  }, { upsert: true });
}

export async function clearConversationMemory(scope: string, userId: string): Promise<void> {
  await collection().deleteOne({ _id: key(scope, userId) });
}

export async function clearAllConversationMemory(userId: string): Promise<void> {
  await collection().deleteMany({ userKey: hashUserId(userId) });
}
