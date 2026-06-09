import { ChannelType, Client, GatewayIntentBits, Message, EmbedBuilder, MessageReaction, User } from "discord.js";
import OpenAI from "openai";
import { logger } from "./lib/logger";
import { playMinesweeper, playGeoguessr, playTrivia, stopGeoguessr, isGeoActive, playGuessNumber, playConnect4 } from "./games";

const PREFIX = "!";

const COMPLIMENTS = [
  "You are absolutely amazing! ✨",
  "Your smile lights up the room! ☀️",
  "You are a truly extraordinary person! 🌟",
  "You have a unique and precious talent! 💎",
  "The world is better because of you! 🌈",
  "You are brave and inspiring! 🦁",
  "Your creativity knows no limits! 🎨",
  "You are a deeply kind person! 💖",
  "You deserve all the happiness in the world! 🌸",
  "Your efforts make a real difference! 💪",
];

const COMPLIMENTS_FR = [
  "Tu es absolument incroyable ! ✨",
  "Ton sourire illumine la pièce ! ☀️",
  "Tu es une personne vraiment extraordinaire ! 🌟",
  "Tu as un talent unique et précieux ! 💎",
  "Le monde est meilleur grâce à toi ! 🌈",
  "Tu es courageux(se) et inspirant(e) ! 🦁",
  "Ta créativité ne connaît aucune limite ! 🎨",
  "Tu es une personne profondément gentille ! 💖",
  "Tu mérites tout le bonheur du monde ! 🌸",
  "Tes efforts font une vraie différence ! 💪",
];

const COMPLIMENTS_ES = [
  "¡Eres absolutamente increíble! ✨",
  "¡Tu sonrisa ilumina la habitación! ☀️",
  "¡Eres una persona verdaderamente extraordinaria! 🌟",
  "¡Tienes un talento único y precioso! 💎",
  "¡El mundo es mejor gracias a ti! 🌈",
  "¡Eres valiente e inspirador(a)! 🦁",
  "¡Tu creatividad no tiene límites! 🎨",
  "¡Eres una persona profundamente amable! 💖",
  "¡Mereces toda la felicidad del mundo! 🌸",
  "¡Tus esfuerzos marcan una verdadera diferencia! 💪",
];

const JOKES = [
  "Why don't scientists trust atoms? Because they make up everything! 😂",
  "Why did the scarecrow win an award? Because he was outstanding in his field! 🌾",
  "I told my wife she was drawing her eyebrows too high. She looked surprised! 😄",
  "Why don't skeletons fight each other? They don't have the guts! 💀",
  "What do you call a fish without eyes? A fsh! 🐟",
  "Why can't you give Elsa a balloon? Because she'll let it go! 🎈",
  "What do you call cheese that isn't yours? Nacho cheese! 🧀",
  "Why did the math book look so sad? Because it had too many problems! 📚",
  "What do you call a fake noodle? An impasta! 🍝",
  "Why did the bicycle fall over? Because it was two-tired! 🚲",
];

const JOKES_FR = [
  "Pourquoi les mathématiciens adorent les parcs d'attractions ? Parce qu'ils ont toujours des tangentes ! 🎢",
  "Pourquoi les squelettes ne se battent-ils jamais ? Ils n'ont pas le cran ! 💀",
  "Que dit une maman tomate à son bébé tomate en retard ? Dépêche-toi, ketchup ! 🍅",
  "Pourquoi les poissons détestent l'ordinateur ? Parce qu'ils ont peur du filet ! 🐟",
  "Pourquoi les araignées sont de mauvais conteurs ? Parce qu'elles racontent des toiles ! 🕷️",
  "Pourquoi l'ordinateur a-t-il traversé la route ? Pour atteindre l'autre site web ! 💻",
  "Qu'est-ce qu'un vampire ne peut pas mordre ? Sa langue ! 🧛",
  "Que fait un canard quand il est content ? Il coin-coin ! 🦆",
  "Pourquoi les tomates rougissent-elles ? Parce qu'elles ont vu la salade se déshabiller ! 🥗",
  "Pourquoi le livre de maths était triste ? Parce qu'il avait trop de problèmes ! 📚",
];

const JOKES_ES = [
  "¿Por qué los pájaros no usan Facebook? Porque ya tienen Twitter. 🐦",
  "¿Qué hace una abeja en el gimnasio? ¡Zum-ba! 🐝",
  "¿Por qué el libro de matemáticas estaba triste? Porque tenía muchos problemas. 📚",
  "¿Qué le dijo un pez a otro pez? ¡Nada, nada! 🐟",
  "¿Por qué los esqueletos no pelean entre ellos? Porque no tienen el valor. 💀",
  "¿Cuál es el colmo de un electricista? No tener corriente. ⚡",
  "¿Por qué el tomate se sonrojó? Porque vio la ensalada desnuda. 🍅",
  "¿Qué hace una vaca cuando explota de felicidad? ¡Leche! 🥛",
  "¿Cómo se llama un perro sin patas? No importa cómo lo llames, no vendrá. 🐶",
  "¿Por qué las bicicletas no pueden pararse solas? Porque están dos-tired. 🚲",
];

const ENCOURAGEMENTS = [
  "You can do it, I believe in you! 💪",
  "Every great journey begins with a single step. Keep going! 🚀",
  "You are stronger than you think! 🦸",
  "Today's difficulties are tomorrow's successes! 🌟",
  "Never give up! Perseverance always leads to victory! 🏆",
  "You're moving forward — even small steps count! 👣",
  "Keep believing in yourself, you're doing great! 🎯",
  "Even stars need darkness to shine. Hang in there! ⭐",
  "You've already overcome so many obstacles. You'll get through this one too! 🌈",
  "Take care of yourself and keep going at your own pace! 🌺",
];

const ENCOURAGEMENTS_FR = [
  "Tu peux le faire, je crois en toi ! 💪",
  "Chaque grand voyage commence par un petit pas. Continue ! 🚀",
  "Tu es plus fort(e) que tu ne le penses ! 🦸",
  "Les difficultés d'aujourd'hui sont les succès de demain ! 🌟",
  "N'abandonne jamais ! La persévérance mène toujours à la victoire ! 🏆",
  "Tu avances — même les petits pas comptent ! 👣",
  "Continue de croire en toi, tu fais du super travail ! 🎯",
  "Même les étoiles ont besoin d'obscurité pour briller. Accroche-toi ! ⭐",
  "Tu as déjà surmonté tellement d'obstacles. Tu vas y arriver aussi ! 🌈",
  "Prends soin de toi et avance à ton rythme ! 🌺",
];

const ENCOURAGEMENTS_ES = [
  "Puedes hacerlo, ¡creo en ti! 💪",
  "Cada gran viaje comienza con un solo paso. ¡Sigue adelante! 🚀",
  "¡Eres más fuerte de lo que crees! 🦸",
  "Las dificultades de hoy son los éxitos de mañana. 🌟",
  "Nunca te rindas. La perseverancia siempre conduce a la victoria. 🏆",
  "Estás avanzando — incluso los pasos pequeños cuentan. 👣",
  "Sigue creyendo en ti mismo, lo estás haciendo muy bien. 🎯",
  "Incluso las estrellas necesitan oscuridad para brillar. ¡Aguanta! ⭐",
  "Ya has superado tantos obstáculos. ¡También superarás este! 🌈",
  "Cuídate y sigue a tu propio ritmo. 🌺",
];

const EIGHT_BALL_RESPONSES = [
  "Yes, absolutely! ✅",
  "It is certain! 🎯",
  "Without a doubt! 💯",
  "Yes, I think so! 👍",
  "Signs point to yes! 🔮",
  "Probably! 🤔",
  "Outlook looks good! 🌟",
  "Maybe... try again! 🎲",
  "I'm not sure... 😕",
  "Outlook not so good! 😬",
  "Probably not! 👎",
  "No, certainly not! ❌",
  "My sources say no! 🚫",
  "Very doubtful! 🌫️",
  "Ask again later! ⏳",
];
const EIGHT_BALL_RESPONSES_FR = [
  "Oui, absolument ! ✅",
  "C'est certain ! 🎯",
  "Sans aucun doute ! 💯",
  "Oui, je pense que oui ! 👍",
  "Les signes indiquent oui ! 🔮",
  "Probablement ! 🤔",
  "Les perspectives sont bonnes ! 🌟",
  "Peut-être... réessaie ! 🎲",
  "Je ne suis pas sûr(e)... 😕",
  "Les perspectives ne sont pas très bonnes... 😬",
  "Probablement pas ! 👎",
  "Non, certainement pas ! ❌",
  "Mes sources disent non ! 🚫",
  "Très douteux ! 🌫️",
  "Demande à nouveau plus tard ! ⏳",
];

const EIGHT_BALL_RESPONSES_ES = [
  "¡Sí, absolutamente! ✅",
  "¡Es seguro! 🎯",
  "¡Sin lugar a dudas! 💯",
  "Sí, creo que sí. 👍",
  "Las señales apuntan a que sí. 🔮",
  "Probablemente. 🤔",
  "El panorama se ve bien. 🌟",
  "Quizás... ¡intenta de nuevo! 🎲",
  "No estoy seguro(a)... 😕",
  "Las perspectivas no son tan buenas... 😬",
  "Probablemente no. 👎",
  "No, definitivamente no. ❌",
  "Mis fuentes dicen que no. 🚫",
  "Muy dudoso. 🌫️",
  "Pregunta otra vez más tarde. ⏳",
];
const HUGS = [
  "Here's a huge virtual hug for you! 🤗💕",
  "Sending you warmth and love! 🫂✨",
  "A big hug just for you! 🐻💖",
  "Here, take this well-deserved hug! 🤗🌸",
  "A soft and cozy hug, just for you! 🧸💝",
];

const HUGS_FR = [
  "Voici un énorme câlin virtuel pour toi ! 🤗💕",
  "Je t'envoie de la chaleur et de l'amour ! 🫂✨",
  "Un grand câlin rien que pour toi ! 🐻💖",
  "Tiens, ce câlin bien mérité ! 🤗🌸",
  "Un câlin doux et réconfortant, juste pour toi ! 🧸💝",
];

const HUGS_ES = [
  "¡Aquí tienes un gran abrazo virtual! 🤗💕",
  "Te envío calor y amor. 🫂✨",
  "¡Un gran abrazo solo para ti! 🐻💖",
  "Toma este abrazo bien merecido. 🤗🌸",
  "Un abrazo suave y acogedor, solo para ti. 🧸💝",
];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type Language = "en" | "fr" | "es";

function parseLanguage(arg?: string): Language {
  const lang = (arg ?? "").toLowerCase();
  if (lang === "fr" || lang === "france") return "fr";
  if (lang === "es" || lang === "espanol" || lang === "esp") return "es";
  return "en";
}

type ChatMessage = { role: "user" | "assistant"; content: string };

type HelpLanguage = "en" | "fr" | "es";

type HelpPage = 1 | 2;

const HELP_PAGE_REACTIONS = ["⬅️", "➡️"];

function getHelpPageData(lang: HelpLanguage) {
  return {
    title:
      lang === "fr"
        ? "Aide du bot 🇫🇷"
        : lang === "es"
        ? "Ayuda del bot 🇪🇸"
        : "Bot Help",
    description:
      lang === "fr"
        ? "Voici un guide rapide pour commencer avec les commandes du bot. Utilise les réactions pour naviguer entre les pages."
        : lang === "es"
        ? "Aquí tienes una guía rápida para comenzar con los comandos del bot. Usa las reacciones para navegar entre las páginas."
        : "Here’s a quick guide to get started with the bot commands. Use the reactions to navigate between pages.",
    general: lang === "fr" ? "Commandes principales" : lang === "es" ? "Comandos principales" : "Main commands",
    fun: lang === "fr" ? "Divertissement" : lang === "es" ? "Diversión" : "Fun",
    games: lang === "fr" ? "Mini-jeux" : lang === "es" ? "Juegos" : "Mini-games",
    multilingual: lang === "fr" ? "Aide multilingue" : lang === "es" ? "Ayuda multilingüe" : "Multilingual help",
    multilingualNote:
      lang === "fr"
        ? "🌍 `!help fr` | `!help es` — Utilise une seule fois pour afficher l'aide dans la langue choisie."
        : lang === "es"
        ? "🌍 `!help fr` | `!help es` — Úsalo solo una vez para mostrar la ayuda en el idioma elegido."
        : "🌍 `!help fr` | `!help es` — Use once to show help in the chosen language.",
    generalCommands:
      lang === "fr"
        ? "`@bot <message>` — Discute avec moi en tant qu'IA 🤖\n`/image <description>` — Génère une image 🎨\n`!say <message>` — Je le dis pour toi et supprime ton message\n`!hello` — Je te souhaite la bienvenue"
        : lang === "es"
        ? "`@bot <message>` — Chatea conmigo como IA 🤖\n`/image <description>` — Genera una imagen 🎨\n`!say <message>` — Lo digo por ti y borro tu mensaje\n`!hello` — Te doy una cálida bienvenida"
        : "`@bot <message>` — Chat with me as an AI! 🤖\n`/image <description>` — Generate an image 🎨\n`!say <message>` — I'll say it for you and delete your message\n`!hello` — I'll welcome you warmly",
    funCommands:
      lang === "fr"
        ? "`!compliment` — Reçois un compliment 💖\n`!joke` — Entends une blague 😄\n`!encouragement` — Message motivant 💪\n`!hug` — Reçois un câlin virtuel 🤗\n`!8ball <question>` — Demande à la boule magique 🎱\n`!dice [faces]` — Lance un dé (ex. `!dice 20`) 🎲\n`!conspiracy [topic]` — Génère une théorie farfelue 🕵️"
        : lang === "es"
        ? "`!compliment` — Recibe un cumplido 💖\n`!joke` — Escucha un chiste 😄\n`!encouragement` — Mensaje motivador 💪\n`!hug` — Recibe un abrazo virtual 🤗\n`!8ball <question>` — Pregunta a la bola mágica 🎱\n`!dice [faces]` — Lanza un dado (ej. `!dice 20`) 🎲\n`!conspiracy [topic]` — Genera una teoría divertida 🕵️"
        : "`!compliment` — Get a heartfelt compliment 💖\n`!joke` — Hear a good joke 😄\n`!encouragement` — Get a motivating message 💪\n`!hug` — Receive a virtual hug 🤗\n`!8ball <question>` — Ask the magic 8-ball 🎱\n`!dice [faces]` — Roll a die (e.g. `!dice 20`) 🎲\n`!conspiracy [topic]` — Generate a wild conspiracy theory 🕵️",
    gameCommands:
      lang === "fr"
        ? "`!minesweeper [easy|medium|hard]` — Démineur avec cases spoiler 💣\n`!geo [easy|medium|hard]` — Devine le pays à partir d'un indice 🌍\n`!geo stop` — Abandonne la partie GeoGuessr\n`!trivia` — Quiz de culture générale 🧠\n`!guessnumber` — Devine un nombre entre 1 et 100 🎯\n`!connect4 test` — Lance un test solo contre le bot 🔴🟡\n`!connect4 <1-7>` — Place un jeton dans une colonne"
        : lang === "es"
        ? "`!minesweeper [easy|medium|hard]` — Buscaminas con casillas spoiler 💣\n`!geo [easy|medium|hard]` — Adivina el país con una pista 🌍\n`!geo stop` — Rinde la partida de GeoGuessr\n`!trivia` — Quiz de cultura general 🧠\n`!guessnumber` — Adivina un número entre 1 y 100 🎯\n`!connect4 test` — Inicia una prueba en solitario contra el bot 🔴🟡\n`!connect4 <1-7>` — Coloca una ficha en una columna"
        : "`!minesweeper [easy|medium|hard]` — Minesweeper with spoiler tiles 💣\n`!geo [easy|medium|hard]` — Guess the country from a photo + text clues 🌍\n`!geo stop` — Give up the current GeoGuessr game\n`!trivia` — General knowledge quiz 🧠\n`!guessnumber` — Guess the number between 1-100 🎯\n`!connect4 test` — Start a solo test vs the bot 🔴🟡\n`!connect4 <1-7>` — Drop a disc into a column",
  };
}

function renderHelpEmbed(lang: HelpLanguage, page: HelpPage) {
  const data = getHelpPageData(lang);
  const embedded = new EmbedBuilder()
    .setTitle(data.title)
    .setColor(lang === "fr" ? 0x3498db : lang === "es" ? 0xe74c3c : 0x1abc9c)
    .setDescription(`${data.description}\n\n${lang === "fr" ? "Navigue avec ⬅️ et ➡️ pour voir toutes les commandes." : lang === "es" ? "Navega con ⬅️ y ➡️ para ver todos los comandos." : "Navigate with ⬅️ and ➡️ to browse all commands."}`)
    .setFooter({ text: lang === "fr" ? `Page ${page}/2 • Utilise les réactions pour naviguer.` : lang === "es" ? `Página ${page}/2 • Usa las reacciones para navegar.` : `Page ${page}/2 • Use reactions to navigate.` })
    .setTimestamp();

  if (page === 1) {
    embedded.addFields(
      { name: data.general, value: data.generalCommands, inline: false },
      { name: data.fun, value: data.funCommands, inline: false }
    );
  } else {
    embedded.addFields(
      { name: data.games, value: data.gameCommands, inline: false },
      { name: data.multilingual, value: data.multilingualNote, inline: false }
    );
  }

  return embedded;
}

async function sendPaginatedHelp(message: Message, lang: HelpLanguage) {
  let currentPage: HelpPage = 1;
  const helpMessage = await message.reply({ embeds: [renderHelpEmbed(lang, currentPage)] });

  for (const emoji of HELP_PAGE_REACTIONS) {
    await helpMessage.react(emoji).catch(() => null);
  }

  const filter = (reaction: MessageReaction, user: User) => {
    return HELP_PAGE_REACTIONS.includes(reaction.emoji.name ?? "") && !user.bot && user.id === message.author.id;
  };

  const collector = helpMessage.createReactionCollector({ filter, time: 120000 });

  collector.on("collect", async (reaction) => {
    const emoji = reaction.emoji.name;
    if (emoji === "➡️" && currentPage === 1) {
      currentPage = 2;
      await helpMessage.edit({ embeds: [renderHelpEmbed(lang, currentPage)] });
    }
    if (emoji === "⬅️" && currentPage === 2) {
      currentPage = 1;
      await helpMessage.edit({ embeds: [renderHelpEmbed(lang, currentPage)] });
    }
    await reaction.users.remove(message.author.id).catch(() => null);
  });

  collector.on("end", async () => {
    await helpMessage.edit({ embeds: [renderHelpEmbed(lang, currentPage).setFooter({ text: lang === "fr" ? `Page ${currentPage}/2 • Aide expirée.` : lang === "es" ? `Página ${currentPage}/2 • Ayuda caducada.` : `Page ${currentPage}/2 • Help expired.` })] }).catch(() => null);
  });
}

const conversationHistory = new Map<string, ChatMessage[]>();
const MAX_HISTORY = 20;

function getHistory(channelId: string): ChatMessage[] {
  if (!conversationHistory.has(channelId)) conversationHistory.set(channelId, []);
  return conversationHistory.get(channelId)!;
}

function addToHistory(channelId: string, role: "user" | "assistant", content: string): void {
  const history = getHistory(channelId);
  history.push({ role, content });
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
}

function isBotMentioned(message: Message, botId: string): boolean {
  if (message.mentions.users.has(botId)) return true;
  return new RegExp(`<@!?${botId}>`).test(message.content);
}

function stripMentions(content: string): string {
  return content.replace(/<@!?\d+>/g, "").trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type SendableChannel = { id: string; send: (...args: unknown[]) => Promise<unknown>; sendTyping: () => Promise<void> };

function isSendable(channel: unknown): channel is SendableChannel {
  return typeof channel === "object" && channel !== null && "send" in channel && "sendTyping" in channel;
}

const activeBattles = new Set<string>();
const stoppedBattles = new Set<string>();

async function runAiBattle(
  topic: string,
  channel: SendableChannel,
  openai: OpenAI,
  bot1Name: string,
  bot2Client: Client
): Promise<void> {
  const ROUNDS = 3;
  const bot2Channel = await bot2Client.channels.fetch(channel.id).catch(() => null);

  if (!bot2Channel || !isSendable(bot2Channel as Message["channel"])) {
    await channel.send("❌ Bot 2 is not in this channel or not ready. Make sure to invite it to the server!");
    return;
  }

  const bot2SendableChannel = bot2Channel as unknown as SendableChannel;
  const bot2Name = bot2Client.user?.username ?? "Challenger";

  const channelId = channel.id;

  await channel.send(
    `⚔️ **AI BATTLE** ⚔️\n\n` +
    `**Topic:** ${topic}\n\n` +
    `🔵 **${bot1Name}** will argue **FOR**\n` +
    `🔴 **${bot2Name}** will argue **AGAINST**\n\n` +
    `3 rounds — one message every ~40 seconds.\nType \`!ai stop\` to end the battle early. 🥊`
  );

  await sleep(3000);

  const battleHistory: { role: "user" | "assistant"; content: string }[] = [];

  const systemFor = `You are ${bot1Name}, a passionate and eloquent AI debater. Your role is to argue STRONGLY FOR the following topic: "${topic}". Write a convincing argument of 150 to 200 words. Use vivid language, concrete examples, and end with a provocative rhetorical question or challenge aimed at your opponent. Respond in the same language as the topic.`;
  const systemAgainst = `You are ${bot2Name}, a sharp and confident AI debater. Your role is to argue STRONGLY AGAINST the following topic: "${topic}". Write a convincing counter-argument of 150 to 200 words. Tear down your opponent's points with logic and wit, use real-world examples, and end with a strong closing statement. Respond in the same language as the topic.`;

  for (let round = 1; round <= ROUNDS; round++) {
    if (stoppedBattles.has(channelId)) {
      await channel.send(`🛑 **Battle stopped after round ${round - 1}.**`);
      stoppedBattles.delete(channelId);
      return;
    }

    // Bot 1 argues FOR — show typing for ~10s to feel natural
    await channel.sendTyping();
    const forPrompt = round === 1
      ? `Make your opening argument FOR: "${topic}". Write 150 to 200 words.`
      : `Round ${round}: respond to your opponent's last argument and reinforce your position. Write 150 to 200 words.`;

    battleHistory.push({ role: "user", content: forPrompt });

    const forResponse = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_completion_tokens: 350,
      messages: [{ role: "system", content: systemFor }, ...battleHistory],
    });

    const forArg = forResponse.choices[0]?.message?.content ?? "...";
    battleHistory.push({ role: "assistant", content: forArg });

    await channel.send(`🔵 **${bot1Name}** — Round ${round}:\n\n${forArg}`);

    // Pause before bot 2 replies (~40s), refresh typing mid-wait
    await sleep(20000);
    if (stoppedBattles.has(channelId)) {
      await channel.send(`🛑 **Battle stopped mid-round ${round}.**`);
      stoppedBattles.delete(channelId);
      return;
    }
    await bot2SendableChannel.sendTyping();
    await sleep(20000);

    // Bot 2 argues AGAINST
    const againstPrompt = `Round ${round}: counter ${bot1Name}'s argument: "${forArg}". Write 150 to 200 words.`;
    const againstHistory = battleHistory.map((m) => ({ ...m }));
    againstHistory.push({ role: "user", content: againstPrompt });

    const againstResponse = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_completion_tokens: 350,
      messages: [{ role: "system", content: systemAgainst }, ...againstHistory],
    });

    const againstArg = againstResponse.choices[0]?.message?.content ?? "...";
    battleHistory.push({ role: "user", content: againstArg });

    await bot2SendableChannel.send(`🔴 **${bot2Name}** — Round ${round}:\n\n${againstArg}`);

    // Pause before next round
    if (round < ROUNDS) {
      await sleep(20000);
      if (stoppedBattles.has(channelId)) {
        await channel.send(`🛑 **Battle stopped after round ${round}.**`);
        stoppedBattles.delete(channelId);
        return;
      }
      await channel.sendTyping();
      await sleep(20000);
    }
  }

  // Verdict
  const verdictResponse = await openai.chat.completions.create({
    model: "llama-3.1-8b-instant",
    max_completion_tokens: 200,
    messages: [
      {
        role: "system",
        content: `You are a dramatic debate judge. Declare a winner between ${bot1Name} (FOR) and ${bot2Name} (AGAINST) on the topic "${topic}". Be theatrical and funny. Max 100 words. Respond in the same language as the debate.`,
      },
      { role: "user", content: `The debate is over. Who won?\n\n${battleHistory.map((m) => m.content).join("\n\n")}` },
    ],
  });

  const verdict = verdictResponse.choices[0]?.message?.content ?? "It's a tie!";
  await sleep(2000);
  await channel.send(`🏆 **VERDICT** 🏆\n\n${verdict}`);
}

export function startBot(): void {
  const token = process.env["DISCORD_TOKEN"];
  const token2 = process.env["DISCORD_TOKEN_2"];
  const groqKey = process.env["GROQ_API_KEY"];

  if (!token) {
    logger.warn("DISCORD_TOKEN not set — bot will not start");
    return;
  }

  const openai = groqKey
    ? new OpenAI({ apiKey: groqKey, baseURL: "https://api.groq.com/openai/v1" })
    : null;

  if (!openai) logger.warn("GROQ_API_KEY not set — AI features will be disabled");

  // Main bot (bot 1)
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: ["CHANNEL"],
  });

  // Second bot (bot 2) for AI battle
  let client2: Client | null = null;
  if (token2) {
    client2 = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
    client2.once("clientReady", () => {
      logger.info({ tag: client2!.user?.tag }, "Bot 2 connected");
    });
    client2.login(token2).catch((err) => {
      logger.error({ err }, "Failed to connect bot 2");
    });
  } else {
    logger.warn("DISCORD_TOKEN_2 not set — !ai battle will be disabled");
  }

  client.once("clientReady", () => {
    logger.info({ tag: client.user?.tag, id: client.user?.id }, "Discord bot connected");
  });

  client.on("messageCreate", async (message: Message) => {
    if (message.author.bot) return;

    const botId = client.user?.id ?? "";
    const content = message.content;

    logger.info({ content, botId, mentioned: isBotMentioned(message, botId) }, "Message received");

    // --- /image command ---
    if (content.startsWith("/image ") || content.startsWith("!image ")) {
      const prompt = content.slice(content.indexOf(" ") + 1).trim();
      if (!prompt) {
        await message.reply("🎨 Give me a description! e.g. `/image a sunset over Paris`");
        return;
      }
      const hfToken = process.env["HUGGINGFACE_TOKEN"];
      if (!hfToken) {
        await message.reply("❌ Image generation is not configured.");
        return;
      }
      try {
        const waitMsg = await message.reply("🎨 Generating your image, please wait...");
        const response = await fetch(
          "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ inputs: prompt }),
          }
        );
        if (!response.ok) {
          const err = await response.text();
          logger.error({ err, status: response.status }, "HuggingFace image error");
          await waitMsg.edit("❌ Failed to generate the image. Try again later!");
          return;
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        await waitMsg.delete();
        if (isSendable(message.channel)) {
          await message.channel.send({ content: `🖼️ **${prompt}**`, files: [{ attachment: buffer, name: "image.png" }] });
        }
      } catch (err) {
        logger.error({ err }, "Error generating image");
        await message.reply("❌ Failed to generate the image. Try again!");
      }
      return;
    }

    // --- @mention / DM → AI chat ---
    const isDm = message.channel.type === ChannelType.DM;

    // DM flow: always acknowledge, even if AI is not configured
    if (isDm && !content.startsWith(PREFIX)) {
      if (!openai) {
        await message.reply("❌ L'IA n'est pas configurée.");
        return;
      }

      const userText = content.trim();
      if (!userText) {
        await message.reply("Hey! 👋 Send me a message and I'll do my best to help you in private!");
        return;
      }

      try {
        if (isSendable(message.channel)) await message.channel.sendTyping();
        addToHistory(message.channelId, "user", `${message.author.displayName}: ${userText}`);
        const response = await openai.chat.completions.create({
          model: "llama-3.1-8b-instant",
          max_completion_tokens: 1024,
          messages: [
            { role: "system", content: "You are a friendly, helpful, and cheerful Discord bot. Keep your answers concise and conversational. Use a warm, casual tone. You can use emojis sparingly. Never break character. Respond in the same language the user writes in." },
            ...getHistory(message.channelId),
          ],
        });
        const reply = response.choices[0]?.message?.content ?? "Sorry, I couldn't think of a response! 😅";
        addToHistory(message.channelId, "assistant", reply);
        const chunks = reply.match(/[\s\S]{1,2000}/g) ?? [reply];
        for (const chunk of chunks) await message.reply(chunk);
      } catch (err) {
        logger.error({ err }, "Error calling Groq API");
        await message.reply("Oops, something went wrong while thinking! 😅 Try again in a moment.");
      }
      return;
    }

    // Mention flow: only trigger if AI is configured
    if (openai && !isDm && botId && isBotMentioned(message, botId)) {
      const userText = stripMentions(content);
      if (!userText) {
        await message.reply("Hey! 👋 Mention me with a message and I'll do my best to help you!");
        return;
      }

      try {
        if (isSendable(message.channel)) await message.channel.sendTyping();
        addToHistory(message.channelId, "user", `${message.author.displayName}: ${userText}`);
        const response = await openai.chat.completions.create({
          model: "llama-3.1-8b-instant",
          max_completion_tokens: 1024,
          messages: [
            { role: "system", content: "You are a friendly, helpful, and cheerful Discord bot. Keep your answers concise and conversational. Use a warm, casual tone. You can use emojis sparingly. Never break character. Respond in the same language the user writes in." },
            ...getHistory(message.channelId),
          ],
        });
        const reply = response.choices[0]?.message?.content ?? "Sorry, I couldn't think of a response! 😅";
        addToHistory(message.channelId, "assistant", reply);
        const chunks = reply.match(/[\s\S]{1,2000}/g) ?? [reply];
        for (const chunk of chunks) await message.reply(chunk);
      } catch (err) {
        logger.error({ err }, "Error calling Groq API");
        await message.reply("Oops, something went wrong while thinking! 😅 Try again in a moment.");
      }
      return;
    }

    // --- !prefix commands ---
    if (!content.startsWith(PREFIX)) return;

    const args = content.slice(PREFIX.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();

    try {
      switch (command) {
        case "say": {
          const text = args.join(" ");
          if (!text) {
            await message.reply("❓ Tell me what to say! e.g. `!say Hello everyone`");
          } else {
            await message.delete();
            if (isSendable(message.channel)) await message.channel.send(text);
          }
          break;
        }

        case "bonjour":
        case "salut":
        case "hello":
        case "hi": {
          await message.reply(`Hello ${message.author.displayName}! 👋 Great to see you here! How are you doing? 😊`);
          break;
        }

        case "compliment": {
          const lang = parseLanguage(args[0]);
          if (lang !== "en") args.shift();
          const compliments = lang === "fr" ? COMPLIMENTS_FR : lang === "es" ? COMPLIMENTS_ES : COMPLIMENTS;
          await message.reply(`${message.author.displayName}, ${getRandom(compliments)}`);
          break;
        }

        case "joke": {
          const lang = parseLanguage(args[0]);
          if (lang !== "en") args.shift();
          const jokes = lang === "fr" ? JOKES_FR : lang === "es" ? JOKES_ES : JOKES;
          await message.reply(getRandom(jokes));
          break;
        }

        case "encouragement":
        case "cheer": {
          const lang = parseLanguage(args[0]);
          if (lang !== "en") args.shift();
          const encouragements = lang === "fr" ? ENCOURAGEMENTS_FR : lang === "es" ? ENCOURAGEMENTS_ES : ENCOURAGEMENTS;
          await message.reply(`${message.author.displayName}, ${getRandom(encouragements)}`);
          break;
        }

        case "hug": {
          const lang = parseLanguage(args[0]);
          if (lang !== "en") args.shift();
          const hugs = lang === "fr" ? HUGS_FR : lang === "es" ? HUGS_ES : HUGS;
          await message.reply(`${message.author.displayName}, ${getRandom(hugs)}`);
          break;
        }

        case "8ball": {
          const lang = parseLanguage(args[0]);
          if (lang !== "en") args.shift();
          const question = args.join(" ");
          if (!question) {
            await message.reply("🎱 Ask me a question! e.g. `!8ball Will today be a good day?`");
          } else {
            const answers = lang === "fr" ? EIGHT_BALL_RESPONSES_FR : lang === "es" ? EIGHT_BALL_RESPONSES_ES : EIGHT_BALL_RESPONSES;
            await message.reply(`🎱 **Question:** ${question}\n**Answer:** ${getRandom(answers)}`);
          }
          break;
        }

        case "dice":
        case "roll": {
          const faces = parseInt(args[0] ?? "6");
          const nb = isNaN(faces) || faces < 2 ? 6 : Math.min(faces, 1000);
          const result = Math.floor(Math.random() * nb) + 1;
          await message.reply(`🎲 You rolled a ${nb}-sided die and got: **${result}**!`);
          break;
        }

        case "conspiracy": {
          if (!openai) { await message.reply("❌ AI is not configured."); break; }
          try {
            const topic = args.join(" ").trim();
            if (isSendable(message.channel)) await message.channel.sendTyping();
            const prompt = topic
              ? `Generate a short, absurd and funny conspiracy theory about: "${topic}". Keep it under 200 words. Be creative, dramatic and ridiculous. Start directly with the theory.`
              : `Generate a short, absurd and funny random conspiracy theory. Keep it under 200 words. Be creative, dramatic and ridiculous. Start directly with the theory.`;
            const response = await openai.chat.completions.create({
              model: "llama-3.1-8b-instant",
              max_completion_tokens: 300,
              messages: [
                { role: "system", content: "You are a dramatic conspiracy theory generator. Always write in the language the user used in their message. If no topic is given, use English. Be creative, funny and absurd — never harmful." },
                { role: "user", content: prompt },
              ],
            });
            const theory = response.choices[0]?.message?.content ?? "The truth is too dangerous to reveal... 🤫";
            await message.reply(`🕵️ **CONSPIRACY UNLOCKED** 🕵️\n\n${theory}`);
          } catch (err) {
            logger.error({ err }, "Error generating conspiracy");
            await message.reply("❌ The government blocked this conspiracy. Try again!");
          }
          break;
        }

        case "minesweeper":
        case "mine": {
          const diff = args[0]?.toLowerCase();
          const board = playMinesweeper(message, diff);
          if (board) await message.reply(board);
          break;
        }

        case "geo": {
          const sub = args[0]?.toLowerCase();
          if (sub === "stop") {
            if (isGeoActive(message.channelId)) {
              stopGeoguessr(message.channelId);
              await message.reply("🏳️ Partie de GeoGuessr abandonnée !");
            } else {
              await message.reply("🤷 Aucune partie en cours.");
            }
            break;
          }

          const difficulty = sub || "easy";
          if (!["easy", "medium", "hard"].includes(difficulty)) {
            await message.reply("❓ Invalid GeoGuessr mode. Use `!geo easy`, `!geo medium`, or `!geo hard`.\nExample: `!geo hard`");
            break;
          }

          playGeoguessr(message, difficulty as "easy" | "medium" | "hard").catch((err) => logger.error({ err }, "GeoGuessr error"));
          break;
        }

        case "trivia": {
          if (!openai) { await message.reply("❌ L'IA n'est pas configurée."); break; }
          playTrivia(message, openai).catch((err) => logger.error({ err }, "Trivia error"));
          break;
        }

        case "guessnumber":
        case "guess": {
          playGuessNumber(message).catch((err) => logger.error({ err }, "GuessNumber error"));
          break;
        }

        case "connect4": {
          await playConnect4(message, args[0]);
          break;
        }

        case "ai": {
          const subcommand = args.shift()?.toLowerCase();

          if (subcommand === "stop") {
            if (!activeBattles.has(message.channelId)) {
              await message.reply("🤷 No battle is running in this channel.");
            } else {
              stoppedBattles.add(message.channelId);
              await message.reply("🛑 Stopping the battle after the current message...");
            }
            break;
          }

          if (subcommand !== "battle") break;

          if (!openai) { await message.reply("❌ AI is not configured."); break; }
          if (!client2) { await message.reply("❌ Bot 2 is not connected. Add `DISCORD_TOKEN_2` to the secrets."); break; }
          if (!isSendable(message.channel)) break;

          const topic = args.join(" ").trim() || "Is pineapple on pizza acceptable?";

          if (activeBattles.has(message.channelId)) {
            await message.reply("⚔️ A battle is already happening in this channel! Type `!ai stop` to end it.");
            break;
          }

          activeBattles.add(message.channelId);
          const bot1Name = client.user?.username ?? "Defender";

          runAiBattle(topic, message.channel, openai, bot1Name, client2)
            .catch(async (err) => {
              logger.error({ err }, "Error during AI battle");
              await message.reply("❌ The battle crashed unexpectedly!");
            })
            .finally(() => {
              activeBattles.delete(message.channelId);
              stoppedBattles.delete(message.channelId);
            });

          break;
        }

        case "help": {
          const lang = args[0]?.toLowerCase();
          const helpLang = lang === "fr" ? "fr" : lang === "es" ? "es" : "en";
          await sendPaginatedHelp(message, helpLang);
          break;
        }

        default:
          break;
      }
    } catch (err) {
      logger.error({ err, command }, "Error handling command");
    }
  });

  client.login(token).catch((err) => {
    logger.error({ err }, "Failed to connect to Discord");
  });
}
