import OpenAI from "openai";
import { getAiPromptContext } from "./ai-memory.js";
import { buildBotCommandContext } from "./ai-command-context.js";
import { FACTUAL_ACCURACY_GUIDANCE } from "./ai-completion-quality.js";
import { createReliableCompletion } from "./ai-reliable-completion.js";
import { buildLanguageGuardPrompt, detectUserLanguage } from "./ai-language-guard.js";
import { getEffectiveLanguage } from "./effective-language.js";
import { getPrefix } from "./prefix-store.js";
import type { UserLang } from "./user-lang-store.js";
import {
  appendActivityConversationTurn,
  getActivityConversation,
  type ActivityConversationTurn,
} from "./discord-activity-conversations.js";

const MAX_TEXT_LENGTH = 2_000;
let groqClient: OpenAI | null = null;

function client(): OpenAI {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) throw new Error("activity_ai_unavailable");
  if (!groqClient) {
    groqClient = new OpenAI({
      apiKey,
      baseURL: "https://api.groq.com/openai/v1",
      timeout: 30_000,
      maxRetries: 0,
    });
  }
  return groqClient;
}

export async function answerDiscordActivityTurn(input: {
  guildId: string;
  userId: string;
  sessionId: string;
  conversationId: string;
  text: string;
}): Promise<string> {
  const prompt = input.text.trim();
  if (!prompt || prompt.length > MAX_TEXT_LENGTH) throw new Error("invalid_activity_message");
  const previous = getActivityConversation(input);
  const language: UserLang = detectUserLanguage(prompt)
    ?? getEffectiveLanguage(input.guildId, input.userId);
  const prefix = await getPrefix(input.guildId);
  const memory = await getAiPromptContext(input.guildId, input.userId).catch(() => "");
  const systemPrompt = [
    "You are MaximeGPT, a friendly, concise AI companion speaking naturally in Discord.",
    "Answer the useful point first in one to three short sentences unless the member asks for more detail.",
    "This is a private Discord Activity conversation. Do not claim to have executed Discord commands or checked live data.",
    "For live transport, weather, flights, or other current data, direct the member to the bot's relevant command instead of guessing.",
    "Never reveal, infer, or repeat another member's private Activity story, profile, or conversation.",
    buildLanguageGuardPrompt(language),
    FACTUAL_ACCURACY_GUIDANCE,
    buildBotCommandContext(prompt, language, prefix),
    memory ? `Private memory for this verified member only:\n${memory}` : "",
  ].filter(Boolean).join("\n\n");

  const completion = await createReliableCompletion(client(), {
    model: "openai/gpt-oss-120b",
    max_completion_tokens: 600,
    currentUserText: prompt,
    responseLanguage: language,
    messages: [
      { role: "system", content: systemPrompt },
      ...(previous as ActivityConversationTurn[]),
      { role: "user", content: prompt },
    ],
  });
  if (completion.intentionallySilent) return "";
  const answer = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!answer) throw new Error("activity_ai_empty_response");
  appendActivityConversationTurn(input, { role: "user", content: prompt });
  appendActivityConversationTurn(input, { role: "assistant", content: answer });
  return answer;
}

export function resetDiscordActivityAiClientForTests(): void { groqClient = null; }
