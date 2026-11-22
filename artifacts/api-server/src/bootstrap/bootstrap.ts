import { startBot } from "../bot.js";
import { logger } from "../lib/logger.js";
import { getServerPort, isDiscordBotEnabled, logRuntimeConfig } from "./runtime-config.js";
import { startHttpServer } from "./http-server.js";
import { initializeRuntime } from "./startup.js";

export async function bootstrap(): Promise<void> {
  const port = getServerPort();
  logRuntimeConfig(port);

  await initializeRuntime();
  startHttpServer(port);
  if (isDiscordBotEnabled()) startBot();
  else logger.info("Discord bot login disabled by DISCORD_BOT_ENABLED");
}
