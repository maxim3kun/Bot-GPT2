import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { EmbedBuilder, type Message } from "discord.js";
import { zipSync, strToU8, unzipSync } from "fflate";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { FranceTransportClient } from "../src/discord/public-transport.js";
import { TransportBrowserClient, originOptions, arrivalOptions } from "../src/discord/transport-browser.js";
import { buildJourneyIndex, journeyPairs, realtimeJourneys, scheduledJourneys } from "../src/discord/gtfs-journey.js";
import { handleTransportCommand, parseTransportCommand, transportDeadline } from "../src/discord/transport-menu.js";
import { addConnections } from "../src/discord/gtfs-connections.js";
import { connectedJourneys } from "../src/discord/transport-connections.js";
import { departureCards } from "../src/discord/transport-presentation.js";

const NOW = Date.parse("2026-11-10T07:00:00Z");
const zip = zipSync({
  "agency.txt": strToU8("agency_id,agency_name,agency_timezone\nA,Test,Europe/Paris\n"),
  "routes.txt": strToU8("route_id,route_short_name,route_long_name,route_type\nB,601,Breteuil Amiens,3\nM,A,Métro A,1\n"),
  "trips.txt": strToU8("route_id,service_id,trip_id,trip_headsign\nB,S,B1,Amiens\nB,S,B2,Breteuil\nM,S,M1,Terminus\n"),
  "calendar.txt": strToU8("service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nS,1,1,1,1,1,1,1,20200101,20991231\n"),
  "stops.txt": strToU8("stop_id,stop_name\nO,Breteuil Centre\nX,Gare\nD,Amiens Gare\nP,Capitole\nQ,Jean Jaurès\n"),
  "stop_times.txt": strToU8("trip_id,arrival_time,departure_time,stop_id,stop_sequence\nB1,08:10:00,08:10:00,O,1\nB1,08:20:00,08:20:00,X,2\nB1,09:00:00,09:00:00,D,3\nB2,08:05:00,08:05:00,D,1\nB2,08:40:00,08:40:00,X,2\nB2,09:10:00,09:10:00,O,3\nM1,08:03:00,08:03:00,P,1\nM1,08:05:00,08:05:00,Q,2\n"),
});

test("territory inference selects a unique official place, retains homonym choices, and recognizes London", async () => {
  const france = { municipalities: async (place: string) => place === "Paris"
    ? [{ id: "75056", name: "Paris", label: "Paris — 75", latitude: 48.85, longitude: 2.35, territory: "fr" }]
    : place === "Laval" ? [{ id: "53000", name: "Laval", label: "Laval — Mayenne", latitude: 48.07, longitude: -.77, territory: "fr" }] : [] };
  const quebec = { municipalities: async (place: string) => place === "Laval"
    ? [{ id: "qc:laval", name: "Laval", label: "Laval · Québec", latitude: 45.6, longitude: -73.7, territory: "qc" }] : [] };
  const browser = new TransportBrowserClient(france as any, Date.now, undefined, quebec as any, {} as any);
  assert.equal(await browser.inferTerritory("Paris"), "fr");
  assert.equal(await browser.inferTerritory("Laval"), undefined, "homonyms must keep the country selector");
  assert.equal(await browser.inferTerritory("Londres"), "en");
});

function fixture(failingSource = false, feed = zip) {
  const boxes: number[] = [];
  const dataset = {
    id: "data", title: "Réseau officiel", type: "public-transit", page_url: "https://transport.data.gouv.fr/datasets/test",
    resources: [{ id: 1, title: "GTFS", format: "GTFS", url: "https://transport.data.gouv.fr/test.zip",
      is_available: true, modes: ["bus", "subway"] }],
  };
  const fetcher: typeof fetch = async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "geo.api.gouv.fr" && url.pathname === "/communes") {
      return Response.json([
        { nom: "Breteuil", code: "27112", codeDepartement: "27", codesPostaux: ["27160"],
          centre: { coordinates: [0.91, 48.83] }, departement: { code: "27", nom: "Eure" }, region: { nom: "Normandie" } },
        { nom: "Breteuil", code: "60104", codeDepartement: "60", codesPostaux: ["60120"],
          centre: { coordinates: [2.29, 49.63] }, departement: { code: "60", nom: "Oise" }, region: { nom: "Hauts-de-France" } },
      ]);
    }
    if (url.pathname === "/api/datasets") return Response.json([dataset, ...(failingSource ? [{
      ...dataset, id: "failed", resources: [{ ...dataset.resources[0], id: 2, url: "https://unsupported.example/feed.zip" }],
    }] : [])]);
    if (url.pathname === "/api/gtfs-stops") {
      boxes.push(Number(url.searchParams.get("south")));
      return Response.json({ features: [1, ...(failingSource ? [2] : [])].flatMap((resource) =>
        ["O", "P"].map((id) => ({ properties: { resource_id: resource, stop_id: id, stop_name: id, location_type: 0 } }))) });
    }
    if (url.pathname === "/test.zip") return new Response(feed);
    throw new Error(`Unexpected URL ${url}`);
  };
  const client = new TransportBrowserClient(new FranceTransportClient(fetcher, () => NOW), () => NOW);
  return { client, boxes };
}

test("keeps both Breteuil municipalities and pins the selected coordinates", async () => {
  const { client, boxes } = fixture();
  const cities = await client.cities("Breteuil");
  assert.equal(cities.length, 2);
  assert.match(cities[0]!.label, /Eure/);
  assert.match(cities[1]!.label, /Oise/);
  assert.equal((await client.cities("Breteuil (60)"))[0]!.id, "60104");
  assert.equal((await client.cities("Breteuil 27160"))[0]!.id, "27112");
  const lines = await client.lines(cities[1]!, "bus");
  assert.deepEqual(lines.lines.map((line) => line.label), ["601"]);
  assert.ok(boxes[0]! > 49, "must not re-geocode the chosen municipality into Normandy");
  const index = await client.index(lines.lines[0]!);
  const origins = originOptions(index, lines.lines[0]!);
  assert.equal(origins[0]!.label, "Breteuil Centre");
  const arrivals = arrivalOptions(index, origins[0]!);
  assert.deepEqual(arrivals.map((stop) => stop.label), ["Amiens Gare", "Gare"]);
  const result = await client.departures(lines.lines[0]!, index, origins[0]!, arrivals[0]!, "fr");
  assert.match(result.content, /Horaires théoriques/);
  assert.match(result.content, /08:10/);
  assert.doesNotMatch(result.content, /09:10/);
});

test("metro lines use actual route types and offer only downstream destinations", async () => {
  const { client } = fixture();
  const city = (await client.cities("Breteuil"))[1]!;
  const { lines } = await client.lines(city, "metro");
  assert.deepEqual(lines.map((line) => line.label), ["A"]);
  const index = await client.index(lines[0]!);
  const origins = originOptions(index, lines[0]!);
  assert.deepEqual(arrivalOptions(index, origins[0]!).map((stop) => stop.label), ["Jean Jaurès"]);
  assert.equal(journeyPairs(index, new Set(["Q"]), new Set(["P"])).length, 0);
});

test("a selected IDFM metro line offers boarding stations along the whole line", async () => {
  const { client } = fixture();
  const city = (await client.cities("Breteuil"))[1]!;
  const { lines } = await client.lines(city, "metro");
  const index = await client.index(lines[0]!);
  const line = { ...lines[0]!, nearbyStopIds: [],
    resource: { ...lines[0]!.resource, original_url: "https://eu.ftp.opendatasoft.com/stif/GTFS/IDFM-gtfs.zip" } };
  assert.deepEqual(originOptions(index, line).map(stop => stop.label), ["Capitole"]);
});

test("fresh cancellations and skipped arrivals cannot become successful realtime journeys", async () => {
  const index = await buildJourneyIndex(zip, "B");
  const pairs = journeyPairs(index, new Set(["O"]), new Set(["D"]));
  for (const cancellation of [true, false]) {
    const bytes = GtfsRealtimeBindings.transit_realtime.FeedMessage.encode({
      header: { gtfsRealtimeVersion: "2.0", timestamp: NOW / 1000 },
      entity: [{ id: "1", tripUpdate: { trip: { tripId: "B1", ...(cancellation ? { scheduleRelationship: 3 } : {}) },
        stopTimeUpdate: [{ stopId: "O", departure: { time: NOW / 1000 + 300 } },
          { stopId: "D", scheduleRelationship: 1 }] } }],
    }).finish();
    const result = realtimeJourneys(bytes, pairs, NOW / 1000);
    assert.equal(result.fresh, true);
    assert.ok(result.cancelled.has("B1"));
    assert.equal(result.results.length, 0);
  }
});

test("one failed source leaves usable routes available and identifies the partial result", async () => {
  const { client } = fixture(true);
  const result = await client.lines((await client.cities("Breteuil"))[1]!, "bus");
  assert.equal(result.lines.length, 1);
  assert.equal(result.unavailable, 1);
});

test("recent provider failures are not downloaded again for every nearby-city search", async () => {
  const { client } = fixture(true);
  let failures = 0;
  const download = client.provider.staticFeed.bind(client.provider);
  client.provider.staticFeed = async (resource) => {
    if (resource.id === 2) failures++;
    return download(resource);
  };
  let clock = NOW;
  const measured = new TransportBrowserClient(client.provider, () => clock);
  const city = (await client.cities("Breteuil"))[1]!;
  assert.equal((await measured.lines(city, "bus")).unavailable, 1);
  assert.equal((await measured.lines({ ...city, id: "nearby" }, "bus")).unavailable, 1);
  assert.equal(failures, 1);
  clock += 61_000;
  assert.equal((await measured.lines({ ...city, id: "another" }, "bus")).unavailable, 1);
  assert.equal(failures, 2, "a recovered provider must be retried after the short failure cooldown");
});

test("a numbered-line lookup stops before unrelated failing sources and keeps its own cache", async () => {
  const { client } = fixture(true);
  const catalog = await client.provider.getCatalog();
  // The catalogue need not list the small local operator first.
  client.provider.getCatalog = async () => [...catalog].reverse().map((dataset) => ({
    ...dataset, resources: dataset.resources.map((resource) => ({
      ...resource, metadata: { stats: { routes_count: resource.id === 1 ? 2 : 1_500 } },
    })),
  }));
  const city = (await client.cities("Breteuil"))[1]!;
  const targeted = await client.lines(city, "bus", "601");
  assert.equal(targeted.lines[0]?.label, "601");
  assert.equal(targeted.unavailable, 0);
  assert.equal(targeted.targeted, true);
  assert.equal((await client.lines(city, "bus")).unavailable, 1);
  assert.equal((await client.lines(city, "bus", "999")).lines.length, 0);
});

test("published operator URLs bypass a slow catalogue, fall back on failure and retain the allowlist", async () => {
  for (const scenario of ["direct", "fallback", "blocked"]) {
    const requested: string[] = [];
    const provider = new FranceTransportClient(async (input) => {
      const url = String(input);
      requested.push(url);
      if (scenario === "fallback" && url.endsWith("/operator.zip")) return new Response("", { status: 503 });
      return new Response(zip);
    });
    const direct = scenario === "blocked" ? "http://127.0.0.1/private" : "https://transport.data.gouv.fr/operator.zip";
    await provider.staticFeed({ id: 42, title: "GTFS", format: "GTFS", is_available: true,
      url: "https://transport.data.gouv.fr/catalogue.zip", original_url: direct });
    assert.deepEqual(requested, scenario === "direct" ? [direct] : scenario === "fallback"
      ? [direct, "https://transport.data.gouv.fr/catalogue.zip"] : ["https://transport.data.gouv.fr/catalogue.zip"]);
  }
});

test("an evening before a holiday shows the next published service beyond 24 hours", async () => {
  const { client } = fixture();
  const line = (await client.lines((await client.cities("Breteuil"))[1]!, "bus")).lines[0]!;
  const index = await client.index(line);
  index.metadata.calendarExceptions.set("20261111:S", 2);
  const evening = Date.parse("2026-11-10T18:00:00Z");
  const origin = { label: "Breteuil Centre", ids: ["O"] };
  const arrival = { label: "Amiens Gare", ids: ["D"] };
  const pairs = journeyPairs(index, new Set(origin.ids), new Set(arrival.ids));
  assert.equal(scheduledJourneys(index, pairs, evening / 1000).length, 0);
  const later = new TransportBrowserClient(client.provider, () => evening);
  const result = await later.departures(line, index, origin, arrival, "fr");
  assert.match(result.content, /Aucun départ prévu dans les prochaines 24 h/);
  assert.match(result.content, /12\/11[\s\S]*08:10/);
  assert.doesNotMatch(result.content, /11\/11.*08:10/);
  index.metadata.calendars.clear();
  const absent = await later.departures(line, index, origin, arrival, "fr");
  assert.match(absent.content, /7 prochains jours selon le calendrier publié/);
});

test("at 19:27 a station choice includes the 19:40 and 20:45 departures from its official Quai E", async () => {
  const feed = zipSync({ ...unzipSync(zip),
    "trips.txt": strToU8("route_id,service_id,trip_id\nB,S,B1\nB,S,B2\nB,S,B3\n"),
    "stops.txt": strToU8("stop_id,stop_name,parent_station,location_type\nO,AMIENS - Gare routière,STATION,0\nE,AMIENS - Gare Quai E,STATION,0\nD,BEAUVAIS - Gare routière,,0\nSTATION,AMIENS - Gare,,1\n"),
    "stop_times.txt": strToU8("trip_id,arrival_time,departure_time,stop_id,stop_sequence\nB1,18:25:00,18:25:00,O,1\nB1,20:00:00,20:00:00,D,2\nB2,19:40:00,19:40:00,E,1\nB2,21:08:00,21:08:00,D,2\nB3,20:45:00,20:45:00,E,1\nB3,22:12:00,22:12:00,D,2\n"),
  });
  const { client } = fixture(false, feed);
  const line = (await client.lines((await client.cities("Breteuil"))[1]!, "bus")).lines[0]!;
  // Discovery only returned O; its official station relationship must retain E.
  const index = await client.index(line);
  const origins = originOptions(index, line);
  assert.equal(origins.length, 1);
  assert.equal(origins[0]!.label, "AMIENS - Gare");
  assert.deepEqual(new Set(origins[0]!.ids), new Set(["O", "E"]));
  const arrival = arrivalOptions(index, origins[0]!)[0]!;
  const evening = new TransportBrowserClient(client.provider, () => Date.parse("2026-11-10T18:27:00Z"));
  const result = await evening.departures(line, index, origins[0]!, arrival, "fr");
  assert.match(result.embed!.fields![0]!.name, /10\/11/);
  assert.match(result.embed!.fields![0]!.value, /19:40.*Quai E/);
  assert.match(result.embed!.fields![0]!.value, /20:45.*Quai E/);
  assert.doesNotMatch(result.content, /Aucun départ/);
  // Without an official relationship, do not silently merge the two places.
  index.stops.get("E")!.parent = "";
  assert.deepEqual(originOptions(index, line)[0]!.ids, ["O"]);
});

test("stale realtime falls back honestly, but fresh cancellations suppress the scheduled trip", async () => {
  const { client } = fixture();
  const { lines } = await client.lines((await client.cities("Breteuil"))[1]!, "bus");
  const line = lines[0]!;
  line.realtime = [{ ...line.resource, id: 3, format: "gtfs-rt" }];
  const index = await client.index(line);
  const origin = originOptions(index, line)[0]!;
  const arrival = arrivalOptions(index, origin)[0]!;
  let timestamp = NOW / 1000 - 3600;
  client.provider.realtimeFeed = async () => GtfsRealtimeBindings.transit_realtime.FeedMessage.encode({
    header: { gtfsRealtimeVersion: "2.0", timestamp },
    entity: [{ id: "cancelled", tripUpdate: { trip: { tripId: "B1", scheduleRelationship: 3 } } }],
  }).finish();
  const stale = await client.departures(line, index, origin, arrival, "fr");
  assert.match(stale.content, /Horaires théoriques/);
  assert.match(stale.content, /08:10/);
  timestamp = NOW / 1000;
  const cancelled = await client.departures(line, index, origin, arrival, "fr");
  assert.doesNotMatch(cancelled.content, /08:10/);
  assert.match(cancelled.content, /annulées/);
});

class Collector extends EventEmitter {
  stopped = false;
  stop(reason: string) { if (!this.stopped) { this.stopped = true; this.emit("end", [], reason); } }
}
function discordFixture() {
  const collector = new Collector();
  const prompt = {
    content: "", embeds: [] as any[], components: [] as any[], edits: [] as any[],
    async edit(options: any) {
      if (options.content !== undefined) this.content = options.content;
      if (options.embeds !== undefined) this.embeds = options.embeds;
      if (options.components !== undefined) this.components = options.components.map((row: any) => row.toJSON?.() ?? row);
      this.edits.push(options);
      for (const row of this.components) {
        assert.ok(row.components.length <= 5);
        for (const component of row.components) {
          if (component.options) assert.ok(component.options.length <= 25);
        }
      }
      return this;
    },
    createMessageComponentCollector: () => collector,
  };
  const message = {
    channelId: `channel-${Math.random()}`, author: { id: "owner" },
    async reply(options: any) { await prompt.edit(typeof options === "string" ? { content: options } : options); return prompt; },
  } as unknown as Message;
  let modalText = "Breteuil";
  const find = (suffix: string) => prompt.components.flatMap((row: any) => row.components)
    .find((component: any) => component.custom_id?.endsWith(`:${suffix}`));
  async function click(action: string, value?: string, user = "owner") {
    const component = find(action);
    assert.ok(component, `Missing ${action} in ${prompt.content}`);
    const replies: any[] = [];
    let deferred = false;
    const event = { customId: component.custom_id, user: { id: user }, values: value == null ? [] : [value],
      isButton: () => value == null, isStringSelectMenu: () => value != null,
      async showModal(modal: any) {
        const json = modal.toJSON();
        assert.ok(json.title.length <= 45);
        assert.ok(json.components[0].components[0].label.length <= 45);
      },
      async awaitModalSubmit() { return { fields: { getTextInputValue: () => modalText },
        async deferUpdate() {}, async reply(options: any) { replies.push(options); } }; },
      async deferUpdate() { deferred = true; }, async reply(options: any) { replies.push(options); } };
    collector.emit("collect", event);
    await delay(5);
    return { replies, get deferred() { return deferred; } };
  }
  return { collector, prompt, message, find, click, setModalText(value: string) { modalText = value; } };
}
async function until(predicate: () => boolean) {
  for (let i = 0; i < 100; i++) { if (predicate()) return; await delay(5); }
  assert.fail("Expected menu state was not reached");
}

test("Discord menus distinguish the city, protect ownership, then choose departure and arrival", async () => {
  const { client } = fixture();
  const ui = discordFixture();
  await handleTransportCommand(ui.message, ["fr", "Breteuil"], "fr", "!", "bus", client);
  assert.match(ui.prompt.content, /Quelle commune/);
  assert.match(JSON.stringify(ui.prompt.components), /Hauts-de-France/);
  const unauthorized = await ui.click("choose", "1", "other");
  assert.equal(unauthorized.replies[0].ephemeral, true);
  assert.match(ui.prompt.content, /Quelle commune/);
  await ui.click("choose", "1");
  await until(() => ui.prompt.content.includes("Choisis une ligne"));
  await ui.click("choose", "0");
  await until(() => ui.prompt.content.includes("arrêt de départ"));
  await ui.click("choose", "0");
  await until(() => ui.prompt.content.includes("arrêt d’arrivée"));
  await ui.click("choose", "0");
  await until(() => !!ui.prompt.embeds[0]?.footer?.text.includes("Horaires théoriques"));
  assert.equal(ui.prompt.content, "");
  assert.match(ui.prompt.embeds[0].description, /Amiens Gare/);
  await ui.click("modify");
  await until(() => ui.prompt.content.includes("arrêt de départ"));
  assert.equal(ui.prompt.embeds.length, 0, "returning to a menu must clear the previous card");
  ui.collector.stop("time");
  await delay(1);
  assert.equal(ui.prompt.components.length, 0);
  assert.match(ui.prompt.content, /expiré/);
});

test("compact mobile cards group days, state the shared platform once and preserve midnight dates", () => {
  const now = Date.parse("2026-11-10T18:52:00Z") / 1000;
  const time = (iso: string) => Date.parse(iso) / 1000;
  const first = time("2026-11-10T19:45:00Z");
  const second = time("2026-11-11T11:00:00Z");
  const card = departureCards({ title: "Bus 601", origin: "AMIENS - Gare Amiens", arrival: "BRETEUIL - RD 1001 nord",
    multiPlatform: true, stops: new Map([["E", { id: "E", name: "AMIENS - Gare Quai E", parent: "S" }]]),
    times: [first, second, second + 7200, second + 14400].map((at, i) => ({
      tripId: String(i), departureAt: at, arrivalAt: at + 2880, realtime: false, departureStopId: "E",
    })), timezone: "Europe/Paris", now, french: true, realtime: false, notes: [], empty: "" });
  assert.equal(card.embed.title, "Bus 601");
  assert.doesNotThrow(() => EmbedBuilder.from(card.embed).toJSON());
  assert.match(card.embed.description!, /Amiens · Gare Amiens/);
  assert.equal(card.embed.fields?.length, 2);
  assert.match(card.embed.fields![0]!.name, /Aujourd’hui.*10\/11/);
  assert.match(card.embed.fields![0]!.value, /\*\*20:45\*\* → 21:33 · 48 min/);
  assert.match(card.embed.fields![1]!.name, /Demain.*11\/11/);
  assert.equal((card.content.match(/Quai E/g) ?? []).length, 1);
  assert.equal(card.hasMore, true);
  assert.equal(card.embed.fields!.reduce((sum, field) => sum + field.value.split("\n").length, 0), 3);
  assert.equal(card.expandedEmbed.fields!.reduce((sum, field) => sum + field.value.split("\n").length, 0), 4);
  const overnight = departureCards({ title: "Bus N", origin: "A", arrival: "B", multiPlatform: false, stops: new Map(),
    times: [{ tripId: "N", departureAt: time("2026-11-10T22:50:00Z"), arrivalAt: time("2026-11-10T23:20:00Z"), realtime: false }],
    timezone: "Europe/Paris", now, french: false, realtime: false, notes: [], empty: "" });
  assert.match(overnight.embed.fields![0]!.value, /00:20 \(11\/11\)/);
  assert.match(overnight.embed.footer!.text, /Scheduled times/);
});

test("more-times toggling reuses the result, refresh reloads, and closing retains a single card", async () => {
  const { client } = fixture();
  let lookups = 0;
  client.departures = async (line, index, origin, arrival) => {
    lookups++;
    return { ...departureCards({ title: "Bus 601", origin: origin.label, arrival: arrival.label, multiPlatform: false,
      stops: index.stops, times: Array.from({ length: 6 }, (_, i) => ({
        tripId: String(i), departureAt: NOW / 1000 + i * 600, arrivalAt: NOW / 1000 + i * 600 + 2880, realtime: false,
      })), timezone: "Europe/Paris", now: NOW / 1000, french: true, realtime: false, notes: [], empty: "" }), source: line.source };
  };
  const ui = discordFixture();
  await handleTransportCommand(ui.message, ["fr", "Breteuil", "(60)"], "fr", "!", "bus", client);
  await ui.click("choose", "0");
  await until(() => ui.prompt.content.includes("arrêt de départ"));
  await ui.click("choose", "0");
  await until(() => ui.prompt.content.includes("arrêt d’arrivée"));
  await ui.click("choose", "0");
  await until(() => !!ui.find("more"));
  assert.equal(ui.prompt.embeds[0].fields[0].value.split("\n").length, 3);
  await ui.click("more");
  await until(() => ui.find("more")?.label === "Réduire");
  assert.equal(ui.prompt.embeds[0].fields[0].value.split("\n").length, 6);
  assert.equal(lookups, 1);
  await ui.click("refresh");
  await until(() => lookups === 2 && !!ui.find("more"));
  assert.equal(ui.prompt.embeds[0].fields[0].value.split("\n").length, 3);
  await ui.click("cancel");
  assert.equal(ui.prompt.embeds.length, 1);
  assert.equal(ui.prompt.content, "Recherche terminée.");
  assert.equal(ui.prompt.components.length, 0);
});

test("a server without embed permissions receives readable compact text instead of an error", async () => {
  const { client } = fixture();
  const ui = discordFixture();
  const edit = ui.prompt.edit.bind(ui.prompt);
  ui.prompt.edit = async (options: any) => {
    if (options.embeds?.length) throw Object.assign(new Error("Missing Permissions"), { code: 50013 });
    return edit(options);
  };
  await handleTransportCommand(ui.message, ["fr", "Breteuil", "(60)"], "fr", "!", "bus", client);
  await ui.click("choose", "0");
  await until(() => ui.prompt.content.includes("arrêt de départ"));
  await ui.click("choose", "0");
  await until(() => ui.prompt.content.includes("arrêt d’arrivée"));
  await ui.click("choose", "0");
  await until(() => ui.prompt.content.includes("Horaires théoriques"));
  assert.equal(ui.prompt.embeds.length, 0);
  assert.match(ui.prompt.content, /Aujourd’hui/);
  assert.ok(ui.find("refresh"));
  await ui.click("cancel");
});

test("a shorthand destination is prioritized without hiding the intermediate stops", async () => {
  const { client } = fixture();
  client.provider.resolveBusQuery = async () => { throw new Error("Legacy geocoding must not run before municipality resolution"); };
  const cities = await client.cities("Breteuil");
  client.cities = async (place) => {
    const normalized = place.toLowerCase();
    if (normalized === "amiens") return [{ ...cities[1]!, id: "80021", name: "Amiens" }];
    // Reproduce the geocoder loosely returning Breteuil for 'Breteuil Amiens'.
    return cities;
  };
  const ui = discordFixture();
  await handleTransportCommand(ui.message, ["fr", "Breteuil", "Amiens", "601"], "fr", "!", "bus", client);
  await ui.click("choose", "1");
  await until(() => ui.prompt.content.includes("arrêt de départ"));
  await ui.click("choose", "0");
  await until(() => ui.prompt.content.includes("arrêt d’arrivée"));
  const options = ui.find("choose").options;
  assert.equal(options[0].label, "Amiens Gare");
  assert.ok(options.some((option: any) => option.label === "Gare"), "the intermediate stop must remain visible");
  assert.doesNotMatch(ui.prompt.content, /Filtre/);
  ui.collector.stop("cancelled");
});

test("a lookup acknowledges immediately, can be cancelled, and never edits after cancellation", async () => {
  const { client } = fixture();
  let release!: (value: any) => void;
  client.cities = () => new Promise((resolve) => { release = resolve; });
  const ui = discordFixture();
  const pending = handleTransportCommand(ui.message, ["fr", "Breteuil"], "fr", "!", "bus", client);
  await until(() => !!release);
  assert.ok(ui.prompt.edits[0].content.includes("Recherche"));
  await ui.click("cancel");
  release([]);
  await pending;
  assert.equal(ui.prompt.content, "Recherche terminée.");
  assert.equal(ui.prompt.components.length, 0);
});

test("the generic transport entry chooses metro and accepts a city through its modal", async () => {
  const { client } = fixture();
  const ui = discordFixture();
  await handleTransportCommand(ui.message, ["fr"], "fr", "!", null, client);
  assert.match(ui.prompt.content, /moyen de transport/);
  await ui.click("choose", "metro");
  await until(() => !!ui.find("city"));
  await ui.click("city");
  await until(() => ui.prompt.content.includes("Quelle commune"));
  await ui.click("choose", "1");
  await until(() => ui.prompt.content.includes("Choisis une ligne"));
  assert.match(JSON.stringify(ui.prompt.components), /Métro A/);
  await ui.click("choose", "0");
  await until(() => ui.prompt.content.includes("station de départ"));
  assert.match(ui.prompt.content, /1 station/);
  ui.collector.stop("cancelled");
});

test("long route menus paginate and multi-match searches preserve original indexes", async () => {
  const { client } = fixture();
  const city = (await client.cities("Breteuil"))[1]!;
  const base = (await client.lines(city, "bus")).lines[0]!;
  client.lines = async () => ({ lines: Array.from({ length: 55 }, (_, i) => ({ ...base, label: `Ligne-${i}` })), unavailable: 0 });
  const ui = discordFixture();
  await handleTransportCommand(ui.message, ["fr", "Breteuil", "(60)"], "fr", "!", "bus", client);
  assert.equal(ui.find("choose").options.length, 25);
  await ui.click("next");
  assert.equal(ui.find("choose").options[0].value, "25");
  await ui.click("next");
  assert.equal(ui.find("choose").options.length, 5);
  ui.setModalText("Ligne-5");
  await ui.click("filter");
  assert.deepEqual(ui.find("choose").options.map((option: any) => option.value), ["5", "50", "51", "52", "53", "54"]);
  await ui.click("clear");
  assert.equal(ui.find("choose").options.length, 25);
  ui.collector.stop("cancelled");
});

test("timeouts close the menu and late provider results cannot replace the timeout message", async () => {
  const { client } = fixture();
  client.cities = async () => { await delay(50); return []; };
  const ui = discordFixture();
  await handleTransportCommand(ui.message, ["fr", "Breteuil"], "fr", "!", "bus", client, 10);
  await delay(70);
  assert.match(ui.prompt.content, /dépassé le délai/);
  assert.equal(ui.prompt.components.length, 0);
  await assert.rejects(transportDeadline(delay(30), 1), /timed out/);
});

test("command parsing retains explicit directions, numeric lines and department qualifiers", () => {
  assert.deepEqual(parseTransportCommand(["Breteuil", "(60)"]), { place: "Breteuil (60)", line: undefined, direction: undefined });
  assert.deepEqual(parseTransportCommand(["Paris", "1"]), { place: "Paris", line: "1", direction: undefined });
  assert.deepEqual(parseTransportCommand(["Beauvais", "vers", "Amiens", "601"]), { place: "Beauvais", direction: "Amiens", line: "601" });
});

function connectionZip(options: {
  departure?: string; arrival?: string; rules?: string; mode?: number; extra?: Record<string, string>;
} = {}) {
  return zipSync({
    ...unzipSync(zip),
    "routes.txt": strToU8(`route_id,route_short_name,route_long_name,route_type\nB,601,Breteuil Amiens,3\nM,A,Ligne A,${options.mode ?? 1}\n`),
    "stop_times.txt": strToU8(`trip_id,arrival_time,departure_time,stop_id,stop_sequence
B1,08:10:00,08:10:00,O,1
B1,08:20:00,08:20:00,X,2
B1,09:00:00,09:00:00,D,3
M1,${options.departure ?? "08:25:00"},${options.departure ?? "08:25:00"},P,1
M1,${options.arrival ?? "08:35:00"},${options.arrival ?? "08:35:00"},Q,2
`),
    "transfers.txt": strToU8(options.rules ?? "from_stop_id,to_stop_id,transfer_type,min_transfer_time\nX,P,2,180\n"),
    ...Object.fromEntries(Object.entries(options.extra ?? {}).map(([name, text]) => [name, strToU8(text)])),
  });
}
async function connectionIndex(options: Parameters<typeof connectionZip>[0] = {}) {
  const bytes = connectionZip(options);
  const index = await buildJourneyIndex(bytes, "B");
  await addConnections(bytes, index);
  return index;
}
const connectionOrigin = { label: "Breteuil Centre", ids: ["O"] };
const connectionArrival = { label: "Jean Jaurès", ids: ["Q"], viaTransfer: true };

test("a published bus to metro transfer exposes the destination and renders both timed legs", async () => {
  const { client } = fixture(false, connectionZip());
  const line = (await client.lines((await client.cities("Breteuil (60)"))[0]!, "bus")).lines[0]!;
  const index = await client.index(line);
  const arrival = arrivalOptions(index, connectionOrigin).find((stop) => stop.ids.includes("Q"))!;
  assert.equal(arrival.viaTransfer, true);
  const journeys = connectedJourneys(index, connectionOrigin, arrival, NOW / 1000);
  assert.equal(journeys.length, 1);
  assert.equal(journeys[0]!.second.departureAt - journeys[0]!.first.arrivalAt!, 300);
  const result = await client.departures(line, index, connectionOrigin, arrival, "fr");
  assert.match(result.content, /Bus 601.*08:10.*08:20/);
  assert.match(result.content, /Métro A.*08:25.*08:35/);
  assert.match(result.content, /minimum officiel 180 s/);
  assert.match(result.content, /théorique/);
  assert.match(result.content, /ne garantissent pas/);
  assert.equal(result.source.url, line.source.url);
  assert.ok(result.content.length < 1900);
});

test("impossible and too-short changes are rejected, the exact published minimum is accepted", async () => {
  for (const [departure, expected] of [["08:15:00", 0], ["08:22:59", 0], ["08:23:00", 1]] as const) {
    const index = await connectionIndex({ departure });
    assert.equal(connectedJourneys(index, connectionOrigin, connectionArrival, NOW / 1000).length, expected, departure);
  }
});

test("identical stop names, proximity and headsigns never invent a connection", async () => {
  const index = await connectionIndex({ rules: "from_stop_id,to_stop_id,transfer_type,min_transfer_time\n",
    extra: { "stops.txt": "stop_id,stop_name\nO,Breteuil Centre\nX,Gare\nP,Gare\nQ,Jean Jaurès\nD,Amiens Gare\n" } });
  assert.ok(!arrivalOptions(index, connectionOrigin).some((stop) => stop.ids.includes("Q")));
  assert.equal(connectedJourneys(index, connectionOrigin, connectionArrival, NOW / 1000).length, 0);
});

test("forbidden, reversed, missing-minimum and unsupported transfer rules do not create a journey", async () => {
  for (const row of ["X,P,3,180", "P,X,2,180", "X,P,2,", "X,P,0,", "X,P,1,", "X,P,2,-1", "X,P,2,1.5"]) {
    const index = await connectionIndex({ rules: `from_stop_id,to_stop_id,transfer_type,min_transfer_time\n${row}\n` });
    assert.equal(connectedJourneys(index, connectionOrigin, connectionArrival, NOW / 1000).length, 0, row);
  }
});

test("specific trip prohibitions override general transfer minima; ambiguous rules fail closed", async () => {
  for (const extra of ["X,P,3,,B1,M1", "X,P,2,60,,"]) {
    const index = await connectionIndex({
      rules: `from_stop_id,to_stop_id,transfer_type,min_transfer_time,from_trip_id,to_trip_id\nX,P,2,180,,\n${extra}\n`,
    });
    assert.equal(connectedJourneys(index, connectionOrigin, connectionArrival, NOW / 1000).length, 0);
  }
});

test("station-level rules apply through official parent IDs and support tram and rail changes", async () => {
  for (const mode of [0, 2]) {
    const index = await connectionIndex({ mode,
      rules: "from_stop_id,to_stop_id,transfer_type,min_transfer_time\nSX,SP,2,180\n",
      extra: { "stops.txt": "stop_id,stop_name,parent_station,location_type\nO,Breteuil Centre,,0\nX,Gare bus,SX,0\nP,Gare train,SP,0\nQ,Terminus,,0\nD,Amiens Gare,,0\nSX,Gare bus,,1\nSP,Gare train,,1\n" },
    });
    assert.equal(connectedJourneys(index, connectionOrigin, connectionArrival, NOW / 1000).length, 1);
  }
});

test("closed services, no pickup/dropoff and frequency-only trips cannot confirm a transfer", async () => {
  for (const extra of [
    { "calendar_dates.txt": "service_id,date,exception_type\nS,20261110,2\n" },
    { "frequencies.txt": "trip_id,start_time,end_time,headway_secs\nM1,08:00:00,10:00:00,600\n" },
    { "stop_times.txt": "trip_id,arrival_time,departure_time,stop_id,stop_sequence,pickup_type,drop_off_type\nB1,08:10:00,08:10:00,O,1,0,0\nB1,08:20:00,08:20:00,X,2,0,1\nM1,08:25:00,08:25:00,P,1,1,0\nM1,08:35:00,08:35:00,Q,2,0,0\n" },
  ]) {
    const index = await connectionIndex({ extra });
    assert.equal(connectedJourneys(index, connectionOrigin, connectionArrival, NOW / 1000).length, 0);
  }
});

function liveConnections(options: { late?: boolean; stale?: boolean; cancel?: string; skip?: boolean; delayOnly?: boolean; onlySecond?: boolean } = {}) {
  return GtfsRealtimeBindings.transit_realtime.FeedMessage.encode({
    header: { gtfsRealtimeVersion: "2.0", timestamp: NOW / 1000 - (options.stale ? 3600 : 0) },
    entity: [
      ...(!options.onlySecond ? [{ id: "first", tripUpdate: { trip: { tripId: "B1", startDate: "20261110", ...(options.cancel === "B1" ? { scheduleRelationship: 3 } : {}) },
        stopTimeUpdate: options.delayOnly ? [{ stopId: "X", arrival: { delay: 240 } }] : [
          { stopSequence: 1, departure: { time: NOW / 1000 + 600 } },
          { stopSequence: 2, arrival: { time: NOW / 1000 + (options.late ? 1440 : 1200) } },
        ] } }] : []),
      { id: "second", tripUpdate: { trip: { tripId: "M1", startDate: "20261110", ...(options.cancel === "M1" ? { scheduleRelationship: 3 } : {}) },
        stopTimeUpdate: [
          { stopId: "P", departure: { time: NOW / 1000 + 1500 }, ...(options.skip ? { scheduleRelationship: 1 } : {}) },
          { stopId: "Q", arrival: { time: NOW / 1000 + 2100 } },
        ] } },
    ],
  }).finish();
}

test("fresh live delays, cancellations and skipped stops invalidate an otherwise feasible change", async () => {
  const index = await connectionIndex();
  for (const options of [{ late: true }, { cancel: "B1" }, { cancel: "M1" }, { skip: true }, { delayOnly: true }]) {
    assert.equal(connectedJourneys(index, connectionOrigin, connectionArrival, NOW / 1000, [liveConnections(options)]).length, 0,
      JSON.stringify(options));
  }
  const stale = connectedJourneys(index, connectionOrigin, connectionArrival, NOW / 1000, [liveConnections({ late: true, stale: true })]);
  assert.equal(stale.length, 1);
  assert.equal(stale[0]!.first.realtime, false);
  const mixed = connectedJourneys(index, connectionOrigin, connectionArrival, NOW / 1000, [liveConnections({ onlySecond: true })]);
  assert.equal(mixed[0]!.first.realtime, false);
  assert.equal(mixed[0]!.second.realtime, true);
});

test("Discord can select an arrival on a second line and refresh the complete itinerary", async () => {
  const { client } = fixture(false, connectionZip());
  const ui = discordFixture();
  await handleTransportCommand(ui.message, ["fr", "Breteuil", "(60)"], "fr", "!", "bus", client);
  await ui.click("choose", "0");
  await until(() => ui.prompt.content.includes("arrêt de départ"));
  await ui.click("choose", "0");
  await until(() => ui.prompt.content.includes("arrêt d’arrivée"));
  const option = ui.find("choose").options.find((choice: any) => choice.label === "Jean Jaurès");
  assert.match(option.description, /correspondance/);
  await ui.click("choose", option.value);
  await until(() => ui.prompt.content.includes("minimum officiel"));
  assert.match(ui.prompt.content, /Oise/);
  assert.match(ui.prompt.content, /Métro A/);
  await ui.click("refresh");
  await until(() => ui.prompt.content.includes("minimum officiel"));
  await ui.click("modify");
  await until(() => ui.prompt.content.includes("arrêt de départ"));
  ui.collector.stop("cancelled");
});

test("after-midnight transfers use the previous service day's calendar, not the clock date", async () => {
  const index = await connectionIndex({
    departure: "32:25:00", arrival: "32:35:00",
    extra: {
      "stop_times.txt": "trip_id,arrival_time,departure_time,stop_id,stop_sequence\nB1,32:10:00,32:10:00,O,1\nB1,32:20:00,32:20:00,X,2\nM1,32:25:00,32:25:00,P,1\nM1,32:35:00,32:35:00,Q,2\n",
      "calendar.txt": "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nS,1,0,0,0,0,0,0,20261109,20261109\n",
    },
  });
  const journeys = connectedJourneys(index, connectionOrigin, connectionArrival, NOW / 1000);
  assert.equal(journeys.length, 1);
  assert.equal(journeys[0]!.first.serviceDate, "20261109");
  assert.equal(journeys[0]!.second.serviceDate, "20261109");
  assert.equal(journeys[0]!.first.departureAt, NOW / 1000 + 600);
});

test("a transfer with a fresh second leg retains and labels the first leg as theoretical", async () => {
  const { client } = fixture(false, connectionZip());
  const line = (await client.lines((await client.cities("Breteuil (60)"))[0]!, "bus")).lines[0]!;
  const index = await client.index(line);
  line.realtime = [{ ...line.resource, id: 3, format: "gtfs-rt" }];
  client.provider.realtimeFeed = async () => liveConnections({ onlySecond: true });
  const result = await client.departures(line, index, connectionOrigin, connectionArrival, "fr");
  assert.match(result.content, /Bus 601.*\[théorique\]/);
  assert.match(result.content, /Métro A.*\[temps réel\]/);
  assert.match(result.content, /ne garantissent pas/);
});

test("oversized transfer tables leave direct journeys available with an explicit menu warning", async () => {
  const { client } = fixture(false, connectionZip({
    rules: `from_stop_id,to_stop_id,transfer_type,min_transfer_time\n${"X,P,2,180\n".repeat(5_001)}`,
  }));
  const line = (await client.lines((await client.cities("Breteuil (60)"))[0]!, "bus")).lines[0]!;
  const index = await client.index(line);
  assert.equal(index.connectionsUnavailable, true);
  assert.deepEqual(arrivalOptions(index, connectionOrigin).map((stop) => stop.label), ["Amiens Gare", "Gare"]);
  const ui = discordFixture();
  await handleTransportCommand(ui.message, ["fr", "Breteuil", "(60)"], "fr", "!", "bus", client);
  await ui.click("choose", "0");
  await until(() => ui.prompt.content.includes("arrêt de départ"));
  await ui.click("choose", "0");
  await until(() => ui.prompt.content.includes("arrêt d’arrivée"));
  assert.match(ui.prompt.content, /seuls les trajets directs/);
  ui.collector.stop("cancelled");
});

test("route caps are explicit instead of pretending to search the whole network", async () => {
  const routes = Array.from({ length: 42 }, (_, i) => `R${i},${i},Rail ${i},2`).join("\n");
  const trips = Array.from({ length: 42 }, (_, i) => `R${i},S,T${i},Terminus`).join("\n");
  const times = Array.from({ length: 42 }, (_, i) => `T${i},08:25:00,08:25:00,P,1\nT${i},08:35:00,08:35:00,Q,2`).join("\n");
  const index = await connectionIndex({ extra: {
    "routes.txt": `route_id,route_short_name,route_long_name,route_type\nB,601,Bus,3\n${routes}\n`,
    "trips.txt": `route_id,service_id,trip_id,trip_headsign\nB,S,B1,Amiens\n${trips}\n`,
    "stop_times.txt": `trip_id,arrival_time,departure_time,stop_id,stop_sequence\nB1,08:10:00,08:10:00,O,1\nB1,08:20:00,08:20:00,X,2\n${times}\n`,
  } });
  assert.equal(index.connections!.limited, true);
  assert.equal(index.connections!.network.metadata.routes.size, 41, "initial route plus at most forty connecting routes");
  assert.equal(connectedJourneys(index, connectionOrigin, connectionArrival, NOW / 1000).length, 3);
});
