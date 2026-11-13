import test from "node:test";
import assert from "node:assert/strict";
import {
  buildQuestEmbed, initQuestStore, showQuestList, showQuestProfile, showQuestStats, addQuestWithCoach, startQuestSetup,
  createQuestReminderSchedule, getQuestReminderWeekKey, runQuestReminderCycle, handleQuestReminderButton,
  getUserQuestData, MAX_WEEKLY_QUEST_REMINDERS, normalizeGeneratedQuest, buildQuestCommandHelp,
} from "../src/discord/quests.js";
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
  assert.match(list, /Description/);
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
  assert.match(calls[0].messages[0].content, /concrete, measurable, and achievable/);
});

test("Generated quests keep difficulty rewards bounded and never alter existing quest data", () => {
  assert.deepEqual(
    normalizeGeneratedQuest({ title: "  Lire   plus ", description: "Lire dix pages.", difficulty: "easy", points: 9999 }, 2, "Lire davantage", "fr"),
    { id: 2, title: "Lire plus", description: "Lire dix pages.", difficulty: "easy", points: 10, completed: false },
  );
  const invalid = normalizeGeneratedQuest({ title: "", description: "", difficulty: "impossible", points: -30 }, 3, "Faire une promenade", "fr");
  assert.equal(invalid.title, "Faire une promenade");
  assert.equal(invalid.description, "Faire une promenade");
  assert.equal(invalid.difficulty, "medium");
  assert.equal(invalid.points, 25);
  assert.ok(buildQuestCommandHelp("fr", "??").includes("`??quest add <objectif>`"));
  assert.match(buildQuestCommandHelp("fr", "??"), /jusqu’à trois par semaine/);
  const priorPoints = f.profile.totalPoints;
  const priorQuest = structuredClone(f.profile.quests[0]);
  normalizeGeneratedQuest({ title: "Test", description: "Test", difficulty: "hard", points: 50 }, 4, "Test", "fr");
  assert.equal(f.profile.totalPoints, priorPoints);
  assert.deepEqual(f.profile.quests[0], priorQuest);
});

test("Quest reminders vary across the week, stay under the weekly cap, persist across restarts, and only the recipient can disable them", async () => {
  const scheduleStart = new Date("2026-11-09T06:00:00.000Z");
  const schedule = createQuestReminderSchedule(scheduleStart, () => 0.99);
  assert.equal(getQuestReminderWeekKey(scheduleStart), "2026-11-09");
  assert.equal(schedule.length, MAX_WEEKLY_QUEST_REMINDERS);
  assert.equal(new Set(schedule.map(slot => new Date(slot).getUTCDay())).size, schedule.length);
  for (const slot of schedule) {
    const date = new Date(slot);
    assert.ok(date > scheduleStart);
    assert.ok(date.getUTCHours() >= 8 && date.getUTCHours() <= 21);
    assert.equal(getQuestReminderWeekKey(date), "2026-11-09");
  }
  const alternatives = [
    createQuestReminderSchedule(scheduleStart, () => 0.1),
    createQuestReminderSchedule(scheduleStart, () => 0.55),
  ];
  assert.notDeepEqual(alternatives[0], alternatives[1]);

  f.profile.notifyChannelId = "channel";
  f.profile.remindersDisabled = false;
  f.profile.reminderHours = [10, 15, 18]; // Legacy settings remain readable but do not control delivery.
  f.profile.reminderScheduleWeek = "2026-11-09";
  f.profile.reminderSchedule = schedule;
  f.profile.reminderAttemptedSlots = [];
  await initQuestStore();
  assert.equal(getUserQuestData("user")?.reminderActive, true);

  const sent: any[] = [];
  const channel = {
    isTextBased: () => true,
    send: async (payload: any) => { sent.push(payload); return {}; },
  };
  const client = { channels: { fetch: async () => channel } } as any;
  for (const slot of schedule) {
    await runQuestReminderCycle(client, null, new Date(Date.parse(slot) + 60_000));
  }
  assert.equal(sent.length, MAX_WEEKLY_QUEST_REMINDERS);
  for (const payload of sent) {
    const button = payload.components[0].components[0].data;
    assert.equal(button.custom_id, "quest_reminder_disable:user");
    assert.equal(button.emoji.name, "❌");
    assert.equal(payload.allowedMentions.users[0], "user");
  }

  const lastDeliveryTime = new Date(Date.parse(schedule.at(-1)!) + 60_000);
  await initQuestStore(); // Simulate a restart, reloading the persisted attempted slots.
  await runQuestReminderCycle(client, null, lastDeliveryTime);
  assert.equal(sent.length, MAX_WEEKLY_QUEST_REMINDERS);

  const deniedReplies: any[] = [];
  await handleQuestReminderButton({
    customId: "quest_reminder_disable:user",
    guildId: "fr-guild",
    user: { id: "someone-else" },
    reply: async (payload: any) => { deniedReplies.push(payload); },
    message: { edit: async () => { throw new Error("unauthorized click must not edit the reminder"); } },
  } as any);
  assert.match(deniedReplies[0].content, /Seule la personne concernée/);
  assert.equal(getUserQuestData("user")?.reminderActive, true);

  const ownerReplies: any[] = [], edits: any[] = [];
  await handleQuestReminderButton({
    customId: "quest_reminder_disable:user",
    guildId: "fr-guild",
    user: { id: "user" },
    reply: async (payload: any) => { ownerReplies.push(payload); },
    message: { edit: async (payload: any) => { edits.push(payload); } },
  } as any);
  assert.match(ownerReplies[0].content, /rappels de quêtes sont désactivés/);
  assert.deepEqual(edits[0].components, []);
  await initQuestStore();
  assert.equal(getUserQuestData("user")?.reminderActive, false);

  const missingProfileReplies: any[] = [];
  await handleQuestReminderButton({
    customId: "quest_reminder_disable:missing",
    user: { id: "missing" },
    reply: async (payload: any) => { missingProfileReplies.push(payload); },
  } as any);
  assert.match(missingProfileReplies[0].content, /profil de quêtes/);
});
