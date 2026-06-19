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
import { customStationsCol } from "../lib/db.js";

// ── Custom stations (admin-added, persisted in MongoDB) ───────────────────────

export interface RadioStation {
  name: string;
  url: string;
  emoji: string;
  genre: string;
  lang: "fr" | "es" | "en";
}

export const customStations = new Map<string, RadioStation>();

export async function loadCustomStations(): Promise<void> {
  if (!customStationsCol) return;
  try {
    const docs = await customStationsCol.find({}).toArray();
    for (const doc of docs) {
      customStations.set(doc._id, {
        name: doc.name,
        url: doc.url,
        emoji: doc.emoji,
        genre: doc.genre,
        lang: doc.lang,
      });
    }
    if (docs.length > 0) logger.info({ count: docs.length }, "Custom radio stations loaded");
  } catch (err) {
    logger.error({ err }, "Failed to load custom radio stations");
  }
}

export async function addCustomRadio(
  key: string,
  name: string,
  url: string,
  emoji: string,
  genre: string,
  lang: "fr" | "es" | "en",
  addedBy: string,
): Promise<void> {
  customStations.set(key, { name, url, emoji, genre, lang });
  if (!customStationsCol) return;
  try {
    await customStationsCol.replaceOne(
      { _id: key },
      { _id: key, name, url, emoji, genre, lang, addedBy, addedAt: new Date() },
      { upsert: true },
    );
  } catch (err) {
    logger.error({ err, key }, "Failed to save custom station to DB");
  }
}

export async function removeCustomRadio(key: string): Promise<boolean> {
  if (!customStations.has(key)) return false;
  customStations.delete(key);
  if (!customStationsCol) return true;
  try {
    await customStationsCol.deleteOne({ _id: key });
  } catch (err) {
    logger.error({ err, key }, "Failed to delete custom station from DB");
  }
  return true;
}

// ── Activity callback — bot.ts registers this to update client presence ────────
let _activityCallback: ((title: string | null) => void) | null = null;
export function setActivityCallback(cb: (title: string | null) => void): void {
  _activityCallback = cb;
}

// ── Channel-name callback — bot.ts registers this to rename the voice channel ──
let _channelNameCallback: ((guildId: string, title: string | null) => void) | null = null;
export function setChannelNameCallback(cb: (guildId: string, title: string | null) => void): void {
  _channelNameCallback = cb;
}

import { isKnownArtist, saveArtist } from "./artist-cache.js";

/** Extract artist name from "Artist - Song Title" format and save to cache. */
function maybeSaveArtistFromTitle(title: string): void {
  const dashIdx = title.indexOf(" - ");
  if (dashIdx > 0) {
    const artist = title.slice(0, dashIdx).trim();
    if (artist.length >= 2 && artist.length <= 50) {
      saveArtist(artist).catch(() => null);
    }
  }
}

// ── Fast YouTube search via play-dl (in-process, no subprocess overhead) ─────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _play: any = null;
async function getPlay() {
  if (!_play) _play = (await import("play-dl")).default ?? (await import("play-dl"));
  return _play;
}

/**
 * Fast search using play-dl only (in-process, no subprocess).
 * Falls back to yt-dlp if play-dl fails.
 */
async function fastYouTubeSearch(query: string, limit = 5): Promise<{ url: string; title: string; duration: number; channel: string | null; isLive?: boolean }[]> {
  // Primary: play-dl (fast, in-process, returns results in YouTube's natural ranking order)
  try {
    const play = await getPlay();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] = await play.search(query, { source: { youtube: "video" }, limit });
    if (results?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return results.map((v: any) => ({
        url: v.url as string,
        title: (v.title as string) ?? query,
        duration: (v.durationInSec as number) ?? 0,
        channel: (v.channel?.name as string) ?? null,
        isLive: !!(v.isLive || v.isLiveContent),
      }));
    }
  } catch {
    // fall through to yt-dlp
  }

  // Fallback: yt-dlp (subprocess — slower but reliable)
  return ytdlpSearch(query, limit);
}

import { getVoicePickerChannels } from "./voice-picker-channels.js";

// ── Pending voice commands (auto-retry after joining voice) ───────────────────

const pendingVoiceCmds = new Map<string, {
  fn: () => Promise<void>;
  userId: string;
  expires: number;
}>();

// ── Bug 2 fix: periodic cleanup so expired closures don't accumulate forever ──
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of pendingVoiceCmds) {
    if (v.expires < now) pendingVoiceCmds.delete(k);
  }
}, 5 * 60 * 1000);

export function registerPendingVoiceCmd(key: string, userId: string, fn: () => Promise<void>): void {
  const now = Date.now();
  for (const [k, v] of pendingVoiceCmds) {
    if (v.expires < now) pendingVoiceCmds.delete(k);
  }
  pendingVoiceCmds.set(key, { fn, userId, expires: now + 60 * 1000 }); // 1-minute window
}

/** Auto-run: find and consume any pending command for a user (called on voiceStateUpdate). */
export function consumePendingVoiceCmdByUser(userId: string): (() => Promise<void>) | null {
  const now = Date.now();
  for (const [key, entry] of pendingVoiceCmds) {
    if (entry.expires < now) { pendingVoiceCmds.delete(key); continue; }
    if (entry.userId === userId) {
      pendingVoiceCmds.delete(key);
      return entry.fn;
    }
  }
  return null;
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

async function fetchStream(url: string, hops = 0, extraHeaders: Record<string, string> = {}): Promise<IncomingMessage> {
  if (hops > 10) throw new Error("Too many redirects");
  return new Promise((resolve, reject) => {
    const isStreamtheworld = url.includes("streamtheworld.com");
    const headers: Record<string, string> = { ...STREAM_HEADERS, ...extraHeaders };
    if (isStreamtheworld) {
      headers["Referer"] = "https://playerservices.streamtheworld.com/";
      headers["Origin"] = "https://playerservices.streamtheworld.com";
    }
    const getter = url.startsWith("https://") ? httpsGet : httpGet;
    const timeoutMs = isStreamtheworld ? 15_000 : 8_000;
    const req = getter(url, { headers }, (res) => {
      const loc = res.headers.location;
      if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303 || res.statusCode === 307 || res.statusCode === 308) && loc) {
        // Carry session cookies (e.g. streamtheworld uuid) into the next hop
        const setCookies = res.headers["set-cookie"];
        const cookieStr = setCookies ? setCookies.map(c => c.split(";")[0]!).join("; ") : "";
        const nextExtra = cookieStr ? { ...extraHeaders, Cookie: cookieStr } : extraHeaders;
        res.resume();
        // Streamtheworld CDN URLs without a file extension serve ICY/Shoutcast protocol
        // which Node.js http cannot parse. Append .mp3 to force proper HTTP response.
        let nextUrl = loc.startsWith("http") ? loc : new URL(loc, url).toString();
        if (nextUrl.includes("live.streamtheworld.com") && !/\.(mp3|aac|ogg|m4a|m3u8|pls)$/i.test(nextUrl)) {
          nextUrl = nextUrl + ".mp3";
        }
        fetchStream(nextUrl, hops + 1, nextExtra).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode} from ${url}`));
        return;
      }
      const ct = (res.headers["content-type"] ?? "").toLowerCase();
      // M3U/PLS playlists — parse first URL
      if (ct.includes("mpegurl") || ct.includes("x-scpls") || url.endsWith(".m3u") || url.endsWith(".m3u8") || url.endsWith(".pls")) {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => { body += chunk; if (body.length > 8192) res.destroy(); });
        res.on("end", () => {
          const firstUrl = body.split("\n").map(l => l.trim()).find(l => l.startsWith("http"));
          if (firstUrl) fetchStream(firstUrl, hops + 1, extraHeaders).then(resolve).catch(reject);
          else reject(new Error("Empty playlist from " + url));
        });
        res.on("error", reject);
        return;
      }
      // streamtheworld sometimes returns JSON instead of a proper 302 redirect
      if (ct.includes("application/json") || (isStreamtheworld && ct.includes("text/"))) {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => { body += chunk; if (body.length > 16384) res.destroy(); });
        res.on("end", () => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const json = JSON.parse(body) as Record<string, any>;
            let streamUrl: string | null = null;
            // Format 1: { streaming_hostname, station_key }
            const hostname = json["streaming_hostname"] as string | undefined;
            const stationKey = json["station_key"] as string | undefined;
            if (hostname && stationKey) {
              const port = json["port"] as number | undefined;
              const base = hostname.replace(/\/$/, "");
              streamUrl = (port && port !== 80 && port !== 443)
                ? `${base}:${port}/${stationKey}`
                : `${base}/${stationKey}`;
            }
            // Format 2: { primary: { ip, port, path } }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const primary = json["primary"] as Record<string, any> | undefined;
            if (!streamUrl && primary) {
              const transport = (primary["transport"] as string | undefined) ?? "http";
              const ip   = primary["ip"]   as string | undefined;
              const port = primary["port"] as number | undefined;
              const path = (primary["path"] as string | undefined) ?? "";
              if (ip) streamUrl = `${transport}://${ip}${port && port !== 80 && port !== 443 ? `:${port}` : ""}${path}`;
            }
            // Format 3: { data: { items: [{ stream }] } }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const items = (json["data"] as Record<string, any> | undefined)?.["items"] as Array<{ stream: string }> | undefined;
            if (!streamUrl && items?.[0]?.stream) streamUrl = items[0].stream;
            if (streamUrl) {
              fetchStream(streamUrl.startsWith("http") ? streamUrl : `https://${streamUrl}`, hops + 1, extraHeaders)
                .then(resolve).catch(reject);
            } else {
              reject(new Error(`streamtheworld JSON: cannot extract stream URL from ${url}`));
            }
          } catch {
            reject(new Error(`Non-audio JSON response from ${url}`));
          }
        });
        res.on("error", reject);
        return;
      }
      // Disable the connection timeout once the audio stream is live —
      // keeping it active would destroy the socket on any brief silence/buffer pause.
      req.setTimeout(0);
      resolve(res);
    });
    req.on("error", reject);
    // Timeout only applies to the initial TCP connection phase, not to the live stream.
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error(`Timeout connecting to ${url}`)); });
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
  fip:         { name: "FIP",            url: "https://icecast.radiofrance.fr/fip-midfi.mp3",                      emoji: "🎨", genre: "Éclectique / Jazz / World", lang: "fr" },
  mouv:        { name: "Mouv'",          url: "https://icecast.radiofrance.fr/mouv-midfi.mp3",                     emoji: "🎤", genre: "Hip-Hop / Urbain",          lang: "fr" },
  culture:     { name: "France Culture", url: "https://icecast.radiofrance.fr/franceculture-midfi.mp3",            emoji: "📚", genre: "Culture / Podcast",         lang: "fr" },
  ouifm:       { name: "OÜI FM",         url: "https://ouifm.ice.infomaniak.ch/ouifm-high.mp3",                    emoji: "🎸", genre: "Rock / Alternative",       lang: "fr" },
  nostalgie:   { name: "Nostalgie",      url: "https://cdn.nrjaudio.fm/audio1/fr/30601/mp3_128.mp3",              emoji: "🕰️", genre: "Oldies / French classics", lang: "fr" },
  rtl:         { name: "RTL",            url: "https://icecast.rtl.fr/rtl-1-44-128",                               emoji: "📡", genre: "Généraliste / Info",        lang: "fr" },
  rtl2:        { name: "RTL 2",          url: "https://icecast.rtl.fr/rtl2-1-44-128",                              emoji: "🔊", genre: "Rock / Pop",               lang: "fr" },
  evasion:     { name: "Évasion FM",     url: "https://stream.evasionfm.com/stream",                               emoji: "🌅", genre: "Variété / Détente",        lang: "fr" },
  sanef:       { name: "Sanef 107.7",    url: "https://sanef.ice.infomaniak.ch/sanef1077-nord.mp3",                 emoji: "🛣️", genre: "Info Trafic / Musique",     lang: "fr" },
  // 🇪🇸 Spanish
  los40:       { name: "Los 40",         url: "https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40_SC.mp3",       emoji: "🔊", genre: "Pop / Hits",              lang: "es" },
  cadena100:   { name: "Cadena 100",     url: "https://streaming.cope.es/cope/cadena100/directo.mp3",              emoji: "💃", genre: "Pop / Dance",             lang: "es" },
  m80:         { name: "M80 Radio",      url: "https://playerservices.streamtheworld.com/api/livestream-redirect/M80RADIO_SC.mp3",    emoji: "🌟", genre: "Pop / Hits 80s-90s",      lang: "es" },
  dial:        { name: "Cadena Dial",    url: "https://playerservices.streamtheworld.com/api/livestream-redirect/CADENADIAL_SC.mp3",  emoji: "🎶", genre: "Spanish Pop / Romántica", lang: "es" },
  rock_es:     { name: "Rock FM",        url: "http://flucast31-h-cloud.flumotion.com/cope/rockfm-low.mp3",                    emoji: "🤘", genre: "Rock",                    lang: "es" },
  cope:        { name: "COPE",           url: "http://flucast28-h-cloud.flumotion.com/cope/net1.mp3",                          emoji: "📢", genre: "News / Talk",             lang: "es" },
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
  jazz:        { name: "Jazz Radio",     url: "https://jazz.streamr.ru/jazz-64.mp3",                                emoji: "🎷", genre: "Jazz",                      lang: "en" },
  // 🌍 International / Genre
  hits90s:     { name: "90s Hits",       url: "https://streams.90s90s.de/90er/mp3-128/streams.90s90s.de/",          emoji: "💿", genre: "90s Pop / Rock",           lang: "en" },
  hits2000s:   { name: "2000s Hits",     url: "https://streams.90s90s.de/2000er/mp3-128/streams.90s90s.de/",        emoji: "📀", genre: "2000s Pop / R&B",          lang: "en" },
  hiphop:      { name: "Hip-Hop Radio",  url: "https://streams.90s90s.de/hiphop/mp3-128/streams.90s90s.de/",        emoji: "🎤", genre: "Hip-Hop",                   lang: "en" },
};

// ── State ─────────────────────────────────────────────────────────────────────

interface RadioState {
  player: AudioPlayer;
  stationKey: string | null;
  youtubeTitle: string | null;
  youtubeUrl: string | null;
  youtubeStartTime: number | null;
  isLive: boolean;
  queue: string[];
  queueMessages: (Message | null)[];
  queueName: string | null;
  notifyChannel: TextChannel | null;
  guildId: string;
  idleTimer: ReturnType<typeof setTimeout> | null;
  aloneTimer: ReturnType<typeof setTimeout> | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  reconnectAttempt: number;
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
        .setLabel("❤️")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("np:dislike")
        .setLabel("👎")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(paused ? "np:resume" : "np:pause")
        .setLabel(paused ? "▶️" : "⏸️")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("np:skip")
        .setLabel("⏭️")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("np:stop")
        .setLabel("⏹️")
        .setStyle(ButtonStyle.Danger),
    ),
  ];
}

export function buildRadioNpButtonRows(paused: boolean): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("np:like")
        .setLabel("❤️")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("np:dislike")
        .setLabel("👎")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(paused ? "np:resume" : "np:pause")
        .setLabel(paused ? "▶️" : "⏸️")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("np:skip")
        .setLabel("📻")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("np:stop")
        .setLabel("⏹️")
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
  isLive?: boolean;
}

function youtubeThumbnail(url: string): string | null {
  const m = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  return m ? `https://i.ytimg.com/vi/${m[1]}/mqdefault.jpg` : null;
}

function buildNowPlayingEmbed(opts: NowPlayingEmbedOpts): EmbedBuilder {
  const thumb = opts.thumbnail ?? youtubeThumbnail(opts.url);
  const color = opts.isLive ? 0xed4245 : 0x57f287;
  const title = opts.isLive ? "🔴 Live Stream" : "🎵 Now Playing";
  const durationLabel = opts.isLive ? "Status" : "Duration";
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setURL(opts.url)
    .setDescription(`**[${opts.title}](${opts.url})**`)
    .addFields(
      { name: durationLabel, value: opts.duration, inline: true },
      ...(opts.requestedBy ? [{ name: "Requested by", value: `<@${opts.requestedBy}>`, inline: true }] : []),
      ...(opts.queueCount && opts.queueCount > 0 ? [{ name: "Queue", value: `${opts.queueCount} next • \`!queue\``, inline: true }] : []),
    )
  if (thumb) embed.setThumbnail(thumb);
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
    const info = await ytdlpInfo(url);
    queueInfoCache.set(url, {
      title: cleanYouTubeTitle(info.title),
      duration: info.duration,
      thumbnail: info.thumbnail,
    });
  } catch {
    // Silently ignore — metadata fetched fresh at play time
  }
}

// ── Stream pre-load cache ─────────────────────────────────────────────────────
// Spawns yt-dlp early so audio is already buffered when the track's turn comes.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const preloadedStreamCache = new Map<string, any>();

function preloadStream(url: string): void {
  if (preloadedStreamCache.has(url)) return;
  try {
    const stream = ytdlpStream(url);
    preloadedStreamCache.set(url, stream);
    // Auto-cleanup after 8 minutes if never consumed (e.g. queue cleared)
    const timer = setTimeout(() => preloadedStreamCache.delete(url), 8 * 60 * 1000);
    stream.once("error", () => {
      clearTimeout(timer);
      preloadedStreamCache.delete(url);
    });
  } catch {
    // ignore — fresh stream will be spawned at play time
  }
}

// ── Queue playback (internal) ─────────────────────────────────────────────────

async function playNextFromQueue(guildId: string): Promise<void> {
  const state = radioStates.get(guildId);
  if (!state || state.queue.length === 0) return;

  const url = state.queue.shift()!;
  const addedMsg = state.queueMessages.shift() ?? null;

  // Pre-fetch info AND pre-load audio stream for the next track in background
  if (state.queue.length > 0) {
    prefetchTrackInfo(state.queue[0]!).catch(() => null);
    preloadStream(state.queue[0]!); // spawn yt-dlp early so it's buffered
  }

  try {
    // Use pre-loaded stream if available (already buffering), else spawn fresh
    const audioStream = preloadedStreamCache.get(url) ?? ytdlpStream(url);
    preloadedStreamCache.delete(url);
    const resource = createAudioResource(audioStream, { inputType: StreamType.Arbitrary });

    // Use cached info if available (instant), otherwise fetch
    const cached = queueInfoCache.get(url);
    const { title: rawTitle, duration, thumbnail } = cached ?? await ytdlpInfo(url);
    const cleanTitle = cleanYouTubeTitle(rawTitle);

    // Skip unresolvable tracks (ytdlpInfo fallback: title="Unknown", duration=0)
    if (cleanTitle === "Unknown" && duration === 0) {
      logger.warn({ url }, "Skipping unresolvable track");
      if (state.queue.length > 0) playNextFromQueue(guildId).catch(() => null);
      return;
    }

    state.stationKey = null;
    state.youtubeTitle = cleanTitle;
    state.youtubeUrl = url;
    state.youtubeStartTime = Date.now();
    state.paused = false;
    state.player.play(resource);
    maybeSaveArtistFromTitle(cleanTitle);
    _activityCallback?.(cleanTitle);
    _channelNameCallback?.(guildId, cleanTitle);

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
      if (addedMsg) addedMsg.delete().catch(() => null);
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

  // One link button per channel — bot auto-runs the command when user joins within 1 min
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...voiceChannels.slice(0, 5).map((ch) =>
      new ButtonBuilder()
        .setLabel(`🔊 ${ch.name.slice(0, 77)}`)
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${guild.id}/${ch.id}`),
    ),
  );

  const embed = new EmbedBuilder()
    .setColor(0xe67e22)
    .setDescription("❌ **Join a voice channel** — the command will run automatically.");

  try {
    await message.reply({ embeds: [embed], components: [row] });
  } catch (err) {
    logger.error({ err }, "replyNotInVoice: failed to send voice picker");
    await message.reply("❌ You need to be in a voice channel first!").catch(() => null);
  }
}

// ── Bug 1 fix: hook so voice.ts can register a cleanup callback ───────────────
// voice.ts already imports from radio.ts (one-way dep), so radio.ts cannot
// import from voice.ts. Instead voice.ts registers a cleanup function here
// that radio.ts calls before taking over the voice connection.
let _voiceCleanupHook: ((guildId: string) => void) | null = null;
export function setVoiceCleanupHook(fn: (guildId: string) => void): void {
  _voiceCleanupHook = fn;
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
    // Bug 1 fix: if voice.ts has an active TTS session for this guild, clean it
    // up before radio takes over the connection (avoids two players on one conn)
    _voiceCleanupHook?.(guildId);

    const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
    connection.subscribe(player);

    // Fires when stream ends — auto-reconnect radio, or advance YouTube queue
    player.on(AudioPlayerStatus.Idle, () => {
      const s = radioStates.get(guildId);
      if (!s) return;

      if (s.stationKey) {
        // Radio stream dropped — reconnect with exponential backoff
        const key = s.stationKey;
        const station = RADIO_STATIONS[key];
        if (!station) return;
        const MAX_ATTEMPTS = 6;
        const attempt = s.reconnectAttempt + 1;
        if (attempt > MAX_ATTEMPTS) {
          logger.warn({ key, attempt }, "Radio reconnect gave up after max attempts");
          s.stationKey = null;
          s.reconnectAttempt = 0;
          s.notifyChannel?.send(`📻 Stream for **${station.name}** is unavailable after ${MAX_ATTEMPTS} retries. Try another with \`!radio list\`.`).catch(() => null);
          startIdleTimer(guildId);
          return;
        }
        s.reconnectAttempt = attempt;
        const delayMs = Math.min(400 * Math.pow(2, attempt - 1), 30_000);
        if (s.reconnectTimer) clearTimeout(s.reconnectTimer);
        s.reconnectTimer = setTimeout(async () => {
          const cur = radioStates.get(guildId);
          if (!cur || cur.stationKey !== key) return;
          cur.reconnectTimer = null;
          try {
            const stream = await fetchStream(station.url);
            const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
            cur.player.play(resource);
            cur.reconnectAttempt = 0;
            logger.info({ key, attempt }, "Radio auto-reconnected after stream drop");
          } catch (err) {
            logger.error({ err, key, attempt }, "Radio reconnect failed");
          }
        }, delayMs);
        return;
      }

      if (s.isLive) {
        // Live stream ended
        s.youtubeTitle = null;
        s.youtubeUrl = null;
        s.youtubeStartTime = null;
        s.isLive = false;
        s.paused = false;
        _activityCallback?.(null);
        _channelNameCallback?.(guildId, null);
        disableNpButtonsForState(s).catch(() => null);
        s.notifyChannel?.send("📴 The live stream has ended.").catch(() => null);
        startIdleTimer(guildId);
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
      _activityCallback?.(null);
      _channelNameCallback?.(guildId, null);
      disableNpButtonsForState(s).catch(() => null);
      startIdleTimer(guildId);
    });

    radioStates.set(guildId, {
      player,
      stationKey: null,
      youtubeTitle: null,
      youtubeUrl: null,
      youtubeStartTime: null,
      isLive: false,
      queue: [],
      queueMessages: [],
      queueName: null,
      notifyChannel: null,
      guildId,
      idleTimer: null,
      aloneTimer: null,
      reconnectTimer: null,
      reconnectAttempt: 0,
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
 * Resolve a raw user input to a station key (built-in or custom).
 * Returns the key if found, or fuzzy suggestions when not found.
 */
function resolveStation(input: string): { key: string } | { suggestions: string[] } {
  const norm = normalizeForSearch(input);
  if (!norm) return { suggestions: [] };

  // Exact match — built-in first, then custom
  for (const [key, station] of Object.entries(RADIO_STATIONS)) {
    if (normalizeForSearch(key) === norm || normalizeForSearch(station.name) === norm) {
      return { key };
    }
  }
  for (const [key, station] of customStations) {
    if (normalizeForSearch(key) === norm || normalizeForSearch(station.name) === norm) {
      return { key };
    }
  }

  // Fuzzy match across built-in + custom
  const scored: { key: string; score: number }[] = [];
  const allStations: [string, { name: string }][] = [
    ...Object.entries(RADIO_STATIONS),
    ...Array.from(customStations.entries()),
  ];
  for (const [key, station] of allStations) {
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

  const station = RADIO_STATIONS[stationKey] ?? customStations.get(stationKey);
  if (!station) {
    await message.reply(`❌ Station \`${stationKey}\` introuvable. Voir la liste avec \`!radio list\`.`);
    return;
  }

  const ready = await ensureVoiceConnection(message, () => playRadio(message, stationInput));
  if (!ready) return;

  const guildId = message.guildId!;
  const state = radioStates.get(guildId)!;
  clearIdleTimer(state);
  state.stationKey = stationKey;
  state.youtubeTitle = null;
  state.youtubeUrl = null;
  state.queue = [];
  state.queueMessages = [];
  _activityCallback?.(null);
  _channelNameCallback?.(guildId, null);

  // Immediate feedback — user sees this while we open the TCP stream
  const loadMsg = await message.reply(`⏳ Connecting to **${station.name}**…`);

  try {
    const stream = await fetchStream(station.url);
    const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
    state.player.play(resource);

    state.player.once(AudioPlayerStatus.Playing, async () => {
      state.paused = false;
      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle(`${station.emoji} Now playing — ${station.name}`)
        .addFields(
          { name: "Genre", value: station.genre, inline: true },
          { name: "Stop", value: "`!radio leave`", inline: true },
        )
        .setFooter({ text: "Switch station anytime with !radio <key>" });
      await loadMsg.edit({ content: "", embeds: [embed], components: buildRadioNpButtonRows(false) });
      state.nowPlayingMsg = loadMsg;
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

  // 🚀 Start yt-dlp immediately — while Discord API calls below are in flight, it's already running.
  // Use pre-loaded stream if available (was buffering in background), else spawn fresh.
  const audioStream = preloadedStreamCache.get(url) ?? ytdlpStream(url);
  preloadedStreamCache.delete(url);

  // Info fetch runs in parallel with stream startup (skipped when metadata already known).
  // Go straight to yt-dlp — play-dl is unreliable on YouTube and adds serial latency when it fails.
  const infoPromise: Promise<{ title: string; duration: number; thumbnail: string | null }> = knownMeta
    ? Promise.resolve(knownMeta)
    : ytdlpInfo(url).catch((): YtInfo => ({ title: "Unknown", duration: 0, thumbnail: null }));

  // Discord API calls — these overlap with yt-dlp startup time above
  await disableNpButtonsForState(state);

  clearIdleTimer(state);
  state.stationKey = null;
  state.youtubeTitle = "Loading…";
  state.youtubeUrl = url;
  state.isLive = false;
  state.nowPlayingMsg = waitMsg;
  state.paused = false;
  state.requestedBy = requestedBy ?? null;

  // ── Loading bar animation ─────────────────────────────────────────────────
  const FILL_FRAMES = [
    "▱▱▱▱▱▱▱▱▱▱", "▰▱▱▱▱▱▱▱▱▱", "▰▰▱▱▱▱▱▱▱▱", "▰▰▰▱▱▱▱▱▱▱",
    "▰▰▰▰▱▱▱▱▱▱", "▰▰▰▰▰▱▱▱▱▱", "▰▰▰▰▰▰▱▱▱▱", "▰▰▰▰▰▰▰▱▱▱",
    "▰▰▰▰▰▰▰▰▱▱", "▰▰▰▰▰▰▰▰▰▱", "▰▰▰▰▰▰▰▰▰▰",
  ];
  // Pulse frames shown after the bar fills if audio hasn't started yet
  const PULSE_FRAMES = [
    "▰▰▰▰▰▱▱▱▱▱", "▱▰▰▰▰▰▱▱▱▱", "▱▱▰▰▰▰▰▱▱▱", "▱▱▱▰▰▰▰▰▱▱",
    "▱▱▱▱▰▰▰▰▰▱", "▱▱▱▱▱▰▰▰▰▰", "▱▱▱▱▰▰▰▰▰▱", "▱▱▱▰▰▰▰▰▱▱",
    "▱▱▰▰▰▰▰▱▱▱", "▱▰▰▰▰▰▱▱▱▱",
  ];
  let loadFrame = 0;
  let pulsing = false;
  let pulseFrame = 0;
  const loadStartTime = Date.now();
  const MIN_BAR_MS = 600; // show bar for at least 0.6 s before showing embed
  // Show first frame immediately so the bar is visible even on fast preloaded streams
  await waitMsg.edit(`🎬 Loading… ${FILL_FRAMES[0]}`).catch(() => null);
  const loadInterval = setInterval(async () => {
    if (pulsing) {
      // Scroll the pulse window to show progress is still happening
      pulseFrame = (pulseFrame + 1) % PULSE_FRAMES.length;
      await waitMsg.edit(`🎬 Buffering… ${PULSE_FRAMES[pulseFrame]}`).catch(() => null);
    } else {
      loadFrame++;
      if (loadFrame >= FILL_FRAMES.length) {
        // Bar filled but audio hasn't started — switch to pulse mode
        pulsing = true;
        pulseFrame = 0;
        await waitMsg.edit(`🎬 Buffering… ${PULSE_FRAMES[0]}`).catch(() => null);
      } else {
        await waitMsg.edit(`🎬 Loading… ${FILL_FRAMES[loadFrame]}`).catch(() => null);
      }
    }
  }, 200);

  const postNowPlaying = async (title: string, duration: number, thumbnail: string | null) => {
    // Wait until the bar has been visible for the minimum time, then clear
    const elapsed = Date.now() - loadStartTime;
    if (elapsed < MIN_BAR_MS) await new Promise(r => setTimeout(r, MIN_BAR_MS - elapsed));
    clearInterval(loadInterval);
    const cleanTitle = cleanYouTubeTitle(title);
    const s = radioStates.get(guildId);
    if (s) { s.youtubeTitle = cleanTitle; s.youtubeStartTime = Date.now(); }
    maybeSaveArtistFromTitle(cleanTitle);
    _activityCallback?.(cleanTitle);
    _channelNameCallback?.(guildId, cleanTitle);
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
    clearInterval(loadInterval);
    logger.error({ err, url }, "YouTube playback error");
    state.nowPlayingMsg = null;
    await waitMsg.edit({ content: "❌ Playback error. The video may be unavailable or age-restricted.", components: [] });
  };

  const resource = createAudioResource(audioStream, { inputType: StreamType.Arbitrary });
  state.player.play(resource);

  let started = false;

  const cleanup = () => {
    clearTimeout(bufferTimeout);
    state.player.off(AudioPlayerStatus.Playing, onPlaying);
    state.player.off(AudioPlayerStatus.Idle, onIdleBeforePlaying);
    state.player.off("error", onError);
  };

  const onPlaying = async () => {
    if (started) return;
    started = true;
    cleanup();
    const { title, duration, thumbnail } = await infoPromise;
    await postNowPlaying(title, duration, thumbnail);
  };

  // Player went Idle before ever playing → stream produced no audio (yt-dlp failed silently)
  const onIdleBeforePlaying = async () => {
    if (started) return;
    started = true;
    cleanup();
    clearInterval(loadInterval);
    logger.warn({ url }, "YouTube stream went idle before playing — likely bot-check or unavailable video");
    state.nowPlayingMsg = null;
    await waitMsg.edit({ content: "❌ Impossible de lire cette vidéo. YouTube bloque peut-être le bot (cookies requis) ou la vidéo est indisponible.", components: [] }).catch(() => null);
    if (state.queue.length > 0) playNextFromQueue(guildId).catch(() => null);
    else startIdleTimer(guildId);
  };

  // Hard timeout — if still buffering after 35s, give up
  const bufferTimeout = setTimeout(async () => {
    if (started) return;
    started = true;
    cleanup();
    state.player.stop();
    clearInterval(loadInterval);
    logger.warn({ url }, "YouTube stream timed out after 35s in buffering state");
    state.nowPlayingMsg = null;
    await waitMsg.edit({ content: "❌ Délai dépassé — YouTube bloque peut-être les requêtes depuis ce serveur. Vérifie les cookies (`YT_COOKIES`).", components: [] }).catch(() => null);
    if (state.queue.length > 0) playNextFromQueue(guildId).catch(() => null);
    else startIdleTimer(guildId);
  }, 35_000);

  state.player.once(AudioPlayerStatus.Playing, onPlaying);
  state.player.once(AudioPlayerStatus.Idle, onIdleBeforePlaying);
  state.player.once("error", onError);
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
    state.queueMessages.push(null); // placeholder — updated below after fetch
    const pos = state.queue.length; // 1-indexed display position
    const qMsgIdx = pos - 1;        // 0-indexed position in queueMessages
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
      // If this is the very next track, preload its audio stream now
      if (state.queue.length === 1) {
        preloadStream(url);
      }
      // Pre-fetch metadata for the track after this one too
      if (state.queue.length > 1) {
        prefetchTrackInfo(state.queue[state.queue.length - 2]!).catch(() => null);
      }
      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("📋 Added to Queue")
        .setURL(url)
        .setDescription(
          `**[${cleanYouTubeTitle(title)}](${url})**\n` +
          `\`${duration > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : "—"}\` • \`#${pos}\` • <@${message.author.id}>`
        )
        .setFooter({ text: "!queue  •  !skip" });
      await waitMsg.edit({ content: "", embeds: [embed] });
      // Store message for auto-deletion when this song starts playing
      if (qMsgIdx < state.queueMessages.length) state.queueMessages[qMsgIdx] = waitMsg;
      // Also auto-delete after 10 s so it doesn't clutter the channel
      setTimeout(() => waitMsg.delete().catch(() => null), 10_000);
    } catch {
      await waitMsg.edit(`Added to queue at position #${pos}.`);
      setTimeout(() => waitMsg.delete().catch(() => null), 8_000);
    }
    return;
  }

  // ── Radio playing → stop it, start YouTube immediately ───────────────────
  if (state.stationKey) {
    state.stationKey = null;
    state.player.stop();
    state.queue = [];
    state.queueMessages = [];
    state.queueName = null;
  }

  // ── Play immediately ───────────────────────────────────────────────────────
  // Reserve the title slot NOW — before any await — so concurrent !y calls queue instead of cutting.
  state.youtubeTitle = "Loading…";
  state.youtubeUrl = url;
  // Pre-warm yt-dlp before the Discord message round-trip (~200ms saved)
  preloadStream(url);
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
    .setFooter({ text: `${pageLabel}Click a number to play • expires in 2 min` });

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

    // Split title on spaces/hyphens ONLY so "S.O.S" stays together,
    // then strip non-alphanumeric per token → "S.O.S" → "sos", "1.9" → "19"
    const titleWordsNorm = r.title.toLowerCase()
      .split(/[\s\-&!?()\[\]]+/)
      .map(w => w.replace(/[^a-z0-9]/g, ""))
      .filter(w => w.length > 1);

    // Also tokenise channel name — handles "NINAO" (title) + channel "Maître GIMS" → artist word found
    const channelWordsNorm = r.channel
      ? r.channel.toLowerCase()
          .split(/[\s\-&!?()\[\]]+/)
          .map(w => w.replace(/[^a-z0-9]/g, ""))
          .filter(w => w.length > 1)
      : [];

    const titleMatchCount = words.filter(w => queryWordMatchesTitle(w, titleWordsNorm)).length;
    // Combined = title + channel; catches when artist is only in channel name
    const combinedMatchCount = words.filter(w =>
      queryWordMatchesTitle(w, titleWordsNorm) || queryWordMatchesTitle(w, channelWordsNorm),
    ).length;

    s += titleMatchCount * 10;
    if (words.length > 1 && combinedMatchCount === words.length) s += 20;   // all words matched (title+channel)
    if (words.length > 1 && combinedMatchCount < Math.ceil(words.length / 2)) s -= 8; // < half match
    if (combinedMatchCount === 0 && words.length > 0) s -= 20;               // nothing matched
  }

  return s;
}

// ── Search result picker ──────────────────────────────────────────────────────

interface PendingSearchEntry {
  results: Array<{ url: string; title: string; duration: number; thumbnail: string | null }>;
  message: Message;
  requestedBy: string;
  originalQuery: string;
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
  originalQuery: string;
} | null {
  const ps = pendingSearches.get(msgId);
  if (!ps) return null;
  const slice = ps.slices[ps.page];
  if (!slice) return null;
  const globalIdx = slice.start + localIdx;
  if (globalIdx < 0 || globalIdx >= ps.results.length) return null;
  clearTimeout(ps.expires);
  pendingSearches.delete(msgId);
  const basePick = ps.results[globalIdx]!;
  const cached = queueInfoCache.get(basePick.url);
  const pick = cached
    ? { url: basePick.url, title: cached.title, duration: cached.duration, thumbnail: cached.thumbnail }
    : basePick;
  return { pick, message: ps.message, requestedBy: ps.requestedBy, originalQuery: ps.originalQuery };
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

  let results: { url: string; title: string; duration: number; channel: string | null; isLive?: boolean }[];
  try {
    // Fetch 15 candidates so we have enough after filtering out compilations/mixes
    results = await fastYouTubeSearch(query, 15);
  } catch (err) {
    logger.error({ err, query }, "YouTube search error");
    await loadMsg.edit("❌ Search failed. Please try again.");
    return;
  }

  if (results.length === 0) {
    await loadMsg.edit("❌ No results found.");
    return;
  }

  // Filter out long videos (compilations, mixes, full albums — anything > 15 min)
  const MAX_SINGLE_TRACK_SECS = 15 * 60;
  // Exclude live streams — they have no fixed duration and break queue playback; use !live instead
  const noLive = results.filter(r => !r.isLive);
  // Prefer results with a known duration under 15 min (excludes livestreams and broken entries)
  const withDuration = noLive.filter(r => r.duration > 0 && r.duration <= MAX_SINGLE_TRACK_SECS);
  // Fallback: if too few good results, include unknown-duration ones but still drop >15 min
  const pool = withDuration.length >= 2
    ? withDuration
    : noLive.filter(r => r.duration === 0 || r.duration <= MAX_SINGLE_TRACK_SECS);

  // Clean titles and cap at 11 (3 pages: 4 + 3 + 4)
  const cleaned = pool.slice(0, 11).map(r => ({
    ...r,
    title: cleanYouTubeTitle(r.title),
    thumbnail: null as string | null,
  }));

  // Auto-play heuristic:
  // - 3+ words → specific enough (e.g. "David Guetta Titanium") → play #1 directly
  // - 2 words → could be "Artist Song" (Gims Bella) OR "Firstname Lastname" (David Guetta)
  //   → check if word 2 appears in the *song* part of the top result's title (after " - ")
  //   → if yes: it's artist+song → auto-play; if no: it's just an artist → picker
  // - 1 word → always show picker
  const words = query.trim().split(/\s+/).filter(w => w.length > 1);
  const wordCount = words.length;

  if (wordCount >= 3) {
    const sel = cleaned[0]!;
    await loadMsg.delete().catch(() => null);
    await playYoutube(message, sel.url, { title: sel.title, duration: sel.duration, thumbnail: null });
    return;
  }

  if (wordCount === 2) {
    const sel = cleaned[0]!;
    const word1 = words[0] ?? "";
    const word2 = (words[1] ?? "").toLowerCase();
    const titleLower = sel.title.toLowerCase();
    const dashIdx = titleLower.indexOf(" - ");

    // Known artist cache: if word1 is a recognized artist, word2 must be the song → auto-play
    if (isKnownArtist(word1)) {
      await loadMsg.delete().catch(() => null);
      await playYoutube(message, sel.url, { title: sel.title, duration: sel.duration, thumbnail: null });
      return;
    }

    if (dashIdx !== -1) {
      const artistPart = titleLower.slice(0, dashIdx);
      const songPart   = titleLower.slice(dashIdx + 3);
      // word2 is in song part but NOT in artist part → it's a song title → auto-play
      if (songPart.includes(word2) && !artistPart.includes(word2)) {
        await loadMsg.delete().catch(() => null);
        await playYoutube(message, sel.url, { title: sel.title, duration: sel.duration, thumbnail: null });
        return;
      }
    }
    // Otherwise fall through to picker
  }

  // 1-word query, or 2-word artist name → show a picker so the user can choose
  const allResults = cleaned;
  const slices = computePageSlices(allResults.length);
  const { embed, components } = buildSearchPage(allResults, 0, loadMsg.id, slices);

  await loadMsg.edit({ content: "", embeds: [embed], components });

  // Pre-warm yt-dlp for the top 3 results while the user reads the picker.
  // The user typically takes 3–10 s to choose — by then the stream is already buffered,
  // so audio starts almost instantly after the click.
  const warmCount = Math.min(3, allResults.length);
  for (let i = 0; i < warmCount; i++) {
    const r = allResults[i]!;
    preloadStream(r.url);
    // Also pre-fetch full metadata (real thumbnail, exact duration) in parallel
    if (!queueInfoCache.has(r.url)) {
      ytdlpInfo(r.url)
        .then(info => queueInfoCache.set(r.url, {
          title: cleanYouTubeTitle(info.title),
          duration: info.duration,
          thumbnail: info.thumbnail,
        }))
        .catch(() => null);
    }
  }

  // Expire after 2 min — remove buttons
  const expires = setTimeout(async () => {
    pendingSearches.delete(loadMsg.id);
    await loadMsg.edit({ embeds: [embed], components: [] }).catch(() => null);
  }, 120_000);

  pendingSearches.set(loadMsg.id, {
    results: allResults,
    message,
    requestedBy: message.author.id,
    originalQuery: query.trim(),
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
  if (!state || (!state.youtubeTitle && !state.stationKey)) return "not_playing";
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
  state.isLive = false;
  _activityCallback?.(null);
  _channelNameCallback?.(guildId, null);
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

// ── Radio station navigation helpers ─────────────────────────────────────────

/** Returns the key of the next station in the same language as the current one. */
export function nextRadioStation(guildId: string): string | null {
  const state = radioStates.get(guildId);
  if (!state?.stationKey) return null;
  const currentKey = state.stationKey;
  const lang = RADIO_STATIONS[currentKey]?.lang;
  if (!lang) return null;
  const sameLang = Object.keys(RADIO_STATIONS).filter(k => RADIO_STATIONS[k]?.lang === lang);
  const idx = sameLang.indexOf(currentKey);
  return sameLang[(idx + 1) % sameLang.length] ?? null;
}

/** Switch to a different radio station using an existing message (from button handler). */
export async function execSwitchRadioStation(guildId: string, stationKey: string, replyMsg: Message): Promise<void> {
  const state = radioStates.get(guildId);
  if (!state) return;
  const station = RADIO_STATIONS[stationKey];
  if (!station) return;
  state.stationKey = stationKey;
  state.queue = [];
  state.queueMessages = [];
  try {
    const stream = await fetchStream(station.url);
    const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
    state.player.play(resource);
    state.player.once(AudioPlayerStatus.Playing, async () => {
      state.paused = false;
      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle(`${station.emoji} Now playing — ${station.name}`)
        .addFields(
          { name: "Genre", value: station.genre, inline: true },
          { name: "Stop", value: "`!radio leave`", inline: true },
        )
        .setFooter({ text: "Switch station anytime with !radio <key>" });
      await replyMsg.edit({ content: "", embeds: [embed], components: buildRadioNpButtonRows(false) }).catch(() => null);
      state.nowPlayingMsg = replyMsg;
    });
  } catch (err) {
    logger.error({ err, stationKey }, "Radio switch error");
    await replyMsg.edit({ content: `❌ Failed to switch to **${station.name}**.` }).catch(() => null);
  }
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
    lines.push(`▶️ **[En cours]** ${state.youtubeTitle}`);
  }
  if (state.queue.length > 0) {
    state.queue.slice(0, 12).forEach((url, i) => {
      const cached = queueInfoCache.get(url);
      const label = cached
        ? `**${cached.title}** (${Math.floor(cached.duration / 60)}:${String(cached.duration % 60).padStart(2, "0")})`
        : `\`${url.match(/[?&]v=([^&]+)/)?.[1] ?? url.split("/").pop() ?? url}\``;
      lines.push(`${i + 2}. ${label}`);
    });
    if (state.queue.length > 12) lines.push(`… et ${state.queue.length - 12} autres`);
  }

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`🎵 Queue — ${1 + state.queue.length} titre${state.queue.length !== 1 ? "s" : ""}`)
    .setDescription(lines.join("\n"))
    .setFooter({ text: "!skip  •  !y <titre>  •  !queue" });
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

/** Play a live stream (YouTube Live or Twitch). Input can be a URL or a search query. */
export async function playLive(message: Message, input: string): Promise<void> {
  if (!input.trim()) {
    await message.reply("❓ Provide a URL or search query.\nExamples: `!live https://www.twitch.tv/channel`  •  `!live lofi girl`");
    return;
  }

  const isUrl = /^https?:\/\//.test(input) || input.includes("twitch.tv/") || input.includes("youtube.com/") || input.includes("youtu.be/");

  const ready = await ensureVoiceConnection(message, () => playLive(message, input));
  if (!ready) return;

  const guildId = message.guildId!;
  const state = radioStates.get(guildId)!;
  state.notifyChannel = message.channel as TextChannel;

  if (state.stationKey) {
    state.stationKey = null;
    state.player.stop();
    state.queue = [];
    state.queueName = null;
  }

  const waitMsg = await message.reply("🔴 Loading live stream…");

  let liveUrl: string | null = isUrl ? input : null;
  let liveTitle = "Live Stream";
  let liveThumbnail: string | null = null;

  if (!liveUrl) {
    try {
      const play = await getPlay();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: any[] = await play.search(input, { source: { youtube: "video" }, limit: 15 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const liveResults = results.filter((v: any) => v.isLive || v.isLiveContent || v.durationInSec === 0);
      if (liveResults.length > 0) {
        liveUrl = liveResults[0].url as string;
        liveTitle = (liveResults[0].title as string) ?? "Live Stream";
      } else {
        // play-dl found no live results — fall back to yt-dlp which detects live reliably
        try {
          const ytResults = await ytdlpSearch(`${input} live`, 5);
          const ytLive = ytResults.filter(r => r.isLive || r.duration === 0);
          const pick = ytLive.length > 0 ? ytLive[0] : ytResults[0];
          if (pick) { liveUrl = pick.url; liveTitle = pick.title ?? "Live Stream"; }
        } catch { /* ignore */ }
      }
      if (!liveUrl) {
        await waitMsg.edit("❌ No live streams found for that query. Try a direct URL instead.");
        return;
      }
      await waitMsg.edit(`🔴 Found: **${liveTitle}** — connecting to stream…`);
    } catch (err) {
      logger.error({ err, input }, "Live stream search error");
      await waitMsg.edit("❌ Failed to search for live streams. Try a direct URL.");
      return;
    }
  }

  try {
    const audioStream = ytdlpStream(liveUrl);
    const resource = createAudioResource(audioStream, { inputType: StreamType.Arbitrary });

    clearIdleTimer(state);
    state.stationKey = null;
    state.youtubeTitle = liveTitle;
    state.youtubeUrl = liveUrl;
    state.youtubeStartTime = null;
    state.isLive = true;
    state.paused = false;
    state.requestedBy = message.author.id;

    await disableNpButtonsForState(state);
    state.nowPlayingMsg = waitMsg;

    state.player.play(resource);

    state.player.once(AudioPlayerStatus.Playing, async () => {
      try {
        const info = await ytdlpInfo(liveUrl!);
        liveTitle = cleanYouTubeTitle(info.title) || liveTitle;
        liveThumbnail = info.thumbnail;
      } catch {
        // ignore — use fallback title
      }

      const s = radioStates.get(guildId);
      if (s) { s.youtubeTitle = liveTitle; }
      _activityCallback?.(liveTitle);
      _channelNameCallback?.(guildId, liveTitle);

      const embed = buildNowPlayingEmbed({
        title: liveTitle,
        url: liveUrl!,
        duration: "🔴 LIVE",
        thumbnail: liveThumbnail,
        requestedBy: message.author.id,
        isLive: true,
      });
      await waitMsg.edit({ content: "", embeds: [embed], components: buildNpButtonRows(false) });
      const s2 = radioStates.get(guildId);
      if (s2) s2.nowPlayingMsg = waitMsg;
    });

    state.player.once("error", async (err: Error) => {
      logger.error({ err, url: liveUrl }, "Live stream playback error");
      const s = radioStates.get(guildId);
      if (s?.nowPlayingMsg === waitMsg) s.nowPlayingMsg = null;
      await waitMsg.edit({ content: "❌ Failed to play the live stream. The stream may have ended or the URL is invalid.", components: [] });
    });

  } catch (err) {
    logger.error({ err, input }, "Live stream load error");
    await waitMsg.edit("❌ Failed to load the live stream. Make sure the URL is valid and the stream is currently live.");
    state.isLive = false;
  }
}
