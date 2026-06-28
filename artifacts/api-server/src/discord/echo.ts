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

const STRINGS = {
  started: `🦜 Echo on — I'll repeat the next ${MAX_ECHO} messages in this channel.`,
  stopped: "🔇 Echo off.",
  noSession: "🤷 No echo active in this channel.",
  ended: `🔇 Echo finished — ${MAX_ECHO} message limit reached.`,
};

export function startEcho(guildId: string, channelId: string): string {
  const key = sessionKey(guildId, channelId);
  echoSessions.set(key, { channelId, guildId, count: 0 });
  return STRINGS.started;
}

export function stopEcho(guildId: string, channelId: string): string {
  const key = sessionKey(guildId, channelId);
  if (!echoSessions.has(key)) return STRINGS.noSession;
  echoSessions.delete(key);
  return STRINGS.stopped;
}

export function toggleEcho(guildId: string, channelId: string): string {
  const key = sessionKey(guildId, channelId);
  if (echoSessions.has(key)) return stopEcho(guildId, channelId);
  return startEcho(guildId, channelId);
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
    if (typeof message.channel.send === "function") {
      await (message.channel as { send: (t: string) => Promise<unknown> }).send(STRINGS.ended);
    }
  }
}
