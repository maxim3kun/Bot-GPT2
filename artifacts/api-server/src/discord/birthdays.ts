import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Client, EmbedBuilder, TextChannel, Message } from "discord.js";
import { logger } from "../lib/logger.js";
import {
  isDbReady,
  patchUserData,
  getUsersWithBirthday,
  getAllUserDocs,
  upsertGuildDoc,
  getAllGuildDocs,
} from "../lib/db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = join(__dirname, "../../data");
const DATA_FILE = join(DATA_DIR, "birthdays.json");

// ── Types ─────────────────────────────────────────────────────────────────────

interface BirthdayEntry {
  userId: string;
  userName: string;
  day: number;
  month: number;
}

interface BirthdayData {
  birthdays: BirthdayEntry[];
  announcementChannelId: string | null;
}

// ── In-memory store ───────────────────────────────────────────────────────────

const birthdayMap = new Map<string, BirthdayEntry>();
const guildBirthdayChannels = new Map<string, string>(); // guildId → channelId

// ── JSON fallback helpers ─────────────────────────────────────────────────────

function loadFromJson(): BirthdayData {
  if (!existsSync(DATA_FILE)) return { birthdays: [], announcementChannelId: null };
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf-8")) as BirthdayData;
  } catch {
    return { birthdays: [], announcementChannelId: null };
  }
}

function saveToJson(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const birthdays = [...birthdayMap.values()];
  const announcementChannelId = [...guildBirthdayChannels.values()][0] ?? null;
  writeFileSync(DATA_FILE, JSON.stringify({ birthdays, announcementChannelId }, null, 2), "utf-8");
}

// ── Init ──────────────────────────────────────────────────────────────────────

export async function initBirthdayStore(): Promise<void> {
  if (!isDbReady()) {
    const data = loadFromJson();
    for (const b of data.birthdays) birthdayMap.set(b.userId, b);
    if (data.announcementChannelId) guildBirthdayChannels.set("__legacy__", data.announcementChannelId);
    logger.info({ count: birthdayMap.size }, "Birthday store loaded from JSON (no MongoDB)");
    return;
  }

  const users = await getAllUserDocs();
  for (const { data } of users) {
    if (data.birthday && data.discordId) {
      birthdayMap.set(data.discordId, {
        userId: data.discordId,
        userName: data.birthday.userName,
        day: data.birthday.day,
        month: data.birthday.month,
      });
    }
  }

  const guilds = await getAllGuildDocs();
  for (const guild of guilds) {
    if (guild.birthdayChannelId) {
      guildBirthdayChannels.set(guild._id, guild.birthdayChannelId);
    }
  }

  logger.info({ birthdays: birthdayMap.size, channels: guildBirthdayChannels.size }, "Birthday store loaded from MongoDB");
}

// ── Persistence helpers ───────────────────────────────────────────────────────

function persistBirthday(userId: string, entry: BirthdayEntry | null): void {
  if (isDbReady()) {
    if (entry) {
      patchUserData(userId, { birthday: { day: entry.day, month: entry.month, userName: entry.userName } })
        .catch(err => logger.error({ err }, "Failed to persist birthday to MongoDB"));
    } else {
      patchUserData(userId, { birthday: undefined })
        .catch(err => logger.error({ err }, "Failed to remove birthday from MongoDB"));
    }
  } else {
    saveToJson();
  }
}

function persistGuildChannel(guildId: string, channelId: string | null): void {
  if (isDbReady()) {
    upsertGuildDoc(guildId, { birthdayChannelId: channelId })
      .catch(err => logger.error({ err }, "Failed to persist birthday channel to MongoDB"));
  } else {
    saveToJson();
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDate(raw: string): { day: number; month: number } | null {
  const match = raw.match(/^(\d{1,2})[\/\-\.](\d{1,2})$/);
  if (!match) return null;
  const day = parseInt(match[1]!);
  const month = parseInt(match[2]!);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  return { day, month };
}

const MONTH_NAMES_EN = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const BIRTHDAY_GIFS = ["🎂", "🎉", "🎈", "🥳", "🎁", "🎊", "🍰", "✨"];

function daysUntil(day: number, month: number): number {
  const now = new Date();
  const year = now.getFullYear();
  let target = new Date(year, month - 1, day);
  if (target < now && !(target.getDate() === now.getDate() && target.getMonth() === now.getMonth())) {
    target = new Date(year + 1, month - 1, day);
  }
  const diff = Math.floor((target.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
  return diff;
}

// ── Command handler ───────────────────────────────────────────────────────────

export async function handleBirthday(message: Message, args: string[]): Promise<void> {
  const sub = (args[0] ?? "").toLowerCase();

  switch (sub) {
    case "add": {
      const dateArg = args[1];
      if (!dateArg) {
        await message.reply("❌ Usage: `!birthday add DD/MM [@user]`");
        return;
      }
      const parsed = parseDate(dateArg);
      if (!parsed) {
        await message.reply("❌ Invalid date. Use the format `DD/MM`, e.g. `!birthday add 25/12`");
        return;
      }

      const target = message.mentions.users.first() ?? message.author;
      const member = message.guild?.members.cache.get(target.id);
      const displayName = member?.displayName ?? target.username;

      const entry: BirthdayEntry = { userId: target.id, userName: displayName, day: parsed.day, month: parsed.month };
      birthdayMap.set(target.id, entry);
      persistBirthday(target.id, entry);

      await message.reply(
        `🎂 Birthday saved! **${displayName}** — **${MONTH_NAMES_EN[parsed.month]} ${parsed.day}** 🎉`,
      );
      break;
    }

    case "list": {
      if (birthdayMap.size === 0) {
        await message.reply("📋 No birthdays registered yet!");
        return;
      }

      const now = new Date();
      const today = { day: now.getDate(), month: now.getMonth() + 1 };

      const sorted = [...birthdayMap.values()].sort((a, b) => daysUntil(a.day, a.month) - daysUntil(b.day, b.month));

      const lines = sorted.map(b => {
        const isToday = b.day === today.day && b.month === today.month;
        const days = daysUntil(b.day, b.month);
        const badge = isToday || days === 0 ? " 🎉 **TODAY!**" : ` *(in ${days} day${days > 1 ? "s" : ""})*`;
        return `🎂 **${b.userName}** — ${MONTH_NAMES_EN[b.month]} ${b.day}${badge}`;
      });

      const embed = new EmbedBuilder()
        .setTitle("🎂 Server Birthdays")
        .setDescription(lines.join("\n"))
        .setColor(0xff6b9d)
        .setFooter({ text: `${birthdayMap.size} birthday${birthdayMap.size > 1 ? "s" : ""} registered` });

      await message.reply({ embeds: [embed] });
      break;
    }

    case "channel": {
      const channel = message.mentions.channels.first() ?? message.channel;
      const guildId = message.guildId ?? "__legacy__";
      guildBirthdayChannels.set(guildId, channel.id);
      persistGuildChannel(guildId, channel.id);
      await message.reply(`📢 Birthdays will be announced in <#${channel.id}>!`);
      break;
    }

    case "supprimer":
    case "remove":
    case "delete": {
      const target = message.mentions.users.first() ?? message.author;
      const entry = birthdayMap.get(target.id);
      if (!entry) {
        await message.reply("❌ No birthday found for this user.");
        return;
      }
      birthdayMap.delete(target.id);
      persistBirthday(target.id, null);
      await message.reply(`🗑️ Birthday for **${entry.userName}** removed.`);
      break;
    }

    default: {
      const embed = new EmbedBuilder()
        .setTitle("🎂 Birthday Command")
        .setColor(0xff6b9d)
        .setDescription(
          "`!birthday add DD/MM [@user]` — Register a birthday\n" +
          "`!birthday list` — View all birthdays\n" +
          "`!birthday channel [#channel]` — Set the announcement channel\n" +
          "`!birthday remove [@user]` / `supprimer` — Remove a birthday\n" +
          "\nAlias: `!b` works for all subcommands",
        );
      await message.reply({ embeds: [embed] });
    }
  }
}

// ── Daily check ───────────────────────────────────────────────────────────────

async function checkBirthdays(client: Client): Promise<void> {
  if (guildBirthdayChannels.size === 0) return;

  const now = new Date();
  const today = { day: now.getDate(), month: now.getMonth() + 1 };

  let todayBirthdays: BirthdayEntry[];

  if (isDbReady()) {
    const userData = await getUsersWithBirthday(today.day, today.month);
    todayBirthdays = userData
      .filter(u => u.birthday)
      .map(u => ({
        userId: (u.questProfile as { userId?: string } | undefined)?.userId ?? "",
        userName: u.birthday!.userName,
        day: u.birthday!.day,
        month: u.birthday!.month,
      }));
  } else {
    todayBirthdays = [...birthdayMap.values()].filter(
      b => b.day === today.day && b.month === today.month,
    );
  }

  if (todayBirthdays.length === 0) return;

  for (const [, channelId] of guildBirthdayChannels) {
    const channel = client.channels.cache.get(channelId);
    if (!channel?.isTextBased()) continue;

    for (const b of todayBirthdays) {
      const emoji = BIRTHDAY_GIFS[Math.floor(Math.random() * BIRTHDAY_GIFS.length)];
      const embed = new EmbedBuilder()
        .setTitle(`${emoji} Happy Birthday!`)
        .setDescription(
          `The whole team wishes a very happy birthday to <@${b.userId}>! 🎉\n\n` +
          `**${b.userName}**, we hope your day is filled with joy! 🎂`,
        )
        .setColor(0xff6b9d);
      await (channel as TextChannel).send({ embeds: [embed] }).catch(err =>
        logger.warn({ err }, "Failed to send birthday message"),
      );
    }
  }
}

export function startBirthdayScheduler(client: Client): void {
  const scheduleNextCheck = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(9, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const msUntil = next.getTime() - now.getTime();
    setTimeout(async () => {
      await checkBirthdays(client).catch(err => logger.warn({ err }, "Birthday check failed"));
      setInterval(() => checkBirthdays(client).catch(err => logger.warn({ err }, "Birthday check failed")), 24 * 60 * 60 * 1000);
    }, msUntil);
    logger.info({ nextCheck: next.toISOString() }, "Birthday scheduler started");
  };
  scheduleNextCheck();
}
