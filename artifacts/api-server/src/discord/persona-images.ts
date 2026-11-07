import type { Message, MessageCreateOptions } from "discord.js";
import { logger } from "../lib/logger.js";
import { requireConsent } from "./ai-consent.js";
import { imageQuotaNotice, releaseGeneratedImage, reserveGeneratedImage } from "./image-quota.js";
import {
  generatePersonaIllustration,
  PersonaImageProviderError,
} from "./persona-image-provider.js";
import type { UserLang } from "./user-lang-store.js";
import { canGenerateImage } from "./image-command.js";
import { recordModuleFailureState } from "./module-technician.js";

const MAX_DISCORD_PHOTO_BYTES = 7 * 1024 * 1024;

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
  character: { name: string; description: string; visualDescription?: string; visualSeed?: number },
  language: UserLang,
  options: { privateInServer?: boolean } = {},
): Promise<void> {
  const isFrench = language === "fr";
  if (!await canGenerateImage(message, language)) return;
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
    const generated = await generatePersonaIllustration({
      ...character,
      purpose: "selfie",
    });
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
    if (failureStage !== "image provider") {
      recordModuleFailureState("image", new Error(`Persona ${failureStage} failed`));
    }
    const errorText = error instanceof Error ? error.message : String(error);
    const hasAttachmentPermissionError = /50013|missing permissions|attach files/i.test(errorText);
    logger.warn({ stage: failureStage, error }, "Could not generate or send persona image");
    const providerFailure = error instanceof PersonaImageProviderError ? error : null;
    const notice = failureStage.includes("Discord")
      ? isFrench
        ? hasAttachmentPermissionError
          ? "L’image a été générée, mais le bot n’a pas la permission de joindre des fichiers dans ce salon."
          : "L’image a été générée, mais Discord a refusé son envoi. La tentative ne compte pas dans la limite quotidienne."
        : hasAttachmentPermissionError
          ? "The image was generated, but the bot lacks permission to attach files in this channel."
          : "The image was generated, but Discord refused the upload. This attempt won't count toward the daily limit."
      : failureStage === "image preparation"
        ? isFrench
          ? "L’image a été générée, mais le bot n’a pas pu la préparer pour Discord. La tentative ne compte pas dans la limite quotidienne."
          : "The image was generated, but the bot couldn't prepare it for Discord. This attempt won't count toward the daily limit."
        : providerFailure?.reason === "configuration"
          ? isFrench
            ? "Le service d’images a refusé la requête. La configuration doit être vérifiée ; la tentative ne compte pas dans la limite quotidienne."
            : "The image service rejected the request. Its configuration needs to be checked; this attempt won't count toward the daily limit."
          : providerFailure?.reason === "busy"
            ? isFrench
              ? "Le service d’images est très sollicité. Réessaie dans un instant ; cette tentative ne compte pas dans la limite quotidienne."
              : "The image service is busy. Please try again shortly; this attempt won't count toward the daily limit."
            : providerFailure?.reason === "timeout" || providerFailure?.reason === "network"
              ? isFrench
                ? "Le service d’images n’a pas répondu à temps. Réessaie dans un instant ; cette tentative ne compte pas dans la limite quotidienne."
                : "The image service did not respond in time. Please try again shortly; this attempt won't count toward the daily limit."
              : isFrench
                ? "Le service d’image n’a pas renvoyé un fichier image exploitable. La tentative ne compte pas dans la limite quotidienne."
                : "The image service did not return a usable image file. This attempt won't count toward the daily limit.";
    await message.reply(notice).catch(() => null);
  } finally {
    if (!imageSent) await releaseGeneratedImage(reservation.dayKey);
  }
}
