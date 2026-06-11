import { REST, Routes, SlashCommandBuilder } from "discord.js";
import { logger } from "../lib/logger";

// ── Command definitions ───────────────────────────────────────────────────────

export const SLASH_COMMANDS = [
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show bot commands and help")
    .addStringOption((opt) =>
      opt.setName("lang")
        .setDescription("Language")
        .addChoices(
          { name: "English", value: "en" },
          { name: "Français", value: "fr" },
          { name: "Español",  value: "es" },
        )
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("radio")
    .setDescription("Play a radio station or browse the station list")
    .addStringOption((opt) =>
      opt.setName("station")
        .setDescription("Station key (e.g. nrj, heart, kexp) — leave empty for the full list")
        .setRequired(false)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("karaoke")
    .setDescription("Start karaoke with live synced lyrics")
    .addStringOption((opt) =>
      opt.setName("song")
        .setDescription("Artist and song name (e.g. Ed Sheeran Shape of You)")
        .setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("music")
    .setDescription("Generate a song with Suno AI")
    .addStringOption((opt) =>
      opt.setName("prompt")
        .setDescription("Describe the style and mood (e.g. lo-fi hip hop chill rainy day)")
        .setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("image")
    .setDescription("Generate an image with AI")
    .addStringOption((opt) =>
      opt.setName("description")
        .setDescription("Describe the image (e.g. a sunset over Paris at golden hour)")
        .setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("quest")
    .setDescription("Manage your personal quests and goals")
    .addStringOption((opt) =>
      opt.setName("action")
        .setDescription("Action to perform (default: start)")
        .setRequired(false)
        .addChoices(
          { name: "start — Create quests with AI",   value: "start"   },
          { name: "list — View your quests",          value: "list"    },
          { name: "profile — Level & XP",             value: "profile" },
          { name: "stats — 7-day chart",              value: "stats"   },
          { name: "reset — Reset all quests",         value: "reset"   },
        )
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("shazam")
    .setDescription("Identify the song currently playing in the voice channel")
    .toJSON(),
] as const;

// ── Register with Discord ─────────────────────────────────────────────────────

export async function registerSlashCommands(clientId: string, token: string): Promise<void> {
  const rest = new REST().setToken(token);
  try {
    await rest.put(Routes.applicationCommands(clientId), { body: SLASH_COMMANDS });
    logger.info({ count: SLASH_COMMANDS.length }, "Slash commands registered globally");
  } catch (err) {
    logger.error({ err }, "Failed to register slash commands");
  }
}
