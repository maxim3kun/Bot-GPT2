import { beforeEach, afterEach, test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import type { Message } from "discord.js";
import { imageFixture as f, resetImages } from "./fixtures/images.js";
import { configuredImageProviders, generateImage, ImageProviderError } from "../src/discord/image-provider.js";
import { generatePersonaIllustration, stablePersonaImageSeed } from "../src/discord/persona-image-provider.js";
import { sendGeneratedImage } from "../src/discord/image-command.js";
import { sendFictionalAssistantPhoto, isSelfPhotoRequest } from "../src/discord/persona-images.js";
import { createSlashMessageAdapter } from "../src/discord/slash-message-adapter.js";

const realFetch = globalThis.fetch;
const savedEnv = { ACCOUNT_ID: process.env.ACCOUNT_ID, TOKEN_API: process.env.TOKEN_API, HUGGINGFACE_TOKEN: process.env.HUGGINGFACE_TOKEN };
const jpeg = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#f07040" } }).jpeg().toBuffer();
let calls: { url: string; body: any }[] = [];
beforeEach(() => {
  resetImages(); calls = [];
  process.env.ACCOUNT_ID = "test-account";
  process.env.TOKEN_API = "test-token";
  delete process.env.HUGGINGFACE_TOKEN;
  globalThis.fetch = (async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    return Response.json({ success: true, result: { image: jpeg.toString("base64") } });
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

function message(options: { dm?: boolean; failUpload?: boolean } = {}) {
  const replies: any[] = [], edits: any[] = [], privateMessages: any[] = [];
  const msg = {
    guildId: options.dm ? null : "guild",
    guild: options.dm ? null : {},
    client: { user: { id: "bot" } },
    channel: { isSendable: () => true, isDMBased: () => !!options.dm },
    author: { id: "user", send: async (payload: any) => {
      if (options.failUpload) throw Error("DM blocked");
      privateMessages.push(payload); return {};
    } },
    reply: async (payload: any) => {
      if (options.failUpload && payload.files) throw Error("Discord upload failed");
      replies.push(payload);
      return { edit: async (value: any) => {
        if (options.failUpload && value.files) throw Error("Discord upload failed");
        edits.push(value);
      } };
    },
  } as unknown as Message;
  return { msg, replies, edits, privateMessages };
}

test("Cloudflare uses documented JSON envelope, prompt and stable seed", async () => {
  process.env.HUGGINGFACE_TOKEN = "test-hf";
  assert.deepEqual(configuredImageProviders(), ["cloudflare", "huggingface"]);
  const result = await generateImage("A robot", 123);
  assert.equal(result.provider, "cloudflare");
  assert.deepEqual(result.buffer, jpeg);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /api\.cloudflare\.com.*flux-1-schnell/);
  assert.deepEqual(calls[0].body, { prompt: "A robot", steps: 4, seed: 123 });
});

test("failed Cloudflare actually uses configured HF fallback, with separate health results", async () => {
  process.env.HUGGINGFACE_TOKEN = "test-hf";
  globalThis.fetch = (async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    return String(url).includes("cloudflare")
      ? new Response(null, { status: 503 })
      : new Response(jpeg, { headers: { "content-type": "image/jpeg" } });
  }) as typeof fetch;
  assert.equal((await generateImage("A robot")).provider, "huggingface");
  assert.equal(calls[1].body.inputs, "A robot");
  assert.deepEqual(f.health.map((x: any) => [x[0], x.at(-1)]), [["failure", "cloudflare"], ["success", "huggingface"]]);
});

test("missing credentials, invalid prompt and oversized prompt do not call a provider", async () => {
  delete process.env.TOKEN_API;
  await assert.rejects(generateImage("robot"), ImageProviderError);
  await assert.rejects(generateImage(""), ImageProviderError);
  await assert.rejects(generateImage("x".repeat(2049)), ImageProviderError);
  assert.equal(calls.length, 0);
});

test("denied API token returns a sanitized configuration error", async () => {
  globalThis.fetch = (async () => new Response("secret provider body", { status: 403 })) as typeof fetch;
  await assert.rejects(generateImage("robot"), (e: any) => e.reason === "configuration" && e.status === 403 && !e.message.includes("secret"));
});

test("invalid JSON, missing base64, non-image and oversized response are rejected", async () => {
  for (const response of [
    new Response("{", { headers: { "content-type": "application/json" } }),
    Response.json({ success: true, result: {} }),
    Response.json({ result: { image: Buffer.from("not an image").toString("base64") } }),
    new Response("html", { headers: { "content-type": "text/html" } }),
    new Response("", { headers: { "content-length": String(16 * 1024 * 1024) } }),
  ]) {
    globalThis.fetch = (async () => response) as typeof fetch;
    await assert.rejects(generateImage("robot"), ImageProviderError);
  }
});

test("timeouts report timeout without leaking request details", async () => {
  globalThis.fetch = (async () => { throw new DOMException("private URL", "TimeoutError"); }) as typeof fetch;
  await assert.rejects(generateImage("robot"), (e: any) => e.reason === "timeout" && !e.message.includes("private"));
});

test("persona avatar and selfie preserve reference, seed, illustration and prompt limit", async () => {
  for (const purpose of ["avatar", "selfie"] as const) {
    await generatePersonaIllustration({
      name: "Azumi", description: "Friendly", visualDescription: "Blue eyes, silver hair. ".repeat(100),
      visualSeed: stablePersonaImageSeed("persona"), purpose,
    });
    const body = calls.at(-1)!.body;
    assert.ok(body.prompt.length <= 2048);
    assert.match(body.prompt, /Blue eyes, silver hair/);
    assert.match(body.prompt, /anime and manga/);
    assert.equal(body.seed, stablePersonaImageSeed("persona"));
  }
  assert.ok(isSelfPhotoRequest("Envoie une photo de toi"));
  assert.ok(isSelfPhotoRequest("Send me your selfie"));
});

test("image command uploads the actual image and consumes quota only on success", async () => {
  const m = message();
  await sendGeneratedImage(m.msg, "un chat", "fr");
  assert.equal(f.reservations, 1);
  assert.equal(f.releases, 0);
  assert.deepEqual(m.edits[0].files[0].attachment, jpeg);
});

test("deferred /image uses the shared slash adapter and edits the real response", async () => {
  const base = message();
  const edits: any[] = [];
  const interaction = {
    ...base.msg, user: base.msg.author, options: {}, deferred: true, replied: false,
    editReply: async (payload: any) => {
      edits.push(payload);
      return { edit: async (image: any) => edits.push(image) };
    },
  };
  const adapted = createSlashMessageAdapter(interaction as any, null);
  await sendGeneratedImage(adapted, "a cat", "en");
  assert.equal(edits.length, 2);
  assert.deepEqual(edits[1].files[0].attachment, jpeg);
});

test("missing Attach Files permission avoids generating an image", async () => {
  const m = message();
  (m.msg.channel as any).permissionsFor = () => ({ has: () => false });
  await sendGeneratedImage(m.msg, "un chat", "fr");
  assert.equal(calls.length, 0);
  assert.equal(f.reservations, 0);
});

test("settings, command block, consent and exhausted quota prevent generation", async () => {
  for (const change of [
    { enabled: false }, { guildEnabled: false }, { settingsFail: true },
    { blocked: true }, { consent: false }, { quota: "limit_reached" },
  ]) {
    resetImages(); Object.assign(f, change);
    await sendGeneratedImage(message().msg, "un chat", "fr");
    assert.equal(calls.length, 0);
  }
});

test("generation failure and Discord upload failure both release the reservation", async () => {
  await sendGeneratedImage(message({ failUpload: true }).msg, "un chat", "fr");
  assert.equal(f.releases, 1);
  resetImages();
  globalThis.fetch = (async () => new Response(null, { status: 503 })) as typeof fetch;
  await sendGeneratedImage(message().msg, "un chat", "fr");
  assert.equal(f.releases, 1);
});

test("persona photo works with Cloudflare alone and remains private in a server", async () => {
  const m = message();
  await sendFictionalAssistantPhoto(m.msg, { name: "Azumi", description: "Adult fictional character" }, "fr", { privateInServer: true });
  assert.equal(m.privateMessages.length, 1);
  assert.equal(m.replies.filter(x => x.files).length, 0);
  assert.equal(f.releases, 0);
  assert.equal((await sharp(m.privateMessages[0].files[0].attachment).metadata()).format, "jpeg");
});

test("closed persona DMs never publish in the server and release quota", async () => {
  const m = message({ failUpload: true });
  await sendFictionalAssistantPhoto(m.msg, { name: "Azumi", description: "Fictional" }, "fr", { privateInServer: true });
  assert.equal(m.replies.filter(x => x.files).length, 0);
  assert.equal(f.releases, 1);
});
