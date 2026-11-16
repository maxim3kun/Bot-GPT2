import { ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits, EmbedBuilder, escapeMarkdown, type Message } from "discord.js";
import { setGuildTtsVoice, getAiPersona, saveAiPersona, type AiPersonaRecord } from "../lib/db.js";
import { getEffectiveLanguage } from "./effective-language.js";
import { getPrefix } from "./prefix-store.js";
import { DEFAULT_VOICE, VOICE_CATALOG, isVoiceId, voiceName } from "./piper-tts.js";
import { logger } from "../lib/logger.js";

const copy = (message: Message, fr: string, en: string) => getEffectiveLanguage(message.guildId, message.author.id) === "fr" ? fr : en;
export async function getBotVoice(guildId: string): Promise<string> {
  // MaximeGPT's French voice is deliberately fixed to Gilles. Older guild
  // settings may still contain "siwis", but that voice is reserved for personas.
  void guildId;
  return DEFAULT_VOICE;
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
    `Voix actuelle : **${id ? voiceName(id) : "Gilles (voix masculine)"}**.\nVoix françaises locales, sans API payante. Les personas sans réglage héritent de la voix du bot; chacun peut garder sa propre voix.\nPour les autres langues, la voix Google existante est conservée.`,
    `Current voice: **${id ? voiceName(id) : "Gilles (male voice)"}**.\nLocal French voices, no paid API. Personas without an override inherit the bot; each persona can keep its own voice.\nOther languages keep the existing Google voice.`);
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
  const action = requested?.toLowerCase();
  const language = getEffectiveLanguage(guildId, message.author.id);
  const prefix = await getPrefix(guildId);

  if (!action || ["status", "statut", "list", "liste"].includes(action)) {
    const description = language === "fr"
      ? `**Français :** Gilles, voix masculine locale.\n**Autres langues :** Google TTS, voix masculine non garantie.\n**Personas :** leur réglage de voix reste indépendant.\n\n${prefix}voice gilles · ${prefix}voice status`
      : `**French:** Gilles, local male voice.\n**Other languages:** Google TTS; a male voice is not guaranteed.\n**Personas:** keep their own independent voice setting.\n\n${prefix}voice gilles · ${prefix}voice status`;
    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(language === "fr" ? "Voix · MaximeGPT" : "Voice · MaximeGPT")
      .setDescription(description);
    await message.reply({ embeds: [embed], allowedMentions: { parse: [] } });
    return;
  }

  const member = await message.guild?.members.fetch(message.author.id).catch(() => null);
  if (!member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
    await message.reply(copy(message, "Tu n’as pas la permission de modifier cette voix.", "You cannot change this voice."));
    return;
  }

  if (action === "siwis") {
    await message.reply(copy(
      message,
      "SIWIS est une voix féminine réservée aux personas. MaximeGPT utilise Gilles, la voix masculine.",
      "SIWIS is a feminine voice reserved for personas. MaximeGPT uses Gilles, the male voice.",
    ));
    return;
  }
  if (!["gilles", "default"].includes(action)) {
    await message.reply(copy(
      message,
      `MaximeGPT utilise Gilles. Utilise \`${prefix}voice status\` pour voir les voix; SIWIS reste disponible pour les personas.`,
      `MaximeGPT uses Gilles. Use \`${prefix}voice status\` to see the voice details; SIWIS remains available for personas.`,
    ));
    return;
  }

  try {
    // Clear any old feminine guild setting so it cannot be mistaken for the
    // active voice by other parts of the app; runtime selection is fixed above.
    await setGuildTtsVoice(guildId, action === "gilles" ? "gilles" : null);
    await message.reply(copy(message, "Voix de MaximeGPT confirmée : **Gilles**, voix masculine.", "MaximeGPT voice confirmed: **Gilles**, male voice."));
  } catch (error) {
    logger.warn({ errorName: error instanceof Error ? error.name : "Error" }, "Could not save the fixed bot voice");
    await message.reply(copy(
      message,
      "Je garde Gilles comme voix pendant cette session, mais le réglage n’a pas pu être enregistré dans MongoDB.",
      "Gilles remains the voice for this session, but the setting could not be saved to MongoDB.",
    ));
  }
}
