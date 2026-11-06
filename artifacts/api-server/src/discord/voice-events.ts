import type { Client } from "discord.js";
import { logger } from "../lib/logger.js";
import { consumePendingVoiceCmdByUser, onVoiceAloneChange } from "./radio.js";

export function registerVoiceStateEvents(client: Client): void {
  client.on("voiceStateUpdate", async (oldState, newState) => {
    const guildId = oldState.guild.id;
    const botId = client.user?.id;
    if (!botId) return;

    const userId = newState.member?.user?.id;
    const justJoined = !oldState.channelId && !!newState.channelId;
    const switchedChannel = !!oldState.channelId && !!newState.channelId && oldState.channelId !== newState.channelId;
    if (userId && userId !== botId && (justJoined || switchedChannel)) {
      const pendingCommand = consumePendingVoiceCmdByUser(userId);
      if (pendingCommand) {
        await pendingCommand().catch((err) => logger.error({ err }, "voiceStateUpdate auto-run error"));
      }
    }

    const botVoiceState = oldState.guild.members.cache.get(botId)?.voice;
    const botChannelId = botVoiceState?.channelId;
    if (!botChannelId) return;
    if (oldState.channelId !== botChannelId && newState.channelId !== botChannelId) return;
    const botChannel = botVoiceState.channel;
    if (!botChannel) return;
    const humanCount = botChannel.members.filter((member) => !member.user.bot).size;
    onVoiceAloneChange(guildId, humanCount === 0);
  });
}
