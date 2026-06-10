import { ChannelType, Client, GatewayIntentBits, Partials, Message, EmbedBuilder, MessageReaction, User, ActivityType } from "discord.js";
import OpenAI from "openai";
import { logger } from "./lib/logger";
import { playMinesweeper, playGeoguessr, playTrivia, stopGeoguessr, isGeoActive, playGuessNumber, playConnect4 } from "./games";
import { joinVoice, leaveVoice, voiceStop, voiceResume, speakText, isInVoice } from "./discord/voice";
import { generateSong, pollSong, getCredits } from "./lib/suno-client";

const PREFIX = "!";

// ── Response pools ────────────────────────────────────────────────────────────

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
  "Yes, absolutely! ✅", "It is certain! 🎯", "Without a doubt! 💯",
  "Yes, I think so! 👍", "Signs point to yes! 🔮", "Probably! 🤔",
  "Outlook looks good! 🌟", "Maybe... try again! 🎲", "I'm not sure... 😕",
  "Outlook not so good! 😬", "Probably not! 👎", "No, certainly not! ❌",
  "My sources say no! 🚫", "Very doubtful! 🌫️", "Ask again later! ⏳",
];
const EIGHT_BALL_RESPONSES_FR = [
  "Oui, absolument ! ✅", "C'est certain ! 🎯", "Sans aucun doute ! 💯",
  "Oui, je pense que oui ! 👍", "Les signes indiquent oui ! 🔮", "Probablement ! 🤔",
  "Les perspectives sont bonnes ! 🌟", "Peut-être... réessaie ! 🎲", "Je ne suis pas sûr(e)... 😕",
  "Les perspectives ne sont pas très bonnes... 😬", "Probablement pas ! 👎", "Non, certainement pas ! ❌",
  "Mes sources disent non ! 🚫", "Très douteux ! 🌫️", "Demande à nouveau plus tard ! ⏳",
];
const EIGHT_BALL_RESPONSES_ES = [
  "¡Sí, absolutamente! ✅", "¡Es seguro! 🎯", "¡Sin lugar a dudas! 💯",
  "Sí, creo que sí. 👍", "Las señales apuntan a que sí. 🔮", "Probablemente. 🤔",
  "El panorama se ve bien. 🌟", "Quizás... ¡intenta de nuevo! 🎲", "No estoy seguro(a)... 😕",
  "Las perspectivas no son tan buenas... 😬", "Probablemente no. 👎", "No, definitivamente no. ❌",
  "Mis fuentes dicen que no. 🚫", "Muy dudoso. 🌫️", "Pregunta otra vez más tarde. ⏳",
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

const MUSIC_PROMPT_EXAMPLES = [
  { category: "🌊 Lo-Fi / Chill", prompt: "lo-fi hip hop beats, rainy day, chill, vinyl crackle, mellow piano" },
  { category: "🎸 Rock Énergique", prompt: "upbeat rock anthem, electric guitar riffs, powerful drums, energetic chorus" },
  { category: "🌙 Night Vibes", prompt: "dark synthwave, neon lights, midnight drive, 80s retro, pulsing bass" },
  { category: "🎹 Piano Cinématique", prompt: "emotional piano solo, cinematic, melancholic, slow tempo, orchestral strings" },
  { category: "🔥 Trap / Rap", prompt: "hard trap beat, 808 bass, hi-hats, dark melody, aggressive, street" },
  { category: "🌸 J-Pop / Anime", prompt: "anime opening, upbeat J-pop, catchy melody, japanese style, energetic" },
  { category: "🌿 Méditation", prompt: "peaceful meditation music, nature sounds, flute, soft drums, zen atmosphere" },
  { category: "🎺 Jazz", prompt: "smooth jazz, saxophone, late night club, soft brushed drums, warm bass" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Help system (3 pages) ─────────────────────────────────────────────────────

type HelpLanguage = "en" | "fr" | "es";
type HelpPage = 1 | 2 | 3;
const HELP_PAGE_REACTIONS = ["⬅️", "➡️"];

function buildHelpEmbed(lang: HelpLanguage, page: HelpPage): EmbedBuilder {
  const fr = lang === "fr"; const es = lang === "es";
  const color = fr ? 0x5865f2 : es ? 0xe74c3c : 0x1abc9c;
  const footer = fr ? `Page ${page}/3 — ⬅️ ➡️ pour naviguer`
    : es ? `Página ${page}/3 — ⬅️ ➡️ para navegar`
    : `Page ${page}/3 — ⬅️ ➡️ to navigate`;

  const embed = new EmbedBuilder()
    .setTitle(fr ? "📖 Aide du bot" : es ? "📖 Ayuda del bot" : "📖 Bot Help")
    .setColor(color)
    .setFooter({ text: footer })
    .setTimestamp();

  if (page === 1) {
    embed.setDescription(fr ? "Commandes générales et divertissement." : es ? "Comandos generales y diversión." : "General commands and fun.");
    embed.addFields(
      {
        name: fr ? "🌐 Général" : es ? "🌐 General" : "🌐 General",
        value: fr
          ? "`@bot <msg>` — Chat IA 🤖 · `!image <desc>` — Image IA 🎨\n`!say <msg>` — Je parle pour toi · `!hello` — Bienvenue 👋"
          : es
          ? "`@bot <msg>` — Chat IA 🤖 · `!image <desc>` — Imagen IA 🎨\n`!say <msg>` — Hablo por ti · `!hello` — Bienvenida 👋"
          : "`@bot <msg>` — AI chat 🤖 · `!image <desc>` — AI image 🎨\n`!say <msg>` — I speak for you · `!hello` — Welcome 👋",
      },
      {
        name: fr ? "🎉 Divertissement" : es ? "🎉 Diversión" : "🎉 Fun",
        value: fr
          ? "`!compliment` 💖 · `!joke` 😄 · `!encouragement` 💪 · `!hug` 🤗\n`!8ball <question>` 🎱 · `!dice [faces]` 🎲 · `!conspiracy [sujet]` 🕵️\n> Ajoute `fr` ou `es` après la commande : ex. `!joke fr`"
          : es
          ? "`!compliment` 💖 · `!joke` 😄 · `!encouragement` 💪 · `!hug` 🤗\n`!8ball <pregunta>` 🎱 · `!dice [caras]` 🎲 · `!conspiracy [tema]` 🕵️\n> Añade `fr` o `es` después del comando : ej. `!joke es`"
          : "`!compliment` 💖 · `!joke` 😄 · `!encouragement` 💪 · `!hug` 🤗\n`!8ball <question>` 🎱 · `!dice [faces]` 🎲 · `!conspiracy [topic]` 🕵️\n> Append `fr` or `es` to the command : e.g. `!joke fr`",
      },
    );
  } else if (page === 2) {
    embed.setDescription(fr ? "Mini-jeux et génération musicale." : es ? "Mini-juegos y música." : "Mini-games and music generation.");
    embed.addFields(
      {
        name: fr ? "🎮 Mini-jeux" : es ? "🎮 Juegos" : "🎮 Mini-games",
        value: fr
          ? "`!minesweeper [easy|medium|hard]` 💣\n`!geo [easy|medium|hard]` 🌍 · `!geo stop` — Abandon\n`!trivia` 🧠 · `!guessnumber` 🎯\n`!connect4 [1-7]` / `!connect4 solo` 🔴🟡"
          : es
          ? "`!minesweeper [easy|medium|hard]` 💣\n`!geo [easy|medium|hard]` 🌍 · `!geo stop` — Rendirse\n`!trivia` 🧠 · `!guessnumber` 🎯\n`!connect4 [1-7]` / `!connect4 solo` 🔴🟡"
          : "`!minesweeper [easy|medium|hard]` 💣\n`!geo [easy|medium|hard]` 🌍 · `!geo stop` — Quit\n`!trivia` 🧠 · `!guessnumber` 🎯\n`!connect4 [1-7]` / `!connect4 solo` 🔴🟡",
      },
      {
        name: fr ? "🎵 Musique — Suno AI" : es ? "🎵 Música — Suno AI" : "🎵 Music — Suno AI",
        value: fr
          ? "`!music generator <prompt>` — Génère une chanson (30-60s) 🎶\n`!music prompt` — Exemples de styles musicaux 💡\n`!balance` — Crédits Suno restants 💳"
          : es
          ? "`!music generator <prompt>` — Genera una canción (30-60s) 🎶\n`!music prompt` — Ejemplos de estilos musicales 💡\n`!balance` — Créditos Suno restantes 💳"
          : "`!music generator <prompt>` — Generate a song (30-60s) 🎶\n`!music prompt` — Music style examples 💡\n`!balance` — Remaining Suno credits 💳",
      },
    );
  } else {
    embed.setDescription(fr ? "Vocal, IA avancée et infos." : es ? "Voz, IA avanzada e info." : "Voice, advanced AI and info.");
    embed.addFields(
      {
        name: fr ? "🎙️ Vocal — Google TTS" : es ? "🎙️ Voz — Google TTS" : "🎙️ Voice — Google TTS",
        value: fr
          ? "`!join` — Rejoins ton salon vocal 🔊\n`!leave` — Quitte le salon 👋\n`!voice say <texte>` — Je parle dans le vocal 🗣️\n`!voice stop` / `!voice resume` — Silence / Reprendre"
          : es
          ? "`!join` — Únete al canal de voz 🔊\n`!leave` — Salir del canal 👋\n`!voice say <texto>` — Hablo en el canal de voz 🗣️\n`!voice stop` / `!voice resume` — Silencio / Reanudar"
          : "`!join` — Join your voice channel 🔊\n`!leave` — Leave the channel 👋\n`!voice say <text>` — I speak in voice 🗣️\n`!voice stop` / `!voice resume` — Mute / Resume",
      },
      {
        name: fr ? "⚔️ Bataille IA" : es ? "⚔️ Batalla IA" : "⚔️ AI Battle",
        value: fr
          ? "`!ai battle <sujet>` — Débat entre deux bots IA 🥊\n`!ai stop` — Arrêter le débat en cours"
          : es
          ? "`!ai battle <tema>` — Debate entre dos bots IA 🥊\n`!ai stop` — Detener el debate"
          : "`!ai battle <topic>` — Debate between two AI bots 🥊\n`!ai stop` — Stop the ongoing debate",
      },
      {
        name: fr ? "ℹ️ Info" : es ? "ℹ️ Info" : "ℹ️ Info",
        value: fr
          ? "`!credits` — Crédits du projet ✨\n`!help fr` / `!help es` — Aide dans ta langue"
          : es
          ? "`!credits` — Créditos del proyecto ✨\n`!help fr` / `!help es` — Ayuda en tu idioma"
          : "`!credits` — Project credits ✨\n`!help fr` / `!help es` — Help in your language",
      },
    );
  }

  return embed;
}

async function sendPaginatedHelp(message: Message, lang: HelpLanguage) {
  let page: HelpPage = 1;
  const helpMessage = await message.reply({ embeds: [buildHelpEmbed(lang, page)] });

  for (const emoji of HELP_PAGE_REACTIONS) await helpMessage.react(emoji).catch(() => null);

  const filter = (reaction: MessageReaction, user: User) =>
    HELP_PAGE_REACTIONS.includes(reaction.emoji.name ?? "") && !user.bot && user.id === message.author.id;

  const collector = helpMessage.createReactionCollector({ filter, time: 120000 });

  collector.on("collect", async (reaction, user) => {
    const emoji = reaction.emoji.name;
    if (emoji === "➡️" && page < 3) page = (page + 1) as HelpPage;
    if (emoji === "⬅️" && page > 1) page = (page - 1) as HelpPage;
    await helpMessage.edit({ embeds: [buildHelpEmbed(lang, page)] });
    await reaction.users.remove(user.id).catch(() => null);
  });

  collector.on("end", async () => {
    const fr = lang === "fr"; const es = lang === "es";
    await helpMessage.edit({
      embeds: [buildHelpEmbed(lang, page).setFooter({
        text: fr ? `Page ${page}/3 — Aide expirée.` : es ? `Página ${page}/3 — Ayuda caducada.` : `Page ${page}/3 — Help expired.`,
      })],
    }).catch(() => null);
  });
}

// ── Conversation history ──────────────────────────────────────────────────────

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

// ── AI Battle ─────────────────────────────────────────────────────────────────

const activeBattles = new Set<string>();
const stoppedBattles = new Set<string>();

async function runAiBattle(
  topic: string,
  channel: SendableChannel,
  openai: OpenAI,
  bot1Name: string,
  bot2Client: Client,
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
    `⚔️ **AI BATTLE** ⚔️\n\n**Topic:** ${topic}\n\n` +
    `🔵 **${bot1Name}** argumente **POUR**\n` +
    `🔴 **${bot2Name}** argumente **CONTRE**\n\n` +
    `3 rounds — un message toutes les ~40s. Tape \`!ai stop\` pour arrêter. 🥊`,
  );

  await sleep(3000);

  const battleHistory: { role: "user" | "assistant"; content: string }[] = [];

  const systemFor = `You are ${bot1Name}, a passionate and eloquent AI debater. Argue STRONGLY FOR: "${topic}". Write 150-200 words. Use vivid language, concrete examples, end with a provocative question for your opponent. Respond in the same language as the topic.`;
  const systemAgainst = `You are ${bot2Name}, a sharp and confident AI debater. Argue STRONGLY AGAINST: "${topic}". Write 150-200 words. Tear down your opponent's arguments with logic and wit, use real-world examples, end with a strong closing statement. Respond in the same language as the topic.`;

  for (let round = 1; round <= ROUNDS; round++) {
    if (stoppedBattles.has(channelId)) {
      await channel.send(`🛑 **Battle stopped after round ${round - 1}.**`);
      stoppedBattles.delete(channelId);
      return;
    }

    await channel.sendTyping();
    const forPrompt = round === 1
      ? `Opening argument FOR: "${topic}". Write 150-200 words.`
      : `Round ${round}: respond to your opponent and reinforce your position. Write 150-200 words.`;

    battleHistory.push({ role: "user", content: forPrompt });

    const forResponse = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_completion_tokens: 350,
      messages: [{ role: "system", content: systemFor }, ...battleHistory],
    });

    const forArg = forResponse.choices[0]?.message?.content ?? "...";
    battleHistory.push({ role: "assistant", content: forArg });
    await channel.send(`🔵 **${bot1Name}** — Round ${round}:\n\n${forArg}`);

    await sleep(20000);
    if (stoppedBattles.has(channelId)) {
      await channel.send(`🛑 **Battle stopped mid-round ${round}.**`);
      stoppedBattles.delete(channelId);
      return;
    }
    await bot2SendableChannel.sendTyping();
    await sleep(20000);

    const againstPrompt = `Round ${round}: counter ${bot1Name}'s argument: "${forArg}". Write 150-200 words.`;
    const againstHistory = [...battleHistory, { role: "user" as const, content: againstPrompt }];

    const againstResponse = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_completion_tokens: 350,
      messages: [{ role: "system", content: systemAgainst }, ...againstHistory],
    });

    const againstArg = againstResponse.choices[0]?.message?.content ?? "...";
    battleHistory.push({ role: "user", content: againstArg });
    await bot2SendableChannel.send(`🔴 **${bot2Name}** — Round ${round}:\n\n${againstArg}`);

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

// ── Bot entry point ───────────────────────────────────────────────────────────

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

  if (!openai) logger.warn("GROQ_API_KEY not set — AI features disabled");

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.Channel],
  });

  let client2: Client | null = null;
  if (token2) {
    client2 = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
    client2.once("clientReady", () => logger.info({ tag: client2!.user?.tag }, "Bot 2 connected"));
    client2.login(token2).catch((err) => logger.error({ err }, "Failed to connect bot 2"));
  } else {
    logger.warn("DISCORD_TOKEN_2 not set — !ai battle disabled");
  }

  client.once("clientReady", () => {
    logger.info({ tag: client.user?.tag, id: client.user?.id }, "Discord bot connected");
    client.user?.setActivity("!help · !music · !join", { type: ActivityType.Listening });
  });

  // ── Message handler ──────────────────────────────────────────────────────────

  client.on("messageCreate", async (message: Message) => {
    if (message.author.bot) return;

    const botId = client.user?.id ?? "";
    const content = message.content;

    // --- Image generation ---
    if (content.startsWith("/image ") || content.startsWith("!image ")) {
      const prompt = content.slice(content.indexOf(" ") + 1).trim();
      if (!prompt) { await message.reply("🎨 Donne-moi une description ! ex. `!image un coucher de soleil sur Paris`"); return; }
      const hfToken = process.env["HUGGINGFACE_TOKEN"];
      if (!hfToken) { await message.reply("❌ La génération d'images n'est pas configurée (HUGGINGFACE_TOKEN manquant)."); return; }
      try {
        const waitMsg = await message.reply("🎨 Génération en cours, patiente quelques secondes...");
        const response = await fetch(
          "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ inputs: prompt }),
          },
        );
        if (!response.ok) {
          logger.error({ status: response.status }, "HuggingFace image error");
          await waitMsg.edit("❌ Échec de la génération. Réessaie plus tard !");
          return;
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        await waitMsg.delete();
        if (isSendable(message.channel)) {
          await message.channel.send({ content: `🖼️ **${prompt}**`, files: [{ attachment: buffer, name: "image.png" }] });
        }
      } catch (err) {
        logger.error({ err }, "Image generation error");
        await message.reply("❌ Erreur lors de la génération. Réessaie !");
      }
      return;
    }

    // --- DM AI chat ---
    const isDm = message.channel.type === ChannelType.DM;
    if (isDm && !content.startsWith(PREFIX)) {
      if (!openai) { await message.reply("❌ L'IA n'est pas configurée (GROQ_API_KEY manquant)."); return; }
      const userText = content.trim();
      if (!userText) { await message.reply("Hey ! 👋 Envoie-moi un message et je ferai de mon mieux !"); return; }
      try {
        if (isSendable(message.channel)) await message.channel.sendTyping();
        addToHistory(message.channelId, "user", `${message.author.displayName}: ${userText}`);
        const response = await openai.chat.completions.create({
          model: "llama-3.1-8b-instant",
          max_completion_tokens: 1024,
          messages: [
            { role: "system", content: "You are a friendly, helpful, and cheerful Discord bot created by Maxime. Keep answers concise and conversational. Warm, casual tone. Emojis sparingly. Never break character. Respond in the same language the user writes in." },
            ...getHistory(message.channelId),
          ],
        });
        const reply = response.choices[0]?.message?.content ?? "Désolé, je n'ai pas pu répondre ! 😅";
        addToHistory(message.channelId, "assistant", reply);
        const chunks = reply.match(/[\s\S]{1,2000}/g) ?? [reply];
        for (const chunk of chunks) await message.reply(chunk);
      } catch (err) {
        logger.error({ err }, "DM AI error");
        await message.reply("Oops, quelque chose s'est mal passé ! 😅 Réessaie dans un instant.");
      }
      return;
    }

    // --- @mention AI chat ---
    if (openai && !isDm && botId && isBotMentioned(message, botId)) {
      const userText = stripMentions(content);
      if (!userText) { await message.reply("Hey ! 👋 Mentionne-moi avec un message et je t'aide !"); return; }
      try {
        if (isSendable(message.channel)) await message.channel.sendTyping();
        addToHistory(message.channelId, "user", `${message.author.displayName}: ${userText}`);
        const response = await openai.chat.completions.create({
          model: "llama-3.1-8b-instant",
          max_completion_tokens: 1024,
          messages: [
            { role: "system", content: "You are a friendly, helpful, and cheerful Discord bot created by Maxime. Keep answers concise and conversational. Warm, casual tone. Emojis sparingly. Never break character. Respond in the same language the user writes in." },
            ...getHistory(message.channelId),
          ],
        });
        const reply = response.choices[0]?.message?.content ?? "Désolé, je n'ai pas pu répondre ! 😅";
        addToHistory(message.channelId, "assistant", reply);
        const chunks = reply.match(/[\s\S]{1,2000}/g) ?? [reply];
        for (const chunk of chunks) await message.reply(chunk);
        // Also speak in voice if bot is connected
        if (message.guildId && isInVoice(message.guildId)) {
          speakText(message.guildId, reply, "fr").catch(() => null);
        }
      } catch (err) {
        logger.error({ err }, "Mention AI error");
        await message.reply("Oops, quelque chose s'est mal passé ! 😅 Réessaie dans un instant.");
      }
      return;
    }

    // --- Prefix commands ---
    if (!content.startsWith(PREFIX)) return;

    const args = content.slice(PREFIX.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();

    try {
      switch (command) {

        // ── General ─────────────────────────────────────────────────────────────
        case "say": {
          const text = args.join(" ");
          if (!text) {
            await message.reply("❓ Dis-moi quoi dire ! ex. `!say Bonjour tout le monde`");
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
          await message.reply(`Bonjour ${message.author.displayName} ! 👋 Ravi de te voir ici ! Comment tu vas ? 😊`);
          break;
        }

        // ── Fun ──────────────────────────────────────────────────────────────────
        case "compliment": {
          const lang = parseLanguage(args[0]);
          const list = lang === "fr" ? COMPLIMENTS_FR : lang === "es" ? COMPLIMENTS_ES : COMPLIMENTS;
          await message.reply(`${message.author.displayName}, ${getRandom(list)}`);
          break;
        }

        case "joke": {
          const lang = parseLanguage(args[0]);
          const list = lang === "fr" ? JOKES_FR : lang === "es" ? JOKES_ES : JOKES;
          await message.reply(getRandom(list));
          break;
        }

        case "encouragement":
        case "cheer": {
          const lang = parseLanguage(args[0]);
          const list = lang === "fr" ? ENCOURAGEMENTS_FR : lang === "es" ? ENCOURAGEMENTS_ES : ENCOURAGEMENTS;
          await message.reply(`${message.author.displayName}, ${getRandom(list)}`);
          break;
        }

        case "hug": {
          const lang = parseLanguage(args[0]);
          const list = lang === "fr" ? HUGS_FR : lang === "es" ? HUGS_ES : HUGS;
          await message.reply(`${message.author.displayName}, ${getRandom(list)}`);
          break;
        }

        case "8ball": {
          const lang = parseLanguage(args[0]);
          if (lang !== "en") args.shift();
          const question = args.join(" ");
          if (!question) {
            await message.reply("🎱 Pose-moi une question ! ex. `!8ball Est-ce que ça va bien aller ?`");
          } else {
            const answers = lang === "fr" ? EIGHT_BALL_RESPONSES_FR : lang === "es" ? EIGHT_BALL_RESPONSES_ES : EIGHT_BALL_RESPONSES;
            await message.reply(`🎱 **Question :** ${question}\n**Réponse :** ${getRandom(answers)}`);
          }
          break;
        }

        case "dice":
        case "roll": {
          const faces = parseInt(args[0] ?? "6");
          const nb = isNaN(faces) || faces < 2 ? 6 : Math.min(faces, 1000);
          const result = Math.floor(Math.random() * nb) + 1;
          await message.reply(`🎲 Dé à ${nb} faces — résultat : **${result}** !`);
          break;
        }

        case "conspiracy": {
          if (!openai) { await message.reply("❌ L'IA n'est pas configurée."); break; }
          try {
            const topic = args.join(" ").trim();
            if (isSendable(message.channel)) await message.channel.sendTyping();
            const prompt = topic
              ? `Generate a short, absurd and funny conspiracy theory about: "${topic}". Under 200 words. Be creative, dramatic, ridiculous. Start directly with the theory.`
              : `Generate a short, absurd and funny random conspiracy theory. Under 200 words. Be creative, dramatic, ridiculous. Start directly with the theory.`;
            const response = await openai.chat.completions.create({
              model: "llama-3.1-8b-instant",
              max_completion_tokens: 300,
              messages: [
                { role: "system", content: "You are a dramatic conspiracy theory generator. Always write in the language the user used. If no topic, use French. Be creative, funny, absurd — never harmful." },
                { role: "user", content: prompt },
              ],
            });
            const theory = response.choices[0]?.message?.content ?? "La vérité est trop dangereuse à révéler... 🤫";
            await message.reply(`🕵️ **THÉORIE DÉVOILÉE** 🕵️\n\n${theory}`);
          } catch (err) {
            logger.error({ err }, "Conspiracy error");
            await message.reply("❌ Le gouvernement a bloqué cette théorie. Réessaie !");
          }
          break;
        }

        // ── Mini-games ───────────────────────────────────────────────────────────
        case "minesweeper":
        case "mine": {
          const board = playMinesweeper(message, args[0]?.toLowerCase());
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
            await message.reply("❓ Mode invalide. Utilise `!geo easy`, `!geo medium` ou `!geo hard`.");
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

        // ── Music — Suno AI ───────────────────────────────────────────────────────
        case "music": {
          const sub = args.shift()?.toLowerCase();

          if (sub === "generator") {
            const prompt = args.join(" ").trim();
            if (!prompt) { await message.reply("❌ Donne-moi un prompt ! ex. `!music generator lo-fi hip hop beats chill`"); break; }
            if (!process.env["SUNO_API_KEY"]) { await message.reply("❌ Suno non configuré (SUNO_API_KEY manquant)."); break; }

            const startEmbed = new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle("🎵 Génération en cours…")
              .setDescription(`**Prompt :** ${prompt}`)
              .setFooter({ text: "Suno génère ta piste, environ 30-60 secondes ⏳" });
            const reply = await message.reply({ embeds: [startEmbed] });

            let taskId: string;
            try {
              taskId = await generateSong({ prompt });
            } catch (err) {
              logger.error({ err }, "Suno generate error");
              await reply.edit({ embeds: [new EmbedBuilder().setColor(0xed4245).setTitle("❌ Erreur").setDescription(`Impossible de démarrer : ${String(err)}`)] });
              break;
            }

            const POLL_INTERVAL = 8000;
            const POLL_MAX = 15;
            for (let attempt = 1; attempt <= POLL_MAX; attempt++) {
              await new Promise((r) => setTimeout(r, POLL_INTERVAL));
              let result;
              try { result = await pollSong(taskId); } catch (err) { logger.warn({ err, attempt }, "Suno poll retry"); continue; }

              const st = result.status.toUpperCase();
              if (st === "ERROR" || st === "FAILED" || st === "FAILURE") {
                await reply.edit({ embeds: [new EmbedBuilder().setColor(0xed4245).setTitle("❌ Génération échouée").setDescription("Suno a retourné une erreur. Essaie un autre prompt.").addFields({ name: "Task ID", value: taskId })] });
                break;
              }
              if (result.done && result.clips.length > 0) {
                const embeds = result.clips.filter((c) => c.audio_url).map((clip) => {
                  const e = new EmbedBuilder()
                    .setColor(0x57f287)
                    .setTitle(`🎶 ${clip.title ?? "Piste générée"}`)
                    .setDescription(`**Prompt :** ${clip.prompt ?? prompt}`)
                    .addFields({ name: "🎵 Écouter", value: clip.audio_url! })
                    .setFooter({ text: `Task ID : ${taskId}` })
                    .setTimestamp();
                  if (clip.image_url) e.setThumbnail(clip.image_url);
                  if (clip.duration) e.addFields({ name: "⏱ Durée", value: `${Math.round(clip.duration)}s`, inline: true });
                  if (clip.tags) e.addFields({ name: "🎸 Style", value: clip.tags.slice(0, 100), inline: true });
                  return e;
                });
                if (embeds.length > 0) { await reply.edit({ embeds }); break; }
              }
              await reply.edit({ embeds: [new EmbedBuilder().setColor(0xfee75c).setTitle("🎵 Génération en cours…").setDescription(`**Prompt :** ${prompt}`).addFields({ name: "Statut", value: result.status, inline: true }, { name: "Tentative", value: `${attempt}/${POLL_MAX}`, inline: true }).setFooter({ text: "Suno travaille ⏳" })] });
            }

          } else if (sub === "prompt") {
            const embed = new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle("💡 Exemples de prompts musicaux")
              .setDescription("Copie un prompt et utilise-le avec `!music generator <prompt>`\n\u200b");
            for (const { category, prompt } of MUSIC_PROMPT_EXAMPLES) embed.addFields({ name: category, value: `\`${prompt}\`` });
            embed.setFooter({ text: "💡 Combine plusieurs styles pour des résultats uniques !" });
            await message.reply({ embeds: [embed] });

          } else {
            await message.reply("❓ Commande inconnue. Essaie `!music generator <prompt>` ou `!music prompt`.");
          }
          break;
        }

        case "balance": {
          if (!process.env["SUNO_API_KEY"]) { await message.reply("❌ Suno non configuré (SUNO_API_KEY manquant)."); break; }
          try {
            const credits = await getCredits();
            const embed = new EmbedBuilder()
              .setColor(credits > 10 ? 0x57f287 : credits > 0 ? 0xfee75c : 0xed4245)
              .setTitle("💳 Crédits Suno")
              .addFields({ name: "Crédits restants", value: `${credits}`, inline: true })
              .setFooter({ text: "Chaque génération consomme des crédits sunoapi.org" });
            await message.reply({ embeds: [embed] });
          } catch (err) {
            await message.reply(`❌ Impossible de récupérer les crédits : ${String(err)}`);
          }
          break;
        }

        // ── Voice ────────────────────────────────────────────────────────────────
        case "join": {
          await joinVoice(message);
          break;
        }

        case "leave": {
          await leaveVoice(message);
          break;
        }

        case "voice": {
          const voiceSub = args[0]?.toLowerCase();
          if (voiceSub === "stop") {
            await voiceStop(message);
          } else if (voiceSub === "resume") {
            await voiceResume(message);
          } else if (voiceSub === "say") {
            const text = args.slice(1).join(" ").trim();
            if (!text) { await message.reply("❓ Donne-moi un texte ! ex. `!voice say Bonjour tout le monde`"); break; }
            if (!message.guildId || !isInVoice(message.guildId)) {
              await message.reply("❌ Je ne suis pas dans un salon vocal. Utilise `!join` d'abord.");
              break;
            }
            const ok = await speakText(message.guildId, text, "fr");
            if (!ok) await message.reply("❌ Impossible de parler en ce moment (mode silencieux ?)");
          } else {
            await message.reply("❓ Utilise `!voice say <texte>`, `!voice stop` ou `!voice resume`.");
          }
          break;
        }

        // ── AI Battle ────────────────────────────────────────────────────────────
        case "ai": {
          const subcommand = args.shift()?.toLowerCase();

          if (subcommand === "stop") {
            if (!activeBattles.has(message.channelId)) {
              await message.reply("🤷 Aucune bataille en cours dans ce salon.");
            } else {
              stoppedBattles.add(message.channelId);
              await message.reply("🛑 Arrêt de la bataille après le message en cours...");
            }
            break;
          }

          if (subcommand !== "battle") break;
          if (!openai) { await message.reply("❌ L'IA n'est pas configurée."); break; }
          if (!client2) { await message.reply("❌ Bot 2 non connecté. Ajoute `DISCORD_TOKEN_2` aux secrets."); break; }
          if (!isSendable(message.channel)) break;

          const topic = args.join(" ").trim() || "L'ananas sur la pizza, bonne ou mauvaise idée ?";

          if (activeBattles.has(message.channelId)) {
            await message.reply("⚔️ Une bataille est déjà en cours ! Tape `!ai stop` pour l'arrêter.");
            break;
          }

          activeBattles.add(message.channelId);
          const bot1Name = client.user?.username ?? "Defender";

          runAiBattle(topic, message.channel, openai, bot1Name, client2)
            .catch(async (err) => {
              logger.error({ err }, "AI battle error");
              await message.reply("❌ La bataille a planté !");
            })
            .finally(() => {
              activeBattles.delete(message.channelId);
              stoppedBattles.delete(message.channelId);
            });
          break;
        }

        // ── Credits ──────────────────────────────────────────────────────────────
        case "credits": {
          const embed = new EmbedBuilder()
            .setTitle("✨ Crédits du projet")
            .setColor(0x5865f2)
            .setDescription("Ce bot n'existerait pas sans ces technologies et ces personnes. Merci à tous ! 🙏")
            .addFields(
              { name: "👨‍💻 Créateur", value: "**Maxime** — Conception, développement et idées", inline: false },
              { name: "🤖 Intelligence Artificielle", value: "**Meta LLaMA** — Modèle IA (via Groq)\n**Suno AI** — Génération musicale", inline: false },
              { name: "🔊 Voix & Images", value: "**Google Traduction** — Synthèse vocale (TTS gratuit)\n**HuggingFace / FLUX** — Génération d'images", inline: false },
              { name: "🚀 Infrastructure", value: "**Railway** — Hébergement & déploiement\n**Replit** — Développement & environnement\n**GitHub** — Contrôle de version & collaboration", inline: false },
              { name: "🛠️ Technologies", value: "**discord.js** — API Discord\n**Node.js + TypeScript** — Runtime & langage\n**Express** — Serveur API", inline: false },
            )
            .setFooter({ text: "Fait avec ❤️ par Maxime · !help pour les commandes" })
            .setTimestamp();
          await message.reply({ embeds: [embed] });
          break;
        }

        // ── Help ─────────────────────────────────────────────────────────────────
        case "help":
        case "aide": {
          const lang = args[0]?.toLowerCase();
          const helpLang: HelpLanguage = lang === "fr" ? "fr" : lang === "es" ? "es" : "en";
          await sendPaginatedHelp(message, helpLang);
          break;
        }

        default:
          break;
      }
    } catch (err) {
      logger.error({ err, command }, "Command error");
    }
  });

  client.login(token).catch((err) => {
    logger.error({ err }, "Failed to connect to Discord");
  });
}
