import { logger } from "./logger.js";

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
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

function getResearchPlan(query: string): { initialPages: number; maxPages: number } {
  const normalized = normalizedQuery(query);
  const explicitConflict = /\b(?:contradictoire?s?|contredisent|desaccord|désaccord|verifie|vérifie|recoupe|conflicting|disagree)\b/.test(normalized);
  const sensitiveOrCurrent = /\b(?:actualite?s?|aujourd'hui|dernier|recen(?:t|te)|prix|meteo|météo|medical|medic(?:al|ine)|juridique|legal|financ(?:e|ier)|politique|election|elections|news|today|latest|current)\b/.test(normalized);
  const comparison = /\b(?:compar(?:e|aison)|versus|vs|difference|différence|meilleur|meilleure|recommand(?:e|ation)|avis|review|top)\b/.test(normalized);
  const practical = /\b(?:comment|recette|faire|tutoriel|guide|installer|utiliser|etapes?|étapes?|how to|recipe|tutorial|guide)\b/.test(normalized);

  if (explicitConflict) return { initialPages: 4, maxPages: 6 };
  if (sensitiveOrCurrent) return { initialPages: 4, maxPages: 6 };
  if (comparison) return { initialPages: 3, maxPages: 6 };
  if (practical) return { initialPages: 2, maxPages: 4 };
  return { initialPages: 1, maxPages: 2 };
}

function sourceQualityScore(result: WebSearchResult): number {
  try {
    const hostname = new URL(result.url).hostname.toLowerCase();
    let score = 0;
    if (hostname.endsWith(".gouv.fr") || hostname.endsWith(".gov") || hostname.endsWith(".gov.uk")) score += 5;
    if (hostname.endsWith(".edu") || hostname.endsWith(".ac.uk")) score += 4;
    if (/\b(?:who\.int|service-public|europa\.eu|un\.org|official|docs?|developer)\b/.test(hostname)) score += 3;
    if (hostname.endsWith(".org")) score += 1;
    if (/\b(?:forum|pinterest|facebook|instagram|tiktok)\b/.test(hostname)) score -= 2;
    return score;
  } catch {
    return 0;
  }
}

function hasConflictSignals(results: WebSearchResult[]): boolean {
  const combined = results
    .filter((result) => result.content)
    .map((result) => result.content)
    .join(" ");
  return /\b(?:contrairement|cependant|toutefois|en revanche|desaccord|désaccord|differe|diffère|incompatible|conflict(?:ing)?|disagree|however|whereas)\b/i.test(combined);
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
    const endpoint = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(trimmed)}`;
    const html = await fetchText(endpoint, SEARCH_TIMEOUT_MS);
    const results = parseResults(html);
    const plan = getResearchPlan(trimmed);
    const ranked = [...results].sort((a, b) => sourceQualityScore(b) - sourceQualityScore(a));
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
    const needsMoreEvidence = hasConflictSignals([...consulted]) ||
      [...consulted].filter((result) => result.content).length < Math.min(2, plan.initialPages);
    if (needsMoreEvidence && consulted.size < plan.maxPages) {
      const remaining = ranked.filter((result) => !consulted.has(result));
      await readCandidates(remaining.slice(0, plan.maxPages - consulted.size));
    }

    return results.filter((result) => consulted.has(result));
  } catch (err) {
    logger.warn({ err, query: trimmed }, "Web search failed");
    return [];
  }
}

export function formatSearchContext(results: WebSearchResult[]): string {
  if (results.length === 0) return "";
  let usedChars = 0;
  const sections: string[] = [];

  for (const [index, result] of results.entries()) {
    const page = result.content ? `\nPage text: ${result.content}` : "";
    const section = `[${index + 1}] ${result.title}\nURL: ${result.url}\nSnippet: ${result.snippet}${page}`;
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