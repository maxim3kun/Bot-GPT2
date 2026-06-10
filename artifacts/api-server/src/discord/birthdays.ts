import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Client, EmbedBuilder, TextChannel, Message } from "discord.js";
import { logger } from "../lib/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../data");
const DATA_FILE = join(DATA_DIR, "birthdays.json");

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

function loadData(): BirthdayData {
  if (!existsSync(DATA_FILE)) return { birthdays: [], announcementChannelId: null };
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf-8")) as BirthdayData;
  } catch {
    return { birthdays: [], announcementChannelId: null };
  }
}

function saveData(data: BirthdayData): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function parseDate(raw: string): { day: number; month: number } | null {
  const match = raw.match(/^(\d{1,2})[\/\-\.](\d{1,2})$/);
  if (!match) return null;
  const day = parseInt(match[1]!);
  const month = parseInt(match[2]!);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  return { day, month };
}

const MONTH_NAMES_FR = [
  "", "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

const BIRTHDAY_GIFS = [
  "🎂", "🎉", "🎈", "🥳", "🎁", "🎊", "🍰", "✨",
];

// ── Command handler ───────────────────────────────────────────────────────────

export async function handleBirthday(message: Message, args: string[]): Promise<void> {
  const sub = (args[0] ?? "").toLowerCase();

  switch (sub) {
    case "add":
    case "ajouter": {
      const dateArg = args[1];
      if (!dateArg) {
        await message.reply("❌ Usage : `!anniversaire add JJ/MM [@utilisateur]`");
        return;
      }
      const parsed = parseDate(dateArg);
      if (!parsed) {
        await message.reply("❌ Date invalide. Utilise le format `JJ/MM`, ex: `!anniversaire add 25/12`");
        return;
      }

      const target = message.mentions.users.first() ?? message.author;
      const member = message.guild?.members.cache.get(target.id);
      const displayName = member?.displayName ?? target.username;

      const data = loadData();
      const existing = data.birthdays.findIndex(b => b.userId === target.id);
      if (existing !== -1) data.birthdays.splice(existing, 1);
      data.birthdays.push({ userId: target.id, userName: displayName, day: parsed.day, month: parsed.month });
      saveData(data);

      await message.reply(
        `🎂 Anniversaire enregistré ! **${displayName}** — le **${parsed.day} ${MONTH_NAMES_FR[parsed.month]}** 🎉`
      );
      break;
    }

    case "liste":
    case "list": {
      const data = loadData();
      if (data.birthdays.length === 0) {
        await message.reply("📋 Aucun anniversaire enregistré pour l'instant !");
        return;
      }

      const now = new Date();
      const today = { day: now.getDate(), month: now.getMonth() + 1 };

      const sorted = [...data.birthdays].sort((a, b) => {
        const aNext = daysUntil(a.day, a.month);
        const bNext = daysUntil(b.day, b.month);
        return aNext - bNext;
      });

      const lines = sorted.map(b => {
        const isToday = b.day === today.day && b.month === today.month;
        const days = daysUntil(b.day, b.month);
        const badge = isToday ? " 🎉 **AUJOURD'HUI !**" : days === 0 ? " 🎉 **AUJOURD'HUI !**" : ` *(dans ${days} jour${days > 1 ? "s" : ""})*`;
        return `🎂 **${b.userName}** — ${b.day} ${MONTH_NAMES_FR[b.month]}${badge}`;
      });

      const embed = new EmbedBuilder()
        .setTitle("🎂 Anniversaires du serveur")
        .setDescription(lines.join("\n"))
        .setColor(0xff6b9d)
        .setFooter({ text: `${data.birthdays.length} anniversaire${data.birthdays.length > 1 ? "s" : ""} enregistré${data.birthdays.length > 1 ? "s" : ""}` });

      await message.reply({ embeds: [embed] });
      break;
    }

    case "canal":
    case "channel": {
      const channel = message.mentions.channels.first() ?? message.channel;
      const data = loadData();
      data.announcementChannelId = channel.id;
      saveData(data);
      await message.reply(`📢 Les anniversaires seront annoncés dans <#${channel.id}> !`);
      break;
    }

    case "supprimer":
    case "remove":
    case "delete": {
      const target = message.mentions.users.first() ?? message.author;
      const data = loadData();
      const idx = data.birthdays.findIndex(b => b.userId === target.id);
      if (idx === -1) {
        await message.reply("❌ Aucun anniversaire trouvé pour cet utilisateur.");
        return;
      }
      const removed = data.birthdays.splice(idx, 1)[0]!;
      saveData(data);
      await message.reply(`🗑️ Anniversaire de **${removed.userName}** supprimé.`);
      break;
    }

    default: {
      const embed = new EmbedBuilder()
        .setTitle("🎂 Commande anniversaire")
        .setColor(0xff6b9d)
        .setDescription(
          "`!anniversaire add JJ/MM [@user]` — Enregistrer un anniversaire\n" +
          "`!anniversaire liste` — Voir tous les anniversaires\n" +
          "`!anniversaire canal [#salon]` — Définir le salon d'annonce\n" +
          "`!anniversaire supprimer [@user]` — Supprimer un anniversaire"
        );
      await message.reply({ embeds: [embed] });
    }
  }
}

// ── Daily check ───────────────────────────────────────────────────────────────

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

async function checkBirthdays(client: Client): Promise<void> {
  const data = loadData();
  if (!data.announcementChannelId || data.birthdays.length === 0) return;

  const now = new Date();
  const today = { day: now.getDate(), month: now.getMonth() + 1 };

  const todayBirthdays = data.birthdays.filter(
    b => b.day === today.day && b.month === today.month
  );
  if (todayBirthdays.length === 0) return;

  const channel = client.channels.cache.get(data.announcementChannelId);
  if (!channel?.isTextBased()) return;

  for (const b of todayBirthdays) {
    const emoji = BIRTHDAY_GIFS[Math.floor(Math.random() * BIRTHDAY_GIFS.length)];
    const embed = new EmbedBuilder()
      .setTitle(`${emoji} Joyeux Anniversaire !`)
      .setDescription(
        `Toute l'équipe souhaite un très joyeux anniversaire à <@${b.userId}> ! 🎉\n\n` +
        `**${b.userName}**, nous espérons que ta journée est remplie de bonheur ! 🎂`
      )
      .setColor(0xff6b9d);
    await (channel as TextChannel).send({ embeds: [embed] }).catch(err =>
      logger.warn({ err }, "Failed to send birthday message")
    );
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
