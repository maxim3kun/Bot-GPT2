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
    help: "Aide",
    image: "Images",
  };
  return labels[moduleName] ?? moduleName.replace(/^feature:/, "Fonction : ");
}

export function moduleFallbackMessage(
  moduleName: TechnicianModuleName,
  language: string,
  command?: string,
): string {
  const french = language.toLowerCase().startsWith("fr");
  if (command) return french
    ? `⚠️ La commande \`${command}\` n’a pas pu être terminée. L’erreur a été enregistrée pour le diagnostic.`
    : `⚠️ The \`${command}\` command could not be completed. The error was recorded for diagnostics.`;
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
    ? `⚠️ **${module}** n’a pas pu terminer la demande. Réessaie plus tard ; l’erreur a été enregistrée pour le diagnostic.`
    : `⚠️ **${module}** could not complete the request. Please try later; the error was recorded for diagnostics.`;
}

