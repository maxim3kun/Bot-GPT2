import { getLang } from "./lang-store.js";
import { getUserLang, getUserLangOverride, type UserLang } from "./user-lang-store.js";

/**
 * Personal preference overrides the server default. DMs have no server default,
 * so they use the user's preference (English when none has been saved).
 */
export function getEffectiveLanguage(
  guildId: string | null | undefined,
  userId: string,
): UserLang {
  return getUserLangOverride(userId) ?? (guildId ? getLang(guildId) : getUserLang(userId));
}
