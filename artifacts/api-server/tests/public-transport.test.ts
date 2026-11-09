import assert from "node:assert/strict";
import test from "node:test";
import { zipSync, strToU8 } from "fflate";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { FranceTransportClient } from "../src/discord/public-transport.js";
import { decodeGtfsRealtime, parseGtfsStaticMetadata } from "../src/discord/gtfs-realtime.js";
import { parsePublicTransportQuery, isPublicTransportRequest } from "../src/discord/transport-query.js";

const NOW = 1_800_000_000;

function staticFeed(): Uint8Array {
  return zipSync({
    "agency.txt": strToU8("agency_id,agency_name,agency_timezone\nRATP,RATP,Europe/Paris\n"),
    "routes.txt": strToU8("route_id,route_short_name,route_long_name,route_type\nroute-a,A,RER A,2\n"),
    "trips.txt": strToU8("route_id,service_id,trip_id,trip_headsign,direction_id\nroute-a,weekday,trip-a,Marne-la-Vallée,0\n"),
  });
}

function realtimeFeed(timestamp: number, departure: number): Uint8Array {
  const feed = {
    header: { gtfsRealtimeVersion: "2.0", incrementality: 0, timestamp },
    entity: [{
      id: "entity-1",
      tripUpdate: {
        trip: { tripId: "trip-a", routeId: "route-a", directionId: 0 },
        stopTimeUpdate: [{
          stopId: "STOP-1",
          departure: { time: departure, delay: 120 },
        }],
      },
    }],
  };
  return GtfsRealtimeBindings.transit_realtime.FeedMessage.encode(feed as never).finish();
}

test("recognizes real-time transport questions and extracts line, direction and stop", () => {
  const query = parsePublicTransportQuery("Quel est le prochain RER A à Châtelet, Paris ?");
  assert.deepEqual(query, { place: "Châtelet Paris", mode: "rail", line: "A" });
  assert.deepEqual(
    parsePublicTransportQuery("Prochains passages du métro ligne 1 à Gare de Lyon, Paris, direction La Défense"),
    { place: "Gare de Lyon Paris", mode: "metro", line: "1", direction: "La Défense" },
  );
  assert.equal(isPublicTransportRequest("Comment prendre le métro à Paris ?"), false);
  assert.equal(parsePublicTransportQuery("Quels bus passent à Lyon ?")?.place, "Lyon");
});

test("decodes GTFS-RT trip updates and maps route and destination from static GTFS", () => {
  const metadata = parseGtfsStaticMetadata(staticFeed());
  assert.equal(metadata.timezone, "Europe/Paris");
  const result = decodeGtfsRealtime(realtimeFeed(NOW, NOW + 180), new Set(["STOP-1"]), metadata, NOW);
  assert.equal(result.updatedAt, NOW);
  assert.deepEqual(result.departures.map(({ line, destination, mode, delaySeconds }) =>
    ({ line, destination, mode, delaySeconds })),
  [{ line: "A", destination: "Marne-la-Vallée", mode: "rail", delaySeconds: 120 }]);
});

test("uses the national catalogue and public GTFS-RT feed to answer without web search", async () => {
  const zip = staticFeed();
  const bytes = realtimeFeed(NOW, NOW + 180);
  let realtimeCalls = 0;
  const datasets = [{
    id: "dataset-1",
    title: "Réseau régional",
    slug: "reseau-regional",
    page_url: "https://transport.data.gouv.fr/datasets/reseau-regional",
    type: "public-transit",
    licence: "odc-odbl",
    resources: [
      { id: 101, title: "Horaires GTFS", format: "GTFS", type: "main", url: "https://transport.data.gouv.fr/resources/101/download", is_available: true, modes: ["rail"] },
      { id: 102, title: "GTFS-RT trip updates", format: "gtfs-rt", type: "api", url: "https://proxy.transport.data.gouv.fr/resource/reseau-rt", is_available: true },
    ],
  }];

  const fetcher: typeof fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/datasets") {
      return new Response(JSON.stringify(datasets), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.hostname === "api-adresse.data.gouv.fr") {
      return new Response(JSON.stringify({
        features: [{ geometry: { coordinates: [2.35, 48.85] }, properties: { type: "locality", city: "Paris" } }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.pathname === "/api/gtfs-stops") {
      return new Response(JSON.stringify({
        features: [{
          properties: { resource_id: 101, stop_id: "STOP-1", stop_name: "Châtelet", location_type: 0 },
          geometry: { type: "Point", coordinates: [2.35, 48.85] },
        }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.pathname === "/resources/101/download") return new Response(zip);
    if (url.pathname === "/resource/reseau-rt") {
      realtimeCalls++;
      return new Response(bytes);
    }
    return new Response("Not found", { status: 404 });
  };

  const client = new FranceTransportClient(fetcher, () => NOW * 1000);
  const query = parsePublicTransportQuery("Quel est le prochain RER A à Châtelet, Paris ?");
  assert.ok(query);
  const reply = await client.search(query, "fr");
  assert.match(reply, /Châtelet/);
  assert.match(reply, /\*\*A\*\* → Marne-la-Vallée/);
  assert.match(reply, /dans 3 min/);
  assert.match(reply, /Temps réel/);
  assert.match(reply, /Réseau régional/);
  assert.equal(realtimeCalls, 1);
});

test("does not describe stale feed estimates as current real time", async () => {
  const datasets = [{
    id: "dataset-2",
    title: "Réseau régional",
    slug: "reseau-regional",
    page_url: "https://transport.data.gouv.fr/datasets/reseau-regional",
    type: "public-transit",
    licence: "odc-odbl",
    resources: [
      { id: 201, title: "Horaires GTFS", format: "GTFS", type: "main", url: "https://transport.data.gouv.fr/resources/201/download", is_available: true, modes: ["rail"] },
      { id: 202, title: "GTFS-RT trip updates", format: "gtfs-rt", type: "api", url: "https://proxy.transport.data.gouv.fr/resource/reseau-rt-stale", is_available: true },
    ],
  }];
  const fetcher: typeof fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/datasets") return Response.json(datasets);
    if (url.hostname === "api-adresse.data.gouv.fr") return Response.json({
      features: [{ geometry: { coordinates: [2.35, 48.85] }, properties: { type: "locality", city: "Paris" } }],
    });
    if (url.pathname === "/api/gtfs-stops") return Response.json({
      features: [{ properties: { resource_id: 201, stop_id: "STOP-1", stop_name: "Châtelet", location_type: 0 } }],
    });
    if (url.pathname === "/resources/201/download") return new Response(staticFeed());
    if (url.pathname === "/resource/reseau-rt-stale") return new Response(realtimeFeed(NOW - 12 * 60, NOW + 180));
    return new Response("Not found", { status: 404 });
  };
  const client = new FranceTransportClient(fetcher, () => NOW * 1000);
  const query = parsePublicTransportQuery("Quel est le prochain RER A à Châtelet, Paris ?");
  assert.ok(query);
  const reply = await client.search(query, "fr");
  assert.match(reply, /n’a pas été actualisé depuis 12 min/);
  assert.doesNotMatch(reply, /Prochains passages/);
  assert.doesNotMatch(reply, /Marne-la-Vallée/);
});
