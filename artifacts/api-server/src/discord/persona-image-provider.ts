import { createHash } from "node:crypto";
import { generateImage } from "./image-provider.js";
export { ImageProviderError as PersonaImageProviderError } from "./image-provider.js";

export type PersonaImagePurpose = "avatar" | "selfie";
export type { ImageFailureReason as PersonaImageFailureReason } from "./image-provider.js";

export function stablePersonaImageSeed(personaId: string): number {
  return createHash("sha256")
    .update(`persona-image:${personaId}`)
    .digest()
    .readUInt32BE(0) & 0x7fffffff;
}

function buildPrompt(input: {
  name: string;
  description: string;
  visualDescription?: string;
  purpose: PersonaImagePurpose;
}): string {
  const visualReference = (input.visualDescription?.trim() || input.description.trim()).slice(0, 850);
  const framing = input.purpose === "avatar"
    ? "A centered square, head-and-shoulders character portrait with the full face clearly visible."
    : "A friendly illustrated selfie, framed from the shoulders up, with the face clearly visible.";

  return [
    "Create exactly one polished fictional character portrait.",
    "Art direction: Japanese anime and manga illustration, expressive clean ink linework, detailed eyes, refined cel shading, crisp colors, and a finished character-design illustration.",
    `Character name: ${JSON.stringify(input.name.slice(0, 80))}.`,
    `Fixed visual identity reference: ${visualReference}.`,
    "Preserve the same face shape, eye color and shape, hairstyle, hair color, and distinctive marks specified in the visual identity reference.",
    framing,
    "Keep the character friendly and non-sexualized. Use tasteful clothing consistent with the reference.",
    "This is an original fictional character, not a real person. Do not depict the bot's creator or any real individual.",
    "Do not use photorealism, 3D rendering, text, letters, logos, watermarks, collages, or additional characters.",
  ].join(" ");
}

export async function generatePersonaIllustration(input: {
  name: string;
  description: string;
  visualDescription?: string;
  visualSeed?: number;
  purpose: PersonaImagePurpose;
}): Promise<{ buffer: Buffer; extension: string; provider: "cloudflare" | "huggingface" }> {
  return generateImage(buildPrompt(input), Number.isInteger(input.visualSeed) ? input.visualSeed : undefined);
}
