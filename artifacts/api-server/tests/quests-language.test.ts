import test from "node:test";
import assert from "node:assert/strict";
import { buildQuestEmbed, initQuestStore, showQuestList, showQuestProfile, showQuestStats, addQuestWithCoach, startQuestSetup } from "../src/discord/quests.js";
import type { Message } from "discord.js";
import { questFixture as f } from "./fixtures/quest-language.js";

test("Quest UI inherits French server language, preserves goals/XP, and follows explicit personal language", async () => {
  await initQuestStore();
  const replies: any[] = [], channels: any[] = [], edits: any[] = [];
  let reactionFilter: ((reaction: any, user: any) => boolean) | undefined;
  const sent = {
    react: async () => null,
    edit: async (payload: any) => { edits.push(payload); return sent; },
    createReactionCollector: (opts: any) => { reactionFilter = opts.filter; return { on() {} }; },
  };
  const message = {
    author: { id: "user", username: "Test" }, guildId: "fr-guild", channelId: "channel",
    channel: {
      guildId: "fr-guild", isTextBased: () => true, isSendable: () => true,
      send: async (payload: any) => { channels.push(payload); return sent; },
      awaitMessages: async () => ({ size: 0 }),
    },
    reply: async (payload: any) => { replies.push(payload); return sent; },
  } as unknown as Message;
  await showQuestList(message);
  const list = JSON.stringify(replies.pop().embeds[0].toJSON());
  assert.match(list, /Quêtes de Test/);
  assert.match(list, /Niveau/);
  assert.match(list, /Apprenti/);
  assert.match(list, /Objectif conservé/);
  assert.match(list, /150 pts/);
  assert.equal(reactionFilter!({ emoji: { name: "1️⃣" } }, { id: "other", bot: false }), false);
  assert.equal(reactionFilter!({ emoji: { name: "1️⃣" } }, { id: "user", bot: false }), true);
  await showQuestProfile(message);
  assert.match(JSON.stringify(replies.pop().embeds[0].toJSON()), /Profil de Test/);
  await showQuestStats(message);
  assert.match(JSON.stringify(replies.pop().embeds[0].toJSON()), /Cette semaine/);
  await startQuestSetup(message, null);
  assert.match(replies.pop(), /création de quêtes/);
  await addQuestWithCoach(message, "", null);
  assert.match(replies.pop(), /objectif/);
  f.personal = "en";
  await showQuestList(message);
  assert.match(replies.pop().embeds[0].toJSON().title, /Quests/);
  f.personal = null;
  await showQuestList({ ...message, guildId: null } as Message);
  assert.match(replies.pop().embeds[0].toJSON().title, /Quests/); // DM does not inherit an old server.
  assert.equal(f.profile.totalPoints, 150);
  assert.equal(f.profile.quests[0].title, "Objectif conservé");
});

test("Quest creation prompts the AI in the server language, with French setup and timeout messages", async () => {
  const replies: any[] = [], sends: any[] = [];
  const sent = { edit: async () => sent, react: async () => null, createReactionCollector: () => ({ on() {} }), awaitReactions: async () => null };
  const message = {
    author: { id: "new-user", username: "Nouveau" }, guildId: "fr-guild", channelId: "channel",
    reply: async (payload: any) => { replies.push(payload); return sent; },
    channel: { isTextBased: () => true, isSendable: () => true,
      send: async (payload: any) => { sends.push(payload); return sent; },
      awaitMessages: async () => ({ size: 0 }),
    },
  } as unknown as Message;
  await startQuestSetup(message, {} as any);
  assert.match(JSON.stringify(replies[0].embeds[0].toJSON()), /Création des quêtes/);
  assert.match(sends[0], /Aucune réponse/);
  assert.match(JSON.stringify(buildQuestEmbed({ ...f.profile, quests: [], totalPoints: 0 }, "fr").toJSON()), /Aucune quête/);
  const calls: any[] = [];
  const model = { chat: { completions: { create: async (params: any) => {
    calls.push(params);
    return { choices: [{ message: { content: JSON.stringify([
      { title: "Lire chaque jour", description: "Lire dix minutes.", difficulty: "easy", points: 10 },
    ]) } }] };
  } } } };
  const generatedMessage = {
    ...message, author: { id: "generated-user", username: "Test" },
    channel: { ...message.channel,
      isTextBased: () => true, isSendable: () => true,
      send: async () => sent,
      awaitMessages: async () => ({ size: 1, first: () => ({ content: "Je veux lire davantage" }) }),
    },
  } as unknown as Message;
  await startQuestSetup(generatedMessage, model as any);
  assert.equal(calls.length, 1);
  assert.match(calls[0].messages[0].content, /Respond in French/);
});
