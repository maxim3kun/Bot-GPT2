import test from "node:test";
import "./ai-command-tools.test.js";
import assert from "node:assert/strict";
import { classifyAiMessage } from "../src/discord/ai-router.js";
import { generateWithLengthRetry } from "../src/discord/ai-completion-quality.js";
import { splitAiAnswer } from "../src/discord/ai-answer-format.js";
import { actionAccessFailure, executeAuthorizedAction, isAiActionCandidate, parseAiAction, type AiActionAccess } from "../src/discord/ai-action-policy.js";
import { calculateVerified, simpleArithmeticReply } from "../src/discord/ai-calculator.js";
import { createOrderedEventQueue, createSerializedFlush, deliverDiagnosticOnce, diagnosticCategory, dueDiagnosticSlot, feedbackSummaryPipeline, reactionVote } from "../src/discord/ai-observability-policy.js";
import { isCondescendingRemark, mentionClarification, shouldSkipConversation, silenceAllowed, stripBotMention, validSilenceRequest } from "../src/discord/ai-conversation-policy.js";
import { parseConversationSummary, safeSummaryInput, updateConversationMemory } from "../src/discord/ai-conversation-memory-policy.js";
import { createConversationRepository, type ConversationMemoryDoc } from "../src/discord/ai-conversation-repository.js";
import { replyFeedbackPlan, LONG_ANSWER_RATING_THRESHOLD } from "../src/discord/ai-feedback-policy.js";
import { AI_ECOLOGY_GUIDANCE, ecologyGuidanceFor, isAiEcologyRequest } from "../src/discord/ai-ecology-policy.js";
import { correctionContext, correctionSearchQuery, isFactualCorrection } from "../src/discord/ai-correction-policy.js";
import { isOfficialTravelSource, prepareEvidence, relevantPageText, validateEvidenceReview } from "../src/discord/ai-research-policy.js";
import { travelEvidenceFreshness, travelResearchClarification, travelResearchFooter, travelResearchKind } from "../src/discord/ai-travel-research.js";

const allowedAccess: AiActionAccess = {
  blocked: false, consentAccepted: true, aiEnabled: true, moduleEnabled: true,
  featuresEnabled: true, inGuild: true, canPost: true, admin: false, voiceReady: true,
};

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

test("Permissions are checked at execution and prevent unauthorized handlers from running", async () => {
  let calls = 0;
  const result = await executeAuthorizedAction(
    async () => actionAccessFailure({ action: "status" }, { ...allowedAccess, admin: false }),
    async () => { calls++; return "sent"; },
  );
  assert.deepEqual(result, { ok: false, reason: "admin" });
  assert.equal(calls, 0);
});

test("An authorized explicit action returns the real handler result immediately", async () => {
  let calls = 0;
  const result = await executeAuthorizedAction(async () => null, async () => { calls++; return { messageId: "actual-reply" }; });
  assert.deepEqual(result, { ok: true, result: { messageId: "actual-reply" } });
  assert.equal(calls, 1);
});

test("Explicit game and radio requests execute using existing consent without an extra confirmation", async () => {
  for (const input of [{ action: "minesweeper", difficulty: "easy" }, { action: "radio", station: "known" }]) {
    const action = parseAiAction(input, ["known"]);
    let calls = 0;
    const result = await executeAuthorizedAction(
      async () => actionAccessFailure(action, allowedAccess),
      async () => { calls++; return "handler-result"; },
    );
    assert.deepEqual(result, { ok: true, result: "handler-result" });
    assert.equal(calls, 1);
  }
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

test("Flight, visa and country travel requests use sourced research without catching generic flight discussions", () => {
  for (const [text, kind] of [
    ["Quel est le statut du vol AF123 ?", "flight"],
    ["Quels vols de Paris à Tokyo le 12 décembre ?", "flight"],
    ["Visa pour le Japon avec un passeport français", "visa"],
    ["Infos pratiques pour le Japon", "country"],
    ["Fiche du pays Canada", "country"],
  ] as const) {
    assert.equal(travelResearchKind(text), kind);
    assert.equal(classifyAiMessage(text).needsResearch, true, text);
  }
  assert.equal(travelResearchKind("Compare le CO2 de l’IA avec un vol au Japon"), null);
  assert.equal(travelResearchClarification("Visa pour le Japon", "fr")?.includes("nationalité du passeport"), true);
  assert.equal(travelResearchClarification("Visa pour le Japon avec un passeport français", "fr"), null);
  assert.notEqual(travelResearchClarification("Visa Japon, nationalité inconnue", "fr"), null);
  assert.notEqual(travelResearchClarification("Visa Japon, nationalité du passeport", "fr"), null);
  assert.equal(travelResearchClarification("Visa Japon, passeport du Japon", "fr"), null);
  assert.match(travelResearchFooter("flight", "13 novembre 2026", "fr"), /Source consultée : bouton 🔎/);
  assert.match(travelResearchFooter("visa", "13 November 2026", "en"), /Checked on 13 November 2026/);
  const now = Date.parse("2026-11-13T12:00:00Z");
  assert.equal(travelEvidenceFreshness("2026-10-01", now), "dated-recently");
  assert.equal(travelEvidenceFreshness(undefined, now), "undated");
  assert.equal(travelEvidenceFreshness("2024-01-01", now), "stale");
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

test("Verified arithmetic and mass conversion do not confuse grams, kilograms and tonnes", () => {
  assert.equal(calculateVerified({ operation: "divide", values: [1500, 0.0005] }).result, 3_000_000);
  assert.equal(calculateVerified({ operation: "convert_mass", values: [1.5], from: "t", to: "kg" }).result, 1500);
  assert.equal(calculateVerified({ operation: "convert_mass", values: [0.5], from: "g", to: "kg" }).result, 0.0005);
  assert.equal(calculateVerified({ operation: "add", values: [0.1, 0.2] }).result, 0.3);
  assert.match(calculateVerified({ operation: "divide", values: [0.15, 0.0005] }).caveat, /Input values.*checked separately/);
});

test("The calculator refuses arbitrary code, invalid units, zero divisors and overflow", () => {
  for (const input of [
    { operation: "eval", values: [1] }, { operation: "divide", values: [1, 0] },
    { operation: "add", values: ["process.exit()"] }, { operation: "add", values: [Infinity] },
    { operation: "subtract", values: [1, 2, 3] },
    { operation: "convert_mass", values: [1], from: "CO2", to: "CO2e" },
    { operation: "multiply", values: [1e15, 1e15, 1e15] },
    { operation: "add", values: [1], command: "rm -rf" },
  ]) assert.throws(() => calculateVerified(input));
});

test("Plain arithmetic requests resolve locally with a bounded parser", () => {
  assert.equal(simpleArithmeticReply("Combien font 2 + 2 ?", "fr"), "2 + 2 = 4.");
  assert.equal(simpleArithmeticReply("Calcule (2 + 3) × 4", "fr"), "( 2 + 3 ) × 4 = 20.");
  assert.equal(simpleArithmeticReply("what is 8 / 2?", "en"), "8 / 2 = 4.");
  assert.equal(simpleArithmeticReply("0,1 + 0,2", "fr"), "0.1 + 0.2 = 0,3.");
  for (const text of [
    "Explique 2 + 2", "2 + 2 et pourquoi ?", "2026-11-10",
    "process.exit() + 1", "1 / 0", "1e3 * 2", "1 + ".repeat(20) + "1",
    "999999999999999999999 * 999999999999999999999",
  ]) assert.equal(simpleArithmeticReply(text, "fr"), null, text);
});

test("Only thumbs ratings are accepted, never arbitrary emoji", () => {
  assert.equal(reactionVote("👍"), 1);
  assert.equal(reactionVote("👎"), -1);
  assert.equal(reactionVote("❤️"), null);
  assert.equal(reactionVote(null), null);
});

test("Feedback counts the latest active vote per answer/user before filtering the report period", () => {
  const since = new Date("2026-11-07T08:00:00Z"), until = new Date("2026-11-07T20:00:00Z");
  const pipeline = feedbackSummaryPipeline(since, until, until);
  assert.deepEqual(pipeline[1], { $sort: { at: -1, _id: 1 } });
  assert.deepEqual(pipeline[2]?.$group?._id, { responseId: "$responseId", voterKey: "$voterKey" });
  assert.deepEqual(pipeline[3], { $match: { at: { $gte: since, $lt: until } } });
});

test("Diagnostic metadata never copies an error's private message or raw payload", () => {
  assert.equal(diagnosticCategory({ status: 429, message: "private prompt", apiKey: "not-a-real-key" }), "rate_limit");
  assert.equal(diagnosticCategory({ name: "APIConnectionTimeoutError", message: "private conversation" }), "timeout");
  assert.equal(diagnosticCategory({ name: "MongoServerSelectionError" }), "storage");
  assert.equal(diagnosticCategory({ status: 503 }), "provider_unavailable");
  assert.equal(diagnosticCategory({ name: "GenerationLimit" }), "generation_limit");
  assert.equal(diagnosticCategory({ name: "EmptyAiResponse" }), "empty_response");
  assert.equal(diagnosticCategory({ name: "RejectedCalculation" }), "calculation_rejected");
});

test("Diagnostics are due only around 09:00 and 21:00 Paris, with no old-report spam", () => {
  assert.equal(dueDiagnosticSlot(new Date("2026-11-07T07:00:00Z")), null);
  assert.equal(dueDiagnosticSlot(new Date("2026-11-07T08:01:00Z"))?.key, "2026-11-07:9");
  assert.equal(dueDiagnosticSlot(new Date("2026-11-07T20:01:00Z"))?.key, "2026-11-07:21");
  assert.equal(dueDiagnosticSlot(new Date("2026-11-07T12:00:00Z")), null);
});

test("Paris daylight saving transitions preserve the real morning reporting windows", () => {
  const spring = dueDiagnosticSlot(new Date("2026-03-29T07:00:00Z"));
  const autumn = dueDiagnosticSlot(new Date("2026-10-25T08:00:00Z"));
  assert.ok(spring && autumn);
  assert.equal((spring.until.getTime() - spring.since.getTime()) / 3_600_000, 11);
  assert.equal((autumn.until.getTime() - autumn.since.getTime()) / 3_600_000, 13);
});

test("Durable diagnostic claims prevent duplicate DMs after ticks or restart", async () => {
  const claimed = new Set<string>();
  let sends = 0;
  const statuses: string[] = [];
  const send = () => deliverDiagnosticOnce(
    async () => { if (claimed.has("slot")) return false; claimed.add("slot"); return true; },
    async () => { sends++; return "message-id"; },
    async (status) => { statuses.push(status); },
  );
  assert.equal(await send(), "sent");
  assert.equal(await send(), "skipped");
  assert.equal(sends, 1);
  assert.deepEqual(statuses, ["sent"]);
});

test("Closed owner DMs are marked failed without claiming delivery or repeated sends", async () => {
  let status = "";
  assert.equal(await deliverDiagnosticOnce(
    async () => true,
    async () => { throw new Error("DMs closed"); },
    async (value) => { status = value; },
  ), "failed");
  assert.equal(status, "failed");
  let sends = 0;
  await assert.rejects(deliverDiagnosticOnce(
    async () => { throw new Error("storage unavailable"); },
    async () => { sends++; return "id"; },
    async () => {},
  ), /storage unavailable/);
  assert.equal(sends, 0);
});

test("An empty startup flush never prevents later error writes and concurrent flushes coalesce", async () => {
  const flush = createSerializedFlush();
  let writes = 0;
  await flush(async () => {});
  await flush(async () => { writes++; });
  const first = flush(async () => { await Promise.resolve(); writes++; });
  const second = flush(async () => { writes++; });
  assert.equal(first, second);
  await Promise.all([first, second]);
  assert.equal(writes, 2);
  await flush(async () => { writes++; });
  assert.equal(writes, 3);
});

test("Slow reaction lookups cannot resurrect a vote after removal or moderator clearing", async () => {
  const queue = createOrderedEventQueue();
  const events: string[] = [];
  const add = queue("message", async () => { await Promise.resolve(); events.push("add"); });
  const remove = queue("message", async () => { events.push("remove"); });
  const clear = queue("message", async () => { events.push("clear-all"); });
  await Promise.all([add, remove, clear]);
  assert.deepEqual(events, ["add", "remove", "clear-all"]);
  await assert.rejects(queue("message", async () => { throw new Error("temporary outage"); }));
  await queue("message", async () => { events.push("recovered"); });
  assert.equal(events.at(-1), "recovered");
});

test("Only the bot mention is removed, never another participant's identity", () => {
  assert.equal(stripBotMention("<@111> compare <@!222> et <@333>", "111"), "compare <@!222> et <@333>");
  assert.equal(stripBotMention("<@222>"), "<@222>");
});

test("An ambiguous singular recipient gets one clarification, never all recipients by assumption", () => {
  const users = [{ id: "alex", bot: false }, { id: "sam", bot: false }, { id: "bot", bot: true }];
  const question = mentionClarification("Tu peux lui expliquer notre projet ?", users, "camille", "fr");
  assert.equal(question, "Tu parles de <@alex> ou de <@sam> ?");
  assert.equal(question!.match(/\?/g)?.length, 1);
  assert.equal(mentionClarification("Explique notre projet à Alex et Sam", users, "camille", "fr"), null);
  assert.equal(mentionClarification('Que signifie "lui" ?', users, "camille", "fr"), null);
  assert.equal(mentionClarification("Can you explain it to her?", users.slice(0, 1), "camille", "en"), null);
});

test("Pure directed abuse can produce zero replies, never useful criticism or a real request", () => {
  for (const text of ["t'es con", "Tu es un idiot !", "you are stupid", "fuck you", "ne réponds pas"]) {
    assert.equal(shouldSkipConversation(text), true, text);
  }
  for (const text of [
    "bonjour", "ta réponse est nulle, tu peux la corriger ?", "tu es con mais aide-moi à calculer",
    "que signifie fuck you ?", "Bob tu es con", "<@222> est un idiot",
    "tu es nul, pourquoi le résultat est faux ?", 'traduis "shut up"',
  ]) assert.equal(shouldSkipConversation(text), false, text);
  assert.equal(silenceAllowed("merci", "no_response_needed"), true);
  assert.equal(validSilenceRequest('{"reason":"no_response_needed"}', "Bonjour"), false);
  assert.equal(validSilenceRequest('{"reason":"targeted_abuse","extra":true}', "t'es con"), false);
  assert.equal(validSilenceRequest("not json", "t'es con"), false);
});

test("Condescension gets a calm reply instead of being treated as abuse or ignored", () => {
  for (const text of [
    "C'est pourtant simple.",
    "C'est pas compliqué.",
    "Réfléchis un peu.",
    "Ce n'est pas sorcier.",
    "Tu comprends rien.",
    "Even a child could do this.",
    "You're really slow.",
  ]) {
    assert.equal(isCondescendingRemark(text), true, text);
    assert.equal(shouldSkipConversation(text), false, text);
    assert.equal(silenceAllowed(text, "targeted_abuse"), false, text);
  }
  assert.equal(isCondescendingRemark('Traduis « réfléchis un peu »'), false);
  assert.equal(isCondescendingRemark("t'es con"), false);
  assert.equal(isCondescendingRemark("Ta réponse est incorrecte, peux-tu corriger ?"), false);
  assert.equal(shouldSkipConversation("C'est pas compliqué, explique-moi comment faire."), false);
});

test("Intentional persona silence is not retried or replaced with a failure message", async () => {
  let calls = 0;
  const reply = await generateWithLengthRetry(async () => {
    calls++;
    return { text: "", finishReason: "stop", silent: true };
  });
  assert.equal(calls, 1);
  assert.equal(reply.silent, true);
});

function memoryFixture() {
  const docs = new Map<string, ConversationMemoryDoc>();
  const encode = (text: string) => Buffer.from(text).toString("base64");
  const decode = (text: string) => Buffer.from(text, "base64").toString();
  let revisions = 0;
  const fakeCollection = {
    async findOne(filter: { _id: string }) { return docs.get(filter._id) ?? null; },
    async updateOne(filter: { _id: string; revision?: string; enabled?: boolean }, update: { $set: Partial<ConversationMemoryDoc> }, options?: { upsert?: boolean }) {
      assert.notEqual(options?.upsert, true, "A delayed summary must never recreate a deleted document");
      const doc = docs.get(filter._id);
      if (!doc || doc.revision !== filter.revision || doc.enabled !== filter.enabled) return { matchedCount: 0 };
      docs.set(filter._id, { ...doc, ...update.$set });
      return { matchedCount: 1 };
    },
  };
  const key = (scope: string, user: string) => `${scope}:${user}`;
  const repository = createConversationRepository(
    () => fakeCollection as unknown as ReturnType<Parameters<typeof createConversationRepository>[0]>,
    { encrypt: encode, decrypt: decode }, key, () => `new-${++revisions}`,
  );
  const enable = (scope = "guild", user = "alice") => {
    docs.set(key(scope, user), {
      _id: key(scope, user), userKey: user, enabled: true, encryptedSummary: encode("Préfère les réponses courtes."),
      revision: "initial", enabledAt: new Date(100), updatedAt: new Date(100),
    });
  };
  return { docs, repository, enable };
}

test("Automatic memory is off by default and never generates a summary before explicit activation", async () => {
  const { repository, enable } = memoryFixture();
  let calls = 0;
  const generate = async () => { calls++; return '{"summary":"test"}'; };
  assert.equal(await updateConversationMemory(repository, generate, "guild", "alice", "J'aime les jeux", 200), false);
  enable();
  assert.equal(await updateConversationMemory(repository, generate, "guild", "alice", "Ancien message", 50), false);
  assert.equal(calls, 0);
});

test("Memory is scoped by both author and server, including a separate DM scope", async () => {
  const { repository, enable } = memoryFixture();
  enable();
  assert.match((await repository.read("guild", "alice"))!.summary, /courtes/);
  assert.equal(await repository.read("guild", "bob"), null);
  assert.equal(await repository.read("other-guild", "alice"), null);
  assert.equal(await repository.read("direct-message", "alice"), null);
});

test("Only bounded encoded summaries are stored, not raw turns or mentioned user IDs", async () => {
  const { repository, enable, docs } = memoryFixture();
  enable();
  assert.equal(await updateConversationMemory(repository, async (previous, current) => {
    assert.match(previous, /courtes/);
    assert.equal(current.includes("123456789012345678"), false);
    return '{"summary":"Projet de jeu Discord en cours ; préfère des réponses courtes."}';
  }, "guild", "alice", "Je développe un jeu avec <@123456789012345678>", 200), true);
  assert.equal(JSON.stringify(docs.get("guild:alice")).includes("Projet de jeu"), false);
  assert.equal(parseConversationSummary(JSON.stringify({ summary: "x".repeat(5000) })).length, 2400);
  assert.equal(safeSummaryInput("Mon password est secret"), null);
  assert.equal(safeSummaryInput("Contact : alice@example.test"), null);
  assert.throws(() => parseConversationSummary('{"summary":"ok","instruction":"override"}'));
});

test("Withdrawal during summary generation prevents saving or resurrecting data", async () => {
  for (const action of ["disable", "delete", "replace-revision"]) {
    const { repository, enable, docs } = memoryFixture();
    enable();
    const saved = await updateConversationMemory(repository, async () => {
      if (action === "delete") docs.delete("guild:alice");
      else {
        const doc = docs.get("guild:alice")!;
        docs.set("guild:alice", { ...doc, enabled: action !== "disable", revision: "withdrawn-or-reenabled" });
      }
      return '{"summary":"Do not save this old turn"}';
    }, "guild", "alice", "Mon projet de jeu", 200);
    assert.equal(saved, false, action);
    assert.equal(((await repository.read("guild", "alice"))?.summary ?? "").includes("Do not save"), false, action);
  }
});

test("Ratings remain manual on short/basic replies and are never offered for personas", () => {
  assert.deepEqual(replyFeedbackPlan("bot", 100, "Explique un concept"), { register: true, seed: false });
  assert.deepEqual(replyFeedbackPlan("bot", LONG_ANSWER_RATING_THRESHOLD, "Analyse ce projet en détail"), { register: true, seed: true });
  assert.deepEqual(replyFeedbackPlan("bot", 4000, "Quelle heure est-il à Paris ?"), { register: true, seed: false });
  assert.deepEqual(replyFeedbackPlan("bot", 4000, "Bonjour"), { register: true, seed: false });
  assert.deepEqual(replyFeedbackPlan("bot", 4000, "Quelle est la capitale de la France ?"), { register: true, seed: false });
  assert.deepEqual(replyFeedbackPlan("bot", 4000, "<@123> !ask Bonjour"), { register: true, seed: false });
  assert.deepEqual(replyFeedbackPlan("persona", 10000, "Explique un concept"), { register: false, seed: false });
});

test("AI environmental estimates require a relevant explicit question, not ordinary chat", () => {
  for (const text of [
    "Quelle est ton empreinte carbone ?", "What's your carbon footprint?",
    "Combien d'eau utilises-tu ?", "Compare le CO₂ de l'IA avec un vol au Japon",
    "Quel est l'impact écologique de l'intelligence artificielle ?",
    "Quelle énergie pour cette réponse ?", "Combien de CO2 émet ton modèle ?",
  ]) {
    assert.equal(isAiEcologyRequest(text), true, text);
    assert.equal(classifyAiMessage(text).needsResearch, true, text);
    assert.ok(ecologyGuidanceFor(text).includes(AI_ECOLOGY_GUIDANCE), text);
  }
  for (const text of ["Bonjour", "Combien font 2 + 2 ?", "Combien de tokens consommes-tu ?", "Peux-tu expliquer le climat ?", "Raconte une histoire"]) {
    assert.equal(isAiEcologyRequest(text), false, text);
    assert.equal(ecologyGuidanceFor(text).includes(AI_ECOLOGY_GUIDANCE), false, text);
  }
});

test("Ecology guidance separates a scenario from actual measurement and checks comparable units", () => {
  assert.match(AI_ECOLOGY_GUIDANCE, /no direct measurements/);
  assert.match(AI_ECOLOGY_GUIDANCE, /different model is not a measurement/);
  assert.match(AI_ECOLOGY_GUIDANCE, /CO2 and CO2e are not interchangeable/);
  assert.match(AI_ECOLOGY_GUIDANCE, /clearly labelled hypothetical/);
  assert.doesNotMatch(calculateVerified({ operation: "add", values: [2, 2] }).caveat, /CO2|carbon|flight/i);
});

const sourceQuote = "Paris est la capitale de la France.";
const evidenceSource = {
  title: "Géographie de la France", url: "https://example.org/france", snippet: "Extrait",
  content: sourceQuote + " Cette page présente la géographie française, les villes et les données administratives utiles à cette question.",
};

test("A factual correction triggers rechecking, but style and personal corrections do not", () => {
  for (const text of ["Tu t’es trompé sur ce chiffre", "Ce chiffre est faux", "C'est faux, vérifie", "Ta source ne dit pas ça", "Your answer is wrong"]) {
    assert.equal(isFactualCorrection(text), true, text);
    assert.equal(classifyAiMessage(text).needsResearch, true, text);
  }
  for (const text of ["Ta réponse est trop longue", "Tu t'es trompé de langue", "Non, mon prénom est Alex", "Je préfère une réponse en français", "Bonjour"]) {
    assert.equal(isFactualCorrection(text), false, text);
  }
});

test("Corrections recover the original question without trusting or searching the old answer", () => {
  const history = [
    { role: "user", content: JSON.stringify({ author: { id: "alice" }, text: "Quelle est la capitale de la France ?" }) },
    { role: "assistant", content: "La capitale de la France est Madrid." },
    { role: "user", content: "C'est faux" }, { role: "assistant", content: "Je vais vérifier." },
    { role: "user", content: "C'est faux" },
  ];
  const context = correctionContext("C'est faux", history)!;
  assert.equal(context.question, "Quelle est la capitale de la France ?");
  assert.equal(correctionSearchQuery(context), "Quelle est la capitale de la France ?");
  assert.equal(correctionContext("C'est faux", [], "Autre réponse"), undefined);
  assert.equal(correctionSearchQuery({ question: "Mon password est secret", previousAnswer: "old" }), null);
});

test("Simple mathematical corrections are recomputed without external sources or eval", () => {
  const context = correctionContext("Ce calcul est faux", [
    { role: "user", content: "Combien font 2 + 2 ?" }, { role: "assistant", content: "5" },
  ]);
  assert.equal(context?.calculation?.result, 4);
});

test("Evidence requires fetched page text, excludes duplicate URLs/text and impossible future dates", () => {
  const now = Date.parse("2026-11-07T12:00:00Z");
  const sources = prepareEvidence([
    evidenceSource,
    { ...evidenceSource, url: "https://example.org/france?utm_source=tracking" },
    { ...evidenceSource, url: "https://copied.example/article" },
    { ...evidenceSource, url: "https://future.example/article", content: "Different future text ".repeat(20), publishedAt: "2099-01-01" },
    { ...evidenceSource, url: "https://snippet.example/article", content: undefined },
  ], now);
  assert.equal(sources.length, 1);
  assert.equal(sources[0]?.url, evidenceSource.url);
});

test("Relevant article passages are retained instead of a long navigation prefix", () => {
  const text = "Navigation et abonnements. ".repeat(250) + "La capitale de la France est Paris. ".repeat(60);
  const selected = relevantPageText(text, "capitale France Paris", 1000);
  assert.match(selected, /capitale de la France/);
  assert.ok(selected.length <= 1000);
});

test("Reviewed claims require real source IDs and verbatim fetched quotations", () => {
  const segment = "La capitale de la France est Paris.";
  const valid = validateEvidenceReview(JSON.stringify({
    status: "supported", supported: [{ segment: 1, citations: [{ source: 1, quote: sourceQuote }] }],
  }), [segment], [evidenceSource], "fr");
  assert.equal(valid.status, "supported");
  assert.equal(valid.text, segment);
  for (const citation of [{ source: 99, quote: sourceQuote }, { source: 1, quote: "Madrid est la capitale de la France." }, { source: 1, quote: "Paris" }]) {
    const refused = validateEvidenceReview(JSON.stringify({
      status: "supported", supported: [{ segment: 1, citations: [citation] }],
    }), [segment], [evidenceSource], "fr");
    assert.equal(refused.status, "insufficient");
    assert.deepEqual(refused.sources, []);
    assert.equal(refused.text.includes(segment), false);
  }
});

test("An ungrounded part is removed, with uncertainty instead of an invented completed answer", () => {
  const reviewed = validateEvidenceReview(JSON.stringify({
    status: "supported", supported: [{ segment: 1, citations: [{ source: 1, quote: sourceQuote }] }],
  }), ["Paris est la capitale de la France.", "Une requête vaut exactement 99 kg de CO2."], [evidenceSource], "fr");
  assert.equal(reviewed.status, "partial");
  assert.equal(reviewed.text.includes("99 kg"), false);
  assert.match(reviewed.text, /partie/);
});

test("Disagreement needs two distinct source hosts and must retain an explicit uncertainty notice", () => {
  const payload = { status: "conflicting", supported: [{ segment: 1, citations: [
    { source: 1, quote: sourceQuote }, { source: 2, quote: "Les estimations ne portent pas sur le même périmètre." },
  ] }] };
  const other = { ...evidenceSource, url: "https://another.example/research", content: "Les estimations ne portent pas sur le même périmètre. " + "Explication de la méthode. ".repeat(10) };
  const reviewed = validateEvidenceReview(JSON.stringify(payload), ["Les résultats ne permettent pas de trancher."], [evidenceSource, other], "fr");
  assert.equal(reviewed.status, "conflicting");
  assert.match(reviewed.text, /conclure/);
  const sameHost = validateEvidenceReview(JSON.stringify(payload), ["Désaccord."], [evidenceSource, { ...other, url: "https://example.org/other" }], "fr");
  assert.equal(sameHost.status, "insufficient");
});

test("A correction cannot automatically agree with the user without evidence of the previous error", () => {
  const reviewed = validateEvidenceReview(JSON.stringify({
    status: "supported", previousError: "not_confirmed",
    supported: [{ segment: 1, citations: [{ source: 1, quote: sourceQuote }] }],
  }), ["Tu as raison, je me suis trompé : Paris est la capitale de la France."], [evidenceSource], "fr", true);
  assert.equal(reviewed.status, "insufficient");
  assert.doesNotMatch(reviewed.text, /Tu as raison/);
});

test("Research fallback messages respect supported languages rather than forcing English", () => {
  const reviewed = validateEvidenceReview('{"status":"insufficient","supported":[]}', ["x"], [evidenceSource], "es");
  assert.match(reviewed.text, /información|verificar/);
});
