import { type Message, EmbedBuilder } from "discord.js";
import { get as httpsGet } from "https";
import { get as httpGet } from "http";
import type { IncomingMessage } from "http";
import { execFile } from "child_process";
import { promisify } from "util";
import { radioStates, RADIO_STATIONS } from "./radio";
import { logger } from "../lib/logger";

const execFileAsync = promisify(execFile);

// ~10 seconds at 128 kbps = 160,000 bytes
const SAMPLE_BYTES = 160_000;

// ── HTTP stream (follows redirects) ──────────────────────────────────────────

const STREAM_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Icy-MetaData": "1",
  "Connection": "keep-alive",
  "Accept": "*/*",
};

async function openStream(url: string, hops = 0): Promise<IncomingMessage> {
  if (hops > 8) throw new Error("Too many redirects");
  return new Promise((resolve, reject) => {
    const getter = url.startsWith("https://") ? httpsGet : httpGet;
    getter(url, { headers: STREAM_HEADERS }, (res) => {
      const loc = res.headers.location;
      if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303) && loc) {
        openStream(loc.startsWith("http") ? loc : new URL(loc, url).toString(), hops + 1)
          .then(resolve).catch(reject);
      } else {
        resolve(res);
      }
    }).on("error", reject);
  });
}

async function captureAudioSample(url: string): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const stream = await openStream(url);
      const chunks: Buffer[] = [];
      let received = 0;

      stream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
        received += chunk.length;
        if (received >= SAMPLE_BYTES) stream.destroy();
      });

      stream.on("close", () => resolve(Buffer.concat(chunks)));
      stream.on("end",  () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
}

// ── Get direct audio URL for YouTube via yt-dlp ──────────────────────────────

async function getYoutubeDirectUrl(youtubeUrl: string): Promise<string> {
  const { stdout } = await execFileAsync("yt-dlp", [
    "-f", "bestaudio/best",
    "--get-url",
    "--no-playlist",
    "--extractor-args=youtube:player_client=android_vr,web_creator",
    youtubeUrl,
  ], { timeout: 30_000 });
  const url = stdout.trim().split("\n")[0];
  if (!url) throw new Error("yt-dlp returned no URL");
  return url;
}

// ── AudD.io API ───────────────────────────────────────────────────────────────

interface AuddResult {
  title:        string;
  artist:       string;
  album?:       string;
  release_date?: string;
  song_link?:   string;
  spotify?: {
    name?: string;
    album?: { name?: string; images?: { url: string }[]; release_date?: string };
    external_urls?: { spotify?: string };
  };
  apple_music?: { url?: string };
}

async function queryAudd(apiKey: string, audioBuffer: Buffer): Promise<AuddResult | null> {
  // Build a raw multipart/form-data body — Node.js native FormData+Blob
  // does not reliably send file parts to external APIs.
  const boundary = `----FormBoundary${Date.now().toString(16)}`;

  const bodyParts: Buffer[] = [
    Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="api_token"\r\n\r\n` +
      `${apiKey}\r\n`,
    ),
    Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="return"\r\n\r\n` +
      `spotify,apple_music\r\n`,
    ),
    Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="audio"; filename="sample.mp3"\r\n` +
      `Content-Type: audio/mpeg\r\n\r\n`,
    ),
    audioBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ];

  const body = Buffer.concat(bodyParts);

  const res = await fetch("https://api.audd.io/", {
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "Content-Length": String(body.length),
    },
    body,
  });
  if (!res.ok) throw new Error(`AudD API HTTP ${res.status}`);

  const data = await res.json() as {
    status: string;
    result?: AuddResult;
    error?:  { error_code: number; error_message: string };
  };

  if (data.status === "error") {
    throw new Error(data.error?.error_message ?? "AudD unknown error");
  }

  return data.result ?? null;
}

// ── Public command ────────────────────────────────────────────────────────────

export async function shazam(message: Message): Promise<void> {
  const apiKey = process.env["AUDD_API_KEY"];
  if (!apiKey) {
    await message.reply("❌ Shazam is not configured. Ask a moderator to set it up — use `!mode d'emploi` for instructions.");
    return;
  }

  const guildId = message.guildId;
  if (!guildId) return;

  const state = radioStates.get(guildId);
  if (!state || (!state.stationKey && !state.youtubeUrl)) {
    await message.reply("❌ The bot isn't playing anything right now. Use `!radio <station>` or `!youtube <url>` first.");
    return;
  }

  // ── Determine source ──────────────────────────────────────────────────────

  let sourceUrl: string;
  let sourceLabel: string;

  if (state.stationKey) {
    const station = RADIO_STATIONS[state.stationKey];
    if (!station) { await message.reply("❌ Can't identify: unknown station."); return; }
    sourceUrl  = station.url;
    sourceLabel = station.name;
  } else {
    sourceLabel = state.youtubeTitle ?? "YouTube";
    const waitMsg2 = await message.reply(`🔗 Getting audio stream from **${sourceLabel}**…`);
    try {
      sourceUrl = await getYoutubeDirectUrl(state.youtubeUrl!);
      await waitMsg2.delete().catch(() => null);
    } catch (err) {
      logger.error({ err }, "Shazam: failed to get YouTube direct URL");
      await waitMsg2.edit("❌ Couldn't get the audio stream from YouTube. Try again.");
      return;
    }
  }

  // ── Capture & identify ────────────────────────────────────────────────────

  const waitMsg = await message.reply(`🎵 Listening to **${sourceLabel}** for ~10 seconds…`);

  try {
    const sample = await captureAudioSample(sourceUrl);

    if (sample.length < 8_000) {
      await waitMsg.edit("❌ Couldn't capture enough audio. The stream may be temporarily unavailable.");
      return;
    }

    await waitMsg.edit("🔍 Identifying the song…");
    const result = await queryAudd(apiKey, sample);

    if (!result) {
      await waitMsg.edit(
        "🤷 Couldn't identify the song — the track may have just changed or isn't in the database.\n" +
        "Try again in a few seconds!",
      );
      return;
    }

    // ── Build result embed ────────────────────────────────────────────────

    const spotifyUrl  = result.spotify?.external_urls?.spotify;
    const albumArt    = result.spotify?.album?.images?.[0]?.url;
    const albumName   = result.spotify?.album?.name ?? result.album;
    const year        = (result.spotify?.album?.release_date ?? result.release_date ?? "").slice(0, 4);
    const listenUrl   = spotifyUrl ?? result.song_link ?? result.apple_music?.url;

    const embed = new EmbedBuilder()
      .setColor(0x1db954)
      .setTitle("🎵 Song identified!")
      .addFields(
        { name: "🎤 Title",  value: result.title,  inline: true },
        { name: "🎸 Artist", value: result.artist, inline: true },
        ...(albumName  ? [{ name: "💿 Album",    value: albumName,                             inline: true }] : []),
        ...(year       ? [{ name: "📅 Year",     value: year,                                  inline: true }] : []),
        ...(listenUrl  ? [{ name: "🔗 Listen",   value: `[Open link](${listenUrl})`,           inline: true }] : []),
      )
      .setFooter({ text: `Powered by AudD.io · Identified from: ${sourceLabel}` });

    if (albumArt) embed.setThumbnail(albumArt);

    await waitMsg.edit({ content: "", embeds: [embed] });
  } catch (err) {
    logger.error({ err }, "Shazam error");
    await waitMsg.edit("❌ Something went wrong while identifying the song. Please try again!");
  }
}
