import type { Message } from "discord.js";
import type OpenAI from "openai";
import { logger } from "../lib/logger.js";
import { extractNaturalHelpCommand, extractPokemonQuery } from "../lib/ai-functions.js";
import { dispatchAiCommand, handleAiCommandRequest, type CommandOptions } from "./ai-command-dispatch.js";
import { parseAiAction } from "./ai-action-policy.js";
import { RADIO_STATIONS } from "./radio.js";
import type { UserLang } from "./user-lang-store.js";
import type { AiCommandAction } from "./ai-command-tools.js";
import { commandSafety } from "./ai-command-intent.js";

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
  message: Message, text: string, openai: OpenAI | null, language: UserLang, options: CommandOptions = {},
): Promise<boolean> {
  const previous = attempted.get(message);
  if (previous) return previous;
  const request = (async () => {
    const safety = commandSafety(text);
    if (safety === "quoted") return false;
    if (safety === "multiple") return handleAiCommandRequest(message, text, openai, language, options);
    if (extractNaturalHelpCommand(text) === "help") return false;
    const pokemon = extractPokemonQuery(text);
    if (pokemon) {
      await dispatchAiCommand(message, { name: "lookup_pokemon", query: pokemon }, language, openai);
      return true;
    }
    // Domain handlers keep their own limits. No model selection request is needed.
    return handleAiCommandRequest(message, text, openai, language, options);
  })();
  attempted.set(message, request);
  return request;
}
