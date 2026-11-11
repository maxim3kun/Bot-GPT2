import { PermissionFlagsBits, type Message } from "discord.js";
import { TransportConversation } from "./transport-conversation.js";

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
  if (message.guildId && "permissionsFor" in message.channel) {
    const me = message.client.user;
    const user = message.channel.permissionsFor(message.author), bot = me && message.channel.permissionsFor(me);
    const send = message.channel.isThread() ? PermissionFlagsBits.SendMessagesInThreads : PermissionFlagsBits.SendMessages;
    if (!user?.has([PermissionFlagsBits.ViewChannel, send]) || !bot?.has([PermissionFlagsBits.ViewChannel, send])) return false;
  }
  return requireConsent(message, language === "fr" ? "fr" : "en");
}

export function createTransportDialogue(
  service = new TransportConversation(),
  authorize: (message: Message, language: string) => Promise<boolean> = authorizeTransport,
) {
  const attempted = new WeakMap<Message, Map<string, Promise<boolean>>>();
  return async (message: Message, input: string, language: string, options: DialogueOptions = {}): Promise<boolean> => {
    const scope = travelScope(message, options.personaId);
    const existing = attempted.get(message)?.get(scope); if (existing) return existing;
    // An ongoing route is not permission to intercept a reply addressed to someone else.
    if (options.continuationOnly && (message.mentions?.users?.some(u => u.id !== message.client.user?.id) ||
      message.mentions?.repliedUser && message.mentions.repliedUser.id !== message.client.user?.id)) return false;
    if (!service.canHandle(scope, input, options.continuationOnly)) {
      if (!options.continuationOnly) service.clear(scope);
      return false;
    }
    const work = (async () => {
      try {
        if (!await authorize(message, language)) { service.clear(scope); return true; }
        if (message.channel.isSendable()) await message.channel.sendTyping().catch(() => undefined);
        const result = await service.reply(scope, input, language, options.continuationOnly);
        if (result?.content) await message.reply({ content: result.content, allowedMentions: { parse: [] } });
      } catch {
        // Consume the intent even if permissions/provider/output fail; never fall through to free generation.
        service.clear(scope);
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
