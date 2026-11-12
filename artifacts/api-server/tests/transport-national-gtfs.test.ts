import assert from "node:assert/strict";
import test from "node:test";
import { strToU8, zipSync } from "fflate";
import { NationalGtfsTransportClient, nationalTimezoneMatches } from "../src/discord/national-gtfs-transport.js";
import { TransportBrowserClient, modeName } from "../src/discord/transport-browser.js";
import { TransportMetadataCache } from "../src/discord/transport-metadata-cache.js";
import { parseTransportCommand } from "../src/discord/transport-command-query.js";

const NOW = Date.parse("2026-11-12T06:00:00Z");
const feed = (territory: "ie" | "lu", timezone: string) => {
  const [lat, lon] = territory === "ie" ? ["53.35", "-6.26"] : ["49.61", "6.13"];
  return zipSync({
  "agency.txt": strToU8(`agency_id,agency_name,agency_timezone\nA,National Transit,${timezone}\n`),
  "routes.txt": strToU8("route_id,route_short_name,route_long_name,route_type\nB1,B1,City Bus,3\nR1,R1,Regional Train,2\n"),
  "trips.txt": strToU8("route_id,service_id,trip_id,trip_headsign\nB1,DAILY,B1-1,Central Station\nR1,DAILY,R1-1,Central Station\n"),
  "stops.txt": strToU8(`stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station\nA,Origin,${lat},${lon},0,\nB,Central Station,${Number(lat) + .01},${Number(lon) + .01},0,\n`),
  "stop_times.txt": strToU8("trip_id,arrival_time,departure_time,stop_id,stop_sequence\nB1-1,08:30:00,08:30:00,A,1\nB1-1,08:45:00,08:45:00,B,2\nR1-1,09:00:00,09:00:00,A,1\nR1-1,09:20:00,09:20:00,B,2\n"),
  "calendar.txt": strToU8("service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nDAILY,1,1,1,1,1,1,1,20260101,20991231\n"),
  });
};

function fixture(territory: "ie" | "lu") {
  const timezone = territory === "ie" ? "Europe/Dublin" : "Europe/Luxembourg";
  const bytes = feed(territory, timezone);
  const requests: string[] = [];
  const feedUrl = territory === "ie"
    ? "https://www.transportforireland.ie/transitData/Data/GTFS_All.zip"
    : "https://download.data.public.lu/resources/horaires-et-arrets-des-transport-publics-gtfs/test/gtfs-test.zip";
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("nominatim.openstreetmap.org/search")) {
      return Response.json([{ lat: territory === "ie" ? "53.35" : "49.61",
        lon: territory === "ie" ? "-6.26" : "6.13", name: territory === "ie" ? "Dublin" : "Luxembourg",
        display_name: territory === "ie" ? "Dublin, County Dublin, Ireland" : "Luxembourg, Luxembourg",
        class: "place", type: "city", address: { county: "County Dublin" } }]);
    }
    if (url.includes("data.gov.ie/api/3/action/package_show")) {
      return Response.json({ success: true, result: { title: "NTA GTFS", license_id: "CC-BY-4.0",
        resources: [{ name: "GTFS", format: "csv.zip", url: feedUrl, last_modified: "2026-11-11T00:00:00Z" }] } });
    }
    if (url.includes("data.public.lu/api/1/datasets/")) {
      return Response.json({ title: "Horaires et arrêts GTFS", license: "cc-by",
        resources: [{ title: "gtfs-20261111.zip", url: feedUrl, filesize: bytes.length }] });
    }
    if (url === feedUrl) {
      const range = new Headers(init?.headers).get("range");
      if (!range) return new Response(bytes, { status: 200 });
      requests.push(range);
      const suffix = range.match(/^bytes=-(\d+)$/);
      const part = range.match(/^bytes=(\d+)-(\d+)$/);
      const start = suffix ? Math.max(0, bytes.length - Number(suffix[1])) : Number(part![1]);
      const end = suffix ? bytes.length - 1 : Number(part![2]);
      return new Response(bytes.slice(start, end + 1), { status: 206, headers: {
        "content-range": `bytes ${start}-${end}/${bytes.length}`, etag: '"fixture-v1"',
        "last-modified": "Wed, 11 Nov 2026 23:08:44 GMT",
      } });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  const client = new NationalGtfsTransportClient(territory, fetcher, () => NOW,
    new TransportMetadataCache(() => null, () => NOW));
  return { client, requests, feedUrl };
}

test("both national selectors use only public static feeds and expose actual GTFS modes", async () => {
  for (const territory of ["ie", "lu"] as const) {
    const { client } = fixture(territory);
    const expectedTimezone = territory === "ie" ? "Europe/Dublin" : "Europe/Luxembourg";
    const catalog = await client.getCatalog();
    assert.equal(catalog.length, 1);
    assert.equal(catalog[0]!.territory, territory);
    assert.equal(catalog[0]!.resources.length, 1, "no unvalidated real-time resource is advertised");
    assert.match(catalog[0]!.licence, /CC BY/);
    assert.deepEqual((await client.availableModes()).sort(), ["bus", "rail"]);
    const city = (await client.municipalities(territory === "ie" ? "Dublin" : "Luxembourg"))[0]!;
    assert.equal(city.territory, territory);
    const networks = await client.networks(city, "bus");
    assert.equal(networks.length, 1);
    assert.deepEqual(networks[0]!.modes?.sort(), ["bus", "rail"]);
    const browser = new TransportBrowserClient(undefined, () => NOW, undefined, undefined, undefined,
      territory === "ie" ? client : undefined, territory === "lu" ? client : undefined);
    const actualCity = (await browser.cities(territory === "ie" ? "Dublin" : "Luxembourg", territory, "bus"))[0]!;
    const availableNetworks = await browser.networks(actualCity, "bus");
    const listing = await browser.lines(actualCity, "bus", "", availableNetworks[0]!.id);
    assert.equal(listing.lines.length, 1);
    const line = listing.lines[0]!;
    assert.equal(line.territory, territory);
    assert.equal(line.realtime.length, 0);
    const index = await browser.index(line);
    assert.equal(index.metadata.timezone, expectedTimezone);
    assert.equal(index.connectionsUnavailable, true, "single-route extracts do not promise unverified transfers");
    const result = await browser.departures(line, index, { label: "Origin", ids: ["A"] },
      { label: "Central Station", ids: ["B"] }, "fr");
    assert.match(result.content, /Horaires théoriques/);
    assert.match(result.source.attribution ?? "", /CC BY/);
    await assert.rejects(client.realtimeFeed(), /Aucun flux temps réel public validé/);
  }
});

test("Ireland's large archive is parsed with HTTP ranges, never downloaded whole", async () => {
  const { client, requests } = fixture("ie");
  const resource = (await client.getCatalog())[0]!.resources[0]!;
  await client.referenceRoutes(resource);
  await client.referenceStops(resource);
  assert.ok(requests.length > 2);
  assert.ok(requests.every(range => range.startsWith("bytes=")));
});

test("territory prefixes and mode labels include Ireland and Luxembourg", () => {
  assert.equal(parseTransportCommand(["Irlande", "Dublin", "B1"]).territory, "ie");
  assert.equal(parseTransportCommand(["Luxembourg", "Esch-sur-Alzette"]).territory, "lu");
  assert.equal(modeName("rail", "ie"), "Train");
  assert.equal(modeName("rail", "lu"), "Train");
  assert.deepEqual(new TransportBrowserClient().territories, ["fr", "qc", "en", "ie", "lu"]);
  assert.equal(nationalTimezoneMatches("ie", "Europe/London"), true);
  assert.equal(nationalTimezoneMatches("lu", "Europe/Berlin"), true);
  assert.equal(nationalTimezoneMatches("lu", "Europe/Paris"), false);
});

