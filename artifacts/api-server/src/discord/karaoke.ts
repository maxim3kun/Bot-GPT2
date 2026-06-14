import { Message, EmbedBuilder, type MessageReaction, type User } from "discord.js";
import {
  AudioPlayerStatus,
  StreamType,
  getVoiceConnection,
  createAudioResource,
} from "@discordjs/voice";
import { get as httpsGet } from "https";
import type { IncomingMessage } from "http";
import { ensureVoiceConnection, radioStates } from "./radio";
import { logger } from "../lib/logger";

// ── LRC parser ────────────────────────────────────────────────────────────────

interface LrcLine {
  time: number;
  text: string;
}

function parseLrc(lrc: string): LrcLine[] {
  const lines: LrcLine[] = [];
  for (const raw of lrc.split("\n")) {
    const m = raw.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
    if (!m) continue;
    const time = parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10) + parseInt(m[3]!.padEnd(3, "0"), 10) / 1000;
    const text = m[4]!.trim();
    if (text) lines.push({ time, text });
  }
  return lines.sort((a, b) => a.time - b.time);
}

// ── lrclib.net ────────────────────────────────────────────────────────────────

interface LrclibResult {
  trackName: string;
  artistName: string;
  syncedLyrics: string | null;
  duration?: number;
}

async function lrclibFetch(params: Record<string, string>): Promise<LrclibResult[]> {
  const resp = await fetch(`https://lrclib.net/api/search?${new URLSearchParams(params)}`, {
    signal: AbortSignal.timeout(20000),
    headers: { "User-Agent": "DiscordBot/1.0" },
  });
  if (!resp.ok) return [];
  return resp.json() as Promise<LrclibResult[]>;
}

async function searchLrcLib(query: string): Promise<{ lines: LrcLine[]; title: string; artist: string; duration: number } | null> {
  const words = query.trim().split(/\s+/);
  const strategies: Record<string, string>[] = [
    { q: query },
    ...(words.length > 1 ? [{ artist_name: words[0]!, track_name: words.slice(1).join(" ") }] : []),
    ...(words.length > 1 ? [{ track_name: words.slice(1).join(" ") }] : []),
    ...(words.length > 1 ? [{ q: words.slice(1).join(" ") }] : []),
  ];
  for (const params of strategies) {
    try {
      const results = await lrclibFetch(params);
      const hit = results.find(r => r.syncedLyrics && r.syncedLyrics.trim().length > 0);
      if (!hit?.syncedLyrics) continue;
      const lines = parseLrc(hit.syncedLyrics);
      if (lines.length === 0) continue;
      return { lines, title: hit.trackName, artist: hit.artistName, duration: hit.duration ?? 0 };
    } catch (err) {
      logger.warn({ err, params }, "lrclib strategy failed");
    }
  }
  return null;
}

async function searchLrcLibMultiple(query: string, limit = 8): Promise<LrclibResult[]> {
  const words = query.trim().split(/\s+/);
  const strategies: Record<string, string>[] = [
    { q: query },
    ...(words.length > 1 ? [{ artist_name: words[0]!, track_name: words.slice(1).join(" ") }] : []),
    { artist_name: query },
  ];
  const seen = new Set<string>();
  const out: LrclibResult[] = [];
  for (const params of strategies) {
    try {
      const results = await lrclibFetch(params);
      for (const r of results) {
        if (!r.syncedLyrics || r.syncedLyrics.trim().length === 0) continue;
        const key = `${r.artistName.toLowerCase()}::${r.trackName.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(r);
        if (out.length >= limit) return out;
      }
    } catch (err) {
      logger.warn({ err, params }, "lrclib multi-search strategy failed");
    }
    if (out.length >= limit) break;
  }
  return out;
}

// ── SoundCloud audio search & stream ─────────────────────────────────────────

const SC_HEADERS = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" };
let scClientId = "QNR5nrdLOvApYERC8AOUr3VjRfHnLjle";

async function refreshScClientId(): Promise<boolean> {
  try {
    const html = await fetch("https://soundcloud.com/", { headers: SC_HEADERS }).then(r => r.text());
    const jsUrls = [...html.matchAll(/https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js/g)].map(m => m[0]).slice(0, 6);
    for (const url of jsUrls) {
      const js = await fetch(url, { headers: SC_HEADERS, signal: AbortSignal.timeout(6000) }).then(r => r.text()).catch(() => "");
      const m = js.match(/client_id:"([^"]{20,})"/) ?? js.match(/clientId:"([^"]{20,})"/) ?? js.match(/"client_id","([^"]{20,})"/);
      if (m?.[1]) {
        scClientId = m[1];
        logger.info({ scClientId }, "SoundCloud client_id refreshed");
        return true;
      }
    }
    // Fallback: look for 32-char alphanumeric token on the homepage itself
    const candidates = [...html.matchAll(/[a-zA-Z0-9]{32}/g)].map(m => m[0]);
    for (const cid of candidates) {
      const r = await fetch(`https://api-v2.soundcloud.com/search/tracks?q=test&limit=1&client_id=${cid}`, { headers: SC_HEADERS, signal: AbortSignal.timeout(5000) }).catch(() => null);
      if (r?.ok) { scClientId = cid; return true; }
    }
  } catch (err) {
    logger.warn({ err }, "SoundCloud client_id refresh failed");
  }
  return false;
}

interface ScTrack {
  url: string;
  title: string;
  durationMs: number;
  thumbnail: string;
  streamUrl: string;
}

async function searchSoundCloud(query: string): Promise<ScTrack | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(
        `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&limit=5&client_id=${scClientId}`,
        { headers: SC_HEADERS, signal: AbortSignal.timeout(10000) },
      );
      if (r.status === 401 || r.status === 403) {
        logger.warn("SoundCloud client_id expired, refreshing…");
        await refreshScClientId();
        continue;
      }
      if (!r.ok) return null;
      const data = await r.json() as { collection: Array<{
        title: string;
        permalink_url: string;
        duration: number;
        artwork_url: string | null;
        media: { transcodings: Array<{ url: string; format: { protocol: string; mime_type: string } }> };
      }> };

      const track = data.collection?.[0];
      if (!track) return null;

      // Prefer progressive (direct MP3) over HLS
      const progressive = track.media.transcodings.find(t => t.format.protocol === "progressive");
      const hls = track.media.transcodings.find(t => t.format.protocol === "hls" && t.format.mime_type.includes("mpeg"));
      const transcoding = progressive ?? hls ?? track.media.transcodings[0];
      if (!transcoding) return null;

      // Resolve stream URL
      const sr = await fetch(`${transcoding.url}?client_id=${scClientId}`, { headers: SC_HEADERS, signal: AbortSignal.timeout(8000) });
      if (!sr.ok) return null;
      const { url: streamUrl } = await sr.json() as { url: string };
      if (!streamUrl) return null;

      return {
        url: track.permalink_url,
        title: track.title,
        durationMs: track.duration,
        thumbnail: track.artwork_url?.replace("-large", "-t500x500") ?? "",
        streamUrl,
      };
    } catch (err) {
      logger.warn({ err, attempt }, "SoundCloud search error");
      if (attempt === 0) await refreshScClientId();
    }
  }
  return null;
}

function fetchHttpStream(url: string): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    httpsGet(url, (res) => {
      if (res.statusCode === 200) { resolve(res); return; }
      reject(new Error(`HTTP ${res.statusCode}`));
    }).on("error", reject);
  });
}

// ── Session state ─────────────────────────────────────────────────────────────

interface KaraokeSession {
  guildId: string;
  lines: LrcLine[];
  embedMessage: Message;
  startTime: number;
  intervalId: NodeJS.Timeout | null;
  stopped: boolean;
  songTitle: string;
  artistName: string;
  lastEditedIdx: number;
}

const karaokeSessions = new Map<string, KaraokeSession>();

// ── Embed builders ────────────────────────────────────────────────────────────

function buildWaitEmbed(desc: string, footer?: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle("🎤 Karaoke")
    .setDescription(desc)
    .setFooter({ text: footer ?? "Please wait…" });
}

function buildReadyEmbed(title: string, artist: string, lineCount: number, duration: number): EmbedBuilder {
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  return new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle("🎤 Karaoke ready!")
    .setDescription(
      `**${title}** — *${artist}*\n\n` +
      `🎵 No audio source found. Start playing the song yourself (Spotify / YouTube),\n` +
      `then react **▶️** to sync the lyrics!`,
    )
    .addFields(
      { name: "📝 Lyrics", value: `${lineCount} synced lines`, inline: true },
      ...(duration > 0 ? [{ name: "⏱ Duration", value: `${mins}:${secs.toString().padStart(2, "0")}`, inline: true }] : []),
    )
    .setFooter({ text: "React ⏹ at any time to stop · Lyrics from lrclib.net" });
}

function buildLyricsEmbed(session: KaraokeSession, currentIdx: number): EmbedBuilder {
  const { lines, songTitle, artistName } = session;
  const elapsed = (Date.now() - session.startTime) / 1000;
  const mins = Math.floor(elapsed / 60);
  const secs = Math.floor(elapsed % 60);

  const prev = currentIdx > 0 ? lines[currentIdx - 1]?.text : null;
  const cur = lines[currentIdx]?.text ?? "🎵";
  const next = lines[currentIdx + 1]?.text ?? null;

  let desc = "";
  if (prev) desc += `*${prev}*\n\n`;
  desc += `**▶ ${cur}**`;
  if (next) desc += `\n\n*${next}*`;

  return new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle(`🎤 ${songTitle}`)
    .setAuthor({ name: `🎵 ${artistName}` })
    .setDescription(desc)
    .setFooter({ text: `⏱ ${mins}:${secs.toString().padStart(2, "0")} · React ⏹ to stop` });
}

// ── Lyrics loop ───────────────────────────────────────────────────────────────

function getCurrentLineIndex(lines: LrcLine[], elapsed: number): number {
  let idx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.time <= elapsed) idx = i;
    else break;
  }
  return idx;
}

function startLyricsLoop(session: KaraokeSession): void {
  session.intervalId = setInterval(async () => {
    if (session.stopped) { clearInterval(session.intervalId!); return; }

    const elapsed = (Date.now() - session.startTime) / 1000;
    const idx = getCurrentLineIndex(session.lines, elapsed);
    if (idx === session.lastEditedIdx) return;
    session.lastEditedIdx = idx;

    try {
      await session.embedMessage.edit({ content: "", embeds: [buildLyricsEmbed(session, idx)] });
    } catch (err) {
      logger.warn({ err }, "Karaoke embed edit failed");
    }

    const last = session.lines[session.lines.length - 1];
    if (last && elapsed > last.time + 8) {
      stopKaraokeSession(session.guildId);
      session.embedMessage.edit({
        content: "",
        embeds: [new EmbedBuilder().setColor(0x57f287).setTitle("🎤 Karaoke finished!").setDescription(`**${session.songTitle}** by ${session.artistName}\n\nGreat singing! 🌟`).setFooter({ text: "Use !karaoke <song> to sing another one!" })],
      }).catch(() => null);
    }
  }, 1500);
}

// ── Reaction-based fallback (no audio) ───────────────────────────────────────

function startReactionSync(waitMsg: Message, lrcData: { lines: LrcLine[]; title: string; artist: string; duration: number }, guildId: string): void {
  const collector = waitMsg.createReactionCollector({
    filter: (r: MessageReaction, u: User) => ["▶️", "⏹"].includes(r.emoji.name ?? "") && !u.bot,
    time: 5 * 60 * 1000,
    max: 1,
  });

  collector.on("collect", async (reaction: MessageReaction) => {
    if (reaction.emoji.name === "⏹") {
      await waitMsg.edit({ embeds: [new EmbedBuilder().setColor(0x99aab5).setTitle("🎤 Cancelled").setDescription("Karaoke session cancelled.")] });
      return;
    }
    const session: KaraokeSession = {
      guildId, lines: lrcData.lines, embedMessage: waitMsg,
      startTime: Date.now(), intervalId: null, stopped: false,
      songTitle: lrcData.title, artistName: lrcData.artist, lastEditedIdx: -1,
    };
    karaokeSessions.set(guildId, session);
    await waitMsg.edit({ content: "", embeds: [buildLyricsEmbed(session, 0)] }).catch(() => null);
    startLyricsLoop(session);
  });

  collector.on("end", (_c, reason) => {
    if (reason === "time" && !karaokeSessions.has(guildId)) {
      waitMsg.edit({ embeds: [new EmbedBuilder().setColor(0x99aab5).setTitle("🎤 Session expired").setDescription("No reaction received within 5 minutes.\nUse `!karaoke <song>` to try again.")] }).catch(() => null);
    }
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export function stopKaraokeSession(guildId: string): boolean {
  const s = karaokeSessions.get(guildId);
  if (!s) return false;
  s.stopped = true;
  if (s.intervalId) clearInterval(s.intervalId);
  karaokeSessions.delete(guildId);
  return true;
}

export function isKaraokeActive(guildId: string): boolean {
  return karaokeSessions.has(guildId);
}

export async function stopKaraoke(message: Message): Promise<void> {
  if (!message.guildId) return;
  const stopped = stopKaraokeSession(message.guildId);
  const radioState = radioStates.get(message.guildId);
  if (radioState) { radioState.player.stop(); radioStates.delete(message.guildId); }
  getVoiceConnection(message.guildId)?.destroy();

  await message.reply({
    embeds: [new EmbedBuilder()
      .setColor(stopped ? 0x9b59b6 : 0xed4245)
      .setTitle(stopped ? "🎤 Karaoke stopped" : "🤷 Nothing running")
      .setDescription(stopped ? "Thanks for singing! 🎶" : "No karaoke session is currently active.")
      .setFooter({ text: "Use !karaoke <song> to start a new session" })],
  });
}

export async function startKaraoke(message: Message, query: string): Promise<void> {
  if (!message.guildId) return;
  const guildId = message.guildId;

  if (!query.trim()) {
    await message.reply("❓ Usage: `!karaoke <artist song name>`\nExamples: `!karaoke Indila SOS` · `!karaoke Guims NINAO`");
    return;
  }

  stopKaraokeSession(guildId);

  const waitMsg = await message.reply({ embeds: [buildWaitEmbed(`🔍 Recherche de **${query}**…`)] });

  // 1 — Fetch multiple results and let user pick
  const candidates = await searchLrcLibMultiple(query);

  if (candidates.length === 0) {
    await waitMsg.edit({
      embeds: [new EmbedBuilder()
        .setColor(0xed4245).setTitle("🎤 Aucune parole trouvée")
        .setDescription(
          `❌ Aucune parole synchronisée trouvée pour **${query}**.\n\n` +
          "**Astuces :**\n• Utilise `!karaoke <Artiste> <Titre>` — ex: `!karaoke Orelsan Basique`\n" +
          "• Essaie le titre original\n• Les chansons populaires fonctionnent mieux",
        )],
    });
    return;
  }

  // If only one result, skip the picker
  let chosenCandidate = candidates[0]!;

  if (candidates.length > 1) {
    // Build a numbered song list embed
    const listLines = candidates
      .map((r, i) => `**${i + 1}.** ${r.trackName} — *${r.artistName}*`)
      .join("\n");

    await waitMsg.edit({
      embeds: [new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle("🎤 Quelle chanson ?")
        .setDescription(`${listLines}\n\n**Réponds avec un numéro (1–${candidates.length}) ou \`annuler\`**`)
        .setFooter({ text: "Tu as 30 secondes pour choisir" })],
    });

    // Wait for user reply
    const collected = await message.channel.awaitMessages({
      filter: (m) => m.author.id === message.author.id,
      max: 1,
      time: 30_000,
      errors: [],
    });

    const reply = collected.first();
    if (!reply) {
      await waitMsg.edit({ embeds: [new EmbedBuilder().setColor(0x99aab5).setTitle("🎤 Annulé").setDescription("Aucune réponse reçue. Utilise `!karaoke <artiste titre>` pour réessayer.")] });
      return;
    }

    reply.delete().catch(() => null);

    const text = reply.content.trim().toLowerCase();
    if (text === "annuler" || text === "cancel") {
      await waitMsg.edit({ embeds: [new EmbedBuilder().setColor(0x99aab5).setTitle("🎤 Annulé").setDescription("Karaoke annulé.")] });
      return;
    }

    const choice = parseInt(text, 10);
    if (isNaN(choice) || choice < 1 || choice > candidates.length) {
      await waitMsg.edit({ embeds: [new EmbedBuilder().setColor(0xed4245).setTitle("🎤 Choix invalide").setDescription(`Réponds avec un numéro entre 1 et ${candidates.length}, ou \`annuler\`.`)] });
      return;
    }

    chosenCandidate = candidates[choice - 1]!;
  }

  await waitMsg.edit({ embeds: [buildWaitEmbed(`✅ **${chosenCandidate.trackName}** — *${chosenCandidate.artistName}*\n🎵 Recherche audio sur SoundCloud…`, "Recherche de la meilleure source audio…")] });

  // Parse lyrics from chosen candidate
  const lrcData = {
    lines: parseLrc(chosenCandidate.syncedLyrics!),
    title: chosenCandidate.trackName,
    artist: chosenCandidate.artistName,
    duration: chosenCandidate.duration ?? 0,
  };

  if (lrcData.lines.length === 0) {
    await waitMsg.edit({
      embeds: [new EmbedBuilder()
        .setColor(0xed4245).setTitle("🎤 Paroles introuvables")
        .setDescription(`❌ Les paroles de **${lrcData.title}** semblent vides. Essaie une autre chanson.`)],
    });
    return;
  }

  // 2 — Join voice
  const ready = await ensureVoiceConnection(message);
  if (!ready) {
    await waitMsg.edit("❌ You need to be in a voice channel first!");
    return;
  }

  const radioState = radioStates.get(guildId);
  if (!radioState) { await waitMsg.edit("❌ Voice connection lost. Try again."); return; }

  // 3 — SoundCloud search (try a few queries)
  const scQueries = [
    `${lrcData.artist} ${lrcData.title}`,
    `${lrcData.artist} ${lrcData.title} official`,
    query,
  ];

  let scTrack: ScTrack | null = null;
  for (const q of scQueries) {
    scTrack = await searchSoundCloud(q);
    if (scTrack) break;
  }

  // 4 — If SoundCloud failed, fall back to reaction sync
  if (!scTrack) {
    logger.warn({ query }, "SoundCloud not found — falling back to reaction sync");
    radioState.player.stop();
    radioStates.delete(guildId);
    getVoiceConnection(guildId)?.destroy();

    await waitMsg.edit({ embeds: [buildReadyEmbed(lrcData.title, lrcData.artist, lrcData.lines.length, lrcData.duration)] });
    await waitMsg.react("▶️").catch(() => null);
    await waitMsg.react("⏹").catch(() => null);
    startReactionSync(waitMsg, lrcData, guildId);
    return;
  }

  // 5 — Stream audio from SoundCloud
  try {
    const httpStream = await fetchHttpStream(scTrack.streamUrl);
    const resource = createAudioResource(httpStream, { inputType: StreamType.Arbitrary });

    radioState.stationKey = null;
    radioState.youtubeTitle = `🎤 ${lrcData.title}`;
    radioState.youtubeUrl = scTrack.url;
    radioState.queue = [];
    radioState.player.play(resource);

    radioState.player.once(AudioPlayerStatus.Playing, async () => {
      const session: KaraokeSession = {
        guildId, lines: lrcData.lines, embedMessage: waitMsg,
        startTime: Date.now(), intervalId: null, stopped: false,
        songTitle: lrcData.title, artistName: lrcData.artist, lastEditedIdx: -1,
      };
      karaokeSessions.set(guildId, session);

      const dur = Math.floor(scTrack!.durationMs / 1000);
      const embed = buildLyricsEmbed(session, 0)
        .addFields(
          { name: "🎵 Source", value: "SoundCloud", inline: true },
          { name: "⏱ Duration", value: `${Math.floor(dur / 60)}:${(dur % 60).toString().padStart(2, "0")}`, inline: true },
        );
      if (scTrack!.thumbnail) embed.setThumbnail(scTrack!.thumbnail);
      await waitMsg.edit({ content: "", embeds: [embed] }).catch(() => null);
      startLyricsLoop(session);
    });

    radioState.player.once("error", async (err) => {
      logger.error({ err }, "Karaoke SoundCloud playback error");
      stopKaraokeSession(guildId);
      radioStates.delete(guildId);
      getVoiceConnection(guildId)?.destroy();
      await waitMsg.edit({ embeds: [new EmbedBuilder().setColor(0xed4245).setTitle("🎤 Playback error").setDescription("❌ Audio playback failed. Please try again.")] });
    });

    radioState.player.once(AudioPlayerStatus.Idle, () => {
      const s = karaokeSessions.get(guildId);
      if (!s || s.stopped) return;
      stopKaraokeSession(guildId);
      waitMsg.edit({ content: "", embeds: [new EmbedBuilder().setColor(0x57f287).setTitle("🎤 Karaoke finished!").setDescription(`**${lrcData.title}** by ${lrcData.artist}\n\nGreat singing! 🌟`).setFooter({ text: "Use !karaoke <song> to start another!" })] }).catch(() => null);
    });

  } catch (err) {
    logger.error({ err }, "Karaoke stream start error");
    stopKaraokeSession(guildId);
    radioStates.delete(guildId);
    getVoiceConnection(guildId)?.destroy();
    // Fallback to reaction mode
    await waitMsg.edit({ embeds: [buildReadyEmbed(lrcData.title, lrcData.artist, lrcData.lines.length, lrcData.duration)] });
    await waitMsg.react("▶️").catch(() => null);
    await waitMsg.react("⏹").catch(() => null);
    startReactionSync(waitMsg, lrcData, guildId);
  }
}
