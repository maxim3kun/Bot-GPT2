import type { Message } from "discord.js";
import { getEffectiveLanguage } from "./effective-language.js";
import { getPrefix } from "./prefix-store.js";
import { isInVoice, speakText, voiceStop, voiceResume } from "./voice.js";
import { handleBotVoiceSelection } from "./voice-settings.js";

export async function handleVoiceCommand(message: Message, args: string[]): Promise<void> {
  const action = args[0]?.toLowerCase();
  if (action === "stop") return voiceStop(message);
  if (action === "resume") return voiceResume(message);
  if (action !== "say") return handleBotVoiceSelection(message, action);
  const lang = getEffectiveLanguage(message.guildId, message.author.id);
  const prefix = await getPrefix(message.guildId);
  const text = args.slice(1).join(" ").trim();
  if (!text || text.length > 3000) {
    await message.reply(lang === "fr" ? `Utilise \`${prefix}voice say <texte>\` (3 000 caractères maximum).` : `Use \`${prefix}voice say <text>\` (3,000 characters maximum).`);
    return;
  }
  if (!message.guildId || !isInVoice(message.guildId)) {
    await message.reply(lang === "fr" ? `Rejoins un salon vocal et utilise \`${prefix}join\`.` : `Join a voice channel and use \`${prefix}join\`.`);
    return;
  }
  if (!message.member?.voice.channelId || message.guild?.members.me?.voice.channelId !== message.member.voice.channelId) {
    await message.reply(lang === "fr" ? "Rejoins le même salon vocal que le bot." : "Join the same voice channel as the bot.");
    return;
  }
  if (!await speakText(message.guildId, text, lang, message.client.user?.username)) {
    await message.reply(lang === "fr" ? "La lecture est indisponible, déjà en cours ou le bot est en pause." : "Voice playback is unavailable, busy or paused.");
  }
}
