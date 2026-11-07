import type { Message } from "discord.js";
import type OpenAI from "openai";
import { logger } from "../lib/logger.js";
import { extractNaturalHelpCommand } from "../lib/ai-functions.js";
import { dispatchAiCommand, handleAiCommandRequest } from "./ai-command-dispatch.js";
import { isAiCommandRequest } from "./ai-router.js";
import { isAiActionCandidate, parseAiAction } from "./ai-action-policy.js";
import { extractRadioStationRequest } from "./radio-intent.js";
import { RADIO_STATIONS } from "./radio.js";
import type { UserLang } from "./user-lang-store.js";
import type { AiCommandAction } from "./ai-command-tools.js";

const cooldowns = new Map<string, number>();
// Mentions, personas and !ask share one router. A no-tool response must not
// trigger another provider request when the same message reaches a later path.
const attempted = new WeakMap<Message, Promise<boolean>>();

/** Compatibility boundary for the existing typed callers; never prefix text. */
export async function requestAiAction(message: Message, input: unknown, language: UserLang): Promise<void> {
  try {
    const action = parseAiAction(input, Object.keys(RADIO_STATIONS));
    const command: AiCommandAction = action.action === "help" ? { name: "show_help" }
      : action.action === "status" ? { name: "module_diagnostic" }
      : action.action === "minesweeper" ? { name: "start_minesweeper", difficulty: action.difficulty }
      : { name: "play_radio", station: action.station };
    await dispatchAiCommand(message, command, language, null);
  } catch (error) {
    logger.warn({ err: error }, "AI action request rejected");
    await message.reply(language === "fr"
      ? "Je ne peux pas autoriser cette action ou vérifier ses paramètres actuellement."
      : "I cannot authorize this action or verify its arguments right now.");
  }
}

/** Existing entry point now uses the same closed tools and execution checks. */
export function handleAiActionRequest(
  message: Message, text: string, openai: OpenAI | null, language: UserLang,
): Promise<boolean> {
  const previous = attempted.get(message);
  if (previous) return previous;
  const request = (async () => {
    if (extractNaturalHelpCommand(text) === "help") return false;
    const station = extractRadioStationRequest(text, RADIO_STATIONS);
    if (!station && !isAiCommandRequest(text) && !isAiActionCandidate(text)) return false;
    if (!station) {
      const now = Date.now();
      if ((cooldowns.get(message.author.id) ?? 0) > now) {
        await message.reply(language === "fr"
          ? "Patiente quelques secondes avant une autre demande d’action."
          : "Wait a few seconds before another action request.");
        return true;
      }
      for (const [user, until] of cooldowns) if (until <= now) cooldowns.delete(user);
      cooldowns.set(message.author.id, now + 3_000);
    }
    return handleAiCommandRequest(message, text, openai, language);
  })();
  attempted.set(message, request);
  return request;
}
