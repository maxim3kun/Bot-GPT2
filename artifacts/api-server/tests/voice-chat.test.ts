import assert from "node:assert/strict";
import test from "node:test";
import { disableVoiceChat, enableVoiceChat, isInVoice, joinVoice, sendVoiceChatResponse, setVoiceChatTurnHandler } from "../src/discord/voice.js";
import { fixture } from "./fixtures/voice-chat.js";

function makeMessage(guildId = "guild") {
  const replies: any[] = [];
  const sent: any[] = [];
  const voiceChannel = {
    id: "voice",
    name: "Test Voice",
    permissionsFor: () => ({ has: () => true }),
    guild: { voiceAdapterCreator: {} },
  };
  const member = { user: { id: "member", bot: false }, voice: { channelId: "voice", channel: voiceChannel } };
  const channel: any = {
    client: { user: { id: "bot" } },
    send: async (payload: any) => { sent.push(payload); return payload; },
    sendTyping: async () => {},
  };
  const message: any = {
    id: "command-id",
    guildId,
    author: { id: "member" },
    member,
    guild: { members: { me: { displayName: "Bot", user: { id: "bot" } } } },
    channel,
    reply: async (payload: any) => { replies.push(payload); return payload; },
  };
  return { message, replies, sent };
}

function nextTick() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

test.beforeEach(() => {
  fixture.reset();
  process.env["GROQ_API_KEY"] = "test-only";
  setVoiceChatTurnHandler(async () => true);
});

test("Joining a voice channel does not start listening until a member opts in", async () => {
  const x = makeMessage("no-auto-listen");
  await joinVoice(x.message);
  fixture.connection.emit("ready");
  assert.equal(fixture.connection.receiver.speaking.listenerCount("start"), 0);
  assert.equal(fixture.subscriptions, 0);
  assert.match(x.replies[0], /désactivée/);
});

test("Declined or unknown AI consent never activates voice capture", async () => {
  const x = makeMessage("no-consent");
  await joinVoice(x.message);
  fixture.requireConsentResult = false;
  fixture.consent = "declined";
  assert.equal(await enableVoiceChat(x.message), false);
  assert.equal(fixture.connection.receiver.speaking.listenerCount("start"), 0);
  assert.equal(fixture.subscriptions, 0);
  assert.deepEqual(x.replies.slice(1), []);
});

test("Only the opted-in speaker is subscribed, and opting out cancels their stream", async () => {
  const x = makeMessage("per-user-opt-in");
  await joinVoice(x.message);
  assert.equal(await enableVoiceChat(x.message), true);
  fixture.connection.receiver.speaking.emit("start", "another-member");
  await nextTick();
  assert.equal(fixture.subscriptions, 0);

  fixture.connection.receiver.speaking.emit("start", "member");
  await nextTick();
  assert.equal(fixture.subscriptions, 1);
  await disableVoiceChat(x.message);
  assert.equal(fixture.destroyedStreams, 1);
  assert.equal(isInVoice("per-user-opt-in"), true);
});

test("Disabled AI features, missing transcription configuration and unavailable permissions fail closed", async () => {
  const x = makeMessage("disabled-ai");
  await joinVoice(x.message);
  fixture.guildAi = false;
  assert.equal(await enableVoiceChat(x.message), false);
  assert.equal(fixture.subscriptions, 0);

  const noKey = makeMessage("no-groq");
  await joinVoice(noKey.message);
  delete process.env["GROQ_API_KEY"];
  assert.equal(await enableVoiceChat(noKey.message), false);
  assert.equal(fixture.subscriptions, 0);

  process.env["GROQ_API_KEY"] = "test-only";
  const outsider = makeMessage("wrong-channel");
  await joinVoice(outsider.message);
  outsider.message.member.voice.channelId = "other";
  assert.equal(await enableVoiceChat(outsider.message), false);
  assert.equal(fixture.subscriptions, 0);
});

test("AI voice replies are delivered as text before playback, so TTS failure keeps the answer", async () => {
  const events: string[] = [];
  const result = await sendVoiceChatResponse(
    async () => { events.push("text"); return "sent-message"; },
    async () => { events.push("voice"); throw new Error("TTS unavailable"); },
  );
  assert.equal(result, "sent-message");
  assert.deepEqual(events, ["text", "voice"]);
});

test("An opted-in speaker's clip is transcribed and only its text reaches the AI handler", async () => {
  const previousFetch = globalThis.fetch;
  const x = makeMessage("transcription-routing");
  const turns: any[] = [];
  globalThis.fetch = (async (input: any, init?: any) => {
    assert.equal(String(input), "https://api.groq.com/openai/v1/audio/transcriptions");
    assert.equal(init?.headers?.Authorization, "Bearer test-only");
    return { ok: true, text: async () => "Est-ce qu'il pleut ?" } as Response;
  }) as typeof fetch;
  try {
    setVoiceChatTurnHandler(async context => { turns.push(context); return true; });
    await joinVoice(x.message);
    assert.equal(await enableVoiceChat(x.message), true);
    fixture.connection.receiver.speaking.emit("start", "member");
    await nextTick();
    fixture.decoder.emit("data", Buffer.alloc(288_000));
    fixture.decoder.emit("end");
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(turns.length, 1);
    assert.equal(turns[0].transcript, "Est-ce qu'il pleut ?");
    assert.equal(turns[0].userId, "member");
    assert.deepEqual(Object.keys(turns[0]).sort(), ["guildId", "message", "transcript", "userId"]);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
