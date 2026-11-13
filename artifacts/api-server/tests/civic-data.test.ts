import assert from "node:assert/strict";
import test from "node:test";
import { strToU8, zipSync } from "fflate";
import {
  CivicSourceError,
  getLegifranceArticle,
  getPublicHolidayCalendar,
  resolveHolidayCountry,
  resetCivicDataCachesForTests,
  searchAssemblyVotes,
  searchLegifrance,
  type CivicFetch,
} from "../src/discord/civic-data.js";
import { handleCivicCommand, isCivicCommand } from "../src/discord/civic-command.js";
import { fakeDiscord } from "./fixtures/transport-discord.js";

function jsonResponse(value: unknown, status = 200): Response {
  return Response.json(value, { status });
}

function assemblyArchive(): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (let index = 0; index < 1_001; index++) {
    const voteNumber = String(index + 1);
    const document = {
      scrutin: {
        uid: `VTANR5L17V${voteNumber}`,
        numero: voteNumber,
        legislature: "17",
        dateScrutin: index === 1_000 ? "2026-11-12" : `2026-10-${String((index % 28) + 1).padStart(2, "0")}`,
        typeVote: { libelleTypeVote: "scrutin public ordinaire" },
        sort: { code: index === 1_000 ? "adopté" : "rejeté" },
        titre: index === 1_000 ? "Projet de loi de finances publiques" : `Projet de loi numéro ${voteNumber}`,
        syntheseVote: { decompte: { pour: "121", contre: "23", abstentions: "4" } },
      },
    };
    entries[`json/${document.scrutin.uid}.json`] = strToU8(JSON.stringify(document));
  }
  return zipSync(entries);
}

test("holiday country matching uses the provider catalogue and localized region names", async () => {
  resetCivicDataCachesForTests();
  let calls = 0;
  const fetcher: CivicFetch = async () => {
    calls++;
    return jsonResponse([
      { countryCode: "FR", name: "France" },
      { countryCode: "GB", name: "United Kingdom" },
    ]);
  };
  assert.deepEqual(await resolveHolidayCountry("France", "fr", fetcher), [{ countryCode: "FR", name: "France" }]);
  assert.deepEqual(await resolveHolidayCountry("Angleterre", "fr", fetcher), [{ countryCode: "GB", name: "United Kingdom" }]);
  assert.equal(calls, 1, "the country catalogue is cached");
});

test("holiday calendars are validated, cached, and clearly distinguish public aggregators", async () => {
  resetCivicDataCachesForTests();
  let holidayCalls = 0;
  const fetcher: CivicFetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/AvailableCountries")) {
      return jsonResponse([{ countryCode: "FR", name: "France" }]);
    }
    holidayCalls++;
    return jsonResponse([
      { date: "2026-07-14", countryCode: "FR", localName: "Fête nationale", name: "Bastille Day", global: true, types: ["Public"] },
      { date: "2025-07-14", countryCode: "FR", localName: "Wrong year", name: "Wrong year", global: true },
      { date: "2026-08-01", countryCode: "US", localName: "Wrong country", name: "Wrong country", global: true },
      { date: "2026-12-25", countryCode: "FR", localName: "Noël", name: "Christmas Day", global: true },
    ]);
  };
  const first = await getPublicHolidayCalendar("FR", 2026, fetcher);
  const second = await getPublicHolidayCalendar("FR", 2026, fetcher);
  assert.equal(first.source, "Nager.Date");
  assert.match(first.sourceUrl, /date\.nager\.at/);
  assert.equal(first.holidays.length, 2, "records for another year or country are discarded");
  assert.equal(first.holidays[0]!.localName, "Fête nationale");
  assert.equal(second, first);
  assert.equal(holidayCalls, 1);
});

test("UK dates use the official GOV.UK calendar with each home nation identified", async () => {
  resetCivicDataCachesForTests();
  const fetcher: CivicFetch = async (input) => {
    if (String(input).endsWith("/AvailableCountries")) {
      return jsonResponse([{ countryCode: "GB", name: "United Kingdom" }]);
    }
    return jsonResponse({
      "england-and-wales": { events: [{ date: "2026-12-25", title: "Christmas Day" }] },
      scotland: { events: [{ date: "2026-12-28", title: "Boxing Day (substitute day)" }] },
      "northern-ireland": { events: [{ date: "2027-01-01", title: "New Year's Day" }] },
    });
  };
  const result = await getPublicHolidayCalendar("GB", 2026, fetcher);
  assert.equal(result.source, "GOV.UK");
  assert.equal(result.holidays.length, 2);
  assert.deepEqual(result.holidays.map((row) => row.region), ["England and Wales", "Scotland"]);
});

test("an empty holiday response is explicit, not a claim that the country has no holidays", async () => {
  resetCivicDataCachesForTests();
  const fetcher: CivicFetch = async (input) => String(input).endsWith("/AvailableCountries")
    ? jsonResponse([{ countryCode: "JP", name: "Japan" }])
    : jsonResponse([]);
  await assert.rejects(
    () => getPublicHolidayCalendar("JP", 2026, fetcher),
    (error: unknown) => error instanceof CivicSourceError && error.reason === "unsupported",
  );
});

test("Assembly vote archive streams and indexes official JSON records without unpacking the whole ZIP", async () => {
  resetCivicDataCachesForTests();
  const zip = assemblyArchive();
  assert.ok(zip.byteLength > 64 * 1024, "large response chunks must be split before passing data to the streaming ZIP reader");
  const fetcher: CivicFetch = async (input) => String(input).endsWith("/travaux-parlementaires/votes")
    ? new Response('<a href="/static/openData/repository/17/loi/scrutins/Scrutins.json.zip">JSON</a>')
    : new Response(zip, {
      status: 200,
      headers: { "content-length": String(zip.byteLength), "content-type": "application/zip" },
    });
  const matches = await searchAssemblyVotes("budget", fetcher);
  assert.equal(matches.votes.length, 1);
  assert.equal(matches.votes[0]!.number, "1001");
  assert.equal(matches.votes[0]!.forCount, 121);
  assert.match(matches.sourceUrl, /repository\/17\/loi\/scrutins\/Scrutins\.json\.zip/);
  assert.equal(matches.stale, false);
  const latest = await searchAssemblyVotes("", fetcher);
  assert.equal(latest.votes[0]!.number, "1001");
});

test("Legifrance article lookup returns the official article, text, status and version", async () => {
  resetCivicDataCachesForTests();
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const fetcher: CivicFetch = async (input, init) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.includes("/api/oauth/token")) return jsonResponse({ access_token: "test-access-token", expires_in: 300 });
    return jsonResponse({
      article: {
        id: "LEGIARTI000006419280",
        num: "1240",
        texte: "<p>Tout fait quelconque de l'homme, qui cause à autrui un dommage...</p>",
        etat: "VIGUEUR",
        dateDebut: "1546300800000",
        textTitles: [{ title: "Code civil" }],
      },
    });
  };
  const result = await getLegifranceArticle("1240", "Code civil", {
    clientId: "test-client",
    clientSecret: "test-secret",
    refreshToken: "test-refresh-token",
  }, fetcher);
  assert.equal(result.codeTitle, "Code civil");
  assert.equal(result.articleNumber, "1240");
  assert.match(result.text, /Tout fait quelconque/);
  assert.equal(result.state, "VIGUEUR");
  assert.equal(result.versionStart, "2019-01-01");
  assert.match(result.officialUrl, /legifrance\.gouv\.fr\/codes\/article_lc/);
  assert.equal(requests.length, 2);
  assert.match(String(requests[1]!.init?.headers && new Headers(requests[1]!.init!.headers).get("authorization")), /^Bearer test-access-token$/);
  assert.match(String(requests[0]!.init?.body), /grant_type=refresh_token/);
  assert.match(String(requests[0]!.init?.body), /refresh_token=test-refresh-token/);
});

test("Legifrance subject search returns only cited, linked official results", async () => {
  resetCivicDataCachesForTests();
  const fetcher: CivicFetch = async (input) => String(input).includes("/api/oauth/token")
    ? jsonResponse({ access_token: "test-access-token", expires_in: 300 })
    : jsonResponse({
      results: [{
        id: "LEGIARTI000006419280",
        titles: [{ title: "Code civil", cid: "LEGITEXT000006070721" }],
        etat: "VIGUEUR",
        date: "2026-01-01T00:00:00.000+0000",
        text: "<p>Responsabilité civile.</p>",
      }],
    });
  const results = await searchLegifrance("responsabilité civile", {
    clientId: "test-client",
    clientSecret: "test-secret",
    refreshToken: "test-refresh-token",
  }, fetcher);
  assert.equal(results.length, 1);
  assert.equal(results[0]!.title, "Code civil");
  assert.equal(results[0]!.state, "VIGUEUR");
  assert.match(results[0]!.officialUrl!, /article_lc\/LEGIARTI000006419280/);
});

test("civic commands expose help for holidays and law without silently starting a lookup", async () => {
  const discord = fakeDiscord();
  assert.equal(isCivicCommand("vote"), true);
  assert.equal(isCivicCommand("feries"), true);
  assert.equal(isCivicCommand("loi"), true);
  assert.equal(isCivicCommand("unrelated"), false);
  assert.equal(await handleCivicCommand(discord.message, "feries", [], "fr"), true);
  assert.equal(await handleCivicCommand(discord.message, "loi", [], "fr"), true);
  assert.match(discord.replies[0]!.content!, /!feries <pays> \[année\]/);
  assert.match(discord.replies[1]!.content!, /!loi <numéro d’article>/);
});
