import {
  type Message,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import { getSuggestPref, setSuggestPref } from "./suggest-prefs";

// ── Command registry ──────────────────────────────────────────────────────────

export interface CommandEntry {
  cmd: string;
  aliases?: string[];
  emoji: string;
  desc: string;
}

export const COMMANDS: CommandEntry[] = [
  { cmd: "hello",         aliases: ["bonjour", "salut", "hi"],          emoji: "👋",  desc: "Send a greeting" },
  { cmd: "say",                                                          emoji: "💬",  desc: "Repeat a message" },
  { cmd: "compliment",                                                   emoji: "✨",  desc: "Random compliment" },
  { cmd: "joke",                                                         emoji: "😂",  desc: "Random joke" },
  { cmd: "encouragement", aliases: ["cheer"],                            emoji: "💪",  desc: "Word of encouragement" },
  { cmd: "hug",                                                          emoji: "🤗",  desc: "Virtual hug" },
  { cmd: "8ball",                                                        emoji: "🎱",  desc: "Magic 8-ball" },
  { cmd: "dice",          aliases: ["roll"],                             emoji: "🎲",  desc: "Roll a die" },
  { cmd: "conspiracy",                                                   emoji: "🕵️", desc: "AI conspiracy theory" },
  { cmd: "minesweeper",   aliases: ["mine"],                             emoji: "💣",  desc: "Minesweeper game" },
  { cmd: "geo",                                                          emoji: "🌍",  desc: "GeoGuessr game" },
  { cmd: "trivia",                                                       emoji: "🧠",  desc: "General knowledge quiz" },
  { cmd: "guessnumber",   aliases: ["guess"],                            emoji: "🔢",  desc: "Guess the number" },
  { cmd: "connect4",                                                     emoji: "🔴",  desc: "Connect 4 game" },
  { cmd: "music",                                                        emoji: "🎵",  desc: "Generate a song (Suno AI)" },
  { cmd: "credits",                                                      emoji: "✨",  desc: "Project credits" },
  { cmd: "balance",                                                      emoji: "💰",  desc: "Suno credits remaining" },
  { cmd: "radio",         aliases: ["r"],                                emoji: "📻",  desc: "Play a live radio station" },
  { cmd: "youtube",       aliases: ["yt", "y", "yb"],                   emoji: "▶️",  desc: "Play a YouTube video" },
  { cmd: "skip",                                                         emoji: "⏭️",  desc: "Skip current track" },
  { cmd: "voteskip",      aliases: ["vs"],                               emoji: "🗳️",  desc: "Vote to skip current track" },
  { cmd: "queue",         aliases: ["q"],                                emoji: "📋",  desc: "View the play queue" },
  { cmd: "np",                                                           emoji: "🎶",  desc: "Now playing" },
  { cmd: "join",                                                         emoji: "🎤",  desc: "Join your voice channel" },
  { cmd: "leave",                                                        emoji: "🚪",  desc: "Leave the voice channel" },
  { cmd: "voice",                                                        emoji: "🔊",  desc: "Voice commands (stop/resume)" },
  { cmd: "subtitles",                                                    emoji: "📝",  desc: "Toggle subtitles" },
  { cmd: "karaoke",       aliases: ["k"],                                emoji: "🎤",  desc: "Karaoke mode" },
  { cmd: "shazam",                                                       emoji: "🎵",  desc: "Identify the current song" },
  { cmd: "playlist",                                                     emoji: "📁",  desc: "Manage playlists" },
  { cmd: "ai",                                                           emoji: "🤖",  desc: "AI battle between two bots" },
  { cmd: "image",                                                        emoji: "🖼️",  desc: "Generate an AI image" },
  { cmd: "help",          aliases: ["aide"],                             emoji: "❓",  desc: "Help & command list" },
  { cmd: "guide",         aliases: ["instruction", "guia"],              emoji: "📖",  desc: "Moderator setup guide" },
  { cmd: "birthday",      aliases: ["anniversaire"],                     emoji: "🎂",  desc: "Manage birthdays" },
  { cmd: "poll",          aliases: ["sondage"],                          emoji: "📊",  desc: "Create a poll" },
  { cmd: "quest",                                                        emoji: "⚔️",  desc: "Quest system" },
  { cmd: "prefix",                                                       emoji: "⚙️",  desc: "Change the bot prefix" },
  { cmd: "suggest",   aliases: ["suggestion", "sugerencia"],             emoji: "💡",  desc: "Turn command suggestions on or off" },
];

// ── Fuzzy matching ────────────────────────────────────────────────────────────

function normalizeCmd(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] = a[i - 1] === b[j - 1]
        ? dp[i - 1]![j - 1]!
        : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    }
  }
  return dp[m]![n]!;
}

export function findClosestCommand(input: string): CommandEntry | null {
  const n = normalizeCmd(input);
  if (!n || n.length < 2) return null;

  let best: { entry: CommandEntry; score: number } | null = null;

  for (const entry of COMMANDS) {
    const names    = [entry.cmd, ...(entry.aliases ?? [])].map(normalizeCmd);
    const shortest = Math.min(...names.map(nm => nm.length));

    // Reject immediately if the input is more than twice the command length —
    // that can never be a real typo (e.g. "geyejdjd" vs "geo")
    if (n.length > shortest * 2 + 1) continue;

    if (names.some(nm => nm === n)) return entry;

    if (names.some(nm => nm.includes(n) || n.includes(nm))) {
      if (!best || 0.9 > best.score) best = { entry, score: 0.9 };
      continue;
    }

    const minDist = Math.min(...names.map(nm => levenshtein(n, nm)));
    const maxLen  = Math.max(n.length, shortest);
    const score   = 1 - minDist / maxLen;

    // minDist ≤ 2 only counts when lengths are close (avoid false positives)
    const lenClose = Math.abs(n.length - shortest) <= 2;
    if ((score >= 0.60 || (minDist <= 2 && lenClose)) && (!best || score > best.score)) {
      best = { entry, score };
    }
  }

  return best?.entry ?? null;
}

// ── Anti-spam / troll tracker ─────────────────────────────────────────────────

const trollTracker = new Map<string, { count: number; since: number }>();
const TROLL_WINDOW_MS = 30_000;
const TROLL_THRESHOLD = 3;

/** Records one unknown-command hit for a user. Returns true if troll threshold reached. */
function recordUnknown(userId: string): boolean {
  const now   = Date.now();
  const entry = trollTracker.get(userId);
  if (!entry || now - entry.since > TROLL_WINDOW_MS) {
    trollTracker.set(userId, { count: 1, since: now });
    return false;
  }
  entry.count++;
  if (entry.count >= TROLL_THRESHOLD) {
    trollTracker.delete(userId); // reset so they can try again later
    return true;
  }
  return false;
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Called whenever an unrecognised command is typed.
 *
 * Behaviour:
 *  - User never asked  → show opt-in prompt ("want suggestions?")
 *    → Yes: save pref, then show the suggestion with a run-button
 *    → No:  save pref, stay silent from now on
 *  - User opted IN  → show suggestion + run-button directly
 *  - User opted OUT → do nothing
 */
export async function handleUnknownCommand(
  message: Message,
  wrongCmd: string,
  prefix: string,
  onConfirm: (match: CommandEntry) => Promise<void>,
): Promise<void> {
  const userId = message.author.id;
  const pref   = getSuggestPref(userId);
  const match  = findClosestCommand(wrongCmd);

  // ── Opted out: stay silent ────────────────────────────────────────────────
  if (pref === false) return;

  // ── Troll / spam detection ────────────────────────────────────────────────
  if (recordUnknown(userId)) {
    await message.reply(
      `You're a troll 🧌\nIf you're genuinely lost, use \`${prefix}help\` to see all available commands.`,
    );
    return;
  }

  // ── Opted in: show suggestion or fallback to !help ───────────────────────
  if (pref === true) {
    if (!match) {
      await showHelpFallback(message, wrongCmd, prefix, onConfirm);
      return;
    }
    await showSuggestion(message, wrongCmd, prefix, match, onConfirm);
    return;
  }

  // ── Never asked: show opt-in prompt ──────────────────────────────────────
  const yesOptId = `sugoptin_yes_${message.id}`;
  const noOptId  = `sugoptin_no_${message.id}`;

  const optRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(yesOptId)
      .setLabel("✅  Yes, help me")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(noOptId)
      .setLabel("No thanks")
      .setStyle(ButtonStyle.Secondary),
  );

  const reply = await message.reply({
    content:
      `❓ Unknown command \`${prefix}${wrongCmd}\`.\n` +
      `Would you like me to suggest corrections when you mistype a command?`,
    components: [optRow],
  });

  const optCollector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === userId,
    time: 30_000,
    max: 1,
  });

  optCollector.on("collect", async (interaction) => {
    await interaction.deferUpdate();

    if (interaction.customId === yesOptId) {
      setSuggestPref(userId, true);

      if (!match) {
        await reply.edit({
          content: `✅ Got it! I'll suggest corrections from now on.\nUse \`${prefix}help\` to see all available commands.`,
          components: [],
        });
        return;
      }

      // Show the suggestion in the same message
      const correctedCmd = `${prefix}${match.cmd}`;
      const yesRunId = `sugrun_yes_${message.id}`;
      const noRunId  = `sugrun_no_${message.id}`;

      const runRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(yesRunId)
          .setLabel(`✅  Yes, run ${correctedCmd}`)
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(noRunId)
          .setLabel("No")
          .setStyle(ButtonStyle.Secondary),
      );

      await reply.edit({
        content:
          `✅ Enabled! Did you mean ${match.emoji} **\`${correctedCmd}\`** — *${match.desc}*?`,
        components: [runRow],
      });

      const runCollector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: (i) => i.user.id === userId,
        time: 30_000,
        max: 1,
      });

      runCollector.on("collect", async (i2) => {
        await i2.deferUpdate();
        if (i2.customId === yesRunId) {
          await reply.edit({ content: `▶️ Running \`${correctedCmd}\`…`, components: [] });
          try { await onConfirm(match); } catch {
            await reply.edit({ content: `❌ Something went wrong running \`${correctedCmd}\`.`, components: [] }).catch(() => null);
          }
        } else {
          await reply.edit({ content: "👍 No problem.", components: [] });
        }
      });

      runCollector.on("end", async (col) => {
        if (col.size === 0) await reply.edit({ components: [] }).catch(() => null);
      });

    } else {
      setSuggestPref(userId, false);
      await reply.edit({
        content: `👍 No problem — I won't suggest corrections.\nUse \`${prefix}help\` to see all available commands.`,
        components: [],
      });
    }
  });

  optCollector.on("end", async (col) => {
    if (col.size === 0) await reply.edit({ components: [] }).catch(() => null);
  });
}

// ── Direct suggestion (for opted-in users) ───────────────────────────────────

async function showSuggestion(
  message: Message,
  wrongCmd: string,
  prefix: string,
  match: CommandEntry,
  onConfirm: (match: CommandEntry) => Promise<void>,
): Promise<void> {
  const userId       = message.author.id;
  const correctedCmd = `${prefix}${match.cmd}`;
  const yesId        = `sug_yes_${message.id}`;
  const noId         = `sug_no_${message.id}`;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(yesId)
      .setLabel(`✅  Yes, run ${correctedCmd}`)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(noId)
      .setLabel("No")
      .setStyle(ButtonStyle.Secondary),
  );

  const reply = await message.reply({
    content:
      `❓ Unknown command \`${prefix}${wrongCmd}\`.\n` +
      `Did you mean ${match.emoji} **\`${correctedCmd}\`** — *${match.desc}*?`,
    components: [row],
  });

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === userId,
    time: 30_000,
    max: 1,
  });

  collector.on("collect", async (interaction) => {
    await interaction.deferUpdate();
    if (interaction.customId === yesId) {
      await reply.edit({ content: `▶️ Running \`${correctedCmd}\`…`, components: [] });
      try { await onConfirm(match); } catch {
        await reply.edit({ content: `❌ Something went wrong running \`${correctedCmd}\`.`, components: [] }).catch(() => null);
      }
    } else {
      await reply.edit({ content: "👍 No problem.", components: [] });
    }
  });

  collector.on("end", async (col) => {
    if (col.size === 0) await reply.edit({ components: [] }).catch(() => null);
  });
}

// ── No-match fallback: propose !help ─────────────────────────────────────────

async function showHelpFallback(
  message: Message,
  wrongCmd: string,
  prefix: string,
  onConfirm: (match: CommandEntry) => Promise<void>,
): Promise<void> {
  const userId  = message.author.id;
  const helpCmd = `${prefix}help`;
  const yesId   = `sughelp_yes_${message.id}`;
  const noId    = `sughelp_no_${message.id}`;

  const helpEntry = COMMANDS.find(c => c.cmd === "help")!;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(yesId)
      .setLabel(`✅  Yes, show ${helpCmd}`)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(noId)
      .setLabel("No")
      .setStyle(ButtonStyle.Secondary),
  );

  const reply = await message.reply({
    content:
      `❓ No command found for \`${prefix}${wrongCmd}\`.\n` +
      `Would you like to see the full command list with \`${helpCmd}\`?`,
    components: [row],
  });

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === userId,
    time: 30_000,
    max: 1,
  });

  collector.on("collect", async (interaction) => {
    await interaction.deferUpdate();
    if (interaction.customId === yesId) {
      await reply.edit({ content: `▶️ Running \`${helpCmd}\`…`, components: [] });
      try { await onConfirm(helpEntry); } catch {
        await reply.edit({ content: `❌ Something went wrong.`, components: [] }).catch(() => null);
      }
    } else {
      await reply.edit({ content: "👍 No problem.", components: [] });
    }
  });

  collector.on("end", async (col) => {
    if (col.size === 0) await reply.edit({ components: [] }).catch(() => null);
  });
}
