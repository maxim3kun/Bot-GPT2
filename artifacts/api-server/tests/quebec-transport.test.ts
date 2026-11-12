import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { zipSync, strToU8 } from "fflate";
import GtfsRealtime from "gtfs-realtime-bindings";
import { QuebecTransportClient } from "../src/discord/quebec-transport.js";
import { FranceTransportClient, sourceButton } from "../src/discord/public-transport.js";
import { TransportBrowserClient, originOptions, arrivalOptions } from "../src/discord/transport-browser.js";
import { buildJourneyIndex, journeyPairs, scheduledJourneys } from "../src/discord/gtfs-journey.js";
import { parseGtfsAlerts } from "../src/discord/gtfs-alerts.js";
import { idfmTimeAllowed, stopClosed } from "../src/discord/idfm-live.js";
import { safeQuebecUrl } from "../src/discord/quebec-sources.js";
import { handleTransportCommand, parseTransportCommand } from "../src/discord/transport-menu.js";

const NOW = Date.parse("2026-11-11T11:00:00Z");
const geo = (name = "Montréal", id = "MTL", concise = "CITY") => ({
  id, name, category: "O", concise: { code: concise }, province: { code: "24" }, location: "Montréal; Montréal",
  latitude: 45.51, longitude: -73.56,
});
function zip(timezone = "America/Montreal", extra: Record<string, string> = {}) {
  return zipSync(Object.fromEntries(Object.entries({
    "agency.txt": `agency_id,agency_name,agency_timezone\nS,Test,${timezone}\n`,
    "routes.txt": "route_id,route_short_name,route_long_name,route_type\nR,1,11 - Official route,3\n",
    "trips.txt": "route_id,service_id,trip_id\nR,S,T\n",
    "stops.txt": "stop_id,stop_name,stop_lat,stop_lon,parent_station\nO,Origin,45.51,-73.56,\nD,Destination,45.52,-73.56,\n",
    "stop_times.txt": "trip_id,arrival_time,departure_time,stop_id,stop_sequence\nT,06:10:00,06:10:00,O,1\nT,06:20:00,06:20:00,D,2\n",
    "calendar.txt": "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nS,1,1,1,1,1,1,1,20260101,20261231\n",
    ...extra,
  }).map(([name, value]) => [name, strToU8(value)])));
}
const dataset = (name = "test-network", title = "Test Québec") => ({
  id: "source", name, title, license_id: "cc-by", organization: { title: "Official operator" },
  resources: [{ id: "feed", name: "Current GTFS", format: "GTFS",
    url: "https://www.donneesquebec.ca/recherche/dataset/test/download/current.zip", last_modified: "2026-11-01" }],
});
function providerFixture(options: { items?: object[]; datasets?: object[]; failFeed?: boolean; bytes?: Uint8Array } = {}) {
  const calls: Array<{ url: URL; headers: Headers }> = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input)), headers = new Headers(init?.headers);
    assert(!headers.has("apikey") && !headers.has("authorization"), "French credentials must never leave for Québec");
    calls.push({ url, headers });
    if (url.pathname.includes("/api/3/action/package_search"))
      return Response.json({ success: true, result: { count: (options.datasets ?? [dataset()]).length,
        results: options.datasets ?? [dataset()] } });
    if (url.hostname === "geogratis.gc.ca") {
      assert.equal(url.searchParams.get("province"), "24");
      return Response.json({ items: options.items ?? [geo()] });
    }
    if (options.failFeed) return new Response("Unavailable", { status: 503 });
    return new Response(options.bytes ?? zip(), { headers: { "last-modified": "Sun, 01 Nov 2026 00:00:00 GMT" } });
  };
  const client = new QuebecTransportClient(fetcher, () => NOW);
  return { client, calls, fetcher };
}

test("Québec geocoding uses official populated places, excludes other provinces and deduplicates records", async () => {
  const fixture = providerFixture({ items: [geo(), geo("Montréal", "UNP", "UNP"), geo("Montréal-Nord", "N"),
    { ...geo("Montréal", "OTHER"), province: { code: "35" } }, { ...geo("Montréal", "OLD"), category: "H" }] });
  const cities = await fixture.client.municipalities("Montréal");
  assert.equal(cities.length, 1);
  assert.equal(cities[0]!.id, "qc:MTL");
  assert.equal(cities[0]!.territory, "qc");
  assert.match(cities[0]!.label, /Québec/);
  await fixture.client.municipalities("Montréal");
  assert.equal(fixture.calls.length, 1);
});

test("catalogue discovery retains static feeds with misleading titles and rejects historic/HTML/ferry feeds", async () => {
  const historical = dataset("transport-collectif_avant20221219");
  const ferry = dataset("stq-gtfs-pour-les-traverses");
  const rt = dataset("stm-bus-temps-reel-gtfs-realtime");
  const html = dataset("needs-access"); html.resources[0]!.url = "https://www.stm.info/developers";
  const { client } = providerFixture({ datasets: [dataset("gtsf", "Bus en temps réel (GTFS)"), historical, ferry, rt, html] });
  const catalog = await client.getCatalog();
  assert(catalog.some(d => d.slug === "gtsf"));
  assert(!catalog.some(d => /avant20|travers|gtfs-realtime/.test(d.slug)));
  assert.equal(catalog.find(d => d.slug === "needs-access")!.resources.length, 0);
  assert.match(catalog.find(d => d.slug === "needs-access")!.limitations![0]!, /domaine vérifié/);
  assert(catalog.some(d => d.slug === "saguenay" && !d.resources.length));
  assert(catalog.some(d => d.slug === "via" && d.modes!.includes("rail")));
  assert(catalog.every(d => d.resources.every(r => r.id < 0)));
  assert.deepEqual((await client.getCatalog()).map(d => d.id), catalog.map(d => d.id));
});

test("all resource redirects are revalidated, unknown domains, insecure URLs and credentials are rejected", async () => {
  for (const url of ["http://www.stm.info/file.zip", "https://localhost/a", "https://www.stm.info.evil.test/a",
    "https://user:password@www.stm.info/a", "https://www.stm.info:8080/a", "https://127.0.0.1/a"])
    assert.throws(() => safeQuebecUrl(url));
  assert.equal(safeQuebecUrl("https://gtfs.sts.qc.ca:8443/gtfsrt/Alerts.pb").port, "8443");
  assert.equal(safeQuebecUrl("https://old.rtl-longueuil.qc.ca/transit/latestfeed/RTL.zip").hostname, "old.rtl-longueuil.qc.ca");
  let count = 0;
  const client = new QuebecTransportClient(async () => {
    count++; return new Response(null, { status: 302, headers: { location: "https://127.0.0.1/private" } });
  });
  await assert.rejects(client.getCatalog(), /Unsupported Québec/);
  assert.equal(count, 1);
  assert(sourceButton({ name: "VIA", url: "https://www.viarail.ca/en/developer-resources" }, "fr").length);
  assert.equal(sourceButton({ name: "Bad", url: "https://evil.test/" }, "fr").length, 0);
});

test("a selected Québec network loads only its own stops, schedules and source timezone", async () => {
  const { client: qc, calls } = providerFixture();
  const fr = new FranceTransportClient(async () => { throw Error("French provider must not be called"); });
  const browser = new TransportBrowserClient(fr, () => NOW, undefined, qc);
  const city = (await browser.cities("Montréal", "qc"))[0]!;
  const networks = await browser.networks(city, "bus");
  assert.equal(calls.filter(c => c.url.pathname.endsWith(".zip")).length, 0, "discovery must not download every network");
  await assert.rejects(browser.lines(city, "bus"), /Select a Québec/);
  const chosen = networks.find(d => d.slug === "test-network")!;
  const listing = await browser.lines(city, "bus", "", chosen.id);
  assert.equal(listing.lines.length, 1);
  const line = listing.lines[0]!, index = await browser.index(line);
  assert.equal(line.territory, "qc");
  assert.equal(index.metadata.timezone, "America/Montreal");
  const origin = originOptions(index, line)[0]!, arrival = arrivalOptions(index, origin)[0]!;
  const result = await browser.departures(line, index, origin, arrival, "fr");
  assert.match(result.content, /06:10.*06:20/);
  assert.match(result.content, /non temps réel.*America\/Montreal/);
  assert.match(result.content, /mise à jour 31\/10\/2026/); // midnight UTC is still October in the source zone
  assert(calls.every(c => c.url.hostname !== "prim.iledefrance-mobilites.fr"));
  assert.equal((await browser.lines(city, "bus", "11", chosen.id)).lines[0]!.label, "1",
    "a public route number can be an explicit prefix of the official long name");
});

test("France and Québec never share line or journey caches even when source and city identifiers collide", async () => {
  const { client: qc } = providerFixture();
  const qcDataset = (await qc.getCatalog()).find(d => d.slug === "test-network")!;
  const qcResource = qcDataset.resources[0]!;
  const frBytes = zip("Europe/Paris");
  const frProvider = {
    getCatalog: async () => [{ ...qcDataset, id: "fr:source", territory: "fr" as const,
      resources: [{ ...qcResource }] }],
    municipalities: async () => [],
    nearbyStops: async () => ({ features: [{ properties: { resource_id: qcResource.id, stop_id: "O", location_type: 0 } }] }),
    staticFeed: async () => frBytes, realtimeFeed: async () => new Uint8Array(),
  };
  const browser = new TransportBrowserClient(frProvider, () => NOW, undefined, qc);
  const city = (await browser.cities("Montréal", "qc"))[0]!;
  const qcLine = (await browser.lines(city, "bus", "", qcDataset.id)).lines[0]!;
  const qcIndex = await browser.index(qcLine);
  const frLine = (await browser.lines({ ...city, territory: "fr" }, "bus")).lines[0]!;
  const frIndex = await browser.index(frLine);
  assert.equal(qcLine.resource.id, frLine.resource.id);
  assert.notStrictEqual(qcIndex, frIndex);
  assert.equal(frIndex.metadata.timezone, "Europe/Paris");
  assert.equal(qcIndex.metadata.timezone, "America/Montreal");
  assert.strictEqual(await browser.index(qcLine), qcIndex);
});

test("an expired service calendar is disclosed even when the file itself has a recent modification date", async () => {
  const bytes = zip("America/Montreal", {
    "calendar.txt": "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nS,1,1,1,1,1,1,1,20200101,20200131\n",
  });
  const { client: qc } = providerFixture({ bytes });
  const browser = new TransportBrowserClient(undefined, () => NOW, undefined, qc);
  const city = (await browser.cities("Montréal", "qc"))[0]!;
  const line = (await browser.lines(city, "bus", "", "qc:source")).lines[0]!;
  const index = await browser.index(line), origin = originOptions(index, line)[0]!;
  const arrival = arrivalOptions(index, origin)[0]!;
  assert.match(index.sourceWarning!, /périmées.*31\/01\/2020/);
  const result = await browser.departures(line, index, origin, arrival, "fr");
  assert.match(result.content, /Données périmées/);
  assert.doesNotMatch(result.embed!.fields![0]!.value, /06:10/);
});

test("oversized public feeds are rejected before reading their bodies", async () => {
  const client = new QuebecTransportClient(async () => new Response("not a large allocation",
    { headers: { "content-length": "999999999" } }));
  await assert.rejects(client.realtimeFeed({ id: -1, title: "Test", format: "gtfs-rt",
    is_available: true, url: "https://gtfs.sts.qc.ca:8443/gtfsrt/tripUpdates.pb" }), /oversized/);
});

test("failed feeds are explicitly reported and do not imply no actual transport service", async () => {
  const { client: qc } = providerFixture({ failFeed: true });
  const browser = new TransportBrowserClient(undefined, () => NOW, undefined, qc);
  const city = (await browser.cities("Montréal", "qc"))[0]!;
  const result = await browser.lines(city, "bus", "", "qc:source");
  assert.equal(result.lines.length, 0);
  assert.equal(result.unavailable, 1);
});

test("source IANA zones, service exceptions and exact/non-exact frequency data remain distinct", async () => {
  const frequencies = "trip_id,start_time,end_time,headway_secs,exact_times\nT,06:00:00,07:00:00,600,";
  const exact = await buildJourneyIndex(zip("America/Montreal", { "frequencies.txt": frequencies + "1\n" }), "R");
  const pairs = journeyPairs(exact, new Set(["O"]), new Set(["D"]));
  const times = scheduledJourneys(exact, pairs, NOW / 1000, 1).filter(t => t.serviceDate === "20261111");
  assert.equal(times.length, 6);
  assert.equal(times[0]!.departureAt, NOW / 1000);
  const approximate = await buildJourneyIndex(zip("America/Montreal", { "frequencies.txt": frequencies + "0\n" }), "R");
  assert.equal(scheduledJourneys(approximate, journeyPairs(approximate, new Set(["O"]), new Set(["D"])), NOW / 1000).length, 0);
  exact.metadata.calendarExceptions.set("20261111:S", 2);
  assert(!scheduledJourneys(exact, pairs, NOW / 1000).some(t => t.serviceDate === "20261111"));
  const eastern = await buildJourneyIndex(zip("America/Blanc-Sablon"), "R");
  assert.equal(scheduledJourneys(eastern, journeyPairs(eastern, new Set(["O"]), new Set(["D"])), NOW / 1000 - 3600)[0]!.departureAt,
    NOW / 1000 - 3000);
});

test("Canadian daylight-saving transitions use source dates and not a fixed France offset", async () => {
  const index = await buildJourneyIndex(zip("America/Montreal", {
    "stop_times.txt": "trip_id,arrival_time,departure_time,stop_id,stop_sequence\nT,00:50:00,00:50:00,O,1\nT,02:10:00,02:10:00,D,2\n",
  }), "R");
  const pair = journeyPairs(index, new Set(["O"]), new Set(["D"]));
  const time = scheduledJourneys(index, pair, Date.parse("2026-11-01T04:49:00Z") / 1000)[0]!;
  assert.equal(time.arrivalAt! - time.departureAt, 140 * 60);
});

test("GTFS alerts respect route, stop, trip, active periods, stale data and protobuf optional-field presence", async () => {
  const index = await buildJourneyIndex(zip(), "R"), now = NOW / 1000;
  const bytes = (timestamp: number, informedEntity: object[]) => GtfsRealtime.transit_realtime.FeedMessage.encode({
    header: { gtfsRealtimeVersion: "2.0", timestamp }, entity: [{ id: "alert", alert: {
      effect: 1, informedEntity, activePeriod: [{ start: now, end: now + 3600 }],
      headerText: { translation: [{ language: "fr", text: "Arrêt fermé" }] },
    } }],
  } as never).finish();
  const time = { tripId: "T", departureAt: now + 600, arrivalAt: now + 1200, departureStopId: "O", arrivalStopId: "D", realtime: true };
  const closed = parseGtfsAlerts(bytes(now, [{ routeId: "R", stopId: "D" }]), index, now);
  assert(stopClosed(closed, index, "D", now));
  assert(!stopClosed(closed, index, "O", now));
  assert(!idfmTimeAllowed(closed, index, time, ["O"], ["D"]));
  assert.equal(parseGtfsAlerts(bytes(now, [{ routeId: "OTHER", stopId: "D" }]), index, now).rules.length, 0);
  const trip = parseGtfsAlerts(bytes(now, [{ trip: { tripId: "T" } }]), index, now);
  assert(!stopClosed(trip, index, "D", now), "one cancelled trip does not close the whole station");
  assert(!idfmTimeAllowed(trip, index, time, ["O"], ["D"]));
  assert(idfmTimeAllowed(trip, index, { ...time, tripId: "ANOTHER" }, ["O"], ["D"]));
  assert(!parseGtfsAlerts(bytes(now - 481, [{ routeId: "R" }]), index, now).available);
});

test("territory markers are optional and the city Québec is never stripped as a country flag", () => {
  assert.equal(parseTransportCommand(["Québec"]).place, "Québec");
  assert.equal(parseTransportCommand(["qc", "Montréal", "ligne", "1"]).territory, "qc");
  assert.equal(parseTransportCommand(["fr", "Paris", "8"]).place, "Paris");
  assert.equal(parseTransportCommand(["qc", "Montréal", "vers", "Laval", "11"]).direction, "Laval");
});

function discordFixture() {
  const collector = new EventEmitter() as EventEmitter & { stop: (reason: string) => void };
  collector.stop = reason => collector.emit("end", [], reason);
  const prompt = { content: "", components: [] as any[], embeds: [] as any[],
    async edit(options: any) {
      if (options.content != null) this.content = options.content;
      if (options.embeds) this.embeds = options.embeds;
      if (options.components) this.components = options.components.map((r: any) => r.toJSON?.() ?? r);
      assert(this.components.length <= 5);
      assert(this.components.every(r => r.components.length <= 5 && r.components.every((c: any) => !c.options || c.options.length <= 25)));
      return this;
    }, createMessageComponentCollector: () => collector };
  const message = { channelId: `test-${Math.random()}`, author: { id: "owner" },
    async reply(options: any) { return prompt.edit(options); } };
  const find = (action: string) => prompt.components.flatMap(r => r.components).find(c => c.custom_id?.endsWith(`:${action}`));
  const click = async (action: string, value?: string) => {
    const component = find(action); assert(component, `Missing ${action}: ${prompt.content}`);
    collector.emit("collect", { customId: component.custom_id, user: { id: "owner" }, values: value == null ? [] : [value],
      isButton: () => value == null, isStringSelectMenu: () => value != null, async deferUpdate() {}, async reply() {} });
    await delay(20);
  };
  return { prompt, message, find, click, collector };
}
test("Discord resolves city homonyms before asking for territory and retains Québec through refresh", async () => {
  const { client: qc } = providerFixture();
  const service = new TransportBrowserClient(undefined, () => NOW, undefined, qc), calls: string[] = [];
  const original = service.cities.bind(service);
  service.cities = (place, territory) => { calls.push(territory!); return original(place, territory); };
  const ui = discordFixture();
  const wait = async (predicate: () => boolean) => {
    for (let i = 0; i < 200 && !predicate(); i++) await delay(5);
    assert(predicate(), `Menu state not reached: ${ui.prompt.content}`);
  };
  await handleTransportCommand(ui.message as never, ["Montréal"], "fr", "!", "bus", service);
  assert.match(ui.prompt.content, /Choisis le territoire/);
  assert.deepEqual(ui.find("choose").options.map((option: any) => option.value),
    ["fr", "qc", "en", "ie", "lu", "ch", "no", "is", "sg", "lv", "cz", "pt", "au", "ua"]);
  assert.deepEqual(calls, ["fr", "qc"], "only the two public place gazetteers are queried to resolve a homonym");
  await ui.click("choose", "qc");
  assert.match(ui.prompt.content, /Choisis un réseau/);
  assert.deepEqual(calls, ["fr", "qc", "qc"]);
  const choice = ui.find("choose").options.find((c: any) => c.label === "Test Québec");
  await ui.click("choose", choice.value);
  await wait(() => ui.prompt.content.includes("Choisis une ligne"));
  await ui.click("choose", "0");
  await wait(() => ui.prompt.content.includes("arrêt d’arrivée"));
  await ui.click("choose", "0");
  await wait(() => ui.prompt.embeds.length > 0);
  assert.equal(ui.prompt.embeds[0].footer.text.includes("America/Montreal"), true);
  await ui.click("refresh");
  assert.equal(ui.prompt.embeds[0].footer.text.includes("America/Montreal"), true);
  assert.deepEqual(calls, ["fr", "qc", "qc"]);
  assert.equal(ui.find("restart"), undefined);
  ui.collector.stop("cancelled");
});
