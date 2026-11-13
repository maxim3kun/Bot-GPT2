import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  getVoiceConnection,
  StreamType,
  NoSubscriberBehavior,
  EndBehaviorType,
  type VoiceConnection,
} from "@discordjs/voice";
import { type Message, type TextChannel, PermissionFlagsBits } from "discord.js";
import { replyNotInVoice, setVoiceCleanupHook, stopForGuild } from "./radio.js";
import { Readable } from "stream";
import prism from "prism-media";
import { logger } from "../lib/logger";
import { piper, DEFAULT_VOICE, isVoiceId } from "./piper-tts.js";
import { getBotVoice } from "./voice-settings.js";
import { recordModuleSuccess, recordModuleFailureState } from "./module-technician.js";
import { getConsent, requireConsent } from "./ai-consent.js";
import { getEffectiveLanguage } from "./effective-language.js";
import { isFeatureEnabled } from "../bootstrap/feature-flags.js";
import { getGuildFeatures } from "../lib/features-store.js";
import { checkCommandBlock, sendBlockedMessage } from "./command-suggest.js";
import { getPrefix } from "./prefix-store.js";

// ── Google Translate TTS ──────────────────────────────────────────────────────

async function fetchTtsChunk(text: string, lang: string): Promise<Buffer> {
  const url =
    `https://translate.google.com/translate_tts?ie=UTF-8` +
    `&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      Referer: "https://translate.google.com/",
    },
  });
  if (!res.ok) throw new Error(`Google TTS HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function textToSpeech(text: string, lang = "en"): Promise<Buffer> {
  const MAX = 200;
  const chunks: string[] = [];
  let rem = text.trim();
  while (rem.length > 0) {
    if (rem.length <= MAX) { chunks.push(rem); break; }
    const slice = rem.slice(0, MAX);
    const cut = Math.max(
      slice.lastIndexOf(". "), slice.lastIndexOf("? "),
      slice.lastIndexOf("! "), slice.lastIndexOf(", "),
    );
    const end = cut > 0 ? cut + 1 : MAX;
    chunks.push(rem.slice(0, end).trim());
    rem = rem.slice(end).trim();
  }
  const buffers = await Promise.all(chunks.map((c) => fetchTtsChunk(c, lang)));
  return Buffer.concat(buffers);
}

const fallbackNotices = new Map<string, number>();
const speakingGuilds = new Set<string>();
async function speechAudio(text: string, lang: string, voice: string): Promise<{ audio: Buffer; degraded: boolean }> {
  // The curated local models are French. Preserve existing multilingual speech.
  if (!/^fr(?:[-_]|$)/i.test(lang)) return { audio: await textToSpeech(text, lang), degraded: false };
  try {
    const audio = await piper.synthesize(text, voice);
    recordModuleSuccess("feature:piper");
    return { audio, degraded: false };
  }
  catch (error) {
    recordModuleFailureState("feature:piper", new Error("Local Piper synthesis failed"));
    logger.warn({ errorName: error instanceof Error ? error.name : "Error" }, "Local voice unavailable; trying existing Google TTS");
    return { audio: await textToSpeech(text, lang), degraded: true };
  }
}

// ── PCM → WAV helper ──────────────────────────────────────────────────────────

function pcmToWav(pcm: Buffer, sampleRate = 48000, channels = 2, bitDepth = 16): Buffer {
  const byteRate = sampleRate * channels * (bitDepth / 8);
  const blockAlign = channels * (bitDepth / 8);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

// ── Groq Whisper STT ──────────────────────────────────────────────────────────

async function transcribeGroq(wav: Buffer, groqKey: string, signal?: AbortSignal): Promise<string | null> {
  const body = new FormData();
  body.append("file", new Blob([new Uint8Array(wav)], { type: "audio/wav" }), "speech.wav");
  body.append("model", "whisper-large-v3-turbo");
  body.append("response_format", "text");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${groqKey}` },
    body,
    signal,
  });

  if (!res.ok) {
    logger.warn({ status: res.status }, "Groq STT error");
    return null;
  }

  const text = (await res.text()).trim();
  return text || null;
}

// ── Whisper hallucination denylist ────────────────────────────────────────────
// Whisper reliably outputs these phrases on near-silence or very short audio.
// We drop any transcript that matches (case-insensitive, after trimming punctuation).
const HALLUCINATION_DENYLIST = [
  /^thank you\.?$/i,
  /^thanks\.?$/i,
  /^thanks for watching\.?$/i,
  /^you\.?$/i,
  /^\.\.\.$/,
  /^bye\.?$/i,
  /^goodbye\.?$/i,
  /^see you\.?$/i,
  /^okay\.?$/i,
  /^ok\.?$/i,
  /^yes\.?$/i,
  /^no\.?$/i,
  /^um\.?$/i,
  /^uh\.?$/i,
  /^hmm\.?$/i,
  /^subscribe\.?$/i,
];

function isHallucination(text: string): boolean {
  const t = text.trim();
  return HALLUCINATION_DENYLIST.some((re) => re.test(t));
}

// ── State ─────────────────────────────────────────────────────────────────────

interface GuildVoiceState {
  textChannel: TextChannel;
  player: ReturnType<typeof createAudioPlayer>;
  active: boolean;
  subtitles: boolean;
  listeningUsers: Set<string>;
  chatUsers: Set<string>;
  chatMessages: Map<string, Message>;
  activeCaptures: Map<string, { stream: { destroy(): unknown }; abortController: AbortController | null }>;
  botName: string;
  /** True while the bot is playing TTS — suppress self-transcription. */
  botSpeaking: boolean;
  /** Timestamp (ms) when the bot last finished speaking — short cooldown. */
  botSpeakingUntil: number;
  /**
   * True once setupReceiverForGuild has registered its listener on this
   * connection. Prevents duplicate listeners when !subtitles is toggled
   * multiple times — the single listener checks state.subtitles at runtime.
   */
  receiverSetUp: boolean;
}

const guildStates = new Map<string, GuildVoiceState>();
export interface VoiceChatTurnContext {
  guildId: string;
  userId: string;
  transcript: string;
  message: Message;
}
type VoiceChatTurnHandler = (context: VoiceChatTurnContext) => Promise<boolean>;
let voiceChatTurnHandler: VoiceChatTurnHandler | null = null;

export function setVoiceChatTurnHandler(handler: VoiceChatTurnHandler): void {
  voiceChatTurnHandler = handler;
}

export async function sendVoiceChatResponse<T>(
  sendText: () => Promise<T>,
  speak: (() => Promise<unknown>) | null,
): Promise<T> {
  const message = await sendText();
  if (speak) await speak().catch(() => false);
  return message;
}

function userStillInVoiceChat(state: GuildVoiceState, guildId: string, userId: string): boolean {
  const message = state.chatMessages.get(userId);
  const connection = getVoiceConnection(guildId);
  const channel = message?.member?.voice.channel;
  const botMember = message?.guild?.members.me;
  const userPermissions = channel && message?.member ? channel.permissionsFor(message.member) : null;
  const botPermissions = channel && botMember ? channel.permissionsFor(botMember) : null;
  return Boolean(
    state.chatUsers.has(userId)
    && message?.member?.voice.channelId
    && connection?.joinConfig.channelId === message.member.voice.channelId
    && userPermissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect])
    && botPermissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect])
  );
}

async function voiceChatAccessAllowed(message: Message): Promise<boolean> {
  if (!message.guildId || !isFeatureEnabled("ai") || !isFeatureEnabled("voice")
    || await getConsent(message.author.id) !== "accepted"
    || checkCommandBlock(message.author.id).blocked) return false;
  try {
    const features = await getGuildFeatures(message.guildId, { failClosed: true });
    return features.find(feature => feature.name === "ai_chat")?.enabled === true;
  } catch {
    return false;
  }
}

async function disableVoiceChatForUser(guildId: string, userId: string): Promise<void> {
  const state = guildStates.get(guildId);
  if (!state) return;
  state.chatUsers.delete(userId);
  state.chatMessages.delete(userId);
  const capture = state.activeCaptures.get(userId);
  if (capture) {
    capture.abortController?.abort();
    capture.stream.destroy();
    state.activeCaptures.delete(userId);
  }
  state.listeningUsers.delete(userId);
}

export async function enableVoiceChat(message: Message): Promise<boolean> {
  const guildId = message.guildId;
  if (!guildId || !message.member?.voice.channelId) {
    await replyNotInVoice(message);
    return false;
  }
  const state = guildStates.get(guildId);
  const connection = getVoiceConnection(guildId);
  if (!state || !connection || connection.joinConfig.channelId !== message.member.voice.channelId) {
    await message.reply("❌ Rejoins le même salon vocal que le bot avant d’activer le chat vocal.");
    return false;
  }
  const groqKey = process.env["GROQ_API_KEY"];
  if (!groqKey) {
    await message.reply("⚠️ La transcription vocale n’est pas configurée. Aucune voix ne sera écoutée.");
    return false;
  }
  if (!voiceChatTurnHandler) {
    await message.reply("⚠️ Le chat vocal IA n’est pas disponible pour le moment.");
    return false;
  }
  const language = getEffectiveLanguage(guildId, message.author.id);
  if (!await requireConsent(message, language) || await getConsent(message.author.id) !== "accepted") return false;

  const channel = message.member.voice.channel;
  const botMember = message.guild?.members.me;
  const userPermissions = channel?.permissionsFor(message.member);
  const botPermissions = channel && botMember ? channel.permissionsFor(botMember) : null;
  if (!userPermissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect])
    || !botPermissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect])) {
    await message.reply("🔒 Les permissions vocales ne permettent pas d’activer le chat ici.");
    return false;
  }
  if (!await voiceChatAccessAllowed(message)) {
    if (checkCommandBlock(message.author.id).blocked) {
      await sendBlockedMessage(message, checkCommandBlock(message.author.id), getPrefix(guildId));
    } else {
      await message.reply("🔒 Le chat vocal IA est désactivé ou ses réglages ne peuvent pas être vérifiés.");
    }
    return false;
  }

  state.chatUsers.add(message.author.id);
  state.chatMessages.set(message.author.id, message);
  setupReceiverForGuild(guildId, connection, groqKey);
  const prefix = getPrefix(guildId);
  await message.reply(
    "✅ **Chat vocal activé pour toi.** Seule ta voix sera transcrite par Groq pour répondre à l’IA; l’audio brut n’est pas conservé par le bot. " +
    `La réponse reste écrite même si la synthèse vocale échoue. \`${prefix}voice chat off\` arrête ton écoute; \`${prefix}subtitles\` affiche ou masque la transcription.`,
  );
  return true;
}

export async function disableVoiceChat(message: Message): Promise<boolean> {
  if (!message.guildId) return false;
  const wasEnabled = Boolean(guildStates.get(message.guildId)?.chatUsers.has(message.author.id));
  await disableVoiceChatForUser(message.guildId, message.author.id);
  await message.reply(wasEnabled
    ? "🔕 Ton chat vocal est désactivé. Ta voix ne sera plus transcrite."
    : "Le chat vocal n’était pas activé pour toi.");
  return wasEnabled;
}

// Bug 1 fix: register a cleanup callback so radio.ts can evict our state when
// it takes over the voice connection (radio.ts can't import voice.ts — circular dep)
setVoiceCleanupHook((guildId: string) => {
  const s = guildStates.get(guildId);
  if (s) {
    s.active = false;
    s.player.stop();
    guildStates.delete(guildId);
    logger.info({ guildId }, "Voice: TTS state cleaned up — radio took over connection");
  }
});

// ── Subtitle receiver setup ───────────────────────────────────────────────────

function setupReceiverForGuild(
  guildId: string,
  connection: VoiceConnection,
  groqKey: string,
): void {
  // Register once per connection. Audio is captured only for people who
  // explicitly enabled their own voice chat.
  const state0 = guildStates.get(guildId);
  if (!state0 || state0.receiverSetUp) return;
  state0.receiverSetUp = true;

  const receiver = connection.receiver;

  receiver.speaking.on("start", (userId) => {
    void (async () => {
    const state = guildStates.get(guildId);
    if (!state || userId === state.textChannel.client.user?.id
      || !userStillInVoiceChat(state, guildId, userId)
      || state.listeningUsers.has(userId)) return;
    const chatMessage = state.chatMessages.get(userId);
    if (!chatMessage || !await voiceChatAccessAllowed(chatMessage)) {
      if (state.chatUsers.has(userId)) await disableVoiceChatForUser(guildId, userId);
      return;
    }
    state.listeningUsers.add(userId);

    const opusStream = receiver.subscribe(userId, {
      end: { behavior: EndBehaviorType.AfterSilence, duration: 1000 },
    });
    const capture = { stream: opusStream, abortController: null as AbortController | null };
    state.activeCaptures.set(userId, capture);

    const decoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });
    const pcmChunks: Buffer[] = [];

    opusStream.pipe(decoder);
    decoder.on("data", (chunk: Buffer) => pcmChunks.push(chunk));

    decoder.on("end", async () => {
      try {
        const s = guildStates.get(guildId);
        if (!s || s.activeCaptures.get(userId) !== capture
          || !userStillInVoiceChat(s, guildId, userId) || pcmChunks.length === 0) return;
        const pcm = Buffer.concat(pcmChunks);
        if (pcm.length < 288000) {
          if (s.subtitles) await s.textChannel.send("🎙️ Je n’ai pas compris cet extrait. Réessaie en parlant un peu plus longtemps.").catch(() => null);
          return;
        }
        if (s.botSpeaking || Date.now() < s.botSpeakingUntil) return;
        const optedInMessage = s.chatMessages.get(userId);
        if (!optedInMessage || !userStillInVoiceChat(s, guildId, userId)
          || !await voiceChatAccessAllowed(optedInMessage)) {
          await disableVoiceChatForUser(guildId, userId);
          return;
        }

        const wav = pcmToWav(pcm);
        const controller = new AbortController();
        capture.abortController = controller;
        const transcript = await transcribeGroq(wav, groqKey, controller.signal);
        if (!transcript) {
          if (s.subtitles) await s.textChannel.send("🎙️ Je n’ai pas compris cet extrait. Réessaie en parlant un peu plus longtemps.").catch(() => null);
          return;
        }
        if (!userStillInVoiceChat(s, guildId, userId)
          || !await voiceChatAccessAllowed(s.chatMessages.get(userId)!)) {
          await disableVoiceChatForUser(guildId, userId);
          return;
        }

        // Drop known Whisper hallucinations
        if (isHallucination(transcript)) {
          logger.debug({ transcript }, "Voice: dropping hallucinated transcript");
          return;
        }

        if (s.subtitles) {
          await s.textChannel.send({ content: `👤 <@${userId}>: *${transcript}*`, allowedMentions: { parse: [] } });
        }
        const turnMessage = s.chatMessages.get(userId);
        if (turnMessage && voiceChatTurnHandler) {
          const keepListening = await voiceChatTurnHandler({ guildId, userId, transcript, message: turnMessage });
          if (!keepListening) await disableVoiceChatForUser(guildId, userId);
        }
      } catch (err) {
        if (!(err instanceof Error && err.name === "AbortError")) {
          logger.warn({ err }, "Voice chat transcription failed");
          const current = guildStates.get(guildId);
          if (current?.chatUsers.has(userId)) {
            await current.textChannel.send("⚠️ Je n’ai pas pu traiter ta voix. La transcription a échoué; tu peux réessayer ou utiliser le chat écrit.").catch(() => null);
          }
        }
      } finally {
        const current = guildStates.get(guildId);
        current?.listeningUsers.delete(userId);
        if (current?.activeCaptures.get(userId) === capture) current.activeCaptures.delete(userId);
      }
    });

    decoder.on("error", () => {
      const s = guildStates.get(guildId);
      if (s) {
        s.listeningUsers.delete(userId);
        if (s.activeCaptures.get(userId) === capture) s.activeCaptures.delete(userId);
      }
    });
    })().catch(err => logger.warn({ err, guildId }, "Unable to start authorized voice capture"));
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export function isInVoice(guildId: string): boolean {
  return guildStates.has(guildId);
}

export function resubscribeVoicePlayer(guildId: string): void {
  const state = guildStates.get(guildId);
  const connection = getVoiceConnection(guildId);
  if (!state || !connection) return;
  connection.subscribe(state.player);
}

export async function joinVoice(message: Message): Promise<void> {
  const voiceChannel = message.member?.voice.channel;
  if (!voiceChannel) {
    await replyNotInVoice(message);
    return;
  }

  const guildId = message.guildId!;
  const userPermissions = voiceChannel.permissionsFor(message.member!);
  const botMember = message.guild?.members.me;
  const botPermissions = botMember ? voiceChannel.permissionsFor(botMember) : null;
  if (!userPermissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect])
    || !botPermissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])) {
    await message.reply("🔒 Je n’ai pas les permissions vocales nécessaires pour rejoindre ce salon.");
    return;
  }
  // Bug 1 fix: stop radio cleanly before taking over the connection
  stopForGuild(guildId);
  getVoiceConnection(guildId)?.destroy();

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: false,
    selfMute: false,
  });

  const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
  connection.subscribe(player);

  const botName = message.guild?.members.me?.displayName ?? "Bot";
  const prefix = getPrefix(guildId);
  const language = getEffectiveLanguage(guildId, message.author.id);

  guildStates.set(guildId, {
    textChannel: message.channel as TextChannel,
    player,
    active: true,
    subtitles: false,
    listeningUsers: new Set(),
    chatUsers: new Set(),
    chatMessages: new Map(),
    activeCaptures: new Map(),
    botName,
    botSpeaking: false,
    botSpeakingUntil: 0,
    receiverSetUp: false,
  });

  connection.on(VoiceConnectionStatus.Ready, () => {
    logger.info({ guildId, channel: voiceChannel.name }, "Voice ready");
    const state = guildStates.get(guildId);
    const groqKey = process.env["GROQ_API_KEY"];
    if (state?.chatUsers.size && groqKey) setupReceiverForGuild(guildId, connection, groqKey);
  });

  connection.on(VoiceConnectionStatus.Disconnected, () => {
    guildStates.delete(guildId);
    logger.info({ guildId }, "Voice disconnected");
  });

  await message.reply(language === "fr"
    ? `✅ Connecté à **${voiceChannel.name}** ! 🎙️\n` +
      `• \`${prefix}voice say <texte>\` → je parle dans le salon\n` +
      `• L’écoute est **désactivée** jusqu’à ce qu’un membre autorise sa voix avec \`${prefix}voice chat on\`\n` +
      `• \`${prefix}subtitles\` → afficher ou masquer les transcriptions\n` +
      `• \`${prefix}voice stop\` / \`${prefix}voice resume\` → couper / reprendre les réponses vocales\n` +
      `• \`${prefix}leave\` → quitter`
    : `✅ Connected to **${voiceChannel.name}**! 🎙️\n` +
      `• \`${prefix}voice say <text>\` → I speak in the channel\n` +
      `• Voice listening is **OFF** until a member opts in with \`${prefix}voice chat on\`\n` +
      `• \`${prefix}subtitles\` → show or hide transcripts\n` +
      `• \`${prefix}voice stop\` / \`${prefix}voice resume\` → mute / unmute voice replies\n` +
      `• \`${prefix}leave\` → disconnect`);
}

export async function leaveVoice(message: Message): Promise<void> {
  const guildId = message.guildId!;
  const connection = getVoiceConnection(guildId);
  if (!connection) { await message.reply("❌ I'm not in a voice channel."); return; }
  if (message.member?.voice.channelId !== connection.joinConfig.channelId) {
    await message.reply("🔒 Rejoins le salon vocal du bot pour le déconnecter.");
    return;
  }
  connection.destroy();
  guildStates.delete(guildId);
  await message.reply("👋 Disconnected from the voice channel. See you!");
}

export async function voiceStop(message: Message): Promise<void> {
  const guildId = message.guildId!;
  const state = guildStates.get(guildId);
  const connection = getVoiceConnection(guildId);
  if (!state || !connection) { await message.reply("❌ I'm not in a voice channel. Use `!join` first."); return; }
  if (message.member?.voice.channelId !== connection.joinConfig.channelId) {
    await message.reply("🔒 Rejoins le salon vocal du bot pour contrôler ses réponses.");
    return;
  }
  state.active = false;
  state.player.stop();
  await message.reply("🔇 Muted. Use `!voice resume` to unmute.");
}

export async function voiceResume(message: Message): Promise<void> {
  const guildId = message.guildId!;
  const state = guildStates.get(guildId);
  const connection = getVoiceConnection(guildId);
  if (!state || !connection) { await message.reply("❌ I'm not in a voice channel. Use `!join` first."); return; }
  if (message.member?.voice.channelId !== connection.joinConfig.channelId) {
    await message.reply("🔒 Rejoins le salon vocal du bot pour contrôler ses réponses.");
    return;
  }
  state.active = true;
  await message.reply("🎙️ Voice mode resumed — I'll speak again!");
}

export async function toggleSubtitles(message: Message): Promise<void> {
  const guildId = message.guildId;
  if (!guildId) {
    await message.reply("Cette commande est disponible dans un serveur.");
    return;
  }
  const prefix = getPrefix(guildId);
  const state = guildStates.get(guildId);
  const connection = getVoiceConnection(guildId);
  if (!state || !connection) {
    await message.reply(`Rejoins d’abord le salon vocal avec \`${prefix}join\`; active ensuite \`${prefix}voice chat on\` pour autoriser ta voix.`);
    return;
  }
  if (!message.member?.voice.channelId || message.member.voice.channelId !== connection.joinConfig.channelId) {
    await message.reply("🔒 Rejoins le même salon vocal que le bot pour modifier les sous-titres.");
    return;
  }
  state.subtitles = !state.subtitles;

  if (state.subtitles) {
    await message.reply(`✅ **Sous-titres ON**. Seuls les membres ayant activé \`${prefix}voice chat on\` peuvent être transcrits.`);
  } else {
    await message.reply(`🔕 **Sous-titres OFF**. Le chat vocal reste actif pour les membres autorisés; utilise \`${prefix}voice chat off\` pour arrêter ton écoute.`);
  }
}

/**
 * Speak text in the guild's voice channel.
 * If subtitles are enabled, also posts the text to the text channel.
 * Returns true on success, false if bot is not in voice or is muted.
 */
export async function speakText(
  guildId: string,
  text: string,
  lang = "en",
  senderName?: string,
  includeSubtitle = true,
  voiceId?: string,
): Promise<boolean> {
  const state = guildStates.get(guildId);
  if (!state || !state.active || speakingGuilds.has(guildId)) return false;
  speakingGuilds.add(guildId);

  try {
    // Post subtitle first so it appears as the audio starts
    if (state.subtitles && includeSubtitle) {
      const label = senderName ?? state.botName;
      await state.textChannel.send(`🤖 **${label}**: *${text}*`).catch(() => null);
    }

    const selected = isVoiceId(voiceId) ? voiceId : await getBotVoice(guildId).catch(() => DEFAULT_VOICE);
    const { audio, degraded } = await speechAudio(text, lang, selected);
    if (degraded && Date.now() - (fallbackNotices.get(guildId) ?? 0) > 300_000) {
      fallbackNotices.set(guildId, Date.now());
      await state.textChannel.send("⚠️ La voix locale est indisponible. J’utilise temporairement la voix Google de secours, sans API payante.").catch(() => null);
    }
    const resource = createAudioResource(Readable.from(audio), { inputType: StreamType.Arbitrary });

    // Mark bot as speaking so the receiver ignores its own audio output
    state.botSpeaking = true;
    state.player.play(resource);

    await new Promise<void>((resolve, reject) => {
      const cleanup = () => { clearTimeout(timer); state.player.off(AudioPlayerStatus.Idle, done); state.player.off("error", fail); };
      const done = () => { cleanup(); resolve(); };
      const fail = () => { cleanup(); reject(new Error("Voice playback failed")); };
      const timer = setTimeout(() => { fail(); state.player.stop(); }, 240_000);
      state.player.once(AudioPlayerStatus.Idle, done);
      state.player.once("error", fail);
    });

    // 1 s cooldown after speaking so reverb/echo doesn't get transcribed
    state.botSpeaking = false;
    state.botSpeakingUntil = Date.now() + 1000;

    return true;
  } catch (err) {
    logger.error({ err, guildId }, "TTS error");
    state.botSpeaking = false;
    state.botSpeakingUntil = Date.now() + 1000;
    return false;
  } finally {
    speakingGuilds.delete(guildId);
  }
}

export async function speakPersonaReply(
  message: Message,
  text: string,
  lang: string,
  personaName: string,
  voiceId?: string,
): Promise<boolean> {
  const memberVoiceChannelId = message.member?.voice.channelId;
  if (!message.guildId || !memberVoiceChannelId) return false;
  const connection = getVoiceConnection(message.guildId);
  if (!connection || connection.joinConfig.channelId !== memberVoiceChannelId) return false;
  return speakText(message.guildId, text, lang, personaName, false, voiceId);
}
