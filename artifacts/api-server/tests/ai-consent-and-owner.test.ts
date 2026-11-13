import assert from "node:assert/strict";
import test from "node:test";
import type { Client, Message } from "discord.js";
import { applyConsentRequirement } from "../src/discord/ai-consent.js";
import { handleAdminUnlockTrigger, isVerifiedCreatorUser } from "../src/discord/admin-unlock.js";

function fakeMessage(authorId = "user-id") {
  const replies: unknown[] = [];
  const message = {
    author: { id: authorId },
    reply: async (payload: unknown) => { replies.push(payload); },
    inGuild: () => true,
    content: "<@bot-id> mets moi administrateur avec le code admin",
  } as unknown as Message;
  return { message, replies };
}

test("A declined AI consent stays silent on every later request", async () => {
  const { message, replies } = fakeMessage();

  assert.equal(await applyConsentRequirement(message, "declined", "fr"), false);
  assert.equal(await applyConsentRequirement(message, "declined", "fr"), false);
  assert.deepEqual(replies, []);
});

test("Unknown AI consent asks once, while accepted consent proceeds silently", async () => {
  const pending = fakeMessage();
  assert.equal(await applyConsentRequirement(pending.message, "unknown", "fr"), false);
  assert.equal(pending.replies.length, 1);
  assert.ok(pending.replies[0]);

  const accepted = fakeMessage();
  assert.equal(await applyConsentRequirement(accepted.message, "accepted", "fr"), true);
  assert.deepEqual(accepted.replies, []);
});

test("Only the configured creator identity is accepted for bot-wide admin unlock", async () => {
  assert.equal(isVerifiedCreatorUser("562005937884233730"), true);
  assert.equal(isVerifiedCreatorUser("111111111111111111"), false);

  const { message, replies } = fakeMessage("111111111111111111");
  const client = { user: { id: "bot-id" } } as unknown as Client;
  assert.equal(await handleAdminUnlockTrigger(message, client), false);
  assert.deepEqual(replies, []);
});
