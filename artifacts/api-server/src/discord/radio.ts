import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  getVoiceConnection,
  StreamType,
  NoSubscriberBehavior,
  type AudioPlayer,
} from "@discordjs/voice";
import { type Message, type TextChannel, EmbedBuilder } from "discord.js";
import { get as httpsGet } from "https";
import { get as httpGet } from "http";
import type { IncomingMessage } from "http";
import { logger } from "../lib/logger";

// ── HTTP stream fetcher (follows redirects) ───────────────────────────────────

async function fetchStream(url: string, hops = 0): Promise<IncomingMessage> {
  if (hops > 8) throw new Error("Too many redirects");
  return new Promise((resolve, reject) => {
    const getter = url.startsWith("https://") ? httpsGet : httpGet;
    getter(url, (res) => {
      const loc = res.headers.location;
      if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303) && loc) {
        fetchStream(loc.startsWith("http") ? loc : new URL(loc, url).toString(), hops + 1)
          .then(resolve).catch(reject);
      } else {
        resolve(res);
      }
    }).on("error", reject);
  });
}

// ── Radio station list ────────────────────────────────────────────────────────

export const RADIO_STATIONS: Record<string, { name: string; url: string; emoji: string; genre: string; lang: "fr" | "es" | "en" }> = {
  // 🇫🇷 French
  nrj:         { name: "NRJ",            url: "https://cdn.nrjaudio.fm/audio1/fr/30001/mp3_128.mp3",               emoji: "🔥", genre: "Pop / Hits",              lang: "fr" },
  fun:         { name: "Fun Radio",      url: "https://streaming.radio.funradio.fr/fun-1-44-128",                   emoji: "🎉", genre: "Dance / Electronic",       lang: "fr" },
  rtl:         { name: "RTL",            url: "https://streaming.radio.rtl.fr/rtl-1-44-128",                       emoji: "📻", genre: "News / Variety",           lang: "fr" },
  europe1:     { name: "Europe 1",       url: "https://europe1.lmn.fm/europe1.mp3",                                emoji: "🌍", genre: "News / Talk",              lang: "fr" },
  skyrock:     { name: "Skyrock",        url: "https://icecast.skyrock.net/s/natio_mp3_128k",                      emoji: "🎤", genre: "Hip-Hop / R&B",            lang: "fr" },
  franceinter: { name: "France Inter",   url: "https://icecast.radiofrance.fr/franceinter-midfi.mp3",              emoji: "🎙️", genre: "Culture / Talk",          lang: "fr" },
  musique:     { name: "France Musique", url: "https://icecast.radiofrance.fr/francemusique-midfi.mp3",            emoji: "🎼", genre: "Classical",                lang: "fr" },
  virgin:      { name: "Virgin Radio",   url: "https://streaming.radio.virginradio.fr/virgin-1-44-128",            emoji: "🎸", genre: "Rock / Alternative",       lang: "fr" },
  nostalgie:   { name: "Nostalgie",      url: "https://cdn.nrjaudio.fm/audio1/fr/30601/mp3_128.mp3",               emoji: "🕰️", genre: "Oldies / French classics", lang: "fr" },
  cherie:      { name: "Chérie FM",      url: "https://cdn.nrjaudio.fm/audio1/fr/30201/aac_64.mp3",                emoji: "💕", genre: "Pop / Love songs",         lang: "fr" },
  // 🇪🇸 Spanish
  los40:       { name: "Los 40",         url: "https://25553.live.streamtheworld.com/LOS40_SC",                    emoji: "🔊", genre: "Pop / Hits",               lang: "es" },
  cadena100:   { name: "Cadena 100",     url: "https://25773.live.streamtheworld.com/CADENA100_SC",                emoji: "💃", genre: "Pop / Dance",              lang: "es" },
  europafm:    { name: "Europa FM",      url: "https://25773.live.streamtheworld.com/EUROPAFM_SC",                 emoji: "🌟", genre: "Rock / Pop",               lang: "es" },
  dial:        { name: "Cadena Dial",    url: "https://25773.live.streamtheworld.com/CADENADIAL_SC",               emoji: "🎶", genre: "Spanish Pop / Romántica",  lang: "es" },
  // 🇬🇧 English
  bbc1:        { name: "BBC Radio 1",    url: "https://stream.live.vc.bbcmedia.co.uk/bbc_radio_one",               emoji: "🇬🇧", genre: "Pop / Hits",             lang: "en" },
  bbc2:        { name: "BBC Radio 2",    url: "https://stream.live.vc.bbcmedia.co.uk/bbc_radio_two",               emoji: "🎵", genre: "Pop / Oldies",             lang: "en" },
  capital:     { name: "Capital FM",     url: "https://media-ice.musicradio.com/CapitalMP3",                       emoji: "🏙️", genre: "Pop / Dance Hits",        lang: "en" },
  heart:       { name: "Heart FM",       url: "https://media-ice.musicradio.com/HeartMP3",                         emoji: "❤️", genre: "Easy Listening / Pop",    lang: "en" },
  absolute:    { name: "Absolute Radio", url: "https://media-ice.musicradio.com/AbsoluteRadioMP3",                 emoji: "🎸", genre: "Classic Rock",             lang: "en" },
};

// ── State ─────────────────────────────────────────────────────────────────────

interface RadioState {
  player: AudioPlayer;
  stationKey: string | null;
  youtubeTitle: string | null;
  youtubeUrl: string | null;
  queue: string[];
  queueName: string | null;
  notifyChannel: TextChannel | null;
  guildId: string;
}

const radioStates = new Map<string, RadioState>();

// ── Queue playback (internal) ─────────────────────────────────────────────────

async function playNextFromQueue(guildId: string): Promise<void> {
  const state = radioStates.get(guildId);
  if (!state || state.queue.length === 0) return;

  const url = state.queue.shift()!;

  try {
    const play = await import("play-dl");
    const info = await play.video_info(url);
    const title = info.video_details.title ?? "Unknown";
    const duration = info.video_details.durationInSec ?? 0;
    const thumbnail = info.video_details.thumbnails?.[0]?.url ?? null;

    const stream = await play.stream(url, { quality: 2 });
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type as unknown as StreamType,
    });

    state.stationKey = null;
    state.youtubeTitle = title;
    state.youtubeUrl = url;
    state.player.play(resource);

    if (state.notifyChannel) {
      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("▶️ Now playing")
        .setDescription(`**${title}**`)
        .addFields(
          { name: "Duration", value: `${mins}:${secs.toString().padStart(2, "0")}`, inline: true },
          { name: "Queue", value: state.queue.length > 0 ? `${state.queue.length} video${state.queue.length !== 1 ? "s" : ""} remaining` : "Last video", inline: true },
        );
      if (thumbnail) embed.setThumbnail(thumbnail);
      await state.notifyChannel.send({ embeds: [embed] }).catch(() => null);
    }
  } catch (err) {
    logger.error({ err, url }, "Queue playback error");
    if (state.queue.length > 0) {
      await playNextFromQueue(guildId);
    } else {
      radioStates.delete(guildId);
      getVoiceConnection(guildId)?.destroy();
    }
  }
}

// ── Voice connection helper ───────────────────────────────────────────────────

export async function ensureVoiceConnection(message: Message): Promise<boolean> {
  const voiceChannel = message.member?.voice.channel;
  if (!voiceChannel) {
    await message.reply("❌ You need to be in a voice channel first!");
    return false;
  }

  const guildId = message.guildId!;
  let connection = getVoiceConnection(guildId);

  if (!connection) {
    connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });

    connection.on(VoiceConnectionStatus.Disconnected, () => {
      radioStates.delete(guildId);
    });
  }

  if (!radioStates.has(guildId)) {
    const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
    connection.subscribe(player);

    // Persistent queue handler — fires when a YouTube track ends
    player.on(AudioPlayerStatus.Idle, () => {
      const s = radioStates.get(guildId);
      if (!s || s.stationKey) return; // Radio playing — don't touch
      if (s.queue.length > 0) {
        playNextFromQueue(guildId).catch((err) => logger.error({ err }, "Auto-queue error"));
      }
    });

    radioStates.set(guildId, {
      player,
      stationKey: null,
      youtubeTitle: null,
      youtubeUrl: null,
      queue: [],
      queueName: null,
      notifyChannel: null,
      guildId,
    });
  } else {
    connection.subscribe(radioStates.get(guildId)!.player);
  }

  return true;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function isRadioActive(guildId: string): boolean {
  return radioStates.has(guildId);
}

export function nowPlaying(guildId: string): EmbedBuilder | null {
  const state = radioStates.get(guildId);
  if (!state) return null;

  if (state.stationKey) {
    const station = RADIO_STATIONS[state.stationKey];
    if (!station) return null;
    return new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("📻 Now Playing — Radio")
      .setDescription(`${station.emoji} **${station.name}**`)
      .addFields(
        { name: "Genre", value: station.genre, inline: true },
        { name: "Switch", value: `\`!radio <key>\``, inline: true },
        { name: "Stop", value: "`!radio leave`", inline: true },
      );
  }

  if (state.youtubeTitle) {
    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("▶️ Now Playing — YouTube")
      .setDescription(`**${state.youtubeTitle}**`);
    if (state.youtubeUrl) embed.setFooter({ text: state.youtubeUrl });
    if (state.queue.length > 0) {
      embed.addFields({ name: "Queue", value: `${state.queue.length} video${state.queue.length !== 1 ? "s" : ""} remaining`, inline: true });
      if (state.queueName) embed.addFields({ name: "Playlist", value: state.queueName, inline: true });
    }
    return embed;
  }

  return null;
}

const RADIO_PAGES: { lang: "en" | "fr" | "es"; flag: string; label: string }[] = [
  { lang: "en", flag: "🇬🇧", label: "English" },
  { lang: "fr", flag: "🇫🇷", label: "French" },
  { lang: "es", flag: "🇪🇸", label: "Spanish" },
];

export function langToPage(lang?: string): 1 | 2 | 3 {
  if (lang === "fr") return 2;
  if (lang === "es") return 3;
  return 1;
}

export function buildRadioListEmbed(page: 1 | 2 | 3): EmbedBuilder {
  const { lang, flag, label } = RADIO_PAGES[page - 1]!;
  const color = lang === "fr" ? 0x5865f2 : lang === "es" ? 0xe74c3c : 0x1abc9c;
  const stations = Object.entries(RADIO_STATIONS).filter(([, s]) => s.lang === lang);
  const lines = stations.map(([key, s]) => `${s.emoji} \`${key}\` — **${s.name}** · *${s.genre}*`).join("\n");

  return new EmbedBuilder()
    .setTitle(`📻 Radio — ${flag} ${label}`)
    .setColor(color)
    .setDescription(lines)
    .setFooter({ text: `Page ${page}/3 · ⬅️ ➡️ to navigate · !radio <key> to play · !radio leave to stop` });
}

export async function playRadio(message: Message, stationKey: string): Promise<void> {
  const station = RADIO_STATIONS[stationKey.toLowerCase()];
  if (!station) {
    const keys = Object.keys(RADIO_STATIONS).join("`, `");
    await message.reply(`❌ Unknown station. Available: \`${keys}\`\nSee the full list with \`!radio list\`.`);
    return;
  }

  const ready = await ensureVoiceConnection(message);
  if (!ready) return;

  const guildId = message.guildId!;
  const state = radioStates.get(guildId)!;
  state.stationKey = stationKey.toLowerCase();
  state.youtubeTitle = null;
  state.youtubeUrl = null;
  state.queue = [];

  try {
    const stream = await fetchStream(station.url);
    const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
    state.player.play(resource);

    state.player.once(AudioPlayerStatus.Playing, async () => {
      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle(`${station.emoji} Now playing — ${station.name}`)
        .addFields(
          { name: "Genre", value: station.genre, inline: true },
          { name: "Stop", value: "`!radio leave`", inline: true },
        )
        .setFooter({ text: "Switch station anytime with !radio <key>" });
      await message.reply({ embeds: [embed] });
    });

    state.player.once("error", async (err) => {
      logger.error({ err, stationKey }, "Radio stream error");
      await message.reply(`❌ Stream error for **${station.name}**. Try another station with \`!radio list\`.`);
      radioStates.delete(guildId);
      getVoiceConnection(guildId)?.destroy();
    });

  } catch (err) {
    logger.error({ err, stationKey }, "Radio play error");
    await message.reply("❌ Failed to start the radio stream. Try again!");
    radioStates.delete(guildId);
    getVoiceConnection(guildId)?.destroy();
  }
}

export async function stopRadio(message: Message): Promise<void> {
  const guildId = message.guildId!;
  const state = radioStates.get(guildId);

  if (!state) {
    await message.reply("❌ Nothing is currently playing.");
    return;
  }

  state.player.stop();
  radioStates.delete(guildId);
  getVoiceConnection(guildId)?.destroy();
  await message.reply("👋 Stopped and disconnected.");
}

export async function playYoutube(message: Message, url: string): Promise<void> {
  if (!url.includes("youtube.com/") && !url.includes("youtu.be/")) {
    await message.reply("❌ Please provide a valid YouTube URL.\nExample: `!youtube https://www.youtube.com/watch?v=...`");
    return;
  }

  const ready = await ensureVoiceConnection(message);
  if (!ready) return;

  const guildId = message.guildId!;
  const state = radioStates.get(guildId)!;
  state.queue = [];
  state.queueName = null;

  const waitMsg = await message.reply("🎬 Loading YouTube audio, please wait...");

  try {
    const play = await import("play-dl");
    const info = await play.video_info(url);
    const title = info.video_details.title ?? "Unknown";
    const duration = info.video_details.durationInSec ?? 0;
    const thumbnail = info.video_details.thumbnails?.[0]?.url ?? null;

    const stream = await play.stream(url, { quality: 2 });
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type as unknown as StreamType,
    });

    state.stationKey = null;
    state.youtubeTitle = title;
    state.youtubeUrl = url;
    state.player.play(resource);

    state.player.once(AudioPlayerStatus.Playing, async () => {
      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("▶️ Now playing")
        .setDescription(`**${title}**`)
        .addFields(
          { name: "Duration", value: `${mins}:${secs.toString().padStart(2, "0")}`, inline: true },
          { name: "Stop", value: "`!radio leave`", inline: true },
        )
        .setFooter({ text: url });
      if (thumbnail) embed.setThumbnail(thumbnail);
      await waitMsg.edit({ content: "", embeds: [embed] });
    });

    state.player.once("error", async (err) => {
      logger.error({ err, url }, "YouTube playback error");
      await waitMsg.edit("❌ Playback error. The video may be unavailable or age-restricted.");
      radioStates.delete(guildId);
      getVoiceConnection(guildId)?.destroy();
    });

  } catch (err) {
    logger.error({ err, url }, "YouTube load error");
    await waitMsg.edit("❌ Failed to load the YouTube video. It may be private, age-restricted or unavailable.");
    radioStates.delete(guildId);
    getVoiceConnection(guildId)?.destroy();
  }
}

export async function startQueue(message: Message, urls: string[], playlistName?: string): Promise<void> {
  if (urls.length === 0) {
    await message.reply("❌ The playlist is empty.");
    return;
  }

  const ready = await ensureVoiceConnection(message);
  if (!ready) return;

  const guildId = message.guildId!;
  const state = radioStates.get(guildId)!;
  state.stationKey = null;
  state.queue = urls.slice(1); // Rest of the queue after first video
  state.queueName = playlistName ?? null;
  state.notifyChannel = message.channel as TextChannel;

  const firstUrl = urls[0];
  const waitMsg = await message.reply(
    `🎵 Loading playlist **${playlistName ?? "queue"}** (${urls.length} video${urls.length !== 1 ? "s" : ""})...`,
  );

  try {
    const play = await import("play-dl");
    const info = await play.video_info(firstUrl);
    const title = info.video_details.title ?? "Unknown";
    const duration = info.video_details.durationInSec ?? 0;
    const thumbnail = info.video_details.thumbnails?.[0]?.url ?? null;

    const stream = await play.stream(firstUrl, { quality: 2 });
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type as unknown as StreamType,
    });

    state.youtubeTitle = title;
    state.youtubeUrl = firstUrl;
    state.player.play(resource);

    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle(`▶️ Now playing — ${playlistName ? `Playlist: ${playlistName}` : "Queue"}`)
      .setDescription(`**${title}**`)
      .addFields(
        { name: "Duration", value: `${mins}:${secs.toString().padStart(2, "0")}`, inline: true },
        { name: "Queue", value: state.queue.length > 0 ? `${state.queue.length} video${state.queue.length !== 1 ? "s" : ""} after this` : "Last video", inline: true },
      );
    if (thumbnail) embed.setThumbnail(thumbnail);
    await waitMsg.edit({ content: "", embeds: [embed] });

  } catch (err) {
    logger.error({ err, firstUrl }, "Playlist first video error");
    await waitMsg.edit("❌ Failed to load the first video. Skipping...");
    if (state.queue.length > 0) {
      await playNextFromQueue(guildId);
    }
  }
}
