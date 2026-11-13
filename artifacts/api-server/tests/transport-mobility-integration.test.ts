import assert from "node:assert/strict";
import test from "node:test";
import { strToU8, zipSync } from "fflate";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { journeyPairs, realtimeJourneys } from "../src/discord/gtfs-journey.js";
import { MobilityDatabaseTransportClient } from "../src/discord/mobility-database-transport.js";
import { TransportBrowserClient, originOptions, arrivalOptions } from "../src/discord/transport-browser.js";
import { TransportMetadataCache } from "../src/discord/transport-metadata-cache.js";

const NOW = Date.parse("2026-11-12T07:00:00Z");
const city = { id: "qc:montreal", name: "Montréal", label: "Montréal · Québec",
  latitude: 45.5019, longitude: -73.5674, territory: "qc" as const };
const dataset = {
  id: "mdb-42", name: "Montréal Local Transit", provider: "Montréal Transit",
  status: "active", official: true,
  source_info: { license_id: "CC-BY-4.0", license_is_spdx: true },
  locations: [{ country_code: "CA" }],
  latest_dataset: {
    id: "mdb-42-20261112",
    hosted_url: "https://storage.googleapis.com/mobilitydata-datasets-prod/mdb-42/mdb-42-20261112/mdb-42-20261112.zip",
    downloaded_at: "2026-11-12T06:00:00Z", zipped_folder_size_mb: 1,
    bounding_box: { minimum_latitude: 45.49, maximum_latitude: 45.53,
      minimum_longitude: -73.59, maximum_longitude: -73.54 },
  },
};
const archive = zipSync({
  "agency.txt": strToU8("agency_id,agency_name,agency_timezone\nA,Test,America/Toronto\n"),
  "routes.txt": strToU8("route_id,route_short_name,route_long_name,route_type\nR,601,Local bus,3\n"),
  "trips.txt": strToU8("route_id,service_id,trip_id,trip_headsign\nR,S,T,Destination\n"),
  "calendar.txt": strToU8("service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nS,1,1,1,1,1,1,1,20200101,20991231\n"),
  "stops.txt": strToU8("stop_id,stop_name,stop_lat,stop_lon,location_type\nO,Origin,45.5019,-73.5674,0\nD,Destination,45.51,-73.56,0\n"),
  "stop_times.txt": strToU8("trip_id,arrival_time,departure_time,stop_id,stop_sequence\nT,09:00:00,09:00:00,O,1\nT,09:30:00,09:30:00,D,2\n"),
});

function realtimeFeed(options: { timestamp?: number; routeId?: string; originStopId?: string } = {}) {
  const departureAt = Date.parse("2026-11-12T14:05:00Z") / 1000;
  return GtfsRealtimeBindings.transit_realtime.FeedMessage.encode({
    header: { gtfsRealtimeVersion: "2.0", timestamp: options.timestamp ?? NOW / 1000 },
    entity: [{
      id: "trip-T",
      tripUpdate: {
        trip: { tripId: "T", routeId: options.routeId ?? "R", startDate: "20261112" },
        stopTimeUpdate: [
          { stopId: options.originStopId ?? "O", stopSequence: 1, departure: { time: departureAt } },
          { stopId: "D", stopSequence: 2, arrival: { time: departureAt + 1_800 } },
        ],
      },
    }],
  } as never).finish();
}

const relatedRealtimeFeed = {
  id: "mdb-rt-42", data_type: "gtfs_rt", status: "active",
  entity_types: ["tu"], feed_references: ["mdb-42"],
  source_info: { producer_url: "https://realtime.example.com/trip-updates", authentication_type: 0 },
};

function makeBrowser(fetcher: typeof fetch, officialTitle = "Réseau officiel Québec") {
  const metadata = new TransportMetadataCache(() => null, () => NOW);
  const mobility = new MobilityDatabaseTransportClient(fetcher, () => NOW, metadata, () => "test-refresh-token");
  const official = {
    async getCatalog() {
      return [{
        id: "official-qc", title: officialTitle, slug: "official-qc",
        page_url: "https://example.test/official", type: "public-transit", licence: "CC BY",
        territory: "qc" as const, bounds: [-74, 45, -73, 46] as const,
        resources: [{ id: 10, title: "GTFS", format: "GTFS", url: "https://example.test/official.zip",
          is_available: true, modes: ["bus"] }],
      }];
    },
  };
  const args: any[] = [
    {}, () => NOW, undefined, official,
    ...Array.from({ length: 12 }, () => undefined), mobility,
  ];
  return new TransportBrowserClient(...args);
}

function apiFetcher(liveBytes?: Uint8Array, realtimeCatalog: unknown[] = [relatedRealtimeFeed]): typeof fetch {
  return async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname === "/v1/tokens/access")
      return Response.json({ access_token: "temporary-access-token", expiration_datetime_utc: "2026-11-12T09:00:00Z" });
    if (url.pathname === "/v1/gtfs_feeds/mdb-42/gtfs_rt_feeds") return Response.json(realtimeCatalog);
    if (url.hostname === "realtime.example.com") {
      if (!liveBytes) return new Response(null, { status: 503 });
      return new Response(liveBytes);
    }
    if (url.pathname === "/v1/gtfs_feeds") return Response.json([dataset]);
    if (url.hostname === "storage.googleapis.com") return new Response(archive);
    throw new Error(`Unexpected request ${url.pathname}`);
  };
}

test("Mobility Database candidates supplement, but never replace, the existing country source", async () => {
  const browser = makeBrowser(apiFetcher());
  const networks = await browser.networks(city, "bus");
  assert.deepEqual(networks.map(network => network.id), ["official-qc", "mobilitydatabase:mdb-42"]);
  assert.equal(networks[0]?.title, "Réseau officiel Québec");
});

test("Mobility mode choices expose only modes found in scheduled GTFS routes", async () => {
  const metadata = {
    async get(_key: unknown, _ttl: number, load: () => Promise<unknown>) { return load(); },
    async staleWhileRevalidate(_key: unknown, _fresh: number, _retain: number, load: () => Promise<unknown>) {
      return { value: await load(), stale: false };
    },
  } as unknown as TransportMetadataCache;
  const fetcher: typeof fetch = async input => {
    const url = new URL(String(input));
    if (url.pathname === "/v1/tokens/access") return Response.json({ access_token: "temporary-access-token" });
    if (url.pathname === "/v1/locations") return Response.json({
      total: 1, results: [{ location_type: "country", country_code: "CA", country_name: "Canada" }],
    });
    if (url.pathname === "/v1/gtfs_feeds") return Response.json([dataset]);
    if (url.hostname === "storage.googleapis.com") return new Response(archive);
    throw new Error(`Unexpected request ${url.pathname}`);
  };
  const mobility = new MobilityDatabaseTransportClient(fetcher, () => NOW, metadata, () => "test-refresh-token");
  const browser = new TransportBrowserClient(undefined, () => NOW).enableMobilityDatabase(mobility);
  assert.deepEqual(await browser.availableModes("mobility:CA"), ["bus"]);
});

test("a Mobility Database copy of an existing network does not appear twice", async () => {
  const browser = makeBrowser(apiFetcher(), "Montréal Transit");
  const networks = await browser.networks(city, "bus");
  assert.deepEqual(networks.map(network => network.id), ["official-qc"]);
});

test("a selected catalog feed goes through the existing GTFS line and departure flow", async () => {
  const browser = makeBrowser(apiFetcher());
  const networks = await browser.networks(city, "bus");
  const selected = networks.find(network => network.id === "mobilitydatabase:mdb-42")!;
  const listing = await browser.lines(city, "bus", "601", selected.id);
  assert.equal(listing.lines.length, 1);
  assert.equal(listing.lines[0]?.label, "601");
  assert.equal(listing.lines[0]?.resource.provider, "mobilitydatabase");
  const line = listing.lines[0]!;
  const index = await browser.index(line);
  const origin = originOptions(index, line)[0]!;
  const arrival = arrivalOptions(index, origin)[0]!;
  const departures = await browser.departures(line, index, origin, arrival, "en");
  const cardText = [departures.embed?.description, ...(departures.embed?.fields ?? []).map(field => field.value),
    departures.content].filter(Boolean).join("\n");
  assert.match(cardText, /09:00/);
  assert.match(departures.source.attribution ?? "", /Mobility Database.*cc-by-4.0/);
  assert.equal(line.realtime.length, 1, "only the statically linked trip-update feed is enabled");
});

test("a fresh, explicitly linked Mobility Database feed updates the selected static trip", async () => {
  const browser = makeBrowser(apiFetcher(realtimeFeed()));
  const network = (await browser.networks(city, "bus")).find(item => item.id === "mobilitydatabase:mdb-42")!;
  const line = (await browser.lines(city, "bus", "601", network.id)).lines[0]!;
  assert.equal(line.realtime[0]?.type,
    "mobilitydatabase-gtfs-rt:%5B%22mdb-42%22%2C%22mdb-rt-42%22%5D");
  const liveClient = new MobilityDatabaseTransportClient(apiFetcher(realtimeFeed()), () => NOW,
    new TransportMetadataCache(() => null, () => NOW), () => "test-refresh-token");
  assert.ok((await liveClient.realtimeFeed(line.realtime[0]!)).length > 0);
  const index = await browser.index(line);
  const origin = originOptions(index, line)[0]!;
  const arrival = arrivalOptions(index, origin)[0]!;
  const pairs = journeyPairs(index, new Set(origin.ids), new Set(arrival.ids));
  const decoded = realtimeJourneys(realtimeFeed(), pairs, NOW / 1000, index.metadata);
  assert.equal(decoded.fresh, true);
  assert.equal(decoded.results.length, 1, JSON.stringify({
    trips: [...index.metadata.trips], pairs,
    realtimeResource: line.realtime[0],
  }));
  const result = await browser.departures(line, index, origin, arrival, "en");
  const text = [result.embed?.footer?.text, result.embed?.description,
    ...(result.embed?.fields ?? []).map(field => field.value), result.content].filter(Boolean).join("\n");
  assert.match(text, /09:05/);
  assert.match(text, /Real-time estimates/);
  assert.doesNotMatch(text, /09:00/);
});

test("stale or mismatched Mobility Database predictions leave static times intact", async () => {
  const cases = [
    ["stale timestamp", realtimeFeed({ timestamp: NOW / 1000 - 9 * 60 })],
    ["wrong route", realtimeFeed({ routeId: "OTHER" })],
    ["wrong stop despite matching sequence", realtimeFeed({ originStopId: "OTHER" })],
  ] as const;
  for (const [name, bytes] of cases) {
    const browser = makeBrowser(apiFetcher(bytes));
    const network = (await browser.networks(city, "bus")).find(item => item.id === "mobilitydatabase:mdb-42")!;
    const line = (await browser.lines(city, "bus", "601", network.id)).lines[0]!;
    const index = await browser.index(line);
    const origin = originOptions(index, line)[0]!;
    const arrival = arrivalOptions(index, origin)[0]!;
    const result = await browser.departures(line, index, origin, arrival, "en");
    const text = [result.embed?.footer?.text, result.embed?.description,
      ...(result.embed?.fields ?? []).map(field => field.value), result.content].filter(Boolean).join("\n");
    assert.match(text, /09:00/, name);
    assert.match(text, /Scheduled times · not real-time/, name);
  }
});

test("an unrelated or unavailable realtime feed never replaces static departures", async () => {
  for (const catalog of [
    [{ ...relatedRealtimeFeed, feed_references: ["mdb-another-static-feed"] }],
    [],
  ]) {
    const browser = makeBrowser(apiFetcher(realtimeFeed(), catalog));
    const network = (await browser.networks(city, "bus")).find(item => item.id === "mobilitydatabase:mdb-42")!;
    const line = (await browser.lines(city, "bus", "601", network.id)).lines[0]!;
    assert.deepEqual(line.realtime, []);
    const index = await browser.index(line);
    const origin = originOptions(index, line)[0]!;
    const arrival = arrivalOptions(index, origin)[0]!;
    const result = await browser.departures(line, index, origin, arrival, "en");
    assert.match(result.content, /09:00/);
    assert.match(result.content, /Scheduled times · not real-time/);
  }
  let failedRealtimeRequests = 0;
  const fallbackFetcher = apiFetcher();
  const browser = makeBrowser(async (input, init) => {
    if (new URL(String(input)).hostname === "realtime.example.com") failedRealtimeRequests++;
    return fallbackFetcher(input, init);
  });
  const network = (await browser.networks(city, "bus")).find(item => item.id === "mobilitydatabase:mdb-42")!;
  const line = (await browser.lines(city, "bus", "601", network.id)).lines[0]!;
  const index = await browser.index(line);
  const origin = originOptions(index, line)[0]!;
  const arrival = arrivalOptions(index, origin)[0]!;
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await browser.departures(line, index, origin, arrival, "en");
    assert.match(result.content, /09:00/);
    assert.match(result.content, /Scheduled times · not real-time/);
  }
  assert.equal(failedRealtimeRequests, 1, "a short failure cooldown avoids repeating a slow failed request");
});

test("slow Mobility Database lookup is bounded and leaves the native network visible", async () => {
  const fetcher = async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname === "/v1/tokens/access") return Response.json({ access_token: "temporary-access-token" });
    await new Promise(resolve => setTimeout(resolve, 500));
    return Response.json([dataset]);
  };
  const browser = makeBrowser(fetcher as typeof fetch);
  const started = Date.now();
  const networks = await browser.networks(city, "bus");
  assert.ok(Date.now() - started < 250, "the existing network list must not wait for the remote catalog");
  assert.deepEqual(networks.map(network => network.id), ["official-qc"]);
  await new Promise(resolve => setTimeout(resolve, 550));
  const refreshed = await browser.networks(city, "bus");
  assert.ok(refreshed.some(network => network.id === "mobilitydatabase:mdb-42"),
    "the completed background refresh becomes available on the next menu refresh");
});

test("a slow realtime association lookup does not hold up the selected static timetable", async () => {
  let associationCalls = 0;
  const fetcher: typeof fetch = async input => {
    const url = new URL(String(input));
    if (url.pathname === "/v1/tokens/access") return Response.json({ access_token: "temporary-access-token" });
    if (url.pathname === "/v1/gtfs_feeds") return Response.json([dataset]);
    if (url.pathname === "/v1/gtfs_feeds/mdb-42/gtfs_rt_feeds") {
      associationCalls++;
      return new Promise<Response>(() => undefined);
    }
    if (url.hostname === "storage.googleapis.com") return new Response(archive);
    throw new Error(`Unexpected request ${url.pathname}`);
  };
  const browser = makeBrowser(fetcher);
  const network = (await browser.networks(city, "bus")).find(item => item.id === "mobilitydatabase:mdb-42")!;
  const started = Date.now();
  const listing = await browser.lines(city, "bus", "601", network.id);
  assert.ok(Date.now() - started < 1_000, "an unavailable realtime catalog must not delay static lines");
  assert.equal(listing.lines[0]?.label, "601");
  assert.equal(associationCalls, 1);
});

test("a delayed realtime association fills the cached line list after its static result appears", async () => {
  const fetcher: typeof fetch = async input => {
    const url = new URL(String(input));
    if (url.pathname === "/v1/tokens/access") return Response.json({ access_token: "temporary-access-token" });
    if (url.pathname === "/v1/gtfs_feeds") return Response.json([dataset]);
    if (url.pathname === "/v1/gtfs_feeds/mdb-42/gtfs_rt_feeds") {
      await new Promise(resolve => setTimeout(resolve, 325));
      return Response.json([relatedRealtimeFeed]);
    }
    if (url.hostname === "storage.googleapis.com") return new Response(archive);
    throw new Error(`Unexpected request ${url.pathname}`);
  };
  const browser = makeBrowser(fetcher);
  const network = (await browser.networks(city, "bus")).find(item => item.id === "mobilitydatabase:mdb-42")!;
  const listing = await browser.lines(city, "bus", "601", network.id);
  assert.equal(listing.lines[0]?.label, "601");
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal(listing.lines[0]?.realtime.length, 1,
    "the bounded lookup can finish after the static timetable without losing its live feed");
});

test("Japan area browsing exposes only prefectures with GTFS routes and lists only served lines", async () => {
  const japanFeed = {
    id: "jp-regional-feed", feed_name: "Japan Sample", provider: "Japan Transit", status: "active", official: true,
    source_info: { license_id: "CC-BY-4.0", license_is_spdx: true },
    locations: [{ country_code: "JP" }],
    latest_dataset: {
      id: "jp-regional-feed-v1",
      hosted_url: "https://storage.googleapis.com/mobilitydata-datasets-prod/jp-regional-feed/v1/feed.zip",
      downloaded_at: "2026-11-12T06:00:00Z", zipped_folder_size_mb: 1,
      bounding_box: { minimum_latitude: 0, maximum_latitude: 6, minimum_longitude: 0, maximum_longitude: 6 },
    },
  };
  const japanArchive = zipSync({
    "agency.txt": strToU8("agency_id,agency_name,agency_timezone\nA,Test,Asia/Tokyo\n"),
    "routes.txt": strToU8("route_id,route_short_name,route_long_name,route_type\nR-TOKYO,101,Tokyo Bus,3\nR-REMOTE,202,Remote Bus,3\n"),
    "trips.txt": strToU8("route_id,service_id,trip_id\nR-TOKYO,S,T-TOKYO\nR-REMOTE,S,T-REMOTE\n"),
    "calendar.txt": strToU8("service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nS,1,1,1,1,1,1,1,20200101,20991231\n"),
    "stops.txt": strToU8("stop_id,stop_name,stop_lat,stop_lon,location_type\nTOKYO,Tokyo,0.5,0.5,0\nREMOTE,Remote,5.5,5.5,0\n"),
    "stop_times.txt": strToU8("trip_id,stop_id,stop_sequence,arrival_time,departure_time\nT-TOKYO,TOKYO,1,08:00:00,08:00:00\nT-REMOTE,REMOTE,1,08:00:00,08:00:00\n"),
  });
  const metadataValues = new Map<string, unknown>();
  const metadata = {
    async staleWhileRevalidate<T>(key: unknown, _fresh: number, _retain: number, load: () => Promise<T>) {
      const id = JSON.stringify(key);
      if (metadataValues.has(id)) return { value: structuredClone(metadataValues.get(id)) as T, stale: false };
      const value = await load(); metadataValues.set(id, value); return { value, stale: false };
    },
    async get<T>(key: unknown, _ttl: number, load: () => Promise<T>) {
      const id = JSON.stringify(key);
      if (metadataValues.has(id)) return structuredClone(metadataValues.get(id)) as T;
      const value = await load(); metadataValues.set(id, value); return structuredClone(value);
    },
  } as unknown as TransportMetadataCache;
  const fetcher: typeof fetch = async input => {
    const url = new URL(String(input));
    if (url.pathname === "/v1/tokens/access") return Response.json({
      access_token: "temporary-access-token", expiration_datetime_utc: "2026-11-12T09:00:00Z",
    });
    if (url.pathname === "/v1/gtfs_feeds" && url.searchParams.get("country_code") === "JP") {
      return Response.json([japanFeed]);
    }
    if (url.hostname === "storage.googleapis.com") return new Response(japanArchive);
    if (url.hostname === "www.geoboundaries.org") return Response.json({
      boundaryID: "JPN-ADM1-live-test", boundaryType: "ADM1", boundaryYearRepresented: "2025",
      boundaryCanonical: "Prefecture", boundaryLicense: "Public Domain",
      boundarySource: "Test GeoBoundaries", boundarySourceURL: "https://www.geoboundaries.org/",
      simplifiedGeometryGeoJSON:
        "https://github.com/wmgeolab/geoBoundaries/raw/test/releaseData/gbOpen/JPN/ADM1/geoBoundaries-JPN-ADM1_simplified.geojson",
    });
    if (url.hostname === "github.com") {
      const response = Response.json({
        type: "FeatureCollection",
        features: [
          { type: "Feature", properties: { shapeName: "Tokyo", shapeISO: "JP-13", shapeID: "tokyo" },
            geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] } },
          { type: "Feature", properties: { shapeName: "Osaka", shapeISO: "JP-27", shapeID: "osaka" },
            geometry: { type: "Polygon", coordinates: [[[2, 2], [3, 2], [3, 3], [2, 3], [2, 2]]] } },
        ],
      });
      Object.defineProperty(response, "url", {
        value: "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/test/releaseData/gbOpen/JPN/ADM1/geoBoundaries-JPN-ADM1_simplified.geojson",
      });
      return response;
    }
    throw new Error(`Unexpected Japan region request ${url.hostname}${url.pathname}`);
  };
  const mobility = new MobilityDatabaseTransportClient(fetcher, () => NOW, metadata, () => "test-refresh-token");
  const browser = new TransportBrowserClient(undefined, () => NOW, undefined, undefined, undefined,
    undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
    undefined, mobility);
  const territory = "mobility:JP" as const;
  const regions = await browser.coveredRegions(territory, "bus");
  assert.deepEqual(regions, ["Tokyo"]);
  const region = await browser.region("Tokyo", territory);
  assert.ok(region?.boundary);
  const networks = await browser.regionNetworks(region!, "bus");
  assert.equal(networks.length, 1);
  const listing = await browser.regionLines(networks[0]!, "bus", "", region!);
  assert.deepEqual(listing.lines.map(line => line.label), ["101"]);
  assert.equal(listing.unavailable, 0);
});
