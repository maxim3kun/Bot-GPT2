import type { AiPersonaSessionRecord } from "../lib/db.js";

export function selectPersonaSession(
  userId: string,
  guildId: string | null,
  personaId: string,
): AiPersonaSessionRecord {
  return { userId, guildId, activePersonaId: personaId, lastPersonaId: personaId };
}

export function stopPersonaSession(session: AiPersonaSessionRecord): AiPersonaSessionRecord {
  return {
    ...session,
    activePersonaId: null,
    ...(session.activePersonaId || session.lastPersonaId
      ? { lastPersonaId: session.activePersonaId ?? session.lastPersonaId }
      : {}),
  };
}
