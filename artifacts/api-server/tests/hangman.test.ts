import assert from "node:assert/strict";
import test from "node:test";
import { createHangmanManager, formatHangmanMessage, HANGMAN_MAX_ERRORS, normalizeHangmanLetter } from "../src/discord/hangman.js";
import { handleGameMessageCommand, isGameMessageCommand } from "../src/discord/message-game-commands.js";
import type { Message } from "discord.js";

const scope = (userId: string, channelId: string, guildId: string | null = "guild") => ({ userId, channelId, guildId });

test("Hangman accepts a single accent-insensitive French letter, repeated letters do not cost a turn, and a win reveals the word", () => {
  let now = 10_000;
  const manager = createHangmanManager({ now: () => now, random: () => 0 });
  const player = scope("alice", "room-a");
  const started = manager.start(player, "fr");
  assert.equal(started.kind, "started");
  assert.equal(started.state!.maskedWord, "_ _ _ _ _");

  const first = manager.guess(player, "E");
  assert.equal(first.kind, "correct");
  assert.equal(first.state!.maskedWord, "É _ _ _ E");
  const repeated = manager.guess(player, "é");
  assert.equal(repeated.kind, "repeated");
  assert.equal(repeated.state!.wrongGuesses, 0);
  const invalid = manager.guess(player, "ab");
  assert.equal(invalid.kind, "invalid");
  assert.equal(invalid.state!.wrongGuesses, 0);
  assert.equal(manager.guess(player, "c").kind, "correct");
  assert.equal(manager.guess(player, "o").kind, "correct");
  const won = manager.guess(player, "l");
  assert.equal(won.kind, "won");
  assert.equal(won.state!.word, "école");
  assert.equal(won.state!.remainingErrors, HANGMAN_MAX_ERRORS);
  assert.equal(manager.current(player), null);
});

test("Hangman ends after six wrong letters and clearly reports the result", () => {
  const manager = createHangmanManager({ now: () => 0, random: () => 0 });
  const player = scope("alice", "room-a");
  manager.start(player, "fr");
  let result = manager.guess(player, "x");
  for (const letter of ["z", "w", "q", "m", "b"]) result = manager.guess(player, letter);
  assert.equal(result.kind, "lost");
  assert.equal(result.state!.wrongGuesses, 6);
  assert.equal(result.state!.remainingErrors, 0);
  const message = formatHangmanMessage(result, "fr");
  assert.match(message, /Perdu/);
  assert.match(message, /école/);
  assert.match(message, /6\/6 · 0 restantes/);
});

test("Hangman sessions are isolated by player, channel and guild", () => {
  const manager = createHangmanManager({ now: () => 1, random: () => 0 });
  const first = scope("alice", "room-a");
  const anotherPlayer = scope("bob", "room-a");
  const anotherChannel = scope("alice", "room-b");
  const anotherGuild = scope("alice", "room-a", "guild-b");
  for (const player of [first, anotherPlayer, anotherChannel, anotherGuild]) manager.start(player, "fr");
  assert.equal(manager.size, 4);

  manager.guess(first, "x");
  assert.equal(manager.current(first)!.wrongGuesses, 1);
  const reset = manager.start(first, "fr");
  assert.equal(reset.replaced, true);
  assert.equal(manager.size, 4);
  assert.equal(manager.current(first)!.wrongGuesses, 0);
  for (const other of [anotherPlayer, anotherChannel, anotherGuild]) {
    assert.equal(manager.current(other)!.wrongGuesses, 0);
  }
  manager.stop(first);
  assert.equal(manager.size, 3);
  assert.ok(manager.current(anotherPlayer));
});

test("Hangman expires idle sessions, announces the expiry once, and handles abandonment", () => {
  let now = 0;
  let expiries = 0;
  let expiredWord: string | undefined;
  const manager = createHangmanManager({ now: () => now, random: () => 0, ttlMs: 100 });
  const player = scope("alice", "room-a");
  manager.start(player, "fr", (state) => { expiries += 1; expiredWord = state.word; });
  now = 101;
  const expired = manager.expire();
  assert.equal(expired.length, 1);
  assert.equal(expiries, 1);
  assert.equal(expiredWord, "école");
  assert.match(formatHangmanMessage({ kind: "expired", state: expired[0] }, "fr"), /Partie expirée/);
  assert.equal(manager.expire().length, 0);
  assert.equal(expiries, 1);
  assert.equal(manager.current(player), null);

  const abandoned = manager.start(player, "fr");
  assert.equal(abandoned.kind, "started");
  const stopped = manager.stop(player);
  assert.equal(stopped.kind, "stopped");
  assert.equal(stopped.state!.word, "école");
});

test("Letter normalization preserves language-specific letters and accepts accents", () => {
  assert.equal(normalizeHangmanLetter("É", "fr"), "e");
  assert.equal(normalizeHangmanLetter("ñ", "es"), "ñ");
  assert.equal(normalizeHangmanLetter("ı", "tr"), "ı");
  assert.equal(normalizeHangmanLetter("🙂", "fr"), null);
});

test("Both command aliases start an independent local game without an AI provider", async () => {
  assert.equal(isGameMessageCommand("pendu"), true);
  assert.equal(isGameMessageCommand("hangman"), true);
  const replies: string[] = [];
  const channel = {
    id: "room-a",
    send: async () => ({}),
    sendTyping: async () => {},
  };
  const message = {
    author: { id: "route-test", bot: false },
    guildId: "route-guild",
    channelId: "room-a",
    channel,
    reply: async (content: string) => { replies.push(content); return {}; },
  } as unknown as Message;

  assert.equal(await handleGameMessageCommand(message, "pendu", [], null, "fr", "?"), true);
  assert.match(replies.at(-1)!, /Pendu/);
  assert.match(replies.at(-1)!, /\?pendu <lettre>/);
  assert.equal(await handleGameMessageCommand(message, "hangman", ["status"], null, "fr", "?"), true);
  assert.match(replies.at(-1)!, /Mot/);
});
