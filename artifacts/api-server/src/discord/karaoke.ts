import { Message, EmbedBuilder } from "discord.js";
import { AudioPlayerStatus, StreamType, getVoiceConnection, createAudioResource } from "@discordjs/voice";
import { ensureVoiceConnection, radioStates } from "./radio";
import { logger } from "../lib/logger";

// ── LRC types & parser ────────────────────────────────────────────────────────

interface LrcLine {
  time: number;
  text: string;
}

function parseLrc(lrc: string): LrcLine[] {
  const lines: LrcLine[] = [];
  for (const rawLine of lrc.split("\n")) {
    const match = rawLine.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
    if (!match) continue;
    const mins = parseInt(match[1]!, 10);
    const secs = parseInt(match[2]!, 10);
    const msStr = match[3]!.padEnd(3, "0");
    const ms = parseInt(msStr, 10);
    const text = match[4]!.trim();
    if (!text) continue;
    lines.push({ time: mins * 60 + secs + ms / 1000, text });
  }
  return lines.sort((a, b) => a.time - b.time);
}

// ── lrclib.net API ────────────────────────────────────────────────────────────

interface LrclibResult {
  trackName: string;
  artistName: string;
  syncedLyrics: string | null;
}

async function searchLrcLib(query: string): Promise<{ lines: LrcLine[]; title: string; artist: string } | null> {
  try {
    const url = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return null;
    const results = await resp.json() as LrclibResult[];
    const hit = results.find(r => r.syncedLyrics && r.syncedLyrics.trim().length > 0);
    if (!hit?.syncedLyrics) return null;
    const lines = parseLrc(hit.syncedLyrics);
    if (lines.length === 0) return null;
    return { lines, title: hit.trackName, artist: hit.artistName };
  } catch (err) {
    logger.error({ err }, "lrclib search error");
    return null;
  }
}

// ── Karaoke session state ─────────────────────────────────────────────────────

interface KaraokeSession {
  guildId: string;
  lines: LrcLine[];
  embedMessage: Message;
  startTime: number;
  intervalId: NodeJS.Timeout | null;
  stopped: boolean;
  songTitle: string;
  artistName: string;
  lastEditedIdx: number;
}

const karaokeSessions = new Map<string, KaraokeSession>();

// ── Embed builder ─────────────────────────────────────────────────────────────

function buildLyricsEmbed(session: KaraokeSession, currentIdx: number): EmbedBuilder {
  const { lines, songTitle, artistName } = session;
  const elapsed = (Date.now() - session.startTime) / 1000;
  const mins = Math.floor(elapsed / 60);
  const secs = Math.floor(elapsed % 60);

  const prevLine = currentIdx > 0 ? lines[currentIdx - 1]?.text : null;
  const curLine = lines[currentIdx]?.text ?? "🎵";
  const nextLine = lines[currentIdx + 1]?.text ?? null;

  let description = "";
  if (prevLine) description += `*${prevLine}*\n\n`;
  description += `**▶ ${curLine}**`;
  if (nextLine) description += `\n\n*${nextLine}*`;

  return new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle(`🎤 Karaoke — ${songTitle}`)
    .setAuthor({ name: `🎵 ${artistName}` })
    .setDescription(description)
    .setFooter({ text: `⏱ ${mins}:${secs.toString().padStart(2, "0")} · !karaoke stop to end` });
}

// ── Session loop ──────────────────────────────────────────────────────────────

function getCurrentLineIndex(lines: LrcLine[], elapsedSeconds: number): number {
  let idx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.time <= elapsedSeconds) idx = i;
    else break;
  }
  return idx;
}

function startLyricsLoop(session: KaraokeSession): void {
  session.intervalId = setInterval(async () => {
    if (session.stopped) {
      if (session.intervalId) clearInterval(session.intervalId);
      return;
    }

    const elapsed = (Date.now() - session.startTime) / 1000;
    const currentIdx = getCurrentLineIndex(session.lines, elapsed);

    if (currentIdx === session.lastEditedIdx) return;
    session.lastEditedIdx = currentIdx;

    const embed = buildLyricsEmbed(session, currentIdx);
    try {
      await session.embedMessage.edit({ content: "", embeds: [embed] });
    } catch (err) {
      logger.warn({ err }, "Karaoke embed edit failed");
    }

    const lastLine = session.lines[session.lines.length - 1];
    if (lastLine && elapsed > lastLine.time + 10) {
      stopKaraokeSession(session.guildId);
    }
  }, 1500);
}

// ── Public: stop ──────────────────────────────────────────────────────────────

export function stopKaraokeSession(guildId: string): boolean {
  const session = karaokeSessions.get(guildId);
  if (!session) return false;
  session.stopped = true;
  if (session.intervalId) clearInterval(session.intervalId);
  karaokeSessions.delete(guildId);
  return true;
}

export function isKaraokeActive(guildId: string): boolean {
  return karaokeSessions.has(guildId);
}

// ── Public: stop command ──────────────────────────────────────────────────────

export async function stopKaraoke(message: Message): Promise<void> {
  if (!message.guildId) return;
  const guildId = message.guildId;

  const stopped = stopKaraokeSession(guildId);
  const radioState = radioStates.get(guildId);
  if (radioState) {
    radioState.player.stop();
    radioStates.delete(guildId);
  }
  getVoiceConnection(guildId)?.destroy();

  if (!stopped) {
    await message.reply("🤷 No karaoke session is currently running.");
  } else {
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x9b59b6)
          .setTitle("🎤 Karaoke stopped")
          .setDescription("Thanks for singing! 🎶")
          .setFooter({ text: "Use !karaoke <song> to start a new session" }),
      ],
    });
  }
}

// ── Public: start command ─────────────────────────────────────────────────────

export async function startKaraoke(message: Message, query: string): Promise<void> {
  if (!message.guildId) return;
  const guildId = message.guildId;

  if (!query.trim()) {
    await message.reply("❓ Usage: `!karaoke <artist song name>`\nExample: `!karaoke Queen Bohemian Rhapsody`");
    return;
  }

  stopKaraokeSession(guildId);

  const waitMsg = await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle("🎤 Karaoke starting…")
        .setDescription(`🔍 Searching synchronized lyrics for **${query}**…`)
        .setFooter({ text: "This may take a few seconds" }),
    ],
  });

  // 1. Fetch synchronized lyrics from lrclib.net
  const lrcData = await searchLrcLib(query);
  if (!lrcData) {
    await waitMsg.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🎤 No lyrics found")
          .setDescription(
            `❌ No synchronized lyrics found for **${query}** on lrclib.net.\n\n` +
            "Try being more specific — e.g. `!karaoke Queen Bohemian Rhapsody`",
          )
          .setFooter({ text: "lrclib.net only has synced lyrics for popular songs" }),
      ],
    });
    return;
  }

  await waitMsg.edit({
    embeds: [
      new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle("🎤 Lyrics found!")
        .setDescription(
          `✅ Found **${lrcData.lines.length} synced lines** for **${lrcData.title}** by ${lrcData.artist}\n\n` +
          "🎵 Loading audio from YouTube…",
        )
        .setFooter({ text: "Searching for instrumental version first…" }),
    ],
  });

  // 2. Join voice channel
  const ready = await ensureVoiceConnection(message);
  if (!ready) {
    await waitMsg.edit("❌ You need to be in a voice channel first!");
    return;
  }

  // 3. Search YouTube: instrumental first, then normal
  let videoUrl: string | null = null;
  let videoTitle: string = lrcData.title;
  let videoDuration = 0;
  let videoThumbnail: string | null = null;

  const searchVariants = [
    `${lrcData.artist} ${lrcData.title} instrumental karaoke`,
    `${lrcData.artist} ${lrcData.title} instrumental`,
    `${lrcData.artist} ${lrcData.title}`,
    query,
  ];

  try {
    const play = await import("play-dl");
    for (const q of searchVariants) {
      try {
        const results = await play.search(q, { source: { youtube: "video" }, limit: 1 });
        if (results.length > 0 && results[0]?.url) {
          videoUrl = results[0].url;
          videoTitle = results[0].title ?? lrcData.title;
          videoDuration = results[0].durationInSec ?? 0;
          videoThumbnail = results[0].thumbnails?.[0]?.url ?? null;
          break;
        }
      } catch {
        continue;
      }
    }
  } catch (err) {
    logger.error({ err }, "play-dl search error");
  }

  if (!videoUrl) {
    stopKaraokeSession(guildId);
    getVoiceConnection(guildId)?.destroy();
    await waitMsg.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🎤 Audio not found")
          .setDescription("❌ Could not find audio on YouTube for this song.\nTry `!karaoke <artist> <song name>` with a more specific query."),
      ],
    });
    return;
  }

  // 4. Stream audio
  const radioState = radioStates.get(guildId);
  if (!radioState) {
    await waitMsg.edit("❌ Voice connection lost. Try again.");
    return;
  }

  try {
    const play = await import("play-dl");
    const stream = await play.stream(videoUrl, { quality: 2 });
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type as unknown as StreamType,
    });

    radioState.stationKey = null;
    radioState.youtubeTitle = `🎤 ${lrcData.title}`;
    radioState.youtubeUrl = videoUrl;
    radioState.queue = [];
    radioState.player.play(resource);

    // 5. Wait for playback to actually start, then launch lyrics loop
    radioState.player.once(AudioPlayerStatus.Playing, async () => {
      const mins = Math.floor(videoDuration / 60);
      const secs = videoDuration % 60;

      const session: KaraokeSession = {
        guildId,
        lines: lrcData.lines,
        embedMessage: waitMsg,
        startTime: Date.now(),
        intervalId: null,
        stopped: false,
        songTitle: lrcData.title,
        artistName: lrcData.artist,
        lastEditedIdx: -1,
      };
      karaokeSessions.set(guildId, session);

      const firstEmbed = buildLyricsEmbed(session, 0);
      firstEmbed.addFields(
        {
          name: "🎵 Video",
          value: videoTitle.length > 50 ? videoTitle.slice(0, 50) + "…" : videoTitle,
          inline: true,
        },
        {
          name: "⏱ Duration",
          value: videoDuration > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : "Unknown",
          inline: true,
        },
      );
      if (videoThumbnail) firstEmbed.setThumbnail(videoThumbnail);

      try {
        await waitMsg.edit({ content: "", embeds: [firstEmbed] });
      } catch {
        // message might have been deleted
      }

      startLyricsLoop(session);
    });

    // Clean up if player errors
    radioState.player.once("error", async (err) => {
      logger.error({ err, videoUrl }, "Karaoke playback error");
      stopKaraokeSession(guildId);
      await waitMsg.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("🎤 Playback error")
            .setDescription("❌ Audio playback failed. The video may be unavailable or age-restricted."),
        ],
      });
      radioStates.delete(guildId);
      getVoiceConnection(guildId)?.destroy();
    });

    // Clean up when song ends
    radioState.player.once(AudioPlayerStatus.Idle, () => {
      const session = karaokeSessions.get(guildId);
      if (!session || session.stopped) return;
      stopKaraokeSession(guildId);
      waitMsg.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle("🎤 Karaoke finished!")
            .setDescription(`**${lrcData.title}** by ${lrcData.artist}\n\nGreat singing! 🌟`)
            .setFooter({ text: "Use !karaoke <song> to sing another one!" }),
        ],
      }).catch(() => null);
    });

  } catch (err) {
    logger.error({ err, videoUrl }, "Karaoke stream error");
    stopKaraokeSession(guildId);
    getVoiceConnection(guildId)?.destroy();
    await waitMsg.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🎤 Error")
          .setDescription("❌ Failed to start audio stream. Please try again."),
      ],
    });
  }
}
