import assert from "node:assert/strict";
import test from "node:test";
import { strToU8, zipSync } from "fflate";
import { MobilityDatabaseTransportClient, safeMobilityDatasetUrl } from "../src/discord/mobility-database-transport.js";
import { TransportMetadataCache } from "../src/discord/transport-metadata-cache.js";
import type { CatalogResource, TransportLocation } from "../src/discord/public-transport.js";

const city: TransportLocation = {
  id: "75056", name: "Paris", label: "Paris", latitude: 48.8566, longitude: 2.3522, territory: "fr",
};
const hosted = (id: string) => `https://storage.googleapis.com/mobilitydata-datasets-prod/${id}/${id}-20261112/${id}-20261112.zip`;
const box = { minimum_latitude: 48.82, maximum_latitude: 48.9, minimum_longitude: 2.3, maximum_longitude: 2.4 };
function feed(id: string, extra: Record<string, unknown> = {}) {
  return {
    id, feed_name: `Operator ${id}`, provider: `Transit ${id}`, status: "active", official: true,
    source_info: { license_id: "CC-BY-4.0", license_is_spdx: true }, locations: [{ country_code: "FR" }],
    latest_dataset: { id: `${id}-20261112`, hosted_url: hosted(id), downloaded_at: "2026-11-12T08:00:00Z",
      zipped_folder_size_mb: 2, bounding_box: box },
    ...extra,
  };
}
function routeArchive({ routeType = 3, trip = true }: { routeType?: number; trip?: boolean } = {}) {
  return zipSync({
    "routes.txt": strToU8(`route_id,route_short_name,route_long_name,route_type\nR,601,Test line,${routeType}\n`),
    "trips.txt": strToU8(trip ? "route_id,service_id,trip_id\nR,S,T\n" : "route_id,service_id,trip_id\n"),
    "calendar.txt": strToU8(trip
      ? "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nS,1,1,1,1,1,1,1,20200101,20991231\n"
      : "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\n"),
  });
}
const fakeMetadata = () => {
  const cache = new Map<string, unknown>();
  return {
    cache,
    async staleWhileRevalidate<T>(key: unknown, _fresh: number, _retain: number, load: () => Promise<T>) {
      const id = JSON.stringify(key);
      if (cache.has(id)) return { value: cache.get(id) as T, stale: false };
      const value = await load();
      cache.set(id, value);
      return { value, stale: false };
    },
    async get<T>(key: unknown, _ttl: number, load: () => Promise<T>) {
      const id = JSON.stringify(key);
      if (cache.has(id)) return structuredClone(cache.get(id)) as T;
      const value = await load();
      cache.set(id, value);
      return structuredClone(value) as T;
    },
  } as unknown as TransportMetadataCache;
};

test("catalog search pages results and retains only active, licensed feeds in the chosen country", async () => {
  const requested: URL[] = [];
  let tokenRequests = 0;
  const metadata = fakeMetadata();
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(init?.redirect, "error");
    if (url.pathname === "/v1/tokens/access") {
      tokenRequests++;
      assert.deepEqual(JSON.parse(String(init?.body)), { refresh_token: "test-refresh-token" });
      return Response.json({ access_token: "temporary-access-token",
        expiration_datetime_utc: "2026-11-12T09:00:00Z" });
    }
    requested.push(url);
    assert.equal(init?.headers && (init.headers as Record<string, string>).authorization, "Bearer temporary-access-token");
    assert.equal(url.searchParams.get("country_code"), "FR");
    assert.equal(url.searchParams.has("status"), false, "the GTFS endpoint does not support a status filter");
    assert.equal(url.searchParams.get("bounding_filter_method"), "partially_enclosed");
    const offset = Number(url.searchParams.get("offset"));
    if (offset === 0) return Response.json([
      ...Array.from({ length: 248 }, (_, index) => feed(
        index === 0 ? "tld-fr-feed_1" : `mdb-${index + 1}`,
        index === 0 ? { provider: "000 Transit" } : {},
      )),
      feed("mdb-denied", { source_info: { license_id: "unknown-license", license_is_spdx: true } }),
      feed("mdb-deprecated", { status: "deprecated" }),
    ]);
    if (offset === 250) return Response.json([feed("mdb-250")]);
    throw new Error(`Unexpected offset ${offset}`);
  };
  const client = new MobilityDatabaseTransportClient(fetcher, () => Date.parse("2026-11-12T08:10:00Z"),
    metadata, () => "test-refresh-token");
  const datasets = await client.catalogForLocation(city, 1_000);
  assert.equal(requested.length, 2, "both pages must be requested");
  assert.deepEqual(requested.map(url => url.searchParams.get("offset")), ["0", "250"]);
  assert.equal(datasets.length, 20, "the visible list is capped to keep the menu manageable");
  assert.ok(datasets.every(dataset => dataset.licence === "cc-by-4.0"));
  assert.ok(datasets.every(dataset => dataset.territory === "fr"));
  assert.ok(datasets.every(dataset => dataset.resources[0]?.provider === "mobilitydatabase"));
  assert.ok(datasets.every(dataset => dataset.resources[0]?.url.startsWith("https://storage.googleapis.com/")));
  assert.ok(datasets.some(dataset => dataset.slug === "tld-fr-feed_1"), "valid catalog IDs need not use the mdb- prefix");
  assert.ok(!datasets.some(dataset => dataset.slug === "mdb-deprecated"), "deprecated feeds are rejected locally");
  assert.ok(datasets.some(dataset => dataset.title.includes("source officielle")));
  assert.equal(tokenRequests, 1);
  await client.catalogForLocation(city, 1_000);
  assert.equal(requested.length, 2, "the cached catalog avoids another API round trip");
  assert.equal(tokenRequests, 1, "the access token is reused in memory");
});

test("catalog cold misses return quickly while the refresh continues in the background", async () => {
  let feedQueryStarted = false;
  const fetcher: typeof fetch = async input => {
    const url = new URL(String(input));
    if (url.pathname === "/v1/tokens/access") return Response.json({ access_token: "temporary-access-token" });
    feedQueryStarted = true;
    await new Promise(resolve => setTimeout(resolve, 600));
    return Response.json([feed("mdb-slow")]);
  };
  const client = new MobilityDatabaseTransportClient(fetcher, Date.now, fakeMetadata(), () => "test-refresh-token");
  const started = Date.now();
  const datasets = await client.catalogForLocation({ ...city, territory: "qc" }, 80);
  assert.deepEqual(datasets, []);
  assert.ok(Date.now() - started < 350, "a cache miss must not wait for the remote catalog");
  assert.equal(feedQueryStarted, true);
});

test("the country directory is paged, deduplicated and cached", async () => {
  let tokenRequests = 0;
  const offsets: string[] = [];
  const client = new MobilityDatabaseTransportClient(async input => {
    const url = new URL(String(input));
    if (url.pathname === "/v1/tokens/access") {
      tokenRequests++;
      return Response.json({ access_token: "temporary-access-token" });
    }
    assert.equal(url.pathname, "/v1/locations");
    assert.equal(url.searchParams.get("location_type"), "country");
    assert.equal(url.searchParams.get("limit"), "100");
    offsets.push(url.searchParams.get("offset") ?? "");
    if (url.searchParams.get("offset") === "0") return Response.json({
      total: 101,
      results: [
        { location_type: "country", country_code: "FR", country_name: "France" },
        { location_type: "country", country_code: "CA", country_name: "Canada" },
        { location_type: "subdivision", country_code: "CA", country_name: "Canada" },
        ...Array.from({ length: 97 }, () => ({ location_type: "country", country_code: "FR", country_name: "France" })),
      ],
    });
    if (url.searchParams.get("offset") === "100") return Response.json({
      total: 101,
      results: [{ location_type: "country", country_code: "FR", country_name: "France" }],
    });
    throw new Error("Unexpected location page");
  }, Date.now, fakeMetadata(), () => "test-refresh-token");
  const countries = await client.countries();
  assert.deepEqual(offsets, ["0", "100"]);
  assert.deepEqual(countries, [
    { code: "CA", name: "Canada" }, { code: "FR", name: "France" },
  ]);
  assert.deepEqual(await client.countries(), countries);
  assert.equal(offsets.length, 2, "the cached country list avoids another catalog request");
  assert.equal(tokenRequests, 1);
});

test("country coverage requires real GTFS routes linked to a scheduled trip", async () => {
  const requestedCountries: string[] = [];
  const client = new MobilityDatabaseTransportClient(async input => {
    const url = new URL(String(input));
    if (url.pathname === "/v1/tokens/access") return Response.json({ access_token: "temporary-access-token" });
    if (url.hostname === "storage.googleapis.com") {
      return new Response(routeArchive({ trip: !url.pathname.includes("mdb-de-broken") }));
    }
    if (url.pathname === "/v1/locations") return Response.json({
      total: 2,
      results: [
        { location_type: "country", country_code: "FR", country_name: "France" },
        { location_type: "country", country_code: "DE", country_name: "Germany" },
      ],
    });
    assert.equal(url.pathname, "/v1/gtfs_feeds");
    const code = url.searchParams.get("country_code")!;
    requestedCountries.push(code);
    assert.equal(url.searchParams.has("dataset_latitudes"), false, "coverage scans are country-wide, not per search area");
    if (code === "FR") return Response.json([feed("mdb-fr-open", {
      data_type: "gtfs", locations: [{ country_code: "FR" }],
    })]);
    if (code === "DE") return Response.json([
      feed("mdb-de-broken", { data_type: "gtfs", locations: [{ country_code: "DE" }] }),
    ]);
    throw Error(`Unexpected country ${code}`);
  }, Date.now, fakeMetadata(), () => "test-refresh-token");
  const coverage = await client.countryCoverage();
  assert.deepEqual(coverage, {
    countries: [
      { code: "FR", name: "France", covered: true, modes: ["bus"], routeCount: 1 },
      { code: "DE", name: "Germany", covered: false, modes: [], routeCount: 0 },
    ],
    complete: true,
  });
  assert.deepEqual(requestedCountries.sort(), ["DE", "FR"]);
  assert.deepEqual(await client.countryCoverage(), coverage, "coverage metadata is cached between searches");
  assert.deepEqual(requestedCountries.sort(), ["DE", "FR"]);
});

test("an incomplete country directory is marked incomplete rather than blocking existing coverage", async () => {
  const client = new MobilityDatabaseTransportClient(async input => {
    const url = new URL(String(input));
    if (url.pathname === "/v1/tokens/access") return Response.json({ access_token: "temporary-access-token" });
    if (url.pathname === "/v1/locations") return Response.json({
      total: 3,
      results: [{ location_type: "country", country_code: "FR", country_name: "France" }],
    });
    assert.equal(url.pathname, "/v1/gtfs_feeds");
    return Response.json([]);
  }, Date.now, fakeMetadata(), () => "test-refresh-token");
  const coverage = await client.countryCoverage();
  assert.equal(coverage.complete, false);
  assert.deepEqual(coverage.countries, [
    { code: "FR", name: "France", covered: false, modes: [], routeCount: 0 },
  ]);
});

test("worldwide town search stays inside its selected country and returns a Mobility location", async () => {
  const requested: URL[] = [];
  const client = new MobilityDatabaseTransportClient(async input => {
    const url = new URL(String(input));
    requested.push(url);
    assert.equal(url.hostname, url.pathname === "/v1/tokens/access" ? "api.mobilitydatabase.org" : "nominatim.openstreetmap.org");
    if (url.pathname === "/v1/tokens/access") return Response.json({ access_token: "temporary-access-token" });
    assert.equal(url.searchParams.get("countrycodes"), "sg");
    assert.equal(url.searchParams.get("format"), "jsonv2");
    return Response.json([
      { class: "place", type: "city", name: "Singapore", lat: "1.29", lon: "103.85",
        address: { country_code: "sg", state: "Central Region" } },
      { class: "place", type: "town", name: "Wrong country", lat: "1.2", lon: "103.8",
        address: { country_code: "my" } },
      { class: "highway", type: "residential", name: "Not a city", lat: "1.3", lon: "103.9",
        address: { country_code: "sg" } },
    ]);
  }, Date.now, fakeMetadata(), () => "test-refresh-token");
  const places = await client.municipalities("Singapore", "SG");
  assert.equal(places.length, 1);
  assert.equal(places[0]?.name, "Singapore");
  assert.equal(places[0]?.territory, "mobility:SG");
  assert.equal(places[0]?.mobilityCountryCode, "SG");
  assert.equal(requested.length, 1);
});

test("Mobility address and stop suggestions are country-bounded and are not persisted as user searches", async () => {
  const requested: URL[] = [];
  const metadata = fakeMetadata();
  const client = new MobilityDatabaseTransportClient(async input => {
    const url = new URL(String(input));
    requested.push(url);
    if (url.pathname === "/v1/tokens/access") return Response.json({ access_token: "temporary-access-token" });
    assert.equal(url.hostname, "nominatim.openstreetmap.org");
    assert.equal(url.searchParams.get("countrycodes"), "gb");
    return Response.json([
      { class: "building", type: "house", name: "12 King Street", display_name: "12 King Street, London, England",
        lat: "51.5", lon: "-0.12", address: { country_code: "gb", house_number: "12", road: "King Street" } },
      { class: "public_transport", type: "platform", name: "King Street Stop",
        display_name: "King Street Stop, London, England", lat: "51.501", lon: "-0.121",
        address: { country_code: "gb" } },
      { class: "building", type: "house", name: "Foreign address", lat: "51.5", lon: "-0.12",
        address: { country_code: "fr", house_number: "12", road: "King Street" } },
    ]);
  }, Date.now, metadata, () => "test-refresh-token");
  const places = await client.municipalities("12 King Street", "GB");
  assert.equal(places.length, 2);
  assert.ok(places.every(place => place.kind === "address"));
  assert.ok(places.every(place => place.territory === "mobility:GB"));
  assert.equal(metadata.cache.size, 0, "address text and selected coordinates stay out of persistent metadata");
  assert.equal(requested.length, 1);
});

test("Nominatim jsonv2 category results allow Kabul to be selected in Afghanistan", async () => {
  const client = new MobilityDatabaseTransportClient(async input => {
    const url = new URL(String(input));
    if (url.pathname === "/v1/tokens/access") return Response.json({ access_token: "temporary-access-token" });
    assert.equal(url.hostname, "nominatim.openstreetmap.org");
    assert.equal(url.searchParams.get("countrycodes"), "af");
    return Response.json([
      { category: "place", type: "city", name: "کابل", lat: "34.5269503", lon: "69.1850584",
        address: { country_code: "af", state: "ولایت كابل" } },
      { category: "boundary", type: "administrative", name: "ولایت كابل", lat: "34.5", lon: "69.416667",
        address: { country_code: "af", state: "ولایت كابل" } },
    ]);
  }, Date.now, fakeMetadata(), () => "test-refresh-token");
  const places = await client.municipalities("Kabul", "AF");
  assert.equal(places.length, 1);
  assert.equal(places[0]?.name, "کابل");
  assert.match(places[0]?.label ?? "", /Afghanistan/);
  assert.equal(places[0]?.mobilityCountryCode, "AF");
});

test("dynamic country selections query Mobility Database by their ISO country code", async () => {
  const client = new MobilityDatabaseTransportClient(async input => {
    const url = new URL(String(input));
    if (url.pathname === "/v1/tokens/access") return Response.json({ access_token: "temporary-access-token" });
    assert.equal(url.searchParams.get("country_code"), "SG");
    return Response.json([feed("mdb-sg", {
      locations: [{ country_code: "SG" }],
      latest_dataset: { id: "mdb-sg-v1", hosted_url: hosted("mdb-sg"), downloaded_at: "2026-11-12T08:00:00Z",
        zipped_folder_size_mb: 2, bounding_box: {
          minimum_latitude: 1, maximum_latitude: 2, minimum_longitude: 103, maximum_longitude: 104,
        } },
    })]);
  }, Date.now, fakeMetadata(), () => "test-refresh-token");
  const datasets = await client.catalogForLocation({
    id: "sg", name: "Singapore", label: "Singapore", latitude: 1.29, longitude: 103.85,
    territory: "mobility:SG", mobilityCountryCode: "SG",
  }, 1_000);
  assert.equal(datasets.length, 1);
  assert.equal(datasets[0]?.territory, "mobility:SG");
});

test("hosted GTFS downloads stay on MobilityData's approved storage host and parse route data", async () => {
  const archive = zipSync({
    "agency.txt": strToU8("agency_id,agency_name,agency_timezone\nA,Test,Europe/Paris\n"),
    "routes.txt": strToU8("route_id,route_short_name,route_long_name,route_type\nR,601,Paris service,200\n"),
    "trips.txt": strToU8("route_id,service_id,trip_id\nR,S,T\n"),
    "calendar.txt": strToU8("service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nS,1,1,1,1,1,1,1,20200101,20991231\n"),
    "stops.txt": strToU8("stop_id,stop_name,stop_lat,stop_lon,location_type\nO,Origin,48.8566,2.3522,0\nD,Destination,48.86,2.36,0\n"),
    "stop_times.txt": strToU8("trip_id,arrival_time,departure_time,stop_id,stop_sequence\nT,09:00:00,09:00:00,O,1\nT,09:30:00,09:30:00,D,2\n"),
  });
  const requested: string[] = [];
  const fetcher: typeof fetch = async input => {
    requested.push(String(input));
    return new Response(archive);
  };
  const client = new MobilityDatabaseTransportClient(fetcher, Date.now, fakeMetadata(), () => "test-refresh-token");
  const resource = {
    id: -42, provider: "mobilitydatabase", title: "GTFS", format: "GTFS",
    url: hosted("mdb-42"), is_available: true,
  };
  const routes = await client.referenceRoutes(resource);
  assert.deepEqual(routes.map(route => [route.shortName, route.mode]), [["601", "bus"]]);
  const stops = await client.nearbyStopsForResources(48.8566, 2.3522, [resource]);
  assert.deepEqual(stops.features?.map(item => item.properties?.stop_id), ["O", "D"]);
  assert.equal(requested.length, 1, "the bounded in-memory feed cache is reused");
  assert.throws(() => safeMobilityDatasetUrl("https://evil.example/private.zip"));
  assert.throws(() => safeMobilityDatasetUrl("http://storage.googleapis.com/mobilitydata-datasets-prod/x.zip"));
  assert.equal(safeMobilityDatasetUrl("https://files.mobilitydatabase.org/mdb-42/mdb-42-v1/mdb-42.zip").hostname,
    "files.mobilitydatabase.org");
  assert.throws(() => safeMobilityDatasetUrl("https://files.mobilitydatabase.org/redirect?target=https://evil.example"));
  assert.throws(() => safeMobilityDatasetUrl("https://files.mobilitydatabase.org/a%2fb/c/mdb.zip"));
});

test("a redirected archive cannot escape the approved storage host", async () => {
  let requests = 0;
  const fetcher: typeof fetch = async () => {
    requests++;
    return new Response(null, { status: 302, headers: { location: "https://example.com/private" } });
  };
  const client = new MobilityDatabaseTransportClient(fetcher, Date.now, fakeMetadata(), () => "test-refresh-token");
  await assert.rejects(() => client.staticFeed({
    id: -9, provider: "mobilitydatabase", title: "GTFS", format: "GTFS",
    url: hosted("mdb-9"), is_available: true,
  }), /redirect is not an approved hosted URL/);
  assert.equal(requests, 1);
});

test("Mobility Database exposes only public trip updates explicitly linked to the chosen static feed", async () => {
  const requested: string[] = [];
  const client = new MobilityDatabaseTransportClient(async input => {
    const url = new URL(String(input));
    requested.push(url.pathname);
    if (url.pathname === "/v1/tokens/access") return Response.json({ access_token: "temporary-access-token" });
    assert.equal(url.pathname, "/v1/gtfs_feeds/mdb-42/gtfs_rt_feeds");
    return Response.json([
      { id: "mdb-rt-match", data_type: "gtfs_rt", status: "active", entity_types: ["tu"],
        feed_references: ["mdb-42"],
        source_info: { producer_url: "https://realtime.example.com/trip-updates", authentication_type: 0 } },
      { id: "mdb-rt-other-feed", data_type: "gtfs_rt", status: "active", entity_types: ["tu"],
        feed_references: ["mdb-another"], source_info: { producer_url: "https://realtime.example.com/other" } },
      { id: "mdb-rt-auth", data_type: "gtfs_rt", status: "active", entity_types: ["tu"],
        feed_references: ["mdb-42"], source_info: { producer_url: "https://realtime.example.com/auth", authentication_type: 1 } },
      { id: "mdb-rt-alerts", data_type: "gtfs_rt", status: "active", entity_types: ["sa"],
        feed_references: ["mdb-42"], source_info: { producer_url: "https://realtime.example.com/alerts" } },
      { id: "mdb-rt-private", data_type: "gtfs_rt", status: "active", entity_types: ["tu"],
        feed_references: ["mdb-42"], source_info: { producer_url: "https://127.0.0.1/live" } },
    ]);
  }, Date.now, fakeMetadata(), () => "test-refresh-token");
  const staticResource: CatalogResource = {
    id: -42, provider: "mobilitydatabase", title: "GTFS", format: "GTFS",
    url: hosted("mdb-42"), is_available: true, metadata: { mobilityFeedId: "mdb-42" },
  };
  const resources = await client.realtimeResources(staticResource);
  assert.equal(requested.length, 2);
  assert.equal(resources.length, 1);
  assert.equal(resources[0]?.format, "GTFS-RT");
  assert.equal(resources[0]?.url, "https://realtime.example.com/trip-updates");
  assert.equal(resources[0]?.type, "mobilitydatabase-gtfs-rt:%5B%22mdb-42%22%2C%22mdb-rt-match%22%5D");
  assert.deepEqual(await client.realtimeResources(staticResource), resources);
  assert.equal(requested.length, 2, "the static-feed association is cached");
});
