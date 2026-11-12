import assert from "node:assert/strict";
import { buildJourneyIndex } from "../src/discord/gtfs-journey.js";
import { NationalGtfsTransportClient, nationalTimezone, nationalTimezoneMatches } from "../src/discord/national-gtfs-transport.js";
import { TransportMetadataCache } from "../src/discord/transport-metadata-cache.js";

const checks = [
  { territory: "lv", place: "Rīga", mode: "bus" },
  { territory: "cz", place: "Praha", mode: "metro" },
  { territory: "pt", place: "Lisboa", mode: "metro" },
  { territory: "au", place: "Brisbane", mode: "rail" },
  { territory: "ua", place: "Lviv", mode: "tram" },
] as const;

for (const { territory, place, mode } of checks) {
  console.log(`${territory}: checking official catalog, service area, and one selected timetable`);
  const liveFetch: typeof fetch = async (input, init) => {
    const response = await fetch(input, init);
    if (new Headers(init?.headers).has("range") && response.status >= 400) {
      const headers = new Headers(init?.headers);
      console.log(`${territory}: source returned HTTP ${response.status} for ${headers.get("range")} ` +
        `(If-Match ${headers.get("if-match") ?? "none"})`);
    }
    return response;
  };
  const client = new NationalGtfsTransportClient(territory, liveFetch, Date.now,
    new TransportMetadataCache(() => null));
  const catalog = await client.getCatalog();
  assert.ok(catalog.length, `${territory}: expected a published source`);
  assert.ok(catalog.every(dataset => dataset.licence && dataset.page_url),
    `${territory}: source license and reference should be present`);
  assert.ok((await client.availableModes()).includes(mode), `${territory}: expected the advertised ${mode} mode`);
  const city = (await client.municipalities(place)).find(item =>
    item.name.toLowerCase() === place.toLowerCase() ||
    territory === "ua" && item.latitude > 49.6 && item.latitude < 50.1);
  assert.ok(city, `${territory}: expected the official feed search to resolve ${place}`);
  const network = (await client.networks(city!, mode))[0];
  assert.ok(network, `${territory}: expected a published ${mode} network near ${place}`);
  const resource = network!.resources[0]!;
  const routes = await client.referenceRoutes(resource);
  const route = routes.find(item => item.mode === mode);
  assert.ok(route, `${territory}: expected a real ${mode} route in GTFS routes.txt`);
  const stops = await client.referenceStops(resource);
  assert.ok(stops.length, `${territory}: expected published GTFS stops`);
  const nearby = await client.nearbyStopsForResources(city!.latitude, city!.longitude, [resource]);
  assert.ok(nearby.features?.length, `${territory}: expected stops near ${place}`);
  const selectedFeed = await client.staticFeed(resource, { mode, routeId: route!.routeId });
  const index = await buildJourneyIndex(selectedFeed, route!.routeId);
  const timezone = index.metadata.timezone ?? "";
  assert.ok(nationalTimezoneMatches(territory, timezone),
    `${territory}: source timezone ${timezone} must match ${nationalTimezone(territory)}`);
  console.log(`${territory}: ${network!.title}, ${routes.length} lines, ${stops.length} stops, route ${route!.shortName || route!.routeId}, ${timezone}`);
}
