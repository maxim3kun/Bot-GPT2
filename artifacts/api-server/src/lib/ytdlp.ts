import { spawn, execFile } from "child_process";
import { promisify } from "util";
import { existsSync, writeFileSync } from "fs";
import { PassThrough } from "stream";
import type { Readable } from "stream";
import { logger } from "./logger";

const execFileAsync = promisify(execFile);

// Check $HOME/.local/bin/yt-dlp first (works on Replit and Railway),
// then fall back to system yt-dlp (from Nix/PATH).
const HOME_BIN = `${process.env["HOME"] ?? "/home/runner"}/.local/bin/yt-dlp`;
const YT_DLP_BIN = existsSync(HOME_BIN) ? HOME_BIN : "yt-dlp";

// ── YouTube cookies ────────────────────────────────────────────────────────────
const COOKIES_PATH = "/tmp/yt-cookies.txt";
let _cookiesReady = false;

function initCookies(): void {
  const raw = process.env["YT_COOKIES"];
  if (!raw) {
    logger.warn("yt-dlp: YT_COOKIES not set — YouTube may block requests from datacenter IPs");
    return;
  }
  try {
    const trimmed = raw.trim();
    let content: string;
    if (trimmed.startsWith("# Netscape HTTP Cookie File") || trimmed.startsWith("# HTTP Cookie File")) {
      content = trimmed;
    } else {
      let decoded = "";
      try { decoded = Buffer.from(trimmed, "base64").toString("utf8"); } catch { /* ignore */ }
      if (decoded.startsWith("# Netscape HTTP Cookie File") || decoded.startsWith("# HTTP Cookie File")) {
        content = decoded;
      } else {
        logger.warn("yt-dlp: YT_COOKIES is neither Netscape nor valid base64 — export cookies with 'Get cookies.txt LOCALLY'");
        content = trimmed;
      }
    }

    let normalised = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const newlineCount = (normalised.match(/\n/g) ?? []).length;
    const hasTabSep = normalised.includes("\t");

    if (newlineCount === 0) {
      normalised = normalised
        .replace(/[\t ]+(\.[\w.-]+[\t ](?:TRUE|FALSE)[\t ])/g, "\n$1")
        .trim();
      logger.info("yt-dlp: cookies — reconstructed newlines from collapsed format");
    }
    if (!hasTabSep) {
      const tabRestored = normalised.split("\n").map(line => {
        if (line.startsWith("#") || !line.trim() || line.includes("\t")) return line;
        const m = line.match(/^(\S+?)(TRUE|FALSE)(\/[^A-Z0-9]*?)(TRUE|FALSE)(\d{1,15})([^\s=]+)(.*)?$/);
        return m ? [m[1], m[2], m[3] || "/", m[4], m[5], m[6], m[7] ?? ""].join("\t") : line;
      }).join("\n");
      if (tabRestored !== normalised) {
        normalised = tabRestored;
        logger.info("yt-dlp: cookies — re-inserted tabs stripped by secret store");
      }
    }

    const lineCount = normalised.split("\n").filter(l => l.trim() && !l.startsWith("#")).length;
    writeFileSync(COOKIES_PATH, normalised, { encoding: "utf8", mode: 0o600 });
    _cookiesReady = true;
    if (lineCount === 0) {
      logger.warn("yt-dlp: YT_COOKIES written but 0 entries — try base64-encoding cookies.txt");
    } else {
      logger.info({ cookieEntries: lineCount }, "yt-dlp: cookies loaded from YT_COOKIES — YouTube bot-check bypass active");
    }
  } catch (err) {
    logger.warn({ err }, "yt-dlp: failed to write cookies file — continuing without cookies");
  }
}

initCookies();

function cookieArgs(): string[] {
  return _cookiesReady ? ["--cookies", COOKIES_PATH] : [];
}

// ── Client ────────────────────────────────────────────────────────────────────
// Only the android client with formats=missing_pot works from datacenter IPs
// without a GVS PO Token. mweb/web/ios all return "Requested format is not
// available" on Replit without a PO token. So we use android only.
// No rotation: rotating to broken clients just delays failure.
const ANDROID_ARGS = "--extractor-args=youtube:player_client=android;formats=missing_pot";

function clientArgsForIdx(_idx: number): string {
  return ANDROID_ARGS;
}

// SIGNIN_RE          → video requires authentication (age-restricted, bot-check)
// COOKIES_INVALID_RE → cookies expired; yt-dlp warns but continues playing public videos
const SIGNIN_RE         = /Sign in to confirm|bot.*check|cookies.*required/i;
const COOKIES_INVALID_RE = /cookies are no longer valid/i;

// ── Public exports ─────────────────────────────────────────────────────────────

export interface YtInfo {
  title: string;
  duration: number;
  thumbnail: string | null;
  isLive?: boolean;
}

export async function ytdlpInfo(url: string): Promise<YtInfo> {
  try {
    const { stdout } = await execFileAsync(
      YT_DLP_BIN,
      [
        "--print", "%(title)s\t%(duration)s\t%(thumbnail)s\t%(is_live)s",
        "--no-playlist",
        "--no-check-formats",
        "--retries", "1",
        "--socket-timeout", "8",
        ANDROID_ARGS,
        ...cookieArgs(),
        url,
      ],
      { timeout: 15_000, maxBuffer: 512 * 1024 },
    );
    const parts = stdout.trim().split("\t");
    const title    = parts[0]?.trim() || "Unknown";
    const duration = parseInt(parts[1] ?? "0", 10);
    const thumb    = parts[2]?.trim() || null;
    const isLive   = parts[3]?.trim() === "True";
    return { title, duration: isNaN(duration) ? 0 : duration, thumbnail: thumb && thumb !== "NA" ? thumb : null, isLive };
  } catch (err) {
    const msg = String((err as { stderr?: string })?.stderr ?? err);
    if (SIGNIN_RE.test(msg)) {
      logger.error(
        _cookiesReady
          ? "yt-dlp: YouTube bot-check — cookies may be expired. Re-export from browser."
          : "yt-dlp: YouTube requires authentication — set the YT_COOKIES secret (base64 format)",
      );
    }
    throw err;
  }
}

export function ytdlpStream(url: string): Readable {
  const pass = new PassThrough();

  const proc = spawn(YT_DLP_BIN, [
    "-f", "bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best",
    "--no-playlist",
    "--quiet",
    "--no-warnings",
    "--no-part",
    "--no-cache-dir",
    "--no-check-formats",
    "--retries", "1",
    "--fragment-retries", "1",
    "--socket-timeout", "8",
    "--concurrent-fragments", "3",
    "--hls-use-mpegts",
    ANDROID_ARGS,
    ...cookieArgs(),
    "-o", "-",
    url,
  ]);

  proc.stdout.pipe(pass, { end: false });
  proc.stdout.on("end", () => pass.end());
  proc.on("error", (err) => pass.destroy(err));

  let stderrBuf = "";
  let cookiesWarnedThisStream = false;

  proc.stderr.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    stderrBuf += text;
    process.stderr.write(text);

    // Expired cookies: warn once, but yt-dlp continues for non-auth videos
    if (!cookiesWarnedThisStream && COOKIES_INVALID_RE.test(stderrBuf)) {
      cookiesWarnedThisStream = true;
      logger.warn("yt-dlp: YouTube cookies are expired — public videos still work, auth-required videos will fail.");
    }

    if (SIGNIN_RE.test(stderrBuf)) {
      stderrBuf = "";
      proc.kill();
      logger.error(
        { url },
        _cookiesReady
          ? "yt-dlp: YouTube requires sign-in for this video and cookies are expired — cannot play"
          : "yt-dlp: YouTube bot-check — set YT_COOKIES secret to play restricted videos",
      );
      pass.destroy(new Error("youtube-signin-required"));
    }
  });

  return pass;
}

export interface YtSearchResult {
  title: string;
  url: string;
  duration: number;
  channel: string | null;
  isLive?: boolean;
}

const CLUTTER_RE = /\s*[\(\[]\s*(official\s*(video|audio|music\s*video|lyric(?:s)?\s*video?|clip)|clip\s*offici[ae]l|clip\s*official|officiel|vevo|hd|4k|mv|m\/v|lyric(?:s)?|full\s*(?:hd|version)|visualizer|original\s*(?:version)?)\s*[\)\]]/gi;
const SUFFIX_RE  = /\s*[-–|]\s*(official\s*(?:video|audio|music\s*video|clip)|clip\s*offici[ae]l|officiel|lyrics?|hd|4k)\s*$/gi;
const GENRE_RE   = /\s*[\(\[]\s*(pop|hip[- ]?hop|r&b|rnb|rap|rock|jazz|classical|electronic|dance|edm|indie|alternative|metal|country|reggae|latin|soul|funk|blues|punk|k-?pop)\s*[\)\]]/gi;

export function cleanYouTubeTitle(title: string): string {
  return title
    .replace(CLUTTER_RE, "")
    .replace(SUFFIX_RE, "")
    .replace(GENRE_RE, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const _searchCache = new Map<string, { results: YtSearchResult[]; expiresAt: number }>();
const SEARCH_CACHE_TTL_MS = 3 * 60 * 1000;

export async function ytdlpSearch(query: string, count = 5): Promise<YtSearchResult[]> {
  const cacheKey = `${count}:${query}`;
  const cached = _searchCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.results;

  const { stdout } = await execFileAsync(
    YT_DLP_BIN,
    [
      `ytsearch${count}:${query}`,
      "--flat-playlist",
      "--no-warnings",
      "--print", "%(id)s\t%(title)s\t%(duration)s\t%(uploader)s\t%(is_live)s",
      ...cookieArgs(),
    ],
    { timeout: 20_000, maxBuffer: 2 * 1024 * 1024 },
  );
  const lines = stdout.trim().split("\n").filter(Boolean);
  const results = lines.map((line) => {
    const parts = line.split("\t");
    const id  = parts[0] ?? "";
    const title = parts[1] ?? "Unknown";
    const dur = parseInt(parts[2] ?? "0", 10);
    const channel = parts[3] && parts[3] !== "NA" ? parts[3] : null;
    const isLive = parts[4]?.trim() === "True";
    return { title, url: `https://www.youtube.com/watch?v=${id}`, duration: isNaN(dur) ? 0 : dur, channel, isLive };
  });
  _searchCache.set(cacheKey, { results, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
  return results;
}
