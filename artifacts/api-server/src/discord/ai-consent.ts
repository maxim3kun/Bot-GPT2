import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type Message, type ButtonInteraction } from "discord.js";
import { logger } from "../lib/logger.js";
import type { UserLang } from "./user-lang-store.js";

let _col: { findOne: Function; updateOne: Function } | null = null;
async function getCol() {
  if (_col) return _col;
  try {
    const { aiConsentCol } = await import("../lib/db.js");
    _col = aiConsentCol as typeof _col;
  } catch { _col = null; }
  return _col;
}

type ConsentStatus = "accepted" | "declined" | "unknown";
const AI_CONSENT_VERSION = 2;
type ConsentDoc = {
  userId: string;
  status: ConsentStatus;
  consentVersion?: number;
  memoryStatus?: ConsentStatus;
};
const cache = new Map<string, ConsentStatus>();

export async function getConsent(userId: string): Promise<ConsentStatus> {
  const cached = cache.get(userId);
  if (cached) return cached;
  const col = await getCol();
  if (col) {
    try {
      const doc = await col.findOne({ userId }) as ConsentDoc | null;
      if (doc) {
        if (doc.status === "accepted" && doc.consentVersion !== AI_CONSENT_VERSION) {
          return "unknown";
        }
        cache.set(userId, doc.status);
        return doc.status;
      }
    } catch (e) { logger.warn({ e }, "ai-consent: DB read failed"); }
  }
  return "unknown";
}

export async function setConsent(userId: string, status: "accepted" | "declined"): Promise<void> {
  cache.set(userId, status);
  const col = await getCol();
  if (col) {
    try {
      await col.updateOne(
        { userId },
        { $set: { userId, status, consentVersion: AI_CONSENT_VERSION } },
        { upsert: true },
      );
    } catch (e) { logger.warn({ e }, "ai-consent: DB write failed"); }
  }
}

export async function getMemoryConsent(userId: string): Promise<ConsentStatus> {
  const col = await getCol();
  if (!col) return "unknown";
  try {
    const doc = await col.findOne({ userId }) as ConsentDoc | null;
    return doc?.memoryStatus ?? "unknown";
  } catch (e) {
    logger.warn({ e }, "ai-consent: memory consent read failed");
    return "unknown";
  }
}

export async function setMemoryConsent(userId: string, status: "accepted" | "declined"): Promise<void> {
  const col = await getCol();
  if (!col) return;
  try {
    await col.updateOne({ userId }, { $set: { userId, memoryStatus: status } }, { upsert: true });
  } catch (e) {
    logger.warn({ e }, "ai-consent: memory consent write failed");
  }
}

export async function resetConsent(userId: string): Promise<void> {
  cache.delete(userId);
  const col = await getCol();
  if (col) {
    try { await col.updateOne({ userId }, { $unset: { status: "" } }); } catch { /* ignore */ }
  }
}

export function buildConsentPrompt(language: UserLang = "en"): { embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } {
  const isFrench = language === "fr";
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(isFrench ? "🤖 Fonction IA — consentement" : "🤖 AI Feature — One-time Consent")
    .setDescription(
      isFrench
        ? "Le texte nécessaire à ta demande sera transmis à **Groq**, le fournisseur IA. Une analyse peut inclure jusqu’à 100 messages récents accessibles à toi et au bot. Les messages bruts ne sont pas conservés. Si tu confirmes séparément l’apprentissage d’un persona, seuls des résumés chiffrés et classés seront gardés dans MongoDB.\n\nAcceptes-tu d’utiliser les fonctions IA ?"
        : "The text needed for your request will be sent to **Groq**, the AI provider. An analysis may include up to 100 recent messages accessible to you and the bot. Raw messages are not stored. If you separately confirm persona learning, only encrypted, ranked summaries are kept in MongoDB.\n\nDo you agree to use AI features?",
    )
    .setFooter({ text: isFrench ? "Ton choix est enregistré. Utilise !ai reset pour le modifier." : "Your choice is saved. Use !ai reset to change it later." });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ai_consent:yes:${language}:${AI_CONSENT_VERSION}`).setLabel(isFrench ? "✅ Oui, activer" : "✅ Yes, enable AI").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`ai_consent:no:${language}:${AI_CONSENT_VERSION}`).setLabel(isFrench ? "❌ Non merci" : "❌ No thanks").setStyle(ButtonStyle.Danger),
  );
  return { embeds: [embed], components: [row] };
}

export function buildMemoryConsentPrompt(userId: string): { embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🧠 Mémoire personnalisée — consentement")
    .setDescription(
      "Veux-tu autoriser l’enregistrement de **ce que tu demandes explicitement de retenir** ?\n\n" +
      "Les souvenirs sont chiffrés dans MongoDB, séparés par serveur, et visibles uniquement par toi. " +
      "Le bot ne mémorise rien automatiquement.",
    )
    .setFooter({ text: "Tu peux supprimer ta mémoire avec !ai forget all." });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ai_memory_consent:yes:${userId}`).setLabel("✅ Oui, autoriser").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`ai_memory_consent:no:${userId}`).setLabel("❌ Non merci").setStyle(ButtonStyle.Danger),
  );
  return { embeds: [embed], components: [row] };
}

export async function requireConsent(message: Message, language: UserLang = "en"): Promise<boolean> {
  const status = await getConsent(message.author.id);
  if (status === "accepted") return true;
  if (status === "declined") {
    await message.reply(language === "fr"
      ? "🚫 Tu as désactivé les fonctions IA. Utilise `!ai reset` pour changer ce choix."
      : "🚫 You've opted out of AI features. Use `!ai reset` to change this.");
    return false;
  }
  await message.reply(buildConsentPrompt(language));
  return false;
}

export async function requireMemoryConsent(message: Message): Promise<boolean> {
  const status = await getMemoryConsent(message.author.id);
  if (status === "accepted") return true;
  if (status === "declined") {
    await message.reply("🚫 Tu as refusé la mémoire personnalisée. Utilise `!ai memory reset` si tu veux changer ce choix.");
    return false;
  }
  await message.reply(buildMemoryConsentPrompt(message.author.id));
  return false;
}

export async function handleConsentButton(interaction: ButtonInteraction): Promise<void> {
  const [, action, languageTag, consentVersion] = interaction.customId.split(":");
  const isFrench = languageTag === "fr";
  if (action === "yes" && consentVersion !== String(AI_CONSENT_VERSION)) {
    const currentPrompt = buildConsentPrompt(isFrench ? "fr" : "en");
    await interaction.update({
      embeds: currentPrompt.embeds,
      components: currentPrompt.components,
    });
    return;
  }
  if (action === "yes") {
    await setConsent(interaction.user.id, "accepted");
    await interaction.update({
      embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(isFrench
        ? "✅ **Fonctions IA activées !** Relance ta commande pour continuer."
        : "✅ **AI features enabled!** Re-run your command and it will work now.")],
      components: [],
    });
  } else {
    await setConsent(interaction.user.id, "declined");
    await interaction.update({
      embeds: [new EmbedBuilder().setColor(0xed4245).setDescription(isFrench
        ? "❌ **Fonctions IA désactivées.** Utilise `!ai reset` pour les réactiver."
        : "❌ **AI features disabled.** Use `!ai reset` anytime to re-enable them.")],
      components: [],
    });
  }
}

export async function handleMemoryConsentButton(interaction: ButtonInteraction): Promise<void> {
  const [, action, requestedBy] = interaction.customId.split(":");
  if (requestedBy !== interaction.user.id) {
    await interaction.reply({ content: "❌ Cette demande de consentement ne t’est pas destinée.", ephemeral: true });
    return;
  }
  if (action === "yes") {
    await setMemoryConsent(interaction.user.id, "accepted");
    await interaction.update({
      embeds: [new EmbedBuilder().setColor(0x57f287).setDescription("✅ **Mémoire personnalisée autorisée.** Relance ta commande `!ai remember ...`.")],
      components: [],
    });
  } else {
    await setMemoryConsent(interaction.user.id, "declined");
    await interaction.update({
      embeds: [new EmbedBuilder().setColor(0xed4245).setDescription("❌ **Mémoire personnalisée désactivée.** Rien ne sera enregistré.")],
      components: [],
    });
  }
}
