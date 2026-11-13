import { Unzip, UnzipInflate } from "fflate";

const NAGER_BASE_URL = "https://date.nager.at/api/v3";
const UK_BANK_HOLIDAYS_URL = "https://www.gov.uk/bank-holidays.json";
const ASSEMBLY_CATALOGUE_URL = "https://data.assemblee-nationale.fr/travaux-parlementaires/votes";
const ASSEMBLY_HOST = "https://data.assemblee-nationale.fr";
const ASSEMBLY_REFRESH_MS = 12 * 60 * 60 * 1_000;
const HOLIDAY_COUNTRIES_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
const HOLIDAY_CALENDAR_TTL_MS = 12 * 60 * 60 * 1_000;
const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
const MAX_ARCHIVE_EXPANDED_BYTES = 300 * 1024 * 1024;
const MAX_ARCHIVE_ENTRY_BYTES = 2 * 1024 * 1024;
const MAX_UNZIP_PUSH_BYTES = 64 * 1024;

export type CivicLanguage = "en" | "fr" | "es" | "de" | "pt" | "it" | "ja" | "nl" | "ru" | "pl" | "tr";
export type CivicFetch = typeof fetch;

export class CivicSourceError extends Error {
  constructor(
    message: string,
    readonly reason: "unavailable" | "unsupported" | "credentials" = "unavailable",
  ) {
    super(message);
    this.name = "CivicSourceError";
  }
}

export interface HolidayCountry {
  countryCode: string;
  name: string;
}

export interface PublicHoliday {
  date: string;
  name: string;
  localName?: string;
  global: boolean;
  counties?: string[] | null;
  types?: string[];
  region?: string;
}

export interface HolidayCalendar {
  countryCode: string;
  year: number;
  holidays: PublicHoliday[];
  source: "Nager.Date" | "GOV.UK";
  sourceUrl: string;
  fetchedAt: number;
}

export interface AssemblyVote {
  uid: string;
  number: string;
  legislature: string;
  date: string;
  kind: string;
  title: string;
  result: string;
  forCount?: number;
  againstCount?: number;
  abstentionCount?: number;
}

export interface AssemblyVoteSearch {
  votes: AssemblyVote[];
  sourceUrl: string;
  fetchedAt: number;
  stale: boolean;
}

export interface LegifranceCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export interface LegifranceArticle {
  codeTitle: string;
  articleNumber: string;
  text: string;
  state: string;
  versionStart?: string;
  versionEnd?: string;
  officialUrl: string;
}

export interface LegifranceSearchResult {
  title: string;
  state?: string;
  date?: string;
  excerpt?: string;
  officialUrl?: string;
}

interface TimedValue<T> {
  value: T;
  fetchedAt: number;
}

let countryListCache: TimedValue<HolidayCountry[]> | undefined;
const holidayCalendarCache = new Map<string, TimedValue<HolidayCalendar>>();
interface AssemblyVotesCache extends TimedValue<AssemblyVote[]> {
  sourceUrl: string;
}
let assemblyVotesCache: AssemblyVotesCache | undefined;
let assemblyVotesRefresh: Promise<AssemblyVotesCache> | undefined;
let legifranceTokenCache: { token: string; expiresAt: number } | undefined;
let legifranceTokenRefresh: Promise<string> | undefined;

function parseJsonResponse<T>(text: string, url: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new CivicSourceError(`The public data provider returned invalid JSON for ${url}.`);
  }
}

async function fetchJson<T>(
  url: string,
  fetcher: CivicFetch,
  timeoutMs = 12_000,
): Promise<T> {
  let response: Response;
  try {
    response = await fetcher(url, {
      headers: { accept: "application/json", "user-agent": "MaximeGPT civic information/1.0" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new CivicSourceError(`The public data provider could not be reached: ${url}`);
  }
  if (!response.ok) {
    throw new CivicSourceError(
      `The public data provider returned HTTP ${response.status}: ${url}`,
      response.status === 404 && /\/PublicHolidays\//.test(url) ? "unsupported" : "unavailable",
    );
  }
  const text = await response.text();
  if (text.length > 2_000_000) {
    throw new CivicSourceError(`The public data provider returned an oversized response: ${url}`);
  }
  return parseJsonResponse<T>(text, url);
}

export async function getHolidayCountries(
  fetcher: CivicFetch = fetch,
  now = Date.now(),
): Promise<HolidayCountry[]> {
  if (countryListCache && now - countryListCache.fetchedAt < HOLIDAY_COUNTRIES_TTL_MS) {
    return countryListCache.value;
  }
  const countries = await fetchJson<unknown>(`${NAGER_BASE_URL}/AvailableCountries`, fetcher);
  if (!Array.isArray(countries)) {
    throw new CivicSourceError("The public holiday country catalogue has an unexpected format.");
  }
  const validated = countries.flatMap((entry): HolidayCountry[] => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    if (typeof row.countryCode !== "string" || !/^[A-Z]{2}$/.test(row.countryCode) ||
      typeof row.name !== "string" || !row.name.trim()) return [];
    return [{ countryCode: row.countryCode, name: row.name.trim() }];
  });
  if (!validated.length) {
    throw new CivicSourceError("The public holiday country catalogue contained no usable countries.");
  }
  countryListCache = { value: validated, fetchedAt: now };
  return validated;
}

function normalizePlace(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
    .replace(/[’']/g, " ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

const COUNTRY_ALIASES: Record<string, string> = {
  "angleterre": "GB",
  "royaume uni": "GB",
  "royaume uni de grande bretagne et d irlande du nord": "GB",
  "england": "GB",
  "uk": "GB",
  "great britain": "GB",
  "etats unis": "US",
  "etats unis d amerique": "US",
  "usa": "US",
  "coree du sud": "KR",
  "coree": "KR",
  "pays bas": "NL",
  "tchequie": "CZ",
  "republique tcheque": "CZ",
  "russie": "RU",
  "bresil": "BR",
  "vietnam": "VN",
  "birmanie": "MM",
  "taiwan": "TW",
};

export async function resolveHolidayCountry(
  input: string,
  language: CivicLanguage,
  fetcher: CivicFetch = fetch,
): Promise<HolidayCountry[]> {
  const term = normalizePlace(input);
  if (!term) return [];
  const countries = await getHolidayCountries(fetcher);
  const aliasCode = COUNTRY_ALIASES[term];
  const locale = language === "en" ? "en-GB" : language;
  let displayNames: Intl.DisplayNames | undefined;
  try {
    displayNames = new Intl.DisplayNames([locale], { type: "region" });
  } catch {
    displayNames = new Intl.DisplayNames(["en"], { type: "region" });
  }
  return countries.filter((country) => {
    const names = [country.name, country.countryCode, displayNames?.of(country.countryCode) ?? ""];
    return country.countryCode === aliasCode || names.some((name) => normalizePlace(name) === term);
  });
}

function validateHolidayRows(value: unknown, countryCode: string, year: number): PublicHoliday[] {
  if (!Array.isArray(value)) throw new CivicSourceError("The public holiday provider returned an unexpected format.");
  return value.flatMap((entry): PublicHoliday[] => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const date = typeof row.date === "string" ? row.date : "";
    const entryCode = typeof row.countryCode === "string" ? row.countryCode : countryCode;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number(date.slice(0, 4)) !== year ||
      entryCode !== countryCode || !name) return [];
    return [{
      date,
      name,
      ...(typeof row.localName === "string" && row.localName.trim() ? { localName: row.localName.trim() } : {}),
      global: row.global === true,
      ...(Array.isArray(row.counties) ? { counties: row.counties.filter((code): code is string => typeof code === "string") } : {}),
      ...(Array.isArray(row.types) ? { types: row.types.filter((type): type is string => typeof type === "string") } : {}),
    }];
  });
}

interface GovUkRegion {
  division?: string;
  events?: Array<{ title?: string; date?: string; notes?: string; bunting?: boolean }>;
}

async function getUkBankHolidays(year: number, fetcher: CivicFetch, now: number): Promise<HolidayCalendar> {
  const data = await fetchJson<unknown>(UK_BANK_HOLIDAYS_URL, fetcher);
  if (!data || typeof data !== "object") throw new CivicSourceError("GOV.UK returned an unexpected bank-holiday format.");
  const regions = data as Record<string, GovUkRegion>;
  const titles: Record<string, string> = {
    "england-and-wales": "England and Wales",
    scotland: "Scotland",
    "northern-ireland": "Northern Ireland",
  };
  const holidays: PublicHoliday[] = [];
  for (const key of Object.keys(titles)) {
    const events = regions[key]?.events;
    if (!Array.isArray(events)) continue;
    for (const event of events) {
      if (typeof event.date !== "string" || Number(event.date.slice(0, 4)) !== year ||
        typeof event.title !== "string" || !event.title.trim()) continue;
      holidays.push({
        date: event.date,
        name: event.title.trim(),
        localName: event.title.trim(),
        global: false,
        region: titles[key],
      });
    }
  }
  if (!holidays.length) {
    throw new CivicSourceError(`GOV.UK has no published bank-holiday dates for ${year}.`, "unsupported");
  }
  return {
    countryCode: "GB",
    year,
    holidays: holidays.sort((a, b) => a.date.localeCompare(b.date) || (a.region ?? "").localeCompare(b.region ?? "")),
    source: "GOV.UK",
    sourceUrl: UK_BANK_HOLIDAYS_URL,
    fetchedAt: now,
  };
}

export async function getPublicHolidayCalendar(
  countryCode: string,
  year: number,
  fetcher: CivicFetch = fetch,
  now = Date.now(),
): Promise<HolidayCalendar> {
  if (!/^[A-Z]{2}$/.test(countryCode) || !Number.isInteger(year) || year < 1900 || year > 2100) {
    throw new CivicSourceError("A valid two-letter country code and year from 1900 to 2100 are required.", "unsupported");
  }
  const key = `${countryCode}:${year}`;
  const existing = holidayCalendarCache.get(key);
  if (existing && now - existing.fetchedAt < HOLIDAY_CALENDAR_TTL_MS) return existing.value;

  const countries = await getHolidayCountries(fetcher, now);
  if (!countries.some((country) => country.countryCode === countryCode)) {
    throw new CivicSourceError(`No verified public-holiday dataset is listed for ${countryCode}.`, "unsupported");
  }
  const calendar = countryCode === "GB"
    ? await getUkBankHolidays(year, fetcher, now)
    : await (async () => {
      const sourceUrl = `${NAGER_BASE_URL}/PublicHolidays/${year}/${countryCode}`;
      const rows = await fetchJson<unknown>(sourceUrl, fetcher);
      const holidays = validateHolidayRows(rows, countryCode, year);
      if (!holidays.length) {
        throw new CivicSourceError(`No public-holiday records were returned for ${countryCode} in ${year}.`, "unsupported");
      }
      return {
        countryCode,
        year,
        holidays: holidays.sort((a, b) => a.date.localeCompare(b.date)),
        source: "Nager.Date" as const,
        sourceUrl,
        fetchedAt: now,
      };
    })();
  holidayCalendarCache.set(key, { value: calendar, fetchedAt: now });
  return calendar;
}

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    if (typeof row["#text"] === "string") return row["#text"];
    if (typeof row.value === "string") return row.value;
  }
  return "";
}

function asCount(value: unknown): number | undefined {
  const parsed = Number(asText(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function extractAssemblyVote(document: unknown, defaultLegislature: string): AssemblyVote | undefined {
  if (!document || typeof document !== "object") return undefined;
  const root = document as Record<string, unknown>;
  const scrutin = (root.scrutin && typeof root.scrutin === "object" ? root.scrutin : root) as Record<string, unknown>;
  const uid = asText(scrutin.uid);
  const date = asText(scrutin.dateScrutin);
  const number = asText(scrutin.numero);
  const title = asText(scrutin.titre) || asText((scrutin.objet as Record<string, unknown> | undefined)?.libelle);
  if (!uid || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !number || !title) return undefined;
  const typeVote = scrutin.typeVote as Record<string, unknown> | undefined;
  const sort = scrutin.sort as Record<string, unknown> | undefined;
  const synthese = scrutin.syntheseVote as Record<string, unknown> | undefined;
  const decompte = synthese?.decompte as Record<string, unknown> | undefined;
  return {
    uid,
    number,
    legislature: asText(scrutin.legislature) || defaultLegislature,
    date,
    kind: asText(typeVote?.libelleTypeVote),
    title,
    result: asText(sort?.code) || asText(sort?.libelle),
    forCount: asCount(decompte?.pour),
    againstCount: asCount(decompte?.contre),
    abstentionCount: asCount(decompte?.abstentions),
  };
}

async function discoverAssemblyArchive(fetcher: CivicFetch): Promise<{ url: string; legislature: string }> {
  let response: Response;
  try {
    response = await fetcher(ASSEMBLY_CATALOGUE_URL, {
      headers: { accept: "text/html", "user-agent": "MaximeGPT civic information/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new CivicSourceError("The official Assembly vote catalogue could not be reached.");
  }
  if (!response.ok) throw new CivicSourceError(`The official Assembly catalogue returned HTTP ${response.status}.`);
  if (new URL(response.url || ASSEMBLY_CATALOGUE_URL).hostname !== "data.assemblee-nationale.fr") {
    throw new CivicSourceError("The official Assembly catalogue redirected to an unexpected host.");
  }
  const html = await response.text();
  if (html.length > 2_000_000) throw new CivicSourceError("The official Assembly catalogue exceeded the response safety limit.");
  const matches = [...html.matchAll(/href=["']([^"']*\/static\/openData\/repository\/(\d+)\/loi\/scrutins\/Scrutins\.json\.zip)["']/gi)];
  const latest = matches
    .map((match) => ({ href: match[1]!, legislature: match[2]! }))
    .sort((a, b) => Number(b.legislature) - Number(a.legislature))[0];
  if (!latest || !/^\d{1,2}$/.test(latest.legislature)) {
    throw new CivicSourceError("The official Assembly catalogue did not list a current JSON vote archive.");
  }
  let url: URL;
  try {
    url = new URL(latest.href, ASSEMBLY_HOST);
  } catch {
    throw new CivicSourceError("The official Assembly catalogue contained an invalid archive link.");
  }
  if (url.hostname !== "data.assemblee-nationale.fr" || url.protocol !== "https:") {
    throw new CivicSourceError("The official Assembly catalogue contained an unexpected archive host.");
  }
  return { url: url.toString(), legislature: latest.legislature };
}

async function loadAssemblyVotes(fetcher: CivicFetch): Promise<AssemblyVotesCache> {
  const archive = await discoverAssemblyArchive(fetcher);
  let response: Response;
  try {
    response = await fetcher(archive.url, {
      headers: { accept: "application/zip", "user-agent": "MaximeGPT civic information/1.0" },
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new CivicSourceError("The official Assembly vote archive could not be reached.");
  }
  if (!response.ok) throw new CivicSourceError(`The official Assembly archive returned HTTP ${response.status}.`);
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_ARCHIVE_BYTES) {
    throw new CivicSourceError("The official Assembly archive exceeded the download safety limit.");
  }
  if (!response.body) throw new CivicSourceError("The official Assembly archive has no readable response body.");

  const unzip = new Unzip();
  unzip.register(UnzipInflate);
  const votes: AssemblyVote[] = [];
  let expandedBytes = 0;
  let archiveError: Error | undefined;
  unzip.onfile = (file) => {
    if (!file.name.startsWith("json/") || !file.name.endsWith(".json")) return;
    if (typeof file.originalSize === "number" && file.originalSize > MAX_ARCHIVE_ENTRY_BYTES) return;
    const chunks: Uint8Array[] = [];
    let entryBytes = 0;
    file.ondata = (error, chunk, final) => {
      if (error) {
        archiveError = new CivicSourceError("An official Assembly vote record could not be decompressed.");
        return;
      }
      entryBytes += chunk.length;
      expandedBytes += chunk.length;
      if (entryBytes > MAX_ARCHIVE_ENTRY_BYTES || expandedBytes > MAX_ARCHIVE_EXPANDED_BYTES) {
        archiveError = new CivicSourceError("The official Assembly archive exceeded the decompression safety limit.");
        return;
      }
      chunks.push(chunk);
      if (!final) return;
      try {
        const document = JSON.parse(Buffer.concat(chunks.map((part) => Buffer.from(part)), entryBytes).toString("utf8"));
        const vote = extractAssemblyVote(document, archive.legislature);
        if (vote) votes.push(vote);
      } catch {
        archiveError = new CivicSourceError("An official Assembly vote record was malformed.");
      }
    };
    file.start();
  };

  const reader = response.body.getReader();
  let downloadedBytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      downloadedBytes += value.length;
      if (downloadedBytes > MAX_ARCHIVE_BYTES) {
        await reader.cancel();
        throw new CivicSourceError("The official Assembly archive exceeded the download safety limit.");
      }
      for (let offset = 0; offset < value.length; offset += MAX_UNZIP_PUSH_BYTES) {
        unzip.push(value.subarray(offset, Math.min(offset + MAX_UNZIP_PUSH_BYTES, value.length)), false);
        if (archiveError) throw archiveError;
      }
    }
    unzip.push(new Uint8Array(), true);
  } catch (error) {
    if (error instanceof CivicSourceError) throw error;
    throw new CivicSourceError("The official Assembly vote archive could not be read completely.");
  } finally {
    reader.releaseLock();
  }
  if (archiveError) throw archiveError;
  if (votes.length < 500) {
    throw new CivicSourceError("The official Assembly archive did not contain enough complete vote records.");
  }
  return {
    value: votes.sort((a, b) => b.date.localeCompare(a.date) || Number(b.number) - Number(a.number)),
    sourceUrl: archive.url,
    fetchedAt: Date.now(),
  };
}

async function refreshAssemblyVotes(fetcher: CivicFetch): Promise<AssemblyVotesCache> {
  if (assemblyVotesRefresh) return assemblyVotesRefresh;
  assemblyVotesRefresh = loadAssemblyVotes(fetcher)
    .then((loaded) => {
      assemblyVotesCache = loaded;
      return loaded;
    })
    .finally(() => {
      assemblyVotesRefresh = undefined;
    });
  return assemblyVotesRefresh;
}

function normalizeVoteSearch(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
    .replace(/[’']/g, " ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

const VOTE_SEARCH_STOP_WORDS = new Set([
  "a", "au", "aux", "avec", "de", "des", "du", "en", "et", "la", "le", "les", "l",
  "pour", "sur", "un", "une", "dans", "qui", "quoi", "vote", "votes", "scrutin", "scrutins",
  "assemblee", "nationale", "the", "a", "an", "and", "for", "in", "of", "on", "the", "to",
  "about", "what", "when", "how", "voted",
]);
const VOTE_SEARCH_SYNONYMS: Record<string, string[]> = {
  budget: ["budget", "finances", "financier"],
  impots: ["impots", "impot", "fiscalite", "taxe"],
  election: ["election", "elections", "electoral"],
  retraites: ["retraites", "retraite", "pension"],
};

export async function searchAssemblyVotes(
  query: string,
  fetcher: CivicFetch = fetch,
  now = Date.now(),
): Promise<AssemblyVoteSearch> {
  let stale = false;
  let records: AssemblyVote[];
  if (!assemblyVotesCache) {
    records = (await refreshAssemblyVotes(fetcher)).value;
  } else {
    records = assemblyVotesCache.value;
    if (now - assemblyVotesCache.fetchedAt >= ASSEMBLY_REFRESH_MS) {
      stale = true;
      void refreshAssemblyVotes(fetcher).catch(() => undefined);
    }
  }
  const normalizedQuery = normalizeVoteSearch(query);
  const terms = normalizedQuery.split(" ").filter((term) => term && !VOTE_SEARCH_STOP_WORDS.has(term));
  const filtered = terms.length
    ? records.filter((vote) => {
      const text = normalizeVoteSearch(`${vote.title} ${vote.result} ${vote.kind} ${vote.number} ${vote.date}`);
      return terms.every((term) => (VOTE_SEARCH_SYNONYMS[term] ?? [term]).some((variant) => text.includes(variant)));
    })
    : records;
  return {
    votes: filtered.slice(0, 5),
    sourceUrl: assemblyVotesCache?.sourceUrl ?? ASSEMBLY_CATALOGUE_URL,
    fetchedAt: assemblyVotesCache?.fetchedAt ?? now,
    stale,
  };
}

export async function prewarmAssemblyVoteIndex(fetcher: CivicFetch = fetch): Promise<void> {
  if (assemblyVotesCache && Date.now() - assemblyVotesCache.fetchedAt < ASSEMBLY_REFRESH_MS) return;
  await refreshAssemblyVotes(fetcher);
}

function decodeHtmlText(value: string): string {
  return value.replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li)>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, number: string) => String.fromCodePoint(Number(number)))
    .replace(/&#x([0-9a-f]+);/gi, (_, number: string) => String.fromCodePoint(Number.parseInt(number, 16)))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function getLegifranceToken(
  credentials: LegifranceCredentials,
  fetcher: CivicFetch,
): Promise<string> {
  const now = Date.now();
  if (legifranceTokenCache && legifranceTokenCache.expiresAt > now + 30_000) return legifranceTokenCache.token;
  if (legifranceTokenRefresh) return legifranceTokenRefresh;
  legifranceTokenRefresh = (async () => {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: credentials.refreshToken,
    });
    let response: Response;
    try {
      response = await fetcher("https://oauth.piste.gouv.fr/api/oauth/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
        body,
        signal: AbortSignal.timeout(12_000),
      });
    } catch {
      throw new CivicSourceError("The official Legifrance authentication service could not be reached.");
    }
    if (!response.ok) throw new CivicSourceError(`Legifrance authentication returned HTTP ${response.status}.`);
    const token = await response.json() as { access_token?: unknown; expires_in?: unknown };
    if (typeof token.access_token !== "string" || !token.access_token) {
      throw new CivicSourceError("The official Legifrance authentication response did not include an access token.");
    }
    const lifetime = typeof token.expires_in === "number" && token.expires_in > 0 ? token.expires_in : 300;
    legifranceTokenCache = { token: token.access_token, expiresAt: Date.now() + lifetime * 1_000 };
    return token.access_token;
  })().finally(() => {
    legifranceTokenRefresh = undefined;
  });
  return legifranceTokenRefresh;
}

async function callLegifrance<T>(
  path: string,
  payload: unknown,
  credentials: LegifranceCredentials,
  fetcher: CivicFetch,
): Promise<T> {
  const token = await getLegifranceToken(credentials, fetcher);
  let response: Response;
  try {
    response = await fetcher(`https://api.piste.gouv.fr/dila/legifrance/lf-engine-app/${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new CivicSourceError("The official Legifrance API could not be reached.");
  }
  if (!response.ok) throw new CivicSourceError(`The official Legifrance API returned HTTP ${response.status}.`);
  return response.json() as Promise<T>;
}

function buildLegifranceSearchPayload(query: string, typeChamp: "ALL" | "TITLE" = "ALL"): unknown {
  return {
    fond: "CODE_DATE",
    recherche: {
      champs: [{
        typeChamp,
        operateur: "ET",
        criteres: [{ valeur: query, typeRecherche: typeChamp === "TITLE" ? "EXACTE" : "TOUS_LES_MOTS_DANS_UN_CHAMP", operateur: "ET" }],
      }],
      operateur: "ET",
      pageNumber: 1,
      pageSize: 5,
      sort: "PERTINENCE",
      typePagination: "DEFAUT",
    },
  };
}

function toLegifranceDate(value: unknown): string | undefined {
  const text = asText(value);
  if (!text) return undefined;
  const numeric = Number(text);
  const date = Number.isFinite(numeric) && numeric > 10_000_000_000
    ? new Date(numeric)
    : /^\d{4}-\d{2}-\d{2}/.test(text) ? new Date(`${text.slice(0, 10)}T12:00:00Z`) : undefined;
  if (!date || Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

export async function getLegifranceArticle(
  articleNumber: string,
  codeName: string,
  credentials: LegifranceCredentials,
  fetcher: CivicFetch = fetch,
): Promise<LegifranceArticle> {
  const cleanNumber = articleNumber.trim().replace(/^article\s+/i, "");
  if (!/^[\p{L}\d][\p{L}\d.-]{0,24}$/u.test(cleanNumber)) {
    throw new CivicSourceError("The requested article number is not valid.", "unsupported");
  }
  const codeQuery = codeName.trim() || "Code civil";
  const codeId = normalizePlace(codeQuery) === "code civil"
    ? "LEGITEXT000006070721"
    : await (async () => {
      const result = await callLegifrance<{ results?: Array<Record<string, unknown>> }>(
        "search", buildLegifranceSearchPayload(codeQuery, "TITLE"), credentials, fetcher,
      );
      const candidates = Array.isArray(result.results) ? result.results : [];
      for (const candidate of candidates) {
        const titles = Array.isArray(candidate.titles) ? candidate.titles as Array<Record<string, unknown>> : [];
        const exact = titles.find((title) => normalizePlace(asText(title.title)) === normalizePlace(codeQuery));
        const id = asText(exact?.cid) || asText(exact?.id);
        if (/^LEGITEXT\d+$/.test(id)) return id;
      }
      throw new CivicSourceError(`No exact official code title matched "${codeQuery}".`, "unsupported");
    })();
  const response = await callLegifrance<{ article?: Record<string, unknown> }>(
    "consult/getArticleWithIdAndNum",
    { id: codeId, num: cleanNumber },
    credentials,
    fetcher,
  );
  const article = response.article;
  if (!article) throw new CivicSourceError(`Legifrance returned no article ${cleanNumber} for ${codeQuery}.`, "unsupported");
  const text = decodeHtmlText(asText(article.texte) || asText(article.texteHtml));
  if (!text) throw new CivicSourceError("Legifrance returned an article without readable text.");
  const id = asText(article.id) || asText(article.cid);
  const officialUrl = /^LEGIARTI\d+$/.test(id)
    ? `https://www.legifrance.gouv.fr/codes/article_lc/${encodeURIComponent(id)}`
    : `https://www.legifrance.gouv.fr/codes/texte_lc/${encodeURIComponent(codeId)}/`;
  return {
    codeTitle: asText(article.textTitles && Array.isArray(article.textTitles)
      ? (article.textTitles[0] as Record<string, unknown>)?.title
      : "") || codeQuery,
    articleNumber: asText(article.num) || cleanNumber,
    text,
    state: asText(article.etat) || "État non précisé",
    ...(toLegifranceDate(article.dateDebut) ? { versionStart: toLegifranceDate(article.dateDebut) } : {}),
    ...(toLegifranceDate(article.dateFin) ? { versionEnd: toLegifranceDate(article.dateFin) } : {}),
    officialUrl,
  };
}

export async function searchLegifrance(
  query: string,
  credentials: LegifranceCredentials,
  fetcher: CivicFetch = fetch,
): Promise<LegifranceSearchResult[]> {
  const response = await callLegifrance<{ results?: Array<Record<string, unknown>> }>(
    "search", buildLegifranceSearchPayload(query), credentials, fetcher,
  );
  const results = Array.isArray(response.results) ? response.results : [];
  return results.slice(0, 5).flatMap((row): LegifranceSearchResult[] => {
    const titles = Array.isArray(row.titles) ? row.titles as Array<Record<string, unknown>> : [];
    const text = decodeHtmlText(asText(row.text));
    const codeId = asText(titles[0]?.cid) || asText(titles[0]?.id) || asText(row.id);
    const articleId = asText(row.id);
    const officialUrl = /^LEGIARTI\d+$/.test(articleId)
      ? `https://www.legifrance.gouv.fr/codes/article_lc/${encodeURIComponent(articleId)}`
      : /^LEGITEXT\d+$/.test(codeId)
        ? `https://www.legifrance.gouv.fr/codes/texte_lc/${encodeURIComponent(codeId)}/`
        : undefined;
    const title = asText(titles[0]?.title) || asText(row.reference) || asText(row.num) || asText(row.nature);
    if (!title) return [];
    return [{
      title,
      ...(asText(row.etat) ? { state: asText(row.etat) } : {}),
      ...(toLegifranceDate(row.date) ? { date: toLegifranceDate(row.date) } : {}),
      ...(text ? { excerpt: text.slice(0, 1_000) } : {}),
      ...(officialUrl ? { officialUrl } : {}),
    }];
  });
}

export function resetCivicDataCachesForTests(): void {
  countryListCache = undefined;
  holidayCalendarCache.clear();
  assemblyVotesCache = undefined;
  assemblyVotesRefresh = undefined;
  legifranceTokenCache = undefined;
  legifranceTokenRefresh = undefined;
}

export const CIVIC_SOURCES = {
  assemblyVotes: ASSEMBLY_CATALOGUE_URL,
  nagerCountries: `${NAGER_BASE_URL}/AvailableCountries`,
  ukBankHolidays: UK_BANK_HOLIDAYS_URL,
  legifranceApiGuide: "https://piste.gouv.fr/api-catalog-sandbox",
  legifrance: "https://www.legifrance.gouv.fr/",
} as const;
