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
