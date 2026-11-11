import type OpenAI from "openai";
import { incrementGroqCalls } from "../lib/bot-stats.js";
import { calculateVerified, CALCULATION_INSTRUCTIONS } from "./ai-calculator.js";
import { recordDiagnosticMetadata } from "./ai-observability-store.js";
import { CONVERSATION_GUIDANCE, isCondescendingRemark, validSilenceRequest } from "./ai-conversation-policy.js";
import { ecologyGuidanceFor } from "./ai-ecology-policy.js";
import type { WebSearchResult } from "../lib/web-search.js";
import type { CorrectionContext } from "./ai-correction-policy.js";
import { reviewResearchedAnswer } from "./ai-research-review.js";

type Params = { model: string; max_completion_tokens: number; messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  currentUserText?: string; evidence?: WebSearchResult[]; correction?: CorrectionContext; responseLanguage?: string };
type ReliableCompletion = OpenAI.Chat.Completions.ChatCompletion & {
  intentionallySilent?: boolean; reviewedSources?: WebSearchResult[]; verifiedCalculations?: unknown[];
};

/** The model gets a bounded calculator, never command execution or arbitrary code. */
export async function createReliableCompletion(openai: OpenAI, params: Params): Promise<ReliableCompletion> {
  const { currentUserText, evidence, correction, responseLanguage, ...request } = params;
  const verifiedCalculations: unknown[] = [];
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: CALCULATION_INSTRUCTIONS + "\n" + CONVERSATION_GUIDANCE + "\n" +
      "Never invent public-transit routes, line directions, transfers, station counts or travel times from memory. " +
      "Verified route guidance is handled separately by the official transport integration. If a navigation question " +
      "reaches you without verified transport evidence, ask for the departure and destination or say you cannot verify it. " +
      "Never claim that a route calculation or a real-time lookup occurred when it did not.\n" +
      (isCondescendingRemark(currentUserText ?? "")
        ? "The current message includes condescension. Give a short, calm response in the active persona's voice; a mild, non-hostile quip is allowed. Never attack the user. If the message also contains a useful question or request, answer it directly rather than focusing on the tone.\n"
        : "") +
      ecologyGuidanceFor(correction?.question ?? currentUserText ?? "") }, ...params.messages,
  ];
  for (let round = 0; round < 3; round++) {
    const completion = await openai.chat.completions.create({
      ...request, messages,
      ...(round < 2 ? { tools: [{
        type: "function" as const,
        function: {
          name: "verified_calculation",
          description: "Verify bounded arithmetic or g/kg/t conversion. Does not validate source data.",
          parameters: {
            type: "object", additionalProperties: false, required: ["operation", "values"],
            properties: {
              operation: { type: "string", enum: ["add", "subtract", "multiply", "divide", "convert_mass"] },
              values: { type: "array", minItems: 1, maxItems: 16, items: { type: "number" } },
              from: { type: "string", enum: ["g", "kg", "t"] },
              to: { type: "string", enum: ["g", "kg", "t"] },
            },
          },
        },
      }, ...(currentUserText ? [{
        type: "function" as const,
        function: {
          name: "choose_silence",
          description: "Choose zero messages for pure abuse directed at you or a short acknowledgement with nothing to answer. Never for a question, greeting, useful criticism or model failure.",
          parameters: {
            type: "object", additionalProperties: false, required: ["reason"],
            properties: { reason: { type: "string", enum: ["targeted_abuse", "no_response_needed"] } },
          },
        },
      }] : [])], parallel_tool_calls: false } : {}),
    });
    incrementGroqCalls();
    const choice = completion.choices[0];
    if (!choice?.message.tool_calls?.length) {
      if (choice?.finish_reason === "length") recordDiagnosticMetadata("ai", { name: "GenerationLimit" }, "groq");
      else if (!choice?.message.content?.trim() && choice?.finish_reason !== "content_filter") {
        recordDiagnosticMetadata("ai", { name: "EmptyAiResponse" }, "groq");
      }
      if (choice?.message.content?.trim() && evidence?.length && choice.finish_reason !== "content_filter") {
        const reviewed = await reviewResearchedAnswer(openai, params.model, correction?.question ?? currentUserText ?? "",
          choice.message.content, evidence, responseLanguage ?? "en", correction, verifiedCalculations);
        return { ...completion, reviewedSources: reviewed.sources, verifiedCalculations,
          choices: completion.choices.map((item) => ({ ...item, message: { ...item.message, content: reviewed.text } })) };
      }
      return { ...completion, verifiedCalculations };
    }
    if (round === 2 || choice.message.tool_calls.length > 4) throw new Error("Calculation tool budget exceeded");
    messages.push({ role: "assistant", content: choice.message.content, tool_calls: choice.message.tool_calls });
    for (const call of choice.message.tool_calls) {
      let result: unknown;
      try {
        if (call.type === "function" && call.function.name === "choose_silence") {
          if (currentUserText && validSilenceRequest(call.function.arguments, currentUserText)) {
            return { ...completion, intentionallySilent: true, choices: completion.choices.map((item) => ({
              ...item, finish_reason: "stop", message: { ...item.message, content: null, tool_calls: undefined },
            })) };
          }
          messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ error: "Silence is not permitted here. Answer the request or ask one helpful clarification." }) });
          continue;
        }
        if (call.type !== "function" || call.function.name !== "verified_calculation") throw new Error("Unknown tool");
        result = calculateVerified(JSON.parse(call.function.arguments));
        verifiedCalculations.push(result);
      } catch {
        recordDiagnosticMetadata("ai", { name: "RejectedCalculation" });
        result = { error: "Invalid calculation. Use finite numeric operands and supported operations/units; never guess a result." };
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }
  throw new Error("No final AI response");
}
