import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  getVoiceConnection,
  entersState,
  StreamType,
  NoSubscriberBehavior,
  EndBehaviorType,
  type VoiceConnection,
} from "@discordjs/voice";
import { type Message, type TextChannel, PermissionFlagsBits } from "discord.js";
import { spawn } from "node:child_process";
import {
  pauseRadioForSpeech,
  radioStates,
  replyNotInVoice,
  setVoiceCleanupHook,
  speakOverRadio,
  interruptRadioSpeech,
  stopForGuild,
} from "./radio.js";
import { Readable } from "stream";
import prism from "prism-media";
import { logger } from "../lib/logger";
import { piper, DEFAULT_VOICE, isVoiceId } from "./piper-tts.js";
import { getBotVoice } from "./voice-settings.js";
import { createVoiceActivationChime, isSpokenStopCommand, sanitizeSpeechText } from "./voice-audio-policy.js";
import { recordModuleSuccess, recordModuleFailureState } from "./module-technician.js";
import { getConsent, requireConsent } from "./ai-consent.js";
import { getEffectiveLanguage } from "./effective-language.js";
import { isFeatureEnabled } from "../bootstrap/feature-flags.js";
import { getGuildFeatures } from "../lib/features-store.js";
import { checkCommandBlock, sendBlockedMessage } from "./command-suggest.js";
import { getPrefix } from "./prefix-store.js";
import {
  hasActivityAvatarListeners,
  publishActivityAvatarMode,
  publishActivityAvatarMouthLevel,
} from "./discord-activity-events.js";
import { pcm16leToMouthLevels } from "./voice-mouth-meter.js";

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

const speakingGuilds = new Set<string>();
async function speechAudio(text: string, lang: string, voice: string): Promise<Buffer> {
  // The curated local models are French. Preserve existing multilingual speech.
  if (!/^fr(?:[-_]|$)/i.test(lang)) return textToSpeech(text, lang);
  try {
    const audio = await piper.synthesize(text, voice);
    recordModuleSuccess("feature:piper");
    return audio;
  }
  catch (error) {
    recordModuleFailureState("feature:piper", new Error("Local Piper synthesis failed"));
    logger.warn({ errorName: error instanceof Error ? error.name : "Error" }, "Local French voice failed");
    if (voice !== DEFAULT_VOICE) {
      try {
        const audio = await piper.synthesize(text, DEFAULT_VOICE);
        recordModuleSuccess("feature:piper");
        return audio;
      } catch (fallbackError) {
        recordModuleFailureState("feature:piper", new Error("Local Piper synthesis failed"));
        logger.error({ errorName: fallbackError instanceof Error ? fallbackError.name : "Error" }, "Masculine French voice retry failed");
      }
    }
    // Google Translate TTS uses a feminine French voice. Do not silently ignore
    // the user's explicit request for a masculine default voice.
    throw new Error("Local masculine French voice unavailable");
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

const PUBLIC_LIVE_AUDIO_EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

export async function transcribePublicLiveAudio(
  audio: Buffer,
  mimeType: string,
  signal?: AbortSignal,
): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const extension = PUBLIC_LIVE_AUDIO_EXTENSIONS[mimeType];
  if (!groqKey || !extension || audio.length === 0 || audio.length > 1_500_000) {
    throw new Error("invalid_live_audio");
  }
  const body = new FormData();
  body.append("file", new Blob([new Uint8Array(audio)], { type: mimeType }), `speech.${extension}`);
  body.append("model", "whisper-large-v3-turbo");
  body.append("response_format", "text");
  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${groqKey}` },
    body,
    signal,
  });
  if (!response.ok) {
    logger.warn({ status: response.status }, "Groq public live transcription failed");
    throw new Error("live_transcription_failed");
  }
  return (await response.text()).trim().slice(0, 1_600);
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
  activeCaptures: Map<string, { stream: { destroy(): unknown }; abortController: AbortController | null; interruptOnly: boolean }>;
  botName: string;
  speechSequence: number;
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
const activationChimeTimers = new Map<string, ReturnType<typeof setTimeout>>();
export interface VoiceChatTurnContext {
  guildId: string;
  userId: string;
  transcript: string;
  message: Message;
  interruptOnly?: boolean;
}
type VoiceChatTurnHandler = (context: VoiceChatTurnContext) => Promise<boolean>;
let voiceChatTurnHandler: VoiceChatTurnHandler | null = null;

function createGuildVoiceState(
  message: Message,
  guildId: string,
  connection: VoiceConnection,
  subscribePlayer: boolean,
): GuildVoiceState {
  const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
  const state: GuildVoiceState = {
    textChannel: message.channel as TextChannel,
    player,
    active: true,
    subtitles: false,
    listeningUsers: new Set(),
    chatUsers: new Set(),
    chatMessages: new Map(),
    activeCaptures: new Map(),
    botName: message.guild?.members.me?.displayName ?? "Bot",
    botSpeaking: false,
    botSpeakingUntil: 0,
    speechSequence: 0,
    receiverSetUp: false,
  };
  guildStates.set(guildId, state);
  if (subscribePlayer) connection.subscribe(player);
  return state;
}

export function setVoiceChatTurnHandler(handler: VoiceChatTurnHandler): void {
  voiceChatTurnHandler = handler;
}

export async function sendVoiceChatResponse<T>(
  sendText: () => Promise<T>,
  speak: (() => Promise<unknown>) | null,
  showText: boolean,
): Promise<T | null> {
  // Text is opt-in through !subtitles; audio playback remains independent.
  const message = showText ? await sendText() : null;
  if (speak) await speak().catch(() => false);
  return message;
}

const ACTIVITY_MOUTH_FRAME_MS = 60;
const MAX_MOUTH_PCM_BYTES = 12 * 1024 * 1024;

async function decodeSpeechMouthLevels(guildId: string, audio: Buffer): Promise<number[]> {
  if (!hasActivityAvatarListeners(guildId) || audio.length === 0) return [];
  return new Promise((resolve) => {
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn("ffmpeg", [
        "-hide_banner",
        "-loglevel", "error",
        "-i", "pipe:0",
        "-f", "s16le",
        "-ac", "1",
        "-ar", "8000",
        "pipe:1",
      ], { stdio: ["pipe", "pipe", "ignore"] });
    } catch {
      resolve([]);
      return;
    }
    const stdout = child.stdout;
    const stdin = child.stdin;
    if (!stdout || !stdin) {
      child.kill("SIGKILL");
      resolve([]);
      return;
    }

    let settled = false;
    let totalBytes = 0;
    const chunks: Buffer[] = [];
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      finish([]);
    }, 1_500);
    const finish = (levels: number[]) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(levels);
    };

    stdout.on("data", (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_MOUTH_PCM_BYTES) {
        child.kill("SIGKILL");
        finish([]);
        return;
      }
      chunks.push(chunk);
    });
    child.once("error", () => finish([]));
    child.once("close", (code) => {
      if (code !== 0 || settled) {
        finish([]);
        return;
      }
      finish(pcm16leToMouthLevels(Buffer.concat(chunks), 8_000, ACTIVITY_MOUTH_FRAME_MS));
    });
    stdin.once("error", () => finish([]));
    stdin.end(audio);
  });
}

function startActivityMouthAnimation(guildId: string, levels: number[]): () => void {
  if (!levels.length) return () => undefined;
  let index = 0;
  let active = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const step = () => {
    if (!active) return;
    const level = levels[index];
    if (level === undefined) {
      active = false;
      publishActivityAvatarMouthLevel(guildId, 0);
      return;
    }
    index += 1;
    publishActivityAvatarMouthLevel(guildId, level);
    timer = setTimeout(step, ACTIVITY_MOUTH_FRAME_MS);
  };
  step();
  return () => {
    if (!active) return;
    active = false;
    if (timer) clearTimeout(timer);
    publishActivityAvatarMouthLevel(guildId, 0);
  };
}

async function playAudioBufferInVoice(
  guildId: string,
  audio: Buffer,
  mouthLevels: number[] = [],
): Promise<boolean> {
  const state = guildStates.get(guildId);
  const connection = getVoiceConnection(guildId);
  if (!state || !state.active || !connection || !audio.length) return false;

  let stopMouthAnimation: () => void = () => undefined;
  const beginMouthAnimation = () => {
    stopMouthAnimation();
    stopMouthAnimation = startActivityMouthAnimation(guildId, mouthLevels);
  };
  const mixedWithRadio = await speakOverRadio(guildId, audio, beginMouthAnimation);
  if (mixedWithRadio !== null) {
    stopMouthAnimation();
    return mixedWithRadio;
  }
  const resumeRadio = pauseRadioForSpeech(guildId);
  try {
    connection.subscribe(state.player);
    const resource = createAudioResource(Readable.from(audio), { inputType: StreamType.Arbitrary });
    return await new Promise<boolean>((resolve) => {
      let settled = false;
      const cleanup = () => {
        clearTimeout(timer);
        state.player.off(AudioPlayerStatus.Idle, onIdle);
        state.player.off(AudioPlayerStatus.Playing, onPlaying);
        state.player.off("error", onError);
        stopMouthAnimation();
      };
      const finish = (success: boolean) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(success);
      };
      const onIdle = () => finish(true);
      const onError = () => finish(false);
      const onPlaying = () => beginMouthAnimation();
      const timer = setTimeout(() => {
        state.player.stop();
        finish(false);
      }, 240_000);
      state.player.once(AudioPlayerStatus.Idle, onIdle);
      state.player.once(AudioPlayerStatus.Playing, onPlaying);
      state.player.once("error", onError);
      state.player.play(resource);
    });
  } catch (error) {
    logger.error({ error, guildId }, "TTS playback failed");
    return false;
  } finally {
    stopMouthAnimation();
    resumeRadio?.();
  }
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
  const pendingChime = activationChimeTimers.get(guildId);
  if (pendingChime) {
    clearTimeout(pendingChime);
    activationChimeTimers.delete(guildId);
  }
  const capture = state.activeCaptures.get(userId);
  if (capture) {
    capture.abortController?.abort();
    capture.stream.destroy();
    state.activeCaptures.delete(userId);
  }
  state.listeningUsers.delete(userId);
  publishActivityAvatarMode(
    guildId,
    state.chatUsers.size === 0 ? "idle" : state.active ? "listening" : "paused",
  );
}

export async function enableVoiceChat(message: Message): Promise<boolean> {
  const guildId = message.guildId;
  const channel = message.member?.voice.channel;
  if (!guildId || !channel) {
    await replyNotInVoice(message);
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

  let connection = getVoiceConnection(guildId);
  if (connection && connection.joinConfig.channelId !== channel.id) {
    await message.reply("❌ Le bot est déjà dans un autre salon vocal. Déplace-le avec `!join`, puis relance `!voice chat on`.");
    return false;
  }
  if (!connection) {
    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
    } catch {
      connection.destroy();
      await message.reply("❌ Je n’ai pas réussi à rejoindre le salon vocal. Vérifie mes permissions et réessaie.");
      return false;
    }
  }

  let state = guildStates.get(guildId);
  if (!state) {
    // Reuse a radio connection in place. Subscribing the idle voice-chat player
    // here would replace the radio's active player and cut the music.
    state = createGuildVoiceState(message, guildId, connection, !radioStates.has(guildId));
    connection.on(VoiceConnectionStatus.Disconnected, () => {
      guildStates.delete(guildId);
      publishActivityAvatarMode(guildId, "idle");
    });
  }

  state.chatUsers.add(message.author.id);
  state.chatMessages.set(message.author.id, message);
  publishActivityAvatarMode(guildId, "listening");
  setupReceiverForGuild(guildId, connection, groqKey);
  const prefix = getPrefix(guildId);
  await message.reply(
    `✅ **Chat vocal activé dans ${channel.name}.** Seule ta voix est écoutée; l’audio n’est pas conservé. ` +
    `Sous-titres désactivés · \`${prefix}subtitles\` pour les afficher · \`${prefix}voice chat off\` pour arrêter.`,
  );
  const previousChime = activationChimeTimers.get(guildId);
  if (previousChime) clearTimeout(previousChime);
  const chimeTimer = setTimeout(() => {
    activationChimeTimers.delete(guildId);
    if (!guildStates.get(guildId)?.chatUsers.has(message.author.id)) return;
    void playVoiceActivationChime(guildId).catch((error) => {
      logger.warn({ guildId, errorName: error instanceof Error ? error.name : "Error" }, "Voice activation sound failed");
    });
  }, 250);
  activationChimeTimers.set(guildId, chimeTimer);
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

export async function playVoiceActivationChime(guildId: string): Promise<boolean> {
  const state = guildStates.get(guildId);
  if (!state || !state.active || state.chatUsers.size === 0 || speakingGuilds.has(guildId)) return false;
  const radio = radioStates.get(guildId);
  // Avoid restarting a live radio stream for a confirmation sound lasting only
  // a fraction of a second; the text confirmation already signals activation.
  if (radio?.stationKey && !radio.paused) return false;
  speakingGuilds.add(guildId);
  state.botSpeaking = true;
  try {
    return await playAudioBufferInVoice(guildId, createVoiceActivationChime());
  } finally {
    state.botSpeaking = false;
    state.botSpeakingUntil = Date.now() + 400;
    speakingGuilds.delete(guildId);
  }
}

/** Stop only the current spoken reply; keep listening and radio playback enabled. */
export function interruptVoiceReply(guildId: string): boolean {
  const state = guildStates.get(guildId);
  if (!state || !speakingGuilds.has(guildId)) return false;
  state.speechSequence++;
  state.botSpeaking = false;
  state.botSpeakingUntil = 0;
  interruptRadioSpeech(guildId);
  state.player.stop(true);
  publishActivityAvatarMode(guildId, state.chatUsers.size ? "listening" : "idle", true);
  return true;
}

// Radio takes over playback without discarding members' explicit voice-chat opt-in.
setVoiceCleanupHook((guildId: string) => {
  const s = guildStates.get(guildId);
  if (s) {
    s.active = false;
    s.player.stop();
    if (s.chatUsers.size > 0) {
      s.active = true;
      s.botSpeaking = false;
      logger.info({ guildId, optedInUsers: s.chatUsers.size }, "Voice chat receiver preserved while radio takes playback");
      return;
    }
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
    const pendingChime = activationChimeTimers.get(guildId);
    if (pendingChime) {
      clearTimeout(pendingChime);
      activationChimeTimers.delete(guildId);
    }

    const opusStream = receiver.subscribe(userId, {
      end: { behavior: EndBehaviorType.AfterSilence, duration: 500 },
    });
    const capture = {
      stream: opusStream,
      abortController: null as AbortController | null,
      interruptOnly: state.botSpeaking || Date.now() < state.botSpeakingUntil,
    };
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
        if (pcm.length < (capture.interruptOnly ? 16_000 : 115_200)) {
          if (s.subtitles) await s.textChannel.send("🎙️ Je n’ai pas compris cet extrait. Réessaie en parlant un peu plus longtemps.").catch(() => null);
          return;
        }
        if (!capture.interruptOnly && (s.botSpeaking || Date.now() < s.botSpeakingUntil)) return;
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

        if (capture.interruptOnly) {
          if (isSpokenStopCommand(transcript)) {
            interruptVoiceReply(guildId);
            return;
          }
          const turnMessage = s.chatMessages.get(userId);
          if (turnMessage && voiceChatTurnHandler) {
            await voiceChatTurnHandler({ guildId, userId, transcript, message: turnMessage, interruptOnly: true });
          }
          return;
        }

        if (s.subtitles) {
          await s.textChannel.send({ content: `👤 <@${userId}>: *${transcript}*`, allowedMentions: { parse: [] } });
        }
        const turnMessage = s.chatMessages.get(userId);
        if (turnMessage && voiceChatTurnHandler) {
          publishActivityAvatarMode(guildId, "thinking");
          try {
            const keepListening = await voiceChatTurnHandler({ guildId, userId, transcript, message: turnMessage });
            if (!keepListening) await disableVoiceChatForUser(guildId, userId);
          } finally {
            const current = guildStates.get(guildId);
            publishActivityAvatarMode(
              guildId,
              !current?.chatUsers.size ? "idle" : current.active ? "listening" : "paused",
            );
          }
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

export function voiceSubtitlesEnabled(guildId: string): boolean {
  return guildStates.get(guildId)?.subtitles ?? false;
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

  createGuildVoiceState(message, guildId, connection, true);
  const prefix = getPrefix(guildId);
  const language = getEffectiveLanguage(guildId, message.author.id);

  connection.on(VoiceConnectionStatus.Ready, () => {
    logger.info({ guildId, channel: voiceChannel.name }, "Voice ready");
    const state = guildStates.get(guildId);
    const groqKey = process.env["GROQ_API_KEY"];
    if (state?.chatUsers.size && groqKey) setupReceiverForGuild(guildId, connection, groqKey);
  });

  connection.on(VoiceConnectionStatus.Disconnected, () => {
    guildStates.delete(guildId);
    publishActivityAvatarMode(guildId, "idle");
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
  publishActivityAvatarMode(guildId, "idle");
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
  publishActivityAvatarMode(guildId, "paused", true);
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
  publishActivityAvatarMode(guildId, state.chatUsers.size ? "listening" : "idle");
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
  const spokenText = sanitizeSpeechText(text);
  if (!state || !state.active || speakingGuilds.has(guildId) || !spokenText) return false;
  speakingGuilds.add(guildId);
  const speechSequence = ++state.speechSequence;
  state.botSpeaking = true;
  publishActivityAvatarMode(guildId, "thinking");

  try {
    // Post subtitle first so it appears as the audio starts
    if (state.subtitles && includeSubtitle) {
      const label = senderName ?? state.botName;
      await state.textChannel.send(`🤖 **${label}**: *${text}*`).catch(() => null);
    }

    const selected = isVoiceId(voiceId) ? voiceId : await getBotVoice(guildId).catch(() => DEFAULT_VOICE);
    const audio = await speechAudio(spokenText, lang, selected);
    if (state.speechSequence !== speechSequence || !state.active) return false;
    const mouthLevels = await decodeSpeechMouthLevels(guildId, audio);
    publishActivityAvatarMode(guildId, "speaking");
    const played = await playAudioBufferInVoice(guildId, audio, mouthLevels);
    return played && state.speechSequence === speechSequence;
  } catch (err) {
    logger.error({ err, guildId }, "TTS error");
    return false;
  } finally {
    // Brief echo guard after either a radio mix or direct voice playback.
    state.botSpeaking = false;
    state.botSpeakingUntil = Date.now() + 600;
    speakingGuilds.delete(guildId);
    publishActivityAvatarMode(
      guildId,
      state.chatUsers.size === 0 ? "idle" : state.active ? "listening" : "paused",
    );
  }
}

export async function synthesizeActivitySpeech(
  guildId: string,
  text: string,
  lang = "fr",
): Promise<Buffer> {
  const spokenText = sanitizeSpeechText(text);
  if (!spokenText || spokenText.length > 1_500) throw new Error("invalid_activity_speech");
  const voice = await getBotVoice(guildId).catch(() => DEFAULT_VOICE);
  return speechAudio(spokenText, lang, voice);
}

export async function synthesizePublicLiveSpeech(text: string, lang = "fr"): Promise<Buffer> {
  const spokenText = sanitizeSpeechText(text);
  if (!spokenText || spokenText.length > 1_800 || !/^[a-z]{2}(?:-[A-Z]{2})?$/i.test(lang)) {
    throw new Error("invalid_live_speech");
  }
  return speechAudio(spokenText, lang, DEFAULT_VOICE);
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
