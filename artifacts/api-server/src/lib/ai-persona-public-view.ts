import { EmbedBuilder } from "discord.js";

export interface PublicAiPersonaView {
  ownerId: string;
  guildId: string | null;
  visibility: "public" | "private";
}

export function isAiPersonaVisibleToViewer(
  persona: PublicAiPersonaView,
  guildId: string | null,
  userId: string,
): boolean {
  if (persona.visibility === "private") return persona.ownerId === userId;
  return Boolean(guildId) && persona.guildId === guildId;
}

export function canManageAiPersonaPublicProfile(
  personas: PublicAiPersonaView[],
  ownerId: string,
  guildId: string,
): boolean {
  return personas.some((persona) =>
    persona.ownerId === ownerId
    && persona.visibility === "public"
    && persona.guildId === guildId,
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
    text: french ? "Persona public · visible dans ce serveur uniquement" : "Public persona · visible in this server only",
  });
}
