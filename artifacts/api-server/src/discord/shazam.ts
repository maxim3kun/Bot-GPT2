import { type Message, EmbedBuilder } from "discord.js";
import { request as httpsRequest, get as httpsGet } from "https";
import { get as httpGet } from "http";
import { execFile } from "child_process";
import { promisify } from "util";
import { radioStates, RADIO_STATIONS } from "./radio";
import { logger } from "../lib/logger";

const execFileAsync = promisify(execFile);

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

// ── Capture audio bytes from a URL (follows redirects, collects ~12 s) ────────

const CAPTURE_BYTES    = 400 * 1024;   // ~25 s at 128 kbps
const STREAM_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Icy-MetaData": "0",
  "Connection": "close",
  "Accept": "*/*",
};

async function captureAudioBytes(url: string, hops = 0): Promise<Buffer> {
  if (hops > 8) throw new Error("Too many redirects");
  return new Promise((resolve, reject) => {
    const getter = url.startsWith("https://") ? httpsGet : httpGet;
    const req = getter(url, { headers: STREAM_HEADERS }, (res) => {
      const loc = res.headers.location;
      if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303) && loc) {
        const next = loc.startsWith("http") ? loc : new URL(loc, url).toString();
        captureAudioBytes(next, hops + 1).then(resolve).catch(reject);
        res.resume();
        return;
      }
      if (res.statusCode && res.statusCode >= 400) {
        res.resume();
        reject(new Error(`Stream returned HTTP ${res.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      let total = 0;
      res.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
        total += chunk.length;
        if (total >= CAPTURE_BYTES) {
          req.destroy();
          resolve(Buffer.concat(chunks).subarray(0, CAPTURE_BYTES));
        }
      });
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.setTimeout(20_000, () => { req.destroy(new Error("Stream capture timed out")); });
  });
}

// ── AudD.io API — file-upload identification ──────────────────────────────────

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

async function queryAuddByFile(apiKey: string, audioBytes: Buffer): Promise<AuddResult | null> {
  const boundary = `----FormBoundary${Date.now().toString(16)}`;

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="api_token"\r\n\r\n${apiKey}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="return"\r\n\r\nspotify,apple_music\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n`),
    audioBytes,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      {
        hostname: "api.audd.io",
        path: "/",
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          try {
            const raw = Buffer.concat(chunks).toString("utf8");
            logger.debug({ raw }, "AudD raw response");
            const data = JSON.parse(raw) as {
              status: string;
              result?: AuddResult;
              error?: { error_code: number; error_message: string };
            };
            if (data.status === "error") {
              reject(new Error(data.error?.error_message ?? "AudD unknown error"));
            } else {
              resolve(data.result ?? null);
            }
          } catch (e) {
            reject(e);
          }
        });
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── Public command ────────────────────────────────────────────────────────────

export async function shazam(message: Message): Promise<void> {
  const apiKey = process.env["AUDD_API_KEY"];
  if (!apiKey) {
    await message.reply("❌ Shazam is not configured. Ask a moderator to set it up.");
    return;
  }

  const guildId = message.guildId;
  if (!guildId) return;

  const state = radioStates.get(guildId);
  if (!state || (!state.stationKey && !state.youtubeUrl)) {
    await message.reply("❌ The bot isn't playing anything right now. Use `!radio <station>` or `!youtube <url>` first.");
    return;
  }

  if (state.stationKey) {
    const station = RADIO_STATIONS[state.stationKey];
    if (!station) { await message.reply("❌ Can't identify: unknown station."); return; }

    const waitMsg = await message.reply(`🎵 Identifying song on **${station.name}**…`);
    try {
      logger.debug({ url: station.url }, "Shazam: capturing audio from radio stream");
      const audioBytes = await captureAudioBytes(station.url);
      logger.debug({ bytes: audioBytes.length }, "Shazam: audio captured, querying AudD");
      const result = await queryAuddByFile(apiKey, audioBytes);
      await buildAndSendResult(waitMsg, result, station.name);
    } catch (err) {
      logger.error({ err }, "Shazam error (radio)");
      await waitMsg.edit("❌ Something went wrong while identifying the song. Please try again!");
    }

  } else {
    // YouTube — get direct stream URL via yt-dlp, then capture bytes
    const waitMsg = await message.reply(`🔗 Getting audio stream from **${state.youtubeTitle ?? "YouTube"}**…`);
    const sourceLabel = state.youtubeTitle ?? "YouTube";
    let directUrl: string;
    try {
      directUrl = await getYoutubeDirectUrl(state.youtubeUrl!);
    } catch (err) {
      logger.error({ err }, "Shazam: failed to get YouTube direct URL");
      await waitMsg.edit("❌ Couldn't get the audio stream from YouTube. Try again.");
      return;
    }

    await waitMsg.edit(`🔍 Identifying the song…`);
    try {
      const audioBytes = await captureAudioBytes(directUrl);
      const result = await queryAuddByFile(apiKey, audioBytes);
      await buildAndSendResult(waitMsg, result, sourceLabel);
    } catch (err) {
      logger.error({ err }, "Shazam error (youtube)");
      await waitMsg.edit("❌ Something went wrong while identifying the song. Please try again!");
    }
  }
}

// ── Build result embed ────────────────────────────────────────────────────────

async function buildAndSendResult(
  waitMsg: Awaited<ReturnType<Message["reply"]>>,
  result: AuddResult | null,
  sourceLabel: string,
): Promise<void> {
  if (!result) {
    await waitMsg.edit(
      "🤷 Couldn't identify the song — the track may have just changed or isn't in the database.\n" +
      "Try again in a few seconds!",
    );
    return;
  }

  const spotifyUrl = result.spotify?.external_urls?.spotify;
  const albumArt   = result.spotify?.album?.images?.[0]?.url;
  const albumName  = result.spotify?.album?.name ?? result.album;
  const year       = (result.spotify?.album?.release_date ?? result.release_date ?? "").slice(0, 4);
  const listenUrl  = spotifyUrl ?? result.song_link ?? result.apple_music?.url;

  const embed = new EmbedBuilder()
    .setColor(0x1db954)
    .setTitle("🎵 Song identified!")
    .addFields(
      { name: "🎤 Title",  value: result.title,  inline: true },
      { name: "🎸 Artist", value: result.artist, inline: true },
      ...(albumName ? [{ name: "💿 Album",  value: albumName,                   inline: true }] : []),
      ...(year      ? [{ name: "📅 Year",   value: year,                         inline: true }] : []),
      ...(listenUrl ? [{ name: "🔗 Listen", value: `[Open link](${listenUrl})`, inline: true }] : []),
    )
    .setFooter({ text: `Powered by AudD.io · Identified from: ${sourceLabel}` });

  if (albumArt) embed.setThumbnail(albumArt);

  await waitMsg.edit({ content: "", embeds: [embed] });
}
