import test from "node:test";
import assert from "node:assert/strict";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type Message } from "discord.js";
import {
  attachAnswerDetailsCollector,
  buildAnswerDetailsMessages,
  buildAnswerDetailsRow,
  shouldOfferAnswerDetails,
} from "../src/discord/ai-answer-details.js";

test("Details are offered for substantive answers, but not after a request for a detailed reply", () => {
  assert.equal(shouldOfferAnswerDetails("Salut", "Bonjour !", false), false);
  assert.equal(shouldOfferAnswerDetails("What is it?", "A short fact.", true), false);
  assert.equal(shouldOfferAnswerDetails("What is it?", "Useful context ".repeat(9), true), true);
  assert.equal(shouldOfferAnswerDetails("Explain in detail", "A longer answer ".repeat(30), true), false);
  assert.equal(shouldOfferAnswerDetails("Explique en détail", "Une réponse longue ".repeat(30), false), false);
  assert.equal(shouldOfferAnswerDetails("¿Puedes dar más detalles?", "Una respuesta larga ".repeat(30), true), false);
});

test("A detail request continues from the same answer and carries verified calculations", () => {
  const original = [
    { role: "system" as const, content: "Persona and evidence instructions" },
    { role: "user" as const, content: "Original question" },
  ];
  const messages = buildAnswerDetailsMessages(original, "Short answer", "fr", [{ result: 42 }]);
  assert.match(String(messages[0]?.content), /Verified calculations/);
  assert.equal(messages[1]?.content, "Original question");
  assert.deepEqual(messages[2], { role: "assistant", content: "Short answer" });
  assert.match(String(messages[3]?.content), /sans la répéter/);
  assert.equal(original.length, 2);
});

test("The details button shares the sources row and uses localized labels", () => {
  const source = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("ai_sources:key").setLabel("🔎").setStyle(ButtonStyle.Secondary),
  );
  const row = buildAnswerDetailsRow("ai_details:key", "fr", source);
  assert.equal(row.components.length, 2);
  assert.equal(row.components[1]?.data.label, "Détails");
  assert.equal(buildAnswerDetailsRow("ai_details:en", "en").components[0]?.data.label, "More");
  assert.equal(buildAnswerDetailsRow("ai_details:es", "es").components[0]?.data.label, "Detalles");
});

test("Only the question author can request details, and generated details are cached", async () => {
  const handlers = new Map<string, (interaction: any) => Promise<void>>();
  const fakeResponse = {
    createMessageComponentCollector: (options: { time: number; filter: (interaction: any) => boolean }) => {
      assert.equal(options.time, 5 * 60_000);
      assert.equal(options.filter({ customId: "ai_details:other" }), false);
      assert.equal(options.filter({ customId: "ai_details:mine" }), true);
      return { on: (event: string, handler: (interaction: any) => Promise<void>) => handlers.set(event, handler) };
    },
    edit: async () => fakeResponse,
  } as unknown as Message;
  let generated = 0;
  attachAnswerDetailsCollector(fakeResponse, {
    customId: "ai_details:mine",
    userId: "author",
    language: "fr",
    generate: async () => { generated++; return { text: "Précisions utiles." }; },
  });
  const collect = handlers.get("collect")!;
  const unauthorized: any = {
    customId: "ai_details:mine", user: { id: "other" }, inGuild: () => true,
    reply: async (payload: any) => { unauthorized.payload = payload; },
  };
  await collect(unauthorized);
  assert.equal(unauthorized.payload.ephemeral, true);
  assert.equal(generated, 0);

  const first: any = {
    customId: "ai_details:mine", user: { id: "author" }, inGuild: () => true,
    deferReply: async (payload: any) => { first.deferred = payload; },
    editReply: async (payload: any) => { first.payload = payload; },
  };
  await collect(first);
  assert.equal(first.deferred.ephemeral, true);
  assert.match(first.payload.embeds[0].data.description, /Précisions utiles/);
  assert.equal(generated, 1);

  const second: any = {
    customId: "ai_details:mine", user: { id: "author" }, inGuild: () => true,
    reply: async (payload: any) => { second.payload = payload; },
  };
  await collect(second);
  assert.equal(second.payload.ephemeral, true);
  assert.equal(generated, 1);
});
