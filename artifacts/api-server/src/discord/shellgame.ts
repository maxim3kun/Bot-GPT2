/**
 * Shell Game — Three Cup Monte Discord mini-game
 *
 * Flow:
 *  1. /shellgame [difficulty] → startShellGame()
 *  2. Intro GIF: ball visible under cup 1 (2.5s)
 *  3. Shuffle GIF: cups move around
 *  4. Choice buttons: player picks a cup (15s timeout)
 *  5. Reveal GIF: win or lose + rewards
 */

import { readFile, readdir } from "fs/promises";
import path from "path";
import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder,
  type ChatInputCommandInteraction, type ButtonInteraction,
} from "discord.js";
import { logger } from "../lib/logger.js";
import { sgStatsCol } from "../lib/db.js";

// ── Asset paths ───────────────────────────────────────────────────────────────

// __dirname is set by the esbuild banner to point at the dist/ folder.
// public/ is one level up.
const ASSET_BASE = path.resolve((globalThis as any).__dirname ?? __dirname, "../public/shellgame");

// ── Types ─────────────────────────────────────────────────────────────────────

export type Difficulty = "easy" | "medium" | "hard";

interface SGSession {
  userId: string;
  username: string;
  guildId: string;
  difficulty: Difficulty;
  numCups: number;
  animationDir: string;   // full path to the chosen animation folder
  winningCup: number;     // 1-indexed, from metadata
  phase: "intro" | "shuffle" | "choice" | "reveal" | "done";
  interaction: ChatInputCommandInteraction;
  shuffleTimer?: ReturnType<typeof setTimeout>;
  choiceTimer?: ReturnType<typeof setTimeout>;
  active: boolean;
}

interface SGStatsDoc {
  userId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
  coinsEarned: number;
  xpEarned: number;
  diamondsFound: number;
  jackpotsFound: number;
  dailyRewardsClaimed: number;
  lastPlayed: Date;
  dailyCoinDate: string | null;
  dailyCoinCount: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const NUM_CUPS: Record<Difficulty, number>         = { easy: 3, medium: 4, hard: 5 };
const SHUFFLE_DURATION: Record<Difficulty, number> = { easy: 4200, medium: 5500, hard: 7000 };
const INTRO_DURATION  = 2500;
const CHOICE_TIMEOUT  = 15_000;

const COIN_RANGE: Record<Difficulty, [number, number]> = {
  easy:   [50,  100],
  medium: [100, 200],
  hard:   [200, 400],
};
const XP_REWARD: Record<Difficulty, number> = { easy: 10, medium: 25, hard: 50 };
const DAILY_COIN_LIMIT = 3;

const REWARD_TABLE: { type: string; chance: number }[] = [
  { type: "jackpot", chance: 0.005 },
  { type: "bomb",    chance: 0.005 },
  { type: "mouse",   chance: 0.010 },
  { type: "diamond", chance: 0.020 },
  { type: "double",  chance: 0.030 },
  { type: "chest",   chance: 0.050 },
  { type: "ticket",  chance: 0.080 },
  { type: "xp",      chance: 0.150 },
  { type: "coins",   chance: 0.650 },
];

const COLORS = { win: 0x57f287, lose: 0xed4245, neutral: 0x5865f2, gold: 0xf1c40f };

// ── Session store ─────────────────────────────────────────────────────────────

const sessions = new Map<string, SGSession>();

// ── In-memory stats fallback ──────────────────────────────────────────────────

const memStats = new Map<string, SGStatsDoc>();

function defaultStats(userId: string): SGStatsDoc {
  return {
    userId, gamesPlayed: 0, wins: 0, losses: 0,
    currentStreak: 0, bestStreak: 0,
    coinsEarned: 0, xpEarned: 0, diamondsFound: 0, jackpotsFound: 0,
    dailyRewardsClaimed: 0,
    lastPlayed: new Date(),
    dailyCoinDate: null, dailyCoinCount: 0,
  };
}

async function getStats(userId: string): Promise<SGStatsDoc> {
  if (sgStatsCol) {
    try {
      return (await sgStatsCol.findOne({ userId })) ?? defaultStats(userId);
    } catch (err) { logger.error({ err }, "sg getStats failed"); }
  }
  return memStats.get(userId) ?? defaultStats(userId);
}

async function saveStats(stats: SGStatsDoc): Promise<void> {
  if (sgStatsCol) {
    try {
      await sgStatsCol.updateOne(
        { userId: stats.userId },
        { $set: { ...stats, lastPlayed: new Date() } },
        { upsert: true },
      );
      return;
    } catch (err) { logger.error({ err }, "sg saveStats failed"); }
  }
  memStats.set(stats.userId, { ...stats, lastPlayed: new Date() });
}

// ── Asset helpers ─────────────────────────────────────────────────────────────

async function pickRandomAnimation(difficulty: Difficulty): Promise<{ dir: string; winningCup: number }> {
  const diffDir = path.join(ASSET_BASE, difficulty);
  let folders: string[];
  try {
    const entries = await readdir(diffDir, { withFileTypes: true });
    folders = entries.filter(e => e.isDirectory()).map(e => e.name).sort();
  } catch {
    throw new Error(`Shell game assets not found at ${diffDir}. Run the asset generator.`);
  }
  if (folders.length === 0) throw new Error(`No animation folders found in ${diffDir}`);
  const chosen = folders[Math.floor(Math.random() * folders.length)]!;
  const dir = path.join(diffDir, chosen);
  const meta = JSON.parse(await readFile(path.join(dir, "metadata.json"), "utf8")) as { winningCup: number };
  return { dir, winningCup: meta.winningCup };
}

async function loadGif(filePath: string): Promise<Buffer | null> {
  try {
    return await readFile(filePath);
  } catch {
    logger.warn({ path: filePath }, "Shell game GIF not found");
    return null;
  }
}

// ── Reward system ─────────────────────────────────────────────────────────────

function rollReward(): string {
  const r = Math.random();
  let acc = 0;
  for (const { type, chance } of REWARD_TABLE) {
    acc += chance;
    if (r < acc) return type;
  }
  return "coins";
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function randomCoins(diff: Difficulty): number {
  const [lo, hi] = COIN_RANGE[diff];
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

interface RewardResult {
  type: string;
  label: string;
  amount?: number;
  coinsBlocked: boolean;
}

async function grantWinReward(userId: string, stats: SGStatsDoc, difficulty: Difficulty): Promise<RewardResult> {
  const type = rollReward();
  const today = todayStr();

  // Reset daily coin counter if it's a new day
  if (stats.dailyCoinDate !== today) {
    stats.dailyCoinDate = today;
    stats.dailyCoinCount = 0;
  }

  const coinsBlocked = stats.dailyCoinCount >= DAILY_COIN_LIMIT;

  switch (type) {
    case "coins": {
      if (coinsBlocked) {
        // Daily coin limit reached — grant XP instead so the win still feels rewarding
        const xp = XP_REWARD[difficulty];
        stats.xpEarned += xp;
        return { type: "xp_instead", label: `⭐ **+${xp} XP** *(daily coin limit reached — keep playing for XP, achievements & quests!)*`, coinsBlocked: true };
      }
      const coins = randomCoins(difficulty);
      stats.coinsEarned += coins;
      stats.dailyCoinCount++;
      return { type: "coins", label: `🪙 **+${coins} Coins**`, amount: coins, coinsBlocked: false };
    }
    case "xp": {
      const xp = XP_REWARD[difficulty];
      stats.xpEarned += xp;
      return { type: "xp", label: `⭐ **+${xp} XP**`, amount: xp, coinsBlocked };
    }
    case "ticket":
      return { type: "ticket", label: `🎟️ **Lottery Ticket!**`, coinsBlocked };
    case "chest":
      return { type: "chest", label: `📦 **Common Chest!**`, coinsBlocked };
    case "double":
      return { type: "double", label: `✨ **Double Reward Buff!** (next reward doubled)`, coinsBlocked };
    case "diamond":
      stats.diamondsFound++;
      return { type: "diamond", label: `💎 **Diamond!** Rare find!`, coinsBlocked };
    case "mouse":
      return { type: "mouse", label: `🐭 **Nothing…** A sneaky mouse stole it!`, coinsBlocked };
    case "bomb":
      return { type: "bomb", label: `💣 **Bomb!** Your reward exploded — better luck next time!`, coinsBlocked };
    case "jackpot": {
      // Jackpot also respects the daily coin limit
      if (coinsBlocked) {
        const xp = XP_REWARD[difficulty] * 5;
        stats.xpEarned += xp;
        stats.jackpotsFound++;
        return { type: "jackpot_xp", label: `🎰 **JACKPOT! +${xp} XP!** 🎉 *(coin limit reached)*`, amount: xp, coinsBlocked: true };
      }
      const jackpotCoins = randomCoins(difficulty) * 10;
      stats.coinsEarned += jackpotCoins;
      stats.jackpotsFound++;
      stats.dailyCoinCount++;
      return { type: "jackpot", label: `🎰 **JACKPOT! +${jackpotCoins} Coins!** 🎉`, amount: jackpotCoins, coinsBlocked: false };
    }
    default:
      return { type: "coins", label: `🪙 **+${randomCoins(difficulty)} Coins**`, coinsBlocked };
  }
}

/** Small consolation XP granted on loss so players always feel rewarded for playing. */
function grantLossConsolation(stats: SGStatsDoc, difficulty: Difficulty): string {
  const xp = Math.floor(XP_REWARD[difficulty] / 4); // 25% of win XP
  if (xp > 0) {
    stats.xpEarned += xp;
    return `⭐ **+${xp} XP** *(consolation — keep practicing!)*`;
  }
  return "Keep playing to build your streak! 💪";
}

// ── Embed builders ────────────────────────────────────────────────────────────

const DIFF_EMOJI: Record<Difficulty, string> = { easy: "🟢", medium: "🟡", hard: "🔴" };
const DIFF_LABEL: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

function buildIntroEmbed(session: SGSession): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle("🎩 Shell Game")
    .setDescription(
      `**${session.username}** is playing on ${DIFF_EMOJI[session.difficulty]} **${DIFF_LABEL[session.difficulty]}**\n\n` +
      `👀 **Watch carefully!** The ball is under **Cup 1** — remember where it is!\n` +
      `The shuffle is about to begin…`,
    )
    .addFields(
      { name: "Cups", value: `${session.numCups}`, inline: true },
      { name: "Difficulty", value: DIFF_LABEL[session.difficulty], inline: true },
      { name: "You have", value: "15s to choose", inline: true },
    )
    .setImage("attachment://intro.gif")
    .setFooter({ text: "Shell Game • Get ready to follow the ball!" });
}

function buildShuffleEmbed(session: SGSession): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.neutral)
    .setTitle("🎩 Shell Game — Shuffling…")
    .setDescription(
      `**Follow the ball!** 👁️\n\n` +
      `The cups are shuffling — keep your eye on the one hiding the ball!`,
    )
    .setImage("attachment://shuffle.gif")
    .setFooter({ text: "Shell Game • Don't lose track!" });
}

function buildChoiceEmbed(session: SGSession): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle("🎩 Shell Game — Choose a Cup!")
    .setDescription(
      `The shuffle is done! 🎯\n\n` +
      `**Which cup is hiding the ball?**\n` +
      `You have **15 seconds** to choose. Trust your eyes!`,
    )
    .setFooter({ text: "Shell Game • Only you can interact with your game" });
}

function buildWinEmbed(session: SGSession, chosen: number, reward: RewardResult): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.win)
    .setTitle("🎉 You found the ball!")
    .setDescription(
      `**${session.username}** correctly chose **Cup ${chosen}**! 🏆\n\n` +
      `**Reward:** ${reward.label}`,
    )
    .setImage("attachment://reveal.gif")
    .setFooter({ text: "Shell Game • Well done!" });
}

function buildLoseStep1Embed(session: SGSession, chosen: number): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.lose)
    .setTitle("😬 You chose Cup " + chosen + "…")
    .setDescription(`**${session.username}** lifted Cup ${chosen}… it's empty! 😱\n\n_Revealing the correct cup…_`)
    .setFooter({ text: "Shell Game • Better luck next time!" });
}

function buildLoseStep2Embed(session: SGSession, chosen: number, winning: number, consolation: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.lose)
    .setTitle("❌ Wrong cup!")
    .setDescription(
      `The ball was under **Cup ${winning}** the whole time! 🔮\n\n` +
      `**${session.username}** chose Cup ${chosen}.\n\n` +
      `**Consolation:** ${consolation}`,
    )
    .setImage("attachment://reveal.gif")
    .setFooter({ text: "Shell Game • Keep practicing!" });
}

function buildTimeoutEmbed(session: SGSession, winning: number): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x747f8d)
    .setTitle("⏰ Time's up!")
    .setDescription(
      `**${session.username}** ran out of time!\n` +
      `The ball was under **Cup ${winning}**.`,
    )
    .setImage("attachment://reveal.gif")
    .setFooter({ text: "Shell Game • React faster next time!" });
}

// ── Cup selection buttons ─────────────────────────────────────────────────────

function buildCupButtons(numCups: number, disabled = false): ActionRowBuilder<ButtonBuilder>[] {
  const CUP_EMOJIS = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣"];
  const buttons = Array.from({ length: numCups }, (_, i) =>
    new ButtonBuilder()
      .setCustomId(`sg:cup:${i + 1}`)
      .setLabel(`Cup ${i + 1}`)
      .setEmoji(CUP_EMOJIS[i]!)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
  );

  // Discord allows max 5 buttons per row, max 5 rows
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(i, i + 5)));
  }
  return rows;
}

// ── Game start ────────────────────────────────────────────────────────────────

export async function startShellGame(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.editReply("❌ Shell Game can only be played in a server.");
    return;
  }

  const userId = interaction.user.id;

  if (sessions.has(userId)) {
    await interaction.editReply("⚠️ You already have an active Shell Game! Finish it first.");
    return;
  }

  const difficulty = (interaction.options.getString("difficulty") ?? "easy") as Difficulty;
  const numCups = NUM_CUPS[difficulty];

  // Pick a random animation
  let animDir: string;
  let winningCup: number;
  try {
    ({ dir: animDir, winningCup } = await pickRandomAnimation(difficulty));
  } catch (err) {
    logger.error({ err }, "shellgame: pickRandomAnimation failed");
    await interaction.editReply("❌ Shell Game assets are not ready. Please wait a moment and try again.");
    return;
  }

  const session: SGSession = {
    userId,
    username: interaction.user.displayName,
    guildId: interaction.guildId,
    difficulty,
    numCups,
    animationDir: animDir,
    winningCup,
    phase: "intro",
    interaction,
    active: true,
  };
  sessions.set(userId, session);

  // ── Step 1: Intro ──────────────────────────────────────────────────────────
  const introGif = await loadGif(path.join(animDir, "intro.gif"));
  const introFiles = introGif ? [{ attachment: introGif, name: "intro.gif" }] : [];

  await interaction.editReply({
    embeds: [buildIntroEmbed(session)],
    files: introFiles,
  });

  // ── Step 2: Shuffle (after INTRO_DURATION) ─────────────────────────────────
  session.shuffleTimer = setTimeout(async () => {
    if (!session.active) return;
    session.phase = "shuffle";

    const shuffleGif = await loadGif(path.join(animDir, "shuffle.gif"));
    const shuffleFiles = shuffleGif ? [{ attachment: shuffleGif, name: "shuffle.gif" }] : [];

    try {
      await interaction.editReply({
        embeds: [buildShuffleEmbed(session)],
        files: shuffleFiles,
      });
    } catch (err) { logger.error({ err }, "shellgame: shuffle edit failed"); }

    // ── Step 3: Choice buttons (after SHUFFLE_DURATION) ───────────────────
    const choiceDelay = SHUFFLE_DURATION[difficulty];
    session.shuffleTimer = setTimeout(async () => {
      if (!session.active) return;
      session.phase = "choice";

      try {
        await interaction.editReply({
          embeds: [buildChoiceEmbed(session)],
          files: [],
          components: buildCupButtons(numCups),
        });
      } catch (err) { logger.error({ err }, "shellgame: choice edit failed"); return; }

      // ── Auto-timeout after CHOICE_TIMEOUT ─────────────────────────────
      session.choiceTimer = setTimeout(async () => {
        if (!session.active || session.phase !== "choice") return;
        await finishGame(session, null);
      }, CHOICE_TIMEOUT);

    }, choiceDelay);

  }, INTRO_DURATION);
}

// ── Game finish ───────────────────────────────────────────────────────────────

async function finishGame(session: SGSession, chosenCup: number | null): Promise<void> {
  if (!session.active) return;
  session.active = false;
  session.phase = "reveal";
  sessions.delete(session.userId);

  if (session.choiceTimer) clearTimeout(session.choiceTimer);
  if (session.shuffleTimer) clearTimeout(session.shuffleTimer);

  const { interaction, winningCup, animationDir, difficulty, userId } = session;
  const stats = await getStats(userId);
  stats.gamesPlayed++;
  stats.lastPlayed = new Date();

  // Timeout: no choice was made
  if (chosenCup === null) {
    stats.losses++;
    stats.currentStreak = 0;
    await saveStats(stats);

    const revealGif = await loadGif(path.join(animationDir, `reveal_lose_${winningCup}.gif`));
    const revealFiles = revealGif ? [{ attachment: revealGif, name: "reveal.gif" }] : [];
    try {
      await interaction.editReply({
        embeds: [buildTimeoutEmbed(session, winningCup)],
        files: revealFiles,
        components: buildCupButtons(session.numCups, true),
      });
    } catch (err) { logger.error({ err }, "shellgame: timeout reveal failed"); }
    return;
  }

  const isWin = chosenCup === winningCup;

  if (isWin) {
    // ── WIN ──────────────────────────────────────────────────────────────
    stats.wins++;
    stats.currentStreak++;
    if (stats.currentStreak > stats.bestStreak) stats.bestStreak = stats.currentStreak;

    const reward = await grantWinReward(userId, stats, difficulty);
    stats.dailyRewardsClaimed++;
    await saveStats(stats);

    const revealGif = await loadGif(path.join(animationDir, `reveal_win_${winningCup}.gif`));
    const revealFiles = revealGif ? [{ attachment: revealGif, name: "reveal.gif" }] : [];
    try {
      await interaction.editReply({
        embeds: [buildWinEmbed(session, chosenCup, reward)],
        files: revealFiles,
        components: buildCupButtons(session.numCups, true),
      });
    } catch (err) { logger.error({ err }, "shellgame: win reveal failed"); }

  } else {
    // ── LOSE ─────────────────────────────────────────────────────────────
    stats.losses++;
    stats.currentStreak = 0;

    // Grant consolation XP (not from reward table — rewards are win-only per spec)
    const consolation = grantLossConsolation(stats, difficulty);
    await saveStats(stats);

    // Step 1: Show the chosen (wrong) cup revealed as empty
    try {
      await interaction.editReply({
        embeds: [buildLoseStep1Embed(session, chosenCup)],
        files: [],
        components: buildCupButtons(session.numCups, true),
      });
    } catch (err) { logger.error({ err }, "shellgame: lose step1 failed"); }

    // Step 2: After 1.5s, reveal the winning cup with ball
    await new Promise(r => setTimeout(r, 1500));

    const revealGif = await loadGif(path.join(animationDir, `reveal_lose_${winningCup}.gif`));
    const revealFiles = revealGif ? [{ attachment: revealGif, name: "reveal.gif" }] : [];
    try {
      await interaction.editReply({
        embeds: [buildLoseStep2Embed(session, chosenCup, winningCup, consolation)],
        files: revealFiles,
        components: buildCupButtons(session.numCups, true),
      });
    } catch (err) { logger.error({ err }, "shellgame: lose step2 failed"); }
  }
}

// ── Button handler ────────────────────────────────────────────────────────────

export async function handleShellGameButton(interaction: ButtonInteraction): Promise<void> {
  const userId = interaction.user.id;
  const session = sessions.get(userId);

  // Not the session owner
  if (!session) {
    await interaction.reply({
      content: "❌ You don't have an active Shell Game. Start one with `/shellgame`!",
      ephemeral: true,
    });
    return;
  }

  // Wrong player
  if (session.userId !== userId) {
    await interaction.reply({
      content: "❌ This is not your game! Start your own with `/shellgame`.",
      ephemeral: true,
    });
    return;
  }

  // Not in choice phase yet
  if (session.phase !== "choice") {
    await interaction.reply({
      content: "⏳ The shuffle isn't done yet — wait for the buttons to appear!",
      ephemeral: true,
    });
    return;
  }

  // Parse chosen cup from customId: "sg:cup:N"
  const parts = interaction.customId.split(":");
  const chosenCup = parseInt(parts[2] ?? "0", 10);
  if (!chosenCup || chosenCup < 1 || chosenCup > session.numCups) {
    await interaction.reply({ content: "❌ Invalid cup choice.", ephemeral: true });
    return;
  }

  // Acknowledge button immediately (no loading spinner)
  await interaction.deferUpdate();

  // Process the choice
  await finishGame(session, chosenCup);
}

// ── Stats display ─────────────────────────────────────────────────────────────

export async function showShellGameStats(interaction: ChatInputCommandInteraction): Promise<void> {
  const stats = await getStats(interaction.user.id);
  const winRate = stats.gamesPlayed > 0
    ? `${((stats.wins / stats.gamesPlayed) * 100).toFixed(1)}%`
    : "N/A";

  const embed = new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle(`🎩 Shell Game Stats — ${interaction.user.displayName}`)
    .setThumbnail(interaction.user.displayAvatarURL())
    .addFields(
      { name: "🎮 Games Played",     value: `${stats.gamesPlayed}`,       inline: true },
      { name: "✅ Wins",             value: `${stats.wins}`,              inline: true },
      { name: "❌ Losses",           value: `${stats.losses}`,            inline: true },
      { name: "📊 Win Rate",         value: winRate,                      inline: true },
      { name: "🔥 Current Streak",   value: `${stats.currentStreak}`,     inline: true },
      { name: "🏆 Best Streak",      value: `${stats.bestStreak}`,        inline: true },
      { name: "🪙 Coins Earned",     value: `${stats.coinsEarned}`,       inline: true },
      { name: "⭐ XP Earned",        value: `${stats.xpEarned}`,          inline: true },
      { name: "💎 Diamonds Found",   value: `${stats.diamondsFound}`,     inline: true },
      { name: "🎰 Jackpots Found",   value: `${stats.jackpotsFound}`,     inline: true },
      { name: "🎁 Daily Rewards",    value: `${stats.dailyRewardsClaimed}`, inline: true },
    )
    .setFooter({ text: "Shell Game • Daily coin limit: 3 wins/day" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
