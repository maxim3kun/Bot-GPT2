import type { Message, MessageCreateOptions } from "discord.js";
import { logger } from "../lib/logger.js";
import { requireConsent } from "./ai-consent.js";
import { imageQuotaNotice, releaseGeneratedImage, reserveGeneratedImage } from "./image-quota.js";
import type { UserLang } from "./user-lang-store.js";

const IMAGE_MODEL_URL = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell";
const MAX_PERSONA_PHOTO_BYTES = 10 * 1024 * 1024;

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
  try {
    const response = await fetch(IMAGE_MODEL_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        inputs: `Create one high-quality, photorealistic, friendly portrait selfie of a fictional AI character called "${character.name}". Use the following character details only as visual reference: ${character.description.slice(0, 2_000)}. This is an imagined visual representation of an AI, not a real photograph or a depiction of its creator. Show one character, natural lighting, tasteful everyday clothing, no text, no letters, no logos, no watermark, no collage.`,
      }),
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.startsWith("image/")) {
      logger.warn({ status: response.status, contentType }, "Persona image generation failed");
      await message.reply(isFrench
        ? "Je n’ai pas réussi à générer l’image cette fois. La tentative ne compte pas dans la limite quotidienne."
        : "I couldn't generate the image this time. This attempt won't count toward the daily limit.");
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_PERSONA_PHOTO_BYTES) {
      logger.warn({ size: buffer.length }, "Generated persona image had an invalid size");
      await message.reply(isFrench
        ? "L’image générée n’avait pas un format valide. La tentative ne compte pas dans la limite quotidienne."
        : "The generated image had an invalid format. This attempt won't count toward the daily limit.");
      return;
    }

    const extension = contentType.includes("jpeg") ? "jpg" : contentType.includes("webp") ? "webp" : "png";
    const payload: MessageCreateOptions = {
      content: isFrench
        ? `Voici une représentation fictive de ${character.name}, générée par IA.`
        : `Here's an AI-generated fictional representation of ${character.name}.`,
      files: [{ attachment: buffer, name: `persona-photo.${extension}` }],
      allowedMentions: { parse: [] },
    };

    if (options.privateInServer && !message.channel.isDMBased()) {
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
    logger.warn({ error }, "Could not generate or send persona image");
    await message.reply(isFrench
      ? "Je n’ai pas pu générer ou envoyer cette image. La tentative ne comptera pas dans la limite quotidienne."
      : "I couldn't generate or send this image. This attempt won't count toward the daily limit.").catch(() => null);
  } finally {
    if (!imageSent) await releaseGeneratedImage(reservation.dayKey);
  }
}
