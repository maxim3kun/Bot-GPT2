import test from "node:test";
import assert from "node:assert/strict";
import { handleTransportSearch } from "../src/discord/transport-menu.js";
import { createTransportDialogue } from "../src/discord/transport-dialogue.js";
import { TransportConversation } from "../src/discord/transport-conversation.js";
import { fakeDiscord } from "./fixtures/transport-discord.js";
import type { TransportBrowserClient } from "../src/discord/transport-browser.js";
import { NOW, origin, destination } from "./fixtures/itinerary-fixtures.js";
const tick = () => new Promise<void>(r => setImmediate(r));
test("AI transport menus recheck access before new provider work and close on revocation", async () => {
  const d = fakeDiscord(); let calls = 0, checks = 0;
  const client = { cities: async () => { calls++; return [
    { id: "a", name: "Paris", label: "Paris — 75", latitude: 48.85, longitude: 2.35 },
    { id: "b", name: "Paris", label: "Paris — autre", latitude: 48.85, longitude: 2.35 },
  ]; } } as unknown as TransportBrowserClient;
  await handleTransportSearch(d.message, { place: "Paris", mode: "metro", territory: "fr" }, "fr", "!", client, 1000,
    async () => ++checks === 1);
  const card = d.cards[0]!;
  await card.collector.collect(card.interaction("choose", {
    values: ["0"], isButton: () => false, isStringSelectMenu: () => true,
  }).value);
  await tick();
  assert.equal(checks, 2); assert.equal(calls, 1); assert.equal(card.collector.stopped, true);
  assert.match(card.last.content!, /plus autorisée/);
});
test("Unavailable authorization cannot be mistaken for permission to load transport sources", async () => {
  const d = fakeDiscord(); let calls = 0;
  const client = { cities: async () => { calls++; return []; } } as unknown as TransportBrowserClient;
  await handleTransportSearch(d.message, { place: "Paris", mode: "metro", territory: "fr" }, "fr", "!", client, 1000,
    async () => { throw Error("settings unavailable"); });
  await tick();
  assert.equal(calls, 0); assert.equal(d.cards[0]!.collector.stopped, true);
});
test("Quoted and multiple itineraries do not trigger a partial journey; timetable searches use their own browser", async () => {
  let lookups = 0;
  const service = new TransportConversation({
    places: async q => { lookups++; return /dugommier/i.test(q) ? [origin] : [destination]; },
    journeys: async () => { throw Error("must not execute"); }, stations: async line => ({ line, count: 38 }),
  }, () => NOW);
  const dialogue = createTransportDialogue(service, async () => true);
  for (const text of ['"Quel trajet de Dugommier à Pointe du Lac"', "Quel trajet de Dugommier à Pointe du Lac et mets NRJ",
    "Horaires du bus Amiens vers Beauvais 601", "Joue Le trajet sur YouTube"]) {
    const d = fakeDiscord();
    await dialogue(d.message, text, "fr");
  }
  assert.equal(lookups, 0);
});
