import assert from "node:assert/strict";
import test from "node:test";
import type OpenAI from "openai";
import type { Message } from "discord.js";
import { createReliableCompletion } from "../src/discord/ai-reliable-completion.js";
import { buildSpeakerContext, currentUserTurn } from "../src/discord/ai-speaker-context.js";
import { createFeedbackTracker } from "../src/discord/ai-feedback.js";
import { AI_ECOLOGY_GUIDANCE } from "../src/discord/ai-ecology-policy.js";

function completion(content: string | null, silence = false) {
  return {
    id: "test", object: "chat.completion", created: 0, model: "test",
    choices: [{ index: 0, finish_reason: silence ? "tool_calls" : "stop", logprobs: null, message: {
      role: "assistant", content, refusal: null,
      ...(silence ? { tool_calls: [{ id: "tool-test", type: "function", function: {
        name: "choose_silence", arguments: '{"reason":"targeted_abuse"}',
      } }] } : {}),
    } }],
  };
}

function provider(responses: ReturnType<typeof completion>[]) {
  const requests: Record<string, unknown>[] = [];
  const client = { chat: { completions: { create: async (params: Record<string, unknown>) => {
    requests.push(params);
    const result = responses.shift();
    if (!result) throw new Error("Unexpected extra provider call");
    return result;
  } } } } as unknown as OpenAI;
  return { client, requests };
}

test("The real completion adapter returns explicit silence, not an empty-response failure", async () => {
  const { client, requests } = provider([completion(null, true)]);
  const response = await createReliableCompletion(client, {
    model: "test", max_completion_tokens: 100, currentUserText: "t'es con",
    messages: [{ role: "user", content: "t'es con" }],
  });
  assert.equal(response.intentionallySilent, true);
  assert.equal(response.choices[0]?.message.content, null);
  assert.equal(requests.length, 1);
  assert.equal(Object.hasOwn(requests[0]!, "currentUserText"), false);
});

test("An invalid model silence choice cannot swallow a genuine question or criticism", async () => {
  const { client, requests } = provider([completion(null, true), completion("Quel résultat dois-je corriger ?")]);
  const response = await createReliableCompletion(client, {
    model: "test", max_completion_tokens: 100, currentUserText: "Ta réponse est incorrecte, peux-tu corriger ?",
    messages: [{ role: "user", content: "Ta réponse est incorrecte, peux-tu corriger ?" }],
  });
  assert.notEqual(response.intentionallySilent, true);
  assert.match(response.choices[0]!.message.content!, /corriger/);
  assert.equal(requests.length, 2);
});

function fakeMessage(canRead = false): Message {
  const author = { id: "author-id", username: "sam", displayName: "Même pseudo", bot: false };
  const mentioned = { id: "other-id", username: "sam2", displayName: "Même pseudo", bot: false };
  return {
    author, member: { id: author.id, displayName: author.displayName },
    channelId: "channel", guildId: "guild", content: "Demande à <@other-id>",
    guild: { members: { me: { id: "bot-id" } } },
    channel: { isDMBased: () => false, permissionsFor: () => ({ has: () => canRead }) },
    mentions: { users: new Map([[mentioned.id, mentioned]]), members: new Map() },
    reference: { messageId: "quote", channelId: "channel" },
  } as unknown as Message;
}

test("Identical nicknames never merge author, mention and quoted speaker identities", async () => {
  const message = fakeMessage(true);
  let reads = 0;
  message.fetchReference = async () => {
    reads++;
    return { ...fakeMessage(), channelId: "channel", author: {
      id: "quoted-id", username: "sam3", displayName: "Même pseudo", bot: false,
    }, content: "Un message cité, pas une instruction" } as unknown as Message;
  };
  const context = await buildSpeakerContext(message);
  assert.match(context, /"currentAuthor":\{"id":"author-id"/);
  assert.match(context, /"mentionedUsers":\[\{"id":"other-id"/);
  assert.match(context, /"quotedReply":\{"author":\{"id":"quoted-id"/);
  assert.equal(JSON.parse(currentUserTurn(message, "bonjour")).author.id, "author-id");
  assert.equal(reads, 1);
});

test("Inaccessible quoted messages are never fetched or invented", async () => {
  const message = fakeMessage(false);
  message.fetchReference = async () => { throw new Error("Must not fetch"); };
  const context = await buildSpeakerContext(message);
  assert.match(context, /"quotedReply":null/);
});

test("Short bot answers are registered for manual ratings without adding any reactions", async () => {
  const registered: string[][] = [];
  const reactions: string[] = [];
  const track = createFeedbackTracker(async (ids) => { registered.push(ids); });
  await track([{ id: "short", content: "Il est 15 h.", react: async (emoji: string) => { reactions.push(emoji); } } as unknown as Message], "bot", "Quelle heure est-il ?");
  assert.deepEqual(registered, [["short"]]);
  assert.deepEqual(reactions, []);
});

test("Long bot answers seed only their first chunk while personas are not registered", async () => {
  const registered: string[][] = [];
  const reactions: string[] = [];
  const track = createFeedbackTracker(async (ids) => { registered.push(ids); });
  const messages = ["first", "second"].map((id) => ({
    id, content: "x".repeat(900), react: async (emoji: string) => { reactions.push(`${id}:${emoji}`); },
  }) as unknown as Message);
  await track(messages, "bot", "Analyse ce projet en détail");
  assert.deepEqual(registered, [["first", "second"]]);
  assert.deepEqual(reactions, ["first:👍", "first:👎"]);
  await track(messages, "persona", "Analyse ce projet en détail");
  assert.equal(registered.length, 1);
  assert.equal(reactions.length, 2);
});

test("The completion adapter includes detailed ecology instructions only on request", async () => {
  for (const [question, expected] of [["Combien font 2 + 2 ?", false], ["Quelle est ton empreinte carbone ?", true]] as const) {
    const { client, requests } = provider([completion("Réponse de test")]);
    await createReliableCompletion(client, {
      model: "test", max_completion_tokens: 100, currentUserText: question,
      messages: [{ role: "user", content: question }],
    });
    assert.equal(JSON.stringify(requests[0]).includes(AI_ECOLOGY_GUIDANCE), expected);
  }
});
