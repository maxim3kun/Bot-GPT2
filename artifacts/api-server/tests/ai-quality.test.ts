import test from "node:test";
import assert from "node:assert/strict";
import { classifyAiMessage } from "../src/discord/ai-router.js";
import { generateWithLengthRetry } from "../src/discord/ai-completion-quality.js";
import { splitAiAnswer } from "../src/discord/ai-answer-format.js";
import { actionAccessFailure, AiActionConfirmations, executeAuthorizedAction, isAiActionCandidate, parseAiAction, type AiActionAccess } from "../src/discord/ai-action-policy.js";

const allowedAccess: AiActionAccess = {
  blocked: false, consentAccepted: true, aiEnabled: true, moduleEnabled: true,
  featuresEnabled: true, inGuild: true, canPost: true, admin: false, voiceReady: true,
};
const identity = { userId: "alice", guildId: "guild", channelId: "channel" };

test("French and English action requests reach the planner, normal conversation does not", () => {
  for (const text of ["Peux-tu me lancer un démineur ?", "Lance un jeu", "Play a radio", "Quel module est en panne ?", "Afficher le diagnostic"]) {
    assert.equal(isAiActionCandidate(text), true, text);
  }
  for (const text of ["Comment tu vas ?", "Qui est ton créateur ?", "J’aime les jeux", "Explique la radioactivité"]) {
    assert.equal(isAiActionCandidate(text), false, text);
  }
});
test("Only the allowlisted actions and exact arguments are accepted", () => {
  assert.deepEqual(parseAiAction({ action: "help" }, []), { action: "help" });
  assert.deepEqual(parseAiAction({ action: "minesweeper" }, []), { action: "minesweeper", difficulty: "medium" });
  assert.deepEqual(parseAiAction({ action: "radio", station: "known" }, ["known"]), { action: "radio", station: "known" });
  for (const value of [
    { action: "ban", userId: "victim" }, { action: "shell", command: "rm -rf" },
    { action: "help", command: "!ban" }, { action: "radio", station: "https://example.com/stream" },
    { action: "minesweeper", difficulty: "admin" }, { action: "minesweeper", station: "known" },
    ["help"], null, "!help",
  ]) assert.throws(() => parseAiAction(value, ["known"]));
});

test("Blocked users, revoked consent, disabled modules/features and missing posting permissions are refused", () => {
  const changes: Partial<AiActionAccess>[] = [
    { blocked: true }, { consentAccepted: false }, { aiEnabled: false },
    { moduleEnabled: false }, { featuresEnabled: false }, { canPost: false },
  ];
  for (const change of changes) assert.notEqual(actionAccessFailure({ action: "help" }, { ...allowedAccess, ...change }), null);
});

test("Diagnostics require a server administrator; help does not", () => {
  assert.equal(actionAccessFailure({ action: "status" }, allowedAccess), "admin");
  assert.equal(actionAccessFailure({ action: "help" }, allowedAccess), null);
  assert.equal(actionAccessFailure({ action: "status" }, { ...allowedAccess, admin: true }), null);
  assert.equal(actionAccessFailure({ action: "status" }, { ...allowedAccess, admin: true, inGuild: false }), "guild");
});

test("Audio requires a guild and valid current voice permissions/channel", () => {
  const action = { action: "radio" as const, station: "known" };
  assert.equal(actionAccessFailure(action, allowedAccess), null);
  assert.equal(actionAccessFailure(action, { ...allowedAccess, voiceReady: false }), "voice");
  assert.equal(actionAccessFailure(action, { ...allowedAccess, inGuild: false }), "guild");
});

test("Confirmation ownership and context cannot be hijacked and requests are single-use", () => {
  const store = new AiActionConfirmations<string>();
  store.put("key", { ...identity, value: "radio", expiresAt: 200 }, 100);
  for (const context of [
    { ...identity, userId: "mallory" }, { ...identity, guildId: "elsewhere" }, { ...identity, channelId: "elsewhere" },
  ]) assert.equal(store.consume("key", context, 110), undefined);
  assert.equal(store.consume("key", identity, 110)?.value, "radio");
  assert.equal(store.consume("key", identity, 110), undefined);
});

test("Expired and replaced confirmations cannot execute", () => {
  const store = new AiActionConfirmations<string>();
  store.put("old", { ...identity, value: "old", expiresAt: 200 }, 100);
  store.put("new", { ...identity, value: "new", expiresAt: 220 }, 110);
  assert.equal(store.consume("old", identity, 120), undefined);
  assert.equal(store.consume("new", identity, 220), undefined);
});

test("Permissions revoked after confirmation prevent the handler from running", async () => {
  let calls = 0;
  const result = await executeAuthorizedAction(
    async () => actionAccessFailure({ action: "status" }, { ...allowedAccess, admin: false }),
    async () => { calls++; return "sent"; },
  );
  assert.deepEqual(result, { ok: false, reason: "admin" });
  assert.equal(calls, 0);
});

test("A confirmed successful action returns the real handler result once", async () => {
  const store = new AiActionConfirmations<string>();
  store.put("key", { ...identity, value: "help", expiresAt: 200 }, 100);
  const confirmation = store.consume("key", identity, 110);
  assert.ok(confirmation);
  let calls = 0;
  const result = await executeAuthorizedAction(async () => null, async () => { calls++; return { messageId: "actual-reply" }; });
  assert.deepEqual(result, { ok: true, result: { messageId: "actual-reply" } });
  assert.equal(calls, 1);
  assert.equal(store.consume("key", identity, 110), undefined);
});

test("Authorization outages and handler failures never produce success", async () => {
  let calls = 0;
  await assert.rejects(executeAuthorizedAction(async () => { throw new Error("settings unavailable"); }, async () => { calls++; }), /settings unavailable/);
  assert.equal(calls, 0);
  await assert.rejects(executeAuthorizedAction(async () => null, async () => { throw new Error("send failed"); }), /send failed/);
});

test("An improvement question is not mistaken for a creator question", () => {
  const route = classifyAiMessage("Peux tu me dire tout ce qui est nécessaire pour que tu sois un meilleur agent IA ?");
  assert.notEqual(route.intent, "creator");
});

test("Actual creator questions still work", () => {
  for (const prompt of ["Qui t'a créé ?", "Qui t’a développé ?", "Qui est ton créateur ?", "Who created you?"]) {
    assert.equal(classifyAiMessage(prompt).intent, "creator", prompt);
  }
  assert.notEqual(classifyAiMessage("Qui est Einstein ?").intent, "creator");
});

test("Carbon comparisons and estimates need evidence, casual chat does not", () => {
  for (const prompt of [
    "À partir de combien de messages IA ? Donne une estimation selon le pays.",
    "Donne moi l’émission carbone d’un voyage au Japon comparé à une utilisation de l’IA",
    "Compare the carbon footprint of AI and a flight",
  ]) assert.equal(classifyAiMessage(prompt).needsResearch, true, prompt);
  assert.equal(classifyAiMessage("Comment tu vas ?").needsResearch, false);
});

test("Persona truncation is retried exactly once with a larger budget", async () => {
  const budgets: number[] = [];
  const result = await generateWithLengthRetry(async (budget) => {
    budgets.push(budget);
    return budgets.length === 1
      ? { text: "Partial", finishReason: "length" }
      : { text: "Complete.", finishReason: "stop" };
  });
  assert.deepEqual(budgets, [1600, 2800]);
  assert.equal(result.text, "Complete.");
});

test("Complete answers and safety refusals are not retried", async () => {
  for (const finishReason of ["stop", "content_filter"]) {
    let calls = 0;
    await generateWithLengthRetry(async () => {
      calls++;
      return { text: finishReason === "stop" ? "Hello." : "", finishReason };
    });
    assert.equal(calls, 1);
  }
});

test("Provider failures are not retried or hidden", async () => {
  let calls = 0;
  await assert.rejects(generateWithLengthRetry(async () => {
    calls++;
    throw new Error("provider unavailable");
  }), /provider unavailable/);
  assert.equal(calls, 1);
});

test("A filtered retry never exposes the earlier partial answer", async () => {
  let calls = 0;
  const result = await generateWithLengthRetry(async () => ++calls === 1
    ? { text: "Partial", finishReason: "length" }
    : { text: "", finishReason: "content_filter" });
  assert.equal(result.text, "");
});

test("Long persona answers keep all words across multiple Discord replies", () => {
  const text = "Une phrase complète avec un emoji 😀. ".repeat(400).trim();
  const chunks = splitAiAnswer(text);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 3800));
  assert.equal(chunks.join(" ").replace(/\s+/g, " "), text.replace(/\s+/g, " "));
  assert.equal(splitAiAnswer("😀".repeat(4000)).join(""), "😀".repeat(4000));
});
