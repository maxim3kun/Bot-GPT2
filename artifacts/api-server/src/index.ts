import app from "./app.js";
import { logger } from "./lib/logger.js";
import { startBot } from "./bot.js";
import { connectDb } from "./lib/db.js";
import { runMigration } from "./lib/migrate.js";
import { initQuestStore } from "./discord/quests.js";
import { initBirthdayStore } from "./discord/birthdays.js";
import { initSuggestPrefs } from "./discord/suggest-prefs.js";
import { initPrefixStore } from "./discord/prefix-store.js";
import { initLangStore } from "./discord/lang-store.js";
import { initPlaylists } from "./discord/playlist.js";
import { initAdminChannels } from "./discord/command-suggest.js";
import { initVoicePickerChannels } from "./discord/voice-picker-channels.js";
import { initLikesStore } from "./discord/likes-store.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// ── Database + data store initialisation ──────────────────────────────────────

await connectDb();
await runMigration();
await Promise.all([
  initQuestStore(),
  initBirthdayStore(),
  initSuggestPrefs(),
  initPrefixStore(),
  initLangStore(),
  initPlaylists(),
  initAdminChannels(),
  initVoicePickerChannels(),
  initLikesStore(),
]);

// ── HTTP server ───────────────────────────────────────────────────────────────

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startKeepAlive(port);
});

startBot();

// ── Keep-alive self-ping ───────────────────────────────────────────────────────

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
