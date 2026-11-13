import test from "node:test";
import assert from "node:assert/strict";
import type { Message } from "discord.js";
import { researchForTurn } from "../src/discord/ai-research-service.js";

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
