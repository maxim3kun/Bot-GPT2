import assert from "node:assert/strict";
import { TransportBrowserClient, arrivalOptions, originOptions } from "../src/discord/transport-browser.js";
import { decodeGtfsRealtime } from "../src/discord/gtfs-realtime.js";
import { parseGtfsAlerts } from "../src/discord/gtfs-alerts.js";
import { SingaporeDataMallTransportClient } from "../src/discord/singapore-datamall-transport.js";

if (!process.env.DATAMALL_API_KEY?.trim()) throw new Error("DATAMALL_API_KEY is not configured.");

const now = Date.now;
const requestCounts = new Map<string, number>();
const trackedFetch: typeof fetch = async (input, init) => {
  const url = new URL(String(input));
  const path = url.pathname.split("/").at(-1) ?? "unknown";
  const bucket = `${path}${url.searchParams.has("$filter") ? " (filtered)" : ""}`;
  requestCounts.set(bucket, (requestCounts.get(bucket) ?? 0) + 1);
  const response = await fetch(input, init);
  if (path === "GTFSScheduleTrain") {
    const payload = await response.clone().json() as Record<string, unknown>;
    const entries = Array.isArray(payload.value) ? payload.value as Array<Record<string, unknown>> : [];
    const candidate = entries[0]?.Link ?? entries[0]?.link;
    let location = "missing";
    if (typeof candidate === "string") {
      try {
        const signedUrl = new URL(candidate);
        location = `${signedUrl.hostname}${signedUrl.pathname}`;
      } catch { location = "invalid"; }
    }
    console.log(`LTA train-download response: HTTP ${response.status}; fields ${Object.keys(payload).join(",")}; link ${location}`);
  }
  return response;
};
const client = new SingaporeDataMallTransportClient(trackedFetch, now);
const browser = new TransportBrowserClient(undefined, now, undefined, undefined, undefined,
  undefined, undefined, undefined, undefined, undefined, client);
const location = {
  id: "lta:singapore:central", name: "Singapore", label: "Singapore · Singapour",
  latitude: 1.286, longitude: 103.852, territory: "sg" as const,
};
const catalog = await client.getCatalog();
const busNetwork = catalog.find(dataset => dataset.id === "sg:lta:bus");
const trainNetwork = catalog.find(dataset => dataset.id === "sg:lta:train");
assert.ok(busNetwork && trainNetwork, "DataMall should publish bus and train datasets");
console.log(`LTA catalogue: ${catalog.length} datasets; bus and train sources found`);

const busListing = await browser.lines(location, "bus", "", busNetwork.id);
console.log(`LTA API requests: ${[...requestCounts].map(([name, count]) => `${name}=${count}`).join(", ")}`);
assert.ok(busListing.lines.length, "LTA should publish a bus serving central Singapore");
const busLine = busListing.lines[0]!;
const busIndex = await browser.index(busLine);
const busOrigin = originOptions(busIndex, busLine)[0];
assert.ok(busOrigin, "the published bus route should contain a selectable stop");
const busDestination = arrivalOptions(busIndex, busOrigin!)[0];
assert.ok(busDestination, "the published bus route should contain a downstream stop");
const busResult = await browser.departures(busLine, busIndex, busOrigin!, busDestination!, "en");
assert.match(busResult.content, /Asia\/Singapore/);
console.log(`LTA buses: ${busListing.lines.length} route(s) near the city center; live/scheduled arrival lookup completed`);

const trainListing = await browser.lines(location, "rail", "", trainNetwork.id);
const trainResource = trainNetwork.resources[0]!;
const publishedTrainRoutes = await client.referenceRoutes(trainResource);
const publishedTrainStops = await client.referenceStops(trainResource);
const routeModes = new Map<string, number>();
for (const route of publishedTrainRoutes) routeModes.set(route.mode ?? "unknown", (routeModes.get(route.mode ?? "unknown") ?? 0) + 1);
const nearestTrainStop = [...publishedTrainStops].sort((a, b) =>
  Math.hypot(a.latitude - location.latitude, a.longitude - location.longitude) -
  Math.hypot(b.latitude - location.latitude, b.longitude - location.longitude))[0];
console.log(`LTA train catalogue: ${publishedTrainRoutes.length} route(s) ${JSON.stringify([...routeModes])}; ${publishedTrainStops.length} stop(s); nearest ${nearestTrainStop?.name ?? "none"}`);
console.log(`LTA train search: ${trainListing.lines.length} line(s), ${trainListing.unavailable} unavailable source(s)`);
assert.ok(trainListing.lines.length, "the LTA train GTFS should contain a central Singapore route");
const trainLine = trainListing.lines[0]!;
const trainIndex = await browser.index(trainLine);
assert.equal(trainIndex.metadata.timezone, "Asia/Singapore");
const tripUpdatesResource = trainLine.realtime.find(resource => /Trip Updates/.test(resource.title));
const alertsResource = trainLine.alerts?.find(resource => /Service Alerts/.test(resource.title));
assert.ok(tripUpdatesResource && alertsResource, "LTA should publish train trip updates and service alerts");
const [tripBytes, alertBytes] = await Promise.all([
  client.realtimeFeed(tripUpdatesResource!),
  client.realtimeFeed(alertsResource!),
]);
const stops = new Set(trainIndex.stops.keys());
const tripUpdates = decodeGtfsRealtime(tripBytes, stops, trainIndex.metadata, Math.floor(now() / 1000));
const alerts = parseGtfsAlerts(alertBytes, trainIndex, Math.floor(now() / 1000));
console.log(`LTA trains: ${trainListing.lines.length} route(s); GTFS timezone ${trainIndex.metadata.timezone}`);
console.log(`LTA real time: ${tripBytes.byteLength} trip-update bytes (${tripUpdates.departures.length} current estimates); ${alertBytes.byteLength} alert bytes (${alerts.available ? alerts.rules.length : "feed timestamp unavailable"} current alerts)`);
