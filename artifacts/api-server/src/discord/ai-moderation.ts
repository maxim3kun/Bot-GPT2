import type OpenAI from "openai";
import {
  Message,
  PermissionFlagsBits,
  type GuildMember,
} from "discord.js";
import { logger } from "../lib/logger.js";
import { incrementGroqCalls } from "../lib/bot-stats.js";

type ModerationSeverity = "none" | "rude" | "severe";

interface ModerationDecision {
  severity: ModerationSeverity;
  reply: string;
  reactions: string[];
}

interface Escalation {
  count: number;
  lastAt: number;
}

const escalations = new Map<string, Escalation>();
const WINDOW_MS = 10 * 60 * 1000;
const ALLOWED_REACTIONS = new Set(["👍", "👎", "😐", "⚠️", "🤨", "❤️"]);

function parseDecision(content: string): ModerationDecision {
  try {
    const jsonStart = content.indexOf("{");
    const jsonEnd = content.lastIndexOf("}");
    const parsed = JSON.parse(content.slice(jsonStart, jsonEnd + 1)) as Partial<ModerationDecision>;
    const severity = parsed.severity === "severe" || parsed.severity === "rude" ? parsed.severity : "none";
    const reactions = Array.isArray(parsed.reactions)
      ? parsed.reactions.filter((value): value is string => typeof value === "string" && ALLOWED_REACTIONS.has(value)).slice(0, 2)
      : [];
    return {
      severity,
      reply: typeof parsed.reply === "string" ? parsed.reply.trim().slice(0, 1500) : "",
      reactions,
    };
  } catch {
    return { severity: "none", reply: "", reactions: [] };
  }
}

function botCanModerate(message: Message, permission: bigint): boolean {
  const me = message.guild?.members.me;
  return !!me?.permissions.has(permission);
}

function targetCanBeTimedOut(message: Message): message is Message & { member: GuildMember } {
  const member = message.member;
  const me = message.guild?.members.me;
  if (!member || !me) return false;
  if (member.id === message.guild?.ownerId) return false;
  return me.roles.highest.comparePositionTo(member.roles.highest) > 0;
}

async function applySafetyActions(message: Message, decision: ModerationDecision): Promise<void> {
  if (decision.reactions.length > 0) {
    for (const emoji of decision.reactions) {
      await message.react(emoji).catch(() => null);
    }
  }

  // Reactions are only a social cue. They must never prevent the normal AI
  // reply: otherwise a harmless "bonjour" can receive an emoji and then be
  // silently ignored. Only a severe decision is allowed to take over the
  // conversation.
  if (decision.severity !== "severe" || !message.guildId) {
    return;
  }

  const key = `${message.guildId}:${message.author.id}`;
  const now = Date.now();
  const previous = escalations.get(key);
  const escalation: Escalation = previous && now - previous.lastAt < WINDOW_MS
    ? { count: previous.count + 1, lastAt: now }
    : { count: 1, lastAt: now };
  escalations.set(key, escalation);

  if (botCanModerate(message, PermissionFlagsBits.ManageMessages)) {
    await message.delete().catch(() => null);
  }

  if (escalation.count >= 2 && botCanModerate(message, PermissionFlagsBits.ModerateMembers) && targetCanBeTimedOut(message)) {
    const duration = escalation.count >= 3 ? 30 * 60 * 1000 : 10 * 60 * 1000;
    await message.member.timeout(duration, "Repeated severe insult directed at the bot").catch((err) => {
      logger.warn({ err, userId: message.author.id }, "Could not timeout abusive user");
    });
    if (message.channel.isSendable()) {
      await message.channel.send(`⚠️ ${message.author}, merci de respecter les règles. Un timeout de ${duration / 60000} minutes a été appliqué après plusieurs messages graves.`).catch(() => null);
    }
    return;
  }

  if (message.channel.isSendable()) {
    await message.channel.send(decision.reply || `⚠️ ${message.author}, merci de rester respectueux. Le message a été retiré.`).catch(() => null);
  }
}

export async function moderateMentionedMessage(message: Message, openai: OpenAI): Promise<boolean> {
  if (!message.guildId || !message.content.trim()) return false;

  try {
    const response = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_completion_tokens: 180,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You are a calm Discord safety classifier. Analyze the user's message, in any language. " +
            "Classify direct insults, harassment, threats, hate, sexual abuse, or repeated hostile baiting toward the bot. " +
            "Return JSON only: {\"severity\":\"none|rude|severe\",\"reply\":\"short neutral response or empty string\",\"reactions\":[\"emoji\"]}. " +
            "A greeting, question, disagreement, joke, confusion, apology, or ordinary profanity not directed as abuse is always severity none. " +
            "Use severe only for serious abuse, threats, hate, sexual harassment, or clearly demeaning insults. " +
            "For rude, a neutral boundary is fine. Never mock, humiliate, threaten, or retaliate. " +
            "Use zero, one, or two reactions from this list only: 👍 👎 😐 ⚠️ 🤨 ❤️. " +
            "Do not treat a reaction as a replacement for an answer. If severe, reply in the user's language and say the bot will not engage with abuse.",
        },
        { role: "user", content: message.content.slice(0, 4000) },
      ],
    });
    incrementGroqCalls();
    const decision = parseDecision(response.choices[0]?.message?.content ?? "");
    if (decision.severity === "none") {
      // Ignore any stray reply/reaction fields from the classifier. A
      // non-aggressive message must continue through the normal AI handler.
      return false;
    }
    await applySafetyActions(message, decision);
    // "rude" can receive a reaction, but still gets a normal AI response.
    // Only "severe" abuse is allowed to suppress that response.
    return decision.severity === "severe";
  } catch (err) {
    logger.warn({ err, guildId: message.guildId }, "AI moderation check failed");
    return false;
  }
}

