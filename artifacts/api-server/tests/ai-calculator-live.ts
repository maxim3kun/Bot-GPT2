// Optional provider smoke check. No Discord writes and no private conversation data.
import assert from "node:assert/strict";
import OpenAI from "openai";
import { createReliableCompletion } from "../src/discord/ai-reliable-completion.js";

const apiKey = process.env["GROQ_API_KEY"];
if (!apiKey) throw new Error("GROQ_API_KEY is required for this optional live check");
const client = new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1", timeout: 45_000, maxRetries: 0 });
let calls = 0;
let toolCalls = 0;
const observed = { chat: { completions: { create: async (params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming) => {
  calls++;
  const result = await client.chat.completions.create(params);
  toolCalls += result.choices[0]?.message.tool_calls?.length ?? 0;
  return result;
} } } } as unknown as OpenAI;
const response = await createReliableCompletion(observed, {
  model: "openai/gpt-oss-120b", max_completion_tokens: 2_048,
  messages: [{ role: "user", content: "This is hypothetical arithmetic, not measured carbon data. Use verified_calculation to divide 1500 by 0.0005. Then respond with only the resulting number in plain decimal digits." }],
});
const text = response.choices[0]?.message.content?.trim() ?? "";
assert.ok(toolCalls > 0, "The provider must actually use the calculator tool");
assert.equal(text.replace(/[,\s_]/g, ""), "3000000");
assert.notEqual(response.choices[0]?.finish_reason, "length");
console.log(JSON.stringify({ providerCalls: calls, calculatorCalls: toolCalls, answer: text }));
