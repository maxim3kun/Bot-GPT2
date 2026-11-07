import type { Collection } from "mongodb";
import type { ConversationMemory, ConversationMemoryRepository } from "./ai-conversation-memory-policy.js";

export interface ConversationMemoryDoc {
  _id: string; userKey: string; enabled: boolean; encryptedSummary: string;
  revision: string; enabledAt: Date; updatedAt: Date;
}

/** The Mongo contract is injectable so privacy/race cases run without touching real data. */
export function createConversationRepository(
  collection: () => Pick<Collection<ConversationMemoryDoc>, "findOne" | "updateOne">,
  codec: { encrypt(text: string): string; decrypt(text: string): string },
  key: (scope: string, userId: string) => string,
  revision: () => string,
): ConversationMemoryRepository {
  return {
    async read(scope, userId): Promise<ConversationMemory | null> {
      const doc = await collection().findOne({ _id: key(scope, userId) });
      if (!doc) return null;
      return {
        enabled: doc.enabled, summary: doc.enabled ? codec.decrypt(doc.encryptedSummary) : "",
        revision: doc.revision, enabledAt: doc.enabledAt, updatedAt: doc.updatedAt,
      };
    },
    async save(scope, userId, expected, summary) {
      const result = await collection().updateOne(
        { _id: key(scope, userId), enabled: true, revision: expected },
        { $set: { encryptedSummary: codec.encrypt(summary), revision: revision(), updatedAt: new Date() } },
      );
      return result.matchedCount === 1;
    },
  };
}
