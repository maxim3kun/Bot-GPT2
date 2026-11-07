import { logger } from "../lib/logger.js";
import {
  getModuleLastFailureAt,
  recordModuleSuccess,
  reportModuleFailure,
  resetModuleProbe,
  shouldUseModuleFallback,
  type TechnicianContext,
  type TechnicianDependencyName,
  type TechnicianModuleName,
} from "./module-technician.js";

export type ModuleFallbackReason = "operation_failed" | "circuit_open";

export interface ModuleFallbackContext {
  reason: ModuleFallbackReason;
  error?: unknown;
}

export async function runModuleWithFallback<T>(
  context: TechnicianContext,
  moduleName: TechnicianModuleName,
  operation: () => Promise<T>,
  fallback: (context: ModuleFallbackContext) => Promise<T>,
  dependency?: TechnicianDependencyName,
): Promise<T> {
  if (shouldUseModuleFallback(moduleName)) {
    return fallback({ reason: "circuit_open" });
  }

  const failureBeforeRun = getModuleLastFailureAt(moduleName);
  try {
    const result = await operation();
    if (result !== false && getModuleLastFailureAt(moduleName) === failureBeforeRun) {
      recordModuleSuccess(moduleName, dependency);
    } else if (result === false) {
      resetModuleProbe(moduleName);
    }
    return result;
  } catch (error) {
    await reportModuleFailure(context, moduleName, error, dependency);
    try {
      return await fallback({ reason: "operation_failed", error });
    } catch (fallbackError) {
      logger.error({ err: fallbackError, module: moduleName }, "Module fallback failed");
      throw fallbackError;
    }
  }
}

function moduleLabel(moduleName: TechnicianModuleName): string {
  const labels: Record<string, string> = {
    ai: "IA",
    games: "Jeux",
    admin: "Administration",
    music: "Musique",
    other: "Autres commandes",
  };
  return labels[moduleName] ?? moduleName.replace(/^feature:/, "Fonction : ");
}

export function moduleFallbackMessage(
  moduleName: TechnicianModuleName,
  language: string,
): string {
  const french = language.toLowerCase().startsWith("fr");
  if (moduleName === "music") {
    return french
      ? "⚠️ Le service musical demandé est indisponible. La demande n’a pas été confirmée ; réessaie plus tard."
      : "⚠️ The requested music service is unavailable. The request was not confirmed; please try again later.";
  }
  if (moduleName === "admin") {
    return french
      ? "⚠️ La configuration n’a pas pu être appliquée. Vérifie son état avant de réessayer."
      : "⚠️ The setting could not be applied. Check its status before trying again.";
  }
  const module = moduleLabel(moduleName);
  return french
    ? `⚠️ Le module **${module}** est momentanément indisponible. Le mode dégradé est actif ; réessaie dans un instant.`
    : `⚠️ The **${module}** module is temporarily unavailable. Degraded mode is active; please try again shortly.`;
}

