import test from "node:test";
import assert from "node:assert/strict";
import {
  AiCommandConfirmation, aiCommandDenial, buildAiCommandTools, needsAiCommandConfirmation,
  parseAiCommandTool, type AiCommandAccess, type AiCommandAction,
} from "../src/discord/ai-command-tools.js";
import { isAiCommandRequest } from "../src/discord/ai-router.js";
import { extractRadioStationRequest } from "../src/discord/radio-intent.js";
import { extractNaturalHelpCommand, extractPokemonQuery } from "../src/lib/ai-functions.js";

const allowed: AiCommandAccess = {
  blocked: false, aiEnabled: true, featureEnabled: true, consent: true,
  inGuild: true, administrator: true, userCanUseChannel: true, botCanReply: true,
  userCanUseVoice: true, botCanUseVoice: true, voiceAvailable: true,
};
const radio: AiCommandAction = { name: "play_radio", station: "nrj" };
const actor = { userId: "requester", channelId: "text", guildId: "guild", voiceChannelId: "voice" };
const call = (name: string, args = "{}") => ({ type: "function", function: { name, arguments: args } });
const confirmation = () => new AiCommandConfirmation(radio, "requester", "text", "guild", "voice", 60_000);

test("Only five explicit tools with closed schemas are advertised", () => {
  const tools = buildAiCommandTools(["nrj"]);
  assert.deepEqual(tools.map((tool) => tool.function.name), [
    "show_help", "start_minesweeper", "start_connect4", "play_radio", "module_diagnostic",
    "search_transport", "play_youtube", "search_youtube", "music_pause", "music_resume", "music_skip", "music_stop", "music_queue", "music_current",
    "start_geoguessr", "start_guess_logo", "start_trivia", "start_guess_number",
  ]);
  assert.ok(tools.every((tool) => tool.function.parameters.additionalProperties === false));
  assert.deepEqual(tools[3].function.parameters.properties.station, { type: "string", enum: ["nrj"] });
});

test("Valid tool arguments are parsed without producing arbitrary commands", () => {
  assert.deepEqual(parseAiCommandTool([call("play_radio", '{"station":"nrj"}')], ["nrj"]), radio);
  for (const name of ["show_help", "start_connect4", "module_diagnostic"]) {
    assert.deepEqual(parseAiCommandTool([call(name)], []), { name });
  }
  assert.deepEqual(parseAiCommandTool([call("start_minesweeper", '{"difficulty":"hard"}')], []),
    { name: "start_minesweeper", difficulty: "hard" });
});

test("Unknown tools, malformed arguments, extra authority and multiple calls fail closed", () => {
  for (const calls of [
    [], [call("ban_user")], [call("!radio nrj")], [call("show_help", "null")],
    [call("show_help", "[]")], [call("show_help", "broken json")],
    [call("show_help", '{"confirmed":true}')], [call("start_connect4", '{"userId":"admin"}')],
    [call("play_radio", '{"station":"https://attacker.invalid/stream"}')],
    [call("play_radio", '{"station":"nrj","channelId":"other"}')],
    [call("play_radio", '{"station":["nrj"]}')], [call("play_radio", "{}")],
    [call("start_minesweeper", '{"difficulty":"stop"}')],
    [call("start_minesweeper", '{"difficulty":["easy"]}')],
    [call("show_help"), call("module_diagnostic")],
    [{ type: "custom", function: { name: "show_help", arguments: "{}" } }],
  ]) assert.equal(parseAiCommandTool(calls, ["nrj"]), null, JSON.stringify(calls));
});

test("User and bot access, switches, blocking and consent are required for every action", () => {
  const actions: AiCommandAction[] = [
    radio, { name: "show_help" }, { name: "start_connect4" },
    { name: "start_minesweeper", difficulty: "easy" }, { name: "module_diagnostic" },
  ];
  for (const action of actions) {
    assert.equal(aiCommandDenial(action, allowed), null);
    for (const [patch, reason] of [
      [{ blocked: true }, "blocked"],
      [{ aiEnabled: false }, "disabled"],
      [{ featureEnabled: false }, "disabled"],
      [{ consent: false }, "consent"],
      [{ userCanUseChannel: false }, "permissions"],
      [{ botCanReply: false }, "permissions"],
    ] as const) {
      assert.equal(aiCommandDenial(action, { ...allowed, ...patch }), reason, `${action.name}: ${reason}`);
    }
  }
});

test("Diagnostics stay administrator-only, even in DMs", () => {
  const action: AiCommandAction = { name: "module_diagnostic" };
  assert.equal(aiCommandDenial(action, { ...allowed, administrator: false }), "administrator");
  assert.equal(aiCommandDenial(action, { ...allowed, inGuild: false }), "administrator");
});

test("Audio requires a server, an available voice channel and both parties' voice permissions", () => {
  for (const [patch, reason] of [
    [{ inGuild: false }, "guild"], [{ voiceAvailable: false }, "voice"],
    [{ userCanUseVoice: false }, "permissions"], [{ botCanUseVoice: false }, "permissions"],
  ] as const) assert.equal(aiCommandDenial(radio, { ...allowed, ...patch }), reason);
  assert.equal(aiCommandDenial({ name: "start_connect4" }, { ...allowed, inGuild: false }), null);
});

test("Explicit ordinary actions reuse the existing consent without another confirmation", () => {
  assert.equal(needsAiCommandConfirmation(radio), false);
  assert.equal(needsAiCommandConfirmation({ name: "start_connect4" }), false);
  assert.equal(needsAiCommandConfirmation({ name: "show_help" }), false);
  assert.equal(needsAiCommandConfirmation({ name: "module_diagnostic" }), false);
});

test("Confirmation is bound to requester, channel and guild", async () => {
  const pending = confirmation();
  let checks = 0;
  let executions = 0;
  const executor = { authorize: async () => { checks++; return true; }, execute: async () => { executions++; } };
  for (const patch of [{ userId: "intruder" }, { channelId: "other" }, { guildId: "other" }]) {
    assert.equal(await pending.confirm({ ...actor, ...patch }, executor, 1), "ignored");
  }
  assert.equal(checks, 0);
  assert.equal(executions, 0);
  assert.equal(await pending.confirm(actor, executor, 1), "executed");
  assert.equal(executions, 1);
});

test("No action before confirmation; real handler result after fresh authorization, once only", async () => {
  const pending = confirmation();
  const events: string[] = [];
  const executor = {
    authorize: async () => { events.push("fresh access check"); return true; },
    execute: async (action: AiCommandAction) => { events.push(`handler result: ${action.name}`); },
  };
  assert.deepEqual(events, []);
  const results = await Promise.all([pending.confirm(actor, executor, 1), pending.confirm(actor, executor, 1)]);
  assert.deepEqual(results, ["executed", "expired"]);
  assert.deepEqual(events, ["fresh access check", "handler result: play_radio"]);
});

test("Revoked permissions, disabled features or withdrawn consent cannot be confirmed", async () => {
  for (const patch of [
    { administrator: false }, { featureEnabled: false }, { aiEnabled: false },
    { consent: false }, { blocked: true }, { botCanReply: false },
  ]) {
    const action: AiCommandAction = { name: "module_diagnostic" };
    const pending = new AiCommandConfirmation(action, "requester", "text", "guild", "voice", 60_000);
    let executions = 0;
    assert.equal(await pending.confirm(actor, {
      authorize: async (current) => aiCommandDenial(current, { ...allowed, ...patch }) === null,
      execute: async () => { executions++; },
    }, 1), "denied");
    assert.equal(executions, 0);
  }
});

test("Expiry, cancellation and voice changes never run handlers", async () => {
  let executions = 0;
  const executor = { authorize: async () => true, execute: async () => { executions++; } };
  assert.equal(await confirmation().confirm(actor, executor, 60_000), "expired");
  const cancelled = confirmation();
  cancelled.cancel();
  assert.equal(await cancelled.confirm(actor, executor, 1), "expired");
  const moved = confirmation();
  assert.equal(await moved.confirm({ ...actor, voiceChannelId: "other" }, executor, 1), "denied");
  assert.equal(await moved.confirm(actor, executor, 1), "expired");
  assert.equal(executions, 0);
});

test("Failed authorization or domain execution never reports executed, and cannot replay", async () => {
  for (const failAt of ["authorize", "execute"]) {
    const pending = confirmation();
    const executor = {
      authorize: async () => { if (failAt === "authorize") throw Error("unavailable"); return true; },
      execute: async () => { throw Error("unavailable"); },
    };
    await assert.rejects(pending.confirm(actor, executor, 1), /unavailable/);
    assert.equal(await pending.confirm(actor, executor, 1), "expired");
  }
});

test("Natural requests are candidates, ordinary questions retain existing routing", () => {
  for (const text of [
    "Lance un démineur", "Peux-tu lancer un démineur", "Peux-tu me montrer le diagnostic",
    "Can you start Connect4?", "Montre l’aide", "Joue la radio NRJ", "Diagnostic des modules",
    "Lance un Puissance 4", "Affiche le diagnostic",
  ]) assert.equal(isAiCommandRequest(text), true, text);
  for (const text of [
    "Comment lancer un démineur ?", "Quelles sont tes commandes ?", "Qui t'a créé ?",
    "Donne-moi les infos du Pokémon Flambusard", "Quelle heure à Paris ?", "Ne lance pas de radio",
  ]) assert.equal(isAiCommandRequest(text), false, text);
  assert.equal(extractRadioStationRequest("mets la radio NRJ", { nrj: { name: "NRJ" } }), "nrj");
  assert.equal(extractNaturalHelpCommand("help"), "help");
  assert.ok(extractPokemonQuery("donne-moi les infos du Pokémon Flambusard"));
});
