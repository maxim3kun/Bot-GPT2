import { createHash } from "node:crypto";

export interface ActivityConversationTurn {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  memberScope: string;
  turns: ActivityConversationTurn[];
  updatedAt: number;
}

const MAX_TURNS = 12;
const HISTORY_TTL_MS = 30 * 60 * 1_000;
const MAX_CONVERSATIONS = 2_000;
const conversations = new Map<string, Conversation>();

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function scopeForMember(guildId: string, userId: string): string {
  return hash(`discord-activity-member-v1:${guildId}:${userId}`);
}

function keyForConversation(
  guildId: string,
  userId: string,
  sessionId: string,
  conversationId: string,
): string {
  return hash(`discord-activity-chat-v1:${guildId}:${userId}:${sessionId}:${conversationId}`);
}

function prune(now: number): void {
  for (const [key, conversation] of conversations) {
    if (conversation.updatedAt <= now - HISTORY_TTL_MS) conversations.delete(key);
  }
  while (conversations.size > MAX_CONVERSATIONS) {
    const oldest = conversations.keys().next().value;
    if (!oldest) break;
    conversations.delete(oldest);
  }
}

const cleanupTimer = setInterval(() => prune(Date.now()), 30_000);
cleanupTimer.unref();

export function getActivityConversation(input: {
  guildId: string;
  userId: string;
  sessionId: string;
  conversationId: string;
}, now = Date.now()): ActivityConversationTurn[] {
  prune(now);
  const conversation = conversations.get(keyForConversation(
    input.guildId, input.userId, input.sessionId, input.conversationId,
  ));
  return conversation?.turns.map((turn) => ({ ...turn })) ?? [];
}

export function appendActivityConversationTurn(input: {
  guildId: string;
  userId: string;
  sessionId: string;
  conversationId: string;
}, turn: ActivityConversationTurn, now = Date.now()): void {
  prune(now);
  const key = keyForConversation(
    input.guildId, input.userId, input.sessionId, input.conversationId,
  );
  const memberScope = scopeForMember(input.guildId, input.userId);
  const conversation = conversations.get(key) ?? { memberScope, turns: [], updatedAt: now };
  conversation.turns = [...conversation.turns, turn].slice(-MAX_TURNS);
  conversation.updatedAt = now;
  conversations.set(key, conversation);
  prune(now);
}

export function clearActivityConversation(input: {
  guildId: string;
  userId: string;
  sessionId: string;
  conversationId: string;
}): void {
  conversations.delete(keyForConversation(
    input.guildId, input.userId, input.sessionId, input.conversationId,
  ));
}

export function clearActivityConversationsForMember(guildId: string, userId: string): void {
  const memberScope = scopeForMember(guildId, userId);
  for (const [key, conversation] of conversations) {
    if (conversation.memberScope === memberScope) conversations.delete(key);
  }
}

export function clearAllActivityConversationsForTests(): void {
  conversations.clear();
}
