import test from "node:test";
import assert from "node:assert/strict";
import { MessageFlags } from "discord.js";
import { TransportConversation } from "../src/discord/transport-conversation.js";
import { ItineraryControls } from "../src/discord/transport-itinerary-controls.js";
import { createTransportDialogue, travelScope } from "../src/discord/transport-dialogue.js";
import { itineraryPages, ITINERARY_SOURCE } from "../src/discord/transport-itinerary-presentation.js";
import { TRANSPORT_CARD_COLOR } from "../src/discord/transport-presentation.js";
import { parseItineraries, idfmDate } from "../src/discord/idfm-itinerary.js";
import { PlannerError, type ItineraryProvider, type VerifiedJourney } from "../src/discord/transport-planner-types.js";
import { NOW, origin, destination, journeyBody, requestAt } from "./fixtures/itinerary-fixtures.js";
import { fakeDiscord, hasControls } from "./fixtures/transport-discord.js";

const PAIR = "Quel trajet de Dugommier à Créteil Pointe du Lac ?";
function setup() {
  let now = NOW, authorized = true, authCalls = 0;
  const calls: { from: string; to: string; at: number; represents: string; fresh?: boolean }[] = [];
  const base = parseItineraries(journeyBody(), origin, destination, requestAt, "departure")[0]!;
  const api: ItineraryProvider = {
    places: async q => /dugommier/i.test(q) ? [origin] : [destination],
    journeys: async (from, to, at, represents, fresh) => {
      calls.push({ from: from.id, to: to.id, at, represents, fresh });
      const j = structuredClone(base), delta = (represents === "arrival" ? at - (base.arrival - base.departure) : at + 300) - base.departure;
      j.departure += delta; j.arrival += delta;
      for (const leg of j.legs) { leg.departure += delta; leg.arrival += delta; }
      return [j];
    }, stations: async line => ({ line, count: 38 }),
  };
  const service = new TransportConversation(api, () => now);
  const authorize = async () => { authCalls++; return authorized; };
  return { service, api, base, calls, authorize, controls: new ItineraryControls(service, authorize),
    setNow(value: number) { now = value; }, deny() { authorized = false; }, get authCalls() { return authCalls; } };
}
async function opened(text = PAIR, options: Parameters<typeof fakeDiscord>[0] = {}) {
  const s = setup(), discord = fakeDiscord(options), scope = travelScope(discord.message);
  const result = (await s.service.reply(scope, text, "fr"))!;
  await s.controls.send(discord.message, scope, result, "fr");
  return { ...s, discord, scope, result, card: discord.cards[0]! };
}
const serialized = (value: unknown) => JSON.stringify(value);
const tick = () => new Promise<void>(r => setImmediate(r));
function gate() { let release!: () => void; const promise = new Promise<void>(r => { release = r; }); return { promise, release }; }

test("journey cards reuse métro colour and hierarchy, with verified times and each connection", async () => {
  const { card } = await opened();
  const embed = card.last.embeds[0]!;
  assert.equal(embed.color, TRANSPORT_CARD_COLOR);
  assert.match(embed.description, /\*\*Départ\*\*.*Dugommier.*\n\*\*Arrivée\*\*.*Pointe du Lac/s);
  assert.match(serialized(embed.fields), /Aujourd’hui · 11\/11.*08:05 → 08:33.*28 min/s);
  for (const value of ["Métro 6", "Nation", "Daumesnil", "Correspondance", "3 min", "Métro 8", "Pointe du Lac"]) assert.ok(serialized(embed).includes(value));
  assert.match(embed.footer.text, /Horaires théoriques.*Europe\/Paris/);
  assert.doesNotMatch(serialized(embed), /Embarquement|RER A/);
  assert.equal(card.last.content, ""); assert.ok(card.custom("refresh")); assert.ok(card.custom("close"));
  assert.equal(card.last.components.flatMap(r => r.components).find(c => c.url)?.url, ITINERARY_SOURCE);
});
test("live, mixed and scheduled status is preserved, including per-leg status for mixed journeys", () => {
  const { base } = setup(), view = { origin, destination, journey: base, now: NOW / 1000 };
  const transit = base.legs.filter(l => l.kind === "transit");
  transit.forEach(l => { l.freshness = "realtime"; });
  assert.match(itineraryPages(view, true)[0]!.embed.footer!.text, /^Prévisions temps réel/);
  transit[1]!.freshness = "base_schedule";
  const mixed = itineraryPages(view, true)[0]!.embed;
  assert.match(mixed.footer!.text, /Prévisions et horaires théoriques/);
  assert.match(serialized(mixed.fields), /temps réel.*prévu/s);
});
test("published walking information, waiting and disruptions are retained without invented times", () => {
  const { base } = setup();
  base.warning = true;
  base.legs.unshift({ kind: "walk", from: "Accès officiel", to: "Dugommier", departure: base.departure - 120, arrival: base.departure });
  base.departure -= 120;
  const pages = itineraryPages({ origin, destination, journey: base, now: NOW / 1000 }, true);
  assert.match(serialized(pages), /À pied.*Accès officiel.*2 min/s);
  assert.match(serialized(pages), /Attente.*4 min/s);
  assert.match(serialized(pages), /Perturbation signalée/);
});
test("arrival after midnight retains its date", () => {
  const { base } = setup();
  base.departure = idfmDate("20261111T235800")!; base.arrival = idfmDate("20261112T001500")!;
  const page = itineraryPages({ origin, destination, journey: base, now: NOW / 1000 }, true)[0]!;
  assert.match(serialized(page.embed.fields), /23:58 → 00:15.*12\/11/);
});
test("long journeys paginate without losing legs or exceeding Discord/text limits", () => {
  const { base } = setup();
  base.legs = Array.from({ length: 14 }, (_, i) => ({
    kind: "transit" as const, line: `Métro ${i}`, direction: `Direction-${i} ${"x".repeat(120)}`,
    from: `Station-${i} ${"a".repeat(120)}`, to: `Station-${i + 1} ${"b".repeat(120)}`,
    departure: base.departure + i * 60, arrival: base.departure + (i + 1) * 60, freshness: "base_schedule",
  }));
  const pages = itineraryPages({ origin, destination, journey: base, now: NOW / 1000 }, true);
  assert.ok(pages.length > 1);
  assert.equal(pages.flatMap(p => p.embed.fields!).filter(f => f.name.startsWith("Métro")).length, 14);
  for (const p of pages) {
    assert.ok(p.content.length < 1950);
    assert.ok(p.embed.fields!.every(f => f.name.length <= 256 && f.value.length <= 1024));
    assert.ok(serialized(p.embed).length < 6000);
  }
});
test("page navigation retains every leg without a new route calculation", async () => {
  const s = setup(), d = fakeDiscord(), scope = travelScope(d.message);
  const result = (await s.service.reply(scope, PAIR, "fr"))!;
  result.itinerary!.journey.legs = Array.from({ length: 10 }, (_, i) => ({
    kind: "transit" as const, line: `Métro ${i}`, direction: `Direction ${i}`, from: `Station ${i}`, to: `Station ${i + 1}`,
    departure: s.base.departure + i * 60, arrival: s.base.departure + (i + 1) * 60, freshness: "base_schedule",
  }));
  await s.controls.send(d.message, scope, result, "fr");
  const card = d.cards[0]!;
  assert.match(card.last.embeds[0]!.title, /1\/3/);
  await card.collector.collect(card.interaction("next").value);
  assert.match(card.last.embeds[0]!.title, /2\/3/);
  assert.match(serialized(card.last.embeds[0]!.fields), /Métro 4/);
  await card.collector.collect(card.interaction("prev").value);
  assert.match(card.last.embeds[0]!.title, /1\/3/);
  assert.equal(s.calls.length, 1);
});
test("refresh preserves the original arrival deadline and endpoints and forces provider recheck", async () => {
  const { service, controls, calls } = setup(), d = fakeDiscord(), scope = travelScope(d.message);
  const result = (await service.reply(scope, `${PAIR} je prends mon service demain à 8h`, "fr"))!;
  await controls.send(d.message, scope, result, "fr");
  const card = d.cards[0]!, click = card.interaction("refresh");
  await card.collector.collect(click.value);
  assert.equal(click.deferred, 1); assert.equal(calls.length, 2);
  assert.equal(calls[1]!.represents, "arrival");
  assert.equal(calls[1]!.at, idfmDate("20261112T080000"));
  assert.equal(calls[1]!.from, origin.id); assert.equal(calls[1]!.to, destination.id);
  assert.equal(calls[1]!.fresh, true);
  assert.equal(card.lifetime, 300000);
});
test("a leave-now refresh uses now rather than the original departure timestamp", async () => {
  const s = setup(), d = fakeDiscord(), scope = travelScope(d.message);
  await s.controls.send(d.message, scope, (await s.service.reply(scope, PAIR, "fr"))!, "fr");
  s.setNow(NOW + 60_000);
  await d.cards[0]!.collector.collect(d.cards[0]!.interaction("refresh").value);
  assert.equal(s.calls[1]!.at, requestAt + 60);
  assert.equal(d.cards[0]!.lifetime, 300000);
});
test("other members and forged guild/channel/message identities cannot operate the card", async () => {
  const { card, calls } = await opened();
  for (const override of [{ user: { id: "other" } }, { guildId: "other" }, { channelId: "other" }, { message: { id: "other" } }]) {
    const click = card.interaction("refresh", override);
    await card.collector.collect(click.value);
    assert.equal(click.replies[0].flags, MessageFlags.Ephemeral);
  }
  assert.equal(calls.length, 1);
});
test("close removes mutating controls, retains the result and cannot be replayed", async () => {
  const { card, service, scope, result, calls } = await opened();
  const oldRefresh = card.interaction("refresh");
  await card.collector.collect(card.interaction("close").value); await card.collector.endWork;
  assert.equal(hasControls(card), false); assert.equal(card.last.embeds.length, 1);
  assert.match(card.last.content!, /terminée/); assert.equal(service.remaining(scope, result.itinerary!.ticket), 0);
  await card.collector.collect(oldRefresh.value, true);
  assert.equal(calls.length, 1);
});
test("expiry disables controls and clears only that route ticket", async () => {
  const s = setup(), d = fakeDiscord(), scope = travelScope(d.message);
  const r = (await s.service.reply(scope, PAIR, "fr"))!;
  await s.controls.send(d.message, scope, r, "fr");
  s.setNow(NOW + 300001); d.cards[0]!.collector.stop("time"); await d.cards[0]!.collector.endWork;
  assert.equal(hasControls(d.cards[0]!), false);
  assert.match(d.cards[0]!.last.content!, /expirée/);
  assert.equal(await s.service.refresh(scope, r.itinerary!.ticket, "fr"), null);
});
test("old controls cannot recalculate or clear a newer journey", async () => {
  const s = setup(), d = fakeDiscord(), scope = travelScope(d.message);
  const first = (await s.service.reply(scope, PAIR, "fr"))!;
  await s.controls.send(d.message, scope, first, "fr"); const old = d.cards[0]!, oldRefresh = old.interaction("refresh");
  const next = (await s.service.reply(scope, PAIR, "fr"))!;
  await s.controls.send(d.message, scope, next, "fr"); await old.collector.endWork;
  await old.collector.collect(oldRefresh.value, true);
  assert.equal(await s.service.refresh(scope, first.itinerary!.ticket, "fr"), null);
  assert.equal(s.calls.length, 2); assert.ok(s.service.remaining(scope, next.itinerary!.ticket));
  await d.cards[1]!.collector.collect(d.cards[1]!.interaction("refresh").value);
  assert.equal(s.calls.length, 3);
});
test("different personas retain separate cards and closing one cannot clear the other", async () => {
  const s = setup(), d = fakeDiscord();
  const a = travelScope(d.message, "persona-a"), b = travelScope(d.message, "persona-b");
  const first = (await s.service.reply(a, PAIR, "fr"))!, next = (await s.service.reply(b, PAIR, "fr"))!;
  await s.controls.send(d.message, a, first, "fr"); await s.controls.send(d.message, b, next, "fr");
  await d.cards[0]!.collector.collect(d.cards[0]!.interaction("close").value); await d.cards[0]!.collector.endWork;
  assert.ok(s.service.remaining(b, next.itinerary!.ticket));
  assert.ok(hasControls(d.cards[1]!));
});
test("permissions and consent are checked again before a saved card refresh", async () => {
  const s = setup(), d = fakeDiscord(), scope = travelScope(d.message), r = (await s.service.reply(scope, PAIR, "fr"))!;
  await s.controls.send(d.message, scope, r, "fr"); s.deny();
  await d.cards[0]!.collector.collect(d.cards[0]!.interaction("refresh").value); await d.cards[0]!.collector.endWork;
  assert.equal(s.calls.length, 1); assert.equal(s.authCalls, 1);
  assert.equal(hasControls(d.cards[0]!), false);
});
for (const options of [{ embed: false }, { failEmbed: true }])
  test("missing EmbedLinks or Discord permission rejection falls back to readable text with working controls", async () => {
    const { card, calls } = await opened(PAIR, options);
    assert.equal(card.last.embeds.length, 0);
    assert.match(card.last.content!, /Métro 6.*Nation.*Métro 8.*Pointe du Lac/s);
    assert.ok(hasControls(card));
    await card.collector.collect(card.interaction("refresh").value);
    assert.equal(calls.length, 2); assert.equal(card.last.embeds.length, 0);
  });
test("permission rejection during edit also falls back without repeating the calculation", async () => {
  const { card, calls } = await opened(); card.failNextEmbed = true;
  await card.collector.collect(card.interaction("refresh").value);
  assert.equal(calls.length, 2); assert.equal(card.last.embeds.length, 0);
  assert.match(card.last.content!, /Métro 6/); assert.ok(hasControls(card));
});
test("provider failure removes the stale prediction, stays honest and allows retry within the deadline", async () => {
  const s = setup(), d = fakeDiscord(), scope = travelScope(d.message);
  await s.controls.send(d.message, scope, (await s.service.reply(scope, PAIR, "fr"))!, "fr");
  const normal = s.api.journeys; s.api.journeys = async () => { throw new PlannerError("quota"); };
  await d.cards[0]!.collector.collect(d.cards[0]!.interaction("refresh").value);
  assert.equal(d.cards[0]!.last.embeds.length, 0);
  assert.match(d.cards[0]!.last.content!, /quota/); assert.doesNotMatch(d.cards[0]!.last.content!, /08:33/);
  s.api.journeys = normal;
  await d.cards[0]!.collector.collect(d.cards[0]!.interaction("refresh").value);
  assert.equal(d.cards[0]!.last.embeds.length, 1);
});
test("double clicks coalesce and acknowledge the busy state without extra provider work", async () => {
  const s = setup(), d = fakeDiscord(), scope = travelScope(d.message);
  await s.controls.send(d.message, scope, (await s.service.reply(scope, PAIR, "fr"))!, "fr");
  const normal = s.api.journeys, wait = gate();
  s.api.journeys = async (...args) => { await wait.promise; return normal(...args); };
  const first = d.cards[0]!.collector.collect(d.cards[0]!.interaction("refresh").value);
  await tick();
  const second = d.cards[0]!.interaction("refresh"); await d.cards[0]!.collector.collect(second.value);
  assert.match(second.replies[0].content, /en cours/);
  wait.release(); await first; assert.equal(s.calls.length, 2);
});
test("closing during an in-flight calculation never resurrects controls or context", async () => {
  const s = setup(), d = fakeDiscord(), scope = travelScope(d.message);
  await s.controls.send(d.message, scope, (await s.service.reply(scope, PAIR, "fr"))!, "fr");
  const normal = s.api.journeys, wait = gate();
  s.api.journeys = async (...args) => { await wait.promise; return normal(...args); };
  const refresh = d.cards[0]!.collector.collect(d.cards[0]!.interaction("refresh").value);
  await tick();
  await d.cards[0]!.collector.collect(d.cards[0]!.interaction("close").value); await d.cards[0]!.collector.endWork;
  wait.release(); await refresh;
  assert.equal(hasControls(d.cards[0]!), false); assert.match(d.cards[0]!.last.content!, /terminée/);
});
test("edits are serialized so a delayed Discord write cannot overwrite closure", async () => {
  const { card } = await opened(), wait = gate(); let first = true;
  card.beforeEdit = async () => { if (first) { first = false; await wait.promise; } };
  const refresh = card.collector.collect(card.interaction("refresh").value); await tick();
  await card.collector.collect(card.interaction("close").value);
  wait.release(); await refresh; await card.collector.endWork;
  assert.equal(hasControls(card), false); assert.match(card.last.content!, /terminée/);
});
test("a late initial send cannot install controls for an obsolete result", async () => {
  const s = setup(), d = fakeDiscord(), scope = travelScope(d.message), wait = gate();
  const first = (await s.service.reply(scope, PAIR, "fr"))!; d.setBeforeReply(() => wait.promise);
  const sending = s.controls.send(d.message, scope, first, "fr"); await tick();
  const next = (await s.service.reply(scope, PAIR, "fr"))!;
  wait.release(); await sending;
  assert.equal(hasControls(d.cards[0]!), false); assert.equal(d.cards[0]!.lifetime, 0);
  assert.ok(s.service.remaining(scope, next.itinerary!.ticket));
});
test("Discord adapter renders the same card in guilds, DMs and persona scopes", async () => {
  for (const settings of [{ guildId: "g", personaId: undefined }, { guildId: null, personaId: undefined }, { guildId: "g", personaId: "persona" }]) {
    const s = setup(), d = fakeDiscord({ guildId: settings.guildId });
    const handle = createTransportDialogue(s.service, s.authorize);
    assert.equal(await handle(d.message, PAIR, "fr", { personaId: settings.personaId }), true);
    assert.equal(d.replies[0]!.embeds.length, 1);
    await d.cards[0]!.collector.collect(d.cards[0]!.interaction("refresh").value);
    assert.equal(s.authCalls, 2); assert.equal(s.calls.length, 2);
  }
});
