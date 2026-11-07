import { ChannelType, PermissionFlagsBits, type Message } from "discord.js";
import type OpenAI from "openai";
import { isFeatureEnabled } from "../bootstrap/feature-flags.js";
import { getGlobalFeatures, getGuildFeatures } from "../lib/features-store.js";
import { incrementGroqCalls } from "../lib/bot-stats.js";
import { logger } from "../lib/logger.js";
import { extractNaturalHelpCommand } from "../lib/ai-functions.js";
import { getConsent, requireConsent } from "./ai-consent.js";
import {
  aiCommandDenial, buildAiCommandTools,
  parseAiCommandTool, type AiCommandAction, type AiCommandExecutor,
} from "./ai-command-tools.js";
import { isAiActionCandidate } from "./ai-action-policy.js";
import { isAiCommandRequest } from "./ai-router.js";
import { checkCommandBlock, sendBlockedMessage } from "./command-suggest.js";
import { getPrefix } from "./prefix-store.js";
import { sendHelpPaginator } from "./help-builders.js";
import { handleGameMessageCommand } from "./message-game-commands.js";
import { handleTechnicianCommand } from "./module-technician.js";
import { moduleFallbackMessage, runModuleWithFallback } from "./module-fallback.js";
import { playRadio, RADIO_STATIONS } from "./radio.js";
import { extractRadioStationRequest } from "./radio-intent.js";
import type { Language } from "./responses.js";

const activeRequests = new Set<string>();
const activeCommands = new Set<string>();

export function commandExecutor(message: Message, language: Language, openai: OpenAI | null): AiCommandExecutor {
  const french = language === "fr";
  return {
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
      const member = message.guild ? await message.guild.members.fetch(message.author.id).catch(() => null) : null;
      const bot = message.guild ? await message.guild.members.fetchMe().catch(() => null) : null;
      const channel = message.guild ? await message.guild.channels.fetch(message.channelId).catch(() => null) : message.channel;
      const userPermissions = member && channel && "permissionsFor" in channel ? channel.permissionsFor(member) : null;
      const botPermissions = bot && channel && "permissionsFor" in channel ? channel.permissionsFor(bot) : null;
      const send = channel?.isThread() ? PermissionFlagsBits.SendMessagesInThreads : PermissionFlagsBits.SendMessages;
      const voice = member?.voice.channel;
      const userVoice = voice && member ? voice.permissionsFor(member) : null;
      const botVoice = voice && bot ? voice.permissionsFor(bot) : null;
      const featureEnabled = action.name === "start_minesweeper"
        ? isFeatureEnabled("games") && enabled("minesweeper")
        : action.name === "start_connect4" ? isFeatureEnabled("games") && enabled("connect4")
        : action.name === "play_radio"
          ? isFeatureEnabled("voice") && isFeatureEnabled("music") && isFeatureEnabled("radio") && enabled("music") && enabled("radio")
          : action.name === "module_diagnostic" ? isFeatureEnabled("admin") : true;
      const denial = aiCommandDenial(action, {
        blocked: false,
        aiEnabled: isFeatureEnabled("ai") && enabled("ai_chat"),
        featureEnabled,
        consent: await getConsent(message.author.id) === "accepted",
        inGuild: Boolean(message.guild),
        administrator: Boolean(member?.permissions.has(PermissionFlagsBits.ManageGuild)),
        userCanUseChannel: !message.guild || Boolean(userPermissions?.has([
          PermissionFlagsBits.ViewChannel, send,
        ])),
        botCanReply: !message.guild || Boolean(botPermissions?.has([
          PermissionFlagsBits.ViewChannel, send,
          ...(["show_help", "play_radio", "start_connect4"].includes(action.name) ? [PermissionFlagsBits.EmbedLinks] : []),
          ...(action.name === "start_connect4" ? [PermissionFlagsBits.AddReactions, PermissionFlagsBits.ReadMessageHistory] : []),
        ])),
        voiceAvailable: Boolean(voice && voice.type !== ChannelType.GuildStageVoice
          && (!bot?.voice.channelId || bot.voice.channelId === voice.id)),
        userCanUseVoice: Boolean(userVoice?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect])),
        botCanUseVoice: Boolean(botVoice?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])),
      });
      if (!denial) return true;
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
      const module = action.name === "play_radio" ? "music"
        : action.name === "module_diagnostic" ? "admin"
        : action.name === "show_help" ? "other" : "games";
      await runModuleWithFallback(message, module, async () => {
        switch (action.name) {
          case "show_help": await sendHelpPaginator(message, language); break;
          case "start_minesweeper":
            await handleGameMessageCommand(message, "minesweeper", [action.difficulty], openai, language); break;
          case "start_connect4":
            await handleGameMessageCommand(message, "connect4", ["solo", language], openai, language); break;
          case "play_radio": await playRadio(message, action.station); break;
          case "module_diagnostic": await handleTechnicianCommand(message, ["status"]); break;
        }
      }, async () => { await message.reply(moduleFallbackMessage(module, language)); });
    },
  };
}

export async function dispatchAiCommand(message: Message, action: AiCommandAction, language: Language, openai: OpenAI | null): Promise<void> {
  const key = `${message.guildId ?? message.author.id}:${action.name}`;
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
export async function handleAiCommandRequest(
  message: Message, text: string, openai: OpenAI | null, language: Language,
): Promise<boolean> {
  // Preserve the existing deterministic help route, without a provider call
  // or new consent prompt for a command that does not send data to an AI.
  if (extractNaturalHelpCommand(text) === "help") return false;
  const station = extractRadioStationRequest(text, RADIO_STATIONS);
  if (!station && !isAiCommandRequest(text) && !isAiActionCandidate(text)) return false;
  const key = `${message.guildId}:${message.channelId}:${message.author.id}`;
  if (activeRequests.has(key)) return true;
  activeRequests.add(key);
  try {
    if (station) {
      await dispatchAiCommand(message, { name: "play_radio", station }, language, openai);
      return true;
    }
    const executor = commandExecutor(message, language, openai);
    // Gate the model call too: no request is sent when AI access is disabled,
    // blocked, missing consent or lacking channel permissions.
    if (!await executor.authorize({ name: "show_help" })) return true;
    if (!openai) {
      await message.reply(language === "fr" ? "Les outils IA ne sont pas configurés." : "AI tools are not configured.");
      return true;
    }
    const result = await openai.chat.completions.create({
      model: "openai/gpt-oss-120b",
      max_completion_tokens: 300,
      tools: buildAiCommandTools(Object.keys(RADIO_STATIONS)),
      tool_choice: "auto",
      parallel_tool_calls: false,
      messages: [
        { role: "system", content: "Select at most one provided tool, only for the user's explicit current request to perform that action NOW. Questions about commands, hypothetical, quoted, negated, multi-action or unsupported requests must not call any tool. A generic game request may select minesweeper, but never substitute it for a specific unsupported game or radio for YouTube. Explicit ordinary requests execute directly under existing AI consent without another confirmation. Never infer permissions. Do not output a command or claim success. Tool execution belongs to the application." },
        { role: "user", content: text.slice(0, 4000) },
      ],
    });
    incrementGroqCalls();
    const calls = result.choices[0]?.message.tool_calls ?? [];
    if (!calls.length) return false; // Questions and ordinary chat keep their existing routes.
    const action = parseAiCommandTool(calls, Object.keys(RADIO_STATIONS));
    if (!action) {
      await message.reply(language === "fr"
        ? "Aucune action exécutée. Je peux afficher l’aide, lancer un démineur ou un Puissance 4, lire une radio connue et consulter le diagnostic administrateur. Demande une seule action précise."
        : "No action was executed. I can show help, start minesweeper or Connect Four, play a known radio, or show administrator diagnostics. Request one specific action.");
      return true;
    }
    await dispatchAiCommand(message, action, language, openai);
    return true;
  } catch (error) {
    logger.error({ error }, "AI command request failed");
    await message.reply(language === "fr" ? "La demande a échoué ; aucune réussite n’est confirmée." : "The request failed; no success is confirmed.").catch(() => null);
    return true;
  } finally {
    activeRequests.delete(key);
  }
}
