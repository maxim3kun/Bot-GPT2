import { logger } from "./logger.js";

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
}

const SEARCH_TIMEOUT_MS = 8_000;
const PAGE_TIMEOUT_MS = 6_000;
const MAX_RESULTS = 4;
const MAX_PAGE_CHARS = 4_000;

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

async function readPage(result: WebSearchResult): Promise<void> {
  try {
    const html = await fetchText(result.url, PAGE_TIMEOUT_MS);
    const text = stripHtml(html);
    if (text) result.content = text.slice(0, MAX_PAGE_CHARS);
  } catch (err) {
    logger.debug({ err, url: result.url }, "Web result page unavailable");
  }
}

export async function searchWeb(query: string): Promise<WebSearchResult[]> {
  const trimmed = query.trim().slice(0, 300);
  if (!trimmed) return [];

  try {
    const endpoint = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(trimmed)}`;
    const html = await fetchText(endpoint, SEARCH_TIMEOUT_MS);
    const results = parseResults(html);
    await Promise.all(results.map(readPage));
    return results;
  } catch (err) {
    logger.warn({ err, query: trimmed }, "Web search failed");
    return [];
  }
}

export function formatSearchContext(results: WebSearchResult[]): string {
  if (results.length === 0) return "";
  return results
    .map((result, index) => {
      const page = result.content ? `\nPage text: ${result.content}` : "";
      return `[${index + 1}] ${result.title}\nURL: ${result.url}\nSnippet: ${result.snippet}${page}`;
    })
    .join("\n\n");
}

export function formatSearchSources(results: WebSearchResult[]): string {
  if (results.length === 0) return "";
  return `\n\n🔎 **Sources consultées**\n${results.map((result, index) => `${index + 1}. [${result.title}](${result.url})`).join("\n")}`;
}