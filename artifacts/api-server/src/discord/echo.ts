import { Message } from "discord.js";

const MAX_ECHO = 8;

interface EchoSession {
  channelId: string;
  guildId: string;
  count: number;
}

const echoSessions = new Map<string, EchoSession>();

function sessionKey(guildId: string, channelId: string): string {
  return `${guildId}:${channelId}`;
}

const LOCALE_STRINGS: Record<string, {
  started: (max: number) => string;
  stopped: string;
  noSession: string;
  ended: string;
}> = {
  fr: {
    started: (max) => `🦜 Echo activé — je vais répéter les ${max} prochains messages du salon.`,
    stopped: "🔇 Echo désactivé.",
    noSession: "🤷 Pas d'echo actif dans ce salon.",
    ended: `🔇 Echo terminé — limite de ${MAX_ECHO} messages atteinte.`,
  },
  es: {
    started: (max) => `🦜 Eco activado — voy a repetir los próximos ${max} mensajes del canal.`,
    stopped: "🔇 Eco desactivado.",
    noSession: "🤷 No hay eco activo en este canal.",
    ended: `🔇 Eco terminado — límite de ${MAX_ECHO} mensajes alcanzado.`,
  },
  en: {
    started: (max) => `🦜 Echo on — I'll repeat the next ${max} messages in this channel.`,
    stopped: "🔇 Echo off.",
    noSession: "🤷 No echo active in this channel.",
    ended: `🔇 Echo finished — ${MAX_ECHO} message limit reached.`,
  },
};

function getStrings(locale: string) {
  if (locale.startsWith("fr")) return LOCALE_STRINGS["fr"]!;
  if (locale.startsWith("es")) return LOCALE_STRINGS["es"]!;
  return LOCALE_STRINGS["en"]!;
}

export function startEcho(guildId: string, channelId: string, locale: string): string {
  const s = getStrings(locale);
  const key = sessionKey(guildId, channelId);
  echoSessions.set(key, { channelId, guildId, count: 0 });
  return s.started(MAX_ECHO);
}

export function stopEcho(guildId: string, channelId: string, locale: string): string {
  const s = getStrings(locale);
  const key = sessionKey(guildId, channelId);
  if (!echoSessions.has(key)) return s.noSession;
  echoSessions.delete(key);
  return s.stopped;
}

export function toggleEcho(guildId: string, channelId: string, locale: string): string {
  const key = sessionKey(guildId, channelId);
  if (echoSessions.has(key)) return stopEcho(guildId, channelId, locale);
  return startEcho(guildId, channelId, locale);
}

export function isEchoActive(guildId: string, channelId: string): boolean {
  return echoSessions.has(sessionKey(guildId, channelId));
}

export async function processEchoMessage(message: Message, botId: string): Promise<void> {
  if (!message.guildId) return;
  if (message.author.id === botId) return;
  if (!message.content.trim()) return;

  const key = sessionKey(message.guildId, message.channelId);
  const session = echoSessions.get(key);
  if (!session) return;

  session.count++;

  if (typeof message.channel.send === "function") {
    await (message.channel as { send: (t: string) => Promise<unknown> }).send(message.content);
  }

  if (session.count >= MAX_ECHO) {
    echoSessions.delete(key);
    const locale = message.guild?.preferredLocale ?? "en-US";
    const s = getStrings(locale);
    if (typeof message.channel.send === "function") {
      await (message.channel as { send: (t: string) => Promise<unknown> }).send(s.ended);
    }
  }
}
