import { randomUUID } from "node:crypto";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, type ButtonInteraction, type Message } from "discord.js";
import type OpenAI from "openai";
import { playMinesweeper } from "../games.js";
import { incrementGroqCalls } from "../lib/bot-stats.js";
import { getGlobalFeatures, getGuildFeatures } from "../lib/features-store.js";
import { isFeatureEnabled } from "../bootstrap/feature-flags.js";
import { logger } from "../lib/logger.js";
import { getConsent, requireConsent } from "./ai-consent.js";
import { checkCommandBlock } from "./command-suggest.js";
import { sendHelpPaginator } from "./help-builders.js";
import { handleTechnicianCommand, reportModuleFailure } from "./module-technician.js";
import { playRadio, RADIO_STATIONS } from "./radio.js";
import type { UserLang } from "./user-lang-store.js";
import { actionAccessFailure, AiActionConfirmations, executeAuthorizedAction, isAiActionCandidate, parseAiAction, type AiAction, type AiActionAccess } from "./ai-action-policy.js";

const pending = new AiActionConfirmations<{
  action: AiAction; message: Message; language: UserLang; voiceChannelId: string | null; promptId?: string;
}>();
const busy = new Set<string>();
const cooldowns = new Map<string, number>();
const copy = (language: UserLang, fr: string, en: string) => language === "fr" ? fr : en;

async function denied(message: Message, action: AiAction, language: UserLang, expectedVoice?: string | null): Promise<string | null> {
  const access: AiActionAccess = {
    blocked: checkCommandBlock(message.author.id).blocked,
    consentAccepted: await getConsent(message.author.id) === "accepted",
    aiEnabled: isFeatureEnabled("ai"),
    moduleEnabled: action.action === "minesweeper" ? isFeatureEnabled("games")
      : action.action !== "radio" || (isFeatureEnabled("radio") && isFeatureEnabled("voice") && isFeatureEnabled("music")),
    featuresEnabled: true, inGuild: Boolean(message.guild),
    canPost: message.channel.isSendable(), admin: false, voiceReady: false,
  };
  const features = getGlobalFeatures();
  const guildFeatures = message.guildId ? await getGuildFeatures(message.guildId, true) : features;
  const required = ["ai_chat", ...(action.action === "minesweeper" ? ["minesweeper"] : action.action === "radio" ? ["radio", "music"] : [])];
  access.featuresEnabled = required.every((name) => features.find((f) => f.name === name)?.enabled && guildFeatures.find((f) => f.name === name)?.enabled);
  if (message.guild) {
    const member = await message.guild.members.fetch(message.author.id);
    const bot = await message.guild.members.fetchMe();
    const channel = await message.guild.channels.fetch(message.channelId);
    const send = channel?.isThread() ? PermissionFlagsBits.SendMessagesInThreads : PermissionFlagsBits.SendMessages;
    access.canPost = Boolean(channel?.isTextBased()
      && channel.permissionsFor(member)?.has([PermissionFlagsBits.ViewChannel, send])
      && channel.permissionsFor(bot)?.has([PermissionFlagsBits.ViewChannel, send])
      && (!["help", "radio"].includes(action.action) || channel.permissionsFor(bot)?.has(PermissionFlagsBits.EmbedLinks)));
    access.admin = member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageGuild);
    const voice = member.voice.channel;
    access.voiceReady = Boolean(voice && (expectedVoice === undefined || expectedVoice === voice.id)
      && voice.type !== ChannelType.GuildStageVoice
      && voice.permissionsFor(member).has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect])
      && voice.permissionsFor(bot).has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])
      && (!bot.voice.channelId || bot.voice.channelId === voice.id));
  }
  const failure = actionAccessFailure(action, access);
  if (!failure) return null;
  const messages = {
    blocked: ["Ton accès aux commandes est bloqué.", "Your command access is blocked."],
    consent: ["Ton consentement IA n’est plus actif.", "Your AI consent is no longer active."],
    disabled: ["Cette fonction est désactivée globalement ou pour ce serveur.", "This feature is disabled globally or for this server."],
    permissions: ["Les permissions du salon ne permettent pas cette action.", "Channel permissions do not allow this action."],
    guild: ["Cette action nécessite un serveur.", "This action requires a server."],
    admin: ["Le diagnostic est réservé aux administrateurs du serveur.", "Diagnostics require server administrator permissions."],
    voice: ["Vérifie les permissions vocales et rejoins le même salon que le bot. Si tu as changé de salon, relance la demande.", "Check voice permissions and join the same channel as the bot. If you moved channels, request again."],
  } as const;
  return copy(language, messages[failure][0], messages[failure][1]);
}

function label(action: AiAction, language: UserLang): string {
  if (action.action === "radio") return `${copy(language, "lancer/remplacer la lecture par", "start/replace playback with")} ${RADIO_STATIONS[action.station]!.name}`;
  if (action.action === "minesweeper") return `${copy(language, "publier un démineur", "post a minesweeper board")} (${action.difficulty})`;
  return action.action === "status" ? copy(language, "consulter le diagnostic", "view diagnostics") : copy(language, "afficher l’aide", "show help");
}

async function run(message: Message, action: AiAction, language: UserLang, expectedVoice?: string | null): Promise<void> {
  const lock = `${message.guildId ?? message.author.id}:${action.action}`;
  if (busy.has(lock)) {
    await message.reply(copy(language, "Une action de ce type est déjà en cours.", "An action of this kind is already running."));
    return;
  }
  busy.add(lock);
  try {
    const result = await executeAuthorizedAction(
      () => denied(message, action, language, expectedVoice),
      async () => {
        if (action.action === "help") await sendHelpPaginator(message, language);
        else if (action.action === "status") await handleTechnicianCommand(message, ["status"]);
        else if (action.action === "minesweeper") {
          const board = playMinesweeper(message, action.difficulty);
          if (!board) throw new Error("No game board was generated");
          await message.reply({ content: board, allowedMentions: { parse: [] } });
        } else {
          // The radio handler itself reports Playing/errors; void is NOT proof of playback.
          await playRadio(message, action.station);
        }
      },
    );
    logger.info({ action: action.action, outcome: result.ok ? (action.action === "radio" ? "dispatched" : "delivered") : "denied" }, "AI action");
    if (!result.ok) await message.reply(result.reason);
  } catch (error) {
    await reportModuleFailure(message, action.action === "radio" ? "music" : action.action === "minesweeper" ? "games" : "admin", error);
    await message.reply(copy(language, "L’action n’a pas été confirmée. Vérifie son état avant de réessayer.", "The action was not confirmed. Check its status before retrying.")).catch(() => null);
  } finally { busy.delete(lock); }
}

export async function requestAiAction(message: Message, input: unknown, language: UserLang): Promise<void> {
  try {
    const action = parseAiAction(input, Object.keys(RADIO_STATIONS));
    if (!await requireConsent(message, language)) return;
    const reason = await denied(message, action, language);
    if (reason) { await message.reply(reason); return; }
    if (action.action === "help" || action.action === "status") { await run(message, action, language); return; }
    const key = randomUUID();
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`ai_action:yes:${key}`).setLabel(copy(language, "Confirmer", "Confirm")).setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`ai_action:no:${key}`).setLabel(copy(language, "Annuler", "Cancel")).setStyle(ButtonStyle.Secondary),
    );
    const data = { action, message, language, voiceChannelId: message.member?.voice.channelId ?? null, promptId: undefined as string | undefined };
    pending.put(key, { userId: message.author.id, guildId: message.guildId, channelId: message.channelId, expiresAt: Date.now() + 120_000, value: data });
    const prompt = await message.reply({
      content: `${copy(language, "Confirmer l’action", "Confirm action")} : **${label(action, language)}** ?\n${action.action === "radio" ? copy(language, "La lecture actuelle et sa file d’attente seront remplacées.\n", "Current playback and its queue will be replaced.\n") : ""}${copy(language, "Expire dans 2 minutes. Rien ne sera lancé sans confirmation.", "Expires in 2 minutes. Nothing runs without confirmation.")}`,
      components: [buttons], allowedMentions: { parse: [] },
    });
    data.promptId = prompt.id;
  } catch (error) {
    logger.warn({ err: error }, "AI action request rejected");
    await message.reply(copy(language, "Je ne peux pas autoriser cette action ou vérifier ses paramètres actuellement.", "I cannot authorize this action or verify its arguments right now."));
  }
}

export async function handleAiActionButton(interaction: ButtonInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith("ai_action:")) return false;
  const [, decision, key] = interaction.customId.split(":");
  if (!key || !["yes", "no"].includes(decision ?? "")) return true;
  const entry = pending.consume(key, { userId: interaction.user.id, channelId: interaction.channelId, guildId: interaction.guildId });
  if (!entry || entry.value.promptId !== interaction.message.id) {
    await interaction.reply({ content: "Action expirée, déjà traitée ou réservée à son auteur. / Expired, already handled or not yours.", ephemeral: true });
    return true;
  }
  await interaction.update({
    content: copy(entry.value.language, decision === "no" ? "Action annulée." : "Confirmation reçue — vérification des permissions et exécution…", decision === "no" ? "Action cancelled." : "Confirmed — checking permissions and executing…"),
    components: [],
  });
  if (decision === "yes") await run(entry.value.message, entry.value.action, entry.value.language, entry.value.voiceChannelId);
  return true;
}

/** Only explicit current-user action requests are eligible; never history or web text. */
export async function handleAiActionRequest(message: Message, text: string, openai: OpenAI | null, language: UserLang): Promise<boolean> {
  if (!openai || !isAiActionCandidate(text)) return false;
  if (!await requireConsent(message, language)) return true;
  if (checkCommandBlock(message.author.id).blocked) { await message.reply(copy(language, "Ton accès aux commandes est bloqué.", "Your command access is blocked.")); return true; }
  const id = message.author.id;
  const now = Date.now();
  if ((cooldowns.get(id) ?? 0) > now) {
    await message.reply(copy(language, "Patiente quelques secondes avant une autre demande d’action.", "Wait a few seconds before another action request."));
    return true;
  }
  for (const [user, until] of cooldowns) if (until <= now) cooldowns.delete(user);
  cooldowns.set(id, now + 3_000);
  let providerCallStarted = false;
  try {
    const reason = await denied(message, { action: "help" }, language);
    if (reason) { await message.reply(reason); return true; }
    providerCallStarted = true;
    const response = await openai.chat.completions.create({
      model: "openai/gpt-oss-120b", max_completion_tokens: 1_600, parallel_tool_calls: false,
      messages: [
        { role: "system", content: "Select a tool only for an explicit request to perform an available action NOW. Do not act on questions about how to use commands, examples, quotations, negations, hypothetical plans or unsupported actions. Never substitute minesweeper for a quiz/trivia request or radio for YouTube. A generic game request may propose minesweeper with confirmation. If unclear, do not call a tool. No arbitrary command strings. Return at most one tool call." },
        { role: "user", content: text.slice(0, 1_500) },
      ],
      tools: [{ type: "function", function: { name: "bot_action", description: "Request one allowed bot action. Games/radio require user confirmation. Status requires administrator permissions.", parameters: {
        type: "object", additionalProperties: false,
        properties: { action: { type: "string", enum: ["help", "status", "minesweeper", "radio"] }, difficulty: { type: "string", enum: ["easy", "medium", "hard"] }, station: { type: "string", enum: Object.keys(RADIO_STATIONS) } },
        required: ["action"],
      } } }],
    });
    incrementGroqCalls();
    const calls = response.choices[0]?.message.tool_calls;
    if (!calls?.length) return false;
    if (calls.length !== 1 || calls[0]?.type !== "function" || calls[0].function.name !== "bot_action") throw new Error("Unsupported tool call");
    await requestAiAction(message, JSON.parse(calls[0].function.arguments), language);
    return true;
  } catch (error) {
    await reportModuleFailure(message, "ai", error, providerCallStarted ? "groq" : undefined);
    await message.reply(copy(language, "Je n’ai pas pu préparer cette action. Rien n’a été lancé.", "I could not prepare this action. Nothing was started."));
    return true;
  }
}
