import assert from "node:assert/strict";
import test from "node:test";
import { EnglandHttp } from "../src/discord/england-http.js";
import { EnglandLocations } from "../src/discord/england-locations.js";
import { BodsTransportClient } from "../src/discord/england-bods.js";
import { TransportMetadataCache, publicMetadata } from "../src/discord/transport-metadata-cache.js";
import { TransportDataError } from "../src/discord/transport-data-error.js";
import { normalizeTransitText, type TransitMode } from "../src/discord/transport-query.js";
import { parseTransportCommand } from "../src/discord/transport-command-query.js";
import { selectAiCommand } from "../src/discord/ai-command-intent.js";
import { parseAiCommandTool } from "../src/discord/ai-command-tools.js";
import { scheduledEpoch } from "../src/discord/gtfs-realtime.js";
import { tflPatterns, tflTimes } from "../src/discord/england-tfl.js";
import { txcRuns, xmlDocument, type BankHoliday } from "../src/discord/england-txc.js";
import type { JourneyIndex } from "../src/discord/gtfs-journey.js";
import { EnglandTransportClient } from "../src/discord/england-transport.js";

const NOW = Date.parse("2026-11-11T18:00:00Z");
const blankCache = () => new TransportMetadataCache(() => null, () => NOW);
test("England command prefixes and AI actions keep transport geography scoped", () => {
  const parsed = parseTransportCommand(["Angleterre", "Cambridge", "132"]);
  assert.equal(parsed.place, "Cambridge");
  assert.equal(parsed.line, "132");
  assert.equal(parsed.territory, "en");
  const intent = selectAiCommand("Quels bus à Londres en Angleterre ?", {});
  assert.equal(intent.kind, "action");
  if (intent.kind === "action") {
    assert.equal(intent.action.name, "search_transport");
    if (intent.action.name === "search_transport") {
      assert.equal(intent.action.territory, "en");
      assert.equal(intent.action.place, "Londres");
    }
  }
  assert.equal(parseAiCommandTool([{ type: "function", function: {
    name: "search_transport", arguments: JSON.stringify({ mode: "bus", place: "London", territory: "en" }),
  } }], [])?.name, "search_transport");
  assert.equal(normalizeTransitText("Angleterre"), "angleterre");
});

test("official TfL branches join only their published next branch", () => {
  const stop = (id: string) => ({ id, name: id, lat: 51.5, lon: -0.1 });
  const patterns = tflPatterns([
    { branchId: 1, direction: "northbound", prevBranchIds: [], nextBranchIds: [2],
      stopPoint: [stop("A"), stop("B")] },
    { branchId: 2, direction: "northbound", prevBranchIds: [1], nextBranchIds: [],
      stopPoint: [stop("B"), stop("C")] },
    { branchId: 3, direction: "southbound", prevBranchIds: [], nextBranchIds: [],
      stopPoint: [stop("C"), stop("B"), stop("A")] },
  ], "tfl:test");
  assert.deepEqual(patterns.map(p => p.stopIds), [["A", "B", "C"], ["C", "B", "A"]]);
  assert.throws(() => tflPatterns([
    { branchId: 1, direction: "in", prevBranchIds: [], nextBranchIds: [2], stopPoint: [stop("A"), stop("B")] },
    { branchId: 2, direction: "in", prevBranchIds: [1], nextBranchIds: [], stopPoint: [stop("X"), stop("C")] },
  ], "tfl:test"), /continuité/);
});

function liveIndex(routeId = "tfl:test"): JourneyIndex {
  const metadata: JourneyIndex["metadata"] = {
    routes: new Map([[routeId, { shortName: "Test", longName: "Test line", type: 1 }]]),
    trips: new Map([["trip", { routeId, headsign: "Terminal", directionId: "northbound", serviceId: "today" }]]),
    calendars: new Map(), calendarExceptions: new Map(), timezone: "Europe/London",
  };
  const names = ["Origin", "Destination", "Terminal"];
  const stops = new Map(names.map((name, i) => [`stop-${i}`, { id: `stop-${i}`, name, parent: "" }]));
  return { metadata, routeId, stops, connectionsUnavailable: true, visits: new Map([["trip", names.map((_, sequence) =>
    ({ stopId: `stop-${sequence}`, sequence, arrival: "", departure: "", pickup: true, dropoff: true }))]]) };
}
function prediction(overrides: Record<string, unknown> = {}) {
  return { id: "pred", vehicleId: "vehicle4", naptanId: "stop-0", lineId: "test", direction: "northbound",
    tripId: "trip", destinationNaptanId: "stop-2", expectedArrival: new Date(NOW + 5 * 60_000).toISOString(),
    timestamp: new Date(NOW).toISOString(), ...overrides };
}
const origin = { label: "Origin", ids: ["stop-0"] };
const destination = { label: "Destination", ids: ["stop-1"] };

test("TfL predictions require fresh departures on the requested official branch", () => {
  const now = NOW / 1000, index = liveIndex();
  const result = tflTimes(index, origin, destination, [prediction()], [
    prediction({ id: "arrival", naptanId: "stop-1", expectedArrival: new Date(NOW + 9 * 60_000).toISOString() }),
  ], now);
  assert.equal(result.length, 1);
  assert.equal(result[0]!.arrivalAt! - result[0]!.departureAt, 240);
  assert.equal(result[0]!.realtime, true);
});

test("TfL never invents an arrival from a different vehicle, trip, branch or stale feed", () => {
  const now = NOW / 1000, index = liveIndex(), departure = prediction();
  const mismatched = [
    prediction({ vehicleId: "vehicle-99", naptanId: "stop-1" }),
    prediction({ tripId: "next-trip", naptanId: "stop-1" }),
    prediction({ direction: "southbound", naptanId: "stop-1" }),
    prediction({ timestamp: new Date(NOW - 180_000).toISOString(), naptanId: "stop-1" }),
  ];
  const noArrival = tflTimes(index, origin, destination, [departure], mismatched, now);
  assert.ok(noArrival.every(t => t.arrivalAt == null));
  const liveAtArrival = prediction({ naptanId: "stop-1", tripId: "different-trip", destinationNaptanId: "stop-2",
    expectedArrival: new Date(NOW + 10 * 60_000).toISOString() });
  assert.ok(tflTimes(index, origin, destination, [departure], [liveAtArrival], now).every(t => t.arrivalAt == null));
});

test("London buses without a published terminal need the same bus AND journey at arrival", () => {
  const now = NOW / 1000, index = liveIndex(), departure = prediction({ destinationNaptanId: "", tripId: "trip" });
  const arrival = prediction({ naptanId: "stop-1", destinationNaptanId: "", expectedArrival: new Date(NOW + 10 * 60_000).toISOString() });
  assert.equal(tflTimes(index, origin, destination, [departure], [arrival], now).length, 1);
  assert.equal(tflTimes(index, origin, destination, [departure], [ { ...arrival, tripId: "other-trip" } ], now).length, 0);
});

test("TfL always uses the England timezone, including the autumn clock change", () => {
  const fallBack = scheduledEpoch("2026-10-25", "01:30:00", "Europe/London");
  assert.notEqual(fallBack, null);
  assert.equal(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" })
    .format(new Date(fallBack! * 1000)), "01:30");
});

test("TXC weekly calendars and published English bank holidays stay explicit", () => {
  const profile = xmlDocument(`<OperatingProfile><RegularDayType><DaysOfWeek><Monday/><Tuesday/><Wednesday/><Thursday/><Friday/></DaysOfWeek></RegularDayType></OperatingProfile>`).OperatingProfile as Record<string, unknown>;
  assert.equal(txcRuns(profile, "2026-11-13", []), true);
  assert.equal(txcRuns(profile, "2026-11-14", []), false);
  const holidayProfile = xmlDocument(`<OperatingProfile><RegularDayType><DaysOfWeek><MondayToFriday/></DaysOfWeek></RegularDayType><BankHolidayOperation><DaysOfOperation><GoodFriday/></DaysOfOperation></BankHolidayOperation></OperatingProfile>`).OperatingProfile as Record<string, unknown>;
  const holidays: BankHoliday[] = [{ date: "2026-04-03", title: "Good Friday" }];
  assert.equal(txcRuns(holidayProfile, "2026-04-03", holidays), true);
  assert.equal(txcRuns(holidayProfile, "2026-04-02", holidays), true);
  const holidayExclusion = xmlDocument(`<OperatingProfile><RegularDayType><DaysOfWeek><MondayToFriday/></DaysOfWeek></RegularDayType><BankHolidayOperation><DaysOfNonOperation><GoodFriday/></DaysOfNonOperation></BankHolidayOperation></OperatingProfile>`).OperatingProfile as Record<string, unknown>;
  assert.equal(txcRuns(holidayExclusion, "2026-04-03", holidays), false);
});

test("unknown TXC school-day rules fail closed rather than inventing a calendar", () => {
  const profile = xmlDocument(`<OperatingProfile><RegularDayType><DaysOfWeek><MondayToFriday/></DaysOfWeek></RegularDayType><ServicedOrganisationDayType>SCHOOL</ServicedOrganisationDayType></OperatingProfile>`).OperatingProfile as Record<string, unknown>;
  assert.throws(() => txcRuns(profile, "2026-11-13", []), /Unsupported operating profile/);
  assert.throws(() => xmlDocument("<!DOCTYPE x [<!ENTITY e 'external'>]><x>&e;</x>"), /XML anglais/);
});

test("both published clock times survive the London autumn transition", () => {
  for (const date of ["2026-10-24", "2026-10-25", "2026-10-26"]) {
    const epoch = scheduledEpoch(date, "23:30:00", "Europe/London");
    assert.ok(epoch);
    assert.equal(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", dateStyle: "short" })
      .format(new Date(epoch! * 1000)), date.split("-").reverse().join("/"));
  }
});

test("the official locality resolver separates England from Scotland and Wales", async () => {
  const feed = `<?xml version="1.0"?><NationalPublicTransportGazetteer><Regions>
    <Region id="eng"><Country>England</Country><AdministrativeAreas>
      <AdministrativeArea id="001"><AdministrativeAreaCode>001</AdministrativeAreaCode><AtcoAreaCode>050</AtcoAreaCode><Name>Cambridgeshire</Name></AdministrativeArea>
    </AdministrativeAreas></Region>
    <Region id="sco"><Country>Scotland</Country><AdministrativeAreas>
      <AdministrativeArea id="002"><AdministrativeAreaCode>002</AdministrativeAreaCode><AtcoAreaCode>100</AtcoAreaCode><Name>Scotland</Name></AdministrativeArea>
    </AdministrativeAreas></Region>
  </Regions><NptgLocality CreationDateTime="2026-01-01"><NptgLocalityCode>E001</NptgLocalityCode><Descriptor><LocalityName>Cambridge</LocalityName><Qualify><QualifierName>City</QualifierName></Qualify></Descriptor><AdministrativeAreaRef>001</AdministrativeAreaRef><Location><Translation><Latitude>52.205</Latitude><Longitude>0.119</Longitude></Translation></Location></NptgLocality>
  <NptgLocality CreationDateTime="2026-01-01"><NptgLocalityCode>S001</NptgLocalityCode><Descriptor><LocalityName>Cambridge</LocalityName></Descriptor><AdministrativeAreaRef>002</AdministrativeAreaRef><Location><Translation><Latitude>56.0</Latitude><Longitude>-3.0</Longitude></Translation></Location></NptgLocality></NationalPublicTransportGazetteer>`;
  let requests = 0;
  const resolver = new EnglandLocations(new EnglandHttp("nptg", async () => { requests++; return new Response(feed); }), blankCache(), () => NOW);
  const city = await resolver.search("Cambridge");
  assert.equal(requests, 1);
  assert.equal(city.length, 1);
  assert.equal(city[0]!.area, "050");
  assert.match(city[0]!.label, /Cambridgeshire.*Angleterre/);
  assert.equal(city[0]!.latitude, 52.205);
  await resolver.search("Cambridge");
  assert.equal(requests, 1, "the national gazetteer is reused in memory");
});

test("a National Rail trip cannot appear as usable until official access is ready", async () => {
  const england = new EnglandTransportClient();
  await assert.throws(() => england.cities("Cambridge", "rail"),
    (error: unknown) => error instanceof TransportDataError && /en attente de validation/.test(error.message));
});

test("TfL authentication errors never include a secret or authenticated URL", async () => {
  const http = new EnglandHttp("tfl", async () => new Response("Invalid app_key is provided.", { status: 429 }),
    () => NOW, () => "not-a-real-key");
  await assert.rejects(http.json("/Line/Mode/tube"), (error: unknown) => {
    assert.ok(error instanceof TransportDataError);
    assert.match(error.message, /refuse sa clé/);
    assert.doesNotMatch(error.message, /not-a-real-key|api\.tfl/);
    return true;
  });
});

test("the BODS catalogue caches only this city and only its verified published operators", async () => {
  const captured: URL[] = [], city = { id: "E0001", name: "Cambridge", label: "Cambridge · England",
    latitude: 52.2, longitude: .12, territory: "en" as const, area: "050" };
  const fetcher: typeof fetch = async input => {
    const url = new URL(String(input)); captured.push(url);
    return Response.json({ count: 2, results: [
      { id: 1, operatorName: "First Cambridge Buses", status: "published", extension: "zip", modified: "2026-11-10",
        lines: ["132"], localities: [{ gazetteer_id: city.id, name: "Cambridge" }, { gazetteer_id: "E0999", name: "Elsewhere" }] },
      { id: 2, operatorName: "Inactive", status: "inactive", extension: "zip", modified: "", lines: ["9"],
        localities: [{ gazetteer_id: city.id, name: "Cambridge" }] },
    ] });
  };
  const bods = new BodsTransportClient(new EnglandHttp("bods", fetcher, () => NOW, () => "fake-key"),
    blankCache(), fetcher, () => NOW);
  const operators = await bods.networks(city);
  assert.equal(operators.length, 1);
  assert.deepEqual(operators[0]!.covered_area, [{ insee: city.id, nom: "Cambridge", type: "locality" }]);
  assert.deepEqual(operators[0]!.resources.map(r => r.title), ["132"]);
  assert.equal(captured[0]!.searchParams.get("adminArea"), "050");
  assert.equal(captured[0]!.searchParams.get("api_key"), "fake-key");
  const safe = JSON.stringify(publicMetadata("catalog", operators.map(({ id, title, slug, type, page_url, licence, territory, modes, covered_area, resources }) =>
    ({ id, title, slug, type, page_url, licence, territory, modes, covered_area, resources }))));
  assert.doesNotMatch(safe, /schedule|stop_times|api_key|Elsewhere/);
});

test("authenticated requests are confined to their documented official hosts", async () => {
  const tfl = new EnglandHttp("tfl", async () => Response.json([{ id: "central" }]), () => NOW, () => "private-key");
  await tfl.json("/Line/Mode/tube");
  await assert.rejects(tfl.json("https://example.com/steal"), /refusée/);
});
