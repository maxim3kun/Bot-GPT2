// Optional live-provider check with fictional users; no Discord or MongoDB writes.
import assert from "node:assert/strict";
import OpenAI from "openai";
import type { Message } from "discord.js";
import { createReliableCompletion } from "../src/discord/ai-reliable-completion.js";
import { buildSpeakerContext, currentUserTurn } from "../src/discord/ai-speaker-context.js";

async function main() {
  const apiKey = process.env["GROQ_API_KEY"];
  if (!apiKey) throw new Error("Provider key unavailable");
  const author = { id: "111111111111111111", username: "camille_test", displayName: "Camille", bot: false };
  const alex = { id: "222222222222222222", username: "alex_test", displayName: "Alex", bot: false };
  const sam = { id: "333333333333333333", username: "sam_test", displayName: "Sam", bot: false };
  const message = {
    author, member: { displayName: author.displayName },
    channel: { isDMBased: () => true },
    mentions: { users: new Map([[alex.id, alex], [sam.id, sam]]), members: new Map() },
  } as unknown as Message;
  const question = "<@222222222222222222> <@333333333333333333> Tu peux lui expliquer notre projet ?";
  const client = new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1", timeout: 45_000, maxRetries: 0 });
  const response = await createReliableCompletion(client, {
    model: "openai/gpt-oss-120b", max_completion_tokens: 2_048, currentUserText: question,
    messages: [
      { role: "system", content: await buildSpeakerContext(message) },
      { role: "user", content: currentUserTurn(message, question) },
    ],
  });
  const answer = response.choices[0]?.message.content?.trim() ?? "";
  console.log(JSON.stringify({ silent: response.intentionallySilent ?? false, answer: answer.slice(0, 600) }));
  assert.notEqual(response.intentionallySilent, true);
  assert.match(answer, /\?/);
  assert.match(answer, /Alex|Sam|qui|lequel/i);
}
void main().catch((error) => {
  console.error("Conversation provider check failed", { name: error?.name, status: error?.status });
  process.exitCode = 1;
});
