import test from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import { IdfmLiveClient, parseIdfmTraffic, parseIdfmVisits, stopClosed, idfmTimeAllowed } from "../src/discord/idfm-live.js";
import { buildJourneyIndex, journeyPairs } from "../src/discord/gtfs-journey.js";
import { TransportBrowserClient, originOptions, arrivalOptions, type TransportLine } from "../src/discord/transport-browser.js";
import { FranceTransportClient } from "../src/discord/public-transport.js";

const NOW = Date.parse("2026-11-11T10:00:00Z");
const seconds = NOW / 1000, route = "IDFM:C01378";
const O = "IDFM:22198", R = "IDFM:22199", D = "IDFM:22096", T = "IDFM:463051";
const line: TransportLine = { routeId: route, label: "8", description: "Métro 8", mode: "metro", nearbyStopIds: [O, R],
  resource: { id: 80921, title: "GTFS", format: "GTFS", is_available: true, url: "https://www.data.gouv.fr/idfm",
    original_url: "https://eu.ftp.opendatasoft.com/stif/GTFS/IDFM-gtfs.zip" },
  realtime: [], source: { name: "IDFM", url: "https://prim.iledefrance-mobilites.fr" }, selection: { mode: "metro", line: "8" } };

async function fixture() {
  return buildJourneyIndex(zipSync(Object.fromEntries(Object.entries({
    "agency.txt": "agency_id,agency_name,agency_timezone\nA,IDFM,Europe/Paris\n",
    "routes.txt": `route_id,route_short_name,route_type\n${route},8,1\n`,
    "trips.txt": `route_id,service_id,trip_id\n${route},S,V\n`,
    "stops.txt": `stop_id,stop_name,parent_station\n${O},Bonne Nouvelle,IDFM:71320\n${R},République,IDFM:71311\n${D},Concorde,IDFM:71298\n${T},Balard,IDFM:71073\n`,
    "stop_times.txt": `trip_id,arrival_time,departure_time,stop_id,stop_sequence\nV,11:10:00,11:10:00,${O},1\nV,11:11:00,11:11:00,${R},2\nV,11:20:00,11:20:00,${D},3\nV,11:30:00,11:30:00,${T},4\n`,
    "calendar.txt": "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nS,1,1,1,1,1,1,1,20260101,20271231\n",
  }).map(([name, value]) => [name, strToU8(value)]))), route);
}
function traffic(options: { begin?: string; end?: string; point?: string; effect?: string; section?: boolean } = {}) {
  const point = options.point ?? R;
  const entity = { id: `stop_point:${point}`, embedded_type: "stop_point",
    stop_point: { links: [{ type: "disruption", id: "closed" }], codes: [{ type: "netex_zder_quay", value: "999" }] } };
  return { line_reports: [{ line: { id: `line:${route}` }, pt_objects: [entity] }], disruptions: [{
    id: "closed", severity: { effect: options.effect ?? "NO_SERVICE" },
    application_periods: [{ begin: options.begin ?? "20260722T044500", end: options.end ?? "20270423T043000" }],
    messages: [{ text: "<p>République : arrêt non desservi</p>", channel: { name: "moteur" } }],
    impacted_objects: [{ pt_object: entity, ...(options.section ? { impacted_section: {} } : {}) }],
  }] };
}
function visit(point: string, options: { vehicle?: string; terminal?: string; cancelled?: boolean; stale?: boolean; monitored?: boolean } = {}) {
  const departure = point === D ? seconds + 600 : seconds + 120;
  return { RecordedAtTime: new Date(NOW - (options.stale ? 600000 : 10000)).toISOString(),
    MonitoringRef: { value: `STIF:StopPoint:Q:${point.slice(5)}:` },
    MonitoredVehicleJourney: {
      LineRef: { value: "STIF:Line::C01378:" }, Monitored: options.monitored ?? true,
      DestinationRef: { value: `STIF:StopPoint:Q:${(options.terminal ?? T).slice(5)}:` },
      FramedVehicleJourneyRef: { DatedVehicleJourneyRef: options.vehicle ?? "train-1" },
      MonitoredCall: { ExpectedDepartureTime: new Date(departure * 1000).toISOString(),
        ExpectedArrivalTime: new Date(departure * 1000).toISOString(),
        DepartureStatus: options.cancelled ? "cancelled" : "onTime" },
    } };
}
function siri(visits: unknown[]) {
  return { Siri: { ServiceDelivery: { ResponseTimestamp: new Date(NOW).toISOString(),
    StopMonitoringDelivery: [{ Status: true, MonitoredStopVisit: visits }] } } };
}
function server(options: { trafficFailure?: boolean; arrivalsFailure?: boolean; empty?: boolean; cancelled?: boolean; otherTrain?: boolean } = {}) {
  const calls: string[] = [];
  const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input)); calls.push(url.pathname + url.search);
    assert.equal(url.origin, "https://prim.iledefrance-mobilites.fr");
    assert.equal(new Headers(init?.headers).get("apikey"), "test-only");
    assert.equal(init?.redirect, "error");
    if (url.pathname.includes("line_reports")) return Response.json(traffic(), { status: options.trafficFailure ? 503 : 200 });
    const point = "IDFM:" + url.searchParams.get("MonitoringRef")!.match(/Q:(\d+):/)![1];
    if (point === D && options.arrivalsFailure) return new Response("", { status: 503 });
    return Response.json(siri(options.empty ? [] : [visit(point, {
      cancelled: options.cancelled, ...(options.otherTrain && point === D ? { vehicle: "another-train" } : {}),
    }), visit(point, { vehicle: "opposite", terminal: "IDFM:21784" }), visit(point, { vehicle: "stale", stale: true })]));
  }) as typeof fetch;
  return { calls, client: new IdfmLiveClient(fetcher, () => NOW, () => "test-only") };
}

test("closure uses exact line links, platform IDs and active periods, never names or unrelated codes", async () => {
  const index = await fixture(), data = { available: true, rules: parseIdfmTraffic(traffic(), route) };
  assert(stopClosed(data, index, R, seconds));
  const period = data.rules[0]!.periods[0]!;
  assert(!stopClosed(data, index, R, period.begin - 1));
  assert(stopClosed(data, index, R, period.begin));
  assert(stopClosed(data, index, R, period.end - 1));
  assert(!stopClosed(data, index, R, period.end));
  assert(!stopClosed(data, index, O, seconds));
  assert(!stopClosed(data, index, "IDFM:999", seconds));
  assert(!stopClosed(data, index, R, Date.parse("2027-04-24T10:00:00Z") / 1000));
  assert.equal(parseIdfmTraffic(traffic(), "IDFM:C01377").length, 0);
  assert(!stopClosed({ available: true, rules: parseIdfmTraffic(traffic({ effect: "SIGNIFICANT_DELAYS" }), route) }, index, R, seconds));
});

test("menus remove a closed boarding and arrival stop but retain a journey passing it", async () => {
  const index = await fixture(), live = server(), browser = new TransportBrowserClient(new FranceTransportClient(), () => NOW, live.client);
  const origins = await browser.availableStops(line, index, originOptions(index, line), "fr");
  assert(!origins.options.some(x => x.ids.includes(R)));
  assert.match(origins.note, /République/);
  const origin = { ids: [O], label: "Bonne Nouvelle" };
  const arrivals = await browser.availableStops(line, index, arrivalOptions(index, origin), "fr");
  assert(!arrivals.options.some(x => x.ids.includes(R)));
  assert(arrivals.options.some(x => x.ids.includes(D)));
  const blocked = await browser.departures(line, index, origin, { ids: [R], label: "République" }, "fr");
  assert.match(blocked.content, /non proposé|n’est pas desservi/);
  const valid = await browser.departures(line, index, origin, { ids: [D], label: "Concorde" }, "fr");
  assert.match(valid.embed!.footer!.text, /temps réel/);
  assert.match(valid.content, /11:02.*11:10/);
  assert(!valid.content.includes("11:10** → 11:20"));
  assert.equal(live.calls.filter(x => x.includes("line_reports")).length, 1, "traffic cache reused across menus and result");
});

test("live passages match the same vehicle, correct direction and fresh measured data", async () => {
  const index = await fixture(), live = server(), pairs = journeyPairs(index, new Set([O]), new Set([D]));
  const result = await live.client.passages(route, index, pairs);
  assert.equal(result.times.length, 1);
  assert.equal(result.times[0]!.arrivalAt, seconds + 600);
  assert.equal(result.times[0]!.departureAt, seconds + 120);
  assert(result.times[0]!.realtime);
  const calls = live.calls.length;
  await live.client.passages(route, index, pairs);
  assert.equal(live.calls.length, calls);
  assert.equal(parseIdfmVisits(siri([visit(O, { monitored: false })]), O.slice(5), "C01378", seconds).length, 0);
  assert.throws(() => parseIdfmVisits(siri([]), O.slice(5), "C01378", seconds + 900), /Stale/);
  const frame1 = visit(O), frame2 = visit(O);
  Object.assign(frame1.MonitoredVehicleJourney.FramedVehicleJourneyRef, { DataFrameRef: { value: "day1" } });
  Object.assign(frame2.MonitoredVehicleJourney.FramedVehicleJourneyRef, { DataFrameRef: { value: "day2" } });
  const differentFrames = parseIdfmVisits(siri([frame1, frame2]), O.slice(5), "C01378", seconds);
  assert.notEqual(differentFrames[0]!.vehicle, differentFrames[1]!.vehicle);
});

test("an unmatched or unavailable arrival is never filled with another train or a theoretical duration", async () => {
  const index = await fixture(), pairs = journeyPairs(index, new Set([O]), new Set([D]));
  for (const options of [{ otherTrain: true }, { arrivalsFailure: true }]) {
    const live = server(options);
    const result = await live.client.passages(route, index, pairs);
    assert.equal(result.times.length, 1);
    assert.equal(result.times[0]!.arrivalAt, null);
    const browser = new TransportBrowserClient(new FranceTransportClient(), () => NOW, live.client);
    const card = await browser.departures(line, index, { label: "Bonne Nouvelle", ids: [O] }, { label: "Concorde", ids: [D] }, "fr");
    assert.match(card.content, /arrivée non communiquée/);
    assert.doesNotMatch(card.embed!.fields![0]!.value, /→|min/);
  }
});

test("cancelled live departures do not reappear as theoretical trains", async () => {
  const index = await fixture(), live = server({ cancelled: true });
  const browser = new TransportBrowserClient(new FranceTransportClient(), () => NOW, live.client);
  const result = await browser.departures(line, index, { label: "Bonne Nouvelle", ids: [O] }, { label: "Concorde", ids: [D] }, "fr");
  assert.match(result.content, /supprimés par l’exploitant/);
  assert.doesNotMatch(result.content, /\*\*11:10\*\*/);
  assert.doesNotMatch(result.embed!.footer!.text, /^Estimations/);
  assert.match(result.embed!.footer!.text, /Informations en temps réel/);
  assert.doesNotMatch(result.content, /Temps réel indisponible/);
});

test("an outage is explicit, cached briefly, and cannot erase recently known closures", async () => {
  const index = await fixture(); let clock = NOW, failed = false, count = 0;
  const live = new IdfmLiveClient((async () => { count++; return failed ? new Response("", { status: 503 }) : Response.json(traffic()); }) as typeof fetch,
    () => clock, () => "test-only");
  await live.traffic(route); clock += 121000; failed = true;
  const info = await live.traffic(route);
  assert.equal(info.available, false);
  assert(stopClosed(info, index, R, clock / 1000));
  await live.traffic(route); assert.equal(count, 2);
  const missing = new IdfmLiveClient((async () => { throw new Error("must not fetch"); }) as typeof fetch, () => NOW, () => undefined);
  const browser = new TransportBrowserClient(new FranceTransportClient(), () => NOW, missing);
  const result = await browser.departures(line, index, { label: "Bonne Nouvelle", ids: [O] }, { label: "Concorde", ids: [D] }, "fr");
  assert.match(result.content, /Alertes indisponibles/);
  assert.match(result.content, /Horaires théoriques/);
  assert.match(result.content, /Temps réel indisponible/);
});

test("future closures use the journey's actual time and platform, not only lookup time", async () => {
  const index = await fixture(), rules = parseIdfmTraffic(traffic({ begin: "20261111T110500", end: "20261111T120000" }), route);
  const info = { available: true, rules };
  assert(!stopClosed(info, index, R, seconds));
  const time = { tripId: "V", departureAt: seconds + 60, arrivalAt: seconds + 660, realtime: false, departureStopId: O, arrivalStopId: R };
  assert(!idfmTimeAllowed(info, index, time, [O], [R]));
  assert(idfmTimeAllowed(info, index, { ...time, arrivalStopId: D }, [O], [R, D]));
  assert(idfmTimeAllowed(info, index, { ...time, arrivalAt: seconds + 120 }, [O], [R]));
});

test("whole-line interruptions and unsupported blocking sections never confirm a journey", async () => {
  const index = await fixture(), body = traffic();
  body.disruptions[0]!.impacted_objects = [{ pt_object: { id: `line:${route}`, embedded_type: "line",
    stop_point: { links: [], codes: [] } } }];
  const rules = parseIdfmTraffic(body, route);
  assert(stopClosed({ available: true, rules }, index, O, seconds));
  body.disruptions[0]!.impacted_objects[0] = { ...body.disruptions[0]!.impacted_objects[0]!, impacted_section: {} };
  const unsupported = { available: true, rules: parseIdfmTraffic(body, route) };
  assert(unsupported.rules[0]!.unresolved);
  assert(!idfmTimeAllowed(unsupported, index, { tripId: "V", departureAt: seconds, arrivalAt: seconds + 600, realtime: false }, [O], [D]));
});
