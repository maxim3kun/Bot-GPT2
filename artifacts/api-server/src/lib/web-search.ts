import { logger } from "./logger.js";

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
  publishedAt?: string;
  qualityScore?: number;
  duplicateOf?: string;
}

const SEARCH_TIMEOUT_MS = 8_000;
const PAGE_TIMEOUT_MS = 6_000;
const MAX_RESULTS = 6;
// Keep the evidence compact enough for the LLM context window. The search
// result list remains available in full through the private sources button.
const MAX_PAGE_CHARS = 2_000;
const MAX_CONTEXT_CHARS = 9_000;

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCharCode(parseInt(code, 16)));
}

function stripHtml(value: string): string {
  return decodeHtml(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function isSafeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function parseResults(html: string): WebSearchResult[] {
  const results: WebSearchResult[] = [];
  const linkPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(linkPattern)) {
    const attributes = match[1];
    if (!/\bclass=['"][^'"]*\bresult-link\b[^'"]*['"]/i.test(attributes)) continue;
    const href = attributes.match(/\bhref=['"]([^'"]+)['"]/i)?.[1];
    if (!href) continue;
    let url = decodeHtml(href);
    if (url.startsWith("//")) url = `https:${url}`;
    try {
      const redirect = new URL(url);
      const destination = redirect.searchParams.get("uddg");
      if (destination) url = destination;
    } catch {
      continue;
    }
    if (!isSafeUrl(url)) continue;
    const afterLink = html.slice((match.index ?? 0) + match[0].length);
    const snippetMatch = afterLink.match(/<td[^>]*class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/i);
    results.push({
      title: stripHtml(match[2]),
      url,
      snippet: snippetMatch ? stripHtml(snippetMatch[1]) : "",
    });
    if (results.length >= MAX_RESULTS) break;
  }
  return results;
}

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "MaximeGPT/1.0 (Discord web research)",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function readPage(result: WebSearchResult): Promise<boolean> {
  try {
    const html = await fetchText(result.url, PAGE_TIMEOUT_MS);
    const text = stripHtml(html);
    if (!text) return false;
    result.content = text.slice(0, MAX_PAGE_CHARS);
    result.publishedAt = extractPublishedAt(html);
    return true;
  } catch (err) {
    logger.debug({ err, url: result.url }, "Web result page unavailable");
    return false;
  }
}

function normalizedQuery(query: string): string {
  return query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

type ResearchTopic = "general" | "practical" | "comparison" | "current" | "health" | "legal" | "technology" | "science";

interface ResearchPlan {
  initialPages: number;
  maxPages: number;
  topic: ResearchTopic;
}

function getResearchPlan(query: string): ResearchPlan {
  const normalized = normalizedQuery(query);
  const explicitConflict = /\b(?:contradictoire?s?|contredisent|desaccord|verifie|recoupe|conflicting|disagree)\b/.test(normalized);
  const health = /\b(?:sante|sante|medical|medic(?:al|ine)|maladie|symptome|traitement|nutrition)\b/.test(normalized);
  const legal = /\b(?:juridique|legal|loi|droit|administration|impot|visa|passeport|demarche)\b/.test(normalized);
  const technology = /\b(?:code|coder|programm(?:e|ation)|logiciel|api|documentation|installer|bug|erreur|javascript|typescript|python|discord)\b/.test(normalized);
  const science = /\b(?:etude|etudes|scientifique|science|recherche|universite|publication)\b/.test(normalized);
  const current = /\b(?:actualite?s?|aujourd'hui|dernier|recen(?:t|te)|prix|meteo|medical|politique|election|news|today|latest|current)\b/.test(normalized);
  const comparison = /\b(?:compar(?:e|aison)|versus|vs|difference|meilleur|recommand(?:e|ation)|avis|review|top)\b/.test(normalized);
  const practical = /\b(?:comment|recette|faire|tutoriel|guide|utiliser|etapes?|how to|recipe|tutorial)\b/.test(normalized);

  if (explicitConflict || current) return { initialPages: 4, maxPages: 6, topic: current ? "current" : "general" };
  if (health) return { initialPages: 4, maxPages: 6, topic: "health" };
  if (legal) return { initialPages: 4, maxPages: 6, topic: "legal" };
  if (technology) return { initialPages: comparison ? 3 : 2, maxPages: 6, topic: "technology" };
  if (science) return { initialPages: 3, maxPages: 6, topic: "science" };
  if (comparison) return { initialPages: 3, maxPages: 6, topic: "comparison" };
  if (practical) return { initialPages: 2, maxPages: 4, topic: "practical" };
  return { initialPages: 1, maxPages: 2, topic: "general" };
}

function extractPublishedAt(html: string): string | undefined {
  const candidates = [
    html.match(/<meta[^>]+(?:property|name)=["'](?:article:published_time|datepublished|date|pubdate)["'][^>]+content=["']([^"']+)/i)?.[1],
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:article:published_time|datepublished|date|pubdate)["']/i)?.[1],
    html.match(/<time[^>]+datetime=["']([^"']+)["']/i)?.[1],
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const date = new Date(candidate);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return undefined;
}

function domainOf(result: WebSearchResult): string {
  try {
    return new URL(result.url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function sourceQualityScore(result: WebSearchResult, plan: ResearchPlan): number {
  const hostname = domainOf(result);
  if (!hostname) return 0;
  let score = 0;

  // Domain trust is a starting point, not the complete judgment.
  const government = hostname.endsWith(".gouv.fr") || hostname.endsWith(".gov") || hostname.endsWith(".gov.uk") || hostname.includes("service-public");
  const academic = hostname.endsWith(".edu") || hostname.endsWith(".ac.uk") || hostname.endsWith(".edu.au");
  const official = /\b(?:who\.int|europa\.eu|un\.org|cdc\.gov|nih\.gov|docs?|developer|support|official)\b/.test(hostname);
  const specialist = hostname.endsWith(".org") || /\b(?:health|medical|science|journal|kitchen|recipe|tech)\b/.test(hostname);
  const lowTrust = /\b(?:forum|pinterest|facebook|instagram|tiktok|quora)\b/.test(hostname);

  if (government) score += 10;
  else if (academic) score += 8;
  else if (official) score += 7;
  else if (specialist) score += 3;
  if (lowTrust) score -= 3;

  if (plan.topic === "health" && (government || hostname.includes("who.int") || academic)) score += 5;
  if (plan.topic === "legal" && government) score += 5;
  if (plan.topic === "technology" && (official || hostname.includes("github.com"))) score += 5;
  if (plan.topic === "science" && academic) score += 4;
  if (plan.topic === "current" && result.publishedAt) score += 3;

  if (result.publishedAt) {
    const ageDays = (Date.now() - new Date(result.publishedAt).getTime()) / 86_400_000;
    if (plan.topic === "current") {
      if (ageDays <= 7) score += 6;
      else if (ageDays <= 30) score += 3;
      else if (ageDays > 365) score -= 4;
    } else if (ageDays > 365 * 5) {
      score -= 1;
    }
  } else if (plan.topic === "current") {
    score -= 2;
  }

  const contentLength = result.content?.length ?? 0;
  if (contentLength >= 900) score += 3;
  else if (contentLength >= 350) score += 1;
  else if (contentLength > 0 && contentLength < 150) score -= 2;
  if ((result.content?.match(/\b(?:buy|subscribe|advertisement|publicite|sponsorise)\b/gi)?.length ?? 0) >= 4) score -= 2;
  if (result.snippet.length >= 80) score += 1;
  return score;
}

function evidenceFingerprint(value: string): Set<string> {
  return new Set(
    normalizedQuery(value)
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length >= 4)
      .slice(0, 180),
  );
}

function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / Math.max(a.size, b.size);
}

function markDuplicateSources(results: WebSearchResult[]): void {
  for (const result of results) {
    result.duplicateOf = undefined;
  }
  const withContent = results.filter((result) => result.content);
  for (let index = 0; index < withContent.length; index += 1) {
    const current = withContent[index]!;
    const currentFingerprint = evidenceFingerprint(current.content!);
    for (const other of withContent.slice(0, index)) {
      if (similarity(currentFingerprint, evidenceFingerprint(other.content!)) >= 0.88) {
        current.duplicateOf = other.url;
        break;
      }
    }
  }
}

function hasConflictSignals(results: WebSearchResult[]): boolean {
  const independent = results.filter((result) => result.content && !result.duplicateOf);
  const markedPages = independent.filter((result) =>
    /\b(?:contrairement|cependant|toutefois|en revanche|desaccord|differe|incompatible|conflict(?:ing)?|disagree|however|whereas)\b/i.test(result.content!),
  );
  if (markedPages.length >= 2) return true;

  const values = independent.map((result) => new Set(
    result.content!.match(/\b\d+(?:[.,]\d+)?\s?(?:€|euros?|kg|g|cm|mm|minutes?|min|heures?|h|%|ans?)\b/gi) ?? [],
  ));
  for (let index = 0; index < values.length; index += 1) {
    for (const other of values.slice(index + 1)) {
      if (values[index]!.size > 0 && other.size > 0 && ![...values[index]!].some((value) => other.has(value))) return true;
    }
  }
  return false;
}

function buildTargetedQuery(query: string, plan: ResearchPlan): string | undefined {
  if (/\bsite:/i.test(query)) return undefined;
  if (plan.topic === "legal") return `${query} site:gouv.fr`;
  if (plan.topic === "health") return `${query} site:who.int OR site:sante.gouv.fr`;
  if (plan.topic === "technology") return `${query} official documentation`;
  if (plan.topic === "science") return `${query} scientific study`;
  if (plan.topic === "current") return `${query} official latest`;
  return undefined;
}

function researchConfidence(results: WebSearchResult[]): { level: "high" | "medium" | "low"; reason: string } {
  const evidence = results.filter((result) => result.content && !result.duplicateOf);
  const domains = new Set(evidence.map(domainOf).filter(Boolean));
  const bestScore = Math.max(0, ...evidence.map((result) => result.qualityScore ?? 0));
  if (evidence.length === 0) return { level: "low", reason: "Aucune page n’a fourni de contenu exploitable." };
  if (hasConflictSignals(results)) return { level: "low", reason: "Les sources indépendantes présentent des informations différentes." };
  if (bestScore >= 15 || (evidence.length >= 2 && domains.size >= 2 && bestScore >= 8)) {
    return { level: "high", reason: "Les informations sont confirmées par une source forte ou plusieurs sources indépendantes." };
  }
  if (evidence.length >= 2 && domains.size >= 2) {
    return { level: "medium", reason: "Plusieurs sources ont été consultées, mais leur autorité est limitée ou partielle." };
  }
  return { level: "medium", reason: "Une source exploitable a été trouvée, mais la vérification reste limitée." };
}

async function fetchSearchResults(query: string): Promise<WebSearchResult[]> {
  const endpoint = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
  const html = await fetchText(endpoint, SEARCH_TIMEOUT_MS);
  return parseResults(html);
}

function canonicalUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value;
  }
}

function mergeResults(primary: WebSearchResult[], additional: WebSearchResult[]): WebSearchResult[] {
  const seen = new Set<string>();
  const merged: WebSearchResult[] = [];
  for (const result of [...primary, ...additional]) {
    const key = canonicalUrl(result.url);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(result);
  }
  return merged.slice(0, MAX_RESULTS);
}

function rankResults(results: WebSearchResult[], plan: ResearchPlan): WebSearchResult[] {
  for (const result of results) result.qualityScore = sourceQualityScore(result, plan);
  return [...results].sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));
}

export async function searchWeb(query: string): Promise<WebSearchResult[]> {
  const trimmed = query
    .trim()
    .replace(/^(?:recherche|cherche)\s+(?:sur\s+internet|sur\s+le\s+net|en\s+ligne)\s*/i, "")
    .replace(/^(?:search|look\s+up)\s+(?:the\s+)?(?:internet|online)\s*/i, "")
    .trim()
    .slice(0, 300);
  if (!trimmed) return [];

  try {
    const plan = getResearchPlan(trimmed);
    let results = await fetchSearchResults(trimmed);
    const targetedQuery = buildTargetedQuery(trimmed, plan);
    let ranked = rankResults(results, plan);

    // If the first search does not surface a trustworthy source, make one
    // focused follow-up search before spending the page-reading budget.
    if (targetedQuery && (ranked[0]?.qualityScore ?? 0) < 10) {
      const targetedResults = await fetchSearchResults(targetedQuery).catch(() => []);
      results = mergeResults(results, targetedResults);
      ranked = rankResults(results, plan);
    }

    const consulted = new Set<WebSearchResult>();

    async function readCandidates(candidates: WebSearchResult[]): Promise<void> {
      await Promise.all(
        candidates.map(async (result) => {
          consulted.add(result);
          await readPage(result);
        }),
      );
    }

    await readCandidates(ranked.slice(0, plan.initialPages));

    // A page that is blocked or empty should not consume the whole research
    // budget. Fill missing evidence before deciding whether more cross-checking
    // is needed.
    const unread = ranked.filter((result) => !consulted.has(result));
    const usableCount = [...consulted].filter((result) => result.content).length;
    if (usableCount < plan.initialPages && unread.length > 0) {
      await readCandidates(unread.slice(0, plan.initialPages - usableCount));
    }

    // Five or six pages are reserved for genuine uncertainty: the first
    // sources contain conflict signals or the requested evidence is still too
    // thin. Ordinary questions therefore remain fast and low-noise.
    markDuplicateSources([...consulted]);
    for (const result of consulted) result.qualityScore = sourceQualityScore(result, plan);
    const needsMoreEvidence = hasConflictSignals([...consulted]) ||
      [...consulted].filter((result) => result.content).length < Math.min(2, plan.initialPages);
    if (needsMoreEvidence && consulted.size < plan.maxPages) {
      const remaining = ranked.filter((result) => !consulted.has(result));
      await readCandidates(remaining.slice(0, plan.maxPages - consulted.size));
    }

    markDuplicateSources([...consulted]);
    for (const result of consulted) result.qualityScore = sourceQualityScore(result, plan);
    return results
      .filter((result) => consulted.has(result))
      .sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));
  } catch (err) {
    logger.warn({ err, query: trimmed }, "Web search failed");
    return [];
  }
}

export function formatSearchContext(results: WebSearchResult[]): string {
  if (results.length === 0) return "";
  let usedChars = 0;
  const sections: string[] = [];
  const confidence = researchConfidence(results);
  const orderedResults = results
    .filter((result) => !result.duplicateOf)
    .sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));

  sections.push(
    `Research confidence: ${confidence.level}. ${confidence.reason}`,
  );

  for (const [index, result] of orderedResults.entries()) {
    const page = result.content ? `\nPage text: ${result.content}` : "";
    const score = result.qualityScore ?? 0;
    const section = `[${index + 1}] ${result.title}\nURL: ${result.url}\nSource quality score: ${score}\nSnippet: ${result.snippet}${page}`;
    const remaining = MAX_CONTEXT_CHARS - usedChars;
    if (remaining <= 0) break;
    sections.push(section.slice(0, remaining));
    usedChars += section.length;
  }

  return sections.join("\n\n");
}

export function formatSearchSources(results: WebSearchResult[]): string {
  if (results.length === 0) return "";
  return `\n\n🔎 **Sources consultées**\n${results.map((result, index) => `${index + 1}. [${result.title}](${result.url})`).join("\n")}`;
}