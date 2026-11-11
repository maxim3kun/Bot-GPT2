import assert from "node:assert/strict";
import test from "node:test";
import { FranceLocations, frenchArea } from "../src/discord/france-locations.js";
import { FranceTransportClient } from "../src/discord/public-transport.js";
import { TransportBrowserClient } from "../src/discord/transport-browser.js";
import { parseTransportCommand } from "../src/discord/transport-menu.js";
const communes = ["Allonne", "Beauvais", "Fouquenies", "Frocourt", "Goincourt", "Saint-Martin-le-Nœud", "Tillé", "Aux Marais"]
  .map((nom, i) => ({ nom, code: ["60009", "60057", "60250", "60264", "60277", "60586", "60639", "60703"][i],
    centre: { coordinates: [2.088 + i / 100, 49.44] }, codesPostaux: ["60000"], population: nom === "Beauvais" ? 55000 : 1000,
    departement: { code: "60", nom: "Oise" }, region: { nom: "Hauts-de-France" } }));
const station = { id: "beauvais-reference", nom: "Beauvais", codeinsee: "60057", codes_uic: "87313510",
  position_geographique: { lat: 49.42648, lon: 2.08869 } };
function fixture() {
  const calls: URL[] = [];
  const client = new FranceTransportClient(async input => {
    const url = new URL(String(input)); calls.push(url);
    if (url.hostname === "geo.api.gouv.fr") {
      const postal = url.searchParams.has("codePostal");
      assert.notEqual(postal, url.searchParams.has("codeDepartement"));
      assert.equal(url.searchParams.get(postal ? "codePostal" : "codeDepartement"), postal ? "60000" : "60");
      return Response.json(communes);
    }
    if (url.hostname === "ressources.data.sncf.com") return Response.json({ total_count: 1, results: [station] });
    throw Error("Unexpected network request " + url);
  });
  return { client, calls, browser: new TransportBrowserClient(client) };
}
test("French department codes are not postal codes or city-name queries", () => {
  for (const code of ["60", "35", "45", "06", "2A", "2B", "971", "976"])
    assert.deepEqual(frenchArea("département " + code), { kind: "department", code });
  assert.deepEqual(frenchArea("60000"), { kind: "postcode", code: "60000" });
  assert.deepEqual(frenchArea("CP 06000"), { kind: "postcode", code: "06000" });
  for (const name of ["Beauvais", "Breteuil 60", "Rennes", "Orléans", "6", "6000"]) assert.equal(frenchArea(name), null);
  for (const place of ["60", "35", "45", "60000"]) assert.equal(parseTransportCommand([place]).place, place);
});
test("60 enumerates actual Oise communes, with Beauvais ranked ahead of smaller communes", async () => {
  const { client, calls } = fixture(), cities = await client.municipalities("60");
  assert.equal(cities.length, 8); assert.equal(cities[0]!.name, "Beauvais");
  assert.match(cities[0]!.label, /60, Oise, Hauts-de-France/);
  assert.ok(cities.every(city => !city.label.includes("60000")), "postcodes should not bloat city labels");
  assert.equal(calls[0]!.searchParams.get("codeDepartement"), "60"); assert.equal(calls[0]!.searchParams.has("q"), false);
});
test("60000 retains its multiple real communes for buses but only the referenced Beauvais station for train", async () => {
  const { browser, calls } = fixture();
  assert.equal((await browser.cities("60000", "fr", "bus")).length, 8);
  const stations = await browser.cities("60000", "fr", "rail");
  assert.equal(stations.length, 1); assert.equal(stations[0]!.name, "Beauvais"); assert.equal(stations[0]!.kind, "station");
  assert.equal(stations[0]!.latitude, 49.42648); assert.match(stations[0]!.label, /Gare de Beauvais/);
  const query = calls.find(u => u.hostname === "ressources.data.sncf.com")!.searchParams.get("where")!;
  for (const code of communes.map(c => c.code)) assert.ok(query.includes(code!));
});
test("named French transport cities use the official commune API and keep exact accented matches", async () => {
  const found = [
    { nom: "Fréjus", code: "83061", codeDepartement: "83", codesPostaux: ["83600"],
      centre: { coordinates: [6.7848, 43.4553] }, departement: { code: "83", nom: "Var" },
      region: { nom: "Provence-Alpes-Côte d'Azur" }, population: 57000 },
    { nom: "Fréjus-sur-Mer", code: "83062", codeDepartement: "83", codesPostaux: ["83600"],
      centre: { coordinates: [6.7, 43.4] }, departement: { code: "83", nom: "Var" }, population: 200 },
    { nom: "Fréjus", code: "13061", codeDepartement: "13", codesPostaux: ["13000"],
      centre: { coordinates: [5.4, 43.3] }, departement: { code: "13", nom: "Bouches-du-Rhône" }, population: 100 },
  ];
  const calls: URL[] = [];
  const client = new FranceTransportClient(async input => {
    const url = new URL(String(input)); calls.push(url);
    assert.equal(url.hostname, "geo.api.gouv.fr");
    assert.equal(url.pathname, "/communes");
    return Response.json(found);
  });
  const unaccented = await client.municipalities("Frejus");
  assert.deepEqual(unaccented.map(city => city.id), ["83061", "13061"]);
  assert.equal(unaccented[0]!.name, "Fréjus");
  assert.match(unaccented[0]!.label, /83, Var, Provence-Alpes-Côte d'Azur/);
  assert.deepEqual((await client.municipalities("Frejus 83")).map(city => city.id), ["83061"]);
  assert.deepEqual((await client.municipalities("Frejus 83600")).map(city => city.id), ["83061"]);
  assert.ok(calls.every(url => url.searchParams.get("nom") === "Frejus"));
});
test("French city-to-territory lookups are stored as public Mongo metadata", async () => {
  let key: any, ttl = 0;
  const metadata = { async get(value: any, lifetime: number, load: () => Promise<unknown>) {
    key = value; ttl = lifetime; return load();
  } };
  const client = new FranceTransportClient(async () => Response.json([{
    nom: "Paris", code: "75056", codeDepartement: "75", codesPostaux: ["75001"],
    centre: { coordinates: [2.347, 48.8589] }, departement: { code: "75", nom: "Paris" },
    region: { nom: "Île-de-France" }, population: 2_100_000,
  }]), Date.now, metadata as any);
  const [paris] = await client.municipalities("Paris");
  assert.equal(paris?.territory, "fr");
  assert.equal(paris?.label, "Paris — 75, Paris, Île-de-France");
  assert.deepEqual([key.territory, key.provider, key.kind], ["fr", "geo", "locations"]);
  assert.equal(key.version, "geo-api-v2", "old cached postcode-heavy labels must be invalidated");
  assert.equal(ttl, 24 * 3600_000);
});
test("metro shortcut keeps Paris and line 8 intact while omitting optional territory selection", () => {
  const parsed = parseTransportCommand(["Paris", "ligne", "8"]);
  assert.equal(parsed.place, "Paris");
  assert.equal(parsed.line, "8");
  assert.equal(parsed.territory, undefined);
});
test("Department station search is bounded, paginated, and ignores foreign or malformed records", async () => {
  let pages = 0; const locations = new FranceLocations(async url => {
    const offset = Number(new URL(url).searchParams.get("offset")); pages++;
    assert.equal(new URL(url).searchParams.get("where"), 'startswith(codeinsee,"60")');
    return { total_count: 103, results: offset ? [station, { ...station, id: "foreign", codeinsee: "35000" },
      { ...station, id: "bad", position_geographique: { lat: 200, lon: 1 } }] :
      Array.from({ length: 100 }, (_, i) => ({ ...station, id: "station-" + i })) };
  });
  const cities = [{ id: "60057", name: "Beauvais", label: "Beauvais — Oise", latitude: 49.44, longitude: 2.08 }];
  const stations = await locations.stations("60", cities);
  assert.equal(pages, 2); assert.equal(stations.length, 101);
});
test("Unavailable station data is an error, not an invented station or an empty no-service result", async () => {
  const { client } = fixture();
  const cities = await client.municipalities("60000");
  const unavailable = new FranceLocations(async () => { throw Error("source unavailable"); });
  await assert.rejects(unavailable.stations("60000", cities), /source unavailable/);
  const malformed = new FranceLocations(async () => ({ results: [], total_count: 9000 }));
  await assert.rejects(malformed.stations("60000", cities), /oversized/);
});
test("Official Orléans hosts are accepted without allowing arbitrary hosts or lookalike domains", async () => {
  const calls: string[] = [], client = new FranceTransportClient(async url => { calls.push(String(url)); return new Response(new Uint8Array([1])); });
  for (const host of ["chouette.enroute.mobi", "ara-api.enroute.mobi"]) await client.fetchBytes(`https://${host}/test`, 10);
  for (const url of ["https://chouette.enroute.mobi.evil.example/test", "https://evil.example/test", "http://chouette.enroute.mobi/test",
    "https://user:password@chouette.enroute.mobi/test"]) await assert.rejects(client.fetchBytes(url, 10), /unsupported/);
  assert.equal(calls.length, 2);
});
test("Orléans discovery uses the official town-hall point, not its distant geographic centroid", async () => {
  const city = { id: "45234", name: "Orléans", label: "Orléans — Loiret", latitude: 47.873569, longitude: 1.911358 };
  const locations = new FranceLocations(async raw => {
    const url = new URL(raw);
    assert.equal(url.pathname, "/communes/45234"); assert.equal(url.searchParams.get("geometry"), "mairie");
    return { properties: { code: "45234" }, geometry: { type: "Point", coordinates: [1.9093, 47.9028] } };
  });
  const anchored = await locations.anchor(city);
  assert.equal(anchored.id, city.id); assert.equal(anchored.latitude, 47.9028); assert.equal(city.latitude, 47.873569);
});
test("A station keeps its exact coordinates and an anchor for the wrong commune is rejected", async () => {
  const city = { id: "60057", name: "Beauvais", label: "Beauvais", latitude: 49.42648, longitude: 2.08869 };
  let calls = 0;
  const locations = new FranceLocations(async () => { calls++; return { properties: { code: "45234" }, geometry: { type: "Point", coordinates: [1, 47] } }; });
  const railway = { ...city, kind: "station" as const };
  assert.deepEqual(await locations.anchor(railway), railway); assert.equal(calls, 0);
  await assert.rejects(locations.anchor(city), /Invalid municipality/);
});
