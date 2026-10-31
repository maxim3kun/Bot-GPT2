import { logger } from "../lib/logger.js";

export type FeatureFlagName =
  | "stores"
  | "ai"
  | "voice"
  | "radio"
  | "music"
  | "image"
  | "games"
  | "admin";

export function isFeatureEnabled(name: FeatureFlagName, fallback = true): boolean {
  const value = process.env[`FEATURE_${name.toUpperCase()}`];

  if (value === undefined) {
    return fallback;
  }

  return value !== "false" && value !== "0";
}

export function logFeatureFlags(): void {
  const summary = {
    stores: isFeatureEnabled("stores"),
    ai: isFeatureEnabled("ai"),
    voice: isFeatureEnabled("voice"),
    radio: isFeatureEnabled("radio"),
    music: isFeatureEnabled("music"),
    image: isFeatureEnabled("image"),
    games: isFeatureEnabled("games"),
    admin: isFeatureEnabled("admin"),
  };

  logger.info({ features: summary }, "Feature flags loaded");
}
