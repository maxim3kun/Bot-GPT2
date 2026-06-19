import { ChannelType, Client, GatewayIntentBits, Partials, Message, EmbedBuilder, MessageReaction, User, ActivityType, GuildMember, ChatInputCommandInteraction, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import os from "os";
import OpenAI from "openai";
import { logger } from "./lib/logger";
import { playMinesweeper, playGeoguessr, playTrivia, stopGeoguessr, isGeoActive, playGuessNumber, playConnect4, playGuessLogo, stopGuessLogo, isLogoActive, startLogoGameFromButton } from "./games";
import { joinVoice, leaveVoice, voiceStop, voiceResume, speakText, isInVoice, toggleSubtitles } from "./discord/voice";
import { playRadio, stopRadio, buildRadioListEmbed, langToPage, playYoutube, nowPlaying, RADIO_STATIONS, searchAndQueue, skipYoutube, getQueueEmbed, onVoiceAloneChange, startVoteSkip, consumePendingVoiceCmd, consumePendingVoiceCmdByUser, pauseToggle, skipCurrentTrack, stopForGuild, buildNpButtonRows, buildRadioNpButtonRows, radioStates, consumePendingSearch, navigateSearch, setActivityCallback, setChannelNameCallback, playLive, nextRadioStation, execSwitchRadioStation, loadCustomStations, addCustomRadio, removeCustomRadio, customStations } from "./discord/radio";
import { addLike, getLikes, removeLike, isLiked } from "./discord/likes-store";
import { startKaraoke, stopKaraoke, isKaraokeActive, setGuildKaraokeSource, getGuildKaraokeSource, setKaraokeOffset } from "./discord/karaoke";
import { addToPlaylist, removePlaylist, listPlaylists, showPlaylist, playPlaylist } from "./discord/playlist";
import { generateSong, pollSong, getCredits } from "./lib/suno-client";
import { handleBirthday, startBirthdayScheduler } from "./discord/birthdays";
import { startQuestSetup, showQuestList, markQuestDone, markAllQuestsDone, showQuestProfile, resetQuests, setBullyMode, startQuestReminders, addQuestWithCoach, setReminderChannel, setSchedule, showQuestStats, getUserQuestData, negotiateQuests } from "./discord/quests";
import { shazam } from "./discord/shazam";
import { registerSlashCommands } from "./discord/slash";
import { getPrefix, setPrefix, resetPrefix } from "./discord/prefix-store";
import { getLang, setLang, GuildLang } from "./discord/lang-store";
import { getUserLang, setUserLang, isValidUserLang, USER_LANG_LABELS, USER_LANG_NAMES } from "./discord/user-lang-store";
import { handleNewCommand } from "./discord/new-commands";
import { handleUnknownCommand, checkCommandBlock, sendBlockedMessage, unblockUser, getBanList, setAdminChannel, getAdminChannelId } from "./discord/command-suggest";
import { getSuggestPref, setSuggestPref } from "./discord/suggest-prefs";
import { getVoicePickerChannels, setVoicePickerChannels } from "./discord/voice-picker-channels";
import { isMongoConnected, getDbStats } from "./lib/db";
import { setBotStats, incrementGroqCalls, getGroqCallCount } from "./lib/bot-stats";
import { getStoreStats, setBrandApproval, addBrandToStore, removeBrandFromStore } from "./discord/logo-brand-store";
import { loadDynamicBrands } from "./discord/logo-brands";
import { startLogoTestingJob, isTestingRunning, getTestingProgress } from "./lib/logo-tester";
import { saveArtist, getMatchingArtists, isKnownArtist } from "./discord/artist-cache";


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
  { category: "🎸 Energetic Rock", prompt: "upbeat rock anthem, electric guitar riffs, powerful drums, energetic chorus" },
  { category: "🌙 Night Vibes", prompt: "dark synthwave, neon lights, midnight drive, 80s retro, pulsing bass" },
  { category: "🎹 Cinematic Piano", prompt: "emotional piano solo, cinematic, melancholic, slow tempo, orchestral strings" },
  { category: "🔥 Trap / Rap", prompt: "hard trap beat, 808 bass, hi-hats, dark melody, aggressive, street" },
  { category: "🌸 J-Pop / Anime", prompt: "anime opening, upbeat J-pop, catchy melody, japanese style, energetic" },
  { category: "🌿 Meditation", prompt: "peaceful meditation music, nature sounds, flute, soft drums, zen atmosphere" },
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

// ── Help system (4 pages) ─────────────────────────────────────────────────────

type HelpLanguage = "en" | "fr" | "es";
type HelpPage = 1 | 2 | 3 | 4;
const HELP_PAGE_REACTIONS = ["⬅️", "➡️"];

function buildHelpEmbed(lang: HelpLanguage, page: HelpPage, prefix = "!"): EmbedBuilder {
  const fr = lang === "fr"; const es = lang === "es";
  const color = fr ? 0x5865f2 : es ? 0xe74c3c : 0x1abc9c;
  const footer = fr ? `Page ${page}/4 — ⬅️ ➡️ pour naviguer`
    : es ? `Página ${page}/4 — ⬅️ ➡️ para navegar`
    : `Page ${page}/4 — ⬅️ ➡️ to navigate`;

  const embed = new EmbedBuilder()
    .setTitle(fr ? "📖 Aide du bot" : es ? "📖 Ayuda del bot" : "📖 Bot Help")
    .setColor(color)
    .setFooter({ text: footer });

  if (page === 1) {
    embed.setDescription(fr ? "Commandes générales et divertissement." : es ? "Comandos generales y diversión." : "General commands and fun.");
    embed.addFields(
      {
        name: fr ? "🌐 Général" : es ? "🌐 General" : "🌐 General",
        value: fr
          ? "`@bot <msg>` 🤖  `!image <desc>` 🎨\n`!say <msg>`  `!hello` 👋\n`!poll <question> | 1 | 2 | … | 9` 📊\n`!profile [@user]` — Fiche Mii style 🎮\n`!language [en|fr|es]` — Changer ta langue (défaut: anglais)"
          : es
          ? "`@bot <msg>` 🤖  `!image <desc>` 🎨\n`!say <msg>`  `!hello` 👋\n`!poll <pregunta> | 1 | 2 | … | 9` 📊\n`!profile [@user]` — Ficha estilo Mii 🎮\n`!language [en|fr|es]` — Cambiar tu idioma (defecto: inglés)"
          : "`@bot <msg>` 🤖  `!image <desc>` 🎨\n`!say <msg>`  `!hello` 👋\n`!poll <question> | 1 | 2 | … | 9` 📊\n`!profile [@user]` — Mii-style profile card 🎮\n`!language [en|fr|es]` — Change your language (default: English)",
      },
      {
        name: fr ? "🎉 Divertissement" : es ? "🎉 Diversión" : "🎉 Fun",
        value: fr
          ? "`!compliment` 💖 / `!joke` 😄\n`!encouragement` 💪 / `!hug` 🤗\n`!8ball <question>` 🎱  `!dice [faces]` 🎲\n`!conspiracy [sujet]` 🕵️\n> Ajoute `fr` ou `es` — ex. `!joke fr`"
          : es
          ? "`!compliment` 💖 / `!joke` 😄\n`!encouragement` 💪 / `!hug` 🤗\n`!8ball <pregunta>` 🎱  `!dice [caras]` 🎲\n`!conspiracy [tema]` 🕵️\n> Añade `fr` o `es` — ej. `!joke es`"
          : "`!compliment` 💖 / `!joke` 😄\n`!encouragement` 💪 / `!hug` 🤗\n`!8ball <question>` 🎱  `!dice [faces]` 🎲\n`!conspiracy [topic]` 🕵️\n> Append `fr` or `es` — e.g. `!joke fr`",
      },
      {
        name: fr ? "Anniversaires" : es ? "Cumpleaños" : "Birthdays",
        value: fr
          ? "`!birthday add <JJ/MM>` — Enregistrer\n`!birthday list` — Voir tous\n`!birthday remove [@user]` — Supprimer\n> `!help anniversaire` pour plus de détails"
          : es
          ? "`!birthday add <DD/MM>` — Registrar\n`!birthday list` — Ver todos\n`!birthday remove [@user]` — Eliminar\n> `!help cumpleanos` para más detalles"
          : "`!birthday add <DD/MM>` — Save your birthday\n`!birthday list` — View all\n`!birthday remove [@user]` — Remove\n> `!help birthday` for details",
      },
    );
  } else if (page === 2) {
    embed.setDescription(fr ? "Mini-jeux et génération musicale." : es ? "Mini-juegos y música." : "Mini-games and music generation.");
    embed.addFields(
      {
        name: fr ? "🎮 Mini-jeux" : es ? "🎮 Juegos" : "🎮 Mini-games",
        value: fr
          ? "`!minesweeper [easy|medium|hard]` 💣\n`!geo [easy|medium|hard]` 🌍 / `!geo stop`\n`!trivia` 🧠 / `!guessnumber` 🎯\n`!connect4 solo` / `!connect4 @user` 🔴🟡 *(réagis 1️⃣–7️⃣)*\n`!guessthelogo [easy|medium|hard]` 🏷️ / `!guessthelogo stop`"
          : es
          ? "`!minesweeper [easy|medium|hard]` 💣\n`!geo [easy|medium|hard]` 🌍 / `!geo stop`\n`!trivia` 🧠 / `!guessnumber` 🎯\n`!connect4 solo` / `!connect4 @user` 🔴🟡 *(reacciona 1️⃣–7️⃣)*\n`!guessthelogo [easy|medium|hard]` 🏷️ / `!guessthelogo stop`"
          : "`!minesweeper [easy|medium|hard]` 💣\n`!geo [easy|medium|hard]` 🌍 / `!geo stop`\n`!trivia` 🧠 / `!guessnumber` 🎯\n`!connect4 solo` / `!connect4 @user` 🔴🟡 *(react 1️⃣–7️⃣)*\n`!guessthelogo [easy|medium|hard]` 🏷️ / `!guessthelogo stop`",
      },
      {
        name: fr ? "🎵 Musique — Suno AI" : es ? "🎵 Música — Suno AI" : "🎵 Music — Suno AI",
        value: fr
          ? "`!music generator <prompt>` — Style, ambiance, paroles 🎶\n`!music prompt` — Exemples de styles 💡\n`!balance` — Crédits Suno restants 💳"
          : es
          ? "`!music generator <prompt>` — Estilo, ambiente, letra 🎶\n`!music prompt` — Ejemplos de estilos 💡\n`!balance` — Créditos Suno restantes 💳"
          : "`!music generator <prompt>` — Style, mood, lyrics 🎶\n`!music prompt` — Style examples 💡\n`!balance` — Remaining Suno credits 💳",
      },
    );
  } else if (page === 3) {
    embed.setDescription(fr ? "Vocal et radio." : es ? "Voz y radio." : "Voice and radio.");
    embed.addFields(
      {
        name: fr ? "🎙️ Vocal — Google TTS" : es ? "🎙️ Voz — Google TTS" : "🎙️ Voice — Google TTS",
        value: fr
          ? "`!join` 🔊 / `!leave` 👋\n`!voice say <texte>` 🗣️\n`!voice stop` / `!voice resume`\n`!subtitles` — 📝 Sous-titres live"
          : es
          ? "`!join` 🔊 / `!leave` 👋\n`!voice say <texto>` 🗣️\n`!voice stop` / `!voice resume`\n`!subtitles` — 📝 Subtítulos en vivo"
          : "`!join` 🔊 / `!leave` 👋\n`!voice say <text>` 🗣️\n`!voice stop` / `!voice resume`\n`!subtitles` — 📝 Live captions",
      },
      {
        name: fr ? "📻 Radio & YouTube" : es ? "📻 Radio & YouTube" : "📻 Radio & YouTube",
        value: fr
          ? "`!radio list` 📋  `!radio <nom>` (ex: `!radio nrj`)\n`!youtube <url>` 🎬  `!np` — En cours\n`!radio leave` — Déconnecter\n`!playlist add <nom> <url>`  `!playlist play <nom>` 🎵"
          : es
          ? "`!radio list` 📋  `!radio <nombre>` (ej: `!radio nrj`)\n`!youtube <url>` 🎬  `!np` — Ahora\n`!radio leave` — Desconectar\n`!playlist add <nombre> <url>`  `!playlist play <nombre>` 🎵"
          : "`!radio list` 📋  `!radio <name>` (e.g. `!radio nrj`)\n`!youtube <url>` 🎬  `!np` — Now playing\n`!radio leave` — Disconnect\n`!playlist add <name> <url>`  `!playlist play <name>` 🎵",
      },
      {
        name: "🎤 Karaoke",
        value: fr
          ? "`!karaoke <artiste chanson>` 🎵 — Paroles synchronisées en live\n`!karaoke stop` — Arrêter le karaoké"
          : es
          ? "`!karaoke <artista canción>` 🎵 — Letra sincronizada en vivo\n`!karaoke stop` — Parar karaoke"
          : "`!karaoke <artist song>` 🎵 — Synced live lyrics\n`!karaoke stop` — Stop karaoke",
      },
    );
  } else {
    embed.setDescription(fr ? "Quêtes, IA avancée et infos." : es ? "Misiones, IA avanzada e info." : "Quests, advanced AI and info.");
    embed.addFields(
      {
        name: fr ? "🎯 Quêtes & Niveaux" : es ? "🎯 Misiones & Niveles" : "🎯 Quests & Levels",
        value: fr
          ? "`!quest start/add/list/done <n>/done all` 🤖\n`!quest profile` · `!quest stats` 📊\n`!quest remind` 📍 · `!quest schedule <h>` ⏰\n`!quest reset` — voir `!help quetes`"
          : es
          ? "`!quest start/add/list/done <n>/done all` 🤖\n`!quest profile` · `!quest stats` 📊\n`!quest remind` 📍 · `!quest schedule <h>` ⏰\n`!quest reset` — ver `!help misiones`"
          : "`!quest start/add/list/done <n>/done all` 🤖\n`!quest profile` · `!quest stats` 📊\n`!quest remind` 📍 · `!quest schedule <h>` ⏰\n`!quest reset` — see `!help quest`",
      },
      {
        name: fr ? "⚔️ Bataille IA" : es ? "⚔️ Batalla IA" : "⚔️ AI Battle",
        value: fr
          ? "`!ai battle <sujet>` 🥊 / `!ai stop`"
          : es
          ? "`!ai battle <tema>` 🥊 / `!ai stop`"
          : "`!ai battle <topic>` 🥊 / `!ai stop`",
      },
      {
        name: fr ? "ℹ️ Info" : es ? "ℹ️ Info" : "ℹ️ Info",
        value: fr
          ? "`!credits` ✨  `!help fr` / `!help es`"
          : es
          ? "`!credits` ✨  `!help fr` / `!help es`"
          : "`!credits` ✨  `!help fr` / `!help es`",
      },
      {
        name: fr ? "🔧 Modérateurs" : es ? "🔧 Moderadores" : "🔧 Moderators",
        value: fr
          ? "`!help admin` — Commandes d'administration\n`!help setup` / `!setup` — Clés API & secrets\n`!server language [en|fr|es]` — Langue du serveur *(admin)*"
          : es
          ? "`!help admin` — Comandos de administración\n`!help setup` / `!setup` — Claves API y secretos\n`!server language [en|fr|es]` — Idioma del servidor *(admin)*"
          : "`!help admin` — Admin commands\n`!help setup` / `!setup` — API keys & secrets\n`!server language [en|fr|es]` — Server language *(admin)*",
      },
    );
  }

  if (prefix !== "!") {
    for (const f of embed.data.fields ?? []) {
      f.value = f.value.replaceAll("`!", `\`${prefix}`);
    }
  }
  return embed;
}

// ── Topic-specific help ───────────────────────────────────────────────────────

type HelpTopic = "general" | "games" | "music" | "radio" | "youtube" | "quest" | "levels" | "voice" | "ai" | "birthday" | "guesslogo";

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function detectTopicAndLang(arg0: string, arg1?: string): { topic: HelpTopic; lang: HelpLanguage } | null {
  const key = stripAccents(arg0.toLowerCase());
  const langOverride: HelpLanguage | null = arg1 === "fr" ? "fr" : arg1 === "es" ? "es" : arg1 === "en" ? "en" : null;
  const map: Record<string, { topic: HelpTopic; lang: HelpLanguage }> = {
    general: { topic: "general", lang: "en" }, fun: { topic: "general", lang: "en" },
    games: { topic: "games", lang: "en" }, jeux: { topic: "games", lang: "fr" }, juegos: { topic: "games", lang: "es" },
    music: { topic: "music", lang: "en" }, musique: { topic: "music", lang: "fr" }, musica: { topic: "music", lang: "es" },
    radio: { topic: "radio", lang: "en" },
    youtube: { topic: "youtube", lang: "en" }, yt: { topic: "youtube", lang: "en" },
    quest: { topic: "quest", lang: "en" }, quete: { topic: "quest", lang: "fr" }, quetes: { topic: "quest", lang: "fr" },
    misiones: { topic: "quest", lang: "es" }, mision: { topic: "quest", lang: "es" },
    levels: { topic: "levels", lang: "en" }, level: { topic: "levels", lang: "en" },
    niveaux: { topic: "levels", lang: "fr" }, niveau: { topic: "levels", lang: "fr" },
    niveles: { topic: "levels", lang: "es" }, nivel: { topic: "levels", lang: "es" },
    voice: { topic: "voice", lang: "en" }, vocal: { topic: "voice", lang: "fr" },
    ai: { topic: "ai", lang: "en" }, ia: { topic: "ai", lang: "en" },
    birthday: { topic: "birthday", lang: "en" }, anniversaire: { topic: "birthday", lang: "fr" }, cumpleanos: { topic: "birthday", lang: "es" },
    guesslogo: { topic: "guesslogo", lang: "en" }, devinelelogo: { topic: "guesslogo", lang: "en" }, guessthelogo: { topic: "guesslogo", lang: "en" },
    logo: { topic: "guesslogo", lang: "en" },
  };
  const match = map[key];
  if (!match) return null;
  return { topic: match.topic, lang: langOverride ?? match.lang };
}

function buildTopicEmbed(topic: HelpTopic, lang: HelpLanguage, prefix = "!"): EmbedBuilder {
  const fr = lang === "fr"; const es = lang === "es";
  const color = fr ? 0x5865f2 : es ? 0xe74c3c : 0x1abc9c;
  const embed = new EmbedBuilder().setColor(color);

  switch (topic) {
    case "general":
      embed.setTitle(fr ? "🌐 Commandes générales" : es ? "🌐 Comandos generales" : "🌐 General Commands");
      embed.addFields(
        { name: fr ? "🌐 Général" : es ? "🌐 General" : "🌐 General",
          value: fr
            ? "`@bot <msg>` 🤖  `!image <desc>` 🎨\n`!say <msg>`  `!hello` / `!bonjour` / `!salut` 👋\n`!poll <question> | opt1 | opt2 | …` 📊"
            : es
            ? "`@bot <msg>` 🤖  `!image <desc>` 🎨\n`!say <msg>`  `!hello` 👋\n`!poll <pregunta> | opt1 | opt2 | …` 📊"
            : "`@bot <msg>` 🤖  `!image <desc>` 🎨\n`!say <msg>`  `!hello` 👋\n`!poll <question> | opt1 | opt2 | …` 📊" },
        { name: fr ? "🎉 Divertissement" : es ? "🎉 Diversión" : "🎉 Fun",
          value: fr
            ? "`!compliment` 💖  `!joke` 😄  `!encouragement` 💪  `!hug` 🤗\n`!8ball <question>` 🎱  `!dice [faces]` 🎲\n`!conspiracy [sujet]` 🕵️\n> Ajoute `fr` ou `es` — ex. `!joke fr`"
            : es
            ? "`!compliment` 💖  `!joke` 😄  `!encouragement` 💪  `!hug` 🤗\n`!8ball <pregunta>` 🎱  `!dice [caras]` 🎲\n`!conspiracy [tema]` 🕵️\n> Añade `fr` o `es` — ej. `!joke es`"
            : "`!compliment` 💖  `!joke` 😄  `!encouragement` 💪  `!hug` 🤗\n`!8ball <question>` 🎱  `!dice [faces]` 🎲\n`!conspiracy [topic]` 🕵️\n> Append `fr` or `es` — e.g. `!joke fr`" },
      ); break;

    case "games":
      embed.setTitle(fr ? "🎮 Mini-jeux" : es ? "🎮 Juegos" : "🎮 Mini-games");
      embed.addFields({ name: fr ? "Commandes" : es ? "Comandos" : "Commands",
        value: fr
          ? "`!minesweeper [easy|medium|hard]` 💣\n`!geo [easy|medium|hard]` 🌍  `!geo stop`\n`!trivia` 🧠  `!guessnumber` 🎯\n`!connect4 solo` / `!connect4 @user` 🔴🟡 *(réagis 1️⃣–7️⃣)*\n`!guessthelogo [easy|medium|hard]` 🏷️  `!guessthelogo stop`"
          : es
          ? "`!minesweeper [easy|medium|hard]` 💣\n`!geo [easy|medium|hard]` 🌍  `!geo stop`\n`!trivia` 🧠  `!guessnumber` 🎯\n`!connect4 solo` / `!connect4 @user` 🔴🟡 *(reacciona 1️⃣–7️⃣)*\n`!guessthelogo [easy|medium|hard]` 🏷️  `!guessthelogo stop`"
          : "`!minesweeper [easy|medium|hard]` 💣\n`!geo [easy|medium|hard]` 🌍  `!geo stop`\n`!trivia` 🧠  `!guessnumber` 🎯\n`!connect4 solo` / `!connect4 @user` 🔴🟡 *(react 1️⃣–7️⃣)*\n`!guessthelogo [easy|medium|hard]` 🏷️  `!guessthelogo stop`",
      }); break;

    case "music":
      embed.setTitle(fr ? "🎵 Musique — Suno AI" : es ? "🎵 Música — Suno AI" : "🎵 Music — Suno AI");
      embed.addFields({ name: fr ? "Commandes" : es ? "Comandos" : "Commands",
        value: fr
          ? "`!music generator <prompt>` — Style, ambiance, paroles 🎶\n`!music prompt` — Exemples de styles 💡\n`!balance` — Crédits Suno restants 💳"
          : es
          ? "`!music generator <prompt>` — Estilo, ambiente, letra 🎶\n`!music prompt` — Ejemplos de estilos 💡\n`!balance` — Créditos Suno restantes 💳"
          : "`!music generator <prompt>` — Style, mood, lyrics 🎶\n`!music prompt` — Style examples 💡\n`!balance` — Remaining Suno credits 💳",
      }); break;

    case "radio":
      embed.setTitle(fr ? "📻 Radio" : es ? "📻 Radio" : "📻 Radio");
      embed.addFields({ name: fr ? "Commandes" : es ? "Comandos" : "Commands",
        value: fr
          ? "`!radio list` — Liste 🇬🇧🇫🇷🇪🇸 · `!radio list fr` → page FR\n`!radio <clé>` — Jouer une station\n`!radio leave` — Déconnecter · `!np` — En cours"
          : es
          ? "`!radio list` — Lista 🇬🇧🇫🇷🇪🇸 · `!radio list es` → página ES\n`!radio <clave>` — Reproducir una estación\n`!radio leave` — Desconectar · `!np` — Ahora"
          : "`!radio list` — Browse 🇬🇧🇫🇷🇪🇸 · `!radio list fr` → FR page\n`!radio <key>` — Play a station\n`!radio leave` — Disconnect · `!np` — Now playing",
      }); break;

    case "youtube":
      embed.setTitle(fr ? "🎬 YouTube & Playlists" : es ? "🎬 YouTube & Listas" : "🎬 YouTube & Playlists");
      embed.addFields({ name: fr ? "Commandes" : es ? "Comandos" : "Commands",
        value: fr
          ? "`!youtube <url>` 🎬 — Jouer une vidéo\n`!np` — En cours\n`!playlist add <nom> <url>` — Créer\n`!playlist play <nom>` — Jouer\n`!playlist list` — Lister\n`!playlist show <nom>` — Détail\n`!playlist remove <nom>` — Supprimer"
          : es
          ? "`!youtube <url>` 🎬 — Reproducir video\n`!np` — Ahora\n`!playlist add <nombre> <url>` — Crear\n`!playlist play <nombre>` — Reproducir\n`!playlist list` — Listar\n`!playlist show <nombre>` — Detalle\n`!playlist remove <nombre>` — Eliminar"
          : "`!youtube <url>` 🎬 — Play a video\n`!np` — Now playing\n`!playlist add <name> <url>` — Create\n`!playlist play <name>` — Play\n`!playlist list` — List all\n`!playlist show <name>` — Details\n`!playlist remove <name>` — Delete",
      }); break;

    case "quest":
      embed.setTitle(fr ? "🎯 Système de Quêtes" : es ? "🎯 Sistema de Misiones" : "🎯 Quest System");
      embed.addFields(
        { name: fr ? "Commandes" : es ? "Comandos" : "Commands",
          value: fr
            ? "`!quest start` — Crée tes quêtes via IA 🤖\n`!quest add <objectif>` — Ajoute une quête (coach IA) ➕\n`!quest list` — Voir tes quêtes\n`!quest done <n>` — Cocher ✅  `!quest done all` — Tout cocher ⚡\n`!quest profile` — Niveau & XP 🏆\n`!quest stats` — Graphique 7 jours 📊\n`!quest remind` — Définir ce salon 📍\n`!quest reset` — Réinitialiser"
            : es
            ? "`!quest start` — Crea misiones con IA 🤖\n`!quest add <objetivo>` — Añade misión (coach IA) ➕\n`!quest list` — Ver misiones\n`!quest done <n>` — Marcar ✅  `!quest done all` — Marcar todas ⚡\n`!quest profile` — Nivel & XP 🏆\n`!quest stats` — Gráfico 7 días 📊\n`!quest remind` — Establecer canal 📍\n`!quest reset` — Reiniciar"
            : "`!quest start` — Create quests via AI 🤖\n`!quest add <goal>` — Add a quest (AI coach) ➕\n`!quest list` — View quests\n`!quest done <n>` — Check off ✅  `!quest done all` — Mark all ⚡\n`!quest profile` — Level & XP 🏆\n`!quest stats` — 7-day chart 📊\n`!quest remind` — Set this channel 📍\n`!quest reset` — Reset all" },
        { name: fr ? "⏰ Rappels" : es ? "⏰ Recordatorios" : "⏰ Reminders",
          value: fr
            ? "Par défaut : **10:00 · 15:00 · 18:00 UTC**\nPersonnalise avec `!quest schedule 8 14 21`\nReset : `!quest schedule reset`"
            : es
            ? "Por defecto: **10:00 · 15:00 · 18:00 UTC**\nPersonaliza con `!quest schedule 8 14 21`\nReset: `!quest schedule reset`"
            : "Default: **10:00 · 15:00 · 18:00 UTC**\nCustomize: `!quest schedule 8 14 21`\nReset: `!quest schedule reset`" },
      ); break;

    case "levels": {
      embed.setTitle(fr ? "🏆 Système de Niveaux" : es ? "🏆 Sistema de Niveles" : "🏆 Level System");
      const levelsTable = [
        { level: 1, threshold: 0,     title: "🌱 Novice" },
        { level: 2, threshold: 100,   title: "⚡ Apprentice" },
        { level: 3, threshold: 250,   title: "🔥 Adventurer" },
        { level: 4, threshold: 500,   title: "⚔️ Warrior" },
        { level: 5, threshold: 1000,  title: "🏆 Champion" },
        { level: 6, threshold: 2000,  title: "💎 Master" },
        { level: 7, threshold: 3500,  title: "🌟 Expert" },
        { level: 8, threshold: 6000,  title: "👑 Legend" },
        { level: 9, threshold: 10000, title: "🌌 Transcendent" },
      ];
      embed.addFields(
        { name: fr ? "Niveaux disponibles" : es ? "Niveles disponibles" : "Available levels",
          value: levelsTable.map(l => `**Lv.${l.level}** ${l.title} — ${l.threshold === 0 ? "0" : l.threshold} XP`).join("\n") },
        { name: fr ? "Gagner de l'XP" : es ? "Ganar XP" : "Earning XP",
          value: fr
            ? "• Quête facile : 15–25 XP\n• Quête moyenne : 30–50 XP\n• Quête difficile : 60–100 XP\n> `!quest profile` — voir ta progression"
            : es
            ? "• Misión fácil: 15–25 XP\n• Misión media: 30–50 XP\n• Misión difícil: 60–100 XP\n> `!quest profile` — ver progreso"
            : "• Easy quest: 15–25 XP\n• Medium quest: 30–50 XP\n• Hard quest: 60–100 XP\n> `!quest profile` — see your progress" },
      ); break;
    }

    case "voice":
      embed.setTitle(fr ? "🎙️ Vocal — Google TTS" : es ? "🎙️ Voz — Google TTS" : "🎙️ Voice — Google TTS");
      embed.addFields({ name: fr ? "Commandes" : es ? "Comandos" : "Commands",
        value: fr
          ? "`!join` 🔊 — Rejoindre le salon vocal\n`!leave` 👋 — Quitter\n`!voice say <texte>` 🗣️ — Synthèse vocale\n`!voice stop` — Mode sous-titres uniquement\n`!voice resume` — Mode vocal complet\n`!subtitles` 📝 — Activer/désactiver sous-titres"
          : es
          ? "`!join` 🔊 — Unirse al canal de voz\n`!leave` 👋 — Salir\n`!voice say <texto>` 🗣️ — Síntesis de voz\n`!voice stop` — Solo subtítulos\n`!voice resume` — Modo vocal completo\n`!subtitles` 📝 — Activar/desactivar subtítulos"
          : "`!join` 🔊 — Join voice channel\n`!leave` 👋 — Leave\n`!voice say <text>` 🗣️ — Text-to-speech\n`!voice stop` — Captions-only mode\n`!voice resume` — Full voice mode\n`!subtitles` 📝 — Toggle live captions",
      }); break;

    case "birthday":
      embed.setTitle(fr ? "Anniversaires" : es ? "Cumpleaños" : "Birthdays");
      embed.addFields(
        { name: fr ? "Commandes" : es ? "Comandos" : "Commands",
          value: fr
            ? "`!birthday add <JJ/MM>` — Enregistre ton anniversaire\n`!birthday list` — Voir tous les anniversaires\n`!birthday remove [@user]` — Supprimer un anniversaire"
            : es
            ? "`!birthday add <DD/MM>` — Registra tu cumpleaños\n`!birthday list` — Ver todos los cumpleaños\n`!birthday remove [@user]` — Eliminar un cumpleaños"
            : "`!birthday add <DD/MM>` — Save your birthday\n`!birthday list` — View all birthdays\n`!birthday remove [@user]` — Remove a birthday" },
        { name: fr ? "Alias" : es ? "Alias" : "Aliases",
          value: "`!anniversaire` · `!b`" },
      ); break;

    case "guesslogo":
      embed.setTitle("🏷️ Guess the Logo — Moderator Guide");
      embed.setColor(0x5865f2);
      embed.addFields(
        {
          name: "🎮 Player Commands",
          value: [
            "`!guessthelogo` — Start a game (easy by default)",
            "`!guessthelogo easy` — 🟢 World-famous brands • 3 hints • 90s",
            "`!guessthelogo medium` — 🟡 Well-known brands • 2 hints • 60s",
            "`!guessthelogo hard` — 🔴 All brands • 0 hints • 45s",
            "`!guessthelogo stop` — Abandon the current game",
            "",
            "Aliases: `!guesslogo` · `!devinelelogo`",
          ].join("\n"),
        },
        {
          name: "📊 Difficulty & Popularity",
          value: [
            "**🟢 Easy** → Tier 1 only — iconic global logos (Nike, Apple, McDonald's…)",
            "**🟡 Medium** → Tier 1 + 2 — brands known to the general public",
            "**🔴 Hard** → All tiers — includes lesser-known brands, no hints",
          ].join("\n"),
        },
        {
          name: "🛠️ Admin Commands (Manage Server required)",
          value: [
            "`!logo stats` — Logo pool statistics",
            "`!logo add <domain> <name> [tier 1-3] [category] [country] [hints…]` — Add a brand",
            "`!logo remove <domain>` — Remove a brand",
            "`!logo approve <domain>` — Manually approve a logo",
            "`!logo exclude <domain>` — Exclude a logo (text-only)",
            "`!logo fetch <count>` — Auto-fetch logos from logo.dev API (with OCR validation)",
            "`!logo test start` — Test untested logos via OCR",
            "`!logo test all` — Re-test all logos",
            "`!logo test status` — Status of the current test run",
          ].join("\n"),
        },
        {
          name: "ℹ️ How the pool works",
          value: "Brands are picked **randomly** from the pool based on the difficulty tier. Recently played logos are excluded to avoid repetition. Add brands via `!logo add` or auto-fetch via `!logo fetch` to grow the game.",
        },
      );
      embed.setFooter({ text: "🔒 Visible to moderators only (Manage Server)" });
      break;

    case "ai":
      embed.setTitle(fr ? "🤖 IA & Avancé" : es ? "🤖 IA & Avanzado" : "🤖 AI & Advanced");
      embed.addFields(
        { name: fr ? "Chat IA" : es ? "Chat IA" : "AI Chat",
          value: fr
            ? "`@bot <message>` — Chat IA (fonctionne aussi en DM)\n`/image <description>` — Génère une image (HuggingFace)"
            : es
            ? "`@bot <mensaje>` — Chat IA (también en DM)\n`/image <descripción>` — Genera imagen (HuggingFace)"
            : "`@bot <message>` — AI chat (works in DMs too)\n`/image <description>` — Generate image (HuggingFace)" },
        { name: fr ? "⚔️ Bataille IA" : es ? "⚔️ Batalla IA" : "⚔️ AI Battle",
          value: fr
            ? "`!ai battle <sujet>` 🥊 — Débat entre deux bots IA\n`!ai stop` — Arrêter le débat"
            : es
            ? "`!ai battle <tema>` 🥊 — Debate entre dos bots IA\n`!ai stop` — Detener el debate"
            : "`!ai battle <topic>` 🥊 — Debate between two AI bots\n`!ai stop` — Stop the debate" },
        { name: fr ? "🎭 Fun IA" : es ? "🎭 Fun IA" : "🎭 AI Fun",
          value: fr
            ? "`!conspiracy [sujet]` 🕵️ — Théorie du complot IA\n`!trivia` 🧠 — Quiz culture générale IA"
            : es
            ? "`!conspiracy [tema]` 🕵️ — Teoría de conspiración IA\n`!trivia` 🧠 — Quiz cultura general IA"
            : "`!conspiracy [topic]` 🕵️ — AI conspiracy theory\n`!trivia` 🧠 — AI general knowledge quiz" },
      ); break;
  }
  if (prefix !== "!") {
    for (const f of embed.data.fields ?? []) {
      f.value = f.value.replaceAll("`!", `\`${prefix}`);
    }
  }
  return embed;
}

async function sendPaginatedHelp(message: Message, lang: HelpLanguage) {
  const pfx = getPrefix(message.guildId);
  let page: HelpPage = 1;
  const helpMessage = await message.reply({ embeds: [buildHelpEmbed(lang, page, pfx)] });

  for (const emoji of HELP_PAGE_REACTIONS) await helpMessage.react(emoji).catch(() => null);

  const filter = (reaction: MessageReaction, user: User) =>
    HELP_PAGE_REACTIONS.includes(reaction.emoji.name ?? "") && !user.bot && user.id === message.author.id;

  const collector = helpMessage.createReactionCollector({ filter, idle: 10 * 60 * 1000 });

  collector.on("collect", async (reaction, user) => {
    const emoji = reaction.emoji.name;
    if (emoji === "➡️") page = (page === 4 ? 1 : (page + 1)) as HelpPage;
    if (emoji === "⬅️") page = (page === 1 ? 4 : (page - 1)) as HelpPage;
    await helpMessage.edit({ embeds: [buildHelpEmbed(lang, page, pfx)] });
    await reaction.users.remove(user.id).catch(() => null);
  });

  collector.on("end", async () => {
    const expiredLabel = lang === "fr" ? "Aide expirée" : lang === "es" ? "Ayuda expirada" : "Help Expired";
    const expiredFooter = lang === "fr" ? `Page ${page}/4 — ${expiredLabel} · Relance \`${pfx}help\` pour naviguer`
      : lang === "es" ? `Página ${page}/4 — ${expiredLabel} · Usa \`${pfx}help\` de nuevo para navegar`
      : `Page ${page}/4 — ${expiredLabel} · Run \`${pfx}help\` again to navigate`;
    const expiredEmbed = buildHelpEmbed(lang, page, pfx).setFooter({ text: expiredFooter });
    await helpMessage.edit({ embeds: [expiredEmbed] }).catch(() => null);
    await helpMessage.reactions.removeAll().catch(() => null);
  });
}

async function sendPaginatedHelpSlash(interaction: ChatInputCommandInteraction, lang: HelpLanguage) {
  const pfx = getPrefix(interaction.guildId);
  let page: HelpPage = 1;
  await interaction.editReply({ embeds: [buildHelpEmbed(lang, page, pfx)] });
  const helpMessage = await interaction.fetchReply();

  for (const emoji of HELP_PAGE_REACTIONS) await helpMessage.react(emoji).catch(() => null);

  const filter = (reaction: MessageReaction, user: User) =>
    HELP_PAGE_REACTIONS.includes(reaction.emoji.name ?? "") && !user.bot && user.id === interaction.user.id;

  const collector = helpMessage.createReactionCollector({ filter, idle: 10 * 60 * 1000 });

  collector.on("collect", async (reaction, user) => {
    if (reaction.emoji.name === "➡️") page = (page === 4 ? 1 : (page + 1)) as HelpPage;
    if (reaction.emoji.name === "⬅️") page = (page === 1 ? 4 : (page - 1)) as HelpPage;
    await interaction.editReply({ embeds: [buildHelpEmbed(lang, page, pfx)] });
    await reaction.users.remove(user.id).catch(() => null);
  });

  collector.on("end", async () => {
    const expiredLabel = lang === "fr" ? "Aide expirée" : lang === "es" ? "Ayuda expirada" : "Help Expired";
    const expiredFooter = lang === "fr" ? `Page ${page}/4 — ${expiredLabel} · Relance \`/help\` pour naviguer`
      : lang === "es" ? `Página ${page}/4 — ${expiredLabel} · Usa \`/help\` de nuevo para navegar`
      : `Page ${page}/4 — ${expiredLabel} · Run \`/help\` again to navigate`;
    const expiredEmbed = buildHelpEmbed(lang, page, pfx).setFooter({ text: expiredFooter });
    await interaction.editReply({ embeds: [expiredEmbed] }).catch(() => null);
    await helpMessage.reactions.removeAll().catch(() => null);
  });
}

// ── Setup guide (API keys) ────────────────────────────────────────────────────

async function sendSetupGuide(message: Message): Promise<void> {
  const isMod = message.member?.permissions.has(PermissionFlagsBits.ManageGuild)
    || message.member?.permissions.has(PermissionFlagsBits.Administrator);
  if (!isMod) {
    await message.reply("🔒 This command is for moderators only.");
    return;
  }
  const setupEmbed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🔧 Bot Setup — API Keys & Secrets")
    .setDescription(
      "Add the following **secrets** in your Replit project to unlock each feature.\n" +
      "Go to **Replit → Secrets** (the 🔒 lock icon in the left sidebar), then click **+ New Secret**.\n\u200b"
    )
    .addFields(
      {
        name: "🤖 `DISCORD_TOKEN`",
        value: "**Required** — Main bot token.\nGet it at **discord.com/developers/applications** → Your App → Bot → Reset Token.",
        inline: false,
      },
      {
        name: "🧠 `GROQ_API_KEY`",
        value: "Enables AI features: `@mention` chat, DMs, `!conspiracy`, `!trivia`, `!ai battle`, voice AI.\nGet it **free** at **console.groq.com** → API Keys.",
        inline: false,
      },
      {
        name: "🎵 `SUNO_API_KEY`",
        value: "Enables `!music generator` and `!credits`.\nGet it at **sunoapi.org** → API Key.",
        inline: false,
      },
      {
        name: "🖼️ `HUGGINGFACE_TOKEN`",
        value: "Enables `!image` and `/image` (AI image generation).\nGet it **free** at **huggingface.co/settings/tokens** → New Token (Read).",
        inline: false,
      },
      {
        name: "🎤 `AUDD_API_KEY`",
        value: "Enables `!shazam` song identification.\nGet it **free** at **audd.io** → sign up → copy your API token.",
        inline: false,
      },
      {
        name: "🤖2️ `DISCORD_TOKEN_2`",
        value: "Enables `!ai battle` (requires a second Discord bot).\nCreate a second app at **discord.com/developers/applications**, add a bot, and copy its token.",
        inline: false,
      },
    )
    .setFooter({ text: "⚠️ Never share these tokens publicly — always store them in Replit Secrets, never in code." });

  try {
    await message.author.send({ embeds: [setupEmbed] });
    await message.reply("📬 Setup guide sent to your DMs!");
  } catch {
    await message.reply({ content: "📖 Here's the setup guide (could not DM — check your DM settings):", embeds: [setupEmbed] });
  }
}

// ── Admin commands guide ──────────────────────────────────────────────────────

async function sendAdminGuide(message: Message, guildPrefix: string): Promise<void> {
  const isMod = message.member?.permissions.has(PermissionFlagsBits.ManageGuild)
    || message.member?.permissions.has(PermissionFlagsBits.Administrator);
  if (!isMod) {
    await message.reply("🔒 This command is for moderators only.");
    return;
  }
  const adminEmbed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("⚙️ Admin Commands")
    .setDescription("Commands only available to members with **Manage Server** or **Administrator** permission.\n\u200b")
    .addFields(
      {
        name: "🔤 Prefix",
        value:
          `\`${guildPrefix}prefix <new>\` — Change the bot prefix for this server *(max 3 chars)*\n` +
          `\`${guildPrefix}prefix reset\` — Restore the default \`!\` prefix`,
        inline: false,
      },
      {
        name: "🔊 Voice channel picker",
        value:
          `\`${guildPrefix}voicechannels #ch1 #ch2\` — Set the 2 voice channels shown when a user isn't in voice\n` +
          `\`${guildPrefix}voicechannels reset\` — Restore default (first 2 voice channels of the server)`,
        inline: false,
      },
      {
        name: "🎂 Birthdays",
        value:
          `\`${guildPrefix}birthday channel #channel\` — Set the channel for birthday announcements\n` +
          `\`${guildPrefix}birthday channel reset\` — Remove the birthday announcement channel`,
        inline: false,
      },
      {
        name: "🚨 Alert channel",
        value:
          `\`${guildPrefix}admin channel #channel\` — Set the channel for anti-troll alerts\n` +
          `\`${guildPrefix}admin channel reset\` — Remove the alert channel`,
        inline: false,
      },
      {
        name: "🛡️ Anti-troll",
        value:
          `\`${guildPrefix}unblock @user\` — Lift any bot restriction on a user\n` +
          `\`${guildPrefix}banlist\` — View all users flagged by the anti-troll system\n\n` +
          "**Escalation:** warning → 3min block → 12h block → 2h full lockout → permanent ban\n" +
          "Use `!unblock @user` to release anyone at any stage.",
        inline: false,
      },
      {
        name: "ℹ️ More info",
        value: `\`${guildPrefix}help setup\` — API keys & secrets setup guide`,
        inline: false,
      },
    )
    .setFooter({ text: "Use !help setup to configure API keys and unlock features." });

  await message.reply({ embeds: [adminEmbed] });
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
    `🔵 **${bot1Name}** argues **FOR**\n` +
    `🔴 **${bot2Name}** argues **AGAINST**\n\n` +
    `3 rounds — one message every ~40s. Type \`!ai stop\` to end. 🥊`,
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

    incrementGroqCalls();
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

    incrementGroqCalls();
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

  incrementGroqCalls();
  const verdict = verdictResponse.choices[0]?.message?.content ?? "It's a tie!";
  await sleep(2000);
  await channel.send(`🏆 **VERDICT** 🏆\n\n${verdict}`);
}

// ── Bot entry point ───────────────────────────────────────────────────────────

// ── Website viewer helpers ────────────────────────────────────────────────────

const WEBSITE_URL = "https://stable-flow-7r48.pagedrop.io/";
const WEBSITE_SECTIONS = [
  { label: "Top",    emoji: "🔝", scrollTo: 0    },
  { label: "Middle", emoji: "📄", scrollTo: 700  },
  { label: "Bottom", emoji: "⬇️", scrollTo: 1400 },
];

function buildWebsiteMessage(sectionIndex: number) {
  const section = WEBSITE_SECTIONS[sectionIndex]!;
  const scrollParam = section.scrollTo > 0 ? `&screenshot.scrollTo=${section.scrollTo}` : "";
  const screenshotUrl = `https://api.microlink.io/?url=${encodeURIComponent(WEBSITE_URL)}&screenshot=true&meta=false${scrollParam}&embed=screenshot.url`;

  const embed = new EmbedBuilder()
    .setTitle(`🌐 MaximeGPT.com — ${section.emoji} ${section.label}`)
    .setURL(WEBSITE_URL)
    .setDescription(`Page ${sectionIndex + 1} / ${WEBSITE_SECTIONS.length} — Use the buttons below to scroll.`)
    .setImage(screenshotUrl)
    .setColor(0x5865f2)
    .setFooter({ text: "Made with ❤️ by Maxime • www.maximeGPT.com" });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`website_goto_${sectionIndex - 1}`)
      .setLabel("↑ Scroll Up")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(sectionIndex === 0),
    new ButtonBuilder()
      .setLabel("🌐 Open Site")
      .setStyle(ButtonStyle.Link)
      .setURL(WEBSITE_URL),
    new ButtonBuilder()
      .setCustomId(`website_goto_${sectionIndex + 1}`)
      .setLabel("↓ Scroll Down")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(sectionIndex === WEBSITE_SECTIONS.length - 1),
  );

  return { embeds: [embed], components: [row] };
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

  if (!openai) logger.warn("GROQ_API_KEY not set — AI features disabled");

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction],
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

    // Update bot presence when a song starts/stops in any guild
    setActivityCallback((title) => {
      if (title) {
        client.user?.setActivity(title, { type: ActivityType.Listening });
      } else {
        client.user?.setActivity("!help · !music · !join", { type: ActivityType.Listening });
      }
    });

    // Set voice channel status (the text shown under the channel name in the sidebar)
    setChannelNameCallback((guildId, title) => {
      try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;
        const channelId = guild.members.me?.voice.channelId;
        if (!channelId) return;
        const status = title ? `🎵 ${title}` : "";
        client.rest.put(`/channels/${channelId}/voice-status`, { body: { status } }).catch(() => null);
      } catch {
        // Missing permissions or rate limit — ignore silently
      }
    });

  });

  // ── Voice state — auto-disconnect when bot is alone ──────────────────────────

  client.on("voiceStateUpdate", async (oldState, newState) => {
    const guildId = oldState.guild.id;
    const botId = client.user?.id;
    if (!botId) return;

    // ── Auto-run pending command when a user joins a voice channel ──────────────
    const userId = newState.member?.user?.id;
    const justJoined = !oldState.channelId && !!newState.channelId;
    const switchedChannel = !!oldState.channelId && !!newState.channelId && oldState.channelId !== newState.channelId;
    if (userId && userId !== botId && (justJoined || switchedChannel)) {
      const fn = consumePendingVoiceCmdByUser(userId);
      if (fn) {
        await fn().catch((err) => logger.error({ err }, "voiceStateUpdate auto-run error"));
      }
    }

    // ── Disconnect bot when left alone ─────────────────────────────────────────
    const botVoiceState = oldState.guild.members.cache.get(botId)?.voice;
    const botChannelId = botVoiceState?.channelId;
    if (!botChannelId) return;
    if (oldState.channelId !== botChannelId && newState.channelId !== botChannelId) return;
    const botChannel = botVoiceState.channel;
    if (!botChannel) return;
    const humanCount = botChannel.members.filter((m) => !m.user.bot).size;
    onVoiceAloneChange(guildId, humanCount === 0);
  });

  // ── Autocomplete handler ─────────────────────────────────────────────────────
  // Lazy play-dl loader (separate instance from radio's, used only for autocomplete)
  let _acPlay: typeof import("play-dl") | null = null;
  const getAcPlay = async (): Promise<typeof import("play-dl")> => {
    if (!_acPlay) _acPlay = await import("play-dl") as typeof import("play-dl");
    return _acPlay;
  };

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isAutocomplete()) return;
    if (interaction.commandName !== "youtube") return;

    const focused = interaction.options.getFocused(true);
    try {
      if (focused.name === "artist") {
        const query = focused.value.trim();
        if (!query) { await interaction.respond([]); return; }

        // 1. Pull from local artist cache
        const cached = getMatchingArtists(query, 15).map(a => ({ name: a, value: a }));
        if (cached.length >= 20) { await interaction.respond(cached.slice(0, 25)); return; }

        // 2. Supplement with YouTube channel names via play-dl
        try {
          const play = await getAcPlay();
          const results = await Promise.race([
            play.search(query, { source: { youtube: "video" }, limit: 10 }),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 2400)),
          ]);
          const channels = [
            ...new Set(
              (results as any[])
                .map((r: any) => (r.channel?.name as string | undefined)?.replace(/\s*-?\s*(Topic|VEVO|Official.*$)/i, "").trim())
                .filter((n): n is string => !!n && n.toLowerCase().includes(query.toLowerCase())),
            ),
          ].map(n => n.replace(/\b\w/g, c => c.toUpperCase()));

          const all = [...cached];
          for (const ch of channels) {
            if (!all.find(a => a.value.toLowerCase() === ch.toLowerCase())) all.push({ name: ch, value: ch });
          }
          await interaction.respond(all.slice(0, 25));
        } catch {
          await interaction.respond(cached.slice(0, 25));
        }
        return;
      }

      if (focused.name === "song") {
        const artist = interaction.options.getString("artist") ?? "";
        const partial = focused.value.trim();
        const searchQ = [artist, partial].filter(Boolean).join(" ");
        if (!searchQ) { await interaction.respond([]); return; }
        try {
          const play = await getAcPlay();
          const results = await Promise.race([
            play.search(searchQ, { source: { youtube: "video" }, limit: 8 }),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 2400)),
          ]);
          const choices = (results as any[])
            .filter((r: any) => r?.url && r?.title)
            .map((r: any) => ({ name: (r.title as string).slice(0, 100), value: r.url as string }))
            .slice(0, 25);
          await interaction.respond(choices);
        } catch {
          await interaction.respond([]);
        }
        return;
      }

      await interaction.respond([]);
    } catch {
      await interaction.respond([]).catch(() => null);
    }
  });

  // ── Slash command handler ─────────────────────────────────────────────────────

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    try {
      await interaction.deferReply();

      // Fetch full GuildMember for voice-state access
      const member = interaction.member instanceof GuildMember
        ? interaction.member
        : interaction.guild
          ? await interaction.guild.members.fetch(interaction.user.id).catch(() => null)
          : null;

      // Minimal Message adapter so existing functions can be reused unchanged
      const fakeMsg = {
        guildId:   interaction.guildId,
        channelId: interaction.channelId,
        channel:   interaction.channel,
        author: {
          id:          interaction.user.id,
          displayName: interaction.user.displayName,
          username:    interaction.user.username,
          bot:         false,
        },
        member,
        content: "",
        reply:   (content: unknown) => interaction.editReply(content as Parameters<typeof interaction.editReply>[0]),
        delete:  () => Promise.resolve(),
        react:   () => Promise.resolve(null),
      } as unknown as Message;

      switch (interaction.commandName) {

        case "help": {
          const lang = (interaction.options.getString("lang") ?? "en") as HelpLanguage;
          await sendPaginatedHelpSlash(interaction, lang);
          break;
        }

        case "radio": {
          const station = interaction.options.getString("station")?.toLowerCase();
          if (!station) {
            await interaction.editReply({ embeds: [buildRadioListEmbed(1)] });
          } else {
            await playRadio(fakeMsg, station);
          }
          break;
        }

        case "karaoke": {
          if (!interaction.guildId) { await interaction.editReply("❌ This command only works in a server."); break; }
          const query = interaction.options.getString("song", true);
          await startKaraoke(fakeMsg, query);
          break;
        }

        case "music": {
          const prompt = interaction.options.getString("prompt", true);
          if (!process.env["SUNO_API_KEY"]) { await interaction.editReply("❌ Music generation is not configured. Ask a moderator to set it up — use `!mode d'emploi` for instructions."); break; }

          const startEmbed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle("🎵 Generating your track…")
            .setDescription(`**Prompt:** ${prompt}`)
            .setFooter({ text: "Suno is generating your track, around 30-60 seconds ⏳" });
          await interaction.editReply({ embeds: [startEmbed] });

          let taskId: string;
          try {
            taskId = await generateSong({ prompt });
          } catch (err) {
            logger.error({ err }, "Suno /music error");
            await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xed4245).setTitle("❌ Error").setDescription(`Failed to start: ${String(err)}`)] });
            break;
          }

          const SL_POLL_INTERVAL = 8000;
          const SL_POLL_MAX = 15;
          for (let attempt = 1; attempt <= SL_POLL_MAX; attempt++) {
            await new Promise((r) => setTimeout(r, SL_POLL_INTERVAL));
            let result;
            try { result = await pollSong(taskId); } catch (err) { logger.warn({ err, attempt }, "Suno poll retry"); continue; }
            const st = result.status.toUpperCase();
            if (st === "ERROR" || st === "FAILED" || st === "FAILURE") {
              await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xed4245).setTitle("❌ Generation Failed").setDescription("Suno returned an error. Try a different prompt.")] });
              break;
            }
            if (result.done && result.clips.length > 0) {
              const embeds = result.clips.filter((c) => c.audio_url).map((clip) => {
                const e = new EmbedBuilder()
                  .setColor(0x57f287)
                  .setTitle(`🎶 ${clip.title ?? "Generated Track"}`)
                  .setDescription(`**Prompt:** ${clip.prompt ?? prompt}`)
                  .addFields({ name: "🎵 Listen", value: clip.audio_url! })
                  .setFooter({ text: `Task ID: ${taskId}` });
                if (clip.image_url) e.setThumbnail(clip.image_url);
                if (clip.duration) e.addFields({ name: "⏱ Duration", value: `${Math.round(clip.duration)}s`, inline: true });
                if (clip.tags) e.addFields({ name: "🎸 Style", value: clip.tags.slice(0, 100), inline: true });
                return e;
              });
              if (embeds.length > 0) { await interaction.editReply({ embeds }); break; }
            }
            await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xfee75c).setTitle("🎵 Generating…").setDescription(`**Prompt:** ${prompt}`).addFields({ name: "Status", value: result.status, inline: true }, { name: "Attempt", value: `${attempt}/${SL_POLL_MAX}`, inline: true }).setFooter({ text: "Suno is working on it ⏳" })] });
          }
          break;
        }

        case "image": {
          const desc = interaction.options.getString("description", true);
          const hfToken = process.env["HUGGINGFACE_TOKEN"];
          if (!hfToken) { await interaction.editReply("❌ Image generation is not configured. Ask a moderator to set it up — use `!mode d'emploi` for instructions."); break; }
          await interaction.editReply("🎨 Generating your image, please wait a few seconds...");
          try {
            const response = await fetch(
              "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
              { method: "POST", headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ inputs: desc }) },
            );
            if (!response.ok) { logger.error({ status: response.status }, "HuggingFace image error"); await interaction.editReply("❌ Generation failed. Try again later!"); break; }
            const buffer = Buffer.from(await response.arrayBuffer());
            await interaction.editReply({ content: `🖼️ **${desc}**`, files: [{ attachment: buffer, name: "image.png" }] });
          } catch (err) {
            logger.error({ err }, "/image error");
            await interaction.editReply("❌ Error during image generation. Try again!");
          }
          break;
        }

        case "quest": {
          const action = interaction.options.getString("action") ?? "start";
          if      (action === "list")    await showQuestList(fakeMsg);
          else if (action === "profile") await showQuestProfile(fakeMsg);
          else if (action === "stats")   await showQuestStats(fakeMsg);
          else if (action === "reset")   await resetQuests(fakeMsg);
          else                           await startQuestSetup(fakeMsg, openai);
          break;
        }

        case "shazam": {
          await shazam(fakeMsg);
          break;
        }

        case "youtube": {
          if (!interaction.guildId) { await interaction.editReply("❌ This command only works in a server."); break; }
          const artist  = interaction.options.getString("artist", true);
          const songVal = interaction.options.getString("song", true);
          // songVal is a YouTube URL when the user picked from autocomplete, or free text otherwise
          if (songVal.startsWith("http://") || songVal.startsWith("https://")) {
            await playYoutube(fakeMsg, songVal);
          } else {
            await searchAndQueue(fakeMsg, `${artist} ${songVal}`.trim());
          }
          break;
        }

        case "play": {
          if (!interaction.guildId) { await interaction.editReply("❌ This command only works in a server."); break; }
          const q = interaction.options.getString("query", true);
          if (q.startsWith("http://") || q.startsWith("https://")) {
            await playYoutube(fakeMsg, q);
          } else {
            await searchAndQueue(fakeMsg, q);
          }
          break;
        }

        case "say": {
          const text = interaction.options.getString("text", true);
          if (interaction.channel && "send" in interaction.channel) {
            await (interaction.channel as import("discord.js").TextChannel).send(text);
            await interaction.deleteReply().catch(() => null);
          } else {
            await interaction.editReply(text);
          }
          break;
        }

        case "np": {
          if (!interaction.guildId) { await interaction.editReply("❌ This command only works in a server."); break; }
          const npEmbed = nowPlaying(interaction.guildId);
          if (!npEmbed) { await interaction.editReply("❌ Nothing is playing right now."); break; }
          await interaction.editReply({ embeds: [npEmbed] });
          break;
        }

        case "skip": {
          if (!interaction.guildId) { await interaction.editReply("❌ This command only works in a server."); break; }
          const skipped = skipCurrentTrack(interaction.guildId);
          if (!skipped) { await interaction.editReply("❌ Nothing is playing right now."); break; }
          await interaction.editReply(`⏭️ Skipped **${skipped}**.`);
          break;
        }

        case "stop": {
          if (!interaction.guildId) { await interaction.editReply("❌ This command only works in a server."); break; }
          const stopped = stopForGuild(interaction.guildId);
          if (!stopped) { await interaction.editReply("❌ Nothing is playing right now."); break; }
          await interaction.editReply("⏹️ Stopped and disconnected.");
          break;
        }

        case "join": {
          await joinVoice(fakeMsg);
          break;
        }

        case "leave": {
          if (!interaction.guildId) { await interaction.editReply("❌ This command only works in a server."); break; }
          await leaveVoice(fakeMsg);
          break;
        }

        case "queue": {
          if (!interaction.guildId) { await interaction.editReply("❌ This command only works in a server."); break; }
          const qEmbed = getQueueEmbed(interaction.guildId);
          if (!qEmbed) { await interaction.editReply("📭 The queue is empty."); break; }
          await interaction.editReply({ embeds: [qEmbed] });
          break;
        }

        case "joke": {
          const jokeLang = (interaction.options.getString("lang") ?? "en") as "en" | "fr" | "es";
          const jokeList = jokeLang === "fr" ? JOKES_FR : jokeLang === "es" ? JOKES_ES : JOKES;
          await interaction.editReply(getRandom(jokeList));
          break;
        }

        case "roll": {
          const faces = interaction.options.getInteger("faces") ?? 6;
          const rollResult = Math.floor(Math.random() * faces) + 1;
          await interaction.editReply(`🎲 You rolled a **${faces}**-sided die and got: **${rollResult}**!`);
          break;
        }

        case "8ball": {
          const question = interaction.options.getString("question", true);
          await interaction.editReply(`🎱 **Question:** ${question}\n**Answer:** ${getRandom(EIGHT_BALL_RESPONSES)}`);
          break;
        }

        case "trivia": {
          if (!openai) { await interaction.editReply("❌ AI features are not configured. Ask a moderator to set it up — use `!mode d'emploi` for instructions."); break; }
          await interaction.editReply("🧠 Trivia is starting — watch this channel for your question!");
          playTrivia(fakeMsg, openai).catch((err) => logger.error({ err }, "/trivia error"));
          break;
        }
      }
    } catch (err) {
      logger.error({ err, command: interaction.commandName }, "Slash command error");
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("❌ Something went wrong. Please try again!").catch(() => null);
      }
    }
  });

  // ── Button interaction handler ───────────────────────────────────────────────

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    // ── Now Playing buttons ─────────────────────────────────────────────────
    if (interaction.customId.startsWith("np:")) {
      const action = interaction.customId.split(":")[1];
      const guildId = interaction.guildId;
      if (!guildId) { await interaction.reply({ content: "❌ Guild not found.", ephemeral: true }); return; }

      try {
        if (action === "pause" || action === "resume") {
          const result = pauseToggle(guildId);
          if (result === "not_playing") {
            await interaction.reply({ content: "❌ Nothing is playing right now.", ephemeral: true });
            return;
          }
          const currentEmbed = interaction.message.embeds[0];
          const updatedEmbed = currentEmbed ? EmbedBuilder.from(currentEmbed) : new EmbedBuilder();
          const isRadioPause = !!(radioStates.get(guildId)?.stationKey);
          await interaction.update({ embeds: [updatedEmbed], components: isRadioPause ? buildRadioNpButtonRows(result === "paused") : buildNpButtonRows(result === "paused") });
          return;
        }

        if (action === "skip") {
          const skipState = radioStates.get(guildId);
          if (skipState?.stationKey) {
            const nextKey = nextRadioStation(guildId);
            if (!nextKey) { await interaction.reply({ content: "❌ No next station found.", ephemeral: true }); return; }
            await interaction.deferUpdate();
            await execSwitchRadioStation(guildId, nextKey, interaction.message as Message);
            return;
          }
          const skipped = skipCurrentTrack(guildId);
          if (!skipped) {
            await interaction.reply({ content: "❌ Nothing is currently playing.", ephemeral: true });
            return;
          }
          await interaction.reply({ content: `⏭️ Skipped **${skipped}**.`, ephemeral: true });
          return;
        }

        if (action === "like") {
          const state = radioStates.get(guildId);
          const isRadio = !!(state?.stationKey);
          const title = isRadio ? (RADIO_STATIONS[state!.stationKey!]?.name ?? state!.stationKey!) : state?.youtubeTitle;
          const url = isRadio ? `radio:${state!.stationKey}` : state?.youtubeUrl;
          if (!title || !url) {
            await interaction.reply({ content: "❌ Nothing is currently playing.", ephemeral: true });
            return;
          }
          if (isLiked(interaction.user.id, url)) {
            await removeLike(interaction.user.id, url);
            await interaction.reply({ content: `💔 Removed **${title}** from your likes.`, ephemeral: true });
          } else {
            await addLike(interaction.user.id, { title, url });
            await interaction.reply({ content: `❤️ Added **${title}** to your likes!\nUse \`!likes\` to see your list.`, ephemeral: true });
          }
          return;
        }

        if (action === "dislike") {
          const state = radioStates.get(guildId);
          const isRadio = !!(state?.stationKey);
          if (isRadio) {
            const stationUrl = `radio:${state!.stationKey}`;
            if (isLiked(interaction.user.id, stationUrl)) await removeLike(interaction.user.id, stationUrl);
            const nextKey = nextRadioStation(guildId);
            if (!nextKey) { await interaction.reply({ content: "👎 Disliked.", ephemeral: true }); return; }
            await interaction.deferUpdate();
            await execSwitchRadioStation(guildId, nextKey, interaction.message as Message);
          } else {
            const title = state?.youtubeTitle;
            const url = state?.youtubeUrl;
            if (!title || !url) { await interaction.reply({ content: "❌ Nothing is currently playing.", ephemeral: true }); return; }
            if (isLiked(interaction.user.id, url)) await removeLike(interaction.user.id, url);
            await interaction.reply({ content: `👎 Disliked **${title}**.`, ephemeral: true });
          }
          return;
        }

        if (action === "stop") {
          const stopped = stopForGuild(guildId);
          if (!stopped) {
            await interaction.reply({ content: "❌ Nothing is playing.", ephemeral: true });
            return;
          }
          await interaction.reply({ content: "⏹️ Stopped and disconnected.", ephemeral: true });
          return;
        }

        if (action === "queue") {
          const embed = getQueueEmbed(guildId);
          if (!embed) {
            await interaction.reply({ content: "📭 La queue est vide.", ephemeral: true });
            return;
          }
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }
      } catch (err) {
        logger.error({ err }, "np button error");
        await interaction.reply({ content: "❌ Something went wrong.", ephemeral: true }).catch(() => null);
      }
      return;
    }

    // ── Guess The Logo — Play Again buttons ──────────────────────────────────
    if (interaction.customId.startsWith("logo_again_")) {
      const diff = interaction.customId.replace("logo_again_", "") as "easy" | "medium" | "hard";
      if (!["easy", "medium", "hard"].includes(diff)) return;
      if (!interaction.channel) {
        await interaction.reply({ content: "❌ Canal introuvable.", ephemeral: true });
        return;
      }
      await interaction.reply({ content: `🔄 New **${diff === "easy" ? "🟢 Easy" : diff === "medium" ? "🟡 Medium" : "🔴 Hard"}** game started!`, ephemeral: true });
      startLogoGameFromButton(interaction.channel, interaction.channelId, diff).catch((err) =>
        logger.error({ err }, "logo_again button error")
      );
      return;
    }

    // ── Search result picker buttons ─────────────────────────────────────────
    if (interaction.customId.startsWith("yt:")) {
      const parts = interaction.customId.split(":");
      const subtype = parts[1] ?? "";

      // Navigation: yt:nav:prev:msgId / yt:nav:next:msgId
      if (subtype === "nav") {
        const dir = (parts[2] ?? "next") as "prev" | "next";
        const msgId = parts[3] ?? "";
        await interaction.deferUpdate();
        await navigateSearch(msgId, dir);
        return;
      }

      // Pick: yt:pick:N:msgId (new) or yt:N:msgId (old/compat)
      const localIdx = subtype === "pick" ? parseInt(parts[2] ?? "0", 10) : parseInt(subtype, 10);
      const msgId = subtype === "pick" ? (parts[3] ?? "") : (parts[2] ?? "");

      const pending = consumePendingSearch(msgId, localIdx);
      if (!pending) {
        await interaction.reply({ content: "❌ Search expired. Use `!y` again.", ephemeral: true });
        return;
      }

      // Check voice channel from interaction (most up-to-date, handles bot leaving/rejoining)
      const pickMember = interaction.member instanceof GuildMember
        ? interaction.member
        : interaction.guild
          ? await interaction.guild.members.fetch(interaction.user.id).catch(() => null)
          : null;
      const pickVoiceChannel = (pickMember as GuildMember | null)?.voice?.channel;
      if (!pickVoiceChannel) {
        await interaction.reply({ content: "❌ Join a voice channel first, then use `!y` again.", ephemeral: true });
        return;
      }

      await interaction.update({ content: `▶️ Playing **${pending.pick.title}**`, embeds: [], components: [] });
      try {
        await playYoutube(pending.message, pending.pick.url, { title: pending.pick.title, duration: pending.pick.duration, thumbnail: pending.pick.thumbnail });
        // Artist cache learning: if query was 2 words and title is "Artist - Song", save the artist
        const queryWords = pending.originalQuery.trim().split(/\s+/).filter(w => w.length > 1);
        if (queryWords.length === 2) {
          const titleLower = pending.pick.title.toLowerCase();
          const dashIdx = titleLower.indexOf(" - ");
          if (dashIdx !== -1) {
            const artistPart = titleLower.slice(0, dashIdx);
            const word1 = (queryWords[0] ?? "").toLowerCase();
            if (artistPart.includes(word1)) {
              saveArtist(queryWords[0]!).catch(() => null);
            }
          }
        }
      } catch (err) {
        logger.error({ err }, "yt:pick play error");
        await interaction.followUp({ content: "❌ Failed to play. Try `!y` again.", ephemeral: true }).catch(() => null);
      }
      return;
    }

    if (!interaction.customId.startsWith("voice_ready")) return;

    try {
      const member = interaction.member instanceof GuildMember
        ? interaction.member
        : interaction.guild
          ? await interaction.guild.members.fetch(interaction.user.id).catch(() => null)
          : null;

      const voiceChannel = (member as GuildMember | null)?.voice?.channel;
      if (!voiceChannel) {
        await interaction.reply({ content: "❌ Join a voice channel first, then click **✅ I'm ready!**", ephemeral: true });
        return;
      }

      // Extract pending command key from customId: "voice_ready:<key>:<idx>"
      const parts = interaction.customId.split(":");
      const pendingKey = parts[1]; // undefined for legacy "voice_ready" format

      if (pendingKey && !pendingKey.startsWith("noop_")) {
        const fn = consumePendingVoiceCmd(pendingKey, interaction.user.id);
        if (fn) {
          await interaction.reply({ content: `✅ Got it! You're in **${voiceChannel.name}** — running your command now…`, ephemeral: true });
          await fn().catch(err => logger.error({ err }, "voice_ready auto-retry error"));
          return;
        }
      }

      await interaction.reply({ content: `✅ You're in **${voiceChannel.name}** — now retry your command!`, ephemeral: true });
    } catch (err) {
      logger.error({ err }, "voice_ready button error");
      await interaction.reply({ content: "❌ Something went wrong.", ephemeral: true }).catch(() => null);
    }
  });

  // ── Message handler ──────────────────────────────────────────────────────────

  client.on("messageCreate", async (message: Message) => {
    if (message.author.bot) return;

    const botId = client.user?.id ?? "";
    const content = message.content;
    const guildPrefix = getPrefix(message.guildId);

    // --- Image generation ---
    if (content.startsWith("/image ") || content.startsWith(`${guildPrefix}image `)) {
      const prompt = content.slice(content.indexOf(" ") + 1).trim();
      if (!prompt) { await message.reply("🎨 Give me a description! e.g. `!image a sunset over Paris`"); return; }
      const hfToken = process.env["HUGGINGFACE_TOKEN"];
      if (!hfToken) { await message.reply("❌ Image generation is not configured. Ask a moderator to set it up — use `!mode d'emploi` for instructions."); return; }
      try {
        const waitMsg = await message.reply("🎨 Generating your image, please wait a few seconds...");
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
          await waitMsg.edit("❌ Generation failed. Try again later!");
          return;
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        await waitMsg.delete();
        if (isSendable(message.channel)) {
          await message.channel.send({ content: `🖼️ **${prompt}**`, files: [{ attachment: buffer, name: "image.png" }] });
        }
      } catch (err) {
        logger.error({ err }, "Image generation error");
        await message.reply("❌ Error during image generation. Try again!");
      }
      return;
    }

    // --- DM AI chat ---
    const isDm = message.channel.type === ChannelType.DM;
    if (isDm && !content.startsWith(guildPrefix)) {
      if (!openai) { await message.reply("❌ AI features are not configured. Ask a moderator to set it up — use `!mode d'emploi` for instructions."); return; }
      const userText = content.trim();
      if (!userText) { await message.reply("Hey! 👋 Send me a message and I'll do my best to help!"); return; }
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
        incrementGroqCalls();
        const reply = response.choices[0]?.message?.content ?? "Sorry, I couldn't come up with a response! 😅";
        addToHistory(message.channelId, "assistant", reply);
        const chunks = reply.match(/[\s\S]{1,2000}/g) ?? [reply];
        for (const chunk of chunks) await message.reply(chunk);
      } catch (err) {
        logger.error({ err }, "DM AI error");
        await message.reply("Oops, something went wrong! 😅 Try again in a moment.");
      }
      return;
    }

    // --- @mention AI chat ---
    if (openai && !isDm && botId && isBotMentioned(message, botId)) {
      const userText = stripMentions(content);
      if (!userText) { await message.reply("Hey! 👋 Mention me with a message and I'll help!"); return; }
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
        incrementGroqCalls();
        const reply = response.choices[0]?.message?.content ?? "Sorry, I couldn't come up with a response! 😅";
        addToHistory(message.channelId, "assistant", reply);
        const chunks = reply.match(/[\s\S]{1,2000}/g) ?? [reply];
        for (const chunk of chunks) await message.reply(chunk);
        // Also speak in voice if bot is connected
        if (message.guildId && isInVoice(message.guildId)) {
          const botName = client.user?.username;
          speakText(message.guildId, reply, "en", botName).catch(() => null);
        }
      } catch (err) {
        logger.error({ err }, "Mention AI error");
        await message.reply("Oops, something went wrong! 😅 Try again in a moment.");
      }
      return;
    }

    // --- Prefix commands ---
    if (!content.startsWith(guildPrefix)) return;

    const args = content.slice(guildPrefix.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // ── Full-block gate (levels 3 & 4) ────────────────────────────────────────
    // Admins can always use !unblock (including on themselves)
    {
      const isAdmin =
        message.member?.permissions.has(PermissionFlagsBits.Administrator) ||
        message.member?.permissions.has(PermissionFlagsBits.ManageGuild);

      const blockStatus = checkCommandBlock(message.author.id);

      if (blockStatus.blocked && !(isAdmin && command === "unblock")) {
        await sendBlockedMessage(message, blockStatus, guildPrefix);
        return;
      }
    }

    try {
      switch (command) {

        // ── General ─────────────────────────────────────────────────────────────
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
          if (!openai) { await message.reply("❌ AI features are not configured. Ask a moderator to set it up — use `!mode d'emploi` for instructions."); break; }
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
                { role: "system", content: "You are a dramatic conspiracy theory generator. Always write in the language the user used. If no topic, use English. Be creative, funny, absurd — never harmful." },
                { role: "user", content: prompt },
              ],
            });
            incrementGroqCalls();
            const theory = response.choices[0]?.message?.content ?? "The truth is too dangerous to reveal... 🤫";
            await message.reply(`🕵️ **CONSPIRACY UNLOCKED** 🕵️\n\n${theory}`);
          } catch (err) {
            logger.error({ err }, "Conspiracy error");
            await message.reply("❌ The government blocked this theory. Try again!");
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
              await message.reply("🏳️ GeoGuessr game abandoned!");
            } else {
              await message.reply("🤷 No game in progress.");
            }
            break;
          }
          const difficulty = sub || "easy";
          if (!["easy", "medium", "hard"].includes(difficulty)) {
            await message.reply("❓ Invalid mode. Use `!geo easy`, `!geo medium` or `!geo hard`.");
            break;
          }
          playGeoguessr(message, difficulty as "easy" | "medium" | "hard").catch((err) => logger.error({ err }, "GeoGuessr error"));
          break;
        }

        case "trivia": {
          if (!openai) { await message.reply("❌ AI features are not configured. Ask a moderator to set it up — use `!mode d'emploi` for instructions."); break; }
          playTrivia(message, openai).catch((err) => logger.error({ err }, "Trivia error"));
          break;
        }

        case "guessnumber":
        case "guess": {
          playGuessNumber(message).catch((err) => logger.error({ err }, "GuessNumber error"));
          break;
        }

        case "connect4": {
          await playConnect4(message, args);
          break;
        }

        case "guessthelogo":
        case "guesslogo":
        case "devinelelogo": {
          const sub = args[0]?.toLowerCase();
          if (sub === "stop") {
            if (isLogoActive(message.channelId)) {
              stopGuessLogo(message.channelId);
              await message.reply("🏳️ Logo game abandoned!");
            } else {
              await message.reply("🤷 No logo game in progress.");
            }
            break;
          }
          const logoDiff = sub && ["easy", "medium", "hard"].includes(sub) ? sub : "easy";
          playGuessLogo(message, logoDiff).catch((err) => logger.error({ err }, "GuessLogo error"));
          break;
        }

        case "logo": {
          const logoSub = args[0]?.toLowerCase();
          const logoArg = args[1]?.toLowerCase();

          const requirePerm = () => {
            if (!message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
              message.reply("🔒 You need **Manage Server** permission to use this command.").catch(() => null);
              return false;
            }
            return true;
          };

          if (logoSub === "stats") {
            const s = getStoreStats();
            const bar = (n: number, total: number) => {
              const pct = total > 0 ? Math.round((n / total) * 10) : 0;
              return "█".repeat(pct) + "░".repeat(10 - pct);
            };
            const embed = new EmbedBuilder()
              .setTitle("🏷️ Logo Brand Store — Stats")
              .setColor(0x5865f2)
              .addFields(
                { name: "Total brands",  value: `**${s.total}**`, inline: true },
                { name: "Tested",        value: `**${s.tested}** / ${s.total}`, inline: true },
                { name: "Untested",      value: `**${s.untested}**`, inline: true },
                { name: "✅ Approved",   value: `**${s.approved}**\n${bar(s.approved, s.total)}`, inline: true },
                { name: "📝 Text logos", value: `**${s.textLogos}** (excluded by OCR)`, inline: true },
                { name: "❌ Invalid",    value: `**${s.invalid}** (no image on logo.dev)`, inline: true },
              )
              .setFooter({ text: "Use !logo test start to test untested brands • !logo test all to re-test everything" });
            await message.reply({ embeds: [embed] });

          } else if (logoSub === "test") {
            if (!requirePerm()) break;

            if (logoArg === "status") {
              const p = getTestingProgress();
              if (!p.running && p.total === 0) {
                await message.reply("💤 No test job has been run yet. Use `!logo test start` to begin.");
              } else {
                const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
                const bar = "█".repeat(Math.round(pct / 10)) + "░".repeat(10 - Math.round(pct / 10));
                await message.reply(
                  `🔬 **Logo test${p.running ? " in progress" : " — last run"}**\n` +
                  `Progress: \`${bar}\` **${pct}%** (${p.done}/${p.total})\n` +
                  `✅ Approved: **${p.approved}**  •  📝 Text logos: **${p.textLogos}**  •  ❌ Invalid: **${p.invalid}**`,
                );
              }

            } else if (logoArg === "start" || logoArg === "all") {
              if (isTestingRunning()) {
                const p = getTestingProgress();
                const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
                const bar = "█".repeat(Math.round(pct / 10)) + "░".repeat(10 - Math.round(pct / 10));
                await message.reply(`⏳ A test job is already running — \`${bar}\` **${pct}%** (${p.done}/${p.total})`);
                break;
              }
              const token = process.env["LOGO_DEV_PUBLIC_KEY"] ?? process.env["LOGO_DEV_TOKEN"] ?? "";
              const retestAll = logoArg === "all";
              startLogoTestingJob(token, retestAll);
              const s = getStoreStats();
              const toTest = retestAll ? s.total : s.untested;

              const buildTestContent = (): string => {
                const p = getTestingProgress();
                const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
                const filled = Math.round(pct / 10);
                const bar = "█".repeat(filled) + "░".repeat(10 - filled);
                if (!p.running && p.total > 0) {
                  return (
                    `✅ **Logo test complete!**\n` +
                    `\`${bar}\` **100%** (${p.total}/${p.total})\n` +
                    `✅ Approved: **${p.approved}**  •  📝 Text logos: **${p.textLogos}**  •  ❌ Invalid: **${p.invalid}**`
                  );
                }
                return (
                  `🔬 **Logo test in progress…** *(${toTest} brand${toTest !== 1 ? "s" : ""}${retestAll ? " — re-testing all" : ""})*\n` +
                  `\`${bar}\` **${pct}%** (${p.done}/${p.total})\n` +
                  `✅ Approved: **${p.approved}**  •  📝 Text logos: **${p.textLogos}**  •  ❌ Invalid: **${p.invalid}**`
                );
              };

              const liveMsg = await message.reply(buildTestContent());
              const liveInterval = setInterval(async () => {
                try {
                  await liveMsg.edit(buildTestContent());
                  if (!isTestingRunning()) clearInterval(liveInterval);
                } catch {
                  clearInterval(liveInterval);
                }
              }, 5_000);

            } else {
              await message.reply(
                "**!logo test** subcommands:\n" +
                "`!logo test start` — test untested brands\n" +
                "`!logo test all` — re-test ALL brands\n" +
                "`!logo test status` — show progress",
              );
            }

          } else if (logoSub === "approve" && args[1]) {
            if (!requirePerm()) break;
            const domain = args[1];
            const ok = await setBrandApproval(domain, true, false);
            await message.reply(ok ? `✅ **${domain}** marked as approved.` : `❌ Brand \`${domain}\` not found in the store.`);

          } else if ((logoSub === "exclude" || logoSub === "ban") && args[1]) {
            if (!requirePerm()) break;
            const domain = args[1];
            const ok = await setBrandApproval(domain, false, true);
            await message.reply(ok ? `🚫 **${domain}** manually excluded from the game.` : `❌ Brand \`${domain}\` not found in the store.`);

          } else if ((logoSub === "include" || logoSub === "unban") && args[1]) {
            if (!requirePerm()) break;
            const domain = args[1];
            const ok = await setBrandApproval(domain, true, false);
            await message.reply(ok ? `✅ **${domain}** re-included in the game.` : `❌ Brand \`${domain}\` not found in the store.`);

          } else if (logoSub === "add" && args[1] && args[2]) {
            if (!requirePerm()) break;
            // !logo add <domain> <name> [tier:1|2|3] [category] [country] [hint...]
            const domain  = args[1]!;
            const name    = args[2]!;
            const tierRaw = Number(args[3] ?? "2");
            const tier: 1 | 2 | 3 = (tierRaw === 1 || tierRaw === 3) ? tierRaw : 2;
            const category = args[4] ?? "Brand";
            const country  = args[5] ?? "🌍";
            const hints    = args.slice(6);
            const result   = await addBrandToStore({ domain, name, tier, category, country, hints: hints.length ? hints : [] });
            if (result.ok) {
              const s = getStoreStats();
              await message.reply(
                `✅ **${name}** (\`${domain}\`) added to the store — tier **${tier}**, auto-approved.\n` +
                `Store now has **${s.total}** brand${s.total !== 1 ? "s" : ""} (${s.approved} approved).\n` +
                `💡 Run \`!logo test start\` to OCR-test the new brand.`,
              );
            } else {
              await message.reply(`❌ ${result.reason}`);
            }

          } else if ((logoSub === "remove" || logoSub === "delete") && args[1]) {
            if (!requirePerm()) break;
            const domain = args[1]!;
            const ok = await removeBrandFromStore(domain);
            await message.reply(ok
              ? `🗑️ **${domain}** removed from the store.`
              : `❌ Brand \`${domain}\` not found in the store.`);

          } else if (logoSub === "bulkload") {
            if (!requirePerm()) break;
            const { BULK_DOMAINS } = await import("./discord/logo-domains-bulk.js");
            const { bulkSeedFromDomainList } = await import("./discord/logo-brand-store.js");
            const statusMsg = await message.reply(`⏳ Loading **${BULK_DOMAINS.length}** domains into the store…`);
            const result = await bulkSeedFromDomainList(BULK_DOMAINS);
            const s = getStoreStats();
            await statusMsg.edit(
              `✅ Bulk load complete!\n` +
              `**${result.added}** new brands added · **${result.skipped}** already in store\n` +
              `Store now has **${s.total}** brands total.\n` +
              `💡 Run \`!logo test start\` to OCR-validate all untested entries.`,
            );

          } else {
            const embed = new EmbedBuilder()
              .setTitle("🏷️ Logo Brand Store — Admin")
              .setColor(0x5865f2)
              .addFields(
                {
                  name: "📊 Info",
                  value:
                    "`!logo stats` — database statistics",
                },
                {
                  name: "➕ Add / Remove",
                  value:
                    "`!logo add <domain> <name> [tier] [category] [country] [hint…]`\n" +
                    "  → e.g. `!logo add zara.com Zara 2 Fashion 🇪🇸`\n" +
                    "`!logo remove <domain>` — remove a brand",
                },
                {
                  name: "📦 Bulk Load",
                  value:
                    "`!logo bulkload` — import ~1 200 domains from the built-in list",
                },
                {
                  name: "🔬 OCR Testing",
                  value:
                    "`!logo test start` — test untested brands (image + OCR)\n" +
                    "`!logo test all` — re-test all brands\n" +
                    "`!logo test status` — current test progress",
                },
                {
                  name: "✅ Approval",
                  value:
                    "`!logo approve <domain>` — manually approve a brand\n" +
                    "`!logo exclude <domain>` — manually exclude a brand\n" +
                    "`!logo include <domain>` — re-include a brand",
                },
              )
              .setFooter({ text: "Manage Server permission required for all commands" });
            await message.reply({ embeds: [embed] });
          }
          break;
        }

        // ── Music — Suno AI ───────────────────────────────────────────────────────
        case "music": {
          const sub = args.shift()?.toLowerCase();

          if (sub === "generator") {
            const prompt = args.join(" ").trim();
            if (!prompt) { await message.reply("❌ Give me a prompt! e.g. `!music generator lo-fi hip hop beats chill`"); break; }
            if (!process.env["SUNO_API_KEY"]) { await message.reply("❌ Music generation is not configured. Ask a moderator to set it up — use `!mode d'emploi` for instructions."); break; }

            const startEmbed = new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle("🎵 Generating your track…")
              .setDescription(`**Prompt:** ${prompt}`)
              .setFooter({ text: "Suno is generating your track, around 30-60 seconds ⏳" });
            const reply = await message.reply({ embeds: [startEmbed] });

            let taskId: string;
            try {
              taskId = await generateSong({ prompt });
            } catch (err) {
              logger.error({ err }, "Suno generate error");
              await reply.edit({ embeds: [new EmbedBuilder().setColor(0xed4245).setTitle("❌ Error").setDescription(`Failed to start generation: ${String(err)}`)] });
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
                await reply.edit({ embeds: [new EmbedBuilder().setColor(0xed4245).setTitle("❌ Generation Failed").setDescription("Suno returned an error. Try a different prompt.").addFields({ name: "Task ID", value: taskId })] });
                break;
              }
              if (result.done && result.clips.length > 0) {
                const embeds = result.clips.filter((c) => c.audio_url).map((clip) => {
                  const e = new EmbedBuilder()
                    .setColor(0x57f287)
                    .setTitle(`🎶 ${clip.title ?? "Generated Track"}`)
                    .setDescription(`**Prompt:** ${clip.prompt ?? prompt}`)
                    .addFields({ name: "🎵 Listen", value: clip.audio_url! })
                    .setFooter({ text: `Task ID: ${taskId}` });
                  if (clip.image_url) e.setThumbnail(clip.image_url);
                  if (clip.duration) e.addFields({ name: "⏱ Duration", value: `${Math.round(clip.duration)}s`, inline: true });
                  if (clip.tags) e.addFields({ name: "🎸 Style", value: clip.tags.slice(0, 100), inline: true });
                  return e;
                });
                if (embeds.length > 0) { await reply.edit({ embeds }); break; }
              }
              await reply.edit({ embeds: [new EmbedBuilder().setColor(0xfee75c).setTitle("🎵 Generating your track…").setDescription(`**Prompt:** ${prompt}`).addFields({ name: "Status", value: result.status, inline: true }, { name: "Attempt", value: `${attempt}/${POLL_MAX}`, inline: true }).setFooter({ text: "Suno is working on it ⏳" })] });
            }

          } else if (sub === "prompt") {
            const embed = new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle("💡 Music Prompt Examples")
              .setDescription("Copy a prompt and use it with `!music generator <prompt>`\n\u200b");
            for (const { category, prompt } of MUSIC_PROMPT_EXAMPLES) embed.addFields({ name: category, value: `\`${prompt}\`` });
            embed.setFooter({ text: "💡 Tip: combine multiple styles for unique results!" });
            await message.reply({ embeds: [embed] });

          } else {
            await message.reply("❓ Unknown subcommand. Try `!music generator <prompt>` or `!music prompt`.");
          }
          break;
        }

        // ── !generator music <prompt> — alias for !music generator ───────────────
        case "generator": {
          const genSub = args.shift()?.toLowerCase();
          if (genSub !== "music") {
            await message.reply("❓ Did you mean `!generator music <prompt>`?");
            break;
          }
          const genPrompt = args.join(" ").trim();
          if (!genPrompt) { await message.reply("❌ Give me a prompt! e.g. `!generator music lo-fi hip hop beats chill`"); break; }
          if (!process.env["SUNO_API_KEY"]) { await message.reply("❌ Music generation is not configured. Ask a moderator to set it up — use `!mode d'emploi` for instructions."); break; }

          const genStartEmbed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle("🎵 Generating your track…")
            .setDescription(`**Prompt:** ${genPrompt}`)
            .setFooter({ text: "Suno is generating your track, around 30-60 seconds ⏳" });
          const genReply = await message.reply({ embeds: [genStartEmbed] });

          let genTaskId: string;
          try {
            genTaskId = await generateSong({ prompt: genPrompt });
          } catch (err) {
            logger.error({ err }, "Suno generate error (!generator music)");
            await genReply.edit({ embeds: [new EmbedBuilder().setColor(0xed4245).setTitle("❌ Error").setDescription(`Failed to start generation: ${String(err)}`)] });
            break;
          }

          const GEN_POLL_INTERVAL = 8000;
          const GEN_POLL_MAX = 15;
          for (let attempt = 1; attempt <= GEN_POLL_MAX; attempt++) {
            await new Promise((r) => setTimeout(r, GEN_POLL_INTERVAL));
            let genResult;
            try { genResult = await pollSong(genTaskId); } catch (err) { logger.warn({ err, attempt }, "Suno poll retry"); continue; }
            const gst = genResult.status.toUpperCase();
            if (gst === "ERROR" || gst === "FAILED" || gst === "FAILURE") {
              await genReply.edit({ embeds: [new EmbedBuilder().setColor(0xed4245).setTitle("❌ Generation Failed").setDescription("Suno returned an error. Try a different prompt.").addFields({ name: "Task ID", value: genTaskId })] });
              break;
            }
            if (genResult.done && genResult.clips.length > 0) {
              const genEmbeds = genResult.clips.filter((c) => c.audio_url).map((clip) => {
                const e = new EmbedBuilder()
                  .setColor(0x57f287)
                  .setTitle(`🎶 ${clip.title ?? "Generated Track"}`)
                  .setDescription(`**Prompt:** ${clip.prompt ?? genPrompt}`)
                  .addFields({ name: "🎵 Listen", value: clip.audio_url! })
                  .setFooter({ text: `Task ID: ${genTaskId}` });
                if (clip.image_url) e.setThumbnail(clip.image_url);
                if (clip.duration) e.addFields({ name: "⏱ Duration", value: `${Math.round(clip.duration)}s`, inline: true });
                if (clip.tags) e.addFields({ name: "🎸 Style", value: clip.tags.slice(0, 100), inline: true });
                return e;
              });
              if (genEmbeds.length > 0) { await genReply.edit({ embeds: genEmbeds }); break; }
            }
            await genReply.edit({ embeds: [new EmbedBuilder().setColor(0xfee75c).setTitle("🎵 Generating your track…").setDescription(`**Prompt:** ${genPrompt}`).addFields({ name: "Status", value: genResult.status, inline: true }, { name: "Attempt", value: `${attempt}/${GEN_POLL_MAX}`, inline: true }).setFooter({ text: "Suno is working on it ⏳" })] });
          }
          break;
        }

        case "balance": {
          if (!process.env["SUNO_API_KEY"]) { await message.reply("❌ Music generation is not configured. Ask a moderator to set it up — use `!mode d'emploi` for instructions."); break; }
          try {
            const credits = await getCredits();
            const embed = new EmbedBuilder()
              .setColor(credits > 10 ? 0x57f287 : credits > 0 ? 0xfee75c : 0xed4245)
              .setTitle("💳 Suno Credits")
              .addFields({ name: "Remaining credits", value: `${credits}`, inline: true })
              .setFooter({ text: "Each generation consumes credits from sunoapi.org" });
            await message.reply({ embeds: [embed] });
          } catch (err) {
            await message.reply(`❌ Could not fetch credits: ${String(err)}`);
          }
          break;
        }

        // ── Setup guide (API keys) — multiple command aliases ────────────────────
        case "setup":
        case "instruction":
        case "guide":
        case "guia":
        case "guía": {
          await sendSetupGuide(message);
          break;
        }

        case "mode": {
          const modeRest = args.join(" ").toLowerCase().replace(/['\u2019\u02BC]/g, "'");
          if (!modeRest.includes("emploi")) {
            await message.reply("❓ Did you mean `!mode d'emploi`?");
            break;
          }
          await sendSetupGuide(message);
          break;
        }

        // ── Status (owner only) ──────────────────────────────────────────────────
        case "status": {
          if (message.author.username.toLowerCase() !== "maxim3kun") {
            await message.reply("🔒 Commande réservée.");
            break;
          }
          const mongoOk  = isMongoConnected();
          const groqOk   = !!process.env["GROQ_API_KEY"];
          const sunoOk   = !!process.env["SUNO_API_KEY"];
          const hfOk     = !!process.env["HUGGINGFACE_TOKEN"];
          const token2Ok = !!process.env["DISCORD_TOKEN_2"];
          const guilds   = client.guilds.cache.size;
          const users    = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
          const uptime   = process.uptime();
          const uh = Math.floor(uptime / 3600);
          const um = Math.floor((uptime % 3600) / 60);
          const us = Math.floor(uptime % 60);
          const uptimeStr = `${uh}h ${um}m ${us}s`;
          const mem    = process.memoryUsage();
          const memMb  = Math.round(mem.rss / 1024 / 1024);
          const memMax = Math.round(os.totalmem() / 1024 / 1024);

          // MongoDB storage stats
          const MONGO_LIMIT_MB = 512;
          const dbSt = await getDbStats();
          let mongoValue: string;
          if (!mongoOk) {
            mongoValue = "⚠️ Fallback JSON";
          } else if (!dbSt) {
            mongoValue = "✅ Connecté";
          } else {
            const usedMb = (dbSt.storageSize / 1024 / 1024).toFixed(1);
            const pct    = Math.min((dbSt.storageSize / (MONGO_LIMIT_MB * 1024 * 1024)) * 100, 100);
            const filled = Math.round(pct / 10);
            const bar    = `\`${"█".repeat(filled)}${"░".repeat(10 - filled)}\``;
            mongoValue   = `✅ ${usedMb} MB / ${MONGO_LIMIT_MB} MB\n${bar} **${pct.toFixed(1)}%**\n${dbSt.objects} docs • ${dbSt.collections} collections`;
          }

          // Groq call count
          const groqCalls = getGroqCallCount();
          const groqValue = groqOk
            ? `✅ Active\n**${groqCalls}** appel${groqCalls !== 1 ? "s" : ""} cette session`
            : "❌ Désactivée";

          // RAM bar
          const ramPct    = Math.min(Math.round((memMb / memMax) * 100), 100);
          const ramFilled = Math.round(ramPct / 10);
          const ramBar    = `\`${"█".repeat(ramFilled)}${"░".repeat(10 - ramFilled)}\``;
          const ramValue  = `${memMb} MB / ${memMax} MB\n${ramBar} **${ramPct}%**`;

          const SP = { name: "\u200b", value: "\u200b", inline: true }; // 2-col spacer

          const embed = new EmbedBuilder()
            .setTitle("🤖 Bot Status")
            .setColor(mongoOk ? 0x57f287 : 0xfee75c)
            .addFields(
              { name: "🗄️ MongoDB",       value: mongoValue,                                  inline: true },
              { name: "🧠 Groq IA",        value: groqValue,                                   inline: true },
              SP,
              { name: "🎵 Suno",           value: sunoOk   ? "✅ Active" : "❌ Désactivée",   inline: true },
              { name: "🖼️ HuggingFace",   value: hfOk     ? "✅ Active" : "❌ Désactivée",   inline: true },
              SP,
              { name: "⚔️ AI Battle",      value: token2Ok ? "✅ Active" : "❌ Désactivée",   inline: true },
              { name: "🏠 Serveurs",        value: `**${guilds}** serveur${guilds !== 1 ? "s" : ""}\n${users} membres`,  inline: true },
              SP,
              { name: "⏱️ Uptime",          value: uptimeStr,                                  inline: true },
              { name: "💾 RAM",             value: ramValue,                                   inline: true },
              SP,
            )
            .setTimestamp();
          await message.reply({ embeds: [embed] });
          break;
        }

        // ── YouTube cookie/stream test (owner only) ──────────────────────────────
        case "yt-test":
        case "yttest": {
          if (message.author.username.toLowerCase() !== "maxim3kun") {
            await message.reply("🔒 Commande réservée.");
            break;
          }

          const statusMsg = await message.reply("🔍 Test YouTube en cours…");

          // 1. Cookie file status
          const ytCookiesRaw = process.env["YT_COOKIES"] ?? "";
          const cookieSet = ytCookiesRaw.length > 0;
          let cookieEntries = 0;
          if (cookieSet) {
            try {
              const { readFileSync, existsSync } = await import("fs");
              const cookiePath = "/tmp/yt-cookies.txt";
              if (existsSync(cookiePath)) {
                const content = readFileSync(cookiePath, "utf8");
                cookieEntries = content.split("\n").filter(l => l.trim() && !l.startsWith("#")).length;
              }
            } catch { /* ignore */ }
          }

          // 2. Live yt-dlp test on a short public video (Rick Astley — 3:32)
          const testUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
          let ytResult = "⏳ test…";
          let ytError = "";
          try {
            const { execFile } = await import("child_process");
            const { promisify } = await import("util");
            const exec = promisify(execFile);
            const LOCAL_BIN = "/home/runner/.local/bin/yt-dlp";
            const { existsSync } = await import("fs");
            const bin = existsSync(LOCAL_BIN) ? LOCAL_BIN : "yt-dlp";
            const cookieArgs = cookieEntries > 0 ? ["--cookies", "/tmp/yt-cookies.txt"] : [];
            const { stdout } = await exec(
              bin,
              [
                "--print", "%(title)s",
                "--no-playlist",
                "--extractor-args=youtube:player_client=ios",
                ...cookieArgs,
                testUrl,
              ],
              { timeout: 25_000, maxBuffer: 256 * 1024 },
            );
            ytResult = `✅ \`${stdout.trim().slice(0, 60)}\``;
          } catch (err) {
            const msg = String((err as { stderr?: string })?.stderr ?? err);
            ytResult = "❌ Échec";
            ytError = msg.slice(0, 200);
          }

          const embed = new EmbedBuilder()
            .setTitle("🧪 Diagnostic YouTube")
            .setColor(ytResult.startsWith("✅") ? 0x57f287 : 0xed4245)
            .addFields(
              {
                name: "🍪 Cookies",
                value: cookieSet
                  ? (cookieEntries > 0 ? `✅ ${cookieEntries} entrées chargées` : "⚠️ Secret défini mais 0 entrées — les sauts de ligne sont perdus à la saisie. Encode en base64 avant de coller.")
                  : "❌ `YT_COOKIES` non défini",
                inline: false,
              },
              { name: "▶️ Lecture test", value: ytResult, inline: false },
              ...(ytError ? [{ name: "⚠️ Erreur yt-dlp", value: `\`\`\`${ytError}\`\`\``, inline: false }] : []),
            )
            .setFooter({ text: "Client utilisé : ios • Vidéo test : Rick Astley" });

          await statusMsg.edit({ content: "", embeds: [embed] });
          break;
        }

        // ── Prefix ───────────────────────────────────────────────────────────────
        case "prefix": {
          const currentPfx = getPrefix(message.guildId);

          if (!args[0]) {
            await message.reply(
              `📌 Current prefix: \`${currentPfx}\`\n` +
              `➤ Change it: \`${currentPfx}prefix <new>\` *(admin only, max 3 chars)*\n` +
              `➤ Reset: \`${currentPfx}prefix reset\``,
            );
            break;
          }

          const isPrefixAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator)
            || message.member?.permissions.has(PermissionFlagsBits.ManageGuild);
          if (!isPrefixAdmin) {
            await message.reply("🔒 Only admins can change the prefix. (Requires **Manage Server** permission)");
            break;
          }

          if (args[0].toLowerCase() === "reset") {
            if (!message.guildId) break;
            resetPrefix(message.guildId);
            await message.reply("✅ Prefix reset to `!` (default).");
            break;
          }

          const newPfx = args[0];
          if (newPfx.length > 3) {
            await message.reply("❌ Prefix must be 3 characters or less (e.g. `?`, `>>`, `$.`).");
            break;
          }
          if (/\s/.test(newPfx)) {
            await message.reply("❌ Prefix cannot contain spaces.");
            break;
          }

          if (!message.guildId) break;
          setPrefix(message.guildId, newPfx);
          await message.reply(
            `✅ Prefix changed to \`${newPfx}\`\n` +
            `Example: \`${newPfx}help\`, \`${newPfx}radio nrj\`, \`${newPfx}music generator lo-fi\``,
          );
          break;
        }

        // ── Voice picker channels (admin) ────────────────────────────────────────
        case "voicechannels":
        case "voicesalons":
        case "salonsvocaux": {
          const isVCAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator)
            || message.member?.permissions.has(PermissionFlagsBits.ManageGuild);
          if (!isVCAdmin) {
            await message.reply("🔒 Only admins can configure this. (**Manage Server** permission required)");
            break;
          }
          if (!message.guildId) break;

          if (args[0]?.toLowerCase() === "reset") {
            await setVoicePickerChannels(message.guildId, []);
            await message.reply("✅ Voice channel picker reset — the first 2 voice channels of the server will be shown.");
            break;
          }

          const mentionedChannels = [...message.mentions.channels.values()]
            .filter(c => c.type === ChannelType.GuildVoice)
            .slice(0, 2);

          if (mentionedChannels.length === 0) {
            const current = getVoicePickerChannels(message.guildId);
            const desc = current.length > 0
              ? `Current channels: ${current.map(id => `<#${id}>`).join(", ")}`
              : "Current channels: first 2 voice channels of the server";
            await message.reply(
              `🔊 **Voice channel picker**\n${desc}\n\n` +
              `➤ Set channels: \`${guildPrefix}voicechannels #channel1 #channel2\`\n` +
              `➤ Reset to default: \`${guildPrefix}voicechannels reset\``,
            );
            break;
          }

          const newIds = mentionedChannels.map(c => c.id);
          await setVoicePickerChannels(message.guildId, newIds);
          await message.reply(`✅ Voice picker updated! Channels shown: ${newIds.map(id => `<#${id}>`).join(", ")}`);
          break;
        }

        // ── Suggest (on/off) ─────────────────────────────────────────────────────
        case "suggest":
        case "suggestion":
        case "sugerencia": {
          const sub = args[0]?.toLowerCase();
          if (sub === "on" || sub === "off") {
            const enabled = sub === "on";
            setSuggestPref(message.author.id, enabled);
            await message.reply(
              enabled
                ? "💡 **Suggestions enabled.** I'll help you correct typos from now on."
                : "🔕 **Suggestions disabled.** I'll stay silent on unknown commands.\nUse `!help` to browse all commands.",
            );
          } else {
            const current = getSuggestPref(message.author.id);
            const status  = current === true ? "**on** ✅" : current === false ? "**off** 🔕" : "**not set yet**";
            await message.reply(
              `💡 Command suggestions are currently ${status}.\n` +
              `➤ \`${guildPrefix}suggest on\` — enable\n` +
              `➤ \`${guildPrefix}suggest off\` — disable`,
            );
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
            if (!text) { await message.reply("❓ Give me some text! e.g. `!voice say Hello everyone`"); break; }
            if (!message.guildId || !isInVoice(message.guildId)) {
              await message.reply("❌ I'm not in a voice channel. Use `!join` first.");
              break;
            }
            const botName = client.user?.username;
            const ok = await speakText(message.guildId, text, "en", botName);
            if (!ok) await message.reply("❌ Can't speak right now (muted mode?)");
          } else {
            await message.reply("❓ Use `!voice say <text>`, `!voice stop` or `!voice resume`.");
          }
          break;
        }

        case "subtitles": {
          await toggleSubtitles(message);
          break;
        }

        // ── Radio ────────────────────────────────────────────────────────────────
        case "radio": {
          const sub = args[0]?.toLowerCase();

          if (!sub || sub === "list" || sub === "liste" || sub === "search" || sub === "recherche" || sub === "fr" || sub === "es" || sub === "en") {
            let page = langToPage((sub === "fr" || sub === "es" || sub === "en") ? sub : args[1]?.toLowerCase()) as 1 | 2 | 3;
            const radioMsg = await message.reply({ embeds: [buildRadioListEmbed(page)] });
            await radioMsg.react("⬅️").catch(() => null);
            await radioMsg.react("➡️").catch(() => null);
            const collector = radioMsg.createReactionCollector({
              filter: (r, u) => ["⬅️", "➡️"].includes(r.emoji.name ?? "") && !u.bot && u.id === message.author.id,
              idle: 30 * 60 * 1000,
            });
            collector.on("collect", async (reaction, user) => {
              if (reaction.emoji.name === "➡️") page = (page === 3 ? 1 : page + 1) as 1 | 2 | 3;
              if (reaction.emoji.name === "⬅️") page = (page === 1 ? 3 : page - 1) as 1 | 2 | 3;
              await radioMsg.edit({ embeds: [buildRadioListEmbed(page)] });
              await reaction.users.remove(user.id).catch(() => null);
            });
            break;
          }

          if (sub === "leave" || sub === "stop") {
            await stopRadio(message);
            break;
          }

          // ── !radio custom ──────────────────────────────────────────────────
          if (sub === "custom") {
            if (customStations.size === 0) {
              await message.reply(
                "📭 Aucune station personnalisée pour le moment.\n" +
                "Les admins peuvent en ajouter avec `!radio addurl <Nom> | <URL>`."
              );
              break;
            }
            const lines = Array.from(customStations.entries())
              .map(([k, s]) => `${s.emoji} \`${k}\` — **${s.name}** · *${s.genre}*`)
              .join("\n");
            const customEmbed = new EmbedBuilder()
              .setTitle("📻 Stations personnalisées")
              .setColor(0xf39c12)
              .setDescription(lines)
              .setFooter({ text: "!radio <clé> pour jouer · !radio remove <clé> pour supprimer (admin)" });
            await message.reply({ embeds: [customEmbed] });
            break;
          }

          // ── !radio remove <clé> ───────────────────────────────────────────
          if (sub === "remove") {
            const isAdminRemove = message.member?.permissions.has(PermissionFlagsBits.ManageGuild)
              || message.member?.permissions.has(PermissionFlagsBits.Administrator);
            if (!isAdminRemove) {
              await message.reply("❌ Cette commande est réservée aux membres avec la permission **Gérer le serveur**.");
              break;
            }
            const removeKey = args[1]?.toLowerCase();
            if (!removeKey) {
              await message.reply("❌ Format : `!radio remove <clé>`\nExemple : `!radio remove kbs2fm`");
              break;
            }
            if (removeKey in RADIO_STATIONS) {
              await message.reply("❌ Impossible de supprimer une station intégrée — seulement les stations ajoutées via `!radio addurl`.");
              break;
            }
            const wasRemoved = await removeCustomRadio(removeKey);
            if (wasRemoved) {
              await message.reply(`✅ Station \`${removeKey}\` supprimée de la liste personnalisée.`);
            } else {
              await message.reply(`❌ Station \`${removeKey}\` introuvable dans les stations personnalisées. Vérifie avec \`!radio custom\`.`);
            }
            break;
          }

          // ── !radio addurl <Nom> | <URL> ───────────────────────────────────
          if (sub === "addurl") {
            const isAdminAdd = message.member?.permissions.has(PermissionFlagsBits.ManageGuild)
              || message.member?.permissions.has(PermissionFlagsBits.Administrator);
            if (!isAdminAdd) {
              await message.reply(
                "❌ Cette commande est réservée aux membres avec la permission **Gérer le serveur**.\n" +
                "Elle permet d'ajouter une radio personnalisée à `!radio`."
              );
              break;
            }

            // Parse: !radio addurl Nom Station | https://url
            const fullArg = args.slice(1).join(" ");
            const pipeIdx = fullArg.indexOf("|");
            let customName: string;
            let customUrl: string;

            if (pipeIdx > 0) {
              customName = fullArg.slice(0, pipeIdx).trim();
              customUrl  = fullArg.slice(pipeIdx + 1).trim();
            } else {
              // Try to find the URL in the args (starts with http)
              const urlArg = args.slice(1).find(a => a.startsWith("http"));
              if (urlArg) {
                customUrl  = urlArg;
                customName = args.slice(1).filter(a => a !== urlArg).join(" ").trim() || "Custom Radio";
              } else {
                await message.reply(
                  "❌ Format : `!radio addurl <Nom> | <URL>`\n" +
                  "Exemple : `!radio addurl KBS World | https://stream.url.com/kbs`\n\n" +
                  "💡 Pour les radios coréennes : trouve l'URL du stream dans les outils développeur de ton navigateur (onglet Réseau → filtre `audio` ou `media`) et colle-la ici."
                );
                break;
              }
            }

            if (!customUrl.startsWith("http")) {
              await message.reply("❌ L'URL doit commencer par `http://` ou `https://`.");
              break;
            }
            if (!customName) {
              await message.reply("❌ Le nom de la station ne peut pas être vide.");
              break;
            }

            // Generate a slug key from the name
            const customKey = customName.toLowerCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]/g, "")
              .slice(0, 20);
            if (!customKey) {
              await message.reply("❌ Le nom ne contient aucun caractère valide. Utilise des lettres ou chiffres.");
              break;
            }

            // Check for key conflict
            if (customKey in RADIO_STATIONS || customStations.has(customKey)) {
              await message.reply(
                `❌ La clé \`${customKey}\` (générée depuis le nom) est déjà utilisée.\n` +
                `Choisis un nom différent.`
              );
              break;
            }

            const testMsg = await message.reply(`⏳ Test de l'URL…`);

            try {
              // Quick connectivity test
              const testRes = await fetch(customUrl, {
                method: "HEAD",
                signal: AbortSignal.timeout(8000),
              }).catch(() =>
                fetch(customUrl, { signal: AbortSignal.timeout(10000) })
              );

              if (!testRes.ok && testRes.status !== 0) {
                await testMsg.edit(
                  `❌ L'URL a répondu \`HTTP ${testRes.status}\`. Vérifie qu'elle est correcte et accessible.`
                );
                break;
              }

              // Add to in-memory only first (so playRadio can find it)
              customStations.set(customKey, { name: customName, url: customUrl, emoji: "📻", genre: "Custom", lang: "fr" });

              await testMsg.edit(`✅ URL accessible ! Connexion en cours…`);

              // Play immediately
              await playRadio(message, customKey);

              // Ask admin whether to save permanently
              const saveMsg = await message.channel.send(
                `💾 Veux-tu ajouter **${customName}** (\`!radio ${customKey}\`) **en permanence** à la liste radio ?\n` +
                `✅ = Oui, sauvegarder pour tout le monde  ·  ❌ = Non, juste cette session`
              );
              await saveMsg.react("✅").catch(() => null);
              await saveMsg.react("❌").catch(() => null);

              const saveCollector = saveMsg.createReactionCollector({
                filter: (r, u) => ["✅", "❌"].includes(r.emoji.name ?? "") && !u.bot && u.id === message.author.id,
                time: 120_000,
                max: 1,
              });

              saveCollector.on("collect", async (reaction) => {
                if (reaction.emoji.name === "✅") {
                  await addCustomRadio(customKey, customName, customUrl, "📻", "Custom", "fr", message.author.id);
                  await saveMsg.edit(
                    `✅ **${customName}** sauvegardée ! Disponible pour tous avec \`!radio ${customKey}\`.\n` +
                    `Voir toutes les stations custom : \`!radio custom\` · Supprimer : \`!radio remove ${customKey}\``
                  );
                } else {
                  // Remove from in-memory (not saved to DB)
                  customStations.delete(customKey);
                  await saveMsg.edit(`👍 Station non sauvegardée. Elle était jouée pour cette session uniquement.`);
                }
              });

              saveCollector.on("end", (collected, reason) => {
                if (reason === "time" && collected.size === 0) {
                  // Auto-save after timeout? No, remove from memory silently.
                  customStations.delete(customKey);
                  saveMsg.edit(`⏰ Pas de réponse — station non sauvegardée.`).catch(() => null);
                }
              });

            } catch {
              customStations.delete(customKey);
              await testMsg.edit(
                `❌ Impossible de se connecter à l'URL. Vérifie qu'elle est accessible depuis Internet.\n\n` +
                `💡 **Astuce pour les radios coréennes** : ouvre le site de la radio dans ton navigateur, active les outils développeur (F12) → onglet **Réseau** → filtre **Media** → lance la lecture → copie l'URL du flux audio.`
              );
            }
            break;
          }

          // !radio <stationKey or multi-word name>
          await playRadio(message, args.join(" "));
          break;
        }

        // ── Radio shortcut !r ────────────────────────────────────────────────────
        case "r": {
          const sub = args[0]?.toLowerCase();
          if (!sub || sub === "list" || sub === "liste" || sub === "search" || sub === "recherche" || sub === "fr" || sub === "es" || sub === "en") {
            let page = langToPage((sub === "fr" || sub === "es" || sub === "en") ? sub : args[1]?.toLowerCase()) as 1 | 2 | 3;
            const radioMsg = await message.reply({ embeds: [buildRadioListEmbed(page)] });
            await radioMsg.react("⬅️").catch(() => null);
            await radioMsg.react("➡️").catch(() => null);
            const collector = radioMsg.createReactionCollector({
              filter: (rx, u) => ["⬅️", "➡️"].includes(rx.emoji.name ?? "") && !u.bot && u.id === message.author.id,
              idle: 30 * 60 * 1000,
            });
            collector.on("collect", async (reaction, user) => {
              if (reaction.emoji.name === "➡️") page = (page === 3 ? 1 : page + 1) as 1 | 2 | 3;
              if (reaction.emoji.name === "⬅️") page = (page === 1 ? 3 : page - 1) as 1 | 2 | 3;
              await radioMsg.edit({ embeds: [buildRadioListEmbed(page)] });
              await reaction.users.remove(user.id).catch(() => null);
            });
          } else if (sub === "leave" || sub === "stop") {
            await stopRadio(message);
          } else {
            await playRadio(message, args.join(" "));
          }
          break;
        }

        case "classic": {
          await playRadio(message, "classicfm");
          break;
        }

        // ── YouTube ──────────────────────────────────────────────────────────────
        case "youtube":
        case "yt":
        case "y":
        case "yb": {
          const sub = args[0]?.toLowerCase();
          if (sub === "search" || sub === "s") {
            // explicit search: !y search <keywords>
            const query = args.slice(1).join(" ");
            await searchAndQueue(message, query);
          } else if (!args[0]) {
            const ytEmbed = new EmbedBuilder()
              .setColor(0xed4245)
              .setTitle("▶️ YouTube — How to use")
              .addFields(
                { name: "`!y <song title>`",   value: "Search YouTube and pick from results *(no URL needed!)*", inline: false },
                { name: "`!y <url>`",          value: "Play a YouTube link directly",                           inline: false },
                { name: "`!skip`",             value: "Skip the current track",                                 inline: false },
                { name: "`!queue`",            value: "See what's coming up in the queue",                      inline: false },
                { name: "`!np`",               value: "Show the currently playing track",                       inline: false },
              )
              .setFooter({ text: "Tip: !y stromae papaoutai • !y https://youtu.be/… • !radio list" });
            await message.reply({ embeds: [ytEmbed] });
          } else {
            // URL → play directly; anything else (multi-word) → search
            const query = args.join(" ");
            await playYoutube(message, query);
          }
          break;
        }

        // ── Live Streams ──────────────────────────────────────────────────────────
        case "live": {
          const liveQuery = args.join(" ");
          if (!liveQuery) {
            await message.reply("❓ Provide a URL or search query.\nExamples: `!live https://www.twitch.tv/channel`  •  `!live lofi girl`");
            break;
          }
          await playLive(message, liveQuery);
          break;
        }

        // ── Skip ─────────────────────────────────────────────────────────────────
        case "skip": {
          await skipYoutube(message);
          break;
        }

        // ── Vote skip ─────────────────────────────────────────────────────────────
        case "voteskip":
        case "vs": {
          await startVoteSkip(message);
          break;
        }

        // ── Queue ─────────────────────────────────────────────────────────────────
        case "queue":
        case "q": {
          if (!message.guildId) break;
          const qEmbed = getQueueEmbed(message.guildId);
          if (!qEmbed) {
            await message.reply("🔇 The queue is empty. Use `!youtube <url>` or `!youtube search <keywords>` to add tracks.");
          } else {
            await message.reply({ embeds: [qEmbed] });
          }
          break;
        }

        // ── Now Playing ──────────────────────────────────────────────────────────
        case "np": {
          if (!message.guildId) break;
          const npEmbed = nowPlaying(message.guildId);
          if (!npEmbed) {
            await message.reply("🔇 Nothing is currently playing. Start with `!radio <station>` or `!youtube <url>`.");
          } else {
            await message.reply({ embeds: [npEmbed] });
          }
          break;
        }

        // ── Likes ────────────────────────────────────────────────────────────────
        case "likes":
        case "liked": {
          const userId = message.author.id;
          const sub = args[0]?.toLowerCase();

          if (sub === "play") {
            const liked = getLikes(userId);
            if (liked.length === 0) {
              await message.reply("💔 You have no liked tracks yet. Use the **💚 Like** button on a Now Playing embed to save a song.");
              break;
            }
            await message.reply(`🎵 Queuing **${liked.length} liked track${liked.length !== 1 ? "s" : ""}**…`);
            for (const track of liked) {
              await playYoutube(message, track.url);
            }
            break;
          }

          const liked = getLikes(userId);
          if (liked.length === 0) {
            const emptyEmbed = new EmbedBuilder()
              .setColor(0x57f287)
              .setTitle("💚 Your Liked Tracks")
              .setDescription("You haven't liked any tracks yet!\n\nWhen a YouTube video is playing, click the **💚 Like** button on the **🎵 Now Playing** embed to save it here.")
              .setFooter({ text: "!likes play — play your entire likes list" });
            await message.reply({ embeds: [emptyEmbed] });
            break;
          }

          const PAGE_SIZE = 10;
          const recentFirst = [...liked].reverse();
          const page = recentFirst.slice(0, PAGE_SIZE);
          const totalPages = Math.ceil(liked.length / PAGE_SIZE);

          const lines = page.map((t, i) => {
            const daysAgo = Math.floor((Date.now() - new Date(t.likedAt).getTime()) / 86_400_000);
            const when = daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo}d ago`;
            return `**${i + 1}.** [${t.title}](${t.url}) — *${when}*`;
          });

          const likesEmbed = new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle(`💚 Your Liked Tracks (${liked.length})`)
            .setDescription(lines.join("\n"))
            .setFooter({ text: `!likes play — queue all  •  Page 1/${totalPages}` });
          await message.reply({ embeds: [likesEmbed] });
          break;
        }

        // ── Karaoke ──────────────────────────────────────────────────────────────
        case "k":
        case "karaoke": {
          if (!message.guildId) break;
          const sub = args[0]?.toLowerCase();

          if (sub === "stop") {
            await stopKaraoke(message);
            break;
          }

          // Admin: !karaoke source youtube|soundcloud
          if (sub === "source") {
            const srcArg = args[1]?.toLowerCase();
            if (srcArg === "youtube" || srcArg === "soundcloud") {
              const member = message.member as GuildMember | null;
              if (!member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
                await message.reply("❌ You need **Manage Server** permission to change karaoke settings.");
                break;
              }
              setGuildKaraokeSource(message.guildId, srcArg);
              await message.reply(`✅ Karaoke audio source set to **${srcArg === "youtube" ? "YouTube" : "SoundCloud"}** for this server.`);
            } else {
              const current = getGuildKaraokeSource(message.guildId);
              await message.reply(`❓ Usage: \`!karaoke source youtube\` or \`!karaoke source soundcloud\`\nCurrent source: **${current === "youtube" ? "YouTube" : "SoundCloud"}**`);
            }
            break;
          }

          // !karaoke offset <seconds> — adjust lyrics sync (e.g. 2 = lyrics 2 s behind audio)
          if (sub === "offset") {
            const secArg = parseFloat(args[1] ?? "");
            if (isNaN(secArg) || secArg < 0 || secArg > 10) {
              await message.reply("❓ Usage: `!karaoke offset <seconds>`\nExample: `!karaoke offset 2` (lyrics start 2 s after audio)\nRange: 0–10 s · Default: 2 s");
              break;
            }
            setKaraokeOffset(message.guildId, Math.round(secArg * 1000));
            await message.reply(`✅ Karaoke sync offset set to **${secArg} s** — takes effect on the next song.`);
            break;
          }

          const karaokeQuery = args.join(" ").trim();
          await startKaraoke(message, karaokeQuery);
          break;
        }

        // ── Shazam ───────────────────────────────────────────────────────────────
        case "shazam": {
          await shazam(message);
          break;
        }

        // ── Playlist ─────────────────────────────────────────────────────────────
        case "playlist": {
          if (!message.guildId) break;
          const guildId = message.guildId;
          const sub = args[0]?.toLowerCase();

          if (!sub || sub === "list") {
            await message.reply({ embeds: [await listPlaylists(guildId)] });
            break;
          }

          if (sub === "add") {
            const name = args[1];
            const url = args[2];
            if (!name || !url) {
              await message.reply("❓ Usage: `!playlist add <name> <youtube-url>`\nExample: `!playlist add chill https://www.youtube.com/watch?v=...`");
              break;
            }
            if (!url.includes("youtube.com/") && !url.includes("youtu.be/")) {
              await message.reply("❌ Please provide a valid YouTube URL.");
              break;
            }
            const { index } = await addToPlaylist(guildId, name, url);
            await message.reply(`✅ Added to playlist **${name}** (${index} video${index !== 1 ? "s" : ""} total).`);
            break;
          }

          if (sub === "show") {
            const name = args[1];
            if (!name) { await message.reply("❓ Usage: `!playlist show <name>`"); break; }
            const embed = await showPlaylist(guildId, name);
            if (!embed) { await message.reply(`❌ Playlist **${name}** not found. Use \`!playlist list\` to see all playlists.`); break; }
            await message.reply({ embeds: [embed] });
            break;
          }

          if (sub === "play") {
            const name = args[1];
            if (!name) { await message.reply("❓ Usage: `!playlist play <name>`"); break; }
            await playPlaylist(message, name);
            break;
          }

          if (sub === "delete" || sub === "remove") {
            const name = args[1];
            if (!name) { await message.reply(`❓ Usage: \`!playlist ${sub} <name>\``); break; }
            const deleted = await removePlaylist(guildId, name);
            if (!deleted) { await message.reply(`❌ Playlist **${name}** not found.`); break; }
            await message.reply(`🗑️ Playlist **${name}** deleted.`);
            break;
          }

          await message.reply(
            "❓ Unknown subcommand.\n" +
            "`!playlist list` — see all playlists\n" +
            "`!playlist add <name> <url>` — add a video\n" +
            "`!playlist show <name>` — list videos in a playlist\n" +
            "`!playlist play <name>` — play a playlist in voice\n" +
            "`!playlist delete <name>` — remove a playlist"
          );
          break;
        }

        // ── AI Battle ────────────────────────────────────────────────────────────
        case "ai": {
          const subcommand = args.shift()?.toLowerCase();

          if (subcommand === "stop") {
            if (!activeBattles.has(message.channelId)) {
              await message.reply("🤷 No battle running in this channel.");
            } else {
              stoppedBattles.add(message.channelId);
              await message.reply("🛑 Stopping the battle after the current message...");
            }
            break;
          }

          if (subcommand !== "battle") break;
          if (!openai) { await message.reply("❌ AI features are not configured. Ask a moderator to set it up — use `!mode d'emploi` for instructions."); break; }
          if (!client2) { await message.reply("❌ The second bot is not configured. Ask a moderator to set it up — use `!mode d'emploi` for instructions."); break; }
          if (!isSendable(message.channel)) break;

          const topic = args.join(" ").trim() || "Is pineapple on pizza acceptable?";

          if (activeBattles.has(message.channelId)) {
            await message.reply("⚔️ A battle is already running! Type `!ai stop` to end it.");
            break;
          }

          activeBattles.add(message.channelId);
          const bot1Name = client.user?.username ?? "Defender";

          runAiBattle(topic, message.channel, openai, bot1Name, client2)
            .catch(async (err) => {
              logger.error({ err }, "AI battle error");
              await message.reply("❌ The battle crashed unexpectedly!");
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
            .setTitle("✨ Project Credits")
            .setColor(0x5865f2)
            .setDescription("This bot wouldn't exist without these technologies and people. Thank you all! 🙏")
            .addFields(
              { name: "👨‍💻 Creator", value: "**Maxime** — Design, development & ideas", inline: false },
              { name: "🧠 AI Assistants", value: "**Claude** — Suggestions & problem-solving\n**ChatGPT** — Creative vision", inline: false },
              { name: "🤖 Artificial Intelligence", value: "**Meta LLaMA** — AI model (via Groq)\n**Suno AI** — Music generation", inline: false },
              { name: "🔊 Voice & Images", value: "**Google Translate** — Text-to-speech (free TTS)\n**HuggingFace / FLUX** — Image generation", inline: false },
              { name: "🚀 Infrastructure", value: "**Railway** — Hosting & deployment\n**Replit** — Development environment\n**GitHub** — Version control & collaboration", inline: false },
              { name: "🛠️ Technologies", value: "**discord.js** — Discord API\n**Node.js + TypeScript** — Runtime & language\n**Express** — API server", inline: false },
            )
            .setFooter({ text: "Made with ❤️ by Maxime • www.maximeGPT.com" });
          await message.reply({ embeds: [embed] });
          break;
        }

        // ── Website viewer ────────────────────────────────────────────────────────
        case "website":
        case "site": {
          await message.reply(buildWebsiteMessage(0));
          break;
        }

        // ── Birthday ──────────────────────────────────────────────────────────────
        case "anniversaire":
        case "b":
        case "birthday": {
          await handleBirthday(message, args);
          break;
        }

        // ── Sondage ───────────────────────────────────────────────────────────────
        case "sondage":
        case "poll": {
          const POLL_EMOJIS = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣"];
          const raw = args.join(" ");
          const parts = raw.split("|").map(s => s.trim()).filter(Boolean);
          if (parts.length < 3) {
            await message.reply("❌ Format: `!poll <question> | <choice1> | <choice2> ...` *(minimum 2 choices)*");
            break;
          }
          const question = parts[0]!;
          const choices = parts.slice(1, 10);
          const description = choices.map((c, i) => `${POLL_EMOJIS[i]} ${c}`).join("\n");
          const embed = new EmbedBuilder()
            .setTitle(`📊 ${question}`)
            .setDescription(description)
            .setColor(0x5865f2)
            .setFooter({ text: `Poll by ${message.author.displayName ?? message.author.username}` });
          const pollMsg = await message.channel.send({ embeds: [embed] });
          for (let i = 0; i < choices.length; i++) {
            await pollMsg.react(POLL_EMOJIS[i]!).catch(() => null);
          }
          await message.delete().catch(() => null);
          break;
        }

        // ── Quest tracker ─────────────────────────────────────────────────────────
        case "quests":
        case "quest": {
          const sub = args[0]?.toLowerCase();
          if (!sub || sub === "start") {
            await startQuestSetup(message, openai);
          } else if (sub === "list") {
            await showQuestList(message);
          } else if (sub === "done") {
            if (args[1]?.toLowerCase() === "all") await markAllQuestsDone(message);
            else await markQuestDone(message, args[1] ?? "");
          } else if (sub === "profile" || sub === "profil") {
            await showQuestProfile(message);
          } else if (sub === "reset") {
            await resetQuests(message);
          } else if (sub === "remind") {
            await setReminderChannel(message);
          } else if (sub === "schedule") {
            await setSchedule(message, args.slice(1).join(" "));
          } else if (sub === "stats") {
            await showQuestStats(message);
          } else if (sub === "add") {
            const objective = args.slice(1).join(" ");
            await addQuestWithCoach(message, objective, openai);
          } else if (sub === "bully") {
            const toggle = args[1]?.toLowerCase();
            if (toggle === "on") await setBullyMode(message, true);
            else if (toggle === "off") await setBullyMode(message, false);
            else await message.reply("❓ Usage: `!quest bully on` or `!quest bully off`");
          } else if (sub === "negotiate") {
            await negotiateQuests(message, openai);
          } else {
            await message.reply("❓ Commands: `!quest start` · `!quest add <goal>` · `!quest list` · `!quest done <n>` · `!quest profile` · `!quest negotiate` · `!quest reset`");
          }
          break;
        }

        // ── Unblock (admin only) ─────────────────────────────────────────────────
        case "unblock": {
          const isAdmin =
            message.member?.permissions.has(PermissionFlagsBits.Administrator) ||
            message.member?.permissions.has(PermissionFlagsBits.ManageGuild);
          if (!isAdmin) {
            await message.reply("🔒 Only admins can use this command.");
            break;
          }
          // Get mentioned user from args — accept <@id> or <@!id>
          const mentionMatch = args[0]?.match(/^<@!?(\d+)>$/);
          const targetId = mentionMatch?.[1];
          if (!targetId) {
            await message.reply(`❓ Usage: \`${guildPrefix}unblock @user\``);
            break;
          }
          const wasBanned = unblockUser(targetId);
          if (wasBanned) {
            await message.reply(`✅ <@${targetId}> has been unblocked and can use bot commands again.`);
          } else {
            await message.reply(`ℹ️ <@${targetId}> isn't currently blocked.`);
          }
          break;
        }

        // ── Ban list (admin only) ─────────────────────────────────────────────────
        case "banlist": {
          const isAdmin =
            message.member?.permissions.has(PermissionFlagsBits.Administrator) ||
            message.member?.permissions.has(PermissionFlagsBits.ManageGuild);
          if (!isAdmin) {
            await message.reply("🔒 Only admins can use this command.");
            break;
          }

          const list = getBanList();
          if (list.length === 0) {
            await message.reply("✅ No users are currently flagged by the anti-troll system.");
            break;
          }

          const LEVEL_LABELS: Record<number, string> = {
            0: "⚠️ Warned",
            1: "⏱️ 3-min block",
            2: "🚫 12h block",
            3: "🔒 2h full lock",
            4: "⛔ Permanent ban",
          };

          function fmtRemaining(ms: number, permanent: boolean): string {
            if (permanent) return "**Permanent**";
            if (ms <= 0) return "Expired";
            const totalMin = Math.ceil(ms / 60_000);
            if (totalMin < 60) return `${totalMin} min left`;
            const hr = Math.floor(totalMin / 60);
            const min = totalMin % 60;
            return min > 0 ? `${hr}h ${min}m left` : `${hr}h left`;
          }

          // Build a paginated embed — up to 15 users per page
          const PAGE_SIZE = 15;
          const pages = Math.ceil(list.length / PAGE_SIZE);
          let page = 0;

          function buildBanListEmbed(p: number): EmbedBuilder {
            const slice = list.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE);
            const lines = slice.map((e, idx) => {
              const label = LEVEL_LABELS[e.level] ?? `Level ${e.level}`;
              const timer = fmtRemaining(e.remainingMs, e.permanent);
              return `${p * PAGE_SIZE + idx + 1}. <@${e.userId}> — ${label} · ${timer}`;
            });
            return new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle(`🛡️ Anti-Troll Flagged Users (${list.length} total)`)
              .setDescription(lines.join("\n"))
              .setFooter({ text: `Page ${p + 1}/${pages} · Use ${guildPrefix}unblock @user to lift any restriction` });
          }

          if (pages === 1) {
            await message.reply({ embeds: [buildBanListEmbed(0)] });
            break;
          }

          // Multi-page with buttons
          const prevId = `banlist_prev_${message.id}`;
          const nextId = `banlist_next_${message.id}`;

          function buildPageRow(p: number) {
            return new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder().setCustomId(prevId).setLabel("◀").setStyle(ButtonStyle.Secondary).setDisabled(p === 0),
              new ButtonBuilder().setCustomId(nextId).setLabel("▶").setStyle(ButtonStyle.Secondary).setDisabled(p === pages - 1),
            );
          }

          const blReply = await message.reply({ embeds: [buildBanListEmbed(page)], components: [buildPageRow(page)] });

          const blCollector = blReply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: (i) => i.user.id === message.author.id,
            time: 120_000,
          });

          blCollector.on("collect", async (i) => {
            await i.deferUpdate();
            if (i.customId === nextId) page = Math.min(page + 1, pages - 1);
            else page = Math.max(page - 1, 0);
            await blReply.edit({ embeds: [buildBanListEmbed(page)], components: [buildPageRow(page)] });
          });

          blCollector.on("end", async () => {
            await blReply.edit({ components: [] }).catch(() => null);
          });
          break;
        }

        // ── Admin channel config ──────────────────────────────────────────────────
        case "admin": {
          const isAdmin =
            message.member?.permissions.has(PermissionFlagsBits.Administrator) ||
            message.member?.permissions.has(PermissionFlagsBits.ManageGuild);
          if (!isAdmin) {
            await message.reply("🔒 Only admins can use this command.");
            break;
          }
          const sub = (args[0] ?? "").toLowerCase();
          if (sub === "channel") {
            const guildId = message.guildId;
            if (!guildId) break;
            const reset = (args[1] ?? "").toLowerCase() === "reset";
            if (reset) {
              setAdminChannel(guildId, null);
              await message.reply("✅ Admin channel removed. Alerts will be sent in the current channel if needed.");
            } else {
              const ch = message.mentions.channels.first() ?? message.channel;
              setAdminChannel(guildId, ch.id);
              await message.reply(`✅ Admin alert channel set to <#${ch.id}>. Anti-troll alerts will be sent there.`);
            }
          } else {
            const chId = message.guildId ? getAdminChannelId(message.guildId) : null;
            const current = chId ? `<#${chId}>` : "*(not configured)*";
            await message.reply(
              `⚙️ **Admin channel:** ${current}\n` +
              `\`${guildPrefix}admin channel #salon\` — Set the alert channel\n` +
              `\`${guildPrefix}admin channel reset\` — Remove it`
            );
          }
          break;
        }

        // ── Profile ───────────────────────────────────────────────────────────────
        case "profile":
        case "profil": {
          const target = message.mentions.users.first() ?? message.author;
          const isSelf = target.id === message.author.id;

          const lang = getUserLang(isSelf ? message.author.id : target.id);
          const langLabel = USER_LANG_LABELS[lang] ?? "🇬🇧 English";

          const questData = getUserQuestData(target.id);
          const displayName = target.displayName ?? target.username;
          const level = questData?.levelNum ?? 1;

          // Expression & color evolve with level (DiceBear avataaars)
          const MII_FACES: Record<number, { mouth: string; eyes: string; eyebrows: string }> = {
            1: { mouth: "sad",     eyes: "cry",     eyebrows: "sadConcernedNatural"  },
            2: { mouth: "serious", eyes: "default",  eyebrows: "defaultNatural"       },
            3: { mouth: "default", eyes: "default",  eyebrows: "defaultNatural"       },
            4: { mouth: "smile",   eyes: "squint",   eyebrows: "defaultNatural"       },
            5: { mouth: "smile",   eyes: "happy",    eyebrows: "raisedExcited"        },
            6: { mouth: "twinkle", eyes: "happy",    eyebrows: "raisedExcited"        },
            7: { mouth: "twinkle", eyes: "happy",    eyebrows: "raisedExcitedNatural" },
            8: { mouth: "twinkle", eyes: "hearts",   eyebrows: "raisedExcited"        },
            9: { mouth: "twinkle", eyes: "hearts",   eyebrows: "raisedExcited"        },
          };
          const LEVEL_COLORS: Record<number, number> = {
            1: 0x7f8c8d, 2: 0x95a5a6,
            3: 0x3498db, 4: 0x2980b9,
            5: 0x2ecc71, 6: 0x27ae60,
            7: 0xf1c40f, 8: 0xe67e22,
            9: 0x9b59b6,
          };
          const face = MII_FACES[level] ?? MII_FACES[1]!;
          const embedColor = LEVEL_COLORS[level] ?? 0x9b59b6;

          const miiUrl = [
            `https://api.dicebear.com/9.x/avataaars/png`,
            `?seed=${target.id}`,
            `&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc`,
            `&radius=50&size=256`,
            `&mouth=${face.mouth}`,
            `&eyes=${face.eyes}`,
            `&eyebrows=${face.eyebrows}`,
          ].join("");

          const embed = new EmbedBuilder()
            .setTitle(`🎮 ${displayName}'s Profile`)
            .setColor(embedColor)
            .setThumbnail(miiUrl);

          if (questData) {
            // XP progress bar
            if (questData.progressBar && questData.nextThreshold !== null) {
              embed.setDescription(
                `\`[${questData.progressBar}]\` **${questData.totalPoints}** / ${questData.nextThreshold} XP`,
              );
            } else {
              embed.setDescription("🌌 **Max level reached! You are Transcendent!**");
            }
            embed.addFields(
              { name: "🏅 Level", value: `${questData.levelTitle} (Lv. ${questData.levelNum})`, inline: true },
              { name: "⚡ Total XP", value: `${questData.totalPoints} pts`, inline: true },
              { name: "\u200b", value: "\u200b", inline: true },
              { name: "✅ Quests done", value: `${questData.completedCount}`, inline: true },
              { name: "📋 Active", value: `${questData.activeCount}`, inline: true },
              { name: "\u200b", value: "\u200b", inline: true },
              { name: "💬 Reminder mode", value: questData.bullying ? "🔥 Bully mode" : "🕊️ Normal", inline: true },
              {
                name: "🔔 Reminders",
                value: questData.reminderActive
                  ? `Active (${questData.reminderHours.map(h => `${h}h`).join(", ")} UTC)`
                  : "Not configured",
                inline: true,
              },
              { name: "\u200b", value: "\u200b", inline: true },
            );
          } else {
            embed.setDescription("No quest data yet — start your journey with `!quest start`! 🚀");
          }

          embed.addFields(
            { name: "🌐 Language", value: langLabel, inline: true },
            {
              name: "📅 Member since",
              value: questData ? new Date(questData.createdAt).toLocaleDateString("en-GB") : "—",
              inline: true,
            },
          );

          embed.setFooter({ text: isSelf ? "Use !language [en|fr|es] to change your language" : `Viewing ${displayName}'s profile` });

          await message.reply({ embeds: [embed] });
          break;
        }

        // ── User language ─────────────────────────────────────────────────────────
        case "language":
        case "langue":
        case "lang":
        case "langage": {
          const input = args[0]?.toLowerCase();
          const currentLang = getUserLang(message.author.id);
          if (!input) {
            await message.reply(
              `🌐 Your current bot language: **${USER_LANG_LABELS[currentLang]}**\n` +
              `Change it with:\n` +
              `\`${guildPrefix}language en\` — 🇬🇧 English\n` +
              `\`${guildPrefix}language fr\` — 🇫🇷 Français\n` +
              `\`${guildPrefix}language es\` — 🇪🇸 Español`,
            );
            break;
          }
          if (!isValidUserLang(input)) {
            await message.reply(`❌ Invalid language. Use \`${guildPrefix}language en\`, \`fr\` or \`es\`.`);
            break;
          }
          if (input === currentLang) {
            await message.reply(`ℹ️ Your language is already set to **${USER_LANG_LABELS[input]}**.`);
            break;
          }
          setUserLang(message.author.id, input);
          await message.reply(`✅ Your bot language is now **${USER_LANG_LABELS[input]}**. Quests and AI replies will be in ${USER_LANG_NAMES[input]}.`);
          break;
        }

        // ── Server settings ───────────────────────────────────────────────────────
        case "server": {
          const sub = args[0]?.toLowerCase();
          if (sub === "language" || sub === "langue" || sub === "lang" || sub === "langage") {
            const guildId = message.guildId;
            if (!guildId) { await message.reply("❌ This command can only be used in a server."); break; }
            const langArg = args[1]?.toLowerCase();
            const currentGuildLang = getLang(guildId);
            const GUILD_LANG_LABELS: Record<string, string> = { en: "🇬🇧 English", fr: "🇫🇷 Français", es: "🇪🇸 Español" };
            if (!langArg) {
              await message.reply(
                `🌐 Server language: **${GUILD_LANG_LABELS[currentGuildLang] ?? currentGuildLang}**\n` +
                `*(Admin only)* Change it with:\n` +
                `\`${guildPrefix}server language en\` — 🇬🇧 English\n` +
                `\`${guildPrefix}server language fr\` — 🇫🇷 Français\n` +
                `\`${guildPrefix}server language es\` — 🇪🇸 Español`,
              );
              break;
            }
            const isAdmin =
              message.member?.permissions.has(PermissionFlagsBits.Administrator) ||
              message.member?.permissions.has(PermissionFlagsBits.ManageGuild);
            if (!isAdmin) { await message.reply("🔒 Only admins can change the server language. (**Manage Server** required)"); break; }
            if (!["en", "fr", "es"].includes(langArg)) {
              await message.reply(`❌ Invalid language. Use \`${guildPrefix}server language en\`, \`fr\` or \`es\`.`);
              break;
            }
            if (langArg === currentGuildLang) {
              await message.reply(`ℹ️ Server language is already **${GUILD_LANG_LABELS[langArg] ?? langArg}**.`);
              break;
            }
            setLang(guildId, langArg as GuildLang);
            await message.reply(`✅ Server language set to **${GUILD_LANG_LABELS[langArg] ?? langArg}**. The \`!help\` menu will now default to this language.`);
          } else {
            await message.reply(`❓ Unknown server command. Try \`${guildPrefix}server language [en|fr|es]\`.`);
          }
          break;
        }

        // ── Help ─────────────────────────────────────────────────────────────────
        case "help":
        case "aide": {
          const arg0 = (args[0] ?? "").toLowerCase();
          const arg1 = (args[1] ?? "").toLowerCase();

          // Owner-only guide — !help Maxim3kun
          if (arg0 === "maxim3kun") {
            if (message.author.username.toLowerCase() !== "maxim3kun") {
              await message.reply("🔒 Commande réservée.");
              break;
            }
            const ownerEmbed = new EmbedBuilder()
              .setTitle("👑 Commandes Owner — Maxim3kun")
              .setColor(0xf1c40f)
              .setDescription("Commandes exclusives, visibles uniquement par toi.")
              .addFields(
                {
                  name: "🔧 Diagnostic & Statut",
                  value:
                    `\`${guildPrefix}status\` — Statut complet du bot (RAM, MongoDB, Groq, Suno…)\n` +
                    `\`${guildPrefix}yt-test\` — Teste les cookies YouTube & yt-dlp en live`,
                  inline: false,
                },
                {
                  name: "🛡️ Modération",
                  value:
                    `\`${guildPrefix}unblock @user\` — Débloque un utilisateur\n` +
                    `\`${guildPrefix}banlist\` — Liste des utilisateurs bloqués\n` +
                    `\`${guildPrefix}admin channel #salon\` — Définit le salon de notifs admin`,
                  inline: false,
                },
                {
                  name: "📻 Radios custom",
                  value:
                    `\`${guildPrefix}radio add <clé> <nom> <url>\` — Ajoute une station\n` +
                    `\`${guildPrefix}radio remove <clé>\` — Supprime une station custom`,
                  inline: false,
                },
                {
                  name: "🎨 Logo Brands (admin)",
                  value:
                    `\`${guildPrefix}logo test\` — Lance les tests OCR sur les logos\n` +
                    `\`${guildPrefix}logo approve <domain>\` — Approuve manuellement un logo\n` +
                    `\`${guildPrefix}logo exclude <domain>\` — Exclut manuellement un logo`,
                  inline: false,
                },
                {
                  name: "⚙️ Serveur",
                  value:
                    `\`${guildPrefix}prefix <nouveau>\` — Change le préfixe\n` +
                    `\`${guildPrefix}server language [en|fr|es]\` — Langue par défaut\n` +
                    `\`${guildPrefix}voicechannels <id1> <id2>\` — Salons vocaux du picker`,
                  inline: false,
                },
              )
              .setFooter({ text: "Ces commandes ne sont pas listées dans !help public." });
            await message.reply({ embeds: [ownerEmbed] });
            break;
          }

          // Admin commands guide — !help admin
          if (arg0 === "admin") {
            await sendAdminGuide(message, guildPrefix);
            break;
          }

          // Setup guide (API keys) — !help setup
          if (arg0 === "setup") {
            await sendSetupGuide(message);
            break;
          }

          // Plain `!help`, `!help fr`, `!help es` → paginated 4-page help
          if (!arg0 || arg0 === "fr" || arg0 === "es" || arg0 === "en") {
            const helpLang: HelpLanguage = arg0 === "fr" ? "fr" : arg0 === "es" ? "es" : "en";
            await sendPaginatedHelp(message, helpLang);
            break;
          }

          // Topic-specific help
          const detected = detectTopicAndLang(arg0, arg1 || undefined);
          if (detected) {
            if (detected.topic === "guesslogo" && !message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
              await message.reply({ content: "🔒 La page `!help guesslogo` est réservée aux modérateurs (permission **Manage Server** requise).", ephemeral: true } as Parameters<typeof message.reply>[0]);
              break;
            }
            await message.reply({ embeds: [buildTopicEmbed(detected.topic, detected.lang, guildPrefix)] });
          } else {
            await sendPaginatedHelp(message, "en");
          }
          break;
        }

        default: {
          // Direct radio station shortcut — e.g. !nrj, !heart, !kexp
          if (command && command in RADIO_STATIONS) {
            await playRadio(message, command);
            break;
          }

          // Compound station shortcut — e.g. !rock es → rock_es, !cadena 100 → cadena100
          if (command && args[0]) {
            const compound = `${command}_${args[0].toLowerCase()}`;
            if (compound in RADIO_STATIONS) {
              await playRadio(message, compound);
              break;
            }
          }

          // If command matches a known artist in the cache, treat as a music search
          if (command && isKnownArtist(command)) {
            await searchAndQueue(message, args.length > 0 ? `${command} ${args.join(" ")}` : command);
            break;
          }

          // Unknown command + args → treat as a YouTube music search (e.g. !Gims ninao)
          if (command && args.length > 0) {
            await searchAndQueue(message, `${command} ${args.join(" ")}`);
            break;
          }

          // Fuzzy command suggestion (with opt-in preference per user)
          if (!command) break;

          await handleUnknownCommand(message, command, guildPrefix, async (match) => {
            switch (match.cmd) {
              case "hello":
                await message.reply(`Hello ${message.author.displayName}! 👋 Great to see you here! How are you doing? 😊`);
                break;
              case "say": {
                const text = args.join(" ");
                if (!text) { await message.reply("❓ Tell me what to say! e.g. `!say Hello everyone`"); break; }
                await message.delete().catch(() => null);
                if (isSendable(message.channel)) await message.channel.send(text);
                break;
              }
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
              case "encouragement": {
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
                const question = args.join(" ");
                if (!question) { await message.reply("🎱 Ask me a question! e.g. `!8ball Will today be a good day?`"); break; }
                await message.reply(`🎱 **Question:** ${question}\n**Answer:** ${getRandom(EIGHT_BALL_RESPONSES)}`);
                break;
              }
              case "dice": {
                const faces = parseInt(args[0] ?? "6");
                const nb = isNaN(faces) || faces < 2 ? 6 : Math.min(faces, 1000);
                await message.reply(`🎲 You rolled a ${nb}-sided die and got: **${Math.floor(Math.random() * nb) + 1}**!`);
                break;
              }
              case "conspiracy":
                await message.reply(`🕵️ Type \`${guildPrefix}conspiracy ${args.join(" ")}\` to generate a theory!`);
                break;
              case "minesweeper": {
                const board = playMinesweeper(message, args[0]?.toLowerCase());
                if (board) await message.reply(board);
                break;
              }
              case "geo":
                playGeoguessr(message, (["easy","medium","hard"].includes(args[0] ?? "") ? args[0] : "easy") as "easy" | "medium" | "hard")
                  .catch(() => null);
                break;
              case "trivia":
                if (!openai) { await message.reply("❌ AI features not configured. Use `!mode d'emploi` for instructions."); break; }
                playTrivia(message, openai).catch(() => null);
                break;
              case "guessnumber":
                playGuessNumber(message).catch(() => null);
                break;
              case "connect4":
                await playConnect4(message, args);
                break;
              case "guessthelogo":
              case "guesslogo":
              case "devinelelogo": {
                const logoSub = args[0]?.toLowerCase();
                if (logoSub === "stop") {
                  if (isLogoActive(message.channelId)) { stopGuessLogo(message.channelId); await message.reply("🏳️ Logo game abandoned!"); }
                  else { await message.reply("🤷 No logo game in progress."); }
                } else {
                  const ld = logoSub && ["easy","medium","hard"].includes(logoSub) ? logoSub : "easy";
                  playGuessLogo(message, ld).catch(() => null);
                }
                break;
              }
              case "logo": {
                const lSub = args[0]?.toLowerCase();
                const lArg = args[1]?.toLowerCase();
                if (lSub === "stats") {
                  const s = getStoreStats();
                  const embed = new EmbedBuilder()
                    .setTitle("🏷️ Logo Brand Store — Stats")
                    .setColor(0x5865f2)
                    .addFields(
                      { name: "Total", value: `**${s.total}**`, inline: true },
                      { name: "Tested", value: `**${s.tested}** / ${s.total}`, inline: true },
                      { name: "Untested", value: `**${s.untested}**`, inline: true },
                      { name: "✅ Approved", value: `**${s.approved}**`, inline: true },
                      { name: "📝 Text logos", value: `**${s.textLogos}**`, inline: true },
                      { name: "❌ Invalid", value: `**${s.invalid}**`, inline: true },
                    );
                  await message.reply({ embeds: [embed] });
                } else if (lSub === "test" && (lArg === "start" || lArg === "all")) {
                  if (!message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) { await message.reply("🔒 Manage Server required."); break; }
                  if (isTestingRunning()) { await message.reply("⏳ Test already running. Use `!logo test status`."); break; }
                  const token = process.env["LOGO_DEV_PUBLIC_KEY"] ?? process.env["LOGO_DEV_TOKEN"] ?? "";
                  startLogoTestingJob(token, lArg === "all");
                  const s2 = getStoreStats();
                  const n = lArg === "all" ? s2.total : s2.untested;
                  await message.reply(`🔬 Testing **${n}** brands in background. Use \`!logo test status\` to follow progress.`);
                } else if (lSub === "test" && lArg === "status") {
                  const p = getTestingProgress();
                  const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
                  await message.reply(p.total === 0
                    ? "💤 No test job run yet."
                    : `🔬 ${p.running ? "Running" : "Last run"}: **${pct}%** (${p.done}/${p.total}) — ✅ ${p.approved} approved, 📝 ${p.textLogos} text, ❌ ${p.invalid} invalid`);
                } else if (lSub === "fetch") {
                  if (!message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) { await message.reply("🔒 Manage Server required."); break; }
                  const token = process.env["LOGO_DEV_PUBLIC_KEY"] ?? process.env["LOGO_DEV_TOKEN"] ?? "";
                  if (!token) { await message.reply("❌ `LOGO_DEV_PUBLIC_KEY` is not set. Ask a moderator to configure it."); break; }
                  const statusMsg = await message.reply(
                    `🔍 Searching logos across **36 categories** on logo.dev...\n` +
                    `This fetches all discoverable brands and saves them to the database. Please wait (~30s).`,
                  );
                  // Run in background — uses the existing loadDynamicBrands pipeline
                  (async () => {
                    try {
                      const before = getStoreStats();
                      // Fetch all brands from logo.dev across 36 search terms
                      const discovered = await loadDynamicBrands(token);
                      let added = 0;
                      let skipped = 0;
                      for (const brand of discovered) {
                        const result = await addBrandToStore({
                          domain: brand.domain,
                          name: brand.name,
                          tier: brand.tier,
                          aliases: brand.aliases,
                          category: brand.category,
                          country: brand.country,
                          hints: brand.hints,
                        });
                        if (result.ok) added++;
                        else skipped++;
                      }
                      const after = getStoreStats();
                      // Kick off OCR validation for newly added logos
                      if (added > 0 && !isTestingRunning()) {
                        startLogoTestingJob(token, false);
                      }
                      await statusMsg.edit(
                        `✅ **Logo fetch complete!**\n` +
                        `• **${discovered.length}** brands discovered from logo.dev\n` +
                        `• **${added}** new brands added to the store\n` +
                        `• **${skipped}** already existed (skipped)\n` +
                        `• Store: **${after.total}** total (was ${before.total}) — **${after.approved}** approved\n` +
                        (added > 0 ? `• 🔬 OCR validation started automatically — use \`!logo test status\` to track.` : ""),
                      );
                    } catch (err) {
                      logger.error({ err }, "Logo fetch job failed");
                      await statusMsg.edit("❌ Logo fetch failed. Check that `LOGO_DEV_PUBLIC_KEY` is valid and try again.").catch(() => null);
                    }
                  })().catch(() => null);
                } else {
                  await message.reply("`!logo stats` • `!logo fetch` • `!logo test start` • `!logo test all` • `!logo test status`");
                }
                break;
              }
              case "music":
                await message.reply(`🎵 Usage: \`${guildPrefix}music generator <description>\`\nExemple : \`${guildPrefix}music generator lo-fi chill beats\``);
                break;
              case "credits": {
                const credEmbed = new EmbedBuilder()
                  .setTitle("✨ Project Credits")
                  .setColor(0x5865f2)
                  .setDescription("This bot wouldn't exist without these technologies and people. Thank you all! 🙏")
                  .addFields(
                    { name: "👨‍💻 Creator", value: "**Maxime** — Design, development & ideas", inline: false },
                    { name: "🧠 AI Assistants", value: "**Claude** — Suggestions & problem-solving\n**ChatGPT** — Creative vision", inline: false },
                    { name: "🤖 Artificial Intelligence", value: "**Meta LLaMA** — AI model (via Groq)\n**Suno AI** — Music generation", inline: false },
                    { name: "🔊 Voice & Images", value: "**Google Translate** — Text-to-speech (free TTS)\n**HuggingFace / FLUX** — Image generation", inline: false },
                    { name: "🚀 Infrastructure", value: "**Railway** — Hosting & deployment\n**Replit** — Development environment", inline: false },
                    { name: "🛠️ Technologies", value: "**discord.js** — Discord API\n**Node.js + TypeScript** — Runtime & language", inline: false },
                  )
                  .setFooter({ text: "Made with ❤️ by Maxime • www.maximeGPT.com" });
                await message.reply({ embeds: [credEmbed] });
                break;
              }
              case "balance":
                if (!process.env["SUNO_API_KEY"]) { await message.reply("❌ Suno not configured."); break; }
                try {
                  const bal = await getCredits();
                  const balEmbed = new EmbedBuilder()
                    .setColor(bal > 10 ? 0x57f287 : bal > 0 ? 0xfee75c : 0xed4245)
                    .setTitle("💳 Suno Credits")
                    .addFields({ name: "Remaining credits", value: `${bal}`, inline: true })
                    .setFooter({ text: "Each generation consumes credits from sunoapi.org" });
                  await message.reply({ embeds: [balEmbed] });
                } catch (err) {
                  await message.reply(`❌ Could not fetch credits: ${String(err)}`);
                }
                break;
              case "radio":
                await playRadio(message, args.join(" ") || "list");
                break;
              case "youtube": {
                if (args[0]?.toLowerCase() === "search") {
                  await searchAndQueue(message, args.slice(1).join(" "));
                } else {
                  await playYoutube(message, args.join(" "));
                }
                break;
              }
              case "live": {
                await playLive(message, args.join(" "));
                break;
              }
              case "skip":
                await skipYoutube(message);
                break;
              case "voteskip":
                await startVoteSkip(message);
                break;
              case "queue": {
                if (!message.guildId) break;
                const qEmbed = getQueueEmbed(message.guildId);
                if (!qEmbed) await message.reply("🔇 The queue is empty. Use `!youtube <url>` to add tracks.");
                else await message.reply({ embeds: [qEmbed] });
                break;
              }
              case "np": {
                if (!message.guildId) break;
                const npEmbed = nowPlaying(message.guildId);
                if (!npEmbed) await message.reply("🔇 Nothing is currently playing.");
                else await message.reply({ embeds: [npEmbed] });
                break;
              }
              case "join":
                await joinVoice(message);
                break;
              case "leave":
                await leaveVoice(message);
                break;
              case "voice":
                await message.reply(`❓ Use \`${guildPrefix}voice say <text>\`, \`${guildPrefix}voice stop\` or \`${guildPrefix}voice resume\`.`);
                break;
              case "subtitles":
                await toggleSubtitles(message);
                break;
              case "karaoke":
                if (!message.guildId) break;
                await startKaraoke(message, args.join(" ").trim());
                break;
              case "shazam":
                await shazam(message);
                break;
              case "playlist":
                await message.reply(`📁 Usage: \`${guildPrefix}playlist add <nom> <url>\` · \`${guildPrefix}playlist play <nom>\` · \`${guildPrefix}playlist list\``);
                break;
              case "ai":
                await message.reply(`🤖 Usage: \`${guildPrefix}ai battle <sujet>\` · \`${guildPrefix}ai stop\``);
                break;
              case "image":
                await message.reply("🖼️ Use the slash command `/image <description>` to generate an image.");
                break;
              case "help":
                await sendPaginatedHelp(message, "en");
                break;
              case "guide":
                await sendModeratorGuide(message);
                break;
              case "birthday":
                await handleBirthday(message, args);
                break;
              case "poll":
                await message.reply(`📊 Usage: \`${guildPrefix}poll Question | Option 1 | Option 2 | ...\``);
                break;
              case "quest":
                await message.reply(`⚔️ Usage: \`${guildPrefix}quest\` · \`${guildPrefix}quest list\` · \`${guildPrefix}quest done <n>\` · \`${guildPrefix}quest profile\``);
                break;
              case "prefix":
                await message.reply(`⚙️ Current prefix: \`${guildPrefix}\` · Change: \`${guildPrefix}prefix <new>\` (admin only)`);
                break;
              case "suggest":
              case "suggestion":
              case "sugerencia": {
                const current = getSuggestPref(message.author.id);
                const status  = current === true ? "**on** ✅" : current === false ? "**off** 🔕" : "**not set yet**";
                await message.reply(
                  `💡 Command suggestions are currently ${status}.\n` +
                  `➤ \`${guildPrefix}suggest on\` — enable\n` +
                  `➤ \`${guildPrefix}suggest off\` — disable`,
                );
                break;
              }
              default:
                await message.reply(`❓ Use \`${guildPrefix}help\` to see all available commands.`);
            }
          });
          break;
        }

        // ── New commands (beta) ───────────────────────────────────────────────
        case "new": {
          await handleNewCommand(message, args, guildPrefix);
          break;
        }

      }
    } catch (err) {
      logger.error({ err, command }, "Command error");
    }
  });

  client.once("clientReady", () => {
    startBirthdayScheduler(client);
    startQuestReminders(client, openai);
    if (client.user) {
      registerSlashCommands(client.user.id, token)
        .catch((err) => logger.error({ err }, "Slash command registration failed"));
      setBotStats({
        guildCount: client.guilds.cache.size,
        botTag: client.user.tag,
        botAvatarUrl: client.user.displayAvatarURL({ size: 256 }),
        botId: client.user.id,
      });
    }
  });

  // ── Website scroll button interactions ──────────────────────────────────────
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("website_goto_")) return;
    const newIndex = parseInt(interaction.customId.replace("website_goto_", ""), 10);
    if (isNaN(newIndex) || newIndex < 0 || newIndex >= WEBSITE_SECTIONS.length) return;
    await interaction.update(buildWebsiteMessage(newIndex));
  });

  client.on("guildCreate", () => setBotStats({ guildCount: client.guilds.cache.size }));
  client.on("guildDelete", () => setBotStats({ guildCount: client.guilds.cache.size }));

  client.login(token).catch((err) => {
    logger.error({ err }, "Failed to connect to Discord");
  });
}
