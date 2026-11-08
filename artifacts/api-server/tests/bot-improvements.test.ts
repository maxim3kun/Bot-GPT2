import { test } from "node:test";
import assert from "node:assert/strict";
import { counts, reservations } from "./fixtures/quota.js";
import { reserveGeneratedImage, releaseGeneratedImage, imageQuotaNotice } from "../src/discord/image-quota.js";
import { extractOwnBirthday, applyBirthdayToSummary } from "../src/discord/ai-birthday-policy.js";
import { chooseBotColumn } from "../src/discord/connect4-ai.js";
import { handlePollCommand } from "../src/discord/poll.js";
import { createSlashMessageAdapter } from "../src/discord/slash-message-adapter.js";

test("Daily image counters allow 10 regular images and 4 persona photos independently", async () => {
  counts.clear(); reservations.length = 0;
  const images = await Promise.all(Array.from({ length: 15 }, () => reserveGeneratedImage()));
  const personas = await Promise.all(Array.from({ length: 8 }, () => reserveGeneratedImage("persona")));
  assert.equal(images.filter(x => x.status === "reserved").length, 10);
  assert.equal(personas.filter(x => x.status === "reserved").length, 4);
  assert.notEqual(images[0]!.dayKey, personas[0]!.dayKey);
  assert.ok(reservations.filter(x => x.key.endsWith(":image")).every(x => x.limit === 10));
  assert.ok(reservations.filter(x => !x.key.endsWith(":image")).every(x => x.limit === 4));
  await releaseGeneratedImage(images[0]!.dayKey);
  assert.equal((await reserveGeneratedImage()).status, "reserved");
  assert.equal((await reserveGeneratedImage("persona")).status, "limit_reached");
  assert.match(imageQuotaNotice("limit_reached", "fr"), /10 images/);
  assert.match(imageQuotaNotice("limit_reached", "fr", "persona"), /4 images de persona/);
});

test("Only the current user's explicitly self-declared birthday is retained, never a birth year", () => {
  for (const text of ["Mon anniversaire est le 22/06", "Mon anniversaire c'est le 22 juin", "Je suis née le 22 juin 1990", "My birthday is June 22"]) {
    assert.deepEqual(extractOwnBirthday(text), { day: 22, month: 6 });
  }
  for (const text of [
    "Napoléon est né le 15 août 1769", "L'anniversaire de Max est le 22/06", "Mon personnage est né le 22/06",
    "Si mon anniversaire est le 22/06", "« Mon anniversaire est le 22/06 »", "<@123> mon anniversaire est le 22/06",
    "Mon anniversaire est le 31/02", "Mon anniversaire est le 22/06 ?", "Le 22/06 est un anniversaire historique",
  ]) assert.equal(extractOwnBirthday(text), null, text);
  assert.equal(extractOwnBirthday("Mon anniversaire est le 22/06", true), null);
  assert.deepEqual(extractOwnBirthday("Mon vrai anniversaire est le 22/06", true), { day: 22, month: 6 });
  const summary = applyBirthdayToSummary("Préférence : réponses courtes.\nAnniversaire personnel : 21/06.", { day: 22, month: 6 });
  assert.equal(summary.includes("21/06"), false);
  assert.match(summary, /22\/06/);
  assert.match(summary, /réponses courtes/);
});

test("Connect4 wins, blocks threats, and does not mutate the board", () => {
  const board = Array.from({ length: 6 }, () => Array(7).fill(0));
  board[5] = [2, 2, 2, 0, 1, 1, 0];
  const snapshot = JSON.stringify(board);
  assert.equal(chooseBotColumn(board), 3);
  assert.equal(JSON.stringify(board), snapshot);
  board[5] = [1, 1, 1, 0, 2, 0, 0];
  assert.equal(chooseBotColumn(board), 3);
  const full = Array.from({ length: 6 }, () => Array(7).fill(1));
  assert.equal(chooseBotColumn(full), -1);
  const empty = Array.from({ length: 6 }, () => Array(7).fill(0));
  assert.ok([2, 3, 4].includes(chooseBotColumn(empty)));
  assert.equal(empty.flat().every(x => x === 0), true);
  // The old "win/block/otherwise centre" algorithm gives the opponent a
  // winning landing square on the next row. Search must avoid that trap.
  const trap = Array.from({ length: 6 }, () => Array(7).fill(0));
  trap[5] = [2, 2, 1, 0, 0, 0, 0];
  trap[4] = [1, 1, 1, 0, 0, 0, 0];
  assert.notEqual(chooseBotColumn(trap), 3);
});

test("/poll edits a deferred slash response and adds the expected voting reactions", async () => {
  const replies: any[] = [], reactions: string[] = [];
  const sent = { react: async (emoji: string) => { reactions.push(emoji); } };
  const interaction = {
    deferred: true, replied: false, options: {}, user: { id: "user", username: "tester" },
    guild: null, guildId: null, channel: { isSendable: () => true },
    editReply: async (payload: unknown) => { replies.push(payload); return sent; },
  };
  const message = createSlashMessageAdapter(interaction as any, null);
  await handlePollCommand(message, ["On joue ?", "|", "Oui | Non"], "fr");
  assert.equal(replies.length, 1);
  assert.equal(replies[0].embeds[0].toJSON().title, "📊 On joue ?");
  assert.deepEqual(reactions, ["1️⃣", "2️⃣"]);
  assert.deepEqual(replies[0].allowedMentions, { parse: [] });
});
