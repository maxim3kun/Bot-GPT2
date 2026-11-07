export type FeedbackVote = 1 | -1;

/** Defer work until after assignment, including an initially empty flush. */
export function createSerializedFlush() {
  let pending: Promise<void> | null = null;
  return (work: () => Promise<void>): Promise<void> => {
    if (pending) return pending;
    pending = Promise.resolve().then(work).finally(() => { pending = null; });
    return pending;
  };
}

/** Queue gateway events before asynchronous user/metadata lookups can reorder them. */
export function createOrderedEventQueue() {
  const pending = new Map<string, Promise<void>>();
  return (key: string, work: () => Promise<void>): Promise<void> => {
    const next = (pending.get(key) ?? Promise.resolve()).catch(() => {}).then(work);
    pending.set(key, next);
    const cleanup = () => { if (pending.get(key) === next) pending.delete(key); };
    void next.then(cleanup, cleanup);
    return next;
  };
}

export function reactionVote(emoji: string | null): FeedbackVote | null {
  return emoji === "👍" ? 1 : emoji === "👎" ? -1 : null;
}

export function diagnosticCategory(error: unknown): string {
  if (!error || typeof error !== "object") return "unknown";
  const value = error as { name?: unknown; status?: unknown; code?: unknown };
  if (value.name === "GenerationLimit") return "generation_limit";
  if (value.name === "EmptyAiResponse") return "empty_response";
  if (value.name === "RejectedCalculation") return "calculation_rejected";
  if (value.status === 429) return "rate_limit";
  if (value.status === 401 || value.status === 403 || value.code === 50013 || value.code === 50007) return "permissions";
  if (typeof value.status === "number" && value.status >= 500 && value.status < 600) return "provider_unavailable";
  if (typeof value.name === "string" && /mongo/i.test(value.name)) return "storage";
  if (typeof value.name === "string" && /timeout|abort/i.test(value.name)) return "timeout";
  if (typeof value.name === "string" && /connect|network/i.test(value.name)) return "network";
  return "operation_failed";
}

/** Latest active emoji per voter and entire answer, not per message chunk. */
export function feedbackSummaryPipeline(since: Date, until: Date, now = new Date()) {
  return [
    { $match: { expiresAt: { $gt: now } } },
    { $sort: { at: -1, _id: 1 } },
    { $group: { _id: { responseId: "$responseId", voterKey: "$voterKey" }, kind: { $first: "$kind" }, vote: { $first: "$vote" }, at: { $first: "$at" } } },
    { $match: { at: { $gte: since, $lt: until } } },
    { $group: { _id: { kind: "$kind", vote: "$vote" }, count: { $sum: 1 } } },
  ];
}

function parisParts(now: Date) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(now).map((part) => [part.type, part.value]));
}

function parisTime(date: string, hour: number): Date {
  const [year, month, day] = date.split("-").map(Number);
  for (const offset of [1, 2]) {
    const candidate = new Date(Date.UTC(year!, month! - 1, day!, hour - offset));
    const parts = parisParts(candidate);
    if (`${parts.year}-${parts.month}-${parts.day}` === date && Number(parts.hour) === hour) return candidate;
  }
  throw new Error("Unable to resolve Paris diagnostic schedule");
}

export function dueDiagnosticSlot(now: Date) {
  const parts = parisParts(now);
  const hour = Number(parts.hour);
  if (hour < 9) return null;
  const scheduledHour = hour >= 21 ? 21 : 9;
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const until = parisTime(date, scheduledHour);
  // No old-report spam on startup after an extended outage.
  if (now.getTime() - until.getTime() > 15 * 60_000) return null;
  const previousDate = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) - 1)).toISOString().slice(0, 10);
  return {
    key: `${date}:${scheduledHour}`,
    since: scheduledHour === 21 ? parisTime(date, 9) : parisTime(previousDate, 21),
    until,
  };
}

/** Durable slot claim precedes sending: failed/uncertain sends never spam retries. */
export async function deliverDiagnosticOnce(
  claim: () => Promise<boolean>,
  send: () => Promise<string>,
  finish: (status: "sent" | "failed", messageId?: string) => Promise<void>,
): Promise<"skipped" | "sent" | "failed"> {
  if (!await claim()) return "skipped";
  let messageId: string;
  try { messageId = await send(); }
  catch { await finish("failed"); return "failed"; }
  await finish("sent", messageId);
  return "sent";
}
