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
  { cmd: "birthday",      aliases: ["anniversaire", "b"],               emoji: "🎂",  desc: "Manage birthdays" },
  { cmd: "poll",          aliases: ["sondage"],                          emoji: "📊",  desc: "Create a poll" },
  { cmd: "quest",                                                        emoji: "⚔️",  desc: "Quest system" },
  { cmd: "prefix",                                                       emoji: "⚙️",  desc: "Change the bot prefix" },
  { cmd: "suggest",   aliases: ["suggestion", "sugerencia"],             emoji: "💡",  desc: "Turn command suggestions on or off" },
  { cmd: "unblock",                                                      emoji: "🔓",  desc: "Unblock a user (admin only)" },
  { cmd: "admin",                                                        emoji: "⚙️",  desc: "Configure admin channel (admin only)" },
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

    if (n.length > shortest * 2 + 1) continue;
    if (names.some(nm => nm === n)) return entry;

    if (names.some(nm => nm.includes(n) || n.includes(nm))) {
      if (!best || 0.9 > best.score) best = { entry, score: 0.9 };
      continue;
    }

    const minDist = Math.min(...names.map(nm => levenshtein(n, nm)));
    const maxLen  = Math.max(n.length, shortest);
    const score   = 1 - minDist / maxLen;

    const lenClose = Math.abs(n.length - shortest) <= 2;
    if ((score >= 0.60 || (minDist <= 2 && lenClose)) && (!best || score > best.score)) {
      best = { entry, score };
    }
  }

  return best?.entry ?? null;
}

// ── Escalating troll-ban system ───────────────────────────────────────────────
//
// Level 0 — warned (troll message shown, no block yet)
// Level 1 — 3-min unknown-command block (real commands still work)
// Level 2 — 12h unknown-command block (real commands still work)
// Level 3 — 2h full block (ALL commands including !help) + admin notify
// Level 4 — permanent full ban + admin notify

interface BanRecord {
  level: 0 | 1 | 2 | 3 | 4;
  blockedUntil: number;   // epoch ms; 0 = not blocked; Infinity = permanent
  levelSetAt: number;     // when this level was imposed
  permanent: boolean;
}

export interface BlockStatus {
  blocked: boolean;
  fullBlock: boolean;   // true = all commands blocked (levels 3 & 4)
  permanent: boolean;
  remainingMs: number;  // ms until unblock; 0 if permanent
  level: number;
}

const banMap = new Map<string, BanRecord>();

const L1_DURATION  = 3  * 60 * 1000;               // 3 minutes
const L2_DURATION  = 12 * 60 * 60 * 1000;           // 12 hours
const L3_DURATION  = 2  * 60 * 60 * 1000;           // 2 hours
const L1_WINDOW    = 6  * 60 * 60 * 1000;           // reoffend within 6h after L1 → L2
const L2_WINDOW    = 12 * 60 * 60 * 1000;           // reoffend within 12h after L2 → L3
const L3_WINDOW    = 3  * 24 * 60 * 60 * 1000;      // reoffend within 3 days after L3 → L4

/** Returns the current full-block status (levels 3 & 4). Level 1/2 are handled inside handleUnknownCommand. */
export function checkCommandBlock(userId: string): BlockStatus {
  const rec = banMap.get(userId);
  if (!rec) return { blocked: false, fullBlock: false, permanent: false, remainingMs: 0, level: 0 };

  const now = Date.now();

  if (rec.permanent) {
    return { blocked: true, fullBlock: true, permanent: true, remainingMs: 0, level: 4 };
  }

  if (rec.level >= 3 && rec.blockedUntil > now) {
    return { blocked: true, fullBlock: true, permanent: false, remainingMs: rec.blockedUntil - now, level: rec.level };
  }

  return { blocked: false, fullBlock: false, permanent: false, remainingMs: 0, level: rec.level };
}

/** Unblocks a user. Returns false if the user had no record. */
export function unblockUser(userId: string): boolean {
  if (!banMap.has(userId)) return false;
  banMap.delete(userId);
  return true;
}

export interface BanListEntry {
  userId: string;
  level: 0 | 1 | 2 | 3 | 4;
  permanent: boolean;
  remainingMs: number;   // 0 if permanent or level 0 (warned)
  levelSetAt: number;
}

/** Returns all users with an active ban record (any level ≥ 0). */
export function getBanList(): BanListEntry[] {
  const now = Date.now();
  const entries: BanListEntry[] = [];
  for (const [userId, rec] of banMap) {
    entries.push({
      userId,
      level: rec.level,
      permanent: rec.permanent,
      remainingMs: rec.permanent ? 0 : Math.max(0, rec.blockedUntil - now),
      levelSetAt: rec.levelSetAt,
    });
  }
  return entries.sort((a, b) => b.level - a.level);
}

/** Escalates the troll level for a user. Returns the new record. */
function escalateTroll(userId: string): BanRecord {
  const now = Date.now();
  const rec = banMap.get(userId);

  if (!rec) {
    // First troll detection → warning (level 0, no block)
    const newRec: BanRecord = { level: 0, blockedUntil: 0, levelSetAt: now, permanent: false };
    banMap.set(userId, newRec);
    return newRec;
  }

  if (rec.permanent) return rec;

  const age = now - rec.levelSetAt;

  switch (rec.level) {
    case 0: {
      // Was warned → 3-min unknown-command block
      const newRec: BanRecord = { level: 1, blockedUntil: now + L1_DURATION, levelSetAt: now, permanent: false };
      banMap.set(userId, newRec);
      return newRec;
    }
    case 1: {
      if (age <= L1_WINDOW) {
        // Within 6h → 12h unknown-command block
        const newRec: BanRecord = { level: 2, blockedUntil: now + L2_DURATION, levelSetAt: now, permanent: false };
        banMap.set(userId, newRec);
        return newRec;
      }
      // Window expired → reset to warning
      const newRec: BanRecord = { level: 0, blockedUntil: 0, levelSetAt: now, permanent: false };
      banMap.set(userId, newRec);
      return newRec;
    }
    case 2: {
      if (age <= L2_WINDOW) {
        // Within 12h → 2h full block
        const newRec: BanRecord = { level: 3, blockedUntil: now + L3_DURATION, levelSetAt: now, permanent: false };
        banMap.set(userId, newRec);
        return newRec;
      }
      const newRec: BanRecord = { level: 0, blockedUntil: 0, levelSetAt: now, permanent: false };
      banMap.set(userId, newRec);
      return newRec;
    }
    case 3: {
      if (age <= L3_WINDOW) {
        // Within 3 days → permanent ban
        const newRec: BanRecord = { level: 4, blockedUntil: Infinity, levelSetAt: now, permanent: true };
        banMap.set(userId, newRec);
        return newRec;
      }
      const newRec: BanRecord = { level: 0, blockedUntil: 0, levelSetAt: now, permanent: false };
      banMap.set(userId, newRec);
      return newRec;
    }
    case 4:
      return rec;
  }
}

// ── Rapid-fire unknown tracker (initial troll detection gate) ─────────────────

const trollTracker = new Map<string, { count: number; since: number }>();
const TROLL_WINDOW_MS  = 30_000;
const TROLL_THRESHOLD  = 3;

function recordUnknown(userId: string): boolean {
  const now   = Date.now();
  const entry = trollTracker.get(userId);
  if (!entry || now - entry.since > TROLL_WINDOW_MS) {
    trollTracker.set(userId, { count: 1, since: now });
    return false;
  }
  entry.count++;
  if (entry.count >= TROLL_THRESHOLD) {
    trollTracker.delete(userId);
    return true;
  }
  return false;
}

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtDuration(ms: number): string {
  if (ms <= 0) return "a moment";
  const totalSec = Math.ceil(ms / 1000);
  if (totalSec < 60) return `${totalSec} second${totalSec !== 1 ? "s" : ""}`;
  const totalMin = Math.ceil(totalSec / 60);
  if (totalMin < 60) return `${totalMin} minute${totalMin !== 1 ? "s" : ""}`;
  const totalHr = Math.ceil(totalMin / 60);
  return `${totalHr} hour${totalHr !== 1 ? "s" : ""}`;
}

// ── Admin channel config (per guild, in-memory) ───────────────────────────────

const adminChannelIds = new Map<string, string>(); // guildId → channelId

export function setAdminChannel(guildId: string, channelId: string | null): void {
  if (channelId === null) adminChannelIds.delete(guildId);
  else adminChannelIds.set(guildId, channelId);
}

export function getAdminChannelId(guildId: string): string | null {
  return adminChannelIds.get(guildId) ?? null;
}

async function notifyAdminChannel(message: Message, content: string): Promise<boolean> {
  const guildId = message.guildId;
  if (!guildId) return false;
  const channelId = adminChannelIds.get(guildId);
  if (!channelId) return false;
  const ch = message.client.channels.cache.get(channelId);
  if (!ch || !("send" in ch)) return false;
  await (ch as { send: (c: string) => Promise<unknown> }).send(content).catch(() => null);
  return true;
}

// ── Full-block message (called from bot.ts for levels 3 & 4) ─────────────────
// During an active full lockout, silently delete the message — no reply.

export async function sendBlockedMessage(
  message: Message,
  _status: BlockStatus,
  _prefix: string,
): Promise<void> {
  await message.delete().catch(() => null);
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function handleUnknownCommand(
  message: Message,
  wrongCmd: string,
  prefix: string,
  onConfirm: (match: CommandEntry) => Promise<void>,
): Promise<void> {
  const userId = message.author.id;
  const rec    = banMap.get(userId);
  const now    = Date.now();

  // ── Active level-1 or level-2 block: silently ignore junk commands ──────────
  // Real commands still work (handled before this point in bot.ts).
  // No response, no escalation during the active block window.
  if (rec && !rec.permanent && (rec.level === 1 || rec.level === 2) && rec.blockedUntil > now) {
    return;
  }

  // ── Level 0 (warned): any further bad command escalates ───────────────────
  if (rec && rec.level === 0) {
    const escalated = escalateTroll(userId);
    await handleEscalation(message, prefix, escalated);
    return;
  }

  // ── No record (or expired block): use rapid-fire gate ─────────────────────
  const pref  = getSuggestPref(userId);
  if (pref === false) return;

  const match = findClosestCommand(wrongCmd);

  if (recordUnknown(userId)) {
    const escalated = escalateTroll(userId);
    await handleEscalation(message, prefix, escalated);
    return;
  }

  // ── Normal suggestion flow ─────────────────────────────────────────────────
  if (pref === true) {
    if (!match) { await showHelpFallback(message, wrongCmd, prefix, onConfirm); return; }
    await showSuggestion(message, wrongCmd, prefix, match, onConfirm);
    return;
  }

  // Never asked — opt-in prompt
  const yesOptId = `sugoptin_yes_${message.id}`;
  const noOptId  = `sugoptin_no_${message.id}`;

  const optRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(yesOptId).setLabel("✅  Yes, help me").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(noOptId).setLabel("No thanks").setStyle(ButtonStyle.Secondary),
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
        await reply.edit({ content: `✅ Got it! I'll suggest corrections from now on.\nUse \`${prefix}help\` to see all available commands.`, components: [] });
        return;
      }

      const correctedCmd = `${prefix}${match.cmd}`;
      const yesRunId = `sugrun_yes_${message.id}`;
      const noRunId  = `sugrun_no_${message.id}`;

      const runRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(yesRunId).setLabel(`✅  Yes, run ${correctedCmd}`).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(noRunId).setLabel("No").setStyle(ButtonStyle.Secondary),
      );

      await reply.edit({
        content: `✅ Enabled! Did you mean ${match.emoji} **\`${correctedCmd}\`** — *${match.desc}*?`,
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

// ── Escalation message dispatcher ────────────────────────────────────────────

async function handleEscalation(message: Message, prefix: string, rec: BanRecord): Promise<void> {
  const user = message.author.username;

  switch (rec.level) {
    case 0: {
      // First troll warning
      await message.reply(
        `🧌 **You're a troll.**\n` +
        `If you're genuinely lost, use \`${prefix}help\` to see all available commands.\n` +
        `**Don't push it** — one more junk command and you'll be blocked for 3 minutes.`,
      );
      break;
    }
    case 1: {
      // 3-min unknown-command block
      await message.reply(
        `⏱️ **3-minute restriction.** You had your warning.\n` +
        `Junk commands are locked for **3 minutes** — real commands still work.\n` +
        `Use \`${prefix}help\` to see what's actually available.`,
      );
      break;
    }
    case 2: {
      // 12h unknown-command block
      await message.reply(
        `🚫 **12-hour restriction.** Still not getting it?\n` +
        `You can't send unknown commands for **12 hours**. Real commands still work fine.\n` +
        `Try \`${prefix}help\` if you want to see the full list.`,
      );
      break;
    }
    case 3: {
      // 2h full block — delete message, notify admin channel (no @here, no button)
      await message.delete().catch(() => null);
      const notified3 = await notifyAdminChannel(
        message,
        `🚨 **Anti-troll** — <@${message.author.id}> (\`${user}\`) has been put on a **2-hour full lockout** after repeated junk commands. Use \`${prefix}unblock @${user}\` to lift it early.`,
      );
      if (!notified3 && message.channel && "send" in message.channel) {
        await (message.channel as { send: (c: string) => Promise<unknown> }).send(
          `🔒 <@${message.author.id}> You've been locked out for **2 hours** — all commands are disabled. Contact an admin to lift it early.`,
        ).catch(() => null);
      }
      break;
    }
    case 4: {
      // Permanent ban — delete message, notify admin channel (no @here, no button)
      await message.delete().catch(() => null);
      const notified4 = await notifyAdminChannel(
        message,
        `🚨 **Anti-troll** — <@${message.author.id}> (\`${user}\`) has been **permanently banned** from bot commands after exhausting all escalation levels. Use \`${prefix}unblock @${user}\` to lift it.`,
      );
      if (!notified4 && message.channel && "send" in message.channel) {
        await (message.channel as { send: (c: string) => Promise<unknown> }).send(
          `⛔ <@${message.author.id}> You are permanently banned from using bot commands. Contact an admin to be unblocked.`,
        ).catch(() => null);
      }
      break;
    }
  }
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
    new ButtonBuilder().setCustomId(yesId).setLabel(`✅  Yes, run ${correctedCmd}`).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(noId).setLabel("No").setStyle(ButtonStyle.Secondary),
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
    new ButtonBuilder().setCustomId(yesId).setLabel(`✅  Yes, show ${helpCmd}`).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(noId).setLabel("No").setStyle(ButtonStyle.Secondary),
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
