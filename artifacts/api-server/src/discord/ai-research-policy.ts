import type { WebSearchResult } from "../lib/web-search.js";
import { splitAiAnswer } from "./ai-answer-format.js";
import { researchNotice } from "./ai-research-i18n.js";

function normalized(text: string): string {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}

export function relevantPageText(text: string, query: string, limit = 2_000): string {
  if (text.length <= limit) return text;
  const terms = [...new Set(query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .match(/[\p{L}\p{N}]{4,}/gu) ?? [])].filter((term) => !/^(?:comment|quelle|quels|quelles|what|where|about|please|explique|pourquoi|cherche|reponse|sources)$/.test(term)).slice(0, 16);
  let bestAt = 0, bestScore = 0;
  for (let at = 0; at < Math.min(text.length, 250_000); at += 500) {
    const window = text.slice(at, at + limit).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const score = terms.reduce((sum, term) => sum + (window.includes(term) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; bestAt = at; }
  }
  // Start at a sentence boundary where possible, not midway through a negation.
  if (bestAt > 0) {
    const preceding = text.slice(Math.max(0, bestAt - 400), bestAt);
    const boundaries = [...preceding.matchAll(/[.!?]\s+/g)];
    const boundary = boundaries.at(-1);
    if (boundary?.index !== undefined) bestAt = Math.max(0, bestAt - 400) + boundary.index + boundary[0].length;
  }
  return text.slice(bestAt, bestAt + limit);
}

export function prepareEvidence(results: WebSearchResult[], now = Date.now(), query = ""): WebSearchResult[] {
  const urls = new Set<string>(), texts = new Set<string>();
  let remaining = 6_000;
  const accepted: WebSearchResult[] = [];
  for (const result of [...results].sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0))) {
    if (result.duplicateOf || !result.content || result.content.trim().length < 100) continue;
    let url: URL;
    try { url = new URL(result.url); } catch { continue; }
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) continue;
    if (result.publishedAt && (!Number.isFinite(Date.parse(result.publishedAt)) || Date.parse(result.publishedAt) > now + 86_400_000)) continue;
    const canonical = new URL(url);
    canonical.hash = "";
    for (const key of [...canonical.searchParams.keys()]) if (/^utm_|^(?:fbclid|gclid)$/i.test(key)) canonical.searchParams.delete(key);
    const fingerprint = normalized(result.content);
    if (urls.has(canonical.href) || texts.has(fingerprint)) continue;
    if (/^(?:access denied|just a moment|verify (?:you are|you're) human|enable javascript|checking your browser)/i.test(result.content.trim())) continue;
    if (remaining < 100) break;
    const content = relevantPageText(result.content, query, Math.min(1_500, remaining));
    accepted.push({ ...result, title: result.title.slice(0, 180), snippet: result.snippet.slice(0, 160), content });
    urls.add(canonical.href); texts.add(fingerprint);
    remaining -= content.length;
    if (accepted.length >= 6) break;
  }
  return accepted;
}

export function draftSegments(draft: string): string[] {
  return draft.split(/\n\s*\n/).flatMap((part) => splitAiAnswer(part, 900)).filter(Boolean).slice(0, 32);
}

export type ReviewStatus = "supported" | "partial" | "conflicting" | "insufficient";
export interface ValidatedReview {
  status: ReviewStatus; text: string; sources: WebSearchResult[];
  audited?: boolean;
}

export function verificationUnavailable(language: string, _correction = false): string {
  return researchNotice(language, "unavailable");
}

export function validateEvidenceReview(raw: string, segments: string[], sources: WebSearchResult[], language: string, correction = false): ValidatedReview {
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid evidence review");
  const review = data as Record<string, unknown>;
  if (!["supported", "partial", "conflicting", "insufficient"].includes(String(review.status)) || !Array.isArray(review.supported)) throw new Error("Invalid review status");
  if (review.status === "insufficient") return { status: "insufficient", text: verificationUnavailable(language, correction), sources: [] };
  const approved = new Set<number>(), used = new Set<number>();
  for (const entry of review.supported.slice(0, 32)) {
    if (!entry || typeof entry !== "object") continue;
    const { segment, citations } = entry as { segment?: unknown; citations?: unknown };
    if (!Number.isInteger(segment) || typeof segment !== "number" || segment < 1 || segment > segments.length || !Array.isArray(citations) || !citations.length || citations.length > 6) continue;
    const valid: number[] = [];
    let failed = false;
    for (const citation of citations) {
      if (!citation || typeof citation !== "object") { failed = true; break; }
      const { source, quote } = citation as { source?: unknown; quote?: unknown };
      if (!Number.isInteger(source) || typeof source !== "number" || source < 1 || source > sources.length ||
          typeof quote !== "string" || normalized(quote).length < 20 || quote.length > 500 ||
          !normalized(sources[source - 1]!.content ?? "").includes(normalized(quote))) { failed = true; break; }
      valid.push(source - 1);
    }
    if (failed) continue;
    const text = segments[segment - 1]!;
    // Never let a model add an apology/agreement for an error not actually confirmed.
    if (correction && review.previousError !== "confirmed" &&
        /tu as raison|vous avez raison|you(?:'re| are) right|je me suis tromp|mon erreur|i was wrong|my mistake/i.test(text)) continue;
    const urls = text.match(/https?:\/\/[^\s)>\]]+/g) ?? [];
    if (urls.some((url) => !sources.some((item) => item.url === url))) continue;
    approved.add(segment - 1);
    for (const id of valid) used.add(id);
  }
  if (!approved.size) return { status: "insufficient", text: verificationUnavailable(language, correction), sources: [] };
  let status: ReviewStatus = review.status as ReviewStatus;
  if (status === "supported" && approved.size < segments.length) status = "partial";
  if (status === "conflicting" && new Set([...used].map((id) => new URL(sources[id]!.url).hostname.replace(/^www\./, ""))).size < 2) {
    return { status: "insufficient", text: verificationUnavailable(language, correction), sources: [] };
  }
  let prefix = "";
  if (correction) {
    prefix = researchNotice(language, review.previousError === "confirmed" ? "confirmed" : "unconfirmed") + "\n\n";
  }
  if (status !== "supported") prefix += researchNotice(language, status === "conflicting" ? "conflicting" : "partial") + "\n\n";
  return {
    status, text: prefix + [...approved].sort((a, b) => a - b).map((id) => segments[id]).join("\n\n"),
    sources: [...used].sort((a, b) => a - b).map((id) => sources[id]!),
  };
}
