export interface ConversationMemory {
  enabled: boolean;
  summary: string;
  revision: string;
  enabledAt: Date;
  updatedAt: Date;
}

export interface ConversationMemoryRepository {
  read(scope: string, userId: string): Promise<ConversationMemory | null>;
  save(scope: string, userId: string, revision: string, summary: string): Promise<boolean>;
}

const CREDENTIALS = /(?:mot de passe|password|api[_ -]?key|secret[_ -]?key|private[_ -]?key|authorization:\s*bearer|-----BEGIN|(?:gsk_|sk-|hf_)[a-z0-9]{12})/i;
const PRIVATE_CONTACT = /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b|\b(?:\+?\d[\d .()-]{8,}\d)\b/i;

export function safeSummaryInput(text: string): string | null {
  const withoutMentions = text.replace(/<@!?\d+>/g, "[mentioned Discord member]");
  if (CREDENTIALS.test(withoutMentions) || PRIVATE_CONTACT.test(withoutMentions)) return null;
  return withoutMentions.slice(0, 3_000).trim() || null;
}

export function parseConversationSummary(raw: string): string {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) ||
    Object.keys(parsed).some((key) => key !== "summary") ||
    typeof (parsed as { summary?: unknown }).summary !== "string") throw new Error("Invalid conversation summary");
  const summary = (parsed as { summary: string }).summary.trim().slice(0, 2_400);
  if (CREDENTIALS.test(summary) || PRIVATE_CONTACT.test(summary)) throw new Error("Unsafe conversation summary");
  return summary;
}

export async function updateConversationMemory(
  repository: ConversationMemoryRepository,
  generate: (previous: string, current: string) => Promise<string>,
  scope: string,
  userId: string,
  text: string,
  startedAt: number,
): Promise<boolean> {
  const input = safeSummaryInput(text);
  if (!input) return false;
  const memory = await repository.read(scope, userId);
  if (!memory?.enabled || startedAt < memory.enabledAt.getTime()) return false;
  const summary = parseConversationSummary(await generate(memory.summary, input));
  if (summary === memory.summary) return false;
  // Compare-and-swap: withdrawal/deletion must beat an in-flight summary.
  return repository.save(scope, userId, memory.revision, summary);
}
