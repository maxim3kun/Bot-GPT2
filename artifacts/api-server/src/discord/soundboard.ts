import {
  type Message,
  type ButtonInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { logger } from "../lib/logger.js";
import { radioStates, playSoundEffect } from "./radio.js";

// ── Built-in sound pads ───────────────────────────────────────────────────────

export interface SoundPad {
  id: string;
  emoji: string;
  style: ButtonStyle;
  query: string;
  label: string;
}

export const BUILT_IN_PADS: SoundPad[] = [
  // Row 1 — Impact (red)
  { id: "airhorn",   emoji: "📯", style: ButtonStyle.Danger,    query: "air horn sound effect",                      label: "Air Horn"    },
  { id: "explosion", emoji: "💥", style: ButtonStyle.Danger,    query: "explosion sound effect short",               label: "Explosion"   },
  { id: "vineboom",  emoji: "💢", style: ButtonStyle.Danger,    query: "vine boom sound effect",                     label: "Vine Boom"   },
  { id: "dun",       emoji: "🎵", style: ButtonStyle.Danger,    query: "dun dun dun dramatic sting sound effect",    label: "Dun Dun Dun" },
  { id: "nope",      emoji: "🚫", style: ButtonStyle.Danger,    query: "buzzer wrong answer sound effect",           label: "Nope"        },
  // Row 2 — Positive (green)
  { id: "applause",  emoji: "👏", style: ButtonStyle.Success,   query: "applause crowd clapping sound effect",       label: "Applause"    },
  { id: "victory",   emoji: "🏆", style: ButtonStyle.Success,   query: "victory fanfare final fantasy sound effect", label: "Victory"     },
  { id: "levelup",   emoji: "⬆️", style: ButtonStyle.Success,   query: "level up sound effect video game",           label: "Level Up"    },
  { id: "tada",      emoji: "🎉", style: ButtonStyle.Success,   query: "tada fanfare win jingle sound effect",       label: "Tada"        },
  { id: "ding",      emoji: "🔔", style: ButtonStyle.Success,   query: "ding bell notification sound effect",        label: "Ding"        },
  // Row 3 — Meme (blue)
  { id: "oof",       emoji: "😵", style: ButtonStyle.Primary,   query: "roblox oof death sound effect",              label: "Oof"         },
  { id: "bruh",      emoji: "😤", style: ButtonStyle.Primary,   query: "bruh sound effect",                          label: "Bruh"        },
  { id: "trombone",  emoji: "🎺", style: ButtonStyle.Primary,   query: "sad trombone sound effect wah wah",          label: "Sad Trombone"},
  { id: "circus",    emoji: "🎪", style: ButtonStyle.Primary,   query: "circus music short funny",                   label: "Circus"      },
  { id: "quack",     emoji: "🦆", style: ButtonStyle.Primary,   query: "duck quack sound effect",                    label: "Quack"       },
  // Row 4 — Misc (grey)
  { id: "drumroll",  emoji: "🥁", style: ButtonStyle.Secondary, query: "drum roll sound effect short",               label: "Drum Roll"   },
  { id: "guitar",    emoji: "🎸", style: ButtonStyle.Secondary, query: "electric guitar riff sound effect short",    label: "Guitar Riff" },
  { id: "pew",       emoji: "🔫", style: ButtonStyle.Secondary, query: "laser pew pew sound effect",                 label: "Pew Pew"     },
  { id: "laugh",     emoji: "😂", style: ButtonStyle.Secondary, query: "laugh track sound effect sitcom",            label: "Laugh Track" },
  { id: "fanfare",   emoji: "📣", style: ButtonStyle.Secondary, query: "fanfare trumpet short sound effect",         label: "Fanfare"     },
];

// ── Custom sounds store (per-guild, JSON-backed) ──────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = `${__dirname}/../../data/soundboard-custom.json`;

const customStore = new Map<string, SoundPad[]>();

async function persistCustom(): Promise<void> {
  try {
    const obj: Record<string, SoundPad[]> = {};
    for (const [k, v] of customStore) obj[k] = v;
    await mkdir(dirname(DATA_PATH), { recursive: true });
    await writeFile(DATA_PATH, JSON.stringify(obj, null, 2), "utf8");
  } catch (err) {
    logger.error({ err }, "Failed to persist custom soundboard");
  }
}

export async function loadCustomSounds(): Promise<void> {
  try {
    const raw = await readFile(DATA_PATH, "utf8");
    const obj = JSON.parse(raw) as Record<string, SoundPad[]>;
    for (const [k, v] of Object.entries(obj)) customStore.set(k, v);
    logger.info({ guilds: customStore.size }, "Custom soundboard loaded");
  } catch {
    // File doesn't exist yet — that's fine
  }
}

export function getCustomSounds(guildId: string): SoundPad[] {
  return customStore.get(guildId) ?? [];
}

export async function addCustomSound(guildId: string, pad: SoundPad): Promise<boolean> {
  const existing = customStore.get(guildId) ?? [];
  if (existing.length >= 5) return false;
  if (existing.some(p => p.id === pad.id)) return false;
  customStore.set(guildId, [...existing, pad]);
  await persistCustom();
  return true;
}

export async function removeCustomSound(guildId: string, id: string): Promise<boolean> {
  const existing = customStore.get(guildId) ?? [];
  const next = existing.filter(p => p.id !== id);
  if (next.length === existing.length) return false;
  customStore.set(guildId, next);
  await persistCustom();
  return true;
}

// ── Embed ─────────────────────────────────────────────────────────────────────

export function buildSoundboardEmbed(guildId?: string, highlightMsg?: string): EmbedBuilder {
  const custom = guildId ? getCustomSounds(guildId) : [];
  const footer = custom.length > 0
    ? `!sb to reopen  •  !sb add <emoji> <name> <search>  •  !sb remove <name>`
    : `!sb to reopen  •  !sb add <emoji> <name> <YouTube search> to add a custom pad`;
  return new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle("🎛️  Soundboard")
    .setDescription(
      (highlightMsg ? `> ${highlightMsg}\n\n` : "") +
      "🔴 **Impact** · 🟢 **Positive** · 🔵 **Meme** · ⚫ **Misc**" +
      (custom.length > 0 ? " · 🟣 **Custom**" : "") + "\n" +
      "Press a pad to instantly play a sound in your voice channel.\n" +
      "⚠️ Playing a pad **stops current music** and plays the effect immediately."
    )
    .setFooter({ text: footer })
    .setTimestamp();
}

// ── Button rows ───────────────────────────────────────────────────────────────

export function buildSoundboardRows(guildId?: string): ActionRowBuilder<ButtonBuilder>[] {
  const builtInRows: SoundPad[][] = [
    BUILT_IN_PADS.slice(0, 5),
    BUILT_IN_PADS.slice(5, 10),
    BUILT_IN_PADS.slice(10, 15),
    BUILT_IN_PADS.slice(15, 20),
  ];

  const rows = builtInRows.map((row) =>
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      row.map((pad) =>
        new ButtonBuilder()
          .setCustomId(`sb:${pad.id}`)
          .setEmoji(pad.emoji)
          .setStyle(pad.style)
      )
    )
  );

  // Row 5: custom sounds (max 5)
  if (guildId) {
    const custom = getCustomSounds(guildId);
    if (custom.length > 0) {
      rows.push(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          custom.map((pad) =>
            new ButtonBuilder()
              .setCustomId(`sb:custom:${pad.id}`)
              .setEmoji(pad.emoji)
              .setStyle(ButtonStyle.Primary)
          )
        )
      );
    }
  }

  return rows;
}

// ── Open soundboard ───────────────────────────────────────────────────────────

export async function openSoundboard(message: Message): Promise<void> {
  const guildId = message.guildId;
  if (!guildId) {
    await message.reply("❌ This command only works in a server.");
    return;
  }

  const voiceChannel = (message.member as { voice?: { channel?: unknown } } | null)?.voice?.channel;
  if (!voiceChannel) {
    await message.reply("❌ Join a voice channel first, then use `!sb`.");
    return;
  }

  await message.reply({
    embeds: [buildSoundboardEmbed(guildId)],
    components: buildSoundboardRows(guildId),
  });
}

// ── Button handler ────────────────────────────────────────────────────────────

export async function handleSoundboardButton(interaction: ButtonInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({ content: "❌ Guild not found.", ephemeral: true });
    return;
  }

  const rawId = interaction.customId.replace("sb:", "");
  const isCustom = rawId.startsWith("custom:");
  const padId = isCustom ? rawId.replace("custom:", "") : rawId;

  let pad: SoundPad | undefined;
  if (isCustom) {
    pad = getCustomSounds(guildId).find(p => p.id === padId);
  } else {
    pad = BUILT_IN_PADS.find(p => p.id === padId);
  }

  if (!pad) {
    await interaction.reply({ content: "❓ Unknown pad.", ephemeral: true });
    return;
  }

  const member = interaction.member;
  const voiceChannel = (member as { voice?: { channel?: unknown } } | null)?.voice?.channel;
  if (!voiceChannel) {
    await interaction.reply({ content: "❌ Join a voice channel first!", ephemeral: true });
    return;
  }

  // Stop current playback
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

  // Acknowledge the interaction immediately
  await interaction.deferUpdate();

  // ── Update the UI right away so the user sees feedback instantly ──────────
  await interaction.editReply({
    embeds: [buildSoundboardEmbed(guildId, `${pad.emoji} **${pad.label}** — loading…`)],
    components: buildSoundboardRows(guildId),
  }).catch(() => null);

  // Build a fake message so playSoundEffect can join/use the voice connection
  const fakeMsg = {
    guildId,
    guild:   interaction.guild,
    member:  interaction.member,
    author:  interaction.user,
    channel: interaction.channel,
    reply:   async () => ({}),
    edit:    async () => ({}),
  } as unknown as Message;

  // ── Play in the background — don't block the UI ───────────────────────────
  playSoundEffect(fakeMsg, pad.query).catch((err) => {
    logger.error({ err, padId }, "Soundboard play error");
  });
}
