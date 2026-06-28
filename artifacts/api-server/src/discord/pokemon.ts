import { EmbedBuilder } from "discord.js";
import { logger } from "../lib/logger.js";

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
  return LOCALE_STRINGS["en"]!;
}

function statBar(value: number): string {
  const filled = Math.round((value / 255) * 10);
  return "█".repeat(filled) + "░".repeat(10 - filled) + ` **${value}**`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface PokeApiPokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  types: Array<{ type: { name: string } }>;
  abilities: Array<{ ability: { name: string }; is_hidden: boolean }>;
  stats: Array<{ base_stat: number; stat: { name: string } }>;
  sprites: { other: { "official-artwork": { front_default: string } }; front_default: string };
}

export async function handlePokemon(
  name: string,
  locale: string,
  reply: (opts: unknown) => Promise<unknown>,
): Promise<void> {
  const s = getStrings(locale);

  if (!name.trim()) { await reply(s.noName); return; }

  try {
    const res = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(name.trim().toLowerCase())}`,
    );

    if (res.status === 404) { await reply(s.notFound); return; }
    if (!res.ok) throw new Error(`API ${res.status}`);

    const poke = (await res.json()) as PokeApiPokemon;

    const types = poke.types.map((t) => capitalize(t.type.name));
    const primaryType = poke.types[0]?.type.name ?? "normal";
    const color = TYPE_COLORS[primaryType] ?? 0x5865f2;

    const abilities = poke.abilities
      .map((a) => (a.is_hidden ? `_${capitalize(a.ability.name)}_ *(hidden)*` : capitalize(a.ability.name)))
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
      poke.sprites.other["official-artwork"].front_default ?? poke.sprites.front_default;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`#${poke.id} — ${capitalize(poke.name)}`)
      .setThumbnail(imageUrl)
      .addFields(
        { name: s.types, value: types.join(" · "), inline: true },
        { name: s.height, value: `${(poke.height / 10).toFixed(1)} m`, inline: true },
        { name: s.weight, value: `${(poke.weight / 10).toFixed(1)} kg`, inline: true },
        { name: s.abilities, value: abilities, inline: false },
        { name: s.baseExp, value: `${poke.base_experience}`, inline: true },
        { name: s.stats, value: `\`\`\`\n${statsText}\n\`\`\``, inline: false },
      )
      .setFooter({ text: s.footer(poke.id) });

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
