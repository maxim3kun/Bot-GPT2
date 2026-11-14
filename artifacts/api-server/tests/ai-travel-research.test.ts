import test from "node:test";
import assert from "node:assert/strict";
import type { Message } from "discord.js";
import { researchForTurn } from "../src/discord/ai-research-service.js";
import { classifyAiMessage } from "../src/discord/ai-router.js";
import {
  findTvCountry, liveServiceKind, liveServiceSearchQuery, parseCurrencyRequest,
} from "../src/discord/ai-live-services.js";
import {
  fetchFootballEvidence, fetchJobEvidence, jobSearchClarification,
} from "../src/discord/ai-public-sports-jobs.js";

const message = {} as Message;
const officialAndUnverified = [
  { title: "Entry requirements", url: "https://www.gov.uk/foreign-travel-advice/japan/entry-requirements",
    snippet: "Official travel entry requirements.", content: "Official immigration information. ".repeat(12) },
  { title: "Travel blog", url: "https://travel.example.org/japan",
    snippet: "A personal guide.", content: "Personal travel advice. ".repeat(12) },
  { title: "Insecure government page", url: "http://visa.gov.example/entry",
    snippet: "Not HTTPS.", content: "Government information. ".repeat(12) },
];

test("visa questions ask passport nationality before searching", async () => {
  let calls = 0;
  const result = await researchForTurn(message, "Visa pour le Japon", [], true, "Visa pour le Japon", "fr",
    async () => { calls++; return officialAndUnverified; });
  assert.match(result.immediateReply!, /nationalité du passeport/);
  assert.equal(calls, 0);
});

test("visa and country research keeps only readable secure government sources", async () => {
  let calls = 0;
  const visa = await researchForTurn(message, "Visa pour le Japon avec un passeport français", [], true,
    "Visa pour le Japon avec un passeport français", "fr",
    async () => { calls++; return officialAndUnverified; });
  assert.equal(calls, 1);
  assert.deepEqual(visa.results.map(page => page.url), [officialAndUnverified[0]!.url]);
  assert.match(visa.guidance, /not legal advice or a guarantee of admission/);
  assert.match(visa.guidance, /lookup date/);

  const country = await researchForTurn(message, "Infos pratiques pour le Japon", [], true,
    "Infos pratiques pour le Japon", "fr", async () => officialAndUnverified);
  assert.deepEqual(country.results.map(page => page.url), [officialAndUnverified[0]!.url]);
  assert.match(country.guidance, /official entry-condition links/);
});

test("missing official travel evidence fails clearly instead of using blogs", async () => {
  const result = await researchForTurn(message, "Visa Japon, passeport français", [], true,
    "Visa Japon, passeport français", "fr", async () => [officialAndUnverified[1]!]);
  assert.equal(result.results.length, 0);
  assert.match(result.immediateReply!, /page officielle/);
});

test("old government visa pages are withheld with an explicit stale-data warning", async () => {
  const result = await researchForTurn(message, "Visa Japon, passeport français", [], true,
    "Visa Japon, passeport français", "fr", async () => [{
      title: "Old official entry rules", url: "https://www.gov.uk/foreign-travel-advice/japan/entry-requirements",
      snippet: "Official entry rules.", publishedAt: "2000-01-01", content: "Official immigration information. ".repeat(12),
    }]);
  assert.equal(result.results.length, 0);
  assert.match(result.immediateReply!, /date est trop ancienne/);
});

test("flight research distinguishes schedules from live status and timestamps", async () => {
  const result = await researchForTurn(message, "Quel est le statut du vol AF123 aujourd’hui ?", [], true,
    "Quel est le statut du vol AF123 aujourd’hui ?", "fr", async () => [{
      title: "Flight AF123 status", url: "https://flights.example.com/AF123",
      snippet: "AF123 departure board.", content: "Flight AF123 departure information. ".repeat(8),
    }]);
  assert.equal(result.results.length, 1);
  assert.match(result.guidance, /exact flight or route and date/);
  assert.match(result.guidance, /distinguish a published schedule from a live status/);
  assert.match(result.guidance, /source's own timestamp only if present/);
});

test("employment, football, television, and currency requests use live research", () => {
  assert.equal(classifyAiMessage("Je cherche des offres d'emploi à Amiens").needsResearch, true);
  assert.equal(classifyAiMessage("Quand est le prochain match du PSG ?").needsResearch, true);
  assert.equal(classifyAiMessage("Quel est le score du PSG ?").needsResearch, true);
  assert.equal(classifyAiMessage("Quel est le programme TV ce soir en France ?").needsResearch, true);
  assert.equal(classifyAiMessage("Convertir 100 euros en dollars canadiens").needsResearch, true);
  assert.equal(classifyAiMessage("100 dollars en euros, ça fait combien ?").needsResearch, true);
  assert.equal(classifyAiMessage("What is on TV tonight in the US?").needsResearch, true);
  assert.equal(liveServiceKind("offres d'emploi"), "jobs");
  assert.equal(liveServiceKind("programme télévision"), "tv");
  assert.equal(liveServiceSearchQuery("emploi développeur Amiens", "jobs", "fr").includes("offres"), true);
});

test("currency lookup parses pairs and returns a dated, non-live reference source", async () => {
  assert.deepEqual(parseCurrencyRequest("convertir 100 euros en dollars canadiens"), {
    from: "EUR", to: "CAD", amount: 100,
  });
  const result = await researchForTurn(message, "Convertir 100 euros en dollars canadiens", [], true,
    "Convertir 100 euros en dollars canadiens", "fr", async () => {
      throw new Error("Currency conversion should not use generic web search");
    }, async (input) => {
      assert.match(String(input), /base=EUR/);
      assert.match(String(input), /symbols=CAD/);
      return new Response(JSON.stringify({ amount: 1, base: "EUR", date: "2026-11-13", rates: { CAD: 1.45 } }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }, () => new Date("2026-11-14T14:30:00.000Z"));
  assert.equal(result.results.length, 1);
  assert.match(result.results[0]!.content!, /100 EUR = 145 CAD/);
  assert.match(result.results[0]!.content!, /Rate date: 2026-11-13/);
  assert.match(result.results[0]!.content!, /Lookup time: 2026-11-14T14:30:00.000Z/);
  assert.match(result.results[0]!.content!, /not a live trading, card or bank rate/);

  const malformed = await researchForTurn(message, "Convertir 100 EUR en CAD", [], true,
    "Convertir 100 EUR en CAD", "fr", async () => [], async () => new Response(JSON.stringify({
      base: "EUR", date: "2026-11-13", rates: { CAD: "1.45" },
    }), { status: 200 }));
  assert.match(malformed.immediateReply!, /ne vais pas deviner le taux/);
});

test("TV schedules require an explicit supported country and use its local date", async () => {
  assert.equal(findTvCountry("Programme TV ce soir en France")?.code, "FR");
  assert.equal(findTvCountry("Programme TV ce soir au Canada")?.code, "CA");
  assert.equal(findTvCountry("Programme TV ce soir au Portugal"), undefined);
  const result = await researchForTurn(message, "Programme TV ce soir en France", [], true,
    "Programme TV ce soir en France", "fr", async () => {
      throw new Error("TV schedule should use its public schedule source");
    }, async (input) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get("country"), "FR");
      assert.equal(url.searchParams.get("date"), "2026-11-14");
      return new Response(JSON.stringify([{
        airdate: "2026-11-14", airtime: "20:15", name: "Journal", url: "https://www.tvmaze.com/episodes/1/journal",
        show: { name: "Le Journal", network: { name: "France 2" } },
      }]), { status: 200, headers: { "content-type": "application/json" } });
    }, () => new Date("2026-11-14T22:30:00.000Z"));
  assert.equal(result.results.length, 1);
  assert.match(result.results[0]!.content!, /Airtime shown by TVMaze: 20:15/);
  assert.match(result.results[0]!.content!, /No timezone is supplied by the schedule source/);
  assert.doesNotMatch(result.results[0]!.content!, /Europe\/Paris/);
  assert.match(result.guidance, /do not imply broader country coverage or a complete national schedule/);
  assert.match(result.guidance, /only FR, GB, US, CA, DE, IE, AU, ES, IT, JP and SG/);
  assert.match(result.guidance, /Call a listing current for the requested date only when the source explicitly dates it for that day/);
  assert.match(result.guidance, /Include a timezone only when the listing source explicitly confirms it/);

  const staleSchedule = await researchForTurn(message, "Programme TV ce soir en France", [], true,
    "Programme TV ce soir en France", "fr", async () => [], async () => new Response(JSON.stringify([
      { airdate: "2026-11-13", airtime: "20:00", show: { name: "Ancien épisode" } },
      { airdate: "2026-11-14", airtime: "inconnue", show: { name: "Horaire mal formé" } },
    ]), { status: 200 }), () => new Date("2026-11-14T12:00:00.000Z"));
  assert.match(staleSchedule.immediateReply!, /Aucun épisode n’est listé/);

  const invalidSchedule = await researchForTurn(message, "Programme TV ce soir en France", [], true,
    "Programme TV ce soir en France", "fr", async () => [], async () => new Response(JSON.stringify({ episodes: [] }), { status: 200 }),
    () => new Date("2026-11-14T12:00:00.000Z"));
  assert.match(invalidSchedule.immediateReply!, /grille TV n’a pas pu être chargée/);

  const missingCountry = await researchForTurn(message, "Quel est le programme TV ce soir ?", [], true,
    "Quel est le programme TV ce soir ?", "fr", async () => [], async () => {
      throw new Error("TV lookup should ask for the country");
    });
  assert.match(missingCountry.immediateReply!, /Pour quel pays/);

  let fallbackQuery = "";
  const unsupportedCountry = await researchForTurn(message, "Programme TV ce soir au Portugal", [], true,
    "Programme TV ce soir au Portugal", "fr", async (searchQuery) => {
      fallbackQuery = searchQuery;
      return [{
        title: "Programme TV Portugal", url: "https://example.pt/tv",
        snippet: "Guide TV du Portugal.",
        content: "Programme publié par une source consultable au Portugal. ".repeat(4),
      }];
    }, async () => {
      throw new Error("Unsupported country should use sourced web search, not TVMaze");
    });
  assert.match(fallbackQuery, /Portugal/);
  assert.match(fallbackQuery, /grille publique télévision chaînes diffuseur horaires date/);
  assert.equal(unsupportedCountry.results.length, 1);
  assert.match(unsupportedCountry.guidance, /State which sources, channels\/platforms and dates were actually found/);

  const noPublicListings = await researchForTurn(message, "Programme TV ce soir au Portugal", [], true,
    "Programme TV ce soir au Portugal", "fr", async () => [], async () => {
      throw new Error("Unsupported countries must use public web search");
    });
  assert.match(noPublicListings.immediateReply!, /Je n’ai pas trouvé de grille publiée que je puisse vérifier/);
  assert.match(noPublicListings.immediateReply!, /Cela ne prouve pas qu’aucun programme n’est diffusé/);

  const unavailableSearch = await researchForTurn(message, "Programme TV ce soir au Portugal", [], true,
    "Programme TV ce soir au Portugal", "fr", async () => {
      throw new Error("public search unavailable");
    });
  assert.match(unavailableSearch.immediateReply!, /grille TV n’a pas pu être chargée/);
  assert.doesNotMatch(unavailableSearch.immediateReply!, /Je n’ai pas trouvé de grille publiée/);
});

test("job search asks for missing details and keeps the requested location and role", async () => {
  const clarify = await researchForTurn(message, "Je cherche des offres d'emploi à Amiens", [], true,
    "Je cherche des offres d'emploi à Amiens", "fr");
  assert.match(clarify.immediateReply!, /Quel métier ou type de poste/);
  const location = await researchForTurn(message, "Je cherche un emploi de développeur à Amiens", [], true,
    "Je cherche un emploi de développeur à Amiens", "fr", async () => [], async (input) => {
      assert.equal(new URL(String(input)).searchParams.get("geo"), "france");
      return new Response(JSON.stringify({ jobs: [] }), { status: 200 });
    }, () => new Date("2026-11-14T12:00:00.000Z"));
  assert.match(location.immediateReply!, /flux publics disponibles/);
  assert.equal(location.results.length, 0);
  const result = await researchForTurn(message, "Offres d'emploi développeur en France", [], true,
    "Offres d'emploi développeur en France", "fr", async () => {
      throw new Error("Job listings must come from direct public feeds");
    }, async (input) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get("geo"), "france");
      assert.equal(url.searchParams.get("tag"), "developer");
      return new Response(JSON.stringify({ jobs: [{
        jobTitle: "Frontend Developer", companyName: "Example", jobGeo: "Europe",
        pubDate: "2026-11-13T08:00:00Z", url: "https://jobicy.com/jobs/123",
      }] }), { status: 200 });
    }, () => new Date("2026-11-14T12:00:00.000Z"));
  assert.equal(result.results.length, 1);
  assert.match(result.results[0]!.content!, /Original listing/);
  assert.match(result.guidance, /Never invent salary, eligibility or availability/);

});

test("public job feeds require a role and a usable location, and reject stale or malformed listings", async () => {
  assert.equal(jobSearchClarification("Je cherche un emploi de développeur à Amiens", "fr"), null);
  assert.match(jobSearchClarification("Je cherche un emploi de développeur à Springfield", "fr")!, /Quel pays couvre cette ville/);
  assert.equal(jobSearchClarification("Offres d'emploi développeur en France", "fr"), null);
  let receivedUrl = "";
  const now = new Date("2026-11-14T12:00:00.000Z");
  const results = await fetchJobEvidence("Offres d'emploi développeur en France", now, async (input) => {
    receivedUrl = String(input);
    const url = new URL(receivedUrl);
    assert.equal(url.searchParams.get("geo"), "france");
    assert.equal(url.searchParams.get("tag"), "developer");
    return new Response(JSON.stringify({ jobs: [
      { jobTitle: "Frontend Developer", companyName: "Example", jobGeo: "Europe", pubDate: "2026-11-13T08:00:00Z", url: "https://jobicy.com/jobs/123" },
      { jobTitle: "Old Developer", companyName: "Old", jobGeo: "France", pubDate: "2026-01-01T08:00:00Z", url: "https://jobicy.com/jobs/old" },
      { jobTitle: "Malformed Developer", companyName: "Broken", jobGeo: "France", pubDate: "not-a-date", url: "javascript:alert(1)" },
      { jobTitle: "Recent Designer", companyName: "Design Co", jobGeo: "France", pubDate: "2026-11-13T08:00:00Z", url: "https://jobicy.com/jobs/456" },
    ] }), { status: 200, headers: { "content-type": "application/json" } });
  });
  assert.match(receivedUrl, /api\/v2\/remote-jobs/);
  assert.equal(results.length, 1);
  assert.match(results[0]!.title, /Frontend Developer/);
  assert.match(results[0]!.content!, /remote jobs only/);

  const germanJobs = await fetchJobEvidence("Offres d'emploi développeur à Berlin en Allemagne", now, async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "jobicy.com") return new Response(JSON.stringify({ jobs: [{
      jobTitle: "Remote Software Developer", companyName: "Remote Co", jobGeo: "Germany",
      pubDate: "2026-11-13T08:00:00Z", url: "https://jobicy.com/jobs/remote",
    }] }), { status: 200 });
    return new Response(JSON.stringify({ data: [
      { title: "Software Developer", company_name: "Berlin Co", location: "Berlin", created_at: 1794564000, url: "https://www.arbeitnow.com/jobs/berlin", remote: false },
      { title: "Software Developer", company_name: "Munich Co", location: "Munich", created_at: 1794564000, url: "https://www.arbeitnow.com/jobs/munich", remote: false },
    ] }), { status: 200 });
  });
  assert.ok(germanJobs.some((item) => item.url.includes("jobicy.com")));
  assert.ok(germanJobs.some((item) => item.url.includes("/berlin")));
  assert.ok(!germanJobs.some((item) => item.url.includes("/munich")));

  const missing = await researchForTurn(message, "Offres d'emploi développeur en France", [], true,
    "Offres d'emploi développeur en France", "fr", async () => [], async () => new Response(JSON.stringify({ jobs: [] })));
  assert.match(missing.immediateReply!, /flux publics disponibles/);

  const unavailable = await researchForTurn(message, "Offres d'emploi développeur en France", [], true,
    "Offres d'emploi développeur en France", "fr", async () => [], async () => { throw new Error("offline"); });
  assert.match(unavailable.immediateReply!, /sources d’emploi cette fois/);
});

test("football answers separate fresh fixtures from final scores and reject stale or unsupported data", async () => {
  const now = new Date("2026-11-14T12:00:00.000Z");
  const event = (date: string, state: string, completed: boolean, home: string, away: string, scores: [string, string]) => ({
    id: "test", date, links: [{ href: "https://www.espn.com/soccer/match/test" }],
    competitions: [{
      competitors: [
        { homeAway: "home", score: scores[0], team: { displayName: home } },
        { homeAway: "away", score: scores[1], team: { displayName: away } },
      ],
      status: { type: { state, completed, detail: completed ? "Full Time" : "Scheduled", shortDetail: completed ? "FT" : "NS" } },
    }],
  });
  const calendar = [
    "2026-10-31T07:00Z", "2026-11-07T07:00Z", "2026-11-08T07:00Z", "2026-11-13T07:00Z",
    "2026-11-14T07:00Z", "2026-11-20T07:00Z", "2026-11-21T07:00Z", "2026-11-22T07:00Z",
  ];
  const fetcher = async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    assert.match(url.pathname, /soccer\/eng\.1\/scoreboard/);
    const date = url.searchParams.get("dates");
    const base = { leagues: [{ calendar }], events: [] as ReturnType<typeof event>[] };
    if (date === "20261114") return new Response(JSON.stringify({
      ...base, events: [event("2026-11-14T11:30:00Z", "in", false, "FC Arsenal", "Chelsea FC", ["1", "0"])],
    }), { status: 200 });
    if (date === "20261120") return new Response(JSON.stringify({
      ...base,
      events: [
        event("2026-11-20T17:30:00Z", "pre", false, "FC Arsenal", "Chelsea FC", ["", ""]),
        event("2026-10-31T17:30:00Z", "post", true, "FC Arsenal", "Liverpool FC", ["2", "0"]),
      ],
    }), { status: 200 });
    if (date === "20261113") return new Response(JSON.stringify({
      ...base, events: [event("2026-11-13T17:30:00Z", "post", true, "FC Arsenal", "Manchester City", ["2", "1"])],
    }), { status: 200 });
    return new Response(JSON.stringify(base), { status: 200 });
  };
  const matches = await fetchFootballEvidence("Quand joue Arsenal en Premier League ?", now, fetcher);
  assert.equal(matches?.length, 1);
  assert.match(matches?.[0]?.content!, /Scheduled fixture/);
  assert.ok(!matches?.some((item) => /Liverpool/.test(item.title)));

  const finished = await fetchFootballEvidence("Quel est le dernier score d'Arsenal en Premier League ?", now, fetcher);
  assert.ok(finished?.some((item) => /Final score confirmed by ESPN: 2-1/.test(item.content!)));

  const live = await fetchFootballEvidence("Score en direct Arsenal Premier League", now, fetcher);
  assert.ok(live?.some((item) => /lists this match as live at lookup time/.test(item.content!)));

  let psgEndpoint = "";
  const psg = await fetchFootballEvidence("Prochain match du PSG en Ligue 1", now, async (input) => {
    psgEndpoint = String(input);
    const url = new URL(psgEndpoint);
    const base = { leagues: [{ calendar }], events: [] };
    return new Response(JSON.stringify(url.searchParams.get("dates") === "20261120"
      ? { ...base, events: [event("2026-11-20T19:45:00Z", "pre", false, "Paris Saint-Germain", "Olympique de Marseille", ["", ""])] }
      : base), { status: 200 });
  });
  assert.match(psgEndpoint, /soccer\/fra\.1\/scoreboard/);
  assert.ok(psg?.some((item) => /Paris Saint-Germain/.test(item.title)));

  const unsupported = await researchForTurn(message, "Quel est le prochain match du Real Salt Lake ?", [], true,
    "Quel est le prochain match du Real Salt Lake ?", "fr", async () => [], async () => {
      throw new Error("Unsupported competition must not call a guessed endpoint");
    });
  assert.match(unsupported.immediateReply!, /n’est pas couverte/);

  const absent = await researchForTurn(message, "Quel est le prochain match Arsenal Premier League ?", [], true,
    "Quel est le prochain match Arsenal Premier League ?", "fr", async () => [], async () =>
      new Response(JSON.stringify({ leagues: [{ calendar }], events: [] }), { status: 200 }));
  assert.match(absent.immediateReply!, /n’ai pas trouvé de match récent ou à venir vérifiable/);

  const unavailable = await researchForTurn(message, "Quel est le prochain match Arsenal Premier League ?", [], true,
    "Quel est le prochain match Arsenal Premier League ?", "fr", async () => [], async () => { throw new Error("offline"); });
  assert.match(unavailable.immediateReply!, /source de résultats de football n’a pas pu être chargée/);
});

test("football coverage includes more divisions and verified public league tables", async () => {
  const now = new Date("2026-11-14T12:00:00.000Z");
  assert.equal(classifyAiMessage("Quel est le classement de Ligue 2 ?").needsResearch, true);
  assert.equal(classifyAiMessage("What are the MLS standings?").needsResearch, true);
  assert.equal(classifyAiMessage("Quel est le classement de la Ligue Europa ?").needsResearch, true);

  let tableUrl = "";
  const standings = await fetchFootballEvidence("Classement Ligue 1", now, async (input) => {
    tableUrl = String(input);
    assert.match(tableUrl, /thesportsdb\.com\/api\/v1\/json\/123\/lookuptable\.php\?l=4334/);
    return new Response(JSON.stringify({ table: [
      {
        idLeague: "4334", strLeague: "French Ligue 1", strSeason: "2026-2027",
        dateUpdated: "2026-11-13 05:01:00", intRank: "1", strTeam: "Paris Saint-Germain",
        intPlayed: "12", intWin: "9", intDraw: "2", intLoss: "1",
        intGoalsFor: "28", intGoalsAgainst: "9", intGoalDifference: "19", intPoints: "29",
      },
      {
        idLeague: "9999", strLeague: "Unrelated league", strSeason: "2026",
        dateUpdated: "2026-11-13", intRank: "1", strTeam: "Wrong Team",
        intPlayed: "1", intPoints: "3",
      },
    ] }), { status: 200, headers: { "content-type": "application/json" } });
  });
  assert.equal(standings?.length, 1);
  assert.match(standings?.[0]?.title!, /French Ligue 1/);
  assert.match(standings?.[0]?.content!, /Season: 2026-2027/);
  assert.match(standings?.[0]?.content!, /source's update date is 2026-11-13 05:01:00/);
  assert.match(standings?.[0]?.content!, /lookup was made at 2026-11-14T12:00:00.000Z/);
  assert.match(standings?.[0]?.content!, /1\. Paris Saint-Germain — 29 points/);
  assert.doesNotMatch(standings?.[0]?.content!, /Wrong Team/);

  let divisionEndpoint = "";
  const championship = await fetchFootballEvidence("Championship fixtures", now, async (input) => {
    divisionEndpoint = String(input);
    return new Response(JSON.stringify({
      leagues: [{ calendar: ["2026-11-14T07:00Z"] }], events: [],
    }), { status: 200, headers: { "content-type": "application/json" } });
  });
  assert.match(divisionEndpoint, /soccer\/eng\.2\/scoreboard/);
  assert.deepEqual(championship, []);

  const unavailableTable = await researchForTurn(message, "Classement Ligue Europa", [], true,
    "Classement Ligue Europa", "fr", async () => {
      throw new Error("Standings must use the structured public table source");
    }, async () => {
      throw new Error("This competition has no configured standings source");
    });
  assert.match(unavailableTable.immediateReply!, /pas trouvé de classement vérifiable/);
  assert.match(unavailableTable.immediateReply!, /couverture des divisions est partielle/);
});
