import { lookup, type LookupAddress } from "node:dns";
import { request as httpsRequest } from "node:https";
import { isIP, type LookupFunction } from "node:net";
import { JSDOM } from "jsdom";

export const DATA_EXPORT_LIMITS = {
  maxUrlLength: 2_048,
  maxHtmlBytes: 1_500_000,
  maxOutputBytes: 7 * 1024 * 1024,
  maxRedirects: 3,
  requestTimeoutMs: 10_000,
  maxFetchDurationMs: 15_000,
  maxTables: 3,
  maxRowsPerTable: 500,
  maxColumnsPerTable: 30,
  maxCellCharacters: 1_000,
  maxPdfCharacters: 24_000,
  maxPdfPages: 12,
  cooldownMs: 30_000,
  maxConcurrentExports: 3,
} as const;

export type PageFetchErrorCode =
  | "invalid_url" | "private_address" | "dns" | "timeout" | "too_large"
  | "redirect" | "not_html" | "http" | "no_tables" | "no_content" | "pdf_limit";

export class PageFetchError extends Error {
  constructor(readonly code: PageFetchErrorCode) {
    super(code);
    this.name = "PageFetchError";
  }
}

export interface PublicPageSnapshot {
  url: string;
  title: string;
  html: string;
  retrievedAt: Date;
}

interface HtmlElement {
  tagName: string;
  textContent: string | null;
  querySelectorAll(selector: string): ArrayLike<HtmlElement>;
  querySelector(selector: string): HtmlElement | null;
  closest(selector: string): HtmlElement | null;
  remove(): void;
}

interface HtmlDocument {
  title: string;
  body: HtmlElement;
}

interface PageResponse {
  status: number;
  location?: string;
  contentType?: string;
  contentEncoding?: string;
  body: Buffer;
}

interface PublicPageFetcherDependencies {
  resolveHost?: (hostname: string) => Promise<LookupAddress[]>;
  requestPage?: (url: URL, addresses: LookupAddress[], timeoutMs: number) => Promise<PageResponse>;
  now?: () => Date;
}

const isRedirect = (status: number) => [301, 302, 303, 307, 308].includes(status);
const isIpv4 = (address: string) => isIP(address) === 4;

function isPublicIpv4(address: string): boolean {
  if (!isIpv4(address)) return false;
  const [a, b, c, d] = address.split(".").map(Number);
  if ([a, b, c, d].some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  if (a === 0 || a === 10 || a === 127 || a! >= 224) return false;
  if (a === 100 && b! >= 64 && b! <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b! >= 16 && b! <= 31) return false;
  if (a === 192 && (b === 0 || b === 168)) return false;
  if (a === 192 && b === 88 && c === 99) return false;
  if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  if (a === 255 && b === 255 && c === 255 && d === 255) return false;
  return true;
}

function ipv6Groups(address: string): number[] | null {
  const normalized = address.toLowerCase().split("%")[0] ?? "";
  if (normalized.includes(".")) return null;
  const sections = normalized.split("::");
  if (sections.length > 2) return null;
  const left = sections[0] ? sections[0]!.split(":") : [];
  const right = sections.length === 2 && sections[1] ? sections[1].split(":") : [];
  const zeros = sections.length === 2 ? 8 - left.length - right.length : 0;
  if (zeros < 0 || (sections.length === 1 && left.length !== 8)) return null;
  const groups = [...left, ...Array(zeros).fill("0"), ...right].map((part) => Number.parseInt(part || "0", 16));
  return groups.length === 8 && groups.every((part) => Number.isInteger(part) && part >= 0 && part <= 0xffff)
    ? groups
    : null;
}

function isPublicIpv6(address: string): boolean {
  if (isIP(address) !== 6) return false;
  const groups = ipv6Groups(address);
  if (!groups) return false;
  // Accept only global-unicast space; this excludes loopback, link-local,
  // unique-local, multicast, mapped IPv4 and other special-purpose ranges.
  if (groups[0]! < 0x2000 || groups[0]! > 0x3fff) return false;
  if (groups[0] === 0x2001 && groups[1] === 0x0db8) return false; // documentation
  if (groups[0] === 0x2001 && groups[1]! <= 0x002f) return false; // special-purpose and benchmarking
  if (groups[0] === 0x2002) return false; // 6to4 embeds an IPv4 destination
  return true;
}

export function isPublicAddress(address: string): boolean {
  return isPublicIpv4(address) || isPublicIpv6(address);
}

export function validatePublicHttpsUrl(input: string): URL {
  if (!input || input.length > DATA_EXPORT_LIMITS.maxUrlLength) throw new PageFetchError("invalid_url");
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new PageFetchError("invalid_url");
  }
  if (
    url.protocol !== "https:"
    || (url.port && url.port !== "443")
    || url.username
    || url.password
    || !url.hostname
  ) {
    throw new PageFetchError("invalid_url");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    isIP(hostname)
    || hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname.endsWith(".local")
    || hostname.endsWith(".internal")
    || hostname.endsWith(".test")
    || hostname.endsWith(".invalid")
  ) {
    throw new PageFetchError("private_address");
  }
  url.hash = "";
  return url;
}

async function resolvePublicHost(hostname: string): Promise<LookupAddress[]> {
  try {
    const addresses = await new Promise<LookupAddress[]>((resolve, reject) => {
      lookup(hostname, { all: true, verbatim: true }, (error, found) => {
        if (error) reject(error);
        else resolve(found);
      });
    });
    if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
      throw new PageFetchError("private_address");
    }
    return addresses.sort((left, right) => Number(right.family === 4) - Number(left.family === 4));
  } catch (error) {
    if (error instanceof PageFetchError) throw error;
    throw new PageFetchError("dns");
  }
}

function requestPublicHtml(url: URL, addresses: LookupAddress[], timeoutMs: number = DATA_EXPORT_LIMITS.requestTimeoutMs): Promise<PageResponse> {
  return new Promise((resolve, reject) => {
    const pinnedLookup = ((hostname, options, callback) => {
      if (options.all) {
        const ipv4First = [...addresses].sort((left, right) => Number(right.family === 4) - Number(left.family === 4));
        callback(null, ipv4First.map(({ address, family }) => ({ address, family })));
      } else {
        const selected = addresses.find(({ family }) => family === 4) ?? addresses[0]!;
        callback(null, selected.address, selected.family);
      }
    }) as LookupFunction;
    const request = httpsRequest({
      protocol: "https:",
      hostname: url.hostname,
      port: 443,
      path: `${url.pathname}${url.search}`,
      method: "GET",
      headers: {
        "user-agent": "MaximeGPT-PageExport/1.0",
        accept: "text/html,application/xhtml+xml",
        "accept-encoding": "identity",
      },
      lookup: pinnedLookup,
      timeout: timeoutMs,
      maxHeaderSize: 64 * 1024,
    }, (response) => {
      const status = response.statusCode ?? 0;
      const location = response.headers.location;
      const contentType = response.headers["content-type"];
      const contentEncoding = response.headers["content-encoding"];
      if (isRedirect(status)) {
        response.destroy();
        finish({
          status,
          location: Array.isArray(location) ? location[0] : location,
          contentType: Array.isArray(contentType) ? contentType[0] : contentType,
          contentEncoding: Array.isArray(contentEncoding) ? contentEncoding[0] : contentEncoding,
          body: Buffer.alloc(0),
        });
        return;
      }

      const declaredLength = Number(response.headers["content-length"] ?? 0);
      if (Number.isFinite(declaredLength) && declaredLength > DATA_EXPORT_LIMITS.maxHtmlBytes) {
        request.destroy(new PageFetchError("too_large"));
        return;
      }
      const chunks: Buffer[] = [];
      let bytes = 0;
      response.on("data", (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += buffer.length;
        if (bytes > DATA_EXPORT_LIMITS.maxHtmlBytes) {
          request.destroy(new PageFetchError("too_large"));
          return;
        }
        chunks.push(buffer);
      });
      response.on("end", () => finish({
        status,
        location: Array.isArray(location) ? location[0] : location,
        contentType: Array.isArray(contentType) ? contentType[0] : contentType,
        contentEncoding: Array.isArray(contentEncoding) ? contentEncoding[0] : contentEncoding,
        body: Buffer.concat(chunks),
      }));
      response.on("error", fail);
    });
    const timer = setTimeout(() => request.destroy(new PageFetchError("timeout")), timeoutMs);
    const finish = (response: PageResponse) => {
      clearTimeout(timer);
      resolve(response);
    };
    const fail = (error: Error) => {
      clearTimeout(timer);
      reject(error instanceof PageFetchError ? error : new PageFetchError("http"));
    };
    request.on("timeout", () => request.destroy(new PageFetchError("timeout")));
    request.on("error", fail);
    request.end();
  });
}

function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new PageFetchError("timeout")), timeoutMs);
    operation.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error: unknown) => { clearTimeout(timer); reject(error); },
    );
  });
}

export function createPublicPageFetcher(dependencies: PublicPageFetcherDependencies = {}) {
  const resolveHost = dependencies.resolveHost ?? resolvePublicHost;
  const requestPage = dependencies.requestPage ?? requestPublicHtml;
  const now = dependencies.now ?? (() => new Date());

  return async function fetchPublicPage(input: string): Promise<PublicPageSnapshot> {
    let url = validatePublicHttpsUrl(input);
    const startedAt = Date.now();
    for (let redirectCount = 0; redirectCount <= DATA_EXPORT_LIMITS.maxRedirects; redirectCount += 1) {
      const remainingMs = DATA_EXPORT_LIMITS.maxFetchDurationMs - (Date.now() - startedAt);
      if (remainingMs <= 0) throw new PageFetchError("timeout");
      const addresses = await withTimeout(
        resolveHost(url.hostname.replace(/^\[|\]$/g, "")),
        Math.min(remainingMs, DATA_EXPORT_LIMITS.requestTimeoutMs),
      );
      if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
        throw new PageFetchError("private_address");
      }
      const requestBudget = Math.min(
        DATA_EXPORT_LIMITS.requestTimeoutMs,
        DATA_EXPORT_LIMITS.maxFetchDurationMs - (Date.now() - startedAt),
      );
      if (requestBudget <= 0) throw new PageFetchError("timeout");
      const response = await withTimeout(requestPage(url, addresses, requestBudget), requestBudget);
      if (response.body.length > DATA_EXPORT_LIMITS.maxHtmlBytes) throw new PageFetchError("too_large");

      if (isRedirect(response.status)) {
        if (!response.location || redirectCount === DATA_EXPORT_LIMITS.maxRedirects) {
          throw new PageFetchError("redirect");
        }
        let redirected: URL;
        try {
          redirected = new URL(response.location, url);
        } catch {
          throw new PageFetchError("redirect");
        }
        url = validatePublicHttpsUrl(redirected.toString());
        continue;
      }
      if (response.status < 200 || response.status >= 300) throw new PageFetchError("http");
      if (response.contentEncoding && response.contentEncoding.toLowerCase() !== "identity") {
        throw new PageFetchError("http");
      }
      const contentType = response.contentType?.split(";")[0]?.trim().toLowerCase();
      if (contentType !== "text/html" && contentType !== "application/xhtml+xml") {
        throw new PageFetchError("not_html");
      }

      const html = response.body.toString("utf8");
      const dom = new JSDOM(html);
      const title = cleanText((dom.window.document as unknown as HtmlDocument).title || url.hostname, 160);
      dom.window.close();
      return { url: url.toString(), title, html, retrievedAt: now() };
    }
    throw new PageFetchError("redirect");
  };
}

export const fetchPublicPage = createPublicPageFetcher();

export function cleanText(value: string, maxLength: number = DATA_EXPORT_LIMITS.maxCellCharacters): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
