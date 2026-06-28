import { Client, TextChannel, EmbedBuilder, Message } from "discord.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { logger } from "../lib/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = join(__dirname, "../../data");
const DATA_FILE = join(DATA_DIR, "schedule.json");

interface ScheduledMessage {
  id: string;
  guildId: string;
  channelId: string;
  message: string;
  timeHHMM: string;
  repeat: "once" | "daily";
  timezone: string;
  fired: boolean;
  createdBy: string;
}

interface ScheduleData {
  entries: ScheduledMessage[];
}

function loadData(): ScheduleData {
  if (!existsSync(DATA_FILE)) return { entries: [] };
  try { return JSON.parse(readFileSync(DATA_FILE, "utf-8")) as ScheduleData; }
  catch { return { entries: [] }; }
}

function saveData(data: ScheduleData): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

let _data = loadData();

function makeId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

const LOCALE_STRINGS: Record<string, {
  noTime: string;
  badTime: string;
  noChannel: string;
  noMessage: string;
  scheduled: (id: string, time: string, repeat: string, ch: string) => string;
  listHeader: string;
  listEmpty: string;
  listItem: (entry: ScheduledMessage) => string;
  cancelDone: (id: string) => string;
  cancelNotFound: string;
  adminOnly: string;
  usage: string;
  once: string;
  daily: string;
}> = {
  fr: {
    noTime: "❌ Spécifie l'heure au format `HH:MM`. Ex: `!schedule set 18:00 #général Bonne soirée !`",
    badTime: "❌ Format d'heure invalide. Utilise `HH:MM` (ex: `09:30`).",
    noChannel: "❌ Spécifie un salon. Ex: `!schedule set 18:00 #général Message`",
    noMessage: "❌ Écris un message à envoyer.",
    scheduled: (id, time, repeat, ch) => `✅ Message planifié — ID: \`${id}\`\n• Heure : **${time}**\n• Salon : ${ch}\n• Répétition : **${repeat}**`,
    listHeader: "📅 **Messages planifiés**",
    listEmpty: "📭 Aucun message planifié.",
    listItem: (e) => `• \`${e.id}\` — **${e.timeHHMM}** dans <#${e.channelId}> (${e.repeat === "daily" ? "quotidien" : "une fois"}) — _${e.message.slice(0, 40)}${e.message.length > 40 ? "…" : ""}_`,
    cancelDone: (id) => `🗑️ Message \`${id}\` annulé.`,
    cancelNotFound: "❌ ID introuvable.",
    adminOnly: "❌ Commande réservée aux administrateurs.",
    usage: "❓ Usage :\n`!schedule set HH:MM #salon <message>` — planifier (une fois)\n`!schedule daily HH:MM #salon <message>` — planifier (chaque jour)\n`!schedule list` — voir les planifiés\n`!schedule cancel <ID>` — annuler",
    once: "une fois",
    daily: "quotidien",
  },
  es: {
    noTime: "❌ Especifica la hora en formato `HH:MM`. Ej: `!schedule set 18:00 #general ¡Buenas noches!`",
    badTime: "❌ Formato de hora inválido. Usa `HH:MM` (ej: `09:30`).",
    noChannel: "❌ Especifica un canal. Ej: `!schedule set 18:00 #general Mensaje`",
    noMessage: "❌ Escribe un mensaje para enviar.",
    scheduled: (id, time, repeat, ch) => `✅ Mensaje programado — ID: \`${id}\`\n• Hora: **${time}**\n• Canal: ${ch}\n• Repetición: **${repeat}**`,
    listHeader: "📅 **Mensajes programados**",
    listEmpty: "📭 No hay mensajes programados.",
    listItem: (e) => `• \`${e.id}\` — **${e.timeHHMM}** en <#${e.channelId}> (${e.repeat === "daily" ? "diario" : "una vez"}) — _${e.message.slice(0, 40)}${e.message.length > 40 ? "…" : ""}_`,
    cancelDone: (id) => `🗑️ Mensaje \`${id}\` cancelado.`,
    cancelNotFound: "❌ ID no encontrado.",
    adminOnly: "❌ Solo administradores pueden usar este comando.",
    usage: "❓ Uso:\n`!schedule set HH:MM #canal <mensaje>` — programar (una vez)\n`!schedule daily HH:MM #canal <mensaje>` — programar (cada día)\n`!schedule list` — ver programados\n`!schedule cancel <ID>` — cancelar",
    once: "una vez",
    daily: "diario",
  },
  en: {
    noTime: "❌ Specify a time in `HH:MM` format. e.g. `!schedule set 18:00 #general Good evening!`",
    badTime: "❌ Invalid time format. Use `HH:MM` (e.g. `09:30`).",
    noChannel: "❌ Specify a channel. e.g. `!schedule set 18:00 #general Message`",
    noMessage: "❌ Write a message to send.",
    scheduled: (id, time, repeat, ch) => `✅ Message scheduled — ID: \`${id}\`\n• Time: **${time}**\n• Channel: ${ch}\n• Repeat: **${repeat}**`,
    listHeader: "📅 **Scheduled Messages**",
    listEmpty: "📭 No scheduled messages.",
    listItem: (e) => `• \`${e.id}\` — **${e.timeHHMM}** in <#${e.channelId}> (${e.repeat === "daily" ? "daily" : "once"}) — _${e.message.slice(0, 40)}${e.message.length > 40 ? "…" : ""}_`,
    cancelDone: (id) => `🗑️ Message \`${id}\` cancelled.`,
    cancelNotFound: "❌ ID not found.",
    adminOnly: "❌ Admin-only command.",
    usage: "❓ Usage:\n`!schedule set HH:MM #channel <message>` — schedule once\n`!schedule daily HH:MM #channel <message>` — schedule daily\n`!schedule list` — see scheduled\n`!schedule cancel <ID>` — cancel",
    once: "once",
    daily: "daily",
  },
};

function getStrings(locale: string) {
  if (locale.startsWith("fr")) return LOCALE_STRINGS["fr"]!;
  if (locale.startsWith("es")) return LOCALE_STRINGS["es"]!;
  return LOCALE_STRINGS["en"]!;
}

function isAdmin(message: Message): boolean {
  return (
    message.member?.permissions.has(BigInt(0x8)) ||
    message.member?.permissions.has(BigInt(0x20)) ||
    false
  );
}

function parseTime(raw: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!match) return null;
  const h = parseInt(match[1]!);
  const m = parseInt(match[2]!);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

export async function handleScheduleCommand(
  message: Message,
  args: string[],
): Promise<void> {
  if (!message.guildId) return;
  const guildId = message.guildId;
  const locale = message.guild?.preferredLocale ?? "en-US";
  const s = getStrings(locale);
  const sub = args[0]?.toLowerCase();

  if (sub === "set" || sub === "daily") {
    if (!isAdmin(message)) { await message.reply(s.adminOnly); return; }
    const repeat: "once" | "daily" = sub === "daily" ? "daily" : "once";

    const timeRaw = args[1];
    if (!timeRaw) { await message.reply(s.noTime); return; }
    const time = parseTime(timeRaw);
    if (!time) { await message.reply(s.badTime); return; }
    const timeHHMM = `${String(time.h).padStart(2, "0")}:${String(time.m).padStart(2, "0")}`;

    const channelRaw = args[2];
    if (!channelRaw) { await message.reply(s.noChannel); return; }
    const channelId = channelRaw.replace(/[<#>]/g, "");

    const msgText = args.slice(3).join(" ").trim();
    if (!msgText) { await message.reply(s.noMessage); return; }

    const entry: ScheduledMessage = {
      id: makeId(),
      guildId,
      channelId,
      message: msgText,
      timeHHMM,
      repeat,
      timezone: "UTC",
      fired: false,
      createdBy: message.author.id,
    };

    _data.entries.push(entry);
    saveData(_data);

    await message.reply(s.scheduled(entry.id, timeHHMM, repeat === "daily" ? s.daily : s.once, `<#${channelId}>`));
    return;
  }

  if (sub === "list") {
    const guildEntries = _data.entries.filter((e) => e.guildId === guildId);
    if (!guildEntries.length) { await message.reply(s.listEmpty); return; }
    const lines = guildEntries.map((e) => s.listItem(e)).join("\n");
    await message.reply(`${s.listHeader}\n${lines}`);
    return;
  }

  if (sub === "cancel") {
    if (!isAdmin(message)) { await message.reply(s.adminOnly); return; }
    const id = args[1]?.toUpperCase();
    const idx = _data.entries.findIndex((e) => e.id === id && e.guildId === guildId);
    if (idx === -1) { await message.reply(s.cancelNotFound); return; }
    _data.entries.splice(idx, 1);
    saveData(_data);
    await message.reply(s.cancelDone(id!));
    return;
  }

  await message.reply(s.usage);
}

export async function handleScheduleSlash(
  subCmd: string,
  guildId: string,
  interaction: { options: { getString: (k: string, r?: true) => string | null; getChannel: (k: string, r?: true) => { id: string } | null } },
  isAdmin: boolean,
  locale: string,
  reply: (o: unknown) => Promise<unknown>,
): Promise<void> {
  const s = getStrings(locale);

  if (!isAdmin && (subCmd === "once" || subCmd === "daily" || subCmd === "cancel")) {
    await reply(s.adminOnly);
    return;
  }

  if (subCmd === "once" || subCmd === "daily") {
    const repeat: "once" | "daily" = subCmd === "daily" ? "daily" : "once";
    const timeRaw = interaction.options.getString("time", true) ?? "";
    const time = parseTime(timeRaw);
    if (!time) { await reply(s.badTime); return; }
    const timeHHMM = `${String(time.h).padStart(2, "0")}:${String(time.m).padStart(2, "0")}`;
    const channel = interaction.options.getChannel("channel", true);
    if (!channel) { await reply(s.noChannel); return; }
    const msgText = interaction.options.getString("message", true) ?? "";
    if (!msgText) { await reply(s.noMessage); return; }
    const entry: ScheduledMessage = {
      id: makeId(),
      guildId,
      channelId: channel.id,
      message: msgText,
      timeHHMM,
      repeat,
      timezone: "UTC",
      fired: false,
      createdBy: "",
    };
    _data.entries.push(entry);
    saveData(_data);
    await reply(s.scheduled(entry.id, timeHHMM, repeat === "daily" ? s.daily : s.once, `<#${channel.id}>`));
    return;
  }

  if (subCmd === "list") {
    const guildEntries = _data.entries.filter((e) => e.guildId === guildId);
    if (!guildEntries.length) { await reply(s.listEmpty); return; }
    const lines = guildEntries.map((e) => s.listItem(e)).join("\n");
    await reply(`${s.listHeader}\n${lines}`);
    return;
  }

  if (subCmd === "cancel") {
    const id = interaction.options.getString("id", true)?.toUpperCase() ?? "";
    const idx = _data.entries.findIndex((e) => e.id === id && e.guildId === guildId);
    if (idx === -1) { await reply(s.cancelNotFound); return; }
    _data.entries.splice(idx, 1);
    saveData(_data);
    await reply(s.cancelDone(id));
    return;
  }
}

export function startScheduler(client: Client): void {
  setInterval(async () => {
    const now = new Date();
    const hh = String(now.getUTCHours()).padStart(2, "0");
    const mm = String(now.getUTCMinutes()).padStart(2, "0");
    const currentTime = `${hh}:${mm}`;

    const toFire = _data.entries.filter((e) => e.timeHHMM === currentTime && !e.fired);
    if (!toFire.length) return;

    for (const entry of toFire) {
      try {
        const channel = await client.channels.fetch(entry.channelId).catch(() => null);
        if (channel instanceof TextChannel) {
          await channel.send(entry.message);
          logger.info({ id: entry.id, channelId: entry.channelId }, "Scheduled message sent");
        }
        if (entry.repeat === "once") {
          entry.fired = true;
        }
      } catch (err) {
        logger.error({ err, id: entry.id }, "Scheduled message error");
      }
    }

    _data.entries = _data.entries.filter((e) => !e.fired);
    saveData(_data);
  }, 60_000);
}
