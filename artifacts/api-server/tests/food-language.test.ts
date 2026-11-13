import assert from "node:assert/strict";
import test from "node:test";
import { buildProductEmbed, foodText } from "../src/discord/food.js";

const product = {
  product_name: "Generic product",
  product_name_en: "Test snack",
  product_name_fr: "Snack test",
  brands: "Example brand",
  nutriscore_grade: "b",
  nova_group: 4,
  ecoscore_grade: "a",
  ingredients_text_en: "Ingredients in English",
  ingredients_text_fr: "Ingrédients en français",
  nutriments: {
    "energy-kcal_100g": 12.5,
    proteins_100g: 2,
    fat_100g: 3,
    saturated_fat_100g: 1,
    sugars_100g: 4,
    fiber_100g: 5,
    salt_100g: 0.2,
  },
};

test("Food copy and product cards use French names, labels, decimal separators, and ingredients", () => {
  assert.equal(foodText("fr", "Food", "Alimentation"), "Alimentation");
  const json = buildProductEmbed(product, true, undefined, "fr").toJSON();
  assert.match(json.title!, /Snack test/);
  const fields = json.fields ?? [];
  const values = fields.map(field => `${field.name}\n${field.value}`).join("\n");
  assert.match(values, /Niveau de transformation/);
  assert.match(values, /Aliment ultra-transformé/);
  assert.match(values, /Valeurs nutritionnelles \(pour 100 g\)/);
  assert.match(values, /Énergie : \*\*12,5 kcal\*\*/);
  assert.match(values, /Ingrédients en français/);
  assert.doesNotMatch(values, /Ingredients in English/);
  assert.match(values, /Cet indicateur ne résume pas à lui seul/);
  assert.match(json.footer!.text, /Données : Open Food Facts/);
});

test("Food product cards retain English labels for English users", () => {
  const json = buildProductEmbed(product, false, undefined, "en").toJSON();
  const fields = json.fields ?? [];
  const values = fields.map(field => `${field.name}\n${field.value}`).join("\n");
  assert.match(json.title!, /Test snack/);
  assert.match(values, /Processing level/);
  assert.match(values, /Nutritional values \(per 100 g\)/);
  assert.match(values, /Energy: \*\*12\.5 kcal\*\*/);
  assert.match(values, /Ingredients in English/);
});
