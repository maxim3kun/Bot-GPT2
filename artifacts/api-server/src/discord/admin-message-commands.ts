import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ComponentType,
  EmbedBuilder,
  PermissionFlagsBits,
  type Message,
} from "discord.js";
import {
  getAdminChannelId,
  getBanList,
  setAdminChannel,
  unblockUser,
} from "./command-suggest.js";
import { commandSuggestStatus, commandSuggestText } from "./command-suggest-i18n.js";
import { getPrefix, resetPrefix, setPrefix } from "./prefix-store.js";
import { getSuggestPref, setSuggestPref } from "./suggest-prefs.js";
import { getVoicePickerChannels, setVoicePickerChannels } from "./voice-picker-channels.js";
import type { Language } from "./responses.js";

export async function handleAdminMessageCommand(
  message: Message,
  command: string | undefined,
  args: string[],
  guildPrefix: string,
  responseLang: Language,
): Promise<boolean> {
  switch (command) {
    case "prefix": {
      const currentPrefix = getPrefix(message.guildId);
      if (!args[0]) {
        await message.reply(
          `📌 Current prefix: \`${currentPrefix}\`\n` +
          `➤ Change it: \`${currentPrefix}prefix <new>\` *(admin only, max 3 chars)*\n` +
          `➤ Reset: \`${currentPrefix}prefix reset\``,
        );
        return true;
      }

      const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator)
        || message.member?.permissions.has(PermissionFlagsBits.ManageGuild);
      if (!isAdmin) {
        await message.reply("🔒 Only admins can change the prefix. (Requires **Manage Server** permission)");
        return true;
      }

      if (args[0].toLowerCase() === "reset") {
        if (!message.guildId) return true;
        resetPrefix(message.guildId);
        await message.reply("✅ Prefix reset to `!` (default).");
        return true;
      }

      const newPrefix = args[0];
      if (newPrefix.length > 3) {
        await message.reply("❌ Prefix must be 3 characters or less (e.g. `?`, `>>`, `$.`).");
        return true;
      }
      if (/\s/.test(newPrefix)) {
        await message.reply("❌ Prefix cannot contain spaces.");
        return true;
      }
      if (!message.guildId) return true;
      setPrefix(message.guildId, newPrefix);
      await message.reply(
        `✅ Prefix changed to \`${newPrefix}\`\n` +
        `Example: \`${newPrefix}help\`, \`${newPrefix}radio nrj\`, \`${newPrefix}music generator lo-fi\``,
      );
      return true;
    }

    case "voicechannels":
    case "voicesalons":
    case "salonsvocaux": {
      const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator)
        || message.member?.permissions.has(PermissionFlagsBits.ManageGuild);
      if (!isAdmin) {
        await message.reply("🔒 Only admins can configure this. (**Manage Server** permission required)");
        return true;
      }
      if (!message.guildId) return true;

      if (args[0]?.toLowerCase() === "reset") {
        await setVoicePickerChannels(message.guildId, []);
        await message.reply("✅ Voice channel picker reset — the first 2 voice channels of the server will be shown.");
        return true;
      }

      const mentionedChannels = [...message.mentions.channels.values()]
        .filter((channel) => channel.type === ChannelType.GuildVoice)
        .slice(0, 2);
      if (mentionedChannels.length === 0) {
        const current = getVoicePickerChannels(message.guildId);
        const description = current.length > 0
          ? `Current channels: ${current.map((id) => `<#${id}>`).join(", ")}`
          : "Current channels: first 2 voice channels of the server";
        await message.reply(
          `🔊 **Voice channel picker**\n${description}\n\n` +
          `➤ Set channels: \`${guildPrefix}voicechannels #channel1 #channel2\`\n` +
          `➤ Reset to default: \`${guildPrefix}voicechannels reset\``,
        );
        return true;
      }

      const newIds = mentionedChannels.map((channel) => channel.id);
      await setVoicePickerChannels(message.guildId, newIds);
      await message.reply(`✅ Voice picker updated! Channels shown: ${newIds.map((id) => `<#${id}>`).join(", ")}`);
      return true;
    }

    case "suggest":
    case "suggestion":
    case "sugerencia": {
      const subcommand = args[0]?.toLowerCase();
      if (subcommand === "on" || subcommand === "off") {
        const enabled = subcommand === "on";
        setSuggestPref(message.author.id, enabled);
        await message.reply(
          enabled
            ? commandSuggestText(responseLang, "enabled", guildPrefix)
            : commandSuggestText(responseLang, "optedOut", guildPrefix),
        );
      } else {
        const current = getSuggestPref(message.author.id);
        await message.reply(commandSuggestStatus(
          responseLang,
          current ?? null,
          `${guildPrefix}suggest on`,
          `${guildPrefix}suggest off`,
        ));
      }
      return true;
    }

    case "unblock": {
      const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator)
        || message.member?.permissions.has(PermissionFlagsBits.ManageGuild);
      if (!isAdmin) {
        await message.reply("🔒 Only admins can use this command.");
        return true;
      }

      const mentionMatch = args[0]?.match(/^<@!?(\d+)>$/);
      const targetId = mentionMatch?.[1];
      if (!targetId) {
        await message.reply(`❓ Usage: \`${guildPrefix}unblock @user\``);
        return true;
      }

      if (unblockUser(targetId)) {
        await message.reply(`✅ <@${targetId}> has been unblocked and can use bot commands again.`);
      } else {
        await message.reply(`ℹ️ <@${targetId}> isn't currently blocked.`);
      }
      return true;
    }

    case "banlist": {
      const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator)
        || message.member?.permissions.has(PermissionFlagsBits.ManageGuild);
      if (!isAdmin) {
        await message.reply("🔒 Only admins can use this command.");
        return true;
      }

      const list = getBanList();
      if (list.length === 0) {
        await message.reply("✅ No users are currently flagged by the anti-troll system.");
        return true;
      }

      const levelLabels: Record<number, string> = {
        0: "⚠️ Warned",
        1: "⏱️ 3-min block",
        2: "🚫 12h block",
        3: "🔒 2h full lock",
        4: "⛔ Permanent ban",
      };
      const formatRemaining = (ms: number, permanent: boolean): string => {
        if (permanent) return "**Permanent**";
        if (ms <= 0) return "Expired";
        const totalMinutes = Math.ceil(ms / 60_000);
        if (totalMinutes < 60) return `${totalMinutes} min left`;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return minutes > 0 ? `${hours}h ${minutes}m left` : `${hours}h left`;
      };

      const pageSize = 15;
      const pages = Math.ceil(list.length / pageSize);
      let page = 0;
      const buildEmbed = (pageIndex: number): EmbedBuilder => {
        const slice = list.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
        const lines = slice.map((entry, index) => {
          const label = levelLabels[entry.level] ?? `Level ${entry.level}`;
          const timer = formatRemaining(entry.remainingMs, entry.permanent);
          return `${pageIndex * pageSize + index + 1}. <@${entry.userId}> — ${label} · ${timer}`;
        });
        return new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle(`🛡️ Anti-Troll Flagged Users (${list.length} total)`)
          .setDescription(lines.join("\n"))
          .setFooter({ text: `Page ${pageIndex + 1}/${pages} · Use ${guildPrefix}unblock @user to lift any restriction` });
      };

      if (pages === 1) {
        await message.reply({ embeds: [buildEmbed(0)] });
        return true;
      }

      const prevId = `banlist_prev_${message.id}`;
      const nextId = `banlist_next_${message.id}`;
      const buildPageRow = (pageIndex: number) => new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(prevId).setLabel("◀").setStyle(ButtonStyle.Secondary).setDisabled(pageIndex === 0),
        new ButtonBuilder().setCustomId(nextId).setLabel("▶").setStyle(ButtonStyle.Secondary).setDisabled(pageIndex === pages - 1),
      );
      const reply = await message.reply({ embeds: [buildEmbed(page)], components: [buildPageRow(page)] });
      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: (interaction) => interaction.user.id === message.author.id,
        time: 120_000,
      });

      collector.on("collect", async (interaction) => {
        await interaction.deferUpdate();
        if (interaction.customId === nextId) page = Math.min(page + 1, pages - 1);
        else page = Math.max(page - 1, 0);
        await reply.edit({ embeds: [buildEmbed(page)], components: [buildPageRow(page)] });
      });
      collector.on("end", async () => {
        await reply.edit({ components: [] }).catch(() => null);
      });
      return true;
    }

    case "admin": {
      const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator)
        || message.member?.permissions.has(PermissionFlagsBits.ManageGuild);
      if (!isAdmin) {
        await message.reply("🔒 Only admins can use this command.");
        return true;
      }

      const subcommand = (args[0] ?? "").toLowerCase();
      if (subcommand === "channel") {
        const guildId = message.guildId;
        if (!guildId) return true;
        if ((args[1] ?? "").toLowerCase() === "reset") {
          setAdminChannel(guildId, null);
          await message.reply("✅ Admin channel removed. Alerts will be sent in the current channel if needed.");
        } else {
          const channel = message.mentions.channels.first() ?? message.channel;
          setAdminChannel(guildId, channel.id);
          await message.reply(`✅ Admin alert channel set to <#${channel.id}>. Anti-troll alerts will be sent there.`);
        }
      } else {
        const channelId = message.guildId ? getAdminChannelId(message.guildId) : null;
        const current = channelId ? `<#${channelId}>` : "*(not configured)*";
        await message.reply(
          `⚙️ **Admin channel:** ${current}\n` +
          `\`${guildPrefix}admin channel #channel\` — Set the alert channel\n` +
          `\`${guildPrefix}admin channel reset\` — Remove it`,
        );
      }
      return true;
    }

    default:
      return false;
  }
}
