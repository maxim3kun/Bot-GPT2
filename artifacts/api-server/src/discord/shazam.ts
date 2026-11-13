import { type Message, EmbedBuilder } from "discord.js";
import { request as httpsRequest, get as httpsGet } from "https";
import { get as httpGet } from "http";
import { execFile } from "child_process";
import { promisify } from "util";
import { radioStates, RADIO_STATIONS } from "./radio";
import { logger } from "../lib/logger";
import { getEffectiveLanguage } from "./effective-language.js";
import { isFeatureEnabled } from "../bootstrap/feature-flags.js";
import { getGuildFeatures } from "../lib/features-store.js";

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

export interface AuddResult {
  title?:       string;
  artist?:      string;
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

export interface ShazamDependencies {
  captureAudioBytes: (url: string) => Promise<Buffer>;
  getYoutubeDirectUrl: (url: string) => Promise<string>;
  identify: (apiKey: string, audioBytes: Buffer) => Promise<AuddResult | null>;
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
        let total = 0;
        if (res.statusCode && res.statusCode >= 400) {
          res.resume();
          reject(new Error(`AudD HTTP ${res.statusCode}`));
          return;
        }
        res.on("data", (c: Buffer) => {
          total += c.length;
          if (total > 128 * 1024) {
            res.destroy(new Error("AudD response too large"));
            return;
          }
          chunks.push(c);
        });
        res.on("end", () => {
          try {
            const raw = Buffer.concat(chunks).toString("utf8");
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
    req.setTimeout(20_000, () => req.destroy(new Error("AudD request timed out")));
    req.write(body);
    req.end();
  });
}

// ── Public command ────────────────────────────────────────────────────────────

const DEFAULT_DEPENDENCIES: ShazamDependencies = {
  captureAudioBytes,
  getYoutubeDirectUrl,
  identify: queryAuddByFile,
};

function shazamCopy(isFrench: boolean) {
  return isFrench
    ? {
        config: "❌ Shazam n’est pas configuré. Demande à un modérateur de l’activer.",
        guild: "❌ Cette commande fonctionne uniquement dans un serveur.",
        disabled: "🔒 Shazam est désactivé sur ce serveur.",
        noTrack: "❌ Le bot ne diffuse rien. Lance une radio ou une vidéo YouTube avant `!shazam`.",
        source: "Un court extrait de la source en cours est envoyé à AudD pour identifier le morceau.",
        noMatch: "🤷 Je n’ai pas identifié le morceau. Il a peut-être changé ou n’est pas dans la base.",
        streamError: "❌ Impossible de récupérer l’extrait audio de la source.",
        identifyError: "❌ Le service d’identification n’a pas répondu correctement. Réessaie plus tard.",
        identifying: "🎵 Identification en cours…",
        title: "🎤 Titre",
        artist: "🎸 Artiste",
        album: "💿 Album",
        year: "📅 Année",
        listen: "🔗 Écouter",
        identified: "Morceau identifié",
        footer: "Fourni par AudD.io · Source",
      }
    : {
        config: "❌ Shazam is not configured. Ask a moderator to enable it.",
        guild: "❌ This command only works in a server.",
        disabled: "🔒 Shazam is disabled on this server.",
        noTrack: "❌ The bot is not playing anything. Start radio or YouTube before `!shazam`.",
        source: "A short excerpt of the current source will be sent to AudD to identify the song.",
        noMatch: "🤷 I couldn't identify the song. It may have just changed or may not be in the database.",
        streamError: "❌ Couldn't retrieve audio from the current source.",
        identifyError: "❌ The identification service didn't respond correctly. Try again later.",
        identifying: "🎵 Identifying the current track…",
        title: "🎤 Title",
        artist: "🎸 Artist",
        album: "💿 Album",
        year: "📅 Year",
        listen: "🔗 Listen",
        identified: "Song identified!",
        footer: "Powered by AudD.io · Source",
      };
}

export async function shazam(message: Message, dependencies: ShazamDependencies = DEFAULT_DEPENDENCIES): Promise<void> {
  const isFrench = message.guildId ? getEffectiveLanguage(message.guildId, message.author.id) === "fr" : false;
  const copy = shazamCopy(isFrench);
  const apiKey = process.env["AUDD_API_KEY"];
  if (!apiKey) {
    await message.reply(copy.config);
    return;
  }

  const guildId = message.guildId;
  if (!guildId) {
    await message.reply(copy.guild);
    return;
  }

  if (!isFeatureEnabled("music")) {
    await message.reply(copy.disabled);
    return;
  }
  let guildFeatures;
  try {
    guildFeatures = await getGuildFeatures(guildId, { failClosed: true });
  } catch {
    await message.reply(copy.disabled);
    return;
  }
  if (guildFeatures.find(feature => feature.name === "shazam")?.enabled !== true
    || guildFeatures.find(feature => feature.name === "music")?.enabled !== true) {
    await message.reply(copy.disabled);
    return;
  }

  const state = radioStates.get(guildId);
  if (!state || (!state.stationKey && !state.youtubeUrl)) {
    await message.reply(copy.noTrack);
    return;
  }

  if (state.stationKey) {
    const station = RADIO_STATIONS[state.stationKey];
    if (!station) { await message.reply(copy.noTrack); return; }

    const waitMsg = await message.reply(`${copy.source}\n${copy.identifying} **${station.name}**`);
    try {
      logger.debug({ url: station.url }, "Shazam: capturing audio from radio stream");
      const audioBytes = await dependencies.captureAudioBytes(station.url);
      logger.debug({ bytes: audioBytes.length }, "Shazam: audio captured, querying AudD");
      if (!audioBytes.length || audioBytes.length > CAPTURE_BYTES) throw new Error("Invalid audio excerpt");
      const result = await dependencies.identify(apiKey, audioBytes);
      await buildAndSendResult(waitMsg, result, station.name, copy);
    } catch (err) {
      logger.error({ err }, "Shazam error (radio)");
      await waitMsg.edit(copy.identifyError);
    }

  } else {
    // YouTube — get direct stream URL via yt-dlp, then capture bytes
    const waitMsg = await message.reply(`${copy.source}\n🔗 ${state.youtubeTitle ?? "YouTube"} · ${copy.identifying}`);
    const sourceLabel = state.youtubeTitle ?? "YouTube";
    let directUrl: string;
    try {
      directUrl = await dependencies.getYoutubeDirectUrl(state.youtubeUrl!);
    } catch (err) {
      logger.error({ err }, "Shazam: failed to get YouTube direct URL");
      await waitMsg.edit(copy.streamError);
      return;
    }

    await waitMsg.edit(`${copy.source}\n🔍 ${copy.identifying}`);
    try {
      const audioBytes = await dependencies.captureAudioBytes(directUrl);
      if (!audioBytes.length || audioBytes.length > CAPTURE_BYTES) throw new Error("Invalid audio excerpt");
      const result = await dependencies.identify(apiKey, audioBytes);
      await buildAndSendResult(waitMsg, result, sourceLabel, copy);
    } catch (err) {
      logger.error({ err }, "Shazam error (youtube)");
      await waitMsg.edit(copy.identifyError);
    }
  }
}

// ── Build result embed ────────────────────────────────────────────────────────

async function buildAndSendResult(
  waitMsg: Awaited<ReturnType<Message["reply"]>>,
  result: AuddResult | null,
  sourceLabel: string,
  copy: ReturnType<typeof shazamCopy>,
): Promise<void> {
  if (!result?.title?.trim() || !result.artist?.trim()) {
    await waitMsg.edit(copy.noMatch);
    return;
  }

  const spotifyUrl = result.spotify?.external_urls?.spotify;
  const albumArt   = result.spotify?.album?.images?.[0]?.url;
  const albumName  = result.spotify?.album?.name ?? result.album;
  const year       = (result.spotify?.album?.release_date ?? result.release_date ?? "").slice(0, 4);
  const listenUrl  = spotifyUrl ?? result.song_link ?? result.apple_music?.url;

  const embed = new EmbedBuilder()
    .setColor(0x1db954)
    .setTitle(`🎵 ${copy.identified}`)
    .addFields(
      { name: copy.title,  value: result.title.trim(),  inline: true },
      { name: copy.artist, value: result.artist.trim(), inline: true },
      ...(albumName ? [{ name: copy.album,  value: albumName,                   inline: true }] : []),
      ...(year      ? [{ name: copy.year,   value: year,                         inline: true }] : []),
      ...(listenUrl ? [{ name: copy.listen, value: `[Open link](${listenUrl})`, inline: true }] : []),
    )
    .setFooter({ text: `${copy.footer}: ${sourceLabel}` });

  if (albumArt) embed.setThumbnail(albumArt);

  await waitMsg.edit({ content: "", embeds: [embed] });
}
