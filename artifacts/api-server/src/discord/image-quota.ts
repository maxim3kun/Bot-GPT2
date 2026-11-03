import { releaseDailyImageQuota, reserveDailyImageQuota } from "../lib/db.js";
import type { UserLang } from "./user-lang-store.js";

export const MAX_GENERATED_IMAGES_PER_DAY = 4;

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

export async function reserveGeneratedImage(): Promise<{ status: ImageQuotaStatus; dayKey: string }> {
  const dayKey = currentImageQuotaDayKey();
  const status = await reserveDailyImageQuota(dayKey, MAX_GENERATED_IMAGES_PER_DAY);
  return { status, dayKey };
}

export async function releaseGeneratedImage(dayKey: string): Promise<void> {
  await releaseDailyImageQuota(dayKey);
}

export function imageQuotaNotice(status: Exclude<ImageQuotaStatus, "reserved">, language: UserLang): string {
  if (status === "limit_reached") {
    return language === "fr"
      ? "La limite de 4 images générées aujourd’hui est atteinte. Réessaie demain."
      : "The daily limit of 4 generated images has been reached. Try again tomorrow.";
  }
  return language === "fr"
    ? "Je ne peux pas vérifier la limite d’images pour le moment ; aucune image n’a été générée."
    : "I can’t verify the image limit right now, so no image was generated.";
}
