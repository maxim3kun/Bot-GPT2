import { releaseDailyImageQuota, reserveDailyImageQuota } from "../lib/db.js";
import type { UserLang } from "./user-lang-store.js";

export const MAX_GENERATED_IMAGES_PER_DAY = 10;
export const MAX_PERSONA_IMAGES_PER_DAY = 4;
export type ImageQuotaKind = "image" | "persona";

export type ImageQuotaStatus = "reserved" | "limit_reached" | "unavailable";

export function currentImageQuotaDayKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export async function reserveGeneratedImage(kind: ImageQuotaKind = "image"): Promise<{ status: ImageQuotaStatus; dayKey: string }> {
  const dayKey = currentImageQuotaDayKey();
  // Preserve the legacy counter for personas rather than resetting today's
  // already consumed quota. Ordinary images get a separate counter.
  const quotaKey = kind === "persona" ? dayKey : `${dayKey}:image`;
  const status = await reserveDailyImageQuota(quotaKey, kind === "persona" ? MAX_PERSONA_IMAGES_PER_DAY : MAX_GENERATED_IMAGES_PER_DAY);
  return { status, dayKey: quotaKey };
}

export async function releaseGeneratedImage(dayKey: string): Promise<void> {
  await releaseDailyImageQuota(dayKey);
}

export function imageQuotaNotice(status: Exclude<ImageQuotaStatus, "reserved">, language: UserLang, kind: ImageQuotaKind = "image"): string {
  if (status === "limit_reached") {
    const limit = kind === "persona" ? MAX_PERSONA_IMAGES_PER_DAY : MAX_GENERATED_IMAGES_PER_DAY;
    return language === "fr"
      ? `La limite de ${limit} images ${kind === "persona" ? "de persona " : ""}générées aujourd’hui est atteinte. Réessaie demain.`
      : `The daily limit of ${limit} generated ${kind === "persona" ? "persona " : ""}images has been reached. Try again tomorrow.`;
  }
  return language === "fr"
    ? "Je ne peux pas vérifier la limite d’images pour le moment ; aucune image n’a été générée."
    : "I can’t verify the image limit right now, so no image was generated.";
}
