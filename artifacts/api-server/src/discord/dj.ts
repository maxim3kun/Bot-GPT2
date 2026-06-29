import {
  type Message,
  type TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} from "discord.js";
import { fileURLToPath } from "url";
import path from "path";
import { logger } from "../lib/logger.js";
import {
  radioStates,
  pauseToggle,
  skipCurrentTrack,
  stopForGuild,
  playYoutube,
  searchAndQueue,
  RADIO_STATIONS,
  playRadio,
  getQueueEmbed,
  ensureVoiceConnection,
  buildNpButtonRows,
  buildRadioNpButtonRows,
  setVolume,
  getVolume,
  rewindCurrentTrack,
} from "./radio.js";
import { addLike, isLiked } from "./likes-store.js";
import { BUILT_IN_PADS } from "./soundboard.js";

// ── Console mode ───────────────────────────────────────────────────────────────

export type DjMode = "deck" | "synth";
const djMode = new Map<string, DjMode>();
function getDjMode(guildId: string): DjMode { return djMode.get(guildId) ?? "deck"; }
function setDjMode(guildId: string, mode: DjMode): void { djMode.set(guildId, mode); }

// ── Loop state ─────────────────────────────────────────────────────────────────

const loopState = new Map<string, boolean>();

export function isDjLoopEnabled(guildId: string): boolean {
  return loopState.get(guildId) ?? false;
}

export function toggleDjLoop(guildId: string): boolean {
  const current = loopState.get(guildId) ?? false;
  loopState.set(guildId, !current);
  return !current;
}

// ── Pending track search (dj:add flow) ────────────────────────────────────────

const pendingAddTrack = new Map<string, { userId: string; channelId: string; expires: number }>();

export function registerDjPendingAdd(guildId: string, userId: string, channelId: string): void {
  pendingAddTrack.set(guildId, { userId, channelId, expires: Date.now() + 60_000 });
}

export function consumeDjPendingAdd(guildId: string, userId: string): boolean {
  const entry = pendingAddTrack.get(guildId);
  if (!entry) return false;
  if (entry.userId !== userId) return false;
  if (entry.expires < Date.now()) { pendingAddTrack.delete(guildId); return false; }
  pendingAddTrack.delete(guildId);
  return true;
}

export function hasDjPendingAdd(guildId: string, userId: string): boolean {
  const entry = pendingAddTrack.get(guildId);
  if (!entry) return false;
  if (entry.userId !== userId) return false;
  if (entry.expires < Date.now()) { pendingAddTrack.delete(guildId); return false; }
  return true;
}

// ── DJ image helpers ──────────────────────────────────────────────────────────

/**
 * Returns the filename for the DJ image based on playback state.
 *  stopped.png  — nothing playing
 *  playing1.gif — 1 source active (radio OR youtube)
 *  playing2.gif — 2 sources simultaneously (soundboard effect over radio/youtube)
 */
function getDjImageFilename(guildId: string): string {
  const state = radioStates.get(guildId);
  if (!state) return "stopped.png";
  // "Loading…" is a transient placeholder, not a real playing state
  const hasRealTitle = !!(state.youtubeTitle && state.youtubeTitle !== "Loading…");
  const isPlaying = !!(state.stationKey || hasRealTitle);
  if (!isPlaying) return "stopped.png";
  const twoDecks = !!(state.sbResume);
  return twoDecks ? "playing2.gif" : "playing1.gif";
}

/**
 * Returns an AttachmentBuilder for the DJ image so it works universally
 * (Replit, Railway, Docker) without needing a public HTTP URL.
 */
function getDjImageFile(guildId: string): AttachmentBuilder {
  const filename = getDjImageFilename(guildId);
  // dist/index.mjs is one level below api-server root, so ../public/dj/ is correct
  const filePath = new URL(`../public/dj/${filename}`, import.meta.url).pathname;
  return new AttachmentBuilder(filePath, { name: filename });
}

// ── Volume helpers ─────────────────────────────────────────────────────────────

function volBar(vol: number): string {
  const pct = Math.round((vol / 2.0) * 10);
  const filled = "█".repeat(Math.min(pct, 10));
  const empty  = "░".repeat(Math.max(0, 10 - pct));
  return `${filled}${empty} **${Math.round(vol * 100)}%**`;
}

// ── DJ console embed ──────────────────────────────────────────────────────────

export function buildDjEmbed(guildId: string, highlightMsg?: string, imageFilename?: string): EmbedBuilder {
  const state  = radioStates.get(guildId);
  const loopOn = isDjLoopEnabled(guildId);
  const vol    = getVolume(guildId);

  const isIdle    = !state || (!state.stationKey && !state.youtubeTitle);
  const isPlaying = !isIdle && !state?.paused;

  // ── DECK line ─────────────────────────────────────────────────────────────
  let deckStatus: string;
  if (isIdle) {
    deckStatus = "⏹️  *Idle — ready to mix*";
  } else if (state?.paused) {
    if (state.stationKey) {
      const st = RADIO_STATIONS[state.stationKey];
      deckStatus = `⏸️  ${st ? `${st.emoji} **${st.name}**` : `📻 ${state.stationKey}`}`;
    } else {
      deckStatus = `⏸️  🎵 **${state.youtubeTitle}**`;
    }
  } else {
    if (state?.stationKey) {
      const st = RADIO_STATIONS[state.stationKey];
      deckStatus = `▶️  ${st ? `${st.emoji} **${st.name}**` : `📻 ${state.stationKey}`}`;
    } else {
      deckStatus = `▶️  🎵 **${state?.youtubeTitle ?? "Unknown"}**`;
    }
  }

  // ── MIX line (loop + volume) ───────────────────────────────────────────────
  const loopTag  = loopOn ? "🔁  " : "";
  const mixLine  = `${loopTag}🔊 ${volBar(vol)}`;

  // ── Queue preview ─────────────────────────────────────────────────────────
  const queueLen = state?.queue.length ?? 0;
  let queueSection = "";
  if (queueLen > 0) {
    queueSection = `\n**▐ QUEUE**   📋 **${queueLen}** track${queueLen > 1 ? "s" : ""} up next`;
  }

  // ── Requested by ─────────────────────────────────────────────────────────
  const reqLine = state?.requestedBy && !state.stationKey
    ? `\n**▐ DJ**        👤 <@${state.requestedBy}>`
    : "";

  // ── Idle guide ────────────────────────────────────────────────────────────
  const idleGuide = isIdle
    ? "\n*💡 Click **➕** to queue a YouTube track — or pick a station / pad below ↓*"
    : "";

  const lines: (string | null)[] = [
    highlightMsg ? `> ${highlightMsg}` : null,
    "",
    `**▐ DECK**   ${deckStatus}`,
    `**▐ MIX**    ${mixLine}`,
    queueSection  || null,
    reqLine       || null,
    idleGuide     || null,
  ];

  const desc = lines.filter(s => s !== null && s !== "").join("\n");

  const filename = imageFilename ?? getDjImageFilename(guildId);

  return new EmbedBuilder()
    .setColor(isIdle ? 0x2b2d31 : isPlaying ? 0x57f287 : 0x5865f2)
    .setTitle("🎚️  DJ Console")
    .setDescription(desc)
    .setImage(`attachment://${filename}`)
    .setFooter({ text: "⏮ restart · ▶/⏸ play-pause · ⏭ skip · 🔁 loop · ⏹ stop · ➕ add track" });
}

// ── Full DJ console payload (embed + attachment + buttons) ─────────────────────

export function buildDjConsolePayload(guildId: string, highlightMsg?: string) {
  const file     = getDjImageFile(guildId);
  const filename = getDjImageFilename(guildId);
  return {
    embeds:     [buildDjEmbed(guildId, highlightMsg, filename)],
    files:      [file],
    components: buildDjButtonRows(guildId),
  };
}

// ── Button rows ───────────────────────────────────────────────────────────────

export function buildDjButtonRows(guildId: string): ActionRowBuilder<ButtonBuilder>[] {
  const state     = radioStates.get(guildId);
  const paused    = state?.paused ?? false;
  const loopOn    = isDjLoopEnabled(guildId);
  const isRadio   = !!(state?.stationKey);
  const vol       = getVolume(guildId);
  const canRewind = !!(state?.youtubeTitle && !isRadio);
  const mode      = getDjMode(guildId);

  const radioActive = (key: string) => state?.stationKey === key;

  // ── Row 1 — Transport (always visible) ────────────────────────────────────
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("dj:rewind")
      .setEmoji("⏮️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!canRewind),
    new ButtonBuilder()
      .setCustomId("dj:playpause")
      .setEmoji(paused ? "▶️" : "⏸️")
      .setStyle(paused ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("dj:skip")
      .setEmoji(isRadio ? "📻" : "⏭️")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("dj:loop")
      .setEmoji("🔁")
      .setStyle(loopOn ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("dj:stop")
      .setEmoji("⏹️")
      .setStyle(ButtonStyle.Danger),
  );

  // ── Row 5 — Mode tabs (always visible) ────────────────────────────────────
  const tabRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("dj:tab:deck")
      .setLabel("🎚️ Deck")
      .setStyle(mode === "deck" ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("dj:tab:synth")
      .setLabel("🎹 Synth")
      .setStyle(mode === "synth" ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("dj:like")
      .setEmoji("❤️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("dj:nowplaying")
      .setEmoji("🎵")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("dj:refresh")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Secondary),
  );

  // ── SYNTH MODE — rows 2-4 are soundboard effect pads ─────────────────────
  if (mode === "synth") {
    const pads = BUILT_IN_PADS.slice(0, 15); // 3 rows × 5 pads
    const makePadRow = (slice: typeof pads) =>
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...slice.map(p =>
          new ButtonBuilder()
            .setCustomId(`sb:pad:${p.id}`)
            .setEmoji(p.emoji)
            .setLabel(p.label)
            .setStyle(p.style),
        ),
      );
    return [row1, makePadRow(pads.slice(0, 5)), makePadRow(pads.slice(5, 10)), makePadRow(pads.slice(10, 15)), tabRow];
  }

  // ── DECK MODE — rows 2-4 are mixer + radio presets ────────────────────────
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("dj:voldown")
      .setEmoji("🔉")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(vol <= 0.1),
    new ButtonBuilder()
      .setCustomId("dj:volup")
      .setEmoji("🔊")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(vol >= 2.0),
    new ButtonBuilder()
      .setCustomId("dj:shuffle")
      .setEmoji("🔀")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("dj:add")
      .setEmoji("➕")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("dj:clear")
      .setEmoji("🗑️")
      .setStyle(ButtonStyle.Danger),
  );

  const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("dj:radio:nrj")
      .setEmoji("🔥").setStyle(radioActive("nrj") ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("dj:radio:fun")
      .setEmoji("🎉").setStyle(radioActive("fun") ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("dj:radio:skyrock")
      .setEmoji("🎤").setStyle(radioActive("skyrock") ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("dj:radio:ouifm")
      .setEmoji("🎸").setStyle(radioActive("ouifm") ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("dj:radio:groove")
      .setEmoji("🌿").setStyle(radioActive("groove") ? ButtonStyle.Success : ButtonStyle.Secondary),
  );

  const row4 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("dj:radio:hiphop")
      .setEmoji("🎙️").setStyle(radioActive("hiphop") ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("dj:radio:hits90s")
      .setEmoji("💿").setStyle(radioActive("hits90s") ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("dj:radio:hits2000s")
      .setEmoji("📀").setStyle(radioActive("hits2000s") ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("dj:radio:jazz")
      .setEmoji("🎷").setStyle(radioActive("jazz") ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("dj:radio:lush")
      .setEmoji("🌸").setStyle(radioActive("lush") ? ButtonStyle.Success : ButtonStyle.Secondary),
  );

  return [row1, row2, row3, row4, tabRow];
}

// ── Open DJ console ───────────────────────────────────────────────────────────

export async function openDjConsole(message: Message): Promise<void> {
  const guildId = message.guildId;
  if (!guildId) {
    await message.reply("❌ This command can only be used in a server.");
    return;
  }

  const voiceChannel = (message.member as { voice?: { channel?: unknown } } | null)?.voice?.channel;
  if (!voiceChannel) {
    await ensureVoiceConnection(message);
    return;
  }

  await message.reply(buildDjConsolePayload(guildId, "🎛️ Welcome to the DJ Console! Control music, volume, and more."));
}

// ── Handle DJ button interactions ─────────────────────────────────────────────

import type { ButtonInteraction } from "discord.js";
import { startVoteSkip } from "./radio.js";

export async function handleDjButton(interaction: ButtonInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({ content: "❌ Guild not found.", ephemeral: true });
    return;
  }

  const action = interaction.customId.replace("dj:", "");

  // ── Playback controls ──────────────────────────────────────────────────────
  if (action === "playpause") {
    const result = pauseToggle(guildId);
    if (result === "not_playing") {
      await interaction.reply({ content: "❌ Nothing is playing right now.", ephemeral: true });
      return;
    }
    await interaction.update(buildDjConsolePayload(guildId, result === "paused" ? "⏸️ Paused." : "▶️ Resumed."));
    return;
  }

  if (action === "rewind") {
    const rewound = await rewindCurrentTrack(guildId);
    if (!rewound) {
      await interaction.reply({ content: "❌ Rewind only works for YouTube tracks, not radio.", ephemeral: true });
      return;
    }
    await interaction.update(buildDjConsolePayload(guildId, "⏮️ Restarting track from the beginning…"));
    return;
  }

  if (action === "skip") {
    const state = radioStates.get(guildId);
    if (state?.stationKey) {
      const stationKeys = Object.keys(RADIO_STATIONS);
      const currentIdx = stationKeys.indexOf(state.stationKey);
      const nextKey = stationKeys[(currentIdx + 1) % stationKeys.length];
      if (!nextKey) {
        await interaction.reply({ content: "❌ No next station found.", ephemeral: true });
        return;
      }
      await interaction.deferUpdate();
      const fakeMsg = interaction.message as unknown as Message;
      const { execSwitchRadioStation } = await import("./radio.js");
      await execSwitchRadioStation(guildId, nextKey, fakeMsg);
      await interaction.editReply(buildDjConsolePayload(guildId, `📻 Switched to **${RADIO_STATIONS[nextKey]?.name ?? nextKey}**.`));
      return;
    }
    const skipped = skipCurrentTrack(guildId);
    if (!skipped) {
      await interaction.reply({ content: "❌ Nothing to skip.", ephemeral: true });
      return;
    }
    await interaction.update(buildDjConsolePayload(guildId, `⏭️ Skipped **${skipped}**.`));
    return;
  }

  if (action === "loop") {
    const state = radioStates.get(guildId);
    if (state?.youtubeUrl && state.youtubeTitle) {
      const nowOn = toggleDjLoop(guildId);
      if (nowOn) {
        state.queue.unshift(state.youtubeUrl);
      } else {
        const idx = state.queue.indexOf(state.youtubeUrl);
        if (idx !== -1) state.queue.splice(idx, 1);
      }
      await interaction.update(buildDjConsolePayload(guildId, nowOn ? "🔁 Loop **enabled** — track will repeat." : "🔁 Loop **disabled**."));
    } else {
      const nowOn = toggleDjLoop(guildId);
      await interaction.update(buildDjConsolePayload(guildId, nowOn ? "🔁 Loop **enabled**." : "🔁 Loop **disabled**."));
    }
    return;
  }

  if (action === "stop") {
    const stopped = stopForGuild(guildId);
    loopState.delete(guildId);
    if (!stopped) {
      await interaction.reply({ content: "❌ Nothing is playing.", ephemeral: true });
      return;
    }
    await interaction.update(buildDjConsolePayload(guildId, "⏹️ Stopped and disconnected."));
    return;
  }

  // ── Volume controls ────────────────────────────────────────────────────────
  if (action === "volup" || action === "voldown") {
    const current = getVolume(guildId);
    const step = 0.1;
    const next = action === "volup" ? current + step : current - step;
    const ok = setVolume(guildId, next);
    if (!ok) {
      await interaction.reply({ content: "❌ Nothing is playing.", ephemeral: true });
      return;
    }
    const newVol = getVolume(guildId);
    await interaction.update(buildDjConsolePayload(guildId, `${action === "volup" ? "🔊" : "🔉"} Volume: **${Math.round(newVol * 100)}%**`));
    return;
  }

  // ── Queue controls ─────────────────────────────────────────────────────────
  if (action === "add") {
    registerDjPendingAdd(guildId, interaction.user.id, interaction.channelId);
    await interaction.reply({
      content: "🎵 **Add a track** — type the song name or YouTube URL in this channel within **60 seconds**:",
      ephemeral: true,
    });
    return;
  }

  if (action === "queue") {
    const state = radioStates.get(guildId);
    if (!state || state.queue.length === 0) {
      await interaction.reply({ content: "📭 The queue is empty.", ephemeral: true });
      return;
    }
    const queueEmbed = getQueueEmbed(guildId);
    if (queueEmbed) {
      await interaction.reply({ embeds: [queueEmbed], ephemeral: true });
    } else {
      await interaction.reply({ content: "📭 The queue is empty.", ephemeral: true });
    }
    return;
  }

  if (action === "shuffle") {
    const state = radioStates.get(guildId);
    if (!state || state.queue.length < 2) {
      await interaction.reply({ content: "🔀 Not enough tracks to shuffle.", ephemeral: true });
      return;
    }
    for (let i = state.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [state.queue[i], state.queue[j]] = [state.queue[j]!, state.queue[i]!];
    }
    await interaction.update(buildDjConsolePayload(guildId, `🔀 Queue shuffled — **${state.queue.length} tracks** reordered.`));
    return;
  }

  if (action === "voteskip") {
    const fakeMsg = {
      ...interaction.message,
      reply: async (content: unknown) => {
        if (typeof content === "string") {
          await interaction.reply({ content, ephemeral: true });
        } else {
          await interaction.reply({ ...(content as object), ephemeral: true } as Parameters<typeof interaction.reply>[0]);
        }
      },
      guildId,
      author: interaction.user,
      member: interaction.member,
    } as unknown as Message;
    await startVoteSkip(fakeMsg);
    return;
  }

  if (action === "clear") {
    const state = radioStates.get(guildId);
    if (!state || state.queue.length === 0) {
      await interaction.reply({ content: "📭 The queue is already empty.", ephemeral: true });
      return;
    }
    const count = state.queue.length;
    state.queue = [];
    state.queueMessages = [];
    await interaction.update(buildDjConsolePayload(guildId, `🗑️ Cleared **${count} track${count !== 1 ? "s" : ""}** from the queue.`));
    return;
  }

  // ── Like ───────────────────────────────────────────────────────────────────
  if (action === "like") {
    const state = radioStates.get(guildId);
    const isRadio = !!(state?.stationKey);
    const title = isRadio
      ? (RADIO_STATIONS[state!.stationKey!]?.name ?? state!.stationKey!)
      : state?.youtubeTitle;
    const url = isRadio ? `radio:${state!.stationKey}` : state?.youtubeUrl;
    if (!title || !url) {
      await interaction.reply({ content: "❌ Nothing is currently playing.", ephemeral: true });
      return;
    }
    if (isLiked(interaction.user.id, url)) {
      await import("./likes-store.js").then(m => m.removeLike(interaction.user.id, url));
      await interaction.reply({ content: `💔 Removed **${title}** from your likes.`, ephemeral: true });
    } else {
      await addLike(interaction.user.id, { title, url });
      await interaction.reply({ content: `❤️ Liked **${title}**! Use \`!likes\` to see your list.`, ephemeral: true });
    }
    return;
  }

  // ── Info controls ──────────────────────────────────────────────────────────
  if (action === "nowplaying") {
    const { nowPlaying } = await import("./radio.js");
    const npEmbed = nowPlaying(guildId);
    if (!npEmbed) {
      await interaction.reply({ content: "❌ Nothing is currently playing.", ephemeral: true });
      return;
    }
    const state = radioStates.get(guildId);
    const isRadio = !!(state?.stationKey);
    await interaction.reply({
      embeds: [npEmbed],
      components: isRadio ? buildRadioNpButtonRows(state?.paused ?? false) : buildNpButtonRows(state?.paused ?? false),
      ephemeral: true,
    });
    return;
  }

  if (action === "refresh") {
    await interaction.update(buildDjConsolePayload(guildId, "🔄 Console refreshed."));
    return;
  }

  // ── Mode tabs ──────────────────────────────────────────────────────────────
  if (action === "tab:deck") {
    setDjMode(guildId, "deck");
    await interaction.update(buildDjConsolePayload(guildId, "🎚️ **Deck mode** — mixer & radio presets."));
    return;
  }

  if (action === "tab:synth") {
    setDjMode(guildId, "synth");
    await interaction.update(buildDjConsolePayload(guildId, "🎹 **Synth mode** — tap a pad to play a sound effect!"));
    return;
  }

  // ── Radio station buttons ──────────────────────────────────────────────────
  if (action.startsWith("radio:")) {
    const stationKey = action.replace("radio:", "");
    const station = RADIO_STATIONS[stationKey];
    if (!station) {
      await interaction.reply({ content: `❌ Unknown station: \`${stationKey}\``, ephemeral: true });
      return;
    }

    const member = interaction.member;
    const voiceChannel = (member as { voice?: { channel?: unknown } } | null)?.voice?.channel;
    if (!voiceChannel) {
      await interaction.reply({ content: "❌ Join a voice channel first!", ephemeral: true });
      return;
    }

    await interaction.deferUpdate();

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

    try {
      await playRadio(fakeMsg, stationKey);
      await interaction.editReply(buildDjConsolePayload(guildId, `${station.emoji} Now playing **${station.name}**!`));
    } catch (err) {
      logger.error({ err, stationKey }, "DJ radio switch error");
      await interaction.followUp({ content: `❌ Failed to start **${station.name}**. Try again.`, ephemeral: true }).catch(() => null);
    }
    return;
  }

  await interaction.reply({ content: "❓ Unknown action.", ephemeral: true });
}
