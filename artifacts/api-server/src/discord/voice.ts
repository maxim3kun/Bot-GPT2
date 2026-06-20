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
  // Guard: register the listener only once per connection.
  // After !subtitles is toggled off and back on, state.subtitles is checked
  // inside the listener at runtime — no second listener is ever needed.
  const state0 = guildStates.get(guildId);
  if (!state0 || state0.receiverSetUp) return;
  state0.receiverSetUp = true;

  const receiver = connection.receiver;

  receiver.speaking.on("start", (userId) => {
    const state = guildStates.get(guildId);
    // Respect the subtitles toggle at runtime — never capture audio when OFF
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

      // Skip clips shorter than 1.5 s (48000 Hz × 2 ch × 2 bytes × 1.5 s = 288 000 bytes).
      // Whisper hallucinates "Thank you." and similar on short/silent audio.
      if (pcm.length < 288000) return;

      // Drop audio captured while the bot was speaking (self-echo) plus a 1 s cooldown.
      if (s.botSpeaking || Date.now() < s.botSpeakingUntil) return;

      try {
        const wav = pcmToWav(pcm);
        const transcript = await transcribeGroq(wav, groqKey);
        if (!transcript) return;

        // Drop known Whisper hallucinations
        if (isHallucination(transcript)) {
          logger.debug({ transcript }, "Voice: dropping hallucinated transcript");
          return;
        }

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

  const groqKey = process.env["GROQ_API_KEY"];

  guildStates.set(guildId, {
    textChannel: message.channel as TextChannel,
    player,
    active: true,
    subtitles: groqKey ? true : false, // enable listening immediately if Groq is available
    listeningUsers: new Set(),
    botName,
    botSpeaking: false,
    botSpeakingUntil: 0,
    receiverSetUp: false,
  });

  connection.on(VoiceConnectionStatus.Ready, () => {
    logger.info({ guildId, channel: voiceChannel.name }, "Voice ready");
    const state = guildStates.get(guildId);
    if (state?.subtitles && groqKey) {
      setupReceiverForGuild(guildId, connection, groqKey);
    }
  });

  connection.on(VoiceConnectionStatus.Disconnected, () => {
    guildStates.delete(guildId);
    logger.info({ guildId }, "Voice disconnected");
  });

  const listeningNote = groqKey
    ? `• 📝 Live transcription **ON** — I'll show what you say\n`
    : `• ⚠️ No \`GROQ_API_KEY\` — transcription disabled\n`;

  await message.reply(
    `✅ Connected to **${voiceChannel.name}**! 🎙️\n` +
    `• \`!voice say <text>\` → I speak in the channel\n` +
    listeningNote +
    `• \`!subtitles\` → toggle transcription on/off\n` +
    `• \`!voice stop\` / \`!voice resume\` → mute / unmute TTS\n` +
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
  let state = guildStates.get(guildId);

  // Auto-join in silent mode if not already in a voice channel
  if (!state) {
    const voiceChannel = (message.member as GuildMember | null)?.voice.channel;
    if (!voiceChannel) {
      await message.reply("❌ Rejoins d'abord un salon vocal, puis refais `!subtitles`.");
      return;
    }

    const groqKey = process.env["GROQ_API_KEY"];
    if (!groqKey) {
      await message.reply("⚠️ `GROQ_API_KEY` manquant — impossible de transcrire la voix.");
      return;
    }

    // Stop radio if it was using the connection
    stopForGuild(guildId);
    getVoiceConnection(guildId)?.destroy();

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: true, // silent — listen only, no TTS
    });

    const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
    connection.subscribe(player);

    const botName = message.guild?.members.me?.displayName ?? "Bot";

    state = {
      textChannel: message.channel as TextChannel,
      player,
      active: false, // silent by default — no TTS
      subtitles: true,
      listeningUsers: new Set(),
      botName,
      botSpeaking: false,
      botSpeakingUntil: 0,
      receiverSetUp: false,
    };
    guildStates.set(guildId, state);

    connection.on(VoiceConnectionStatus.Ready, () => {
      logger.info({ guildId, channel: voiceChannel.name }, "Voice ready (subtitles-only mode)");
      setupReceiverForGuild(guildId, connection, groqKey);
    });

    connection.on(VoiceConnectionStatus.Disconnected, () => {
      guildStates.delete(guildId);
      logger.info({ guildId }, "Voice disconnected");
    });

    await message.reply(
      `✅ **Sous-titres ON** 📝 — connecté à **${voiceChannel.name}** en mode écoute\n` +
      `• Quand **tu parles** → je transcris ce que j'entends\n` +
      `• Le bot est **silencieux** (utilise \`!voice resume\` pour qu'il parle)\n` +
      `• \`!subtitles\` à nouveau pour désactiver • \`!leave\` pour quitter`,
    );
    return;
  }

  // Already in voice — toggle subtitles
  state.subtitles = !state.subtitles;

  if (state.subtitles) {
    const groqKey = process.env["GROQ_API_KEY"];
    if (!groqKey) {
      await message.reply(
        "⚠️ `GROQ_API_KEY` manquant — impossible de transcrire la voix.",
      );
    } else {
      const connection = getVoiceConnection(guildId);
      if (connection) setupReceiverForGuild(guildId, connection, groqKey);
      await message.reply(
        "✅ **Sous-titres ON** 📝\n" +
        "• Quand **je parle** → le texte apparaît ici\n" +
        "• Quand **tu parles** → je transcris ce que j'entends",
      );
    }
  } else {
    await message.reply("🔕 **Sous-titres OFF** — plus de transcription en direct.");
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

    // Mark bot as speaking so the receiver ignores its own audio output
    state.botSpeaking = true;
    state.player.play(resource);

    await new Promise<void>((resolve) => {
      state.player.once(AudioPlayerStatus.Idle, resolve);
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
  }
}
