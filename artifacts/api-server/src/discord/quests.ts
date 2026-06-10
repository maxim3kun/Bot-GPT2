import { type Client, type Message, EmbedBuilder, type TextChannel } from "discord.js";
import OpenAI from "openai";
import { logger } from "../lib/logger";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../data");
const DATA_FILE = join(DATA_DIR, "quests.json");

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Quest {
  id: number;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
  completed: boolean;
  completedAt?: string;
}

export interface UserProfile {
  userId: string;
  username: string;
  quests: Quest[];
  totalPoints: number;
  completedCount: number;
  createdAt: string;
  notifyChannelId?: string;
  notifyGuildId?: string;
  bullying?: boolean;
  lastRemindedDate?: string;
  lastRemindedHour?: number;
}

type QuestStore = Record<string, UserProfile>;

// ── Level system ──────────────────────────────────────────────────────────────

const LEVELS = [
  { level: 1, threshold: 0,     title: "🌱 Novice" },
  { level: 2, threshold: 100,   title: "⚡ Apprentice" },
  { level: 3, threshold: 250,   title: "🔥 Adventurer" },
  { level: 4, threshold: 500,   title: "⚔️ Warrior" },
  { level: 5, threshold: 1000,  title: "🏆 Champion" },
  { level: 6, threshold: 2000,  title: "💎 Master" },
  { level: 7, threshold: 3500,  title: "🌟 Expert" },
  { level: 8, threshold: 6000,  title: "👑 Legend" },
  { level: 9, threshold: 10000, title: "🌌 Transcendent" },
];

function getLevelInfo(points: number) {
  let current = LEVELS[0]!;
  for (const lvl of LEVELS) {
    if (points >= lvl.threshold) current = lvl;
  }
  const nextIdx = LEVELS.findIndex(l => l.level === current.level) + 1;
  const next = LEVELS[nextIdx] ?? null;
  return { ...current, next };
}

// ── Storage ───────────────────────────────────────────────────────────────────

let store: QuestStore = {};

function loadStore() {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    if (existsSync(DATA_FILE)) {
      store = JSON.parse(readFileSync(DATA_FILE, "utf-8")) as QuestStore;
    }
  } catch (err) {
    logger.error({ err }, "Failed to load quest store");
  }
}

function saveStore() {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    logger.error({ err }, "Failed to save quest store");
  }
}

loadStore();

function getProfile(userId: string, username: string): UserProfile {
  if (!store[userId]) {
    store[userId] = {
      userId,
      username,
      quests: [],
      totalPoints: 0,
      completedCount: 0,
      createdAt: new Date().toISOString(),
    };
  }
  store[userId]!.username = username;
  return store[userId]!;
}

function recordChannel(profile: UserProfile, message: Message) {
  if (message.guildId && message.channelId) {
    profile.notifyChannelId = message.channelId;
    profile.notifyGuildId = message.guildId;
  }
}

// ── Reminder messages ─────────────────────────────────────────────────────────

const NORMAL_REMINDERS = [
  (name: string, n: number) => `Hey ${name}! 👋 You still have **${n} quest${n > 1 ? "s" : ""}** pending. You got this! 💪`,
  (name: string, n: number) => `📋 Reminder for ${name}: **${n} quest${n > 1 ? "s" : ""}** are waiting for you. Small steps, big results! 🚀`,
  (name: string, n: number) => `⏰ ${name}, just a friendly nudge — **${n} quest${n > 1 ? "s" : ""}** left to complete today. Keep going! 🌟`,
  (name: string, n: number) => `✨ ${name}, your goals don't complete themselves! **${n} quest${n > 1 ? "s" : ""}** still pending — let's get to it! 🎯`,
];

const BULLY_REMINDERS = [
  (name: string, n: number) => `${name}. **${n} quest${n > 1 ? "s" : ""}** still untouched. Nobody's going to do them for you. Get off your ass.`,
  (name: string, n: number) => `Still **${n} quest${n > 1 ? "s" : ""}** pending, ${name}? Every hour you wait is an hour you'll never get back. Tick tock.`,
  (name: string, n: number) => `${name}, your future self is watching you right now. They're not impressed. **${n} quest${n > 1 ? "s" : ""}** still undone.`,
  (name: string, n: number) => `Reminder for ${name}: **${n} quest${n > 1 ? "s" : ""}** left. Excuses are free. Results cost effort. Which one are you choosing?`,
  (name: string, n: number) => `${name}. **${n} quest${n > 1 ? "s" : ""}**. Still waiting. The version of you that actually does things is embarrassed right now.`,
  (name: string, n: number) => `Hey ${name} — **${n} thing${n > 1 ? "s" : ""}** you said mattered to you. Still not done. Funny how that works.`,
  (name: string, n: number) => `${name}, you set these goals yourself. Nobody forced you. **${n} quest${n > 1 ? "s" : ""}** pending. Don't betray your own ambitions.`,
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

// ── Embed builder ─────────────────────────────────────────────────────────────

const DIFF_EMOJI: Record<string, string> = { easy: "🟢", medium: "🟡", hard: "🔴" };
const QUEST_NUMS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

function buildQuestEmbed(profile: UserProfile): EmbedBuilder {
  const lvl = getLevelInfo(profile.totalPoints);
  const done = profile.quests.filter(q => q.completed).length;

  const embed = new EmbedBuilder()
    .setTitle(`🗺️ ${profile.username}'s Quests`)
    .setColor(0xf1c40f);

  if (profile.quests.length === 0) {
    embed.setDescription("No quests yet! Use `!quest start` to set your goals. 🚀");
  } else {
    const lines = profile.quests.map((q, i) => {
      const num = q.completed ? "✅" : (QUEST_NUMS[i] ?? `${i + 1}.`);
      const title = q.completed ? `~~${q.title}~~` : `**${q.title}**`;
      return `${num} ${DIFF_EMOJI[q.difficulty] ?? "⬜"} ${title} — *${q.points} XP*`;
    });
    embed.setDescription(lines.join("\n"));
    if (profile.quests.some(q => !q.completed)) {
      embed.addFields({ name: "\u200b", value: "💡 React with the number to mark a quest as done!", inline: false });
    }
  }

  embed.addFields(
    { name: "Level", value: `${lvl.title} (Lv. ${lvl.level})`, inline: true },
    { name: "Total XP", value: `${profile.totalPoints} pts`, inline: true },
    { name: "Done", value: `${done}/${profile.quests.length}`, inline: true },
  );

  const bullyStatus = profile.bullying ? "🔥 Bully mode ON" : "💬 Normal reminders";
  if (lvl.next) {
    const range = lvl.next.threshold - lvl.threshold;
    const progress = Math.min(10, Math.round(((profile.totalPoints - lvl.threshold) / range) * 10));
    const bar = "█".repeat(progress) + "░".repeat(10 - progress);
    embed.setFooter({ text: `[${bar}] ${lvl.next.threshold - profile.totalPoints} XP → ${lvl.next.title} · ${bullyStatus}` });
  } else {
    embed.setFooter({ text: `🌌 Max level reached! · ${bullyStatus}` });
  }

  return embed;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function awardQuest(profile: UserProfile, idx: number): { leveledUp: boolean; newLevel: ReturnType<typeof getLevelInfo> } {
  const quest = profile.quests[idx]!;
  const prevLevel = getLevelInfo(profile.totalPoints).level;
  quest.completed = true;
  quest.completedAt = new Date().toISOString();
  profile.totalPoints += quest.points;
  profile.completedCount += 1;
  const newLevel = getLevelInfo(profile.totalPoints);
  return { leveledUp: newLevel.level > prevLevel, newLevel };
}

function attachReactionCollector(questMsg: Message, profile: UserProfile, channel: TextChannel) {
  const collector = questMsg.createReactionCollector({
    filter: (r, u) => !u.bot && QUEST_NUMS.includes(r.emoji.name ?? ""),
    idle: 30 * 60 * 1000,
  });

  collector.on("collect", async (reaction, user) => {
    const idx = QUEST_NUMS.indexOf(reaction.emoji.name ?? "");
    if (idx < 0 || idx >= profile.quests.length) return;
    if (profile.quests[idx]!.completed) {
      await reaction.users.remove(user.id).catch(() => null);
      return;
    }

    const { leveledUp, newLevel } = awardQuest(profile, idx);
    saveStore();

    const quest = profile.quests[idx]!;
    await reaction.users.remove(user.id).catch(() => null);
    await questMsg.edit({ embeds: [buildQuestEmbed(profile)] }).catch(() => null);

    const notify = new EmbedBuilder()
      .setDescription(`✅ <@${user.id}> completed **${quest.title}** — +${quest.points} XP!`)
      .setColor(0x2ecc71);

    if (leveledUp) {
      notify.setTitle(`🎊 Level Up! → ${newLevel.title} (Lv. ${newLevel.level})`);
    }

    await channel.send({ embeds: [notify] }).catch(() => null);
  });
}

// ── Scheduler (10:00 / 15:00 / 18:00 UTC) ────────────────────────────────────

const REMINDER_HOURS = [10, 15, 18];

export function startQuestReminders(client: Client, openai: OpenAI | null): void {
  // Check every 30 seconds; fire within the first minute of each target hour
  setInterval(async () => {
    const now = new Date();
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();
    const dateStr = now.toISOString().split("T")[0]!;

    if (!REMINDER_HOURS.includes(hour) || minute > 1) return;

    for (const profile of Object.values(store)) {
      if (!profile.notifyChannelId) continue;

      const pending = profile.quests.filter(q => !q.completed);
      if (pending.length === 0) continue;

      // Don't fire twice in the same hour
      if (profile.lastRemindedDate === dateStr && profile.lastRemindedHour === hour) continue;

      try {
        const channel = await client.channels.fetch(profile.notifyChannelId).catch(() => null);
        if (!channel?.isTextBased()) continue;

        let text: string;

        if (profile.bullying && openai) {
          // AI-generated bully message for more variety
          const questTitles = pending.map(q => q.title).join(", ");
          try {
            const res = await openai.chat.completions.create({
              model: "llama-3.1-70b-versatile",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a brutally honest, tough-love accountability coach. " +
                    "Write ONE short punchy reminder (max 2 sentences, no hashtags) to push someone to complete their tasks. " +
                    "Be direct, harsh but not cruel — like a drill sergeant who actually cares. No emojis except at the end. " +
                    "Respond in the same language as the task names provided.",
                },
                {
                  role: "user",
                  content: `Name: ${profile.username}. Pending tasks: ${questTitles}`,
                },
              ],
              temperature: 0.9,
              max_tokens: 120,
            });
            text = `<@${profile.userId}> ${res.choices[0]?.message?.content?.trim() ?? pickRandom(BULLY_REMINDERS)(profile.username, pending.length)}`;
          } catch {
            text = `<@${profile.userId}> ${pickRandom(BULLY_REMINDERS)(profile.username, pending.length)}`;
          }
        } else if (profile.bullying) {
          text = `<@${profile.userId}> ${pickRandom(BULLY_REMINDERS)(profile.username, pending.length)}`;
        } else {
          text = `<@${profile.userId}> ${pickRandom(NORMAL_REMINDERS)(profile.username, pending.length)}`;
        }

        await (channel as TextChannel).send(text).catch(() => null);

        profile.lastRemindedDate = dateStr;
        profile.lastRemindedHour = hour;
        saveStore();

        logger.info({ userId: profile.userId, hour, bullying: !!profile.bullying }, "Quest reminder sent");
      } catch (err) {
        logger.error({ err, userId: profile.userId }, "Failed to send quest reminder");
      }
    }
  }, 30_000);
}

// ── Public commands ───────────────────────────────────────────────────────────

export async function startQuestSetup(message: Message, openai: OpenAI | null): Promise<void> {
  if (!openai) {
    await message.reply("❌ AI (GROQ_API_KEY) is required for quest setup. Ask an admin to configure it.");
    return;
  }

  const profile = getProfile(message.author.id, message.author.displayName ?? message.author.username);
  recordChannel(profile, message);
  saveStore();

  const promptEmbed = new EmbedBuilder()
    .setTitle("🎯 Quest Setup")
    .setDescription(
      "Tell me your goals and I'll turn them into epic quests!\n\n" +
      "What do you want to accomplish? *(work, fitness, projects, habits, learning...)*\n\n" +
      "You have **60 seconds** to reply. 📝",
    )
    .setColor(0x3498db);

  await message.reply({ embeds: [promptEmbed] });

  let collected;
  try {
    collected = await message.channel.awaitMessages({
      filter: m => m.author.id === message.author.id,
      max: 1,
      time: 60_000,
    });
  } catch {
    await message.channel.send("⏰ No response received. Use `!quest start` when you're ready!");
    return;
  }

  if (collected.size === 0) {
    await message.channel.send("⏰ No response received. Use `!quest start` when you're ready!");
    return;
  }

  const userInput = collected.first()!.content;
  const waitMsg = await message.channel.send("⚙️ Creating your quests...");

  try {
    const response = await openai.chat.completions.create({
      model: "llama-3.1-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a quest designer. Convert the user's goals into a JSON array of quests.\n" +
            "Return ONLY valid JSON, no markdown, no other text. Max 9 quests.\n" +
            'Schema: [{"title":"<max 40 chars>","description":"<one sentence>","difficulty":"easy|medium|hard","points":10|25|50}]\n' +
            "Rules: easy=10pts (daily/weekly habit), medium=25pts (monthly goal), hard=50pts (long-term project).\n" +
            "Respond in the same language as the user.",
        },
        { role: "user", content: userInput },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "[]";
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array in response");

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      title: string;
      description: string;
      difficulty: "easy" | "medium" | "hard";
      points: number;
    }>;

    profile.quests = parsed.slice(0, 9).map((q, i) => ({
      id: i + 1,
      title: q.title ?? "Quest",
      description: q.description ?? "",
      difficulty: (["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : "medium") as "easy" | "medium" | "hard",
      points: typeof q.points === "number" ? q.points : 25,
      completed: false,
    }));

    saveStore();

    const questEmbed = buildQuestEmbed(profile);
    const questMsg = await waitMsg.edit({ content: "", embeds: [questEmbed] });

    for (let i = 0; i < profile.quests.length; i++) {
      await questMsg.react(QUEST_NUMS[i]!).catch(() => null);
    }

    attachReactionCollector(questMsg, profile, message.channel as TextChannel);

    // Ask bully mode preference
    const modeMsg = await message.channel.send(
      "⚡ Last step — how do you want your daily reminders (10h · 15h · 18h UTC)?\n" +
      "🔥 **Brutal accountability** — no excuses, no mercy, straight talk\n" +
      "💬 **Friendly nudges** — supportive and encouraging",
    );
    await modeMsg.react("🔥").catch(() => null);
    await modeMsg.react("💬").catch(() => null);

    const modeCollected = await modeMsg.awaitReactions({
      filter: (r, u) => ["🔥", "💬"].includes(r.emoji.name ?? "") && u.id === message.author.id,
      max: 1,
      time: 30_000,
    }).catch(() => null);

    const picked = modeCollected?.first()?.emoji?.name;
    profile.bullying = picked === "🔥";
    saveStore();

    await modeMsg.edit(
      profile.bullying
        ? "🔥 **Brutal mode set.** Expect zero sugar-coating when you're slacking."
        : "💬 **Friendly mode set.** I'll keep it supportive.",
    ).catch(() => null);

  } catch (err) {
    logger.error({ err }, "Quest setup error");
    await waitMsg.edit("❌ Failed to create quests. Try again with `!quest start`.");
  }
}

export async function addQuestWithCoach(message: Message, objective: string, openai: OpenAI | null): Promise<void> {
  if (!objective.trim()) {
    await message.reply("❓ Usage: `!quest add <your goal>` — e.g. `!quest add Run 5km three times a week`");
    return;
  }

  const profile = getProfile(message.author.id, message.author.displayName ?? message.author.username);
  recordChannel(profile, message);

  if (profile.quests.length >= 9) {
    await message.reply("❌ You already have 9 quests (max). Complete or reset some before adding more.");
    return;
  }

  if (!openai) {
    const quest: Quest = {
      id: profile.quests.length + 1,
      title: objective.slice(0, 40),
      description: objective,
      difficulty: "medium",
      points: 25,
      completed: false,
    };
    profile.quests.push(quest);
    saveStore();
    const embed = buildQuestEmbed(profile);
    await message.reply({ content: `✅ Quest added: **${quest.title}** (+${quest.points} XP)`, embeds: [embed] });
    return;
  }

  const thinkMsg = await message.channel.send("🤔 One question before I add this...");

  try {
    // Step 1: AI generates ONE sharp clarifying question
    const qRes = await openai.chat.completions.create({
      model: "llama-3.1-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a goal-setting coach. The user wants to add a personal quest/goal. " +
            "Ask ONE short, sharp clarifying question to better define this goal. " +
            "Focus on: timeline, how to measure success, or the real motivation. " +
            "One sentence only. No preamble, no label. Respond in the same language as the goal.",
        },
        { role: "user", content: `Goal: ${objective}` },
      ],
      temperature: 0.8,
      max_tokens: 80,
    });

    const question = qRes.choices[0]?.message?.content?.trim() ?? "What's your target timeline for this?";
    await thinkMsg.edit(`💬 **${question}** *(60s to answer — or ignore and I'll use the goal as-is)*`);

    // Step 2: wait for user answer (optional — if no answer, proceed anyway)
    const answered = await message.channel.awaitMessages({
      filter: m => m.author.id === message.author.id,
      max: 1,
      time: 60_000,
    }).catch(() => null);

    const answer = answered && answered.size > 0 ? answered.first()!.content : "";

    // Step 3: AI creates the quest
    const questRes = await openai.chat.completions.create({
      model: "llama-3.1-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "Create ONE quest JSON from a user goal. Return ONLY valid JSON, no other text, no markdown.\n" +
            'Schema: {"title":"<max 40 chars>","description":"<one sentence>","difficulty":"easy|medium|hard","points":10|25|50}\n' +
            "easy=10pts (daily habit), medium=25pts (weekly/monthly goal), hard=50pts (long-term project).\n" +
            "Respond in the same language as the goal.",
        },
        {
          role: "user",
          content: `Goal: "${objective}"\nUser answer: "${answer || "no answer"}"`,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const raw = questRes.choices[0]?.message?.content?.trim() ?? "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object in response");

    const parsed = JSON.parse(jsonMatch[0]) as { title?: string; description?: string; difficulty?: string; points?: number };

    const quest: Quest = {
      id: profile.quests.length + 1,
      title: (parsed.title ?? objective).slice(0, 40),
      description: parsed.description ?? objective,
      difficulty: (["easy", "medium", "hard"].includes(parsed.difficulty ?? "") ? parsed.difficulty : "medium") as "easy" | "medium" | "hard",
      points: typeof parsed.points === "number" ? parsed.points : 25,
      completed: false,
    };

    profile.quests.push(quest);
    saveStore();

    await thinkMsg.edit(
      `✅ Quest added: **${quest.title}** — ${DIFF_EMOJI[quest.difficulty] ?? "⬜"} ${quest.difficulty}, +${quest.points} XP`,
    ).catch(() => null);

    const listEmbed = buildQuestEmbed(profile);
    const questMsg = await message.channel.send({ embeds: [listEmbed] });
    const newIdx = profile.quests.findIndex(q => q.id === quest.id);
    if (newIdx >= 0 && QUEST_NUMS[newIdx]) {
      await questMsg.react(QUEST_NUMS[newIdx]!).catch(() => null);
    }
    attachReactionCollector(questMsg, profile, message.channel as TextChannel);

  } catch (err) {
    logger.error({ err }, "Quest add error");
    await thinkMsg.edit("❌ Failed to add quest. Try again.").catch(() => null);
  }
}

export async function showQuestList(message: Message): Promise<void> {
  const profile = getProfile(message.author.id, message.author.displayName ?? message.author.username);
  recordChannel(profile, message);
  saveStore();

  const embed = buildQuestEmbed(profile);
  const questMsg = await message.reply({ embeds: [embed] });

  const activeIndices = profile.quests
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => !q.completed)
    .map(({ i }) => i);

  for (const i of activeIndices) {
    await questMsg.react(QUEST_NUMS[i]!).catch(() => null);
  }

  if (activeIndices.length > 0) {
    attachReactionCollector(questMsg, profile, message.channel as TextChannel);
  }
}

export async function markQuestDone(message: Message, indexStr: string): Promise<void> {
  const profile = getProfile(message.author.id, message.author.displayName ?? message.author.username);
  recordChannel(profile, message);
  const idx = parseInt(indexStr, 10) - 1;

  if (isNaN(idx) || idx < 0 || idx >= profile.quests.length) {
    await message.reply(`❌ Invalid number. Use \`!quest done <1-${profile.quests.length}>\`.`);
    return;
  }

  const quest = profile.quests[idx]!;
  if (quest.completed) {
    await message.reply(`✅ **${quest.title}** is already completed!`);
    return;
  }

  const { leveledUp, newLevel } = awardQuest(profile, idx);
  saveStore();

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setDescription(`✅ **${quest.title}** completed! +${quest.points} XP`)
    .addFields(
      { name: "Level", value: newLevel.title, inline: true },
      { name: "Total XP", value: `${profile.totalPoints} pts`, inline: true },
    );

  if (leveledUp) embed.setTitle(`🎊 Level Up! → ${newLevel.title} (Lv. ${newLevel.level})`);

  await message.reply({ embeds: [embed] });
}

export async function showQuestProfile(message: Message): Promise<void> {
  const profile = getProfile(message.author.id, message.author.displayName ?? message.author.username);
  recordChannel(profile, message);
  saveStore();

  const lvl = getLevelInfo(profile.totalPoints);
  const active = profile.quests.filter(q => !q.completed).length;

  const embed = new EmbedBuilder()
    .setTitle(`👤 ${profile.username}'s Profile`)
    .setColor(0x9b59b6)
    .addFields(
      { name: "🏅 Level", value: `${lvl.title} (Lv. ${lvl.level})`, inline: true },
      { name: "⚡ Total XP", value: `${profile.totalPoints} pts`, inline: true },
      { name: "✅ Completed", value: `${profile.completedCount} quests`, inline: true },
      { name: "📋 Active", value: `${active} quests`, inline: true },
      { name: "📅 Since", value: new Date(profile.createdAt).toLocaleDateString(), inline: true },
      { name: "🔔 Reminders", value: profile.notifyChannelId ? "Active (10h / 15h / 18h UTC)" : "Not set — use any `!quest` command in a server channel", inline: false },
      { name: "Mode", value: profile.bullying ? "🔥 Bully mode — ON" : "💬 Normal mode", inline: true },
    );

  if (lvl.next) {
    const range = lvl.next.threshold - lvl.threshold;
    const progress = Math.min(10, Math.round(((profile.totalPoints - lvl.threshold) / range) * 10));
    const bar = "█".repeat(progress) + "░".repeat(10 - progress);
    embed.setDescription(`\`[${bar}]\` ${profile.totalPoints} / ${lvl.next.threshold} XP → ${lvl.next.title}`);
  } else {
    embed.setDescription("🌌 **Max level reached! You are Transcendent!**");
  }

  await message.reply({ embeds: [embed] });
}

export async function setBullyMode(message: Message, enable: boolean): Promise<void> {
  const profile = getProfile(message.author.id, message.author.displayName ?? message.author.username);
  recordChannel(profile, message);
  profile.bullying = enable;
  saveStore();

  if (enable) {
    await message.reply(
      "🔥 **Bully mode activated.** No more gentle nudges — expect straight talk when you're slacking.\n" +
      "*You asked for this. Own it.*",
    );
  } else {
    await message.reply("💬 **Normal mode restored.** Reminders will be friendly from now on.");
  }
}

export async function resetQuests(message: Message): Promise<void> {
  const confirmMsg = await message.reply("⚠️ Reset ALL your quests and XP? React ✅ to confirm (10s).");
  await confirmMsg.react("✅").catch(() => null);

  let collected;
  try {
    collected = await confirmMsg.awaitReactions({
      filter: (r, u) => r.emoji.name === "✅" && u.id === message.author.id,
      max: 1,
      time: 10_000,
    });
  } catch {
    await confirmMsg.edit("❌ Reset cancelled.").catch(() => null);
    return;
  }

  if (collected.size === 0) {
    await confirmMsg.edit("❌ Reset cancelled.");
    return;
  }

  const profile = getProfile(message.author.id, message.author.displayName ?? message.author.username);
  profile.quests = [];
  profile.totalPoints = 0;
  profile.completedCount = 0;
  saveStore();

  await confirmMsg.edit("✅ All quests and XP reset. Use `!quest start` to begin fresh!");
}
