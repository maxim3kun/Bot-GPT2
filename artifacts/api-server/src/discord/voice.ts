import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  getVoiceConnection,
  EndBehaviorType,
  StreamType,
  NoSubscriberBehavior,
  type VoiceConnection,
} from "@discordjs/voice";
import { type Message, type TextChannel } from "discord.js";
import { Readable } from "stream";
import { logger } from "../lib/logger";

function buildCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i << 24;
    for (let j = 0; j < 8; j++) c = (c & 0x80000000) ? ((c << 1) ^ 0x04c11db7) : (c << 1);
    table[i] = c >>> 0;
  }
  return table;
}
const CRC32 = buildCrc32Table();

function oggCrc32(buf: Buffer): number {
  let crc = 0;
  for (let i = 0; i < buf.length; i++) {
    crc = (CRC32[(((crc >>> 24) ^ buf[i]!) & 0xff)!]! ^ (crc << 8)) >>> 0;
  }
  return crc;
}

function oggPage(headerType: number, granule: bigint, serial: number, seq: number, payload: Buffer): Buffer {
  const segs: number[] = [];
  let rem = payload.length;
  while (rem >= 255) { segs.push(255); rem -= 255; }
  segs.push(rem);

  const hdrLen = 27 + segs.length;
  const page = Buffer.allocUnsafe(hdrLen + payload.length);
  page.write("OggS", 0, "ascii");
  page[4] = 0;
  page[5] = headerType;
  page.writeBigInt64LE(granule, 6);
  page.writeUInt32LE(serial, 14);
  page.writeUInt32LE(seq, 18);
  page.writeUInt32LE(0, 22);
  page[26] = segs.length;
  for (let i = 0; i < segs.length; i++) page[27 + i] = segs[i]!;
  payload.copy(page, hdrLen);
  page.writeUInt32LE(oggCrc32(page), 22);
  return page;
}

function opusIdHeader(channels = 2, sampleRate = 48000): Buffer {
  const b = Buffer.allocUnsafe(19);
  b.write("OpusHead", 0, "ascii");
  b[8] = 1; b[9] = channels;
  b.writeUInt16LE(312, 10);
  b.writeUInt32LE(sampleRate, 12);
  b.writeInt16LE(0, 16);
  b[18] = 0;
  return b;
}

function opusTagsHeader(): Buffer {
  const vendor = Buffer.from("DiscordBot", "utf8");
  const b = Buffer.allocUnsafe(8 + 4 + vendor.length + 4);
  b.write("OpusTags", 0, "ascii");
  b.writeUInt32LE(vendor.length, 8);
  vendor.copy(b, 12);
  b.writeUInt32LE(0, 12 + vendor.length);
  return b;
}

function packetsToOgg(packets: Buffer[]): Buffer {
  if (packets.length === 0) return Buffer.alloc(0);
  const serial = Math.floor(Math.random() * 0xffffffff);
  const pages: Buffer[] = [];
  pages.push(oggPage(0x02, 0n, serial, 0, opusIdHeader()));
  pages.push(oggPage(0x00, 0n, serial, 1, opusTagsHeader()));

  const FRAME_SAMPLES = 960n;
  let granule = 0n;
  for (let i = 0; i < packets.length; i++) {
    granule += FRAME_SAMPLES;
    const eos = i === packets.length - 1 ? 0x04 : 0x00;
    pages.push(oggPage(eos, granule, serial, i + 2, packets[i]!));
  }
  return Buffer.concat(pages);
}

async function transcribeOgg(oggBuffer: Buffer): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(oggBuffer)], { type: "audio/ogg" }), "audio.ogg");
  form.append("model", "whisper-large-v3-turbo");
  form.append("response_format", "json");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Groq STT ${res.status}: ${body}`);
  }
  const data = (await res.json()) as { text: string };
  return data.text.trim();
}

async function chatWithGroq(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages, max_tokens: 150, temperature: 0.7 }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Groq LLM ${res.status}: ${body}`);
  }
  const data = (await res.json()) as { choices: [{ message: { content: string } }] };
  return data.choices[0].message.content.trim();
}

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

async function textToSpeech(text: string, lang = "fr"): Promise<Buffer> {
  const chunks: string[] = [];
  let rem = text.trim();
  while (rem.length > 0) {
    if (rem.length <= 200) { chunks.push(rem); break; }
    const slice = rem.slice(0, 200);
    const cut = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("? "), slice.lastIndexOf("! "), slice.lastIndexOf(", "));
    const end = cut > 0 ? cut + 1 : 200;
    chunks.push(rem.slice(0, end).trim());
    rem = rem.slice(end).trim();
  }
  const buffers = await Promise.all(chunks.map((c) => fetchTtsChunk(c, lang)));
  return Buffer.concat(buffers);
}

type VoiceMode = "full" | "subtitles";

interface ConvTurn { role: "user" | "assistant"; content: string; }

interface GuildVoiceState {
  mode: VoiceMode;
  subtitles: boolean;
  textChannel: TextChannel;
  history: ConvTurn[];
  processing: Set<string>;
  player: ReturnType<typeof createAudioPlayer>;
}

const guildStates = new Map<string, GuildVoiceState>();

export async function joinVoice(message: Message): Promise<void> {
  const voiceChannel = message.member?.voice.channel;
  if (!voiceChannel) {
    await message.reply("❌ You need to be in a voice channel first! Join one and try again.");
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
    mode: "full",
    subtitles: false,
    textChannel: message.channel as TextChannel,
    history: [],
    processing: new Set(),
    player,
  });

  connection.on(VoiceConnectionStatus.Ready, () => {
    logger.info({ guildId, channel: voiceChannel.name }, "Voice connection ready");
    setupReceiver(connection, guildId);
  });

  connection.on(VoiceConnectionStatus.Disconnected, () => {
    guildStates.delete(guildId);
    logger.info({ guildId }, "Voice disconnected");
  });

  await message.reply(
    `✅ Joined **${voiceChannel.name}**! 🎙️ Speak and I'll reply in voice.\n` +
    `• \`!voice stop\` → subtitles-only mode\n` +
    `• \`!voice resume\` → back to full voice mode\n` +
    `• \`!subtitles\` → toggle transcription here\n` +
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

export async function toggleSubtitles(message: Message): Promise<void> {
  const guildId = message.guildId!;
  const state = guildStates.get(guildId);
  if (!state) { await message.reply("❌ I'm not in a voice channel. Use `!join` first."); return; }
  state.subtitles = !state.subtitles;
  await message.reply(
    state.subtitles
      ? "📝 Subtitles **enabled** — transcription will appear here."
      : "🔇 Subtitles **disabled**.",
  );
}

export async function voiceStop(message: Message): Promise<void> {
  const guildId = message.guildId!;
  const state = guildStates.get(guildId);
  if (!state) { await message.reply("❌ I'm not in a voice channel. Use `!join` first."); return; }
  state.mode = "subtitles";
  state.subtitles = true;
  state.player.stop();
  await message.reply(
    "📝 **Subtitles-only mode** enabled — I'll transcribe your voice here but won't reply in voice.\n" +
    "Use `!voice resume` to go back to full voice mode.",
  );
}

export async function voiceResume(message: Message): Promise<void> {
  const guildId = message.guildId!;
  const state = guildStates.get(guildId);
  if (!state) { await message.reply("❌ I'm not in a voice channel. Use `!join` first."); return; }
  state.mode = "full";
  await message.reply("🎙️ **Full voice mode** resumed — speak and I'll reply in voice!");
}

function setupReceiver(connection: VoiceConnection, guildId: string): void {
  const receiver = connection.receiver;

  receiver.speaking.on("start", (userId) => {
    const state = guildStates.get(guildId);
    if (!state || state.processing.has(userId)) return;
    state.processing.add(userId);

    const audioStream = receiver.subscribe(userId, {
      end: { behavior: EndBehaviorType.AfterSilence, duration: 1000 },
    });

    const packets: Buffer[] = [];

    audioStream
      .on("data", (packet: Buffer) => packets.push(packet))
      .on("end", () => {
        void processPackets(guildId, userId, packets).finally(() =>
          state.processing.delete(userId),
        );
      })
      .on("error", (err: Error) => {
        logger.error({ err, userId }, "Audio receive error");
        state.processing.delete(userId);
      });
  });
}

async function processPackets(guildId: string, userId: string, packets: Buffer[]): Promise<void> {
  const state = guildStates.get(guildId);
  if (!state) return;

  if (packets.length < 40) return;

  try {
    const oggBuffer = packetsToOgg(packets);

    const userText = await transcribeOgg(oggBuffer);
    logger.info({ userId, userText, packets: packets.length }, "Voice STT");
    if (!userText) return;

    if (state.subtitles) {
      await state.textChannel.send(`🎙️ <@${userId}> : *${userText}*`);
    }

    if (state.mode !== "full") return;

    const botReply = await chatWithGroq([
      {
        role: "system",
        content:
          "You are a friendly Discord voice bot. Reply in 1-2 sentences max — this is voice chat, keep it short. You can talk about music, games, or just chat.",
      },
      ...state.history.slice(-10),
      { role: "user", content: userText },
    ]);
    logger.info({ botReply }, "LLM reply");

    state.history.push({ role: "user", content: userText });
    state.history.push({ role: "assistant", content: botReply });
    if (state.history.length > 20) state.history.splice(0, 2);

    if (state.subtitles) {
      await state.textChannel.send(`🤖 **Bot :** ${botReply}`);
    }

    const mp3 = await textToSpeech(botReply, "en");
    const resource = createAudioResource(Readable.from(mp3), { inputType: StreamType.Arbitrary });
    state.player.play(resource);

    await new Promise<void>((resolve) => {
      state.player.once(AudioPlayerStatus.Idle, resolve);
    });
  } catch (err) {
    logger.error({ err, userId, guildId }, "Voice pipeline error");
    if (state.subtitles) {
      await state.textChannel.send(`⚠️ Voice error: ${String(err)}`);
    }
  }
}
