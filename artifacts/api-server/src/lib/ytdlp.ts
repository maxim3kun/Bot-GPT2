import { spawn, execFile } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import type { Readable } from "stream";

const execFileAsync = promisify(execFile);

const LOCAL_BIN = "/home/runner/.local/bin/yt-dlp";
const YT_DLP_BIN = existsSync(LOCAL_BIN) ? LOCAL_BIN : "yt-dlp";

// tv_embedded: only client that works from datacenter IPs (default hangs, ios returns 0 bytes)
const YT_CLIENT_ARGS = "--extractor-args=youtube:player_client=tv_embedded";

export interface YtInfo {
  title: string;
  duration: number;
  thumbnail: string | null;
}

export async function ytdlpInfo(url: string): Promise<YtInfo> {
  // Use --print instead of --print-json: lighter, no JSON parse issues,
  // works even when tv_embedded falls back to another client
  const { stdout } = await execFileAsync(
    YT_DLP_BIN,
    [
      "--print", "%(title)s\t%(duration)s\t%(thumbnail)s",
      "--no-playlist",
      YT_CLIENT_ARGS,
      url,
    ],
    { timeout: 20_000, maxBuffer: 512 * 1024 },
  );
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
}

export function ytdlpStream(url: string): Readable {
  const proc = spawn(YT_DLP_BIN, [
    "-f", "bestaudio/best",
    "--no-playlist",
    "--quiet",
    YT_CLIENT_ARGS,
    "-o", "-",
    url,
  ]);
  proc.stderr.pipe(process.stderr);
  return proc.stdout as Readable;
}

export interface YtSearchResult {
  title: string;
  url: string;
  duration: number;
  channel: string | null;
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
