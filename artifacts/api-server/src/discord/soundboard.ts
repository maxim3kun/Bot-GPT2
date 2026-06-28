import {
  type Message,
  type ButtonInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { logger } from "../lib/logger.js";
import {
  radioStates,
  stopForGuild,
  ensureVoiceConnection,
  searchAndQueue,
} from "./radio.js";

// ── Sound pad definitions ─────────────────────────────────────────────────────

interface SoundPad {
  id: string;
  label: string;
  emoji: string;
  query: string;
}

export const SOUND_PADS: SoundPad[] = [
  // Row 1 — Classics
  { id: "airhorn",   label: "Air Horn",     emoji: "📯", query: "air horn sound effect 1 hour" },
  { id: "explosion", label: "Explosion",    emoji: "💥", query: "explosion sound effect short" },
  { id: "applause",  label: "Applause",     emoji: "👏", query: "applause crowd clapping sound effect" },
  { id: "laugh",     label: "Laugh Track",  emoji: "😂", query: "laugh track sound effect sitcom" },
  { id: "drumroll",  label: "Drum Roll",    emoji: "🥁", query: "drum roll sound effect short" },
  // Row 2 — Drama
  { id: "fanfare",   label: "Fanfare",      emoji: "🎺", query: "fanfare trumpet sound effect" },
  { id: "wilhelm",   label: "Wilhelm",      emoji: "😱", query: "wilhelm scream sound effect" },
  { id: "trombone",  label: "Sad Trombone", emoji: "🎵", query: "sad trombone sound effect wah wah" },
  { id: "levelup",   label: "Level Up",     emoji: "🎯", query: "level up sound effect video game" },
  { id: "ding",      label: "Ding",         emoji: "🔔", query: "ding bell notification sound effect" },
  // Row 3 — Memes
  { id: "vineboom",  label: "Vine Boom",    emoji: "🌊", query: "vine boom sound effect" },
  { id: "oof",       label: "Oof",          emoji: "🎮", query: "roblox oof death sound effect" },
  { id: "bruh",      label: "Bruh",         emoji: "😤", query: "bruh sound effect" },
  { id: "quack",     label: "Quack",        emoji: "🦆", query: "duck quack sound effect" },
  { id: "nope",      label: "Nope",         emoji: "🚫", query: "buzzer wrong answer sound effect" },
  // Row 4 — Vibes
  { id: "victory",   label: "Victory",      emoji: "🏆", query: "victory fanfare final fantasy sound effect" },
  { id: "siren",     label: "Siren",        emoji: "🚨", query: "police siren sound effect short" },
  { id: "guitar",    label: "Guitar Riff",  emoji: "🎸", query: "electric guitar riff sound effect short" },
  { id: "circus",    label: "Circus",       emoji: "🎪", query: "circus music short funny" },
  { id: "pew",       label: "Pew Pew",      emoji: "🔫", query: "laser pew pew sound effect" },
];

const PAD_ROWS = [
  SOUND_PADS.slice(0, 5),
  SOUND_PADS.slice(5, 10),
  SOUND_PADS.slice(10, 15),
  SOUND_PADS.slice(15, 20),
];

// ── Embed ─────────────────────────────────────────────────────────────────────

export function buildSoundboardEmbed(highlightMsg?: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xfee75c)
    .setTitle("🎛️  Soundboard — Sound Pads")
    .setDescription(
      (highlightMsg ? `> ${highlightMsg}\n\n` : "") +
      "Press a pad to instantly play a sound effect in your voice channel.\n" +
      "⚠️ Playing a pad **stops current music** and plays the effect immediately."
    )
    .setFooter({ text: "!soundboard  •  !sb to reopen" })
    .setTimestamp();
}

// ── Button rows ───────────────────────────────────────────────────────────────

export function buildSoundboardRows(): ActionRowBuilder<ButtonBuilder>[] {
  return PAD_ROWS.map((row) =>
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      row.map((pad) =>
        new ButtonBuilder()
          .setCustomId(`sb:${pad.id}`)
          .setLabel(`${pad.emoji}  ${pad.label}`)
          .setStyle(ButtonStyle.Secondary)
      )
    )
  );
}

// ── Open soundboard ───────────────────────────────────────────────────────────

export async function openSoundboard(message: Message): Promise<void> {
  const guildId = message.guildId;
  if (!guildId) {
    await message.reply("❌ This command can only be used in a server.");
    return;
  }

  const voiceChannel = (message.member as { voice?: { channel?: unknown } } | null)?.voice?.channel;
  if (!voiceChannel) {
    await message.reply("❌ Join a voice channel first, then use `!soundboard`.");
    return;
  }

  await message.reply({
    embeds: [buildSoundboardEmbed("🎛️ Click a pad to play a sound in your voice channel!")],
    components: buildSoundboardRows(),
  });
}

// ── Button handler ────────────────────────────────────────────────────────────

export async function handleSoundboardButton(interaction: ButtonInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({ content: "❌ Guild not found.", ephemeral: true });
    return;
  }

  const padId = interaction.customId.replace("sb:", "");
  const pad = SOUND_PADS.find((p) => p.id === padId);
  if (!pad) {
    await interaction.reply({ content: "❓ Unknown sound pad.", ephemeral: true });
    return;
  }

  const member = interaction.member;
  const voiceChannel = (member as { voice?: { channel?: unknown } } | null)?.voice?.channel;
  if (!voiceChannel) {
    await interaction.reply({ content: "❌ Join a voice channel first!", ephemeral: true });
    return;
  }

  // Stop current playback so the sound plays immediately
  const state = radioStates.get(guildId);
  if (state) {
    state.stationKey = null;
    state.youtubeTitle = null;
    state.youtubeUrl = null;
    state.queue = [];
    state.queueMessages = [];
    state.paused = false;
    state.player.stop();
  }

  await interaction.deferUpdate();

  try {
    const fakeMsg = {
      ...interaction.message,
      reply: async (_: unknown) => interaction.message,
      edit:  async (_: unknown) => interaction.message,
      guildId,
      guild:  interaction.guild,
      member: interaction.member,
      author: interaction.user,
      channel: interaction.channel,
    } as unknown as Message;

    await searchAndQueue(fakeMsg, pad.query);

    await interaction.editReply({
      embeds: [buildSoundboardEmbed(`${pad.emoji} Playing **${pad.label}**…`)],
      components: buildSoundboardRows(),
    });
  } catch (err) {
    logger.error({ err, padId }, "Soundboard play error");
    await interaction.followUp({
      content: `❌ Could not play **${pad.label}**. Try again.`,
      ephemeral: true,
    }).catch(() => null);
  }
}
