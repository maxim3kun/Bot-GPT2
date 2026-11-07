import test from "node:test";
import assert from "node:assert/strict";
import type { Message } from "discord.js";
import type OpenAI from "openai";
import { handleAiCommandRequest } from "../src/discord/ai-command-dispatch.js";
import { handleAiActionRequest, requestAiAction } from "../src/discord/ai-actions.js";
import { fixture, fakeMessage, fakeModel } from "./fixtures/ai-commands.js";

// The test runner replaces only I/O boundaries (Discord/provider/domain
// handlers). The real selector, parser, access policy, dispatcher and
// confirmation lifecycle run together without a Discord token or API call.
test("Persona action route uses the Pokémon domain handler directly, not model prose", async () => {
  fixture.reset();
  const handled = await handleAiActionRequest(fakeMessage() as unknown as Message,
    "Okay je vais régler ça merci, et recherche le pokemon Flambusard il s’appelle Talonflame en anglais",
    null, "fr");
  assert.equal(handled, true);
  assert.deepEqual(fixture.handlers, ["pokemon:Flambusard:fr"]);
  assert.deepEqual(fixture.replies, ["real PokéAPI result"]);
  assert.equal(fixture.modelCalls, 0);
});

test("Persona Pokémon lookup respects AI feature, consent, blocks and Embed Links permission", async () => {
  for (const deny of [
    () => { fixture.blocked = true; },
    () => { fixture.features.ai_chat = false; },
    () => { fixture.consent = "unknown"; },
    () => { fixture.botDenied.add("EmbedLinks"); },
    () => { fixture.featureReadFails = true; },
  ]) {
    fixture.reset(); deny();
    await handleAiActionRequest(fakeMessage() as unknown as Message, "Recherche le pokemon Flambusard", null, "fr").catch(() => null);
    assert.deepEqual(fixture.handlers, []);
    assert.equal(fixture.modelCalls, 0);
  }
});
test("Dispatcher shows the existing help handler's response, not model content", async () => {
  fixture.reset();
  await handleAiCommandRequest(fakeMessage() as unknown as Message, "Peux-tu afficher l’aide", fakeModel("show_help") as unknown as OpenAI, "fr");
  assert.deepEqual(fixture.handlers, ["help"]);
  assert.deepEqual(fixture.replies, ["real help result"]);
  assert.equal(fixture.modelCalls, 1);
});

test("Provider prose claiming success never executes or reaches the user", async () => {
  fixture.reset();
  await handleAiCommandRequest(fakeMessage() as unknown as Message, "Lance un démineur",
    fakeModel(null) as unknown as OpenAI, "fr");
  assert.deepEqual(fixture.handlers, []);
  assert.deepEqual(fixture.replies, []);
});

test("Blocked users, disabled AI and missing consent never reach the model", async () => {
  for (const deny of ["block", "aiFlag", "aiFeature", "consent", "userPermissions", "botPermissions"] as const) {
    fixture.reset();
    if (deny === "block") fixture.blocked = true;
    if (deny === "aiFlag") fixture.flags.ai = false;
    if (deny === "aiFeature") fixture.features.ai_chat = false;
    if (deny === "consent") fixture.consent = "declined";
    if (deny === "userPermissions") fixture.userDenied.add("SendMessages");
    if (deny === "botPermissions") fixture.botDenied.add("EmbedLinks");
    await handleAiCommandRequest(fakeMessage() as unknown as Message, "Lance un démineur", fakeModel("start_minesweeper", { difficulty: "easy" }) as unknown as OpenAI, "fr");
    assert.equal(fixture.modelCalls, 0, deny);
    assert.deepEqual(fixture.handlers, [], deny);
  }
});

test("A model diagnostic request cannot bypass the existing administrator role", async () => {
  fixture.reset();
  fixture.admin = false;
  await handleAiCommandRequest(fakeMessage() as unknown as Message, "Affiche le diagnostic", fakeModel("module_diagnostic") as unknown as OpenAI, "fr");
  assert.deepEqual(fixture.handlers, []);
  assert.match(String(fixture.replies.at(-1)), /réservé aux administrateurs/);
});

test("Game switches and bot reaction permissions are enforced before any confirmation", async () => {
  for (const deny of ["flag", "feature", "reactions"] as const) {
    fixture.reset();
    if (deny === "flag") fixture.flags.games = false;
    if (deny === "feature") fixture.features.connect4 = false;
    if (deny === "reactions") fixture.botDenied.add("AddReactions");
    await handleAiCommandRequest(fakeMessage() as unknown as Message, "Lance un Puissance 4", fakeModel("start_connect4") as unknown as OpenAI, "fr");
    assert.deepEqual(fixture.handlers, []);
    assert.equal(fixture.collector, null);
  }
});

test("Known natural radio request runs the real handler directly using existing consent", async () => {
  fixture.reset();
  await handleAiCommandRequest(fakeMessage() as unknown as Message, "mets la radio NRJ", null, "fr");
  assert.equal(fixture.modelCalls, 0);
  assert.deepEqual(fixture.handlers, ["radio:nrj"]);
  assert.equal(fixture.collector, null);
  assert.equal(fixture.replies.at(-1), "real radio result");
  assert.ok(fixture.fetches >= 3, "members, bot and text channel are fetched at execution");
});

test("Existing deterministic help stays on its original route without a model or new consent", async () => {
  fixture.reset();
  fixture.consent = "unknown";
  assert.equal(await handleAiCommandRequest(fakeMessage() as unknown as Message, "Affiche aide", fakeModel("show_help") as unknown as OpenAI, "fr"), false);
  assert.equal(fixture.modelCalls, 0);
  assert.deepEqual(fixture.replies, []);
});

test("Authorized minesweeper and administrator diagnostics reuse their domain handlers", async () => {
  for (const [name, args, text, handler] of [
    ["start_minesweeper", { difficulty: "hard" }, "Lance un démineur", "minesweeper:hard"],
    ["module_diagnostic", {}, "Affiche le diagnostic", "diagnostic"],
  ] as const) {
    fixture.reset();
    await handleAiCommandRequest(fakeMessage() as unknown as Message, text, fakeModel(name, args) as unknown as OpenAI, "fr");
    assert.deepEqual(fixture.handlers, [handler]);
    assert.equal(fixture.collector, null);
  }
});

test("Requested Connect Four is explicitly solo, so the bot mention is not challenged", async () => {
  fixture.reset();
  await handleAiCommandRequest(fakeMessage() as unknown as Message, "Lance un Puissance 4", fakeModel("start_connect4") as unknown as OpenAI, "fr");
  assert.deepEqual(fixture.handlers, ["connect4:solo,fr"]);
  assert.equal(fixture.collector, null);
});

test("Revoked consent, permissions, features and membership are checked on every request", async () => {
  for (const change of ["consent", "botPermissions", "feature", "block", "removed"] as const) {
    fixture.reset();
    await handleAiCommandRequest(fakeMessage() as unknown as Message, "mets NRJ", null, "fr");
    assert.deepEqual(fixture.handlers, ["radio:nrj"]);
    fixture.handlers = [];
    if (change === "consent") fixture.consent = "declined";
    if (change === "botPermissions") fixture.botDenied.add("Speak");
    if (change === "feature") fixture.features.radio = false;
    if (change === "block") fixture.blocked = true;
    if (change === "removed") fixture.memberAvailable = false;
    await handleAiCommandRequest(fakeMessage() as unknown as Message, "mets NRJ", null, "fr");
    assert.deepEqual(fixture.handlers, [], change);
  }
});

test("Voice permission denials, DMs and database read failures never start audio", async () => {
  for (const deny of ["user", "bot", "dm", "database"] as const) {
    fixture.reset();
    if (deny === "user") fixture.userDenied.add("Connect");
    if (deny === "bot") fixture.botDenied.add("Speak");
    if (deny === "database") fixture.featureReadFails = true;
    await handleAiCommandRequest(fakeMessage(deny === "dm") as unknown as Message, "mets NRJ", null, "fr");
    assert.deepEqual(fixture.handlers, []);
    assert.equal(fixture.collector, null);
  }
});

test("Handler failures report failure and never get an invented success", async () => {
  fixture.reset();
  fixture.handlerFails = true;
  await handleAiCommandRequest(fakeMessage() as unknown as Message, "mets NRJ", null, "fr");
  assert.ok(fixture.replies.some((reply) => typeof reply === "string" && reply.includes("indisponible")));
  assert.ok(!fixture.replies.includes("real radio result"));
});

test("A global disable cannot be bypassed by a guild override, and stage voice is rejected", async () => {
  for (const deny of ["global", "stage"] as const) {
    fixture.reset();
    if (deny === "global") {
      fixture.globalFeatures.radio = false;
      fixture.features.radio = true;
    } else fixture.voiceType = "GuildStageVoice";
    await handleAiCommandRequest(fakeMessage() as unknown as Message, "mets NRJ", null, "fr");
    assert.deepEqual(fixture.handlers, [], deny);
  }
});

test("Existing persona and message entry points select tools only once for the same message", async () => {
  fixture.reset();
  const message = fakeMessage() as unknown as Message;
  const model = fakeModel(null) as unknown as OpenAI;
  assert.equal(await handleAiActionRequest(message, "Lance un démineur", model, "fr"), false);
  assert.equal(await handleAiActionRequest(message, "Lance un démineur", model, "fr"), false);
  assert.equal(fixture.modelCalls, 1);
  assert.deepEqual(fixture.replies, []);
});

test("Existing typed radio callers share the same permissions and direct-execution policy", async () => {
  fixture.reset();
  await requestAiAction(fakeMessage() as unknown as Message, { action: "radio", station: "nrj" }, "fr");
  assert.deepEqual(fixture.handlers, ["radio:nrj"]);
  assert.equal(fixture.collector, null);
  fixture.botDenied.add("Connect");
  await requestAiAction(fakeMessage() as unknown as Message, { action: "radio", station: "nrj" }, "fr");
  assert.deepEqual(fixture.handlers, ["radio:nrj"]);
});
