import assert from "node:assert/strict";
import { buildJourneyIndex } from "../src/discord/gtfs-journey.js";
import { IrelandTransportClient, LuxembourgTransportClient, nationalTimezone, nationalTimezoneMatches } from "../src/discord/national-gtfs-transport.js";

for (const territory of ["ie", "lu"] as const) {
  console.log(`${territory}: reading current official catalogue`);
  const client = territory === "ie" ? new IrelandTransportClient() : new LuxembourgTransportClient();
  const catalog = await client.getCatalog();
  assert.equal(catalog.length, 1, `${territory}: national feed should be available`);
  assert.equal(catalog[0]!.territory, territory);
  const modes = await client.availableModes();
  console.log(`${territory}: published modes ${modes.join(", ")}`);
  assert.ok(modes.length, `${territory}: the source must contain at least one supported mode`);
  const mode = modes.includes("bus") ? "bus" : modes[0]!;
  if (territory === "ie") {
    const region = client.region("County Dublin");
    assert.ok(region, "Ireland: county browsing should resolve Dublin");
    console.log("ie: checking the live Dublin county boundary and GTFS routes");
    const regionalRoutes = await client.routesInRegion(catalog[0]!.resources[0]!, region!, mode);
    assert.ok(regionalRoutes.length, "Ireland: the county view should expose routes with stops in Dublin");
    console.log(`ie: county ${region!.name} contains ${regionalRoutes.length} published ${mode} routes`);
  }
  const search = territory === "ie" ? "Dublin" : "Luxembourg";
  const city = (await client.municipalities(search)).find(place =>
    place.name.toLowerCase() === search.toLowerCase());
  assert.ok(city, `${territory}: expected an official-feed city lookup to resolve`);
  const network = (await client.networks(city!, mode))[0];
  assert.ok(network, `${territory}: expected a network for the published ${mode} mode`);
  const resource = network!.resources[0]!;
  const nearby = await client.nearbyStopsForResources(city!.latitude, city!.longitude, [resource]);
  const stopIds = new Set((nearby.features ?? []).flatMap(feature =>
    feature.properties?.stop_id ? [feature.properties.stop_id] : []));
  assert.ok(stopIds.size, `${territory}: nearby official stops should be readable`);
  console.log(`${territory}: found ${stopIds.size} nearby public stops`);
  const routes = await client.discoverRoutesAtStops(resource, stopIds, mode);
  const route = routes.find(candidate => candidate.mode === mode);
  assert.ok(route, `${territory}: a route of the advertised mode should serve the selected city`);
  console.log(`${territory}: found route ${route!.shortName || route!.routeId}`);
  console.log(`${territory}: selecting route id ${route!.routeId} (${route!.shortName})`);
  const timetable = await client.staticFeed(resource, { mode, routeId: route!.routeId });
  const index = await buildJourneyIndex(timetable, route!.routeId);
  console.log(`${territory}: published timezone ${index.metadata.timezone}`);
  assert.ok(nationalTimezoneMatches(territory, index.metadata.timezone ?? ""));
  console.log(`${territory}: ${network!.title}; ${mode}; route ${route!.shortName || route!.routeId}; published ${index.metadata.timezone}, displayed ${nationalTimezone(territory)}`);
}
