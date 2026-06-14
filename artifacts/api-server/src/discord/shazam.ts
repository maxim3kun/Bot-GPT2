import { type Message, EmbedBuilder } from "discord.js";
import { request as httpsRequest } from "https";
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

// ── AudD.io API — URL-based identification ────────────────────────────────────

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

async function queryAuddByUrl(apiKey: string, audioUrl: string): Promise<AuddResult | null> {
  const boundary = `----FormBoundary${Date.now().toString(16)}`;

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="api_token"\r\n\r\n${apiKey}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="return"\r\n\r\nspotify,apple_music\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="url"\r\n\r\n${audioUrl}\r\n`),
    Buffer.from(`--${boundary}--\r\n`),
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

  // ── Determine source URL ──────────────────────────────────────────────────

  let audioUrl: string;
  let sourceLabel: string;

  if (state.stationKey) {
    const station = RADIO_STATIONS[state.stationKey];
    if (!station) { await message.reply("❌ Can't identify: unknown station."); return; }
    audioUrl    = station.url;
    sourceLabel = station.name;

    const waitMsg = await message.reply(`🎵 Identifying song on **${sourceLabel}**…`);
    try {
      const result = await queryAuddByUrl(apiKey, audioUrl);
      await buildAndSendResult(waitMsg, result, sourceLabel);
    } catch (err) {
      logger.error({ err }, "Shazam error (radio)");
      await waitMsg.edit("❌ Something went wrong while identifying the song. Please try again!");
    }

  } else {
    // YouTube — need direct URL from yt-dlp first
    const waitMsg = await message.reply(`🔗 Getting audio stream from **${state.youtubeTitle ?? "YouTube"}**…`);
    sourceLabel = state.youtubeTitle ?? "YouTube";
    try {
      audioUrl = await getYoutubeDirectUrl(state.youtubeUrl!);
    } catch (err) {
      logger.error({ err }, "Shazam: failed to get YouTube direct URL");
      await waitMsg.edit("❌ Couldn't get the audio stream from YouTube. Try again.");
      return;
    }

    await waitMsg.edit(`🔍 Identifying the song…`);
    try {
      const result = await queryAuddByUrl(apiKey, audioUrl);
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
