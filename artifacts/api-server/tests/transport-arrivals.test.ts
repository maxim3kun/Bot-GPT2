import test from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import { EmbedBuilder } from "discord.js";
import { arrivalForDisplay, withArrivalApproximations } from "../src/discord/transport-arrivals.js";
import { buildJourneyIndex, journeyPairs, type JourneyTime } from "../src/discord/gtfs-journey.js";
import { departureCards } from "../src/discord/transport-presentation.js";
import { idfmTimeAllowed, type IdfmTraffic } from "../src/discord/idfm-live.js";

const at = (iso: string) => Date.parse(iso) / 1000;
const NOW = at("2026-11-11T10:02:00Z");
type Trip = { id: string; start?: string; arrival?: string; terminal?: string; intermediate?: string[] };
async function fixture(trips: Trip[] = [{ id: "A" }]) {
  const rows = trips.flatMap(trip => [
    `${trip.id},${trip.start ?? "11:00:00"},${trip.start ?? "11:00:00"},O,1`,
    ...(trip.intermediate ?? ["X"]).map((id, i) => `${trip.id},11:04:00,11:04:00,${id},${i + 2}`),
    `${trip.id},${trip.arrival ?? "11:10:00"},${trip.arrival ?? "11:10:00"},D,10`,
    `${trip.id},26:00:00,26:00:00,${trip.terminal ?? "T"},11`,
  ]).join("\n");
  return buildJourneyIndex(zipSync(Object.fromEntries(Object.entries({
    "agency.txt": "agency_id,agency_name,agency_timezone\nA,Test,Europe/Paris\n",
    "routes.txt": "route_id,route_short_name,route_type\nB,8,1\n",
    "trips.txt": "route_id,service_id,trip_id\n" + trips.map(t => `B,S,${t.id}`).join("\n"),
    "stops.txt": "stop_id,stop_name,parent_station\nO,Bonne Nouvelle,SO\nX,Intermediate,SX\nD,Concorde,SD\nT,Balard,ST\nT2,Other terminus,ST2\n",
    "calendar.txt": "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nS,1,1,1,1,1,1,1,20200101,20991231\n",
    "stop_times.txt": "trip_id,arrival_time,departure_time,stop_id,stop_sequence\n" + rows,
  }).map(([key, value]) => [key, strToU8(value)]))), "B");
}
const live = (overrides: Partial<JourneyTime> = {}): JourneyTime => ({
  tripId: "separate-live-reference", departureAt: NOW, arrivalAt: null, realtime: true,
  departureStopId: "O", arrivalStopId: "D", terminalStopId: "T", ...overrides,
});
const card = (times: JourneyTime[], options: Partial<Parameters<typeof departureCards>[0]> = {}) => departureCards({
  title: "Métro 8", origin: "Bonne Nouvelle", arrival: "Concorde", multiPlatform: true,
  stops: new Map([["O", { id: "O", name: "BONNE-NOUVELLE", parent: "SO" }]]),
  times, timezone: "Europe/Paris", now: NOW, french: true, realtime: true, notes: [], empty: "", ...options,
});

test("redundant boarding names disappear after accent, case and punctuation normalization", () => {
  for (const [origin, arrival, stop] of [
    ["Bonne Nouvelle", "Concorde", "BONNE-NOUVELLE"],
    ["A", "République", "REPUBLIQUE"],
    ["AMIENS - Gare", "B", "Amiens · Gare"],
  ]) {
    const result = card([live({ arrivalAt: NOW + 600 })], {
      origin, arrival, stops: new Map([["O", { id: "O", name: stop, parent: "S" }]]),
    });
    assert.doesNotMatch(result.content, /Embarquement|Boarding/);
    assert.doesNotMatch(result.expandedContent, /Embarquement|Boarding/);
  }
});

test("a distinct shared platform remains visible once in compact, expanded and text results", () => {
  const times = Array.from({ length: 6 }, (_, i) => live({ departureAt: NOW + i * 600, arrivalAt: NOW + i * 600 + 300 }));
  const result = card(times, { multiPlatform: false,
    stops: new Map([["O", { id: "O", name: "Bonne Nouvelle - Quai E", parent: "S" }]]) });
  assert.equal((result.content.match(/Quai E/g) ?? []).length, 1);
  assert.equal((result.expandedContent.match(/Quai E/g) ?? []).length, 1);
  assert.equal(result.embed.fields![0]!.value.split("\n").length, 3);
  assert.equal(result.expandedEmbed.fields![0]!.value.split("\n").length, 6);
  assert.doesNotThrow(() => EmbedBuilder.from(result.expandedEmbed).toJSON());
});

test("an unnamed boarding point is never assigned another departure's platform", () => {
  const result = card([live(), live({ departureStopId: "E", departureAt: NOW + 600 })], {
    stops: new Map([["O", { id: "O", name: "Bonne Nouvelle", parent: "S" }],
      ["E", { id: "E", name: "Bonne Nouvelle - Quai E", parent: "S" }]]),
  });
  assert.doesNotMatch(result.embed.description!, /Embarquement/);
  const rows = result.embed.fields![0]!.value.split("\n");
  assert.doesNotMatch(rows[0]!, /Quai E/);
  assert.match(rows[1]!, /Quai E/);
});

test("every departure explicitly states arrival availability in both languages", () => {
  for (const french of [true, false]) {
    const result = card([live()], { french });
    assert.match(result.embed.fields![0]!.value, french ? /→ arrivée indisponible/ : /→ arrival unavailable/);
    assert.doesNotMatch(result.embed.fields![0]!.value, /min/);
    assert.match(result.content, french ? /arrivées selon disponibilité/ : /arrivals where available/);
  }
});

test("published durations create display-only approximations, never a GTFS-to-live vehicle match", async () => {
  const index = await fixture(), pairs = journeyPairs(index, new Set(["O"]), new Set(["D"]));
  const original = live();
  const [time] = withArrivalApproximations(index, pairs, [original]);
  assert.equal(original.arrivalApproximation, undefined);
  assert.equal(original.arrivalAt, null);
  assert.equal(time!.arrivalAt, null, "connection calculations must still see an unknown measured arrival");
  assert.equal(time!.tripId, original.tripId);
  assert.equal(time!.arrivalApproximation!.at, NOW + 600);
  assert.equal(time!.arrivalApproximation!.sourceTripId, "A");
  assert.equal(time!.arrivalApproximation!.serviceDate, "20261111");
  assert.deepEqual(arrivalForDisplay(time!), { kind: "approximate", at: NOW + 600 });
});

test("the nearest compatible published duration is used, with its whole range retained", async () => {
  const index = await fixture([{ id: "A" }, { id: "B", start: "11:10:00", arrival: "11:22:00" }]);
  const pairs = journeyPairs(index, new Set(["O"]), new Set(["D"]));
  const [time] = withArrivalApproximations(index, pairs, [live()]);
  assert.equal(time!.arrivalApproximation!.at, NOW + 600);
  assert.equal(time!.arrivalApproximation!.earliestAt, NOW + 600);
  assert.equal(time!.arrivalApproximation!.latestAt, NOW + 720);
  const later = live({ departureAt: at("2026-11-11T10:09:00Z") });
  assert.equal(withArrivalApproximations(index, pairs, [later])[0]!.arrivalApproximation!.sourceTripId, "B");
});

test("expresses, alternate branches and ambiguous loops cannot supply a guessed duration", async () => {
  for (const intermediate of [[], ["Y"]]) {
    const index = await fixture([{ id: "A" }, { id: "Express", intermediate }]);
    const pairs = journeyPairs(index, new Set(["O"]), new Set(["D"]));
    assert.equal(withArrivalApproximations(index, pairs, [live()])[0]!.arrivalApproximation, undefined);
    assert.equal(withArrivalApproximations(index, pairs, [live({ tripId: "A", terminalStopId: undefined })])[0]!
      .arrivalApproximation!.sourceTripId, "A", "a known GTFS trip uses only its own published pattern");
  }
  const index = await fixture(), pairs = journeyPairs(index, new Set(["O"]), new Set(["D"]));
  assert.equal(withArrivalApproximations(index, [...pairs, ...pairs], [live()])[0]!.arrivalApproximation, undefined);
});

test("wrong direction, route, unknown identity and missing durations remain unavailable", async () => {
  const index = await fixture(), pairs = journeyPairs(index, new Set(["O"]), new Set(["D"]));
  for (const value of [live({ terminalStopId: "T2" }), live({ terminalStopId: undefined }),
    live({ departureStopId: "D" }), live({ arrivalStopId: "X" })]) {
    assert.equal(withArrivalApproximations(index, pairs, [value])[0]!.arrivalApproximation, undefined);
  }
  index.metadata.trips.get("A")!.routeId = "wrong";
  assert.equal(withArrivalApproximations(index, pairs, [live()])[0]!.arrivalApproximation, undefined);
  index.metadata.trips.get("A")!.routeId = "B";
  index.visits.get("A")!.find(v => v.stopId === "D")!.arrival = "";
  assert.equal(withArrivalApproximations(index, pairs, [live()])[0]!.arrivalApproximation, undefined);
});

test("cancelled trips, closed service dates and mismatched service instances are not duration references", async () => {
  const index = await fixture(), pairs = journeyPairs(index, new Set(["O"]), new Set(["D"]));
  assert.equal(withArrivalApproximations(index, pairs, [live()], new Set(["A"]))[0]!.arrivalApproximation, undefined);
  assert.equal(withArrivalApproximations(index, pairs, [live({ tripId: "A", serviceDate: "20261112" })])[0]!.arrivalApproximation, undefined);
  index.metadata.calendarExceptions.set("20261111:S", 2);
  assert.equal(withArrivalApproximations(index, pairs, [live()])[0]!.arrivalApproximation, undefined);
  index.metadata.calendarExceptions.set("20261111:S", 1);
  assert(withArrivalApproximations(index, pairs, [live()])[0]!.arrivalApproximation);
});

test("a measured arrival always wins and is not overwritten by a duration approximation", async () => {
  const index = await fixture(), pairs = journeyPairs(index, new Set(["O"]), new Set(["D"]));
  const measured = live({ arrivalAt: NOW + 420 });
  assert.strictEqual(withArrivalApproximations(index, pairs, [measured])[0], measured);
  assert.deepEqual(arrivalForDisplay(measured), { kind: "realtime", at: NOW + 420 });
  assert.deepEqual(arrivalForDisplay({ ...measured, realtime: false }), { kind: "scheduled", at: NOW + 420 });
});

test("mixed arrivals stay readable, with approximate markers in rows and a truthful footer", async () => {
  const index = await fixture(), pairs = journeyPairs(index, new Set(["O"]), new Set(["D"]));
  const [estimated] = withArrivalApproximations(index, pairs, [live()]);
  const result = card([live({ arrivalAt: NOW + 360 }), estimated!, live({ terminalStopId: undefined }),
    live({ realtime: false, arrivalAt: NOW + 720 })]);
  assert.match(result.embed.fields![0]!.value, /11:08 · 6 min/);
  assert.match(result.embed.fields![0]!.value, /→ ≈ 11:12 · ≈ 10 min/);
  assert.match(result.embed.fields![0]!.value, /→ arrivée indisponible/);
  assert.match(result.embed.footer!.text, /Départs temps réel.*arrivée approximative/);
  assert.match(result.expandedContent, /prévus/);
  assert.match(result.expandedEmbed.fields![0]!.value, /prévu/);
});

test("overnight services use their actual service date and estimates show midnight dates", async () => {
  const index = await fixture([{ id: "Night", start: "25:03:00", arrival: "25:10:00", intermediate: [] }]);
  const pairs = journeyPairs(index, new Set(["O"]), new Set(["D"]));
  index.metadata.calendarExceptions.set("20261111:S", 2);
  const value = live({ departureAt: at("2026-11-11T00:04:00Z") });
  const [time] = withArrivalApproximations(index, pairs, [value]);
  assert.equal(time!.arrivalApproximation!.serviceDate, "20261110");
  assert.equal(time!.arrivalApproximation!.at, at("2026-11-11T00:11:00Z"));
  const midnight = { ...time!, departureAt: at("2026-11-11T22:59:00Z"), arrivalApproximation: {
    ...time!.arrivalApproximation!, at: at("2026-11-11T23:06:00Z"),
  } };
  assert.match(card([midnight]).content, /≈ 00:06 \(12\/11\)/);
});

test("published durations honor DST rather than subtracting wall-clock times", async () => {
  const index = await fixture([{ id: "DST", start: "01:55:00", arrival: "03:05:00", intermediate: [] }]);
  const pairs = journeyPairs(index, new Set(["O"]), new Set(["D"]));
  const [time] = withArrivalApproximations(index, pairs, [live({ departureAt: at("2026-10-24T23:57:00Z") })]);
  assert.equal(time!.arrivalApproximation!.at - time!.departureAt, 130 * 60);
  assert.match(card([time!]).content, /≈ 03:07/);
});

test("the whole approximation range is checked against closures, not just its preferred minute", async () => {
  const index = await fixture([{ id: "A" }, { id: "B", start: "11:10:00", arrival: "11:22:00" }]);
  const [time] = withArrivalApproximations(index, journeyPairs(index, new Set(["O"]), new Set(["D"])), [live()]);
  const info: IdfmTraffic = { available: true, rules: [{ points: new Set(["D"]), areas: new Set(), wholeLine: false,
    blocking: true, unresolved: false, message: "closed", periods: [{ begin: NOW + 660, end: NOW + 3600 }] }] };
  assert.equal(time!.arrivalApproximation!.at, NOW + 600);
  assert(!idfmTimeAllowed(info, index, time!, ["O"], ["D"]));
  info.rules[0]!.periods[0]!.begin = NOW + 721;
  assert(idfmTimeAllowed(info, index, time!, ["O"], ["D"]));
});
