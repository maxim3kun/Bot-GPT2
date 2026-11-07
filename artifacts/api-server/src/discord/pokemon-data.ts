const API = "https://pokeapi.co/api/v2";
const NAME_CATALOG = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv";
type Names = { names: Array<{ name: string; language: { name: string } }> };
export interface PokemonData {
  id: number; name: string; height: number; weight: number; base_experience: number | null;
  species: { name: string };
  types: Array<{ type: { name: string } }>;
  abilities: Array<{ ability: { name: string }; is_hidden: boolean }>;
  stats: Array<{ base_stat: number; stat: { name: string } }>;
  sprites: { other?: { "official-artwork"?: { front_default: string | null } }; front_default: string | null };
}
type Species = Names & { flavor_text_entries: Array<{ flavor_text: string; language: { name: string } }> };
const cache = new Map<string, { value: unknown; expires: number }>();
let catalog: Promise<Map<string, string>> | undefined;
let catalogExpires = 0;

export function normalizePokemonName(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

async function getJson<T>(path: string): Promise<T | null> {
  const existing = cache.get(path);
  if (existing && existing.expires > Date.now()) return existing.value as T;
  const response = await fetch(`${API}/${path}`, { signal: AbortSignal.timeout(10_000), redirect: "error" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`PokéAPI HTTP ${response.status}`);
  const value: unknown = await response.json();
  if (cache.size >= 256) cache.delete(cache.keys().next().value!);
  cache.set(path, { value, expires: Date.now() + 6 * 60 * 60_000 });
  return value as T;
}

// Names in the official PokéAPI dataset include French and other local names;
// the REST lookup itself accepts only an English slug or a numerical ID.
async function localizedNameCatalog(): Promise<Map<string, string>> {
  if (catalog && Date.now() < catalogExpires) return catalog;
  catalogExpires = Date.now() + 24 * 60 * 60_000;
  catalog = (async () => {
    const response = await fetch(NAME_CATALOG, { signal: AbortSignal.timeout(10_000), redirect: "error" });
    if (!response.ok) throw new Error(`PokéAPI names HTTP ${response.status}`);
    const text = await response.text();
    if (text.length > 2_000_000) throw new Error("PokéAPI names catalog too large");
    const names = new Map<string, string>();
    for (const line of text.split(/\r?\n/).slice(1)) {
      // Only the first three CSV columns are needed. Handle quoted commas and
      // doubled quotes in names without splitting the trailing genus column.
      const match = line.match(/^(\d+),\d+,("(?:[^"]|"")*"|[^,]*),/);
      if (!match) continue;
      const name = match[2]!.startsWith('"') ? match[2]!.slice(1, -1).replace(/""/g, '"') : match[2]!;
      names.set(normalizePokemonName(name), match[1]!);
    }
    if (!names.size) throw new Error("Empty PokéAPI names catalog");
    return names;
  })().catch(error => { catalog = undefined; throw error; });
  return catalog;
}

export async function fetchLocalizedPokemon(query: string, locale: string) {
  const language = locale.split("-")[0]!;
  let usedEnglishFallback = false;
  const translatedName = (data: Names, fallback: string): string => {
    const localized = data.names.find(n => n.language.name === language)?.name;
    if (localized) return localized;
    if (language !== "en") usedEnglishFallback = true;
    return data.names.find(n => n.language.name === "en")?.name ?? fallback;
  };
  const name = normalizePokemonName(query);
  // Common French aliases also avoid an unnecessary catalog download.
  const aliases: Record<string, string> = { flambusard: "talonflame", dracaufeu: "charizard", salameche: "charmander",
    reptincel: "charmeleon", carapuce: "squirtle", bulbizarre: "bulbasaur", leviator: "gyarados", roucarnage: "pidgeot" };
  let pokemon = await getJson<PokemonData>(`pokemon/${encodeURIComponent(aliases[name] ?? name)}`);
  if (!pokemon) {
    const id = (await localizedNameCatalog()).get(name);
    if (!id) return null;
    pokemon = await getJson<PokemonData>(`pokemon/${id}`);
    if (!pokemon) return null;
  }
  const species = await getJson<Species>(`pokemon-species/${encodeURIComponent(pokemon.species.name)}`);
  if (!species) throw new Error("Missing PokéAPI species");
  const translateResource = async (kind: string, slug: string) => {
    const resource = await getJson<Names>(`${kind}/${encodeURIComponent(slug)}`);
    if (!resource) throw new Error("Missing PokéAPI localization");
    return translatedName(resource, slug);
  };
  const [types, abilities] = await Promise.all([
    Promise.all(pokemon.types.map(t => translateResource("type", t.type.name))),
    Promise.all(pokemon.abilities.map(a => translateResource("ability", a.ability.name))),
  ]);
  // Never translate lore with the language model: use an actual localized API
  // entry, or omit it when that language is not available.
  const description = species.flavor_text_entries.find(entry => entry.language.name === language)?.flavor_text
    .replace(/[\n\f\r]+/g, " ").trim();
  return { pokemon, name: translatedName(species, pokemon.name), types, abilities, description, usedEnglishFallback };
}
