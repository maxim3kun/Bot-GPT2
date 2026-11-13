import assert from "node:assert/strict";
import sharp from "sharp";
import type { Attachment, ButtonInteraction, Message } from "discord.js";
import OpenAI from "openai";
import {
  handleTranslationButton,
  handleTranslationCommand,
  translateWithMyMemory,
} from "../src/discord/translation-command.js";
import { handleMemeCommand } from "../src/discord/meme-command.js";

function mockMessage(userId = "user-1", attachments: Partial<Attachment>[] = []) {
  const replies: any[] = [];
  const message = {
    author: { id: userId },
    attachments: { first: () => attachments[0] ?? null },
    channel: { send: async () => undefined, sendTyping: async () => undefined },
    client: { user: null },
    guild: null,
    reply: async (payload: unknown) => { replies.push(payload); return payload; },
  } as unknown as Message;
  return { message, replies };
}

function mockButton(customId: string, userId = "user-1") {
  const state: {
    replies: any[];
    updates: any[];
    edits: any[];
    deferred: number;
  } = { replies: [], updates: [], edits: [], deferred: 0 };
  const interaction = {
    customId,
    user: { id: userId },
    reply: async (payload: unknown) => { state.replies.push(payload); },
    update: async (payload: unknown) => { state.updates.push(payload); },
    editReply: async (payload: unknown) => { state.edits.push(payload); },
    deferUpdate: async () => { state.deferred += 1; },
  } as unknown as ButtonInteraction;
  return { interaction, state };
}

function commandButton(replies: any[], index: number): string {
  const row = replies[0]?.components?.[0];
  return row?.components?.[index]?.data?.custom_id as string;
}

async function testTranslationModes() {
  const { message, replies } = mockMessage();
  await handleTranslationCommand(message, "traduis", ["fr", "Good", "morning"], "fr");
  assert.equal(replies.length, 1);
  assert.match(replies[0].content, /MyMemory/);
  assert.match(replies[0].content, /Groq/);
  const directId = commandButton(replies, 0);
  const direct = mockButton(directId);
  let requestUrl = "";
  const fetcher = async (input: string | URL | Request) => {
    requestUrl = String(input);
    return new Response(JSON.stringify({
      responseStatus: 200,
      responseData: { translatedText: "Bonjour" },
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  await handleTranslationButton(direct.interaction, null, { fetch: fetcher as typeof fetch });
  assert.match(requestUrl, /langpair=autodetect%7Cfr/);
  assert.match(requestUrl, /q=Good\+morning/);
  assert.equal(direct.state.updates[0].content, "Traduction avec MyMemory…");
  assert.match(direct.state.edits[0].content, /Bonjour/);

  const aiMessage = mockMessage();
  await handleTranslationCommand(aiMessage.message, "translate", ["es", "Hello"], "en");
  const aiId = commandButton(aiMessage.replies, 1);
  let aiCalls = 0;
  const fakeOpenAi = {
    chat: { completions: { create: async () => {
      aiCalls += 1;
      return { choices: [{ message: { content: "Hola" } }] };
    } } },
  } as unknown as OpenAI;

  const declined = mockButton(aiId);
  await handleTranslationButton(declined.interaction, fakeOpenAi, { getConsent: async () => "declined" });
  assert.equal(declined.state.deferred, 1);
  assert.equal(declined.state.replies.length, 0);
  assert.equal(declined.state.updates.length, 0);
  assert.equal(aiCalls, 0);

  const unknown = mockButton(aiId);
  await handleTranslationButton(unknown.interaction, fakeOpenAi, { getConsent: async () => "unknown" });
  assert.equal(unknown.state.replies.length, 1);
  assert.equal(unknown.state.replies[0].ephemeral, true);
  assert.equal(aiCalls, 0);

  const acceptedMessage = mockMessage();
  await handleTranslationCommand(acceptedMessage.message, "translate", ["es", "Hello"], "en");
  const accepted = mockButton(commandButton(acceptedMessage.replies, 1));
  await handleTranslationButton(accepted.interaction, fakeOpenAi, { getConsent: async () => "accepted" });
  assert.equal(aiCalls, 1);
  assert.match(accepted.state.edits[0].content, /Hola/);

  const expired = mockButton("translate:not-a-request:direct");
  await handleTranslationButton(expired.interaction, null);
  assert.match(expired.state.replies[0].content, /expired/);

  await assert.rejects(
    translateWithMyMemory("hello", "fr", (async () => new Response(JSON.stringify({
      responseStatus: 403,
      responseDetails: "quota",
    }), { status: 200 })) as typeof fetch),
    /MyMemory returned no translation/,
  );
}

async function testMemeTemplatesAndUploads() {
  const template = mockMessage();
  await handleMemeCommand(template.message, ["That", "moment", "|", "It", "works"], "en");
  assert.match(template.replies[0].content, /ready/);
  const generated = (template.replies[0].files[0] as { attachment: Buffer }).attachment;
  const generatedMetadata = await sharp(generated).metadata();
  assert.equal(generatedMetadata.width, 1200);
  assert.equal(generatedMetadata.height, 900);

  const source = await sharp({
    create: { width: 80, height: 60, channels: 3, background: "#778899" },
  }).png().toBuffer();
  const uploaded = mockMessage("user-2", [{
    size: source.length,
    contentType: "image/png",
    url: "https://cdn.discordapp.com/attachments/123/456/source.png",
  }]);
  await handleMemeCommand(
    uploaded.message,
    ["TOP", "|", "BOTTOM"],
    "fr",
    async () => source,
  );
  assert.match(uploaded.replies[0].content, /mème est prêt/);
  const uploadedResult = (uploaded.replies[0].files[0] as { attachment: Buffer }).attachment;
  assert.equal((await sharp(uploadedResult).metadata()).format, "png");

  const invalid = mockMessage("user-3", [{
    size: 3,
    contentType: "image/png",
    url: "https://cdn.discordapp.com/attachments/123/456/broken.png",
  }]);
  await handleMemeCommand(invalid.message, ["TOP", "|", "BOTTOM"], "fr", async () => Buffer.from("bad"));
  assert.match(invalid.replies[0], /image statique/);

  const noCaptions = mockMessage();
  await handleMemeCommand(noCaptions.message, ["missing"], "fr");
  assert.match(noCaptions.replies[0], /deux textes/);
}

await testTranslationModes();
await testMemeTemplatesAndUploads();
console.log("Content tools tests passed");
