export interface GeneratedAiReply {
  text: string;
  finishReason: string | null;
  silent?: boolean;
}

/** Retry truncation once, not provider errors or safety refusals. */
export async function generateWithLengthRetry(
  generate: (tokenBudget: number) => Promise<GeneratedAiReply>,
): Promise<GeneratedAiReply> {
  const first = await generate(1_600);
  if (first.silent) return first;
  if (first.finishReason !== "length" && (first.text.trim() || first.finishReason !== "stop")) {
    return first;
  }
  const retry = await generate(2_800);
  if (retry.silent) return retry;
  if (retry.finishReason === "content_filter") return retry;
  // Never discard usable output if the retry also produces no text.
  return retry.text.trim() ? retry : first;
}

export const FACTUAL_ACCURACY_GUIDANCE =
  "For real-world factual questions, do not invent numbers, statistics, sources, expertise, or actions. " +
  "A fictional persona's confidence or biography is not evidence. Admit when you don't know, in the persona's own voice. " +
  "Keep the requested personality and level of detail; a short or partial answer must still use complete sentences and truthful claims. " +
  "For estimates, distinguish measured data from assumptions, give units and a justified range, and check arithmetic and unit conversions. " +
  "Do not extrapolate precise multipliers from unsupported guesses. Correct previous mistakes instead of repeating them.";
