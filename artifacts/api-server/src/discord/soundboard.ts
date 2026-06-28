import {
  type Message,
  type ButtonInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { logger } from "../lib/logger.js";
import { radioStates, searchAndQueue } from "./radio.js";

// ── Sound pad definitions ─────────────────────────────────────────────────────
// style: Danger=red, Success=green, Primary=blue, Secondary=grey

interface SoundPad {
  id: string;
  emoji: string;
  style: ButtonStyle;
  query: string;
  label: string; // used in feedback message only
}

export const SOUND_PADS: SoundPad[] = [
  // Row 1 — Impact (rouge)
  { id: "airhorn",   emoji: "📯", style: ButtonStyle.Danger,    query: "air horn sound effect",              label: "Air Horn" },
  { id: "explosion", emoji: "💥", style: ButtonStyle.Danger,    query: "explosion sound effect short",       label: "Explosion" },
  { id: "siren",     emoji: "🚨", style: ButtonStyle.Danger,    query: "police siren sound effect short",    label: "Sirène" },
  { id: "wilhelm",   emoji: "😱", style: ButtonStyle.Danger,    query: "wilhelm scream sound effect",        label: "Wilhelm" },
  { id: "vineboom",  emoji: "💢", style: ButtonStyle.Danger,    query: "vine boom sound effect",             label: "Vine Boom" },
  // Row 2 — Positif (vert)
  { id: "applause",  emoji: "👏", style: ButtonStyle.Success,   query: "applause crowd clapping sound effect", label: "Applause" },
  { id: "victory",   emoji: "🏆", style: ButtonStyle.Success,   query: "victory fanfare final fantasy sound effect", label: "Victoire" },
  { id: "levelup",   emoji: "⬆️", style: ButtonStyle.Success,   query: "level up sound effect video game",   label: "Level Up" },
  { id: "fanfare",   emoji: "🎺", style: ButtonStyle.Success,   query: "fanfare trumpet sound effect",        label: "Fanfare" },
  { id: "ding",      emoji: "🔔", style: ButtonStyle.Success,   query: "ding bell notification sound effect", label: "Ding" },
  // Row 3 — Mème (bleu)
  { id: "oof",       emoji: "😵", style: ButtonStyle.Primary,   query: "roblox oof death sound effect",      label: "Oof" },
  { id: "bruh",      emoji: "😤", style: ButtonStyle.Primary,   query: "bruh sound effect",                  label: "Bruh" },
  { id: "trombone",  emoji: "📯", style: ButtonStyle.Primary,   query: "sad trombone sound effect wah wah",  label: "Sad Trombone" },
  { id: "circus",    emoji: "🎪", style: ButtonStyle.Primary,   query: "circus music short funny",           label: "Circus" },
  { id: "quack",     emoji: "🦆", style: ButtonStyle.Primary,   query: "duck quack sound effect",            label: "Quack" },
  // Row 4 — Divers (gris)
  { id: "drumroll",  emoji: "🥁", style: ButtonStyle.Secondary, query: "drum roll sound effect short",       label: "Drum Roll" },
  { id: "guitar",    emoji: "🎸", style: ButtonStyle.Secondary, query: "electric guitar riff sound effect short", label: "Guitar Riff" },
  { id: "pew",       emoji: "🔫", style: ButtonStyle.Secondary, query: "laser pew pew sound effect",         label: "Pew Pew" },
  { id: "laugh",     emoji: "😂", style: ButtonStyle.Secondary, query: "laugh track sound effect sitcom",    label: "Laugh Track" },
  { id: "nope",      emoji: "🚫", style: ButtonStyle.Secondary, query: "buzzer wrong answer sound effect",   label: "Nope" },
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
    .setColor(0x2b2d31)
    .setTitle("🎛️  Soundboard")
    .setDescription(
      (highlightMsg ? `> ${highlightMsg}\n\n` : "") +
      "🔴 **Impact** · 🟢 **Positif** · 🔵 **Mème** · ⚫ **Divers**\n" +
      "Clique un pad pour jouer un son dans ton salon vocal.\n" +
      "⚠️ Le pad **arrête la musique en cours** et joue l'effet immédiatement."
    )
    .setFooter({ text: "!sb pour rouvrir" })
    .setTimestamp();
}

// ── Button rows (emoji seulement, couleurs par catégorie) ─────────────────────

export function buildSoundboardRows(): ActionRowBuilder<ButtonBuilder>[] {
  return PAD_ROWS.map((row) =>
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      row.map((pad) =>
        new ButtonBuilder()
          .setCustomId(`sb:${pad.id}`)
          .setEmoji(pad.emoji)
          .setStyle(pad.style)
      )
    )
  );
}

// ── Open soundboard ───────────────────────────────────────────────────────────

export async function openSoundboard(message: Message): Promise<void> {
  const guildId = message.guildId;
  if (!guildId) {
    await message.reply("❌ Cette commande ne fonctionne que dans un serveur.");
    return;
  }

  const voiceChannel = (message.member as { voice?: { channel?: unknown } } | null)?.voice?.channel;
  if (!voiceChannel) {
    await message.reply("❌ Rejoins d'abord un salon vocal, puis utilise `!sb`.");
    return;
  }

  await message.reply({
    embeds: [buildSoundboardEmbed()],
    components: buildSoundboardRows(),
  });
}

// ── Button handler ────────────────────────────────────────────────────────────

export async function handleSoundboardButton(interaction: ButtonInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({ content: "❌ Guild non trouvée.", ephemeral: true });
    return;
  }

  const padId = interaction.customId.replace("sb:", "");
  const pad = SOUND_PADS.find((p) => p.id === padId);
  if (!pad) {
    await interaction.reply({ content: "❓ Pad inconnu.", ephemeral: true });
    return;
  }

  const member = interaction.member;
  const voiceChannel = (member as { voice?: { channel?: unknown } } | null)?.voice?.channel;
  if (!voiceChannel) {
    await interaction.reply({ content: "❌ Rejoins d'abord un salon vocal !", ephemeral: true });
    return;
  }

  // Couper la musique en cours pour jouer l'effet immédiatement
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
      embeds: [buildSoundboardEmbed(`${pad.emoji} **${pad.label}** en cours…`)],
      components: buildSoundboardRows(),
    });
  } catch (err) {
    logger.error({ err, padId }, "Soundboard play error");
    await interaction.followUp({
      content: `❌ Impossible de jouer **${pad.label}**. Réessaie.`,
      ephemeral: true,
    }).catch(() => null);
  }
}
