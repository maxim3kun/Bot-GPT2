import type { Message, MessageCreateOptions } from "discord.js";
import { logger } from "../lib/logger.js";
import { requireConsent } from "./ai-consent.js";
import { imageQuotaNotice, releaseGeneratedImage, reserveGeneratedImage } from "./image-quota.js";
import type { UserLang } from "./user-lang-store.js";

const IMAGE_MODEL_URL = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell";
const MAX_PERSONA_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_DISCORD_PHOTO_BYTES = 7 * 1024 * 1024;

function getImageExtension(buffer: Buffer): string | null {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg";
  }
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return "webp";
  }
  if (buffer.length >= 6 && /^GIF8[79]a$/.test(buffer.toString("ascii", 0, 6))) {
    return "gif";
  }
  return null;
}

async function prepareDiscordPhoto(source: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const render = (size: number, quality: number) => sharp(source, {
    limitInputPixels: 16_777_216,
    failOn: "warning",
  })
    .rotate()
    .resize(size, size, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();

  let compressed = await render(1_280, 82);
  if (compressed.length > MAX_DISCORD_PHOTO_BYTES) compressed = await render(1_024, 68);
  if (compressed.length > MAX_DISCORD_PHOTO_BYTES) {
    throw new Error("Compressed image exceeds Discord upload limit");
  }
  return compressed;
}

export function isSelfPhotoRequest(text: string): boolean {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const requestsImage = /\b(?:photo|photograph|image|picture|selfie|portrait)\b/.test(normalized);
  const refersToAssistant = /\b(?:de toi|de vous|de moi|de lui|de elle|d elle|du bot|ta photo|ton image|ton visage|ton selfie|yourself|of you|of the bot|your photo|your picture|your image|your face|your selfie)\b/.test(normalized);
  return requestsImage && refersToAssistant;
}

export async function sendFictionalAssistantPhoto(
  message: Message,
  character: { name: string; description: string },
  language: UserLang,
  options: { privateInServer?: boolean } = {},
): Promise<void> {
  const isFrench = language === "fr";
  const hfToken = process.env["HUGGINGFACE_TOKEN"];
  if (!hfToken) {
    await message.reply(isFrench
      ? "La génération d’images n’est pas configurée pour le moment."
      : "Image generation is not configured right now.");
    return;
  }
  if (!await requireConsent(message, language)) return;
  if (!options.privateInServer && !message.channel.isSendable()) {
    await message.reply(isFrench
      ? "Ce salon ne permet pas l’envoi d’images."
      : "This channel cannot send images.");
    return;
  }

  const reservation = await reserveGeneratedImage();
  if (reservation.status !== "reserved") {
    await message.reply(imageQuotaNotice(reservation.status, language));
    return;
  }

  let imageSent = false;
  let failureStage = "image provider";
  try {
    const inputs = `Create one high-quality, photorealistic, friendly portrait selfie of a fictional AI character called "${character.name}". Use the following character details only as visual reference: ${character.description.slice(0, 2_000)}. This is an imagined visual representation of an AI, not a real photograph or a depiction of its creator. Show one character, natural lighting, tasteful everyday clothing, no text, no letters, no logos, no watermark, no collage.`;
    let generated: { buffer: Buffer; extension: string } | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(IMAGE_MODEL_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs, options: { wait_for_model: true } }),
      });
      if (!response.ok) {
        const status = response.status;
        const contentType = response.headers.get("content-type") ?? "";
        if ((status === 429 || status === 503) && attempt < 2) {
          const retryAfterSeconds = Number(response.headers.get("retry-after"));
          const delayMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
            ? Math.min(5_000, retryAfterSeconds * 1_000)
            : (attempt + 1) * 1_500;
          await response.body?.cancel().catch(() => {});
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        logger.warn({ status, contentType, attempt: attempt + 1 }, "Persona image provider returned an error");
        throw new Error(`Image provider returned HTTP ${status}`);
      }

      const contentType = response.headers.get("content-type") ?? "";
      const buffer = Buffer.from(await response.arrayBuffer());
      const extension = getImageExtension(buffer);
      if (buffer.length === 0 || buffer.length > MAX_PERSONA_PHOTO_BYTES || !extension) {
        logger.warn({ contentType, size: buffer.length }, "Persona image provider returned an invalid image payload");
        throw new Error("Image provider returned an invalid image payload");
      }
      generated = { buffer, extension };
      break;
    }
    if (!generated) throw new Error("Image provider did not return an image");
    failureStage = "image preparation";
    const uploadBuffer = await prepareDiscordPhoto(generated.buffer);
    failureStage = "Discord upload";
    const payload: MessageCreateOptions = {
      content: isFrench
        ? `Voici une représentation fictive de ${character.name}, générée par IA.`
        : `Here's an AI-generated fictional representation of ${character.name}.`,
      files: [{ attachment: uploadBuffer, name: "persona-photo.jpg" }],
      allowedMentions: { parse: [] },
    };

    if (options.privateInServer && !message.channel.isDMBased()) {
      failureStage = "private Discord upload";
      const sent = await message.author.send(payload).catch(() => null);
      if (!sent) {
        await message.reply(isFrench
          ? "Je n’ai pas pu t’envoyer l’image en privé. Vérifie que tes messages privés sont ouverts ; l’image n’a pas été partagée dans le salon."
          : "I couldn't send the image privately. Check that your DMs are open; the image wasn't posted in the channel.");
        return;
      }
      imageSent = true;
      await message.reply(isFrench ? "Je t’ai envoyé l’image en privé." : "I sent you the image privately.").catch(() => null);
      return;
    }

    await message.reply(payload);
    imageSent = true;
  } catch (error) {
    const errorText = error instanceof Error ? error.message : String(error);
    const hasAttachmentPermissionError = /50013|missing permissions|attach files/i.test(errorText);
    logger.warn({ stage: failureStage, error }, "Could not generate or send persona image");
    const notice = failureStage.includes("Discord")
      ? isFrench
        ? hasAttachmentPermissionError
          ? "L’image a été générée, mais le bot n’a pas la permission de joindre des fichiers dans ce salon."
          : "L’image a été générée, mais Discord a refusé son envoi. La tentative ne compte pas dans la limite quotidienne."
        : hasAttachmentPermissionError
          ? "The image was generated, but the bot lacks permission to attach files in this channel."
          : "The image was generated, but Discord refused the upload. This attempt won't count toward the daily limit."
      : isFrench
        ? "Le service d’image n’a pas pu fournir une image exploitable cette fois. La tentative ne compte pas dans la limite quotidienne."
        : "The image service couldn't provide a usable image this time. This attempt won't count toward the daily limit.";
    await message.reply(notice).catch(() => null);
  } finally {
    if (!imageSent) await releaseGeneratedImage(reservation.dayKey);
  }
}
