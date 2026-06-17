import { REST, Routes, SlashCommandBuilder } from "discord.js";
import { logger } from "../lib/logger";

export const SLASH_COMMANDS = [
  // ── Help ──────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show bot commands and help")
    .addStringOption(opt =>
      opt.setName("lang").setDescription("Language")
        .addChoices(
          { name: "English",  value: "en" },
          { name: "Français", value: "fr" },
          { name: "Español",  value: "es" },
        ),
    )
    .toJSON(),

  // ── YouTube (autocomplete) ─────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("youtube")
    .setDescription("Search and play a YouTube video by artist + song")
    .addStringOption(opt =>
      opt.setName("artist")
        .setDescription("Artist name (type to get suggestions)")
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addStringOption(opt =>
      opt.setName("song")
        .setDescription("Song name (type to get suggestions)")
        .setRequired(true)
        .setAutocomplete(true),
    )
    .toJSON(),

  // ── Play (URL or search query) ─────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a YouTube URL or search for a track")
    .addStringOption(opt =>
      opt.setName("query")
        .setDescription("YouTube URL or search query (e.g. Dua Lipa Levitating)")
        .setRequired(true),
    )
    .toJSON(),

  // ── Now Playing ───────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("np")
    .setDescription("Show what is currently playing")
    .toJSON(),

  // ── Skip ──────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skip the current track")
    .toJSON(),

  // ── Stop ──────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop playback and disconnect the bot from voice")
    .toJSON(),

  // ── Join ──────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("join")
    .setDescription("Make the bot join your voice channel")
    .toJSON(),

  // ── Leave ─────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("leave")
    .setDescription("Make the bot leave the voice channel")
    .toJSON(),

  // ── Queue ─────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show the current playback queue")
    .toJSON(),

  // ── Say ───────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("say")
    .setDescription("Make the bot send a message in this channel")
    .addStringOption(opt =>
      opt.setName("text")
        .setDescription("The text to send")
        .setRequired(true),
    )
    .toJSON(),

  // ── Radio ─────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("radio")
    .setDescription("Play a radio station or browse the station list")
    .addStringOption(opt =>
      opt.setName("station")
        .setDescription("Station key (e.g. nrj, heart, kexp) — leave empty for the full list")
        .setRequired(false),
    )
    .toJSON(),

  // ── Joke ──────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("joke")
    .setDescription("Get a random joke")
    .addStringOption(opt =>
      opt.setName("lang").setDescription("Language")
        .addChoices(
          { name: "English",  value: "en" },
          { name: "Français", value: "fr" },
          { name: "Español",  value: "es" },
        ),
    )
    .toJSON(),

  // ── Roll ──────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Roll a dice")
    .addIntegerOption(opt =>
      opt.setName("faces")
        .setDescription("Number of faces (default: 6)")
        .setMinValue(2)
        .setMaxValue(1000)
        .setRequired(false),
    )
    .toJSON(),

  // ── 8ball ─────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the magic 8-ball a yes/no question")
    .addStringOption(opt =>
      opt.setName("question")
        .setDescription("Your question")
        .setRequired(true),
    )
    .toJSON(),

  // ── Trivia ────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("trivia")
    .setDescription("Start a trivia quiz question (requires AI)")
    .toJSON(),

  // ── Karaoke ───────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("karaoke")
    .setDescription("Start karaoke with live synced lyrics")
    .addStringOption(opt =>
      opt.setName("song")
        .setDescription("Artist and song name (e.g. Ed Sheeran Shape of You)")
        .setRequired(true),
    )
    .toJSON(),

  // ── Music (Suno) ──────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("music")
    .setDescription("Generate a song with Suno AI")
    .addStringOption(opt =>
      opt.setName("prompt")
        .setDescription("Describe the style and mood (e.g. lo-fi hip hop chill rainy day)")
        .setRequired(true),
    )
    .toJSON(),

  // ── Image (HuggingFace) ───────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("image")
    .setDescription("Generate an image with AI (requires HuggingFace token)")
    .addStringOption(opt =>
      opt.setName("description")
        .setDescription("Describe the image (e.g. a sunset over Paris at golden hour)")
        .setRequired(true),
    )
    .toJSON(),

  // ── Quest ─────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("quest")
    .setDescription("Manage your personal quests and goals")
    .addStringOption(opt =>
      opt.setName("action").setDescription("Action to perform (default: start)")
        .setRequired(false)
        .addChoices(
          { name: "start — Create quests with AI",   value: "start"   },
          { name: "list — View your quests",          value: "list"    },
          { name: "profile — Level & XP",             value: "profile" },
          { name: "stats — 7-day chart",              value: "stats"   },
          { name: "reset — Reset all quests",         value: "reset"   },
        ),
    )
    .toJSON(),

  // ── Shazam ────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("shazam")
    .setDescription("Identify the song currently playing in the voice channel")
    .toJSON(),
] as const;

export async function registerSlashCommands(clientId: string, token: string): Promise<void> {
  const rest = new REST().setToken(token);
  try {
    await rest.put(Routes.applicationCommands(clientId), { body: SLASH_COMMANDS });
    logger.info({ count: SLASH_COMMANDS.length }, "Slash commands registered globally");
  } catch (err) {
    logger.error({ err }, "Failed to register slash commands");
  }
}
