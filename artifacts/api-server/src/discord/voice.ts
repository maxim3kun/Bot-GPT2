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
import { type Message, type TextChannel, type GuildMember } from "discord.js";
import { replyNotInVoice, setVoiceCleanupHook, stopForGuild } from "./radio.js";
import { Readable } from "stream";
import prism from "prism-media";
import { logger } from "../lib/logger";

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

async function transcribeGroq(wav: Buffer, groqKey: string): Promise<string | null> {
  const body = new FormData();
  body.append("file", new Blob([new Uint8Array(wav)], { type: "audio/wav" }), "speech.wav");
  body.append("model", "whisper-large-v3-turbo");
  body.append("response_format", "text");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${groqKey}` },
    body,
  });

  if (!res.ok) {
    logger.warn({ status: res.status }, "Groq STT error");
    return null;
  }

  const text = (await res.text()).trim();
  return text || null;
}

// ── State ─────────────────────────────────────────────────────────────────────

interface GuildVoiceState {
  textChannel: TextChannel;
  player: ReturnType<typeof createAudioPlayer>;
  active: boolean;
  subtitles: boolean;
  listeningUsers: Set<string>;
  botName: string;
}

const guildStates = new Map<string, GuildVoiceState>();

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
  const receiver = connection.receiver;

  receiver.speaking.on("start", (userId) => {
    const state = guildStates.get(guildId);
    if (!state?.subtitles || state.listeningUsers.has(userId)) return;
    state.listeningUsers.add(userId);

    const opusStream = receiver.subscribe(userId, {
      end: { behavior: EndBehaviorType.AfterSilence, duration: 1000 },
    });

    const decoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });
    const pcmChunks: Buffer[] = [];

    opusStream.pipe(decoder);
    decoder.on("data", (chunk: Buffer) => pcmChunks.push(chunk));

    decoder.on("end", async () => {
      const s = guildStates.get(guildId);
      if (!s) return;
      s.listeningUsers.delete(userId);

      if (pcmChunks.length === 0) return;
      const pcm = Buffer.concat(pcmChunks);
      if (pcm.length < 19200) return; // skip clips shorter than ~0.1s

      try {
        const wav = pcmToWav(pcm);
        const transcript = await transcribeGroq(wav, groqKey);
        if (!transcript) return;

        // Try to resolve member display name
        const guild = (connection as unknown as { joinConfig?: { guildId?: string } }).joinConfig;
        const displayName = `<@${userId}>`;
        await s.textChannel.send(`👤 ${displayName}: *${transcript}*`);
      } catch (err) {
        logger.warn({ err }, "Subtitle transcription failed");
      }
    });

    decoder.on("error", () => {
      const s = guildStates.get(guildId);
      if (s) s.listeningUsers.delete(userId);
    });
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

  guildStates.set(guildId, {
    textChannel: message.channel as TextChannel,
    player,
    active: true,
    subtitles: false,
    listeningUsers: new Set(),
    botName,
  });

  connection.on(VoiceConnectionStatus.Ready, () => {
    logger.info({ guildId, channel: voiceChannel.name }, "Voice ready");

    // If subtitles are already enabled and we have a Groq key, set up receiver
    const state = guildStates.get(guildId);
    const groqKey = process.env["GROQ_API_KEY"];
    if (state?.subtitles && groqKey) {
      setupReceiverForGuild(guildId, connection, groqKey);
    }
  });

  connection.on(VoiceConnectionStatus.Disconnected, () => {
    guildStates.delete(guildId);
    logger.info({ guildId }, "Voice disconnected");
  });

  await message.reply(
    `✅ Connected to **${voiceChannel.name}**! 🎙️\n` +
    `• \`!voice say <text>\` → I speak in the channel\n` +
    `• \`!subtitles\` → toggle live subtitles (bot speech + your voice)\n` +
    `• \`!voice stop\` / \`!voice resume\` → mute / unmute\n` +
    `• \`!leave\` → disconnect`,
  );
}

export async function leaveVoice(message: Message): Promise<void> {
  const guildId = message.guildId!;
  const connection = getVoiceConnection(guildId);
  if (!connection) { await message.reply("❌ I'm not in a voice channel."); return; }
  connection.destroy();
  guildStates.delete(guildId);
  await message.reply("👋 Disconnected from the voice channel. See you!");
}

export async function voiceStop(message: Message): Promise<void> {
  const state = guildStates.get(message.guildId!);
  if (!state) { await message.reply("❌ I'm not in a voice channel. Use `!join` first."); return; }
  state.active = false;
  state.player.stop();
  await message.reply("🔇 Muted. Use `!voice resume` to unmute.");
}

export async function voiceResume(message: Message): Promise<void> {
  const state = guildStates.get(message.guildId!);
  if (!state) { await message.reply("❌ I'm not in a voice channel. Use `!join` first."); return; }
  state.active = true;
  await message.reply("🎙️ Voice mode resumed — I'll speak again!");
}

export async function toggleSubtitles(message: Message): Promise<void> {
  const guildId = message.guildId!;
  const state = guildStates.get(guildId);

  if (!state) {
    await message.reply("❌ I'm not in a voice channel. Use `!join` first, then `!subtitles`.");
    return;
  }

  state.subtitles = !state.subtitles;

  if (state.subtitles) {
    const groqKey = process.env["GROQ_API_KEY"];
    if (!groqKey) {
      await message.reply(
        "⚠️ Subtitles for **bot speech** are ON — but voice transcription requires `GROQ_API_KEY`.\n" +
        "Set it up in secrets to also see subtitles when you speak.",
      );
    } else {
      const connection = getVoiceConnection(guildId);
      if (connection) setupReceiverForGuild(guildId, connection, groqKey);
      await message.reply(
        "✅ **Subtitles ON** 📝\n" +
        "• When **I speak** → text appears in this channel\n" +
        "• When **you speak** → I transcribe and show what I heard",
      );
    }
  } else {
    await message.reply("🔕 **Subtitles OFF** — no more live captions.");
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
): Promise<boolean> {
  const state = guildStates.get(guildId);
  if (!state || !state.active) return false;

  try {
    // Post subtitle first so it appears as the audio starts
    if (state.subtitles) {
      const label = senderName ?? state.botName;
      await state.textChannel.send(`🤖 **${label}**: *${text}*`).catch(() => null);
    }

    const mp3 = await textToSpeech(text, lang);
    const resource = createAudioResource(Readable.from(mp3), { inputType: StreamType.Arbitrary });
    state.player.play(resource);

    await new Promise<void>((resolve) => {
      state.player.once(AudioPlayerStatus.Idle, resolve);
    });

    return true;
  } catch (err) {
    logger.error({ err, guildId }, "TTS error");
    return false;
  }
}
