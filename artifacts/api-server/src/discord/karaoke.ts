import { Message, EmbedBuilder, type MessageReaction, type User } from "discord.js";
import {
  AudioPlayerStatus,
  StreamType,
  getVoiceConnection,
  createAudioResource,
} from "@discordjs/voice";
import { ensureVoiceConnection, radioStates } from "./radio";
import { isInVoice, resubscribeVoicePlayer } from "./voice";
import { logger } from "../lib/logger";

// ── Finish messages ───────────────────────────────────────────────────────────

const FINISH_MESSAGES = [
  "Absolutely nailed it! 🎯",
  "That was incredible! 🔥",
  "You're a superstar! ⭐",
  "Flawless performance! 💫",
  "The crowd goes wild! 🙌",
  "Pure talent right there! 🎶",
  "Outstanding vocals! 🎤",
  "You killed it! 🏆",
  "Broadway is calling! 🎭",
  "Legendary session! 🌟",
];

let _finishMsgIdx = Math.floor(Math.random() * FINISH_MESSAGES.length);

function nextFinishMessage(): string {
  const msg = FINISH_MESSAGES[_finishMsgIdx % FINISH_MESSAGES.length]!;
  _finishMsgIdx = (_finishMsgIdx + 1) % FINISH_MESSAGES.length;
  return msg;
}

// ── Auto-pick logic ───────────────────────────────────────────────────────────

/**
 * When the query has 2+ words (artist + title), try to auto-pick the best
 * candidate by scoring artist and track matches. Returns the best candidate
 * if the score is high enough, otherwise null (→ show picker).
 */
function tryAutoPick(query: string, candidates: LrclibResult[]): LrclibResult | null {
  const words = query.trim().split(/\s+/);
  if (words.length < 2 || candidates.length <= 1) return null;

  const norm = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const artistGuess = norm(words[0]!);
  const titleGuess  = norm(words.slice(1).join(" "));
  const fullGuess   = norm(query);

  let bestScore = 0;
  let bestCandidate: LrclibResult | null = null;

  for (const c of candidates) {
    const ca = norm(c.artistName);
    const ct = norm(c.trackName);
    let score = 0;

    // Artist match
    if (ca === artistGuess || ca.startsWith(artistGuess) || artistGuess.startsWith(ca)) score += 3;
    else if (ca.includes(artistGuess) || artistGuess.includes(ca)) score += 2;

    // Title match
    if (ct === titleGuess || ct.startsWith(titleGuess) || titleGuess.startsWith(ct)) score += 3;
    else if (ct.includes(titleGuess) || titleGuess.includes(ct)) score += 2;

    // Full query match bonus
    if ((ca + ct).includes(fullGuess) || fullGuess.includes(ca + ct.slice(0, 4))) score += 1;

    if (score > bestScore) { bestScore = score; bestCandidate = c; }
  }

  // Only auto-pick if the match is confident (score ≥ 4 means both artist and title matched)
  return bestScore >= 4 ? bestCandidate : null;
}

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
  plainLyrics?: string | null;
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

// ── Deduplication ─────────────────────────────────────────────────────────────

function normalizeStr(str: string): string {
  return str
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function normalizeForDedup(str: string): string {
  return str
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents (é→e, î→i …)
    .toLowerCase()
    .replace(/ma[i]?tre\s*/g, "")                     // maître/maitre → strip
    .replace(/\s*[\(\[][^)\]]*[\)\]]/g, "")            // remove (feat. ...) [feat. ...]
    .replace(/\s*feat\.?\s+.*/i, "")                   // feat. at end
    .replace(/\s*ft\.?\s+.*/i, "")                     // ft. at end
    .replace(/\s*avec\s+.*/i, "")                      // French "avec" collaborator
    .replace(/\s*[,;&×x]\s*.*/i, "")                   // strip after , ; & ×
    .replace(/[^a-z0-9]/g, "")                         // only alphanumeric
    .trim();
}

/**
 * Dedup key for lrclib results.
 * Strips ALL parentheticals and dash-suffixes from the title so variations like
 *   "Est-ce que tu m'aimes? (Pilule bleue)"
 *   "Est-ce que tu m'aimes ? (Pilule bleue) - Song, GIMS"
 * both collapse to the same key.
 */
function lrclibDedupKey(trackName: string, artistName: string): string {
  const core = trackName
    .replace(/\s*[\(\[][^)\]]*[\)\]]/g, "")  // strip ALL (…) […] groups
    .replace(/\s*-\s+.*$/g, "")              // strip everything after " - "
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  // Normalize artist: first credited artist only, strip "maître"
  const artist = artistName
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ma[i]?tre\s*/g, "")
    .replace(/\s*[,;&×x]\s*.*/i, "")
    .replace(/\s*feat\.?\s+.*/i, "")
    .replace(/[^a-z0-9]/g, "");

  return `${core}::${artist}`;
}

/**
 * Returns a clean display title for the picker.
 * Keeps feat/remix/live tags (useful to distinguish versions) but strips
 * pure album/edition tags like "(Pilule bleue)" or "- Song, GIMS".
 */
const KEEP_TAG = /\b(feat|ft\.?|featuring|avec|remix|live|acoustic|version|cover|radio edit|extended)\b/i;
function cleanDisplayTitle(trackName: string): string {
  return trackName
    .replace(/\s*[\(\[][^)\]]*[\)\]]/g, (m) => KEEP_TAG.test(m) ? m : "")
    .replace(/\s*-\s+(?!\s*(feat|ft\.?|featuring))[^-]*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function deduplicateCandidates(candidates: LrclibResult[]): LrclibResult[] {
  const seen = new Set<string>();
  return candidates.filter(r => {
    const key = lrclibDedupKey(r.trackName, r.artistName);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Returns true when the track name contains a version/remix indicator
 * (parenthetical or dash suffix) that is NOT a feat./collaboration marker.
 * e.g. "Song (Pilule bleue)" → true, "Song (feat. X)" → false, "Song" → false
 */
function isVersionedTrack(trackName: string): boolean {
  // Strip feat/ft/avec/with/prod parentheticals — those are collaborations, not versions
  const stripped = trackName
    .replace(/\s*[\(\[][^)\]]*(feat|ft\.?|avec|with|prod)[^)\]]*[\)\]]/gi, "")
    .trim();
  return /[\(\[]/.test(stripped) || /\s+-\s+/.test(stripped);
}

/** Sort candidates: clean originals first, versioned (remix/live/…) last */
function sortCandidatesByOriginality(candidates: LrclibResult[]): LrclibResult[] {
  return [...candidates].sort((a, b) => {
    const aV = isVersionedTrack(a.trackName) ? 1 : 0;
    const bV = isVersionedTrack(b.trackName) ? 1 : 0;
    return aV - bV;
  });
}

/**
 * Remove remix/karaoke/instrumental/cover/nightcore variants when at least one
 * clean original exists. If ALL candidates are versioned, return them as-is.
 */
const HARD_REMIX_PATTERN = /\b(remix|karaoke\s*version|karaoke\s*track|instrumental|nightcore|slowed|reverb|mashup|sped[\s-]up|lofi|lo[\s-]fi|8d\s*audio|bass[\s-]boosted|extended\s*mix|club\s*mix|vip\s*mix|cover)\b/i;

function filterRemixCandidates(candidates: LrclibResult[]): LrclibResult[] {
  const originals = candidates.filter(c => !HARD_REMIX_PATTERN.test(c.trackName));
  return originals.length > 0 ? originals : candidates;
}

/** Return only the primary (first-credited) artist, normalised. */
function primaryArtistNorm(artistName: string): string {
  return artistName
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ma[i]?tre\s*/g, "")      // strip "maître "
    .replace(/\s*[,;&×x+]\s*.*/i, "")  // first artist before comma/&/×
    .replace(/\s*feat\.?\s+.*/i, "")   // first artist before feat.
    .replace(/[^a-z0-9]/g, "");
}

/**
 * When the query matches an artist name, sort so songs where the query term
 * appears in the PRIMARY artist slot come before songs where it only appears
 * as a featured guest (e.g. "Arhbo" by Ozuna feat. GIMS moves to the end).
 */
function sortByPrimaryArtistRelevance(candidates: LrclibResult[], query: string): LrclibResult[] {
  const qNorm = query
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ma[i]?tre\s*/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();

  if (qNorm.length < 2) return candidates;

  return [...candidates].sort((a, b) => {
    const aPrimary = primaryArtistNorm(a.artistName).includes(qNorm.replace(/\s+/g, "")) ? 0 : 1;
    const bPrimary = primaryArtistNorm(b.artistName).includes(qNorm.replace(/\s+/g, "")) ? 0 : 1;
    if (aPrimary !== bPrimary) return aPrimary - bPrimary;
    // Secondary: non-versioned before versioned
    return (isVersionedTrack(a.trackName) ? 1 : 0) - (isVersionedTrack(b.trackName) ? 1 : 0);
  });
}

async function searchLrcLibMultiple(query: string, limit = 20): Promise<LrclibResult[]> {
  // Fire both strategies in parallel to reduce latency
  const words = query.trim().split(/\s+/);
  const [byQ, byArtist] = await Promise.allSettled([
    lrclibFetch({ q: query }),
    words.length > 1
      ? lrclibFetch({ artist_name: words[0]!, track_name: words.slice(1).join(" ") })
      : Promise.resolve([] as LrclibResult[]),
  ]);

  const combined: LrclibResult[] = [
    ...(byQ.status === "fulfilled" ? byQ.value : []),
    ...(byArtist.status === "fulfilled" ? byArtist.value : []),
  ];

  // First pass: exact-key dedup
  const seen = new Set<string>();
  const out: LrclibResult[] = [];
  for (const r of combined) {
    if (!r.syncedLyrics || r.syncedLyrics.trim().length === 0) continue;
    const key = `${r.artistName.toLowerCase()}::${r.trackName.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}

// ── Genius search (additional song candidates) ────────────────────────────────

interface GeniusHit {
  trackName: string;
  artistName: string;
}

async function searchITunes(query: string): Promise<GeniusHit[]> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=10`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return [];
    const data = await resp.json() as { results?: Array<{ trackName?: string; artistName?: string }> };
    return (data.results ?? [])
      .map(r => ({ trackName: r.trackName ?? "", artistName: r.artistName ?? "" }))
      .filter(r => r.trackName && r.artistName);
  } catch (err) {
    logger.warn({ err }, "iTunes search failed");
    return [];
  }
}

async function searchDeezer(query: string): Promise<GeniusHit[]> {
  try {
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=10`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return [];
    const data = await resp.json() as { data?: Array<{ title?: string; artist?: { name?: string } }> };
    return (data.data ?? [])
      .map(r => ({ trackName: r.title ?? "", artistName: r.artist?.name ?? "" }))
      .filter(r => r.trackName && r.artistName);
  } catch (err) {
    logger.warn({ err }, "Deezer search failed");
    return [];
  }
}

/** Search iTunes + Deezer in parallel for song suggestions (replaces Genius which is geo-blocked) */
async function searchSongSuggestions(query: string): Promise<GeniusHit[]> {
  const [itunesRes, deezerRes] = await Promise.allSettled([
    searchITunes(query),
    searchDeezer(query),
  ]);

  const seen = new Set<string>();
  const out: GeniusHit[] = [];

  for (const r of [itunesRes, deezerRes]) {
    if (r.status !== "fulfilled") continue;
    for (const hit of r.value) {
      const key = normalizeSuggestionKey(hit.trackName, hit.artistName);
      if (!seen.has(key)) { seen.add(key); out.push(hit); }
    }
  }

  return out.slice(0, 10);
}

/** Normalize a track+artist pair to a dedup key — collapses subtitle/punctuation/artist-name variants */
function normalizeSuggestionKey(trackName: string, artistName: string): string {
  const track = trackName
    .replace(/\s*[\(\[][^)\]]*[\)\]]/g, "")   // strip (subtitle) [subtitle]
    .replace(/\s*-\s+.+$/, "")                // strip "- subtitle" at end
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")   // strip accents
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 30);                             // first 30 chars enough for a unique key

  const artist = artistName
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/ma[îi]?tre\s*/g, "")            // "maître " / "maitre " → strip
    .replace(/\s*[,;&×x+]\s*.*/i, "")         // first credited artist only
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);

  return `${track}::${artist}`;
}

interface CandidateSearchResult {
  synced: LrclibResult[];
  geniusHits: GeniusHit[];
}

/** Search lrclib enhanced with Genius suggestions for broader coverage */
async function searchCandidates(query: string): Promise<CandidateSearchResult> {
  const MAX_TOTAL = 20;

  const [lrclibBase, geniusResult] = await Promise.allSettled([
    searchLrcLibMultiple(query, MAX_TOTAL),
    searchSongSuggestions(query),
  ]);

  const base: LrclibResult[] = lrclibBase.status === "fulfilled" ? lrclibBase.value : [];
  const rawGenius: GeniusHit[] = geniusResult.status === "fulfilled" ? geniusResult.value : [];
  const existingKeys = new Set(base.map(r => `${r.artistName.toLowerCase()}::${r.trackName.toLowerCase()}`));

  const novel = rawGenius
    .filter(g => !existingKeys.has(`${g.artistName.toLowerCase()}::${g.trackName.toLowerCase()}`))
    .slice(0, 8);

  if (novel.length > 0) {
    const extras = await Promise.allSettled(
      novel.map(g => lrclibFetch({ artist_name: g.artistName, track_name: g.trackName })),
    );
    for (const r of extras) {
      if (r.status !== "fulfilled") continue;
      for (const item of r.value) {
        if (!item.syncedLyrics || item.syncedLyrics.trim().length === 0) continue;
        const key = `${item.artistName.toLowerCase()}::${item.trackName.toLowerCase()}`;
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        base.push(item);
        if (base.length >= MAX_TOTAL) break;
      }
      if (base.length >= MAX_TOTAL) break;
    }
  }

  return { synced: base, geniusHits: rawGenius };
}

// ── Plain lyrics fallback (lrclib plain + lyrics.ovh) ────────────────────────

interface PlainLyricsResult {
  title: string;
  artist: string;
  lines: string[];
  source: string;
}

/** Search lrclib.net for plain (unsynced) lyrics when no synced version exists */
async function fetchPlainLyricsFromLrclib(query: string): Promise<PlainLyricsResult | null> {
  const words = query.trim().split(/\s+/);
  const strategies: Record<string, string>[] = [
    { q: query },
    ...(words.length > 1 ? [{ artist_name: words[0]!, track_name: words.slice(1).join(" ") }] : []),
  ];
  for (const params of strategies) {
    try {
      const results = await lrclibFetch(params);
      // Accept a result with plain lyrics even without synced
      const hit = results.find(r => r.plainLyrics && r.plainLyrics.trim().length > 0);
      if (!hit?.plainLyrics) continue;
      const lines = hit.plainLyrics
        .split("\n")
        .map(l => l.trim())
        .filter(l => l.length > 0);
      if (lines.length === 0) continue;
      return { title: hit.trackName, artist: hit.artistName, lines, source: "lrclib.net" };
    } catch (err) {
      logger.warn({ err, params }, "lrclib plain lyrics fetch failed");
    }
  }
  return null;
}

/** Fetch lyrics from lyrics.ovh (free, no API key needed) */
async function fetchLyricsOvh(artist: string, title: string): Promise<PlainLyricsResult | null> {
  try {
    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "DiscordBot/1.0" } });
    if (!resp.ok) return null;
    const data = await resp.json() as { lyrics?: string; error?: string };
    if (data.error || !data.lyrics) return null;
    const lines = data.lyrics
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 0);
    if (lines.length === 0) return null;
    return { title, artist, lines, source: "lyrics.ovh" };
  } catch (err) {
    logger.warn({ err }, "lyrics.ovh fetch failed");
    return null;
  }
}

/** Try all plain-lyrics sources in order, return first hit */
async function fetchPlainLyrics(query: string, artist?: string, title?: string): Promise<PlainLyricsResult | null> {
  // 1 — lrclib plain lyrics (parallel with lyrics.ovh if we have artist+title)
  const tasks: Promise<PlainLyricsResult | null>[] = [fetchPlainLyricsFromLrclib(query)];
  if (artist && title) tasks.push(fetchLyricsOvh(artist, title));

  const results = await Promise.allSettled(tasks);
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) return r.value;
  }

  // 2 — If artist+title were already tried above, skip; otherwise try lyrics.ovh with parsed query
  if (!artist || !title) {
    const words = query.trim().split(/\s+/);
    if (words.length >= 2) {
      const fallback = await fetchLyricsOvh(words[0]!, words.slice(1).join(" ")).catch(() => null);
      if (fallback) return fallback;
    }
  }
  return null;
}

/** Show paginated plain lyrics (no timing) with ◀️▶️ reactions */
async function runStaticLyricsMode(
  message: Message,
  displayMsg: Message,
  plain: PlainLyricsResult,
): Promise<void> {
  const LINES_PER_PAGE = 8;
  const pages: string[][] = [];
  for (let i = 0; i < plain.lines.length; i += LINES_PER_PAGE) {
    pages.push(plain.lines.slice(i, i + LINES_PER_PAGE));
  }
  if (pages.length === 0) return;

  let page = 0;

  const buildEmbed = (p: number) => new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle(`🎤 ${plain.title}`)
    .setAuthor({ name: `🎵 ${plain.artist}` })
    .setDescription(pages[p]!.join("\n"))
    .setFooter({ text: `Page ${p + 1}/${pages.length} · ◀️ ▶️ to navigate · ⏹ to stop · Source: ${plain.source}` });

  await displayMsg.edit({ content: "", embeds: [buildEmbed(page)] });

  // Add all navigation reactions upfront once — no removeAll/re-add on navigation
  if (pages.length > 1) await displayMsg.react("◀️").catch(() => null);
  if (pages.length > 1) await displayMsg.react("▶️").catch(() => null);
  await displayMsg.react("⏹").catch(() => null);

  const collector = displayMsg.createReactionCollector({
    filter: (r: MessageReaction, u: User) =>
      ["◀️", "▶️", "⏹"].includes(r.emoji.name ?? "") && !u.bot,
    time: 30 * 60 * 1000,
  });

  collector.on("collect", async (reaction: MessageReaction, user: User) => {
    const emoji = reaction.emoji.name;

    // Remove only the user's reaction — keep all others (no removeAll)
    await (reaction.users as unknown as { remove: (id: string) => Promise<void> })
      .remove(user.id)
      .catch(() => null);

    if (emoji === "⏹") {
      collector.stop("stopped");
      await displayMsg.edit({
        embeds: [new EmbedBuilder().setColor(0x99aab5).setTitle("🎤 Stopped").setDescription(`Lyrics for **${plain.title}** closed.`)],
      }).catch(() => null);
      return;
    }
    if (emoji === "▶️" && page < pages.length - 1) page++;
    if (emoji === "◀️" && page > 0) page--;

    await displayMsg.edit({ embeds: [buildEmbed(page)] }).catch(() => null);
  });

  collector.on("end", (_c, reason) => {
    if (reason !== "stopped") {
      displayMsg.edit({
        embeds: [new EmbedBuilder().setColor(0x99aab5).setTitle("🎤 Session expired").setDescription("Use `!karaoke <song>` to try again.")],
      }).catch(() => null);
    }
  });
}

// ── YouTube audio search & stream (via play-dl) ───────────────────────────────

// play-dl is imported dynamically to avoid top-level ESM issues with esbuild
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _play: any = null;
async function getPlay() {
  if (!_play) _play = (await import("play-dl")).default ?? (await import("play-dl"));
  return _play;
}

interface YtTrack {
  url: string;
  title: string;
  durationMs: number;
  thumbnail: string;
}

const UNWANTED_VIDEO_PATTERN = /\b(remix|cover|karaoke|instrumental|slowed|reverb|mashup|nightcore|sped[\s-]up|pitch[\s-]up|lofi|lo[\s-]fi|8d audio|bass[\s-]boosted)\b/i;

function scoreYouTubeResult(video: { title?: string; channel?: { name?: string } }, lrcTitle: string): number {
  const vTitle = (video.title ?? "").toLowerCase();
  const lrcTitleLower = lrcTitle.toLowerCase();
  let score = 0;
  if (UNWANTED_VIDEO_PATTERN.test(vTitle) && !UNWANTED_VIDEO_PATTERN.test(lrcTitleLower)) score -= 10;
  if (/\b(official\s*(audio|video|music\s*video|lyric\s*video))\b/i.test(vTitle)) score += 5;
  if (/\bvevo\b/i.test(video.channel?.name ?? "")) score += 3;
  if (/\bofficial\b/i.test(video.channel?.name ?? "")) score += 2;
  return score;
}

async function searchYouTube(query: string, minDurationSec = 60, lrcTitle = ""): Promise<YtTrack | null> {
  try {
    const play = await getPlay();
    const results = await play.search(query, { source: { youtube: "video" }, limit: 8 });
    if (!results?.length) return null;
    const filtered = results.filter((v: any) => !v.durationInSec || v.durationInSec >= minDurationSec);
    const candidates = (filtered.length > 0 ? filtered : results) as any[];
    candidates.sort((a: any, b: any) => scoreYouTubeResult(b, lrcTitle) - scoreYouTubeResult(a, lrcTitle));
    const video = candidates[0];
    if (!video?.url) return null;
    return {
      url: video.url as string,
      title: (video.title as string) ?? query,
      durationMs: ((video.durationInSec as number) ?? 0) * 1000,
      thumbnail: (video.thumbnails?.[0]?.url as string) ?? "",
    };
  } catch (err) {
    logger.warn({ err }, "YouTube search error");
    return null;
  }
}

async function streamYouTube(url: string): Promise<{ stream: NodeJS.ReadableStream; type: StreamType } | null> {
  try {
    const play = await getPlay();
    const result = await play.stream(url, { quality: 2 });
    if (!result?.stream) return null;
    // play-dl returns "opus", "webm/opus", "ogg/opus", or "arbitrary"
    const typeStr: string = result.type ?? "";
    let djsType = StreamType.Arbitrary;
    if (typeStr === "webm/opus") djsType = StreamType.WebmOpus;
    else if (typeStr === "ogg/opus") djsType = StreamType.OggOpus;
    else if (typeStr === "opus") djsType = StreamType.Opus;
    return { stream: result.stream as NodeJS.ReadableStream, type: djsType };
  } catch (err) {
    logger.warn({ err }, "YouTube stream error");
    return null;
  }
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

// ── Karaoke queue ─────────────────────────────────────────────────────────────

interface KaraokeQueueEntry {
  query: string;
  message: Message;
}

const karaokeQueues = new Map<string, KaraokeQueueEntry[]>();

// ── Per-guild karaoke audio source preference ──────────────────────────────

type KaraokeAudioSource = "youtube" | "soundcloud";
const karaokeSourceStore = new Map<string, KaraokeAudioSource>();

export function getGuildKaraokeSource(guildId: string): KaraokeAudioSource {
  return karaokeSourceStore.get(guildId) ?? "youtube";
}

export function setGuildKaraokeSource(guildId: string, source: KaraokeAudioSource): void {
  karaokeSourceStore.set(guildId, source);
}

/** Safely tear down radio audio without killing a voice (!join) session. */
function cleanupKaraokeAudio(guildId: string): void {
  const state = radioStates.get(guildId);
  if (state) {
    state.player.stop();
    radioStates.delete(guildId);
  }
  if (!isInVoice(guildId)) {
    getVoiceConnection(guildId)?.destroy();
  } else {
    // Voice session still active — re-subscribe its player so TTS/subtitles keep working
    resubscribeVoicePlayer(guildId);
  }
}

/** Auto-launch the next queued song when the current session ends. */
async function processKaraokeQueue(guildId: string): Promise<void> {
  const queue = karaokeQueues.get(guildId);
  if (!queue || queue.length === 0) return;

  const next = queue.shift()!;
  if (queue.length === 0) karaokeQueues.delete(guildId);

  await startKaraokeFromQueue(next.message, next.query, guildId);
}

async function startKaraokeFromQueue(message: Message, query: string, guildId: string): Promise<void> {
  const notifyMsg = await message.channel.send({ embeds: [buildWaitEmbed(`🎵 Up next — searching **${query}**…`)] }) as Message;

  const { synced: rawSynced } = await searchCandidates(query);
  const candidates = sortByPrimaryArtistRelevance(sortCandidatesByOriginality(filterRemixCandidates(deduplicateCandidates(rawSynced))), query);

  if (candidates.length === 0) {
    const remaining = karaokeQueues.get(guildId)?.length ?? 0;
    await notifyMsg.edit({
      embeds: [new EmbedBuilder().setColor(0xed4245).setTitle("🎤 Skipped")
        .setDescription(`❌ No synced lyrics found for **${query}**.${remaining > 0 ? " Loading next song…" : ""}`)],
    });
    await processKaraokeQueue(guildId);
    return;
  }

  const chosen = tryAutoPick(query, candidates) ?? candidates[0]!;
  const lrcData = {
    lines: parseLrc(chosen.syncedLyrics!),
    title: chosen.trackName,
    artist: chosen.artistName,
    duration: chosen.duration ?? 0,
  };

  await launchKaraoke(message, notifyMsg, lrcData, guildId, query);
}

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
      const hasQueue = (karaokeQueues.get(session.guildId)?.length ?? 0) > 0;
      session.embedMessage.edit({
        content: "",
        embeds: [new EmbedBuilder().setColor(0x57f287).setTitle("🎤 Karaoke finished!").setDescription(`**${session.songTitle}** by ${session.artistName}\n\n${nextFinishMessage()}`).setFooter({ text: hasQueue ? "🎵 Loading next song in queue…" : "Use !karaoke <song> to sing another one!" })],
      }).catch(() => null);
      void processKaraokeQueue(session.guildId);
    }
  }, 1500);
}

// ── Reaction-based fallback (no audio) ───────────────────────────────────────

function startReactionSync(waitMsg: Message, lrcData: { lines: LrcLine[]; title: string; artist: string; duration: number }, guildId: string): void {
  // Auto-start immediately — no need to wait for ▶️
  const session: KaraokeSession = {
    guildId, lines: lrcData.lines, embedMessage: waitMsg,
    startTime: Date.now(), intervalId: null, stopped: false,
    songTitle: lrcData.title, artistName: lrcData.artist, lastEditedIdx: -1,
  };
  karaokeSessions.set(guildId, session);
  waitMsg.edit({ content: "", embeds: [buildLyricsEmbed(session, 0)] }).catch(() => null);
  startLyricsLoop(session);

  const stopCollector = waitMsg.createReactionCollector({
    filter: (r: MessageReaction, u: User) => r.emoji.name === "⏹" && !u.bot,
    time: 90 * 60 * 1000,
    max: 1,
  });
  stopCollector.on("collect", () => {
    const s = karaokeSessions.get(guildId);
    if (!s || s.stopped) return;
    stopKaraokeSession(guildId);
    karaokeQueues.delete(guildId);
    waitMsg.edit({ content: "", embeds: [new EmbedBuilder().setColor(0x9b59b6).setTitle("🎤 Karaoke stopped").setDescription(`**${lrcData.title}** by ${lrcData.artist}\n\nThanks for singing! 🎶`).setFooter({ text: "Use !karaoke <song> to start a new session" })] }).catch(() => null);
  });
}

// ── Attach lyrics to currently-playing YouTube audio ─────────────────────────

/**
 * Start a karaoke lyrics overlay on the audio ALREADY playing in the voice channel.
 * Does NOT stop/restart the player — just syncs the lyrics from the given start time.
 */
async function attachLyricsToCurrentAudio(
  message: Message,
  waitMsg: Message,
  lrcData: { lines: LrcLine[]; title: string; artist: string; duration: number },
  guildId: string,
  audioStartTime: number,
): Promise<void> {
  if (lrcData.lines.length === 0) {
    await waitMsg.edit({
      embeds: [new EmbedBuilder().setColor(0xed4245).setTitle("🎤 Empty lyrics")
        .setDescription(`❌ The lyrics for **${lrcData.title}** appear empty. Try another song.`)],
    });
    return;
  }

  // Stop any existing karaoke session (without touching the audio player)
  stopKaraokeSession(guildId);

  const session: KaraokeSession = {
    guildId,
    lines: lrcData.lines,
    embedMessage: waitMsg,
    startTime: audioStartTime,
    intervalId: null,
    stopped: false,
    songTitle: lrcData.title,
    artistName: lrcData.artist,
    lastEditedIdx: -1,
  };
  karaokeSessions.set(guildId, session);

  const elapsed = (Date.now() - audioStartTime) / 1000;
  const currentIdx = getCurrentLineIndex(lrcData.lines, elapsed);

  const embed = buildLyricsEmbed(session, currentIdx).addFields(
    { name: "🎵 Source", value: "Current playback (synced ✨)", inline: true },
  );
  await waitMsg.edit({ content: "", embeds: [embed] }).catch(() => null);
  await waitMsg.react("⏹").catch(() => null);

  const stopCollector = waitMsg.createReactionCollector({
    filter: (r: MessageReaction, u: User) => r.emoji.name === "⏹" && !u.bot,
    time: 90 * 60 * 1000,
    max: 1,
  });
  stopCollector.on("collect", () => {
    const s = karaokeSessions.get(guildId);
    if (!s || s.stopped) return;
    stopKaraokeSession(guildId);
    karaokeQueues.delete(guildId);
    waitMsg.edit({
      content: "",
      embeds: [new EmbedBuilder().setColor(0x9b59b6).setTitle("🎤 Karaoke stopped")
        .setDescription(`**${lrcData.title}** by ${lrcData.artist}\n\nThanks for singing! 🎶`)
        .setFooter({ text: "Use !karaoke <song> to start a new session" })],
    }).catch(() => null);
  });

  startLyricsLoop(session);
}

// ── Reaction-based paginated song picker ─────────────────────────────────────

const MAX_SINGLE_PAGE = 6;
const PAGE_SIZE_MULTI = 4;
const MAX_PAGES = 5;
const EMOJIS_6 = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣"] as const;
const EMOJIS_4 = ["1️⃣", "2️⃣", "3️⃣", "4️⃣"] as const;

async function runKaraokePicker(
  message: Message,
  pickMsg: Message,
  candidates: LrclibResult[],
): Promise<LrclibResult | null> {
  const isSinglePage = candidates.length <= MAX_SINGLE_PAGE;
  const pageSize   = isSinglePage ? MAX_SINGLE_PAGE : PAGE_SIZE_MULTI;
  const maxItems   = isSinglePage ? MAX_SINGLE_PAGE : MAX_PAGES * PAGE_SIZE_MULTI;
  const capped     = candidates.slice(0, maxItems);
  const totalPages = isSinglePage ? 1 : Math.min(MAX_PAGES, Math.ceil(capped.length / PAGE_SIZE_MULTI));
  const numberEmojis: readonly string[] = isSinglePage ? EMOJIS_6 : EMOJIS_4;

  let page = 0;

  const getPageItems = (p: number) => capped.slice(p * pageSize, (p + 1) * pageSize);

  const buildEmbed = (p: number) => {
    const items = getPageItems(p);
    const list  = items.map((r, i) => {
      const display = cleanDisplayTitle(r.trackName);
      const tag = isVersionedTrack(r.trackName) ? " ↪" : "";
      return `${numberEmojis[i]}${tag} **${display}** — *${r.artistName}*`;
    }).join("\n");
    const nav   = totalPages > 1 ? ` · ◀️ ▶️ to navigate` : "";
    return new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle("🎤 Which song?")
      .setDescription(list)
      .setFooter({ text: `Page ${p + 1}/${totalPages}${nav} · ❌ to cancel · 60s timeout` });
  };

  await pickMsg.edit({ embeds: [buildEmbed(page)] });

  // Add all reactions once — no removeAll/re-add on navigation
  const firstPage = getPageItems(0);
  for (let i = 0; i < firstPage.length; i++) {
    await pickMsg.react(numberEmojis[i]!).catch(() => null);
  }
  if (totalPages > 1) {
    await pickMsg.react("◀️").catch(() => null);
    await pickMsg.react("▶️").catch(() => null);
  }
  await pickMsg.react("❌").catch(() => null);

  return new Promise<LrclibResult | null>((resolve) => {
    let resolved = false;

    const collector = pickMsg.createReactionCollector({
      filter: (r, u) => u.id === message.author.id && !u.bot,
      time: 60_000,
    });

    collector.on("collect", async (reaction, user) => {
      // Remove only the user's reaction — keep all others (no removeAll)
      await (reaction.users as unknown as { remove: (id: string) => Promise<void> })
        .remove(user.id)
        .catch(() => null);

      const emoji = reaction.emoji.name ?? "";

      if (emoji === "❌") {
        resolved = true;
        collector.stop("cancelled");
        resolve(null);
        return;
      }

      if (emoji === "▶️" && page < totalPages - 1) {
        page++;
        await pickMsg.edit({ embeds: [buildEmbed(page)] }).catch(() => null);
        return;
      }

      if (emoji === "◀️" && page > 0) {
        page--;
        await pickMsg.edit({ embeds: [buildEmbed(page)] }).catch(() => null);
        return;
      }

      const idx = (numberEmojis as string[]).indexOf(emoji);
      const items = getPageItems(page);
      if (idx !== -1 && idx < items.length) {
        resolved = true;
        collector.stop("selected");
        resolve(items[idx] ?? null);
      }
    });

    collector.on("end", (_c, _reason) => {
      if (!resolved) resolve(null);
      pickMsg.reactions.removeAll().catch(() => null);
    });
  });
}

// ── Genius picker — converts GeniusHit[] to the shared picker UI ─────────────

async function runGeniusPicker(message: Message, pickMsg: Message, hits: GeniusHit[]): Promise<GeniusHit | null> {
  const pseudo: LrclibResult[] = hits.map(h => ({
    trackName: h.trackName,
    artistName: h.artistName,
    syncedLyrics: null,
    plainLyrics: null,
    duration: 0,
  }));
  const picked = await runKaraokePicker(message, pickMsg, pseudo);
  if (!picked) return null;
  return hits.find(h => h.trackName === picked.trackName && h.artistName === picked.artistName) ?? null;
}

// ── Shared karaoke launch (SoundCloud search + audio streaming) ───────────────

async function launchKaraoke(
  message: Message,
  waitMsg: Message,
  lrcData: { lines: LrcLine[]; title: string; artist: string; duration: number },
  guildId: string,
  originalQuery: string,
): Promise<void> {
  if (lrcData.lines.length === 0) {
    await waitMsg.edit({
      embeds: [new EmbedBuilder()
        .setColor(0xed4245).setTitle("🎤 Empty lyrics")
        .setDescription(`❌ The lyrics for **${lrcData.title}** appear empty. Try another song.`)],
    });
    return;
  }

  const audioSource = getGuildKaraokeSource(guildId);
  const sourceLabel = audioSource === "soundcloud" ? "SoundCloud" : "YouTube";
  await waitMsg.edit({ embeds: [buildWaitEmbed(`✅ **${lrcData.title}** — *${lrcData.artist}*\n🎵 Searching audio on ${sourceLabel}…`, "Searching for the best audio source…")] });

  const ready = await ensureVoiceConnection(message);
  if (!ready) { await waitMsg.edit({ content: "❌ You need to be in a voice channel first! Join one and retry `!karaoke`.", components: [] }); return; }

  const radioState = radioStates.get(guildId);
  if (!radioState) { await waitMsg.edit("❌ Voice connection lost. Try again."); return; }

  const ytQueries = [`${lrcData.artist} ${lrcData.title} official audio`, `${lrcData.artist} ${lrcData.title}`, originalQuery];
  let ytTrack: YtTrack | null = null;
  for (const q of ytQueries) { ytTrack = await searchYouTube(q, 60, lrcData.title); if (ytTrack) break; }

  if (!ytTrack) {
    logger.warn({ originalQuery }, "YouTube not found — falling back to reaction sync");
    radioState.player.stop();
    radioStates.delete(guildId);
    if (!isInVoice(guildId)) getVoiceConnection(guildId)?.destroy();
    await waitMsg.edit({ embeds: [buildReadyEmbed(lrcData.title, lrcData.artist, lrcData.lines.length, lrcData.duration)] });
    await waitMsg.react("⏹").catch(() => null);
    startReactionSync(waitMsg, lrcData, guildId);
    return;
  }

  try {
    const ytStream = await streamYouTube(ytTrack.url);
    if (!ytStream) throw new Error("YouTube stream returned null");
    const resource = createAudioResource(ytStream.stream, { inputType: ytStream.type });

    radioState.stationKey = null;
    radioState.youtubeTitle = `🎤 ${lrcData.title}`;
    radioState.youtubeUrl = ytTrack.url;
    radioState.queue = [];
    radioState.player.play(resource);

    radioState.player.once(AudioPlayerStatus.Playing, async () => {
      const session: KaraokeSession = {
        guildId, lines: lrcData.lines, embedMessage: waitMsg,
        startTime: Date.now(), intervalId: null, stopped: false,
        songTitle: lrcData.title, artistName: lrcData.artist, lastEditedIdx: -1,
      };
      karaokeSessions.set(guildId, session);

      const dur = Math.floor(ytTrack!.durationMs / 1000);
      const embed = buildLyricsEmbed(session, 0).addFields(
        { name: "🎵 Source", value: "YouTube", inline: true },
        { name: "⏱ Duration", value: `${Math.floor(dur / 60)}:${(dur % 60).toString().padStart(2, "0")}`, inline: true },
      );
      if (ytTrack!.thumbnail) embed.setThumbnail(ytTrack!.thumbnail);
      await waitMsg.edit({ content: "", embeds: [embed] }).catch(() => null);
      await waitMsg.react("⏹").catch(() => null);

      const stopCollector = waitMsg.createReactionCollector({
        filter: (r: MessageReaction, u: User) => r.emoji.name === "⏹" && !u.bot,
        time: 90 * 60 * 1000, max: 1,
      });
      stopCollector.on("collect", () => {
        const s = karaokeSessions.get(guildId);
        if (!s || s.stopped) return;
        stopKaraokeSession(guildId);
        karaokeQueues.delete(guildId);
        cleanupKaraokeAudio(guildId);
        waitMsg.edit({ content: "", embeds: [new EmbedBuilder().setColor(0x9b59b6).setTitle("🎤 Karaoke stopped").setDescription(`**${lrcData.title}** by ${lrcData.artist}\n\nThanks for singing! 🎶`).setFooter({ text: "Use !karaoke <song> to start a new session" })] }).catch(() => null);
      });
      startLyricsLoop(session);
    });

    radioState.player.once("error", async (err) => {
      logger.error({ err }, "Karaoke SoundCloud playback error");
      stopKaraokeSession(guildId);
      cleanupKaraokeAudio(guildId);
      await waitMsg.edit({ embeds: [new EmbedBuilder().setColor(0xed4245).setTitle("🎤 Playback error").setDescription("❌ Audio playback failed. Trying next in queue…")] });
      await processKaraokeQueue(guildId);
    });

    radioState.player.once(AudioPlayerStatus.Idle, () => {
      const s = karaokeSessions.get(guildId);
      if (!s || s.stopped) return;
      stopKaraokeSession(guildId);
      cleanupKaraokeAudio(guildId);
      const hasQueue = (karaokeQueues.get(guildId)?.length ?? 0) > 0;
      waitMsg.edit({ content: "", embeds: [new EmbedBuilder().setColor(0x57f287).setTitle("🎤 Karaoke finished!").setDescription(`**${lrcData.title}** by ${lrcData.artist}\n\n${nextFinishMessage()}`).setFooter({ text: hasQueue ? "🎵 Loading next song in queue…" : "Use !karaoke <song> to start another!" })] }).catch(() => null);
      void processKaraokeQueue(guildId);
    });

  } catch (err) {
    logger.error({ err }, "Karaoke stream start error");
    stopKaraokeSession(guildId);
    if (!isInVoice(guildId)) getVoiceConnection(guildId)?.destroy();
    await waitMsg.edit({ embeds: [buildReadyEmbed(lrcData.title, lrcData.artist, lrcData.lines.length, lrcData.duration)] });
    await waitMsg.react("⏹").catch(() => null);
    startReactionSync(waitMsg, lrcData, guildId);
  }
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
  const guildId = message.guildId;
  const stopped = stopKaraokeSession(guildId);
  const hadQueue = (karaokeQueues.get(guildId)?.length ?? 0) > 0;
  karaokeQueues.delete(guildId);
  cleanupKaraokeAudio(guildId);

  await message.reply({
    embeds: [new EmbedBuilder()
      .setColor(stopped ? 0x9b59b6 : 0xed4245)
      .setTitle(stopped ? "🎤 Karaoke stopped" : "🤷 Nothing running")
      .setDescription(
        stopped
          ? `Thanks for singing! 🎶${hadQueue ? "\nQueue cleared." : ""}`
          : "No karaoke session is currently active.",
      )
      .setFooter({ text: "Use !karaoke <song> to start a new session" })],
  });
}

export async function startKaraoke(message: Message, query: string): Promise<void> {
  if (!message.guildId) return;
  const guildId = message.guildId;

  // Detect if a YouTube track is currently playing (not itself a karaoke session)
  const radioState = radioStates.get(guildId);
  const ytStartTime = radioState?.youtubeStartTime ?? null;
  const ytTitle = radioState?.youtubeTitle;
  const isYtPlaying = Boolean(ytTitle && ytStartTime && ytTitle !== "Loading…" && !ytTitle.startsWith("🎤"));

  let effectiveQuery = query.trim();
  let attachToCurrentAudio = false;

  if (!effectiveQuery && isYtPlaying) {
    // No query given but YouTube is playing — attach lyrics to current track
    effectiveQuery = ytTitle!;
    attachToCurrentAudio = true;
  }

  if (!effectiveQuery) {
    await message.reply(
      "❓ Usage: `!karaoke <artist song name>`\nExamples: `!karaoke Indila SOS` · `!karaoke Kendji Girac Andalouse`\n" +
      "💡 **Tip:** Type `!karaoke` with no argument while a song is playing to attach live synced lyrics!",
    );
    return;
  }

  // If a session is already active and we're not attaching to current audio, queue it
  if (karaokeSessions.has(guildId) && !attachToCurrentAudio) {
    const existing = karaokeQueues.get(guildId) ?? [];
    existing.push({ query: effectiveQuery, message });
    karaokeQueues.set(guildId, existing);
    const pos = existing.length;
    await message.reply({ embeds: [new EmbedBuilder()
      .setColor(0x9b59b6).setTitle("🎵 Added to queue")
      .setDescription(`**${effectiveQuery}** added at position **#${pos}** in the queue.`)
      .setFooter({ text: "Use !karaoke stop to clear the queue and stop" })] });
    return;
  }

  const waitMsg = await message.reply({ embeds: [buildWaitEmbed(`🔍 Searching **${effectiveQuery}**…`)] });

  // 1 — Fetch candidates from lrclib + Genius, deduplicate and let user pick
  const { synced: rawSynced, geniusHits } = await searchCandidates(effectiveQuery);
  const candidates = sortByPrimaryArtistRelevance(sortCandidatesByOriginality(filterRemixCandidates(deduplicateCandidates(rawSynced))), effectiveQuery);

  if (candidates.length === 0) {
    // No synced lyrics — if Genius found songs, show them as a picker first
    if (geniusHits.length > 0) {
      await waitMsg.edit({ embeds: [buildWaitEmbed(
        `⚠️ No synced lyrics found for **${query}**\n\n🎵 Found ${geniusHits.length} song(s) on Genius — pick one to continue:`,
        "React to choose a song",
      )] });

      const picked = await runGeniusPicker(message, waitMsg, geniusHits);
      if (!picked) {
        await waitMsg.edit({ embeds: [new EmbedBuilder().setColor(0x99aab5).setTitle("🎤 Cancelled").setDescription("Karaoke cancelled. Use `!karaoke <song>` to try again.")] });
        return;
      }

      const targetQuery = `${picked.artistName} ${picked.trackName}`;
      await waitMsg.edit({ embeds: [buildWaitEmbed(`🔍 Searching synced lyrics for **${picked.trackName}** — *${picked.artistName}*…`)] });

      // Try to find synced lyrics for the chosen song
      const syncedForPick = await searchLrcLib(targetQuery);
      if (syncedForPick) {
        // Run full karaoke with synced lyrics
        await launchKaraoke(message, waitMsg, syncedForPick, guildId, query);
        return;
      }

      // Synced not found — try plain lyrics for the specific picked song
      await waitMsg.edit({ embeds: [buildWaitEmbed(`⚠️ No synced lyrics — searching plain lyrics for **${picked.trackName}**…`)] });
      const plain = await fetchPlainLyrics(targetQuery, picked.artistName, picked.trackName);
      if (plain) {
        await waitMsg.edit({
          embeds: [new EmbedBuilder()
            .setColor(0xf0a030).setTitle("🎤 Plain lyrics only")
            .setDescription(
              `⚠️ No synced lyrics — showing plain lyrics for **${plain.title}** by *${plain.artist}*.\n` +
              `Source: **${plain.source}**\n\nReact ▶️/◀️ to scroll · ⏹ to stop`,
            )],
        });
        await new Promise(r => setTimeout(r, 1200));
        await runStaticLyricsMode(message, waitMsg, plain);
        return;
      }

      await waitMsg.edit({
        embeds: [new EmbedBuilder()
          .setColor(0xed4245).setTitle("🎤 No lyrics found")
          .setDescription(`❌ No lyrics found for **${picked.trackName}** by *${picked.artistName}* on any source.\nTry another song with \`!karaoke <Artist> <Song title>\`.`)],
      });
      return;
    }

    // No synced lyrics and no Genius results — try plain lyrics fallback
    await waitMsg.edit({ embeds: [buildWaitEmbed(`⚠️ No synced lyrics found for **${query}**\n🔍 Searching for plain lyrics on other sources…`)] });

    const words = query.trim().split(/\s+/);
    const guessArtist = words.length > 1 ? words[0] : undefined;
    const guessTitle  = words.length > 1 ? words.slice(1).join(" ") : undefined;
    const plain = await fetchPlainLyrics(query, guessArtist, guessTitle);

    if (!plain) {
      await waitMsg.edit({
        embeds: [new EmbedBuilder()
          .setColor(0xed4245).setTitle("🎤 No lyrics found")
          .setDescription(
            `❌ No lyrics found for **${query}** on any source.\n\n` +
            "**Tips:**\n• Use `!karaoke <Artist> <Song title>` — e.g. `!karaoke Kendji Girac Andalouse`\n" +
            "• Try the original title\n• Popular songs work best",
          )],
      });
      return;
    }

    // Found plain lyrics — show in scrollable mode (no timing)
    await waitMsg.edit({
      embeds: [new EmbedBuilder()
        .setColor(0xf0a030)
        .setTitle("🎤 Plain lyrics only")
        .setDescription(
          `⚠️ No synced lyrics found — showing plain lyrics for **${plain.title}** by *${plain.artist}*.\n` +
          `Source: **${plain.source}**\n\nReact ▶️/◀️ to scroll · ⏹ to stop`,
        )],
    });
    await new Promise(r => setTimeout(r, 1500));
    await runStaticLyricsMode(message, waitMsg, plain);
    return;
  }

  // Single result, or confident auto-match → skip picker
  let chosenCandidate: LrclibResult;

  if (candidates.length === 1) {
    chosenCandidate = candidates[0]!;
  } else {
    const autoPicked = tryAutoPick(query, candidates);
    if (autoPicked) {
      chosenCandidate = autoPicked;
    } else {
      const picked = await runKaraokePicker(message, waitMsg, candidates);
      if (!picked) {
        await waitMsg.edit({ embeds: [new EmbedBuilder().setColor(0x99aab5).setTitle("🎤 Cancelled").setDescription("Karaoke cancelled. Use `!karaoke <song>` to try again.")] });
        return;
      }
      chosenCandidate = picked;
    }
  }

  const lrcData = {
    lines: parseLrc(chosenCandidate.syncedLyrics!),
    title: chosenCandidate.trackName,
    artist: chosenCandidate.artistName,
    duration: chosenCandidate.duration ?? 0,
  };

  await (attachToCurrentAudio && ytStartTime
    ? attachLyricsToCurrentAudio(message, waitMsg, lrcData, guildId, ytStartTime)
    : launchKaraoke(message, waitMsg, lrcData, guildId, effectiveQuery));
}
