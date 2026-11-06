import type { Client, Message } from "discord.js";
import type OpenAI from "openai";
import { incrementGroqCalls } from "../lib/bot-stats.js";
import { logger } from "../lib/logger.js";
import { activeBattles, runAiBattle, stoppedBattles } from "./ai-battle.js";
import { requireConsent, resetConsent } from "./ai-consent.js";
import { handleAiMemoryCommand } from "./ai-memory.js";
import { handleAiPersonaCommand } from "./ai-personas.js";
import { isSendable } from "./message-utils.js";
import { USER_LANG_NAMES } from "./user-lang-store.js";
import type { Language } from "./responses.js";

type AnswerAiQuestion = (
  message: Message,
  text: string,
  language: Language,
  prefix: string,
) => Promise<void>;

interface MessageAiCommandContext {
  message: Message;
  command: string | undefined;
  args: string[];
  responseLang: Language;
  guildPrefix: string;
  openai: OpenAI | null;
  client: Client;
  client2: Client | null;
  answerAiQuestion: AnswerAiQuestion;
}

export async function handleMessageAiCommand(context: MessageAiCommandContext): Promise<boolean> {
  const {
    message,
    command,
    args,
    responseLang,
    guildPrefix,
    openai,
    client,
    client2,
    answerAiQuestion,
  } = context;

  switch (command) {
    case "conspiracy": {
      if (!openai) {
        await message.reply("❌ AI features are not configured. Ask a moderator to set it up — use `!mode d'emploi` for instructions.");
        return true;
      }
      if (!await requireConsent(message)) return true;
      try {
        const topic = args.join(" ").trim();
        if (message.channel.isSendable()) await message.channel.sendTyping();
        const prompt = topic
          ? `Generate a short, absurd and funny conspiracy theory about: "${topic}". Under 200 words. Be creative, dramatic, ridiculous. Start directly with the theory.`
          : "Generate a short, absurd and funny random conspiracy theory. Under 200 words. Be creative, dramatic, ridiculous. Start directly with the theory.";
        const response = await openai.chat.completions.create({
          model: "openai/gpt-oss-20b",
          max_completion_tokens: 300,
          messages: [
            { role: "system", content: `You are a dramatic conspiracy theory generator. Always write in ${USER_LANG_NAMES[responseLang]}, regardless of the language of the input. Be creative, funny, absurd — never harmful.` },
            { role: "user", content: prompt },
          ],
        });
        incrementGroqCalls();
        const theory = response.choices[0]?.message?.content ?? "The truth is too dangerous to reveal... 🤫";
        await message.reply(`🕵️ **CONSPIRACY UNLOCKED** 🕵️\n\n${theory}`);
      } catch (err) {
        logger.error({ err }, "Conspiracy error");
        await message.reply("❌ The government blocked this theory. Try again!");
      }
      return true;
    }

    case "ai": {
      const memoryHandled = await handleAiMemoryCommand(message, args);
      if (memoryHandled) return true;
      const subcommand = args.shift()?.toLowerCase();

      if (subcommand === "stop") {
        if (!activeBattles.has(message.channelId)) {
          await message.reply("🤷 No battle running in this channel.");
        } else {
          stoppedBattles.add(message.channelId);
          await message.reply("🛑 Stopping the battle after the current message...");
        }
        return true;
      }

      if (subcommand === "reset") {
        await resetConsent(message.author.id);
        await message.reply(responseLang === "fr"
          ? "♻️ Ton choix IA a été réinitialisé. La prochaine commande IA te redemandera ton accord."
          : "♻️ Your AI preference has been reset. The next AI command will ask for consent again.");
        return true;
      }

      if (subcommand === "enable" || subcommand === "consent") {
        if (await requireConsent(message, responseLang)) {
          await message.reply(responseLang === "fr"
            ? "✅ Les fonctions IA sont activées pour ton compte."
            : "✅ AI features are enabled for your account.");
        }
        return true;
      }

      if (subcommand !== "battle") return true;
      if (!openai) {
        await message.reply("❌ AI features are not configured. Ask a moderator to set it up — use `!mode d'emploi` for instructions.");
        return true;
      }
      if (!await requireConsent(message)) return true;
      if (!client2) {
        await message.reply("❌ The second bot is not configured. Ask a moderator to set it up — use `!mode d'emploi` for instructions.");
        return true;
      }
      if (!isSendable(message.channel)) return true;

      const topic = args.join(" ").trim() || "Is pineapple on pizza acceptable?";
      if (activeBattles.has(message.channelId)) {
        await message.reply("⚔️ A battle is already running! Type `!ai stop` to end it.");
        return true;
      }

      activeBattles.add(message.channelId);
      const bot1Name = client.user?.username ?? "Defender";
      runAiBattle(topic, message.channel, openai, bot1Name, client2)
        .catch(async (err) => {
          logger.error({ err }, "AI battle error");
          await message.reply("❌ The battle crashed unexpectedly!");
        })
        .finally(() => {
          activeBattles.delete(message.channelId);
          stoppedBattles.delete(message.channelId);
        });
      return true;
    }

    case "persona":
      await handleAiPersonaCommand(message, args, openai, responseLang);
      return true;

    case "ask":
    case "ia":
      await answerAiQuestion(message, args.join(" "), responseLang, guildPrefix);
      return true;

    default:
      return false;
  }
}
