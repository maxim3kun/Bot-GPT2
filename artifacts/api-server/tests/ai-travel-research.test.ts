import test from "node:test";
import assert from "node:assert/strict";
import type { Message } from "discord.js";
import { researchForTurn } from "../src/discord/ai-research-service.js";
import { classifyAiMessage } from "../src/discord/ai-router.js";
import {
  findTvCountry, liveServiceKind, liveServiceSearchQuery, parseCurrencyRequest,
} from "../src/discord/ai-live-services.js";

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
        airtime: "20:15", name: "Journal", url: "https://www.tvmaze.com/episodes/1/journal",
        show: { name: "Le Journal", network: { name: "France 2" } },
      }]), { status: 200, headers: { "content-type": "application/json" } });
    }, () => new Date("2026-11-14T22:30:00.000Z"));
  assert.equal(result.results.length, 1);
  assert.match(result.results[0]!.content!, /20:15 local time/);
  assert.match(result.guidance, /not be presented as the complete national schedule/);

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
  assert.equal(unsupportedCountry.results.length, 1);
});

test("job search keeps the requested location and treats listings as unverified until sourced", async () => {
  let query = "";
  const result = await researchForTurn(message, "Je cherche des offres d'emploi à Amiens", [], true,
    "Je cherche des offres d'emploi à Amiens", "fr", async (searchQuery) => {
      query = searchQuery;
      return [{
        title: "Offre d'emploi", url: "https://www.francetravail.fr/offres/1",
        snippet: "Poste disponible à Amiens.",
        content: "Employeur, lieu et intitulé de poste tels qu’affichés sur l’annonce. ".repeat(4),
      }];
    });
  assert.match(query, /Amiens/);
  assert.match(query, /offres d’emploi récentes/);
  assert.match(result.guidance, /Never invent salary, eligibility or availability/);

  let footballQuery = "";
  const football = await researchForTurn(message, "Quand est le prochain match Arsenal ?", [], true,
    "Quand est le prochain match Arsenal ?", "fr", async (searchQuery) => {
      footballQuery = searchQuery;
      return [{
        title: "Calendrier Arsenal", url: "https://www.premierleague.com/matches",
        snippet: "Calendrier des matchs.",
        content: "Arsenal joue à la date indiquée par la source; les horaires sont publiés pour la compétition. ".repeat(3),
      }];
    });
  assert.match(footballQuery, /Arsenal/);
  assert.match(footballQuery, /football calendrier résultat match date/);
  assert.match(football.guidance, /never infer a result/i);
});
