import test from "node:test";
import assert from "node:assert/strict";
import { selectVoice, handleBotVoiceSelection, getBotVoice, personaVoiceSelection } from "../src/discord/voice-settings.js";
import { DEFAULT_VOICE, PiperSynthesizer, PROJECT_ROOT } from "../src/discord/piper-tts.js";
import { f } from "./fixtures/voice-settings.js";
import type { Message } from "discord.js";
import { resolve } from "node:path";

function fixture(userId = "owner") {
  const replies: any[] = [], updates: any[] = [], handlers = new Map<string, any>();
  const sent = {
    edit: async (payload: any) => { updates.push(payload); },
    createMessageComponentCollector: () => ({ on: (event: string, handler: any) => { handlers.set(event, handler); } }),
  };
  const message = {
    guildId: "guild", author: { id: userId },
    guild: { members: { fetch: async () => ({ permissions: { has: () => f.admin } }) } },
    reply: async (payload: any) => { replies.push(payload); return sent; },
  } as unknown as Message;
  return { message, replies, updates, handlers };
}

test("Bot defaults to SIWIS; only server managers may save; Mongo errors never report success", async () => {
  const x = fixture();
  assert.equal(await getBotVoice("guild"), DEFAULT_VOICE);
  f.admin = false;
  await handleBotVoiceSelection(x.message, "gilles");
  assert.match(x.replies.pop(), /permission/);
  assert.equal(f.writes, 0);
  f.admin = true;
  await handleBotVoiceSelection(x.message, "gilles");
  assert.match(x.replies.pop(), /enregistrée/);
  assert.equal(await getBotVoice("guild"), "gilles");
  f.fail = true;
  await handleBotVoiceSelection(x.message, "siwis");
  assert.match(x.replies.pop(), /Impossible/);
  assert.equal(await getBotVoice("guild"), "gilles");
  f.fail = false;
  await handleBotVoiceSelection(x.message, "unknown");
  assert.match(x.replies.pop(), /inconnue/);
  assert.equal(await getBotVoice("guild"), "gilles");
  await handleBotVoiceSelection(x.message, "default");
  assert.equal(await getBotVoice("guild"), "siwis");
});

test("Persona voices are owner-only, isolated and resettable without changing memories or bot settings", async () => {
  const x = fixture();
  await selectVoice(x.message, personaVoiceSelection(x.message, f.personas.azumi), "gilles");
  assert.equal(f.personas.azumi.ttsVoiceId, "gilles");
  assert.equal(f.personas.azumi.profile, "Keep this profile");
  assert.equal(f.personas.other.ttsVoiceId, "siwis");
  assert.equal(await getBotVoice("guild"), "siwis");
  const attacker = fixture("intruder");
  await selectVoice(attacker.message, personaVoiceSelection(attacker.message, f.personas.azumi), "siwis");
  assert.match(attacker.replies.pop(), /permission/);
  assert.equal(f.personas.azumi.ttsVoiceId, "gilles");
  // Ownership is rechecked by the write itself, not just by menu rendering.
  await assert.rejects(personaVoiceSelection(attacker.message, f.personas.azumi).save("siwis"), /denied/);
  await selectVoice(x.message, personaVoiceSelection(x.message, f.personas.azumi), "default");
  assert.equal(f.personas.azumi.ttsVoiceId, undefined);
});

test("Voice menu acknowledges before saving, protects the author and shows the actual saved selection", async () => {
  const x = fixture();
  await handleBotVoiceSelection(x.message);
  assert.equal(x.replies[0].components[0].toJSON().components[0].type, 3);
  const notices: any[] = [], events: string[] = [];
  const click = {
    customId: "tts_voice_select", values: ["gilles"], user: { id: "owner" },
    isStringSelectMenu: () => true,
    deferReply: async () => { events.push("defer"); },
    editReply: async (text: string) => { events.push("reply"); notices.push(text); },
    reply: async () => { events.push("denied"); },
  };
  await x.handlers.get("collect")({ ...click, user: { id: "intruder" } });
  assert.deepEqual(events, ["denied"]);
  events.length = 0;
  await x.handlers.get("collect")(click);
  assert.deepEqual(events, ["defer", "reply"]);
  assert.match(notices[0], /Gilles/);
  assert.match(x.updates.at(-1).embeds[0].toJSON().description, /actuelle : \*\*Gilles/);
  f.admin = false;
  await x.handlers.get("collect")({ ...click, values: ["siwis"] });
  assert.match(notices.at(-1), /non enregistrée/);
  assert.equal(await getBotVoice("guild"), "gilles");
  x.handlers.get("end")();
  assert.equal(x.updates.at(-1).components[0].toJSON().components[0].disabled, true);
  f.admin = true;
});

test("Piper validates voices, bounds the queue and produces real WAV through its worker", async () => {
  const worker = new PiperSynthesizer();
  try {
    await assert.rejects(worker.synthesize("Bonjour", "../../model"), /Invalid/);
    const requests = Array.from({ length: 4 }, () => worker.synthesize("Bonjour, voici la voix locale.", "siwis"));
    await assert.rejects(worker.synthesize("Bonjour", "siwis"), /queue is full/);
    for (const audio of await Promise.all(requests)) {
      assert.equal(audio.toString("ascii", 0, 4), "RIFF");
      assert.ok(audio.length > 1000);
    }
  } finally { worker.stop(); }
  const unavailable = new PiperSynthesizer(resolve(PROJECT_ROOT, "scripts/does-not-exist.py"), 3000, 10);
  try { await assert.rejects(unavailable.synthesize("Bonjour", "siwis"), /stopped|unavailable/); }
  finally { unavailable.stop(); }
});
