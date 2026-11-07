import { classifyAiMessage } from "./ai-router.js";

export const LONG_ANSWER_RATING_THRESHOLD = 1_500;

export function replyFeedbackPlan(kind: "bot" | "persona", answerLength: number, question = "") {
  if (kind === "persona") return { register: false, seed: false };
  const clean = question.replace(/<@!?\d+>/g, "").trim().replace(/^[/!](?:ai\s+)?(?:ask|ia)\s+/i, "").trim();
  const shortFact = clean.split(/\s+/).length <= 12 &&
    /^(?:quel(?:le)?s?|qui|quand|o[uù]|combien|c['’]est quoi|qu['’]est[- ]ce que|what|who|when|where)\b/i.test(clean) &&
    !/explique|explain|d[eé]taill|detail|analys|compar|approfond|[eé]tape|step/i.test(clean);
  const basic = shortFact || ["greeting", "identity", "creator", "capabilities", "time"].includes(classifyAiMessage(clean).intent);
  return { register: true, seed: answerLength >= LONG_ANSWER_RATING_THRESHOLD && !basic };
}
