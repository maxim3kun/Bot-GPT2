import assert from "node:assert/strict";
import test from "node:test";
import { strToU8, zipSync } from "fflate";
import { TransportBrowserClient, arrivalOptions, originOptions } from "../src/discord/transport-browser.js";
import { IcelandGtfsTransportClient } from "../src/discord/iceland-gtfs-transport.js";
import { SingaporeDataMallTransportClient } from "../src/discord/singapore-datamall-transport.js";
import { TransportMetadataCache } from "../src/discord/transport-metadata-cache.js";
import { parseTransportCommand } from "../src/discord/transport-command-query.js";

const NOW = Date.parse("2026-11-12T06:00:00Z");

const icelandFeed = zipSync({
  "agency.txt": strToU8("agency_id,agency_name,agency_timezone\nstraeto,Strætó,Atlantic/Reykjavik\n"),
  "routes.txt": strToU8("route_id,route_short_name,route_long_name,route_type\nS1,1,Reykjavík route,3\n"),
  "trips.txt": strToU8("route_id,service_id,trip_id,trip_headsign\nS1,daily,S1-trip,Terminal\n"),
  "stops.txt": strToU8("stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station\n101,Reykjavík,64.1466,-21.9426,0,\n102,Terminal,64.15,-21.93,0,\n"),
  "stop_times.txt": strToU8("trip_id,arrival_time,departure_time,stop_id,stop_sequence\nS1-trip,07:30:00,07:30:00,101,1\nS1-trip,07:50:00,07:50:00,102,2\n"),
  "calendar.txt": strToU8("service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\ndaily,1,1,1,1,1,1,1,20260101,20271231\n"),
});

function rangeResponse(bytes: Uint8Array, range: string | null) {
  if (!range) return new Response(bytes);
  const suffix = range.match(/^bytes=-(\d+)$/);
  const explicit = range.match(/^bytes=(\d+)-(\d+)$/);
  if (!suffix && !explicit) return new Response(null, { status: 416 });
  const start = suffix ? Math.max(0, bytes.length - Number(suffix[1])) : Number(explicit![1]);
  const end = suffix ? bytes.length - 1 : Math.min(bytes.length - 1, Number(explicit![2]));
  if (start >= bytes.length || end < start) return new Response(null, { status: 416 });
  return new Response(bytes.slice(start, end + 1), { status: 206, headers: {
    "content-range": `bytes ${start}-${end}/${bytes.length}`, etag: '"fixture-v1"',
    "last-modified": "Wed, 11 Nov 2026 19:31:25 GMT",
  } });
}

function icelandFixture() {
  const url = "https://opendata.straeto.is/data/gtfs/gtfs.zip";
  const calls: string[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const target = String(input); calls.push(target);
    if (target === url) return rangeResponse(icelandFeed, new Headers(init?.headers).get("range"));
    if (target.includes("nominatim.openstreetmap.org/search")) return Response.json([{
      lat: "64.1466", lon: "-21.9426", name: "Reykjavík", display_name: "Reykjavík, Iceland",
      class: "place", type: "city", address: { country_code: "is" },
    }]);
    throw new Error(`Unexpected Iceland request: ${target}`);
  };
  const client = new IcelandGtfsTransportClient(fetcher, () => NOW,
    new TransportMetadataCache(() => null, () => NOW));
  return { client, calls };
}

const trainFeed = zipSync({
  "agency.txt": strToU8("agency_id,agency_name,agency_timezone\nLTA,Land Transport Authority,Asia/Singapore\n"),
  "routes.txt": strToU8("route_id,agency_id,route_short_name,route_long_name,route_type\nEW, LTA,EWL,East West Line,2\n"),
  "trips.txt": strToU8("route_id,service_id,trip_id,trip_headsign,direction_id\nEW,daily,ew-trip,Pasir Ris,0\n"),
  "stops.txt": strToU8("stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station\nEW1,Pasir Ris,1.3730,103.9493,0,\nEW2,Tampines,1.3530,103.9450,0,\n"),
  "stop_times.txt": strToU8("trip_id,arrival_time,departure_time,stop_id,stop_sequence\new-trip,14:30:00,14:30:00,EW1,1\new-trip,14:40:00,14:40:00,EW2,2\n"),
  "calendar.txt": strToU8("service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\ndaily,1,1,1,1,1,1,1,20260101,20271231\n"),
});

function singaporeFixture(key: () => string | undefined = () => "test-datamall-key") {
  const calls: Array<{ url: string; key?: string }> = [];
  const routeRows = [
    { ServiceNo: "15", Operator: "LTA", Direction: 1, StopSequence: 1, BusStopCode: "10001",
      WD_FirstBus: "0600", WD_LastBus: "2300", SAT_FirstBus: "0610", SAT_LastBus: "2250",
      SUN_FirstBus: "0620", SUN_LastBus: "2240" },
    { ServiceNo: "15", Operator: "LTA", Direction: 1, StopSequence: 2, BusStopCode: "10002",
      WD_FirstBus: "0610", WD_LastBus: "2310", SAT_FirstBus: "0620", SAT_LastBus: "2300",
      SUN_FirstBus: "0630", SUN_LastBus: "2250" },
  ];
  const stopRows = [
    { BusStopCode: "10001", RoadName: "Tampines Ave 1", Description: "Tampines Int", Latitude: 1.35, Longitude: 103.94 },
    { BusStopCode: "10002", RoadName: "Tampines Ave 2", Description: "Block 10", Latitude: 1.36, Longitude: 103.95 },
  ];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, key: new Headers(init?.headers).get("AccountKey") ?? undefined });
    if (url.includes("nominatim.openstreetmap.org/search")) return Response.json([{
      lat: "1.35", lon: "103.94", name: "Tampines", display_name: "Tampines, Singapore",
      class: "place", type: "town", address: { country_code: "sg" },
    }]);
    if (url.includes("/BusRoutes?")) return Response.json({ value: routeRows });
    if (url.includes("/BusStops?")) return Response.json({ value: stopRows });
    if (url.includes("/BusServices?")) return Response.json({ value: [{
      ServiceNo: "15", Direction: 1, AM_Peak_Freq: "10-12", AM_Offpeak_Freq: "12-15",
      PM_Peak_Freq: "10-12", PM_Offpeak_Freq: "12-15",
    }] });
    if (url.includes("/v3/BusArrival?")) return Response.json({ Services: [{
      ServiceNo: "15",
      NextBus: { OriginCode: "10001", DestinationCode: "10002", EstimatedArrival: "2026-11-12T14:30:00+08:00", Monitored: 1 },
      NextBus2: { OriginCode: "10001", DestinationCode: "10002", EstimatedArrival: "2026-11-12T14:45:00+08:00", Monitored: 0 },
      NextBus3: { OriginCode: "10002", DestinationCode: "10001", EstimatedArrival: "2026-11-12T14:50:00+08:00", Monitored: 1 },
    }] });
    if (url === "https://datamall2.mytransport.sg/ltaodataservice/GTFSScheduleTrain") {
      return Response.json({ value: [{ Link: "https://dmprod-datasets.s3.ap-southeast-1.amazonaws.com/train-gtfs-schedule/test.zip?sig=fixture" }] });
    }
    if (url === "https://datamall2.mytransport.sg/ltaodataservice/GTFSRealtimeTrainTripUpdates") {
      return Response.json({ value: [{ Link: "https://dmprod-datasets.s3.ap-southeast-1.amazonaws.com/train-gtfs-trip-update/updates.pb?sig=fixture" }] });
    }
    if (url === "https://datamall2.mytransport.sg/ltaodataservice/GTFSRealTimeTrainServiceAlerts") {
      return Response.json({ value: [{ Link: "https://dmprod-datasets.s3.ap-southeast-1.amazonaws.com/train-gtfs-real-time/alerts.pb?sig=fixture" }] });
    }
    if (url.startsWith("https://dmprod-datasets.s3.ap-southeast-1.amazonaws.com/")) return new Response(trainFeed);
    throw new Error(`Unexpected DataMall request: ${url}`);
  };
  const metadata = new TransportMetadataCache(() => null, () => NOW);
  const client = new SingaporeDataMallTransportClient(fetcher, () => NOW, metadata, key);
  return { client, calls, metadata };
}

test("Iceland selector only offers Strætó GTFS buses and preserves local schedule time", async () => {
  const { client, calls } = icelandFixture();
  const browser = new TransportBrowserClient(undefined, () => NOW, undefined, undefined, undefined,
    undefined, undefined, undefined, undefined, client);
  assert.ok(browser.territories.includes("is"));
  assert.deepEqual(await browser.availableModes("is"), ["bus"]);
  const cities = await browser.cities("Reykjavík", "is", "bus");
  assert.equal(cities[0]!.territory, "is");
  const networks = await browser.networks(cities[0]!, "bus");
  assert.equal(networks[0]!.title, "Strætó · autobus d’Islande");
  assert.match(networks[0]!.limitations!.join(" "), /se limite aux bus.*Strætó/i);
  const lines = await browser.lines(cities[0]!, "bus", "", networks[0]!.id);
  assert.equal(lines.lines.length, 1);
  const line = lines.lines[0]!;
  const index = await browser.index(line);
  assert.equal(index.metadata.timezone, "Atlantic/Reykjavik");
  const starts = originOptions(index, line);
  const ends = arrivalOptions(index, starts[0]!);
  assert.equal(starts[0]!.label, "Reykjavík");
  assert.equal(ends[0]!.label, "Terminal");
  const result = await browser.departures(line, index, starts[0]!, ends[0]!, "fr");
  assert.match(result.content, /Horaires théoriques · non temps réel · Atlantic\/Reykjavik/);
  assert.ok(calls.some(url => url === "https://opendata.straeto.is/data/gtfs/gtfs.zip"));
  assert.ok(calls.length < 100, "Strætó ZIP is read by bounded byte ranges rather than downloaded repeatedly");
  const beforeCachedLookup = calls.length;
  const secondBrowser = new TransportBrowserClient(undefined, () => NOW, undefined, undefined, undefined,
    undefined, undefined, undefined, undefined, client);
  await secondBrowser.index(line);
  assert.equal(calls.length, beforeCachedLookup, "a cached Strætó journey index avoids another GTFS request");
});

test("Singapore LTA bus route keeps published service hours distinct from live estimates", async () => {
  const { client, calls, metadata } = singaporeFixture();
  const browser = new TransportBrowserClient(undefined, () => NOW, undefined, undefined, undefined,
    undefined, undefined, undefined, undefined, undefined, client);
  assert.ok(browser.territories.includes("sg"));
  assert.deepEqual(await browser.availableModes("sg"), ["bus", "rail"]);
  const city = (await browser.cities("Tampines", "sg", "bus"))[0]!;
  const network = (await browser.networks(city, "bus"))[0]!;
  const listing = await browser.lines(city, "bus", "", network.id);
  assert.equal(listing.lines.length, 1);
  const line = listing.lines[0]!;
  const index = await browser.index(line);
  const start = originOptions(index, line)[0]!;
  const end = arrivalOptions(index, start)[0]!;
  const result = await browser.departures(line, index, start, end, "fr");
  assert.match(result.content, /Asia\/Singapore/);
  assert.match(result.content, /horaire complet/i);
  assert.match(result.content, /14:45.*prévu/);
  assert.match(result.content, /départs temps réel/i);
  assert.match(result.content, /14:30/);
  assert.doesNotMatch(result.content, /14:50/, "the opposite direction is not offered");
  assert.ok(calls.some(call => call.url.includes("/BusRoutes?") && call.key === "test-datamall-key"));
  const routePages = calls.filter(call => call.url.includes("/BusRoutes?"));
  assert.ok(routePages.some(call => new URL(call.url).searchParams.has("$skip")));
  assert.ok(routePages.every(call => !new URL(call.url).searchParams.has("$filter")),
    "LTA documents pagination for BusRoutes, not OData route filters");
  assert.ok(calls.some(call => call.url.includes("/v3/BusArrival?")));
  const beforeCachedLookup = calls.length;
  const offlineClient = new SingaporeDataMallTransportClient(async () => {
    throw new Error("The cached LTA bus catalog should be used");
  }, () => NOW, metadata);
  const offlineBrowser = new TransportBrowserClient(undefined, () => NOW, undefined, undefined, undefined,
    undefined, undefined, undefined, undefined, undefined, offlineClient);
  assert.ok((await offlineBrowser.lines(city, "bus", "", network.id)).lines.length > 0);
  assert.equal(calls.length, beforeCachedLookup, "cached route and stop data avoids another full DataMall download");
});

test("Singapore LTA train network uses the published GTFS schedule in local time", async () => {
  const { client, metadata, calls } = singaporeFixture();
  const browser = new TransportBrowserClient(undefined, () => NOW, undefined, undefined, undefined,
    undefined, undefined, undefined, undefined, undefined, client);
  const city = (await browser.cities("Tampines", "sg", "rail"))[0]!;
  const network = (await browser.networks(city, "rail"))[0]!;
  const listing = await browser.lines(city, "rail", "", network.id);
  assert.ok(listing.lines.length > 0);
  const index = await browser.index(listing.lines[0]!);
  assert.equal(index.metadata.timezone, "Asia/Singapore");
  const tripUpdates = network.resources.find(resource => /Trip Updates/.test(resource.title))!;
  const realtime = await client.realtimeFeed(tripUpdates);
  assert.ok(realtime.length > 0);
  assert.ok(calls.some(call => call.url.endsWith("/GTFSRealtimeTrainTripUpdates") && call.key === "test-datamall-key"));
  const alerts = (await client.getCatalog()).find(dataset => dataset.id === "sg:lta:train")!
    .resources.find(resource => /Service Alerts/.test(resource.title))!;
  assert.ok(alerts.url.endsWith("/GTFSRealTimeTrainServiceAlerts"));
  assert.ok((await client.realtimeFeed(alerts)).length > 0);
  const beforeCachedRead = calls.length;
  const offlineClient = new SingaporeDataMallTransportClient(async () => {
    throw new Error("The cached LTA train tables should be used");
  }, () => NOW, metadata);
  assert.ok((await offlineClient.referenceStops(network.resources[0]!)).length > 0);
  assert.equal(calls.length, beforeCachedRead, "cached train routes and stops remain available without a fresh download");
});

test("new territories parse in commands and missing LTA credentials fail explicitly", async () => {
  assert.equal(parseTransportCommand(["Islande", "Reykjavík"]).territory, "is");
  assert.equal(parseTransportCommand(["Singapore", "Tampines"]).territory, "sg");
  const client = singaporeFixture(() => undefined).client;
  const bus = (await client.getCatalog())[0]!.resources[0]!;
  await assert.rejects(client.discoverRoutesAtStops(bus, new Set(["10001"]), "bus"), /DATAMALL_API_KEY/);
});

