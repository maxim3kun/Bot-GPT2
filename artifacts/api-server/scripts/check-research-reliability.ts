/** Optional live-provider check. Fictional fixtures only; no Discord or database writes. */
import assert from "node:assert/strict";
import OpenAI from "openai";
import { reviewResearchedAnswer } from "../src/discord/ai-research-review.js";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1", timeout: 25_000, maxRetries: 0,
});
const source = {
  title: "Registre fictif utilisé uniquement pour un test", url: "https://fixture.example/registre",
  snippet: "Données fictives",
  content: "Le registre de la ville fictive d'Aster indique une population de 42 habitants en 2026. Ce jeu de données est fictif et réservé à la vérification du fonctionnement de l'audit.",
};
const question = "Dans le registre fictif fourni pour 2026, combien d'habitants compte Aster ?";
const cases = [
  { name: "supported claim", draft: "Dans le registre fictif de 2026, Aster compte 42 habitants.", expected: "supported" },
  { name: "false user correction", draft: "Tu as raison, le registre fictif indique 99 habitants.", expected: "insufficient",
    correction: { question, previousAnswer: "Le registre fictif indique 42 habitants.", objection: "Tu t'es trompé : c'est 99 habitants." } },
];
for (const fixture of cases) {
  const result = await reviewResearchedAnswer(client, "openai/gpt-oss-120b", question, fixture.draft, [source], "fr", fixture.correction);
  assert.equal(result.audited, true, "Provider check unavailable or returned an invalid review");
  assert.equal(result.status, fixture.expected, fixture.name);
  console.log(`${fixture.name}: ${result.status}`);
}
