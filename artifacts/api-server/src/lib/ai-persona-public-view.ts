import { EmbedBuilder } from "discord.js";

export interface PublicAiPersonaView {
  ownerId: string;
  guildId: string | null;
  authorizedGuildIds?: string[];
  visibility: "public" | "private";
}

export function isAiPersonaVisibleToViewer(
  persona: PublicAiPersonaView,
  guildId: string | null,
  userId: string,
): boolean {
  if (persona.visibility === "private") return persona.ownerId === userId;
  if (!guildId) return false;
  return persona.authorizedGuildIds === undefined
    ? persona.guildId === guildId
    : persona.authorizedGuildIds.includes(guildId);
}

export function updateAiPersonaGuildAccess<T extends PublicAiPersonaView>(
  persona: T,
  guildId: string,
  enabled: boolean,
): T {
  const current = persona.authorizedGuildIds ?? (persona.guildId ? [persona.guildId] : []);
  const authorizedGuildIds = enabled
    ? [...new Set([...current, guildId])]
    : current.filter((id) => id !== guildId);
  return {
    ...persona,
    guildId: persona.guildId ?? guildId,
    authorizedGuildIds,
    visibility: authorizedGuildIds.length > 0 ? "public" : "private",
  };
}

export function canManageAiPersonaPublicProfile(
  personas: PublicAiPersonaView[],
  ownerId: string,
  guildId: string,
): boolean {
  return personas.some((persona) =>
    persona.ownerId === ownerId
    && persona.visibility === "public"
    && isAiPersonaVisibleToViewer(persona, guildId, ownerId),
  );
}

export function buildPublicAiPersonaDetails(
  name: string,
  description: string,
  creatorProfile?: string,
  language: string = "fr",
): EmbedBuilder {
  const french = language === "fr";
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`🎭 ${name}`)
    .setDescription(description);
  if (creatorProfile) {
    embed.addFields({
      name: french ? "Fiche du créateur" : "Creator profile",
      value: creatorProfile,
    });
  }
  return embed.setFooter({
    text: french ? "Persona public · accès défini par son créateur" : "Public persona · access set by its creator",
  });
}
