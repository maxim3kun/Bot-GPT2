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
      title: "Ton personnage, ta conversation",
      description: "Crée une personnalité, choisis son apparence et discute avec elle.\nCommence avec cet exemple, puis explore les onglets ci-dessous.",
      fields: [
        { name: "1. Créer Azumi", value: cmd("create Azumi | Une amie chaleureuse et drôle, aux cheveux argentés et aux yeux bleus.") },
        { name: "2. Lui parler", value: cmd("Azumi | Coucou, comment vas-tu ?") },
        { name: "3. Continuer naturellement", value: `${cmd("start Azumi")}\nActive Azumi pour toi. Mentionne ensuite le bot dans le salon, ou parle-lui en DM.\n${cmd("stop")} pour revenir au bot habituel.` },
        { name: "Ou laisse-toi guider", value: "Mentionne le bot avec « crée un persona… » : il te pose les questions nécessaires et l’active pour toi." },
      ],
    },
    {
      title: "Choisis comment lui parler",
      description: "Une question ponctuelle ou une conversation suivie : les deux sont possibles.",
      fields: [
        { name: "Un message ponctuel", value: `${cmd("Azumi | Raconte-moi ta journée")}\nLe nom complet ou l’identifiant du persona fonctionne. Le séparateur \`|\` est facultatif.` },
        { name: "Activer ou reprendre", value: `${cmd("start Azumi")}\n${cmd("start")} reprend ton dernier persona ; ${cmd("stop")} l’arrête pour toi.` },
        { name: "Retrouver tes personnages", value: `${cmd("list")} — liste des personas accessibles.\n${cmd("show <nom ou id>")} — fiche détaillée.\nCes informations personnelles restent envoyées en privé.` },
        { name: "Privé ou partagé", value: `${cmd("create public | Azumi | Une guide curieuse et bienveillante.")}\nCrée un persona utilisable dans ce serveur. Une activation est personnelle : elle ne change pas le bot pour tous les membres.` },
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
      description: "La mémoire est facultative. Tes souvenirs personnels restent privés et chiffrés.",
      fields: [
        { name: "Activer ou effacer ta mémoire", value: `${cmd("learn Azumi confirm")} — autoriser ton apprentissage personnel.\n${cmd("learn Azumi revoke")} — retirer l’autorisation et supprimer ta mémoire personnelle.\nChaque utilisateur d’un persona public contrôle sa propre mémoire.` },
        { name: "Retrouver un ancien message", value: `${cmd("recall Azumi confirm")}\nRecherche ponctuellement ton plus ancien message encore accessible dans cette conversation. Résultat en privé ; le texte n’est pas conservé.` },
        { name: "Changer la visibilité", value: `${cmd("privacy <id> public")} ou ${cmd("privacy <id> private")}.\nRéservé au créateur. \`public\` rend le persona utilisable dans le serveur, pas ses souvenirs personnels.` },
        { name: "Supprimer un persona", value: `${cmd("delete <id>")}\nRéservé au créateur, avec confirmation avant suppression.` },
        { name: "Ce qui reste privé", value: "Cette aide ne montre aucune donnée personnelle. Les listes, fiches, souvenirs et résultats privés ne deviennent pas publics parce que l’aide est affichée ici." },
      ],
    },
  ] : [
    {
      title: "Your character, your conversation",
      description: "Create a personality, choose their appearance and start chatting.\nTry this example, then explore the tabs below.",
      fields: [
        { name: "1. Create Azumi", value: cmd("create Azumi | A warm, funny friend with silver hair and blue eyes.") },
        { name: "2. Say hello", value: cmd("Azumi | Hi, how are you?") },
        { name: "3. Keep chatting naturally", value: `${cmd("start Azumi")}\nActivate Azumi for yourself. Then mention the bot in the channel, or chat by DM.\n${cmd("stop")} returns to the usual bot.` },
        { name: "Prefer a guided setup?", value: "Mention the bot with “create a persona…”: it asks the necessary questions and activates it for you." },
      ],
    },
    {
      title: "Choose how to chat",
      description: "Ask a one-off question or start an ongoing conversation.",
      fields: [
        { name: "One message", value: `${cmd("Azumi | Tell me about your day")}\nUse the full persona name or ID. The \`|\` separator is optional.` },
        { name: "Activate or resume", value: `${cmd("start Azumi")}\n${cmd("start")} resumes your last persona; ${cmd("stop")} stops it for you.` },
        { name: "Find your characters", value: `${cmd("list")} — available personas.\n${cmd("show <name or id>")} — detailed profile.\nThese personal details are still sent privately.` },
        { name: "Private or shared", value: `${cmd("create public | Azumi | A curious, friendly guide.")}\nCreates a persona usable in this server. Activation is personal: it does not change the bot for everyone.` },
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
        { name: "Change visibility", value: `${cmd("privacy <id> public")} or ${cmd("privacy <id> private")}.\nCreator only. Public visibility shares the persona in the server, not personal memories.` },
        { name: "Delete a persona", value: `${cmd("delete <id>")}\nCreator only, with confirmation before deletion.` },
        { name: "What stays private", value: "This guide contains no personal data. Lists, profiles, memories and private results do not become public just because help appears here." },
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
