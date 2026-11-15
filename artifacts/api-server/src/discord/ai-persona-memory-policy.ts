import type {
  AiPersonaMemory,
  AiPersonaRecord,
  AiPersonaStyleCategory,
  AiPersonaStylePreferences,
  AiPersonaStyleValue,
} from "../lib/db.js";

export const MAXIME_CREATOR_CONTRIBUTION_CONSENT_VERSION = 1;

export function parsePersonaLearnArguments(args: string[]): { selector: string; mode?: string } {
  const last = args.at(-1)?.toLowerCase();
  const penultimate = args.at(-2)?.toLowerCase();
  if (penultimate === "dm" && ["on", "off"].includes(last ?? "")) {
    return { selector: args.slice(0, -2).join(" ").trim(), mode: `dm_${last}` };
  }
  if (penultimate === "contribute" && last === "off") {
    return { selector: args.slice(0, -2).join(" ").trim(), mode: "contribute_off" };
  }
  if (last && ["confirm", "confirmer", "revoke", "retirer"].includes(last)) {
    return { selector: args.slice(0, -1).join(" ").trim(), mode: last };
  }
  return { selector: args.join(" ").trim() };
}

export function hasMaximeCreatorContributionConsent(persona: AiPersonaRecord, userId: string): boolean {
  if (persona.name.trim().toLowerCase() !== "maxime" || userId === persona.ownerId) return false;
  const learning = persona.userLearning?.find((item) => item.userId === userId);
  return Boolean(
    learning?.learningConsent
    && learning.creatorContributionConsentVersion === MAXIME_CREATOR_CONTRIBUTION_CONSENT_VERSION,
  );
}

export function getMaximeCreatorObservationsForViewer(
  persona: AiPersonaRecord,
  viewerId: string,
): AiPersonaMemory[] {
  if (persona.name.trim().toLowerCase() !== "maxime" || viewerId !== persona.ownerId) return [];
  return (persona.userLearning ?? [])
    .filter((learning) =>
      learning.userId !== persona.ownerId
      && learning.learningConsent
      && learning.creatorContributionConsentVersion === MAXIME_CREATOR_CONTRIBUTION_CONSENT_VERSION)
    .flatMap((learning) => learning.creatorObservations ?? [])
    .sort((a, b) => b.interestScore - a.interestScore || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20);
}

export function parseScoredMemories(
  content: string,
  sample: Array<{ messageId: string; text: string }>,
): {
  memories: AiPersonaMemory[];
  creatorObservations: AiPersonaMemory[];
  styleUpdates: Array<{ messageId: string; preferences: AiPersonaStylePreferences }>;
  privateQuestion?: string;
} | null {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(content.slice(start, end + 1)) as {
      items?: Array<{ index?: unknown; score?: unknown; summary?: unknown; creatorObservation?: unknown; style?: unknown }>;
      privateQuestion?: unknown;
    };
    if (!Array.isArray(parsed.items)) return null;
    const now = new Date().toISOString();
    const seen = new Set<number>();
    const memories: AiPersonaMemory[] = [];
    const creatorObservations: AiPersonaMemory[] = [];
    const styleUpdates: Array<{ messageId: string; preferences: AiPersonaStylePreferences }> = [];
    const validStyles: Record<AiPersonaStyleCategory, AiPersonaStyleValue[]> = {
      brevity: ["concise", "detailed"],
      warmth: ["warm", "neutral"],
      humor: ["playful", "serious"],
      questions: ["more", "fewer"],
      formality: ["informal", "formal"],
    };
    for (const item of parsed.items) {
      const index = Number(item.index);
      const score = Number(item.score);
      const summary = typeof item.summary === "string" ? item.summary.trim().slice(0, 300) : "";
      if (!Number.isInteger(index) || index < 0 || index >= sample.length || seen.has(index)) continue;
      seen.add(index);
      if (Number.isFinite(score) && score >= 0 && score <= 10 && summary) {
        memories.push({
          messageId: sample[index]!.messageId,
          summary,
          interestScore: Math.floor(score),
          createdAt: now,
        });
      }
      const creatorObservation = typeof item.creatorObservation === "string"
        ? item.creatorObservation.trim().slice(0, 300)
        : "";
      if (Number.isFinite(score) && score >= 6 && score <= 10 && creatorObservation) {
        creatorObservations.push({
          messageId: sample[index]!.messageId,
          summary: creatorObservation,
          interestScore: Math.floor(score),
          createdAt: now,
        });
      }
      const rawStyle = item.style && typeof item.style === "object"
        ? item.style as Record<string, unknown>
        : {};
      const preferences: AiPersonaStylePreferences = {};
      for (const category of Object.keys(validStyles) as AiPersonaStyleCategory[]) {
        const value = rawStyle[category];
        if (typeof value === "string" && validStyles[category].includes(value as AiPersonaStyleValue)) {
          preferences[category] = value as AiPersonaStyleValue;
        }
      }
      if (Object.keys(preferences).length > 0) {
        styleUpdates.push({ messageId: sample[index]!.messageId, preferences });
      }
    }
    const rawQuestion = typeof parsed.privateQuestion === "string"
      ? parsed.privateQuestion.trim().slice(0, 250)
      : "";
    const normalizedQuestion = rawQuestion.normalize("NFKD").replace(/\p{M}/gu, "");
    const unsafeQuestion = /\b(address|adresse|phone|telephone|email|where do you live|where are you|precise location|location exacte|how old|quel age|age|health|sante|diagnos|religion|politic|politique|sexual|sexuel|salary|salaire|revenu|financial|financier)\b/i
      .test(normalizedQuestion);
    const privateQuestion = rawQuestion.endsWith("?")
      && !unsafeQuestion
      && !/<@|@everyone|@here|https?:\/\//i.test(rawQuestion)
      ? rawQuestion
      : undefined;
    return {
      memories,
      creatorObservations,
      styleUpdates,
      ...(privateQuestion ? { privateQuestion } : {}),
    };
  } catch {
    return null;
  }
}
