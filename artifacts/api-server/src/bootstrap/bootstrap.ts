import { startBot } from "../bot.js";
import { getServerPort, logRuntimeConfig } from "./runtime-config.js";
import { startHttpServer } from "./http-server.js";
import { initializeRuntime } from "./startup.js";

export async function bootstrap(): Promise<void> {
  const port = getServerPort();
  logRuntimeConfig(port);

  await initializeRuntime();
  startHttpServer(port);
  startBot();
}
