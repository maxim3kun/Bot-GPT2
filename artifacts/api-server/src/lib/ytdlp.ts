import { spawn, execFile } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import type { Readable } from "stream";
import { logger } from "./logger";

const execFileAsync = promisify(execFile);

const LOCAL_BIN = "/home/runner/.local/bin/yt-dlp";
const YT_DLP_BIN = existsSync(LOCAL_BIN) ? LOCAL_BIN : "yt-dlp";

// ── Client rotation ────────────────────────────────────────────────────────────
// YouTube blocks clients from datacenter IPs periodically. We keep a list and
// auto-rotate when one gets blocked, so the bot heals itself without restarts.
const YT_CLIENTS = [
  "android,formats=missing_pot", // works as of 2025-06 from Replit IPs
  "tv_embedded",                  // was working before android; keep as fallback
  "mweb",                         // mobile web — last resort
  "ios",                          // ios — often missing formats but worth a try
];
let _clientIdx = 0;

function clientArgs(): string {
  return `--extractor-args=youtube:player_client=${YT_CLIENTS[_clientIdx]}`;
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

const BLOCKED_RE = /no longer supported|Sign in|po_token required/i;

// ── Public exports ─────────────────────────────────────────────────────────────

export interface YtInfo {
  title: string;
  duration: number;
  thumbnail: string | null;
}

export async function ytdlpInfo(url: string, _retry = 0): Promise<YtInfo> {
  const idx = _clientIdx;
  let stderr = "";
  try {
    const { stdout, stderr: se } = await execFileAsync(
      YT_DLP_BIN,
      [
        "--print", "%(title)s\t%(duration)s\t%(thumbnail)s",
        "--no-playlist",
        clientArgs(),
        url,
      ],
      { timeout: 20_000, maxBuffer: 512 * 1024 },
    );
    stderr = se ?? "";
    const line = stdout.trim();
    const parts = line.split("\t");
    const title = parts[0]?.trim() || "Unknown";
    const duration = parseInt(parts[1] ?? "0", 10);
    const thumb = parts[2]?.trim() || null;
    return {
      title,
      duration: isNaN(duration) ? 0 : duration,
      thumbnail: thumb && thumb !== "NA" ? thumb : null,
    };
  } catch (err) {
    const msg = String((err as { stderr?: string })?.stderr ?? err);
    if (BLOCKED_RE.test(msg) && _retry < YT_CLIENTS.length - 1) {
      rotateClient(idx);
      return ytdlpInfo(url, _retry + 1);
    }
    throw err;
  }
}

export function ytdlpStream(url: string): Readable {
  const idx = _clientIdx;
  const proc = spawn(YT_DLP_BIN, [
    "-f", "bestaudio/best",
    "--no-playlist",
    "--quiet",
    clientArgs(),
    "-o", "-",
    url,
  ]);

  // Monitor stderr — if YouTube blocks, rotate client so next stream uses the new one
  let stderrBuf = "";
  proc.stderr.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    stderrBuf += text;
    if (BLOCKED_RE.test(stderrBuf)) {
      rotateClient(idx);
      stderrBuf = ""; // prevent re-triggering
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

export async function ytdlpSearch(query: string, count = 5): Promise<YtSearchResult[]> {
  const { stdout } = await execFileAsync(
    YT_DLP_BIN,
    [
      `ytsearch${count}:${query}`,
      "--flat-playlist",
      "--no-warnings",
      "--print", "%(id)s\t%(title)s\t%(duration)s\t%(uploader)s",
    ],
    { timeout: 20_000, maxBuffer: 2 * 1024 * 1024 },
  );
  const lines = stdout.trim().split("\n").filter(Boolean);
  return lines.map((line) => {
    const parts = line.split("\t");
    const id = parts[0] ?? "";
    const title = parts[1] ?? "Unknown";
    const dur = parseInt(parts[2] ?? "0", 10);
    const channel = parts[3] && parts[3] !== "NA" ? parts[3] : null;
    return {
      title,
      url: `https://www.youtube.com/watch?v=${id}`,
      duration: isNaN(dur) ? 0 : dur,
      channel,
    };
  });
}
