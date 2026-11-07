import { PermissionFlagsBits, type Message } from "discord.js";
import { getGlobalFeatures, getGuildFeatures } from "../lib/features-store.js";
import { configuredImageProviders, generateImage, ImageProviderError } from "./image-provider.js";
import { imageQuotaNotice, releaseGeneratedImage, reserveGeneratedImage } from "./image-quota.js";
import { checkCommandBlock, sendBlockedMessage } from "./command-suggest.js";
import { getPrefix } from "./prefix-store.js";
import { requireConsent } from "./ai-consent.js";
import { recordModuleFailureState } from "./module-technician.js";
import type { UserLang } from "./user-lang-store.js";

export async function canGenerateImage(message: Message, language: UserLang): Promise<boolean> {
  const fr = language === "fr";
  if (checkCommandBlock(message.author.id).blocked) {
    await sendBlockedMessage(message, checkCommandBlock(message.author.id), getPrefix(message.guildId));
    return false;
  }
  try {
    const enabled = (features: { name: string; enabled: boolean }[]) =>
      features.some((feature) => feature.name === "image_generation" && feature.enabled);
    if (!enabled(getGlobalFeatures()) || (message.guildId && !enabled(await getGuildFeatures(message.guildId, { failClosed: true })))) {
      await message.reply(fr ? "La génération d’images est désactivée ici." : "Image generation is disabled here.");
      return false;
    }
  } catch {
    await message.reply(fr ? "Je ne peux pas vérifier les réglages d’images pour le moment." : "I can't verify image settings right now.");
    return false;
  }
  if (!configuredImageProviders().length) {
    await message.reply(fr ? "La génération d’images n’est pas configurée pour le moment." : "Image generation is not configured right now.");
    return false;
  }
  return true;
}

export function imageFailureNotice(error: unknown, language: UserLang): string {
  const fr = language === "fr";
  const reason = error instanceof ImageProviderError ? error.reason : null;
  const details = reason === "configuration"
    ? fr ? "Le service d’images a refusé la requête ; sa configuration doit être vérifiée." : "The image service rejected the request; its configuration needs checking."
    : reason === "busy"
      ? fr ? "Le service d’images est saturé ou sa limite a été atteinte." : "The image service is busy or its limit has been reached."
      : fr ? "Je n’ai pas pu générer ou envoyer l’image. Réessaie plus tard." : "I couldn't generate or send the image. Please try again later.";
  return `${details} ${fr ? "Cette tentative ne compte pas dans la limite quotidienne." : "This attempt won't count toward the daily limit."}`;
}

export async function sendGeneratedImage(message: Message, prompt: string, language: UserLang): Promise<void> {
  const fr = language === "fr";
  if (!prompt.trim() || prompt.length > 2048) {
    await message.reply(fr ? "Donne une description de 1 à 2 048 caractères : `!image un coucher de soleil sur Paris`." : "Use a description of 1–2048 characters: `!image a sunset over Paris`.");
    return;
  }
  if (!await canGenerateImage(message, language)) return;
  // Reuse the existing general AI consent; no image-specific confirmation.
  if (!await requireConsent(message, language)) return;
  if (message.guild && message.client.user && message.channel.isSendable()
      && "permissionsFor" in message.channel
      && !message.channel.permissionsFor(message.client.user)?.has(PermissionFlagsBits.AttachFiles)) {
    await message.reply(fr ? "Il me manque la permission de joindre des fichiers dans ce salon." : "I need the Attach Files permission in this channel.");
    return;
  }
  const reservation = await reserveGeneratedImage();
  if (reservation.status !== "reserved") {
    await message.reply(imageQuotaNotice(reservation.status, language));
    return;
  }
  let sent = false;
  let progress: Message | undefined;
  let stage = "progress";
  try {
    progress = await message.reply(fr ? "Je génère ton image…" : "Generating your image…");
    stage = "generation";
    const image = await generateImage(prompt);
    stage = "upload";
    await progress.edit({
      content: fr ? "Voici ton image." : "Here's your image.",
      files: [{ attachment: image.buffer, name: `image.${image.extension}` }],
      allowedMentions: { parse: [] },
    });
    sent = true;
  } catch (error) {
    if (stage !== "generation") {
      recordModuleFailureState("image", new Error(`Discord image ${stage} failed`));
    }
    const notice = imageFailureNotice(error, language);
    if (progress) await progress.edit(notice).catch(() => null);
    else await message.reply(notice).catch(() => null);
  } finally {
    if (!sent) await releaseGeneratedImage(reservation.dayKey);
  }
}
