import { type Client, type Message, type MessageReaction, type User, type ButtonInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, type TextChannel } from "discord.js";
import OpenAI from "openai";
import { logger } from "../lib/logger.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { isDbReady, patchUserData, getAllUserDocs } from "../lib/db.js";
import { USER_LANG_NAMES } from "./user-lang-store.js";
import { getEffectiveLanguage } from "./effective-language.js";

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
  reminderHours?: number[];
  remindersDisabled?: boolean;
  reminderScheduleWeek?: string;
  reminderSchedule?: string[];
  reminderAttemptedSlots?: string[];
}

type QuestStore = Record<string, UserProfile>;
type QuestLanguageContext = Message | UserProfile;
function questLanguage(context: QuestLanguageContext) {
  return "author" in context
    ? getEffectiveLanguage(context.guildId, context.author.id)
    : getEffectiveLanguage(context.notifyGuildId ?? null, context.userId);
}
function qt(context: QuestLanguageContext, english: string, french: string): string {
  return questLanguage(context) === "fr" ? french : english;
}
const FRENCH_LEVELS = ["🌱 Novice", "⚡ Apprenti", "🔥 Aventurier", "⚔️ Guerrier", "🏆 Champion", "💎 Maître", "🌟 Expert", "👑 Légende", "🌌 Transcendant"];
const QUEST_POINTS: Record<Quest["difficulty"], number> = { easy: 10, medium: 25, hard: 50 };

/** Normalize newly generated quests without touching stored quests or earned XP. */
export function normalizeGeneratedQuest(value: unknown, id: number, fallbackGoal: string, language: string): Quest {
  const generated = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const clean = (item: unknown, limit: number) =>
    typeof item === "string" ? item.replace(/\s+/g, " ").trim().slice(0, limit) : "";
  const difficulty = (["easy", "medium", "hard"].includes(String(generated["difficulty"]))
    ? generated["difficulty"] : "medium") as Quest["difficulty"];
  const goal = clean(fallbackGoal, 240);
  const title = clean(generated["title"], 40) || goal.slice(0, 40)
    || (language === "fr" ? "Nouvelle quête" : "New quest");
  const description = clean(generated["description"], 240) || goal || title;
  return {
    id,
    title,
    description,
    difficulty,
    points: QUEST_POINTS[difficulty],
    completed: false,
  };
}

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

function getLevelInfo(points: number, language = "en") {
  let current = LEVELS[0]!;
  for (const lvl of LEVELS) {
    if (points >= lvl.threshold) current = lvl;
  }
  const nextIdx = LEVELS.findIndex(l => l.level === current.level) + 1;
  const next = LEVELS[nextIdx] ?? null;
  return {
    ...current, title: language === "fr" ? FRENCH_LEVELS[current.level - 1]! : current.title,
    next: next ? { ...next, title: language === "fr" ? FRENCH_LEVELS[next.level - 1]! : next.title } : null,
  };
}

// ── In-memory store ───────────────────────────────────────────────────────────

let store: QuestStore = {};

/** Load from local JSON file (fallback when MongoDB is unavailable). */
function loadFromJson(): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    if (existsSync(DATA_FILE)) {
      store = JSON.parse(readFileSync(DATA_FILE, "utf-8")) as QuestStore;
    }
  } catch (err) {
    logger.error({ err }, "Failed to load quest store from JSON");
  }
}

/** Persist a single user profile. Uses MongoDB when available, JSON file as fallback. */
function persistUser(userId: string): void {
  const profile = store[userId];
  if (!profile) return;
  if (isDbReady()) {
    patchUserData(userId, { questProfile: profile as unknown as Record<string, unknown> })
      .catch(err => logger.error({ err, userId }, "Failed to persist quest profile to MongoDB"));
  } else {
    try {
      if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
      writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
    } catch (err) {
      logger.error({ err }, "Failed to save quest store to JSON");
    }
  }
}

/** Initialise the quest store. Call this at startup before handling any commands. */
export async function initQuestStore(): Promise<void> {
  if (!isDbReady()) {
    loadFromJson();
    logger.info({ count: Object.keys(store).length }, "Quest store loaded from JSON (no MongoDB)");
    return;
  }
  const users = await getAllUserDocs();
  for (const { data } of users) {
    if (data.questProfile && data.discordId) {
      const profile = data.questProfile as unknown as UserProfile;
      store[data.discordId] = { ...profile, userId: data.discordId };
    }
  }
  logger.info({ count: Object.keys(store).length }, "Quest store loaded from MongoDB");
}

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
function reminderFallback(profile: UserProfile, count: number): string {
  if (questLanguage(profile) === "fr") return profile.bullying
    ? `Il reste **${count} quête(s)** à terminer. Tu as choisi ces objectifs : passe à l’action, un pas à la fois !`
    : `Petit rappel : **${count} quête(s)** t’attendent. Chaque petit progrès compte ! 🌟`;
  return pickRandom(profile.bullying ? BULLY_REMINDERS : NORMAL_REMINDERS)(profile.username, count);
}

// ── Embed builder ─────────────────────────────────────────────────────────────

const DIFF_EMOJI: Record<string, string> = { easy: "🟢", medium: "🟡", hard: "🔴" };
const QUEST_NUMS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

export function buildQuestEmbed(profile: UserProfile, language = questLanguage(profile)): EmbedBuilder {
  const fr = language === "fr";
  const lvl = getLevelInfo(profile.totalPoints, language);
  const done = profile.quests.filter(q => q.completed).length;

  const embed = new EmbedBuilder()
    .setTitle(fr ? `🗺️ Quêtes de ${profile.username}` : `🗺️ ${profile.username}'s Quests`)
    .setColor(0xf1c40f);

  if (profile.quests.length === 0) {
    embed.setDescription(fr ? "Aucune quête pour le moment ! Utilise `!quest start` pour définir tes objectifs. 🚀" : "No quests yet! Use `!quest start` to set your goals. 🚀");
  } else {
    const lines = profile.quests.map((q, i) => {
      const num = q.completed ? "✅" : (QUEST_NUMS[i] ?? `${i + 1}.`);
      const title = q.completed ? `~~${q.title}~~` : `**${q.title}**`;
      const description = typeof q.description === "string" ? q.description.trim().replace(/\s+/g, " ") : "";
      const detail = description
        ? `\n> ${description.length > 110 ? `${description.slice(0, 107).trimEnd()}…` : description}`
        : "";
      return `${num} ${DIFF_EMOJI[q.difficulty] ?? "⬜"} ${title} — *${q.points} XP*${detail}`;
    });
    embed.setDescription(lines.join("\n"));
    if (profile.quests.some(q => !q.completed)) {
      embed.addFields({ name: "\u200b", value: fr ? "💡 Réagis avec le numéro pour terminer une quête !" : "💡 React with the number to mark a quest as done!", inline: false });
    }
  }

  embed.addFields(
    { name: fr ? "Niveau" : "Level", value: `${lvl.title} (${fr ? "Niv." : "Lv."} ${lvl.level})`, inline: true },
    { name: "Total XP", value: `${profile.totalPoints} pts`, inline: true },
    { name: fr ? "Terminées" : "Done", value: `${done}/${profile.quests.length}`, inline: true },
  );

  const bullyStatus = profile.bullying ? (fr ? "🔥 Mode exigeant activé" : "🔥 Bully mode ON") : (fr ? "💬 Rappels bienveillants" : "💬 Normal reminders");
  if (lvl.next) {
    const range = lvl.next.threshold - lvl.threshold;
    const progress = Math.min(10, Math.round(((profile.totalPoints - lvl.threshold) / range) * 10));
    const bar = "█".repeat(progress) + "░".repeat(10 - progress);
    embed.setFooter({ text: `[${bar}] ${lvl.next.threshold - profile.totalPoints} XP → ${lvl.next.title} · ${bullyStatus}` });
  } else {
    embed.setFooter({ text: `${fr ? "🌌 Niveau maximum atteint !" : "🌌 Max level reached!"} · ${bullyStatus}` });
  }

  return embed;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function awardQuest(profile: UserProfile, idx: number, language = questLanguage(profile)): { leveledUp: boolean; newLevel: ReturnType<typeof getLevelInfo> } {
  const quest = profile.quests[idx]!;
  const prevLevel = getLevelInfo(profile.totalPoints, language).level;
  quest.completed = true;
  quest.completedAt = new Date().toISOString();
  profile.totalPoints += quest.points;
  profile.completedCount += 1;
  const newLevel = getLevelInfo(profile.totalPoints, language);
  return { leveledUp: newLevel.level > prevLevel, newLevel };
}

function attachReactionCollector(questMsg: Message, profile: UserProfile, channel: TextChannel) {
  const collector = questMsg.createReactionCollector({
    filter: (r, u) => !u.bot && u.id === profile.userId && QUEST_NUMS.includes(r.emoji.name ?? ""),
    idle: 30 * 60 * 1000,
  });

  collector.on("collect", async (reaction, user) => {
    const idx = QUEST_NUMS.indexOf(reaction.emoji.name ?? "");
    if (idx < 0 || idx >= profile.quests.length) return;
    if (profile.quests[idx]!.completed) {
      await reaction.users.remove(user.id).catch(() => null);
      return;
    }

    const { leveledUp, newLevel } = awardQuest(profile, idx, getEffectiveLanguage(channel.guildId, profile.userId));
    persistUser(profile.userId);

    const quest = profile.quests[idx]!;
    await reaction.users.remove(user.id).catch(() => null);
    await questMsg.edit({ embeds: [buildQuestEmbed(profile, getEffectiveLanguage(channel.guildId, profile.userId))] }).catch(() => null);

    const notify = new EmbedBuilder()
      .setDescription(qt(profile, `✅ <@${user.id}> completed **${quest.title}** — +${quest.points} XP!`, `✅ <@${user.id}> a terminé **${quest.title}** — +${quest.points} XP !`))
      .setColor(0x2ecc71);

    if (leveledUp) {
      notify.setTitle(qt(profile, `🎊 Level Up! → ${newLevel.title} (Lv. ${newLevel.level})`, `🎊 Nouveau niveau ! → ${newLevel.title} (Niv. ${newLevel.level})`));
    }

    await channel.send({ embeds: [notify] }).catch(() => null);
  });
}

// ── Weekly reminder scheduler ─────────────────────────────────────────────────

export const MAX_WEEKLY_QUEST_REMINDERS = 3;
const REMINDER_HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 08:00–21:59 UTC
const REMINDER_DELIVERY_GRACE_MS = 15 * 60 * 1000;

export function getQuestReminderWeekKey(date: Date): string {
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const daysSinceMonday = (monday.getUTCDay() + 6) % 7;
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
  return monday.toISOString().slice(0, 10);
}

/** Select up to three distinct future days and random daytime slots for this UTC week. */
export function createQuestReminderSchedule(now: Date, random: () => number = Math.random): string[] {
  const weekStart = new Date(`${getQuestReminderWeekKey(now)}T00:00:00.000Z`);
  const eligibleDays: Array<{ date: Date; hours: number[] }> = [];
  for (let offset = 0; offset < 7; offset++) {
    const date = new Date(weekStart);
    date.setUTCDate(date.getUTCDate() + offset);
    const dateStr = date.toISOString().slice(0, 10);
    const todayStr = now.toISOString().slice(0, 10);
    if (dateStr < todayStr) continue;
    const hours = REMINDER_HOURS.filter(hour =>
      dateStr !== todayStr || hour > now.getUTCHours(),
    );
    if (hours.length > 0) eligibleDays.push({ date, hours });
  }
  if (eligibleDays.length === 0) return [];

  for (let i = eligibleDays.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [eligibleDays[i], eligibleDays[j]] = [eligibleDays[j]!, eligibleDays[i]!];
  }
  const count = 1 + Math.floor(random() * Math.min(MAX_WEEKLY_QUEST_REMINDERS, eligibleDays.length));
  return eligibleDays.slice(0, count).map(({ date, hours }) => {
    const hour = hours[Math.floor(random() * hours.length)]!;
    const minute = Math.floor(random() * 60);
    date.setUTCHours(hour, minute, 0, 0);
    return date.toISOString();
  }).sort();
}

async function persistUserNow(userId: string): Promise<void> {
  const profile = store[userId];
  if (!profile) return;
  if (isDbReady()) {
    await patchUserData(userId, { questProfile: profile as unknown as Record<string, unknown> });
    return;
  }
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    logger.error({ err }, "Failed to save quest store to JSON");
    throw err;
  }
}

export async function handleQuestReminderButton(interaction: ButtonInteraction): Promise<void> {
  const targetId = interaction.customId.slice("quest_reminder_disable:".length);
  if (!targetId || targetId !== interaction.user.id) {
    const french = getEffectiveLanguage(interaction.guildId, interaction.user.id) === "fr";
    await interaction.reply({
      content: french
        ? "🔒 Seule la personne concernée peut désactiver ses rappels."
        : "🔒 Only the recipient can disable these reminders.",
      ephemeral: true,
    });
    return;
  }
  const profile = store[targetId];
  if (!profile) {
    await interaction.reply({ content: "❌ Ce profil de quêtes n’est plus disponible.", ephemeral: true });
    return;
  }
  profile.remindersDisabled = true;
  await persistUserNow(targetId);
  const disabled = questLanguage(profile) === "fr"
    ? "🔕 Tes rappels de quêtes sont désactivés."
    : "🔕 Your quest reminders are disabled.";
  await interaction.reply({ content: disabled, ephemeral: true });
  await interaction.message.edit({ components: [] }).catch(() => null);
}

let reminderCycleRunning = false;

export async function runQuestReminderCycle(client: Client, openai: OpenAI | null, now = new Date()): Promise<void> {
  if (reminderCycleRunning) return;
  reminderCycleRunning = true;
  try {
    const weekKey = getQuestReminderWeekKey(now);
    for (const profile of Object.values(store)) {
      if (!profile.notifyChannelId || profile.remindersDisabled) continue;
      const pending = profile.quests.filter(q => !q.completed);
      if (pending.length === 0) continue;

      if (profile.reminderScheduleWeek !== weekKey || !Array.isArray(profile.reminderSchedule)) {
        profile.reminderScheduleWeek = weekKey;
        profile.reminderSchedule = createQuestReminderSchedule(now);
        profile.reminderAttemptedSlots = [];
        await persistUserNow(profile.userId);
      }

      const attempted = new Set(profile.reminderAttemptedSlots ?? []);
      const dueSlots = profile.reminderSchedule
        .filter(slot => !attempted.has(slot) && Date.parse(slot) <= now.getTime())
        .sort();
      for (const slot of dueSlots) {
        // Mark a slot before delivery. A crash after Discord accepted the message
        // cannot cause the same reminder to be sent again after restart.
        attempted.add(slot);
        profile.reminderAttemptedSlots = [...attempted];
        await persistUserNow(profile.userId);

        if (now.getTime() - Date.parse(slot) > REMINDER_DELIVERY_GRACE_MS) continue;
        try {
          const channel = await client.channels.fetch(profile.notifyChannelId).catch(() => null);
          if (!channel?.isTextBased()) continue;

          let text: string;
          if (profile.bullying && openai) {
            const questTitles = pending.map(q => q.title).join(", ");
            const reminderLang = USER_LANG_NAMES[questLanguage(profile)] ?? "English";
            try {
              const res = await openai.chat.completions.create({
                model: "openai/gpt-oss-120b",
                messages: [
                  {
                    role: "system",
                    content:
                      "You are a brutally honest, tough-love accountability coach. " +
                      "Write ONE short punchy reminder (max 2 sentences, no hashtags) to push someone to complete their tasks. " +
                      "Be direct, harsh but not cruel — like a drill sergeant who actually cares. No emojis except at the end. " +
                      `Respond in ${reminderLang}.`,
                  },
                  { role: "user", content: `Name: ${profile.username}. Pending tasks: ${questTitles}` },
                ],
                temperature: 0.9,
                max_tokens: 120,
              });
              text = `<@${profile.userId}> ${res.choices[0]?.message?.content?.trim() || reminderFallback(profile, pending.length)}`;
            } catch {
              text = `<@${profile.userId}> ${reminderFallback(profile, pending.length)}`;
            }
          } else {
            text = `<@${profile.userId}> ${reminderFallback(profile, pending.length)}`;
          }

          const button = new ButtonBuilder()
            .setCustomId(`quest_reminder_disable:${profile.userId}`)
            .setEmoji("❌")
            .setStyle(ButtonStyle.Secondary);
          await (channel as TextChannel).send({
            content: text,
            components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)],
            allowedMentions: { users: [profile.userId] },
          });
          profile.lastRemindedDate = slot.slice(0, 10);
          profile.lastRemindedHour = new Date(slot).getUTCHours();
          persistUser(profile.userId);
          logger.info({ userId: profile.userId, slot, bullying: !!profile.bullying }, "Quest reminder sent");
        } catch (err) {
          logger.error({ err, userId: profile.userId }, "Failed to send quest reminder");
        }
        // At most one reminder per person per scheduler pass, even after downtime.
        break;
      }
    }
  } finally {
    reminderCycleRunning = false;
  }
}

export function startQuestReminders(client: Client, openai: OpenAI | null): void {
  setInterval(() => {
    void runQuestReminderCycle(client, openai).catch(err => logger.error({ err }, "Quest reminder cycle failed"));
  }, 30_000);
}

// ── Public commands ───────────────────────────────────────────────────────────

export async function startQuestSetup(message: Message, openai: OpenAI | null): Promise<void> {
  if (!message.channel.isTextBased() || !message.channel.isSendable()) return;
  if (!openai) {
    await message.reply(
      qt(message, "❌ The AI quest creator isn't available right now.\n" +
      "You can still add quests manually with `!quest add <goal>` ➕\n" +
      "Or view your existing quests with `!quest list` 📋", "❌ La création de quêtes par IA est indisponible.\nAjoute une quête avec `!quest add <objectif>` ou consulte `!quest list`."),
    );
    return;
  }

  const profile = getProfile(message.author.id, message.author.displayName ?? message.author.username);
  recordChannel(profile, message);
  persistUser(profile.userId);

  // If the user already has quests, show them instead of re-running setup
  if (profile.quests.length > 0) {
    const embed = buildQuestEmbed(profile, questLanguage(message));
    const questMsg = await message.reply({
      content: qt(message, "✅ You already have quests set up! Here's your current list:", "✅ Tu as déjà des quêtes ! Voici ta liste actuelle :"),
      embeds: [embed],
    });
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
    return;
  }

  const userLang = USER_LANG_NAMES[questLanguage(message)] ?? "English";

  const promptEmbed = new EmbedBuilder()
    .setTitle(qt(message, "🎯 Quest Setup", "🎯 Création des quêtes"))
    .setDescription(
      qt(message, "Tell me your goals and I'll turn them into epic quests!\n\n" +
      "What do you want to accomplish? *(work, fitness, projects, habits, learning...)*\n\n" +
      "You have **5 minutes** to reply. 📝", "Décris tes objectifs et je les transformerai en quêtes !\n\nQue veux-tu accomplir ? Travail, sport, projets, habitudes, apprentissage…\n\nTu as **5 minutes** pour répondre. 📝"),
    )
    .setColor(0x3498db);

  await message.reply({ embeds: [promptEmbed] });

  let collected;
  try {
    collected = await message.channel.awaitMessages({
      filter: m => m.author.id === message.author.id,
      max: 1,
      time: 300_000,
    });
  } catch {
    await message.channel.send(qt(message, "⏰ No response received. Use `!quest start` when you're ready!", "⏰ Aucune réponse reçue. Relance `!quest start` quand tu veux !"));
    return;
  }

  if (collected.size === 0) {
    await message.channel.send(qt(message, "⏰ No response received. Use `!quest start` when you're ready!", "⏰ Aucune réponse reçue. Relance `!quest start` quand tu veux !"));
    return;
  }

  const userInput = collected.first()!.content;
  const waitMsg = await message.channel.send(qt(message, "⚙️ Creating your quests...", "⚙️ Création de tes quêtes…"));

  try {
    const response = await openai.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        {
          role: "system",
          content:
            "You are a practical quest designer. Turn only the goals the user explicitly named into a JSON array of quests.\n" +
            "Return ONLY valid JSON, no markdown, no other text. Max 9 quests.\n" +
            'Schema: [{"title":"<max 40 chars>","description":"<one sentence>","difficulty":"easy|medium|hard","points":10|25|50}]\n' +
            "Make each objective concrete, measurable, and achievable from the user's stated goal. State an observable completion criterion in the description. " +
            "Do not invent a goal, deadline, schedule, health assumption, or personal fact. If the user gave no target, choose a modest first step and keep the wording flexible. " +
            "Do not split one goal into several quests unless the user explicitly gave multiple goals. " +
            "Difficulty must match scope: easy=10pts, medium=25pts, hard=50pts. Set points to that exact value; never award more.\n" +
            `Respond in ${userLang}.`,
        },
        { role: "user", content: userInput },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "[]";
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array in response");

    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("No quests in response");

    profile.quests = parsed.slice(0, 9).map((quest, index) =>
      normalizeGeneratedQuest(quest, index + 1, userInput, questLanguage(message)),
    );

    persistUser(profile.userId);

    const questEmbed = buildQuestEmbed(profile, questLanguage(message));
    const questMsg = await waitMsg.edit({ content: "", embeds: [questEmbed] });

    for (let i = 0; i < profile.quests.length; i++) {
      await questMsg.react(QUEST_NUMS[i]!).catch(() => null);
    }

    attachReactionCollector(questMsg, profile, message.channel as TextChannel);

    const modeMsg = await message.channel.send(
      qt(message, `⚡ Last step — choose your reminder style. You can receive up to ${MAX_WEEKLY_QUEST_REMINDERS} reminders per week, at varied times.\n` +
      "🔥 **Brutal accountability** — no excuses, no mercy, straight talk\n" +
      "💬 **Friendly nudges** — supportive and encouraging", `⚡ Dernière étape — choisis le style de tes rappels. Tu peux en recevoir jusqu’à ${MAX_WEEKLY_QUEST_REMINDERS} par semaine, à des horaires variables.\n🔥 **Mode exigeant** — direct, sans excuses\n💬 **Mode bienveillant** — encourageant et positif`),
    );
    await modeMsg.react("🔥").catch(() => null);
    await modeMsg.react("💬").catch(() => null);

    const modeCollected = await modeMsg.awaitReactions({
      filter: (r: MessageReaction, u: User) => ["🔥", "💬"].includes(r.emoji.name ?? "") && u.id === message.author.id,
      max: 1,
      time: 30_000,
    }).catch(() => null);

    const picked = modeCollected?.first()?.emoji?.name;
    profile.bullying = picked === "🔥";
    persistUser(profile.userId);

    await modeMsg.edit(
      profile.bullying
        ? qt(message, "🔥 **Brutal mode set.** Expect zero sugar-coating when you're slacking.", "🔥 **Mode exigeant activé.** Les rappels seront directs.")
        : qt(message, "💬 **Friendly mode set.** I'll keep it supportive.", "💬 **Mode bienveillant activé.** Je resterai encourageant."),
    ).catch(() => null);

  } catch (err) {
    logger.error({ err }, "Quest setup error");
    await waitMsg.edit(qt(message, "❌ Failed to create quests. Try again with `!quest start`.", "❌ Impossible de créer les quêtes. Réessaie avec `!quest start`."));
  }
}

export async function setReminderChannel(message: Message): Promise<void> {
  if (!message.guildId) {
    await message.reply(qt(message, "❌ This command must be used in a server channel, not in DMs.", "❌ Cette commande doit être utilisée dans un salon de serveur, pas en privé."));
    return;
  }

  const profile = getProfile(message.author.id, message.author.displayName ?? message.author.username);
  profile.notifyChannelId = message.channelId;
  profile.notifyGuildId = message.guildId;
  delete profile.remindersDisabled;
  persistUser(profile.userId);

  const pending = profile.quests.filter(q => !q.completed).length;
  const tip = profile.quests.length === 0
    ? qt(message, "\n💡 No quests yet — use `!quest start` to set your goals.", "\n💡 Aucune quête : utilise `!quest start` pour définir tes objectifs.")
    : "";

  await message.reply(
    qt(message, `✅ Reminders will be sent here → <#${message.channelId}>\n` +
    `⏰ **Schedule:** up to ${MAX_WEEKLY_QUEST_REMINDERS} reminders per week at varied days and times.\n` +
    `📋 **Pending:** ${pending} quest${pending !== 1 ? "s" : ""}${tip}`, `✅ Les rappels seront envoyés ici → <#${message.channelId}>\n⏰ **Fréquence :** jusqu’à ${MAX_WEEKLY_QUEST_REMINDERS} rappels par semaine à des jours et heures variables.\n📋 **À terminer :** ${pending} quête(s)${tip}`),
  );
}

export async function markAllQuestsDone(message: Message): Promise<void> {
  const profile = getProfile(message.author.id, message.author.displayName ?? message.author.username);
  const pending = profile.quests.filter(q => !q.completed);

  if (pending.length === 0) {
    await message.reply(qt(message, "✅ All quests are already completed!", "✅ Toutes les quêtes sont déjà terminées !"));
    return;
  }

  const confirmMsg = await message.reply(
    qt(message, `⚡ Mark all **${pending.length} remaining quest${pending.length > 1 ? "s" : ""}** as done? React ✅ to confirm (10s).`, `⚡ Terminer les **${pending.length} quête(s) restante(s)** ? Réagis ✅ pour confirmer (10 s).`),
  );
  await confirmMsg.react("✅").catch(() => null);

  const collected = await confirmMsg.awaitReactions({
    filter: (r, u) => r.emoji.name === "✅" && u.id === message.author.id,
    max: 1,
    time: 10_000,
  }).catch(() => null);

  if (!collected || collected.size === 0) {
    await confirmMsg.edit(qt(message, "❌ Cancelled.", "❌ Annulé."));
    return;
  }

  let totalGained = 0;
  let leveledUp = false;
  let finalLevel: ReturnType<typeof getLevelInfo> | null = null;

  for (let i = 0; i < profile.quests.length; i++) {
    if (!profile.quests[i]!.completed) {
      totalGained += profile.quests[i]!.points;
      const result = awardQuest(profile, i, questLanguage(message));
      if (result.leveledUp) { leveledUp = true; finalLevel = result.newLevel; }
    }
  }

  persistUser(profile.userId);

  const lvl = getLevelInfo(profile.totalPoints, questLanguage(message));
  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle(leveledUp && finalLevel ? qt(message, `🎊 Level Up! → ${finalLevel.title} (Lv. ${finalLevel.level})`, `🎊 Nouveau niveau ! → ${finalLevel.title} (Niv. ${finalLevel.level})`) : qt(message, "✅ All Quests Completed!", "✅ Toutes les quêtes sont terminées !"))
    .setDescription(qt(message, `**${pending.length} quest${pending.length > 1 ? "s" : ""}** marked done — **+${totalGained} XP**`, `**${pending.length} quête(s)** terminée(s) — **+${totalGained} XP**`))
    .addFields(
      { name: "Total XP", value: `${profile.totalPoints} pts`, inline: true },
      { name: qt(message, "Level", "Niveau"), value: lvl.title, inline: true },
    );

  await confirmMsg.edit({ content: "", embeds: [embed] });
  await message.react("✅").catch(() => null);
}

export async function showQuestStats(message: Message): Promise<void> {
  const profile = getProfile(message.author.id, message.author.displayName ?? message.author.username);

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0]!;

  const days: { label: string; dateStr: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const dateStr = d.toISOString().split("T")[0]!;
    const label = d.toLocaleDateString(questLanguage(message), { weekday: "short", timeZone: "UTC" });
    days.push({ label, dateStr });
  }

  const byDay = new Map<string, { count: number; xp: number }>();
  for (const d of days) byDay.set(d.dateStr, { count: 0, xp: 0 });

  for (const quest of profile.quests) {
    if (!quest.completed || !quest.completedAt) continue;
    const dateStr = quest.completedAt.split("T")[0]!;
    const entry = byDay.get(dateStr);
    if (entry) { entry.count++; entry.xp += quest.points; }
  }

  const maxCount = Math.max(...[...byDay.values()].map(v => v.count), 1);
  const BAR_LEN = 8;

  let chart = "";
  let weekCount = 0;
  let weekXp = 0;

  for (const { label, dateStr } of days) {
    const { count, xp } = byDay.get(dateStr)!;
    const filled = count > 0 ? Math.max(1, Math.round((count / maxCount) * BAR_LEN)) : 0;
    const bar = "█".repeat(filled) + "░".repeat(BAR_LEN - filled);
    const isToday = dateStr === todayStr ? " ◀" : "";
    const detail = count > 0 ? `**${count}** ·${xp} XP` : "—";
    chart += `\`${label}\` \`${bar}\` ${detail}${isToday}\n`;
    weekCount += count; weekXp += xp;
  }

  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (byDay.get(days[i]!.dateStr)!.count > 0) streak++;
    else break;
  }

  const lvl = getLevelInfo(profile.totalPoints, questLanguage(message));
  const nextXp = lvl.next ? `${lvl.next.threshold - profile.totalPoints} XP → ${lvl.next.title}` : qt(message, "Max level!", "Niveau maximum !");

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(qt(message, `📊 Weekly Stats — ${profile.username}`, `📊 Statistiques de la semaine — ${profile.username}`))
    .setDescription(chart)
    .addFields(
      { name: qt(message, "This week", "Cette semaine"), value: qt(message, `${weekCount} quest${weekCount !== 1 ? "s" : ""} · ${weekXp} XP`, `${weekCount} quête(s) · ${weekXp} XP`), inline: true },
      { name: qt(message, "Streak", "Série"), value: streak > 0 ? qt(message, `🔥 ${streak} day${streak > 1 ? "s" : ""}`, `🔥 ${streak} jour(s)`) : "—", inline: true },
      { name: qt(message, "All time", "Au total"), value: qt(message, `${profile.completedCount} quests · ${profile.totalPoints} XP`, `${profile.completedCount} quêtes · ${profile.totalPoints} XP`), inline: true },
    )
    .setFooter({ text: `${qt(message, "Lv.", "Niv.")}${lvl.level} ${lvl.title} — ${nextXp}` });

  await message.reply({ embeds: [embed] });
}

export async function setSchedule(message: Message, input: string): Promise<void> {
  const explanation = qt(
    message,
    `⏰ Quest reminders now run automatically on up to ${MAX_WEEKLY_QUEST_REMINDERS} varied days and times per week. Fixed hours are no longer used. Use ❌ on a reminder to stop them, or \`!quest remind\` in a server channel to enable them again.`,
    `⏰ Les rappels de quêtes sont désormais programmés automatiquement, jusqu’à ${MAX_WEEKLY_QUEST_REMINDERS} jours et heures variables par semaine. Les horaires fixes ne sont plus utilisés. Utilise ❌ sur un rappel pour les arrêter, ou \`!quest remind\` dans un salon serveur pour les réactiver.`,
  );
  await message.reply(explanation);
}

export function buildQuestCommandHelp(language: string, prefix = "!"): string {
  if (language === "fr") {
    return `📋 **Commandes de quêtes**\n\`${prefix}quest start\` · \`${prefix}quest add <objectif>\` · \`${prefix}quest list\`\n\`${prefix}quest done <N|all>\` · \`${prefix}quest negotiate\` · \`${prefix}quest profile\` · \`${prefix}quest stats\`\n\`${prefix}quest remind\` · \`${prefix}quest bully on|off\` · \`${prefix}quest reset\`\nLes rappels sont irréguliers, jusqu’à trois par semaine.`;
  }
  return `📋 **Quest commands**\n\`${prefix}quest start\` · \`${prefix}quest add <goal>\` · \`${prefix}quest list\`\n\`${prefix}quest done <N|all>\` · \`${prefix}quest negotiate\` · \`${prefix}quest profile\` · \`${prefix}quest stats\`\n\`${prefix}quest remind\` · \`${prefix}quest bully on|off\` · \`${prefix}quest reset\`\nReminders are irregular, up to three per week.`;
}

export async function addQuestWithCoach(message: Message, objective: string, openai: OpenAI | null): Promise<void> {
  if (!objective.trim()) {
    await message.reply(qt(message, "❓ Usage: `!quest add <your goal>` — e.g. `!quest add Run 5km three times a week`", "❓ Utilisation : `!quest add <objectif>` — par exemple `!quest add Courir 5 km trois fois par semaine`"));
    return;
  }

  if (!message.channel.isTextBased() || !message.channel.isSendable()) return;
  const profile = getProfile(message.author.id, message.author.displayName ?? message.author.username);
  recordChannel(profile, message);

  if (profile.quests.length >= 9) {
    await message.reply(qt(message, "❌ You already have 9 quests (max). Complete or reset some before adding more.", "❌ Tu as déjà 9 quêtes (maximum). Termine ou réinitialise des quêtes avant d’en ajouter."));
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
    persistUser(profile.userId);
    const embed = buildQuestEmbed(profile, questLanguage(message));
    await message.reply({ content: qt(message, `✅ Quest added: **${quest.title}** (+${quest.points} XP)`, `✅ Quête ajoutée : **${quest.title}** (+${quest.points} XP)`), embeds: [embed] });
    return;
  }

  const thinkMsg = await message.channel.send(qt(message, "🤔 One question before I add this...", "🤔 Une question avant d’ajouter cette quête…"));
  const userLangAdd = USER_LANG_NAMES[questLanguage(message)] ?? "English";

  try {
    const qRes = await openai.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        {
          role: "system",
          content:
            "You are a practical goal-setting coach. The user wants to add one personal goal. " +
            "Ask ONE short, useful question that makes the goal measurable or clarifies the user's own target. " +
            "Do not pressure them to share sensitive personal details or invent a deadline. " +
            `One sentence only. No preamble, no label. Respond in ${userLangAdd}.`,
        },
        { role: "user", content: `Goal: ${objective}` },
      ],
      temperature: 0.8,
      max_tokens: 80,
    });

    const question = qRes.choices[0]?.message?.content?.trim() ?? qt(message, "What's your target timeline for this?", "Dans quel délai souhaites-tu atteindre cet objectif ?");
    await thinkMsg.edit(qt(message, `💬 **${question}** *(5 minutes to answer — or ignore and I'll use the goal as-is)*`, `💬 **${question}** *(5 minutes pour répondre — sinon je garde l’objectif tel quel)*`));

    const answered = await message.channel.awaitMessages({
      filter: m => m.author.id === message.author.id,
      max: 1,
      time: 300_000,
    }).catch(() => null);

    const answer = answered && answered.size > 0 ? answered.first()!.content : "";

    const questRes = await openai.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        {
          role: "system",
          content:
            "Create ONE concrete, measurable, achievable quest using only the user's stated goal and answer. Return ONLY valid JSON, no other text, no markdown.\n" +
            'Schema: {"title":"<max 40 chars>","description":"<one sentence>","difficulty":"easy|medium|hard","points":10|25|50}\n' +
            "Description must say what observable result completes the quest. Do not invent schedules, deadlines, health facts, or extra goals. " +
            "Difficulty must match scope: easy=10pts, medium=25pts, hard=50pts; points must be exact.\n" +
            `Respond in ${userLangAdd}.`,
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

    const parsed: unknown = JSON.parse(jsonMatch[0]);
    const quest = normalizeGeneratedQuest(parsed, profile.quests.length + 1, objective, questLanguage(message));

    profile.quests.push(quest);
    persistUser(profile.userId);

    await thinkMsg.edit(
      qt(message, `✅ Quest added: **${quest.title}** — ${DIFF_EMOJI[quest.difficulty] ?? "⬜"} ${quest.difficulty}, +${quest.points} XP`, `✅ Quête ajoutée : **${quest.title}** — ${DIFF_EMOJI[quest.difficulty] ?? "⬜"} ${{ easy: "facile", medium: "moyenne", hard: "difficile" }[quest.difficulty]}, +${quest.points} XP`),
    ).catch(() => null);

    const listEmbed = buildQuestEmbed(profile, questLanguage(message));
    const questMsg = await message.channel.send({ embeds: [listEmbed] });
    const newIdx = profile.quests.findIndex(q => q.id === quest.id);
    if (newIdx >= 0 && QUEST_NUMS[newIdx]) {
      await questMsg.react(QUEST_NUMS[newIdx]!).catch(() => null);
    }
    attachReactionCollector(questMsg, profile, message.channel as TextChannel);

  } catch (err) {
    logger.error({ err }, "Quest add error");
    await thinkMsg.edit(qt(message, "❌ Failed to add quest. Try again.", "❌ Impossible d’ajouter la quête. Réessaie.")).catch(() => null);
  }
}

export async function showQuestList(message: Message): Promise<void> {
  const profile = getProfile(message.author.id, message.author.displayName ?? message.author.username);
  recordChannel(profile, message);
  persistUser(profile.userId);

  const embed = buildQuestEmbed(profile, questLanguage(message));
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
    await message.reply(qt(message, `❌ Invalid number. Use \`!quest done <1-${profile.quests.length}>\`.`, `❌ Numéro invalide. Utilise \`!quest done <1-${profile.quests.length}>\`.`));
    return;
  }

  const quest = profile.quests[idx]!;
  if (quest.completed) {
    await message.reply(qt(message, `✅ **${quest.title}** is already completed!`, `✅ **${quest.title}** est déjà terminée !`));
    return;
  }

  const { leveledUp, newLevel } = awardQuest(profile, idx, questLanguage(message));
  persistUser(profile.userId);

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setDescription(qt(message, `✅ **${quest.title}** completed! +${quest.points} XP`, `✅ **${quest.title}** terminée ! +${quest.points} XP`))
    .addFields(
      { name: qt(message, "Level", "Niveau"), value: newLevel.title, inline: true },
      { name: "Total XP", value: `${profile.totalPoints} pts`, inline: true },
    );

  if (leveledUp) embed.setTitle(qt(message, `🎊 Level Up! → ${newLevel.title} (Lv. ${newLevel.level})`, `🎊 Nouveau niveau ! → ${newLevel.title} (Niv. ${newLevel.level})`));

  await message.reply({ embeds: [embed] });
}

export async function showQuestProfile(message: Message): Promise<void> {
  const profile = getProfile(message.author.id, message.author.displayName ?? message.author.username);
  recordChannel(profile, message);
  persistUser(profile.userId);

  const lvl = getLevelInfo(profile.totalPoints, questLanguage(message));
  const active = profile.quests.filter(q => !q.completed).length;

  const embed = new EmbedBuilder()
    .setTitle(qt(message, `👤 ${profile.username}'s Profile`, `👤 Profil de ${profile.username}`))
    .setColor(0x9b59b6)
    .addFields(
      { name: qt(message, "🏅 Level", "🏅 Niveau"), value: `${lvl.title} (${qt(message, "Lv.", "Niv.")} ${lvl.level})`, inline: true },
      { name: "⚡ Total XP", value: `${profile.totalPoints} pts`, inline: true },
      { name: qt(message, "✅ Completed", "✅ Terminées"), value: qt(message, `${profile.completedCount} quests`, `${profile.completedCount} quêtes`), inline: true },
      { name: qt(message, "📋 Active", "📋 Actives"), value: qt(message, `${active} quests`, `${active} quêtes`), inline: true },
      { name: qt(message, "📅 Since", "📅 Depuis"), value: new Date(profile.createdAt).toLocaleDateString(questLanguage(message)), inline: true },
      { name: qt(message, "🔔 Reminders", "🔔 Rappels"), value: profile.remindersDisabled
        ? qt(message, "Disabled — use `!quest remind` to re-enable", "Désactivés — utilise `!quest remind` pour les réactiver")
        : profile.notifyChannelId
          ? qt(message, `Active (up to ${MAX_WEEKLY_QUEST_REMINDERS} per week, varied times)`, `Actifs (jusqu’à ${MAX_WEEKLY_QUEST_REMINDERS} par semaine, horaires variables)`)
          : qt(message, "Not set — use any `!quest` command in a server channel", "Non configurés — utilise une commande `!quest` dans un salon du serveur"), inline: false },
      { name: "Mode", value: profile.bullying ? qt(message, "🔥 Bully mode — ON", "🔥 Mode exigeant activé") : qt(message, "💬 Normal mode", "💬 Mode bienveillant"), inline: true },
    );

  if (lvl.next) {
    const range = lvl.next.threshold - lvl.threshold;
    const progress = Math.min(10, Math.round(((profile.totalPoints - lvl.threshold) / range) * 10));
    const bar = "█".repeat(progress) + "░".repeat(10 - progress);
    embed.setDescription(`\`[${bar}]\` ${profile.totalPoints} / ${lvl.next.threshold} XP → ${lvl.next.title}`);
  } else {
    embed.setDescription(qt(message, "🌌 **Max level reached! You are Transcendent!**", "🌌 **Niveau maximum atteint ! Tu es Transcendant !**"));
  }

  await message.reply({ embeds: [embed] });
}

/** Return a read-only snapshot of a user's quest profile (for external commands). */
export function getUserQuestData(userId: string): {
  totalPoints: number;
  completedCount: number;
  activeCount: number;
  levelTitle: string;
  levelNum: number;
  nextThreshold: number | null;
  progressBar: string;
  bullying: boolean;
  createdAt: string;
  reminderActive: boolean;
  remindersPerWeek: number;
} | null {
  const profile = store[userId];
  if (!profile) return null;
  const lvl = getLevelInfo(profile.totalPoints, questLanguage(profile));
  const active = profile.quests.filter(q => !q.completed).length;
  let bar = "";
  if (lvl.next) {
    const range = lvl.next.threshold - lvl.threshold;
    const progress = Math.min(10, Math.round(((profile.totalPoints - lvl.threshold) / range) * 10));
    bar = "█".repeat(progress) + "░".repeat(10 - progress);
  }
  return {
    totalPoints: profile.totalPoints,
    completedCount: profile.completedCount,
    activeCount: active,
    levelTitle: lvl.title,
    levelNum: lvl.level,
    nextThreshold: lvl.next?.threshold ?? null,
    progressBar: bar,
    bullying: profile.bullying ?? false,
    createdAt: profile.createdAt,
    reminderActive: !!profile.notifyChannelId && !profile.remindersDisabled,
    remindersPerWeek: MAX_WEEKLY_QUEST_REMINDERS,
  };
}

export async function negotiateQuests(message: Message, openai: OpenAI | null): Promise<void> {
  if (!message.channel.isTextBased() || !message.channel.isSendable()) return;
  if (!openai) {
    await message.reply(qt(message, "❌ AI features aren't available right now. GROQ_API_KEY is required for negotiation.", "❌ La négociation par IA est indisponible. GROQ_API_KEY doit être configuré."));
    return;
  }

  const profile = getProfile(message.author.id, message.author.displayName ?? message.author.username);
  recordChannel(profile, message);

  if (profile.quests.length === 0) {
    await message.reply(qt(message, "❌ You don't have any quests yet. Use `!quest start` to create some first.", "❌ Tu n’as pas encore de quêtes. Utilise `!quest start` pour en créer."));
    return;
  }

  const pending = profile.quests.filter(q => !q.completed);
  if (pending.length === 0) {
    await message.reply(qt(message, "✅ All your quests are completed! Use `!quest start` or `!quest add` to create new ones.", "✅ Toutes tes quêtes sont terminées ! Utilise `!quest start` ou `!quest add` pour en créer."));
    return;
  }

  const userLang = USER_LANG_NAMES[questLanguage(message)] ?? "English";
  const userId = message.author.id;

  const questList = pending
    .map((q, i) => `${i + 1}. **${q.title}** (${q.difficulty}, ${q.points} XP) — ${q.description}`)
    .join("\n");

  // ── Round 1: show quests and open the negotiation ────────────────────────────
  const introEmbed = new EmbedBuilder()
    .setTitle(qt(message, "⚔️ Quest Negotiation — Round 1/2", "⚔️ Négociation des quêtes — Tour 1/2"))
    .setColor(0xe67e22)
    .setDescription(
      qt(message, `Here are your active quests:\n\n${questList}\n\n` +
      "Tell me what you'd like to change and **why**. Be specific — which quest(s), what's the problem?\n" +
      "*(You have 5 minutes to reply)*", `Voici tes quêtes actives :\n\n${questList}\n\nExplique ce que tu veux changer et **pourquoi**. Quelle quête et quel problème ?\n*(Tu as 5 minutes pour répondre)*`),
    );
  await message.reply({ embeds: [introEmbed] });

  const waitFilter = (m: Message) => m.author.id === userId;

  // Collect first user message
  let collected1;
  try {
    collected1 = await message.channel.awaitMessages({ filter: waitFilter, max: 1, time: 300_000 });
  } catch {
    await message.channel.send(qt(message, "⏰ Negotiation timed out. Your quests remain unchanged.", "⏰ Négociation expirée. Tes quêtes restent inchangées."));
    return;
  }
  if (collected1.size === 0) {
    await message.channel.send(qt(message, "⏰ No response. Your quests remain unchanged.", "⏰ Aucune réponse. Tes quêtes restent inchangées."));
    return;
  }
  const firstAnswer = collected1.first()!.content;

  // ── Conversation loop — AI decides when it has enough info ──────────────────
  const thinkingMsg = await message.channel.send(qt(message, "💭 Thinking...", "💭 Réflexion en cours…"));

  const currentQuestsJson = JSON.stringify(pending.map(q => ({
    id: q.id,
    title: q.title,
    description: q.description,
    difficulty: q.difficulty,
    points: q.points,
  })));

  const SYSTEM_PROMPT =
    `You are a tough but fair quest negotiator. Your goal is to maintain challenge — NOT to make life easier for the user.\n` +
    `You are in an ongoing conversation. After reading the conversation so far, decide ONE of two things:\n` +
    `1. If you need more information → respond ONLY with JSON: {"action":"followup","question":"<your follow-up question>"}\n` +
    `2. If you have enough to decide → respond ONLY with JSON: {"action":"verdict","verdict":"accept"|"partial"|"reject","message":"<2-4 sentences, direct>","updatedQuests":[{"id":<number>,"title":"<string>","description":"<string>","difficulty":"easy|medium|hard","points":<number>}]}\n\n` +
    `Rules for verdict:\n` +
    `- If the argument is weak, vague, or just "it's too hard" → REJECT\n` +
    `- Only accept if there is a SPECIFIC, LEGITIMATE reason (injury, life event, wrong scope, impossible schedule constraint)\n` +
    `- When accepting: ADJUST quests — keep them genuinely challenging, NEVER reduce XP\n` +
    `- You may accept some and reject others (partial)\n` +
    `- If verdict is reject, updatedQuests must be []\n` +
    `JSON only, no other text. Respond in ${userLang}.`;

  // Accumulate conversation: starts with the user's first answer
  const conversationMessages: { role: "user" | "assistant"; content: string }[] = [
    { role: "user", content: firstAnswer },
  ];

  const MAX_ROUNDS = 10;
  let roundNum = 1;
  let statusMsg = thinkingMsg;

  while (roundNum <= MAX_ROUNDS) {
    // Ask AI: followup or verdict?
    let aiRaw = "";
    try {
      const aiRes = await openai.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: `Current quests:\n${currentQuestsJson}\n\nConversation so far:\n${
              conversationMessages.map((m, i) => `${m.role === "user" ? "User" : "You"} (turn ${i + 1}): "${m.content}"`).join("\n\n")
            }`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });
      aiRaw = aiRes.choices[0]?.message?.content?.trim() ?? "{}";
    } catch (err) {
      logger.error({ err }, "Quest negotiation AI error");
      await statusMsg.edit(qt(message, "❌ AI error. Try again with `!quest negotiate`.", "❌ Erreur de l’IA. Réessaie avec `!quest negotiate`."));
      return;
    }

    const jsonMatch = aiRaw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn({ aiRaw }, "Quest negotiation: no JSON in AI response");
      await statusMsg.edit(qt(message, "❌ Unexpected AI response. Try again with `!quest negotiate`.", "❌ Réponse inattendue de l’IA. Réessaie avec `!quest negotiate`."));
      return;
    }

    let parsed: { action: string; question?: string; verdict?: string; message?: string; updatedQuests?: unknown[] };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      await statusMsg.edit(qt(message, "❌ Unexpected AI response. Try again with `!quest negotiate`.", "❌ Réponse inattendue de l’IA. Réessaie avec `!quest negotiate`."));
      return;
    }

    // ── AI asks a follow-up ───────────────────────────────────────────────────
    if (parsed.action === "followup" && parsed.question) {
      const question = parsed.question;
      conversationMessages.push({ role: "assistant", content: question });

      const followUpEmbed = new EmbedBuilder()
        .setTitle(qt(message, `⚔️ Quest Negotiation — Round ${roundNum + 1}`, `⚔️ Négociation des quêtes — Tour ${roundNum + 1}`))
        .setColor(0xe67e22)
        .setDescription(question + qt(message, "\n\n*(You have 5 minutes to reply)*", "\n\n*(Tu as 5 minutes pour répondre)*"));
      await statusMsg.edit({ content: "", embeds: [followUpEmbed] });

      let nextCollected;
      try {
        nextCollected = await message.channel.awaitMessages({ filter: waitFilter, max: 1, time: 300_000 });
      } catch {
        await message.channel.send(qt(message, "⏰ Negotiation timed out. Your quests remain unchanged.", "⏰ Négociation expirée. Tes quêtes restent inchangées."));
        return;
      }
      if (nextCollected.size === 0) {
        await message.channel.send(qt(message, "⏰ No response. Your quests remain unchanged.", "⏰ Aucune réponse. Tes quêtes restent inchangées."));
        return;
      }

      const userAnswer = nextCollected.first()!.content;
      conversationMessages.push({ role: "user", content: userAnswer });

      statusMsg = await message.channel.send(qt(message, "💭 Thinking...", "💭 Réflexion en cours…"));
      roundNum++;
      continue;
    }

    // ── AI renders a verdict ──────────────────────────────────────────────────
    const result = parsed as {
      action: string;
      verdict: "accept" | "partial" | "reject";
      message: string;
      updatedQuests: Array<{ id: number; title: string; description: string; difficulty: string; points: number }>;
    };

    await statusMsg.edit(qt(message, "⚖️ Evaluating your case...", "⚖️ Évaluation de ta demande…"));

    if (result.verdict === "reject") {
      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle(qt(message, "⚔️ Negotiation Rejected", "⚔️ Négociation refusée"))
        .setDescription(`**${result.message}**\n\n${qt(message, "Your quests remain unchanged.", "Tes quêtes restent inchangées.")}`);
      await statusMsg.edit({ content: "", embeds: [embed] });
      return;
    }

    if (result.updatedQuests && result.updatedQuests.length > 0) {
      for (const updated of result.updatedQuests) {
        const quest = profile.quests.find(q => q.id === updated.id);
        if (!quest) continue;
        quest.title = (updated.title ?? quest.title).slice(0, 40);
        quest.description = updated.description ?? quest.description;
        quest.difficulty = (["easy", "medium", "hard"].includes(updated.difficulty) ? updated.difficulty : quest.difficulty) as "easy" | "medium" | "hard";
        quest.points = typeof updated.points === "number" && updated.points > 0 ? updated.points : quest.points;
      }
      persistUser(profile.userId);
    }

    const verdictLabel = result.verdict === "accept" ? qt(message, "✅ Negotiation Accepted", "✅ Négociation acceptée") : qt(message, "🔶 Partial Renegotiation", "🔶 Renégociation partielle");
    const color = result.verdict === "accept" ? 0x2ecc71 : 0xe67e22;

    const updatedEmbed = buildQuestEmbed(profile, questLanguage(message));
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`⚔️ ${verdictLabel}`)
      .setDescription(`**${result.message}**`);

    await statusMsg.edit({ content: "", embeds: [embed] });
    await message.channel.send({ embeds: [updatedEmbed] });
    return;
  }

  // Safety: max rounds reached — force verdict
  await statusMsg.edit(qt(message, "⚖️ Max rounds reached — rendering final verdict...", "⚖️ Nombre maximal de tours atteint — décision finale en cours…"));
  await message.channel.send(qt(message, "⏰ Max negotiation rounds reached. The negotiator will now make a final decision based on everything you've shared.", "⏰ Nombre maximal de tours atteint. Une décision finale va être prise avec les informations données."));
}

export async function setBullyMode(message: Message, enable: boolean): Promise<void> {
  const profile = getProfile(message.author.id, message.author.displayName ?? message.author.username);
  recordChannel(profile, message);
  profile.bullying = enable;
  persistUser(profile.userId);

  if (enable) {
    await message.reply(
      qt(message, "🔥 **Bully mode activated.** No more gentle nudges — expect straight talk when you're slacking.\n" +
      "*You asked for this. Own it.*", "🔥 **Mode exigeant activé.** Les rappels seront directs.\n*Tu peux revenir au mode bienveillant quand tu veux.*"),
    );
  } else {
    await message.reply(qt(message, "💬 **Normal mode restored.** Reminders will be friendly from now on.", "💬 **Mode bienveillant rétabli.** Les rappels seront encourageants."));
  }
}

export async function resetQuests(message: Message): Promise<void> {
  const confirmMsg = await message.reply(qt(message, "⚠️ Reset ALL your quests and XP? React ✅ to confirm (10s).", "⚠️ Réinitialiser TOUTES tes quêtes et ton XP ? Réagis ✅ pour confirmer (10 s)."));
  await confirmMsg.react("✅").catch(() => null);

  let collected;
  try {
    collected = await confirmMsg.awaitReactions({
      filter: (r, u) => r.emoji.name === "✅" && u.id === message.author.id,
      max: 1,
      time: 10_000,
    });
  } catch {
    await confirmMsg.edit(qt(message, "❌ Reset cancelled.", "❌ Réinitialisation annulée.")).catch(() => null);
    return;
  }

  if (collected.size === 0) {
    await confirmMsg.edit(qt(message, "❌ Reset cancelled.", "❌ Réinitialisation annulée."));
    return;
  }

  const profile = getProfile(message.author.id, message.author.displayName ?? message.author.username);
  profile.quests = [];
  profile.totalPoints = 0;
  profile.completedCount = 0;
  persistUser(profile.userId);

  await confirmMsg.edit(qt(message, "✅ All quests and XP reset. Use `!quest start` to begin fresh!", "✅ Quêtes et XP réinitialisés. Utilise `!quest start` pour repartir de zéro !"));
}
