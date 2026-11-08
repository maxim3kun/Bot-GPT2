import { ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits, EmbedBuilder, escapeMarkdown, type Message } from "discord.js";
import { getGuildDoc, setGuildTtsVoice, getAiPersona, saveAiPersona, type AiPersonaRecord } from "../lib/db.js";
import { getEffectiveLanguage } from "./effective-language.js";
import { getPrefix } from "./prefix-store.js";
import { DEFAULT_VOICE, VOICE_CATALOG, isVoiceId, voiceName } from "./piper-tts.js";
import { logger } from "../lib/logger.js";

const copy = (message: Message, fr: string, en: string) => getEffectiveLanguage(message.guildId, message.author.id) === "fr" ? fr : en;
export async function getBotVoice(guildId: string): Promise<string> {
  const stored = (await getGuildDoc(guildId))?.ttsVoiceId;
  return isVoiceId(stored) ? stored : DEFAULT_VOICE;
}

export interface VoiceSelection {
  label: string;
  current?: string;
  canEdit: () => boolean | Promise<boolean>;
  save: (voiceId: string | undefined) => Promise<void>;
}

export function personaVoiceSelection(message: Message, persona: Pick<AiPersonaRecord, "id" | "name" | "ttsVoiceId">): VoiceSelection {
  return {
    label: escapeMarkdown(persona.name).replace(/@/g, "@\u200b"),
    current: isVoiceId(persona.ttsVoiceId) ? persona.ttsVoiceId : undefined,
    canEdit: async () => (await getAiPersona(persona.id))?.ownerId === message.author.id,
    save: async id => {
      if (id !== undefined && !isVoiceId(id)) throw new Error("Unknown voice");
      const fresh = await getAiPersona(persona.id);
      if (!fresh || fresh.ownerId !== message.author.id) throw new Error("Persona access denied");
      await saveAiPersona({ ...fresh, ttsVoiceId: id, updatedAt: new Date().toISOString() });
    },
  };
}

export async function selectVoice(message: Message, selection: VoiceSelection, requested?: string): Promise<void> {
  const save = async (id: string) => {
    if (!await selection.canEdit()) throw new Error(copy(message, "Tu n’as pas la permission de modifier cette voix.", "You cannot change this voice."));
    if (id !== "default" && !isVoiceId(id)) throw new Error(copy(message, "Voix inconnue. Choisis une voix dans la liste.", "Unknown voice. Choose one from the list."));
    await selection.save(id === "default" ? undefined : id);
    return copy(message, `Voix enregistrée pour **${selection.label}** : **${id === "default" ? "Par défaut" : voiceName(id)}**.`, `Saved voice for **${selection.label}**: **${id === "default" ? "Default" : voiceName(id)}**.`);
  };
  if (requested && !["list", "liste"].includes(requested)) {
    try { await message.reply(await save(requested.toLowerCase())); }
    catch (error) {
      logger.warn({ errorName: error instanceof Error ? error.name : "Error" }, "Voice setting was not saved");
      const permission = !await selection.canEdit();
      await message.reply(permission ? copy(message, "Tu n’as pas la permission de modifier cette voix.", "You cannot change this voice.")
        : !isVoiceId(requested.toLowerCase()) && requested !== "default" ? copy(message, "Voix inconnue : choisis SIWIS, Gilles ou `default`.", "Unknown voice: choose SIWIS, Gilles or `default`.")
        : copy(message, "Impossible d’enregistrer cette voix. Aucun changement confirmé ; vérifie MongoDB.", "Could not save the voice. No change confirmed; check MongoDB."));
    }
    return;
  }
  const prefix = await getPrefix(message.guildId);
  const description = (id?: string) => copy(message,
    `Voix actuelle : **${id ? voiceName(id) : "Par défaut"}**.\nVoix françaises locales, sans API payante. SIWIS est la voix de base. Les personas sans réglage héritent du bot.\nPour les autres langues, la voix Google existante est conservée.`,
    `Current voice: **${id ? voiceName(id) : "Default"}**.\nLocal French voices, no paid API. SIWIS is the base voice; personas without an override inherit the bot.\nOther languages keep the existing Google voice.`);
  const embed = new EmbedBuilder().setColor(0x8b5cf6)
    .setTitle(copy(message, `Voix · ${selection.label}`, `Voice · ${selection.label}`))
    .setDescription(description(selection.current))
    .addFields(VOICE_CATALOG.voices.map(voice => ({ name: voice.name, value: `${voice.description}\n${voice.license} · [Source](${voice.source})` })))
    .setFooter({ text: `${prefix}voice list · ${prefix}persona voice <nom> [siwis|gilles|default]` });
  const menu = new StringSelectMenuBuilder().setCustomId("tts_voice_select")
    .setPlaceholder(copy(message, "Choisir une voix", "Choose a voice"))
    .addOptions(
      { label: copy(message, "Par défaut", "Default"), value: "default", default: !selection.current },
      ...VOICE_CATALOG.voices.map(voice => ({ label: voice.name, value: voice.id, default: selection.current === voice.id })),
    );
  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
  const response = await message.reply({ embeds: [embed], components: [row], allowedMentions: { parse: [] } });
  const collector = response.createMessageComponentCollector({ time: 120_000 });
  collector.on("collect", async interaction => {
    if (!interaction.isStringSelectMenu() || interaction.customId !== "tts_voice_select") return;
    if (interaction.user.id !== message.author.id) {
      await interaction.reply({ content: copy(message, "Ouvre ton propre menu de voix.", "Open your own voice menu."), ephemeral: true }).catch(() => null);
      return;
    }
    try {
      // Acknowledge before MongoDB operations; recheck permissions on every click.
      await interaction.deferReply({ ephemeral: true });
      const text = await save(interaction.values[0]!);
      await interaction.editReply(text);
      const id = interaction.values[0]!;
      for (const option of menu.options) option.setDefault(option.toJSON().value === id);
      embed.setDescription(description(id === "default" ? undefined : id));
      await response.edit({ embeds: [embed], components: [row] });
    } catch (error) {
      logger.warn({ errorName: error instanceof Error ? error.name : "Error" }, "Voice selection failed");
      await interaction.editReply(copy(message, "Voix non enregistrée : vérifie tes permissions et la connexion MongoDB.", "Voice not saved: check your permissions and MongoDB connection.")).catch(() => null);
    }
  });
  collector.on("end", () => { menu.setDisabled(true); void response.edit({ components: [row] }).catch(() => null); });
}

export async function handleBotVoiceSelection(message: Message, requested?: string): Promise<void> {
  if (!message.guildId) {
    await message.reply(copy(message, "Choisis la voix du bot dans un serveur.", "Choose the bot voice in a server."));
    return;
  }
  const guildId = message.guildId;
  const current = (await getGuildDoc(guildId))?.ttsVoiceId;
  await selectVoice(message, {
    label: "MaximeGPT",
    current: isVoiceId(current) ? current : undefined,
    canEdit: async () => {
      const member = await message.guild?.members.fetch(message.author.id).catch(() => null);
      return member?.permissions.has(PermissionFlagsBits.ManageGuild) ?? false;
    },
    save: id => setGuildTtsVoice(guildId, id ?? null),
  }, requested);
}
