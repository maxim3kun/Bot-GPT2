import { logger } from "../lib/logger.js";
import { initializeFeatures } from "./feature-registry.js";
import { runtimeFeatures, initializeDatabase } from "./runtime-features.js";
import { logFeatureFlags } from "./feature-flags.js";

export async function initializeRuntime(): Promise<void> {
  logger.info("Starting runtime bootstrap");
  logFeatureFlags();

  await initializeDatabase();
  await initializeFeatures(runtimeFeatures);

  logger.info("Runtime bootstrap complete");
}
