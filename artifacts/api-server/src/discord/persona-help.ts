import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, type Message } from "discord.js";
import { getPrefix } from "./prefix-store.js";
import { reportModuleFailure } from "./module-technician.js";
import type { UserLang } from "./user-lang-store.js";

export const PERSONA_HELP_PAGES = 4;

export function buildPersonaHelp(language: UserLang, page = 0, prefix = "!") {
  const fr = language === "fr";
  const cmd = (text: string) => `\`${prefix}persona ${text}\``;
  const labels = fr ? ["Démarrer", "Discuter", "Images", "Mémoire & gestion"] : ["Get started", "Chat", "Images", "Memory & settings"];
  const pages = fr ? [
    {
      title: "Créer et piloter ton persona",
      description: "Choisis un persona selon sa description, puis active-le pour toi. Sa mémoire et son apparence restent séparées de celles des autres.",
      fields: [
        { name: "Créer", value: `${cmd("create Azumi | Une amie chaleureuse et drôle, aux cheveux argentés et aux yeux bleus.")}\nDécris son caractère, ses goûts, son ton et son apparence si tu veux. Privé par défaut ; ajoute \`public |\` pour le partager ici.` },
        { name: "Lui parler", value: `${cmd("Azumi | Coucou, comment vas-tu ?")}\nLe nom complet ou l’identifiant fonctionne ; \`|\` est facultatif.` },
        { name: "Modifier sa description", value: `${cmd("edit Azumi | Une amie calme qui aime la musique et répond avec humour.")}\nRemplace sa personnalité et son apparence décrites ; visibilité, fiche publique et souvenirs restent inchangés.` },
        { name: "Choisir, changer ou arrêter", value: `${cmd("list")} affiche les descriptions et le menu de choix privé.\n${cmd("start Azumi")} l’active pour toi ; ${cmd("stop")} l’arrête. Le bouton d’arrêt apparaît aussi dans la liste quand un persona est actif.` },
        { name: "Création guidée", value: "Mentionne le bot avec « crée un persona… » : réponds à ses questions, il le crée et l’active pour toi. Dis « annule » pour arrêter." },
      ],
    },
    {
      title: "Choisis comment lui parler",
      description: "Une question ponctuelle ou une conversation suivie : les deux sont possibles.",
      fields: [
        { name: "Un message ponctuel", value: `${cmd("Azumi | Raconte-moi ta journée")}\nLe nom complet ou l’identifiant du persona fonctionne. Le séparateur \`|\` est facultatif.` },
        { name: "Activer ou reprendre", value: `${cmd("start Azumi")}\n${cmd("start")} reprend ton dernier persona ; ${cmd("stop")} l’arrête pour toi. Sélectionne aussi un persona avec ${cmd("list")} ; la réaction 🎭 sous une réponse générale l’active, son retrait l’arrête.` },
        { name: "Retrouver tes personnages", value: `${cmd("list")} — descriptions et choix privé ; si un persona est actif, un bouton l’arrête.\n${cmd("show <nom ou id>")} — fiche détaillée.\nCes informations restent envoyées en privé.` },
        { name: "Privé ou partagé", value: `${cmd("create public | Azumi | Une guide curieuse et bienveillante.")}\nCrée un persona utilisable dans ce serveur. Une activation est personnelle : elle ne change pas le bot pour tous les membres.` },
        { name: "Persona Bully", value: `${cmd("bully")} l’active uniquement pour toi dans ce serveur ; ${cmd("stop")} l’arrête. Ses piques ne visent que toi, jamais les autres membres ni les caractéristiques sensibles. Ce persona ne change pas les rappels de quêtes.` },
      ],
    },
    {
      title: "Donne-lui une apparence",
      description: "Avatars et selfies sont des illustrations fictives, pas des photos d’une personne réelle.",
      fields: [
        { name: "Demander un selfie", value: "Avec le persona actif, mentionne le bot et demande : « Envoie-moi une photo de toi ».\nOu envoie directement : " + cmd("Azumi | Envoie-moi une photo de toi") },
        { name: "Garder une apparence cohérente", value: "Précise le visage, les yeux, les cheveux, les signes distinctifs et les vêtements à la création. La référence visuelle aide à garder les mêmes traits, sans garantir des images identiques." },
        { name: "Utiliser ton image", value: `Joins un fichier à ${cmd("avatar Azumi")}.\nTu peux aussi mentionner le bot avec une image lorsque ton persona est actif.` },
        { name: "Gérer l’avatar", value: `${cmd("avatar Azumi allow")} — autoriser ta photo de profil en secours.\n${cmd("avatar Azumi revoke")} — retirer cette autorisation.\n${cmd("avatar Azumi clear")} — retirer l’image personnalisée.` },
        { name: "Limite de génération", value: "4 images de personas par jour pour le bot. Les commandes d’images ont une limite séparée de 10 par jour. Une tentative non livrée ne compte pas dans ces limites." },
      ],
    },
    {
      title: "Tu gardes le contrôle",
      description: "La mémoire est facultative. Tes souvenirs personnels restent privés et chiffrés. Cette aide publique ne révèle ni profils ni souvenirs personnels.",
      fields: [
        { name: "Activer ou effacer ta mémoire", value: `${cmd("learn Azumi confirm")} — autoriser ton apprentissage personnel.\n${cmd("learn Azumi revoke")} — retirer l’autorisation et supprimer ta mémoire personnelle.\nChaque utilisateur d’un persona public contrôle sa propre mémoire.` },
        { name: "Retrouver un ancien message", value: `${cmd("recall Azumi confirm")}\nRecherche ponctuellement ton plus ancien message encore accessible dans cette conversation. Résultat en privé ; le texte n’est pas conservé.` },
        { name: "Choisir sa voix", value: `${cmd("voice Azumi")} — ouvre la sélection SIWIS / Gilles.\n${cmd("voice Azumi default")} — reprend la voix du bot. Réservé au créateur ; les autres personas ne changent pas.` },
        { name: "Visibilité et fiche publique", value: `${cmd("privacy <id> public")} ou ${cmd("privacy <id> private")} — réservé au créateur.\n${cmd("profile <texte public>")} crée ou modifie ta fiche dans ce serveur ; ${cmd("profile show")} la consulte en privé ; ${cmd("profile clear")} l’efface. Seul ce texte choisi est montré avec tes personas publics.` },
        { name: "Supprimer un persona", value: `${cmd("delete <id>")}\nRéservé au créateur, avec confirmation avant suppression.` },
      ],
    },
  ] : [
    {
      title: "Create and control your persona",
      description: "Choose a persona by its description, then activate it for yourself. Its memory and appearance remain separate from other users'.",
      fields: [
        { name: "Create", value: `${cmd("create Azumi | A warm, funny friend with silver hair and blue eyes.")}\nDescribe its personality, interests, reply style and optional appearance. Private by default; add \`public |\` to share it here.` },
        { name: "Chat", value: `${cmd("Azumi | Hi, how are you?")}\nUse its full name or ID; the \`|\` separator is optional.` },
        { name: "Edit its description", value: `${cmd("edit Azumi | A calm friend who loves music and replies with humor.")}\nReplaces its personality and described appearance; visibility, public profile and memories stay unchanged.` },
        { name: "Choose, switch or stop", value: `${cmd("list")} shows descriptions and a private selector.\n${cmd("start Azumi")} activates it for you; ${cmd("stop")} stops it. The list also has a stop button when one is active.` },
        { name: "Guided setup", value: "Mention the bot with “create a persona…”: answer its prompts and it creates and activates it. Say “cancel” to stop." },
      ],
    },
    {
      title: "Choose how to chat",
      description: "Ask a one-off question or start an ongoing conversation.",
      fields: [
        { name: "One message", value: `${cmd("Azumi | Tell me about your day")}\nUse the full persona name or ID. The \`|\` separator is optional.` },
        { name: "Activate or resume", value: `${cmd("start Azumi")}\n${cmd("start")} resumes your last persona; ${cmd("stop")} stops it for you. Select one with ${cmd("list")} too; add 🎭 under a general reply to activate it and remove your reaction to stop it.` },
        { name: "Find your characters", value: `${cmd("list")} — descriptions and a private selector; if a persona is active, it also has a stop button.\n${cmd("show <name or id>")} — detailed profile.\nThese details remain private.` },
        { name: "Private or shared", value: `${cmd("create public | Azumi | A curious, friendly guide.")}\nCreates a persona usable in this server. Activation is personal: it does not change the bot for everyone.` },
        { name: "Bully persona", value: `${cmd("bully")} activates it only for you in this server; ${cmd("stop")} turns it off. Its jabs target only you, never other members or sensitive traits. This persona does not change quest reminders.` },
      ],
    },
    {
      title: "Give your character a look",
      description: "Avatars and selfies are fictional illustrations, not photos of a real person.",
      fields: [
        { name: "Ask for a selfie", value: `Mention the bot with your persona active and ask “Send me a photo of yourself”.\nOr use ${cmd("Azumi | Send me a photo of yourself")}.` },
        { name: "A consistent appearance", value: "Describe the face, eyes, hair, distinctive features and clothing when creating the character. The visual reference helps preserve their features, but cannot guarantee identical images." },
        { name: "Use your own image", value: `Attach a file to ${cmd("avatar Azumi")}.\nYou can also mention the bot with an image while your persona is active.` },
        { name: "Manage the avatar", value: `${cmd("avatar Azumi allow")} — allow your profile photo as a fallback.\n${cmd("avatar Azumi revoke")} — withdraw permission.\n${cmd("avatar Azumi clear")} — remove the custom image.` },
        { name: "Generation limit", value: "4 persona images per day for the bot. Image commands have a separate limit of 10 per day. Undelivered attempts do not count against these limits." },
      ],
    },
    {
      title: "You stay in control",
      description: "Memory is optional. Your personal memories stay private and encrypted.",
      fields: [
        { name: "Enable or erase your memory", value: `${cmd("learn Azumi confirm")} — allow your personal learning.\n${cmd("learn Azumi revoke")} — withdraw permission and delete your personal memory.\nEach public-persona user controls their own memory.` },
        { name: "Find an older message", value: `${cmd("recall Azumi confirm")}\nOne-time search for your oldest accessible message in this conversation. Results stay private; the text is not stored.` },
        { name: "Choose a voice", value: `${cmd("voice Azumi")} — choose SIWIS / Gilles.\n${cmd("voice Azumi default")} — inherit the bot voice. Creator only; other personas are unchanged.` },
        { name: "Public profile and visibility", value: `${cmd("privacy <id> public")} or ${cmd("privacy <id> private")} — creator only.\n${cmd("profile <public text>")} creates or edits your profile in this server; ${cmd("profile show")} views it privately; ${cmd("profile clear")} removes it. Only the text you choose appears with your public personas.` },
        { name: "Delete a persona", value: `${cmd("delete <id>")}\nCreator only, with confirmation before deletion.` },
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
  const labels = fr ? ["Démarrer", "Discuter", "Images", "Mémoire & gestion"] : ["Get started", "Chat", "Images", "Memory & settings"];
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
