import type { AiPersonaRecord } from "../lib/db.js";

export interface PersonaEditInput {
  selector: string;
  description: string;
}

export function applyPersonaEdit(
  persona: AiPersonaRecord,
  description: string,
  generated: { profile: string; visualDescription: string },
  updatedAt: string,
): AiPersonaRecord {
  const updated: AiPersonaRecord = {
    ...persona,
    description,
    profile: generated.profile,
    visualDescription: generated.visualDescription,
    updatedAt,
  };
  if (!persona.customAvatarBase64) {
    delete updated.generatedAvatarBase64;
    updated.avatarImageOptimized = false;
    delete updated.avatarCdnUrl;
    delete updated.avatarCdnUpdatedAt;
  }
  return updated;
}

export function parsePersonaEditInput(input: string): PersonaEditInput | null {
  const separator = input.indexOf("|");
  if (separator < 1) return null;
  const selector = input.slice(0, separator).trim();
  const description = input.slice(separator + 1).trim();
  if (!selector || selector.length > 100 || description.length < 8 || description.length > 2_000) return null;
  return { selector, description };
}
