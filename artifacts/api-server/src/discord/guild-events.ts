import type { Client } from "discord.js";
import { setBotStats } from "../lib/bot-stats.js";
import { logger } from "../lib/logger.js";
import { handleMemberJoin } from "./welcome.js";

export function registerGuildEvents(client: Client): void {
  client.on("guildMemberAdd", async (member) => {
    await handleMemberJoin(member, client).catch((err) =>
      logger.error({ err }, "guildMemberAdd error"),
    );
  });

  const updateGuildCount = () => setBotStats({ guildCount: client.guilds.cache.size });
  client.on("guildCreate", updateGuildCount);
  client.on("guildDelete", updateGuildCount);
}
