import { Message, EmbedBuilder } from "discord.js";
import { AudioPlayerStatus, StreamType, getVoiceConnection, createAudioResource } from "@discordjs/voice";
import { spawn, type ChildProcess } from "child_process";
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

async function lrclibFetch(params: Record<string, string>): Promise<LrclibResult[]> {
  const qs = new URLSearchParams(params).toString();
  const resp = await fetch(`https://lrclib.net/api/search?${qs}`, {
    signal: AbortSignal.timeout(20000),
    headers: { "User-Agent": "DiscordBot/1.0 (https://github.com)" },
  });
  if (!resp.ok) return [];
  return resp.json() as Promise<LrclibResult[]>;
}

async function searchLrcLib(query: string): Promise<{ lines: LrcLine[]; title: string; artist: string } | null> {
  const words = query.trim().split(/\s+/);
  const artistGuess = words[0] ?? "";
  const trackGuess = words.slice(1).join(" ");

  // Try multiple search strategies, from most specific to broadest
  const strategies: Record<string, string>[] = [
    { q: query },
    ...(trackGuess ? [{ artist_name: artistGuess, track_name: trackGuess }] : []),
    ...(trackGuess ? [{ track_name: trackGuess }] : []),
    ...(trackGuess ? [{ q: trackGuess }] : []),
  ];

  for (const params of strategies) {
    try {
      const results = await lrclibFetch(params);
      const hit = results.find(r => r.syncedLyrics && r.syncedLyrics.trim().length > 0);
      if (!hit?.syncedLyrics) continue;
      const lines = parseLrc(hit.syncedLyrics);
      if (lines.length === 0) continue;
      return { lines, title: hit.trackName, artist: hit.artistName };
    } catch (err) {
      logger.warn({ err, params }, "lrclib strategy failed");
    }
  }
  return null;
}

// ── yt-dlp helpers ────────────────────────────────────────────────────────────

interface YtInfo {
  url: string;
  title: string;
  duration: number;
  thumbnail: string;
}

function ytDlpSearch(query: string): Promise<YtInfo | null> {
  return new Promise((resolve) => {
    let output = "";
    let errorOutput = "";
    const proc = spawn("yt-dlp", [
      `ytsearch1:${query}`,
      "--print", "%(webpage_url)s\t%(title)s\t%(duration)s\t%(thumbnail)s",
      "--no-playlist",
      "--no-warnings",
      "--ignore-errors",
      "--skip-download",
      "-q",
    ]);
    proc.stdout.on("data", (d: Buffer) => { output += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { errorOutput += d.toString(); });
    proc.on("close", () => {
      if (!output.trim()) {
        if (errorOutput) logger.warn({ query, errorOutput }, "yt-dlp search stderr");
        resolve(null);
        return;
      }
      const parts = output.trim().split("\t");
      resolve({
        url: parts[0] ?? "",
        title: parts[1] ?? query,
        duration: parseInt(parts[2] ?? "0", 10) || 0,
        thumbnail: parts[3] ?? "",
      });
    });
    proc.on("error", (err) => {
      logger.error({ err }, "yt-dlp spawn error");
      resolve(null);
    });
  });
}

function ytDlpStream(videoUrl: string): { stream: ReturnType<ChildProcess["stdout"] & object>; proc: ChildProcess } {
  const proc = spawn("yt-dlp", [
    videoUrl,
    "-f", "bestaudio/best",
    "--no-playlist",
    "-o", "-",
    "-q",
  ]);
  return { stream: proc.stdout as any, proc };
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
  ytProc: ChildProcess | null;
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

// ── Public: stop session ──────────────────────────────────────────────────────

export function stopKaraokeSession(guildId: string): boolean {
  const session = karaokeSessions.get(guildId);
  if (!session) return false;
  session.stopped = true;
  if (session.intervalId) clearInterval(session.intervalId);
  if (session.ytProc) {
    try { session.ytProc.kill("SIGTERM"); } catch { /* ignore */ }
  }
  karaokeSessions.delete(guildId);
  return true;
}

export function isKaraokeActive(guildId: string): boolean {
  return karaokeSessions.has(guildId);
}

// ── Public: !karaoke stop ─────────────────────────────────────────────────────

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

// ── Public: !karaoke <query> ──────────────────────────────────────────────────

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
          `✅ **${lrcData.lines.length} synced lines** — **${lrcData.title}** by ${lrcData.artist}\n\n` +
          "🎵 Searching audio on YouTube…",
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

  // 3. Search YouTube via yt-dlp (instrumental → normal)
  const searchVariants = [
    `${lrcData.artist} ${lrcData.title} instrumental karaoke`,
    `${lrcData.artist} ${lrcData.title} instrumental`,
    `${lrcData.artist} ${lrcData.title}`,
  ];

  let videoInfo: YtInfo | null = null;
  for (const q of searchVariants) {
    videoInfo = await ytDlpSearch(q);
    if (videoInfo?.url) break;
  }

  if (!videoInfo?.url) {
    stopKaraokeSession(guildId);
    getVoiceConnection(guildId)?.destroy();
    await waitMsg.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🎤 Audio not found")
          .setDescription(
            "❌ Could not find audio on YouTube for this song.\n" +
            "Try `!karaoke <artist> <song name>` with a more specific query.",
          ),
      ],
    });
    return;
  }

  // 4. Get radio state (player)
  const radioState = radioStates.get(guildId);
  if (!radioState) {
    await waitMsg.edit("❌ Voice connection lost. Try again.");
    return;
  }

  // 5. Stream audio via yt-dlp → ffmpeg → discord player
  try {
    const { stream, proc } = ytDlpStream(videoInfo.url);

    proc.on("error", (err) => {
      logger.error({ err }, "yt-dlp stream process error");
    });

    const resource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
    });

    radioState.stationKey = null;
    radioState.youtubeTitle = `🎤 ${lrcData.title}`;
    radioState.youtubeUrl = videoInfo.url;
    radioState.queue = [];
    radioState.player.play(resource);

    // 6. Start lyrics loop when audio actually begins
    radioState.player.once(AudioPlayerStatus.Playing, async () => {
      const mins = Math.floor(videoInfo!.duration / 60);
      const secs = videoInfo!.duration % 60;

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
        ytProc: proc,
      };
      karaokeSessions.set(guildId, session);

      const firstEmbed = buildLyricsEmbed(session, 0);
      if (videoInfo!.duration > 0) {
        firstEmbed.addFields(
          {
            name: "🎵 Video",
            value: videoInfo!.title.length > 50 ? videoInfo!.title.slice(0, 50) + "…" : videoInfo!.title,
            inline: true,
          },
          {
            name: "⏱ Duration",
            value: `${mins}:${secs.toString().padStart(2, "0")}`,
            inline: true,
          },
        );
      }
      if (videoInfo!.thumbnail) firstEmbed.setThumbnail(videoInfo!.thumbnail);

      try {
        await waitMsg.edit({ content: "", embeds: [firstEmbed] });
      } catch { /* message might have been deleted */ }

      startLyricsLoop(session);
    });

    // Cleanup on player error
    radioState.player.once("error", async (err) => {
      logger.error({ err, url: videoInfo?.url }, "Karaoke playback error");
      stopKaraokeSession(guildId);
      await waitMsg.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("🎤 Playback error")
            .setDescription("❌ Audio playback failed. Please try again."),
        ],
      });
      radioStates.delete(guildId);
      getVoiceConnection(guildId)?.destroy();
    });

    // Show "finished" embed when song ends naturally
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
    logger.error({ err, url: videoInfo.url }, "Karaoke stream error");
    stopKaraokeSession(guildId);
    getVoiceConnection(guildId)?.destroy();
    await waitMsg.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🎤 Error")
          .setDescription("❌ Failed to start the audio stream. Please try again."),
      ],
    });
  }
}
