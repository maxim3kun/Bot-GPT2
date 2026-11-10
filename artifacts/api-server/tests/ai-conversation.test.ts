import assert from "node:assert/strict";
import test from "node:test";
import type OpenAI from "openai";
import type { Message } from "discord.js";
import { createReliableCompletion } from "../src/discord/ai-reliable-completion.js";
import { buildSpeakerContext, currentUserTurn } from "../src/discord/ai-speaker-context.js";
import { DISCORD_IDENTITY_GUIDANCE, removeUnrequestedDiscordIds } from "../src/discord/ai-identity-output.js";
import { createFeedbackTracker, createPersonaControlSeeder } from "../src/discord/ai-feedback.js";
import {
  buildPublicAiPersonaDetails,
  canManageAiPersonaPublicProfile,
  isAiPersonaVisibleToViewer,
} from "../src/lib/ai-persona-public-view.js";
import { updatePersonaSessionFromReaction } from "../src/discord/ai-persona-reaction-policy.js";
import { AI_ECOLOGY_GUIDANCE } from "../src/discord/ai-ecology-policy.js";
import { researchForTurn } from "../src/discord/ai-research-service.js";

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

test("Identity metadata remains available internally but must not become a salutation", async () => {
  const message = fakeMessage();
  const context = await buildSpeakerContext(message);
  assert.ok(context.includes(DISCORD_IDENTITY_GUIDANCE));
  assert.equal(JSON.parse(currentUserTurn(message, "coucou")).author.id, message.author.id);
  const id = "111111111111111111";
  for (const aside of [`(ID ${id})`, `[Discord ID: ${id}]`, `(identifiant Discord : ${id})`, `(ID \`${id}\`)`]) {
    assert.equal(removeUnrequestedDiscordIds(`Bonjour, Alex ${aside}!`, [id], "coucou"), "Bonjour, Alex!");
  }
  assert.equal(removeUnrequestedDiscordIds(`Bonjour, Alex ID ${id}!`, [id], "coucou"), "Bonjour, Alex!");
});

test("Persona ID guard preserves requested identifiers and unrelated factual numbers", () => {
  const id = "111111111111111111", other = "222222222222222222";
  const reply = `Ton ID est ${id}.`;
  for (const request of ["Quel est mon ID Discord ?", "Donne-moi mon identifiant", "What is my Discord ID?", `Explique cet identifiant ${id}`]) {
    assert.equal(removeUnrequestedDiscordIds(reply, [id], request), reply);
  }
  const numbers = `En 2026, 1500 kg divisés par 0,0005 donnent 3000000. Référence ${other}.`;
  assert.equal(removeUnrequestedDiscordIds(numbers, [id], "coucou"), numbers);
  assert.equal(removeUnrequestedDiscordIds(`Salut (ID ${id}), bonjour (ID ${other})!`, [id, other], "coucou"), "Salut, bonjour!");
});

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

test("General replies get a persona control without changing rating-reaction policy", async () => {
  const registered: Array<{ ids: string[]; kind: string }> = [];
  const reactions: string[] = [];
  const seed = createPersonaControlSeeder(async (ids, kind) => { registered.push({ ids, kind }); });
  await seed({
    id: "general-reply",
    react: async (emoji: string) => { reactions.push(emoji); },
  } as unknown as Message);
  assert.deepEqual(registered, [{ ids: ["general-reply"], kind: "bot" }]);
  assert.deepEqual(reactions, ["🎭"]);
});

test("Persona reactions activate the member's own last selection and removal stops only that session", () => {
  const first = { userId: "member-a", guildId: "guild", activePersonaId: null, lastPersonaId: "public-1" };
  const second = { userId: "member-b", guildId: "guild", activePersonaId: null, lastPersonaId: "public-2" };
  assert.deepEqual(updatePersonaSessionFromReaction(first, true, true), {
    ...first, activePersonaId: "public-1",
  });
  assert.deepEqual(updatePersonaSessionFromReaction(second, true, true), {
    ...second, activePersonaId: "public-2",
  });
  assert.deepEqual(updatePersonaSessionFromReaction({
    ...first, activePersonaId: "public-1",
  }, false, true), {
    ...first, activePersonaId: null,
  });
  assert.equal(updatePersonaSessionFromReaction(first, true, false), null);
  assert.equal(updatePersonaSessionFromReaction({
    ...first, activePersonaId: "public-1",
  }, true, true), null);
});

test("Public personas are server-scoped and reveal only creator-selected profile text", () => {
  const publicPersona = { ownerId: "creator", guildId: "guild-a", visibility: "public" as const };
  const privatePersona = { ownerId: "creator", guildId: null, visibility: "private" as const };
  assert.equal(isAiPersonaVisibleToViewer(publicPersona, "guild-a", "member"), true);
  assert.equal(isAiPersonaVisibleToViewer(publicPersona, "guild-b", "member"), false);
  assert.equal(isAiPersonaVisibleToViewer(publicPersona, null, "member"), false);
  assert.equal(isAiPersonaVisibleToViewer(privatePersona, "guild-a", "member"), false);
  assert.equal(isAiPersonaVisibleToViewer(privatePersona, null, "creator"), true);
  assert.equal(canManageAiPersonaPublicProfile([publicPersona], "creator", "guild-a"), true);
  assert.equal(canManageAiPersonaPublicProfile([publicPersona], "member", "guild-a"), false);
  assert.equal(canManageAiPersonaPublicProfile([publicPersona], "creator", "guild-b"), false);
  assert.equal(canManageAiPersonaPublicProfile([privatePersona], "creator", "guild-a"), false);

  const details = buildPublicAiPersonaDetails(
    "Public character",
    "Description selected by creator",
    "Creator-selected introduction",
    "en",
  ).toJSON();
  assert.equal(details.description, "Description selected by creator");
  assert.equal(details.fields?.[0]?.value, "Creator-selected introduction");
  assert.match(details.fields?.[0]?.name ?? "", /Creator profile/);
  assert.doesNotMatch(JSON.stringify(details), /generated internal profile|private memory|messages analyzed/i);
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

test("Ordinary replies are guided to be concise, and condescension gets a short in-character response", async () => {
  const { client, requests } = provider([completion("Je peux t’aider, mais restons courtois.")]);
  const response = await createReliableCompletion(client, {
    model: "test", max_completion_tokens: 100, currentUserText: "Réfléchis un peu, peux-tu corriger le résultat ?",
    messages: [{ role: "user", content: "Réfléchis un peu, peux-tu corriger le résultat ?" }],
  });
  const systemMessage = (requests[0]?.messages as { role: string; content: string }[])
    .find((item) => item.role === "system")?.content ?? "";
  assert.match(systemMessage, /1–3 short sentences/);
  assert.match(systemMessage, /current message includes condescension/);
  assert.match(systemMessage, /answer it directly/);
  assert.match(response.choices[0]!.message.content!, /courtois/);
  assert.equal(requests.length, 1);
});

test("A silence choice for condescension alone is rejected and followed by a reply", async () => {
  const { client, requests } = provider([
    completion(null, true),
    completion("Je peux te répondre, mais restons respectueux."),
  ]);
  const response = await createReliableCompletion(client, {
    model: "test", max_completion_tokens: 100, currentUserText: "Réfléchis un peu.",
    messages: [{ role: "user", content: "Réfléchis un peu." }],
  });
  assert.notEqual(response.intentionallySilent, true);
  assert.match(response.choices[0]!.message.content!, /respectueux/);
  assert.equal(requests.length, 2);
});

const evidenceQuote = "Paris est la capitale de la France.";
const evidence = {
  title: "Géographie", url: "https://example.org/geographie", snippet: "Résultat de recherche",
  content: evidenceQuote + " Cette page décrit les villes françaises et leur situation administrative. Les données sont présentées dans le cadre de la géographie de la France.",
};
const reviewed = JSON.stringify({
  status: "supported", previousError: "confirmed",
  supported: [{ segment: 1, citations: [{ source: 1, quote: evidenceQuote }] }],
});

test("Researched answers get one bounded audit and internal options never leak into provider parameters", async () => {
  const { client, requests } = provider([completion("Paris est la capitale de la France."), completion(reviewed)]);
  const response = await createReliableCompletion(client, {
    model: "test", max_completion_tokens: 100, currentUserText: "C'est faux",
    messages: [{ role: "user", content: "C'est faux" }], evidence: [evidence], responseLanguage: "fr",
    correction: { question: "Capitale de la France ?", previousAnswer: "Madrid.", objection: "C'est faux" },
  });
  assert.equal(requests.length, 2);
  assert.match(response.choices[0]!.message.content!, /Correction/);
  assert.equal(response.reviewedSources?.[0]?.url, evidence.url);
  for (const request of requests) {
    for (const key of ["currentUserText", "evidence", "correction", "responseLanguage"]) assert.equal(Object.hasOwn(request, key), false);
  }
  assert.deepEqual(requests[1]!.response_format, { type: "json_object" });
  assert.equal(Object.hasOwn(requests[1]!, "tools"), false);
});

test("Failed or malformed audits fail closed rather than exposing an unverified draft", async () => {
  for (const audit of [undefined, completion("{invalid JSON"), completion('{"status":"supported","supported":[{"segment":1,"citations":[{"source":8,"quote":"invented quotation"}]}]}')]) {
    const { client, requests } = provider([completion("Madrid est la capitale de la France."), ...(audit ? [audit] : [])]);
    const response = await createReliableCompletion(client, {
      model: "test", max_completion_tokens: 100, currentUserText: "Capitale de la France ?",
      messages: [{ role: "user", content: "Capitale de la France ?" }], evidence: [evidence], responseLanguage: "fr",
    });
    assert.equal(requests.length, 2);
    assert.doesNotMatch(response.choices[0]!.message.content!, /Madrid/);
    assert.match(response.choices[0]!.message.content!, /ne suffisent pas/);
    assert.deepEqual(response.reviewedSources, []);
  }
});

test("Ordinary conversation, silence and provider safety refusals are not research-audited", async () => {
  const { client, requests } = provider([completion("Bonjour !")]);
  await createReliableCompletion(client, { model: "test", max_completion_tokens: 100, currentUserText: "Bonjour", messages: [{ role: "user", content: "Bonjour" }] });
  assert.equal(requests.length, 1);
  const silent = provider([completion(null, true)]);
  assert.equal((await createReliableCompletion(silent.client, {
    model: "test", max_completion_tokens: 100, currentUserText: "t'es con", evidence: [evidence],
    messages: [{ role: "user", content: "t'es con" }],
  })).intentionallySilent, true);
  assert.equal(silent.requests.length, 1);
  const filtered = completion(null);
  filtered.choices[0]!.finish_reason = "content_filter";
  const refused = provider([filtered]);
  await createReliableCompletion(refused.client, {
    model: "test", max_completion_tokens: 100, currentUserText: "x", evidence: [evidence], messages: [{ role: "user", content: "x" }],
  });
  assert.equal(refused.requests.length, 1);
});

test("A quoted older answer selects its own question, not the last unrelated conversation", async () => {
  const message = Object.assign(fakeMessage(true), { client: { user: { id: "bot-id" } } });
  let reads = 0;
  const oldAnswer = "La capitale de la France est Madrid.";
  message.fetchReference = async () => {
    reads++;
    return { ...fakeMessage(), author: { ...fakeMessage().author, id: "bot-id", bot: true }, content: oldAnswer, embeds: [] } as unknown as Message;
  };
  const history = [
    { role: "user", content: JSON.stringify({ text: "Quelle est la capitale de la France ?" }) }, { role: "assistant", content: oldAnswer },
    { role: "user", content: JSON.stringify({ text: "Quelle est la capitale de l'Italie ?" }) }, { role: "assistant", content: "Rome." },
  ];
  let searched = "";
  const result = await researchForTurn(message, "Ta réponse est fausse", history, false, "incorrect", "fr", async (query, options) => {
    searched = query; assert.equal(options?.verify, true); return [evidence];
  });
  assert.equal(searched, "Quelle est la capitale de la France ?");
  assert.equal(result.correction?.previousAnswer, oldAnswer);
  await buildSpeakerContext(message);
  assert.equal(reads, 1);
});

test("Missing, inaccessible or another person's referenced answer triggers clarification without a public search", async () => {
  const history = [{ role: "user", content: "Capitale de la France ?" }, { role: "assistant", content: "Paris." }];
  const inaccessible = fakeMessage(false);
  const human = Object.assign(fakeMessage(true), { client: { user: { id: "bot-id" } } });
  human.fetchReference = async () => ({ ...fakeMessage(), content: "Un autre message.", embeds: [] }) as unknown as Message;
  for (const message of [inaccessible, human]) {
    const result = await researchForTurn(message, "C'est faux", history, true, "do not search", "fr", async () => {
      assert.fail("Ambiguous reference must never search an unrelated old question");
    });
    assert.match(result.immediateReply!, /Quel point/);
    assert.equal(result.correction, undefined);
  }
});

test("Private historical questions are not sent to public search, simple calculations use verified local arithmetic", async () => {
  const message = Object.assign(fakeMessage(false), { reference: undefined });
  for (const question of ["Quelle est mon adresse ?", "Vérifie ce token : private-value", "Que signifie l'adresse contact@example.org ?"]) {
    const result = await researchForTurn(message, "C'est faux", [
      { role: "user", content: question }, { role: "assistant", content: "Ancienne réponse." },
    ], true, "", "fr", async () => { assert.fail("Private question must not be searched"); });
    assert.match(result.immediateReply!, /sans information privée/);
  }
  const result = await researchForTurn(message, "Ce calcul est faux", [
    { role: "user", content: "Combien font 2 + 2 ?" }, { role: "assistant", content: "5" },
  ], true, "", "fr", async () => { assert.fail("Pure arithmetic needs no public search"); });
  assert.match(result.immediateReply!, /= 4/);
  assert.doesNotMatch(result.immediateReply!, /raison|excuse/);
});
