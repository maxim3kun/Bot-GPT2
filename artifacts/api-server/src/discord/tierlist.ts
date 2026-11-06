import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type Message } from "discord.js";
import { getEffectiveLanguage } from "./effective-language.js";
import type { UserLang } from "./user-lang-store.js";

const THEMES: Record<string, { name: string; emoji: string; items: string[] }> = {
  pokemon: {
    name: "Pokémon Gen 1", emoji: "⚡",
    items: ["Pikachu","Charizard","Mewtwo","Gengar","Blastoise","Venusaur","Eevee","Snorlax","Gyarados","Jolteon","Vaporeon","Flareon","Dragonite","Lapras","Alakazam","Arcanine","Machamp","Haunter","Onix","Articuno"],
  },
  anime: {
    name: "Anime Series", emoji: "🎌",
    items: ["Attack on Titan","Demon Slayer","Naruto","Dragon Ball Z","One Piece","My Hero Academia","Hunter x Hunter","Death Note","Fullmetal Alchemist","JoJo's Bizarre Adventure","Sword Art Online","Bleach","Tokyo Revengers","Chainsaw Man","Spy x Family","Vinland Saga","Re:Zero","Neon Genesis Evangelion","Cowboy Bebop","Steins;Gate"],
  },
  marvel: {
    name: "Marvel Heroes", emoji: "🦸",
    items: ["Spider-Man","Iron Man","Captain America","Thor","Black Panther","Doctor Strange","Hulk","Wolverine","Black Widow","Scarlet Witch","Ant-Man","Hawkeye","Vision","Falcon","Deadpool","Daredevil","Nick Fury","Gamora","Star-Lord","Loki"],
  },
  food: {
    name: "Foods", emoji: "🍕",
    items: ["Pizza","Sushi","Tacos","Burger","Pasta","Ramen","Fried Chicken","Ice Cream","Chocolate Cake","Burritos","Curry","Pad Thai","Croissant","Hot Dog","Steak","Cheesecake","Waffles","BBQ Ribs","Dim Sum","Pho"],
  },
  games: {
    name: "Video Games", emoji: "🎮",
    items: ["The Legend of Zelda: BOTW","Red Dead Redemption 2","GTA V","Minecraft","Elden Ring","God of War","The Witcher 3","Hollow Knight","Terraria","Dark Souls","Among Us","Fortnite","Stardew Valley","Portal 2","Hades","Celeste","Undertale","Cuphead","Sekiro","Cyberpunk 2077"],
  },
  movies: {
    name: "Movies", emoji: "🎬",
    items: ["The Shawshank Redemption","The Godfather","The Dark Knight","Pulp Fiction","Inception","The Matrix","Interstellar","Parasite","Avengers: Endgame","Star Wars: A New Hope","The Lord of the Rings","Spirited Away","Schindler's List","Fight Club","Forrest Gump","Goodfellas","The Silence of the Lambs","Whiplash","La La Land","Get Out"],
  },
};

const TIERS = ["S","A","B","C","D"] as const;
type Tier = typeof TIERS[number];

const COPY: Record<UserLang, {
  title: string;
  finalTitle: string;
  prompt: string;
  progress: (done: number, total: number) => string;
  remaining: (count: number) => string;
  tier: (tier: Tier) => string;
  empty: string;
  pass: string;
  stop: string;
  serverOnly: string;
  channelUnavailable: string;
  availableThemes: string;
  usage: string;
  noActive: string;
  wrongPrompt: string;
}> = {
  en: { title: "Tier List", finalTitle: "Final Tier List", prompt: "❓ Where does this go?", progress: (d, t) => `**${d}/${t}** items classified`, remaining: n => `${n} items remaining after this`, tier: t => `${t} Tier`, empty: "*empty*", pass: "⏭️ Pass", stop: "🛑 Stop", serverOnly: "❌ This command only works in a server.", channelUnavailable: "❌ This channel cannot send messages.", availableThemes: "🎯 **Available themes:**", usage: "Usage", noActive: "❌ No active tier list. Start one with `!tierlist <theme>`.", wrongPrompt: "❌ This is not the current tier list prompt." },
  fr: { title: "Tier list", finalTitle: "Tier list finale", prompt: "❓ Où placer cet élément ?", progress: (d, t) => `**${d}/${t}** éléments classés`, remaining: n => `${n} élément(s) restant(s) après celui-ci`, tier: t => `Palier ${t}`, empty: "*vide*", pass: "⏭️ Passer", stop: "🛑 Arrêter", serverOnly: "❌ Cette commande fonctionne uniquement sur un serveur.", channelUnavailable: "❌ Ce salon ne permet pas d'envoyer des messages.", availableThemes: "🎯 **Thèmes disponibles :**", usage: "Utilisation", noActive: "❌ Aucune tier list en cours. Lance-en une avec `!tierlist <thème>`.", wrongPrompt: "❌ Ce n'est pas le choix actuel de la tier list." },
  es: { title: "Tier list", finalTitle: "Tier list final", prompt: "❓ ¿Dónde va este elemento?", progress: (d, t) => `**${d}/${t}** elementos clasificados`, remaining: n => `${n} elementos restantes después de este`, tier: t => `Nivel ${t}`, empty: "*vacío*", pass: "⏭️ Pasar", stop: "🛑 Parar", serverOnly: "❌ Este comando solo funciona en un servidor.", channelUnavailable: "❌ Este canal no permite enviar mensajes.", availableThemes: "🎯 **Temas disponibles:**", usage: "Uso", noActive: "❌ No hay una tier list activa. Inicia una con `!tierlist <tema>`.", wrongPrompt: "❌ Esta no es la selección actual de la tier list." },
  de: { title: "Tier-Liste", finalTitle: "Endgültige Tier-Liste", prompt: "❓ In welche Stufe gehört das?", progress: (d, t) => `**${d}/${t}** Elemente einsortiert`, remaining: n => `Noch ${n} Elemente danach`, tier: t => `Stufe ${t}`, empty: "*leer*", pass: "⏭️ Überspringen", stop: "🛑 Beenden", serverOnly: "❌ Dieser Befehl funktioniert nur auf einem Server.", channelUnavailable: "❌ In diesem Kanal können keine Nachrichten gesendet werden.", availableThemes: "🎯 **Verfügbare Themen:**", usage: "Verwendung", noActive: "❌ Keine Tier-Liste aktiv. Starte eine mit `!tierlist <thema>`.", wrongPrompt: "❌ Das ist nicht die aktuelle Auswahl der Tier-Liste." },
  pt: { title: "Tier list", finalTitle: "Tier list final", prompt: "❓ Em qual nível fica este item?", progress: (d, t) => `**${d}/${t}** itens classificados`, remaining: n => `${n} itens restantes depois deste`, tier: t => `Nível ${t}`, empty: "*vazio*", pass: "⏭️ Pular", stop: "🛑 Parar", serverOnly: "❌ Este comando só funciona em um servidor.", channelUnavailable: "❌ Este canal não permite enviar mensagens.", availableThemes: "🎯 **Temas disponíveis:**", usage: "Uso", noActive: "❌ Não há tier list ativa. Inicie uma com `!tierlist <tema>`.", wrongPrompt: "❌ Esta não é a escolha atual da tier list." },
  it: { title: "Tier list", finalTitle: "Tier list finale", prompt: "❓ Dove va questo elemento?", progress: (d, t) => `**${d}/${t}** elementi classificati`, remaining: n => `${n} elementi rimanenti dopo questo`, tier: t => `Livello ${t}`, empty: "*vuoto*", pass: "⏭️ Salta", stop: "🛑 Ferma", serverOnly: "❌ Questo comando funziona solo in un server.", channelUnavailable: "❌ Questo canale non può inviare messaggi.", availableThemes: "🎯 **Temi disponibili:**", usage: "Uso", noActive: "❌ Nessuna tier list attiva. Avviane una con `!tierlist <tema>`.", wrongPrompt: "❌ Questa non è la selezione attuale della tier list." },
  ja: { title: "ティアリスト", finalTitle: "最終ティアリスト", prompt: "❓ この項目はどこ？", progress: (d, t) => `**${d}/${t}** 件を分類`, remaining: n => `残り ${n} 件`, tier: t => `ティア ${t}`, empty: "*空*", pass: "⏭️ スキップ", stop: "🛑 終了", serverOnly: "❌ このコマンドはサーバー内でのみ使えます。", channelUnavailable: "❌ このチャンネルではメッセージを送信できません。", availableThemes: "🎯 **テーマ:**", usage: "使い方", noActive: "❌ ティアリストはありません。`!tierlist <theme>` で開始してください。", wrongPrompt: "❌ これは現在の選択ではありません。" },
  nl: { title: "Tierlijst", finalTitle: "Definitieve tierlijst", prompt: "❓ Waar hoort dit item?", progress: (d, t) => `**${d}/${t}** items ingedeeld`, remaining: n => `Nog ${n} items hierna`, tier: t => `Tier ${t}`, empty: "*leeg*", pass: "⏭️ Overslaan", stop: "🛑 Stoppen", serverOnly: "❌ Dit commando werkt alleen op een server.", channelUnavailable: "❌ Dit kanaal kan geen berichten versturen.", availableThemes: "🎯 **Beschikbare thema's:**", usage: "Gebruik", noActive: "❌ Er is geen tierlijst actief. Start er een met `!tierlist <thema>`.", wrongPrompt: "❌ Dit is niet de huidige keuze." },
  ru: { title: "Тир-лист", finalTitle: "Итоговый тир-лист", prompt: "❓ Куда поместить этот элемент?", progress: (d, t) => `**${d}/${t}** элементов распределено`, remaining: n => `Осталось элементов: ${n}`, tier: t => `Тир ${t}`, empty: "*пусто*", pass: "⏭️ Пропустить", stop: "🛑 Остановить", serverOnly: "❌ Команда доступна только на сервере.", channelUnavailable: "❌ В этом канале нельзя отправлять сообщения.", availableThemes: "🎯 **Доступные темы:**", usage: "Использование", noActive: "❌ Нет активного тир-листа. Запусти его командой `!tierlist <тема>`.", wrongPrompt: "❌ Это не текущий выбор." },
  pl: { title: "Tier lista", finalTitle: "Końcowa tier lista", prompt: "❓ Gdzie umieścić ten element?", progress: (d, t) => `**${d}/${t}** elementów sklasyfikowanych`, remaining: n => `Pozostało elementów: ${n}`, tier: t => `Poziom ${t}`, empty: "*pusto*", pass: "⏭️ Pomiń", stop: "🛑 Zatrzymaj", serverOnly: "❌ Ta komenda działa tylko na serwerze.", channelUnavailable: "❌ Ten kanał nie może wysyłać wiadomości.", availableThemes: "🎯 **Dostępne motywy:**", usage: "Użycie", noActive: "❌ Brak aktywnej tier listy. Uruchom ją przez `!tierlist <temat>`.", wrongPrompt: "❌ To nie jest aktualny wybór." },
  tr: { title: "Tier listesi", finalTitle: "Son tier listesi", prompt: "❓ Bu öğe hangi seviyede?", progress: (d, t) => `**${d}/${t}** öğe sınıflandırıldı`, remaining: n => `Bundan sonra ${n} öğe kaldı`, tier: t => `${t}. seviye`, empty: "*boş*", pass: "⏭️ Geç", stop: "🛑 Durdur", serverOnly: "❌ Bu komut yalnızca sunucuda çalışır.", channelUnavailable: "❌ Bu kanal mesaj gönderemiyor.", availableThemes: "🎯 **Kullanılabilir temalar:**", usage: "Kullanım", noActive: "❌ Etkin tier listesi yok. `!tierlist <tema>` ile başlat.", wrongPrompt: "❌ Bu mevcut seçim değil." },
};

const THEME_NAMES: Record<UserLang, Record<string, string>> = {
  en: { pokemon: "Pokémon Gen 1", anime: "Anime Series", marvel: "Marvel Heroes", food: "Foods", games: "Video Games", movies: "Movies" },
  fr: { pokemon: "Pokémon — 1re génération", anime: "Séries d'animation", marvel: "Héros Marvel", food: "Plats", games: "Jeux vidéo", movies: "Films" },
  es: { pokemon: "Pokémon Gen. 1", anime: "Series de anime", marvel: "Héroes de Marvel", food: "Comidas", games: "Videojuegos", movies: "Películas" },
  de: { pokemon: "Pokémon Gen. 1", anime: "Anime-Serien", marvel: "Marvel-Helden", food: "Speisen", games: "Videospiele", movies: "Filme" },
  pt: { pokemon: "Pokémon Gen. 1", anime: "Séries de anime", marvel: "Heróis Marvel", food: "Comidas", games: "Jogos", movies: "Filmes" },
  it: { pokemon: "Pokémon Gen. 1", anime: "Serie anime", marvel: "Eroi Marvel", food: "Cibi", games: "Videogiochi", movies: "Film" },
  ja: { pokemon: "ポケモン初代", anime: "アニメシリーズ", marvel: "マーベルヒーロー", food: "料理", games: "ビデオゲーム", movies: "映画" },
  nl: { pokemon: "Pokémon Gen. 1", anime: "Anime-series", marvel: "Marvel-helden", food: "Eten", games: "Videospellen", movies: "Films" },
  ru: { pokemon: "Покемоны, 1-е поколение", anime: "Аниме-сериалы", marvel: "Герои Marvel", food: "Еда", games: "Видеоигры", movies: "Фильмы" },
  pl: { pokemon: "Pokémon, 1. generacja", anime: "Serie anime", marvel: "Bohaterowie Marvela", food: "Jedzenie", games: "Gry wideo", movies: "Filmy" },
  tr: { pokemon: "Pokémon 1. Nesil", anime: "Anime dizileri", marvel: "Marvel kahramanları", food: "Yemekler", games: "Video oyunları", movies: "Filmler" },
};

const FRENCH_FOODS = ["Pizza","Sushis","Tacos","Burger","Pâtes","Ramen","Poulet frit","Glace","Gâteau au chocolat","Burritos","Curry","Pad thaï","Croissant","Hot-dog","Steak","Gâteau au fromage","Gaufres","Travers de porc BBQ","Dim sum","Phở"];

interface TierSession {
  language: UserLang;
  theme: string;
  items: string[];
  index: number;
  tiers: Record<Tier, string[]>;
  tierId: string | null;    // message ID of the tier display
  promptId: string | null;  // message ID of the current prompt
  channelId: string;
}

const sessions = new Map<string, TierSession>();

function buildTierEmbed(session: TierSession): EmbedBuilder {
  const theme = THEMES[session.theme]!;
  const copy = COPY[session.language];
  const total = session.items.length;
  const done = session.index;
  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`${theme.emoji} ${THEME_NAMES[session.language][session.theme] ?? theme.name} — ${copy.title}`)
    .setDescription(copy.progress(done, total));

  for (const tier of TIERS) {
    const items = session.tiers[tier];
    embed.addFields({
      name: copy.tier(tier),
      value: items.length > 0 ? items.join(" • ") : copy.empty,
      inline: false,
    });
  }
  return embed;
}

function buildPromptEmbed(session: TierSession): EmbedBuilder {
  const copy = COPY[session.language];
  const item = session.items[session.index];
  const remaining = session.items.length - session.index - 1;
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(copy.prompt)
    .setDescription(`# **${item}**`)
    .setFooter({ text: copy.remaining(remaining) });
}

function buildTierButtons(language: UserLang): ActionRowBuilder<ButtonBuilder>[] {
  const copy = COPY[language];
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("tl:S").setLabel("S").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("tl:A").setLabel("A").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("tl:B").setLabel("B").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("tl:C").setLabel("C").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("tl:D").setLabel("D").setStyle(ButtonStyle.Secondary),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("tl:pass").setLabel(copy.pass).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("tl:stop").setLabel(copy.stop).setStyle(ButtonStyle.Danger),
    ),
  ];
}

function buildFinalEmbed(session: TierSession): EmbedBuilder {
  const theme = THEMES[session.theme]!;
  const copy = COPY[session.language];
  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`🏆 ${theme.emoji} ${THEME_NAMES[session.language][session.theme] ?? theme.name} — ${copy.finalTitle}`);

  for (const tier of TIERS) {
    const items = session.tiers[tier];
    embed.addFields({
      name: copy.tier(tier),
      value: items.length > 0 ? items.join(", ") : copy.empty,
      inline: false,
    });
  }
  return embed;
}

export async function startTierlist(message: Message, args: string[]): Promise<void> {
  const language = getEffectiveLanguage(message.guildId, message.author.id);
  const copy = COPY[language];
  if (!message.guildId) { await message.reply(copy.serverOnly); return; }
  if (!message.channel.isSendable()) { await message.reply(copy.channelUnavailable); return; }

  const themeKey = (args[0] ?? "").toLowerCase();
  const available = Object.keys(THEMES).join(", ");

  if (!themeKey || !THEMES[themeKey]) {
    await message.reply(
      `${copy.availableThemes} ${available}\n` +
      `${copy.usage}: \`!tierlist <theme>\``,
    );
    return;
  }

  const theme = THEMES[themeKey]!;
  const themeItems = language === "fr" && themeKey === "food" ? FRENCH_FOODS : theme.items;
  const items = [...themeItems].sort(() => Math.random() - 0.5);
  const session: TierSession = {
    language,
    theme: themeKey,
    items,
    index: 0,
    tiers: { S: [], A: [], B: [], C: [], D: [] },
    tierId: null,
    promptId: null,
    channelId: message.channelId,
  };

  const tierMsg = await message.reply({ embeds: [buildTierEmbed(session)], content: "" });
  session.tierId = tierMsg.id;

  const promptMsg = await message.channel.send({ embeds: [buildPromptEmbed(session)], components: buildTierButtons(language) });
  session.promptId = promptMsg.id;

  sessions.set(message.guildId, session);
}

export async function handleTierlistButton(
  interaction: import("discord.js").ButtonInteraction,
): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) return;

  const session = sessions.get(guildId);
  if (!session) {
    const language = getEffectiveLanguage(guildId, interaction.user.id);
    await interaction.reply({ content: COPY[language].noActive, ephemeral: true });
    return;
  }

  if (interaction.message.id !== session.promptId) {
    await interaction.reply({ content: COPY[session.language].wrongPrompt, ephemeral: true });
    return;
  }

  const action = interaction.customId.split(":")[1] as Tier | "pass" | "stop";

  if (action === "stop") {
    sessions.delete(guildId);
    await interaction.update({ embeds: [buildFinalEmbed(session)], components: [] });
    return;
  }

  if (action !== "pass" && TIERS.includes(action as Tier)) {
    const item = session.items[session.index]!;
    session.tiers[action as Tier].push(item);
  }

  session.index++;

  if (session.index >= session.items.length) {
    sessions.delete(guildId);
    await interaction.update({ embeds: [buildFinalEmbed(session)], components: [] });
    return;
  }

  await interaction.update({ embeds: [buildPromptEmbed(session)], components: buildTierButtons(session.language) });

  try {
    const channel = interaction.channel;
    if (channel && "messages" in channel) {
      const tierMsg = await channel.messages.fetch(session.tierId!);
      await tierMsg.edit({ embeds: [buildTierEmbed(session)] });
    }
  } catch { /* ignore if tier message was deleted */ }
}
