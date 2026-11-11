import { ChannelType, PermissionFlagsBits, type Message } from "discord.js";
import type OpenAI from "openai";
import { isFeatureEnabled } from "../bootstrap/feature-flags.js";
import { getGlobalFeatures, getGuildFeatures } from "../lib/features-store.js";
import { logger } from "../lib/logger.js";
import { extractNaturalHelpCommand } from "../lib/ai-functions.js";
import { getConsent, requireConsent } from "./ai-consent.js";
import {
  aiCommandDenial, isMusicAction, needsVoice,
  parseAiCommandTool, type AiCommandAction, type AiCommandExecutor,
} from "./ai-command-tools.js";
import { checkCommandBlock, sendBlockedMessage } from "./command-suggest.js";
import { getPrefix } from "./prefix-store.js";
import { sendHelpPaginator } from "./help-builders.js";
import { handleGameMessageCommand } from "./message-game-commands.js";
import { handleTechnicianCommand } from "./module-technician.js";
import { moduleFallbackMessage, runModuleWithFallback } from "./module-fallback.js";
import { RADIO_STATIONS, customStations, radioStates } from "./radio.js";
import { handleAiMusicCommand } from "./ai-music-commands.js";
import { handleTransportSearch } from "./transport-menu.js";
import { commandSafety, completeAiCommand, selectAiCommand, type CommandParameter } from "./ai-command-intent.js";
import { handlePokemon } from "./pokemon.js";
import type { Language } from "./responses.js";

const activeRequests = new Set<string>();
const activeCommands = new Set<string>();
const seen = new Map<string, number>();
const attempted = new WeakMap<Message, Promise<boolean>>();
const parameters = new Map<string, { promptId: string; expires: number; parameter: CommandParameter }>();
export interface CommandOptions { personaId?: string }
const scopeKey = (m: Message, options: CommandOptions = {}) => JSON.stringify([m.guildId, m.channelId, m.author.id, options.personaId ?? "bot"]);
export function hasAiCommandParameterReply(message: Message, options: CommandOptions = {}) {
  const pending = parameters.get(scopeKey(message, options));
  return Boolean(pending && pending.expires > Date.now() && message.reference?.messageId === pending.promptId);
}
export const knownRadioStations = () => ({ ...RADIO_STATIONS, ...Object.fromEntries(customStations) });
const GAME_FEATURES: Record<string, string> = {
  start_minesweeper: "minesweeper", start_connect4: "connect4", start_geoguessr: "geoguessr",
  start_trivia: "trivia", start_guess_logo: "guesslogo",
};

export function commandExecutor(message: Message, language: Language, openai: OpenAI | null): AiCommandExecutor {
  const french = language === "fr";
  let authorizedVoice: string | null = null;
  const executor: AiCommandExecutor = {
    authorize: async (action) => {
      const block = checkCommandBlock(message.author.id);
      if (block.blocked) {
        await sendBlockedMessage(message, block, getPrefix(message.guildId));
        return false;
      }
      const globalFeatures = getGlobalFeatures();
      const features = message.guildId ? await getGuildFeatures(message.guildId, { failClosed: true }) : globalFeatures;
      const enabled = (name: string) => globalFeatures.find((feature) => feature.name === name)?.enabled === true
        && features.find((feature) => feature.name === name)?.enabled === true;
      const consent = await getConsent(message.author.id) === "accepted";
      const member = message.guild ? await message.guild.members.fetch({ user: message.author.id, force: true }).catch(() => null) : null;
      const bot = message.guild ? await message.guild.members.fetchMe({ force: true }).catch(() => null) : null;
      const channel = message.guild ? await message.guild.channels.fetch(message.channelId, { force: true }).catch(() => null) : message.channel;
      const userPermissions = member && channel && "permissionsFor" in channel ? channel.permissionsFor(member) : null;
      const botPermissions = bot && channel && "permissionsFor" in channel ? channel.permissionsFor(bot) : null;
      const send = channel?.isThread() ? PermissionFlagsBits.SendMessagesInThreads : PermissionFlagsBits.SendMessages;
      const voice = member?.voice.channel;
      const userVoice = voice && member ? voice.permissionsFor(member) : null;
      const botVoice = voice && bot ? voice.permissionsFor(bot) : null;
      const source = action.name === "play_radio" ? "radio" : action.name === "play_youtube" || action.name === "search_youtube" ? "youtube"
        : message.guildId && radioStates.get(message.guildId)?.stationKey ? "radio"
        : message.guildId && radioStates.get(message.guildId)?.youtubeTitle ? "youtube" : null;
      const featureEnabled = action.name.startsWith("start_") ? isFeatureEnabled("games") && (!GAME_FEATURES[action.name] || enabled(GAME_FEATURES[action.name]!))
        : isMusicAction(action) ? isFeatureEnabled("voice") && isFeatureEnabled("music") && enabled("music")
          && (!source || enabled(source) && (source !== "radio" || isFeatureEnabled("radio")))
        : action.name === "module_diagnostic" ? isFeatureEnabled("admin") : true;
      const denial = aiCommandDenial(action, {
        blocked: false,
        aiEnabled: isFeatureEnabled("ai") && enabled("ai_chat"),
        featureEnabled,
        consent,
        inGuild: Boolean(message.guild),
        administrator: Boolean(member?.permissions.has(PermissionFlagsBits.ManageGuild)),
        userCanUseChannel: !message.guild || Boolean(userPermissions?.has([
          PermissionFlagsBits.ViewChannel, send,
        ])),
        botCanReply: !message.guild || Boolean(botPermissions?.has([
          PermissionFlagsBits.ViewChannel, send,
          ...(["show_help", "lookup_pokemon", "play_radio", "play_youtube", "search_youtube", "music_queue", "music_current"].includes(action.name)
            || action.name.startsWith("start_") && action.name !== "start_minesweeper" ? [PermissionFlagsBits.EmbedLinks] : []),
          ...(action.name === "start_connect4" ? [PermissionFlagsBits.AddReactions, PermissionFlagsBits.ReadMessageHistory] : []),
          ...(action.name === "start_guess_logo" ? [PermissionFlagsBits.AttachFiles] : []),
        ])),
        voiceAvailable: Boolean(voice && voice.type !== ChannelType.GuildStageVoice
          && (!bot?.voice.channelId || bot.voice.channelId === voice.id)),
        userCanUseVoice: Boolean(userVoice?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect])),
        botCanUseVoice: Boolean(botVoice?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])),
      });
      if (!denial) { authorizedVoice = needsVoice(action) ? voice!.id : null; return true; }
      if (denial === "consent") {
        await requireConsent(message, language);
        return false;
      }
      const reasons: Record<string, [string, string]> = {
        disabled: ["Cette fonction est désactivée.", "This feature is disabled."],
        administrator: ["Le diagnostic est réservé aux administrateurs du serveur.", "Module diagnostics are restricted to server administrators."],
        guild: ["Cette action nécessite un serveur.", "This action requires a server."],
        voice: ["Rejoins un salon vocal disponible ; je ne déplace pas une session audio existante.", "Join an available voice channel; I won't move an existing audio session."],
        permissions: ["Les permissions de l’utilisateur ou du bot ne permettent pas cette action.", "Your permissions or the bot's permissions do not allow this action."],
      };
      await message.reply(`🔒 ${reasons[denial]?.[french ? 0 : 1] ?? (french ? "Action refusée." : "Action denied.")}`);
      return false;
    },
    execute: async (action) => {
      if (needsVoice(action) && (!authorizedVoice || message.member?.voice.channelId !== authorizedVoice)) {
        await message.reply(french ? "Le contexte vocal a changé. Rejoins le salon souhaité et relance ta demande."
          : "The voice context changed. Join the intended channel and request the action again.");
        return;
      }
      const module = isMusicAction(action) ? "music"
        : action.name === "module_diagnostic" ? "admin"
        : ["show_help", "lookup_pokemon", "search_transport"].includes(action.name) ? "other" : "games";
      await runModuleWithFallback(message, module, async () => {
        if (isMusicAction(action)) {
          let expectedVoice = action.name === "search_youtube" ? null : authorizedVoice;
          await handleAiMusicCommand(message, action, language, async () => {
            if (expectedVoice && message.member?.voice.channelId !== expectedVoice) return false;
            const allowed = await executor.authorize(action.name === "search_youtube" ? { name: "play_youtube", query: action.query } : action);
            if (allowed && action.name === "search_youtube") expectedVoice ??= authorizedVoice;
            return allowed;
          });
          return;
        }
        switch (action.name) {
          case "show_help": await sendHelpPaginator(message, language); break;
          case "lookup_pokemon":
            await handlePokemon(action.query, language, opts => message.reply(opts as Parameters<Message["reply"]>[0])); break;
          case "start_minesweeper":
            await handleGameMessageCommand(message, "minesweeper", [action.difficulty], openai, language); break;
          case "start_connect4":
            await handleGameMessageCommand(message, "connect4", ["solo", language], openai, language); break;
          case "start_geoguessr": await handleGameMessageCommand(message, "geo", [action.difficulty], openai, language); break;
          case "start_guess_logo": await handleGameMessageCommand(message, "guesslogo", [action.difficulty], openai, language); break;
          case "start_trivia": await handleGameMessageCommand(message, "trivia", [], openai, language); break;
          case "start_guess_number": await handleGameMessageCommand(message, "guessnumber", [], openai, language); break;
          case "search_transport": {
            let initial = true;
            await handleTransportSearch(message, action, language, getPrefix(message.guildId), undefined, undefined, async () => {
              if (initial) { initial = false; return true; }
              return executor.authorize(action);
            });
            break;
          }
          case "module_diagnostic": await handleTechnicianCommand(message, ["status"]); break;
        }
      }, async () => { await message.reply(moduleFallbackMessage(module, language)); });
    },
  };
  return executor;
}

export async function dispatchAiCommand(message: Message, action: AiCommandAction, language: Language, openai: OpenAI | null): Promise<void> {
  const { name, ...args } = action;
  if (!parseAiCommandTool([{ type: "function", function: { name, arguments: JSON.stringify(args) } }], Object.keys(knownRadioStations()))) {
    await message.reply(language === "fr" ? "Aucune action exécutée : paramètres invalides ou fonction indisponible." : "No action executed: invalid arguments or unavailable function."); return;
  }
  const now = Date.now(), identity = `${message.guildId}:${message.channelId}:${message.author.id}:${message.id}`;
  for (const [id, expires] of seen) if (expires <= now) seen.delete(id);
  if (seen.has(identity)) return;
  if (seen.size >= 2000) { await message.reply(language === "fr" ? "Trop de demandes. Réessaie plus tard." : "Too many requests. Try later."); return; }
  seen.set(identity, now + 300000);
  const key = `${message.guildId ?? message.author.id}:${needsVoice(action) ? "music" : action.name}`;
  if (activeCommands.has(key)) {
    await message.reply(language === "fr"
      ? "Une action de ce type est déjà en cours."
      : "An action of this kind is already running.");
    return;
  }
  activeCommands.add(key);
  try {
    const executor = commandExecutor(message, language, openai);
    if (!await executor.authorize(action)) return;
    // These are ordinary allowlisted actions. Their explicit request and
    // existing AI consent suffice; the handler alone reports the real result.
    await executor.execute(action);
  } finally {
    activeCommands.delete(key);
  }
}

/** Called only for an addressed message, or from !ask/!ia, never for ambient chat. */
export function handleAiCommandRequest(
  message: Message, text: string, openai: OpenAI | null, language: Language, options: CommandOptions = {},
): Promise<boolean> {
  const previous = attempted.get(message); if (previous) return previous;
  const work = runCommandRequest(message, text, openai, language, options); attempted.set(message, work); return work;
}
async function runCommandRequest(message: Message, text: string, openai: OpenAI | null, language: Language, options: CommandOptions): Promise<boolean> {
  // Preserve the existing deterministic help route, without a provider call
  // or new consent prompt for a command that does not send data to an AI.
  if (!commandSafety(text) && extractNaturalHelpCommand(text) === "help") return false;
  const now = Date.now(), scope = scopeKey(message, options);
  for (const [key, pending] of parameters) if (pending.expires <= now) parameters.delete(key);
  let intent = selectAiCommand(text, knownRadioStations());
  if (intent.kind === "none" && hasAiCommandParameterReply(message, options))
    intent = completeAiCommand(parameters.get(scope)!.parameter, text, knownRadioStations());
  if (intent.kind === "none") return false;
  parameters.delete(scope);
  const binding = intent.kind === "clarify" && intent.parameter && parameters.size < 1000
    ? { parameter: intent.parameter, promptId: "", expires: now + 120000 } : undefined;
  if (binding) parameters.set(scope, binding);
  const key = `${message.guildId}:${message.channelId}:${message.author.id}`;
  if (activeRequests.has(key)) {
    if (binding && parameters.get(scope) === binding) parameters.delete(scope);
    await message.reply(language === "fr" ? "Une demande est déjà en cours ici. Réessaie dans un instant." : "A request is already running here. Try again shortly.");
    return true;
  }
  activeRequests.add(key);
  try {
    if (intent.kind === "action") {
      await dispatchAiCommand(message, intent.action, language, openai);
      return true;
    }
    const executor = commandExecutor(message, language, openai);
    // Clarifications use the same base access checks; they never execute part of a request.
    if (!await executor.authorize({ name: "show_help" })) return true;
    const guidance = intent.parameter ? binding
      ? language === "fr" ? " Réponds directement à ce message sous deux minutes, ou reformule la demande complète." : " Reply directly to this message within two minutes, or give the full request."
      : language === "fr" ? " Trop de questions sont ouvertes : reformule la demande complète." : "Too many questions are open: give the full request."
      : "";
    const prompt = await message.reply({ content: (language === "fr" ? `Aucune action exécutée. ${intent.fr}` : `No action executed. ${intent.en}`) + guidance, allowedMentions: { parse: [] } });
    if (binding && parameters.get(scope) === binding && prompt.id) binding.promptId = prompt.id;
    return true;
  } catch (error) {
    logger.error({ error }, "AI command request failed");
    await message.reply(language === "fr" ? "La demande a échoué ; aucune réussite n’est confirmée." : "The request failed; no success is confirmed.").catch(() => null);
    return true;
  } finally {
    if (binding && !binding.promptId && parameters.get(scope) === binding) parameters.delete(scope);
    activeRequests.delete(key);
  }
}
