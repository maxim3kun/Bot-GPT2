import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type Message, type ButtonInteraction, type Guild } from "discord.js";
import { logger } from "../lib/logger.js";
import { mgLeaderboardCol } from "../lib/db.js";

const PRIZE_LADDER = [100,200,500,1_000,2_000,4_000,8_000,16_000,32_000,64_000,125_000,250_000,500_000,750_000,1_000_000];
const CHECKPOINTS: number[] = [4, 9]; // indices (0-based): questions 5 and 10

// ── In-memory leaderboard fallback ───────────────────────────────────────────

interface LbEntry {
  userId: string; guildId: string; username: string; avatarUrl?: string;
  bestScore: number; gamesPlayed: number; totalWon: number; wins: number; lastPlayed: Date;
}
const memLb = new Map<string, LbEntry>(); // key = `${guildId}:${userId}`

async function saveScore(userId: string, guildId: string, username: string, avatarUrl: string | undefined, prize: number, won: boolean): Promise<void> {
  const key = `${guildId}:${userId}`;
  if (mgLeaderboardCol) {
    try {
      await mgLeaderboardCol.updateOne(
        { userId, guildId },
        {
          $set: { username, avatarUrl, lastPlayed: new Date() },
          $max: { bestScore: prize },
          $inc: { gamesPlayed: 1, totalWon: prize, wins: won ? 1 : 0 },
        },
        { upsert: true },
      );
    } catch (err) { logger.error({ err }, "mg leaderboard save error"); }
    return;
  }
  // in-memory fallback
  const existing = memLb.get(key);
  memLb.set(key, {
    userId, guildId, username, avatarUrl,
    bestScore: Math.max(prize, existing?.bestScore ?? 0),
    gamesPlayed: (existing?.gamesPlayed ?? 0) + 1,
    totalWon: (existing?.totalWon ?? 0) + prize,
    wins: (existing?.wins ?? 0) + (won ? 1 : 0),
    lastPlayed: new Date(),
  });
}

async function getLeaderboard(guildId: string): Promise<LbEntry[]> {
  if (mgLeaderboardCol) {
    try {
      return await mgLeaderboardCol
        .find({ guildId })
        .sort({ bestScore: -1 })
        .limit(10)
        .toArray() as LbEntry[];
    } catch (err) { logger.error({ err }, "mg leaderboard fetch error"); }
  }
  return [...memLb.values()]
    .filter(e => e.guildId === guildId)
    .sort((a, b) => b.bestScore - a.bestScore)
    .slice(0, 10);
}

// ── Types ────────────────────────────────────────────────────────────────────

interface OtdbQuestion {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: "easy" | "medium" | "hard";
}

interface MGSession {
  userId: string;
  channelId: string;
  guildId: string;
  username: string;
  avatarUrl?: string;
  questionIndex: number;
  questions: Array<{ text: string; answers: string[]; correctIdx: number }>;
  lifelines: { fiftyfifty: boolean; phone: boolean; audience: boolean };
  safeAmount: number;
  active: boolean;
  msgId?: string;
}

const sessions = new Map<string, MGSession>();

// ── Helpers ──────────────────────────────────────────────────────────────────

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&ldquo;/g, "\u201c")
    .replace(/&rdquo;/g, "\u201d").replace(/&lsquo;/g, "\u2018").replace(/&rsquo;/g, "\u2019")
    .replace(/&ndash;/g, "\u2013").replace(/&mdash;/g, "\u2014");
}

async function fetchQuestions(): Promise<MGSession["questions"] | null> {
  const sets = [
    "amount=5&type=multiple&difficulty=easy",
    "amount=5&type=multiple&difficulty=medium",
    "amount=5&type=multiple&difficulty=hard",
  ];
  const raw: OtdbQuestion[] = [];
  for (const q of sets) {
    try {
      const res = await fetch(`https://opentdb.com/api.php?${q}`);
      const json = await res.json() as { response_code: number; results: OtdbQuestion[] };
      if (json.response_code !== 0) return null;
      raw.push(...json.results);
    } catch { return null; }
  }
  return raw.map(q => {
    const wrong = q.incorrect_answers.map(decodeHtml);
    const correct = decodeHtml(q.correct_answer);
    const answers = [...wrong, correct].sort(() => Math.random() - 0.5);
    const correctIdx = answers.indexOf(correct);
    return { text: decodeHtml(q.question), answers, correctIdx };
  });
}

const LETTER = ["A","B","C","D"] as const;

const MEDAL = ["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];

function fmt(n: number): string {
  return `€${n.toLocaleString("en-US")}`;
}

// ── Embed builders ────────────────────────────────────────────────────────────

function buildMgEmbed(session: MGSession): EmbedBuilder {
  const qi = session.questionIndex;
  const q = session.questions[qi]!;
  const prize = PRIZE_LADDER[qi]!.toLocaleString("en-US");
  const safe = session.safeAmount > 0 ? fmt(session.safeAmount) : "€0";
  const next = qi < PRIZE_LADDER.length - 1 ? fmt(PRIZE_LADDER[qi + 1]!) : "—";

  const lifelineStatus = [
    session.lifelines.fiftyfifty ? "~~50/50~~" : "**50/50**",
    session.lifelines.phone ? "~~📞~~" : "**📞**",
    session.lifelines.audience ? "~~👥~~" : "**👥**",
  ].join("  ·  ");

  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`🎯 Question ${qi + 1} of 15 — 💰 €${prize}`)
    .setDescription(`### ${q.text}`)
    .addFields(
      { name: "A", value: q.answers[0] ?? "—", inline: true },
      { name: "B", value: q.answers[1] ?? "—", inline: true },
      { name: "\u200b", value: "\u200b", inline: true },
      { name: "C", value: q.answers[2] ?? "—", inline: true },
      { name: "D", value: q.answers[3] ?? "—", inline: true },
      { name: "\u200b", value: "\u200b", inline: true },
    )
    .setFooter({ text: `Safe: ${safe}  |  Next milestone: ${next}  |  Lifelines: ${lifelineStatus}` });
}

function buildMgButtons(session: MGSession, disabled = false): ActionRowBuilder<ButtonBuilder>[] {
  const answerRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...["A","B","C","D"].map((letter, i) =>
      new ButtonBuilder()
        .setCustomId(`mg:ans:${i}`)
        .setLabel(letter)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled),
    ),
  );
  const lifelineRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("mg:lifeline:5050").setLabel("50/50").setStyle(ButtonStyle.Secondary).setDisabled(disabled || session.lifelines.fiftyfifty),
    new ButtonBuilder().setCustomId("mg:lifeline:phone").setLabel("📞 Phone").setStyle(ButtonStyle.Secondary).setDisabled(disabled || session.lifelines.phone),
    new ButtonBuilder().setCustomId("mg:lifeline:audience").setLabel("👥 Audience").setStyle(ButtonStyle.Secondary).setDisabled(disabled || session.lifelines.audience),
    new ButtonBuilder().setCustomId("mg:walkaway").setLabel("🚶 Walk Away").setStyle(ButtonStyle.Danger).setDisabled(disabled),
  );
  return [answerRow, lifelineRow];
}

// ── Leaderboard display ───────────────────────────────────────────────────────

export async function showMillionLeaderboard(message: Message): Promise<void> {
  if (!message.guildId) { await message.reply("❌ Server only."); return; }

  const entries = await getLeaderboard(message.guildId);

  if (entries.length === 0) {
    await message.reply("📊 No games recorded yet in this server. Start one with `!milliongame`!");
    return;
  }

  const guild = message.guild as Guild;

  const rows = entries.map((e, i) => {
    const medal = MEDAL[i] ?? `${i + 1}.`;
    const winBadge = e.wins > 0 ? ` 🏆×${e.wins}` : "";
    return `${medal} **${e.username}**${winBadge}\n> Best: **${fmt(e.bestScore)}** · Total: ${fmt(e.totalWon)} · ${e.gamesPlayed} game${e.gamesPlayed !== 1 ? "s" : ""}`;
  });

  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`💰 Million Game — Leaderboard  ·  ${guild.name}`)
    .setDescription(rows.join("\n\n"))
    .setThumbnail(guild.iconURL() ?? null)
    .setFooter({ text: "Best prize won per player  •  !milliongame to play" })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

// ── Game start ────────────────────────────────────────────────────────────────

export async function startMillionGame(message: Message): Promise<void> {
  if (!message.guildId) { await message.reply("❌ Server only."); return; }

  if (sessions.has(message.author.id)) {
    await message.reply("⚠️ You already have an active game! Finish it first.");
    return;
  }

  const wait = await message.reply("⏳ Loading 15 questions from Open Trivia Database…");

  const questions = await fetchQuestions();
  if (!questions || questions.length < 15) {
    await wait.edit("❌ Failed to load questions. The Open Trivia Database may be unavailable — try again in a moment.");
    return;
  }

  const member = message.guild?.members.cache.get(message.author.id);
  const session: MGSession = {
    userId: message.author.id,
    channelId: message.channelId,
    guildId: message.guildId,
    username: message.author.displayName,
    avatarUrl: member?.displayAvatarURL() ?? message.author.displayAvatarURL(),
    questionIndex: 0,
    questions,
    lifelines: { fiftyfifty: false, phone: false, audience: false },
    safeAmount: 0,
    active: true,
  };

  const embed = buildMgEmbed(session);
  const msg = await wait.edit({ content: `🎰 **Who Wants to Be a Millionaire?** — ${message.author.displayName}`, embeds: [embed], components: buildMgButtons(session) });
  session.msgId = msg.id;
  sessions.set(message.author.id, session);
}

// ── Button handler ────────────────────────────────────────────────────────────

export async function handleMgButton(interaction: ButtonInteraction): Promise<void> {
  const session = sessions.get(interaction.user.id);
  if (!session || !session.active) {
    await interaction.reply({ content: "❌ No active game for you. Start one with `!milliongame`.", ephemeral: true });
    return;
  }

  if (interaction.message.id !== session.msgId) {
    await interaction.reply({ content: "❌ This is not your active game.", ephemeral: true });
    return;
  }

  const parts = interaction.customId.split(":");
  const action = parts[1];

  // ── Walk away ────────────────────────────────────────────────────────────
  if (action === "walkaway") {
    session.active = false;
    sessions.delete(interaction.user.id);
    const winnings = session.safeAmount;
    await saveScore(session.userId, session.guildId, session.username, session.avatarUrl, winnings, false);
    await interaction.update({
      content: `🚶 **${interaction.user.displayName} walked away with ${fmt(winnings)}!**`,
      embeds: [new EmbedBuilder()
        .setColor(0xf1c40f)
        .setDescription(`The correct answer was **${LETTER[session.questions[session.questionIndex]!.correctIdx]}**. Smart choice!\n\n📊 \`!million leaderboard\` to see the rankings.`)],
      components: [],
    });
    return;
  }

  // ── Lifelines ─────────────────────────────────────────────────────────────
  if (action === "lifeline") {
    const type = parts[2];
    const q = session.questions[session.questionIndex]!;

    if (type === "5050") {
      session.lifelines.fiftyfifty = true;
      const correctIdx = q.correctIdx;
      const wrongIdxs = [0,1,2,3].filter(i => i !== correctIdx).sort(() => Math.random() - 0.5).slice(0, 2);
      const removedAnswers = wrongIdxs.map(i => `**${LETTER[i]}** (${q.answers[i]})`).join(" and ");
      await interaction.reply({ content: `🎯 **50/50** removed ${removedAnswers}. Two wrong answers eliminated!`, ephemeral: true });
    } else if (type === "phone") {
      session.lifelines.phone = true;
      const correct = LETTER[q.correctIdx];
      const confidence = 75 + Math.floor(Math.random() * 20);
      await interaction.reply({ content: `📞 **Phone a Friend:** "I'm pretty sure it's **${correct}**, about ${confidence}% confident!"`, ephemeral: true });
    } else if (type === "audience") {
      session.lifelines.audience = true;
      const correct = q.correctIdx;
      const correctPct = 45 + Math.floor(Math.random() * 35);
      const rest = 100 - correctPct;
      const others = [0,1,2,3].filter(i => i !== correct).map((_, i) => i === 0 ? Math.floor(rest * 0.6) : i === 1 ? Math.floor(rest * 0.3) : rest - Math.floor(rest * 0.9));
      const pcts = [0,1,2,3].map(i => i === correct ? correctPct : others.shift() ?? 0);
      const breakdown = LETTER.map((l, i) => `${l}: ${pcts[i]}%`).join("  |  ");
      await interaction.reply({ content: `👥 **Ask the Audience:**\n${breakdown}`, ephemeral: true });
    }

    await interaction.message.edit({ components: buildMgButtons(session) });
    return;
  }

  // ── Answer ────────────────────────────────────────────────────────────────
  if (action === "ans") {
    const chosen = parseInt(parts[2] ?? "0");
    const q = session.questions[session.questionIndex]!;
    const correct = q.correctIdx;
    const qi = session.questionIndex;

    if (chosen === correct) {
      const prize = PRIZE_LADDER[qi]!;
      if (CHECKPOINTS.includes(qi)) session.safeAmount = prize;

      // ── WINNER ─────────────────────────────────────────────────────────
      if (qi === 14) {
        session.active = false;
        sessions.delete(interaction.user.id);
        await saveScore(session.userId, session.guildId, session.username, session.avatarUrl, 1_000_000, true);
        await interaction.update({
          content: `🏆 **${interaction.user.displayName} WON €1,000,000!** 🎉`,
          embeds: [new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle("🥇 MILLIONNAIRE!")
            .setDescription("You answered all 15 questions correctly. Incredible!\n\n📊 `!million leaderboard` to see the rankings.")],
          components: [],
        });
        return;
      }

      session.questionIndex++;
      const correctLabel = LETTER[correct];
      await interaction.update({
        content: `✅ Correct! **${correctLabel}** — you've won **${fmt(prize)}**${CHECKPOINTS.includes(qi) ? " 🛡️ (Checkpoint!)" : ""}`,
        embeds: [buildMgEmbed(session)],
        components: buildMgButtons(session),
      });
    } else {
      // ── WRONG ──────────────────────────────────────────────────────────
      session.active = false;
      sessions.delete(interaction.user.id);
      const winnings = session.safeAmount;
      await saveScore(session.userId, session.guildId, session.username, session.avatarUrl, winnings, false);
      const wrong = LETTER[chosen];
      const correctLabel = LETTER[correct];
      await interaction.update({
        content: `❌ **Wrong!** You chose **${wrong}** but the answer was **${correctLabel}**. You leave with **${fmt(winnings)}**.`,
        embeds: [new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("Game Over")
          .setDescription(`Correct answer: **${correctLabel}** — ${q.answers[correct]}\n\n📊 \`!million leaderboard\` to see the rankings.`)],
        components: [],
      });
    }
    return;
  }
}
