import { Message, EmbedBuilder, type MessageReaction, type User } from "discord.js";
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
  duration?: number;
}

async function lrclibFetch(params: Record<string, string>): Promise<LrclibResult[]> {
  const qs = new URLSearchParams(params).toString();
  const resp = await fetch(`https://lrclib.net/api/search?${qs}`, {
    signal: AbortSignal.timeout(20000),
    headers: { "User-Agent": "DiscordBot/1.0" },
  });
  if (!resp.ok) return [];
  return resp.json() as Promise<LrclibResult[]>;
}

async function searchLrcLib(query: string): Promise<{ lines: LrcLine[]; title: string; artist: string; duration: number } | null> {
  const words = query.trim().split(/\s+/);
  const artistGuess = words[0] ?? "";
  const trackGuess = words.slice(1).join(" ");

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
      return { lines, title: hit.trackName, artist: hit.artistName, duration: hit.duration ?? 0 };
    } catch (err) {
      logger.warn({ err, params }, "lrclib strategy failed");
    }
  }
  return null;
}

// ── Karaoke session state ─────────────────────────────────────────────────────

interface KaraokeSession {
  guildId: string;
  channelId: string;
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

// ── Embed builders ────────────────────────────────────────────────────────────

function buildReadyEmbed(title: string, artist: string, lineCount: number, duration: number): EmbedBuilder {
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  return new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle("🎤 Karaoke ready!")
    .setDescription(
      `**${title}** — *${artist}*\n\n` +
      `🎵 Start playing the song on Spotify / YouTube / your phone\n` +
      `then react **▶️** to this message to sync the lyrics!`,
    )
    .addFields(
      { name: "📝 Lyrics", value: `${lineCount} synced lines`, inline: true },
      ...(duration > 0 ? [{ name: "⏱ Duration", value: `${mins}:${secs.toString().padStart(2, "0")}`, inline: true }] : []),
    )
    .setFooter({ text: "React ⏹ at any time to stop · Lyrics synced from lrclib.net" });
}

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
    .setTitle(`🎤 ${songTitle}`)
    .setAuthor({ name: `🎵 ${artistName}` })
    .setDescription(description)
    .setFooter({ text: `⏱ ${mins}:${secs.toString().padStart(2, "0")} · React ⏹ to stop` });
}

function buildFinishedEmbed(title: string, artist: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("🎤 Karaoke finished!")
    .setDescription(`**${title}** by ${artist}\n\nGreat singing! 🌟`)
    .setFooter({ text: "Use !karaoke <song> to sing another one!" });
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

    // Only edit if line changed
    if (currentIdx === session.lastEditedIdx) return;
    session.lastEditedIdx = currentIdx;

    const embed = buildLyricsEmbed(session, currentIdx);
    try {
      await session.embedMessage.edit({ content: "", embeds: [embed] });
    } catch (err) {
      logger.warn({ err }, "Karaoke embed edit failed");
    }

    // Auto-stop 8s after last line
    const lastLine = session.lines[session.lines.length - 1];
    if (lastLine && elapsed > lastLine.time + 8) {
      stopKaraokeSession(session.guildId);
      session.embedMessage.edit({ content: "", embeds: [buildFinishedEmbed(session.songTitle, session.artistName)] }).catch(() => null);
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

export async function stopKaraoke(message: Message): Promise<void> {
  if (!message.guildId) return;
  const stopped = stopKaraokeSession(message.guildId);
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

// ── Public: start ─────────────────────────────────────────────────────────────

export async function startKaraoke(message: Message, query: string): Promise<void> {
  if (!message.guildId) return;
  const guildId = message.guildId;

  if (!query.trim()) {
    await message.reply("❓ Usage: `!karaoke <artist song name>`\nExamples: `!karaoke Queen Bohemian Rhapsody` · `!karaoke indila sos`");
    return;
  }

  // Stop any existing session for this guild
  stopKaraokeSession(guildId);

  const waitMsg = await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle("🎤 Searching lyrics…")
        .setDescription(`🔍 Looking up **${query}** on lrclib.net…`)
        .setFooter({ text: "This may take a few seconds" }),
    ],
  });

  // Search for synced lyrics
  const lrcData = await searchLrcLib(query);

  if (!lrcData) {
    await waitMsg.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🎤 No lyrics found")
          .setDescription(
            `❌ No synchronized lyrics found for **${query}**.\n\n` +
            "Tips:\n" +
            "• Try `!karaoke <Artist> <Song title>` — e.g. `!karaoke Indila Dernière danse`\n" +
            "• Popular songs work best — less mainstream tracks may not be indexed\n" +
            "• lrclib.net has millions of songs but not everything",
          ),
      ],
    });
    return;
  }

  // Show "ready" embed and add sync reactions
  const readyEmbed = buildReadyEmbed(lrcData.title, lrcData.artist, lrcData.lines.length, lrcData.duration);
  await waitMsg.edit({ content: "", embeds: [readyEmbed] });

  await waitMsg.react("▶️").catch(() => null);
  await waitMsg.react("⏹").catch(() => null);

  // Wait for user to react ▶️ to start sync
  const collector = waitMsg.createReactionCollector({
    filter: (r: MessageReaction, u: User) =>
      ["▶️", "⏹"].includes(r.emoji.name ?? "") && !u.bot && u.id === message.author.id,
    time: 5 * 60 * 1000, // 5 min to start
    max: 1,
  });

  collector.on("collect", async (reaction: MessageReaction) => {
    if (reaction.emoji.name === "⏹") {
      await waitMsg.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0x99aab5)
            .setTitle("🎤 Karaoke cancelled")
            .setDescription("Session cancelled before it started."),
        ],
      });
      return;
    }

    // ▶️ — start the sync!
    const session: KaraokeSession = {
      guildId,
      channelId: message.channelId,
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

    // Show first line immediately
    const firstEmbed = buildLyricsEmbed(session, 0);
    try {
      await waitMsg.edit({ content: "", embeds: [firstEmbed] });
    } catch { /* ignore */ }

    startLyricsLoop(session);
  });

  collector.on("end", (_collected, reason) => {
    if (reason === "time") {
      // Timed out waiting for ▶️
      const session = karaokeSessions.get(guildId);
      if (!session) {
        waitMsg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor(0x99aab5)
              .setTitle("🎤 Session expired")
              .setDescription("Karaoke session expired — nobody pressed ▶️ within 5 minutes.\nUse `!karaoke <song>` to try again."),
          ],
        }).catch(() => null);
      }
    }
  });
}
