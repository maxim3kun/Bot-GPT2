import assert from "node:assert/strict";
import test from "node:test";
import { handleTransportCommand } from "../src/discord/transport-menu.js";
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
test("France, Québec or Angleterre is selected once and returns only through New search", async () => {
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
  for (let i = 0; i < 4; i++) await choose(card, "0"); // commune, line, origin, destination
  assert.equal(card.last.embeds.length, 1); assert.ok(card.custom("restart"));
  assert.equal(JSON.stringify(card.last.components).includes("France / Québec"), false);
  const outsider = card.interaction("restart", { user: { id: "other" } });
  await card.collector.collect(outsider.value); await tick();
  assert.match(JSON.stringify(outsider.replies), /appartient/); assert.equal(card.last.embeds.length, 1);
  await click(card, "restart");
  assert.match(card.last.content!, /Choisis le territoire/); assert.equal(card.last.embeds.length, 0);
  assert.equal(s.requests.length, 1, "restart must not silently query the previous postal code again");
  await choose(card, "qc");
  assert.match(card.last.content!, /localité québécoise/); assert.equal(s.requests.length, 1);
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
  assert.equal(card.last.components.flatMap(row => row.components).find(c => c.custom_id?.endsWith(":next"))?.label, "Suivant");
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
  await wait(() => card.last.content?.includes("departure stop") ?? false);
  assert.equal(indexedLine, "tfl:906");
  assert.match(card.last.content!, /906/);
  assert.doesNotMatch(card.last.content!, /Choose a route/);
  card.collector.stop("cancelled");
});
