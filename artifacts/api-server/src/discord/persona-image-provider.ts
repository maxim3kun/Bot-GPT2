import { createHash } from "node:crypto";
import { logger } from "../lib/logger.js";

const IMAGE_MODEL_URL = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 45_000;

export type PersonaImagePurpose = "avatar" | "selfie";
export type PersonaImageFailureReason = "configuration" | "busy" | "http" | "invalid-image" | "timeout" | "network";

export class PersonaImageProviderError extends Error {
  constructor(
    message: string,
    readonly reason: PersonaImageFailureReason,
    readonly status?: number,
  ) {
    super(message);
    this.name = "PersonaImageProviderError";
  }
}

export function stablePersonaImageSeed(personaId: string): number {
  return createHash("sha256")
    .update(`persona-image:${personaId}`)
    .digest()
    .readUInt32BE(0) & 0x7fffffff;
}

function getImageExtension(buffer: Buffer): string | null {
  if (
    buffer.length >= 8
    && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg";
  }
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return "webp";
  }
  return null;
}

function buildPrompt(input: {
  name: string;
  description: string;
  visualDescription?: string;
  purpose: PersonaImagePurpose;
}): string {
  const visualReference = (input.visualDescription?.trim() || input.description.trim()).slice(0, 2_000);
  const framing = input.purpose === "avatar"
    ? "A centered square, head-and-shoulders character portrait with the full face clearly visible."
    : "A friendly illustrated selfie, framed from the shoulders up, with the face clearly visible.";

  return [
    "Create exactly one polished fictional character portrait.",
    "Art direction: Japanese anime and manga illustration, expressive clean ink linework, detailed eyes, refined cel shading, crisp colors, and a finished character-design illustration.",
    `Character name: ${JSON.stringify(input.name)}.`,
    `Fixed visual identity reference: ${visualReference}.`,
    "Preserve the same face shape, eye color and shape, hairstyle, hair color, and distinctive marks specified in the visual identity reference.",
    framing,
    "Keep the character friendly and non-sexualized. Use tasteful clothing consistent with the reference.",
    "This is an original fictional character, not a real person. Do not depict the bot's creator or any real individual.",
    "Do not use photorealism, 3D rendering, text, letters, logos, watermarks, collages, or additional characters.",
  ].join(" ");
}

function retryDelayMs(response: Response, attempt: number): number {
  const retryAfterSeconds = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(5_000, retryAfterSeconds * 1_000);
  }
  return (attempt + 1) * 1_500;
}

export async function generatePersonaIllustration(input: {
  name: string;
  description: string;
  visualDescription?: string;
  visualSeed?: number;
  purpose: PersonaImagePurpose;
}): Promise<{ buffer: Buffer; extension: string }> {
  const token = process.env["HUGGINGFACE_TOKEN"];
  if (!token) {
    throw new PersonaImageProviderError("HUGGINGFACE_TOKEN is not configured", "configuration");
  }

  const prompt = buildPrompt(input);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(IMAGE_MODEL_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: prompt,
          parameters: Number.isInteger(input.visualSeed) ? { seed: input.visualSeed } : undefined,
          options: { wait_for_model: true },
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      const isTimeout = error instanceof Error
        && (error.name === "TimeoutError" || error.name === "AbortError");
      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1_000));
        continue;
      }
      logger.warn({
        attempts: attempt + 1,
        errorName: error instanceof Error ? error.name : "unknown",
      }, "Persona image provider request failed before receiving a response");
      throw new PersonaImageProviderError(
        isTimeout ? "Image provider request timed out" : "Image provider could not be reached",
        isTimeout ? "timeout" : "network",
      );
    }

    const status = response.status;
    const contentType = response.headers.get("content-type") ?? "";
    const requestId = response.headers.get("x-request-id") ?? undefined;
    if (!response.ok) {
      if ((status === 429 || status === 503) && attempt < MAX_ATTEMPTS - 1) {
        const delayMs = retryDelayMs(response, attempt);
        await response.body?.cancel().catch(() => {});
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      logger.warn({ status, contentType, requestId, attempts: attempt + 1 }, "Persona image provider returned an HTTP error");
      const reason = status === 401 || status === 403
        ? "configuration"
        : status === 429 || status === 503
          ? "busy"
          : "http";
      throw new PersonaImageProviderError(`Image provider returned HTTP ${status}`, reason, status);
    }

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
      await response.body?.cancel().catch(() => {});
      logger.warn({ status, contentType, contentLength, requestId }, "Persona image provider returned an oversized payload");
      throw new PersonaImageProviderError("Image provider returned an oversized payload", "invalid-image", status);
    }

    if (!contentType.toLowerCase().startsWith("image/")) {
      await response.body?.cancel().catch(() => {});
      logger.warn({ status, contentType, requestId }, "Persona image provider returned a non-image response");
      throw new PersonaImageProviderError("Image provider returned a non-image response", "invalid-image", status);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const extension = getImageExtension(buffer);
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES || !extension) {
      logger.warn({ status, contentType, size: buffer.length, requestId }, "Persona image provider returned an invalid image payload");
      throw new PersonaImageProviderError("Image provider returned an invalid image payload", "invalid-image", status);
    }
    return { buffer, extension };
  }

  throw new PersonaImageProviderError("Image provider did not return an image", "busy");
}
