import assert from "node:assert/strict";
import test from "node:test";
import { strToU8, zipSync } from "fflate";
import { MobilityDatabaseTransportClient, safeMobilityDatasetUrl } from "../src/discord/mobility-database-transport.js";
import { TransportMetadataCache } from "../src/discord/transport-metadata-cache.js";
import type { TransportLocation } from "../src/discord/public-transport.js";

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

test("hosted GTFS downloads stay on MobilityData's approved storage host and parse route data", async () => {
  const archive = zipSync({
    "agency.txt": strToU8("agency_id,agency_name,agency_timezone\nA,Test,Europe/Paris\n"),
    "routes.txt": strToU8("route_id,route_short_name,route_long_name,route_type\nR,601,Paris service,3\n"),
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
