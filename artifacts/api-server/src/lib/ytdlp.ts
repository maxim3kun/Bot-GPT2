import { spawn, execFile } from "child_process";
import { promisify } from "util";
import type { Readable } from "stream";

const execFileAsync = promisify(execFile);

const YT_CLIENT_ARGS = "--extractor-args=youtube:player_client=android_vr,web_creator";

export interface YtInfo {
  title: string;
  duration: number;
  thumbnail: string | null;
}

export async function ytdlpInfo(url: string): Promise<YtInfo> {
  const { stdout } = await execFileAsync(
    "yt-dlp",
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
  const proc = spawn("yt-dlp", [
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
