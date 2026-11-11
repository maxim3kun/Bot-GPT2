import test from "node:test";
import assert from "node:assert/strict";
import type { Message } from "discord.js";
import type OpenAI from "openai";
import { commandExecutor, dispatchAiCommand, handleAiCommandRequest } from "../src/discord/ai-command-dispatch.js";
import { handleAiActionRequest, requestAiAction } from "../src/discord/ai-actions.js";
import { fixture, fakeMessage, fakeModel, audioState } from "./fixtures/ai-commands.js";

// The test runner replaces only I/O boundaries (Discord/provider/domain
// handlers). The real selector, parser, access policy, dispatcher and
// confirmation lifecycle run together without a Discord token or API call.
test("Typed road request preserves persona scope and uses the authorized domain handler without the model", async () => {
  fixture.reset();
  const request = { name: "plan_journey" as const, mode: "car" as const, origin: "Beauvais", destination: "Amiens" };
  await dispatchAiCommand(fakeMessage() as unknown as Message, request, "fr", null, { personaId: "persona-test" });
  assert.deepEqual(JSON.parse(fixture.handlers[0]!.slice("journey:".length)), { journey: request, personaId: "persona-test" });
  assert.equal(fixture.modelCalls, 0);
  fixture.reset();fixture.features.ai_chat=false;
  await dispatchAiCommand(fakeMessage() as unknown as Message, request, "fr", null, { personaId: "persona-test" });
  assert.deepEqual(fixture.handlers, []);
});
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
  assert.equal(fixture.modelCalls, 0);
});

test("Ordinary actions use the domain handler, never a provider's claimed success", async () => {
  fixture.reset();
  await handleAiCommandRequest(fakeMessage() as unknown as Message, "Lance un démineur",
    fakeModel(null) as unknown as OpenAI, "fr");
  assert.deepEqual(fixture.handlers, ["minesweeper:medium"]);
  assert.deepEqual(fixture.replies, ["real minesweeper:medium result"]);
  assert.equal(fixture.modelCalls, 0);
});

test("Blocked users, disabled AI and missing consent never reach the model", async () => {
  for (const deny of ["block", "aiFlag", "aiFeature", "consent", "userPermissions", "botPermissions"] as const) {
    fixture.reset();
    if (deny === "block") fixture.blocked = true;
    if (deny === "aiFlag") fixture.flags.ai = false;
    if (deny === "aiFeature") fixture.features.ai_chat = false;
    if (deny === "consent") fixture.consent = "declined";
    if (deny === "userPermissions") fixture.userDenied.add("SendMessages");
    if (deny === "botPermissions") fixture.botDenied.add("SendMessages");
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
    ["start_minesweeper", { difficulty: "hard" }, "Lance un démineur difficile", "minesweeper:hard"],
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
  assert.equal(await handleAiActionRequest(message, "Lance un démineur", model, "fr"), true);
  assert.equal(await handleAiActionRequest(message, "Lance un démineur", model, "fr"), true);
  assert.equal(fixture.modelCalls, 0);
  assert.deepEqual(fixture.handlers, ["minesweeper:medium"]);
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

test("Every new game dispatches only accepted parameters to its existing handler", async () => {
  for (const [text, expected] of [
    ["Lance GeoGuessr difficile", "geo:hard"], ["Lance trivia", "trivia:"],
    ["Lance devine le nombre", "guessnumber:"], ["Lance devine le logo moyen", "guesslogo:medium"],
  ]) {
    fixture.reset();
    await handleAiCommandRequest(fakeMessage() as unknown as Message, text!, fakeModel(null) as unknown as OpenAI, "fr");
    assert.deepEqual(fixture.handlers, [expected]); assert.equal(fixture.modelCalls, 0);
  }
});
test("Timetables reach the typed transport handler with all supplied fields and configured prefix", async () => {
  fixture.reset();
  await handleAiCommandRequest(fakeMessage() as unknown as Message, "Horaires du bus Amiens vers Beauvais 601 en France", null, "fr");
  assert.deepEqual(fixture.handlers, ["transport"]);
  assert.deepEqual(fixture.searches[0].request, { name: "search_transport", mode: "bus", place: "Amiens", line: "601", direction: "Beauvais", territory: "fr" });
  assert.equal(fixture.searches[0].prefix, "?");
  assert.equal(await fixture.searches[0].authorize(), true); // Initial invocation already authorized.
  fixture.consent = "declined";
  assert.equal(await fixture.searches[0].authorize(), false); // Subsequent menu calls re-check consent.
});
test("YouTube calls its real search handler, with no generated claim of playback", async () => {
  fixture.reset();
  await handleAiCommandRequest(fakeMessage() as unknown as Message, "Joue Stromae Papaoutai sur YouTube", fakeModel("play_radio", { station: "nrj" }) as unknown as OpenAI, "fr");
  assert.deepEqual(fixture.handlers, ["youtube:Stromae Papaoutai"]);
  assert.equal(fixture.modelCalls, 0); assert.ok(!JSON.stringify(fixture.replies).includes("Invented"));
});
test("Pause/resume are idempotent and a player refusal cannot become a success message", async () => {
  fixture.reset(); const state = audioState();
  await handleAiCommandRequest(fakeMessage() as unknown as Message, "Mets la musique en pause", null, "fr");
  assert.equal(state.paused, true);
  await handleAiCommandRequest(fakeMessage() as unknown as Message, "Mets la musique en pause", null, "fr");
  assert.deepEqual(fixture.handlers, ["toggle"]);
  fixture.audioFails = true;
  await handleAiCommandRequest(fakeMessage() as unknown as Message, "Reprends la musique", null, "fr");
  assert.equal(state.paused, true); assert.match(JSON.stringify(fixture.replies.at(-1)), /pas confirmé/);
});
test("Playback still buffering cannot be reported as currently playing or resumed", async () => {
  fixture.reset(); audioState("buffering");
  for (const text of ["Quel est le titre en cours ?", "Reprends la musique"]) {
    await handleAiCommandRequest(fakeMessage() as unknown as Message, text, null, "fr");
    assert.match(JSON.stringify(fixture.replies.at(-1)), /pas.*confirm/);
  }
  assert.deepEqual(fixture.handlers, []);
});
test("Read-only queue/current track work outside voice, but still require a guild", async () => {
  fixture.reset(); audioState(); fixture.voiceId = "";
  await handleAiCommandRequest(fakeMessage() as unknown as Message, "Montre la file d’attente", null, "fr");
  assert.ok((fixture.replies.at(-1) as { embeds?: unknown[] }).embeds?.length);
  await handleAiCommandRequest(fakeMessage(true) as unknown as Message, "Quel est le titre en cours ?", null, "fr");
  assert.match(String(fixture.replies.at(-1)), /nécessite un serveur/);
});
test("Voice operations cannot run in a different session or after the requester moved", async () => {
  fixture.reset(); audioState(); fixture.botVoiceId = "different";
  await handleAiCommandRequest(fakeMessage() as unknown as Message, "Arrête la musique", null, "fr");
  assert.deepEqual(fixture.handlers, []);
  fixture.botVoiceId = null;
  const executor = commandExecutor(fakeMessage() as unknown as Message, "fr", null);
  assert.equal(await executor.authorize({ name: "music_stop" }), true);
  fixture.voiceId = "moved";
  await executor.execute({ name: "music_stop" });
  assert.deepEqual(fixture.handlers, []); assert.match(String(fixture.replies.at(-1)), /contexte vocal a changé/);
});
test("New game and audio actions respect their precise global and guild switches", async () => {
  for (const [text, feature] of [
    ["Lance GeoGuessr", "geoguessr"], ["Lance trivia", "trivia"], ["Lance devine le logo", "guesslogo"],
    ["Joue Stromae sur YouTube", "youtube"], ["Lance un démineur", "minesweeper"],
  ]) for (const global of [false, true]) {
    fixture.reset();
    (global ? fixture.globalFeatures : fixture.features)[feature!] = false;
    await handleAiCommandRequest(fakeMessage() as unknown as Message, text!, null, "fr");
    assert.deepEqual(fixture.handlers, [], `${text} global=${global}`);
  }
});
test("Suitable games and transport searches work in DMs; audio clearly requires a guild", async () => {
  for (const text of ["Lance un Puissance 4", "Lance devine le nombre", "Lance GeoGuessr", "Horaires métro Montréal au Québec"]) {
    fixture.reset();
    await handleAiCommandRequest(fakeMessage(true) as unknown as Message, text, null, "fr");
    assert.equal(fixture.handlers.length, 1, text);
  }
  fixture.reset();
  await handleAiCommandRequest(fakeMessage(true) as unknown as Message, "Joue Stromae sur YouTube", null, "fr");
  assert.deepEqual(fixture.handlers, []); assert.match(String(fixture.replies.at(-1)), /nécessite un serveur/);
});
test("Unconfigured trivia stays with its handler's honest error instead of generated success", async () => {
  fixture.reset();
  await handleAiCommandRequest(fakeMessage() as unknown as Message, "Lance trivia", null, "fr");
  assert.deepEqual(fixture.handlers, []); assert.deepEqual(fixture.replies, ["AI features are not configured"]);
});
test("Missing parameters and multiple requests prompt clarification without invoking any handler", async () => {
  for (const text of ["Mets de la musique", "Mets une radio", "Lance un jeu", "Lance trivia difficile",
    "Lance devine le nombre entre 1 et 1000", "Mets NRJ et lance GeoGuessr"]) {
    fixture.reset();
    assert.equal(await handleAiCommandRequest(fakeMessage() as unknown as Message, text, null, "fr"), true);
    assert.deepEqual(fixture.handlers, []); assert.match(JSON.stringify(fixture.replies), /Aucune action exécutée/);
  }
});
test("Quotes, descriptive messages and hypotheticals cannot be promoted by a model into actions", async () => {
  for (const text of ['"Mets NRJ"', "Il a dit lance GeoGuessr", "Je joue au démineur", "Si je te dis mets NRJ", "Ne joue pas Stromae"]) {
    fixture.reset();
    assert.equal(await handleAiActionRequest(fakeMessage() as unknown as Message, text, fakeModel("play_radio", { station: "nrj" }) as unknown as OpenAI, "fr"), false);
    assert.deepEqual(fixture.handlers, []); assert.equal(fixture.modelCalls, 0);
  }
});
test("Message retries, including a new object with the same ID, execute only once", async () => {
  fixture.reset();
  const message = fakeMessage() as unknown as Message;
  await Promise.all([handleAiActionRequest(message, "Mets NRJ", null, "fr"), handleAiActionRequest(message, "Mets NRJ", null, "fr")]);
  const retry = { ...fakeMessage(), id: message.id } as unknown as Message;
  await handleAiCommandRequest(retry, "Mets NRJ", null, "fr");
  assert.deepEqual(fixture.handlers, ["radio:nrj"]);
});
test("Removed custom radio stations and malformed typed actions cannot execute", async () => {
  fixture.reset(); fixture.custom.set("local", { name: "Radio locale" });
  await handleAiCommandRequest(fakeMessage() as unknown as Message, "Mets Radio locale", null, "fr");
  assert.deepEqual(fixture.handlers, ["radio:local"]);
  fixture.custom.delete("local");
  await dispatchAiCommand(fakeMessage() as unknown as Message, { name: "play_radio", station: "local" }, "fr", null);
  await dispatchAiCommand(fakeMessage() as unknown as Message, { name: "music_stop", channelId: "other" } as any, "fr", null);
  assert.deepEqual(fixture.handlers, ["radio:local"]);
});
test("YouTube failures cannot become a fallback radio or an invented playback result", async () => {
  fixture.reset(); fixture.handlerFails = true;
  await handleAiCommandRequest(fakeMessage() as unknown as Message, "Joue Stromae sur YouTube", null, "fr");
  assert.deepEqual(fixture.handlers, ["youtube:Stromae"]); assert.deepEqual(fixture.replies, ["service indisponible"]);
});
test("Missing titles can be supplied by a direct reply, with member/channel/persona isolation", async () => {
  fixture.reset();
  const first = fakeMessage() as unknown as Message;
  await handleAiCommandRequest(first, "Mets de la musique", null, "fr", { personaId: "alpha" });
  // fakeMessage assigns consecutive IDs to the request and its bot reply.
  const responseId = `reply-${Number(first.id.split("-")[1]) + 1}`;
  const reply = (extra: Record<string, unknown> = {}) => ({ ...fakeMessage(), reference: { messageId: responseId }, ...extra }) as unknown as Message;
  for (const message of [reply({ author: { id: "other" } }), reply({ channelId: "other" })])
    assert.equal(await handleAiCommandRequest(message, "Stromae", null, "fr", { personaId: "alpha" }), false);
  assert.equal(await handleAiCommandRequest(reply(), "Stromae", null, "fr", { personaId: "beta" }), false);
  assert.equal(await handleAiCommandRequest(reply(), "Stromae", null, "fr", { personaId: "alpha" }), true);
  assert.deepEqual(fixture.handlers, ["youtube:Stromae"]);
  await handleAiCommandRequest(reply(), "Stromae", null, "fr", { personaId: "alpha" });
  assert.deepEqual(fixture.handlers, ["youtube:Stromae"]);
});
test("An unrelated reply or bare text cannot satisfy a missing parameter", async () => {
  fixture.reset();
  await handleAiCommandRequest(fakeMessage() as unknown as Message, "Mets de la musique", null, "fr");
  assert.equal(await handleAiCommandRequest(fakeMessage() as unknown as Message, "Stromae", null, "fr"), false);
  assert.equal(await handleAiCommandRequest({ ...fakeMessage(), reference: { messageId: "unrelated" } } as unknown as Message, "Stromae", null, "fr"), false);
  assert.deepEqual(fixture.handlers, []);
});
test("Plain-text audio controls do not demand the unrelated Embed Links permission", async () => {
  fixture.reset(); audioState(); fixture.botDenied.add("EmbedLinks");
  await handleAiCommandRequest(fakeMessage() as unknown as Message, "Arrête la musique", null, "fr");
  assert.deepEqual(fixture.handlers, ["stop"]); assert.match(JSON.stringify(fixture.replies), /Lecture arrêtée/);
});
test("A YouTube search outside voice cannot autoplay; its later selection requires fresh voice access", async () => {
  fixture.reset(); fixture.voiceId = "";
  await handleAiCommandRequest(fakeMessage() as unknown as Message, "Recherche sur YouTube David Guetta Titanium", null, "fr");
  assert.deepEqual(fixture.handlers, ["youtube:David Guetta Titanium"]);
  assert.equal(fixture.youtubeRequests[0]!.autoplay, false);
  assert.equal(await fixture.youtubeRequests[0]!.authorize!(), false);
  fixture.voiceId = "voice";
  assert.equal(await fixture.youtubeRequests[0]!.authorize!(), true);
  fixture.features.youtube = false;
  assert.equal(await fixture.youtubeRequests[0]!.authorize!(), false);
  fixture.features.youtube = true; fixture.voiceId = "other";
  assert.equal(await fixture.youtubeRequests[0]!.authorize!(), false);
});
