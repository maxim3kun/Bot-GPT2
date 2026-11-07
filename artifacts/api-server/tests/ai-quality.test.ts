import test from "node:test";
import assert from "node:assert/strict";
import { classifyAiMessage } from "../src/discord/ai-router.js";
import { generateWithLengthRetry } from "../src/discord/ai-completion-quality.js";
import { splitAiAnswer } from "../src/discord/ai-answer-format.js";

test("An improvement question is not mistaken for a creator question", () => {
  const route = classifyAiMessage("Peux tu me dire tout ce qui est nécessaire pour que tu sois un meilleur agent IA ?");
  assert.notEqual(route.intent, "creator");
});

test("Actual creator questions still work", () => {
  for (const prompt of ["Qui t'a créé ?", "Qui t’a développé ?", "Qui est ton créateur ?", "Who created you?"]) {
    assert.equal(classifyAiMessage(prompt).intent, "creator", prompt);
  }
  assert.notEqual(classifyAiMessage("Qui est Einstein ?").intent, "creator");
});

test("Carbon comparisons and estimates need evidence, casual chat does not", () => {
  for (const prompt of [
    "À partir de combien de messages IA ? Donne une estimation selon le pays.",
    "Donne moi l’émission carbone d’un voyage au Japon comparé à une utilisation de l’IA",
    "Compare the carbon footprint of AI and a flight",
  ]) assert.equal(classifyAiMessage(prompt).needsResearch, true, prompt);
  assert.equal(classifyAiMessage("Comment tu vas ?").needsResearch, false);
});

test("Persona truncation is retried exactly once with a larger budget", async () => {
  const budgets: number[] = [];
  const result = await generateWithLengthRetry(async (budget) => {
    budgets.push(budget);
    return budgets.length === 1
      ? { text: "Partial", finishReason: "length" }
      : { text: "Complete.", finishReason: "stop" };
  });
  assert.deepEqual(budgets, [1600, 2800]);
  assert.equal(result.text, "Complete.");
});

test("Complete answers and safety refusals are not retried", async () => {
  for (const finishReason of ["stop", "content_filter"]) {
    let calls = 0;
    await generateWithLengthRetry(async () => {
      calls++;
      return { text: finishReason === "stop" ? "Hello." : "", finishReason };
    });
    assert.equal(calls, 1);
  }
});

test("Provider failures are not retried or hidden", async () => {
  let calls = 0;
  await assert.rejects(generateWithLengthRetry(async () => {
    calls++;
    throw new Error("provider unavailable");
  }), /provider unavailable/);
  assert.equal(calls, 1);
});

test("A filtered retry never exposes the earlier partial answer", async () => {
  let calls = 0;
  const result = await generateWithLengthRetry(async () => ++calls === 1
    ? { text: "Partial", finishReason: "length" }
    : { text: "", finishReason: "content_filter" });
  assert.equal(result.text, "");
});

test("Long persona answers keep all words across multiple Discord replies", () => {
  const text = "Une phrase complète avec un emoji 😀. ".repeat(400).trim();
  const chunks = splitAiAnswer(text);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 3800));
  assert.equal(chunks.join(" ").replace(/\s+/g, " "), text.replace(/\s+/g, " "));
  assert.equal(splitAiAnswer("😀".repeat(4000)).join(""), "😀".repeat(4000));
});
