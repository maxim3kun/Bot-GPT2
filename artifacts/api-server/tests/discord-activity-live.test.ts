import assert from "node:assert/strict";
import test from "node:test";
import {
  appendActivityConversationTurn,
  clearActivityConversation,
  clearActivityConversationsForMember,
  clearAllActivityConversationsForTests,
  getActivityConversation,
} from "../src/discord/discord-activity-conversations.js";
import {
  clearActivityAvatarEventsForTests,
  getActivityAvatarEvent,
  publishActivityAvatarMode,
  subscribeToActivityAvatar,
} from "../src/discord/discord-activity-events.js";

const GUILD_A = "123456789012345678";
const GUILD_B = "223456789012345678";
const USER_A = "323456789012345678";
const USER_B = "423456789012345678";
const SESSION = "123e4567-e89b-12d3-a456-426614174000";
const CONVERSATION = "423e4567-e89b-12d3-a456-426614174000";

test("Activity conversation history stays private to member, server, session and tab", () => {
  clearAllActivityConversationsForTests();
  const a = { guildId: GUILD_A, userId: USER_A, sessionId: SESSION, conversationId: CONVERSATION };
  appendActivityConversationTurn(a, { role: "user", content: "private text" }, 100);
  appendActivityConversationTurn(a, { role: "assistant", content: "private reply" }, 101);

  assert.deepEqual(getActivityConversation(a, 102).map((turn) => turn.content), ["private text", "private reply"]);
  assert.deepEqual(getActivityConversation({ ...a, userId: USER_B }, 102), []);
  assert.deepEqual(getActivityConversation({ ...a, guildId: GUILD_B }, 102), []);
  assert.deepEqual(getActivityConversation({ ...a, sessionId: `${SESSION}-other` }, 102), []);
  assert.deepEqual(getActivityConversation({ ...a, conversationId: `${CONVERSATION}-other` }, 102), []);

  clearActivityConversation(a);
  assert.deepEqual(getActivityConversation(a, 102), []);
});

test("Activity conversation memory expires and can be erased for one member", () => {
  clearAllActivityConversationsForTests();
  const a = { guildId: GUILD_A, userId: USER_A, sessionId: SESSION, conversationId: CONVERSATION };
  const other = { ...a, conversationId: "523e4567-e89b-12d3-a456-426614174000" };
  appendActivityConversationTurn(a, { role: "user", content: "temporary" }, 100);
  appendActivityConversationTurn(other, { role: "user", content: "also temporary" }, 101);

  clearActivityConversationsForMember(GUILD_A, USER_A);
  assert.deepEqual(getActivityConversation(a, 102), []);
  assert.deepEqual(getActivityConversation(other, 102), []);

  appendActivityConversationTurn(a, { role: "user", content: "expires" }, 1_000);
  assert.deepEqual(getActivityConversation(a, 1_000 + 30 * 60_000), []);
});

test("live avatar status is shared only within its Discord server and carries no chat text", () => {
  clearActivityAvatarEventsForTests();
  const received: unknown[] = [];
  const unsubscribe = subscribeToActivityAvatar(GUILD_A, (event) => received.push(event));
  publishActivityAvatarMode(GUILD_A, "speaking");
  publishActivityAvatarMode(GUILD_B, "listening");

  assert.equal(received.length, 1);
  assert.deepEqual(received[0] && Object.keys(received[0] as object).sort(), ["mode", "updatedAt"]);
  assert.equal(getActivityAvatarEvent(GUILD_A).mode, "speaking");
  assert.equal(getActivityAvatarEvent(GUILD_B).mode, "listening");
  unsubscribe?.();
  publishActivityAvatarMode(GUILD_A, "idle");
  assert.equal(received.length, 1);
});

test("voice interruption sends a stop signal without any transcript", () => {
  clearActivityAvatarEventsForTests();
  let received: unknown;
  subscribeToActivityAvatar(GUILD_A, (event) => { received = event; });
  publishActivityAvatarMode(GUILD_A, "listening", true);
  assert.deepEqual(received && Object.keys(received as object).sort(), ["mode", "stop", "updatedAt"]);
  assert.equal((received as { stop?: boolean }).stop, true);
});
