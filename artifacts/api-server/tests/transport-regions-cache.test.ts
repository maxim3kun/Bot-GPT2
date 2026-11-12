import assert from "node:assert/strict";
import test from "node:test";
import { zipSync, strToU8 } from "fflate";
import type { Collection } from "mongodb";
import { TransportMetadataCache, publicMetadata, resourceVersion, type MetadataDocument, type MetadataKey } from "../src/discord/transport-metadata-cache.js";
import { FranceTransportClient } from "../src/discord/public-transport.js";
import { TransportBrowserClient } from "../src/discord/transport-browser.js";
import { handleTransportCommand, handleTransportSearch } from "../src/discord/transport-menu.js";
import { regionalNetworks } from "../src/discord/transport-regions.js";
import { selectAiCommand } from "../src/discord/ai-command-intent.js";
import { parsePublicTransportQuery } from "../src/discord/transport-query.js";
import { fakeDiscord, type FakeCard } from "./fixtures/transport-discord.js";
import { QuebecTransportClient } from "../src/discord/quebec-transport.js";

const tick = () => new Promise<void>(resolve => setImmediate(resolve));
async function settle(test: () => boolean) {
  for (let i = 0; i < 300; i++) { if (test()) return; await new Promise(r => setTimeout(r, 2)); }
  assert.fail("Transport state did not settle");
}
async function choose(card: FakeCard, value: string) {
  await card.collector.collect(card.interaction("choose", { values: [value], isButton: () => false, isStringSelectMenu: () => true }).value);
  await tick();
}
async function click(card: FakeCard, action: string) { await card.collector.collect(card.interaction(action).value); await tick(); }
function store() {
  const documents = new Map<string, MetadataDocument>();
  let reads = 0, writes = 0, fail = false;
  const value = {
    findOne: async ({ _id }: { _id: string }) => { reads++; if (fail) throw Error("offline"); return structuredClone(documents.get(_id) ?? null); },
    updateOne: async ({ _id }: { _id: string }, update: { $set: Omit<MetadataDocument, "_id"> }) => {
      if (fail) throw Error("offline"); writes++; documents.set(_id, structuredClone({ _id, ...update.$set }));
    },
    createIndex: async () => "expiresAt",
    deleteMany: async () => {},
    find: () => ({ sort: () => ({ skip: () => ({ limit: () => ({ toArray: async () => [] }) }) }) }),
  } as unknown as Collection<MetadataDocument>;
  return { value, documents, get reads() { return reads; }, get writes() { return writes; }, fail() { fail = true; } };
}
const key: MetadataKey = { territory: "fr", provider: "pan", kind: "routes", source: "routes:10", version: "v1" };
const routes = [{ routeId: "R", shortName: "601", longName: "Trajet public", mode: "bus", stopIds: ["A", "B"] }];

test("shared cache survives a fresh instance, coalesces loads, expires and invalidates source versions", async () => {
  const db = store(); let now = 1000, loads = 0;
  const create = () => new TransportMetadataCache(() => db.value, () => now);
  const load = async () => { loads++; await tick(); return routes; };
  const cache = create();
  await Promise.all([cache.get(key, 60_000, load), cache.get(key, 60_000, load)]);
  assert.equal(loads, 1); assert.equal(db.writes, 1);
  const result = await cache.get(key, 60_000, load); result[0]!.stopIds.push("PRIVATE");
  assert.deepEqual(await create().get(key, 60_000, load), routes); assert.equal(loads, 1);
  now += 61_000; await create().get(key, 60_000, load); assert.equal(loads, 2);
  await create().get({ ...key, version: "v2" }, 60_000, load); assert.equal(loads, 3);
  await create().get({ ...key, territory: "qc" }, 60_000, load); assert.equal(loads, 4);
});

test("line listings survive restart and stale entries refresh in the background", async () => {
  const db = store(); let now = 1_000, loads = 0;
  const listingKey: MetadataKey = { ...key, kind: "lineListings", source: "line-listing:beauvais:rail", version: "v1" };
  const create = () => new TransportMetadataCache(() => db.value, () => now);
  const initial = { lines: [], unavailable: 0 };
  await create().staleWhileRevalidate(listingKey, 1_000, 86_400_000, async () => { loads++; return initial; }, (refresh) => refresh());
  now += 2_000;
  let refresh: (() => void) | undefined;
  const stale = await create().staleWhileRevalidate(listingKey, 1_000, 86_400_000,
    async () => { loads++; return { lines: [], unavailable: 0, networkScoped: true }; }, (task) => { refresh = task; });
  assert.equal(stale.stale, true);
  assert.equal(loads, 1, "an expired listing is returned without waiting for a source scan");
  refresh!();
  await settle(() => [...db.documents.values()].some((doc) => (doc.value as any).networkScoped === true));
  assert.equal(loads, 2);
  const cached = await create().staleWhileRevalidate(listingKey, 1_000, 86_400_000,
    async () => { loads++; return initial; }, (task) => task());
  assert.equal(cached.stale, false);
  assert.equal((cached.value as any).networkScoped, true);
  assert.equal(loads, 2);
});

test("a failed background listing refresh keeps the last good Mongo result", async () => {
  const db = store(); let now = 1_000;
  const listingKey: MetadataKey = { ...key, kind: "lineListings", source: "line-listing:creil:rail", version: "v1" };
  const create = () => new TransportMetadataCache(() => db.value, () => now);
  await create().staleWhileRevalidate(listingKey, 1_000, 86_400_000,
    async () => ({ lines: [], unavailable: 0 }), (task) => task());
  now += 2_000;
  const stale = await create().staleWhileRevalidate(listingKey, 1_000, 86_400_000,
    async () => { throw Error("temporary source failure"); }, (task) => task());
  assert.equal(stale.stale, true);
  await settle(() => true);
  const doc = [...db.documents.values()][0]!;
  assert.deepEqual((doc.value as any).lines, []);
  assert.equal(doc.freshUntil?.getTime(), 2_000);
  assert.equal(doc.expiresAt.getTime(), 86_401_000);
});

test("closed projections exclude every schedule, identity, binary and arbitrary raw metadata field", async () => {
  const db = store();
  const dangerous = { ...routes[0], departureAt: 123, arrivalAt: 456, calendar: { date: "20261111" },
    trips: [{ serviceId: "S" }], stop_times: ["08:00"], userId: "private", zip: new Uint8Array([80, 75]) };
  await new TransportMetadataCache(() => db.value).get(key, 1000, async () => [dangerous]);
  assert.deepEqual([...db.documents.values()][0]!.value, routes);
  assert.deepEqual(publicMetadata("catalog", [{ id: "x", metadata: { trips: [] }, resources: [
    { id: 1, metadata: { start_date: "20261111", networks_start_end_dates: [], stats: { routes_count: 2, trips_count: 10 } } },
  ] }]), [{ id: "x", resources: [{ id: 1, metadata: { stats: { routes_count: 2 } } }] }]);
  await assert.rejects(new TransportMetadataCache(() => db.value).get({ ...key, version: "invalid" }, 1000, async () =>
    [{ ...routes[0], longName: "x".repeat(5000) }]), /metadata/);
  const routeDoc = [...db.documents.values()][0]!;
  assert.deepEqual(Object.keys(routeDoc.value as object), ["0"]);
});
test("Mongo failure uses the actual source, never caches a fabricated empty answer, and source errors propagate", async () => {
  const db = store(); db.fail(); let calls = 0;
  const cache = new TransportMetadataCache(() => db.value);
  assert.deepEqual(await cache.get(key, 1000, async () => { calls++; return routes; }), routes);
  assert.equal(calls, 1); assert.equal(db.writes, 0);
  await assert.rejects(cache.get({ ...key, version: "unavailable" }, 1000, async () => { throw Error("official source down"); }),
    /official source down/);
});
test("a displayed download modification date cannot change the catalogue identity after restart", () => {
  const resource = { id: 1, url: "https://transport.data.gouv.fr/test.zip", updated: "2026-10-01" };
  const before = resourceVersion(resource);
  const downloaded = { ...resource, referenceVersion: before, updated: "2026-11-10" };
  assert.equal(resourceVersion(downloaded), before);
  assert.notEqual(resourceVersion({ ...resource, updated: "2026-11-11" }), before);
});
test("Québec catalogues, stops and route metadata survive restart even when downloads update Last-Modified", async () => {
  const db = store(); let calls = 0;
  const zip = zipSync({
    "routes.txt": strToU8("route_id,route_short_name,route_long_name,route_type\nR,55,Boulevard,3\n"),
    "stops.txt": strToU8("stop_id,stop_name,stop_lat,stop_lon\nS,Arrêt public,45.5,-73.5\n"),
  });
  const fetcher: typeof fetch = async input => {
    calls++;
    const url = new URL(String(input));
    if (url.hostname === "www.donneesquebec.ca") return Response.json({ success: true, result: { count: 1, results: [
      { id: "stm-test", name: "stm", title: "STM", license_id: "CC-BY", resources: [
        { id: "stm-zip", name: "GTFS", format: "GTFS", url: "https://www.stm.info/test.zip", last_modified: "2026-10-01" },
      ] },
    ] } });
    assert.equal(url.hostname, "www.stm.info");
    return new Response(zip, { headers: { "last-modified": "Tue, 10 Nov 2026 08:00:00 GMT" } });
  };
  const create = () => new QuebecTransportClient(fetcher, () => NOW, new TransportMetadataCache(() => db.value, () => NOW));
  const first = create(), resource = (await first.getCatalog()).find(n => n.slug === "stm")!.resources[0]!;
  const stops = await first.nearbyStopsForResources(45.5, -73.5, [resource]);
  assert.equal(stops.features?.length, 1);
  assert.equal(resource.updated, "Tue, 10 Nov 2026 08:00:00 GMT");
  assert.equal((await first.referenceRoutes(resource)).length, 1);
  const before = calls, second = create(), fresh = (await second.getCatalog()).find(n => n.slug === "stm")!.resources[0]!;
  assert.equal((await second.nearbyStopsForResources(45.5, -73.5, [fresh])).features?.length, 1);
  assert.equal((await second.referenceRoutes(fresh)).length, 1); assert.equal(calls, before);
  assert.ok([...db.documents.values()].some(d => d.kind === "stops"));
  assert.equal(JSON.stringify([...db.documents.values()]).includes("stop_times"), false);
});
test("natural catalogue requests preserve public scope and do not execute quoted or negated requests", () => {
  const text = "Dis moi les bus en Normandie <@1514319419546013796>";
  const intent = selectAiCommand(text, {});
  assert.equal(intent.kind, "action");
  if (intent.kind === "action") assert.deepEqual(intent.action, { name: "search_transport", place: "Normandie", mode: "bus" });
  assert.equal(parsePublicTransportQuery(text)?.place, "Normandie");
  assert.equal(selectAiCommand(`"${text}"`, {}).kind, "none");
  assert.equal(selectAiCommand("Ne cherche pas les bus en Normandie", {}).kind, "none");
});

const NOW = Date.parse("2026-11-10T07:00:00Z");
const region = { code: "28", name: "Normandie", departmentCodes: ["27", "76"], epciCodes: ["200023414"] };
const source = {
  id: "nomad", title: "Réseau officiel", slug: "nomad", licence: "ODbL", type: "public-transit",
  page_url: "https://transport.data.gouv.fr/datasets/test", covered_area: [{ type: "region", insee: "28", nom: "Normandie" }],
  resources: [{ id: 10, title: "GTFS", format: "GTFS", url: "https://transport.data.gouv.fr/test.zip", updated: "2026-11-10", is_available: true, modes: ["bus"] }],
};
function feed(reverse = true, mode: "bus" | "rail" = "bus") {
  const type = mode === "rail" ? 2 : 3;
  return zipSync({
    "agency.txt": strToU8("agency_id,agency_name,agency_timezone\nN,Nomad,Europe/Paris\n"),
    "routes.txt": strToU8(`route_id,route_short_name,route_long_name,route_type\nR,601,A → B,${type}\n` + (reverse ? `V,601,B → A,${type}\n` : "")),
    "stops.txt": strToU8("stop_id,stop_name,parent_station,location_type,stop_lat,stop_lon\nSA,Station A,,1,49,1\nSB,Station B,,1,49.1,1.1\nA,Quai A aller,SA,0,49,1\nB,Quai B aller,SB,0,49.1,1.1\nA2,Quai A retour,SA,0,49,1\nB2,Quai B retour,SB,0,49.1,1.1\n"),
    "trips.txt": strToU8("route_id,service_id,trip_id,trip_headsign\nR,S,T,Station B\n" + (reverse ? "V,S,U,Station A\n" : "")),
    "calendar.txt": strToU8("service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nS,1,1,1,1,1,1,1,20200101,20991231\n"),
    "stop_times.txt": strToU8("trip_id,arrival_time,departure_time,stop_id,stop_sequence\nT,08:10:00,08:10:00,A,1\nT,08:30:00,08:30:00,B,2\n" +
      (reverse ? "U,09:00:00,09:00:00,B2,1\nU,09:20:00,09:20:00,A2,2\n" : "")),
  });
}
function fixture(reverse = true, mode: "bus" | "rail" = "bus") {
  const db = store(), calls: string[] = [], zip = feed(reverse, mode);
  const fetcher: typeof fetch = async input => {
    const u = new URL(String(input)); calls.push(u.pathname);
    if (u.pathname === "/regions") return Response.json([{ code: "28", nom: "Normandie" }]);
    if (u.pathname === "/regions/28/departements") return Response.json([{ code: "27", nom: "Eure" }]);
    if (u.pathname === "/epcis") return Response.json([{ code: "200023414", nom: "Rouen", codesRegions: ["28"] }]);
    if (u.pathname === "/api/datasets") return Response.json([{ ...source,
      resources: source.resources.map(r => ({ ...r, modes: [mode] })) }]);
    if (u.pathname === "/test.zip") return new Response(zip);
    throw Error(`Unexpected transport source ${u}`);
  };
  const provider = () => new FranceTransportClient(fetcher, () => NOW, new TransportMetadataCache(() => db.value, () => NOW));
  return { db, calls, provider, browser: () => new TransportBrowserClient(provider(), () => NOW) };
}
test("regional membership uses official region/department/EPCI IDs and identical resources are not duplicated", () => {
  const all = [source, { ...source, id: "duplicate" }, { ...source, id: "rouen", resources: [{ ...source.resources[0]!, id: 11, url: "https://transport.data.gouv.fr/rouen.zip" }],
    covered_area: [{ type: "epci", insee: "200023414", nom: "Rouen" }] },
    { ...source, id: "outside", covered_area: [{ type: "region", insee: "32", nom: "Hauts-de-France" }] }];
  assert.deepEqual(regionalNetworks(all, region, "bus").map(d => d.id), ["nomad", "rouen"]);
});
test("regional command lists sources and routes without municipality geocoding or schedule indexes; metadata survives restart", async () => {
  const f = fixture(), service = f.browser(), d = fakeDiscord({ channelId: "regional" });
  await handleTransportCommand(d.message, ["fr", "Normandie"], "fr", "!", "bus", service);
  const card = d.cards[0]!;
  assert.match(card.last.content!, /Choisis un réseau/);
  assert.equal(f.calls.includes("/test.zip"), false, "regional discovery must not download schedules");
  await choose(card, "0");
  await settle(() => /Choisis une ligne/.test(card.last.content ?? ""));
  assert.equal(f.db.documents.size > 0, true);
  assert.match(JSON.stringify(card.last.components), /601/);
  const calls = f.calls.length, restarted = f.browser();
  const r = await restarted.region("Normandie", "fr");
  const nets = await restarted.regionNetworks(r!, "bus");
  const lines = await restarted.regionLines(nets[0]!, "bus");
  assert.equal(lines.lines.length, 2); assert.equal(f.calls.length, calls);
  const persisted = JSON.stringify([...f.db.documents.values()]);
  for (const forbidden of ["arrival_time", "departure_time", "calendar", "serviceId", "tripId", "stop_times", "visits"])
    assert.equal(persisted.includes(forbidden), false, forbidden);
  card.collector.stop("cancelled");
});
test("natural regional command uses the same paginated source → line → stop workflow", async () => {
  const f = fixture(), d = fakeDiscord({ channelId: "natural-region" });
  const action = selectAiCommand("Dis moi les bus en Normandie <@1514319419546013796>", {});
  assert.equal(action.kind, "action");
  if (action.kind !== "action" || action.action.name !== "search_transport") return;
  await handleTransportSearch(d.message, { ...action.action, territory: "fr" }, "fr", "!", f.browser());
  const card = d.cards[0]!; await choose(card, "0");
  await settle(() => /Choisis une ligne/.test(card.last.content ?? ""));
  await choose(card, "0"); await settle(() => /arrêt d’arrivée/.test(card.last.content ?? ""));
  assert.match(card.last.content!, /Départ : Station A/); card.collector.stop("cancelled");
});
test("return journey resolves separate route IDs and opposite official platforms, never reversed outbound hours", async () => {
  const f = fixture(), b = f.browser(), network = (await b.regionNetworks(region, "bus"))[0]!;
  const line = (await b.regionLines(network, "bus")).lines.find(l => l.routeId === "R")!;
  const index = await b.index(line);
  const reverse = await b.reverse(line, index, { label: "Station A", ids: ["A"] }, { label: "Station B", ids: ["B"] }, "fr");
  assert.ok(reverse); assert.equal(reverse.line.routeId, "V");
  assert.deepEqual(reverse.origin.ids, ["B2"]); assert.deepEqual(reverse.arrival.ids, ["A2"]);
  const result = await b.departures(reverse.line, reverse.index, reverse.origin, reverse.arrival, "fr");
  assert.match(result.content, /09:00/); assert.match(result.content, /09:20/); assert.doesNotMatch(result.content, /08:10/);
});
test("unidirectional service is not invented as a return journey", async () => {
  const f = fixture(false), b = f.browser(), line = (await b.regionLines(source, "bus")).lines[0]!;
  assert.equal(await b.reverse(line, await b.index(line), { label: "A", ids: ["A"] }, { label: "B", ids: ["B"] }, "fr"), null);
});
test("regional network navigation paginates, keeps the region and rejects previous-page choices", async () => {
  const f = fixture(), b = f.browser(), d = fakeDiscord({ channelId: "regional-pages" });
  b.regionNetworks = async () => Array.from({ length: 40 }, (_, i) => ({ ...source, id: String(i), title: `Réseau ${i}` }));
  await handleTransportCommand(d.message, ["fr", "Normandie"], "fr", "!", "bus", b);
  const card = d.cards[0]!;
  assert.match(card.last.content!, /40 choix · 1\/2/);
  const previous = card.interaction("choose", { values: ["0"], isButton: () => false, isStringSelectMenu: () => true });
  await click(card, "next"); await settle(() => /2\/2/.test(card.last.content ?? ""));
  assert.match(card.last.content!, /Normandie/);
  await card.collector.collect(previous.value); await tick();
  assert.match(JSON.stringify(previous.replies), /plus à jour/); assert.equal(f.calls.includes("/test.zip"), false);
  card.collector.stop("cancelled");
});
test("train results also recalculate a return journey and allow modifying both endpoints", async () => {
  const f = fixture(true, "rail"), b = f.browser(), d = fakeDiscord({ channelId: "regional-train" });
  await handleTransportCommand(d.message, ["fr", "Normandie"], "fr", "!", "rail", b);
  const card = d.cards[0]!; await choose(card, "0");
  await settle(() => /Choisis une ligne/.test(card.last.content ?? "")); await choose(card, "0");
  await settle(() => /arrêt d’arrivée/.test(card.last.content ?? ""));
  await choose(card, "0");
  await settle(() => !!card.last.embeds.length);
  await click(card, "return"); await settle(() => /09:00/.test(JSON.stringify(card.last)));
  assert.match(card.last.embeds[0].title, /Train/);
  await click(card, "modify"); await settle(() => /arrêt d’arrivée/.test(card.last.content ?? ""));
  assert.match(card.last.content!, /Départ : Station B/);
  card.collector.stop("cancelled");
});
test("a closed reverse platform is not served and an expired service calendar does not invent departures", async () => {
  const f = fixture(), b = f.browser(), line = (await b.regionLines(source, "bus")).lines[0]!, index = await b.index(line);
  b.availableStops = async (_line, _index, options) => ({ options: options.filter(g => !g.ids.includes("B2")), note: "Fermeture officielle" });
  const origin = { label: "A", ids: ["A"] }, arrival = { label: "B", ids: ["B"] };
  assert.equal(await b.reverse(line, index, origin, arrival, "fr"), null);
  const future = new TransportBrowserClient(f.provider(), () => Date.parse("2100-01-01T07:00:00Z"));
  const back = await future.reverse(line, index, origin, arrival, "fr"); assert.ok(back);
  const result = await future.departures(back.line, back.index, back.origin, back.arrival, "fr");
  assert.match(result.content, /Aucun départ trouvé/); assert.doesNotMatch(result.content, /09:00/);
});
test("result has one Modify control, return is single-flight, outsider and outdated clicks cannot mutate it", async () => {
  const f = fixture(), d = fakeDiscord({ channelId: "return-controls" });
  const service = f.browser(); let reverseCalls = 0;
  const reverse = service.reverse.bind(service);
  service.reverse = async (...args) => { reverseCalls++; await tick(); return reverse(...args); };
  await handleTransportCommand(d.message, ["fr", "Normandie"], "fr", "!", "bus", service);
  const card = d.cards[0]!;
  const old = card.interaction("choose", { values: ["0"], isButton: () => false, isStringSelectMenu: () => true });
  await choose(card, "0"); await settle(() => /Choisis une ligne/.test(card.last.content ?? ""));
  await card.collector.collect(old.value); await tick();
  assert.match(JSON.stringify(old.replies), /plus à jour/); assert.match(card.last.content!, /Choisis une ligne/);
  await choose(card, "0"); await settle(() => /arrêt d’arrivée/.test(card.last.content ?? ""));
  await choose(card, "0"); await settle(() => !!card.last.embeds.length);
  assert.ok(card.custom("return")); assert.ok(card.custom("modify")); assert.equal(card.custom("back"), undefined);
  assert.equal(card.last.components.flatMap(r => r.components).filter(c => c.label === "Arrêts").length, 1);
  const other = card.interaction("return", { user: { id: "other" } });
  await card.collector.collect(other.value); await tick(); assert.equal(reverseCalls, 0);
  const click1 = card.interaction("return"), click2 = card.interaction("return");
  await Promise.all([card.collector.collect(click1.value), card.collector.collect(click2.value)]);
  await settle(() => reverseCalls === 1 && /09:00/.test(JSON.stringify(card.last)));
  assert.equal(reverseCalls, 1);
  await click(card, "modify"); await settle(() => /arrêt d’arrivée/.test(card.last.content ?? ""));
  assert.equal(card.last.embeds.length, 0);
  card.collector.stop("cancelled"); await card.collector.endWork;
  await card.collector.collect(click1.value, true); await tick(); assert.equal(reverseCalls, 1);
});
