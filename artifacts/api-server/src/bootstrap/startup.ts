import { connectDb } from "../lib/db.js";
import { runMigration } from "../lib/migrate.js";
import { logger } from "../lib/logger.js";
import { initQuestStore } from "../discord/quests.js";
import { initBirthdayStore } from "../discord/birthdays.js";
import { initSuggestPrefs } from "../discord/suggest-prefs.js";
import { initPrefixStore } from "../discord/prefix-store.js";
import { initLangStore } from "../discord/lang-store.js";
import { initUserLangStore } from "../discord/user-lang-store.js";
import { initPlaylists } from "../discord/playlist.js";
import { initAdminChannels } from "../discord/command-suggest.js";
import { initVoicePickerChannels } from "../discord/voice-picker-channels.js";
import { initLikesStore } from "../discord/likes-store.js";
import { initLogoBrandStore } from "../discord/logo-brand-store.js";
import { initArtistCache } from "../discord/artist-cache.js";
import { loadCustomStations } from "../discord/radio.js";
import { feature, initializeFeatures, type RuntimeFeature } from "./feature-registry.js";

export const runtimeFeatures: RuntimeFeature[] = [
  feature("quest-store", () => initQuestStore()),
  feature("birthday-store", () => initBirthdayStore()),
  feature("suggest-prefs", () => initSuggestPrefs()),
  feature("prefix-store", () => initPrefixStore()),
  feature("lang-store", () => initLangStore()),
  feature("user-lang-store", () => initUserLangStore()),
  feature("playlists", () => initPlaylists()),
  feature("admin-channels", () => initAdminChannels()),
  feature("voice-picker-channels", () => initVoicePickerChannels()),
  feature("likes-store", () => initLikesStore()),
  feature("logo-brand-store", () => initLogoBrandStore()),
  feature("artist-cache", () => initArtistCache()),
  feature("custom-radio-stations", () => loadCustomStations()),
];

export async function initializeRuntime(): Promise<void> {
  logger.info("Starting runtime bootstrap");

  await connectDb();
  await runMigration();
  await initializeFeatures(runtimeFeatures);

  logger.info("Runtime bootstrap complete");
}
