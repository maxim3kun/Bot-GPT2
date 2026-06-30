import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type Message, type ButtonInteraction, AttachmentBuilder, ChannelType } from "discord.js";
import { spawn } from "child_process";
import { PassThrough } from "stream";
import { ytdlpSearch, cleanYouTubeTitle } from "../lib/ytdlp.js";
import { logger } from "../lib/logger.js";

const THEME_QUERIES: Record<string, string[]> = {
  pop:      ["best pop songs 2020","best pop hits 2019","top pop songs 2022"],
  rock:     ["best rock songs all time","classic rock hits","best rock 2000s"],
  hiphop:   ["best hip hop songs ever","best rap songs 2020","top hip hop hits"],
  rnb:      ["best r&b songs 2020","top rnb hits","best soul songs"],
  electronic:["best electronic music hits","top EDM songs","best house music"],
  kpop:     ["best kpop songs","kpop hits 2022","best kpop 2021"],
  french:   ["meilleures chansons françaises","hits français 2020","meilleurs tubes français"],
  lofi:     ["lofi hip hop songs","chill lofi beats popular","best lofi songs"],
  gaming:   ["best video game ost","iconic video game music","famous game soundtracks"],
  "80s":    ["best songs of the 80s","80s greatest hits","80s pop hits"],
  "90s":    ["best songs of the 90s","90s greatest hits","90s pop hits"],
  anime:    ["best anime openings","famous anime theme songs","iconic anime ost"],
};

const YT_DLP_BIN = `${process.env["HOME"] ?? "/home/runner"}/.local/bin/yt-dlp`;

interface Round {
  title: string;
  artist: string | null;
  url: string;
  choices: string[];
  correctIdx: number;
}

interface BlindtestSession {
  theme: string;
  mode: "easy" | "hard";
  round: number;
  maxRounds: number;
  rounds: Round[];
  scores: Map<string, { name: string; pts: number }>;
  roundActive: boolean;
  promptMsgId?: string;
  hardAnswered: Set<string>;
  channelId: string;
  guildId: string;
  roundTimeout?: ReturnType<typeof setTimeout>;
}

const sessions = new Map<string, BlindtestSession>();

async function extractClip(url: string): Promise<Buffer | null> {
  return new Promise(resolve => {
    const ANDROID_ARGS = "--extractor-args=youtube:player_client=android;formats=missing_pot";

    const ytdlp = spawn(YT_DLP_BIN, [
      "-f", "bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best",
      "--no-playlist", "--quiet", "--no-warnings",
      "--no-part", "--no-cache-dir", "--no-check-formats",
      "--retries", "1", "--socket-timeout", "8",
      ANDROID_ARGS, "-o", "-", url,
    ]);

    const ffmpeg = spawn("ffmpeg", [
      "-i", "pipe:0",
      "-ss", "30",
      "-t", "25",
      "-af", "afade=t=in:st=0:d=1,afade=t=out:st=23:d=2",
      "-f", "mp3",
      "-ar", "44100", "-ac", "2",
      "-b:a", "96k",
      "-loglevel", "quiet",
      "pipe:1",
    ]);

    ytdlp.stdout.pipe(ffmpeg.stdin);

    const chunks: Buffer[] = [];
    ffmpeg.stdout.on("data", (c: Buffer) => chunks.push(c));
    ffmpeg.stdout.on("end", () => resolve(Buffer.concat(chunks)));
    ffmpeg.on("error", () => resolve(null));
    ytdlp.on("error", () => { ffmpeg.kill(); resolve(null); });

    setTimeout(() => { ytdlp.kill(); ffmpeg.kill(); resolve(null); }, 45_000);
  });
}

async function buildRound(theme: string, usedUrls: Set<string>): Promise<Round | null> {
  const queries = THEME_QUERIES[theme] ?? [`best ${theme} songs`];
  const query = queries[Math.floor(Math.random() * queries.length)]!;
  try {
    const results = await ytdlpSearch(query, 10);
    const unused = results.filter(r => !usedUrls.has(r.url) && !r.isLive && r.duration > 60 && r.duration < 600);
    if (!unused.length) return null;
    const pick = unused[Math.floor(Math.random() * unused.length)]!;
    usedUrls.add(pick.url);

    const cleanTitle = cleanYouTubeTitle(pick.title);
    const [artist, songTitle] = cleanTitle.includes(" - ") ? cleanTitle.split(" - ") as [string, string] : [pick.channel ?? null, cleanTitle];

    const wrongPool = results
      .filter(r => r.url !== pick.url)
      .map(r => cleanYouTubeTitle(r.title).split(" - ").pop() ?? cleanYouTubeTitle(r.title))
      .filter(t => t !== songTitle)
      .slice(0, 5);

    if (wrongPool.length < 3) return null;

    const wrongs = wrongPool.sort(() => Math.random() - 0.5).slice(0, 3);
    const correctDisplay = songTitle;
    const allChoices = [correctDisplay, ...wrongs].sort(() => Math.random() - 0.5);
    const correctIdx = allChoices.indexOf(correctDisplay);

    return { title: correctDisplay, artist: artist ?? null, url: pick.url, choices: allChoices, correctIdx };
  } catch (e) {
    logger.warn({ e }, "blindtest: failed to build round");
    return null;
  }
}

function buildScoreEmbed(session: BlindtestSession, title?: string): EmbedBuilder {
  const sorted = [...session.scores.values()].sort((a, b) => b.pts - a.pts);
  const board = sorted.length
    ? sorted.map((s, i) => `${["🥇","🥈","🥉"][i] ?? `**${i+1}.**`} ${s.name} — **${s.pts} pt${s.pts !== 1 ? "s" : ""}**`).join("\n")
    : "*No scores yet*";
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(title ?? "🎵 Blind Test — Leaderboard")
    .setDescription(board);
}

export async function startBlindtest(message: Message, args: string[]): Promise<void> {
  if (!message.guildId) { await message.reply("❌ Server only."); return; }
  const guildId = message.guildId;
  if (sessions.has(guildId)) { await message.reply("⚠️ A blind test is already running in this server. Finish it first."); return; }

  const theme = (args[0] ?? "pop").toLowerCase();
  const mode = (args[1] ?? "easy").toLowerCase() === "hard" ? "hard" : "easy";
  const available = Object.keys(THEME_QUERIES).join(", ");

  if (!THEME_QUERIES[theme]) {
    await message.reply(`🎵 **Available themes:** ${available}\nUsage: \`!blindtest <theme> [easy|hard]\``);
    return;
  }

  const wait = await message.reply(`🎵 Starting **Blind Test** — theme: **${theme}** — mode: **${mode}**\nLoading round 1…`);

  const session: BlindtestSession = {
    theme, mode, round: 0, maxRounds: 10,
    rounds: [], scores: new Map(), roundActive: false,
    hardAnswered: new Set(), channelId: message.channelId, guildId,
  };
  sessions.set(guildId, session);

  const usedUrls = new Set<string>();
  await playNextRound(session, message.channel as Message["channel"], wait);
}

async function playNextRound(session: BlindtestSession, channel: Message["channel"], waitMsg?: Message): Promise<void> {
  if (!("send" in channel)) return;

  session.round++;
  session.hardAnswered.clear();

  const round = await buildRound(session.theme, new Set(session.rounds.map(r => r.url)));
  if (!round) {
    await channel.send("❌ Couldn't find enough songs for this round. Ending blind test.");
    sessions.delete(session.guildId);
    return;
  }
  session.rounds.push(round);

  const clip = await extractClip(round.url);
  if (!clip || clip.length < 1000) {
    await channel.send(`⏩ Couldn't extract audio for round ${session.round}. Skipping…`);
    if (session.round < session.maxRounds) {
      await playNextRound(session, channel);
    } else {
      await endBlindtest(session, channel);
    }
    return;
  }

  const attach = new AttachmentBuilder(clip, { name: `blindtest_r${session.round}.mp3` });
  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`🎵 Round ${session.round}/${session.maxRounds} — Identify this song!`)
    .setDescription(
      session.mode === "easy"
        ? "🎧 Listen to the clip and pick the correct answer:"
        : "🎧 Listen to the clip and **type your answer** in chat! (15 seconds)",
    )
    .setFooter({ text: `Theme: ${session.theme}  |  Mode: ${session.mode}` });

  let promptMsg: Message;
  if (session.mode === "easy") {
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...round.choices.map((c, i) =>
        new ButtonBuilder().setCustomId(`bt:ans:${i}`).setLabel(c).setStyle(ButtonStyle.Primary),
      ),
    );
    if (waitMsg) {
      promptMsg = await waitMsg.edit({ content: "", embeds: [embed], files: [attach], components: [buttons] });
    } else {
      promptMsg = await channel.send({ embeds: [embed], files: [attach], components: [buttons] });
    }
  } else {
    if (waitMsg) {
      promptMsg = await waitMsg.edit({ content: "", embeds: [embed], files: [attach], components: [] });
    } else {
      promptMsg = await channel.send({ embeds: [embed], files: [attach] });
    }
  }

  session.promptMsgId = promptMsg.id;
  session.roundActive = true;

  const revealAfter = session.mode === "hard" ? 15_000 : 30_000;
  session.roundTimeout = setTimeout(async () => {
    if (!session.roundActive) return;
    await revealAnswer(session, channel, []);
  }, revealAfter);
}

async function revealAnswer(session: BlindtestSession, channel: Message["channel"], correctUsers: string[]): Promise<void> {
  if (!session.roundActive) return;
  session.roundActive = false;
  if (session.roundTimeout) clearTimeout(session.roundTimeout);
  if (!("send" in channel)) return;

  const round = session.rounds[session.rounds.length - 1]!;
  const artistStr = round.artist ? ` — ${round.artist}` : "";
  const winnerLine = correctUsers.length
    ? `🎉 Got it: ${correctUsers.map(u => `<@${u}>`).join(", ")}`
    : "❌ Nobody got it this round!";

  await channel.send({
    content: `✅ The answer was **${round.title}${artistStr}**\n${winnerLine}`,
    embeds: [buildScoreEmbed(session, `🏆 Round ${session.round} — Leaderboard`)],
  });

  try {
    if (session.promptMsgId) {
      const msg = await (channel as import("discord.js").TextChannel).messages.fetch(session.promptMsgId);
      await msg.edit({ components: [] });
    }
  } catch { /* ignore */ }

  if (session.round < session.maxRounds) {
    await new Promise(r => setTimeout(r, 3000));
    await playNextRound(session, channel);
  } else {
    await endBlindtest(session, channel);
  }
}

async function endBlindtest(session: BlindtestSession, channel: Message["channel"]): Promise<void> {
  sessions.delete(session.guildId);
  if (!("send" in channel)) return;
  const sorted = [...session.scores.values()].sort((a, b) => b.pts - a.pts);
  const winner = sorted[0];
  await channel.send({
    content: winner ? `🏆 **Blind Test Over!** Winner: **${winner.name}** with **${winner.pts} points**!` : "🎵 **Blind Test Over!** No one scored this time.",
    embeds: [buildScoreEmbed(session, "🏆 Final Leaderboard")],
  });
}

export async function handleBlindtestButton(interaction: ButtonInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) return;
  const session = sessions.get(guildId);
  if (!session || !session.roundActive) {
    await interaction.reply({ content: "❌ No active round right now.", ephemeral: true });
    return;
  }
  if (interaction.message.id !== session.promptMsgId) {
    await interaction.reply({ content: "❌ This round is outdated.", ephemeral: true });
    return;
  }

  const chosen = parseInt(interaction.customId.split(":")[2] ?? "0");
  const round = session.rounds[session.rounds.length - 1]!;
  const userId = interaction.user.id;

  if (session.hardAnswered.has(userId)) {
    await interaction.reply({ content: "⏳ You already answered this round!", ephemeral: true });
    return;
  }
  session.hardAnswered.add(userId);

  if (chosen === round.correctIdx) {
    const pts = 1;
    const entry = session.scores.get(userId) ?? { name: interaction.user.displayName, pts: 0 };
    entry.pts += pts;
    session.scores.set(userId, entry);
    await interaction.reply({ content: `✅ Correct! **+${pts} point**`, ephemeral: true });
  } else {
    await interaction.reply({ content: `❌ Wrong! The answer was **${round.choices[round.correctIdx]}**`, ephemeral: true });
  }
}

export async function handleBlindtestMessage(message: Message): Promise<boolean> {
  if (!message.guildId) return false;
  const session = sessions.get(message.guildId);
  if (!session || session.mode !== "hard" || !session.roundActive) return false;

  const userId = message.author.id;
  if (session.hardAnswered.has(userId)) return false;

  const round = session.rounds[session.rounds.length - 1]!;
  const answer = message.content.trim().toLowerCase();
  const correct = round.title.toLowerCase();

  function lev(a: string, b: string): number {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
      dp[i]![j] = a[i-1] === b[j-1] ? dp[i-1]![j-1]! : 1 + Math.min(dp[i-1]![j]!, dp[i]![j-1]!, dp[i-1]![j-1]!);
    return dp[m]![n]!;
  }

  const isCorrect = correct.includes(answer) || answer.includes(correct) || lev(answer, correct) <= 3;
  if (isCorrect) {
    session.hardAnswered.add(userId);
    const entry = session.scores.get(userId) ?? { name: message.author.displayName, pts: 0 };
    entry.pts += 2;
    session.scores.set(userId, entry);
    await message.react("✅");

    if (session.roundTimeout) clearTimeout(session.roundTimeout);
    await revealAnswer(session, message.channel, [userId]);
    return true;
  }
  return false;
}

export function getActiveBlindtest(guildId: string): BlindtestSession | undefined {
  return sessions.get(guildId);
}
