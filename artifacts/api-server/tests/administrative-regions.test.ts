import assert from "node:assert/strict";
import test from "node:test";
import { strToU8, zipSync } from "fflate";
import {
  administrativeRegions, prepareAdministrativeBoundary,
} from "../src/discord/administrative-region-boundaries.js";
import { scanRoutesInRegions } from "../src/discord/gtfs-journey.js";
import type { GeoJsonBoundary } from "../src/discord/transport-regions.js";

const countryCodes = [
  "AL", "DZ", "AU", "AT", "BE", "BO", "BG", "CA", "CN", "HR", "CZ", "DK", "EG", "FI", "FR", "DE",
  "GR", "HU", "IT", "JP", "LA", "LU", "MT", "MA", "NL", "NZ", "PL", "PT", "RS", "SK", "SI", "ES",
  "LK", "CH", "TH", "TN", "TR", "UA", "GB", "US", "IE", "NO", "IS", "SG", "LV",
];

function mockGeoBoundariesFetcher() {
  const requested: string[] = [];
  const fetcher: typeof fetch = async input => {
    const url = new URL(String(input));
    requested.push(url.href);
    if (url.hostname === "www.geoboundaries.org") {
      const iso3 = url.pathname.split("/").at(-3)!;
      return Response.json({
        boundaryID: `${iso3}-ADM1-v1`,
        boundaryType: "ADM1",
        boundaryYearRepresented: "2025",
        boundaryCanonical: "province",
        boundaryLicense: "Public Domain",
        boundarySource: "Test source",
        boundarySourceURL: "https://example.test/source",
        simplifiedGeometryGeoJSON:
          `https://github.com/wmgeolab/geoBoundaries/raw/test/releaseData/gbOpen/${iso3}/ADM1/geoBoundaries-${iso3}-ADM1_simplified.geojson`,
      });
    }
    const iso3 = url.pathname.match(/\/gbOpen\/([A-Z]{3})\/ADM1\//)?.[1];
    assert.ok(iso3);
    const response = Response.json({
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: { shapeName: `${iso3} Province`, shapeISO: `${iso3}-01`, shapeID: `${iso3}-01` },
        geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
      }],
    });
    Object.defineProperty(response, "url", {
      value: `https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/test/releaseData/gbOpen/${iso3}/ADM1/geoBoundaries-${iso3}-ADM1_simplified.geojson`,
    });
    return response;
  };
  return { fetcher, requested };
}

test("GeoBoundaries supports every currently covered country code with a validated ADM1 set", async () => {
  const { fetcher, requested } = mockGeoBoundariesFetcher();
  for (const countryCode of countryCodes) {
    const result = await administrativeRegions(countryCode, fetcher);
    assert.equal(result.countryCode, countryCode);
    assert.equal(result.regions.length, 1);
    assert.equal(result.regions[0]!.name, `${result.iso3} Province`);
    assert.ok(result.regions[0]!.code.endsWith("-01"));
  }
  assert.equal(requested.filter(url => url.includes("www.geoboundaries.org")).length, countryCodes.length);
});

test("administrative geometry matches points and respects holes and multipolygons", () => {
  const boundary: GeoJsonBoundary = {
    type: "MultiPolygon",
    coordinates: [
      [[[0, 0], [5, 0], [5, 5], [0, 5], [0, 0]], [[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]],
      [[[10, 10], [12, 10], [12, 12], [10, 12], [10, 10]]],
    ],
  };
  const contains = prepareAdministrativeBoundary(boundary);
  assert.equal(contains(0.5, 0.5), true);
  assert.equal(contains(1.5, 1.5), false);
  assert.equal(contains(11, 11), true);
  assert.equal(contains(7, 7), false);
});

test("GTFS regional coverage is based on routes serving stops inside each boundary", async () => {
  const zip = zipSync({
    "routes.txt": strToU8("route_id,route_short_name,route_long_name,route_type\nM8,8,Métro 8,1\nB8,8,Bus 8,3\n"),
    "trips.txt": strToU8("route_id,service_id,trip_id\nM8,S,T8\nB8,S,TB\n"),
    "stops.txt": strToU8("stop_id,stop_name,stop_lat,stop_lon,location_type\nO,Origine,0.5,0.5,0\nD,Destination,2.5,2.5,0\nX,Other,5.5,5.5,0\n"),
    "stop_times.txt": strToU8("trip_id,stop_id,stop_sequence,arrival_time,departure_time\nT8,O,1,08:00:00,08:00:00\nT8,D,2,08:20:00,08:20:00\nTB,X,1,08:00:00,08:00:00\n"),
    "calendar.txt": strToU8("service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nS,1,1,1,1,1,1,1,20200101,20991231\n"),
  });
  const square = (min: number, max: number): GeoJsonBoundary => ({
    type: "Polygon", coordinates: [[[min, min], [max, min], [max, max], [min, max], [min, min]]],
  });
  const coverage = await scanRoutesInRegions(zip, [
    { code: "A", boundary: square(0, 1) },
    { code: "B", boundary: square(2, 3) },
    { code: "C", boundary: square(5, 6) },
  ]);
  assert.deepEqual(coverage.map(area => [area.code, area.routes.map(route => route.routeId)]),
    [["A", ["M8"]], ["B", ["M8"]], ["C", ["B8"]]]);
  assert.equal(coverage[0]!.routes[0]!.mode, "metro");
  assert.equal(coverage[1]!.routes[0]!.stopIds[0], "D");
});

test("unapproved GeoBoundaries redirects and malformed region data are rejected", async () => {
  const badRedirect: typeof fetch = async input => {
    const url = new URL(String(input));
    if (url.hostname === "www.geoboundaries.org") return Response.json({
      boundaryID: "JPN-ADM1-v1", boundaryType: "ADM1", boundaryLicense: "Public Domain",
      simplifiedGeometryGeoJSON: "https://github.com/wmgeolab/geoBoundaries/raw/test/releaseData/gbOpen/JPN/ADM1/geoBoundaries-JPN-ADM1_simplified.geojson",
    });
    const response = Response.json({ type: "FeatureCollection", features: [] });
    Object.defineProperty(response, "url", { value: "https://attacker.example/geoBoundaries-JPN-ADM1_simplified.geojson" });
    return response;
  };
  const expiredCacheNow = () => Date.now() + 8 * 24 * 60 * 60_000;
  await assert.rejects(administrativeRegions("JP", badRedirect, expiredCacheNow), /unapproved host/);
  await assert.rejects(administrativeRegions("XX", fetch), /ISO alpha-3 mapping/);
});
