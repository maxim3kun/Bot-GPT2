import assert from "node:assert/strict";
import test from "node:test";
import { zipSync, strToU8 } from "fflate";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { FranceTransportClient } from "../src/discord/public-transport.js";
import { decodeGtfsRealtime, decodeGtfsScheduledDepartures, parseGtfsRoutesAtStops, parseGtfsStaticMetadata } from "../src/discord/gtfs-realtime.js";
import { parsePublicTransportQuery, isPublicTransportRequest } from "../src/discord/transport-query.js";

const NOW = 1_800_000_000;

function gtfsClockAt(epochSeconds: number): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(epochSeconds * 1000));
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "00";
  return `${part("hour")}:${part("minute")}:${part("second")}`;
}

function staticFeed(departureTime = "08:03:00", routeType = 2, routeName = "A"): Uint8Array {
  return zipSync({
    "agency.txt": strToU8("agency_id,agency_name,agency_timezone\nRATP,RATP,Europe/Paris\n"),
    "routes.txt": strToU8(`route_id,route_short_name,route_long_name,route_type\nroute-a,${routeName},${routeName},${routeType}\n`),
    "trips.txt": strToU8("route_id,service_id,trip_id,trip_headsign,direction_id\nroute-a,weekday,trip-a,Marne-la-Vallée,0\n"),
    "calendar.txt": strToU8("service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nweekday,1,1,1,1,1,1,1,20000101,20991231\n"),
    "stop_times.txt": strToU8(`trip_id,arrival_time,departure_time,stop_id,stop_sequence\ntrip-a,${departureTime},${departureTime},STOP-1,1\n`),
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
  assert.deepEqual(
    parsePublicTransportQuery("Dis moi horaire du bus Amiens Beauvais 601"),
    { place: "Amiens Beauvais", mode: "bus", line: "601" },
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

test("decodes scheduled GTFS departures separately from real-time data", () => {
  const result = decodeGtfsScheduledDepartures(staticFeed(gtfsClockAt(NOW + 180)), new Set(["STOP-1"]), NOW);
  assert.equal(result.timezone, "Europe/Paris");
  assert.equal(result.departures.length, 1);
  assert.equal(result.departures[0]?.departureAt, NOW + 180);
  assert.equal(result.departures[0]?.delaySeconds, null);
});

test("indexes GTFS bus routes by the stops they serve", () => {
  const routes = parseGtfsRoutesAtStops(staticFeed("08:03:00", 3, "601"), new Set(["STOP-1"]));
  assert.deepEqual(routes, [{
    routeId: "route-a",
    shortName: "601",
    longName: "601",
    mode: "bus",
    stopIds: ["STOP-1"],
  }]);
});

test("uses the national catalogue and public GTFS-RT feed to answer without web search", async () => {
  const zip = staticFeed();
  const bytes = realtimeFeed(NOW, NOW + 180);
  let realtimeCalls = 0;
  const datasets = [{
    id: "dataset-1",
    title: "Réseau urbain Lib'Bus — Oise Mobilité",
    slug: "reseau-libbus",
    page_url: "https://transport.data.gouv.fr/datasets/reseau-libbus",
    type: "public-transit",
    licence: "lov2",
    resources: [
      { id: 101, title: "Horaires GTFS", format: "GTFS", type: "main", url: "https://api.oisemob.cityway.fr/dataflow/offre-tc/download?provider=LIBBUS&dataFormat=GTFS&dataProfil=OPENDATA", is_available: true, modes: ["rail"] },
      { id: 102, title: "GTFS-RT trip updates", format: "gtfs-rt", type: "api", url: "https://api.oisemob.cityway.fr/dataflow/horaire-tc-tr/download?provider=LIBBUS&dataFormat=gtfs-rt", is_available: true },
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
    if (url.hostname === "api.oisemob.cityway.fr" && url.pathname.includes("/offre-tc/download")) return new Response(zip);
    if (url.hostname === "api.oisemob.cityway.fr" && url.pathname.includes("/horaire-tc-tr/download")) {
      realtimeCalls++;
      return new Response(bytes);
    }
    return new Response("Not found", { status: 404 });
  };

  const client = new FranceTransportClient(fetcher, () => NOW * 1000);
  const query = parsePublicTransportQuery("Quel est le prochain RER A à Châtelet, Paris ?");
  assert.ok(query);
  const result = await client.search(query, "fr");
  assert.equal(result.kind, "answer");
  if (result.kind !== "answer") return;
  const reply = result.content;
  assert.match(reply, /Châtelet/);
  assert.match(reply, /\*\*A\*\* → Marne-la-Vallée/);
  assert.match(reply, /dans 3 min/);
  assert.match(reply, /Temps réel/);
  assert.match(reply, /Oise Mobilité/);
  assert.doesNotMatch(reply, /https?:\/\//);
  assert.equal(result.source?.name, "Réseau urbain Lib'Bus — Oise Mobilité");
  assert.equal(realtimeCalls, 1);
});

test("filters a numeric bus line instead of returning unrelated departures", async () => {
  const query = parsePublicTransportQuery("Dis moi horaire du bus Amiens Beauvais 601");
  assert.ok(query);
  const datasets = [{
    id: "corolis-beauvais",
    title: "Réseau urbain Corolis",
    slug: "corolis",
    page_url: "https://transport.data.gouv.fr/datasets/corolis",
    type: "public-transit",
    licence: "lov2",
    resources: [
      { id: 601, title: "Horaires GTFS", format: "GTFS", type: "main", url: "https://transport.data.gouv.fr/resources/601/download", is_available: true, modes: ["bus"] },
      { id: 602, title: "GTFS-RT", format: "gtfs-rt", type: "api", url: "https://proxy.transport.data.gouv.fr/resource/corolis-live", is_available: true },
    ],
  }];
  const fetcher: typeof fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/datasets") return Response.json(datasets);
    if (url.hostname === "api-adresse.data.gouv.fr") return Response.json({
      features: [{ geometry: { coordinates: [2.08, 49.43] }, properties: { type: "locality", city: "Beauvais" } }],
    });
    if (url.pathname === "/api/gtfs-stops") return Response.json({
      features: [{ properties: { resource_id: 601, stop_id: "BEAUVAIS-1", stop_name: "Beauvais Gare Routière", location_type: 0 } }],
    });
    if (url.pathname === "/resources/601/download") return new Response(staticFeed("08:03:00", 3, "C1"));
    if (url.pathname === "/resource/corolis-live") return new Response(realtimeFeed(NOW, NOW + 180));
    return new Response("Not found", { status: 404 });
  };
  const client = new FranceTransportClient(fetcher, () => NOW * 1000);
  const result = await client.search(query, "fr");
  assert.equal(result.kind, "answer");
  if (result.kind !== "answer") return;
  assert.match(result.content, /ligne \*\*601\*\*/);
  assert.doesNotMatch(result.content, /\*\*C1\*\*/);
});

test("loads the official Oise regional GTFS redirect and lists line 601 as scheduled", async () => {
  const scheduledZip = staticFeed(gtfsClockAt(NOW + 180), 3, "601");
  const datasets = [{
    id: "oise-regional",
    title: "Réseau interurbain et scolaire - Oise (60)",
    slug: "reseau-interurbain-oise",
    page_url: "https://transport.data.gouv.fr/datasets/reseau-interurbain-oise",
    type: "public-transit",
    licence: "lov2",
    publisher: { name: "Région Hauts-de-France" },
    covered_area: [{ insee: "60", nom: "Oise", type: "departement" }],
    resources: [{
      id: 701,
      title: "Fichier GTFS commercial et scolaire de l’Oise",
      format: "GTFS",
      url: "https://www.data.gouv.fr/api/1/datasets/r/oise-p3",
      is_available: true,
      modes: ["bus"],
    }],
  }];
  let regionalFileCalls = 0;
  const fetcher: typeof fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/datasets") return Response.json(datasets);
    if (url.hostname === "api-adresse.data.gouv.fr") return Response.json({
      features: [{ geometry: { coordinates: [2.08, 49.43] }, properties: { type: "municipality", city: "Beauvais" } }],
    });
    if (url.pathname === "/api/gtfs-stops") return Response.json({
      features: [{ properties: { resource_id: 701, stop_id: "STOP-1", stop_name: "Beauvais Gare Routière", location_type: 0 } }],
    });
    if (url.hostname === "www.data.gouv.fr" && url.pathname === "/api/1/datasets/r/oise-p3") {
      return new Response(null, {
        status: 302,
        headers: { location: "https://geocatalogue.hautsdefrance.fr/gtfs/RHDF_GTFS_COM_SCO_60_P3.zip" },
      });
    }
    if (url.hostname === "geocatalogue.hautsdefrance.fr") {
      regionalFileCalls++;
      return new Response(scheduledZip);
    }
    return new Response("Not found", { status: 404 });
  };

  const client = new FranceTransportClient(fetcher, () => NOW * 1000);
  const result = await client.search({
    place: "Beauvais",
    mode: "bus",
    line: "601",
    allowNearbyStops: true,
  }, "fr");
  assert.equal(result.kind, "answer");
  if (result.kind !== "answer") return;
  assert.match(result.content, /Horaires théoriques \(non temps réel\)/);
  assert.match(result.content, /\*\*601\*\*/);
  assert.match(result.content, /dans 3 min/);
  assert.equal(result.source?.name, "Réseau interurbain et scolaire - Oise (60)");
  assert.ok(regionalFileCalls >= 2);

  const cityListing = await client.listBusCity("Beauvais", "fr");
  assert.match(cityListing, /Réseau interurbain et scolaire - Oise \(60\)/);
  assert.match(cityListing, /`601`/);
  const directory = await client.listBusDirectory("fr");
  assert.match(directory, /Réseaux de bus référencés dans l’Oise/);
  assert.match(directory, /horaires théoriques/);
});

test("asks the requester to choose when multiple nearby stops match", async () => {
  const datasets = [
    {
      id: "dataset-north",
      title: "Réseau Nord",
      slug: "reseau-nord",
      page_url: "https://transport.data.gouv.fr/datasets/reseau-nord",
      type: "public-transit",
      licence: "lov2",
      resources: [
        { id: 301, title: "GTFS", format: "GTFS", url: "https://transport.data.gouv.fr/resources/301/download", is_available: true, modes: ["bus"] },
        { id: 302, title: "GTFS-RT", format: "gtfs-rt", url: "https://proxy.transport.data.gouv.fr/resource/north", is_available: true },
      ],
    },
    {
      id: "dataset-south",
      title: "Réseau Sud",
      slug: "reseau-sud",
      page_url: "https://transport.data.gouv.fr/datasets/reseau-sud",
      type: "public-transit",
      licence: "lov2",
      resources: [
        { id: 401, title: "GTFS", format: "GTFS", url: "https://transport.data.gouv.fr/resources/401/download", is_available: true, modes: ["bus"] },
        { id: 402, title: "GTFS-RT", format: "gtfs-rt", url: "https://proxy.transport.data.gouv.fr/resource/south", is_available: true },
      ],
    },
  ];
  let realtimeCalls = 0;
  const fetcher: typeof fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/datasets") return Response.json(datasets);
    if (url.hostname === "api-adresse.data.gouv.fr") return Response.json({
      features: [{ geometry: { coordinates: [2.35, 48.85] }, properties: { type: "locality", city: "Paris" } }],
    });
    if (url.pathname === "/api/gtfs-stops") return Response.json({
      features: [
        { properties: { resource_id: 301, stop_id: "NORTH-1", stop_name: "Gare Lyon Nord", location_type: 0 } },
        { properties: { resource_id: 401, stop_id: "SOUTH-1", stop_name: "Gare Lyon Sud", location_type: 0 } },
      ],
    });
    if (url.pathname.includes("resource/")) {
      realtimeCalls++;
      return new Response(realtimeFeed(NOW, NOW + 180));
    }
    return new Response("Not found", { status: 404 });
  };
  const client = new FranceTransportClient(fetcher, () => NOW * 1000);
  const query = { place: "Gare Lyon", mode: "bus" as const };
  const first = await client.search(query, "fr");
  assert.equal(first.kind, "choose-stop");
  if (first.kind !== "choose-stop") return;
  assert.deepEqual(first.choices.map((choice) => choice.label), ["Gare Lyon Nord", "Gare Lyon Sud"]);
  assert.equal(realtimeCalls, 0);

  const selected = await client.search(query, "fr", first.choices[1]?.value);
  assert.equal(selected.kind, "answer");
  if (selected.kind === "answer") assert.match(selected.content, /Gare Lyon Sud/);
  assert.equal(realtimeCalls, 1);
});

test("uses scheduled Oise Mobilité GTFS when no real-time feed is published", async () => {
  const scheduledZip = staticFeed(gtfsClockAt(NOW + 180), 3);
  const datasets = [{
    id: "oise-libbus",
    title: "Réseau urbain Lib'Bus — Oise Mobilité",
    slug: "reseau-libbus",
    page_url: "https://transport.data.gouv.fr/datasets/reseau-libbus",
    type: "public-transit",
    licence: "lov2",
    resources: [
      { id: 501, title: "Horaires GTFS", format: "GTFS", type: "main", url: "https://transport.data.gouv.fr/resources/501/download", is_available: true, modes: ["bus"] },
    ],
  }];
  let oiseFeedCalls = 0;
  const fetcher: typeof fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/datasets") return Response.json(datasets);
    if (url.hostname === "api-adresse.data.gouv.fr") return Response.json({
      features: [{ geometry: { coordinates: [3.0, 49.58] }, properties: { type: "locality", city: "Noyon" } }],
    });
    if (url.pathname === "/api/gtfs-stops") return Response.json({
      features: [{ properties: { resource_id: 501, stop_id: "STOP-1", stop_name: "Gare de Noyon", location_type: 0 } }],
    });
    if (url.hostname === "transport.data.gouv.fr" && url.pathname === "/resources/501/download") {
      return new Response(null, {
        status: 302,
        headers: { location: "https://api.oisemob.cityway.fr/dataflow/offre-tc/download?provider=LIBBUS&dataFormat=GTFS&dataProfil=OPENDATA" },
      });
    }
    if (url.hostname === "api.oisemob.cityway.fr" && url.pathname === "/dataflow/offre-tc/download") {
      oiseFeedCalls++;
      return new Response(scheduledZip);
    }
    return new Response("Not found", { status: 404 });
  };
  const client = new FranceTransportClient(fetcher, () => NOW * 1000);
  const query = { place: "Gare de Noyon", mode: "bus" as const };
  const result = await client.search(query, "fr");
  assert.equal(result.kind, "answer");
  if (result.kind !== "answer") return;
  assert.match(result.content, /Horaires théoriques \(non temps réel\)/);
  assert.match(result.content, /dans 3 min/);
  assert.match(result.content, /Lib'Bus/);
  assert.equal(oiseFeedCalls, 1);
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
  const result = await client.search(query, "fr");
  assert.equal(result.kind, "answer");
  if (result.kind !== "answer") return;
  const reply = result.content;
  assert.match(reply, /n’a pas été actualisé depuis 12 min/);
  assert.doesNotMatch(reply, /Prochains passages/);
  assert.doesNotMatch(reply, /Marne-la-Vallée/);
});
