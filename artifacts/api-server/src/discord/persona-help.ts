import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, type Message } from "discord.js";
import { getPrefix } from "./prefix-store.js";
import { reportModuleFailure } from "./module-technician.js";
import type { UserLang } from "./user-lang-store.js";

export const PERSONA_HELP_PAGES = 4;

export function personaHelpTabLabels(language: UserLang): string[] {
  return language === "fr"
    ? ["Créer", "Discuter", "Images", "Réglages"]
    : ["Create", "Chat", "Images", "Settings"];
}

export function buildPersonaHelp(language: UserLang, page = 0, prefix = "!") {
  const fr = language === "fr";
  const cmd = (text: string) => `\`${prefix}persona ${text}\``;
  const labels = personaHelpTabLabels(language);
  const pages = fr ? [
    {
      title: "Créer ton persona",
      description: "Décris son caractère et son ton. Il est privé par défaut.",
      fields: [
        { name: "Créer", value: `${cmd("create Azumi | Une amie drôle, calme et passionnée de musique.")}\nAjoute \`public |\` pour le partager dans ce serveur.` },
        { name: "Lui parler", value: `${cmd("Azumi | Coucou !")}\nUtilise son nom ou son identifiant.` },
        { name: "Modifier", value: `${cmd("edit Azumi | Une amie calme et drôle.")}\nSeule sa description change.` },
        { name: "Choisir ou arrêter", value: `${cmd("list")} pour choisir · ${cmd("start Azumi")} pour activer · ${cmd("stop")} pour arrêter.\nLa liste affiche aussi un bouton d’arrêt.` },
        { name: "Création guidée", value: "Mentionne le bot avec « crée un persona » et réponds à ses questions. « Annule » arrête." },
      ],
    },
    {
      title: "Discuter et partager",
      description: "L’activation ne vaut que pour toi.",
      fields: [
        { name: "Reprendre", value: `${cmd("start")} reprend ton dernier persona. ${cmd("stop")} l’arrête.` },
        { name: "Voir la fiche", value: `${cmd("show <nom ou id>")} affiche les détails en privé.` },
        { name: "Partager", value: `${cmd("create public | Azumi | Une guide curieuse.")}\nVisible dans ce serveur; chacun l’active pour soi.` },
        { name: "Serveur de Maxime", value: `${cmd("Maxime")} autorise le persona du créateur dans ce serveur; chacun peut ensuite l’activer avec la même commande. Seul son créateur peut retirer l’accès avec ${cmd("Maxime off")}.` },
        { name: "Persona Bully", value: `${cmd("bully")} l’active pour toi seul. Il ne vise ni les autres ni les caractéristiques sensibles, et ne change pas les rappels de quêtes. ${cmd("stop")} l’arrête.` },
      ],
    },
    {
      title: "Images et avatar",
      description: "Les images sont des illustrations fictives.",
      fields: [
        { name: "Demander une image", value: `${cmd("Azumi | Envoie-moi une photo de toi")}\nDécris son apparence à la création pour garder des traits cohérents.` },
        { name: "Utiliser ton image", value: `Joins un fichier à ${cmd("avatar Azumi")}.` },
        { name: "Gérer l’avatar", value: `${cmd("avatar Azumi allow")} autorise ta photo en secours.\n${cmd("avatar Azumi revoke")} retire l’autorisation; ${cmd("avatar Azumi clear")} supprime l’image.` },
        { name: "Limites", value: "4 images Persona par jour; 10 images classiques séparément. Une image non livrée ne compte pas." },
      ],
    },
    {
      title: "Mémoire et réglages",
      description: "La mémoire est facultative et personnelle.",
      fields: [
        { name: "Mémoire", value: `${cmd("learn Azumi confirm")} l’active.\n${cmd("learn Azumi revoke")} la retire et efface les souvenirs personnels.` },
        { name: "Retrouver un message", value: `${cmd("recall Azumi confirm")} lance une recherche ponctuelle; le résultat est privé et le texte n’est pas conservé.` },
        { name: "Voix", value: `${cmd("voice Azumi")} choisit une voix. ${cmd("voice Azumi default")} reprend la voix du bot; créateur seulement.` },
        { name: "Visibilité et profil", value: `${cmd("privacy <id> public|private")} règle la visibilité.\n${cmd("profile <texte>")}, ${cmd("profile show")} et ${cmd("profile clear")} gèrent ta fiche publique dans ce serveur.` },
        { name: "Supprimer", value: `${cmd("delete <id>")} — créateur seulement, avec confirmation.` },
      ],
    },
  ] : [
    {
      title: "Create your persona",
      description: "Describe its character and style. It is private by default.",
      fields: [
        { name: "Create", value: `${cmd("create Azumi | A funny, calm friend who loves music.")}\nAdd \`public |\` to share it in this server.` },
        { name: "Chat", value: `${cmd("Azumi | Hi!")}\nUse its name or ID.` },
        { name: "Edit", value: `${cmd("edit Azumi | A calm, funny friend.")}\nOnly its description changes.` },
        { name: "Choose or stop", value: `${cmd("list")} to choose · ${cmd("start Azumi")} to activate · ${cmd("stop")} to stop.\nThe list also has a stop button.` },
        { name: "Guided setup", value: "Mention the bot with “create a persona” and answer its prompts. Say “cancel” to stop." },
      ],
    },
    {
      title: "Chat and share",
      description: "Activation applies only to you.",
      fields: [
        { name: "Resume", value: `${cmd("start")} resumes your last persona. Use ${cmd("stop")} to stop it.` },
        { name: "View details", value: `${cmd("show <name or id>")} sends the profile privately.` },
        { name: "Share", value: `${cmd("create public | Azumi | A curious guide.")}\nVisible in this server; each member activates it for themselves.` },
        { name: "Maxime's server access", value: `${cmd("Maxime")} lets its creator enable the persona in this server; anyone can then activate it with the same command. Only the creator can remove access with ${cmd("Maxime off")}.` },
        { name: "Bully persona", value: `${cmd("bully")} targets only you, never other members or sensitive traits or quest reminders. Use ${cmd("stop")} to turn it off.` },
      ],
    },
    {
      title: "Images and avatar",
      description: "Generated images are fictional illustrations.",
      fields: [
        { name: "Request an image", value: `${cmd("Azumi | Send me a photo")}\nDescribe its appearance at setup for consistent features.` },
        { name: "Use your image", value: `Attach a file to ${cmd("avatar Azumi")}.` },
        { name: "Manage avatar", value: `${cmd("avatar Azumi allow")} allows your profile photo as a fallback.\n${cmd("avatar Azumi revoke")} withdraws it; ${cmd("avatar Azumi clear")} removes the custom image.` },
        { name: "Limits", value: "4 persona images per day; 10 regular images separately. Undelivered images do not count." },
      ],
    },
    {
      title: "Memory and settings",
      description: "Memory is optional and personal.",
      fields: [
        { name: "Memory", value: `${cmd("learn Azumi confirm")} enables it.\n${cmd("learn Azumi revoke")} withdraws consent and deletes personal memories.` },
        { name: "Find an old message", value: `${cmd("recall Azumi confirm")} searches once; results stay private and the text is not stored.` },
        { name: "Voice", value: `${cmd("voice Azumi")} chooses a voice. ${cmd("voice Azumi default")} uses the bot voice; creator only.` },
        { name: "Visibility and profile", value: `${cmd("privacy <id> public|private")} changes visibility.\n${cmd("profile <text>")}, ${cmd("profile show")} and ${cmd("profile clear")} manage your server profile.` },
        { name: "Delete", value: `${cmd("delete <id>")} — creator only, with confirmation.` },
      ],
    },
  ];
  const index = Math.max(0, Math.min(PERSONA_HELP_PAGES - 1, page));
  return new EmbedBuilder()
    .setColor([0x8b5cf6, 0x6366f1, 0x0d9488, 0xd97706][index]!)
    .setAuthor({ name: fr ? "MaximeGPT · Guide des personas" : "MaximeGPT · Persona guide" })
    .setTitle(pages[index]!.title)
    .setDescription(pages[index]!.description)
    .addFields(pages[index]!.fields)
    .setFooter({ text: `${labels[index]} · ${index + 1}/${PERSONA_HELP_PAGES} · ${prefix}persona help` });
}

export async function sendPersonaHelp(message: Message, language: UserLang): Promise<void> {
  const prefix = getPrefix(message.guildId);
  const fr = language === "fr";
  const labels = personaHelpTabLabels(language);
  const key = `persona_help:${message.id}:`;
  let page = 0;
  const components = (disabled = false) => [new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...labels.map((label, index) => new ButtonBuilder()
      .setCustomId(`${key}${index}`).setLabel(label)
      .setStyle(index === page ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(disabled)),
  )];
  const reply = await message.reply({
    embeds: [buildPersonaHelp(language, page, prefix)],
    components: components(), allowedMentions: { parse: [], repliedUser: false },
  });
  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button, time: 5 * 60_000,
    filter: (interaction) => interaction.customId.startsWith(key),
  });
  collector.on("collect", async (interaction) => {
    try {
      if (interaction.user.id !== message.author.id) {
        await interaction.reply({
          content: fr ? `Ouvre ton propre guide avec \`${prefix}persona help\` pour naviguer.` : `Open your own guide with \`${prefix}persona help\` to navigate.`,
          ephemeral: true,
        });
        return;
      }
      const next = Number(interaction.customId.slice(key.length));
      if (!Number.isInteger(next) || next < 0 || next >= PERSONA_HELP_PAGES) return;
      page = next;
      await interaction.update({ embeds: [buildPersonaHelp(language, page, prefix)], components: components() });
    } catch (error) {
      await reportModuleFailure(message, "help", error);
    }
  });
  collector.on("end", () => { void reply.edit({ components: components(true) }).catch(() => null); });
}
