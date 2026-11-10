export interface PersonaReactionSession {
  userId: string;
  guildId: string | null;
  activePersonaId: string | null;
  lastPersonaId?: string;
  pendingDraft?: {
    name: string;
    description: string;
    waitingFor: "name" | "description";
  };
}

export function updatePersonaSessionFromReaction(
  session: PersonaReactionSession | null,
  added: boolean,
  lastPersonaIsAccessible: boolean,
): PersonaReactionSession | null {
  if (!session) return null;
  if (added) {
    if (session.activePersonaId || !session.lastPersonaId || !lastPersonaIsAccessible) return null;
    return { ...session, activePersonaId: session.lastPersonaId };
  }
  if (!session.activePersonaId) return null;
  return {
    ...session,
    activePersonaId: null,
    lastPersonaId: session.activePersonaId,
  };
}
