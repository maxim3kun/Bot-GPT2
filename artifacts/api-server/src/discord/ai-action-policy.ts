export type AiAction =
  | { action: "help" }
  | { action: "status" }
  | { action: "minesweeper"; difficulty: "easy" | "medium" | "hard" }
  | { action: "radio"; station: string };

export function isAiActionCandidate(text: string): boolean {
  const topic = /\b(?:aide|help|demineur|démineur|minesweeper|jeu|game|radio|module|diagnostic|status|health)\b/i.test(text);
  const request = /\b(?:lance(?:r|z)?|d[eé]marre(?:r|z)?|affiche(?:r|z)?|montre(?:r|z)?|mets|mettre|mettez|joue(?:r|z)?|start|launch|show|play|put|consulte(?:r|z)?|v[eé]rifie(?:r|z)?|diagnostique|diagnostic)\b/i.test(text);
  return topic && (request || /\b(?:quel|which).*\bmodule\b.*\b(?:panne|ko|down)\b/i.test(text));
}

export function parseAiAction(value: unknown, stations: readonly string[]): AiAction {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid action");
  const data = value as Record<string, unknown>;
  const keys = Object.keys(data);
  if (data.action === "help" || data.action === "status") {
    if (keys.length !== 1) throw new Error("Unexpected arguments");
    return { action: data.action };
  }
  if (data.action === "minesweeper" && keys.every((key) => ["action", "difficulty"].includes(key))
    && (data.difficulty === undefined || (typeof data.difficulty === "string" && ["easy", "medium", "hard"].includes(data.difficulty)))) {
    return { action: "minesweeper", difficulty: (data.difficulty ?? "medium") as "easy" | "medium" | "hard" };
  }
  if (data.action === "radio" && keys.length === 2
    && typeof data.station === "string" && stations.includes(data.station)) {
    return { action: "radio", station: data.station };
  }
  throw new Error("Unsupported action or arguments");
}

export interface AiActionAccess {
  blocked: boolean;
  consentAccepted: boolean;
  aiEnabled: boolean;
  moduleEnabled: boolean;
  featuresEnabled: boolean;
  inGuild: boolean;
  canPost: boolean;
  admin: boolean;
  voiceReady: boolean;
}

export function actionAccessFailure(action: AiAction, access: AiActionAccess) {
  if (access.blocked) return "blocked";
  if (!access.consentAccepted) return "consent";
  if (!access.aiEnabled || !access.moduleEnabled || !access.featuresEnabled) return "disabled";
  if (!access.canPost) return "permissions";
  if (["status", "radio"].includes(action.action) && !access.inGuild) return "guild";
  if (action.action === "status" && !access.admin) return "admin";
  if (action.action === "radio" && !access.voiceReady) return "voice";
  return null;
}

/** Permissions are re-evaluated immediately before the real handler runs. */
export async function executeAuthorizedAction<T>(
  authorize: () => Promise<string | null>,
  execute: () => Promise<T>,
): Promise<{ ok: true; result: T } | { ok: false; reason: string }> {
  const reason = await authorize();
  if (reason) return { ok: false, reason };
  return { ok: true, result: await execute() };
}
