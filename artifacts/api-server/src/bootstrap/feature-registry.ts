import { logger } from "../lib/logger.js";

export type RuntimeFeature = {
  name: string;
  enabled?: boolean;
  init: () => Promise<unknown> | unknown;
};

export function feature(
  name: string,
  init: () => Promise<unknown> | unknown,
  enabled = true,
): RuntimeFeature {
  return {
    name,
    enabled,
    init,
  };
}

export async function initializeFeatures(features: RuntimeFeature[]): Promise<void> {
  const enabledFeatures = features.filter((featureConfig) => featureConfig.enabled !== false);

  await Promise.all(
    enabledFeatures.map(async (featureConfig) => {
      try {
        await featureConfig.init();
        logger.info({ feature: featureConfig.name }, "Feature initialized");
      } catch (error) {
        logger.error({ err: error, feature: featureConfig.name }, "Feature initialization failed");
        throw error;
      }
    }),
  );
}
