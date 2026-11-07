import { EmbedBuilder, type Message } from "discord.js";
import { getCredits, generateSong, pollSong } from "../lib/suno-client.js";
import { logger } from "../lib/logger.js";
import { reportModuleFailure } from "./module-technician.js";

export async function generateMusicTrack(
  message: Message,
  prompt: string,
  source = "music",
): Promise<void> {
  const startEmbed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🎵 Generating your track…")
    .setDescription(`**Prompt:** ${prompt}`)
    .setFooter({ text: "Suno is generating your track, around 30-60 seconds ⏳" });
  const reply = await message.reply({ embeds: [startEmbed] });

  let taskId: string;
  try {
    taskId = await generateSong({ prompt });
  } catch (err) {
    await reportModuleFailure(message, "music", err, "suno");
    logger.error({ err }, `Suno generate error${source === "generator music" ? " (!generator music)" : ""}`);
    await reply.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("❌ Error")
          .setDescription(`Failed to start generation: ${String(err)}`),
      ],
    });
    return;
  }

  const pollIntervalMs = 8000;
  const maxPollAttempts = 15;
  let lastPollError: unknown = null;
  let completed = false;
  for (let attempt = 1; attempt <= maxPollAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    let result;
    try {
      result = await pollSong(taskId);
    } catch (err) {
      lastPollError = err;
      logger.warn({ err, attempt }, "Suno poll retry");
      continue;
    }
    lastPollError = null;

    const status = result.status.toUpperCase();
    if (status === "ERROR" || status === "FAILED" || status === "FAILURE") {
      await reportModuleFailure(message, "music", new Error(`Suno generation status: ${status}`), "suno");
      await reply.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("❌ Generation Failed")
            .setDescription("Suno returned an error. Try a different prompt.")
            .addFields({ name: "Task ID", value: taskId }),
        ],
      });
      completed = true;
      break;
    }

    if (result.done && result.clips.length > 0) {
      const embeds = result.clips.filter((clip) => clip.audio_url).map((clip) => {
        const embed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle(`🎶 ${clip.title ?? "Generated Track"}`)
          .setDescription(`**Prompt:** ${clip.prompt ?? prompt}`)
          .addFields({ name: "🎵 Listen", value: clip.audio_url! })
          .setFooter({ text: `Task ID: ${taskId}` });
        if (clip.image_url) embed.setThumbnail(clip.image_url);
        if (clip.duration) embed.addFields({ name: "⏱ Duration", value: `${Math.round(clip.duration)}s`, inline: true });
        if (clip.tags) embed.addFields({ name: "🎸 Style", value: clip.tags.slice(0, 100), inline: true });
        return embed;
      });
      if (embeds.length > 0) {
        await reply.edit({ embeds });
        completed = true;
        break;
      }
    }

    await reply.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle("🎵 Generating your track…")
          .setDescription(`**Prompt:** ${prompt}`)
          .addFields(
            { name: "Status", value: result.status, inline: true },
            { name: "Attempt", value: `${attempt}/${maxPollAttempts}`, inline: true },
          )
          .setFooter({ text: "Suno is working on it ⏳" }),
      ],
    });
  }

  if (!completed) {
    await reportModuleFailure(
      message,
      "music",
      lastPollError ?? new Error("Suno generation timed out"),
      "suno",
    );
    await reply.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("❌ Generation timed out")
          .setDescription("Suno did not finish the track in time. Try again later."),
      ],
    }).catch(() => null);
  }
}

export async function handleSunoBalanceCommand(message: Message): Promise<void> {
  if (!process.env["SUNO_API_KEY"]) {
    await message.reply("❌ Music generation is not configured. Ask a moderator to set it up — use `!mode d'emploi` for instructions.");
    return;
  }

  try {
    const credits = await getCredits();
    const embed = new EmbedBuilder()
      .setColor(credits > 10 ? 0x57f287 : credits > 0 ? 0xfee75c : 0xed4245)
      .setTitle("💳 Suno Credits")
      .addFields({ name: "Remaining credits", value: `${credits}`, inline: true })
      .setFooter({ text: "Each generation consumes credits from sunoapi.org" });
    await message.reply({ embeds: [embed] });
  } catch (err) {
    await reportModuleFailure(message, "music", err, "suno");
    await message.reply(`❌ Could not fetch credits: ${String(err)}`);
  }
}
