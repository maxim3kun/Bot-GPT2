import { spawn, execFile } from "child_process";
import { promisify } from "util";
import { existsSync, writeFileSync } from "fs";
import type { Readable } from "stream";
import { logger } from "./logger";

const execFileAsync = promisify(execFile);

const LOCAL_BIN = "/home/runner/.local/bin/yt-dlp";
const YT_DLP_BIN = existsSync(LOCAL_BIN) ? LOCAL_BIN : "yt-dlp";

// ── YouTube cookies ────────────────────────────────────────────────────────────
// Set YT_COOKIES to a Netscape-format cookies file content (plain text or
// base64-encoded). Export cookies from your browser with the "Get cookies.txt
// LOCALLY" extension (chrome/firefox), then store the file content as the
// YT_COOKIES secret in Railway / Replit secrets.
// yt-dlp will use these cookies to bypass the "Sign in to confirm" bot-check.

const COOKIES_PATH = "/tmp/yt-cookies.txt";
let _cookiesReady = false;

function initCookies(): void {
  const raw = process.env["YT_COOKIES"];
  if (!raw) {
    logger.warn("yt-dlp: YT_COOKIES not set — YouTube may block requests from datacenter IPs");
    return;
  }

  try {
    // Trim surrounding whitespace/newlines first — copy-pasting into secrets often adds them
    const trimmed = raw.trim();

    let content: string;
    if (trimmed.startsWith("# Netscape HTTP Cookie File") || trimmed.startsWith("# HTTP Cookie File")) {
      // Already plain-text Netscape format
      content = trimmed;
    } else {
      // Attempt base64 decode
      let decoded: string;
      try {
        decoded = Buffer.from(trimmed, "base64").toString("utf8");
      } catch {
        decoded = "";
      }
      if (decoded.startsWith("# Netscape HTTP Cookie File") || decoded.startsWith("# HTTP Cookie File")) {
        content = decoded;
      } else {
        // Not valid base64 of a cookie file — treat the raw value as plain text (may be malformed)
        logger.warn(
          "yt-dlp: YT_COOKIES is neither a Netscape cookie file nor valid base64 of one — " +
          "export cookies from your browser with the 'Get cookies.txt LOCALLY' extension, " +
          "then paste the file content (or its base64) as the YT_COOKIES secret",
        );
        content = trimmed;
      }
    }

    // Normalise Windows line endings
    let normalised = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // ── Detect collapsed single-line format ──────────────────────────────────
    // Some secret stores (e.g. Replit) strip newlines and/or tabs when a
    // multi-line cookies.txt is pasted. We try to recover:
    //   1. Newlines stripped but tabs preserved → split on domain tokens
    //   2. Both newlines AND tabs stripped → split on domain tokens (space-sep),
    //      then re-insert tabs inside each reconstructed line
    const newlineCount = (normalised.match(/\n/g) ?? []).length;
    const hasTabSep    = normalised.includes("\t");

    if (newlineCount === 0) {
      // Re-insert newlines before each domain token (handles both tab and space sep)
      normalised = normalised
        .replace(/[\t ]+(\.[\w.-]+[\t ](?:TRUE|FALSE)[\t ])/g, "\n$1")
        .trim();
      logger.info("yt-dlp: cookies — detected collapsed single-line format, reconstructed newlines");
    }

    // ── Detect tab-stripped lines ─────────────────────────────────────────────
    // Replit secret store preserves newlines reconstructed above but may strip
    // tabs within each line, leaving fields concatenated:
    //   ".youtube.comTRUE/FALSE0PREFvalue" → needs tabs re-inserted
    if (!hasTabSep) {
      const tabRestored = normalised
        .split("\n")
        .map(line => {
          if (line.startsWith("#") || !line.trim()) return line;
          // Already has tabs — leave as-is
          if (line.includes("\t")) return line;
          // Netscape format: domain TRUE/FALSE path TRUE/FALSE expiry name [value]
          // Try to re-insert tabs. Path always starts with "/" and ends before the
          // second TRUE/FALSE token; expiry is a run of digits after path+secure.
          const m = line.match(
            /^(\S+?)(TRUE|FALSE)(\/[^A-Z0-9]*?)(TRUE|FALSE)(\d{1,15})([^\s=]+)(.*)?$/
          );
          if (m) {
            return [m[1], m[2], m[3] || "/", m[4], m[5], m[6], m[7] ?? ""].join("\t");
          }
          return line; // couldn't parse — leave unchanged
        })
        .join("\n");
      if (tabRestored !== normalised) {
        normalised = tabRestored;
        logger.info("yt-dlp: cookies — re-inserted tabs stripped by secret store");
      }
    }

    const lines = normalised.split("\n").filter(l => l.trim() && !l.startsWith("#"));
    const lineCount = lines.length;

    writeFileSync(COOKIES_PATH, normalised, { encoding: "utf8", mode: 0o600 });

    if (lineCount === 0) {
      logger.warn(
        { rawLength: content.length },
        "yt-dlp: YT_COOKIES written but contains 0 cookie entries — " +
        "the secret likely lost its newlines when pasted. " +
        "Fix: run  base64 cookies.txt  in a terminal, then paste the resulting single-line string as the secret.",
      );
      // Still mark ready — yt-dlp will try with the file and report its own error
      _cookiesReady = true;
    } else {
      _cookiesReady = true;
      logger.info(
        { cookieEntries: lineCount },
        "yt-dlp: cookies loaded from YT_COOKIES — YouTube bot-check bypass active",
      );
    }
  } catch (err) {
    logger.warn({ err }, "yt-dlp: failed to write cookies file — continuing without cookies");
  }
}

initCookies();

function cookieArgs(): string[] {
  return _cookiesReady ? ["--cookies", COOKIES_PATH] : [];
}

// ── Client rotation ────────────────────────────────────────────────────────────
// YouTube blocks most player clients from datacenter IPs. Only `android` with
// `formats=missing_pot` reliably streams audio from Replit/Railway IPs (as of 2025-06).
// `formats=missing_pot` tells yt-dlp to skip the GVS PO Token check on android client.
//
// SYNTAX NOTE: yt-dlp extractor args use SEMICOLONS to separate multiple args for
// the same extractor. Commas are used to specify multiple client names (not what we want).
//   CORRECT:  youtube:player_client=android;formats=missing_pot
//   WRONG:    youtube:player_client=android,formats=missing_pot  ← treats "formats=missing_pot"
//                                                                    as a second client name
//
// Re-test with: yt-dlp --extractor-args="youtube:player_client=android;formats=missing_pot"
//               -f "bestaudio/best" --quiet -o - <URL> 2>/dev/null | wc -c
const YT_CLIENTS = [
  "android",    // primary — streams fine with formats=missing_pot
  "mweb",       // fallback 1
  "web",        // fallback 2
];
let _clientIdx = 0;

function clientArgs(): string {
  return `--extractor-args=youtube:player_client=${YT_CLIENTS[_clientIdx]};formats=missing_pot`;
}

/** Called when current client is confirmed blocked — moves to the next one. */
function rotateClient(fromIdx: number): void {
  if (_clientIdx !== fromIdx) return; // already rotated by a concurrent call
  _clientIdx = (_clientIdx + 1) % YT_CLIENTS.length;
  logger.warn(
    { prev: YT_CLIENTS[fromIdx], next: YT_CLIENTS[_clientIdx] },
    "yt-dlp: YouTube client blocked — rotated to next",
  );
}

// Matches client-level block (format unsupported or 403 on segment) → rotating client may help
const CLIENT_BLOCKED_RE = /no longer supported|po_token required|HTTP Error 403|Requested format is not available/i;
// Matches IP-level bot-check → rotating client WON'T help, cookies are needed
const SIGNIN_RE = /Sign in to confirm|bot.*check|cookies.*required/i;

const BLOCKED_RE = /no longer supported|Sign in|po_token required/i;

// ── Public exports ─────────────────────────────────────────────────────────────

export interface YtInfo {
  title: string;
  duration: number;
  thumbnail: string | null;
  isLive?: boolean;
}

export async function ytdlpInfo(url: string, _retry = 0): Promise<YtInfo> {
  const idx = _clientIdx;
  let stderr = "";
  try {
    const { stdout, stderr: se } = await execFileAsync(
      YT_DLP_BIN,
      [
        "--print", "%(title)s\t%(duration)s\t%(thumbnail)s\t%(is_live)s",
        "--no-playlist",
        "--no-check-formats",    // skip format URL validation — saves 1-2s
        "--retries", "1",
        "--socket-timeout", "8",
        clientArgs(),
        ...cookieArgs(),
        url,
      ],
      { timeout: 15_000, maxBuffer: 512 * 1024 },
    );
    stderr = se ?? "";
    const line = stdout.trim();
    const parts = line.split("\t");
    const title = parts[0]?.trim() || "Unknown";
    const duration = parseInt(parts[1] ?? "0", 10);
    const thumb = parts[2]?.trim() || null;
    const isLive = parts[3]?.trim() === "True";
    return {
      title,
      duration: isNaN(duration) ? 0 : duration,
      thumbnail: thumb && thumb !== "NA" ? thumb : null,
      isLive,
    };
  } catch (err) {
    const msg = String((err as { stderr?: string })?.stderr ?? err);
    if (SIGNIN_RE.test(msg)) {
      // IP-level bot-check — rotating client won't help
      if (!_cookiesReady) {
        logger.error("yt-dlp: YouTube requires authentication — set the YT_COOKIES secret with your exported cookies (base64 or plain Netscape format)");
      }
      throw err;
    }
    if (CLIENT_BLOCKED_RE.test(msg) && _retry < YT_CLIENTS.length - 1) {
      rotateClient(idx);
      return ytdlpInfo(url, _retry + 1);
    }
    throw err;
  }
}

export function ytdlpStream(url: string): Readable {
  const idx = _clientIdx;
  const proc = spawn(YT_DLP_BIN, [
    "-f", "bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best",
    "--no-playlist",
    "--quiet",
    "--no-warnings",
    "--no-part",
    "--no-cache-dir",
    "--no-check-formats",        // skip HEAD validation of format URL — saves 1-2s per video
    "--retries", "1",            // fail fast instead of retrying multiple times
    "--fragment-retries", "1",
    "--socket-timeout", "8",
    "--concurrent-fragments", "3", // fetch 3 fragments in parallel for faster initial buffer fill
    "--hls-use-mpegts",          // required to pipe HLS live streams as a continuous TS stream
    clientArgs(),
    ...cookieArgs(),
    "-o", "-",
    url,
  ]);

  // Monitor stderr — distinguish IP-level bot-check (needs cookies) from client-level block (rotate)
  let stderrBuf = "";
  proc.stderr.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    stderrBuf += text;
    if (SIGNIN_RE.test(stderrBuf)) {
      // Bug 4 fix: emit an error immediately so the caller gets user-facing feedback
      // right away instead of waiting 35 seconds for the hard timeout.
      if (!_cookiesReady) {
        logger.error("yt-dlp: YouTube bot-check on stream — set YT_COOKIES secret (base64 or plain Netscape format)");
      } else {
        logger.warn("yt-dlp: YouTube bot-check despite cookies — try refreshing YT_COOKIES");
      }
      proc.stdout.destroy(new Error("youtube-bot-check"));
      proc.kill();
      stderrBuf = "";
    } else if (CLIENT_BLOCKED_RE.test(stderrBuf)) {
      rotateClient(idx);
      stderrBuf = "";
    }
    process.stderr.write(text);
  });

  return proc.stdout as Readable;
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
    const id = parts[0] ?? "";
    const title = parts[1] ?? "Unknown";
    const dur = parseInt(parts[2] ?? "0", 10);
    const channel = parts[3] && parts[3] !== "NA" ? parts[3] : null;
    const isLive = parts[4]?.trim() === "True";
    return {
      title,
      url: `https://www.youtube.com/watch?v=${id}`,
      duration: isNaN(dur) ? 0 : dur,
      channel,
      isLive,
    };
  });
  _searchCache.set(cacheKey, { results, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
  return results;
}
