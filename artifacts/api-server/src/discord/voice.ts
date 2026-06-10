import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  getVoiceConnection,
  StreamType,
  NoSubscriberBehavior,
} from "@discordjs/voice";
import { type Message, type TextChannel } from "discord.js";
import { Readable } from "stream";
import { logger } from "../lib/logger";

// ── Google Translate TTS (free, no API key needed) ───────────────────────────

async function fetchTtsChunk(chunk: string, lang: string): Promise<Buffer> {
  const url =
    `https://translate.google.com/translate_tts?ie=UTF-8` +
    `&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      Referer: "https://translate.google.com/",
    },
  });

  if (!res.ok) throw new Error(`Google TTS ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function textToSpeech(text: string, lang = "fr"): Promise<Buffer> {
  const chunks: string[] = [];
  let rem = text.trim();
  while (rem.length > 0) {
    if (rem.length <= 200) { chunks.push(rem); break; }
    const slice = rem.slice(0, 200);
    const cut = Math.max(
      slice.lastIndexOf(". "),
      slice.lastIndexOf("? "),
      slice.lastIndexOf("! "),
      slice.lastIndexOf(", "),
    );
    const end = cut > 0 ? cut + 1 : 200;
    chunks.push(rem.slice(0, end).trim());
    rem = rem.slice(end).trim();
  }
  const buffers = await Promise.all(chunks.map((c) => fetchTtsChunk(c, lang)));
  return Buffer.concat(buffers);
}

// ── State ─────────────────────────────────────────────────────────────────────

interface GuildVoiceState {
  textChannel: TextChannel;
  player: ReturnType<typeof createAudioPlayer>;
  active: boolean;
}

const guildStates = new Map<string, GuildVoiceState>();

// ── Public API ────────────────────────────────────────────────────────────────

export function isInVoice(guildId: string): boolean {
  return guildStates.has(guildId);
}

export async function joinVoice(message: Message): Promise<void> {
  const voiceChannel = message.member?.voice.channel;
  if (!voiceChannel) {
    await message.reply("❌ Tu dois être dans un salon vocal d'abord ! Rejoins-en un et réessaie.");
    return;
  }

  const guildId = message.guildId!;
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

  guildStates.set(guildId, {
    textChannel: message.channel as TextChannel,
    player,
    active: true,
  });

  connection.on(VoiceConnectionStatus.Ready, () => {
    logger.info({ guildId, channel: voiceChannel.name }, "Voice connection ready");
  });

  connection.on(VoiceConnectionStatus.Disconnected, () => {
    guildStates.delete(guildId);
    logger.info({ guildId }, "Voice disconnected");
  });

  await message.reply(
    `✅ Connecté à **${voiceChannel.name}** ! 🎙️\n` +
    `• \`!voice say <texte>\` → je parle dans le salon\n` +
    `• \`!voice stop\` → je me tais\n` +
    `• \`!voice resume\` → je reprends\n` +
    `• \`!leave\` → je quitte`,
  );
}

export async function leaveVoice(message: Message): Promise<void> {
  const guildId = message.guildId!;
  const connection = getVoiceConnection(guildId);
  if (!connection) { await message.reply("❌ Je ne suis pas dans un salon vocal."); return; }
  connection.destroy();
  guildStates.delete(guildId);
  await message.reply("👋 Déconnecté du salon vocal. À bientôt !");
}

export async function voiceStop(message: Message): Promise<void> {
  const guildId = message.guildId!;
  const state = guildStates.get(guildId);
  if (!state) { await message.reply("❌ Je ne suis pas dans un salon vocal. Utilise `!join` d'abord."); return; }
  state.active = false;
  state.player.stop();
  await message.reply("🔇 Mode silencieux activé. Utilise `!voice resume` pour reprendre.");
}

export async function voiceResume(message: Message): Promise<void> {
  const guildId = message.guildId!;
  const state = guildStates.get(guildId);
  if (!state) { await message.reply("❌ Je ne suis pas dans un salon vocal. Utilise `!join` d'abord."); return; }
  state.active = true;
  await message.reply("🎙️ Mode vocal repris — je vais parler de nouveau !");
}

/**
 * Speak text in the voice channel of the given guild.
 * Returns true if speaking succeeded, false if bot is not in voice or inactive.
 */
export async function speakText(guildId: string, text: string, lang = "fr"): Promise<boolean> {
  const state = guildStates.get(guildId);
  if (!state || !state.active) return false;

  try {
    const mp3 = await textToSpeech(text, lang);
    const resource = createAudioResource(Readable.from(mp3), { inputType: StreamType.Arbitrary });
    state.player.play(resource);

    await new Promise<void>((resolve) => {
      state.player.once(AudioPlayerStatus.Idle, resolve);
    });
    return true;
  } catch (err) {
    logger.error({ err, guildId }, "Voice TTS error");
    return false;
  }
}
