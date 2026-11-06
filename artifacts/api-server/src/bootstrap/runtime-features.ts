import { feature, type RuntimeFeature } from "./feature-registry.js";
import { isFeatureEnabled } from "./feature-flags.js";
import { connectDb } from "../lib/db.js";
import { runMigration } from "../lib/migrate.js";
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

export const runtimeFeatures: RuntimeFeature[] = [
  feature("quest-store", () => initQuestStore(), isFeatureEnabled("stores")),
  feature("birthday-store", () => initBirthdayStore(), isFeatureEnabled("stores")),
  feature("suggest-prefs", () => initSuggestPrefs(), isFeatureEnabled("stores")),
  feature("prefix-store", () => initPrefixStore(), isFeatureEnabled("stores")),
  feature("lang-store", () => initLangStore(), isFeatureEnabled("stores")),
  feature("user-lang-store", () => initUserLangStore(), isFeatureEnabled("stores")),
  feature("playlists", () => initPlaylists(), isFeatureEnabled("stores")),
  feature("admin-channels", () => initAdminChannels(), isFeatureEnabled("admin")),
  feature("voice-picker-channels", () => initVoicePickerChannels(), isFeatureEnabled("voice")),
  feature("likes-store", () => initLikesStore(), isFeatureEnabled("stores")),
  feature("logo-brand-store", () => initLogoBrandStore(), isFeatureEnabled("stores")),
  feature("artist-cache", () => initArtistCache(), isFeatureEnabled("stores")),
  feature("custom-radio-stations", () => loadCustomStations(), isFeatureEnabled("radio")),
];

export async function initializeDatabase(): Promise<void> {
  await connectDb();
  await runMigration();
}
