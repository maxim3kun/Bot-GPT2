import { spawn, execFile } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import type { Readable } from "stream";

const execFileAsync = promisify(execFile);

const LOCAL_BIN = "/home/runner/.local/bin/yt-dlp";
const YT_DLP_BIN = existsSync(LOCAL_BIN) ? LOCAL_BIN : "yt-dlp";

const YT_CLIENT_ARGS = "--extractor-args=youtube:player_client=default";

export interface YtInfo {
  title: string;
  duration: number;
  thumbnail: string | null;
}

export async function ytdlpInfo(url: string): Promise<YtInfo> {
  const { stdout } = await execFileAsync(
    YT_DLP_BIN,
    ["--print-json", "--skip-download", "--no-playlist", YT_CLIENT_ARGS, url],
    { timeout: 30_000, maxBuffer: 4 * 1024 * 1024 },
  );
  const data = JSON.parse(stdout.trim()) as Record<string, unknown>;
  return {
    title: (data.title as string | undefined) ?? "Unknown",
    duration: (data.duration as number | undefined) ?? 0,
    thumbnail: (data.thumbnail as string | null | undefined) ?? null,
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
