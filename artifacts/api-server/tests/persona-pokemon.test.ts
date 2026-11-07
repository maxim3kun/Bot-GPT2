import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPersonaAnswer } from "../src/discord/persona-answer-format.js";
import { handlePokemon } from "../src/discord/pokemon.js";

const table = "| Pokémon | Type |\n|---|---|\n| Flambusard | Feu / Vol |\n| Pikachu | Électrik |";
test("Persona tables become readable lists regardless of lost conversation history", () => {
  for (const prompt of ["Salut", "Arrête les tableaux", "Ne fais plus de tableaux", "Please don't use tables"]) {
    const answer = formatPersonaAnswer(table, prompt);
    assert.equal(answer.includes("|"), false);
    assert.match(answer, /Pokémon : Flambusard — Type : Feu \/ Vol/);
    assert.match(answer, /Pikachu/);
  }
  assert.equal(formatPersonaAnswer(table, "Fais un tableau comparatif"), table);
  assert.equal(formatPersonaAnswer(table, "Je veux un tableau"), table);
  assert.equal(formatPersonaAnswer("Du texte normal | sans tableau.", "salut"), "Du texte normal | sans tableau.");
});

test("Formatting keeps non-table text and code intact and supports unframed tables", () => {
  const answer = formatPersonaAnswer("Avant\nNom | Valeur\n:--- | ---:\nPV | 78\n\nAprès", "merci");
  assert.equal(answer, "Avant\n• Nom : PV — Valeur : 78\n\nAprès");
  const code = "```txt\n" + table + "\n```";
  assert.equal(formatPersonaAnswer(code, "explique ce code"), code);
});

test("PokéAPI powers translated Pokémon cards, localized lookup and honest failures", async () => {
  const realFetch = globalThis.fetch;
  const urls: string[] = [];
  let offline = false;
  globalThis.fetch = (async url => {
    const path = String(url);
    urls.push(path);
    if (offline) return new Response(null, { status: 503 });
    if (path.includes("raw.githubusercontent.com")) return new Response(
      'pokemon_species_id,local_language_id,name,genus\n25,5,Pikachu,Pokémon Souris\n26,5,Raichu,Pokémon Souris\n',
    );
    if (path.endsWith("/pokemon/raichu-francais")) return new Response(null, { status: 404 });
    if (path.endsWith("/pokemon/introuvable") || path.endsWith("/pokemon/raichu")) return new Response(null, { status: 404 });
    if (path.includes("/pokemon/")) return Response.json({
      id: 663, name: "talonflame", species: { name: "talonflame" }, height: 12, weight: 245,
      base_experience: 175, types: [{ type: { name: "fire" } }, { type: { name: "flying" } }],
      abilities: [{ ability: { name: "gale-wings" }, is_hidden: true }],
      stats: [{ base_stat: 78, stat: { name: "hp" } }],
      sprites: { front_default: null },
    });
    if (path.includes("/pokemon-species/")) return Response.json({
      names: [{ name: "Flambusard", language: { name: "fr" } }, { name: "Talonflame", language: { name: "en" } }],
      flavor_text_entries: [{ flavor_text: "Il chasse\nses proies.", language: { name: "fr" } }],
    });
    const names: Record<string, [string, string]> = { fire: ["Feu", "Fire"], flying: ["Vol", "Flying"], "gale-wings": ["Ailes Bourrasque", "Gale Wings"] };
    const pair = names[path.split("/").at(-1)!]!;
    return Response.json({ names: [{ name: pair[0], language: { name: "fr" } }, { name: pair[1], language: { name: "en" } }] });
  }) as typeof fetch;
  try {
    const replies: any[] = [];
    const reply = async (value: unknown) => { replies.push(value); };
    await handlePokemon("Flambusard", "fr", reply);
    const fr = replies.pop().embeds[0].toJSON();
    assert.equal(fr.title, "#663 — Flambusard");
    assert.equal(fr.description, "Il chasse ses proies.");
    assert.equal(fr.fields[0].value, "Feu · Vol");
    assert.match(fr.fields.find((field: any) => field.name === "Talents").value, /Ailes Bourrasque.*caché/);
    assert.match(fr.footer.text, /PokéAPI/);
    assert.ok(urls[0].endsWith("/pokemon/talonflame"));
    await handlePokemon("talonflame", "en", reply);
    const en = replies.pop().embeds[0].toJSON();
    assert.equal(en.title, "#663 — Talonflame");
    assert.equal(en.fields[0].value, "Fire · Flying");
    assert.equal(en.description, undefined); // No fabricated English translation.
    await handlePokemon("Raichu", "fr", reply);
    assert.ok(urls.some(url => url.endsWith("/pokemon/26")));
    await handlePokemon("introuvable", "fr", reply);
    assert.match(replies.pop(), /introuvable/);
    offline = true;
    await handlePokemon("nouveau", "fr", reply);
    assert.match(replies.pop().embeds[0].toJSON().description, /Impossible de contacter/);
  } finally { globalThis.fetch = realFetch; }
});
