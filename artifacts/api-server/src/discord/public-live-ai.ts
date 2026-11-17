import OpenAI from "openai";
import { buildLanguageGuardPrompt, detectUserLanguage } from "./ai-language-guard.js";
import type { PublicLiveMessage } from "./public-live-sessions.js";

const MAX_TEXT_LENGTH = 1_200;
let groqClient: OpenAI | null = null;

function client(): OpenAI {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) throw new Error("live_ai_unavailable");
  if (!groqClient) {
    groqClient = new OpenAI({
      apiKey,
      baseURL: "https://api.groq.com/openai/v1",
      timeout: 25_000,
      maxRetries: 0,
    });
  }
  return groqClient;
}

export function detectPublicLiveLanguage(text: string): string {
  return detectUserLanguage(text) ?? "fr";
}

export async function answerPublicLiveTurn(
  text: string,
  previousMessages: PublicLiveMessage[],
): Promise<string> {
  const prompt = text.trim();
  if (!prompt || prompt.length > MAX_TEXT_LENGTH) throw new Error("invalid_live_message");
  const language = detectPublicLiveLanguage(prompt);
  const history = previousMessages.slice(-8).map(({ role, content }) => ({
    role,
    content: content.slice(0, MAX_TEXT_LENGTH),
  }));
  const completion = await client().chat.completions.create({
    model: "openai/gpt-oss-120b",
    max_completion_tokens: 350,
    messages: [
      {
        role: "system",
        content: [
          "Tu es MaximeGPT, un compagnon IA chaleureux, spontané et concis.",
          "Réponds naturellement, en une à trois phrases, et dans la langue du message.",
          "Cette conversation est anonyme et temporaire. Tu n'as aucune mémoire personnelle antérieure sur la personne.",
          "Tu n'es pas connecté à Discord dans cette page et ne peux pas lancer ses commandes.",
          "Pour les horaires, trajets, météo et autres informations actuelles, ne devine jamais : indique clairement quand la page ne dispose pas d'une source en direct.",
          buildLanguageGuardPrompt(language),
        ].join("\n\n"),
      },
      ...history,
      { role: "user", content: prompt },
    ],
  });
  const answer = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!answer) throw new Error("live_ai_empty_response");
  return answer.slice(0, 1_800);
}

export function resetPublicLiveAiClientForTests(): void {
  groqClient = null;
}
