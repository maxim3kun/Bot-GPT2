import { EmbedBuilder, Message, User } from "discord.js";

const MAX_ECHO = 8;

interface EchoSession {
  targetId: string;
  channelId: string;
  guildId: string;
  count: number;
}

const echoSessions = new Map<string, EchoSession>();

function sessionKey(guildId: string, channelId: string): string {
  return `${guildId}:${channelId}`;
}

const LOCALE_STRINGS: Record<string, {
  started: (name: string, max: number) => string;
  stopped: string;
  noSession: string;
  noMention: string;
  selfEcho: string;
  botEcho: string;
  ended: (name: string) => string;
}> = {
  fr: {
    started: (name, max) => `🦜 Echo activé sur **${name}** — je vais répéter ses ${max} prochains messages.`,
    stopped: "🔇 Echo désactivé.",
    noSession: "🤷 Pas d'echo actif dans ce salon.",
    noMention: "❓ Mentionne un utilisateur ! Ex: `/echo @quelqu'un`",
    selfEcho: "😅 Tu ne peux pas t'echo toi-même !",
    botEcho: "🤖 Je ne peux pas m'écho moi-même !",
    ended: (name) => `🔇 Echo terminé — j'ai répété **${name}** ${MAX_ECHO} fois.`,
  },
  es: {
    started: (name, max) => `🦜 Echo activado en **${name}** — voy a repetir sus próximos ${max} mensajes.`,
    stopped: "🔇 Echo desactivado.",
    noSession: "🤷 No hay eco activo en este canal.",
    noMention: "❓ ¡Menciona a un usuario! Ej: `/echo @alguien`",
    selfEcho: "😅 ¡No puedes hacerte eco a ti mismo!",
    botEcho: "🤖 ¡No puedo hacerme eco a mí mismo!",
    ended: (name) => `🔇 Eco terminado — repetí a **${name}** ${MAX_ECHO} veces.`,
  },
  en: {
    started: (name, max) => `🦜 Echo started on **${name}** — I'll repeat their next ${max} messages.`,
    stopped: "🔇 Echo stopped.",
    noSession: "🤷 No echo active in this channel.",
    noMention: "❓ Mention a user! e.g. `/echo @someone`",
    selfEcho: "😅 You can't echo yourself!",
    botEcho: "🤖 I can't echo myself!",
    ended: (name) => `🔇 Echo finished — repeated **${name}** ${MAX_ECHO} times.`,
  },
};

function getStrings(locale: string) {
  if (locale.startsWith("fr")) return LOCALE_STRINGS["fr"]!;
  if (locale.startsWith("es")) return LOCALE_STRINGS["es"]!;
  return LOCALE_STRINGS["en"]!;
}

export function startEcho(
  targetUser: User,
  initiatorId: string,
  guildId: string,
  channelId: string,
  botId: string,
  locale: string,
): string {
  const s = getStrings(locale);
  if (targetUser.id === initiatorId) return s.selfEcho;
  if (targetUser.id === botId) return s.botEcho;

  const key = sessionKey(guildId, channelId);
  echoSessions.set(key, {
    targetId: targetUser.id,
    channelId,
    guildId,
    count: 0,
  });

  return s.started(targetUser.displayName, MAX_ECHO);
}

export function stopEcho(guildId: string, channelId: string, locale: string): string {
  const s = getStrings(locale);
  const key = sessionKey(guildId, channelId);
  if (!echoSessions.has(key)) return s.noSession;
  echoSessions.delete(key);
  return s.stopped;
}

export async function processEchoMessage(message: Message): Promise<void> {
  if (!message.guildId) return;
  const key = sessionKey(message.guildId, message.channelId);
  const session = echoSessions.get(key);
  if (!session) return;
  if (session.targetId !== message.author.id) return;
  if (!message.content.trim()) return;

  session.count++;

  if (typeof message.channel.send === "function") {
    await (message.channel as { send: (t: string) => Promise<unknown> }).send(message.content);
  }

  if (session.count >= MAX_ECHO) {
    echoSessions.delete(key);
    const s = LOCALE_STRINGS["en"]!;
    if (typeof message.channel.send === "function") {
      await (message.channel as { send: (t: string) => Promise<unknown> }).send(
        s.ended(message.author.displayName),
      );
    }
  }
}
