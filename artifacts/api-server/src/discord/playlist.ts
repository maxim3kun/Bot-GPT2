import { type Message, EmbedBuilder } from "discord.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "../lib/logger";
import { startQueue } from "./radio";

// ── Persistence ───────────────────────────────────────────────────────────────

type GuildPlaylists = Record<string, string[]>;
const allPlaylists = new Map<string, GuildPlaylists>();
const DATA_DIR = join(process.cwd(), "data");
const PLAYLIST_FILE = join(DATA_DIR, "playlists.json");
let loaded = false;

async function load(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await readFile(PLAYLIST_FILE, "utf-8");
    const data = JSON.parse(raw) as Record<string, GuildPlaylists>;
    for (const [guildId, playlists] of Object.entries(data)) {
      allPlaylists.set(guildId, playlists);
    }
  } catch {
    // First run, no file yet
  }
}

async function save(): Promise<void> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const data: Record<string, GuildPlaylists> = {};
    for (const [guildId, playlists] of allPlaylists) {
      data[guildId] = playlists;
    }
    await writeFile(PLAYLIST_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    logger.error({ err }, "Failed to save playlists");
  }
}

function guild(guildId: string): GuildPlaylists {
  if (!allPlaylists.has(guildId)) allPlaylists.set(guildId, {});
  return allPlaylists.get(guildId)!;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function addToPlaylist(guildId: string, name: string, url: string): Promise<{ added: boolean; index: number }> {
  await load();
  const g = guild(guildId);
  if (!g[name]) g[name] = [];
  g[name].push(url);
  await save();
  return { added: true, index: g[name].length };
}

export async function removePlaylist(guildId: string, name: string): Promise<boolean> {
  await load();
  const g = guild(guildId);
  if (!g[name]) return false;
  delete g[name];
  await save();
  return true;
}

export async function removeFromPlaylist(guildId: string, name: string, index: number): Promise<boolean> {
  await load();
  const g = guild(guildId);
  if (!g[name] || index < 1 || index > g[name].length) return false;
  g[name].splice(index - 1, 1);
  if (g[name].length === 0) delete g[name];
  await save();
  return true;
}

export async function listPlaylists(guildId: string): Promise<EmbedBuilder> {
  await load();
  const g = guild(guildId);
  const names = Object.keys(g);

  const embed = new EmbedBuilder()
    .setTitle("🎵 Saved Playlists")
    .setColor(0x5865f2);

  if (names.length === 0) {
    embed.setDescription("No playlists yet.\nUse `!playlist add <name> <url>` to create one!");
  } else {
    embed.setDescription(
      names.map((n) => `• **${n}** — ${g[n].length} video${g[n].length !== 1 ? "s" : ""}`).join("\n"),
    );
    embed.setFooter({ text: "!playlist show <name> • !playlist play <name> • !playlist delete <name>" });
  }

  return embed;
}

export async function showPlaylist(guildId: string, name: string): Promise<EmbedBuilder | null> {
  await load();
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
  await load();
  const guildId = message.guildId!;
  const g = guild(guildId);

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
