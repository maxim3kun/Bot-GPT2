import assert from "node:assert/strict";
import test from "node:test";
import { strToU8, zipSync } from "fflate";
import { boundaryContains, NationalGtfsTransportClient, nationalTimezoneMatches } from "../src/discord/national-gtfs-transport.js";
import { IRELAND_PROVINCES, IRELAND_COUNTIES, irelandCountyFromSearch, irelandCounties } from "../src/discord/ireland-regions.js";
import { TransportBrowserClient, modeName } from "../src/discord/transport-browser.js";
import { TransportMetadataCache } from "../src/discord/transport-metadata-cache.js";
import { parseTransportCommand } from "../src/discord/transport-command-query.js";
import { NorwayNetexTransportClient } from "../src/discord/norway-netex-transport.js";

const NOW = Date.parse("2026-11-12T06:00:00Z");
const feed = (territory: "ie" | "lu" | "ch", timezone: string) => {
  const [lat, lon] = territory === "ie" ? ["53.35", "-6.26"] :
    territory === "lu" ? ["49.61", "6.13"] : ["47.3769", "8.5417"];
  return zipSync({
  "agency.txt": strToU8(`agency_id,agency_name,agency_timezone\nA,National Transit,${timezone}\n`),
  "routes.txt": strToU8("route_id,route_short_name,route_long_name,route_type\nB1,B1,City Bus,3\nR1,R1,Regional Train,2\n"),
  "trips.txt": strToU8("route_id,service_id,trip_id,trip_headsign\nB1,DAILY,B1-1,Central Station\nR1,DAILY,R1-1,Central Station\n"),
  "stops.txt": strToU8(`stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station\nA,Origin,${lat},${lon},0,\nB,Central Station,${Number(lat) + .01},${Number(lon) + .01},0,\n`),
  "stop_times.txt": strToU8("trip_id,arrival_time,departure_time,stop_id,stop_sequence\nB1-1,08:30:00,08:30:00,A,1\nB1-1,08:45:00,08:45:00,B,2\nR1-1,09:00:00,09:00:00,A,1\nR1-1,09:20:00,09:20:00,B,2\n"),
  "calendar.txt": strToU8("service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nDAILY,1,1,1,1,1,1,1,20260101,20991231\n"),
  });
};

function fixture(territory: "ie" | "lu" | "ch") {
  const timezone = territory === "ie" ? "Europe/Dublin" :
    territory === "lu" ? "Europe/Luxembourg" : "Europe/Zurich";
  const bytes = feed(territory, timezone);
  const requests: string[] = [];
  const feedUrl = territory === "ie"
    ? "https://www.transportforireland.ie/transitData/Data/GTFS_All.zip"
    : territory === "lu"
      ? "https://download.data.public.lu/resources/horaires-et-arrets-des-transport-publics-gtfs/test/gtfs-test.zip"
      : "https://data.opentransportdata.swiss/dataset/3d2c18f9-9ef1-463f-a249-5c67604efd74/resource/b241d550-e213-4a88-9e60-501ad17ce538/download/gtfs_fp2026_20261111.zip";
  const resourceId = "b241d550-e213-4a88-9e60-501ad17ce538";
  let unsafeRedirect = false;
  let sourceOffline = false;
  let clock = NOW;
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    if (sourceOffline && (url === feedUrl || url.includes(`/resources/${resourceId}/`))) {
      throw new Error("official feed unavailable");
    }
    if (url.includes("nominatim.openstreetmap.org/search")) {
      const parsedUrl = new URL(url);
      if (parsedUrl.searchParams.get("polygon_geojson") === "1") return Response.json([{
        name: "County Dublin", category: "boundary", type: "administrative", addresstype: "county",
        address: { country_code: "ie", region: "Leinster" },
        geojson: { type: "Polygon", coordinates: [[[-6.27, 53.34], [-6.25, 53.34],
          [-6.25, 53.355], [-6.27, 53.355], [-6.27, 53.34]]] },
      }]);
      const [lat, lon, name, display] = territory === "ie" ? ["53.35", "-6.26", "Dublin", "Dublin, County Dublin, Ireland"] :
        territory === "lu" ? ["49.61", "6.13", "Luxembourg", "Luxembourg, Luxembourg"] :
          ["47.3769", "8.5417", "Zürich", "Zürich, Switzerland"];
      return Response.json([{ lat, lon, name, display_name: display, class: "place", type: "city",
        address: { county: territory === "ie" ? "County Dublin" : "Zürich" } }]);
    }
    if (territory === "ch" && url === "https://data.opentransportdata.swiss/dataset/timetable-2026-gtfs2020") {
      return new Response(`<a href="${feedUrl}">GTFS_FP2026_20261111.zip</a>`, { status: 200,
        headers: { "content-type": "text/html; charset=utf-8" } });
    }
    if (url.includes("data.gov.ie/api/3/action/package_show")) {
      return Response.json({ success: true, result: { title: "NTA GTFS", license_id: "CC-BY-4.0",
        resources: [{ name: "GTFS", format: "csv.zip", url: feedUrl, last_modified: "2026-11-11T00:00:00Z" }] } });
    }
    if (url.includes("data.public.lu/api/1/datasets/")) {
      return Response.json({ title: "Horaires et arrêts GTFS", license: "cc-by",
        resources: [{ title: "gtfs-20261111.zip", url: feedUrl, filesize: bytes.length }] });
    }
    if (url === feedUrl && territory === "ch") {
      return Response.redirect(unsafeRedirect
        ? `https://attacker.example/resources/${resourceId}/gtfs_fp2026_20261111.zip`
        : `https://test.eu.r2.cloudflarestorage.com/dx-omd-prod/resources/${resourceId}/gtfs_fp2026_20261111.zip?signature=test`, 302);
    }
    if (url.includes("test.eu.r2.cloudflarestorage.com") && url.includes(`/resources/${resourceId}/`)) {
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
  const client = new NationalGtfsTransportClient(territory, fetcher, () => clock,
    new TransportMetadataCache(() => null, () => clock));
  return {
    client, requests, feedUrl,
    setUnsafeRedirect: (value: boolean) => { unsafeRedirect = value; },
    setSourceOffline: (value: boolean) => { sourceOffline = value; },
    advanceClock: (milliseconds: number) => { clock += milliseconds; },
  };
}

function norwayFixture() {
  const shared = strToU8(`<PublicationDelivery><CompositeFrame><frames><SiteFrame><FrameDefaults><DefaultLocale><TimeZone>Europe/Oslo</TimeZone></DefaultLocale></FrameDefaults></SiteFrame><ServiceFrame><dayTypeAssignments><DayTypeAssignment><DayTypeRef ref="BRA:DayType:daily"/><OperatingDayRef ref="BRA:OperatingDay:2026-11-12"/></DayTypeAssignment></dayTypeAssignments><scheduledStopPoints><ScheduledStopPoint id="BRA:Stop:A"><Name>Drammen</Name></ScheduledStopPoint><ScheduledStopPoint id="BRA:Stop:B"><Name>Oslo</Name></ScheduledStopPoint></scheduledStopPoints></ServiceFrame></frames></CompositeFrame></PublicationDelivery>`);
  const line = strToU8(`<PublicationDelivery><Line id="BRA:Line:6001"><Name>Drammen – Oslo</Name><PublicCode>6001</PublicCode><TransportMode>bus</TransportMode></Line><JourneyPattern id="BRA:JourneyPattern:1"><pointsInSequence><StopPointInJourneyPattern id="BRA:Point:1"><ScheduledStopPointRef ref="BRA:Stop:A"/><ForBoarding>true</ForBoarding><ForAlighting>true</ForAlighting></StopPointInJourneyPattern><StopPointInJourneyPattern id="BRA:Point:2"><ScheduledStopPointRef ref="BRA:Stop:B"/><ForBoarding>true</ForBoarding><ForAlighting>true</ForAlighting></StopPointInJourneyPattern></pointsInSequence></JourneyPattern><ServiceJourney id="BRA:ServiceJourney:1"><JourneyPatternRef ref="BRA:JourneyPattern:1"/><dayTypes><DayTypeRef ref="BRA:DayType:daily"/></dayTypes><passingTimes><TimetabledPassingTime><StopPointInJourneyPatternRef ref="BRA:Point:1"/><ArrivalTime>08:30:00</ArrivalTime><DepartureTime>08:30:00</DepartureTime></TimetabledPassingTime><TimetabledPassingTime><StopPointInJourneyPatternRef ref="BRA:Point:2"/><ArrivalTime>09:15:00</ArrivalTime><DepartureTime>09:15:00</DepartureTime></TimetabledPassingTime></passingTimes></ServiceJourney></PublicationDelivery>`);
  const bytes = zipSync({
    "BRA_BRA-Line-9999_9999_Other.xml": strToU8("x".repeat(1_000_000)),
    "BRA_BRA-Line-1001_6001_Drammen.xml": line,
    "_BRA_shared_data.xml": shared,
  }, { level: 0 });
  const requests: string[] = [];
  let offline = false;
  let clock = NOW;
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url === "https://api.entur.io/timetable-public/v1/timetable-import-info/import_date") {
      const updated = "2026-11-11T23:00:00Z";
      return Response.json({ bra: updated, rut: updated, goa: updated, sjn: updated, vyg: updated, flt: updated });
    }
    if (url.includes("nominatim.openstreetmap.org/search")) return Response.json([{
      lat: "59.7439", lon: "10.2045", name: "Drammen", display_name: "Drammen, Buskerud, Norway",
      class: "place", type: "city", address: { country_code: "no", county: "Buskerud" },
    }]);
    if (url === "https://storage.googleapis.com/marduk-production/outbound/netex/rb_bra-aggregated-netex.zip") {
      if (offline) throw new Error("Entur archive unavailable");
      const range = new Headers(init?.headers).get("range");
      if (!range) throw new Error("The complete NetEx archive must never be downloaded");
      requests.push(range);
      const suffix = range.match(/^bytes=-(\d+)$/);
      const part = range.match(/^bytes=(\d+)-(\d+)$/);
      const start = suffix ? Math.max(0, bytes.length - Number(suffix[1])) : Number(part![1]);
      const end = suffix ? bytes.length - 1 : Number(part![2]);
      return new Response(bytes.slice(start, end + 1), { status: 206, headers: {
        "content-range": `bytes ${start}-${end}/${bytes.length}`, etag: '"entur-fixture-v1"',
        "last-modified": "Wed, 11 Nov 2026 23:00:00 GMT",
      } });
    }
    throw new Error(`Unexpected Norway request: ${url}`);
  };
  const metadata = new TransportMetadataCache(() => null, () => clock);
  const client = new NorwayNetexTransportClient(fetcher, () => clock, metadata);
  return {
    client, bytes, requests,
    setOffline: (value: boolean) => { offline = value; },
    advanceClock: (milliseconds: number) => { clock += milliseconds; },
  };
}

function zipPayloadRanges(bytes: Uint8Array) {
  const buffer = Buffer.from(bytes);
  const ranges = new Map<string, [number, number]>();
  for (let offset = 0; offset + 30 < buffer.length && buffer.readUInt32LE(offset) === 0x04034b50;) {
    const compressed = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const name = buffer.subarray(offset + 30, offset + 30 + nameLength).toString("utf8").toLowerCase();
    const start = offset + 30 + nameLength + extraLength;
    ranges.set(name, [start, start + compressed - 1]);
    offset = start + compressed;
  }
  return ranges;
}

test("national selectors use published static feeds and expose actual GTFS modes", async () => {
  for (const territory of ["ie", "lu", "ch"] as const) {
    const { client } = fixture(territory);
    const expectedTimezone = territory === "ie" ? "Europe/Dublin" :
      territory === "lu" ? "Europe/Luxembourg" : "Europe/Zurich";
    const place = territory === "ie" ? "Dublin" : territory === "lu" ? "Luxembourg" : "Zürich";
    const catalog = await client.getCatalog();
    assert.equal(catalog.length, 1);
    assert.equal(catalog[0]!.territory, territory);
    assert.equal(catalog[0]!.resources.length, 1, "no unvalidated real-time resource is advertised");
    assert.match(catalog[0]!.licence, territory === "ch" ? /conditions d’utilisation/i : /CC BY/i);
    if (territory === "ch") {
      assert.match(catalog[0]!.resources[0]!.title, /20261111/);
      assert.match(catalog[0]!.limitations!.join(" "), /deux fois par semaine/);
    }
    assert.deepEqual((await client.availableModes()).sort(), ["bus", "rail"]);
    const city = (await client.municipalities(place))[0]!;
    assert.equal(city.territory, territory);
    const networks = await client.networks(city, "bus");
    assert.equal(networks.length, 1);
    assert.deepEqual(networks[0]!.modes?.sort(), ["bus", "rail"]);
    const browser = new TransportBrowserClient(undefined, () => NOW, undefined, undefined, undefined,
      territory === "ie" ? client : undefined, territory === "lu" ? client : undefined,
      territory === "ch" ? client : undefined);
    const actualCity = (await browser.cities(place, territory, "bus"))[0]!;
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
    assert.match(result.source.attribution ?? "",
      territory === "ch" ? /conditions d’utilisation/i : /CC BY/i);
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

test("Switzerland's national ZIP is read by ranges and rejects untrusted storage redirects", async () => {
  const { client, requests, setUnsafeRedirect } = fixture("ch");
  const resource = (await client.getCatalog())[0]!.resources[0]!;
  await client.referenceRoutes(resource);
  await client.referenceStops(resource);
  assert.ok(requests.length > 2);
  assert.ok(requests.every(range => range.startsWith("bytes=")));

  const { client: unsafeClient, requests: unsafeRequests, setUnsafeRedirect: setUnsafe } = fixture("ch");
  setUnsafe(true);
  await assert.rejects(unsafeClient.getCatalog(), /non autorisée/);
  assert.deepEqual(unsafeRequests, [], "the downloader must not request a redirect outside the official storage host");
});

test("stale Swiss route metadata remains available while a background refresh fails", async () => {
  const { client, setSourceOffline, advanceClock } = fixture("ch");
  const resource = (await client.getCatalog())[0]!.resources[0]!;
  const routes = await client.referenceRoutes(resource);
  assert.equal(routes.length, 2);
  advanceClock(7 * 60 * 60_000);
  setSourceOffline(true);
  assert.deepEqual(await client.referenceRoutes(resource), routes);
  await new Promise(resolve => setTimeout(resolve, 2_100));
  assert.deepEqual(await client.referenceRoutes(resource), routes);
});

test("Norway selects published Entur modes and reads one NeTEx line on demand", async () => {
  const { client, bytes, requests } = norwayFixture();
  const browser = new TransportBrowserClient(undefined, () => NOW, undefined, undefined, undefined,
    undefined, undefined, undefined, client);
  assert.ok(browser.territories.includes("no"));
  assert.equal(parseTransportCommand(["Norvège", "Drammen"]).territory, "no");
  assert.equal(modeName("rail", "no"), "Train");
  assert.deepEqual((await browser.availableModes("no")).sort(), ["bus", "metro", "rail", "tram"]);
  const city = (await browser.cities("Drammen", "no", "bus"))[0]!;
  assert.equal(city.area, "Buskerud");
  const networks = await browser.networks(city, "bus");
  assert.deepEqual(networks.map(network => network.title), ["Brakar"]);
  const listing = await browser.lines(city, "bus", "6001", networks[0]!.id);
  assert.equal(listing.lines.length, 1);
  const line = listing.lines[0]!;
  assert.equal(line.label, "6001");
  assert.equal(line.territory, "no");
  assert.equal(line.source.attribution, "Entur · export NeTEx · licence NLOD");
  assert.equal(line.realtime.length, 0);
  const index = await browser.index(line);
  assert.equal(index.metadata.timezone, "Europe/Oslo");
  assert.equal(index.visits.size, 1);
  const result = await browser.departures(line, index,
    { label: "Drammen", ids: ["BRA:Stop:A"] }, { label: "Oslo", ids: ["BRA:Stop:B"] }, "fr");
  assert.match(result.content, /Horaires théoriques/);
  assert.match(result.source.limitations!.join(" "), /aucun temps réel/i);
  const decoy = zipPayloadRanges(bytes).get("bra_bra-line-9999_9999_other.xml")!;
  const readsDecoy = requests.some(range => {
    const bounds = range.match(/^bytes=(\d+)-(\d+)$/);
    if (!bounds) return false; // ZIP directory discovery reads the standard trailing ZIP window.
    const start = Number(bounds[1]);
    const end = Number(bounds[2]);
    return start <= decoy[1] && end >= decoy[0];
  });
  assert.equal(readsDecoy, false, "the other line's ZIP member body is never fetched");
});

test("stale Norway journey schedules survive failed background refreshes", async () => {
  const { client, setOffline, advanceClock } = norwayFixture();
  const resource = (await client.getCatalog()).find(dataset => dataset.id === "no:entur:bra")!.resources[0]!;
  const routes = await client.referenceRoutes(resource);
  const route = routes.find(item => item.shortName === "6001")!;
  const fresh = await client.journeyIndex(resource, route.routeId, "bus");
  assert.ok(fresh.visits.size);

  advanceClock(25 * 60 * 60_000);
  setOffline(true);
  const stale = await client.journeyIndex(resource, route.routeId, "bus");
  assert.equal(stale.metadata.timezone, "Europe/Oslo");
  assert.match(stale.sourceWarning ?? "", /copie d’horaire en cache/i);
  assert.ok(stale.visits.size);
  await new Promise(resolve => setTimeout(resolve, 2_100));
  const retained = await client.journeyIndex(resource, route.routeId, "bus");
  assert.equal(retained.metadata.timezone, "Europe/Oslo");
  assert.deepEqual([...retained.visits], [...fresh.visits]);
});

test("Ireland area browsing lists provinces and counties without treating towns as counties", () => {
  assert.deepEqual(IRELAND_PROVINCES, ["Connacht", "Leinster", "Munster", "Ulster"]);
  assert.equal(IRELAND_COUNTIES.length, 26);
  assert.deepEqual(IRELAND_PROVINCES.map(province => irelandCounties(province).length), [5, 12, 6, 3]);
  assert.equal(irelandCountyFromSearch("Cork"), undefined, "a city search must remain a city search");
  assert.equal(irelandCountyFromSearch("County Cork")?.code, "IE-CO");
  assert.equal(irelandCountyFromSearch("County Ofaly en Irlande")?.code, "IE-OY");
  assert.equal(irelandCountyFromSearch("County Offaly")?.code, "IE-OY");
});

test("Irish county routes are filtered by stops inside the verified boundary", async () => {
  const { client } = fixture("ie");
  const dataset = (await client.getCatalog())[0]!;
  const region = client.region("County Dublin");
  assert.equal(region?.parentName, "Leinster");
  assert.equal(region?.territory, "ie");
  const routes = await client.routesInRegion(dataset.resources[0]!, region!, "bus");
  assert.deepEqual(routes.map(route => route.routeId), ["B1"]);
  assert.deepEqual(routes[0]!.stopIds, ["A"]);

  const browser = new TransportBrowserClient(undefined, () => NOW, undefined, undefined, undefined, client);
  const networks = await browser.regionNetworks(region!, "bus");
  const listing = await browser.regionLines(networks[0]!, "bus", "", region!);
  assert.equal(listing.lines.length, 1);
  assert.equal(listing.lines[0]!.selection?.routeId, "B1");
  const index = await browser.index(listing.lines[0]!);
  assert.ok(index.stops.has("B"), "choosing a county lists the line, but keeps its stops outside the county too");
});

test("boundary containment handles polygons, holes, and multiple disjoint parts", () => {
  const polygon = { type: "Polygon" as const, coordinates: [[
    [0, 0], [10, 0], [10, 10], [0, 10], [0, 0],
  ], [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]] };
  assert.equal(boundaryContains(polygon, 2, 2), true);
  assert.equal(boundaryContains(polygon, 5, 5), false);
  assert.equal(boundaryContains(polygon, 12, 5), false);
  const multi = { type: "MultiPolygon" as const, coordinates: [
    [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
    [[[3, 3], [4, 3], [4, 4], [3, 4], [3, 3]]],
  ] };
  assert.equal(boundaryContains(multi, 3.5, 3.5), true);
});

test("territory prefixes and mode labels include the national additions", () => {
  assert.equal(parseTransportCommand(["Irlande", "Dublin", "B1"]).territory, "ie");
  assert.equal(parseTransportCommand(["Luxembourg", "Esch-sur-Alzette"]).territory, "lu");
  assert.equal(parseTransportCommand(["Suisse", "Zürich", "S12"]).territory, "ch");
  assert.equal(parseTransportCommand(["Norvège", "Drammen"]).territory, "no");
  assert.equal(parseTransportCommand(["Lettonie", "Rīga"]).territory, "lv");
  assert.equal(parseTransportCommand(["Tchéquie", "Praha"]).territory, "cz");
  assert.equal(parseTransportCommand(["Portugal", "Lisboa"]).territory, "pt");
  assert.equal(parseTransportCommand(["Australie", "Brisbane"]).territory, "au");
  assert.equal(parseTransportCommand(["Ukraine", "Lviv"]).territory, "ua");
  assert.equal(modeName("rail", "ie"), "Train");
  assert.equal(modeName("rail", "lu"), "Train");
  assert.equal(modeName("rail", "ch"), "Train");
  assert.equal(modeName("rail", "no"), "Train");
  assert.deepEqual(new TransportBrowserClient().territories,
    ["fr", "qc", "en", "ie", "lu", "no", "is", "sg", "lv", "cz", "pt", "au", "ua"]);
  assert.equal(nationalTimezoneMatches("ie", "Europe/London"), true);
  assert.equal(nationalTimezoneMatches("lu", "Europe/Berlin"), true);
  assert.equal(nationalTimezoneMatches("lu", "Europe/Paris"), false);
  assert.equal(nationalTimezoneMatches("ch", "Europe/Zurich"), true);
  assert.equal(nationalTimezoneMatches("ch", "Europe/Paris"), false);
});

