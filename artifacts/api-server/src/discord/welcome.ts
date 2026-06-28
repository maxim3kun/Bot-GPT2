import { EmbedBuilder, GuildMember, Client, TextChannel, Message } from "discord.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { logger } from "../lib/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = join(__dirname, "../../data");
const DATA_FILE = join(DATA_DIR, "welcome.json");

interface WelcomeData {
  channels: Record<string, string>;
  messages: Record<string, string>;
}

function loadData(): WelcomeData {
  if (!existsSync(DATA_FILE)) return { channels: {}, messages: {} };
  try { return JSON.parse(readFileSync(DATA_FILE, "utf-8")) as WelcomeData; }
  catch { return { channels: {}, messages: {} }; }
}

function saveData(data: WelcomeData): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

let _data = loadData();

const LOCALE_STRINGS: Record<string, {
  setDone: (ch: string) => string;
  setMsg: (t: string) => string;
  cleared: string;
  status: (ch: string | null, msg: string | null) => string;
  usage: string;
  noChannel: string;
  adminOnly: string;
  customVars: string;
}> = {
  fr: {
    setDone: (ch) => `✅ Salon de bienvenue défini : ${ch}`,
    setMsg: (t) => `✅ Message de bienvenue personnalisé :\n> ${t}`,
    cleared: "🗑️ Message de bienvenue remis par défaut.",
    status: (ch, msg) =>
      `📋 **Bienvenue**\n• Salon : ${ch ?? "_non défini_"}\n• Message : ${msg ? `\`${msg}\`` : "_défaut_"}`,
    usage: "❓ Usage : `!welcome set #salon` · `!welcome msg <texte>` · `!welcome clear` · `!welcome status`\n\nVariables : `{user}` `{server}` `{count}`",
    noChannel: "❌ Spécifie un salon. Ex: `!welcome set #général`",
    adminOnly: "❌ Commande réservée aux administrateurs.",
    customVars: "Variables disponibles : `{user}` = mention, `{server}` = nom du serveur, `{count}` = nb de membres",
  },
  es: {
    setDone: (ch) => `✅ Canal de bienvenida establecido: ${ch}`,
    setMsg: (t) => `✅ Mensaje de bienvenida personalizado:\n> ${t}`,
    cleared: "🗑️ Mensaje de bienvenida restablecido al predeterminado.",
    status: (ch, msg) =>
      `📋 **Bienvenida**\n• Canal: ${ch ?? "_no definido_"}\n• Mensaje: ${msg ? `\`${msg}\`` : "_predeterminado_"}`,
    usage: "❓ Uso: `!welcome set #canal` · `!welcome msg <texto>` · `!welcome clear` · `!welcome status`\n\nVariables: `{user}` `{server}` `{count}`",
    noChannel: "❌ Especifica un canal. Ej: `!welcome set #general`",
    adminOnly: "❌ Solo administradores pueden usar este comando.",
    customVars: "Variables: `{user}` = mención, `{server}` = nombre del servidor, `{count}` = nº de miembros",
  },
  en: {
    setDone: (ch) => `✅ Welcome channel set to ${ch}`,
    setMsg: (t) => `✅ Custom welcome message set:\n> ${t}`,
    cleared: "🗑️ Welcome message reset to default.",
    status: (ch, msg) =>
      `📋 **Welcome**\n• Channel: ${ch ?? "_not set_"}\n• Message: ${msg ? `\`${msg}\`` : "_default_"}`,
    usage: "❓ Usage: `!welcome set #channel` · `!welcome msg <text>` · `!welcome clear` · `!welcome status`\n\nVariables: `{user}` `{server}` `{count}`",
    noChannel: "❌ Specify a channel. e.g. `!welcome set #general`",
    adminOnly: "❌ Admin-only command.",
    customVars: "Variables: `{user}` = mention, `{server}` = server name, `{count}` = member count",
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

export async function handleWelcomeCommand(
  message: Message,
  args: string[],
): Promise<void> {
  if (!message.guildId) return;
  const guildId = message.guildId;
  const sub = args[0]?.toLowerCase();
  const locale = message.guild?.preferredLocale ?? "en-US";
  const s = getStrings(locale);

  if (sub === "set") {
    if (!isAdmin(message)) { await message.reply(s.adminOnly); return; }
    const channelMention = args[1];
    if (!channelMention) { await message.reply(s.noChannel); return; }
    const channelId = channelMention.replace(/[<#>]/g, "");
    _data.channels[guildId] = channelId;
    saveData(_data);
    await message.reply(s.setDone(`<#${channelId}>`));
    return;
  }

  if (sub === "msg") {
    if (!isAdmin(message)) { await message.reply(s.adminOnly); return; }
    const text = args.slice(1).join(" ").trim();
    if (!text) { await message.reply(s.customVars); return; }
    _data.messages[guildId] = text;
    saveData(_data);
    await message.reply(s.setMsg(text));
    return;
  }

  if (sub === "clear") {
    if (!isAdmin(message)) { await message.reply(s.adminOnly); return; }
    delete _data.messages[guildId];
    saveData(_data);
    await message.reply(s.cleared);
    return;
  }

  if (sub === "status") {
    const chId = _data.channels[guildId];
    const msg  = _data.messages[guildId] ?? null;
    await message.reply(s.status(chId ? `<#${chId}>` : null, msg));
    return;
  }

  await message.reply(s.usage);
}

export async function handleWelcomeSlashSet(
  guildId: string, channelId: string, locale: string,
  reply: (o: unknown) => Promise<unknown>,
): Promise<void> {
  _data.channels[guildId] = channelId;
  saveData(_data);
  const s = getStrings(locale);
  await reply(s.setDone(`<#${channelId}>`));
}

export async function handleWelcomeSlashMsg(
  guildId: string, text: string, locale: string,
  reply: (o: unknown) => Promise<unknown>,
): Promise<void> {
  _data.messages[guildId] = text;
  saveData(_data);
  const s = getStrings(locale);
  await reply(s.setMsg(text));
}

export async function handleWelcomeSlashClear(
  guildId: string, locale: string,
  reply: (o: unknown) => Promise<unknown>,
): Promise<void> {
  delete _data.messages[guildId];
  saveData(_data);
  const s = getStrings(locale);
  await reply(s.cleared);
}

export async function handleWelcomeSlashStatus(
  guildId: string, locale: string,
  reply: (o: unknown) => Promise<unknown>,
): Promise<void> {
  const s = getStrings(locale);
  const chId = _data.channels[guildId];
  const msg  = _data.messages[guildId] ?? null;
  await reply(s.status(chId ? `<#${chId}>` : null, msg));
}

export async function handleMemberJoin(member: GuildMember, client: Client): Promise<void> {
  const guildId = member.guild.id;
  const channelId = _data.channels[guildId];
  if (!channelId) return;

  try {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !(channel instanceof TextChannel)) return;

    const locale = member.guild.preferredLocale ?? "en-US";
    const memberCount = member.guild.memberCount;
    const guildName = member.guild.name;

    const customMsg = _data.messages[guildId];
    if (customMsg) {
      const text = customMsg
        .replace(/\{user\}/g, `<@${member.id}>`)
        .replace(/\{server\}/g, guildName)
        .replace(/\{count\}/g, String(memberCount));
      await channel.send(text);
      return;
    }

    let title: string;
    let desc: string;

    if (locale.startsWith("fr")) {
      title = `👋 Bienvenue sur ${guildName} !`;
      desc = `Salut <@${member.id}> ! Tu es notre **${memberCount}ème membre**. Bonne arrivée parmi nous ! 🎉`;
    } else if (locale.startsWith("es")) {
      title = `👋 ¡Bienvenido a ${guildName}!`;
      desc = `¡Hola <@${member.id}>! Eres nuestro miembro número **${memberCount}**. ¡Que te diviertas! 🎉`;
    } else {
      title = `👋 Welcome to ${guildName}!`;
      desc = `Hey <@${member.id}>! You're our **${memberCount}th member**. Glad to have you here! 🎉`;
    }

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle(title)
      .setDescription(desc)
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (err) {
    logger.error({ err, guildId, channelId }, "Welcome message error");
  }
}
