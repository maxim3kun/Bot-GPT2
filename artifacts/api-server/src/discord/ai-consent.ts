import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type Message, type ButtonInteraction } from "discord.js";
import { logger } from "../lib/logger.js";

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
const cache = new Map<string, ConsentStatus>();

export async function getConsent(userId: string): Promise<ConsentStatus> {
  const cached = cache.get(userId);
  if (cached) return cached;
  const col = await getCol();
  if (col) {
    try {
      const doc = await col.findOne({ userId }) as { status: ConsentStatus } | null;
      if (doc) { cache.set(userId, doc.status); return doc.status; }
    } catch (e) { logger.warn({ e }, "ai-consent: DB read failed"); }
  }
  return "unknown";
}

export async function setConsent(userId: string, status: "accepted" | "declined"): Promise<void> {
  cache.set(userId, status);
  const col = await getCol();
  if (col) {
    try {
      await col.updateOne({ userId }, { $set: { userId, status } }, { upsert: true });
    } catch (e) { logger.warn({ e }, "ai-consent: DB write failed"); }
  }
}

export async function resetConsent(userId: string): Promise<void> {
  cache.delete(userId);
  const col = await getCol();
  if (col) {
    try { await col.updateOne({ userId }, { $unset: { status: "" } }); } catch { /* ignore */ }
  }
}

export function buildConsentPrompt(): { embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🤖 AI Feature — One-time Consent")
    .setDescription(
      "This command uses **AI** (Groq / LLaMA) to generate content.\n" +
      "It may take a few seconds, and responses are generated automatically.\n\n" +
      "Do you agree to use AI-powered features on this server?",
    )
    .setFooter({ text: "Your choice is saved. Use !ai reset to change it later." });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("ai_consent:yes").setLabel("✅ Yes, enable AI").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("ai_consent:no").setLabel("❌ No thanks").setStyle(ButtonStyle.Danger),
  );
  return { embeds: [embed], components: [row] };
}

export async function requireConsent(message: Message): Promise<boolean> {
  const status = await getConsent(message.author.id);
  if (status === "accepted") return true;
  if (status === "declined") {
    await message.reply("🚫 You've opted out of AI features. Use `!ai reset` to change this.");
    return false;
  }
  await message.reply(buildConsentPrompt());
  return false;
}

export async function handleConsentButton(interaction: ButtonInteraction): Promise<void> {
  const action = interaction.customId.split(":")[1];
  if (action === "yes") {
    await setConsent(interaction.user.id, "accepted");
    await interaction.update({
      embeds: [new EmbedBuilder().setColor(0x57f287).setDescription("✅ **AI features enabled!** Re-run your command and it will work now.")],
      components: [],
    });
  } else {
    await setConsent(interaction.user.id, "declined");
    await interaction.update({
      embeds: [new EmbedBuilder().setColor(0xed4245).setDescription("❌ **AI features disabled.** Use `!ai reset` anytime to re-enable them.")],
      components: [],
    });
  }
}
