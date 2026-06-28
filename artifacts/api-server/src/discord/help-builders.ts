import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type Message,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getPrefix } from "./prefix-store.js";

// ── Types ──────────────────────────────────────────────────────────────────────

export type HelpLanguage = "en" | "fr" | "es" | "de" | "pt" | "it";
export type HelpPage = 1 | 2 | 3 | 4 | 5;
export const HELP_TOTAL_PAGES = 5;

// ── Language helpers ──────────────────────────────────────────────────────────

const L = {
  title:    { en: "📖 Bot Help",        fr: "📖 Aide du bot",     es: "📖 Ayuda del bot",    de: "📖 Bot-Hilfe",       pt: "📖 Ajuda do bot",    it: "📖 Guida del bot"    },
  footer:   { en: "Page",               fr: "Page",               es: "Página",              de: "Seite",              pt: "Página",             it: "Pagina"              },
  nav:      { en: "Use buttons to navigate  •  !help <command> for details",
               fr: "Navigue avec les boutons  •  !help <commande> pour les détails",
               es: "Navega con los botones  •  !help <comando> para detalles",
               de: "Navigiere mit den Tasten  •  !help <Befehl> für Details",
               pt: "Navegue com os botões  •  !help <comando> para detalhes",
               it: "Naviga con i pulsanti  •  !help <comando> per i dettagli" },
  prev:     { en: "⬅️ Prev", fr: "⬅️ Préc.", es: "⬅️ Ant.", de: "⬅️ Zurück", pt: "⬅️ Ant.", it: "⬅️ Prec." },
  next:     { en: "Next ➡️", fr: "Suiv. ➡️", es: "Sig. ➡️",  de: "Weiter ➡️", pt: "Próx. ➡️", it: "Succ. ➡️" },
  expired:  { en: "Expired · Run !help again", fr: "Expirée · Relance !help", es: "Expirada · Usa !help de nuevo",
               de: "Abgelaufen · !help erneut eingeben", pt: "Expirada · Use !help novamente", it: "Scaduta · Usa !help di nuovo" },
} as const;

function t<K extends keyof typeof L>(key: K, lang: HelpLanguage): string {
  return (L[key] as Record<string, string>)[lang] ?? (L[key] as Record<string, string>)["en"] ?? "";
}

const COLORS: Record<HelpLanguage, number> = {
  en: 0x1abc9c, fr: 0x5865f2, es: 0xe74c3c, de: 0xf1c40f, pt: 0x2ecc71, it: 0xe67e22,
};

// ── Nav row ───────────────────────────────────────────────────────────────────

function buildNavRow(page: HelpPage, lang: HelpLanguage, disabled = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("help_prev").setLabel(t("prev", lang)).setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    new ButtonBuilder().setCustomId("help_next").setLabel(t("next", lang)).setStyle(ButtonStyle.Primary).setDisabled(disabled),
  );
}

// ── Page builder ──────────────────────────────────────────────────────────────

export function buildHelpEmbed(lang: HelpLanguage, page: HelpPage, prefix = "!"): EmbedBuilder {
  const p = prefix;
  const embed = new EmbedBuilder()
    .setTitle(t("title", lang))
    .setColor(COLORS[lang])
    .setFooter({ text: `${t("footer", lang)} ${page}/${HELP_TOTAL_PAGES}  •  ${t("nav", lang)}` });

  // ── Page 1 — General & Fun ─────────────────────────────────────────────────
  if (page === 1) {
    const desc = { en: "General, fun & birthdays.", fr: "Général, fun & anniversaires.", es: "General, diversión & cumpleaños.", de: "Allgemein, Spaß & Geburtstage.", pt: "Geral, diversão & aniversários.", it: "Generale, divertimento & compleanni." };
    embed.setDescription(desc[lang]);
    embed.addFields(
      {
        name: { en: "🌐 General", fr: "🌐 Général", es: "🌐 General", de: "🌐 Allgemein", pt: "🌐 Geral", it: "🌐 Generale" }[lang] ?? "🌐 General",
        value: [
          `\`${p}say\` · \`${p}hello\` · \`${p}poll\` · \`${p}profile\``,
          `\`@bot <msg>\` 🤖  \`${p}image <desc>\` 🎨`,
          `\`${p}language [en|fr|es|de|pt|it]\` — ` + { en: "Change your language", fr: "Changer ta langue", es: "Cambiar idioma", de: "Sprache ändern", pt: "Mudar idioma", it: "Cambiare lingua" }[lang],
        ].join("\n"),
      },
      {
        name: { en: "🎉 Fun", fr: "🎉 Fun", es: "🎉 Diversión", de: "🎉 Spaß", pt: "🎉 Diversão", it: "🎉 Divertimento" }[lang] ?? "🎉 Fun",
        value: [
          `\`${p}joke\` 😄  \`${p}compliment\` 💖  \`${p}hug\` 🤗  \`${p}encouragement\` 💪`,
          `\`${p}8ball <q>\` 🎱  \`${p}dice [N]\` 🎲  \`${p}conspiracy [topic]\` 🕵️`,
          `> ` + { en: "Append language code: `!joke fr`, `!joke de`, `!joke it`…", fr: "Ajoute le code langue : `!joke fr`, `!joke de`, `!joke it`…", es: "Añade código de idioma: `!joke fr`, `!joke de`, `!joke it`…", de: "Sprachkürzel anhängen: `!joke fr`, `!joke de`, `!joke it`…", pt: "Adicione o código do idioma: `!joke fr`, `!joke de`, `!joke it`…", it: "Aggiungi il codice lingua: `!joke fr`, `!joke de`, `!joke it`…" }[lang],
        ].join("\n"),
      },
      {
        name: { en: "🎂 Birthdays", fr: "🎂 Anniversaires", es: "🎂 Cumpleaños", de: "🎂 Geburtstage", pt: "🎂 Aniversários", it: "🎂 Compleanni" }[lang] ?? "🎂 Birthdays",
        value: `\`${p}birthday add DD/MM\` · \`${p}birthday list\` · \`${p}birthday remove\``,
      },
    );

  // ── Page 2 — Games & Tools ─────────────────────────────────────────────────
  } else if (page === 2) {
    const desc = { en: "Mini-games & handy tools.", fr: "Mini-jeux & outils pratiques.", es: "Mini-juegos & herramientas.", de: "Mini-Spiele & Werkzeuge.", pt: "Mini-jogos & ferramentas.", it: "Mini-giochi & strumenti." };
    embed.setDescription(desc[lang]);
    embed.addFields(
      {
        name: { en: "🎮 Games", fr: "🎮 Jeux", es: "🎮 Juegos", de: "🎮 Spiele", pt: "🎮 Jogos", it: "🎮 Giochi" }[lang] ?? "🎮 Games",
        value: [
          `\`${p}minesweeper\` 💣  \`${p}geo\` 🌍  \`${p}trivia\` 🧠  \`${p}guessnumber\` 🎯`,
          `\`${p}connect4 solo|@user\` 🔴🟡  \`${p}guessthelogo\` 🏷️`,
          `> ` + { en: "All support `easy|medium|hard`  •  `!help games` for details", fr: "Tous supportent `easy|medium|hard`  •  `!help jeux` pour les détails", es: "Todos soportan `easy|medium|hard`  •  `!help juegos` para detalles", de: "Alle unterstützen `easy|medium|hard`  •  `!help spiele` für Details", pt: "Todos suportam `easy|medium|hard`  •  `!help jogos` para detalhes", it: "Tutti supportano `easy|medium|hard`  •  `!help giochi` per dettagli" }[lang],
        ].join("\n"),
      },
      {
        name: { en: "🔍 Tools", fr: "🔍 Outils", es: "🔍 Herramientas", de: "🔍 Werkzeuge", pt: "🔍 Ferramentas", it: "🔍 Strumenti" }[lang] ?? "🔍 Tools",
        value: [
          `\`${p}define <word>\` 📖  \`${p}pokemon <name>\` 🔴  \`${p}qr <text>\` 📷`,
          `\`${p}echo\` 🦜  \`${p}food\` 🥗  \`${p}shazam\` 🎵`,
          `> ` + { en: "`!help <tool>` for details", fr: "`!help <outil>` pour les détails", es: "`!help <herramienta>` para detalles", de: "`!help <Werkzeug>` für Details", pt: "`!help <ferramenta>` para detalhes", it: "`!help <strumento>` per i dettagli" }[lang],
        ].join("\n"),
      },
    );

  // ── Page 3 — Music & Voice ─────────────────────────────────────────────────
  } else if (page === 3) {
    const desc = { en: "Music, radio, DJ & voice.", fr: "Musique, radio, DJ & vocal.", es: "Música, radio, DJ & voz.", de: "Musik, Radio, DJ & Sprache.", pt: "Música, rádio, DJ & voz.", it: "Musica, radio, DJ & voce." };
    embed.setDescription(desc[lang]);
    embed.addFields(
      {
        name: { en: "🎵 YouTube & Queue", fr: "🎵 YouTube & File", es: "🎵 YouTube & Cola", de: "🎵 YouTube & Warteschlange", pt: "🎵 YouTube & Fila", it: "🎵 YouTube & Coda" }[lang] ?? "🎵 YouTube & Queue",
        value: [
          `\`${p}y <query>\` · \`${p}play <url>\` · \`${p}np\` · \`${p}skip\` · \`${p}queue\``,
          `\`${p}like\` ❤️  \`${p}likes\` 📋  \`${p}playlist add|play|list\``,
        ].join("\n"),
      },
      {
        name: "🎛️ DJ Console",
        value: `\`${p}dj\` — ` + { en: "Interactive mixing table with buttons", fr: "Table de mixage interactive avec boutons", es: "Mesa de mezclas interactiva con botones", de: "Interaktiver Mixer mit Buttons", pt: "Mesa de mixagem interativa com botões", it: "Tavolo di mixaggio interattivo con pulsanti" }[lang],
      },
      {
        name: { en: "📻 Radio", fr: "📻 Radio", es: "📻 Radio", de: "📻 Radio", pt: "📻 Rádio", it: "📻 Radio" }[lang] ?? "📻 Radio",
        value: [
          `\`${p}radio list\` · \`${p}radio <name>\` · \`${p}radio leave\``,
          `> ` + { en: "e.g. `!radio nrj`, `!radio jazz`, `!radio groove`", fr: "ex. `!radio nrj`, `!radio fun`, `!radio fip`", es: "ej. `!radio los40`, `!radio hiphop`", de: "z.B. `!radio kexp`, `!radio jazz`, `!radio groove`", pt: "ex. `!radio groove`, `!radio jazz`", it: "es. `!radio jazz`, `!radio classicfm`" }[lang],
        ].join("\n"),
      },
      {
        name: "🎤 Karaoke",
        value: `\`${p}karaoke <artist song>\` · \`${p}karaoke stop\``,
      },
      {
        name: "🎵 Suno AI",
        value: `\`${p}music generator <prompt>\` · \`${p}music prompt\` · \`${p}balance\``,
      },
    );

  // ── Page 4 — Voice & Server ────────────────────────────────────────────────
  } else if (page === 4) {
    const desc = { en: "Voice, welcome & scheduling.", fr: "Vocal, bienvenue & planification.", es: "Voz, bienvenida & programación.", de: "Sprache, Willkommen & Planung.", pt: "Voz, boas-vindas & agendamento.", it: "Voce, benvenuto & pianificazione." };
    embed.setDescription(desc[lang]);
    embed.addFields(
      {
        name: { en: "🎙️ Voice", fr: "🎙️ Vocal", es: "🎙️ Voz", de: "🎙️ Sprache", pt: "🎙️ Voz", it: "🎙️ Voce" }[lang] ?? "🎙️ Voice",
        value: [
          `\`${p}join\` 🔊 · \`${p}leave\` 👋 · \`${p}subtitles\` 📝`,
          `\`${p}voice say <text>\` 🗣️ · \`${p}voice stop\` · \`${p}voice resume\``,
        ].join("\n"),
      },
      {
        name: { en: "👋 Welcome", fr: "👋 Bienvenue", es: "👋 Bienvenida", de: "👋 Willkommen", pt: "👋 Boas-vindas", it: "👋 Benvenuto" }[lang] ?? "👋 Welcome",
        value: [
          `\`${p}welcome set #channel\` · \`${p}welcome msg <text>\` · \`${p}welcome status\``,
          `> ` + { en: "Variables: `{user}` `{server}` `{count}`", fr: "Variables : `{user}` `{server}` `{count}`", es: "Variables: `{user}` `{server}` `{count}`", de: "Variablen: `{user}` `{server}` `{count}`", pt: "Variáveis: `{user}` `{server}` `{count}`", it: "Variabili: `{user}` `{server}` `{count}`" }[lang],
        ].join("\n"),
      },
      {
        name: { en: "⏰ Schedule", fr: "⏰ Planification", es: "⏰ Programación", de: "⏰ Planung", pt: "⏰ Agendamento", it: "⏰ Pianificazione" }[lang] ?? "⏰ Schedule",
        value: `\`${p}schedule set HH:MM #ch <msg>\` · \`${p}schedule daily HH:MM #ch <msg>\`\n\`${p}schedule list\` · \`${p}schedule cancel <ID>\``,
      },
    );

  // ── Page 5 — AI, Quests & Admin ────────────────────────────────────────────
  } else {
    const desc = { en: "AI, quests & administration.", fr: "IA, quêtes & administration.", es: "IA, misiones & administración.", de: "KI, Quests & Administration.", pt: "IA, missões & administração.", it: "IA, missioni & amministrazione." };
    embed.setDescription(desc[lang]);
    embed.addFields(
      {
        name: { en: "🤖 AI", fr: "🤖 IA", es: "🤖 IA", de: "🤖 KI", pt: "🤖 IA", it: "🤖 IA" }[lang] ?? "🤖 AI",
        value: [
          `\`@bot <msg>\` — ` + { en: "Chat with AI (also in DMs)", fr: "Chat IA (aussi en DM)", es: "Chat IA (también en DM)", de: "KI-Chat (auch in DMs)", pt: "Chat com IA (também em DMs)", it: "Chat con IA (anche in DM)" }[lang],
          `\`${p}ai battle <topic>\` ⚔️ · \`${p}ai stop\` · \`${p}conspiracy [topic]\` 🕵️`,
        ].join("\n"),
      },
      {
        name: { en: "🎯 Quests & Levels", fr: "🎯 Quêtes & Niveaux", es: "🎯 Misiones & Niveles", de: "🎯 Quests & Level", pt: "🎯 Missões & Níveis", it: "🎯 Missioni & Livelli" }[lang] ?? "🎯 Quests",
        value: [
          `\`${p}quest start\` · \`${p}quest list\` · \`${p}quest done <N>\` · \`${p}quest done all\``,
          `\`${p}quest profile\` · \`${p}quest stats\` · \`${p}quest remind\` · \`${p}quest reset\``,
          `> \`${p}help quest\` ` + { en: "for full details", fr: "pour les détails", es: "para detalles", de: "für Details", pt: "para detalhes", it: "per i dettagli" }[lang],
        ].join("\n"),
      },
      {
        name: { en: "🔧 Admin", fr: "🔧 Admin", es: "🔧 Admin", de: "🔧 Admin", pt: "🔧 Admin", it: "🔧 Admin" }[lang] ?? "🔧 Admin",
        value: [
          `\`${p}help admin\` · \`${p}setup\``,
          `\`${p}server language [en|fr|es|de|pt|it]\``,
          `\`${p}prefix <char>\` · \`${p}welcome set\` · \`${p}schedule\``,
        ].join("\n"),
      },
    );
  }

  // Replace prefix
  if (prefix !== "!") {
    for (const f of embed.data.fields ?? []) {
      f.value = f.value.replaceAll("`!", `\`${prefix}`);
    }
    if (embed.data.description) {
      embed.setDescription(embed.data.description.replaceAll("`!", `\`${prefix}`));
    }
  }
  return embed;
}

// ── Button-based paginated help (prefix command) ──────────────────────────────

export async function sendPaginatedHelp(message: Message, lang: HelpLanguage): Promise<void> {
  const pfx = getPrefix(message.guildId);
  let page: HelpPage = 1;

  const helpMessage = await message.reply({
    embeds: [buildHelpEmbed(lang, page, pfx)],
    components: [buildNavRow(page, lang)],
  });

  const collector = helpMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => (i.customId === "help_prev" || i.customId === "help_next") && i.user.id === message.author.id,
    idle: 10 * 60 * 1000,
  });

  collector.on("collect", async (interaction) => {
    if (interaction.customId === "help_next") {
      page = (page >= HELP_TOTAL_PAGES ? 1 : page + 1) as HelpPage;
    } else {
      page = (page <= 1 ? HELP_TOTAL_PAGES : page - 1) as HelpPage;
    }
    await interaction.update({
      embeds: [buildHelpEmbed(lang, page, pfx)],
      components: [buildNavRow(page, lang)],
    });
  });

  collector.on("end", async () => {
    const expiredEmbed = buildHelpEmbed(lang, page, pfx).setFooter({ text: t("expired", lang) });
    await helpMessage.edit({ embeds: [expiredEmbed], components: [buildNavRow(page, lang, true)] }).catch(() => null);
  });
}

// ── Button-based paginated help (slash command) ───────────────────────────────

export async function sendPaginatedHelpSlash(interaction: ChatInputCommandInteraction, lang: HelpLanguage): Promise<void> {
  const pfx = getPrefix(interaction.guildId);
  let page: HelpPage = 1;

  await interaction.editReply({
    embeds: [buildHelpEmbed(lang, page, pfx)],
    components: [buildNavRow(page, lang)],
  });

  const helpMessage = await interaction.fetchReply();

  const collector = helpMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => (i.customId === "help_prev" || i.customId === "help_next") && i.user.id === interaction.user.id,
    idle: 10 * 60 * 1000,
  });

  collector.on("collect", async (btnInteraction) => {
    if (btnInteraction.customId === "help_next") {
      page = (page >= HELP_TOTAL_PAGES ? 1 : page + 1) as HelpPage;
    } else {
      page = (page <= 1 ? HELP_TOTAL_PAGES : page - 1) as HelpPage;
    }
    await btnInteraction.update({
      embeds: [buildHelpEmbed(lang, page, pfx)],
      components: [buildNavRow(page, lang)],
    });
  });

  collector.on("end", async () => {
    const expiredEmbed = buildHelpEmbed(lang, page, pfx).setFooter({ text: t("expired", lang) });
    await interaction.editReply({ embeds: [expiredEmbed], components: [buildNavRow(page, lang, true)] }).catch(() => null);
  });
}

// ── Topic-specific help (!help <command>) ─────────────────────────────────────

export type HelpTopic =
  | "general" | "games" | "music" | "radio" | "youtube" | "dj"
  | "quest" | "levels" | "voice" | "ai" | "birthday" | "guesslogo"
  | "tools" | "dictionary" | "qr" | "echo" | "pokemon" | "welcome" | "schedule"
  | "food" | "karaoke" | "playlist" | "language";

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function detectTopicAndLang(arg0: string, arg1?: string): { topic: HelpTopic; lang: HelpLanguage } | null {
  const key = stripAccents(arg0.toLowerCase());
  const langOverride: HelpLanguage | null =
    arg1 === "fr" ? "fr" : arg1 === "es" ? "es" : arg1 === "de" ? "de" :
    arg1 === "pt" ? "pt" : arg1 === "it" ? "it" : arg1 === "en" ? "en" : null;

  const map: Record<string, { topic: HelpTopic; lang: HelpLanguage }> = {
    // General / Fun
    general: { topic: "general", lang: "en" }, fun: { topic: "general", lang: "en" },
    divertissement: { topic: "general", lang: "fr" }, diversión: { topic: "general", lang: "es" },
    spass: { topic: "general", lang: "de" }, spaß: { topic: "general", lang: "de" },
    diversao: { topic: "general", lang: "pt" }, divertimento: { topic: "general", lang: "it" },
    // Language
    language: { topic: "language", lang: "en" }, langue: { topic: "language", lang: "fr" },
    idioma: { topic: "language", lang: "es" }, sprache: { topic: "language", lang: "de" },
    // Games
    games: { topic: "games", lang: "en" }, jeux: { topic: "games", lang: "fr" },
    juegos: { topic: "games", lang: "es" }, spiele: { topic: "games", lang: "de" },
    jogos: { topic: "games", lang: "pt" }, giochi: { topic: "games", lang: "it" },
    // Music / YouTube
    music: { topic: "music", lang: "en" }, musique: { topic: "music", lang: "fr" },
    musica: { topic: "music", lang: "es" }, musik: { topic: "music", lang: "de" },
    radio: { topic: "radio", lang: "en" }, radios: { topic: "radio", lang: "en" },
    youtube: { topic: "youtube", lang: "en" }, yt: { topic: "youtube", lang: "en" },
    dj: { topic: "dj", lang: "en" },
    karaoke: { topic: "karaoke", lang: "en" },
    playlist: { topic: "playlist", lang: "en" },
    // Quest
    quest: { topic: "quest", lang: "en" }, quete: { topic: "quest", lang: "fr" }, quetes: { topic: "quest", lang: "fr" },
    misiones: { topic: "quest", lang: "es" }, mision: { topic: "quest", lang: "es" },
    quests: { topic: "quest", lang: "de" },
    missoes: { topic: "quest", lang: "pt" }, missioni: { topic: "quest", lang: "it" },
    levels: { topic: "levels", lang: "en" }, level: { topic: "levels", lang: "en" },
    niveaux: { topic: "levels", lang: "fr" }, niveau: { topic: "levels", lang: "fr" },
    niveles: { topic: "levels", lang: "es" }, nivel: { topic: "levels", lang: "es" },
    // Voice
    voice: { topic: "voice", lang: "en" }, vocal: { topic: "voice", lang: "fr" },
    voz: { topic: "voice", lang: "es" }, stimme: { topic: "voice", lang: "de" },
    voce: { topic: "voice", lang: "it" },
    // AI
    ai: { topic: "ai", lang: "en" }, ia: { topic: "ai", lang: "en" },
    ki: { topic: "ai", lang: "de" },
    // Birthday
    birthday: { topic: "birthday", lang: "en" }, anniversaire: { topic: "birthday", lang: "fr" },
    cumpleanos: { topic: "birthday", lang: "es" }, geburtstag: { topic: "birthday", lang: "de" },
    aniversario: { topic: "birthday", lang: "pt" }, compleanno: { topic: "birthday", lang: "it" },
    // Logo
    guesslogo: { topic: "guesslogo", lang: "en" }, devinelelogo: { topic: "guesslogo", lang: "fr" },
    guessthelogo: { topic: "guesslogo", lang: "en" }, logo: { topic: "guesslogo", lang: "en" },
    // Tools
    tools: { topic: "tools", lang: "en" }, outils: { topic: "tools", lang: "fr" },
    herramientas: { topic: "tools", lang: "es" }, werkzeuge: { topic: "tools", lang: "de" },
    ferramentas: { topic: "tools", lang: "pt" }, strumenti: { topic: "tools", lang: "it" },
    // Dictionary
    dictionary: { topic: "dictionary", lang: "en" }, define: { topic: "dictionary", lang: "en" },
    dictionnaire: { topic: "dictionary", lang: "fr" }, dict: { topic: "dictionary", lang: "en" },
    woerterbuch: { topic: "dictionary", lang: "de" }, dicionario: { topic: "dictionary", lang: "pt" },
    dizionario: { topic: "dictionary", lang: "it" },
    // QR
    qr: { topic: "qr", lang: "en" }, qrcode: { topic: "qr", lang: "en" },
    // Echo
    echo: { topic: "echo", lang: "en" }, eco: { topic: "echo", lang: "es" },
    // Pokémon
    pokemon: { topic: "pokemon", lang: "en" }, pokedex: { topic: "pokemon", lang: "en" }, dex: { topic: "pokemon", lang: "en" },
    // Welcome
    welcome: { topic: "welcome", lang: "en" }, bienvenue: { topic: "welcome", lang: "fr" },
    bienvenida: { topic: "welcome", lang: "es" }, willkommen: { topic: "welcome", lang: "de" },
    boas_vindas: { topic: "welcome", lang: "pt" }, benvenuto: { topic: "welcome", lang: "it" },
    // Schedule
    schedule: { topic: "schedule", lang: "en" }, planifier: { topic: "schedule", lang: "fr" },
    programar: { topic: "schedule", lang: "es" }, planer: { topic: "schedule", lang: "de" },
    agendar: { topic: "schedule", lang: "pt" }, pianificazione: { topic: "schedule", lang: "it" },
    // Food
    food: { topic: "food", lang: "en" }, nourriture: { topic: "food", lang: "fr" },
    comida: { topic: "food", lang: "es" }, essen: { topic: "food", lang: "de" },
    comida_pt: { topic: "food", lang: "pt" }, cibo: { topic: "food", lang: "it" },
  };

  const match = map[key];
  if (!match) return null;
  return { topic: match.topic, lang: langOverride ?? match.lang };
}

export function buildTopicEmbed(topic: HelpTopic, lang: HelpLanguage, prefix = "!"): EmbedBuilder {
  const p = prefix;
  const embed = new EmbedBuilder().setColor(COLORS[lang]);

  switch (topic) {
    case "language":
      embed.setTitle({ en: "🌐 Language", fr: "🌐 Langue", es: "🌐 Idioma", de: "🌐 Sprache", pt: "🌐 Idioma", it: "🌐 Lingua" }[lang] ?? "🌐 Language");
      embed.setDescription({
        en: `Change the language the bot uses for your responses.\n\`${p}language en\` 🇬🇧  \`${p}language fr\` 🇫🇷  \`${p}language es\` 🇪🇸\n\`${p}language de\` 🇩🇪  \`${p}language pt\` 🇧🇷  \`${p}language it\` 🇮🇹`,
        fr: `Change la langue que le bot utilise pour toi.\n\`${p}language en\` 🇬🇧  \`${p}language fr\` 🇫🇷  \`${p}language es\` 🇪🇸\n\`${p}language de\` 🇩🇪  \`${p}language pt\` 🇧🇷  \`${p}language it\` 🇮🇹`,
        es: `Cambia el idioma que el bot usa para ti.\n\`${p}language en\` 🇬🇧  \`${p}language fr\` 🇫🇷  \`${p}language es\` 🇪🇸\n\`${p}language de\` 🇩🇪  \`${p}language pt\` 🇧🇷  \`${p}language it\` 🇮🇹`,
        de: `Ändere die Sprache des Bots für dich.\n\`${p}language en\` 🇬🇧  \`${p}language fr\` 🇫🇷  \`${p}language es\` 🇪🇸\n\`${p}language de\` 🇩🇪  \`${p}language pt\` 🇧🇷  \`${p}language it\` 🇮🇹`,
        pt: `Mude o idioma que o bot usa para você.\n\`${p}language en\` 🇬🇧  \`${p}language fr\` 🇫🇷  \`${p}language es\` 🇪🇸\n\`${p}language de\` 🇩🇪  \`${p}language pt\` 🇧🇷  \`${p}language it\` 🇮🇹`,
        it: `Cambia la lingua che il bot usa per te.\n\`${p}language en\` 🇬🇧  \`${p}language fr\` 🇫🇷  \`${p}language es\` 🇪🇸\n\`${p}language de\` 🇩🇪  \`${p}language pt\` 🇧🇷  \`${p}language it\` 🇮🇹`,
      }[lang] ?? "");
      break;

    case "general":
      embed.setTitle({ en: "🌐 General & Fun", fr: "🌐 Général & Fun", es: "🌐 General & Diversión", de: "🌐 Allgemein & Spaß", pt: "🌐 Geral & Diversão", it: "🌐 Generale & Divertimento" }[lang] ?? "🌐 General");
      embed.addFields(
        { name: `\`${p}say <msg>\``, value: { en: "Make the bot say something (deletes your message).", fr: "Fait dire quelque chose au bot (supprime ton message).", es: "Hace que el bot diga algo (borra tu mensaje).", de: "Lässt den Bot etwas sagen (löscht deine Nachricht).", pt: "Faz o bot dizer algo (apaga sua mensagem).", it: "Fa dire qualcosa al bot (cancella il tuo messaggio)." }[lang] ?? "" },
        { name: `\`${p}poll <question> | opt1 | opt2\``, value: { en: "Create a poll with up to 9 options.", fr: "Créer un sondage avec jusqu'à 9 options.", es: "Crear una encuesta con hasta 9 opciones.", de: "Erstelle eine Umfrage mit bis zu 9 Optionen.", pt: "Criar uma enquete com até 9 opções.", it: "Crea un sondaggio con fino a 9 opzioni." }[lang] ?? "" },
        { name: `\`${p}joke [lang]\`  \`${p}compliment\`  \`${p}hug\`  \`${p}encouragement\``, value: { en: "Fun responses. Append `fr`, `es`, `de`, `pt` or `it` for other languages.", fr: "Réponses fun. Ajoute `fr`, `es`, `de`, `pt` ou `it`.", es: "Respuestas divertidas. Añade `fr`, `de`, `pt` o `it`.", de: "Spaßige Antworten. Füge `fr`, `es`, `pt` oder `it` hinzu.", pt: "Respostas divertidas. Adicione `fr`, `es`, `de` ou `it`.", it: "Risposte divertenti. Aggiungi `fr`, `es`, `de` o `pt`." }[lang] ?? "" },
        { name: `\`${p}8ball <question>\``, value: { en: "Ask the magic 8-ball.", fr: "Demande à la boule magique.", es: "Pregunta a la bola mágica.", de: "Frag die magische 8-Ball.", pt: "Pergunte à bola mágica.", it: "Chiedi alla palla magica." }[lang] ?? "" },
        { name: `\`${p}dice [N]\``, value: { en: "Roll an N-sided die (default 6).", fr: "Lance un dé à N faces (défaut 6).", es: "Lanza un dado de N caras (defecto 6).", de: "Würfle einen N-seitigen Würfel (Standard 6).", pt: "Role um dado de N faces (padrão 6).", it: "Tira un dado a N facce (default 6)." }[lang] ?? "" },
      );
      break;

    case "games":
      embed.setTitle({ en: "🎮 Mini-games", fr: "🎮 Mini-jeux", es: "🎮 Mini-juegos", de: "🎮 Mini-Spiele", pt: "🎮 Mini-jogos", it: "🎮 Mini-giochi" }[lang] ?? "🎮 Games");
      embed.addFields(
        { name: `\`${p}minesweeper [easy|medium|hard]\` 💣`, value: { en: "Minesweeper game in Discord.", fr: "Démineur dans Discord.", es: "Buscaminas en Discord.", de: "Minesweeper in Discord.", pt: "Campo Minado no Discord.", it: "Prato minato in Discord." }[lang] ?? "" },
        { name: `\`${p}geo [easy|medium|hard]\` 🌍`, value: { en: "GeoGuessr-style geography quiz. `!geo stop` to cancel.", fr: "Quiz géographie style GeoGuessr. `!geo stop` pour annuler.", es: "Quiz de geografía estilo GeoGuessr. `!geo stop` para cancelar.", de: "GeoGuessr-Geografie-Quiz. `!geo stop` zum Abbrechen.", pt: "Quiz de geografia estilo GeoGuessr. `!geo stop` para cancelar.", it: "Quiz geografico stile GeoGuessr. `!geo stop` per annullare." }[lang] ?? "" },
        { name: `\`${p}trivia\` 🧠`, value: { en: "AI-generated general knowledge quiz.", fr: "Quiz culture générale généré par IA.", es: "Quiz de cultura general generado por IA.", de: "KI-generiertes Allgemeinwissen-Quiz.", pt: "Quiz de conhecimentos gerais gerado por IA.", it: "Quiz di cultura generale generato dall'IA." }[lang] ?? "" },
        { name: `\`${p}guessnumber\` 🎯`, value: { en: "Guess the secret number.", fr: "Devine le nombre secret.", es: "Adivina el número secreto.", de: "Errate die geheime Zahl.", pt: "Adivinhe o número secreto.", it: "Indovina il numero segreto." }[lang] ?? "" },
        { name: `\`${p}connect4 solo|@user\` 🔴🟡`, value: { en: "Connect 4 vs bot or another player. React with 1️⃣–7️⃣ to play.", fr: "Puissance 4 contre le bot ou un joueur. Réagis 1️⃣–7️⃣.", es: "Conecta 4 contra el bot o un jugador. Reacciona 1️⃣–7️⃣.", de: "Vier gewinnt gegen Bot oder Spieler. Reagiere mit 1️⃣–7️⃣.", pt: "Conecte 4 contra bot ou jogador. Reaja com 1️⃣–7️⃣.", it: "Forza 4 contro bot o giocatore. Reagisci con 1️⃣–7️⃣." }[lang] ?? "" },
        { name: `\`${p}guessthelogo [easy|medium|hard]\` 🏷️`, value: { en: "Guess the brand logo. `!guessthelogo stop` to cancel.", fr: "Devine le logo de la marque. `!guessthelogo stop` pour annuler.", es: "Adivina el logo de la marca. `!guessthelogo stop` para cancelar.", de: "Errate das Markenlogo. `!guessthelogo stop` zum Abbrechen.", pt: "Adivinhe o logo da marca. `!guessthelogo stop` para cancelar.", it: "Indovina il logo del marchio. `!guessthelogo stop` per annullare." }[lang] ?? "" },
      );
      break;

    case "dj":
      embed.setTitle("🎛️ DJ Console");
      embed.setDescription({ en: "Open a full mixing table with interactive buttons to control music.", fr: "Ouvre une table de mixage complète avec des boutons interactifs pour contrôler la musique.", es: "Abre una mesa de mezclas completa con botones interactivos para controlar la música.", de: "Öffnet einen vollständigen Mixer mit interaktiven Buttons zur Musiksteuerung.", pt: "Abre uma mesa de mixagem completa com botões interativos para controlar a música.", it: "Apre un tavolo di mixaggio completo con pulsanti interattivi per controllare la musica." }[lang] ?? "");
      embed.addFields(
        { name: `\`${p}dj\``, value: { en: "Opens the DJ console. Must be in a voice channel.", fr: "Ouvre la console DJ. Tu dois être dans un salon vocal.", es: "Abre la consola DJ. Debes estar en un canal de voz.", de: "Öffnet die DJ-Konsole. Du musst in einem Sprachkanal sein.", pt: "Abre o console DJ. Você deve estar em um canal de voz.", it: "Apre la console DJ. Devi essere in un canale vocale." }[lang] ?? "" },
        { name: { en: "🎚️ Row 1 — Playback", fr: "🎚️ Ligne 1 — Lecture", es: "🎚️ Fila 1 — Reproducción", de: "🎚️ Reihe 1 — Wiedergabe", pt: "🎚️ Linha 1 — Reprodução", it: "🎚️ Riga 1 — Riproduzione" }[lang] ?? "🎚️ Playback", value: { en: "▶️ Play/Pause  ⏭️ Skip  🔁 Loop  ❤️ Like  ⏹️ Stop", fr: "▶️ Lecture/Pause  ⏭️ Skip  🔁 Loop  ❤️ Like  ⏹️ Stop", es: "▶️ Play/Pausa  ⏭️ Skip  🔁 Loop  ❤️ Like  ⏹️ Stop", de: "▶️ Play/Pause  ⏭️ Skip  🔁 Loop  ❤️ Like  ⏹️ Stop", pt: "▶️ Play/Pausa  ⏭️ Skip  🔁 Loop  ❤️ Like  ⏹️ Stop", it: "▶️ Play/Pausa  ⏭️ Skip  🔁 Loop  ❤️ Like  ⏹️ Stop" }[lang] ?? "" },
        { name: { en: "📋 Row 2 — Queue", fr: "📋 Ligne 2 — File", es: "📋 Fila 2 — Cola", de: "📋 Reihe 2 — Warteschlange", pt: "📋 Linha 2 — Fila", it: "📋 Riga 2 — Coda" }[lang] ?? "📋 Queue", value: { en: "🎵 Add Track  📋 Queue  🔀 Shuffle  🗳️ Vote Skip  🗑️ Clear", fr: "🎵 Ajouter  📋 File  🔀 Mélanger  🗳️ Vote Skip  🗑️ Vider", es: "🎵 Añadir  📋 Cola  🔀 Mezclar  🗳️ Votar Skip  🗑️ Limpiar", de: "🎵 Hinzufügen  📋 Warteschlange  🔀 Mischen  🗳️ Vote Skip  🗑️ Leeren", pt: "🎵 Adicionar  📋 Fila  🔀 Embaralhar  🗳️ Votar Skip  🗑️ Limpar", it: "🎵 Aggiungi  📋 Coda  🔀 Mescola  🗳️ Vota Skip  🗑️ Svuota" }[lang] ?? "" },
        { name: "📻 Rows 3–5 — Radio Stations", value: { en: "Quick access to 10 radio stations (NRJ, Skyrock, Jazz, Groove Salad, etc.)", fr: "Accès rapide à 10 radios (NRJ, Skyrock, Jazz, Groove Salad, etc.)", es: "Acceso rápido a 10 emisoras (NRJ, Skyrock, Jazz, Groove Salad, etc.)", de: "Schnellzugriff auf 10 Radiosender (NRJ, Skyrock, Jazz, Groove Salad, etc.)", pt: "Acesso rápido a 10 rádios (NRJ, Skyrock, Jazz, Groove Salad, etc.)", it: "Accesso rapido a 10 radio (NRJ, Skyrock, Jazz, Groove Salad, etc.)" }[lang] ?? "" },
      );
      break;

    case "music":
      embed.setTitle({ en: "🎵 Suno AI Music", fr: "🎵 Musique Suno AI", es: "🎵 Música Suno AI", de: "🎵 Suno KI-Musik", pt: "🎵 Música Suno IA", it: "🎵 Musica Suno IA" }[lang] ?? "🎵 Music");
      embed.addFields(
        { name: `\`${p}music generator <prompt>\``, value: { en: "Generate a custom AI song. Describe style, mood, and lyrics theme.", fr: "Génère une chanson IA personnalisée. Décris le style, l'ambiance et le thème des paroles.", es: "Genera una canción IA personalizada. Describe el estilo, ambiente y tema de la letra.", de: "Generiere ein benutzerdefiniertes KI-Lied. Beschreibe Stil, Stimmung und Liedtext-Thema.", pt: "Gere uma música IA personalizada. Descreva estilo, humor e tema da letra.", it: "Genera una canzone IA personalizzata. Descrivi stile, umore e tema del testo." }[lang] ?? "" },
        { name: `\`${p}music prompt\``, value: { en: "See style prompt examples.", fr: "Voir des exemples de prompts de styles.", es: "Ver ejemplos de prompts de estilos.", de: "Stil-Prompt-Beispiele anzeigen.", pt: "Ver exemplos de prompts de estilos.", it: "Vedere esempi di prompt di stile." }[lang] ?? "" },
        { name: `\`${p}balance\``, value: { en: "Check remaining Suno credits.", fr: "Voir les crédits Suno restants.", es: "Ver créditos Suno restantes.", de: "Verbleibende Suno-Guthaben prüfen.", pt: "Verificar créditos Suno restantes.", it: "Controlla i crediti Suno rimanenti." }[lang] ?? "" },
      );
      break;

    case "radio":
      embed.setTitle("📻 Radio");
      embed.addFields(
        { name: `\`${p}radio list\``, value: { en: "Show all available radio stations (🇫🇷 🇪🇸 🇬🇧 + more).", fr: "Affiche toutes les radios disponibles.", es: "Muestra todas las emisoras disponibles.", de: "Zeigt alle verfügbaren Radiosender.", pt: "Mostra todas as rádios disponíveis.", it: "Mostra tutte le stazioni radio disponibili." }[lang] ?? "" },
        { name: `\`${p}radio <name>\``, value: { en: "Play a radio station. E.g. `!radio nrj`, `!radio jazz`, `!radio groove`.", fr: "Lance une radio. Ex. `!radio nrj`, `!radio fun`, `!radio fip`.", es: "Reproduce una emisora. Ej. `!radio los40`, `!radio hiphop`.", de: "Spiele einen Sender ab. Z.B. `!radio kexp`, `!radio jazz`.", pt: "Reproduz uma rádio. Ex. `!radio groove`, `!radio jazz`.", it: "Riproduce una radio. Es. `!radio jazz`, `!radio classicfm`." }[lang] ?? "" },
        { name: `\`${p}radio leave\``, value: { en: "Disconnect from voice channel.", fr: "Déconnecter du salon vocal.", es: "Desconectar del canal de voz.", de: "Vom Sprachkanal trennen.", pt: "Desconectar do canal de voz.", it: "Disconnetti dal canale vocale." }[lang] ?? "" },
      );
      break;

    case "youtube":
      embed.setTitle("🎬 YouTube & Queue");
      embed.addFields(
        { name: `\`${p}y <query>\`  or  \`${p}play <url>\``, value: { en: "Search YouTube or play a direct URL.", fr: "Chercher sur YouTube ou jouer une URL directe.", es: "Buscar en YouTube o reproducir una URL directa.", de: "YouTube durchsuchen oder eine direkte URL abspielen.", pt: "Pesquisar no YouTube ou reproduzir uma URL direta.", it: "Cerca su YouTube o riproduci un URL diretto." }[lang] ?? "" },
        { name: `\`${p}np\``, value: { en: "Show what's currently playing.", fr: "Affiche ce qui joue actuellement.", es: "Muestra lo que está sonando.", de: "Zeigt was gerade spielt.", pt: "Mostra o que está tocando.", it: "Mostra cosa sta suonando." }[lang] ?? "" },
        { name: `\`${p}skip\`  \`${p}queue\`  \`${p}voteskip\``, value: { en: "Skip current track, view queue, or start a vote to skip.", fr: "Passer la piste, voir la file, ou voter pour passer.", es: "Saltar pista, ver cola, o votar para saltar.", de: "Track überspringen, Warteschlange anzeigen oder Abstimmung starten.", pt: "Pular faixa, ver fila ou votar para pular.", it: "Salta traccia, vedi coda o avvia votazione." }[lang] ?? "" },
        { name: `\`${p}like\`  \`${p}likes\`  \`${p}likes play\``, value: { en: "Like the current track, list your liked tracks, or play them all.", fr: "Liker la piste actuelle, voir tes likes, ou les jouer tous.", es: "Dar like a la pista actual, ver tus likes o reproducirlos.", de: "Track liken, Likes anzeigen oder alle abspielen.", pt: "Curtir a faixa atual, ver curtidas ou reproduzir todas.", it: "Metti like alla traccia, vedi i like o riproducili tutti." }[lang] ?? "" },
      );
      break;

    case "karaoke":
      embed.setTitle("🎤 Karaoke");
      embed.addFields(
        { name: `\`${p}karaoke <artist song>\``, value: { en: "Join a voice channel then run this to display synced live lyrics while the track plays.", fr: "Rejoins un salon vocal puis lance ça pour afficher les paroles synchronisées en live.", es: "Únete a un canal de voz y usa esto para mostrar la letra sincronizada en directo.", de: "Tritt einem Sprachkanal bei und starte dies für synchronisierte Live-Texte.", pt: "Entre em um canal de voz e use isso para exibir a letra sincronizada ao vivo.", it: "Entra in un canale vocale e usa questo per mostrare il testo sincronizzato in tempo reale." }[lang] ?? "" },
        { name: `\`${p}karaoke stop\``, value: { en: "Stop the karaoke session.", fr: "Arrêter le karaoké.", es: "Parar el karaoke.", de: "Karaoke-Session beenden.", pt: "Parar o karaokê.", it: "Ferma la sessione karaoke." }[lang] ?? "" },
      );
      break;

    case "playlist":
      embed.setTitle({ en: "💿 Playlists", fr: "💿 Playlists", es: "💿 Listas de reproducción", de: "💿 Wiedergabelisten", pt: "💿 Playlists", it: "💿 Playlist" }[lang] ?? "💿 Playlists");
      embed.addFields(
        { name: `\`${p}playlist add <name> <url>\``, value: { en: "Add a YouTube URL to a named playlist.", fr: "Ajouter une URL YouTube à une playlist.", es: "Añadir una URL de YouTube a una lista.", de: "YouTube-URL zu einer Wiedergabeliste hinzufügen.", pt: "Adicionar uma URL do YouTube a uma playlist.", it: "Aggiungere un URL YouTube a una playlist." }[lang] ?? "" },
        { name: `\`${p}playlist play <name>\``, value: { en: "Play all tracks in the playlist.", fr: "Jouer toutes les pistes de la playlist.", es: "Reproducir todas las pistas de la lista.", de: "Alle Tracks der Wiedergabeliste abspielen.", pt: "Reproduzir todas as faixas da playlist.", it: "Riproduci tutte le tracce della playlist." }[lang] ?? "" },
        { name: `\`${p}playlist list\`  \`${p}playlist show <name>\`  \`${p}playlist delete <name>\``, value: { en: "List playlists, view tracks, or delete a playlist.", fr: "Lister les playlists, voir les pistes, ou supprimer.", es: "Listar playlists, ver pistas o eliminar.", de: "Wiedergabelisten auflisten, Tracks anzeigen oder löschen.", pt: "Listar playlists, ver faixas ou excluir.", it: "Elencare playlist, vedere tracce o eliminare." }[lang] ?? "" },
      );
      break;

    case "voice":
      embed.setTitle({ en: "🎙️ Voice", fr: "🎙️ Vocal", es: "🎙️ Voz", de: "🎙️ Sprache", pt: "🎙️ Voz", it: "🎙️ Voce" }[lang] ?? "🎙️ Voice");
      embed.addFields(
        { name: `\`${p}join\`  \`${p}leave\``, value: { en: "Join or leave your voice channel.", fr: "Rejoindre ou quitter ton salon vocal.", es: "Unirse o salir de tu canal de voz.", de: "Sprachkanal betreten oder verlassen.", pt: "Entrar ou sair do canal de voz.", it: "Entra o esci dal canale vocale." }[lang] ?? "" },
        { name: `\`${p}voice say <text>\``, value: { en: "Make the bot speak in the voice channel (Google TTS).", fr: "Faire parler le bot dans le vocal (Google TTS).", es: "Hacer que el bot hable en el canal de voz (Google TTS).", de: "Bot im Sprachkanal sprechen lassen (Google TTS).", pt: "Fazer o bot falar no canal de voz (Google TTS).", it: "Far parlare il bot nel canale vocale (Google TTS)." }[lang] ?? "" },
        { name: `\`${p}subtitles\``, value: { en: "Toggle live speech-to-text captions (Groq Whisper).", fr: "Activer/désactiver les sous-titres live (Groq Whisper).", es: "Activar/desactivar subtítulos en vivo (Groq Whisper).", de: "Live-Untertitel ein-/ausschalten (Groq Whisper).", pt: "Ativar/desativar legendas ao vivo (Groq Whisper).", it: "Attiva/disattiva i sottotitoli live (Groq Whisper)." }[lang] ?? "" },
        { name: `\`${p}voice stop\`  \`${p}voice resume\``, value: { en: "Pause or resume voice replies (subtitle-only mode).", fr: "Mettre en pause ou reprendre les réponses vocales.", es: "Pausar o reanudar las respuestas de voz.", de: "Sprachantworten pausieren oder fortsetzen.", pt: "Pausar ou retomar respostas de voz.", it: "Metti in pausa o riprendi le risposte vocali." }[lang] ?? "" },
      );
      break;

    case "ai":
      embed.setTitle({ en: "🤖 AI Commands", fr: "🤖 Commandes IA", es: "🤖 Comandos IA", de: "🤖 KI-Befehle", pt: "🤖 Comandos de IA", it: "🤖 Comandi IA" }[lang] ?? "🤖 AI");
      embed.addFields(
        { name: `\`@bot <msg>\``, value: { en: "Chat with AI. Works in any channel or DM.", fr: "Chat avec l'IA. Fonctionne partout et en DM.", es: "Chat con IA. Funciona en cualquier canal o DM.", de: "Chat mit KI. Funktioniert in jedem Kanal oder DM.", pt: "Chat com IA. Funciona em qualquer canal ou DM.", it: "Chat con IA. Funziona in qualsiasi canale o DM." }[lang] ?? "" },
        { name: `\`${p}ai battle <topic>\`  \`${p}ai stop\``, value: { en: "Start an AI debate between two bots on a topic, then stop it.", fr: "Lancer un débat IA entre deux bots sur un sujet, puis l'arrêter.", es: "Iniciar un debate IA entre dos bots sobre un tema, luego detenerlo.", de: "KI-Debatte zwischen zwei Bots zu einem Thema starten, dann stoppen.", pt: "Iniciar um debate de IA entre dois bots sobre um tema, depois parar.", it: "Avvia un dibattito IA tra due bot su un argomento, poi fermalo." }[lang] ?? "" },
        { name: `\`${p}conspiracy [topic]\``, value: { en: "Generate a funny, absurd AI conspiracy theory.", fr: "Générer une théorie du complot absurde et drôle par IA.", es: "Generar una teoría de conspiración absurda y divertida por IA.", de: "Eine lustige, absurde KI-Verschwörungstheorie generieren.", pt: "Gerar uma teoria conspiratória absurda e engraçada por IA.", it: "Genera una teoria del complotto assurda e divertente con l'IA." }[lang] ?? "" },
        { name: `\`${p}image <description>\`  \`/image\``, value: { en: "Generate an image with FLUX.1 (HuggingFace).", fr: "Générer une image avec FLUX.1 (HuggingFace).", es: "Generar una imagen con FLUX.1 (HuggingFace).", de: "Ein Bild mit FLUX.1 (HuggingFace) generieren.", pt: "Gerar uma imagem com FLUX.1 (HuggingFace).", it: "Genera un'immagine con FLUX.1 (HuggingFace)." }[lang] ?? "" },
      );
      break;

    case "quest":
    case "levels":
      embed.setTitle({ en: "🎯 Quests & Levels", fr: "🎯 Quêtes & Niveaux", es: "🎯 Misiones & Niveles", de: "🎯 Quests & Level", pt: "🎯 Missões & Níveis", it: "🎯 Missioni & Livelli" }[lang] ?? "🎯 Quests");
      embed.addFields(
        { name: `\`${p}quest start\``, value: { en: "Set up personal quests with AI coaching.", fr: "Configurer des quêtes personnelles avec coaching IA.", es: "Configurar misiones personales con coaching IA.", de: "Persönliche Quests mit KI-Coaching einrichten.", pt: "Configurar missões pessoais com coaching de IA.", it: "Configura missioni personali con coaching IA." }[lang] ?? "" },
        { name: `\`${p}quest list\`  \`${p}quest done <N>\`  \`${p}quest done all\``, value: { en: "View quests, mark one or all as done.", fr: "Voir les quêtes, marquer une ou toutes comme faites.", es: "Ver misiones, marcar una o todas como hechas.", de: "Quests anzeigen, eine oder alle als erledigt markieren.", pt: "Ver missões, marcar uma ou todas como concluídas.", it: "Vedi missioni, segna una o tutte come completate." }[lang] ?? "" },
        { name: `\`${p}quest profile\`  \`${p}quest stats\``, value: { en: "View your XP level card or your quest statistics.", fr: "Voir ta fiche niveau XP ou tes statistiques de quêtes.", es: "Ver tu ficha de nivel XP o estadísticas de misiones.", de: "Deine XP-Level-Karte oder Quest-Statistiken anzeigen.", pt: "Ver seu cartão de nível XP ou estatísticas de missões.", it: "Vedi il tuo livello XP o le statistiche delle missioni." }[lang] ?? "" },
        { name: `\`${p}quest remind\`  \`${p}quest schedule <h>\``, value: { en: "Enable reminders or set reminder hours (e.g. `!quest schedule 9 20`).", fr: "Activer les rappels ou définir les heures (ex. `!quest schedule 9 20`).", es: "Activar recordatorios o establecer horas (ej. `!quest schedule 9 20`).", de: "Erinnerungen aktivieren oder Stunden setzen (z.B. `!quest schedule 9 20`).", pt: "Ativar lembretes ou definir horas (ex. `!quest schedule 9 20`).", it: "Attiva promemoria o imposta le ore (es. `!quest schedule 9 20`)." }[lang] ?? "" },
        { name: `\`${p}quest reset\``, value: { en: "Reset all quests (asks for confirmation).", fr: "Réinitialiser toutes les quêtes (demande confirmation).", es: "Reiniciar todas las misiones (pide confirmación).", de: "Alle Quests zurücksetzen (fragt nach Bestätigung).", pt: "Redefinir todas as missões (pede confirmação).", it: "Reimposta tutte le missioni (chiede conferma)." }[lang] ?? "" },
      );
      break;

    case "birthday":
      embed.setTitle({ en: "🎂 Birthdays", fr: "🎂 Anniversaires", es: "🎂 Cumpleaños", de: "🎂 Geburtstage", pt: "🎂 Aniversários", it: "🎂 Compleanni" }[lang] ?? "🎂 Birthdays");
      embed.addFields(
        { name: `\`${p}birthday add DD/MM\``, value: { en: "Save your birthday.", fr: "Enregistrer ton anniversaire.", es: "Registrar tu cumpleaños.", de: "Deinen Geburtstag speichern.", pt: "Salvar seu aniversário.", it: "Salva il tuo compleanno." }[lang] ?? "" },
        { name: `\`${p}birthday list\``, value: { en: "View all saved birthdays.", fr: "Voir tous les anniversaires enregistrés.", es: "Ver todos los cumpleaños guardados.", de: "Alle gespeicherten Geburtstage anzeigen.", pt: "Ver todos os aniversários salvos.", it: "Vedi tutti i compleanni salvati." }[lang] ?? "" },
        { name: `\`${p}birthday remove [@user]\``, value: { en: "Remove a birthday (yours or another user's).", fr: "Supprimer un anniversaire (le tien ou celui d'un autre).", es: "Eliminar un cumpleaños (tuyo o de otro usuario).", de: "Einen Geburtstag entfernen.", pt: "Remover um aniversário.", it: "Rimuovi un compleanno." }[lang] ?? "" },
        { name: `\`${p}birthday channel #channel\``, value: { en: "Set the channel where birthday wishes are sent (admin).", fr: "Définir le salon où les vœux sont envoyés (admin).", es: "Establecer el canal donde se envían los deseos (admin).", de: "Kanal festlegen, in dem Geburtstagsgrüße gesendet werden (Admin).", pt: "Definir o canal onde os votos são enviados (admin).", it: "Imposta il canale dove vengono inviati gli auguri (admin)." }[lang] ?? "" },
      );
      break;

    case "guesslogo":
      embed.setTitle({ en: "🏷️ Guess The Logo", fr: "🏷️ Devine le Logo", es: "🏷️ Adivina el Logo", de: "🏷️ Errate das Logo", pt: "🏷️ Adivinhe o Logo", it: "🏷️ Indovina il Logo" }[lang] ?? "🏷️ Guess The Logo");
      embed.addFields(
        { name: `\`${p}guessthelogo [easy|medium|hard]\``, value: { en: "A brand logo is shown — type the brand name to win!", fr: "Un logo de marque est affiché — tape le nom de la marque pour gagner !", es: "Se muestra un logo de marca — escribe el nombre para ganar.", de: "Ein Markenlogo wird angezeigt — tippe den Markennamen um zu gewinnen!", pt: "Um logo de marca é mostrado — digite o nome da marca para ganhar!", it: "Viene mostrato un logo di marca — digita il nome del marchio per vincere!" }[lang] ?? "" },
        { name: `\`${p}guessthelogo stop\``, value: { en: "Cancel the current game.", fr: "Annuler la partie en cours.", es: "Cancelar el juego actual.", de: "Aktuelles Spiel abbrechen.", pt: "Cancelar o jogo atual.", it: "Annulla il gioco in corso." }[lang] ?? "" },
      );
      break;

    case "tools":
      embed.setTitle({ en: "🔍 Tools", fr: "🔍 Outils", es: "🔍 Herramientas", de: "🔍 Werkzeuge", pt: "🔍 Ferramentas", it: "🔍 Strumenti" }[lang] ?? "🔍 Tools");
      embed.setDescription({ en: "Run `!help <tool>` for more details on any tool.", fr: "Lance `!help <outil>` pour plus de détails.", es: "Usa `!help <herramienta>` para más detalles.", de: "`!help <Werkzeug>` für mehr Details ausführen.", pt: "Use `!help <ferramenta>` para mais detalhes.", it: "Usa `!help <strumento>` per più dettagli." }[lang] ?? "");
      embed.addFields(
        { name: `\`${p}define <word>\`  or  \`/define\``, value: { en: "English dictionary with phonetics, examples, synonyms.", fr: "Dictionnaire anglais avec phonétique, exemples, synonymes.", es: "Diccionario inglés con fonética, ejemplos, sinónimos.", de: "Englisches Wörterbuch mit Phonetik, Beispielen, Synonymen.", pt: "Dicionário inglês com fonética, exemplos, sinônimos.", it: "Dizionario inglese con fonetica, esempi, sinonimi." }[lang] ?? "" },
        { name: `\`${p}qr <text>\`  or  \`/qr\``, value: { en: "Generate a QR code or read one from an attached image.", fr: "Générer un QR code ou en lire un depuis une image jointe.", es: "Generar un QR o leer uno desde una imagen adjunta.", de: "QR-Code erstellen oder aus einem angehängten Bild lesen.", pt: "Gerar um QR code ou ler um de uma imagem anexada.", it: "Generare un codice QR o leggerne uno da un'immagine allegata." }[lang] ?? "" },
        { name: `\`${p}echo\`  or  \`/echo\``, value: { en: "Repeat all messages in the channel (max 8). Run again to stop.", fr: "Répéter tous les messages du salon (max 8). Relancer pour arrêter.", es: "Repetir todos los mensajes del canal (máx 8). Ejecutar de nuevo para parar.", de: "Alle Nachrichten im Kanal wiederholen (max 8). Erneut ausführen zum Stoppen.", pt: "Repetir todas as mensagens no canal (max 8). Execute novamente para parar.", it: "Ripeti tutti i messaggi nel canale (max 8). Esegui di nuovo per fermare." }[lang] ?? "" },
        { name: `\`${p}pokemon <name>\`  or  \`/pokemon\``, value: { en: "Full Pokémon card: types, abilities, stats, height, weight.", fr: "Fiche Pokémon complète : types, talents, stats, taille, poids.", es: "Ficha Pokémon completa: tipos, habilidades, stats, altura, peso.", de: "Vollständige Pokémon-Karte: Typen, Fähigkeiten, Werte, Größe, Gewicht.", pt: "Ficha Pokémon completa: tipos, habilidades, stats, altura, peso.", it: "Scheda Pokémon completa: tipi, abilità, statistiche, altezza, peso." }[lang] ?? "" },
        { name: `\`${p}shazam\``, value: { en: "Identify a song from an attached audio file.", fr: "Identifier une chanson depuis un fichier audio joint.", es: "Identificar una canción desde un archivo de audio adjunto.", de: "Einen Song aus einer angehängten Audiodatei identifizieren.", pt: "Identificar uma música a partir de um arquivo de áudio anexado.", it: "Identificare una canzone da un file audio allegato." }[lang] ?? "" },
      );
      break;

    case "dictionary":
      embed.setTitle({ en: "📖 Dictionary", fr: "📖 Dictionnaire", es: "📖 Diccionario", de: "📖 Wörterbuch", pt: "📖 Dicionário", it: "📖 Dizionario" }[lang] ?? "📖 Dictionary");
      embed.addFields(
        { name: `\`${p}define <word>\`  ·  \`${p}dict <word>\`  ·  \`/define\``, value: { en: "Look up any English word. Returns phonetics, part of speech, definitions, examples, and synonyms. Automatically adapts the response label to your language.", fr: "Chercher n'importe quel mot anglais. Retourne phonétique, catégorie grammaticale, définitions, exemples et synonymes. La réponse s'adapte à ta langue.", es: "Buscar cualquier palabra en inglés. Devuelve fonética, categoría gramatical, definiciones, ejemplos y sinónimos.", de: "Beliebiges englisches Wort nachschlagen. Gibt Phonetik, Wortart, Definitionen, Beispiele und Synonyme zurück.", pt: "Pesquisar qualquer palavra em inglês. Retorna fonética, classe gramatical, definições, exemplos e sinônimos.", it: "Cerca qualsiasi parola inglese. Restituisce fonetica, parte del discorso, definizioni, esempi e sinonimi." }[lang] ?? "" },
      );
      break;

    case "qr":
      embed.setTitle("📷 QR Code");
      embed.addFields(
        { name: `\`${p}qr <text>\`  ·  \`/qr text:<text>\``, value: { en: "Generate a QR code image from any text or URL.", fr: "Générer un QR code depuis n'importe quel texte ou URL.", es: "Generar un código QR desde cualquier texto o URL.", de: "QR-Code aus beliebigem Text oder URL erstellen.", pt: "Gerar um código QR a partir de qualquer texto ou URL.", it: "Genera un codice QR da qualsiasi testo o URL." }[lang] ?? "" },
        { name: `\`${p}qr\` + { en: "attached image", fr: "image jointe", es: "imagen adjunta", de: "angehängtes Bild", pt: "imagem anexada", it: "immagine allegata" }[lang]`, value: { en: "Scan and decode an existing QR code from a picture.", fr: "Scanner et décoder un QR code existant depuis une image.", es: "Escanear y decodificar un QR existente desde una imagen.", de: "Einen vorhandenen QR-Code aus einem Bild scannen und dekodieren.", pt: "Digitalizar e decodificar um QR code existente de uma imagem.", it: "Scansionare e decodificare un codice QR esistente da un'immagine." }[lang] ?? "" },
      );
      break;

    case "echo":
      embed.setTitle("🦜 Echo");
      embed.addFields(
        { name: `\`${p}echo\`  or  \`/echo\``, value: { en: "Start repeating all messages in the channel. Stops automatically after 8 messages.", fr: "Commencer à répéter tous les messages du salon. S'arrête après 8 messages.", es: "Empezar a repetir todos los mensajes del canal. Se para tras 8 mensajes.", de: "Alle Nachrichten im Kanal wiederholen. Stoppt automatisch nach 8 Nachrichten.", pt: "Repetir todas as mensagens no canal. Para automaticamente após 8 mensagens.", it: "Inizia a ripetere tutti i messaggi nel canale. Si ferma automaticamente dopo 8 messaggi." }[lang] ?? "" },
        { name: `\`${p}echo stop\`  or  \`/echo\` (again)`, value: { en: "Stop the echo manually.", fr: "Arrêter l'écho manuellement.", es: "Parar el eco manualmente.", de: "Echo manuell stoppen.", pt: "Parar o eco manualmente.", it: "Ferma l'eco manualmente." }[lang] ?? "" },
      );
      break;

    case "pokemon":
      embed.setTitle("🔴 Pokédex");
      embed.addFields(
        { name: `\`${p}pokemon <name>\`  ·  \`${p}dex <name>\`  ·  \`/pokemon\``, value: { en: "Displays a full Pokémon card: types (colour-coded), abilities, base stats, height, and weight. Works with English names.", fr: "Affiche une fiche Pokémon complète : types (couleurs), talents, stats de base, taille et poids. Fonctionne avec les noms anglais.", es: "Muestra una ficha Pokémon completa: tipos (colores), habilidades, estadísticas base, altura y peso. Funciona con nombres en inglés.", de: "Zeigt eine vollständige Pokémon-Karte: Typen (farbcodiert), Fähigkeiten, Basiswerte, Größe und Gewicht. Funktioniert mit englischen Namen.", pt: "Exibe uma ficha Pokémon completa: tipos (coloridos), habilidades, estatísticas base, altura e peso. Funciona com nomes em inglês.", it: "Mostra una scheda Pokémon completa: tipi (codice colore), abilità, statistiche base, altezza e peso. Funziona con nomi inglesi." }[lang] ?? "" },
      );
      break;

    case "welcome":
      embed.setTitle({ en: "👋 Dynamic Welcome", fr: "👋 Bienvenue dynamique", es: "👋 Bienvenida dinámica", de: "👋 Dynamische Begrüßung", pt: "👋 Boas-vindas dinâmicas", it: "👋 Benvenuto dinamico" }[lang] ?? "👋 Welcome");
      embed.addFields(
        { name: `\`${p}welcome set #channel\`  ·  \`/welcome set\` (admin)`, value: { en: "Set the channel where welcome messages are sent.", fr: "Définir le salon où les messages de bienvenue sont envoyés.", es: "Establecer el canal donde se envían los mensajes de bienvenida.", de: "Den Kanal festlegen, in dem Willkommensnachrichten gesendet werden.", pt: "Definir o canal onde as mensagens de boas-vindas são enviadas.", it: "Impostare il canale in cui vengono inviati i messaggi di benvenuto." }[lang] ?? "" },
        { name: `\`${p}welcome msg <text>\`  ·  \`/welcome message\``, value: { en: "Customize the welcome message. Variables: `{user}` `{server}` `{count}`.", fr: "Personnaliser le message de bienvenue. Variables : `{user}` `{server}` `{count}`.", es: "Personalizar el mensaje de bienvenida. Variables: `{user}` `{server}` `{count}`.", de: "Die Willkommensnachricht anpassen. Variablen: `{user}` `{server}` `{count}`.", pt: "Personalizar a mensagem de boas-vindas. Variáveis: `{user}` `{server}` `{count}`.", it: "Personalizzare il messaggio di benvenuto. Variabili: `{user}` `{server}` `{count}`." }[lang] ?? "" },
        { name: `\`${p}welcome clear\`  ·  \`${p}welcome status\``, value: { en: "Reset to default message or view current config.", fr: "Remettre le message par défaut ou voir la config actuelle.", es: "Restablecer el mensaje predeterminado o ver la configuración.", de: "Standardnachricht zurücksetzen oder aktuelle Konfiguration anzeigen.", pt: "Redefinir para a mensagem padrão ou ver a configuração atual.", it: "Ripristina il messaggio predefinito o vedi la configurazione attuale." }[lang] ?? "" },
      );
      break;

    case "schedule":
      embed.setTitle({ en: "⏰ Scheduled Messages", fr: "⏰ Messages planifiés", es: "⏰ Mensajes programados", de: "⏰ Geplante Nachrichten", pt: "⏰ Mensagens agendadas", it: "⏰ Messaggi pianificati" }[lang] ?? "⏰ Schedule");
      embed.addFields(
        { name: `\`${p}schedule set HH:MM #channel <msg>\`  ·  \`/schedule once\``, value: { en: "Schedule a one-time message at a specific time (UTC).", fr: "Planifier un message unique à une heure précise (UTC).", es: "Programar un mensaje único a una hora específica (UTC).", de: "Eine einmalige Nachricht zu einer bestimmten Uhrzeit planen (UTC).", pt: "Agendar uma mensagem única em um horário específico (UTC).", it: "Pianificare un messaggio una tantum a un'ora specifica (UTC)." }[lang] ?? "" },
        { name: `\`${p}schedule daily HH:MM #channel <msg>\`  ·  \`/schedule daily\``, value: { en: "Schedule a message sent every day at that time (UTC).", fr: "Planifier un message envoyé chaque jour à cette heure (UTC).", es: "Programar un mensaje enviado cada día a esa hora (UTC).", de: "Eine täglich gesendete Nachricht zu einer bestimmten Uhrzeit planen (UTC).", pt: "Agendar uma mensagem enviada todos os dias naquele horário (UTC).", it: "Pianificare un messaggio inviato ogni giorno a quell'ora (UTC)." }[lang] ?? "" },
        { name: `\`${p}schedule list\`  ·  \`${p}schedule cancel <ID>\``, value: { en: "View all scheduled messages or cancel one by ID.", fr: "Voir tous les messages planifiés ou en annuler un par ID.", es: "Ver todos los mensajes programados o cancelar uno por ID.", de: "Alle geplanten Nachrichten anzeigen oder eine nach ID abbrechen.", pt: "Ver todas as mensagens agendadas ou cancelar uma por ID.", it: "Vedi tutti i messaggi pianificati o annullane uno per ID." }[lang] ?? "" },
      );
      break;

    case "food":
      embed.setTitle({ en: "🥗 Food Scanner", fr: "🥗 Scanner Alimentaire", es: "🥗 Escáner de Comida", de: "🥗 Lebensmittel-Scanner", pt: "🥗 Scanner de Alimentos", it: "🥗 Scanner Alimentare" }[lang] ?? "🥗 Food");
      embed.addFields(
        { name: `\`${p}food\`  or  \`${p}food scan\``, value: { en: "Scan a food product from a photo or barcode. Returns Nutri-Score and nutritional info.", fr: "Scanner un produit alimentaire depuis une photo ou un code-barre. Retourne le Nutri-Score et les infos nutritionnelles.", es: "Escanear un producto alimenticio desde una foto o código de barras.", de: "Ein Lebensmittelprodukt anhand eines Fotos oder Barcodes scannen.", pt: "Escanear um produto alimentar a partir de uma foto ou código de barras.", it: "Scansionare un prodotto alimentare da una foto o codice a barre." }[lang] ?? "" },
        { name: `\`${p}food history\`  ·  \`${p}food clear\``, value: { en: "View your last 10 scanned products or clear your history.", fr: "Voir tes 10 derniers produits scannés ou effacer l'historique.", es: "Ver tus últimos 10 productos escaneados o borrar el historial.", de: "Deine letzten 10 gescannten Produkte anzeigen oder verlauf löschen.", pt: "Ver seus últimos 10 produtos escaneados ou limpar o histórico.", it: "Vedi i tuoi ultimi 10 prodotti scansionati o cancella la cronologia." }[lang] ?? "" },
      );
      break;

    default:
      embed.setTitle("❓ Help");
      embed.setDescription({ en: "Topic not found. Try `!help` for the main menu.", fr: "Sujet introuvable. Essaie `!help` pour le menu principal.", es: "Tema no encontrado. Usa `!help` para el menú principal.", de: "Thema nicht gefunden. Versuche `!help` für das Hauptmenü.", pt: "Tópico não encontrado. Use `!help` para o menu principal.", it: "Argomento non trovato. Usa `!help` per il menu principale." }[lang] ?? "");
  }

  if (prefix !== "!") {
    for (const f of embed.data.fields ?? []) {
      f.name  = f.name.replaceAll("`!", `\`${prefix}`);
      f.value = f.value.replaceAll("`!", `\`${prefix}`);
    }
    if (embed.data.description) embed.setDescription(embed.data.description.replaceAll("`!", `\`${prefix}`));
  }
  return embed;
}

// ── Setup & admin guides (keep existing) ─────────────────────────────────────

export async function sendSetupGuide(message: Message): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🛠️ Bot Setup Guide")
    .setDescription("Required and optional API keys to unlock all features.")
    .addFields(
      { name: "✅ Required", value: "`DISCORD_TOKEN` — main bot token", inline: false },
      { name: "🤖 AI features (`@bot`, `!trivia`, `!conspiracy`, `!voice`)", value: "`GROQ_API_KEY` — free at console.groq.com", inline: false },
      { name: "🎵 Music generation (`!music generator`)", value: "`SUNO_API_KEY` — from sunoapi.org", inline: false },
      { name: "🖼️ Image generation (`!image`)", value: "`HUGGINGFACE_TOKEN` — free at huggingface.co", inline: false },
      { name: "🗄️ Persistent data (quests, likes, playlists, logos)", value: "`MONGODB_URI` — free tier at mongodb.com/atlas\n`ENCRYPTION_KEY` — 64-char hex (run: `node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"`)", inline: false },
      { name: "🏷️ Guess The Logo (`!guessthelogo`)", value: "`LOGO_DEV_PUBLIC_KEY` — from logo.dev", inline: false },
      { name: "🎵 Song recognition (`!shazam`)", value: "`AUDD_API_KEY` — from audd.io", inline: false },
      { name: "⚔️ AI Battle (`!ai battle`)", value: "`DISCORD_TOKEN_2` — second bot token", inline: false },
    )
    .setFooter({ text: "Add secrets in the Replit Secrets tab or your deployment environment." });
  await message.reply({ embeds: [embed] });
}

export async function sendAdminGuide(message: Message, prefix = "!"): Promise<void> {
  const p = prefix;
  const embed = new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle("🔧 Admin Commands")
    .setDescription("Commands requiring Manage Server or Administrator permission.")
    .addFields(
      { name: "🌐 Server language", value: `\`${p}server language [en|fr|es|de|pt|it]\` — sets the default help language for the server`, inline: false },
      { name: "📝 Prefix", value: `\`${p}prefix <char>\` — change the command prefix (e.g. \`!prefix ?\`)`, inline: false },
      { name: "👋 Welcome", value: `\`${p}welcome set #channel\` · \`${p}welcome msg <text>\` · \`${p}welcome clear\``, inline: false },
      { name: "⏰ Schedule", value: `\`${p}schedule daily HH:MM #ch <msg>\` · \`${p}schedule list\` · \`${p}schedule cancel <ID>\``, inline: false },
      { name: "🎤 Voice Picker", value: `\`${p}voicepicker set #ch1 #ch2\` — set suggested voice channels`, inline: false },
      { name: "🏷️ Logo admin", value: `\`${p}logo add/remove/approve/exclude/test/stats\` — manage the logo game database`, inline: false },
      { name: "📢 Admin channel", value: `\`${p}suggest admin #channel\` — channel for unknown-command suggestions`, inline: false },
      { name: "📻 Custom radio", value: `\`${p}radio add <key> <name> <url> <emoji> <genre> [fr|es|en]\` — add a custom radio station`, inline: false },
      { name: "🚫 Moderation", value: `\`${p}block @user\` · \`${p}unblock @user\` · \`${p}banlist\``, inline: false },
    )
    .setFooter({ text: "These commands are not listed in !help public." });

  if (prefix !== "!") {
    for (const f of embed.data.fields ?? []) {
      f.value = f.value.replaceAll("`!", `\`${prefix}`);
    }
  }
  await message.reply({ embeds: [embed] });
}
