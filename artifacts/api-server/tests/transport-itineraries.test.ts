import test from "node:test";
import assert from "node:assert/strict";
import type { Message } from "discord.js";
import { IdfmPlanner } from "../src/discord/idfm-planner.js";
import { parseItineraries, idfmDate, parsePlaces } from "../src/discord/idfm-itinerary.js";
import { travelTurn, requestedTravelTime } from "../src/discord/transport-intent.js";
import { TransportConversation, formatItinerary } from "../src/discord/transport-conversation.js";
import { createTransportDialogue, travelScope } from "../src/discord/transport-dialogue.js";
import { PlannerError, type ItineraryProvider, type OfficialPlace } from "../src/discord/transport-planner-types.js";
import { NOW, origin, destination, area, journeyBody, requestAt, placeBody } from "./fixtures/itinerary-fixtures.js";
import { fakeDiscord } from "./fixtures/transport-discord.js";

const FIRST = "je prend mon service à Créteil pointe du lac quelle est le chemin que je dois prendre";
const SECOND = "Je prend le métro à Dugommier";
const PAIR = "Quel trajet de Dugommier à Créteil Pointe du Lac ?";
function provider() {
  const calls: { places: string[]; journeys: unknown[][]; stations: string[] } = { places: [], journeys: [], stations: [] };
  const api: ItineraryProvider = {
    async places(q) { calls.places.push(q); return /dugommier/i.test(q) ? [origin] : [destination]; },
    async journeys(...args) { calls.journeys.push(args); return parseItineraries(journeyBody(), origin, destination, requestAt, "departure"); },
    async stations(line) { calls.stations.push(line); return { line, count: 38 }; },
  };
  return { api, calls };
}
const content = (r: { content: string | null } | null) => r?.content ?? "";

test("reported dialogue preserves destination, then takes Dugommier as origin", async () => {
  const { api, calls } = provider(), c = new TransportConversation(api, () => NOW);
  assert.match(content(await c.reply("s", FIRST, "fr")), /D’où pars-tu.*Créteil/);
  assert.equal(calls.places.length, 0);
  const result = content(await c.reply("s", SECOND, "fr", true));
  assert.match(result, /Dugommier \(Paris\) → Pointe du Lac \(Créteil\)/);
  assert.match(result, /Métro 6.*direction.*Nation/);
  assert.match(result, /Métro 8.*direction.*Pointe du Lac/);
  assert.doesNotMatch(result, /RER|Saint-Germain|Embarquement/);
  assert.equal((calls.journeys[0]![0] as OfficialPlace).id, origin.id);
  assert.equal((calls.journeys[0]![1] as OfficialPlace).id, destination.id);
  assert.equal(result.length < 1950, true);
});
test("new transport statement alone does not invent a destination", async () => {
  const c = new TransportConversation(provider().api, () => NOW);
  assert.equal(await c.reply("other", SECOND, "fr"), null);
});
test("missing both endpoints asks for both", async () => {
  const c = new TransportConversation(provider().api, () => NOW);
  assert.match(content(await c.reply("s", "Quel trajet prendre ?", "fr")), /départ et ton arrivée/);
});
test("context is isolated by guild, channel, user and persona", async () => {
  const c = new TransportConversation(provider().api, () => NOW);
  const m = { guildId: "g", channelId: "c", author: { id: "u" } } as Message;
  const scope = travelScope(m);
  await c.reply(scope, FIRST, "fr");
  for (const other of [
    travelScope({ ...m, guildId: "g2" }), travelScope({ ...m, channelId: "c2" }),
    travelScope({ ...m, author: { id: "u2" } } as Message), travelScope(m, "persona1"),
    travelScope(m, "persona2"), travelScope({ ...m, guildId: null }),
  ]) assert.equal(await c.reply(other, SECOND, "fr", true), null);
  assert.match(content(await c.reply(scope, SECOND, "fr", true)), /Métro 6/);
});
test("short-lived context expires and can be explicitly cancelled", async () => {
  let now = NOW; const c = new TransportConversation(provider().api, () => now);
  await c.reply("s", FIRST, "fr"); now += 5 * 60_000 + 1;
  assert.equal(await c.reply("s", SECOND, "fr", true), null);
  await c.reply("s", FIRST, "fr");
  assert.match(content(await c.reply("s", "stop", "fr", true)), /terminée/);
  assert.equal(await c.reply("s", SECOND, "fr", true), null);
});
test("ambiguous place requires an owned choice, never the first candidate", async () => {
  const { api, calls } = provider(); const duplicate = { ...origin, id: "stop_area:IDFM:999", ids: ["stop_area:IDFM:999"], label: "Dugommier (Autre commune)" };
  api.places = async q => /dugommier/i.test(q) ? [origin, duplicate] : [destination];
  const c = new TransportConversation(api, () => NOW);
  assert.match(content(await c.reply("s", PAIR, "fr")), /1\. Dugommier.*\n2\. Dugommier/);
  assert.equal(calls.journeys.length, 0);
  assert.equal(await c.reply("someone-else", "1", "fr", true), null);
  assert.match(content(await c.reply("s", "1", "fr", true)), /Métro 6/);
});
test("a fuzzy search result is offered as a choice rather than silently substituted", async () => {
  const { api, calls } = provider();
  api.places = async () => [{ ...origin, name: "Nationale", label: "Nationale (Paris)" }];
  const c = new TransportConversation(api, () => NOW);
  assert.match(content(await c.reply("s", "Quel trajet de Nation à Créteil ?", "fr")), /Quel départ.*1\. Nationale/s);
  assert.equal(calls.journeys.length, 0);
});
test("explicit role correction invalidates the previous resolved place", async () => {
  const { api, calls } = provider(), c = new TransportConversation(api, () => NOW);
  await c.reply("s", PAIR, "fr");
  await c.reply("s", "Non, je pars de Dugommier", "fr");
  assert.equal(calls.places.filter(q => q === "Dugommier").length, 2);
});
test("criticism rechecks the official provider without automatic agreement", async () => {
  const { api, calls } = provider(), c = new TransportConversation(api, () => NOW);
  await c.reply("s", PAIR, "fr");
  assert.match(content(await c.reply("s", "tu mens", "fr")), /Trajet revérifié/);
  assert.equal(calls.journeys.at(-1)![4], true);
  api.journeys = async () => { throw new PlannerError("unavailable"); };
  const r = content(await c.reply("s", "tu mens", "fr"));
  assert.match(r, /indisponible/); assert.doesNotMatch(r, /raison|revérifié|Métro/);
});
test("arrival deadline is passed as arrival, with the date in Europe/Paris", async () => {
  const { api, calls } = provider(), c = new TransportConversation(api, () => NOW);
  await c.reply("s", `${FIRST} demain à 8h`, "fr"); await c.reply("s", SECOND, "fr", true);
  assert.equal(calls.journeys[0]![3], "arrival");
  assert.equal(calls.journeys[0]![2], idfmDate("20261112T080000"));
});
test("a later time-only reply updates the trip rather than becoming a place", async () => {
  const { api, calls } = provider(), c = new TransportConversation(api, () => NOW);
  await c.reply("s", FIRST, "fr"); await c.reply("s", "demain à 8h", "fr", true);
  assert.equal(calls.places.length, 0);
  await c.reply("s", SECOND, "fr", true);
  assert.equal(calls.journeys[0]![2], idfmDate("20261112T080000"));
  assert.equal(calls.journeys[0]![3], "arrival");
});
test("ambiguous time is clarified, not guessed or moved to another day", () => {
  assert.ok("error" in requestedTravelTime("à 7h", NOW)!);
  assert.ok("error" in requestedTravelTime("lundi à 8h", NOW)!);
  assert.ok("error" in requestedTravelTime("demain", NOW)!);
  assert.ok("error" in requestedTravelTime("à 8:3", NOW)!);
  assert.ok("error" in requestedTravelTime("31/02/2027 à 8h", NOW)!);
  assert.equal(idfmDate("20270328T023000"), null); // Nonexistent spring DST time.
});
test("origin/destination clauses and English pair stay in their stated order", () => {
  assert.equal(travelTurn("Je pars de Dugommier et je dois aller à Créteil Pointe du Lac").origin, "Dugommier");
  assert.equal(travelTurn("How do I get from Dugommier to Créteil Pointe du Lac?").origin, "Dugommier");
  assert.equal(travelTurn("How do I get from Dugommier to Créteil Pointe du Lac?").destination, "Créteil Pointe du Lac");
  assert.equal(travelTurn("Quel trajet de Dugommier à Gare de Lyon en métro ?").outside, false);
  assert.equal(travelTurn("Quel métro prendre de Dugommier à Créteil ?").request, true);
  assert.equal(travelTurn("Comment prendre le métro pour Créteil ?").request, true);
  assert.equal(travelTurn("Je pars de Dugommier et je dois aller à Créteil").request, true);
  assert.equal(travelTurn("Prochains passages du métro 8 à Bonne Nouvelle").request, false);
});
test("non-transit modes are not silently replaced with a metro journey", async () => {
  const { api, calls } = provider(), c = new TransportConversation(api, () => NOW);
  assert.match(content(await c.reply("s", `${PAIR} en voiture`, "fr")), /ne peux pas vérifier/);
  assert.equal(calls.places.length, 0);
});
test("outside coverage never reaches the IDFM route calculator", async () => {
  const { api, calls } = provider(), c = new TransportConversation(api, () => NOW);
  assert.match(content(await c.reply("s", "Quel trajet de Montréal à Laval ?", "fr")), /pas ce territoire/);
  assert.equal(calls.places.length + calls.journeys.length, 0);
});
test("station counts use official distinct stations and separate nominal count from closures", async () => {
  const { api, calls } = provider(), c = new TransportConversation(api, () => NOW);
  const r = content(await c.reply("s", "La ligne 8 du métro parisien a 38 stations ?", "fr"));
  assert.match(r, /\*\*38\*\* stations/); assert.match(r, /fermetures temporaires/);
  assert.deepEqual(calls.stations, ["8"]);
});
test("station-count network ambiguity is clarified first", async () => {
  const { api, calls } = provider(), c = new TransportConversation(api, () => NOW);
  assert.match(content(await c.reply("s", "Combien de stations ligne 8 ?", "fr")), /métro parisien \?/);
  assert.equal(calls.stations.length, 0);
  assert.match(content(await c.reply("s", "oui", "fr", true)), /\*\*38\*\*/);
});
for (const code of ["not_configured", "access", "quota", "unavailable", "invalid", "date", "busy"] as const)
  test(`planner ${code} is explicit and never becomes an invented route`, async () => {
    const { api } = provider(); api.places = async () => { throw new PlannerError(code); };
    const c = new TransportConversation(api, () => NOW), r = content(await c.reply("s", PAIR, "fr"));
    assert.match(r, /pas inventer/); assert.doesNotMatch(r, /Métro 6|RER A/);
  });
test("an empty official result is not a guessed route", async () => {
  const { api } = provider(); api.journeys = async () => [];
  assert.match(content(await new TransportConversation(api, () => NOW).reply("s", PAIR, "fr")), /aucun trajet.*ne peux pas/s);
});
test("Navitia's endpoint-free waiting sections retain the verified connection", () => {
  const result = parseItineraries(journeyBody(), origin, destination, requestAt, "departure");
  assert.equal(result.length, 1); assert.equal(result[0]!.legs.filter(l => l.kind === "transit").length, 2);
  assert.match(formatItinerary(result[0]!, origin, destination, true), /Arrivée 11\/11 08:33/);
});
for (const mutate of [
  (b: ReturnType<typeof journeyBody>) => { b.journeys[0]!.duration = 42; },
  (b: ReturnType<typeof journeyBody>) => { b.journeys[0]!.sections[4]!.display_informations.direction = ""; },
  (b: ReturnType<typeof journeyBody>) => { b.journeys[0]!.sections[4]!.from = area(origin); },
  (b: ReturnType<typeof journeyBody>) => { b.journeys[0]!.sections[0]!.departure_date_time = "20261111T080600"; },
  (b: ReturnType<typeof journeyBody>) => { b.context.timezone = "America/Toronto"; },
]) test("contradictory itinerary is rejected without repairing it", () => {
  const body = journeyBody(); mutate(body);
  assert.throws(() => parseItineraries(body, origin, destination, requestAt, "departure"), PlannerError);
});
test("reversed endpoints and arrival later than the requested deadline are rejected", () => {
  assert.throws(() => parseItineraries(journeyBody(), destination, origin, requestAt, "departure"), PlannerError);
  assert.throws(() => parseItineraries(journeyBody(), origin, destination, requestAt, "arrival"), PlannerError);
});
test("cancellation and a closed boarding stop invalidate the journey", () => {
  const body = journeyBody(); body.journeys[0]!.status = "NO_SERVICE";
  assert.throws(() => parseItineraries(body, origin, destination, requestAt, "departure"), PlannerError);
  body.journeys[0]!.status = "";
  body.journeys[0]!.sections[4]!.links = [{ type: "disruption", id: "closed" }];
  body.disruptions = [{ id: "closed", severity: { effect: "NO_SERVICE" },
    impacted_objects: [{ pt_object: { id: "stop_area:IDFM:71614" } }] }];
  assert.throws(() => parseItineraries(body, origin, destination, requestAt, "departure"), PlannerError);
});
test("closure of an unrelated intermediate station does not close the entire line", () => {
  const body = journeyBody(); body.journeys[0]!.sections[4]!.links = [{ type: "disruption", id: "closed" }];
  body.disruptions = [{ id: "closed", severity: { effect: "NO_SERVICE" },
    impacted_objects: [{ pt_object: { id: "stop_area:IDFM:71311" } }] }];
  assert.equal(parseItineraries(body, origin, destination, requestAt, "departure").length, 1);
});
test("missing transfer is not inferred from a common station parent", () => {
  const body = journeyBody(); body.journeys[0]!.sections.splice(2, 1);
  assert.throws(() => parseItineraries(body, origin, destination, requestAt, "departure"), PlannerError);
});
test("scheduled or mixed legs are not labelled fully live", () => {
  const body = journeyBody();
  let j = parseItineraries(body, origin, destination, requestAt, "departure")[0]!;
  assert.match(formatItinerary(j, origin, destination, true), /Horaires théoriques/);
  body.journeys[0]!.sections[1]!.data_freshness = "realtime";
  j = parseItineraries(body, origin, destination, requestAt, "departure")[0]!;
  assert.match(formatItinerary(j, origin, destination, true), /Prévisions et horaires théoriques/);
});
test("provider client uses only fixed HTTPS PRIM, encodes places, disables redirects and coalesces", async () => {
  let count = 0;
  const client = new IdfmPlanner(async (url, init) => {
    count++; const u = new URL(String(url));
    assert.equal(u.origin, "https://prim.iledefrance-mobilites.fr"); assert.equal(init?.redirect, "error");
    assert.equal(u.searchParams.get("q"), "Dugommier & autre"); assert.ok(init?.signal);
    return Response.json(placeBody(origin));
  }, () => NOW, () => "fixture-credential");
  await Promise.all([client.places("Dugommier & autre"), client.places("Dugommier & autre")]);
  assert.equal(count, 1);
});
for (const [status, code] of [[401, "access"], [403, "access"], [429, "quota"], [503, "unavailable"]] as const)
  test(`HTTP ${status} is safely classified and failure-cached`, async () => {
    let count = 0;
    const client = new IdfmPlanner(async () => { count++; return new Response("", { status }); }, () => NOW, () => "fixture-credential");
    for (let i = 0; i < 2; i++) await assert.rejects(client.places("Dugommier"), (e: PlannerError) => e.code === code);
    assert.equal(count, 1);
  });
test("missing key sends no request and remote error details are not exposed", async () => {
  let count = 0;
  const client = new IdfmPlanner(async () => { count++; throw new Error("unsafe upstream error"); }, () => NOW, () => undefined);
  await assert.rejects(client.places("Dugommier"), (e: PlannerError) => e.code === "not_configured");
  assert.equal(count, 0);
  const broken = new IdfmPlanner(async () => { throw new Error("unsafe upstream error"); }, () => NOW, () => "fixture-credential");
  await assert.rejects(broken.places("Dugommier"), (e: PlannerError) => e.code === "unavailable" && !e.message.includes("unsafe"));
});
test("quota failures cool down across different queries", async () => {
  let count = 0;
  const client = new IdfmPlanner(async () => { count++; return new Response("", { status: 429 }); }, () => NOW, () => "fixture-credential");
  await assert.rejects(client.places("Dugommier"), PlannerError);
  await assert.rejects(client.places("Daumesnil"), PlannerError);
  assert.equal(count, 1);
});
test("official no-solution response is distinct from an outage", async () => {
  const client = new IdfmPlanner(async () => Response.json({ error: { id: "no_solution" } }, { status: 404 }), () => NOW, () => "fixture-credential");
  assert.deepEqual(await client.journeys(origin, destination, requestAt, "departure"), []);
});
test("official station count follows pages and deduplicates station IDs, not platforms", async () => {
  let pages = 0;
  const client = new IdfmPlanner(async url => {
    const u = new URL(String(url));
    if (u.pathname.endsWith("/lines")) return Response.json({ lines: [{
      id: "line:IDFM:C01378", code: "8", physical_modes: [{ id: "physical_mode:Metro" }],
    }] });
    pages++; return Response.json({ stop_areas: Array.from({ length: pages === 1 ? 100 : 2 }, (_, i) => ({ id: `stop_area:IDFM:${i + 1}` })),
      pagination: { total_result: 102 } });
  }, () => NOW, () => "fixture-credential");
  assert.equal((await client.stations("8")).count, 100); assert.equal(pages, 2);
});
test("unsafe/out-of-region places and oversized responses are rejected", async () => {
  const bad = placeBody(origin); bad.places[0]!.id = "stop_area:OTHER:1";
  assert.equal(parsePlaces(bad).length, 0);
  const client = new IdfmPlanner(async () => new Response("{}", { headers: { "content-length": String(5 * 1024 * 1024) } }), () => NOW, () => "fixture-credential");
  await assert.rejects(client.places("Dugommier"), PlannerError);
});
function message(id = "u") {
  const fake = fakeDiscord({ userId: id, embed: false });
  return { m: fake.message, replies: fake.replies };
}
test("Discord adapter consumes denied intents without any provider or model fallback", async () => {
  const { api, calls } = provider(), handle = createTransportDialogue(new TransportConversation(api, () => NOW), async () => false);
  assert.equal(await handle(message().m, PAIR, "fr"), true); assert.equal(calls.places.length, 0);
});
test("Discord adapter supports normal and persona scopes without double execution", async () => {
  const { api, calls } = provider(), handle = createTransportDialogue(new TransportConversation(api, () => NOW), async () => true);
  await handle(message().m, FIRST, "fr", { personaId: "a" });
  const second = message();
  assert.equal(await handle(second.m, SECOND, "fr", { continuationOnly: true, personaId: "b" }), false);
  assert.equal(await handle(second.m, SECOND, "fr", { continuationOnly: true, personaId: "a" }), true);
  await handle(second.m, SECOND, "fr", { continuationOnly: true, personaId: "a" });
  assert.equal(calls.journeys.length, 1); assert.equal(second.replies.length, 1);
});
test("a newer correction suppresses an obsolete in-flight response", async () => {
  const { api } = provider(); let release!: () => void;
  api.places = async () => { await new Promise<void>(r => { release = r; }); return [origin]; };
  const c = new TransportConversation(api, () => NOW);
  const pending = c.reply("s", PAIR, "fr"); await c.reply("s", "stop", "fr", true); release();
  assert.equal((await pending)?.content, null);
});
