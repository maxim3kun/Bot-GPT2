import { EmbedBuilder, type Message, type MessageReaction, type User, type ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
import { getPrefix } from "./prefix-store.js";

// ── Help system (4 pages) ─────────────────────────────────────────────────────

export type HelpLanguage = "en" | "fr" | "es";
export type HelpPage = 1 | 2 | 3 | 4;
export const HELP_PAGE_REACTIONS = ["⬅️", "➡️"];

export function buildHelpEmbed(lang: HelpLanguage, page: HelpPage, prefix = "!"): EmbedBuilder {
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

export type HelpTopic = "general" | "games" | "music" | "radio" | "youtube" | "quest" | "levels" | "voice" | "ai" | "birthday" | "guesslogo";

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function detectTopicAndLang(arg0: string, arg1?: string): { topic: HelpTopic; lang: HelpLanguage } | null {
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

export function buildTopicEmbed(topic: HelpTopic, lang: HelpLanguage, prefix = "!"): EmbedBuilder {
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

// ── Paginated help ────────────────────────────────────────────────────────────

export async function sendPaginatedHelp(message: Message, lang: HelpLanguage): Promise<void> {
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

export async function sendPaginatedHelpSlash(interaction: ChatInputCommandInteraction, lang: HelpLanguage): Promise<void> {
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

export async function sendSetupGuide(message: Message): Promise<void> {
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
      { name: "🤖 `DISCORD_TOKEN`", value: "**Required** — Main bot token.\nGet it at **discord.com/developers/applications** → Your App → Bot → Reset Token.", inline: false },
      { name: "🧠 `GROQ_API_KEY`", value: "Enables AI features: `@mention` chat, DMs, `!conspiracy`, `!trivia`, `!ai battle`, voice AI.\nGet it **free** at **console.groq.com** → API Keys.", inline: false },
      { name: "🎵 `SUNO_API_KEY`", value: "Enables `!music generator` and `!credits`.\nGet it at **sunoapi.org** → API Key.", inline: false },
      { name: "🖼️ `HUGGINGFACE_TOKEN`", value: "Enables `!image` and `/image` (AI image generation).\nGet it **free** at **huggingface.co/settings/tokens** → New Token (Read).", inline: false },
      { name: "🎤 `AUDD_API_KEY`", value: "Enables `!shazam` song identification.\nGet it **free** at **audd.io** → sign up → copy your API token.", inline: false },
      { name: "🤖2️ `DISCORD_TOKEN_2`", value: "Enables `!ai battle` (requires a second Discord bot).\nCreate a second app at **discord.com/developers/applications**, add a bot, and copy its token.", inline: false },
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

export async function sendAdminGuide(message: Message, guildPrefix: string): Promise<void> {
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
