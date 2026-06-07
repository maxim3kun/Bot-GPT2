import { Client, GatewayIntentBits, Message } from "discord.js";
import { logger } from "./lib/logger";

const PREFIX = "!";

const COMPLIMENTS = [
  "Tu es absolument incroyable ! ✨",
  "Ton sourire illumine la pièce ! ☀️",
  "Tu es une personne vraiment extraordinaire ! 🌟",
  "Tu as un talent unique et précieux ! 💎",
  "Le monde est meilleur grâce à toi ! 🌈",
  "Tu es courageux(se) et inspirant(e) ! 🦁",
  "Ta créativité n'a pas de limites ! 🎨",
  "Tu es quelqu'un de profondément gentil ! 💖",
  "Tu mérites tout le bonheur du monde ! 🌸",
  "Tes efforts font une vraie différence ! 💪",
];

const BLAGUES = [
  "Pourquoi les plongeurs plongent-ils toujours en arrière et jamais en avant ? Parce que sinon ils tomberaient dans le bateau ! 😂",
  "Qu'est-ce qu'un canif ? Un petit fien ! 🐶",
  "Pourquoi les vaches portent-elles des cloches ? Parce que leurs cornes ne fonctionnent pas ! 🐄",
  "C'est l'histoire d'un peintre qui est mort... il avait trop de tableaux ! 🖼️",
  "Qu'est-ce qu'un crocodile qui surveille la cour d'école ? Un sac à dents ! 😄",
  "Pourquoi les fantômes sont-ils mauvais menteurs ? Parce qu'on voit à travers eux ! 👻",
  "Qu'est-ce qu'un chat tombé dans un pot de peinture le jour de Noël ? Un chat-peint de Noël ! 🎄",
  "Comment appelle-t-on un chat tombé dans un pot de confiture ? Un chat collant ! 😹",
  "Pourquoi les livres de maths sont-ils tristes ? Parce qu'ils ont trop de problèmes ! 📚",
  "Qu'est-ce qu'un homme qui a une orange sur la tête ? Rien, c'est juste une orange sur la tête ! 🍊",
];

const ENCOURAGEMENTS = [
  "Tu peux y arriver, je crois en toi ! 💪",
  "Chaque grand voyage commence par un premier pas. Continue ! 🚀",
  "Tu es plus fort(e) que tu ne le penses ! 🦸",
  "Les difficultés d'aujourd'hui sont les succès de demain ! 🌟",
  "Ne lâche jamais ! La persévérance mène toujours à la victoire ! 🏆",
  "Tu avances, même les petits pas comptent ! 👣",
  "Garde confiance en toi, tu fais du super travail ! 🎯",
  "Même les étoiles ont besoin d'obscurité pour briller. Tiens bon ! ⭐",
  "Tu as déjà surmonté tellement d'obstacles. Celui-ci aussi tu vas le passer ! 🌈",
  "Prends soin de toi et continue d'avancer à ton rythme ! 🌺",
];

const HUIT_BALL_REPONSES = [
  "Oui, absolument ! ✅",
  "C'est certain ! 🎯",
  "Sans aucun doute ! 💯",
  "Oui, je pense que oui ! 👍",
  "Les signes pointent vers oui ! 🔮",
  "Probablement ! 🤔",
  "Les perspectives semblent bonnes ! 🌟",
  "Peut-être... essaie encore ! 🎲",
  "Je n'en suis pas sûr(e)... 😕",
  "Les perspectives ne sont pas bonnes ! 😬",
  "Probablement pas ! 👎",
  "Non, certainement pas ! ❌",
  "Mes sources disent non ! 🚫",
  "Très douteux ! 🌫️",
  "Pose la question plus tard ! ⏳",
];

const CALINS = [
  "Voici un énorme câlin virtuel pour toi ! 🤗💕",
  "Je t'envoie plein de chaleur et d'amour ! 🫂✨",
  "Un câlin géant rien que pour toi ! 🐻💖",
  "Tiens, prends ce câlin bien mérité ! 🤗🌸",
  "Un câlin tout doux juste pour toi ! 🧸💝",
];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function startBot(): void {
  const token = process.env["DISCORD_TOKEN"];

  if (!token) {
    logger.warn("DISCORD_TOKEN not set — bot will not start");
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once("clientReady", () => {
    logger.info({ tag: client.user?.tag }, "Bot Discord connecté");
  });

  client.on("messageCreate", async (message: Message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();

    try {
      switch (command) {
        case "say": {
          const texte = args.join(" ");
          if (!texte) {
            await message.reply("❓ Dis-moi quoi répéter ! Ex: `!say Bonjour tout le monde`");
          } else if ("send" in message.channel) {
            await message.channel.send(texte);
          }
          break;
        }

        case "bonjour":
        case "salut":
        case "hello": {
          await message.reply(`Bonjour ${message.author.displayName} ! 👋 Ravi de te voir ici ! Comment tu vas ? 😊`);
          break;
        }

        case "compliment": {
          await message.reply(`${message.author.displayName}, ${getRandom(COMPLIMENTS)}`);
          break;
        }

        case "blague": {
          await message.reply(getRandom(BLAGUES));
          break;
        }

        case "encouragement":
        case "courage": {
          await message.reply(`${message.author.displayName}, ${getRandom(ENCOURAGEMENTS)}`);
          break;
        }

        case "calin":
        case "câlin": {
          await message.reply(`${message.author.displayName}, ${getRandom(CALINS)}`);
          break;
        }

        case "8ball":
        case "8boule": {
          const question = args.join(" ");
          if (!question) {
            await message.reply("🎱 Pose-moi une question ! Ex: `!8ball Est-ce que ça va être une bonne journée ?`");
          } else {
            await message.reply(`🎱 **Question :** ${question}\n**Réponse :** ${getRandom(HUIT_BALL_REPONSES)}`);
          }
          break;
        }

        case "dice":
        case "dé":
        case "de": {
          const faces = parseInt(args[0] ?? "6");
          const nb = isNaN(faces) || faces < 2 ? 6 : Math.min(faces, 1000);
          const résultat = Math.floor(Math.random() * nb) + 1;
          await message.reply(`🎲 Tu as lancé un dé à ${nb} faces et tu obtiens : **${résultat}** !`);
          break;
        }

        case "aide":
        case "help": {
          await message.reply(
            `📖 **Commandes disponibles :**\n\n` +
            `\`!say <message>\` — Je répète ce que tu dis\n` +
            `\`!bonjour\` — Je te souhaite la bienvenue\n` +
            `\`!compliment\` — Reçois un compliment du cœur 💖\n` +
            `\`!blague\` — Une bonne blague pour sourire 😄\n` +
            `\`!encouragement\` — Un mot pour te remotiver 💪\n` +
            `\`!calin\` — Un câlin virtuel bien mérité 🤗\n` +
            `\`!8ball <question>\` — La boule magique répond 🎱\n` +
            `\`!dice [faces]\` — Lance un dé (ex: \`!dice 20\`) 🎲`
          );
          break;
        }

        default:
          break;
      }
    } catch (err) {
      logger.error({ err, command }, "Erreur lors du traitement d'une commande");
    }
  });

  client.login(token).catch((err) => {
    logger.error({ err }, "Impossible de se connecter à Discord");
  });
}
