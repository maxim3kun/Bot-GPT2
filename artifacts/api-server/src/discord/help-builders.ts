import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type Message,
  type ChatInputCommandInteraction,
} from "discord.js";
import { HelpEmbedBuilder as EmbedBuilder, HELP_PREFIX_TOKEN } from "./help-embed.js";
import { getPrefix } from "./prefix-store.js";
import { replyToSlash } from "./slash-message-adapter.js";
import { extraHelpPage, ADMIN_SLASH_COMMANDS } from "./help-extra-pages.js";
import { SLASH_COMMANDS } from "./slash.js";
import { recordDiagnosticMetadata } from "./ai-observability-store.js";

// ── Types ──────────────────────────────────────────────────────────────────────

export type HelpLanguage = "en" | "fr" | "es" | "de" | "pt" | "it" | "ja" | "nl" | "ru" | "pl" | "tr";
export type HelpPage = 1 | 2 | 3 | 4 | 5 | 6;
export const HELP_TOTAL_PAGES = 6;

// Text languages with full translations — new langs fall back to "en"
const FULL_TEXT_LANGS = ["en", "fr", "es", "de", "pt", "it"] as const;
type TextLang = (typeof FULL_TEXT_LANGS)[number];
function textLang(lang: HelpLanguage): TextLang {
  return (FULL_TEXT_LANGS as readonly string[]).includes(lang) ? (lang as TextLang) : "en";
}

// ── Language helpers ──────────────────────────────────────────────────────────

const L = {
  title:    { en: "📖 Bot Help",       fr: "📖 Aide du bot",    es: "📖 Ayuda del bot",   de: "📖 Bot-Hilfe",      pt: "📖 Ajuda do bot",   it: "📖 Guida del bot",  ja: "📖 ボットヘルプ",   nl: "📖 Bot hulp",       ru: "📖 Помощь бота",   pl: "📖 Pomoc bota",     tr: "📖 Bot yardım"     },
  footer:   { en: "Page",              fr: "Page",               es: "Página",             de: "Seite",             pt: "Página",            it: "Pagina",            ja: "ページ",           nl: "Pagina",            ru: "Страница",         pl: "Strona",            tr: "Sayfa"             },
  nav:      { en: "Use buttons to navigate  •  !help <command> for details",
               fr: "Navigue avec les boutons  •  !help <commande> pour les détails",
               es: "Navega con los botones  •  !help <comando> para detalles",
               de: "Navigiere mit den Tasten  •  !help <Befehl> für Details",
               pt: "Navegue com os botões  •  !help <comando> para detalhes",
               it: "Naviga con i pulsanti  •  !help <comando> per i dettagli",
               ja: "ボタンで移動  •  !help <コマンド> で詳細",
               nl: "Navigeer met knoppen  •  !help <commando> voor details",
               ru: "Используй кнопки для навигации  •  !help <команда> для деталей",
               pl: "Nawiguj przyciskami  •  !help <polecenie> po szczegóły",
               tr: "Gezinmek için düğmeleri kullan  •  !help <komut> için detaylar" },
  prev:     { en: "⬅️ Prev", fr: "⬅️ Préc.", es: "⬅️ Ant.", de: "⬅️ Zurück", pt: "⬅️ Ant.", it: "⬅️ Prec.", ja: "⬅️ 前", nl: "⬅️ Vorige", ru: "⬅️ Назад", pl: "⬅️ Poprz.", tr: "⬅️ Önceki" },
  next:     { en: "Next ➡️", fr: "Suiv. ➡️", es: "Sig. ➡️", de: "Weiter ➡️", pt: "Próx. ➡️", it: "Succ. ➡️", ja: "次 ➡️", nl: "Volgende ➡️", ru: "Вперёд ➡️", pl: "Następna ➡️", tr: "Sonraki ➡️" },
  expired:  { en: "Expired · Run !help again", fr: "Expirée · Relance !help", es: "Expirada · Usa !help de nuevo",
               de: "Abgelaufen · !help erneut eingeben", pt: "Expirada · Use !help novamente", it: "Scaduta · Usa !help di nuovo",
               ja: "期限切れ · !help を再実行", nl: "Verlopen · Voer !help opnieuw uit",
               ru: "Истекло · Запусти !help снова", pl: "Wygasło · Użyj !help ponownie", tr: "Süresi doldu · !help yazın tekrar" },
  unauthorized: { en: "These buttons aren't for you!", fr: "Ces boutons ne sont pas pour toi !", es: "¡Estos botones no son para ti!",
    de: "Diese Schaltflächen sind nicht für dich!", pt: "Estes botões não são para você!", it: "Questi pulsanti non sono per te!",
    ja: "このボタンはあなた用ではありません！", nl: "Deze knoppen zijn niet voor jou!", ru: "Эти кнопки не для вас!",
    pl: "Te przyciski nie są dla ciebie!", tr: "Bu düğmeler sana ait değil!" },
} as const;

function t<K extends keyof typeof L>(key: K, lang: HelpLanguage): string {
  return (L[key] as Record<string, string>)[lang] ?? (L[key] as Record<string, string>)["en"] ?? "";
}

const COLORS: Record<HelpLanguage, number> = {
  en: 0x1abc9c, fr: 0x5865f2, es: 0xe74c3c, de: 0xf1c40f, pt: 0x2ecc71, it: 0xe67e22,
  ja: 0xff0000, nl: 0xff6600, ru: 0x2166ac, pl: 0xdc143c, tr: 0xe30a17,
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
  const p = HELP_PREFIX_TOKEN;
  const tl = textLang(lang);
  const embed = new EmbedBuilder()
    .setCommandPrefix(prefix)
    .setCompact()
    .setTitle(t("title", lang))
    .setColor(COLORS[lang])
    .setFooter({ text: `${t("footer", lang)} ${page}/${HELP_TOTAL_PAGES} · ${t("nav", lang).split("•").at(-1)!.trim().replaceAll("!help", `${p}help`)}` });

  // ── Page 1 — General & Fun ─────────────────────────────────────────────────
  if (page === 1) {
    const desc = { en: "General, fun & birthdays.", fr: "Général, fun & anniversaires.", es: "General, diversión & cumpleaños.", de: "Allgemein, Spaß & Geburtstage.", pt: "Geral, diversão & aniversários.", it: "Generale, divertimento & compleanni." };
    embed.setDescription(desc[tl]);
    embed.addFields(
      {
        name: { en: "🌐 General", fr: "🌐 Général", es: "🌐 General", de: "🌐 Allgemein", pt: "🌐 Geral", it: "🌐 Generale" }[tl] ?? "🌐 General",
        value: [
          `\`${p}say\` · \`/poll\` · \`${p}profile\` · \`${p}website\``,
          `\`@bot <msg>\` 🤖 · \`${p}image <desc>\` 🎨`,
        ].join("\n"),
      },
      {
        name: { en: "🎉 Fun", fr: "🎉 Fun", es: "🎉 Diversión", de: "🎉 Spaß", pt: "🎉 Diversão", it: "🎉 Divertimento" }[tl] ?? "🎉 Fun",
        value: [
          `\`${p}joke\` 😄  \`${p}compliment\` 💖  \`${p}hug\` 🤗  \`${p}encouragement\` 💪`,
          `\`${p}8ball <q>\` 🎱  \`${p}dice [N]\` 🎲  \`${p}conspiracy [topic]\` 🕵️`,
          `> ` + { en: "Append a lang code: `!joke fr`, `!joke ja`, `!joke ru`…", fr: "Ajoute le code langue : `!joke fr`, `!joke ja`, `!joke ru`…", es: "Añade código de idioma: `!joke fr`, `!joke ja`, `!joke ru`…", de: "Sprachkürzel anhängen: `!joke fr`, `!joke ja`, `!joke ru`…", pt: "Adicione o código do idioma: `!joke fr`, `!joke ja`, `!joke ru`…", it: "Aggiungi il codice lingua: `!joke fr`, `!joke ja`, `!joke ru`…" }[tl],
        ].join("\n"),
      },
      {
        name: { en: "🎂 Birthdays", fr: "🎂 Anniversaires", es: "🎂 Cumpleaños", de: "🎂 Geburtstage", pt: "🎂 Aniversários", it: "🎂 Compleanni" }[tl] ?? "🎂 Birthdays",
        value: `\`${p}birthday add DD/MM\` · \`${p}birthday list\` · \`${p}birthday remove\``,
      },
    );

  // ── Page 2 — Games & Tools ─────────────────────────────────────────────────
  } else if (page === 2) {
    const desc = { en: "Mini-games & handy tools.", fr: "Mini-jeux & outils pratiques.", es: "Mini-juegos & herramientas.", de: "Mini-Spiele & Werkzeuge.", pt: "Mini-jogos & ferramentas.", it: "Mini-giochi & strumenti." };
    embed.setDescription(desc[tl]);
    embed.addFields(
      {
        name: { en: "🎮 Games", fr: "🎮 Jeux", es: "🎮 Juegos", de: "🎮 Spiele", pt: "🎮 Jogos", it: "🎮 Giochi" }[tl] ?? "🎮 Games",
        value: [
          `\`${p}minesweeper\` 💣  \`${p}geo\` 🌍  \`${p}trivia\` 🧠  \`${p}guessnumber\` 🎯`,
          `\`${p}connect4 solo|@user\` 🔴🟡  \`${p}guessthelogo\` 🏷️  \`/shellgame\` 🥤`,
          `> ` + { en: "All support `easy|medium|hard`  •  `!help games` for details", fr: "Tous supportent `easy|medium|hard`  •  `!help jeux` pour les détails", es: "Todos soportan `easy|medium|hard`  •  `!help juegos` para detalles", de: "Alle unterstützen `easy|medium|hard`  •  `!help spiele` für Details", pt: "Todos suportam `easy|medium|hard`  •  `!help jogos` para detalhes", it: "Tutti supportano `easy|medium|hard`  •  `!help giochi` per dettagli" }[tl],
        ].join("\n"),
      },
      {
        name: { en: "🆕 New Games", fr: "🆕 Nouveaux jeux", es: "🆕 Nuevos juegos", de: "🆕 Neue Spiele", pt: "🆕 Novos jogos", it: "🆕 Nuovi giochi" }[tl] ?? "🆕 New Games",
        value: [
          `\`${p}tierlist [theme]\` 🏆  \`${p}blindtest [theme] [easy|hard]\` 🎵  \`${p}milliongame\` 💰`,
          `> ` + { en: "Themes and instructions: `!help tierlist`, `!help blindtest`, `!help million`", fr: "Thèmes et règles : `!help tierlist`, `!help blindtest`, `!help million`", es: "Temas e instrucciones: `!help tierlist`, `!help blindtest`, `!help million`", de: "Themen und Regeln: `!help tierlist`, `!help blindtest`, `!help million`", pt: "Temas e regras: `!help tierlist`, `!help blindtest`, `!help million`", it: "Temi e regole: `!help tierlist`, `!help blindtest`, `!help million`" }[tl],
        ].join("\n"),
      },
      {
        name: { en: "🔍 Tools", fr: "🔍 Outils", es: "🔍 Herramientas", de: "🔍 Werkzeuge", pt: "🔍 Ferramentas", it: "🔍 Strumenti" }[tl] ?? "🔍 Tools",
        value: [
          `\`${p}define <word>\` 📖  \`${p}pokemon <name>\` 🔴  \`${p}qr <text>\` 📷`,
          `\`${p}echo\` 🦜  \`${p}food\` 🥗  \`${p}rate <food>\` ⭐  \`${p}shazam\` 🎵`,
          `> ` + { en: "`!help <tool>` for details", fr: "`!help <outil>` pour les détails", es: "`!help <herramienta>` para detalles", de: "`!help <Werkzeug>` für Details", pt: "`!help <ferramenta>` para detalhes", it: "`!help <strumento>` per i dettagli" }[tl],
        ].join("\n"),
      },
    );

  // ── Page 3 — Music & Voice ─────────────────────────────────────────────────
  } else if (page === 3) {
    const desc = { en: "Music, radio, DJ & voice.", fr: "Musique, radio, DJ & vocal.", es: "Música, radio, DJ & voz.", de: "Musik, Radio, DJ & Sprache.", pt: "Música, rádio, DJ & voz.", it: "Musica, radio, DJ & voce." };
    embed.setDescription(desc[tl]);
    embed.addFields(
      {
        name: { en: "🎵 YouTube & Queue", fr: "🎵 YouTube & File", es: "🎵 YouTube & Cola", de: "🎵 YouTube & Warteschlange", pt: "🎵 YouTube & Fila", it: "🎵 YouTube & Coda" }[tl] ?? "🎵 YouTube & Queue",
        value: [
          `\`${p}y <query>\` · \`/play <query>\` · \`${p}np\` · \`${p}skip\` · \`${p}voteskip\` · \`${p}queue\``,
          `\`${p}likes\` 📋  \`${p}playlist add|play|list\``,
        ].join("\n"),
      },
      {
        name: { en: "🎛️ DJ Console", fr: "🎛️ Console DJ", es: "🎛️ Consola de DJ", de: "🎛️ DJ-Konsole", pt: "🎛️ Console de DJ", it: "🎛️ Console DJ" }[tl] ?? "🎛️ DJ Console",
        value: `\`${p}dj\` — ` + { en: "Interactive mixing table with buttons", fr: "Table de mixage interactive avec boutons", es: "Mesa de mezclas interactiva con botones", de: "Interaktiver Mixer mit Buttons", pt: "Mesa de mixagem interativa com botões", it: "Tavolo di mixaggio interattivo con pulsanti" }[tl],
      },
      {
        name: { en: "📻 Radio", fr: "📻 Radio", es: "📻 Radio", de: "📻 Radio", pt: "📻 Rádio", it: "📻 Radio" }[tl] ?? "📻 Radio",
        value: [
          `\`${p}radio list\` · \`${p}radio <name>\` · \`${p}radio leave\``,
          `> ` + { en: "e.g. `!radio nrj`, `!radio jazz`, `!radio groove`", fr: "ex. `!radio nrj`, `!radio fun`, `!radio fip`", es: "ej. `!radio los40`, `!radio hiphop`", de: "z.B. `!radio kexp`, `!radio jazz`, `!radio groove`", pt: "ex. `!radio groove`, `!radio jazz`", it: "es. `!radio jazz`, `!radio classicfm`" }[tl],
        ].join("\n"),
      },
      {
        name: { en: "🎤 Karaoke", fr: "🎤 Karaoké", es: "🎤 Karaoke", de: "🎤 Karaoke", pt: "🎤 Karaokê", it: "🎤 Karaoke" }[tl] ?? "🎤 Karaoke",
        value: `\`${p}karaoke <artist song>\` · \`${p}karaoke stop\``,
      },
      {
        name: { en: "🎵 Suno AI", fr: "🎵 Suno AI", es: "🎵 Suno AI", de: "🎵 Suno AI", pt: "🎵 Suno AI", it: "🎵 Suno AI" }[tl] ?? "🎵 Suno AI",
        value: `\`${p}music generator <prompt>\` · \`${p}music prompt\` · \`${p}balance\` · \`${p}credits\``,
      },
    );

  // ── Page 4 — Voice & Server ────────────────────────────────────────────────
  } else if (page === 4) {
    const desc = { en: "Voice.", fr: "Vocal.", es: "Voz.", de: "Sprache.", pt: "Voz.", it: "Voce." };
    embed.setDescription(desc[tl]);
    embed.addFields(
      {
        name: { en: "🎙️ Voice", fr: "🎙️ Vocal", es: "🎙️ Voz", de: "🎙️ Sprache", pt: "🎙️ Voz", it: "🎙️ Voce" }[tl] ?? "🎙️ Voice",
        value: [
          `\`${p}join\` 🔊 · \`${p}leave\` 👋 · \`${p}subtitles\` 📝`,
          `\`${p}voice say <text>\` 🗣️ · \`${p}voice stop\` · \`${p}voice resume\``,
        ].join("\n"),
      },
    );

  // ── Page 5 — AI & Quests ───────────────────────────────────────────────────
  } else if (page === 5) {
    const desc = { en: "AI & quests.", fr: "IA & quêtes.", es: "IA & misiones.", de: "KI & Quests.", pt: "IA & missões.", it: "IA & missioni." };
    embed.setDescription(desc[tl]);
    embed.addFields(
      {
        name: { en: "🤖 AI", fr: "🤖 IA", es: "🤖 IA", de: "🤖 KI", pt: "🤖 IA", it: "🤖 IA" }[tl] ?? "🤖 AI",
        value: [
          `\`@bot <msg>\` — ` + { en: "Chat with AI (also in DMs)", fr: "Chat IA (aussi en DM)", es: "Chat IA (también en DM)", de: "KI-Chat (auch in DMs)", pt: "Chat com IA (também em DMs)", it: "Chat con IA (anche in DM)" }[tl],
          `\`@bot analyse [@membre] [100 messages]\` — ` + { en: "Recent-message analysis (permissions and consent required)", fr: "Analyse des messages récents (droits et accord requis)", es: "Análisis de mensajes (permisos y consentimiento)", de: "Nachrichtenanalyse (Berechtigungen und Einwilligung)", pt: "Análise de mensagens (permissões e consentimento)", it: "Analisi messaggi (permessi e consenso)" }[tl],
          `\`${p}ai battle <topic>\` ⚔️ · \`${p}ai stop\` · \`${p}conspiracy [topic]\` 🕵️`,
          `\`${p}ai enable\` — ` + { en: "Enable AI features and give consent", fr: "Activer les fonctions IA et donner ton accord", es: "Activar las funciones IA y dar consentimiento", de: "KI-Funktionen aktivieren und zustimmen", pt: "Ativar recursos de IA e consentir", it: "Attivare le funzioni IA e dare il consenso" }[tl],
          `\`${p}ai reset\` — ` + { en: "Reset your AI consent preference", fr: "Réinitialise ton consentement IA", es: "Restablecer consentimiento IA", de: "KI-Einwilligung zurücksetzen", pt: "Redefinir consentimento IA", it: "Reimposta consenso IA" }[tl],
          `> 🔒 ` + { en: "AI commands ask for one-time consent before first use.", fr: "Les commandes IA demandent un consentement unique avant la 1ère utilisation.", es: "Los comandos IA piden consentimiento único antes del primer uso.", de: "KI-Befehle fragen einmalig nach Einwilligung.", pt: "Comandos IA pedem consentimento único antes do primeiro uso.", it: "I comandi IA chiedono il consenso una volta prima del primo utilizzo." }[tl],
        ].join("\n"),
      },
      {
        name: { en: "🎯 Quests & Levels", fr: "🎯 Quêtes & Niveaux", es: "🎯 Misiones & Niveles", de: "🎯 Quests & Level", pt: "🎯 Missões & Níveis", it: "🎯 Missioni & Livelli" }[tl] ?? "🎯 Quests",
        value: [
          `\`${p}quest start\` · \`${p}quest list\` · \`${p}quest done <N>\` · \`${p}quest done all\``,
          `\`${p}quest profile\` · \`${p}quest stats\` · \`${p}quest remind\` · \`${p}quest reset\``,
          `> \`${p}help quest\` ` + { en: "for full details", fr: "pour les détails", es: "para detalles", de: "für Details", pt: "para detalhes", it: "per i dettagli" }[tl],
        ].join("\n"),
      },
    );

  // ── Personas, private memory, administration and actual slash catalogue ────
  } else {
    const extra = extraHelpPage(page, tl, p);
    embed.setDescription(extra.title).addFields(extra.fields);
  }

  return embed;
}

// ── Interactive paginator ─────────────────────────────────────────────────────

export async function sendHelpPaginator(
  source: Message | ChatInputCommandInteraction,
  lang: HelpLanguage,
  startPage: HelpPage = 1,
): Promise<void> {
  const isInteraction = !("author" in source);
  const prefix = await getPrefix(source.guildId ?? "");

  let page: HelpPage = startPage;
  const embed = buildHelpEmbed(lang, page, prefix);
  const row   = buildNavRow(page, lang);

  const reply = isInteraction
    ? await replyToSlash(source as ChatInputCommandInteraction, { embeds: [embed], components: [row] })
    : await (source as Message).reply({ embeds: [embed], components: [row] });

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120_000,
    filter: (interaction) => ["help_prev", "help_next"].includes(interaction.customId),
  });

  collector.on("collect", async (i) => {
    try {
    if (i.user.id !== (isInteraction ? (source as ChatInputCommandInteraction).user.id : (source as Message).author.id)) {
      await i.reply({ content: t("unauthorized", lang), ephemeral: true });
      return;
    }
    if (i.customId === "help_prev") page = (page === 1 ? HELP_TOTAL_PAGES : page - 1) as HelpPage;
    if (i.customId === "help_next") page = (page === HELP_TOTAL_PAGES ? 1 : page + 1) as HelpPage;
    await i.update({ embeds: [buildHelpEmbed(lang, page, prefix)], components: [buildNavRow(page, lang)] });
    } catch (error) {
      recordDiagnosticMetadata("help", error);
      if (!i.replied && !i.deferred) {
        await i.reply({ content: t("expired", lang).replaceAll("!help", `${prefix}help`), ephemeral: true }).catch(() => null);
      }
    }
  });

  collector.on("end", async () => {
    try {
      await reply.edit({ components: [buildNavRow(page, lang, true)] });
    } catch { /* message may have been deleted */ }
  });
}

// ── Topic embed ───────────────────────────────────────────────────────────────

export type HelpTopic =
  | "language" | "general" | "games" | "dj" | "music" | "radio" | "youtube" | "karaoke"
  | "playlist" | "voice" | "ai" | "quest" | "levels" | "birthday" | "guesslogo" | "tools"
  | "dictionary" | "qr" | "echo" | "pokemon" | "welcome" | "schedule" | "food"
  | "tierlist" | "blindtest" | "milliongame" | "persona" | "memory" | "diagnostics";

export function resolveTopicKey(raw: string, langOverride?: HelpLanguage): { topic: HelpTopic; lang: HelpLanguage } | null {
  const key = raw.toLowerCase().trim();
  const map: Record<string, { topic: HelpTopic; lang?: HelpLanguage }> = {
    persona: { topic: "persona" }, personas: { topic: "persona" },
    memory: { topic: "memory" }, mémoire: { topic: "memory", lang: "fr" }, memoire: { topic: "memory", lang: "fr" },
    tech: { topic: "diagnostics" }, technician: { topic: "diagnostics" }, diagnostic: { topic: "diagnostics", lang: "fr" },
    language: { topic: "language" }, langue: { topic: "language", lang: "fr" }, idioma: { topic: "language", lang: "es" },
    general: { topic: "general" }, général: { topic: "general", lang: "fr" }, general_es: { topic: "general", lang: "es" },
    games: { topic: "games" }, jeux: { topic: "games", lang: "fr" }, juegos: { topic: "games", lang: "es" },
    spiele: { topic: "games", lang: "de" }, jogos: { topic: "games", lang: "pt" }, giochi: { topic: "games", lang: "it" },
    dj: { topic: "dj" },
    music: { topic: "music" }, musique: { topic: "music", lang: "fr" }, música: { topic: "music", lang: "es" },
    musik: { topic: "music", lang: "de" }, musica: { topic: "music", lang: "it" },
    radio: { topic: "radio" },
    youtube: { topic: "youtube" }, yt: { topic: "youtube" },
    karaoke: { topic: "karaoke" },
    playlist: { topic: "playlist" }, playlists: { topic: "playlist" },
    voice: { topic: "voice" }, vocal: { topic: "voice", lang: "fr" }, voz: { topic: "voice", lang: "es" },
    sprache: { topic: "voice", lang: "de" }, voce: { topic: "voice", lang: "it" },
    ai: { topic: "ai" }, ia: { topic: "ai" }, ki: { topic: "ai", lang: "de" },
    quest: { topic: "quest" }, quests: { topic: "quest" }, quête: { topic: "quest", lang: "fr" },
    quêtes: { topic: "quest", lang: "fr" }, misión: { topic: "quest", lang: "es" }, missões: { topic: "quest", lang: "pt" },
    levels: { topic: "levels" }, niveaux: { topic: "levels", lang: "fr" }, level: { topic: "levels" },
    birthday: { topic: "birthday" }, anniversaire: { topic: "birthday", lang: "fr" },
    anniversaires: { topic: "birthday", lang: "fr" }, cumpleaños: { topic: "birthday", lang: "es" },
    geburtstag: { topic: "birthday", lang: "de" }, compleanni: { topic: "birthday", lang: "it" },
    guesslogo: { topic: "guesslogo" }, guessthelogo: { topic: "guesslogo" }, logo: { topic: "guesslogo" },
    tools: { topic: "tools" }, outils: { topic: "tools", lang: "fr" }, herramientas: { topic: "tools", lang: "es" },
    werkzeuge: { topic: "tools", lang: "de" }, ferramentas: { topic: "tools", lang: "pt" }, strumenti: { topic: "tools", lang: "it" },
    dictionary: { topic: "dictionary" }, dict: { topic: "dictionary" }, define: { topic: "dictionary" },
    dictionnaire: { topic: "dictionary", lang: "fr" }, diccionario: { topic: "dictionary", lang: "es" },
    wörterbuch: { topic: "dictionary", lang: "de" }, dicionário: { topic: "dictionary", lang: "pt" },
    dizionario: { topic: "dictionary", lang: "it" },
    qr: { topic: "qr" },
    echo: { topic: "echo" },
    pokemon: { topic: "pokemon" }, dex: { topic: "pokemon" }, pokédex: { topic: "pokemon" },
    welcome: { topic: "welcome" }, bienvenue: { topic: "welcome", lang: "fr" }, bienvenida: { topic: "welcome", lang: "es" },
    willkommen: { topic: "welcome", lang: "de" }, benvenuto: { topic: "welcome", lang: "it" },
    schedule: { topic: "schedule" }, planification: { topic: "schedule", lang: "fr" },
    programación: { topic: "schedule", lang: "es" }, planung: { topic: "schedule", lang: "de" },
    agendamento: { topic: "schedule", lang: "pt" }, pianificazione: { topic: "schedule", lang: "it" },
    food: { topic: "food" }, nourriture: { topic: "food", lang: "fr" },
    comida: { topic: "food", lang: "es" }, essen: { topic: "food", lang: "de" },
    comida_pt: { topic: "food", lang: "pt" }, cibo: { topic: "food", lang: "it" },
    tierlist: { topic: "tierlist" }, tier: { topic: "tierlist" }, "tier list": { topic: "tierlist" },
    blindtest: { topic: "blindtest" }, musicquiz: { topic: "blindtest" }, "blind test": { topic: "blindtest" },
    milliongame: { topic: "milliongame" }, million: { topic: "milliongame" }, "jeu du million": { topic: "milliongame", lang: "fr" },
  };

  const match = map[key];
  if (!match) return null;
  return { topic: match.topic, lang: langOverride ?? match.lang ?? "en" };
}

export function buildTopicEmbed(topic: HelpTopic, lang: HelpLanguage, prefix = "!"): EmbedBuilder {
  if (topic === "memory") return buildHelpEmbed(lang, 6, prefix);
  if (topic === "persona") return new EmbedBuilder().setTitle("Persona").setDescription(`\`${prefix}persona help\``);
  if (topic === "diagnostics") return new EmbedBuilder().setTitle(lang === "fr" ? "Diagnostic" : "Diagnostics")
    .setDescription(`\`${prefix}tech status\` — ${lang === "fr" ? "Diagnostic des modules réservé aux administrateurs." : "Module diagnostics for administrators only."}`);
  const p = HELP_PREFIX_TOKEN;
  const tl = textLang(lang);
  const embed = new EmbedBuilder().setCommandPrefix(prefix).setColor(COLORS[lang]);

  switch (topic) {
    case "language":
      embed.setTitle({ en: "🌐 Language", fr: "🌐 Langue", es: "🌐 Idioma", de: "🌐 Sprache", pt: "🌐 Idioma", it: "🌐 Lingua" }[tl] ?? "🌐 Language");
      embed.setDescription(
        ({ en: "Change the language the bot uses for your responses.",
          fr: "Change la langue que le bot utilise pour toi.",
          es: "Cambia el idioma que el bot usa para ti.",
          de: "Ändere die Sprache des Bots für dich.",
          pt: "Mude o idioma que o bot usa para você.",
          it: "Cambia la lingua che il bot usa per te." }[tl] ?? "") +
        `\n\n🇬🇧 \`${p}language en\`  🇫🇷 \`${p}language fr\`  🇪🇸 \`${p}language es\`  🇩🇪 \`${p}language de\`\n` +
        `🇧🇷 \`${p}language pt\`  🇮🇹 \`${p}language it\`  🇯🇵 \`${p}language ja\`  🇳🇱 \`${p}language nl\`\n` +
        `🇷🇺 \`${p}language ru\`  🇵🇱 \`${p}language pl\`  🇹🇷 \`${p}language tr\``
      );
      break;

    case "general":
      embed.setTitle({ en: "🌐 General & Fun", fr: "🌐 Général & Fun", es: "🌐 General & Diversión", de: "🌐 Allgemein & Spaß", pt: "🌐 Geral & Diversão", it: "🌐 Generale & Divertimento" }[tl] ?? "🌐 General");
      embed.addFields(
        { name: `\`${p}say <msg>\``, value: { en: "Make the bot say something (deletes your message).", fr: "Fait dire quelque chose au bot (supprime ton message).", es: "Hace que el bot diga algo (borra tu mensaje).", de: "Lässt den Bot etwas sagen (löscht deine Nachricht).", pt: "Faz o bot dizer algo (apaga sua mensagem).", it: "Fa dire qualcosa al bot (cancella il tuo messaggio)." }[tl] ?? "" },
        { name: `\`${p}poll <question> | opt1 | opt2\``, value: { en: "Create a poll with up to 9 options.", fr: "Créer un sondage avec jusqu'à 9 options.", es: "Crear una encuesta con hasta 9 opciones.", de: "Erstelle eine Umfrage mit bis zu 9 Optionen.", pt: "Criar uma enquete com até 9 opções.", it: "Crea un sondaggio con fino a 9 opzioni." }[tl] ?? "" },
        { name: `\`${p}joke\`  \`${p}compliment\`  \`${p}hug\`  \`${p}encouragement\``, value: { en: "Fun responses. Append a lang code: `!joke fr`, `!joke ja`, `!joke ru`, `!joke nl`…", fr: "Réponses fun. Ajoute un code langue : `!joke fr`, `!joke ja`, `!joke ru`…", es: "Respuestas divertidas. Añade código de idioma: `!joke fr`, `!joke ja`, `!joke ru`…", de: "Spaßige Antworten. Sprachkürzel anhängen: `!joke fr`, `!joke ja`, `!joke ru`…", pt: "Respostas divertidas. Adicione o código do idioma: `!joke fr`, `!joke ja`, `!joke ru`…", it: "Risposte divertenti. Aggiungi il codice lingua: `!joke fr`, `!joke ja`, `!joke ru`…" }[tl] ?? "" },
        { name: `\`${p}8ball <question>\``, value: { en: "Ask the magic 8-ball.", fr: "Demande à la boule magique.", es: "Pregunta a la bola mágica.", de: "Frag die magische 8-Ball.", pt: "Pergunte à bola mágica.", it: "Chiedi alla palla magica." }[tl] ?? "" },
        { name: `\`${p}dice [N]\``, value: { en: "Roll an N-sided die (default 6).", fr: "Lance un dé à N faces (défaut 6).", es: "Lanza un dado de N caras (defecto 6).", de: "Würfle einen N-seitigen Würfel (Standard 6).", pt: "Role um dado de N faces (padrão 6).", it: "Tira un dado a N facce (default 6)." }[tl] ?? "" },
      );
      break;

    case "games":
      embed.setTitle({ en: "🎮 Mini-games", fr: "🎮 Mini-jeux", es: "🎮 Mini-juegos", de: "🎮 Mini-Spiele", pt: "🎮 Mini-jogos", it: "🎮 Mini-giochi" }[tl] ?? "🎮 Games");
      embed.addFields(
        { name: `\`${p}minesweeper [easy|medium|hard]\` 💣`, value: { en: "Minesweeper game in Discord.", fr: "Démineur dans Discord.", es: "Buscaminas en Discord.", de: "Minesweeper in Discord.", pt: "Campo Minado no Discord.", it: "Prato minato in Discord." }[tl] ?? "" },
        { name: `\`${p}geo [easy|medium|hard]\` 🌍`, value: { en: "GeoGuessr-style geography quiz. `!geo stop` to cancel.", fr: "Quiz géographie style GeoGuessr. `!geo stop` pour annuler.", es: "Quiz de geografía estilo GeoGuessr. `!geo stop` para cancelar.", de: "GeoGuessr-Geografie-Quiz. `!geo stop` zum Abbrechen.", pt: "Quiz de geografia estilo GeoGuessr. `!geo stop` para cancelar.", it: "Quiz geografico stile GeoGuessr. `!geo stop` per annullare." }[tl] ?? "" },
        { name: `\`${p}trivia\` 🧠`, value: { en: "AI-generated general knowledge quiz.", fr: "Quiz culture générale généré par IA.", es: "Quiz de cultura general generado por IA.", de: "KI-generiertes Allgemeinwissen-Quiz.", pt: "Quiz de conhecimentos gerais gerado por IA.", it: "Quiz di cultura generale generato dall'IA." }[tl] ?? "" },
        { name: `\`${p}guessnumber\` 🎯`, value: { en: "Guess the secret number.", fr: "Devine le nombre secret.", es: "Adivina el número secreto.", de: "Errate die geheime Zahl.", pt: "Adivinhe o número secreto.", it: "Indovina il numero segreto." }[tl] ?? "" },
        { name: `\`${p}connect4 solo|@user\` 🔴🟡`, value: { en: "Connect 4 vs bot or another player. React with 1️⃣–7️⃣ to play.", fr: "Puissance 4 contre le bot ou un joueur. Réagis 1️⃣–7️⃣.", es: "Conecta 4 contra el bot o un jugador. Reacciona 1️⃣–7️⃣.", de: "Vier gewinnt gegen Bot oder Spieler. Reagiere mit 1️⃣–7️⃣.", pt: "Conecte 4 contra bot ou jogador. Reaja com 1️⃣–7️⃣.", it: "Forza 4 contro bot o giocatore. Reagisci con 1️⃣–7️⃣." }[tl] ?? "" },
        { name: `\`${p}guessthelogo [easy|medium|hard]\` 🏷️`, value: { en: "Guess the brand logo. `!guessthelogo stop` to cancel.", fr: "Devine le logo de la marque. `!guessthelogo stop` pour annuler.", es: "Adivina el logo de la marca. `!guessthelogo stop` para cancelar.", de: "Errate das Markenlogo. `!guessthelogo stop` zum Abbrechen.", pt: "Adivinhe o logo da marca. `!guessthelogo stop` para cancelar.", it: "Indovina il logo del marchio. `!guessthelogo stop` per annullare." }[tl] ?? "" },
      );
      break;

    case "dj":
      embed.setTitle("🎛️ DJ Console");
      embed.setDescription({ en: "Open a full mixing table with interactive buttons to control music.", fr: "Ouvre une table de mixage complète avec des boutons interactifs pour contrôler la musique.", es: "Abre una mesa de mezclas completa con botones interactivos para controlar la música.", de: "Öffnet einen vollständigen Mixer mit interaktiven Buttons zur Musiksteuerung.", pt: "Abre uma mesa de mixagem completa com botões interativos para controlar a música.", it: "Apre un tavolo di mixaggio completo con pulsanti interattivi per controllare la musica." }[tl] ?? "");
      embed.addFields(
        { name: `\`${p}dj\``, value: { en: "Opens the DJ console. Must be in a voice channel.", fr: "Ouvre la console DJ. Tu dois être dans un salon vocal.", es: "Abre la consola DJ. Debes estar en un canal de voz.", de: "Öffnet die DJ-Konsole. Du musst in einem Sprachkanal sein.", pt: "Abre o console DJ. Você deve estar em um canal de voz.", it: "Apre la console DJ. Devi essere in un canale vocale." }[tl] ?? "" },
        { name: { en: "🎚️ Row 1 — Playback", fr: "🎚️ Ligne 1 — Lecture", es: "🎚️ Fila 1 — Reproducción", de: "🎚️ Reihe 1 — Wiedergabe", pt: "🎚️ Linha 1 — Reprodução", it: "🎚️ Riga 1 — Riproduzione" }[tl] ?? "🎚️ Playback", value: "▶️ Play/Pause  ⏭️ Skip  🔁 Loop  ❤️ Like  ⏹️ Stop" },
        { name: { en: "📋 Row 2 — Queue", fr: "📋 Ligne 2 — File", es: "📋 Fila 2 — Cola", de: "📋 Reihe 2 — Warteschlange", pt: "📋 Linha 2 — Fila", it: "📋 Riga 2 — Coda" }[tl] ?? "📋 Queue", value: { en: "🎵 Add Track  📋 Queue  🔀 Shuffle  🗳️ Vote Skip  🗑️ Clear", fr: "🎵 Ajouter  📋 File  🔀 Mélanger  🗳️ Vote Skip  🗑️ Vider", es: "🎵 Añadir  📋 Cola  🔀 Mezclar  🗳️ Votar Skip  🗑️ Limpiar", de: "🎵 Hinzufügen  📋 Warteschlange  🔀 Mischen  🗳️ Vote Skip  🗑️ Leeren", pt: "🎵 Adicionar  📋 Fila  🔀 Embaralhar  🗳️ Votar Skip  🗑️ Limpar", it: "🎵 Aggiungi  📋 Coda  🔀 Mescola  🗳️ Vota Skip  🗑️ Svuota" }[tl] ?? "" },
        { name: "📻 Rows 3–5 — Radio Stations", value: { en: "Quick access to 10 radio stations (NRJ, Skyrock, Jazz, Groove Salad, etc.)", fr: "Accès rapide à 10 radios (NRJ, Skyrock, Jazz, Groove Salad, etc.)", es: "Acceso rápido a 10 emisoras (NRJ, Skyrock, Jazz, Groove Salad, etc.)", de: "Schnellzugriff auf 10 Radiosender (NRJ, Skyrock, Jazz, Groove Salad, etc.)", pt: "Acesso rápido a 10 rádios (NRJ, Skyrock, Jazz, Groove Salad, etc.)", it: "Accesso rapido a 10 radio (NRJ, Skyrock, Jazz, Groove Salad, etc.)" }[tl] ?? "" },
      );
      break;

    case "music":
      embed.setTitle({ en: "🎵 Suno AI Music", fr: "🎵 Musique Suno AI", es: "🎵 Música Suno AI", de: "🎵 Suno KI-Musik", pt: "🎵 Música Suno IA", it: "🎵 Musica Suno IA" }[tl] ?? "🎵 Music");
      embed.addFields(
        { name: `\`${p}music generator <prompt>\``, value: { en: "Generate a custom AI song. Describe style, mood, and lyrics theme.", fr: "Génère une chanson IA personnalisée. Décris le style, l'ambiance et le thème des paroles.", es: "Genera una canción IA personalizada. Describe el estilo, ambiente y tema de la letra.", de: "Generiere ein benutzerdefiniertes KI-Lied. Beschreibe Stil, Stimmung und Liedtext-Thema.", pt: "Gere uma música IA personalizada. Descreva estilo, humor e tema da letra.", it: "Genera una canzone IA personalizzata. Descrivi stile, umore e tema del testo." }[tl] ?? "" },
        { name: `\`${p}music prompt\``, value: { en: "See style prompt examples.", fr: "Voir des exemples de prompts de styles.", es: "Ver ejemplos de prompts de estilos.", de: "Stil-Prompt-Beispiele anzeigen.", pt: "Ver exemplos de prompts de estilos.", it: "Vedere esempi di prompt di stile." }[tl] ?? "" },
        { name: `\`${p}balance\``, value: { en: "Check remaining Suno credits.", fr: "Voir les crédits Suno restants.", es: "Ver créditos Suno restantes.", de: "Verbleibende Suno-Guthaben prüfen.", pt: "Verificar créditos Suno restantes.", it: "Controlla i crediti Suno rimanenti." }[tl] ?? "" },
      );
      break;

    case "radio":
      embed.setTitle("📻 Radio");
      embed.addFields(
        { name: `\`${p}radio list\``, value: { en: "Show all available radio stations (🇫🇷 🇪🇸 🇬🇧 + more).", fr: "Affiche toutes les radios disponibles.", es: "Muestra todas las emisoras disponibles.", de: "Zeigt alle verfügbaren Radiosender.", pt: "Mostra todas as rádios disponíveis.", it: "Mostra tutte le stazioni radio disponibili." }[tl] ?? "" },
        { name: `\`${p}radio <name>\``, value: { en: "Play a radio station. E.g. `!radio nrj`, `!radio jazz`, `!radio groove`.", fr: "Lance une radio. Ex. `!radio nrj`, `!radio fun`, `!radio fip`.", es: "Reproduce una emisora. Ej. `!radio los40`, `!radio hiphop`.", de: "Spiele einen Sender ab. Z.B. `!radio kexp`, `!radio jazz`.", pt: "Reproduz uma rádio. Ex. `!radio groove`, `!radio jazz`.", it: "Riproduce una radio. Es. `!radio jazz`, `!radio classicfm`." }[tl] ?? "" },
        { name: `\`${p}radio leave\``, value: { en: "Disconnect from voice channel.", fr: "Déconnecter du salon vocal.", es: "Desconectar del canal de voz.", de: "Vom Sprachkanal trennen.", pt: "Desconectar do canal de voz.", it: "Disconnetti dal canale vocale." }[tl] ?? "" },
      );
      break;

    case "youtube":
      embed.setTitle("🎬 YouTube & Queue");
      embed.addFields(
        { name: `\`${p}y <query>\`  ·  \`/play <query>\``, value: { en: "Search YouTube or play a direct URL.", fr: "Chercher sur YouTube ou jouer une URL directe.", es: "Buscar en YouTube o reproducir una URL directa.", de: "YouTube durchsuchen oder eine direkte URL abspielen.", pt: "Pesquisar no YouTube ou reproduzir uma URL direta.", it: "Cerca su YouTube o riproduci un URL diretto." }[tl] ?? "" },
        { name: `\`${p}np\``, value: { en: "Show what's currently playing.", fr: "Affiche ce qui joue actuellement.", es: "Muestra lo que está sonando.", de: "Zeigt was gerade spielt.", pt: "Mostra o que está tocando.", it: "Mostra cosa sta suonando." }[tl] ?? "" },
        { name: `\`${p}skip\`  \`${p}queue\`  \`${p}voteskip\``, value: { en: "Skip current track, view queue, or start a vote to skip.", fr: "Passer la piste, voir la file, ou voter pour passer.", es: "Saltar pista, ver cola, o votar para saltar.", de: "Track überspringen, Warteschlange anzeigen oder Abstimmung starten.", pt: "Pular faixa, ver fila ou votar para pular.", it: "Salta traccia, vedi coda o avvia votazione." }[tl] ?? "" },
        { name: `\`${p}likes\`  \`${p}likes play\``, value: { en: "List or play saved tracks. Use the DJ console's heart to save a track.", fr: "Voir ou lire tes pistes sauvegardées. Le cœur de la console DJ ajoute un favori.", es: "Ver o reproducir favoritos. Usa el corazón de la consola DJ para guardar.", de: "Gespeicherte Tracks anzeigen oder abspielen. Mit dem Herz im DJ-Pult speichern.", pt: "Ver ou tocar favoritos. Use o coração do console DJ para salvar.", it: "Mostra o riproduci i preferiti. Usa il cuore della console DJ per salvare." }[tl] ?? "" },
      );
      break;

    case "karaoke":
      embed.setTitle("🎤 Karaoke");
      embed.addFields(
        { name: `\`${p}karaoke <artist song>\``, value: { en: "Join a voice channel then run this to display synced live lyrics while the track plays.", fr: "Rejoins un salon vocal puis lance ça pour afficher les paroles synchronisées en live.", es: "Únete a un canal de voz y usa esto para mostrar la letra sincronizada en directo.", de: "Tritt einem Sprachkanal bei und starte dies für synchronisierte Live-Texte.", pt: "Entre em um canal de voz e use isso para exibir a letra sincronizada ao vivo.", it: "Entra in un canale vocale e usa questo per mostrare il testo sincronizzato in tempo reale." }[tl] ?? "" },
        { name: `\`${p}karaoke stop\``, value: { en: "Stop the karaoke session.", fr: "Arrêter le karaoké.", es: "Parar el karaoke.", de: "Karaoke-Session beenden.", pt: "Parar o karaokê.", it: "Ferma la sessione karaoke." }[tl] ?? "" },
      );
      break;

    case "playlist":
      embed.setTitle({ en: "💿 Playlists", fr: "💿 Playlists", es: "💿 Listas de reproducción", de: "💿 Wiedergabelisten", pt: "💿 Playlists", it: "💿 Playlist" }[tl] ?? "💿 Playlists");
      embed.addFields(
        { name: `\`${p}playlist add <name> <url>\``, value: { en: "Add a YouTube URL to a named playlist.", fr: "Ajouter une URL YouTube à une playlist.", es: "Añadir una URL de YouTube a una lista.", de: "YouTube-URL zu einer Wiedergabeliste hinzufügen.", pt: "Adicionar uma URL do YouTube a uma playlist.", it: "Aggiungere un URL YouTube a una playlist." }[tl] ?? "" },
        { name: `\`${p}playlist play <name>\``, value: { en: "Play all tracks in the playlist.", fr: "Jouer toutes les pistes de la playlist.", es: "Reproducir todas las pistas de la lista.", de: "Alle Tracks der Wiedergabeliste abspielen.", pt: "Reproduzir todas as faixas da playlist.", it: "Riproduci tutte le tracce della playlist." }[tl] ?? "" },
        { name: `\`${p}playlist list\`  \`${p}playlist show <name>\`  \`${p}playlist delete <name>\``, value: { en: "List playlists, view tracks, or delete a playlist.", fr: "Lister les playlists, voir les pistes, ou supprimer.", es: "Listar playlists, ver pistas o eliminar.", de: "Wiedergabelisten auflisten, Tracks anzeigen oder löschen.", pt: "Listar playlists, ver faixas ou excluir.", it: "Elencare playlist, vedere tracce o eliminare." }[tl] ?? "" },
      );
      break;

    case "voice":
      embed.setTitle({ en: "🎙️ Voice", fr: "🎙️ Vocal", es: "🎙️ Voz", de: "🎙️ Sprache", pt: "🎙️ Voz", it: "🎙️ Voce" }[tl] ?? "🎙️ Voice");
      embed.addFields(
        { name: `\`${p}join\`  \`${p}leave\``, value: { en: "Join or leave your voice channel.", fr: "Rejoindre ou quitter ton salon vocal.", es: "Unirse o salir de tu canal de voz.", de: "Sprachkanal betreten oder verlassen.", pt: "Entrar ou sair do canal de voz.", it: "Entra o esci dal canale vocale." }[tl] ?? "" },
        { name: `\`${p}voice say <text>\``, value: { en: "Make the bot speak in the voice channel (Google TTS).", fr: "Faire parler le bot dans le vocal (Google TTS).", es: "Hacer que el bot hable en el canal de voz (Google TTS).", de: "Bot im Sprachkanal sprechen lassen (Google TTS).", pt: "Fazer o bot falar no canal de voz (Google TTS).", it: "Far parlare il bot nel canale vocale (Google TTS)." }[tl] ?? "" },
        { name: `\`${p}subtitles\``, value: { en: "Toggle live speech-to-text captions (Groq Whisper).", fr: "Activer/désactiver les sous-titres live (Groq Whisper).", es: "Activar/desactivar subtítulos en vivo (Groq Whisper).", de: "Live-Untertitel ein-/ausschalten (Groq Whisper).", pt: "Ativar/desativar legendas ao vivo (Groq Whisper).", it: "Attiva/disattiva i sottotitoli live (Groq Whisper)." }[tl] ?? "" },
        { name: `\`${p}voice stop\`  \`${p}voice resume\``, value: { en: "Pause or resume voice replies (subtitle-only mode).", fr: "Mettre en pause ou reprendre les réponses vocales.", es: "Pausar o reanudar las respuestas de voz.", de: "Sprachantworten pausieren oder fortsetzen.", pt: "Pausar ou retomar respostas de voz.", it: "Metti in pausa o riprendi le risposte vocali." }[tl] ?? "" },
      );
      break;

    case "ai":
      embed.setTitle({ en: "🤖 AI Commands", fr: "🤖 Commandes IA", es: "🤖 Comandos IA", de: "🤖 KI-Befehle", pt: "🤖 Comandos de IA", it: "🤖 Comandi IA" }[tl] ?? "🤖 AI");
      embed.addFields(
        { name: `\`${p}bus\``, value: { en: "Direct bus lookup: `!bus` lists Oise networks, `!bus <city>` lists routes, and `!bus <city> <line>` shows departures without using AI.", fr: "Recherche directe, sans IA : `!bus` liste les réseaux de l’Oise, `!bus <ville>` affiche les lignes et `!bus <ville> <ligne>` donne les prochains passages.", es: "Consulta directa de autobuses: `!bus <ciudad>` muestra las líneas y `!bus <ciudad> <línea>` las próximas salidas.", de: "Direkte Bussuche: `!bus <Stadt>` zeigt Linien und `!bus <Stadt> <Linie>` die nächsten Abfahrten.", pt: "Busca direta de ônibus: `!bus <cidade>` mostra linhas e `!bus <cidade> <linha>` as próximas partidas.", it: "Ricerca diretta degli autobus: `!bus <città>` mostra le linee e `!bus <città> <linea>` le prossime partenze." }[tl] ?? "" },
        { name: `\`@bot <msg>\``, value: { en: "Chat with AI. Works in any channel or DM.", fr: "Chat avec l'IA. Fonctionne partout et en DM.", es: "Chat con IA. Funciona en cualquier canal o DM.", de: "Chat mit KI. Funktioniert in jedem Kanal oder DM.", pt: "Chat com IA. Funciona em qualquer canal ou DM.", it: "Chat con IA. Funziona in qualsiasi canale o DM." }[tl] ?? "" },
        { name: { en: "🚌 Public transport", fr: "🚌 Transports et horaires", es: "🚌 Transporte en tiempo real", de: "🚌 Nahverkehr in Echtzeit", pt: "🚌 Transporte em tempo real", it: "🚌 Trasporti in tempo reale" }[tl] ?? "🚌 Public transport", value: { en: "Ask naturally, e.g. “next metro line 1 at Gare de Lyon, Paris, direction La Défense”. Live times are used where published; otherwise, available GTFS schedules are clearly marked as scheduled.", fr: "Demande « prochains passages du métro ligne 1 à Gare de Lyon, Paris » ou « prochain bus à Noyon ». Les données d’Oise Mobilité et des autres réseaux ouverts sont consultées : temps réel si publié, sinon horaires théoriques clairement indiqués.", es: "Pregunta, por ejemplo: «próximos pasos del metro línea 1 en Gare de Lyon, París, dirección La Défense». Solo se muestran datos en tiempo real si la red publica un flujo abierto.", de: "Frage zum Beispiel nach der nächsten Metro der Linie 1 an Gare de Lyon Richtung La Défense. Echtzeitdaten gibt es nur, wenn der Betreiber einen offenen Live-Datenfeed veröffentlicht.", pt: "Pergunte, por exemplo, pelos próximos metrôs da linha 1 em Gare de Lyon, direção La Défense. Os dados em tempo real só aparecem quando a rede publica um feed aberto.", it: "Chiedi, per esempio, le prossime corse della metro linea 1 a Gare de Lyon in direzione La Défense. I dati in tempo reale sono disponibili solo se la rete pubblica un feed aperto." }[tl] ?? "" },
        { name: `\`@bot analyse [@member]\``, value: { en: "Analyze up to 100 recent conversational messages across channels you and the bot can read. Other members require moderator rights and consent; the result is sent privately.", fr: "Analyser jusqu’à 100 messages de conversation récents dans les salons lisibles par toi et le bot. Pour une autre personne, il faut les droits de modération et son accord IA ; résultat en privé.", es: "Analiza hasta 100 mensajes recientes en canales accesibles. Para otra persona se requieren permisos de moderación y consentimiento; el resultado se envía en privado.", de: "Bis zu 100 aktuelle Nachrichten aus zugänglichen Kanälen analysieren. Für andere Mitglieder sind Moderationsrechte und Zustimmung nötig; das Ergebnis wird privat gesendet.", pt: "Analise até 100 mensagens recentes em canais acessíveis. Para outra pessoa, são necessárias permissões de moderação e consentimento; o resultado vai por DM.", it: "Analizza fino a 100 messaggi recenti nei canali accessibili. Per un'altra persona servono permessi di moderazione e consenso; il risultato è enviado in privato." }[tl] ?? "" },
        { name: `\`${p}ai enable\``, value: { en: "Enable AI features and give consent.", fr: "Activer les fonctions IA et donner ton accord.", es: "Activar las funciones IA y dar consentimiento.", de: "KI-Funktionen aktivieren und zustimmen.", pt: "Ativar recursos de IA e consentir.", it: "Attivare le funzioni IA e dare il consenso." }[tl] ?? "" },
        { name: `\`${p}persona help\``, value: { en: "Create private or server-only personas, let them reply, and optionally teach them from up to 2,000 of your messages.", fr: "Créer des personas privés ou limités au serveur, les faire répondre et les enrichir avec jusqu’à 2 000 de tes messages.", es: "Crear personas privadas o limitadas al servidor y enseñarles con hasta 2.000 mensajes propios.", de: "Private oder servergebundene Personas erstellen und mit bis zu 2.000 eigenen Nachrichten trainieren.", pt: "Criar personas privadas ou limitadas ao servidor e ensiná-las com até 2.000 mensagens próprias.", it: "Creare personas private o limitate al server e istruirle con fino a 2.000 messaggi propri." }[tl] ?? "" },
        { name: `\`${p}ai battle <topic>\`  \`${p}ai stop\``, value: { en: "Start an AI debate between two bots on a topic, then stop it.", fr: "Lancer un débat IA entre deux bots sur un sujet, puis l'arrêter.", es: "Iniciar un debate IA entre dos bots sobre un tema, luego detenerlo.", de: "KI-Debatte zwischen zwei Bots zu einem Thema starten, dann stoppen.", pt: "Iniciar um debate de IA entre dois bots sobre um tema, depois parar.", it: "Avvia un dibattito IA tra due bot su un argomento, poi fermalo." }[tl] ?? "" },
        { name: `\`${p}ai remember\` / \`${p}ai memory\` / \`${p}ai forget\``, value: { en: "Opt-in encrypted personal memory. Memory is sent privately when viewed.", fr: "Mémoire personnelle chiffrée avec accord. La mémoire est envoyée en privé.", es: "Memoria personal cifrada con consentimiento. Se muestra por privado.", de: "Verschlüsselter persönlicher Speicher mit Zustimmung.", pt: "Memória pessoal criptografada com consentimento.", it: "Memoria personale crittografata con consenso." }[tl] ?? "" },
        { name: `\`${p}conspiracy [topic]\``, value: { en: "Generate a funny, absurd AI conspiracy theory.", fr: "Générer une théorie du complot absurde et drôle par IA.", es: "Generar una teoría de conspiración absurda y divertida por IA.", de: "Eine lustige, absurde KI-Verschwörungstheorie generieren.", pt: "Gerar uma teoria conspiratória absurda e engraçada por IA.", it: "Genera una teoria del complotto assurda e divertente con l'IA." }[tl] ?? "" },
        { name: `\`${p}image <description>\``, value: { en: "Generate an image with FLUX.1 (HuggingFace).", fr: "Générer une image avec FLUX.1 (HuggingFace).", es: "Generar una imagen con FLUX.1 (HuggingFace).", de: "Ein Bild mit FLUX.1 (HuggingFace) generieren.", pt: "Gerar uma imagem com FLUX.1 (HuggingFace).", it: "Genera un'immagine con FLUX.1 (HuggingFace)." }[tl] ?? "" },
      );
      break;

    case "quest":
    case "levels":
      embed.setTitle({ en: "🎯 Quests & Levels", fr: "🎯 Quêtes & Niveaux", es: "🎯 Misiones & Niveles", de: "🎯 Quests & Level", pt: "🎯 Missões & Níveis", it: "🎯 Missioni & Livelli" }[tl] ?? "🎯 Quests");
      embed.addFields(
        { name: `\`${p}quest start\``, value: { en: "Set up personal quests with AI coaching.", fr: "Configurer des quêtes personnelles avec coaching IA.", es: "Configurar misiones personales con coaching IA.", de: "Persönliche Quests mit KI-Coaching einrichten.", pt: "Configurar missões pessoais com coaching de IA.", it: "Configura missioni personali con coaching IA." }[tl] ?? "" },
        { name: `\`${p}quest list\`  \`${p}quest done <N>\`  \`${p}quest done all\``, value: { en: "View quests, mark one or all as done.", fr: "Voir les quêtes, marquer une ou toutes comme faites.", es: "Ver misiones, marcar una o todas como hechas.", de: "Quests anzeigen, eine oder alle als erledigt markieren.", pt: "Ver missões, marcar uma ou todas como concluídas.", it: "Vedi missioni, segna una o tutte come completate." }[tl] ?? "" },
        { name: `\`${p}quest profile\`  \`${p}quest stats\``, value: { en: "View your XP level card or your quest statistics.", fr: "Voir ta fiche niveau XP ou tes statistiques de quêtes.", es: "Ver tu ficha de nivel XP o estadísticas de misiones.", de: "Deine XP-Level-Karte oder Quest-Statistiken anzeigen.", pt: "Ver seu cartão de nível XP ou estatísticas de missões.", it: "Vedi il tuo livello XP o le statistiche delle missioni." }[tl] ?? "" },
        { name: `\`${p}quest remind\`  \`${p}quest schedule\``, value: { en: "Enable reminders (up to three per week at varied times). Fixed-hour schedules are no longer supported.", fr: "Activer les rappels (jusqu’à trois par semaine, à des horaires variables). Les horaires fixes ne sont plus utilisés.", es: "Activar recordatorios (hasta tres por semana en horarios variables). Ya no se admiten horarios fijos.", de: "Erinnerungen aktivieren (bis zu drei pro Woche zu variablen Zeiten). Feste Zeiten werden nicht mehr unterstützt.", pt: "Ativar lembretes (até três por semana em horários variados). Horários fixos não são mais usados.", it: "Attiva i promemoria (fino a tre a settimana in orari variabili). Gli orari fissi non sono più supportati." }[tl] ?? "" },
        { name: `\`${p}quest reset\``, value: { en: "Reset all quests (asks for confirmation).", fr: "Réinitialiser toutes les quêtes (demande confirmation).", es: "Reiniciar todas las misiones (pide confirmación).", de: "Alle Quests zurücksetzen (fragt nach Bestätigung).", pt: "Redefinir todas as missões (pede confirmação).", it: "Reimposta tutte le missioni (chiede conferma)." }[tl] ?? "" },
      );
      break;

    case "birthday":
      embed.setTitle({ en: "🎂 Birthdays", fr: "🎂 Anniversaires", es: "🎂 Cumpleaños", de: "🎂 Geburtstage", pt: "🎂 Aniversários", it: "🎂 Compleanni" }[tl] ?? "🎂 Birthdays");
      embed.addFields(
        { name: `\`${p}birthday add DD/MM\``, value: { en: "Save your birthday.", fr: "Enregistrer ton anniversaire.", es: "Registrar tu cumpleaños.", de: "Deinen Geburtstag speichern.", pt: "Salvar seu aniversário.", it: "Salva il tuo compleanno." }[tl] ?? "" },
        { name: `\`${p}birthday list\``, value: { en: "View all saved birthdays.", fr: "Voir tous les anniversaires enregistrés.", es: "Ver todos los cumpleaños guardados.", de: "Alle gespeicherten Geburtstage anzeigen.", pt: "Ver todos os aniversários salvos.", it: "Vedi tutti i compleanni salvati." }[tl] ?? "" },
        { name: `\`${p}birthday remove [@user]\``, value: { en: "Remove a birthday (yours or another user's).", fr: "Supprimer un anniversaire (le tien ou celui d'un autre).", es: "Eliminar un cumpleaños (tuyo o de otro usuario).", de: "Einen Geburtstag entfernen.", pt: "Remover um aniversário.", it: "Rimuovi un compleanno." }[tl] ?? "" },
        { name: `\`${p}birthday channel #channel\``, value: { en: "Set the channel where birthday wishes are sent (admin).", fr: "Définir le salon où les vœux sont envoyés (admin).", es: "Establecer el canal donde se envían los deseos (admin).", de: "Kanal festlegen, in dem Geburtstagsgrüße gesendet werden (Admin).", pt: "Definir o canal onde os votos são enviados (admin).", it: "Imposta il canale dove vengono inviati gli auguri (admin)." }[tl] ?? "" },
      );
      break;

    case "guesslogo":
      embed.setTitle({ en: "🏷️ Guess The Logo", fr: "🏷️ Devine le Logo", es: "🏷️ Adivina el Logo", de: "🏷️ Errate das Logo", pt: "🏷️ Adivinhe o Logo", it: "🏷️ Indovina il Logo" }[tl] ?? "🏷️ Guess The Logo");
      embed.addFields(
        { name: `\`${p}guessthelogo [easy|medium|hard]\``, value: { en: "A brand logo is shown — type the brand name to win!", fr: "Un logo de marque est affiché — tape le nom de la marque pour gagner !", es: "Se muestra un logo de marca — escribe el nombre para ganar.", de: "Ein Markenlogo wird angezeigt — tippe den Markennamen um zu gewinnen!", pt: "Um logo de marca é mostrado — digite o nome da marca para ganhar!", it: "Viene mostrato un logo di marca — digita il nome del marchio per vincere!" }[tl] ?? "" },
        { name: `\`${p}guessthelogo stop\``, value: { en: "Cancel the current game.", fr: "Annuler la partie en cours.", es: "Cancelar el juego actual.", de: "Aktuelles Spiel abbrechen.", pt: "Cancelar o jogo atual.", it: "Annulla il gioco in corso." }[tl] ?? "" },
      );
      break;

    case "tools":
      embed.setTitle({ en: "🔍 Tools", fr: "🔍 Outils", es: "🔍 Herramientas", de: "🔍 Werkzeuge", pt: "🔍 Ferramentas", it: "🔍 Strumenti" }[tl] ?? "🔍 Tools");
      embed.setDescription({ en: "Run `!help <tool>` for more details on any tool.", fr: "Lance `!help <outil>` pour plus de détails.", es: "Usa `!help <herramienta>` para más detalles.", de: "`!help <Werkzeug>` für mehr Details ausführen.", pt: "Use `!help <ferramenta>` para mais detalhes.", it: "Usa `!help <strumento>` per più dettagli." }[tl] ?? "");
      embed.addFields(
        { name: `\`${p}define <word>\``, value: { en: "English dictionary with phonetics, examples, synonyms.", fr: "Dictionnaire anglais avec phonétique, exemples, synonymes.", es: "Diccionario inglés con fonética, ejemplos, sinónimos.", de: "Englisches Wörterbuch mit Phonetik, Beispielen, Synonymen.", pt: "Dicionário inglês com fonética, exemplos, sinônimos.", it: "Dizionario inglese con fonetica, esempi, sinonimi." }[tl] ?? "" },
        { name: `\`${p}qr <text>\``, value: { en: "Generate a QR code or read one from an attached image.", fr: "Générer un QR code ou en lire un depuis une image jointe.", es: "Generar un QR o leer uno desde una imagen adjunta.", de: "QR-Code erstellen oder aus einem angehängten Bild lesen.", pt: "Gerar um QR code ou ler um de uma imagem anexada.", it: "Generare un codice QR o leggerne uno da un'immagine allegata." }[tl] ?? "" },
        { name: `\`${p}echo\``, value: { en: "Repeat all messages in the channel (max 8). Run again to stop.", fr: "Répéter tous les messages du salon (max 8). Relancer pour arrêter.", es: "Repetir todos los mensajes del canal (máx 8). Ejecutar de nuevo para parar.", de: "Alle Nachrichten im Kanal wiederholen (max 8). Erneut ausführen zum Stoppen.", pt: "Repetir todas as mensagens no canal (max 8). Execute novamente para parar.", it: "Ripeti tutti i messaggi nel canale (max 8). Esegui di nuovo per fermare." }[tl] ?? "" },
        { name: `\`${p}pokemon <name>\``, value: { en: "Full Pokémon card: types, abilities, stats, height, weight.", fr: "Fiche Pokémon complète : types, talents, stats, taille, poids.", es: "Ficha Pokémon completa: tipos, habilidades, stats, altura, peso.", de: "Vollständige Pokémon-Karte: Typen, Fähigkeiten, Werte, Größe, Gewicht.", pt: "Ficha Pokémon completa: tipos, habilidades, stats, altura, peso.", it: "Scheda Pokémon completa: tipi, abilità, statistiche, altezza, peso." }[tl] ?? "" },
        { name: `\`${p}shazam\``, value: { en: "Identify a song from an attached audio file.", fr: "Identifier une chanson depuis un fichier audio joint.", es: "Identificar una canción desde un archivo de audio adjunto.", de: "Einen Song aus einer angehängten Audiodatei identifizieren.", pt: "Identificar uma música a partir de um arquivo de áudio anexado.", it: "Identificare una canzone da un file audio allegato." }[tl] ?? "" },
      );
      break;

    case "dictionary":
      embed.setTitle({ en: "📖 Dictionary", fr: "📖 Dictionnaire", es: "📖 Diccionario", de: "📖 Wörterbuch", pt: "📖 Dicionário", it: "📖 Dizionario" }[tl] ?? "📖 Dictionary");
      embed.addFields(
        { name: `\`${p}define <word>\`  ·  \`${p}dict <word>\``, value: { en: "Look up any English word. Returns phonetics, part of speech, definitions, examples, and synonyms. Automatically adapts the response label to your language.", fr: "Chercher n'importe quel mot anglais. Retourne phonétique, catégorie grammaticale, définitions, exemples et synonymes. La réponse s'adapte à ta langue.", es: "Buscar cualquier palabra en inglés. Devuelve fonética, categoría gramatical, definiciones, ejemplos y sinónimos.", de: "Beliebiges englisches Wort nachschlagen. Gibt Phonetik, Wortart, Definitionen, Beispiele und Synonyme zurück.", pt: "Pesquisar qualquer palavra em inglês. Retorna fonética, classe gramatical, definições, exemplos e sinônimos.", it: "Cerca qualsiasi parola inglese. Restituisce fonetica, parte del discorso, definizioni, esempi e sinonimi." }[tl] ?? "" },
      );
      break;

    case "qr":
      embed.setTitle("📷 QR Code");
      embed.addFields(
        { name: `\`${p}qr <text>\``, value: { en: "Generate a QR code image from any text or URL.", fr: "Générer un QR code depuis n'importe quel texte ou URL.", es: "Generar un código QR desde cualquier texto o URL.", de: "QR-Code aus beliebigem Text oder URL erstellen.", pt: "Gerar um código QR a partir de qualquer texto ou URL.", it: "Genera un codice QR da qualsiasi testo o URL." }[tl] ?? "" },
        { name: `\`${p}qr\` + ` + { en: "attached image", fr: "image jointe", es: "imagen adjunta", de: "angehängtes Bild", pt: "imagem anexada", it: "immagine allegata" }[tl], value: { en: "Scan and decode an existing QR code from a picture.", fr: "Scanner et décoder un QR code existant depuis une image.", es: "Escanear y decodificar un QR existente desde una imagen.", de: "Einen vorhandenen QR-Code aus einem Bild scannen und dekodieren.", pt: "Digitalizar e decodificar um QR code existente de uma imagem.", it: "Scansionare e decodificare un codice QR esistente da un'immagine." }[tl] ?? "" },
      );
      break;

    case "echo":
      embed.setTitle("🦜 Echo");
      embed.addFields(
        { name: `\`${p}echo\``, value: { en: "Start repeating all messages in the channel. Stops automatically after 8 messages.", fr: "Commencer à répéter tous les messages du salon. S'arrête après 8 messages.", es: "Empezar a repetir todos los mensajes del canal. Se para tras 8 mensajes.", de: "Alle Nachrichten im Kanal wiederholen. Stoppt automatisch nach 8 Nachrichten.", pt: "Repetir todas as mensagens no canal. Para automaticamente após 8 mensagens.", it: "Inizia a ripetere tutti i messaggi nel canale. Si ferma automaticamente dopo 8 messaggi." }[tl] ?? "" },
        { name: `\`${p}echo stop\``, value: { en: "Stop the echo manually.", fr: "Arrêter l'écho manuellement.", es: "Parar el eco manualmente.", de: "Echo manuell stoppen.", pt: "Parar o eco manualmente.", it: "Ferma l'eco manualmente." }[tl] ?? "" },
      );
      break;

    case "pokemon":
      embed.setTitle("🔴 Pokédex");
      embed.addFields(
        { name: `\`${p}pokemon <name>\`  ·  \`${p}dex <name>\``, value: { en: "Displays a full Pokémon card: types (colour-coded), abilities, base stats, height, and weight. Works with English names.", fr: "Affiche une fiche Pokémon complète : types (couleurs), talents, stats de base, taille et poids. Fonctionne avec les noms anglais.", es: "Muestra una ficha Pokémon completa: tipos (colores), habilidades, estadísticas base, altura y peso. Funciona con nombres en inglés.", de: "Zeigt eine vollständige Pokémon-Karte: Typen (farbcodiert), Fähigkeiten, Basiswerte, Größe und Gewicht. Funktioniert mit englischen Namen.", pt: "Exibe uma ficha Pokémon completa: tipos (coloridos), habilidades, estatísticas base, altura e peso. Funciona com nomes em inglês.", it: "Mostra una scheda Pokémon completa: tipi (codice colore), abilità, statistiche base, altezza e peso. Funziona con nomi inglesi." }[tl] ?? "" },
      );
      break;

    case "welcome":
      embed.setTitle({ en: "👋 Dynamic Welcome", fr: "👋 Bienvenue dynamique", es: "👋 Bienvenida dinámica", de: "👋 Dynamische Begrüßung", pt: "👋 Boas-vindas dinâmicas", it: "👋 Benvenuto dinamico" }[tl] ?? "👋 Welcome");
      embed.addFields(
        { name: `\`${p}welcome set #channel\``, value: { en: "Set the channel where welcome messages are sent.", fr: "Définir le salon où les messages de bienvenue sont envoyés.", es: "Establecer el canal donde se envían los mensajes de bienvenida.", de: "Den Kanal festlegen, in dem Willkommensnachrichten gesendet werden.", pt: "Definir o canal onde as mensagens de boas-vindas são enviadas.", it: "Impostare il canale in cui vengono inviati i messaggi di benvenuto." }[tl] ?? "" },
        { name: `\`${p}welcome msg <text>\``, value: { en: "Customize the welcome message. Variables: `{user}` `{server}` `{count}`.", fr: "Personnaliser le message de bienvenue. Variables : `{user}` `{server}` `{count}`.", es: "Personalizar el mensaje de bienvenida. Variables: `{user}` `{server}` `{count}`.", de: "Die Willkommensnachricht anpassen. Variablen: `{user}` `{server}` `{count}`.", pt: "Personalizar a mensagem de boas-vindas. Variáveis: `{user}` `{server}` `{count}`.", it: "Personalizzare il messaggio di benvenuto. Variabili: `{user}` `{server}` `{count}`." }[tl] ?? "" },
        { name: `\`${p}welcome clear\`  ·  \`${p}welcome status\``, value: { en: "Reset to default message or view current config.", fr: "Remettre le message par défaut ou voir la config actuelle.", es: "Restablecer el mensaje predeterminado o ver la configuración.", de: "Standardnachricht zurücksetzen oder aktuelle Konfiguration anzeigen.", pt: "Redefinir para a mensagem padrão ou ver a configuração atual.", it: "Ripristina il messaggio predefinito o vedi la configurazione attuale." }[tl] ?? "" },
      );
      break;

    case "schedule":
      embed.setTitle({ en: "⏰ Scheduled Messages", fr: "⏰ Messages planifiés", es: "⏰ Mensajes programados", de: "⏰ Geplante Nachrichten", pt: "⏰ Mensagens agendadas", it: "⏰ Messaggi pianificati" }[tl] ?? "⏰ Schedule");
      embed.addFields(
        { name: `\`${p}schedule set HH:MM #channel <msg>\``, value: { en: "Schedule a one-time message at a specific time (UTC).", fr: "Planifier un message unique à une heure précise (UTC).", es: "Programar un mensaje único a una hora específica (UTC).", de: "Eine einmalige Nachricht zu einer bestimmten Uhrzeit planen (UTC).", pt: "Agendar uma mensagem única em um horário específico (UTC).", it: "Pianificare un messaggio una tantum a un'ora specifica (UTC)." }[tl] ?? "" },
        { name: `\`${p}schedule daily HH:MM #channel <msg>\``, value: { en: "Schedule a message sent every day at that time (UTC).", fr: "Planifier un message envoyé chaque jour à cette heure (UTC).", es: "Programar un mensaje enviado cada día a esa hora (UTC).", de: "Eine täglich gesendete Nachricht zu einer bestimmten Uhrzeit planen (UTC).", pt: "Agendar uma mensagem enviada todos os dias naquele horário (UTC).", it: "Pianificare un messaggio inviato ogni giorno a quell'ora (UTC)." }[tl] ?? "" },
        { name: `\`${p}schedule list\`  ·  \`${p}schedule cancel <ID>\``, value: { en: "View all scheduled messages or cancel one by ID.", fr: "Voir tous les messages planifiés ou en annuler un par ID.", es: "Ver todos los mensajes programados o cancelar uno por ID.", de: "Alle geplanten Nachrichten anzeigen oder eine nach ID abbrechen.", pt: "Ver todas as mensagens agendadas ou cancelar uma por ID.", it: "Vedi tutti i messaggi pianificati o annullane uno per ID." }[tl] ?? "" },
      );
      break;

    case "food":
      embed.setTitle({ en: "🥗 Food Scanner", fr: "🥗 Scanner Alimentaire", es: "🥗 Escáner de Comida", de: "🥗 Lebensmittel-Scanner", pt: "🥗 Scanner de Alimentos", it: "🥗 Scanner Alimentare" }[tl] ?? "🥗 Food");
      embed.addFields(
        { name: `\`${p}food\`  ·  \`${p}food scan\``, value: { en: "Scan a food product from a photo or barcode. Returns Nutri-Score and nutritional info.", fr: "Scanner un produit alimentaire depuis une photo ou un code-barre. Retourne le Nutri-Score et les infos nutritionnelles.", es: "Escanear un producto alimenticio desde una foto o código de barras.", de: "Ein Lebensmittelprodukt anhand eines Fotos oder Barcodes scannen.", pt: "Escanear um produto alimentar a partir de uma foto ou código de barras.", it: "Scansionare un prodotto alimentare da una foto o codice a barre." }[tl] ?? "" },
        { name: `\`${p}food history\`  ·  \`${p}food clear\``, value: { en: "View your last 10 scanned products or clear your history.", fr: "Voir tes 10 derniers produits scannés ou effacer l'historique.", es: "Ver tus últimos 10 productos escaneados o borrar el historial.", de: "Deine letzten 10 gescannten Produkte anzeigen oder verlauf löschen.", pt: "Ver seus últimos 10 produtos escaneados ou limpar o histórico.", it: "Vedi i tuoi ultimi 10 prodotti scansionati o cancella la cronologia." }[tl] ?? "" },
      );
      break;

    case "tierlist":
      embed.setTitle({ en: "🏆 Tier List", fr: "🏆 Tier list", es: "🏆 Tier list", de: "🏆 Tier-Liste", pt: "🏆 Tier list", it: "🏆 Tier list" }[tl] ?? "🏆 Tier List");
      embed.addFields(
        { name: `\`${p}tierlist [theme]\`  ·  \`${p}tier [theme]\``, value: { en: "Start a tier list game. Sort 20 items into S / A / B / C / D tiers using buttons. The embed updates live after each pick.", fr: "Lance une tier list. Classe 20 éléments en tiers S / A / B / C / D via des boutons. L'embed se met à jour en direct.", es: "Inicia una tier list. Clasifica 20 elementos en tiers S / A / B / C / D con botones. El embed se actualiza en directo.", de: "Starte eine Tier-Liste. Sortiere 20 Elemente per Buttons in S / A / B / C / D. Das Embed aktualisiert sich live.", pt: "Inicia uma tier list. Classifica 20 itens em tiers S / A / B / C / D com botões. O embed atualiza ao vivo.", it: "Avvia una tier list. Classifica 20 elementi in tier S / A / B / C / D con pulsanti. L'embed si aggiorna in tempo reale." }[tl] ?? "" },
        { name: { en: "🎨 Themes", fr: "🎨 Thèmes", es: "🎨 Temas", de: "🎨 Themen", pt: "🎨 Temas", it: "🎨 Temi" }[tl] ?? "Themes",
          value: "`pokemon` · `anime` · `marvel` · `food` · `games` · `movies`" },
      );
      break;

    case "blindtest":
      embed.setTitle({ en: "🎵 Blind Test", fr: "🎵 Blind test", es: "🎵 Blind test", de: "🎵 Musikquiz", pt: "🎵 Quiz musical", it: "🎵 Quiz musicale" }[tl] ?? "🎵 Blind Test");
      embed.addFields(
        { name: `\`${p}blindtest [theme] [easy|hard]\`  ·  \`${p}musicquiz\``,
          value: { en: "10-round music blind test. A 25-second audio clip is sent — guess the song title.", fr: "Blind test musical en 10 manches. Un clip audio de 25s est envoyé — devine le titre de la chanson.", es: "Blind test musical de 10 rondas. Se envía un clip de 25s — adivina el título de la canción.", de: "10 Runden Musik-Blindtest. Ein 25s-Audioclip wird gesendet — errate den Songtitel.", pt: "Blind test musical de 10 rodadas. Um clipe de 25s é enviado — adivinhe o título da música.", it: "Blind test musicale di 10 round. Un clip audio di 25s viene inviato — indovina il titolo della canzone." }[tl] ?? "" },
        { name: { en: "🟢 Easy", fr: "🟢 Facile", es: "🟢 Fácil", de: "🟢 Einfach", pt: "🟢 Fácil", it: "🟢 Facile" }[tl] ?? "🟢 Easy", value: { en: "4 answer buttons (+1 pt each). Press the right one before time runs out.", fr: "4 boutons de réponse (+1 pt). Appuie sur le bon avant la fin du temps.", es: "4 botones de respuesta (+1 pt). Pulsa el correcto antes de que se acabe el tiempo.", de: "4 Antwortknöpfe (+1 Pkt.). Drücke den richtigen, bevor die Zeit abläuft.", pt: "4 botões de resposta (+1 pt). Pressione o correto antes do tempo acabar.", it: "4 pulsanti di risposta (+1 pt). Premi quello giusto prima che il tempo scada." }[tl] ?? "", inline: true },
        { name: { en: "🔴 Hard", fr: "🔴 Difficile", es: "🔴 Difícil", de: "🔴 Schwer", pt: "🔴 Difícil", it: "🔴 Difficile" }[tl] ?? "🔴 Hard", value: { en: "Type the answer in chat (+2 pts, 15s timer). Typos of ±3 characters are accepted.", fr: "Tape la réponse dans le chat (+2 pts, 15s). Les fautes de ±3 caractères sont acceptées.", es: "Escribe la respuesta en el chat (+2 pts, 15s). Se aceptan ±3 caracteres de diferencia.", de: "Antwort im Chat eintippen (+2 Pkt., 15s). ±3 Zeichen Tippfehler werden akzeptiert.", pt: "Digite a resposta no chat (+2 pts, 15s). Erros de ±3 caracteres são aceitos.", it: "Scrivi la risposta nella chat (+2 pt, 15s). Vengono accettati ±3 caratteri di errore." }[tl] ?? "", inline: true },
        { name: { en: "🎧 Themes", fr: "🎧 Thèmes", es: "🎧 Temas", de: "🎧 Themen", pt: "🎧 Temas", it: "🎧 Temi" }[tl] ?? "Themes",
          value: "`pop` · `rock` · `hiphop` · `rnb` · `electronic` · `kpop` · `french` · `lofi` · `gaming` · `80s` · `90s` · `anime`" },
      );
      break;

    case "milliongame":
      embed.setTitle({ en: "💰 Million Game", fr: "💰 Jeu du million", es: "💰 Juego del millón", de: "💰 Millionenspiel", pt: "💰 Jogo do milhão", it: "💰 Gioco del milione" }[tl] ?? "💰 Million Game");
      embed.addFields(
        { name: `\`${p}milliongame\`  ·  \`${p}million\``,
          value: { en: "15 questions from €100 to €1,000,000 (OpenTDB API). Answers via buttons.", fr: "15 questions de 100€ à 1 000 000€ (API OpenTDB). Réponses via boutons.", es: "15 preguntas de €100 a €1.000.000 (API OpenTDB). Respuestas con botones.", de: "15 Fragen von 100€ bis 1.000.000€ (OpenTDB API). Antworten per Buttons.", pt: "15 perguntas de €100 a €1.000.000 (API OpenTDB). Respostas via botões.", it: "15 domande da €100 a €1.000.000 (API OpenTDB). Risposte tramite pulsanti." }[tl] ?? "" },
        { name: { en: "🛡️ Safe Checkpoints", fr: "🛡️ Paliers de sécurité", es: "🛡️ Puntos de control seguros", de: "🛡️ Sicherheitsstufen", pt: "🛡️ Checkpoints seguros", it: "🛡️ Checkpoint sicuri" }[tl] ?? "Checkpoints",
          value: { en: "Q5 = €1,000 · Q10 = €32,000 · You keep the checkpoint prize if you answer wrong after.", fr: "Q5 = 1 000€ · Q10 = 32 000€ · Tu gardes le palier si tu réponds mal après.", es: "Q5 = €1.000 · Q10 = €32.000 · Conservas el checkpoint si fallas después.", de: "F5 = 1.000€ · F10 = 32.000€ · Du behältst den Betrag wenn du danach falsch liegst.", pt: "Q5 = €1.000 · Q10 = €32.000 · Você fica com o checkpoint se errar depois.", it: "Q5 = €1.000 · Q10 = €32.000 · Mantieni il checkpoint se sbagli dopo." }[tl] ?? "" },
        { name: { en: "🃏 Lifelines", fr: "🃏 Jokers", es: "🃏 Comodines", de: "🃏 Joker", pt: "🃏 Salva-vidas", it: "🃏 Aiuti" }[tl] ?? "Lifelines",
          value: { en: "**50/50** — removes 2 wrong answers · **📞 Phone** — hint from a friend · **👥 Audience** — bar chart poll", fr: "**50/50** — supprime 2 mauvaises réponses · **📞 Téléphone** — indice d'un ami · **👥 Sondage** — vote du public", es: "**50/50** — elimina 2 respuestas incorrectas · **📞 Llamada** — pista de un amigo · **👥 Público** — votación", de: "**50/50** — entfernt 2 falsche Antworten · **📞 Joker** — Hinweis vom Freund · **👥 Publikum** — Abstimmung", pt: "**50/50** — remove 2 respostas erradas · **📞 Ligar** — dica de um amigo · **👥 Público** — votação", it: "**50/50** — rimuove 2 risposte sbagliate · **📞 Chiama** — suggerimento da un amico · **👥 Pubblico** — sondaggio" }[tl] ?? "" },
        { name: { en: "🚶 Walk Away", fr: "🚶 Arrêter et garder le gain", es: "🚶 Retirarse con el premio", de: "🚶 Mit dem Gewinn aufhören", pt: "🚶 Parar e ficar com o prêmio", it: "🚶 Fermarsi e tenere il premio" }[tl] ?? "🚶 Walk Away", value: { en: "Press Walk Away at any time to leave with your current prize.", fr: "Appuie sur « Arrêter » à tout moment pour repartir avec ta cagnotte actuelle.", es: "Pulsa «Retirarse» para llevarte el premio actual.", de: "Wähle „Aufhören“, um deinen aktuellen Gewinn mitzunehmen.", pt: "Pressione «Parar» para sair com o prêmio atual.", it: "Premi «Fermati» per tenere il premio attuale." }[tl] ?? "" },
      );
      break;

    default:
      embed.setTitle("❓ Help");
      embed.setDescription({ en: "Topic not found. Try `!help` for the main menu.", fr: "Sujet introuvable. Essaie `!help` pour le menu principal.", es: "Tema no encontrado. Usa `!help` para el menú principal.", de: "Thema nicht gefunden. Versuche `!help` für das Hauptmenü.", pt: "Tópico não encontrado. Use `!help` para o menu principal.", it: "Argomento non trovato. Usa `!help` per il menu principale." }[tl] ?? "");
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

// ── Setup & admin guides ──────────────────────────────────────────────────────

const SETUP_GUIDE_COPY: Record<HelpLanguage, {
  title: string; description: string; fields: [string, string][]; footer: string;
}> = {
  en: {
    title: "🛠️ Bot Setup Guide", description: "Required and optional API keys to unlock all features.",
    fields: [
      ["✅ Required", "`DISCORD_TOKEN` — main bot token"],
      ["🤖 AI features (`@bot`, `!trivia`, `!conspiracy`, `!voice`)", "`GROQ_API_KEY` — free at console.groq.com"],
      ["🎵 Music generation (`!music generator`)", "`SUNO_API_KEY` — from sunoapi.org"],
      ["🖼️ Image generation (`!image`, `/image`, persona photos)", "Cloudflare: `ACCOUNT_ID` + `TOKEN_API` (Workers AI). Optional fallback: `HUGGINGFACE_TOKEN`."],
      ["🗄️ Persistent data (quests, likes, playlists, logos)", "`DATABASE_URL` — MongoDB connection URL\n`ENCRYPTION_KEY` — 64-char hex (run the project's key-generation command)"],
      ["🏷️ Guess The Logo (`!guessthelogo`)", "`LOGO_DEV_PUBLIC_KEY` — from logo.dev"],
      ["🎵 Song recognition (`!shazam`)", "`AUDD_API_KEY` — from audd.io"],
      ["⚔️ AI Battle (`!ai battle`)", "`DISCORD_TOKEN_2` — second bot token"],
    ],
    footer: "Add secrets in the Replit Secrets tab or your deployment environment.",
  },
  fr: {
    title: "🛠️ Guide de configuration du bot", description: "Clés API requises et facultatives pour activer les fonctionnalités.",
    fields: [
      ["✅ Obligatoire", "`DISCORD_TOKEN` — jeton principal du bot"],
      ["🤖 Fonctions IA (`@bot`, `!trivia`, `!conspiracy`, `!voice`)", "`GROQ_API_KEY` — gratuit sur console.groq.com"],
      ["🎵 Génération musicale (`!music generator`)", "`SUNO_API_KEY` — disponible sur sunoapi.org"],
      ["🖼️ Génération d’images (`!image`, `/image`, photos des personas)", "Cloudflare : `ACCOUNT_ID` + `TOKEN_API` (Workers AI). Secours facultatif : `HUGGINGFACE_TOKEN`."],
      ["🗄️ Données persistantes (quêtes, likes, playlists, logos)", "`DATABASE_URL` — adresse de connexion MongoDB\n`ENCRYPTION_KEY` — clé hexadécimale de 64 caractères, générée avec la commande prévue dans le projet"],
      ["🏷️ Devine le logo (`!guessthelogo`)", "`LOGO_DEV_PUBLIC_KEY` — disponible sur logo.dev"],
      ["🎵 Reconnaissance musicale (`!shazam`)", "`AUDD_API_KEY` — disponible sur audd.io"],
      ["⚔️ Combat IA (`!ai battle`)", "`DISCORD_TOKEN_2` — jeton du deuxième bot"],
    ],
    footer: "Ajoute les secrets dans l’onglet Secrets de Replit ou dans l’environnement de déploiement.",
  },
  es: {
    title: "🛠️ Guía de configuración del bot", description: "Claves API necesarias y opcionales para activar todas las funciones.",
    fields: [
      ["✅ Obligatorio", "`DISCORD_TOKEN` — token principal del bot"],
      ["🤖 Funciones de IA (`@bot`, `!trivia`, `!conspiracy`, `!voice`)", "`GROQ_API_KEY` — gratis en console.groq.com"],
      ["🎵 Generación de música (`!music generator`)", "`SUNO_API_KEY` — en sunoapi.org"],
      ["🖼️ Generación de imágenes (`!image`, `/image`)", "Cloudflare: `ACCOUNT_ID` + `TOKEN_API` (Workers AI). Alternativa: `HUGGINGFACE_TOKEN`."],
      ["🗄️ Datos persistentes (misiones, likes, listas, logos)", "`DATABASE_URL` — URL de MongoDB\n`ENCRYPTION_KEY` — clave hexadecimal de 64 caracteres, generada con el comando del proyecto"],
      ["🏷️ Adivina el logo (`!guessthelogo`)", "`LOGO_DEV_PUBLIC_KEY` — en logo.dev"],
      ["🎵 Reconocimiento de canciones (`!shazam`)", "`AUDD_API_KEY` — en audd.io"],
      ["⚔️ Combate de IA (`!ai battle`)", "`DISCORD_TOKEN_2` — token del segundo bot"],
    ],
    footer: "Añade los secretos en la pestaña Secrets de Replit o en el entorno de despliegue.",
  },
  de: {
    title: "🛠️ Bot-Einrichtungsanleitung", description: "Erforderliche und optionale API-Schlüssel für alle Funktionen.",
    fields: [
      ["✅ Erforderlich", "`DISCORD_TOKEN` — Haupttoken des Bots"],
      ["🤖 KI-Funktionen (`@bot`, `!trivia`, `!conspiracy`, `!voice`)", "`GROQ_API_KEY` — kostenlos auf console.groq.com"],
      ["🎵 Musikerstellung (`!music generator`)", "`SUNO_API_KEY` — auf sunoapi.org"],
      ["🖼️ Bilderstellung (`!image`, `/image`)", "Cloudflare: `ACCOUNT_ID` + `TOKEN_API` (Workers AI). Alternative: `HUGGINGFACE_TOKEN`."],
      ["🗄️ Dauerhafte Daten (Quests, Likes, Playlists, Logos)", "`DATABASE_URL` — MongoDB-Verbindungsadresse\n`ENCRYPTION_KEY` — 64-stelliger Hex-Schlüssel, mit dem Projektbefehl erstellt"],
      ["🏷️ Logo erraten (`!guessthelogo`)", "`LOGO_DEV_PUBLIC_KEY` — auf logo.dev"],
      ["🎵 Musikerkennung (`!shazam`)", "`AUDD_API_KEY` — auf audd.io"],
      ["⚔️ KI-Kampf (`!ai battle`)", "`DISCORD_TOKEN_2` — Token des zweiten Bots"],
    ],
    footer: "Füge Secrets im Replit-Tab „Secrets“ oder in der Deployment-Umgebung hinzu.",
  },
  pt: {
    title: "🛠️ Guia de configuração do bot", description: "Chaves de API obrigatórias e opcionais para ativar todos os recursos.",
    fields: [
      ["✅ Obrigatório", "`DISCORD_TOKEN` — token principal do bot"],
      ["🤖 Recursos de IA (`@bot`, `!trivia`, `!conspiracy`, `!voice`)", "`GROQ_API_KEY` — grátis em console.groq.com"],
      ["🎵 Geração de música (`!music generator`)", "`SUNO_API_KEY` — em sunoapi.org"],
      ["🖼️ Geração de imagens (`!image`, `/image`)", "Cloudflare: `ACCOUNT_ID` + `TOKEN_API` (Workers AI). Alternativa: `HUGGINGFACE_TOKEN`."],
      ["🗄️ Dados persistentes (missões, curtidas, playlists, logos)", "`DATABASE_URL` — URL do MongoDB\n`ENCRYPTION_KEY` — chave hexadecimal de 64 caracteres, gerada pelo comando do projeto"],
      ["🏷️ Adivinhe o logo (`!guessthelogo`)", "`LOGO_DEV_PUBLIC_KEY` — em logo.dev"],
      ["🎵 Reconhecimento de música (`!shazam`)", "`AUDD_API_KEY` — em audd.io"],
      ["⚔️ Batalha de IA (`!ai battle`)", "`DISCORD_TOKEN_2` — token do segundo bot"],
    ],
    footer: "Adicione os secrets na aba Secrets do Replit ou no ambiente de implantação.",
  },
  it: {
    title: "🛠️ Guida alla configurazione del bot", description: "Chiavi API obbligatorie e facoltative per attivare tutte le funzioni.",
    fields: [
      ["✅ Obbligatorio", "`DISCORD_TOKEN` — token principale del bot"],
      ["🤖 Funzioni IA (`@bot`, `!trivia`, `!conspiracy`, `!voice`)", "`GROQ_API_KEY` — gratuito su console.groq.com"],
      ["🎵 Generazione musicale (`!music generator`)", "`SUNO_API_KEY` — su sunoapi.org"],
      ["🖼️ Generazione immagini (`!image`, `/image`)", "Cloudflare: `ACCOUNT_ID` + `TOKEN_API` (Workers AI). Alternativa: `HUGGINGFACE_TOKEN`."],
      ["🗄️ Dati persistenti (missioni, like, playlist, loghi)", "`DATABASE_URL` — URL di MongoDB\n`ENCRYPTION_KEY` — chiave esadecimale di 64 caratteri, generata dal comando del progetto"],
      ["🏷️ Indovina il logo (`!guessthelogo`)", "`LOGO_DEV_PUBLIC_KEY` — su logo.dev"],
      ["🎵 Riconoscimento musicale (`!shazam`)", "`AUDD_API_KEY` — su audd.io"],
      ["⚔️ Sfida IA (`!ai battle`)", "`DISCORD_TOKEN_2` — token del secondo bot"],
    ],
    footer: "Aggiungi i secrets nella scheda Secrets di Replit o nell’ambiente di deployment.",
  },
  ja: {
    title: "🛠️ ボット設定ガイド", description: "すべての機能を有効にするために必要なAPIキーと任意のAPIキーです。",
    fields: [
      ["✅ 必須", "`DISCORD_TOKEN` — メインボットのトークン"],
      ["🤖 AI機能 (`@bot`, `!trivia`, `!conspiracy`, `!voice`)", "`GROQ_API_KEY` — console.groq.comで無料取得"],
      ["🎵 音楽生成 (`!music generator`)", "`SUNO_API_KEY` — sunoapi.orgで取得"],
      ["🖼️ 画像生成 (`!image`, `/image`)", "Cloudflare: `ACCOUNT_ID` + `TOKEN_API` (Workers AI)。代替: `HUGGINGFACE_TOKEN`。"],
      ["🗄️ 永続データ（クエスト、いいね、プレイリスト、ロゴ）", "`DATABASE_URL` — MongoDB接続URL\n`ENCRYPTION_KEY` — プロジェクトのコマンドで生成する64文字の16進数キー"],
      ["🏷️ ロゴ当て (`!guessthelogo`)", "`LOGO_DEV_PUBLIC_KEY` — logo.devで取得"],
      ["🎵 曲の認識 (`!shazam`)", "`AUDD_API_KEY` — audd.ioで取得"],
      ["⚔️ AIバトル (`!ai battle`)", "`DISCORD_TOKEN_2` — 2つ目のボットのトークン"],
    ],
    footer: "ReplitのSecretsタブ、またはデプロイ環境にシークレットを追加してください。",
  },
  nl: {
    title: "🛠️ Installatiegids voor de bot", description: "Vereiste en optionele API-sleutels om alle functies te gebruiken.",
    fields: [
      ["✅ Vereist", "`DISCORD_TOKEN` — hoofdtoken van de bot"],
      ["🤖 AI-functies (`@bot`, `!trivia`, `!conspiracy`, `!voice`)", "`GROQ_API_KEY` — gratis via console.groq.com"],
      ["🎵 Muziek maken (`!music generator`)", "`SUNO_API_KEY` — via sunoapi.org"],
      ["🖼️ Afbeeldingen maken (`!image`, `/image`)", "Cloudflare: `ACCOUNT_ID` + `TOKEN_API` (Workers AI). Alternatief: `HUGGINGFACE_TOKEN`."],
      ["🗄️ Blijvende gegevens (quests, likes, playlists, logo's)", "`DATABASE_URL` — MongoDB-verbindingsadres\n`ENCRYPTION_KEY` — 64 tekens lange hexsleutel, gemaakt met het projectcommando"],
      ["🏷️ Logo raden (`!guessthelogo`)", "`LOGO_DEV_PUBLIC_KEY` — via logo.dev"],
      ["🎵 Nummers herkennen (`!shazam`)", "`AUDD_API_KEY` — via audd.io"],
      ["⚔️ AI-gevecht (`!ai battle`)", "`DISCORD_TOKEN_2` — token van de tweede bot"],
    ],
    footer: "Voeg secrets toe via het tabblad Secrets van Replit of je deploymentomgeving.",
  },
  ru: {
    title: "🛠️ Руководство по настройке бота", description: "Обязательные и дополнительные API-ключи для всех функций.",
    fields: [
      ["✅ Обязательно", "`DISCORD_TOKEN` — основной токен бота"],
      ["🤖 Функции ИИ (`@bot`, `!trivia`, `!conspiracy`, `!voice`)", "`GROQ_API_KEY` — бесплатно на console.groq.com"],
      ["🎵 Создание музыки (`!music generator`)", "`SUNO_API_KEY` — на sunoapi.org"],
      ["🖼️ Создание изображений (`!image`, `/image`)", "Cloudflare: `ACCOUNT_ID` + `TOKEN_API` (Workers AI). Резерв: `HUGGINGFACE_TOKEN`."],
      ["🗄️ Постоянные данные (задания, лайки, плейлисты, логотипы)", "`DATABASE_URL` — адрес MongoDB\n`ENCRYPTION_KEY` — 64-символьный hex-ключ, созданный командой проекта"],
      ["🏷️ Угадай логотип (`!guessthelogo`)", "`LOGO_DEV_PUBLIC_KEY` — на logo.dev"],
      ["🎵 Распознавание музыки (`!shazam`)", "`AUDD_API_KEY` — на audd.io"],
      ["⚔️ Битва ИИ (`!ai battle`)", "`DISCORD_TOKEN_2` — токен второго бота"],
    ],
    footer: "Добавь secrets на вкладке Secrets Replit или в среде развёртывания.",
  },
  pl: {
    title: "🛠️ Instrukcja konfiguracji bota", description: "Wymagane i opcjonalne klucze API do uruchomienia wszystkich funkcji.",
    fields: [
      ["✅ Wymagane", "`DISCORD_TOKEN` — główny token bota"],
      ["🤖 Funkcje AI (`@bot`, `!trivia`, `!conspiracy`, `!voice`)", "`GROQ_API_KEY` — bezpłatnie na console.groq.com"],
      ["🎵 Generowanie muzyki (`!music generator`)", "`SUNO_API_KEY` — na sunoapi.org"],
      ["🖼️ Generowanie obrazów (`!image`, `/image`)", "Cloudflare: `ACCOUNT_ID` + `TOKEN_API` (Workers AI). Alternatywa: `HUGGINGFACE_TOKEN`."],
      ["🗄️ Dane trwałe (zadania, polubienia, playlisty, logotypy)", "`DATABASE_URL` — adres MongoDB\n`ENCRYPTION_KEY` — 64-znakowy klucz szesnastkowy wygenerowany poleceniem projektu"],
      ["🏷️ Zgadnij logo (`!guessthelogo`)", "`LOGO_DEV_PUBLIC_KEY` — z logo.dev"],
      ["🎵 Rozpoznawanie utworów (`!shazam`)", "`AUDD_API_KEY` — z audd.io"],
      ["⚔️ Bitwa AI (`!ai battle`)", "`DISCORD_TOKEN_2` — token drugiego bota"],
    ],
    footer: "Dodaj secrets w zakładce Secrets Replit albo w środowisku wdrożeniowym.",
  },
  tr: {
    title: "🛠️ Bot kurulum rehberi", description: "Tüm özellikleri açmak için gerekli ve isteğe bağlı API anahtarları.",
    fields: [
      ["✅ Gerekli", "`DISCORD_TOKEN` — ana bot belirteci"],
      ["🤖 Yapay zekâ özellikleri (`@bot`, `!trivia`, `!conspiracy`, `!voice`)", "`GROQ_API_KEY` — console.groq.com adresinde ücretsiz"],
      ["🎵 Müzik oluşturma (`!music generator`)", "`SUNO_API_KEY` — sunoapi.org adresinden"],
      ["🖼️ Görsel oluşturma (`!image`, `/image`)", "Cloudflare: `ACCOUNT_ID` + `TOKEN_API` (Workers AI). Alternatif: `HUGGINGFACE_TOKEN`."],
      ["🗄️ Kalıcı veriler (görevler, beğeniler, çalma listeleri, logolar)", "`DATABASE_URL` — MongoDB bağlantı adresi\n`ENCRYPTION_KEY` — proje komutuyla oluşturulan 64 karakterlik onaltılık anahtar"],
      ["🏷️ Logoyu tahmin et (`!guessthelogo`)", "`LOGO_DEV_PUBLIC_KEY` — logo.dev adresinden"],
      ["🎵 Şarkı tanıma (`!shazam`)", "`AUDD_API_KEY` — audd.io adresinden"],
      ["⚔️ Yapay zekâ savaşı (`!ai battle`)", "`DISCORD_TOKEN_2` — ikinci botun belirteci"],
    ],
    footer: "Secrets değerlerini Replit Secrets sekmesine veya dağıtım ortamına ekle.",
  },
};

export async function sendSetupGuide(message: Message, language: HelpLanguage = "en"): Promise<void> {
  const copy = SETUP_GUIDE_COPY[language];
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(copy.title)
    .setDescription(copy.description)
    .addFields(copy.fields.map(([name, value]) => ({ name, value, inline: false })))
    .setFooter({ text: copy.footer });
  await message.reply({ embeds: [embed] });
}

const ADMIN_GUIDE_COPY: Record<HelpLanguage, {
  title: string; description: string; footer: string; names: string[]; descriptions: string[];
}> = {
  en: { title: "🔧 Admin Commands", description: "Requires Manage Server or Administrator permission.", footer: "These commands are not listed in public !help.", names: ["🌐 Server language", "📝 Prefix", "👋 Welcome", "⏰ Schedule", "🎤 Voice Picker", "🏷️ Logo admin", "📢 Admin channel", "📻 Custom radio", "🚫 Moderation"], descriptions: ["set the server's default language", "change the command prefix", "configure welcome messages", "schedule, list, or cancel messages", "choose suggested voice channels", "manage the logo game database", "choose the channel for unknown-command suggestions", "add a custom radio station", "block, unblock, or list users"] },
  fr: { title: "🔧 Commandes d’administration", description: "Nécessite la permission Gérer le serveur ou Administrateur.", footer: "Ces commandes ne figurent pas dans !help public.", names: ["🌐 Langue du serveur", "📝 Préfixe", "👋 Bienvenue", "⏰ Planification", "🎤 Sélecteur vocal", "🏷️ Administration des logos", "📢 Salon d’administration", "📻 Radio personnalisée", "🚫 Modération"], descriptions: ["définir la langue par défaut du serveur", "modifier le préfixe des commandes", "configurer les messages de bienvenue", "planifier, lister ou annuler des messages", "choisir les salons vocaux proposés", "gérer la base du jeu de logos", "choisir le salon des suggestions de commandes inconnues", "ajouter une station personnalisée", "bloquer, débloquer ou lister des utilisateurs"] },
  es: { title: "🔧 Comandos de administración", description: "Requiere el permiso Gestionar servidor o Administrador.", footer: "Estos comandos no aparecen en el !help público.", names: ["🌐 Idioma del servidor", "📝 Prefijo", "👋 Bienvenida", "⏰ Programación", "🎤 Selector de voz", "🏷️ Administración de logos", "📢 Canal de administración", "📻 Radio personalizada", "🚫 Moderación"], descriptions: ["establecer el idioma predeterminado", "cambiar el prefijo de los comandos", "configurar mensajes de bienvenida", "programar, listar o cancelar mensajes", "elegir los canales de voz sugeridos", "gestionar la base de datos del juego de logos", "elegir el canal para sugerencias de comandos", "añadir una emisora personalizada", "bloquear, desbloquear o listar usuarios"] },
  de: { title: "🔧 Admin-Befehle", description: "Erfordert „Server verwalten“ oder Administratorrechte.", footer: "Diese Befehle stehen nicht in der öffentlichen !help-Liste.", names: ["🌐 Serversprache", "📝 Präfix", "👋 Begrüßung", "⏰ Zeitplan", "🎤 Sprachkanal-Auswahl", "🏷️ Logo-Administration", "📢 Admin-Kanal", "📻 Benutzerdefiniertes Radio", "🚫 Moderation"], descriptions: ["Standardsprache des Servers festlegen", "Befehlspräfix ändern", "Begrüßungsnachrichten einrichten", "Nachrichten planen, anzeigen oder abbrechen", "vorgeschlagene Sprachkanäle auswählen", "Datenbank des Logo-Spiels verwalten", "Kanal für Vorschläge unbekannter Befehle festlegen", "einen eigenen Sender hinzufügen", "Benutzer sperren, entsperren oder auflisten"] },
  pt: { title: "🔧 Comandos de administração", description: "Exige a permissão Gerenciar servidor ou Administrador.", footer: "Estes comandos não aparecem no !help público.", names: ["🌐 Idioma do servidor", "📝 Prefixo", "👋 Boas-vindas", "⏰ Agendamento", "🎤 Seletor de voz", "🏷️ Administração de logos", "📢 Canal de administração", "📻 Rádio personalizado", "🚫 Moderação"], descriptions: ["definir o idioma padrão do servidor", "alterar o prefixo dos comandos", "configurar mensagens de boas-vindas", "agendar, listar ou cancelar mensagens", "escolher os canais de voz sugeridos", "gerenciar o banco de dados do jogo de logos", "escolher o canal de sugestões de comandos", "adicionar uma estação personalizada", "bloquear, desbloquear ou listar usuários"] },
  it: { title: "🔧 Comandi amministrativi", description: "Richiede il permesso Gestire server o Amministratore.", footer: "Questi comandi non sono elencati in !help pubblico.", names: ["🌐 Lingua del server", "📝 Prefisso", "👋 Benvenuto", "⏰ Pianificazione", "🎤 Selettore vocale", "🏷️ Amministrazione loghi", "📢 Canale admin", "📻 Radio personalizzata", "🚫 Moderazione"], descriptions: ["impostare la lingua predefinita del server", "cambiare il prefisso dei comandi", "configurare i messaggi di benvenuto", "pianificare, elencare o annullare messaggi", "scegliere i canali vocali suggeriti", "gestire il database del gioco dei loghi", "scegliere il canale dei suggerimenti", "aggiungere una stazione personalizzata", "bloccare, sbloccare o elencare gli utenti"] },
  ja: { title: "🔧 管理者コマンド", description: "サーバー管理または管理者権限が必要です。", footer: "これらのコマンドは公開用 !help には表示されません。", names: ["🌐 サーバーの言語", "📝 プレフィックス", "👋 ウェルカム", "⏰ スケジュール", "🎤 ボイスチャンネル選択", "🏷️ ロゴ管理", "📢 管理者チャンネル", "📻 カスタムラジオ", "🚫 モデレーション"], descriptions: ["サーバーの既定の言語を設定", "コマンドのプレフィックスを変更", "歓迎メッセージを設定", "メッセージを予約、一覧表示、キャンセル", "候補に表示するボイスチャンネルを設定", "ロゴ当てゲームのデータを管理", "不明なコマンドの候補を送るチャンネルを設定", "ラジオ局を追加", "ユーザーのブロック、解除、一覧表示"] },
  nl: { title: "🔧 Beheeropdrachten", description: "Vereist de machtiging Server beheren of Beheerder.", footer: "Deze opdrachten staan niet in de openbare !help.", names: ["🌐 Servertaal", "📝 Prefix", "👋 Welkom", "⏰ Planning", "🎤 Spraakkanaalkiezer", "🏷️ Logobeheer", "📢 Beheerkanaal", "📻 Eigen radio", "🚫 Moderatie"], descriptions: ["de standaardtaal instellen", "de opdrachtprefix wijzigen", "welkomstberichten instellen", "berichten plannen, bekijken of annuleren", "voorgestelde spraakkanalen kiezen", "de database van het logo-spel beheren", "kanaal voor onbekende-opdrachtsuggesties kiezen", "een eigen station toevoegen", "gebruikers blokkeren, deblokkeren of weergeven"] },
  ru: { title: "🔧 Команды администратора", description: "Требует права «Управление сервером» или прав администратора.", footer: "Эти команды не отображаются в открытом списке !help.", names: ["🌐 Язык сервера", "📝 Префикс", "👋 Приветствие", "⏰ Расписание", "🎤 Выбор голосового канала", "🏷️ Управление логотипами", "📢 Канал администратора", "📻 Своя радиостанция", "🚫 Модерация"], descriptions: ["установить язык сервера по умолчанию", "изменить префикс команд", "настроить приветственные сообщения", "запланировать, показать или отменить сообщения", "выбрать предлагаемые голосовые каналы", "управлять базой игры с логотипами", "выбрать канал подсказок неизвестных команд", "добавить собственную радиостанцию", "блокировать, разблокировать или просматривать пользователей"] },
  pl: { title: "🔧 Polecenia administratora", description: "Wymaga uprawnienia Zarządzanie serwerem lub Administrator.", footer: "Te polecenia nie są dostępne w publicznym !help.", names: ["🌐 Język serwera", "📝 Prefiks", "👋 Powitanie", "⏰ Harmonogram", "🎤 Wybór kanału głosowego", "🏷️ Administracja logo", "📢 Kanał administratora", "📻 Własne radio", "🚫 Moderacja"], descriptions: ["ustawić domyślny język serwera", "zmienić prefiks poleceń", "skonfigurować wiadomości powitalne", "zaplanować, wyświetlić lub anulować wiadomości", "wybrać sugerowane kanały głosowe", "zarządzać bazą gry w odgadywanie logo", "wybrać kanał podpowiedzi nieznanych poleceń", "dodać własną stację", "blokować, odblokowywać i wyświetlać użytkowników"] },
  tr: { title: "🔧 Yönetici komutları", description: "Sunucuyu Yönet veya Yönetici izni gerektirir.", footer: "Bu komutlar herkese açık !help listesinde gösterilmez.", names: ["🌐 Sunucu dili", "📝 Önek", "👋 Karşılama", "⏰ Zamanlama", "🎤 Ses kanalı seçici", "🏷️ Logo yönetimi", "📢 Yönetici kanalı", "📻 Özel radyo", "🚫 Moderasyon"], descriptions: ["sunucunun varsayılan dilini ayarlama", "komut önekini değiştirme", "karşılama mesajlarını yapılandırma", "mesajları zamanlama, listeleme veya iptal etme", "önerilen ses kanallarını seçme", "logo oyunu veritabanını yönetme", "bilinmeyen komut önerileri için kanal seçme", "özel bir istasyon ekleme", "kullanıcıları engelleme, engeli kaldırma veya listeleme"] },
};

export async function sendAdminGuide(message: Message, prefix = "!", language: HelpLanguage = "en"): Promise<void> {
  const p = prefix;
  const copy = ADMIN_GUIDE_COPY[language];
  const snippets = [
    `\`${p}server language [en|fr|es|de|pt|it|ja|nl|ru|pl|tr]\` — ${copy.descriptions[0]}`,
    `\`${p}prefix <char>\` — ${copy.descriptions[1]} (e.g. \`${p}prefix ?\`)`,
    `\`${p}welcome set #channel\` · \`${p}welcome msg <text>\` · \`${p}welcome clear\` — ${copy.descriptions[2]}`,
    `\`${p}schedule daily HH:MM #ch <msg>\` · \`${p}schedule list\` · \`${p}schedule cancel <ID>\` — ${copy.descriptions[3]}`,
    `\`${p}voicepicker set #ch1 #ch2\` — ${copy.descriptions[4]}`,
    `\`${p}logo add/remove/approve/exclude/test/stats\` — ${copy.descriptions[5]}`,
    `\`${p}suggest admin #channel\` — ${copy.descriptions[6]}`,
    `\`${p}radio add <key> <name> <url> <emoji> <genre> [fr|es|en]\` — ${copy.descriptions[7]}`,
    `\`${p}block @user\` · \`${p}unblock @user\` · \`${p}banlist\` — ${copy.descriptions[8]}`,
  ];
  const embed = new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle(copy.title)
    .setDescription(copy.description)
    .addFields(copy.names.map((name, index) => ({ name, value: snippets[index]!, inline: false })))
    .addFields({
      name: language === "fr" ? "🛠️ Technicien" : "🛠️ Technician",
      value: `\`${p}tech status\` — ${language === "fr" ? "consulter l’état des modules et dépendances" : "check module and dependency health"}`,
      inline: false,
    })
    .addFields({
      name: language === "fr" ? "Voix du bot" : "Bot voice",
      value: `\`${p}voice list\` · \`${p}voice siwis\` · \`${p}voice gilles\` · \`${p}voice default\`\n${language === "fr" ? "Choix réservé à Gérer le serveur. SIWIS par défaut ; les personas peuvent avoir leur propre voix." : "Manage Server required. SIWIS by default; personas can override it."}`,
    }, {
      name: language === "fr" ? "Mémoire commune du serveur" : "Shared server memory",
      value: `\`${p}ai server remember <information>\` · \`${p}ai server forget\``,
    }, {
      name: "Slash",
      value: SLASH_COMMANDS.filter(command => ADMIN_SLASH_COMMANDS.has(command.name)).map(command => `\`/${command.name}\``).join(" · ") || "—",
    })
    .setFooter({ text: copy.footer });
  await message.reply({ embeds: [embed] });
}
