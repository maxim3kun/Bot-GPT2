import { EmbedBuilder } from "discord.js";
import { logger } from "../lib/logger.js";
import { fetchLocalizedPokemon } from "./pokemon-data.js";

const TYPE_COLORS: Record<string, number> = {
  fire: 0xff4500, water: 0x1e90ff, grass: 0x32cd32, electric: 0xffd700,
  psychic: 0xff69b4, ice: 0x00bfff, dragon: 0x7b2fbe, dark: 0x2f2f2f,
  fairy: 0xffb6c1, normal: 0xa8a878, fighting: 0xc03028, poison: 0xa040a0,
  ground: 0xe0c068, rock: 0xb8a038, bug: 0xa8b820, ghost: 0x705898,
  steel: 0xb8b8d0, flying: 0xa890f0,
};

const LOCALE_STRINGS: Record<string, {
  noName: string;
  notFound: string;
  errorTitle: string;
  errorDesc: string;
  types: string;
  abilities: string;
  stats: string;
  height: string;
  weight: string;
  baseExp: string;
  hp: string; atk: string; def: string; spatk: string; spdef: string; spd: string;
  footer: (id: number) => string;
}> = {
  fr: {
    noName: "🔴 Donne-moi un nom ! Ex: `/pokemon pikachu`",
    notFound: "❌ Pokémon introuvable. Vérifie le nom ou le numéro.",
    errorTitle: "❌ Erreur",
    errorDesc: "Impossible de contacter l'API Pokémon. Réessaie plus tard.",
    types: "Types",
    abilities: "Talents",
    stats: "Statistiques",
    height: "Taille",
    weight: "Poids",
    baseExp: "Exp. de base",
    hp: "PV", atk: "Attaque", def: "Défense", spatk: "Atq. Spé", spdef: "Déf. Spé", spd: "Vitesse",
    footer: (id) => `Pokédex #${id} • PokéAPI`,
  },
  es: {
    noName: "🔴 ¡Dame un nombre! Ej: `/pokemon pikachu`",
    notFound: "❌ Pokémon no encontrado. Verifica el nombre o el número.",
    errorTitle: "❌ Error",
    errorDesc: "No se pudo contactar la API de Pokémon. Inténtalo más tarde.",
    types: "Tipos",
    abilities: "Habilidades",
    stats: "Estadísticas",
    height: "Altura",
    weight: "Peso",
    baseExp: "Exp. base",
    hp: "PS", atk: "Ataque", def: "Defensa", spatk: "Atq. Esp", spdef: "Def. Esp", spd: "Velocidad",
    footer: (id) => `Pokédex #${id} • PokéAPI`,
  },
  en: {
    noName: "🔴 Give me a name! e.g. `/pokemon pikachu`",
    notFound: "❌ Pokémon not found. Check the name or number.",
    errorTitle: "❌ Error",
    errorDesc: "Could not reach the PokéAPI. Try again later.",
    types: "Types",
    abilities: "Abilities",
    stats: "Stats",
    height: "Height",
    weight: "Weight",
    baseExp: "Base XP",
    hp: "HP", atk: "ATK", def: "DEF", spatk: "Sp.ATK", spdef: "Sp.DEF", spd: "SPD",
    footer: (id) => `Pokédex #${id} • PokéAPI`,
  },
};

function getStrings(locale: string) {
  if (locale.startsWith("fr")) return LOCALE_STRINGS["fr"]!;
  if (locale.startsWith("es")) return LOCALE_STRINGS["es"]!;
  const language = locale.split("-")[0]!;
  const translated = EXTRA_LOCALES[language];
  if (translated) {
    const [types, abilities, stats, height, weight, baseExp, hp, atk, def, spatk, spdef, spd] = translated.labels;
    return {
      ...LOCALE_STRINGS.en!, types, abilities, stats, height, weight, baseExp, hp, atk, def, spatk, spdef, spd,
      noName: translated.noName, notFound: translated.notFound,
      errorTitle: "PokéAPI", errorDesc: translated.error,
    };
  }
  return LOCALE_STRINGS["en"]!;
}

const EXTRA_LOCALES: Record<string, {
  labels: [string, string, string, string, string, string, string, string, string, string, string, string];
  noName: string; notFound: string; error: string;
}> = {
  de: {
    labels: ["Typen", "Fähigkeiten", "Statuswerte", "Größe", "Gewicht", "Basis-EP", "KP", "Angriff", "Verteidigung", "Sp.-Angriff", "Sp.-Vert.", "Initiative"],
    noName: "Nenne ein Pokémon, z. B. `/pokemon pikachu`.", notFound: "Pokémon nicht gefunden. Prüfe den Namen oder die Nummer.", error: "PokéAPI ist derzeit nicht erreichbar.",
  },
  pt: {
    labels: ["Tipos", "Habilidades", "Estatísticas", "Altura", "Peso", "Exp. base", "PS", "Ataque", "Defesa", "Atq. Esp.", "Def. Esp.", "Velocidade"],
    noName: "Indica um Pokémon, por exemplo `/pokemon pikachu`.", notFound: "Pokémon não encontrado. Verifica o nome ou o número.", error: "Não foi possível contactar a PokéAPI.",
  },
  it: {
    labels: ["Tipi", "Abilità", "Statistiche", "Altezza", "Peso", "Esp. base", "PS", "Attacco", "Difesa", "Att. Sp.", "Dif. Sp.", "Velocità"],
    noName: "Indica un Pokémon, ad esempio `/pokemon pikachu`.", notFound: "Pokémon non trovato. Controlla il nome o il numero.", error: "Impossibile contattare la PokéAPI.",
  },
  ja: {
    labels: ["タイプ", "とくせい", "種族値", "高さ", "重さ", "基礎経験値", "HP", "こうげき", "ぼうぎょ", "とくこう", "とくぼう", "すばやさ"],
    noName: "ポケモン名を入力してください。例：`/pokemon pikachu`", notFound: "ポケモンが見つかりません。名前か番号を確認してください。", error: "PokéAPIに接続できませんでした。",
  },
  nl: {
    labels: ["Types", "Vaardigheden", "Statistieken", "Hoogte", "Gewicht", "Basis-EP", "HP", "Aanval", "Verdediging", "Sp. aanval", "Sp. verdediging", "Snelheid"],
    noName: "Geef een Pokémon op, bijvoorbeeld `/pokemon pikachu`.", notFound: "Pokémon niet gevonden. Controleer de naam of het nummer.", error: "PokéAPI is momenteel niet bereikbaar.",
  },
  ru: {
    labels: ["Типы", "Способности", "Характеристики", "Рост", "Вес", "Базовый опыт", "ОЗ", "Атака", "Защита", "Спец. атака", "Спец. защита", "Скорость"],
    noName: "Укажи покемона, например `/pokemon pikachu`.", notFound: "Покемон не найден. Проверь имя или номер.", error: "Не удалось связаться с PokéAPI.",
  },
  pl: {
    labels: ["Typy", "Zdolności", "Statystyki", "Wzrost", "Masa", "Bazowe PD", "PŻ", "Atak", "Obrona", "Atak spec.", "Obrona spec.", "Szybkość"],
    noName: "Podaj Pokémona, np. `/pokemon pikachu`.", notFound: "Nie znaleziono Pokémona. Sprawdź nazwę lub numer.", error: "Nie udało się połączyć z PokéAPI.",
  },
  tr: {
    labels: ["Türler", "Yetenekler", "İstatistikler", "Boy", "Ağırlık", "Temel deneyim", "Can", "Saldırı", "Savunma", "Özel saldırı", "Özel savunma", "Hız"],
    noName: "Bir Pokémon belirt, örneğin `/pokemon pikachu`.", notFound: "Pokémon bulunamadı. Adını veya numarasını kontrol et.", error: "PokéAPI'ye bağlanılamadı.",
  },
};

const HIDDEN_LABELS: Record<string, string> = {
  fr: "caché", en: "hidden", es: "oculta", de: "versteckt", pt: "oculta", it: "nascosta",
  ja: "隠れ特性", nl: "verborgen", ru: "скрытая", pl: "ukryta", tr: "gizli",
};
const FALLBACK_LABELS: Record<string, string> = {
  fr: "Certains noms sont en anglais : traduction absente de l’API",
  en: "Some names are in English: API translation unavailable",
  es: "Algunos nombres están en inglés: traducción no disponible en la API",
  de: "Einige Namen auf Englisch: API-Übersetzung fehlt",
  pt: "Alguns nomes em inglês: tradução indisponível na API",
  it: "Alcuni nomi in inglese: traduzione API non disponibile",
  ja: "一部の名前はAPIに翻訳がないため英語です",
  nl: "Sommige namen in het Engels: API-vertaling ontbreekt",
  ru: "Некоторые названия на английском: в API нет перевода",
  pl: "Niektóre nazwy po angielsku: brak tłumaczenia w API",
  tr: "Bazı adlar İngilizce: API çevirisi mevcut değil",
};

function statBar(value: number): string {
  const filled = Math.round((value / 255) * 10);
  return "█".repeat(filled) + "░".repeat(10 - filled) + ` **${value}**`;
}

export async function handlePokemon(
  name: string,
  locale: string,
  reply: (opts: unknown) => Promise<unknown>,
): Promise<void> {
  const s = getStrings(locale);

  if (!name.trim()) { await reply(s.noName); return; }

  try {
    const data = await fetchLocalizedPokemon(name, locale);
    if (!data) { await reply(s.notFound); return; }
    const poke = data.pokemon;
    const types = data.types;
    const primaryType = poke.types[0]?.type.name ?? "normal";
    const color = TYPE_COLORS[primaryType] ?? 0x5865f2;

    const abilities = poke.abilities
      .map((a, i) => a.is_hidden
        ? `_${data.abilities[i]}_ *(${HIDDEN_LABELS[locale.split("-")[0]!] ?? "hidden"})*`
        : data.abilities[i])
      .join(", ");

    const statNames = [s.hp, s.atk, s.def, s.spatk, s.spdef, s.spd];
    const statApiKeys = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"];
    const statsText = statApiKeys
      .map((key, i) => {
        const stat = poke.stats.find((st) => st.stat.name === key);
        return `${statNames[i]}: ${statBar(stat?.base_stat ?? 0)}`;
      })
      .join("\n");

    const imageUrl =
      poke.sprites.other?.["official-artwork"]?.front_default ?? poke.sprites.front_default;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`#${poke.id} — ${data.name}`)
      .setThumbnail(imageUrl)
      .addFields(
        { name: s.types, value: types.join(" · "), inline: true },
        { name: s.height, value: `${(poke.height / 10).toFixed(1)} m`, inline: true },
        { name: s.weight, value: `${(poke.weight / 10).toFixed(1)} kg`, inline: true },
        { name: s.abilities, value: abilities, inline: false },
        { name: s.baseExp, value: `${poke.base_experience ?? "—"}`, inline: true },
        { name: s.stats, value: `\`\`\`\n${statsText}\n\`\`\``, inline: false },
      )
      .setFooter({ text: s.footer(poke.id) + (data.usedEnglishFallback ? ` • ${FALLBACK_LABELS[locale.split("-")[0]!] ?? FALLBACK_LABELS.en}` : "") });
    if (data.description) embed.setDescription(data.description);

    await reply({ embeds: [embed] });
  } catch (err) {
    logger.error({ err }, "PokéAPI error");
    await reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle(s.errorTitle)
          .setDescription(s.errorDesc),
      ],
    });
  }
}
