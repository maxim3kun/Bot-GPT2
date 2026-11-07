import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import type { ChatInputCommandInteraction, Message } from "discord.js";
import { buildHelpEmbed, buildTopicEmbed, HELP_TOTAL_PAGES, resolveTopicKey, sendHelpPaginator, type HelpLanguage, type HelpPage, type HelpTopic } from "../src/discord/help-builders.js";
import { createSlashMessageAdapter, replyToSlash } from "../src/discord/slash-message-adapter.js";
import { buildBotCommandContext } from "../src/discord/ai-command-context.js";
import { moduleFallbackMessage } from "../src/discord/module-fallback.js";
import { moduleForMessageCommand } from "../src/discord/module-technician.js";
import { SLASH_COMMANDS } from "../src/discord/slash.js";
import { buildPersonaHelp, PERSONA_HELP_PAGES, sendPersonaHelp } from "../src/discord/persona-help.js";

const languages: HelpLanguage[] = ["en", "fr", "es", "de", "pt", "it", "ja", "nl", "ru", "pl", "tr"];
const topics: HelpTopic[] = ["language", "general", "games", "dj", "music", "radio", "youtube", "karaoke", "playlist", "voice", "ai", "quest", "levels", "birthday", "guesslogo", "tools", "dictionary", "qr", "echo", "pokemon", "welcome", "schedule", "food", "tierlist", "blindtest", "milliongame", "persona", "memory", "diagnostics"];

function validateEmbed(embed: ReturnType<typeof buildHelpEmbed>, context: string) {
  const json = embed.toJSON();
  assert.ok((json.fields?.length ?? 0) <= 25, context);
  let length = (json.title?.length ?? 0) + (json.description?.length ?? 0) + (json.footer?.text.length ?? 0);
  for (const field of json.fields ?? []) {
    assert.ok(field.name.length <= 256 && field.value.length <= 1024, `${context}: ${field.name}`);
    length += field.name.length + field.value.length;
  }
  assert.ok(length <= 6000, `${context}: ${length} total characters`);
  return json;
}

test("Every help page and topic serializes within Discord limits in every supported language", () => {
  for (const language of languages) {
    for (let page = 1; page <= HELP_TOTAL_PAGES; page++) validateEmbed(buildHelpEmbed(language, page as HelpPage), `${language}/${page}`);
    for (const topic of topics) {
      validateEmbed(buildTopicEmbed(topic, language), `${language}/${topic}`);
      const custom = validateEmbed(buildTopicEmbed(topic, language, "??"), `${language}/${topic}/prefix`);
      assert.equal(JSON.stringify(custom).includes("`!"), false, `${language}/${topic}/prefix`);
    }
  }
});

test("Help includes actual slash commands, personas, memory controls and diagnostics without duplicate game essays", () => {
  const all = Array.from({ length: HELP_TOTAL_PAGES }, (_, page) => JSON.stringify(buildHelpEmbed("fr", (page + 1) as HelpPage).toJSON())).join("\n");
  for (const command of SLASH_COMMANDS) assert.ok(all.includes(`/${command.name}`), command.name);
  for (const command of ["persona create", "persona avatar", "ai memory auto on", "ai memory auto off", "ai forget", "tech", "tierlist", "blindtest", "milliongame", "qr", "echo", "pokemon", "food", "schedule", "welcome"]) assert.ok(all.includes(command), command);
  assert.equal(all.includes("Sort 20 items"), false);
  assert.equal(all.includes("Tous supportent"), false);
  assert.equal(resolveTopicKey("persona")?.topic, "persona");
  assert.equal(resolveTopicKey("mémoire")?.topic, "memory");
  assert.equal(resolveTopicKey("tech")?.topic, "diagnostics");
});

test("Every help page uses the server prefix in fields and footer and the AI sees the expanded catalogue", () => {
  for (let page = 1; page <= HELP_TOTAL_PAGES; page++) {
    const json = validateEmbed(buildHelpEmbed("fr", page as HelpPage, "??"), `prefix/${page}`);
    assert.equal(JSON.stringify(json).includes("`!"), false, `prefix/${page}`);
    assert.match(json.footer!.text, /\?\?help/);
  }
  const context = buildBotCommandContext("Quelles commandes peux-tu utiliser ?", "fr", "??");
  assert.match(context, /persona create/);
  assert.match(context, /memory auto on/);
  assert.match(context, /\?\?tech/);
  for (const prefix of ["!!", "!m", "+"]) {
    const json = buildHelpEmbed("fr", 1, prefix).toJSON();
    assert.ok(json.fields![0]!.value.includes(`\`${prefix}say\``), prefix);
    assert.ok(json.footer!.text.includes(`${prefix}help`), prefix);
    assert.equal(JSON.stringify(json).includes("{{command-prefix}}"), false);
  }
});

test("The public command overview never advertises a slash-only command with a fake message prefix", () => {
  const bot = readFileSync("src/bot.ts", "utf8");
  const messageHandler = bot.slice(bot.indexOf("const command = args.shift()"));
  const sources = [messageHandler, ...["message-ai-commands", "message-game-commands", "admin-message-commands"]
    .map((name) => readFileSync(`src/discord/${name}.ts`, "utf8"))];
  const implemented = new Set(sources.flatMap((source) => [...source.matchAll(/case "([\w-]+)":/g)].map((match) => match[1])));
  const all = Array.from({ length: HELP_TOTAL_PAGES }, (_, page) => JSON.stringify(buildHelpEmbed("fr", (page + 1) as HelpPage).toJSON())).join("\n");
  const documented = [...all.matchAll(/`!([a-z][\w-]*)\b/gi)].map((match) => match[1]);
  assert.deepEqual([...new Set(documented.filter((root) => !implemented.has(root)))], []);
  assert.ok(all.includes("/play"));
  assert.ok(all.includes("/shellgame"));
});

function fakeSlash(state: "new" | "deferred" | "replied" = "deferred") {
  const calls: string[] = [];
  const handlers = new Map<string, (...args: any[]) => Promise<void>>();
  const edits: any[] = [];
  let collectorOptions: any;
  const response = {
    id: "response", edit: async (payload: unknown) => { edits.push(payload); return response; },
    createMessageComponentCollector: (options: unknown) => {
      collectorOptions = options;
      return { on: (event: string, handler: (...args: any[]) => Promise<void>) => handlers.set(event, handler) };
    },
  } as unknown as Message;
  const interaction = {
    id: "interaction", commandName: "help",
    deferred: state === "deferred", replied: state === "replied",
    user: { id: "author", username: "author", displayName: "Author", displayAvatarURL: () => "avatar" },
    client: { user: { id: "bot" } }, guildId: "fixture", guild: { id: "fixture" },
    channelId: "channel", channel: { id: "channel" }, options: { resolved: {} },
    createdTimestamp: Date.now(), createdAt: new Date(),
    reply: async () => {
      assert.equal(interaction.deferred || interaction.replied, false, "Discord would reject a second initial response");
      calls.push("reply"); interaction.replied = true;
    },
    fetchReply: async () => { calls.push("fetch"); return response; },
    editReply: async () => { calls.push("edit"); interaction.replied = true; return response; },
    followUp: async () => { calls.push("followUp"); return response; },
  };
  return { interaction: interaction as unknown as ChatInputCommandInteraction, calls, handlers, edits, get collectorOptions() { return collectorOptions; } };
}

test("Slash help handles new, deferred and already replied interactions without double acknowledgement", async () => {
  for (const [state, expected] of [["new", ["reply", "fetch"]], ["deferred", ["edit"]], ["replied", ["followUp"]]] as const) {
    const fixture = fakeSlash(state);
    await sendHelpPaginator(fixture.interaction, "fr");
    assert.deepEqual(fixture.calls, expected);
    assert.ok(fixture.handlers.has("collect"));
  }
});

test("Help navigation reaches all pages, wraps, protects the author and disables expired buttons", async () => {
  const fixture = fakeSlash();
  await sendHelpPaginator(fixture.interaction, "fr");
  const updates: any[] = [];
  const button = { customId: "help_next", user: { id: "author" }, update: async (payload: unknown) => { updates.push(payload); } };
  for (let i = 1; i < HELP_TOTAL_PAGES; i++) await fixture.handlers.get("collect")!(button);
  assert.match(updates.at(-1).embeds[0].toJSON().description, /Administration/);
  await fixture.handlers.get("collect")!(button);
  assert.match(updates.at(-1).embeds[0].toJSON().footer.text, /1\/7/);
  await fixture.handlers.get("collect")!({ ...button, customId: "help_prev" });
  assert.match(updates.at(-1).embeds[0].toJSON().footer.text, /7\/7/);
  let rejected = false;
  await fixture.handlers.get("collect")!({ ...button, user: { id: "other" }, reply: async () => { rejected = true; } });
  assert.equal(rejected, true);
  assert.equal(fixture.collectorOptions.filter({ customId: "unrelated_game" }), false);
  await fixture.handlers.get("end")!();
  assert.ok(fixture.edits[0].components[0].toJSON().components.every((component: any) => component.disabled));
});

test("Shared slash adapter keeps real guild/client/user and sends follow-ups instead of overwriting results", async () => {
  const fixture = fakeSlash();
  const message = createSlashMessageAdapter(fixture.interaction, null);
  assert.equal(message.guild, fixture.interaction.guild);
  assert.equal(message.client, fixture.interaction.client);
  assert.equal(message.author, fixture.interaction.user);
  assert.equal(message.author.displayAvatarURL(), "avatar");
  assert.equal(message.attachments.size, 0);
  await Promise.all([message.reply("first"), message.reply("second")]);
  assert.deepEqual(fixture.calls, ["edit", "followUp"]);
  const other = fakeSlash("new");
  await replyToSlash(other.interaction, "failure");
  assert.deepEqual(other.calls, ["reply", "fetch"]);
});

test("A failed help-button update is contained, recorded and offers reopening help instead of rejecting the event", async () => {
  const fixture = fakeSlash();
  await sendHelpPaginator(fixture.interaction, "fr");
  let alerted = false;
  await fixture.handlers.get("collect")!({
    customId: "help_next", user: { id: "author" },
    update: async () => { throw new Error("Deleted message fixture"); },
    reply: async () => { alerted = true; },
  });
  assert.equal(alerted, true);
});

test("Help failures are isolated and do not announce a fictitious fallback for all other commands", () => {
  assert.equal(moduleForMessageCommand("help"), "help");
  assert.equal(moduleForMessageCommand("aide"), "help");
  assert.equal(moduleForMessageCommand("radio"), "music");
  const failure = moduleFallbackMessage("help", "fr", "/help");
  assert.match(failure, /\/help/);
  assert.doesNotMatch(failure, /Autres commandes|mode dégradé est actif/);
});

test("Persona help has short themed pages, real examples and the current command prefix", () => {
  for (const language of languages) {
    const all: string[] = [];
    for (let page = 0; page < PERSONA_HELP_PAGES; page++) {
      const json = validateEmbed(buildPersonaHelp(language, page, "??"), `${language}/persona/${page}`);
      const text = JSON.stringify(json);
      assert.equal(text.includes("`!persona"), false);
      assert.ok(json.fields?.length && json.fields.length <= 5);
      assert.match(json.footer!.text, new RegExp(`${page + 1}/4`));
      all.push(text);
    }
    for (const action of ["create", "start", "stop", "list", "show", "avatar", "learn", "recall", "privacy", "delete"]) {
      assert.ok(all.join("\n").includes(`??persona ${action}`), `${language}/${action}`);
    }
  }
});

test("Persona help stays in the requesting channel, supports every tab and never sends a DM", async () => {
  const handlers = new Map<string, (event?: any) => Promise<void>>();
  const replies: any[] = [], edits: any[] = [];
  let options: any;
  const response = {
    createMessageComponentCollector: (config: any) => {
      options = config;
      return { on: (event: string, handler: any) => handlers.set(event, handler) };
    },
    edit: async (payload: any) => { edits.push(payload); },
  };
  const message = {
    id: "help-message", guildId: "fixture", author: {
      id: "author", send: async () => { assert.fail("Public help must not send a DM"); },
    },
    reply: async (payload: any) => { replies.push(payload); return response; },
  } as unknown as Message;
  await sendPersonaHelp(message, "fr");
  assert.equal(replies.length, 1);
  assert.equal(replies[0].components[0].components.length, 4);
  assert.deepEqual(replies[0].allowedMentions, { parse: [], repliedUser: false });
  assert.equal(options.filter({ customId: "other" }), false);
  const updates: any[] = [];
  for (let page = 0; page < PERSONA_HELP_PAGES; page++) {
    await handlers.get("collect")!({
      customId: `persona_help:help-message:${page}`, user: { id: "author" },
      update: async (payload: any) => { updates.push(payload); },
    });
    assert.match(updates.at(-1).embeds[0].toJSON().footer.text, new RegExp(`${page + 1}/4`));
  }
  let rejected = false;
  await handlers.get("collect")!({
    customId: "persona_help:help-message:0", user: { id: "other" },
    reply: async (payload: any) => { rejected = payload.ephemeral; },
  });
  assert.equal(rejected, true);
  assert.equal(updates.length, 4);
  await handlers.get("end")!();
  assert.equal(edits[0].components[0].components.every((button: any) => button.toJSON().disabled), true);
  const source = readFileSync("src/discord/ai-personas.ts", "utf8");
  assert.match(source, /if \(!action \|\| action === "help" \|\| action === "aide"\) \{\s*await sendPersonaHelp\(message, language\);/);
});
