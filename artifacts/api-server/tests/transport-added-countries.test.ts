import assert from "node:assert/strict";
import test from "node:test";
import { strToU8, zipSync } from "fflate";
import { NationalGtfsTransportClient, nationalTimezone, nationalTimezoneMatches } from "../src/discord/national-gtfs-transport.js";
import { TransportBrowserClient, arrivalOptions, modeName, originOptions } from "../src/discord/transport-browser.js";
import { TransportMetadataCache, publicMetadata } from "../src/discord/transport-metadata-cache.js";
import { parseTransportCommand } from "../src/discord/transport-command-query.js";

const NOW = Date.parse("2026-11-12T06:00:00Z");
const places = {
  lv: { name: "Rīga", latitude: 56.95, longitude: 24.1, timezone: "Europe/Riga" },
  cz: { name: "Praha", latitude: 50.08, longitude: 14.43, timezone: "Europe/Prague" },
  pt: { name: "Lisboa", latitude: 38.72, longitude: -9.14, timezone: "Europe/Lisbon" },
  au: { name: "Brisbane", latitude: -27.47, longitude: 153.02, timezone: "Australia/Brisbane" },
  ua: { name: "Lviv", latitude: 49.84, longitude: 24.03, timezone: "Europe/Kiev" },
} as const;
type AddedTerritory = keyof typeof places;

const sourceUrls = {
  lvBus: "https://www.atd.lv/sites/default/files/GTFS/gtfs-latvia-lv.zip",
  lvRail: "https://vivi.lv/uploads/GTFS.zip",
  cz: "https://data.pid.cz/PID_GTFS.zip",
  pt: "https://dados.gov.pt/s/resources/gtfs-do-metropolitano-de-lisboa/20261026-150924-d399cedf/googletransit.zip",
  seq: "https://gtfsrt.api.translink.com.au/GTFS/SEQ_GTFS.zip",
  bow: "https://gtfsrt.api.translink.com.au/GTFS/BOW_GTFS.zip",
  bun: "https://gtfsrt.api.translink.com.au/GTFS/BUN_GTFS.zip",
  cns: "https://gtfsrt.api.translink.com.au/GTFS/CNS_GTFS.zip",
  ua: "https://track.ua-gis.com/gtfs/lviv/static.zip",
} as const;

function feed(timezone: string, routeTypes: number[], latitude: number, longitude: number) {
  const routes = routeTypes.map((type, i) =>
    `R${i + 1},L${i + 1},Route ${i + 1},${type}`).join("\n");
  const trips = routeTypes.map((_, i) => `R${i + 1},daily,T${i + 1},Terminal`).join("\n");
  const times = routeTypes.map((_, i) => `T${i + 1},08:00:00,08:00:00,A,1\nT${i + 1},08:20:00,08:20:00,B,2`).join("\n");
  return zipSync({
    "agency.txt": strToU8(`agency_id,agency_name,agency_timezone\nA,Public transit,${timezone}\n`),
    "routes.txt": strToU8(`route_id,route_short_name,route_long_name,route_type\n${routes}\n`),
    "trips.txt": strToU8(`route_id,service_id,trip_id,trip_headsign\n${trips}\n`),
    "stops.txt": strToU8(`stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station\nA,Origin,${latitude},${longitude},0,\nB,Terminal,${latitude + .001},${longitude + .001},0,\n`),
    "stop_times.txt": strToU8(`trip_id,arrival_time,departure_time,stop_id,stop_sequence\n${times}\n`),
    "calendar.txt": strToU8("service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\ndaily,1,1,1,1,1,1,1,20260101,20271231\n"),
  }, { level: 0 });
}

function ranged(bytes: Uint8Array, range: string | null) {
  if (!range) return new Response(bytes);
  const suffix = range.match(/^bytes=-(\d+)$/);
  const explicit = range.match(/^bytes=(\d+)-(\d+)$/);
  if (!suffix && !explicit) return new Response(null, { status: 416 });
  const start = suffix ? Math.max(0, bytes.length - Number(suffix[1])) : Number(explicit![1]);
  const end = suffix ? bytes.length - 1 : Math.min(bytes.length - 1, Number(explicit![2]));
  if (start >= bytes.length || end < start) return new Response(null, { status: 416 });
  return new Response(bytes.slice(start, end + 1), { status: 206, headers: {
    "content-range": `bytes ${start}-${end}/${bytes.length}`,
    "last-modified": "Wed, 11 Nov 2026 23:00:00 GMT", etag: '"fixture-v1"',
  } });
}

function makeClients() {
  const data = new Map<string, Uint8Array>([
    [sourceUrls.lvBus, feed(places.lv.timezone, [3], places.lv.latitude, places.lv.longitude)],
    [sourceUrls.lvRail, feed(places.lv.timezone, [2], places.lv.latitude, places.lv.longitude)],
    [sourceUrls.cz, feed(places.cz.timezone, [0, 1, 2, 3], places.cz.latitude, places.cz.longitude)],
    [sourceUrls.pt, feed(places.pt.timezone, [1], places.pt.latitude, places.pt.longitude)],
    [sourceUrls.seq, feed(places.au.timezone, [0, 2, 3], places.au.latitude, places.au.longitude)],
    [sourceUrls.bow, feed(places.au.timezone, [3], places.au.latitude, places.au.longitude)],
    [sourceUrls.bun, feed(places.au.timezone, [3], places.au.latitude, places.au.longitude)],
    [sourceUrls.cns, feed(places.au.timezone, [3], places.au.latitude, places.au.longitude)],
    [sourceUrls.ua, feed(places.ua.timezone, [0, 3], places.ua.latitude, places.ua.longitude)],
  ]);
  const translinkResources = [
    ["South East Queensland - general transit feed specification", sourceUrls.seq],
    ["Bowen—general transit feed specification", sourceUrls.bow],
    ["Bundaberg—general transit feed specification", sourceUrls.bun],
    ["Cairns—general transit feed specification", sourceUrls.cns],
  ].map(([name, url]) => ({ name, url, format: "ZIP" }));
  const clients = {} as Record<AddedTerritory, NationalGtfsTransportClient>;
  const fullFeedRequests = new Map<AddedTerritory, number>();
  for (const territory of Object.keys(places) as AddedTerritory[]) {
    const location = places[territory];
    let transientLisbonRangeFailures = 1;
    fullFeedRequests.set(territory, 0);
    const fetcher: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.includes("nominatim.openstreetmap.org/search")) return Response.json([{
        lat: String(location.latitude), lon: String(location.longitude), name: location.name,
        display_name: `${location.name}, ${territory}`,
        class: "place", type: "city", address: { country_code: territory },
      }]);
      if (url.includes("data.gov.lv/dati/api/3/action/package_show?id=atd-gtfs")) {
        return Response.json({ success: true, result: { license_title: "CC0 1.0", metadata_modified: "2026-11-12",
          resources: [{ url: sourceUrls.lvBus }] } });
      }
      if (url.includes("data.gov.lv/dati/api/3/action/package_show?id=iekszemes-dzelzcela")) {
        return Response.json({ success: true, result: { license_title: "CC0 1.0", metadata_modified: "2026-11-12",
          resources: [{ url: sourceUrls.lvRail }] } });
      }
      if (url === "https://dados.gov.pt/api/1/datasets/gtfs-do-metropolitano-de-lisboa/") {
        return Response.json({ title: "Lisbon Metro", license: "cc-by",
          resources: [{ url: sourceUrls.pt }, { url: "https://dados.gov.pt/s/resources/other-feed/older.zip" }] });
      }
      if (url.includes("data.qld.gov.au/api/3/action/package_show")) {
        return Response.json({ success: true, result: { license_title: "Creative Commons Attribution 4.0",
          metadata_modified: "2026-11-11", resources: translinkResources } });
      }
      if (url.includes("data.gov.ua/api/3/action/package_show")) {
        return Response.json({ success: true, result: { license_title: "Creative Commons Attribution",
          metadata_modified: "2026-11-12", resources: [{ url: "http://track.ua-gis.com/gtfs/lviv/static.zip" }] } });
      }
      const bytes = data.get(url);
      if (bytes) {
        const range = new Headers(init?.headers).get("range");
        if (!range) fullFeedRequests.set(territory, fullFeedRequests.get(territory)! + 1);
        if (territory === "pt" && range && transientLisbonRangeFailures-- > 0) {
          return new Response(null, { status: 500 });
        }
        return ranged(bytes, range);
      }
      throw new Error(`Unexpected source request: ${url}`);
    };
    clients[territory] = new NationalGtfsTransportClient(territory, fetcher, () => NOW,
      new TransportMetadataCache(() => null, () => NOW));
  }
  return { clients, fullFeedRequests };
}

test("five additional territory feeds are licensed, scoped, and wired into search", async () => {
  const { clients, fullFeedRequests } = makeClients();
  const browser = new TransportBrowserClient(undefined, () => NOW, undefined, undefined, undefined,
    undefined, undefined, undefined, undefined, undefined, undefined,
    clients.lv, clients.cz, clients.pt, clients.au, clients.ua);
  assert.deepEqual(browser.territories.slice(-5), ["lv", "cz", "pt", "au", "ua"]);
  const cases: Array<{ territory: AddedTerritory; mode: "bus" | "metro" | "tram" | "rail"; routeType: number }> = [
    { territory: "lv", mode: "bus", routeType: 3 },
    { territory: "cz", mode: "metro", routeType: 1 },
    { territory: "pt", mode: "metro", routeType: 1 },
    { territory: "au", mode: "rail", routeType: 2 },
    { territory: "ua", mode: "tram", routeType: 0 },
  ];
  for (const { territory, mode, routeType } of cases) {
    assert.equal(parseTransportCommand([territory, places[territory].name]).territory, territory);
    assert.equal(modeName("rail", territory), "Train");
    assert.equal(nationalTimezone(territory), territory === "ua" ? "Europe/Kyiv" : places[territory].timezone);
    assert.ok((await browser.availableModes(territory)).includes(mode));
    const city = (await browser.cities(places[territory].name, territory, mode))[0]!;
    assert.equal(city.territory, territory);
    const networks = await browser.networks(city, mode);
    assert.ok(networks.length > 0, `${territory} should return its published region`);
    assert.ok(networks.every(network => network.licence && network.resources.every(resource =>
      resource.modes?.includes(mode))), "a network must not advertise another feed's modes");
    const resource = networks[0]!.resources[0]!;
    const routes = await clients[territory].referenceRoutes(resource);
    assert.ok(routes.some(route => route.mode === mode), `${territory} GTFS should contain the selected mode`);
    assert.equal(networks[0]!.resources.some(item => /realtime|real time/i.test(item.format)), false);
    const listing = await browser.lines(city, mode, "", networks[0]!.id);
    assert.ok(listing.lines.length, `${territory} should produce a selectable line`);
    const line = listing.lines[0]!;
    const index = await browser.index(line);
    assert.equal(index.metadata.timezone, nationalTimezone(territory));
    const origin = originOptions(index, line)[0];
    assert.ok(origin, `${territory} should expose a valid departure stop`);
    const arrival = arrivalOptions(index, origin!)[0];
    assert.ok(arrival, `${territory} should expose a valid arrival stop`);
    const result = await browser.departures(line, index, origin!, arrival!, "fr");
    assert.match(result.content, /Horaires théoriques/);
    assert.match(result.content, new RegExp(nationalTimezone(territory).replace("/", "\\/")));
    if (territory === "pt") {
      await clients.pt.staticFeed(resource, { mode, routeId: line.routeId });
      await clients.pt.staticFeed(resource, { mode, routeId: line.routeId });
      assert.equal(fullFeedRequests.get("pt"), 1, "the small Lisbon archive is reused from process memory");
    }
  }
  await assert.rejects(browser.networks({ ...places.cz, id: "outside-pid", name: "Brno", label: "Brno", latitude: 49.2,
    longitude: 16.6, territory: "cz" }, "metro"), /ne couvre pas Brno/,
  "PID coverage is restricted to Prague and its surrounding region");
  await assert.rejects(browser.networks({ ...places.pt, id: "outside-lisbon", name: "Porto", label: "Porto",
    latitude: 41.15, longitude: -8.61, territory: "pt" }, "metro"), /ne couvre pas Porto/,
  "the Portuguese source is Lisbon Metro only");
  assert.match((await clients.au.getCatalog()).map(dataset => dataset.title).join(" "), /Brisbane|Queensland|Cairns/);
  assert.match((await clients.ua.getCatalog())[0]!.limitations!.join(" "), /Lviv/);
  assert.equal(nationalTimezoneMatches("ua", "Europe/Kiev"), true);
  assert.equal(nationalTimezoneMatches("ua", "Europe/Paris"), false);
});

test("journey schedules are process-local and excluded from persistent metadata", async () => {
  let collectionRequested = false;
  const cache = new TransportMetadataCache(() => {
    collectionRequested = true;
    return null;
  }, () => NOW);
  const key = { territory: "lv" as const, provider: "test", kind: "journeyIndexes",
    source: "test-route", version: "v1" };
  assert.deepEqual(await cache.staleWhileRevalidateMemory(key, 60_000, 120_000, async () => ({ trips: ["one"] })),
    { value: { trips: ["one"] }, stale: false });
  assert.equal(collectionRequested, false, "schedule reads must not query the Mongo collection");
  assert.throws(() => publicMetadata("journeyIndexes" as never, { trips: ["one"] }),
    /Unsupported persistent transport metadata kind/);
});
