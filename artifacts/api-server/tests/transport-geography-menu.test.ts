import assert from "node:assert/strict";
import test from "node:test";
import { handleTransportCommand, handleTransportSearch } from "../src/discord/transport-menu.js";
import type { TransportBrowserClient } from "../src/discord/transport-browser.js";
import { fakeDiscord, type FakeCard } from "./fixtures/transport-discord.js";
const tick = () => new Promise<void>(resolve => setImmediate(resolve));
async function choose(card: FakeCard, value: string) {
  await card.collector.collect(card.interaction("choose", { values: [value],
    isButton: () => false, isStringSelectMenu: () => true }).value); await tick();
}
async function click(card: FakeCard, action: string) {
  await card.collector.collect(card.interaction(action).value); await tick();
}
function service(station = false) {
  const requests: unknown[] = [];
  const place = { id: station ? "sncf:beauvais" : "60057", name: "Beauvais", label: station ? "Gare de Beauvais — Oise" : "Beauvais — Oise",
    latitude: 49.43, longitude: 2.08, ...(station ? { kind: "station" } : {}) };
  const source = { name: "Source officielle", url: "https://transport.data.gouv.fr/datasets/test" };
  const routes = ["1", "2"].map(label => ({ label, routeId: label, description: "Gare → Arrivée",
    mode: station ? "rail" : "bus", nearbyStopIds: ["O"], source }));
  const index = { stops: new Map([["O", { id: "O", name: "Gare" }], ["D", { id: "D", name: "Arrivée" }]]),
    visits: new Map([["trip", [{ stopId: "O", pickup: true, dropoff: true }, { stopId: "D", pickup: true, dropoff: true }]]]) };
  return { requests, value: {
    territories: ["fr", "qc", "en"], cities: async (...args: unknown[]) => { requests.push(args); return station ? [place] : [place, { ...place, id: "60009", name: "Allonne" }]; },
    lines: async () => ({ lines: routes, unavailable: 0 }), index: async () => index,
    availableStops: async (_line: unknown, _index: unknown, options: unknown[]) => ({ options, note: "" }),
    departures: async () => ({ content: "Horaires théoriques", source, embed: { title: "Trajet", description: "Horaires théoriques" } }),
  } as unknown as TransportBrowserClient };
}
test("France, Québec or Angleterre is selected once and the redundant new-search button is hidden", async () => {
  const d = fakeDiscord(), s = service();
  await handleTransportCommand(d.message, ["60000"], "fr", "!", "bus", s.value);
  const card = d.cards[0]!;
  assert.match(card.last.content!, /Choisis le territoire/); assert.equal(s.requests.length, 0);
  const selector = card.last.components.flatMap(row => row.components)
    .find((component: any) => component.custom_id?.includes(":choose")) as any;
  assert.deepEqual(selector?.options?.map((option: any) => option.label), ["France", "Québec", "Angleterre"]);
  await choose(card, "fr");
  assert.deepEqual(s.requests, [["60000", "fr", "bus"]]);
  assert.ok(card.custom("filter"), "department and postcode commune lists must be searchable");
  assert.equal(card.custom("territory"), undefined);
  for (let i = 0; i < 3; i++) await choose(card, "0"); // commune, line, destination; the unique origin is automatic
  assert.equal(card.last.embeds.length, 1); assert.equal(card.custom("restart"), undefined);
  assert.equal(JSON.stringify(card.last.components).includes("France / Québec"), false);
  assert.deepEqual(card.last.components.map(row => row.components.map(component => component.label)),
    [["Actualiser", "Retour", "Options"], ["Arrêts", "Source", "Fermer"]]);
  card.collector.stop("cancelled");
});
test("The train entry forwards its mode and uses station coordinates instead of all postal-code communes", async () => {
  const d = fakeDiscord(), s = service(true);
  await handleTransportCommand(d.message, ["60000"], "fr", "!", "rail", s.value);
  const card = d.cards[0]!; await choose(card, "fr");
  assert.deepEqual(s.requests, [["60000", "fr", "rail"]]);
  assert.match(card.last.content!, /Gare de Beauvais/); assert.match(card.last.content!, /Choisis une ligne/);
  assert.equal(card.custom("territory"), undefined); card.collector.stop("cancelled");
});

test("a uniquely resolved French metro city skips the territory prompt", async () => {
  const d = fakeDiscord(), s = service();
  s.value.inferTerritory = async (place: string) => place === "Paris" ? "fr" : undefined;
  await handleTransportCommand(d.message, ["Paris", "ligne", "8"], "fr", "!", "metro", s.value);
  const card = d.cards[0]!;
  assert.doesNotMatch(card.last.content!, /Choisis le territoire/);
  assert.match(card.last.content!, /Quelle commune/);
  assert.deepEqual(s.requests, [["Paris", "fr", "metro"]]);
  card.collector.stop("cancelled");
});

test("selected metro arrivals omit redundant route notes and results use two compact button rows", async () => {
  const d = fakeDiscord(), s = service();
  const city = { id: "75056", name: "Paris", label: "Paris — 75", latitude: 48.85, longitude: 2.35 };
  const source = { name: "IDFM", url: "https://transport.data.gouv.fr/datasets/test" };
  s.value.cities = async () => [city] as any;
  s.value.lines = async () => ({ lines: [{ label: "8", routeId: "M8", description: "Métro 8", mode: "metro",
    nearbyStopIds: ["O"], selection: true, source,
    resource: { original_url: "https://eu.ftp.opendatasoft.com/stif/GTFS/IDFM-gtfs.zip" } }] as any, unavailable: 0 });
  s.value.departures = async () => ({ content: "Horaires", source, hasMore: true,
    embed: { title: "Métro 8", description: "Horaires" } } as any);
  await handleTransportSearch(d.message, { place: "Paris", territory: "fr", mode: "metro" }, "fr", "!", s.value);
  const card = d.cards[0]!;
  assert.match(card.last.content!, /Choisis une ligne/);
  await choose(card, "0");
  assert.match(card.last.content!, /Choisis ta station d’arrivée/);
  assert.doesNotMatch(card.last.content!, /Trajets directs sur la ligne choisie|Correspondances non calculées/);
  await choose(card, "0");
  assert.equal(card.last.components.length, 2);
  assert.deepEqual(card.last.components.map(row => row.components.map(component => component.label)),
    [["Actualiser", "Retour", "Options"], ["Plus d’horaires", "Arrêts", "Source", "Fermer"]]);
  card.collector.stop("cancelled");
});

test("675 routes are visibly counted across 27 selectable pages", async () => {
  const d = fakeDiscord(), s = service();
  s.value.lines = async () => ({ lines: Array.from({ length: 675 }, (_, i) => ({
    label: String(i + 1), routeId: String(i + 1), description: "Transport for London", mode: "bus",
    nearbyStopIds: [], source: { name: "TfL", url: "https://tfl.gov.uk/modes/buses/" },
  })), unavailable: 0 });
  await handleTransportCommand(d.message, ["60000"], "fr", "!", "bus", s.value);
  const card = d.cards[0]!;
  await choose(card, "fr");
  await choose(card, "0");
  assert.match(card.last.content!, /675 lignes · 1\/27/);
  assert.match(card.last.content!, /25 lignes par page/);
  const controls = card.last.components.find(row => row.components.some(c => c.custom_id?.endsWith(":next")));
  assert.deepEqual(controls?.components.map(component => component.label), ["←", "→", "Retour", "Rechercher", "Annuler"]);
  await click(card, "next");
  assert.match(card.last.content!, /675 lignes · 2\/27/);
  const selector = card.last.components.flatMap(row => row.components)
    .find((component: any) => component.custom_id?.includes(":choose")) as any;
  assert.equal(selector?.options?.length, 25);
  card.collector.stop("cancelled");
});

test("numbered bus routes sort low to high and a unique search opens it directly", async () => {
  const d = fakeDiscord();
  const city = { id: "tfl:london", name: "London", label: "London · TfL", latitude: 51.5, longitude: -.1, territory: "en" as const };
  const network = { id: "tfl", title: "Transport for London", slug: "tfl", type: "public-transit",
    page_url: "https://tfl.gov.uk", resources: [{ id: 1, title: "TfL", format: "JSON", is_available: true,
      url: "https://api.tfl.gov.uk/" }] };
  const lines = Array.from({ length: 975 }, (_, i) => {
    const number = 975 - i;
    return { routeId: `tfl:${number}`, label: String(number), description: `Bus ${number}`,
      mode: "bus", nearbyStopIds: [], allStops: true, territory: "en",
      source: { name: "TfL", url: "https://tfl.gov.uk/modes/buses/" },
      resource: { id: number, title: String(number), format: "TfL JSON", is_available: true, url: "https://api.tfl.gov.uk/" } };
  });
  const index = { routeId: "tfl:906",
    metadata: { routes: new Map(), trips: new Map([["trip", { routeId: "tfl:906", headsign: "End",
      directionId: "inbound", serviceId: "live" }]]), calendars: new Map(), calendarExceptions: new Map(), timezone: "Europe/London" },
    stops: new Map([["origin", { id: "origin", name: "Beehive Lane", parent: "" }],
      ["arrival", { id: "arrival", name: "Millwell Crescent", parent: "" }]]),
    visits: new Map([["trip", [{ stopId: "origin", sequence: 0, pickup: true, dropoff: true },
      { stopId: "arrival", sequence: 1, pickup: true, dropoff: true }]]]) };
  let indexedLine = "";
  const service = {
    territories: ["en"], cities: async () => [city], networks: async () => [network],
    lines: async () => ({ lines, unavailable: 0, networkScoped: true }),
    index: async (line: { routeId: string }) => { indexedLine = line.routeId; return index; },
  } as any;
  await handleTransportCommand(d.message, ["Angleterre", "London"], "en", "!", "bus", service);
  const card = d.cards[0]!;
  const wait = async (predicate: () => boolean) => {
    for (let i = 0; i < 100 && !predicate(); i++) await new Promise(resolve => setTimeout(resolve, 5));
    assert.ok(predicate(), `Menu state was not reached: ${card.last.content}`);
  };
  await wait(() => card.last.content?.includes("Choose a route") ?? false);
  assert.match(card.last.content!, /975 routes · 1\/39/);
  const routeOptions = () => card.last.components.flatMap(row => row.components)
    .find((component: any) => component.custom_id?.includes(":choose")) as any;
  assert.equal(routeOptions()?.options?.length, 25);
  assert.match(routeOptions().options[0].label, /^1 ·/);
  assert.match(routeOptions().options[24].label, /^25 ·/);
  await click(card, "next");
  await wait(() => card.last.content?.includes("975 routes · 2/39") ?? false);
  assert.match(routeOptions().options[0].label, /^26 ·/);

  const submitted = card.interaction("filter", {
    isButton: () => true,
    async showModal() {},
    async awaitModalSubmit() {
      return { fields: { getTextInputValue: () => "906" }, async deferUpdate() {} };
    },
  });
  await card.collector.collect(submitted.value);
  await wait(() => card.last.content?.includes("arrival stop") ?? false);
  assert.equal(indexedLine, "tfl:906");
  assert.match(card.last.content!, /906/);
  assert.doesNotMatch(card.last.content!, /Choose a route/);
  card.collector.stop("cancelled");
});
