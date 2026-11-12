import assert from "node:assert/strict";
import test from "node:test";
import { strToU8, zipSync } from "fflate";
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

function apiFetcher(): typeof fetch {
  return async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname === "/v1/tokens/access")
      return Response.json({ access_token: "temporary-access-token", expiration_datetime_utc: "2026-11-12T09:00:00Z" });
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
  assert.deepEqual(line.realtime, [], "catalog-discovered realtime entries are not enabled implicitly");
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
