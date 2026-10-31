import { logger } from "./lib/logger.js";
import { startBot } from "./bot.js";
import { initializeRuntime } from "./bootstrap/startup.js";
import { getServerPort, logRuntimeConfig } from "./bootstrap/runtime-config.js";
import { startHttpServer } from "./bootstrap/http-server.js";

const port = getServerPort();
logRuntimeConfig(port);

await initializeRuntime();
startHttpServer(port);
startBot();

logger.info("Application startup completed");
