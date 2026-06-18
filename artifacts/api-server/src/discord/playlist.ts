import { type Message, EmbedBuilder } from "discord.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "../lib/logger.js";
import { startQueue } from "./radio.js";
import { isMongoConnected, upsertGuildDoc, getAllGuildDocs } from "../lib/db.js";

// ── In-memory store ───────────────────────────────────────────────────────────

type GuildPlaylists = Record<string, string[]>;
const allPlaylists = new Map<string, GuildPlaylists>();
const DATA_DIR      = join(process.cwd(), "data");
const PLAYLIST_FILE = join(DATA_DIR, "playlists.json");

// ── JSON fallback helpers ─────────────────────────────────────────────────────

async function loadFromJson(): Promise<void> {
  try {
    const raw  = await readFile(PLAYLIST_FILE, "utf-8");
    const data = JSON.parse(raw) as Record<string, GuildPlaylists>;
    for (const [guildId, playlists] of Object.entries(data)) {
      allPlaylists.set(guildId, playlists);
    }
  } catch {
    // No file yet — first run
  }
}

async function saveGuildToJson(guildId: string): Promise<void> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const data: Record<string, GuildPlaylists> = {};
    for (const [id, pl] of allPlaylists) data[id] = pl;
    await writeFile(PLAYLIST_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    logger.error({ err }, "Failed to save playlists to JSON");
  }
  void guildId; // used by caller for context
}

// ── Init ──────────────────────────────────────────────────────────────────────

export async function initPlaylists(): Promise<void> {
  if (!isMongoConnected()) {
    await loadFromJson();
    logger.info({ guilds: allPlaylists.size }, "Playlists loaded from JSON (no MongoDB)");
    return;
  }
  const guilds = await getAllGuildDocs();
  for (const guild of guilds) {
    if (guild.playlists && Object.keys(guild.playlists).length > 0) {
      allPlaylists.set(guild._id, guild.playlists);
    }
  }
  logger.info({ guilds: allPlaylists.size }, "Playlists loaded from MongoDB");
}

// ── Persistence helper ────────────────────────────────────────────────────────

function persistGuild(guildId: string): void {
  const playlists = allPlaylists.get(guildId) ?? {};
  if (isMongoConnected()) {
    upsertGuildDoc(guildId, { playlists })
      .catch(err => logger.error({ err, guildId }, "Failed to persist playlists to MongoDB"));
  } else {
    saveGuildToJson(guildId).catch(err => logger.error({ err }, "Failed to save playlists to JSON"));
  }
}

function guild(guildId: string): GuildPlaylists {
  if (!allPlaylists.has(guildId)) allPlaylists.set(guildId, {});
  return allPlaylists.get(guildId)!;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function addToPlaylist(guildId: string, name: string, url: string): Promise<{ added: boolean; index: number }> {
  const g = guild(guildId);
  if (!g[name]) g[name] = [];
  g[name].push(url);
  persistGuild(guildId);
  return { added: true, index: g[name].length };
}

export async function removePlaylist(guildId: string, name: string): Promise<boolean> {
  const g = guild(guildId);
  if (!g[name]) return false;
  delete g[name];
  persistGuild(guildId);
  return true;
}

export async function removeFromPlaylist(guildId: string, name: string, index: number): Promise<boolean> {
  const g = guild(guildId);
  if (!g[name] || index < 1 || index > g[name].length) return false;
  g[name].splice(index - 1, 1);
  if (g[name].length === 0) delete g[name];
  persistGuild(guildId);
  return true;
}

export async function listPlaylists(guildId: string): Promise<EmbedBuilder> {
  const g     = guild(guildId);
  const names = Object.keys(g);

  const embed = new EmbedBuilder()
    .setTitle("🎵 Saved Playlists")
    .setColor(0x5865f2);

  if (names.length === 0) {
    embed.setDescription("No playlists yet.\nUse `!playlist add <name> <url>` to create one!");
  } else {
    embed.setDescription(
      names.map(n => `• **${n}** — ${g[n].length} video${g[n].length !== 1 ? "s" : ""}`).join("\n"),
    );
    embed.setFooter({ text: "!playlist show <name> • !playlist play <name> • !playlist delete <name>" });
  }

  return embed;
}

export async function showPlaylist(guildId: string, name: string): Promise<EmbedBuilder | null> {
  const g = guild(guildId);
  if (!g[name]) return null;

  const embed = new EmbedBuilder()
    .setTitle(`🎵 Playlist — ${name}`)
    .setColor(0xed4245);

  if (g[name].length === 0) {
    embed.setDescription("This playlist is empty.");
  } else {
    const lines = g[name].map((url, i) => {
      const short = url.length > 60 ? url.slice(0, 57) + "..." : url;
      return `**${i + 1}.** ${short}`;
    });
    embed.setDescription(lines.join("\n"));
    embed.setFooter({ text: `${g[name].length} video(s) • !playlist play ${name}` });
  }

  return embed;
}

export async function playPlaylist(message: Message, name: string): Promise<void> {
  const guildId = message.guildId!;
  const g       = guild(guildId);

  if (!g[name]) {
    await message.reply(`❌ Playlist **${name}** not found. See \`!playlist list\` for available playlists.`);
    return;
  }

  if (g[name].length === 0) {
    await message.reply(`❌ Playlist **${name}** is empty. Add videos with \`!playlist add ${name} <url>\`.`);
    return;
  }

  await startQueue(message, [...g[name]], name);
}
