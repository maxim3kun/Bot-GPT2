import { logger } from "../lib/logger.js";

export function getServerPort(): number {
  const rawPort = process.env["PORT"];

  if (!rawPort) {
    throw new Error("PORT environment variable is required but was not provided.");
  }

  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  return port;
}

export function isDiscordBotEnabled(environment: NodeJS.ProcessEnv = process.env): boolean {
  return environment["DISCORD_BOT_ENABLED"]?.trim().toLowerCase() !== "false";
}

export function logRuntimeConfig(port: number): void {
  logger.info({ port }, "Runtime config loaded");
}
