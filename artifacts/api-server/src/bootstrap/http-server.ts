import app from "../app.js";
import { logger } from "../lib/logger.js";

export function startHttpServer(port: number): void {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
    startKeepAlive(port);
  });
}

function startKeepAlive(serverPort: number): void {
  const INTERVAL_MS = 4 * 60 * 1000;
  const url = `http://localhost:${serverPort}/api/healthz`;

  setInterval(async () => {
    try {
      const res = await fetch(url);
      logger.debug({ status: res.status }, "Keep-alive ping");
    } catch (err) {
      logger.warn({ err }, "Keep-alive ping failed");
    }
  }, INTERVAL_MS);

  logger.info({ intervalMinutes: 4 }, "Keep-alive self-ping started");
}
