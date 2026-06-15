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
import { type Message, type TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from "discord.js";
import { get as httpsGet } from "https";
import { get as httpGet } from "http";
import type { IncomingMessage } from "http";
import { logger } from "../lib/logger";
import { ytdlpInfo, ytdlpStream, ytdlpSearch, cleanYouTubeTitle, type YtInfo } from "../lib/ytdlp";

// ── Fast YouTube search via play-dl (in-process, no subprocess overhead) ─────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _play: any = null;
async function getPlay() {
  if (!_play) _play = (await import("play-dl")).default ?? (await import("play-dl"));
  return _play;
}

async function fastYouTubeSearch(query: string, limit = 5): Promise<{ url: string; title: string; duration: number; channel: string | null }[]> {
  // Run play-dl and yt-dlp in parallel for broader coverage
  const [playDlResult, ytdlpResult] = await Promise.allSettled([
    (async () => {
      const play = await getPlay();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: any[] = await play.search(query, { source: { youtube: "video" }, limit });
      if (!results?.length) return [] as { url: string; title: string; duration: number; channel: string | null }[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return results.map((v: any) => ({
        url: v.url as string,
        title: (v.title as string) ?? query,
        duration: (v.durationInSec as number) ?? 0,
        channel: (v.channel?.name as string) ?? null,
      }));
    })(),
    ytdlpSearch(query, limit),
  ]);

  const seen = new Set<string>();
  const merged: { url: string; title: string; duration: number; channel: string | null }[] = [];

  for (const res of [playDlResult, ytdlpResult]) {
    if (res.status !== "fulfilled") continue;
    for (const r of res.value) {
      if (!seen.has(r.url)) {
        seen.add(r.url);
        merged.push(r);
      }
    }
  }

  if (merged.length === 0) {
    if (ytdlpResult.status === "fulfilled") return [];
    throw (playDlResult as PromiseRejectedResult).reason ?? new Error("YouTube search failed");
  }

  return merged.slice(0, limit);
}

import { getVoicePickerChannels } from "./voice-picker-channels.js";

// ── Pending voice commands (auto-retry after joining voice) ───────────────────

const pendingVoiceCmds = new Map<string, {
  fn: () => Promise<void>;
  userId: string;
  expires: number;
}>();

export function registerPendingVoiceCmd(key: string, userId: string, fn: () => Promise<void>): void {
  const now = Date.now();
  for (const [k, v] of pendingVoiceCmds) {
    if (v.expires < now) pendingVoiceCmds.delete(k);
  }
  pendingVoiceCmds.set(key, { fn, userId, expires: now + 5 * 60 * 1000 });
}

export function consumePendingVoiceCmd(key: string, userId: string): (() => Promise<void>) | null {
  const entry = pendingVoiceCmds.get(key);
  if (!entry) return null;
  if (entry.userId !== userId) return null;
  if (entry.expires < Date.now()) { pendingVoiceCmds.delete(key); return null; }
  pendingVoiceCmds.delete(key);
  return entry.fn;
}

// ── HTTP stream fetcher (follows redirects) ───────────────────────────────────

const STREAM_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Icy-MetaData": "0",
  "Connection": "keep-alive",
  "Accept": "*/*",
};

async function fetchStream(url: string, hops = 0): Promise<IncomingMessage> {
  if (hops > 8) throw new Error("Too many redirects");
  return new Promise((resolve, reject) => {
    const getter = url.startsWith("https://") ? httpsGet : httpGet;
    const req = getter(url, { headers: STREAM_HEADERS }, (res) => {
      const loc = res.headers.location;
      if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303) && loc) {
        res.resume(); // drain and discard redirect body
        fetchStream(loc.startsWith("http") ? loc : new URL(loc, url).toString(), hops + 1)
          .then(resolve).catch(reject);
        return;
      }
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode} from ${url}`));
        return;
      }
      const ct = (res.headers["content-type"] ?? "").toLowerCase();
      // Some stations return an M3U/PLS playlist — parse first URL from it
      if (ct.includes("mpegurl") || ct.includes("x-scpls") || url.endsWith(".m3u") || url.endsWith(".m3u8") || url.endsWith(".pls")) {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => { body += chunk; if (body.length > 8192) res.destroy(); });
        res.on("end", () => {
          const firstUrl = body.split("\n").map(l => l.trim()).find(l => l.startsWith("http"));
          if (firstUrl) fetchStream(firstUrl, hops + 1).then(resolve).catch(reject);
          else reject(new Error("Empty playlist from " + url));
        });
        res.on("error", reject);
        return;
      }
      resolve(res);
    });
    req.on("error", reject);
    req.setTimeout(8_000, () => { req.destroy(); reject(new Error(`Timeout connecting to ${url}`)); });
  });
}

// ── Radio station list ────────────────────────────────────────────────────────

export const RADIO_STATIONS: Record<string, { name: string; url: string; emoji: string; genre: string; lang: "fr" | "es" | "en" }> = {
  // 🇫🇷 French
  nrj:         { name: "NRJ",            url: "https://cdn.nrjaudio.fm/audio1/fr/30001/mp3_128.mp3",               emoji: "🔥", genre: "Pop / Hits",              lang: "fr" },
  fun:         { name: "Fun Radio",      url: "https://icecast.rtl.fr/fun-1-44-128",                               emoji: "🎉", genre: "Dance / Electronic",       lang: "fr" },
  skyrock:     { name: "Skyrock",        url: "https://icecast.skyrock.net/s/natio_mp3_128k",                      emoji: "🎤", genre: "Hip-Hop / R&B",            lang: "fr" },
  franceinter: { name: "France Inter",   url: "https://icecast.radiofrance.fr/franceinter-midfi.mp3",              emoji: "🎙️", genre: "Culture / Talk",          lang: "fr" },
  franceinfo:  { name: "France Info",    url: "https://icecast.radiofrance.fr/franceinfo-midfi.mp3",               emoji: "📰", genre: "News / Info",              lang: "fr" },
  musique:     { name: "France Musique", url: "https://icecast.radiofrance.fr/francemusique-midfi.mp3",            emoji: "🎼", genre: "Classical",                lang: "fr" },
  ouifm:       { name: "OÜI FM",         url: "https://ouifm.ice.infomaniak.ch/ouifm-high.mp3",                    emoji: "🎸", genre: "Rock / Alternative",       lang: "fr" },
  nostalgie:   { name: "Nostalgie",      url: "https://cdn.nrjaudio.fm/adwz2/fr/30601/mp3_128.mp3",               emoji: "🕰️", genre: "Oldies / French classics", lang: "fr" },
  rtl2:        { name: "RTL 2",          url: "https://icecast.rtl2.fr/rtl2-1-44-128",                             emoji: "🔊", genre: "Rock / Pop",               lang: "fr" },
  evasion:     { name: "Évasion FM",     url: "https://stream.evasionfm.com/stream",                               emoji: "🌅", genre: "Variété / Détente",        lang: "fr" },
  // 🇪🇸 Spanish
  los40:       { name: "Los 40",         url: "https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40_SC",       emoji: "🔊", genre: "Pop / Hits",               lang: "es" },
  cadena100:   { name: "Cadena 100",     url: "https://playerservices.streamtheworld.com/api/livestream-redirect/CADENA100_SC",   emoji: "💃", genre: "Pop / Dance",              lang: "es" },
  europafm:    { name: "Europa FM",      url: "https://playerservices.streamtheworld.com/api/livestream-redirect/EUROPAFM_SC",    emoji: "🌟", genre: "Rock / Pop",               lang: "es" },
  dial:        { name: "Cadena Dial",    url: "https://playerservices.streamtheworld.com/api/livestream-redirect/CADENADIAL_SC",  emoji: "🎶", genre: "Spanish Pop / Romántica",  lang: "es" },
  rock_es:     { name: "Rock FM ES",     url: "https://playerservices.streamtheworld.com/api/livestream-redirect/ROCKFM_SC",      emoji: "🤘", genre: "Rock",                     lang: "es" },
  cope:        { name: "COPE",           url: "https://cope.stream.cope.es/cope128.mp3",                                         emoji: "📢", genre: "News / Talk",              lang: "es" },
  // 🇬🇧 English
  capital:     { name: "Capital FM",     url: "https://media-ice.musicradio.com/CapitalMP3",                        emoji: "🏙️", genre: "Pop / Dance Hits",        lang: "en" },
  heart:       { name: "Heart FM",       url: "https://media-ice.musicradio.com/HeartLondonMP3",                     emoji: "❤️", genre: "Easy Listening / Pop",    lang: "en" },
  radiox:      { name: "Radio X",        url: "https://media-ice.musicradio.com/RadioXManchesterMP3",               emoji: "📻", genre: "Rock / Indie",             lang: "en" },
  classicfm:   { name: "Classic FM",     url: "https://media-ice.musicradio.com/ClassicFMMP3",                      emoji: "🎼", genre: "Classical",                lang: "en" },
  smooth:      { name: "Smooth Radio",   url: "https://media-ice.musicradio.com/SmoothLondonMP3",                   emoji: "🌊", genre: "Soul / Smooth",            lang: "en" },
  kexp:        { name: "KEXP",           url: "https://kexp-mp3-128.streamguys1.com/kexp128.mp3",                   emoji: "🌍", genre: "Indie / Alternative",      lang: "en" },
  groove:      { name: "Groove Salad",   url: "http://ice3.somafm.com/groovesalad-128-mp3",                         emoji: "🌿", genre: "Ambient / Electronic",     lang: "en" },
  lush:        { name: "Lush",           url: "http://ice3.somafm.com/lush-128-mp3",                                emoji: "🌸", genre: "Pop / Chill",              lang: "en" },
  defcon:      { name: "DEF CON Radio",  url: "http://ice3.somafm.com/defcon-128-mp3",                              emoji: "🔒", genre: "Electronic / Hacker",      lang: "en" },
};

// ── State ─────────────────────────────────────────────────────────────────────

interface RadioState {
  player: AudioPlayer;
  stationKey: string | null;
  youtubeTitle: string | null;
  youtubeUrl: string | null;
  youtubeStartTime: number | null;
  queue: string[];
  queueName: string | null;
  notifyChannel: TextChannel | null;
  guildId: string;
  idleTimer: ReturnType<typeof setTimeout> | null;
  aloneTimer: ReturnType<typeof setTimeout> | null;
  nowPlayingMsg: Message | null;
  paused: boolean;
  requestedBy: string | null;
}

export const radioStates = new Map<string, RadioState>();

// ── Auto-disconnect helpers ────────────────────────────────────────────────────

const IDLE_TIMEOUT_MS   = 2 * 60 * 1000; // 2 min — nothing playing
const ALONE_TIMEOUT_MS  = 5 * 60 * 1000; // 5 min — bot alone in channel

function clearIdleTimer(state: RadioState): void {
  if (state.idleTimer) { clearTimeout(state.idleTimer); state.idleTimer = null; }
}

function clearAloneTimer(state: RadioState): void {
  if (state.aloneTimer) { clearTimeout(state.aloneTimer); state.aloneTimer = null; }
}

function autoDisconnect(guildId: string, reason: string): void {
  const state = radioStates.get(guildId);
  if (!state) return;
  clearIdleTimer(state);
  clearAloneTimer(state);
  state.player.stop();
  radioStates.delete(guildId);
  getVoiceConnection(guildId)?.destroy();
  state.notifyChannel?.send(reason).catch(() => null);
}

function startIdleTimer(guildId: string): void {
  const state = radioStates.get(guildId);
  if (!state || state.idleTimer) return;
  state.idleTimer = setTimeout(() => {
    const cur = radioStates.get(guildId);
    if (!cur || cur.stationKey || cur.queue.length > 0 || cur.youtubeTitle) return;
    autoDisconnect(guildId, "😴 Inactive for 2 minutes — leaving the voice channel.");
  }, IDLE_TIMEOUT_MS);
}

/** Called from bot.ts voiceStateUpdate — pass true when bot is alone, false when users are present. */
export function onVoiceAloneChange(guildId: string, isAlone: boolean): void {
  const state = radioStates.get(guildId);
  if (!state) return;
  if (isAlone) {
    if (!state.aloneTimer) {
      state.aloneTimer = setTimeout(() => {
        autoDisconnect(guildId, "😶 Alone in the channel for 5 minutes — disconnecting.");
      }, ALONE_TIMEOUT_MS);
    }
  } else {
    clearAloneTimer(state);
  }
}

// ── Now Playing button helpers ────────────────────────────────────────────────

export function buildNpButtonRows(paused: boolean): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("np:like")
        .setLabel("Like")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(paused ? "np:resume" : "np:pause")
        .setLabel(paused ? "Resume" : "Pause")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("np:skip")
        .setLabel("Skip")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("np:stop")
        .setLabel("Stop")
        .setStyle(ButtonStyle.Danger),
    ),
  ];
}

// ── Now Playing embed builder ─────────────────────────────────────────────────

interface NowPlayingEmbedOpts {
  title: string;
  url: string;
  duration: string;
  thumbnail: string | null;
  requestedBy?: string;
  queueCount?: number;
}

function buildNowPlayingEmbed(opts: NowPlayingEmbedOpts): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("🎵 Now Playing")
    .setURL(opts.url)
    .setDescription(`**[${opts.title}](${opts.url})**`)
    .addFields(
      { name: "Duration", value: opts.duration, inline: true },
      ...(opts.requestedBy ? [{ name: "Requested by", value: `<@${opts.requestedBy}>`, inline: true }] : []),
      ...(opts.queueCount && opts.queueCount > 0 ? [{ name: "Queue", value: `${opts.queueCount} next • \`!queue\``, inline: true }] : []),
    )
    .setFooter({ text: "!y <title or url> to add  •  !queue to see upcoming" });
  if (opts.thumbnail) embed.setThumbnail(opts.thumbnail);
  return embed;
}

async function disableNpButtonsForState(state: RadioState): Promise<void> {
  if (!state.nowPlayingMsg) return;
  const msg = state.nowPlayingMsg;
  state.nowPlayingMsg = null;
  try {
    await (msg as Message).edit({ components: [] });
  } catch {
    // Message may have been deleted — ignore
  }
}

// ── Track info pre-fetch cache ────────────────────────────────────────────────

interface CachedTrackInfo {
  title: string;
  duration: number;
  thumbnail: string | null;
}

const queueInfoCache = new Map<string, CachedTrackInfo>();

async function prefetchTrackInfo(url: string): Promise<void> {
  if (queueInfoCache.has(url)) return;
  try {
    const play = await getPlay();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const info = await (play.video_info(url) as Promise<any>).catch(() => null);
    const det = info?.video_details;
    if (det) {
      queueInfoCache.set(url, {
        title: cleanYouTubeTitle((det.title as string) ?? "Unknown"),
        duration: (det.durationInSec as number) ?? 0,
        thumbnail: (det.thumbnails as Array<{ url: string }>)?.[0]?.url ?? null,
      });
    }
  } catch {
    // Silently ignore — ytdlpInfo used as fallback when track plays
  }
}

// ── Queue playback (internal) ─────────────────────────────────────────────────

async function playNextFromQueue(guildId: string): Promise<void> {
  const state = radioStates.get(guildId);
  if (!state || state.queue.length === 0) return;

  const url = state.queue.shift()!;

  // Pre-fetch info for the track after next, in background
  if (state.queue.length > 0) {
    prefetchTrackInfo(state.queue[0]!).catch(() => null);
  }

  try {
    // Start the audio stream immediately — don't wait for metadata
    const audioStream = ytdlpStream(url);
    const resource = createAudioResource(audioStream, { inputType: StreamType.Arbitrary });

    // Use cached info if available (instant), otherwise fetch
    const cached = queueInfoCache.get(url);
    const { title: rawTitle, duration, thumbnail } = cached ?? await ytdlpInfo(url);
    const cleanTitle = cleanYouTubeTitle(rawTitle);

    state.stationKey = null;
    state.youtubeTitle = cleanTitle;
    state.youtubeUrl = url;
    state.youtubeStartTime = Date.now();
    state.paused = false;
    state.player.play(resource);

    if (state.notifyChannel) {
      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      const embed = buildNowPlayingEmbed({
        title: cleanTitle,
        url,
        duration: duration > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : "—",
        thumbnail: thumbnail ?? null,
        queueCount: state.queue.length,
      });
      await disableNpButtonsForState(state);
      const sent = await state.notifyChannel
        .send({ embeds: [embed], components: buildNpButtonRows(false) })
        .catch(() => null);
      state.nowPlayingMsg = (sent as Message | null);
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

// ── Voice channel picker (sent when user isn't in a channel) ─────────────────

export async function replyNotInVoice(message: Message, pendingKey?: string): Promise<void> {
  const guild = message.guild;
  if (!guild) {
    await message.reply("❌ You need to be in a voice channel first!");
    return;
  }

  const configuredIds = getVoicePickerChannels(guild.id);

  // Ensure the channel cache is populated
  if (guild.channels.cache.size === 0) {
    await guild.channels.fetch().catch(() => null);
  }

  const voiceChannels = configuredIds.length > 0
    ? configuredIds
        .map(id => guild.channels.cache.get(id))
        .filter((c): c is NonNullable<typeof c> => c?.type === ChannelType.GuildVoice)
        .slice(0, 2)
    : [...guild.channels.cache.values()]
        .filter(c => c.type === ChannelType.GuildVoice)
        .slice(0, 2);

  if (voiceChannels.length === 0) {
    await message.reply("❌ You need to be in a voice channel first!");
    return;
  }

  // Each button gets a unique customId (Discord rejects duplicate customIds in the same message)
  const baseId = pendingKey ?? `noop_${Date.now()}`;
  const rows: ActionRowBuilder<ButtonBuilder>[] = voiceChannels.map((ch, idx) =>
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel(`🔊 ${ch.name.slice(0, 77)}`)
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${guild.id}/${ch.id}`),
      new ButtonBuilder()
        .setCustomId(`voice_ready:${baseId}:${idx}`)
        .setLabel("✅ I'm ready!")
        .setStyle(ButtonStyle.Success),
    ),
  );

  try {
    await message.reply({
      content: "❌ You need to join a voice channel first! Click a channel below, join it, then click **✅ I'm ready!** and your command will run automatically:",
      components: rows,
    });
  } catch (err) {
    logger.error({ err }, "replyNotInVoice: failed to send voice picker");
    await message.reply("❌ You need to be in a voice channel first! Join one and then retry your command.").catch(() => null);
  }
}

// ── Voice connection helper ───────────────────────────────────────────────────

export async function ensureVoiceConnection(message: Message, onReady?: () => Promise<void>): Promise<boolean> {
  const voiceChannel = message.member?.voice.channel;
  if (!voiceChannel) {
    if (onReady) {
      const key = `${message.author.id}_${Date.now()}`;
      registerPendingVoiceCmd(key, message.author.id, onReady);
      await replyNotInVoice(message, key);
    } else {
      await replyNotInVoice(message);
    }
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

    // Fires when stream ends — auto-reconnect radio, or advance YouTube queue
    player.on(AudioPlayerStatus.Idle, () => {
      const s = radioStates.get(guildId);
      if (!s) return;

      if (s.stationKey) {
        // Radio stream dropped — reconnect after 3 s
        const key = s.stationKey;
        const station = RADIO_STATIONS[key];
        if (!station) return;
        setTimeout(async () => {
          const cur = radioStates.get(guildId);
          if (!cur || cur.stationKey !== key) return; // stopped or switched in the meantime
          try {
            const stream = await fetchStream(station.url);
            const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
            cur.player.play(resource);
            logger.info({ key }, "Radio auto-reconnected after stream drop");
          } catch (err) {
            logger.error({ err, key }, "Radio reconnect failed");
          }
        }, 3000);
        return;
      }

      if (s.queue.length > 0) {
        playNextFromQueue(guildId).catch((err) => logger.error({ err }, "Auto-queue error"));
        return;
      }

      // Nothing left to play — disable NP buttons and start idle timer
      s.youtubeTitle = null;
      s.youtubeUrl = null;
      s.youtubeStartTime = null;
      s.paused = false;
      disableNpButtonsForState(s).catch(() => null);
      startIdleTimer(guildId);
    });

    radioStates.set(guildId, {
      player,
      stationKey: null,
      youtubeTitle: null,
      youtubeUrl: null,
      youtubeStartTime: null,
      queue: [],
      queueName: null,
      notifyChannel: null,
      guildId,
      idleTimer: null,
      aloneTimer: null,
      nowPlayingMsg: null,
      paused: false,
      requestedBy: null,
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

// ── Fuzzy station matching ────────────────────────────────────────────────────

function normalizeForSearch(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] = a[i - 1] === b[j - 1]
        ? dp[i - 1]![j - 1]!
        : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    }
  }
  return dp[m]![n]!;
}

/**
 * Resolve a raw user input to a RADIO_STATIONS key.
 * Returns the key if found, or null.
 * Also returns fuzzy suggestions when not found.
 */
function resolveStation(input: string): { key: string } | { suggestions: string[] } {
  const norm = normalizeForSearch(input);
  if (!norm) return { suggestions: [] };

  for (const [key, station] of Object.entries(RADIO_STATIONS)) {
    if (normalizeForSearch(key) === norm || normalizeForSearch(station.name) === norm) {
      return { key };
    }
  }

  const scored: { key: string; score: number }[] = [];
  for (const [key, station] of Object.entries(RADIO_STATIONS)) {
    const keyNorm  = normalizeForSearch(key);
    const nameNorm = normalizeForSearch(station.name);

    if (keyNorm.includes(norm) || norm.includes(keyNorm) ||
        nameNorm.includes(norm) || norm.includes(nameNorm)) {
      scored.push({ key, score: 0.9 });
      continue;
    }

    const distKey  = levenshtein(norm, keyNorm);
    const distName = levenshtein(norm, nameNorm);
    const dist     = Math.min(distKey, distName);
    const maxLen   = Math.max(norm.length, Math.min(keyNorm.length, nameNorm.length));
    const similarity = 1 - dist / maxLen;

    if (similarity >= 0.55 || dist <= 2) {
      scored.push({ key, score: similarity });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return { suggestions: scored.slice(0, 3).map(r => r.key) };
}

export async function playRadio(message: Message, stationInput: string): Promise<void> {
  const resolved = resolveStation(stationInput);

  let stationKey: string;
  if ("key" in resolved) {
    stationKey = resolved.key;
  } else {
    if (resolved.suggestions.length === 0) {
      await message.reply(
        `❌ No station found for \`${stationInput}\`.\nSee the full list with \`!radio list\`.`,
      );
    } else {
      const list = resolved.suggestions
        .map(k => `${RADIO_STATIONS[k]!.emoji} \`${k}\` — **${RADIO_STATIONS[k]!.name}**`)
        .join("\n");
      await message.reply(
        `❓ Station \`${stationInput}\` not found. Did you mean:\n${list}\n\nFull list: \`!radio list\``,
      );
    }
    return;
  }

  const station = RADIO_STATIONS[stationKey]!;

  const ready = await ensureVoiceConnection(message, () => playRadio(message, stationInput));
  if (!ready) return;

  const guildId = message.guildId!;
  const state = radioStates.get(guildId)!;
  clearIdleTimer(state);
  state.stationKey = stationKey;
  state.youtubeTitle = null;
  state.youtubeUrl = null;
  state.queue = [];

  // Immediate feedback — user sees this while we open the TCP stream
  const loadMsg = await message.reply(`⏳ Connecting to **${station.name}**…`);

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
      await loadMsg.edit({ content: "", embeds: [embed] });
    });

    state.player.once("error", async (err) => {
      logger.error({ err, stationKey }, "Radio stream error");
      await loadMsg.edit(`❌ Stream error for **${station.name}**. Try another station with \`!radio list\`.`);
      radioStates.delete(guildId);
      getVoiceConnection(guildId)?.destroy();
    });

  } catch (err) {
    logger.error({ err, stationKey }, "Radio play error");
    await loadMsg.edit("❌ Failed to start the radio stream. Try another with `!radio list`.");
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

  clearIdleTimer(state);
  clearAloneTimer(state);
  state.player.stop();
  radioStates.delete(guildId);
  getVoiceConnection(guildId)?.destroy();
  await message.reply("👋 Stopped and disconnected.");
}

// Private: plays a YouTube URL immediately given an existing state + a message to edit
async function execPlayYoutube(
  guildId: string,
  url: string,
  waitMsg: Message,
  requestedBy?: string,
  knownMeta?: { title: string; duration: number; thumbnail: string | null },
): Promise<void> {
  const state = radioStates.get(guildId);
  if (!state) return;

  await disableNpButtonsForState(state);

  clearIdleTimer(state);
  state.stationKey = null;
  state.youtubeTitle = "Loading…";
  state.youtubeUrl = url;
  state.nowPlayingMsg = waitMsg;
  state.paused = false;
  state.requestedBy = requestedBy ?? null;

  // Shared: build + post the Now Playing embed once audio starts
  const postNowPlaying = async (title: string, duration: number, thumbnail: string | null) => {
    const cleanTitle = cleanYouTubeTitle(title);
    const s = radioStates.get(guildId);
    if (s) { s.youtubeTitle = cleanTitle; s.youtubeStartTime = Date.now(); }
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    const queueCount = radioStates.get(guildId)?.queue.length ?? 0;
    const embed = buildNowPlayingEmbed({
      title: cleanTitle,
      url,
      duration: duration > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : "—",
      thumbnail,
      requestedBy: requestedBy ?? undefined,
      queueCount,
    });
    await waitMsg.edit({ content: "", embeds: [embed], components: buildNpButtonRows(false) });
  };

  const onError = async (err: Error) => {
    logger.error({ err, url }, "YouTube playback error");
    state.nowPlayingMsg = null;
    await waitMsg.edit({ content: "❌ Playback error. The video may be unavailable or age-restricted.", components: [] });
  };

  try {
    // play-dl: stream only (skip video_info if we already have it from search)
    const play = await getPlay();
    const [streamData, videoInfo] = await Promise.all([
      play.stream(url, { quality: 2 }),
      knownMeta ? Promise.resolve(null) : play.video_info(url).catch(() => null),
    ]);

    const typeStr: string = (streamData as any).type ?? "";
    let djsType = StreamType.Arbitrary;
    if (typeStr === "webm/opus") djsType = StreamType.WebmOpus;
    else if (typeStr === "ogg/opus") djsType = StreamType.OggOpus;
    else if (typeStr === "opus") djsType = StreamType.Opus;

    const resource = createAudioResource((streamData as any).stream as NodeJS.ReadableStream, { inputType: djsType });
    state.player.play(resource);
    state.player.once(AudioPlayerStatus.Playing, async () => {
      if (knownMeta) {
        await postNowPlaying(knownMeta.title, knownMeta.duration, knownMeta.thumbnail);
      } else {
        const det = (videoInfo as any)?.video_details;
        const title = det?.title ?? null;
        const duration = det?.durationInSec ?? 0;
        const thumbnail = det?.thumbnails?.[0]?.url ?? null;
        // If video_info returned nothing, fall back to ytdlp for metadata only
        if (!title) {
          const info = await ytdlpInfo(url).catch((): YtInfo => ({ title: "Unknown", duration: 0, thumbnail: null }));
          await postNowPlaying(info.title, info.duration, info.thumbnail);
        } else {
          await postNowPlaying(title, duration, thumbnail);
        }
      }
    });
    state.player.once("error", onError);
  } catch (err) {
    logger.warn({ err, url }, "play-dl stream failed — falling back to ytdlp");
    const audioStream = ytdlpStream(url);
    const resource = createAudioResource(audioStream, { inputType: StreamType.Arbitrary });
    const infoPromise = knownMeta
      ? Promise.resolve(knownMeta)
      : ytdlpInfo(url).catch((): YtInfo => ({ title: "Unknown", duration: 0, thumbnail: null }));
    state.player.play(resource);
    state.player.once(AudioPlayerStatus.Playing, async () => {
      const { title, duration, thumbnail } = await infoPromise;
      await postNowPlaying(title, duration, thumbnail);
    });
    state.player.once("error", onError);
  }
}

export async function playYoutube(
  message: Message,
  url: string,
  knownMeta?: { title: string; duration: number; thumbnail: string | null },
): Promise<void> {
  if (!url.includes("youtube.com/") && !url.includes("youtu.be/")) {
    // Not a URL — treat as a search query
    await searchAndQueue(message, url);
    return;
  }

  const ready = await ensureVoiceConnection(message, () => playYoutube(message, url, knownMeta));
  if (!ready) return;

  const guildId = message.guildId!;
  const state = radioStates.get(guildId)!;
  state.notifyChannel = message.channel as TextChannel;

  // ── YouTube already playing → add to queue ────────────────────────────────
  if (state.youtubeTitle) {
    state.queue.push(url);
    const pos = state.queue.length; // items after current (#1)
    const waitMsg = await message.reply("⏳ Adding to queue…");
    try {
      // Use play-dl video_info (fast, in-process) and cache it for when the track plays
      const play = await getPlay();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const info = await (play.video_info(url) as Promise<any>).catch(() => null);
      const det = info?.video_details;
      const title: string = det?.title ?? "Unknown";
      const duration: number = det?.durationInSec ?? 0;
      const thumbnail: string | null = (det?.thumbnails as Array<{ url: string }>)?.[0]?.url ?? null;
      // Cache so playNextFromQueue can use it immediately when this track's turn comes
      queueInfoCache.set(url, { title: cleanYouTubeTitle(title), duration, thumbnail });
      // Pre-fetch the track after this one too, if it exists
      if (state.queue.length > 1) {
        prefetchTrackInfo(state.queue[state.queue.length - 2]!).catch(() => null);
      }
      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("Added to queue")
        .setDescription(`\`\`\`\n${cleanYouTubeTitle(title)}\n\`\`\``)
        .addFields(
          { name: "Duration", value: duration > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : "—", inline: true },
          { name: "Position", value: `#${pos + 1}`, inline: true },
        )
        .setFooter({ text: "!queue to see all  •  !skip to skip current" });
      if (thumbnail) embed.setThumbnail(thumbnail);
      await waitMsg.edit({ content: "", embeds: [embed] });
    } catch {
      await waitMsg.edit(`Added to queue at position #${pos + 1}.`);
    }
    return;
  }

  // ── Radio playing → stop it, start YouTube immediately ───────────────────
  if (state.stationKey) {
    state.stationKey = null;
    state.player.stop();
    state.queue = [];
    state.queueName = null;
  }

  // ── Play immediately ───────────────────────────────────────────────────────
  const waitMsg = await message.reply("🎬 Loading…");
  try {
    await execPlayYoutube(guildId, url, waitMsg, message.author.id, knownMeta);
  } catch (err) {
    logger.error({ err, url }, "YouTube load error");
    await waitMsg.edit("❌ Failed to load the YouTube video. It may be private, age-restricted or unavailable.");
    radioStates.delete(guildId);
    getVoiceConnection(guildId)?.destroy();
  }
}

const SEARCH_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"] as const;
const MAX_PAGES = 3;

/**
 * Compute page slices so nav buttons and pick buttons all fit on one Discord row (max 5).
 * - Page with only ▶ or only ◀: 4 picks + 1 nav = 5 buttons
 * - Page with both ◀ and ▶: 3 picks + 2 nav = 5 buttons
 * - No nav at all: 4 picks
 * Max 3 pages → fetching 4+3+4 = 11 results is enough.
 */
function computePageSlices(totalResults: number): Array<{ start: number; count: number }> {
  if (totalResults <= 4) return [{ start: 0, count: totalResults }];

  const slices: Array<{ start: number; count: number }> = [];

  // Page 0: no ◀ → 4 picks (+ ▶ if more pages)
  slices.push({ start: 0, count: Math.min(4, totalResults) });

  const afterP0 = slices[0]!.count;
  if (afterP0 >= totalResults) return slices;

  const remaining = totalResults - afterP0;

  if (remaining <= 4) {
    // Only one more page (last, only ◀) → up to 4 picks
    slices.push({ start: afterP0, count: remaining });
  } else {
    // Middle page: both ◀ and ▶ → 3 picks to stay within 5 buttons
    slices.push({ start: afterP0, count: 3 });
    const afterP1 = afterP0 + 3;
    const remaining2 = totalResults - afterP1;
    if (remaining2 > 0) {
      // Last page: only ◀ → up to 4 picks
      slices.push({ start: afterP1, count: Math.min(4, remaining2) });
    }
  }

  return slices.slice(0, MAX_PAGES);
}

function buildSearchPage(
  results: Array<{ url: string; title: string; duration: number; thumbnail: string | null }>,
  page: number,
  msgId: string,
  slices: Array<{ start: number; count: number }>,
): { embed: EmbedBuilder; components: ActionRowBuilder<ButtonBuilder>[] } {
  const totalPages = slices.length;
  const slice = slices[page]!;
  const pageResults = results.slice(slice.start, slice.start + slice.count);

  const hasPrev = page > 0;
  const hasNext = page < totalPages - 1;

  const description = pageResults.map((r, i) => {
    const mins = Math.floor(r.duration / 60);
    const secs = r.duration % 60;
    const dur = r.duration > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : "—";
    return `**${i + 1}.** ${r.title}   *${dur}*`;
  }).join("\n");

  const pageLabel = totalPages > 1 ? `Page ${page + 1}/${totalPages} • ` : "";
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🔍 Search results")
    .setDescription(description)
    .setFooter({ text: `${pageLabel}Click a number to play • expires in 30s` });

  // Single row: [◀?] [1] [2] [3] [4?] [▶?]
  const buttons: ButtonBuilder[] = [];

  if (hasPrev) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`yt:nav:prev:${msgId}`)
        .setLabel("◀")
        .setStyle(ButtonStyle.Primary),
    );
  }
  pageResults.forEach((_, i) => {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`yt:pick:${i}:${msgId}`)
        .setLabel(String(i + 1))
        .setStyle(ButtonStyle.Secondary),
    );
  });
  if (hasNext) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`yt:nav:next:${msgId}`)
        .setLabel("▶")
        .setStyle(ButtonStyle.Primary),
    );
  }

  return {
    embed,
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons)],
  };
}

const REMIX_PATTERN = /\b(remix|cover|karaoke|instrumental|slowed|reverb|mashup|nightcore|sped[\s-]up|pitch[\s-]up|lofi|lo[\s-]fi|8d\s*audio|bass[\s-]boosted|extended\s*mix|club\s*mix|vip\s*mix)\b/i;
const OFFICIAL_PATTERN = /\b(official\s*(audio|video|music\s*video|lyric\s*video|clip)|vevo)\b/i;

/**
 * Fuzzy word match against pre-normalised title word list.
 * titleWordsNorm: each token already has non-alphanumeric chars stripped ("S.O.S" → "sos")
 */
function queryWordMatchesTitle(queryWord: string, titleWordsNorm: string[]): boolean {
  for (const tw of titleWordsNorm) {
    if (tw === queryWord) return true;
    if (tw.length < 2 || queryWord.length < 2) continue;
    // One is a substring of the other and within 1 char length diff  ("gims"⊂"guims")
    if (queryWord.includes(tw) && tw.length >= queryWord.length - 1) return true;
    if (tw.includes(queryWord) && queryWord.length >= tw.length - 1) return true;
    // Levenshtein distance 1 via insertion/deletion walk
    if (Math.abs(tw.length - queryWord.length) === 1) {
      const [shorter, longer] = tw.length < queryWord.length ? [tw, queryWord] : [queryWord, tw];
      let i = 0, j = 0, diffs = 0;
      while (i < shorter.length && j < longer.length) {
        if (shorter[i] !== longer[j]) { diffs++; j++; } else { i++; j++; }
        if (diffs > 1) break;
      }
      if (diffs <= 1) return true;
    }
  }
  return false;
}

function scoreYtResult(r: { title: string; channel: string | null; duration?: number }, query = ""): number {
  let s = 0;
  // Duration=0 means YouTube topic/channel/playlist, not a real video — strongly penalize
  if (r.duration !== undefined && r.duration === 0) s -= 25;
  if (REMIX_PATTERN.test(r.title)) s -= 5;
  if (OFFICIAL_PATTERN.test(r.title)) s += 2;
  if (r.channel && /official|vevo/i.test(r.channel)) s += 1;

  if (query) {
    // Normalise query: remove punctuation so "S.O.S" → "sos", keep spaces
    const words = query.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 1);

    // Split title on spaces/hyphens ONLY (not dots) so "S.O.S" stays together,
    // then strip non-alphanumeric per token → "S.O.S" → "sos", "1.9" → "19"
    const titleWordsNorm = r.title.toLowerCase()
      .split(/[\s\-&!?()\[\]]+/)
      .map(w => w.replace(/[^a-z0-9]/g, ""))
      .filter(w => w.length > 1);

    const matchCount = words.filter(w => queryWordMatchesTitle(w, titleWordsNorm)).length;

    s += matchCount * 10;
    if (words.length > 1 && matchCount === words.length) s += 20;   // all words matched
    if (words.length > 1 && matchCount < Math.ceil(words.length / 2)) s -= 8; // < half match
    if (matchCount === 0 && words.length > 0) s -= 20;               // nothing matched
  }

  return s;
}

// ── Search result picker ──────────────────────────────────────────────────────

interface PendingSearchEntry {
  results: Array<{ url: string; title: string; duration: number; thumbnail: string | null }>;
  message: Message;
  requestedBy: string;
  expires: ReturnType<typeof setTimeout>;
  page: number;
  loadMsg: Message;
  slices: Array<{ start: number; count: number }>;
}

const pendingSearches = new Map<string, PendingSearchEntry>();

/** Called by the bot.ts button handler when the user clicks a search result (localIdx = position on current page). */
export function consumePendingSearch(msgId: string, localIdx: number): {
  pick: { url: string; title: string; duration: number; thumbnail: string | null };
  message: Message;
  requestedBy: string;
} | null {
  const ps = pendingSearches.get(msgId);
  if (!ps) return null;
  const slice = ps.slices[ps.page];
  if (!slice) return null;
  const globalIdx = slice.start + localIdx;
  if (globalIdx < 0 || globalIdx >= ps.results.length) return null;
  clearTimeout(ps.expires);
  pendingSearches.delete(msgId);
  return { pick: ps.results[globalIdx]!, message: ps.message, requestedBy: ps.requestedBy };
}

/** Called by the bot.ts button handler when the user clicks ◀ or ▶ to navigate pages. */
export async function navigateSearch(msgId: string, dir: "prev" | "next"): Promise<void> {
  const ps = pendingSearches.get(msgId);
  if (!ps) return;
  const newPage = dir === "next" ? ps.page + 1 : ps.page - 1;
  if (newPage < 0 || newPage >= ps.slices.length) return;
  ps.page = newPage;
  const { embed, components } = buildSearchPage(ps.results, newPage, msgId, ps.slices);
  await ps.loadMsg.edit({ content: "", embeds: [embed], components }).catch(() => null);
}

export async function searchAndQueue(message: Message, query: string): Promise<void> {
  if (!query.trim()) {
    await message.reply("❓ Provide keywords.\nExample: `!y stromae papaoutai`");
    return;
  }

  const loadMsg = await message.reply("🔍 Searching…");

  let results: { url: string; title: string; duration: number; channel: string | null }[];
  try {
    results = await fastYouTubeSearch(query, 11);
  } catch (err) {
    logger.error({ err, query }, "YouTube search error");
    await loadMsg.edit("❌ Search failed. Please try again.");
    return;
  }

  if (results.length === 0) {
    await loadMsg.edit("❌ No results found.");
    return;
  }

  // Score, clean titles, and sort all results
  const scored = results
    .map(r => ({
      ...r,
      title: cleanYouTubeTitle(r.title),
      score: scoreYtResult(r, query),
      thumbnail: null as string | null,
    }))
    .sort((a, b) => b.score - a.score);

  // Keep up to 11 results (4+3+4 for 3 pages)
  const topResults = scored.slice(0, 11);

  // Auto-play when query had ≥2 meaningful words AND top score ≥20 AND gap to #2 ≥10
  const queryWords = query.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 1);
  const isConfidentMatch =
    queryWords.length >= 2 &&
    topResults[0]!.score >= 20 &&
    (topResults.length < 2 || topResults[0]!.score - topResults[1]!.score >= 10);

  if (isConfidentMatch) {
    const sel = topResults[0]!;
    await loadMsg.edit(`▶️ Playing **${sel.title}**`);
    await playYoutube(message, sel.url, { title: sel.title, duration: sel.duration, thumbnail: null });
    return;
  }

  // Show a paginated picker (max 3 pages, all nav+pick buttons on one row)
  const allResults = topResults.map(r => ({ url: r.url, title: r.title, duration: r.duration, thumbnail: null as string | null }));
  const slices = computePageSlices(allResults.length);
  const { embed, components } = buildSearchPage(allResults, 0, loadMsg.id, slices);

  await loadMsg.edit({ content: "", embeds: [embed], components });

  // Expire after 30 s — remove buttons
  const expires = setTimeout(async () => {
    pendingSearches.delete(loadMsg.id);
    await loadMsg.edit({ embeds: [embed], components: [] }).catch(() => null);
  }, 30_000);

  pendingSearches.set(loadMsg.id, {
    results: allResults,
    message,
    requestedBy: message.author.id,
    expires,
    page: 0,
    loadMsg,
    slices,
  });
}

export async function skipYoutube(message: Message): Promise<void> {
  const guildId = message.guildId;
  if (!guildId) return;
  const state = radioStates.get(guildId);
  if (!state || !state.youtubeTitle) {
    await message.reply("❌ Nothing is currently playing.");
    return;
  }
  const skipped = state.youtubeTitle;
  skipCurrentTrack(guildId);
  if (state.queue.length > 0) {
    await message.reply(`⏭️ Skipped **${skipped}** — loading next…`);
  } else {
    await message.reply(`⏭️ Skipped **${skipped}** — queue is empty.`);
  }
}

/** Toggle pause/resume. Returns the new state or "not_playing". */
export function pauseToggle(guildId: string): "paused" | "resumed" | "not_playing" {
  const state = radioStates.get(guildId);
  if (!state || !state.youtubeTitle) return "not_playing";
  if (state.paused) {
    state.player.unpause();
    state.paused = false;
    return "resumed";
  } else {
    state.player.pause();
    state.paused = true;
    return "paused";
  }
}

/** Skip the current YouTube track (no message reply). Triggers Idle → next in queue or idle. */
export function skipCurrentTrack(guildId: string): string | null {
  const state = radioStates.get(guildId);
  if (!state || !state.youtubeTitle) return null;
  const title = state.youtubeTitle;
  state.youtubeTitle = null;
  state.youtubeUrl = null;
  state.youtubeStartTime = null;
  disableNpButtonsForState(state).catch(() => null);
  state.player.stop();
  return title;
}

/** Stop playback, disconnect, and clean up state for a guild. */
export function stopForGuild(guildId: string): boolean {
  const state = radioStates.get(guildId);
  if (!state) return false;
  clearIdleTimer(state);
  clearAloneTimer(state);
  disableNpButtonsForState(state).catch(() => null);
  state.player.stop();
  radioStates.delete(guildId);
  getVoiceConnection(guildId)?.destroy();
  return true;
}

// ── Vote skip ─────────────────────────────────────────────────────────────────

const activeVoteSkips = new Set<string>(); // one vote per guild at a time

export async function startVoteSkip(message: Message): Promise<void> {
  const guildId = message.guildId;
  if (!guildId) return;

  const state = radioStates.get(guildId);
  if (!state?.youtubeTitle) {
    await message.reply("❌ Nothing is currently playing.");
    return;
  }

  if (activeVoteSkips.has(guildId)) {
    await message.reply("🗳️ A vote is already in progress, wait for it to finish!");
    return;
  }

  const voiceChannel = message.member?.voice.channel;
  if (!voiceChannel) {
    await message.reply("❌ You must be in a voice channel to start a vote.");
    return;
  }

  const humanMembers = voiceChannel.members.filter((m) => !m.user.bot);
  const totalHumans = humanMembers.size;

  if (totalHumans === 0) {
    await message.reply("❌ Nobody in the voice channel.");
    return;
  }

  // Only one person in the channel — instant skip, no vote needed
  if (totalHumans === 1) {
    const skipped = state.youtubeTitle;
    state.youtubeTitle = null;
    state.youtubeUrl = null;
    state.player.stop();
    const msg = state.queue.length > 0 ? "loading next track…" : "queue is empty.";
    await message.reply(`⏭️ Instant skip — **${skipped}** (only one in channel). ${msg}`);
    return;
  }

  const needed = Math.ceil(totalHumans / 2);
  const trackTitle = state.youtubeTitle;
  activeVoteSkips.add(guildId);

  const buildEmbed = (votes: number, color: number, title: string, desc?: string) =>
    new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(desc ?? `Skip **${trackTitle}** ?`)
      .addFields(
        { name: "Votes", value: `${votes}/${needed} needed`, inline: true },
        { name: "Present", value: `${totalHumans} humans`, inline: true },
      )
      .setFooter({ text: "React ✅ to vote  •  30 seconds" });

  const voteMsg = await message.reply({ embeds: [buildEmbed(0, 0xfee75c, "🗳️ Vote Skip")] });
  await voteMsg.react("✅").catch(() => null);

  const voted = new Set<string>();

  const collector = (voteMsg as unknown as {
    createReactionCollector: (opts: {
      filter: (r: { emoji: { name: string | null } }, u: { id: string; bot: boolean }) => boolean;
      time: number;
    }) => {
      on: (event: string, cb: (...args: unknown[]) => void) => void;
      stop: (reason?: string) => void;
    };
  }).createReactionCollector({
    filter: (r: { emoji: { name: string | null } }, u: { id: string; bot: boolean }) => {
      if (u.bot || r.emoji.name !== "✅") return false;
      return voiceChannel.members.has(u.id);
    },
    time: 30_000,
  });

  collector.on("collect", async (...args: unknown[]) => {
    const u = args[1] as { id: string };
    voted.add(u.id);
    // Update the embed live
    await voteMsg.edit({ embeds: [buildEmbed(voted.size, 0xfee75c, "🗳️ Vote Skip")] }).catch(() => null);
    if (voted.size >= needed) {
      (collector as unknown as { stop: (r: string) => void }).stop("passed");
    }
  });

  collector.on("end", async (...args: unknown[]) => {
    const reason = args[1] as string;
    activeVoteSkips.delete(guildId);
    const cur = radioStates.get(guildId);

    if (reason === "passed" && cur?.youtubeTitle === trackTitle) {
      cur.youtubeTitle = null;
      cur.youtubeUrl = null;
      cur.player.stop();
      const next = cur.queue.length > 0 ? " — loading next track…" : " — queue is empty.";
      await voteMsg.edit({
        embeds: [buildEmbed(
          voted.size, 0x57f287,
          "✅ Vote passed!",
          `**${trackTitle}** skipped by ${voted.size}/${totalHumans} vote${voted.size > 1 ? "s" : ""}.${next}`,
        )],
      }).catch(() => null);
    } else if (reason === "time") {
      await voteMsg.edit({
        embeds: [buildEmbed(
          voted.size, 0xed4245,
          "❌ Vote failed",
          `Not enough votes to skip **${trackTitle}** (${voted.size}/${needed} received).`,
        )],
      }).catch(() => null);
    }
  });
}

export function getQueueEmbed(guildId: string): EmbedBuilder | null {
  const state = radioStates.get(guildId);
  if (!state || (!state.youtubeTitle && state.queue.length === 0)) return null;

  const lines: string[] = [];
  if (state.youtubeTitle) {
    lines.push(`▶️ **[Now playing]** ${state.youtubeTitle}`);
  }
  if (state.queue.length > 0) {
    state.queue.slice(0, 12).forEach((url, i) => {
      const id = url.match(/[?&]v=([^&]+)/)?.[1] ?? url.split("/").pop() ?? url;
      lines.push(`${i + 2}. \`${id}\` — ${url}`);
    });
    if (state.queue.length > 12) lines.push(`… and ${state.queue.length - 12} more`);
  }

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`🎵 Queue — ${1 + state.queue.length} track${state.queue.length !== 1 ? "s" : ""}`)
    .setDescription(lines.join("\n"))
    .setFooter({ text: "!skip  •  !youtube <url>  •  !youtube search <keywords>" });
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
    const info = await ytdlpInfo(firstUrl);
    const { title, duration, thumbnail } = info;
    const audioStream = ytdlpStream(firstUrl);
    const resource = createAudioResource(audioStream, { inputType: StreamType.Arbitrary });

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
