import assert from "node:assert/strict";
import { fetchLocalizedPokemon } from "../src/discord/pokemon-data.js";

// Public PokéAPI only: no Discord sends, no model call, no credentials.
for (const [query, language, expected] of [
  ["Flambusard", "fr", "Flambusard"], ["Talonflame", "en", "Talonflame"], ["Goupix", "fr", "Goupix"],
]) {
  const data = await fetchLocalizedPokemon(query!, language!);
  assert.equal(data?.name, expected);
  console.log(JSON.stringify({
    query, language, id: data!.pokemon.id, name: data!.name, types: data!.types,
    abilities: data!.abilities, hasLocalizedDescription: Boolean(data!.description),
    usedEnglishFallback: data!.usedEnglishFallback,
  }));
}
