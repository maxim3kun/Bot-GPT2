// Optional real summarizer check. Fictional input only; no database or Discord writes.
import assert from "node:assert/strict";
import OpenAI from "openai";
import { generateConversationSummary } from "../src/discord/ai-conversation-memory.js";
import { parseConversationSummary } from "../src/discord/ai-conversation-memory-policy.js";

async function main() {
  const apiKey = process.env["GROQ_API_KEY"];
  if (!apiKey) throw new Error("Provider key unavailable");
  const client = new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1", timeout: 45_000, maxRetries: 0 });
  const summary = parseConversationSummary(await generateConversationSummary(client, "",
    "Je développe un petit jeu Discord et je préfère des réponses courtes en français.", false,
    "Quel type de jeu veux-tu créer ?"));
  assert.match(summary, /jeu|Discord/i);
  assert.match(summary, /court|concis|bref/i);
  console.log(JSON.stringify({ summary, characters: summary.length }));
}
void main().catch((error) => {
  console.error("Memory provider check failed", { name: error?.name, status: error?.status });
  process.exitCode = 1;
});
