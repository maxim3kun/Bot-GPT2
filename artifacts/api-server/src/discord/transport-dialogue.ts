import { PermissionFlagsBits, type Message } from "discord.js";
import { TransportConversation } from "./transport-conversation.js";
import { ItineraryControls } from "./transport-itinerary-controls.js";
import { commandSafety, isTimetableSearch, selectAiCommand } from "./ai-command-intent.js";

export interface DialogueOptions { personaId?: string; continuationOnly?: boolean }
export const travelScope = (message: Pick<Message, "guildId" | "channelId" | "author">, personaId?: string) =>
  JSON.stringify([message.guildId ?? "dm", message.channelId, message.author.id, personaId ?? "bot"]);

async function authorizeTransport(message: Message, language: string): Promise<boolean> {
  const [{ getGlobalFeatures, getGuildFeatures }, { isFeatureEnabled }, { requireConsent },
    { checkCommandBlock, sendBlockedMessage }, { getPrefix }] = await Promise.all([
    import("../lib/features-store.js"), import("../bootstrap/feature-flags.js"), import("./ai-consent.js"),
    import("./command-suggest.js"), import("./prefix-store.js"),
  ]);
  const block = checkCommandBlock(message.author.id);
  if (block.blocked) { await sendBlockedMessage(message, block, getPrefix(message.guildId)); return false; }
  const global = getGlobalFeatures(), guild = message.guildId ? await getGuildFeatures(message.guildId, { failClosed: true }) : global;
  if (!isFeatureEnabled("ai") || !global.some(f => f.name === "ai_chat" && f.enabled) || !guild.some(f => f.name === "ai_chat" && f.enabled)) {
    await message.reply({ content: language === "fr" ? "Les fonctions IA sont désactivées ici." : "AI features are disabled here.",
      allowedMentions: { parse: [] } });
    return false;
  }
  const channel = message.guild
    ? await message.guild.channels.fetch(message.channelId, { force: true }).catch(() => null) : message.channel;
  if (!channel) return false;
  if (message.guildId && "permissionsFor" in channel) {
    const me = message.client.user;
    // Refresh roles as well as channel settings when a saved card is clicked.
    const member = await message.guild?.members.fetch({ user: message.author.id, force: true }).catch(() => null);
    const botMember = await message.guild?.members.fetchMe({ force: true }).catch(() => null);
    const user = member && channel.permissionsFor(member), bot = me && botMember && channel.permissionsFor(botMember);
    const send = channel.isThread() ? PermissionFlagsBits.SendMessagesInThreads : PermissionFlagsBits.SendMessages;
    if (!user?.has([PermissionFlagsBits.ViewChannel, send]) || !bot?.has([PermissionFlagsBits.ViewChannel, send])) return false;
  }
  return requireConsent(message, language === "fr" ? "fr" : "en");
}

export function createTransportDialogue(
  service = new TransportConversation(),
  authorize: (message: Message, language: string) => Promise<boolean> = authorizeTransport,
) {
  const attempted = new WeakMap<Message, Map<string, Promise<boolean>>>();
  const cards = new ItineraryControls(service, authorize);
  return async (message: Message, input: string, language: string, options: DialogueOptions = {}): Promise<boolean> => {
    const scope = travelScope(message, options.personaId);
    const existing = attempted.get(message)?.get(scope); if (existing) return existing;
    // Timetables use the existing transport browser; genuine itineraries keep this official planner.
    const command = selectAiCommand(input, {});
    if (commandSafety(input) === "quoted" || isTimetableSearch(input) || command.kind !== "none") {
      if (!options.continuationOnly) { service.clear(scope); cards.invalidate(scope); }
      return false;
    }
    // An ongoing route is not permission to intercept a reply addressed to someone else.
    if (options.continuationOnly && (message.mentions?.users?.some(u => u.id !== message.client.user?.id) ||
      message.mentions?.repliedUser && message.mentions.repliedUser.id !== message.client.user?.id)) return false;
    if (!service.canHandle(scope, input, options.continuationOnly)) {
      if (!options.continuationOnly) { service.clear(scope); cards.invalidate(scope); }
      return false;
    }
    const work = (async () => {
      try {
        if (!await authorize(message, language)) { service.clear(scope); cards.invalidate(scope); return true; }
        cards.invalidate(scope);
        if (commandSafety(input) === "multiple") {
          service.clear(scope);
          await message.reply({ content: language === "fr" ? "Demande une seule action à la fois. Aucun trajet ni autre action n’a été lancé."
            : "Request one action at a time. No journey or other action was started.", allowedMentions: { parse: [] } });
          return true;
        }
        if (message.channel.isSendable()) await message.channel.sendTyping().catch(() => undefined);
        const result = await service.reply(scope, input, language, options.continuationOnly);
        if (result?.content) {
          if (result.itinerary) await cards.send(message, scope, result, language);
          else await message.reply({ content: result.content, allowedMentions: { parse: [] } });
        }
      } catch {
        // Consume the intent even if permissions/provider/output fail; never fall through to free generation.
        service.clear(scope);
        cards.invalidate(scope);
        await message.reply({ content: language === "fr"
          ? "Je ne peux pas vérifier ce trajet actuellement. Aucun itinéraire non vérifié ne sera proposé."
          : "I cannot verify this journey right now. I won't provide an unverified route.",
        allowedMentions: { parse: [] } }).catch(() => undefined);
      }
      return true;
    })();
    const map = attempted.get(message) ?? new Map(); map.set(scope, work); attempted.set(message, map);
    return work;
  };
}
export const handleTransportDialogue = createTransportDialogue();
