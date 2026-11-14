import type { WebSearchResult } from "../lib/web-search.js";

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[’']/g, " ").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

const JOB_GEOS: Array<{ geo: string; aliases: string[] }> = [
  { geo: "france", aliases: ["france", "français", "francaise"] },
  { geo: "canada", aliases: ["canada", "quebec", "québec"] },
  { geo: "usa", aliases: ["etats unis", "usa", "united states", "états unis"] },
  { geo: "uk", aliases: ["royaume uni", "angleterre", "united kingdom", "great britain", "uk"] },
  { geo: "germany", aliases: ["allemagne", "germany"] },
];

const JOB_CITIES: Array<{ geo: string; cities: string[] }> = [
  { geo: "france", cities: ["amiens", "beauvais", "paris", "lyon", "marseille", "lille", "bordeaux", "toulouse", "rennes", "nantes", "strasbourg", "orleans", "creteil", "nice", "montpellier", "grenoble"] },
  { geo: "canada", cities: ["montreal", "quebec city", "ville de quebec", "toronto", "vancouver", "ottawa", "calgary"] },
  { geo: "uk", cities: ["london", "londres", "manchester", "birmingham", "leeds", "bristol", "glasgow", "edinburgh"] },
  { geo: "germany", cities: ["berlin", "munich", "munchen", "hamburg", "frankfurt", "cologne", "koln"] },
  { geo: "usa", cities: ["new york", "los angeles", "chicago", "seattle", "austin", "boston"] },
];

function jobCity(text: string): string | undefined {
  const value = normalize(text);
  return JOB_CITIES.flatMap((entry) => entry.cities).find((city) => value.includes(normalize(city)));
}

function jobGeo(text: string): string | undefined {
  const value = normalize(text);
  return JOB_GEOS.find((entry) => entry.aliases.some((alias) => value.includes(normalize(alias))))?.geo
    ?? JOB_CITIES.find((entry) => entry.cities.some((city) => value.includes(normalize(city))))?.geo;
}

function jobRoleTag(text: string): string | undefined {
  const value = normalize(text);
  const roleTags: Array<[RegExp, string]> = [
    [/\b(?:developpeur|developer|developpeuse|software engineer|programm(?:eur|euse))\b/, "developer"],
    [/\b(?:data|donnees|analyste de donnees)\b/, "data"],
    [/\b(?:marketing|communication)\b/, "marketing"],
    [/\b(?:designer|design|graphiste|ux|ui)\b/, "design"],
    [/\b(?:support|assistance|service client)\b/, "support"],
    [/\b(?:commercial|vente|sales)\b/, "sales"],
    [/\b(?:chef de projet|project manager)\b/, "project management"],
  ];
  return roleTags.find(([pattern]) => pattern.test(value))?.[1];
}

function isRemoteRequest(text: string): boolean {
  return /\b(?:remote|teletravail|a distance|from home|work from home|remotely)\b/i.test(normalize(text));
}

function hasLocationMarker(text: string): boolean {
  return /\b(?:a|au|aux|en|dans|near|in|around)\s+[\p{L}][\p{L}\s-]{1,30}/iu.test(normalize(text));
}

function jobRoleTerms(text: string): string[] {
  const normalized = normalize(text);
  const beforePlace = normalized.split(/\b(?:a|au|aux|en|dans|near|in|around)\b/)[0] ?? normalized;
  return beforePlace
    .replace(/\b(?:je|cherche|recherche|trouve|montre|donne|voir|affiche|aide|peux|tu|m|aider|trouver|chercher|can|you|find|show|search|looking|for|help|me|job|jobs|emploi|emplois|offre|offres|d|un|une|des|du|work|vacancy|vacancies|employment|remote|remotely|teletravail|distance|poste|postes|de|the|quel|quelle|quels|quelles|any|some|meilleur|meilleure|recent|recentes|current|actuel|actuelle)\b/g, " ")
    .split(/\s+/).filter((word) => word.length >= 3);
}

export function jobSearchClarification(text: string, language: string): string | null {
  const value = normalize(text);
  if (jobRoleTerms(value).length === 0) {
    return language === "fr"
      ? "Quel métier ou type de poste recherches-tu ? Précise aussi le pays ou la ville, ou indique si le télétravail te convient."
      : "What role are you looking for? Please add a country or city, or say whether remote work is suitable.";
  }
  if (!jobGeo(value) && !isRemoteRequest(value) && !hasLocationMarker(value)) {
    return language === "fr"
      ? "Dans quel pays ou quelle ville veux-tu chercher ? Tu peux aussi préciser si le télétravail te convient."
      : "Which country or city should I search? You can also say whether remote work is suitable.";
  }
  // The first version uses public remote listings. A city without a recognized
  // country cannot safely be treated as a geographic eligibility filter.
  if (!jobGeo(value) && !isRemoteRequest(value) && hasLocationMarker(value)) {
    return language === "fr"
      ? "Je peux chercher des postes à distance, mais je ne peux pas vérifier une ville seule avec ces sources. Quel pays couvre cette ville ?"
      : "These sources can find remote roles, but cannot verify a city by itself. Which country is that city in?";
  }
  return null;
}

interface PublicJob {
  title: string;
  company: string;
  location: string;
  date: string;
  url: string;
  source: "Jobicy" | "Arbeitnow";
  remote: boolean;
}

function safeJob(
  title: unknown, company: unknown, location: unknown, date: unknown, url: unknown,
  source: PublicJob["source"], remote: boolean,
): PublicJob | null {
  if (typeof title !== "string" || !title.trim() ||
      typeof company !== "string" || !company.trim() ||
      typeof location !== "string" || !location.trim() ||
      typeof url !== "string" || !url.startsWith("https://")) return null;
  const parsedDate = typeof date === "number" ? new Date(date * 1_000) : new Date(String(date ?? ""));
  if (Number.isNaN(parsedDate.getTime())) return null;
  return {
    title: title.trim().slice(0, 180),
    company: company.trim().slice(0, 100),
    location: location.trim().slice(0, 100),
    date: parsedDate.toISOString(),
    url,
    source,
    remote,
  };
}

async function fetchJobicy(
  text: string, now: Date, fetcher: typeof fetch,
): Promise<PublicJob[]> {
  const url = new URL("https://jobicy.com/api/v2/remote-jobs");
  url.searchParams.set("count", "20");
  const geo = jobGeo(text);
  const tag = jobRoleTag(text);
  if (geo) url.searchParams.set("geo", geo);
  if (tag) url.searchParams.set("tag", tag);
  const response = await fetcher(url, { signal: AbortSignal.timeout(8_000), headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Jobicy returned HTTP ${response.status}`);
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !Array.isArray((body as { jobs?: unknown }).jobs)) {
    throw new Error("Jobicy returned an invalid job list");
  }
  const jobs = (body as { jobs: Array<Record<string, unknown>> }).jobs;
  const cutoff = now.getTime() - 30 * 86_400_000;
  return jobs.map((job) => safeJob(job.jobTitle, job.companyName, job.jobGeo, job.pubDate, job.url, "Jobicy", true))
    .filter((job): job is PublicJob => !!job && Date.parse(job.date) <= now.getTime() &&
      Date.parse(job.date) >= cutoff);
}

async function fetchArbeitnow(now: Date, fetcher: typeof fetch): Promise<PublicJob[]> {
  const response = await fetcher("https://www.arbeitnow.com/api/job-board-api?page=1", {
    signal: AbortSignal.timeout(8_000), headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Arbeitnow returned HTTP ${response.status}`);
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !Array.isArray((body as { data?: unknown }).data)) {
    throw new Error("Arbeitnow returned an invalid job list");
  }
  const cutoff = now.getTime() - 30 * 86_400_000;
  return (body as { data: Array<Record<string, unknown>> }).data
    .map((job) => safeJob(job.title, job.company_name, job.location, job.created_at, job.url, "Arbeitnow", job.remote === true))
    .filter((job): job is PublicJob => !!job && Date.parse(job.date) <= now.getTime() &&
      Date.parse(job.date) >= cutoff);
}

function roleMatches(job: PublicJob, text: string): boolean {
  const haystack = normalize(`${job.title} ${job.company}`);
  const tag = jobRoleTag(text);
  const synonyms: Record<string, string[]> = {
    developer: ["developer", "software", "engineer", "programmer"],
    data: ["data", "analyst", "scientist"],
    marketing: ["marketing", "communications", "communication"],
    design: ["designer", "design", "graphic", "ux", "ui"],
    support: ["support", "customer", "helpdesk"],
    sales: ["sales", "commercial", "account"],
    "project management": ["project", "program", "manager"],
  };
  const terms = tag ? synonyms[tag] ?? [tag] : jobRoleTerms(text);
  return terms.some((word) => haystack.includes(word));
}

export async function fetchJobEvidence(
  text: string, now = new Date(), fetcher: typeof fetch = fetch,
): Promise<WebSearchResult[]> {
  const geo = jobGeo(text);
  const city = jobCity(text);
  const worknowRequested = geo === "germany";
  const providers = await Promise.allSettled([
    fetchJobicy(text, now, fetcher),
    ...(worknowRequested ? [fetchArbeitnow(now, fetcher)] : []),
  ]);
  const listings = providers.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  if (listings.length === 0 && providers.every((result) => result.status === "rejected")) {
    throw new Error("All job feeds were unavailable");
  }
  const filtered = listings.filter((job) => roleMatches(job, text))
    .filter((job) => job.source !== "Arbeitnow" || !city || job.remote || normalize(job.location).includes(normalize(city)))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .filter((job, index, all) => all.findIndex((other) => other.url === job.url) === index)
    .slice(0, 5);
  return filtered.map((job) => ({
    title: `${job.source} · ${job.title}`,
    url: job.url,
    snippet: `${job.company} · ${job.location} · ${job.remote ? "remote" : "local"} · ${job.date.slice(0, 10)}`,
    publishedAt: job.date,
    qualityScore: 12,
    content: `${job.source} listing. Role: ${job.title}. Employer: ${job.company}. ` +
      `Location stated by the provider: ${job.location}. Work mode: ${job.remote ? "remote" : "not marked remote"}. ` +
      `Listing date: ${job.date}. Original listing: ${job.url}. ` +
      (job.source === "Jobicy"
        ? "Jobicy's feed contains remote jobs only; its geographic filter does not guarantee eligibility in a specific city, so the original posting must be checked."
        : "Arbeitnow is a limited job-board feed, not a complete employment database; check the original posting for availability and eligibility."),
  }));
}

interface FootballLeague {
  slug: string;
  name: string;
  aliases: string[];
  standingsId?: number;
  teams?: Array<{ aliases: string[]; matches: string[] }>;
}

const FOOTBALL_LEAGUES: FootballLeague[] = [
  { slug: "fra.1", name: "Ligue 1", aliases: ["ligue 1", "ligue1", "championnat de france"], standingsId: 4334, teams: [
    { aliases: ["psg", "paris saint germain"], matches: ["paris saint germain", "psg"] },
    { aliases: ["marseille", "om"], matches: ["marseille"] }, { aliases: ["lyon", "ol"], matches: ["lyon"] },
    { aliases: ["monaco"], matches: ["monaco"] }, { aliases: ["lille"], matches: ["lille"] },
    { aliases: ["rennes"], matches: ["rennes"] }, { aliases: ["lens"], matches: ["lens"] },
    { aliases: ["nice"], matches: ["nice"] }, { aliases: ["nantes"], matches: ["nantes"] },
    { aliases: ["strasbourg"], matches: ["strasbourg"] }, { aliases: ["toulouse"], matches: ["toulouse"] },
    { aliases: ["auxerre"], matches: ["auxerre"] }, { aliases: ["montpellier"], matches: ["montpellier"] },
  ] },
  { slug: "fra.2", name: "Ligue 2", aliases: ["ligue 2", "ligue2", "championnat de france de ligue 2"], standingsId: 4401 },
  { slug: "eng.1", name: "Premier League", aliases: ["premier league", "english premier league"], standingsId: 4328, teams: [
    { aliases: ["arsenal"], matches: ["arsenal"] }, { aliases: ["chelsea"], matches: ["chelsea"] },
    { aliases: ["liverpool"], matches: ["liverpool"] }, { aliases: ["manchester city", "man city"], matches: ["manchester city"] },
    { aliases: ["manchester united", "man united", "man utd"], matches: ["manchester united"] },
    { aliases: ["tottenham", "spurs"], matches: ["tottenham"] }, { aliases: ["newcastle"], matches: ["newcastle"] },
    { aliases: ["aston villa"], matches: ["aston villa"] }, { aliases: ["brighton"], matches: ["brighton"] },
    { aliases: ["west ham"], matches: ["west ham"] }, { aliases: ["everton"], matches: ["everton"] },
    { aliases: ["fulham"], matches: ["fulham"] }, { aliases: ["nottingham forest"], matches: ["nottingham forest"] },
  ] },
  { slug: "eng.2", name: "Championship", aliases: ["championship", "efl championship", "english championship"], standingsId: 4329 },
  { slug: "ger.1", name: "Bundesliga", aliases: ["bundesliga", "german bundesliga", "1. bundesliga"], standingsId: 4331, teams: [
    { aliases: ["bayern", "bayern munich"], matches: ["bayern"] },
    { aliases: ["borussia dortmund", "dortmund"], matches: ["borussia dortmund"] },
    { aliases: ["leverkusen"], matches: ["leverkusen"] }, { aliases: ["rb leipzig", "leipzig"], matches: ["leipzig"] },
    { aliases: ["eintracht frankfurt", "frankfurt"], matches: ["frankfurt"] },
  ] },
  { slug: "ger.2", name: "2. Bundesliga", aliases: ["2 bundesliga", "2. bundesliga", "zweite bundesliga"], standingsId: 4399 },
  { slug: "esp.1", name: "LaLiga", aliases: ["la liga", "laliga", "primera division", "spanish la liga"], standingsId: 4335, teams: [
    { aliases: ["real madrid"], matches: ["real madrid"] }, { aliases: ["barcelona", "barca"], matches: ["barcelona"] },
    { aliases: ["atletico madrid", "atletico"], matches: ["atletico madrid"] },
    { aliases: ["athletic bilbao"], matches: ["athletic bilbao"] }, { aliases: ["real sociedad"], matches: ["real sociedad"] },
    { aliases: ["villarreal"], matches: ["villarreal"] }, { aliases: ["valencia"], matches: ["valencia"] },
  ] },
  { slug: "esp.2", name: "Segunda División", aliases: ["segunda division", "segunda", "la liga 2", "laliga 2"] },
  { slug: "ita.1", name: "Serie A", aliases: ["serie a", "italian serie a"], standingsId: 4332, teams: [
    { aliases: ["juventus", "juve"], matches: ["juventus"] }, { aliases: ["inter milan", "inter"], matches: ["inter"] },
    { aliases: ["ac milan", "milan"], matches: ["milan"] }, { aliases: ["napoli"], matches: ["napoli"] },
    { aliases: ["roma"], matches: ["roma"] }, { aliases: ["lazio"], matches: ["lazio"] },
    { aliases: ["atalanta"], matches: ["atalanta"] }, { aliases: ["fiorentina"], matches: ["fiorentina"] },
  ] },
  { slug: "ita.2", name: "Serie B", aliases: ["serie b", "italian serie b"] },
  { slug: "ned.1", name: "Eredivisie", aliases: ["eredivisie", "dutch eredivisie"], standingsId: 4337, teams: [
    { aliases: ["ajax"], matches: ["ajax"] }, { aliases: ["psv eindhoven", "psv"], matches: ["psv"] },
    { aliases: ["feyenoord"], matches: ["feyenoord"] },
  ] },
  { slug: "por.1", name: "Primeira Liga", aliases: ["primeira liga", "portuguese league", "liga portugal"], standingsId: 4344 },
  { slug: "sco.1", name: "Scottish Premiership", aliases: ["scottish premiership", "scottish premier league", "spl"] },
  { slug: "usa.1", name: "MLS", aliases: ["mls", "major league soccer", "major league soccer usa"], standingsId: 4346 },
  { slug: "bra.1", name: "Brasileirão Série A", aliases: ["brasileirao", "brasileirao serie a", "brazilian serie a"] },
  { slug: "arg.1", name: "Primera División Argentina", aliases: ["primera division argentina", "argentine primera division", "liga profesional argentina"] },
  { slug: "uefa.champions", name: "Ligue des champions UEFA", aliases: ["champions league", "ligue des champions", "uefa champions", "uefa champions league"] },
  { slug: "uefa.europa", name: "Ligue Europa UEFA", aliases: ["ligue europa", "europa league", "uefa europa league"] },
  { slug: "uefa.europa.conf", name: "Ligue Conférence UEFA", aliases: ["conference league", "ligue conference", "uefa conference league"] },
  { slug: "uefa.nations", name: "Ligue des nations UEFA", aliases: ["nations league", "ligue des nations", "uefa nations league"] },
  { slug: "fifa.world", name: "Coupe du monde FIFA", aliases: ["coupe du monde", "world cup", "fifa world cup"] },
  { slug: "concacaf.gold", name: "Gold Cup CONCACAF", aliases: ["gold cup", "concacaf gold cup"] },
];

export function isSupportedFootballQuery(text: string): boolean {
  const value = normalize(text);
  return FOOTBALL_LEAGUES.some((league) =>
    league.aliases.some((alias) => value.includes(normalize(alias))) ||
    Boolean(league.teams?.some((team) => team.aliases.some((alias) => value.includes(normalize(alias))))));
}

function isFootballStandingsQuery(text: string): boolean {
  return /\b(?:classement|classements|standings?|league table|tableau|ranking|rankings|tabelle)\b/.test(normalize(text));
}

interface EspnFootballEvent {
  id?: unknown;
  name?: unknown;
  date?: unknown;
  links?: Array<{ href?: unknown }>;
  competitions?: Array<{
    competitors?: Array<{ homeAway?: unknown; score?: unknown; team?: { displayName?: unknown } }>;
    status?: { type?: { state?: unknown; completed?: unknown; detail?: unknown; shortDetail?: unknown } };
  }>;
  status?: { type?: { state?: unknown; completed?: unknown; detail?: unknown; shortDetail?: unknown } };
}

interface EspnScoreboard {
  events?: unknown;
  leagues?: Array<{ calendar?: unknown; name?: unknown }>;
}

interface SportsDbStanding {
  idLeague?: unknown;
  strLeague?: unknown;
  strSeason?: unknown;
  dateUpdated?: unknown;
  intRank?: unknown;
  strTeam?: unknown;
  intPlayed?: unknown;
  intWin?: unknown;
  intDraw?: unknown;
  intLoss?: unknown;
  intGoalsFor?: unknown;
  intGoalsAgainst?: unknown;
  intGoalDifference?: unknown;
  intPoints?: unknown;
}

function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function addUtcDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey.slice(0, 4)}-${dateKey.slice(4, 6)}-${dateKey.slice(6, 8)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateKey(date);
}

function normalizeDateKey(value: string): string | undefined {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}${match[2]}${match[3]}` : undefined;
}

function eventTeamNames(event: EspnFootballEvent): string[] {
  const competitors = event.competitions?.[0]?.competitors;
  return Array.isArray(competitors)
    ? competitors.map((competitor) => competitor.team?.displayName).filter((name): name is string => typeof name === "string")
    : [];
}

function eventEvidence(event: EspnFootballEvent, leagueName: string, checkedAt: string): WebSearchResult | null {
  if (typeof event.date !== "string" || !Array.isArray(event.competitions)) return null;
  const matchAt = new Date(event.date);
  if (Number.isNaN(matchAt.getTime())) return null;
  const competitors = event.competitions[0]?.competitors;
  if (!Array.isArray(competitors) || competitors.length < 2) return null;
  const home = competitors.find((competitor) => competitor.homeAway === "home") ?? competitors[0]!;
  const away = competitors.find((competitor) => competitor.homeAway === "away") ?? competitors[1]!;
  const homeName = home.team?.displayName;
  const awayName = away.team?.displayName;
  if (typeof homeName !== "string" || typeof awayName !== "string") return null;
  const status = event.competitions[0]?.status ?? event.status;
  const state = status?.type?.state;
  const completed = status?.type?.completed === true;
  const homeScore = typeof home.score === "string" && /^\d{1,2}$/.test(home.score) ? Number(home.score) : null;
  const awayScore = typeof away.score === "string" && /^\d{1,2}$/.test(away.score) ? Number(away.score) : null;
  const kickoff = `${matchAt.toISOString().replace("T", " ").slice(0, 16)} UTC`;
  const detail = status?.type?.shortDetail ?? status?.type?.detail;
  const matchUrl = event.links?.find((link) => typeof link.href === "string" &&
    /^https:\/\/www\.espn\.(?:com|co\.uk|fr)\//.test(link.href))?.href;
  const url = typeof matchUrl === "string" ? matchUrl : "https://www.espn.com/soccer/";
  const stateText = completed || state === "post"
    ? homeScore !== null && awayScore !== null
      ? `Final score confirmed by ESPN: ${homeScore}-${awayScore}${detail ? ` (${detail})` : ""}.`
      : "The event is marked finished, but ESPN does not supply a verified final score."
    : state === "in"
      ? homeScore !== null && awayScore !== null
        ? `ESPN lists this match as live at lookup time ${checkedAt}: ${homeScore}-${awayScore}${detail ? ` (${detail})` : ""}.`
        : `ESPN lists this match as live at lookup time ${checkedAt}, but no score is supplied.`
      : state === "pre"
        ? "Scheduled fixture; no live score is asserted."
        : "The source does not confirm whether this event is live or final.";
  return {
    title: `${leagueName} · ${homeName} – ${awayName}`,
    url,
    snippet: `${kickoff} · ${stateText}`,
    qualityScore: 12,
    content: `ESPN schedule/result for ${leagueName}. ${homeName} vs ${awayName}. Kickoff: ${kickoff}. ` +
      `Source status: ${String(state ?? "not specified")}. ${stateText} Checked at: ${checkedAt}. ` +
      "This public ESPN feed does not provide a separate data-update timestamp; competition coverage and score updates may be incomplete.",
  };
}

async function fetchFootballStandingsEvidence(
  league: FootballLeague, now: Date, fetcher: typeof fetch,
): Promise<WebSearchResult[]> {
  if (!league.standingsId) return [];
  const sourceUrl = new URL("https://www.thesportsdb.com/api/v1/json/123/lookuptable.php");
  sourceUrl.searchParams.set("l", String(league.standingsId));
  const response = await fetcher(sourceUrl, {
    signal: AbortSignal.timeout(8_000), headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`TheSportsDB returned HTTP ${response.status}`);
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !Array.isArray((body as { table?: unknown }).table)) {
    throw new Error("TheSportsDB returned an invalid standings table");
  }
  const table = (body as { table: SportsDbStanding[] }).table;
  const rows = table.filter((row) =>
    row && String(row.idLeague) === String(league.standingsId) &&
    typeof row.strTeam === "string" && row.strTeam.trim() &&
    Number.isInteger(Number(row.intRank)) && Number(row.intRank) > 0 &&
    Number.isFinite(Number(row.intPoints)) && Number.isFinite(Number(row.intPlayed)));
  if (rows.length === 0) return [];
  const first = rows[0]!;
  const sourceLeague = typeof first.strLeague === "string" ? first.strLeague : league.name;
  const season = typeof first.strSeason === "string" ? first.strSeason : "season not specified";
  const sourceUpdated = typeof first.dateUpdated === "string" && !Number.isNaN(Date.parse(first.dateUpdated))
    ? first.dateUpdated : "not supplied";
  const lines = rows.slice(0, 10).map((row) =>
    `${row.intRank}. ${row.strTeam} — ${row.intPoints} points, ${row.intPlayed} played ` +
    `(${row.intWin ?? "?"}W ${row.intDraw ?? "?"}D ${row.intLoss ?? "?"}L; ` +
    `${row.intGoalsFor ?? "?"} goals for, ${row.intGoalsAgainst ?? "?"} against, GD ${row.intGoalDifference ?? "?"})`);
  return [{
    title: `${sourceLeague} · standings`,
    url: sourceUrl.toString(),
    snippet: `${season} · source updated ${sourceUpdated} · checked ${now.toISOString()}`,
    publishedAt: Number.isNaN(Date.parse(sourceUpdated)) ? undefined : new Date(sourceUpdated).toISOString(),
    qualityScore: 12,
    content: `Public ${sourceLeague} league table from TheSportsDB. Season: ${season}. ` +
      `The source's update date is ${sourceUpdated}; this lookup was made at ${now.toISOString()}. ` +
      `Top ten positions supplied by the source:\n${lines.join("\n")}\n` +
      `Competition data page: ${sourceUrl.toString()}. This is a partial source view, not a guarantee that all competitions or divisions are covered.`,
  }];
}

export async function fetchFootballEvidence(
  text: string, now = new Date(), fetcher: typeof fetch = fetch,
): Promise<WebSearchResult[] | null> {
  const value = normalize(text);
  const league = FOOTBALL_LEAGUES.find((item) => item.aliases.some((alias) => value.includes(normalize(alias))))
    ?? FOOTBALL_LEAGUES.find((item) => item.teams?.some((team) => team.aliases.some((alias) => value.includes(normalize(alias)))));
  if (!league) return null;
  if (isFootballStandingsQuery(text)) return fetchFootballStandingsEvidence(league, now, fetcher);
  const endpoint = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.slug}/scoreboard`;
  const currentKey = utcDateKey(now);
  const baseUrl = new URL(endpoint);
  baseUrl.searchParams.set("dates", currentKey);
  const baseResponse = await fetcher(baseUrl, { signal: AbortSignal.timeout(8_000), headers: { accept: "application/json" } });
  if (!baseResponse.ok) throw new Error(`ESPN returned HTTP ${baseResponse.status}`);
  const base: unknown = await baseResponse.json();
  if (!base || typeof base !== "object") throw new Error("ESPN returned an invalid scoreboard");
  const scoreboard = base as EspnScoreboard;
  const calendar = Array.isArray(scoreboard.leagues?.[0]?.calendar)
    ? scoreboard.leagues![0]!.calendar.filter((date): date is string => typeof date === "string")
      .map(normalizeDateKey).filter((date): date is string => !!date)
    : [];
  const team = league.teams?.find((candidate) => candidate.aliases.some((alias) => value.includes(normalize(alias))));
  const exactDay = /\b(?:aujourd hui|today|ce soir|tonight|en direct|live)\b/.test(value)
    ? currentKey
    : /\b(?:demain|tomorrow)\b/.test(value) ? addUtcDays(currentKey, 1) : undefined;
  const wantsUpcoming = /\b(?:prochain|prochaine|next|upcoming|quand|when|calendrier|fixture|horaire)\b/.test(value);
  const isLiveRequest = /\b(?:en direct|live|maintenant|now)\b/.test(value);
  const selectedDays = exactDay
    ? [exactDay]
    : wantsUpcoming
      ? [...new Set(calendar.filter((date) => date >= currentKey))].slice(0, team ? 4 : 3)
      : isLiveRequest
        ? [currentKey]
        : [...new Set(calendar.filter((date) => date <= currentKey))].reverse().slice(0, team ? 5 : 3);
  if (selectedDays.length === 0) selectedDays.push(currentKey);
  const checkedAt = now.toISOString();
  const responses = await Promise.all(selectedDays.map(async (date) => {
    if (date === currentKey && Array.isArray(scoreboard.events)) return scoreboard.events;
    const url = new URL(endpoint);
    url.searchParams.set("dates", date);
    const response = await fetcher(url, { signal: AbortSignal.timeout(8_000), headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`ESPN returned HTTP ${response.status}`);
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || !Array.isArray((body as EspnScoreboard).events)) {
      throw new Error("ESPN returned an invalid event list");
    }
    return (body as EspnScoreboard).events;
  }));
  const events = responses.flat().filter((event): event is EspnFootballEvent =>
    !!event && typeof event === "object" && typeof (event as EspnFootballEvent).date === "string")
    .filter((event) => {
      const date = normalizeDateKey(String(event.date));
      const at = Date.parse(String(event.date));
      return !!date && selectedDays.includes(date) && Number.isFinite(at) &&
        at >= now.getTime() - 7 * 86_400_000 && at <= now.getTime() + 30 * 86_400_000 &&
        (!wantsUpcoming || at >= now.getTime());
    });
  const matches = events.filter((event) => {
    if (!team) return true;
    const names = eventTeamNames(event).map(normalize);
    return names.some((name) => team.matches.some((term) => name.includes(normalize(term))));
  }).map((event) => eventEvidence(event, league.name, checkedAt))
    .filter((result): result is WebSearchResult => !!result);
  return matches.slice(0, team ? 5 : 6);
}

export function noFootballEvidenceReply(language: string, text = ""): string {
  if (isFootballStandingsQuery(text)) {
    return language === "fr"
      ? "Je n’ai pas trouvé de classement vérifiable pour cette compétition dans les sources publiques disponibles. La couverture des divisions est partielle; vérifie la page officielle de la ligue."
      : "I couldn't verify a standings table for this competition in the available public sources. Division coverage is partial; check the league's official page.";
  }
  return language === "fr"
    ? "Je n’ai pas trouvé de match récent ou à venir vérifiable dans cette source. Elle couvre certaines compétitions seulement; précise la ligue ou le club si tu veux réessayer."
    : "I couldn't verify a recent or upcoming match in this source. It covers selected competitions only; specify a league or club to try again.";
}

export function unsupportedFootballReply(language: string): string {
  return language === "fr"
    ? "Cette compétition n’est pas couverte par ma source de résultats actuelle. Je préfère ne pas inventer de score; précise une compétition prise en charge ou demande une autre source."
    : "My current results source does not cover that competition. I won't guess a score; specify a supported competition or ask for another source.";
}

export function noJobEvidenceReply(language: string): string {
  return language === "fr"
    ? "Je n’ai pas trouvé d’annonce récente et vérifiable dans les flux publics disponibles. Ils sont partiels et privilégient les postes à distance; vérifie les offres locales sur le site officiel de ton service emploi."
    : "I couldn't find a recent, verifiable listing in the available public feeds. They are partial and favor remote roles; check your local employment service for other vacancies.";
}
