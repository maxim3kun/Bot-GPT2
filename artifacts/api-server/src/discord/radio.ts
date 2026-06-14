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
import { ytdlpInfo, ytdlpStream, ytdlpSearch } from "../lib/ytdlp";

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
    req.setTimeout(15_000, () => { req.destroy(); reject(new Error(`Timeout connecting to ${url}`)); });
  });
}

// ── Radio station list ────────────────────────────────────────────────────────

export const RADIO_STATIONS: Record<string, { name: string; url: string; emoji: string; genre: string; lang: "fr" | "es" | "en" }> = {
  // 🇫🇷 French
  nrj:         { name: "NRJ",            url: "https://cdn.nrjaudio.fm/audio1/fr/30001/mp3_128.mp3",               emoji: "🔥", genre: "Pop / Hits",              lang: "fr" },
  fun:         { name: "Fun Radio",      url: "https://cdn.nrjaudio.fm/adwz2/fr/30401/mp3_128.mp3",                emoji: "🎉", genre: "Dance / Electronic",       lang: "fr" },
  skyrock:     { name: "Skyrock",        url: "https://skyrock.ice.infomaniak.ch/skyrock-128.mp3",                  emoji: "🎤", genre: "Hip-Hop / R&B",            lang: "fr" },
  franceinter: { name: "France Inter",   url: "https://icecast.radiofrance.fr/franceinter-midfi.mp3",              emoji: "🎙️", genre: "Culture / Talk",          lang: "fr" },
  franceinfo:  { name: "France Info",    url: "https://icecast.radiofrance.fr/franceinfo-midfi.mp3",               emoji: "📰", genre: "News / Info",              lang: "fr" },
  musique:     { name: "France Musique", url: "https://icecast.radiofrance.fr/francemusique-midfi.mp3",            emoji: "🎼", genre: "Classical",                lang: "fr" },
  ouifm:       { name: "OÜI FM",         url: "https://ouifm.ice.infomaniak.ch/ouifm-high.mp3",                    emoji: "🎸", genre: "Rock / Alternative",       lang: "fr" },
  virgin:      { name: "Virgin Radio",   url: "https://cdn.nrjaudio.fm/adwz2/fr/30501/mp3_128.mp3",               emoji: "💋", genre: "Rock / Pop",               lang: "fr" },
  nostalgie:   { name: "Nostalgie",      url: "https://cdn.nrjaudio.fm/adwz2/fr/30601/mp3_128.mp3",               emoji: "🕰️", genre: "Oldies / French classics", lang: "fr" },
  rtl2:        { name: "RTL 2",          url: "https://icecast.rtl2.fr/rtl2-1-44-128",                             emoji: "🔊", genre: "Rock / Pop",               lang: "fr" },
  sanef:       { name: "Sanef 107.7",    url: "https://sanef-1077.ice.infomaniak.ch/sanef-1077-128.mp3",           emoji: "🚗", genre: "Info / Trafic",            lang: "fr" },
  evasion:     { name: "Évasion FM",     url: "https://evasion.ice.infomaniak.ch/evasion-128.mp3",                 emoji: "🌅", genre: "Variété / Détente",        lang: "fr" },
  // 🇪🇸 Spanish
  los40:       { name: "Los 40",         url: "https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40_SC",       emoji: "🔊", genre: "Pop / Hits",               lang: "es" },
  cadena100:   { name: "Cadena 100",     url: "https://playerservices.streamtheworld.com/api/livestream-redirect/CADENA100_SC",   emoji: "💃", genre: "Pop / Dance",              lang: "es" },
  europafm:    { name: "Europa FM",      url: "https://playerservices.streamtheworld.com/api/livestream-redirect/EUROPAFM_SC",    emoji: "🌟", genre: "Rock / Pop",               lang: "es" },
  dial:        { name: "Cadena Dial",    url: "https://playerservices.streamtheworld.com/api/livestream-redirect/CADENADIAL_SC",  emoji: "🎶", genre: "Spanish Pop / Romántica",  lang: "es" },
  rock_es:     { name: "Rock FM ES",     url: "https://playerservices.streamtheworld.com/api/livestream-redirect/ROCKFM_SC",      emoji: "🤘", genre: "Rock",                     lang: "es" },
  cope:        { name: "COPE",           url: "https://cope.stream.cope.es/cope128.mp3",                                         emoji: "📢", genre: "News / Talk",              lang: "es" },
  // 🇬🇧 English
  capital:     { name: "Capital FM",     url: "https://media-ice.musicradio.com/CapitalMP3",           emoji: "🏙️", genre: "Pop / Dance Hits",        lang: "en" },
  heart:       { name: "Heart FM",       url: "https://media-ice.musicradio.com/HeartMP3Low",          emoji: "❤️", genre: "Easy Listening / Pop",    lang: "en" },
  absolute:    { name: "Absolute Radio", url: "https://22223.live.streamtheworld.com/ABSOLUTE_RADIO_SC", emoji: "🎸", genre: "Classic Rock",            lang: "en" },
  radiox:      { name: "Radio X",        url: "https://media-ice.musicradio.com/RadioXMP3Low",         emoji: "📻", genre: "Rock / Indie",             lang: "en" },
  classicfm:   { name: "Classic FM",     url: "https://media-ice.musicradio.com/ClassicFMMP3",         emoji: "🎼", genre: "Classical",                lang: "en" },
  magic:       { name: "Magic Radio",    url: "https://18493.live.streamtheworld.com/MAGIC_RADIO_SC",  emoji: "✨", genre: "Pop / Easy Listening",     lang: "en" },
  kiss:        { name: "Kiss FM UK",     url: "https://18963.live.streamtheworld.com/KISS_SC",         emoji: "💋", genre: "Dance / RnB",              lang: "en" },
  planetrock:  { name: "Planet Rock",    url: "https://17883.live.streamtheworld.com/PLANET_ROCK_SC",  emoji: "🪨", genre: "Classic Rock / Hard Rock", lang: "en" },
  smooth:      { name: "Smooth Radio",   url: "https://media-ice.musicradio.com/SmoothMP3Low",         emoji: "🌊", genre: "Soul / Smooth",            lang: "en" },
  kexp:        { name: "KEXP",           url: "https://kexp-mp3-128.streamguys1.com/kexp128.mp3",      emoji: "🌍", genre: "Indie / Alternative",      lang: "en" },
  groove:      { name: "Groove Salad",   url: "http://ice2.somafm.com/groovesalad-128-mp3",            emoji: "🌿", genre: "Ambient / Electronic",     lang: "en" },
  lush:        { name: "Lush",           url: "http://ice2.somafm.com/lush-128-mp3",                   emoji: "🌸", genre: "Pop / Chill",              lang: "en" },
  jazz24:      { name: "Jazz24",         url: "https://24953.live.streamtheworld.com/JAZZ24_SC",        emoji: "🎷", genre: "Jazz",                     lang: "en" },
  defcon:      { name: "DEF CON Radio",  url: "http://ice2.somafm.com/defcon-128-mp3",                 emoji: "🔒", genre: "Electronic / Hacker",      lang: "en" },
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
  idleTimer: ReturnType<typeof setTimeout> | null;
  aloneTimer: ReturnType<typeof setTimeout> | null;
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

// ── Queue playback (internal) ─────────────────────────────────────────────────

async function playNextFromQueue(guildId: string): Promise<void> {
  const state = radioStates.get(guildId);
  if (!state || state.queue.length === 0) return;

  const url = state.queue.shift()!;

  try {
    const info = await ytdlpInfo(url);
    const { title, duration, thumbnail } = info;
    const audioStream = ytdlpStream(url);
    const resource = createAudioResource(audioStream, { inputType: StreamType.Arbitrary });

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

// ── Voice channel picker (sent when user isn't in a channel) ─────────────────

export async function replyNotInVoice(message: Message): Promise<void> {
  const guild = message.guild;
  if (!guild) {
    await message.reply("❌ You need to be in a voice channel first!");
    return;
  }

  const { getVoicePickerChannels } = await import("./voice-picker-channels.js");
  const configuredIds = getVoicePickerChannels(guild.id);

  let voiceChannels = configuredIds.length > 0
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

  const rows: ActionRowBuilder<ButtonBuilder>[] = voiceChannels.map(ch =>
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel(ch.name.slice(0, 80))
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${guild.id}/${ch.id}`)
        .setEmoji("🔊"),
      new ButtonBuilder()
        .setCustomId("voice_ready")
        .setLabel("I'm ready!")
        .setStyle(ButtonStyle.Success)
        .setEmoji("✅"),
    ),
  );

  await message.reply({
    content: "❌ You need to join a voice channel first! Click a channel then ✅ when ready:",
    components: rows,
  });
}

// ── Voice connection helper ───────────────────────────────────────────────────

export async function ensureVoiceConnection(message: Message): Promise<boolean> {
  const voiceChannel = message.member?.voice.channel;
  if (!voiceChannel) {
    await replyNotInVoice(message);
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

      // Nothing left to play — start the idle auto-disconnect timer
      s.youtubeTitle = null;
      s.youtubeUrl = null;
      startIdleTimer(guildId);
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
      idleTimer: null,
      aloneTimer: null,
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

  const ready = await ensureVoiceConnection(message);
  if (!ready) return;

  const guildId = message.guildId!;
  const state = radioStates.get(guildId)!;
  clearIdleTimer(state);
  state.stationKey = stationKey;
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
  waitMsg: { edit: (opts: unknown) => Promise<unknown> },
): Promise<void> {
  const state = radioStates.get(guildId);
  if (!state) return;

  const info = await ytdlpInfo(url);
  const { title, duration, thumbnail } = info;
  const audioStream = ytdlpStream(url);
  const resource = createAudioResource(audioStream, { inputType: StreamType.Arbitrary });

  clearIdleTimer(state);
  state.stationKey = null;
  state.youtubeTitle = title;
  state.youtubeUrl = url;
  state.player.play(resource);

  state.player.once(AudioPlayerStatus.Playing, async () => {
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    const queueCount = radioStates.get(guildId)?.queue.length ?? 0;
    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("▶️ Now playing")
      .setDescription(`**${title}**`)
      .addFields(
        { name: "Duration", value: `${mins}:${secs.toString().padStart(2, "0")}`, inline: true },
        { name: "Stop", value: "`!radio leave`", inline: true },
        ...(queueCount > 0 ? [{ name: "Queue", value: `${queueCount} next • \`!queue\``, inline: true }] : []),
      )
      .setFooter({ text: `!skip to skip • !youtube <url> to add • !youtube search <keywords>` });
    if (thumbnail) embed.setThumbnail(thumbnail);
    await waitMsg.edit({ content: "", embeds: [embed] });
  });

  state.player.once("error", async (err: Error) => {
    logger.error({ err, url }, "YouTube playback error");
    await waitMsg.edit("❌ Playback error. The video may be unavailable or age-restricted.");
  });
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
  state.notifyChannel = message.channel as TextChannel;

  // ── YouTube already playing → add to queue ────────────────────────────────
  if (state.youtubeTitle) {
    state.queue.push(url);
    const pos = state.queue.length; // items after current (#1)
    const waitMsg = await message.reply("⏳ Fetching info…");
    try {
      const info = await ytdlpInfo(url);
      const { title, duration } = info;
      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("📥 Added to queue")
        .setDescription(`**${title}**`)
        .addFields(
          { name: "Duration", value: duration > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : "—", inline: true },
          { name: "Position", value: `#${pos + 1} in queue`, inline: true },
        )
        .setFooter({ text: `!queue to see all  •  !skip to skip current` });
      await waitMsg.edit({ content: "", embeds: [embed] });
    } catch {
      await waitMsg.edit(`📥 Added to queue at position #${pos + 1}.`);
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
  const waitMsg = await message.reply("🎬 Loading YouTube audio, please wait…");
  try {
    await execPlayYoutube(guildId, url, waitMsg);
  } catch (err) {
    logger.error({ err, url }, "YouTube load error");
    await waitMsg.edit("❌ Failed to load the YouTube video. It may be private, age-restricted or unavailable.");
    radioStates.delete(guildId);
    getVoiceConnection(guildId)?.destroy();
  }
}

const SEARCH_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"] as const;

export async function searchAndQueue(message: Message, query: string): Promise<void> {
  if (!query.trim()) {
    await message.reply("❓ Provide keywords.\nExample: `!youtube search stromae papaoutai`");
    return;
  }

  const loadMsg = await message.reply("🔍 Searching YouTube…");

  let results: Awaited<ReturnType<typeof ytdlpSearch>>;
  try {
    results = await ytdlpSearch(query, 5);
  } catch (err) {
    logger.error({ err, query }, "YouTube search error");
    await loadMsg.edit("❌ Search failed. Please try again.");
    return;
  }

  if (results.length === 0) {
    await loadMsg.edit("❌ No results found.");
    return;
  }

  const lines = results.map((r, i) => {
    const mins = Math.floor(r.duration / 60);
    const secs = r.duration % 60;
    const time = r.duration > 0 ? ` \`${mins}:${secs.toString().padStart(2, "0")}\`` : "";
    const ch = r.channel ? ` — *${r.channel}*` : "";
    return `${SEARCH_EMOJIS[i]} **${r.title}**${time}${ch}`;
  });

  const embed = new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle("🔍 YouTube — Search results")
    .setDescription(lines.join("\n\n"))
    .setFooter({ text: "React with a number to add to queue  •  30 seconds to choose" });

  await loadMsg.edit({ content: "", embeds: [embed] });
  for (const emoji of SEARCH_EMOJIS.slice(0, results.length)) {
    await loadMsg.react(emoji).catch(() => null);
  }

  const collector = (loadMsg as unknown as {
    createReactionCollector: (opts: {
      filter: (r: { emoji: { name: string | null } }, u: { id: string; bot: boolean }) => boolean;
      time: number;
      max: number;
    }) => {
      on: (event: string, cb: (...args: unknown[]) => void) => void;
      stop: (reason?: string) => void;
    };
  }).createReactionCollector({
    filter: (r: { emoji: { name: string | null } }, u: { id: string; bot: boolean }) =>
      !u.bot && u.id === message.author.id && (SEARCH_EMOJIS as readonly string[]).includes(r.emoji.name ?? ""),
    time: 30_000,
    max: 1,
  });

  collector.on("collect", async (...args: unknown[]) => {
    const reaction = args[0] as { emoji: { name: string | null } };
    const idx = (SEARCH_EMOJIS as readonly string[]).indexOf(reaction.emoji.name ?? "");
    if (idx === -1 || !results[idx]) return;
    const selected = results[idx]!;
    await loadMsg.delete().catch(() => null);
    await playYoutube(message, selected.url);
  });

  collector.on("end", async (...args: unknown[]) => {
    const reason = args[1] as string;
    if (reason === "time") {
      await loadMsg.edit({ content: "⏱️ Search expired.", embeds: [] }).catch(() => null);
    }
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
  state.youtubeTitle = null;
  state.youtubeUrl = null;
  state.player.stop();
  if (state.queue.length > 0) {
    await message.reply(`⏭️ Skipped **${skipped}** — loading next…`);
  } else {
    await message.reply(`⏭️ Skipped **${skipped}** — queue is empty.`);
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
