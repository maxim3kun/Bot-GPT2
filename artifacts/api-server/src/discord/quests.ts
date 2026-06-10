import { type Message, EmbedBuilder, type TextChannel } from "discord.js";
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

// ── Helpers ───────────────────────────────────────────────────────────────────

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

  if (lvl.next) {
    const range = lvl.next.threshold - lvl.threshold;
    const progress = Math.min(10, Math.round(((profile.totalPoints - lvl.threshold) / range) * 10));
    const bar = "█".repeat(progress) + "░".repeat(10 - progress);
    embed.setFooter({ text: `[${bar}] ${lvl.next.threshold - profile.totalPoints} XP → ${lvl.next.title}` });
  } else {
    embed.setFooter({ text: "🌌 Max level reached!" });
  }

  return embed;
}

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

// ── Public commands ───────────────────────────────────────────────────────────

export async function startQuestSetup(message: Message, openai: OpenAI | null): Promise<void> {
  if (!openai) {
    await message.reply("❌ AI (GROQ_API_KEY) is required for quest setup. Ask an admin to configure it.");
    return;
  }

  const profile = getProfile(message.author.id, message.author.displayName ?? message.author.username);

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
  } catch (err) {
    logger.error({ err }, "Quest setup error");
    await waitMsg.edit("❌ Failed to create quests. Try again with `!quest start`.");
  }
}

export async function showQuestList(message: Message): Promise<void> {
  const profile = getProfile(message.author.id, message.author.displayName ?? message.author.username);
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
