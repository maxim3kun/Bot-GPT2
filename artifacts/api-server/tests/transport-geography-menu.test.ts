import assert from "node:assert/strict";
import test from "node:test";
import { handleTransportCommand, handleTransportFavoritesCommand, handleTransportSearch } from "../src/discord/transport-menu.js";
import { TransportBrowserClient } from "../src/discord/transport-browser.js";
import { fakeDiscord, type FakeCard } from "./fixtures/transport-discord.js";
import type { TransportFavorite, TransportPreferences, TransportPreferencesStore } from "../src/discord/transport-preferences.js";
const tick = () => new Promise<void>(resolve => setImmediate(resolve));
async function choose(card: FakeCard, value: string) {
  await card.collector.collect(card.interaction("choose", { values: [value],
    isButton: () => false, isStringSelectMenu: () => true }).value); await tick();
}
async function click(card: FakeCard, action: string) {
  await card.collector.collect(card.interaction(action).value); await tick();
}
async function settle(predicate: () => boolean) {
  for (let i = 0; i < 200; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 2)); }
  assert.fail("Transport state did not settle");
}
function service(station = false) {
  const requests: unknown[] = [];
  const place = { id: station ? "sncf:beauvais" : "60057", name: "Beauvais", label: station ? "Gare de Beauvais — Oise" : "Beauvais — Oise",
    latitude: 49.43, longitude: 2.08, ...(station ? { kind: "station" } : {}) };
  const source = { name: "Source officielle", url: "https://transport.data.gouv.fr/datasets/test" };
  const routes = ["1", "2"].map(label => ({ label, routeId: label, description: "Gare → Arrivée",
    mode: station ? "rail" : "bus", nearbyStopIds: ["O"], source,
    resource: { id: 1, title: "GTFS", format: "GTFS", is_available: true, url: "https://transport.data.gouv.fr/test.zip" } }));
  const index = { stops: new Map([["O", { id: "O", name: "Gare" }], ["D", { id: "D", name: "Arrivée" }]]),
    visits: new Map([["trip", [{ stopId: "O", pickup: true, dropoff: true }, { stopId: "D", pickup: true, dropoff: true }]]]) };
  return { requests, value: {
    territories: ["fr", "qc", "en"], cities: async (...args: unknown[]) => { requests.push(args); return station ? [place] : [place, { ...place, id: "60009", name: "Allonne" }]; },
    lines: async () => ({ lines: routes, unavailable: 0 }), index: async () => index,
    availableStops: async (_line: unknown, _index: unknown, options: unknown[]) => ({ options, note: "" }),
    departures: async () => ({ content: "Horaires théoriques", source, embed: { title: "Trajet", description: "Horaires théoriques" } }),
  } as unknown as TransportBrowserClient };
}
test("Switzerland is hidden from the territory selector while its feed exceeds parser limits", async () => {
  const d = fakeDiscord(), s = service();
  s.value.territories = ["fr", "qc", "en", "ie", "lu"] as any;
  await handleTransportCommand(d.message, [], "fr", "!", "bus", s.value);
  const card = d.cards[0]!;
  const selector = card.last.components.flatMap(row => row.components)
    .find((component: any) => component.custom_id?.includes(":choose")) as any;
  assert.deepEqual(selector.options.map((option: any) => option.label),
    ["France", "Québec", "Angleterre", "Irlande", "Luxembourg"]);
  assert.deepEqual(new TransportBrowserClient().territories,
    ["fr", "qc", "en", "ie", "lu", "no", "is", "sg", "lv", "cz", "pt", "au", "ua"]);
  card.collector.stop("cancelled");
});
test("Norway appears in the territory selector and identifies the Entur timetable source", async () => {
  const d = fakeDiscord(), s = service();
  s.value.territories = ["fr", "qc", "en", "ie", "lu", "ch", "no"] as any;
  await handleTransportCommand(d.message, [], "fr", "!", "bus", s.value);
  const card = d.cards[0]!;
  const selector = card.last.components.flatMap(row => row.components)
    .find((component: any) => component.custom_id?.includes(":choose")) as any;
  assert.deepEqual(selector.options.map((option: any) => option.label),
    ["France", "Québec", "Angleterre", "Irlande", "Luxembourg", "Suisse", "Norvège"]);
  await choose(card, "no");
  assert.match(card.last.content!, /Norvège/);
  assert.match(card.last.content!, /Horaires NeTEx Entur/);
  card.collector.stop("cancelled");
});
test("France, Québec or Angleterre is selected once and the redundant new-search button is hidden", async () => {
  const d = fakeDiscord(), s = service();
  await handleTransportCommand(d.message, ["60000"], "fr", "!", "bus", s.value);
  const card = d.cards[0]!;
  assert.match(card.last.content!, /Choisis le territoire/); assert.equal(s.requests.length, 0);
  const selector = card.last.components.flatMap(row => row.components)
    .find((component: any) => component.custom_id?.includes(":choose")) as any;
  assert.deepEqual(selector?.options?.map((option: any) => option.label), ["France", "Québec", "Angleterre"]);
  await choose(card, "fr");
  assert.deepEqual(s.requests, [["60000", "fr", "bus"]]);
  assert.ok(card.custom("filter"), "department and postcode commune lists must be searchable");
  assert.equal(card.custom("territory"), undefined);
  for (let i = 0; i < 3; i++) await choose(card, "0"); // commune, line, destination; the unique origin is automatic
  assert.equal(card.last.embeds.length, 1); assert.equal(card.custom("restart"), undefined);
  assert.equal(JSON.stringify(card.last.components).includes("France / Québec"), false);
  assert.deepEqual(card.last.components.map(row => row.components.map(component => component.label)),
    [["Actualiser", "Retour", "Options"], ["Arrêts", "Modifier", "Ajouter ❤️", "Source", "Fermer"]]);
  card.collector.stop("cancelled");
});
test("The train entry forwards its mode and uses station coordinates instead of all postal-code communes", async () => {
  const d = fakeDiscord(), s = service(true);
  const originalLines = s.value.lines.bind(s.value);
  s.value.lines = async (...args: any[]) => ({ ...await originalLines(...args), unavailable: 2, refreshing: true });
  await handleTransportCommand(d.message, ["60000"], "fr", "!", "rail", s.value);
  const card = d.cards[0]!; await choose(card, "fr");
  assert.deepEqual(s.requests, [["60000", "fr", "rail"]]);
  assert.match(card.last.content!, /Gare de Beauvais/); assert.match(card.last.content!, /Choisis une ligne/);
  assert.match(card.last.content!, /Lignes en cache; actualisation en cours/);
  assert.equal((card.last.content!.match(/Lignes en cache; actualisation en cours/g) ?? []).length, 1);
  assert.doesNotMatch(card.last.content!, /Certains réseaux n’ont pas pu être chargés/);
  assert.equal(card.custom("territory"), undefined); card.collector.stop("cancelled");
});

test("the train city prompt does not show an irrelevant timetable disclaimer", async () => {
  const d = fakeDiscord(), s = service(true);
  await handleTransportCommand(d.message, [], "fr", "!", "rail", s.value);
  const card = d.cards[0]!; await choose(card, "fr");
  assert.match(card.last.content!, /Indique une région/);
  assert.doesNotMatch(card.last.content!, /leurs horaires restent à vérifier/);
  card.collector.stop("cancelled");
});

test("Ireland keeps city search and adds province then county browsing", async () => {
  const d = fakeDiscord(), s = service();
  const network = { id: "ie:national-gtfs", title: "National Transport Authority · Ireland",
    page_url: "https://data.gov.ie/dataset/nta-gtfs", territory: "ie",
    resources: [{ id: 11, title: "GTFS", format: "GTFS", is_available: true,
      url: "https://www.transportforireland.ie/transitData/Data/GTFS_All.zip" }] };
  const route = { label: "B1", routeId: "B1", description: "City Bus", mode: "bus",
    nearbyStopIds: [], source: { name: network.title, url: network.page_url }, resource: network.resources[0] };
  s.value.territories = ["fr", "qc", "en", "ie", "lu"] as any;
  s.value.region = async (place: string, territory: string) => place === "County Dublin" && territory === "ie"
    ? { code: "IE-D", name: "County Dublin", parentName: "Leinster", territory: "ie",
      departmentCodes: [], epciCodes: [] } as any : null;
  s.value.regionNetworks = async () => [network] as any;
  s.value.regionLines = async (_network: unknown, _mode: string, _line: string, region: any) => {
    assert.equal(region.code, "IE-D");
    return { lines: [{ ...route, territory: "ie" }], unavailable: 0, networkScoped: true } as any;
  };
  await handleTransportCommand(d.message, [], "fr", "!", "bus", s.value);
  const card = d.cards[0]!;
  await choose(card, "ie");
  assert.ok(card.custom("city"), "the direct place-search path remains available");
  assert.ok(card.custom("zones"), "the regional-browsing path is available too");
  await click(card, "zones");
  assert.match(card.last.content!, /Choisis une province irlandaise/);
  await choose(card, "Leinster");
  assert.match(card.last.content!, /Choisis un comté/);
  const countySelect = card.last.components.flatMap(row => row.components).find((component: any) => component.options) as any;
  assert.equal(countySelect.options.length, 12);
  await choose(card, "IE-D");
  assert.match(card.last.content!, /County Dublin/);
  assert.match(card.last.content!, /Choisis une ligne/);
  assert.match(card.last.content!, /National Transport Authority · Ireland/);
  card.collector.stop("cancelled");
});

test("French area browsing opens a covered-region list instead of a text prompt", async () => {
  const d = fakeDiscord(), s = service();
  const network = { id: "fr:normandie", title: "Réseau Normandie",
    page_url: "https://transport.data.gouv.fr/datasets/normandie", territory: "fr",
    resources: [{ id: 21, title: "GTFS", format: "GTFS", is_available: true,
      url: "https://transport.data.gouv.fr/normandie.zip" }] };
  s.value.coveredRegions = async (territory: string, mode: string) => {
    assert.equal(territory, "fr"); assert.equal(mode, "bus"); return ["Normandie"];
  };
  s.value.region = async (place: string, territory: string) => place === "Normandie" && territory === "fr"
    ? { code: "28", name: "Normandie", departmentCodes: ["27", "76"], epciCodes: [] } as any : null;
  s.value.regionNetworks = async (selected: any, mode: string) => {
    assert.equal(selected.code, "28"); assert.equal(mode, "bus"); return [network] as any;
  };
  await handleTransportCommand(d.message, [], "fr", "!", "bus", s.value);
  const card = d.cards[0]!;
  await choose(card, "fr");
  await click(card, "zones");
  assert.match(card.last.content!, /Choisis une région desservie/);
  await choose(card, "Normandie");
  assert.match(card.last.content!, /Choisis un réseau/);
  assert.match(card.last.content!, /Normandie/);
  card.collector.stop("cancelled");
});

test("countries without a verified region index do not replace zone browsing with a text modal", async () => {
  const d = fakeDiscord(), s = service();
  await handleTransportCommand(d.message, [], "fr", "!", "bus", s.value);
  const card = d.cards[0]!;
  await choose(card, "qc");
  await click(card, "zones");
  assert.match(card.last.content!, /Aucune liste de zones avec lignes vérifiées/);
  assert.ok(card.custom("city"), "direct town search remains available");
  assert.ok(card.custom("cancel"));
  card.collector.stop("cancelled");
});

test("an unavailable Irish feed keeps the county but hides technical source names", async () => {
  const title = "NTA GTFS and GTFS Realtime";
  const network = { id: "ie:national-gtfs", title, page_url: "https://data.gov.ie/dataset/nta-gtfs",
    territory: "ie", resources: [{ id: 11, title: "GTFS", format: "GTFS", is_available: true,
      url: "https://www.transportforireland.ie/transitData/Data/GTFS_All.zip" }] };
  for (const [language, expected] of [
    ["fr", "Cela ne signifie pas qu’aucune ligne n’existe."],
    ["en", "This does not mean no routes exist."],
  ]) {
    const d = fakeDiscord(), s = service();
    s.value.region = async () => ({ code: "IE-D", name: "County Dublin", parentName: "Leinster",
      territory: "ie", departmentCodes: [], epciCodes: [] }) as any;
    s.value.regionNetworks = async () => [network] as any;
    s.value.regionLines = async () => ({ lines: [], unavailable: 1,
      issues: [`${title} : feed temporarily unavailable`] }) as any;
    await handleTransportSearch(d.message, { place: "County Dublin", territory: "ie", mode: "bus" }, language, "!", s.value);
    const card = d.cards[0]!;
    assert.match(card.last.content!, /County Dublin/);
    assert.match(card.last.content!, new RegExp(expected));
    assert.doesNotMatch(card.last.content!, /NTA GTFS and GTFS Realtime/);
    card.collector.stop("cancelled");
  }
});

test("a uniquely resolved French metro city skips the territory prompt", async () => {
  const d = fakeDiscord(), s = service();
  s.value.inferTerritory = async (place: string) => place === "Paris" ? "fr" : undefined;
  await handleTransportCommand(d.message, ["Paris", "ligne", "8"], "fr", "!", "metro", s.value);
  const card = d.cards[0]!;
  assert.doesNotMatch(card.last.content!, /Choisis le territoire/);
  assert.match(card.last.content!, /Quelle commune/);
  assert.deepEqual(s.requests, [["Paris", "fr", "metro"]]);
  card.collector.stop("cancelled");
});

test("selected metro arrivals omit redundant route notes and keep result controls in two rows", async () => {
  const d = fakeDiscord(), s = service();
  const city = { id: "75056", name: "Paris", label: "Paris — 75", latitude: 48.85, longitude: 2.35 };
  const source = { name: "IDFM", url: "https://transport.data.gouv.fr/datasets/test" };
  s.value.cities = async () => [city] as any;
  s.value.lines = async () => ({ lines: [{ label: "8", routeId: "M8", description: "Métro 8", mode: "metro",
    nearbyStopIds: ["O"], selection: true, source,
    resource: { original_url: "https://eu.ftp.opendatasoft.com/stif/GTFS/IDFM-gtfs.zip" } }] as any, unavailable: 0 });
  s.value.departures = async () => ({ content: "Horaires", source, hasMore: true,
    embed: { title: "Métro 8", description: "Horaires" } } as any);
  await handleTransportSearch(d.message, { place: "Paris", territory: "fr", mode: "metro" }, "fr", "!", s.value);
  const card = d.cards[0]!;
  assert.match(card.last.content!, /Choisis une ligne/);
  await choose(card, "0");
  assert.match(card.last.content!, /Choisis ta station d’arrivée/);
  assert.doesNotMatch(card.last.content!, /Trajets directs sur la ligne choisie|Correspondances non calculées/);
  await choose(card, "0");
  assert.equal(card.last.components.length, 2);
  assert.deepEqual(card.last.components.map(row => row.components.map(component => component.label)),
    [["Actualiser", "Retour", "Options", "Agrandir"], ["Arrêts", "Modifier", "Ajouter ❤️", "Source", "Fermer"]]);
  card.collector.stop("cancelled");
});

function preferenceStore(initial: TransportPreferences = { favorites: [] }): TransportPreferencesStore {
  let value = structuredClone(initial);
  return {
    async get(userId) { return userId === "owner" ? structuredClone(value) : { favorites: [] }; },
    async setPreferredTerritory(userId, territory) {
      if (userId !== "owner") return false;
      value = { ...value, preferredTerritory: territory }; return true;
    },
    async toggleFavorite(userId, favorite) {
      if (userId !== "owner") return { ok: false, saved: false };
      const exists = value.favorites.some(item => item.key === favorite.key);
      value = { ...value, favorites: exists ? value.favorites.filter(item => item.key !== favorite.key)
        : [...value.favorites, favorite] };
      return { ok: true, saved: !exists };
    },
  };
}

test("favorite heart stores the exact path and !favoris recalculates current departures", async () => {
  const d = fakeDiscord({ userId: "owner" }), s = service(), store = preferenceStore();
  let departureLookups = 0;
  s.value.departures = async () => {
    departureLookups++;
    return { content: "Horaires recalculés", source: { name: "Source", url: "https://transport.data.gouv.fr/test" },
      embed: { title: "Trajet actuel", description: "Horaires recalculés" } } as any;
  };
  await handleTransportSearch(d.message, { place: "Beauvais", territory: "fr", mode: "bus" }, "fr", "!", s.value, 45_000,
    undefined, store);
  const card = d.cards[0]!;
  await choose(card, "0"); // selected municipality
  await choose(card, "0"); // route
  await choose(card, "0"); // destination; the unique origin is automatic
  await settle(() => card.last.embeds.length === 1);
  assert.equal(departureLookups, 1);
  await click(card, "favorite");
  await settle(() => card.last.components.flatMap(row => row.components).some(component => component.label === "Retirer ❤️"));
  assert.equal(departureLookups, 1, "saving a favorite must not trigger another timetable lookup");

  const next = fakeDiscord({ userId: "owner", channelId: "favorite-reopen" });
  await handleTransportFavoritesCommand(next.message, "fr", "!", s.value, store);
  await settle(() => next.cards.length > 0 && next.cards[0]!.last.embeds.length === 1);
  assert.equal(departureLookups, 2, "opening a favorite performs a fresh timetable lookup");
  assert.equal(next.cards[0]!.last.embeds[0]!.title, "Trajet actuel");
  card.collector.stop("cancelled");
  next.cards[0]!.collector.stop("cancelled");
});

test("favorite command clearly handles an empty list and offers a chooser for several favorites", async () => {
  const empty = fakeDiscord(), s = service();
  await handleTransportFavoritesCommand(empty.message, "fr", "!", s.value, preferenceStore());
  assert.match(empty.replies[0]!.content!, /Aucun favori transport enregistré/);

  const two: TransportFavorite[] = ["1", "2"].map((routeId, i) => ({
    key: `favorite-${i}`, territory: "fr", mode: "bus", place: "Beauvais", cityId: "60057",
    routeId, resourceId: 1, lineLabel: routeId, originIds: ["O"], originLabel: "Gare",
    arrivalIds: ["D"], arrivalLabel: "Arrivée",
  }));
  const selected = fakeDiscord({ userId: "owner" }), stored = preferenceStore({ favorites: two });
  let openedRoute = "";
  s.value.departures = async (line: any) => {
    openedRoute = line.routeId;
    return { content: "Fresh departures", source: line.source, embed: { title: line.label, description: "Fresh departures" } } as any;
  };
  await handleTransportFavoritesCommand(selected.message, "fr", "!", s.value, stored);
  assert.match(selected.cards[0]!.last.content!, /choisis un trajet favori/i);
  const selector = selected.cards[0]!.last.components.flatMap(row => row.components)
    .find((component: any) => component.options) as any;
  assert.equal(selector.options.length, 2);
  await choose(selected.cards[0]!, "1");
  await settle(() => selected.cards.length > 1 && selected.cards[1]!.last.embeds.length === 1);
  assert.equal(openedRoute, "2", "the selected favorite must restore its exact route");
  selected.cards.forEach(card => card.collector.stop("cancelled"));
});

test("saved territory is first but every territory remains selectable", async () => {
  const d = fakeDiscord({ userId: "owner" }), s = service(), store = preferenceStore({ preferredTerritory: "en", favorites: [] });
  await handleTransportCommand(d.message, ["60000"], "fr", "!", "bus", s.value, 45_000, store);
  const selector = d.cards[0]!.last.components.flatMap(row => row.components)
    .find((component: any) => component.options) as any;
  assert.deepEqual(selector.options.map((option: any) => option.label), ["Angleterre", "France", "Québec"]);
  await choose(d.cards[0]!, "fr");
  assert.deepEqual(await store.get("owner"), { preferredTerritory: "fr", favorites: [] });
  d.cards[0]!.collector.stop("cancelled");
});

test("only Mobility Database countries with usable static timetables appear", async () => {
  const d = fakeDiscord({ userId: "owner" }), s = service(), store = preferenceStore();
  s.value.territories = ["fr", "qc", "en"] as any;
  s.value.mobilityCountries = async () => ({
    complete: true,
    countries: [
      { code: "DE", name: "Germany", covered: false },
      { code: "SG", name: "Singapore", covered: true },
    ],
  });
  await handleTransportCommand(d.message, [], "fr", "!", "bus", s.value, 45_000, store);
  const card = d.cards[0]!;
  const selector = card.last.components.flatMap(row => row.components)
    .find((component: any) => component.options) as any;
  assert.deepEqual(selector.options.slice(0, 3).map((option: any) => option.value), ["fr", "qc", "en"]);
  assert.deepEqual(selector.options.slice(3).map((option: any) => option.value), ["mobility:SG"]);
  assert.match(selector.options.find((option: any) => option.value === "mobility:SG").label, /GTFS ouvert/);
  assert.equal(selector.options.find((option: any) => option.value === "mobility:DE"), undefined);
  assert.match(card.last.content!, /GTFS statique actif et licence autorisée : 1 pays · sans flux exploitable : 1/i);
  assert.equal(card.custom("countries"), undefined);
  assert.deepEqual(await store.get("owner"), { favorites: [] });
  card.collector.stop("cancelled");
});

test("incomplete Mobility coverage keeps unverified countries hidden and existing territories available", async () => {
  const d = fakeDiscord(), s = service();
  s.value.territories = ["fr", "qc", "en"] as any;
  s.value.mobilityCountries = async () => ({ countries: [{ code: "AF", name: "Afghanistan", covered: false }], complete: false });
  await handleTransportCommand(d.message, [], "fr", "!", "bus", s.value);
  const card = d.cards[0]!;
  const selector = card.last.components.flatMap(row => row.components).find((component: any) => component.options) as any;
  assert.deepEqual(selector.options.map((option: any) => option.value), ["fr", "qc", "en"]);
  assert.match(card.last.content!, /couverture incomplet/i);
  card.collector.stop("cancelled");
});

test("Mobility coverage API failures leave the existing territory search available", async () => {
  const d = fakeDiscord(), s = service();
  s.value.territories = ["fr", "qc", "en"] as any;
  s.value.mobilityCountries = async () => { throw Error("catalog unavailable"); };
  await handleTransportCommand(d.message, [], "fr", "!", "bus", s.value);
  const card = d.cards[0]!;
  const selector = card.last.components.flatMap(row => row.components).find((component: any) => component.options) as any;
  assert.deepEqual(selector.options.map((option: any) => option.value), ["fr", "qc", "en"]);
  assert.match(card.last.content!, /non vérifiée/i);
  card.collector.stop("cancelled");
});

test("675 routes are visibly counted across 27 selectable pages", async () => {
  const d = fakeDiscord(), s = service();
  s.value.lines = async () => ({ lines: Array.from({ length: 675 }, (_, i) => ({
    label: String(i + 1), routeId: String(i + 1), description: "Transport for London", mode: "bus",
    nearbyStopIds: [], source: { name: "TfL", url: "https://tfl.gov.uk/modes/buses/" },
  })), unavailable: 0 });
  await handleTransportCommand(d.message, ["60000"], "fr", "!", "bus", s.value);
  const card = d.cards[0]!;
  await choose(card, "fr");
  await choose(card, "0");
  assert.match(card.last.content!, /675 lignes · 1\/27/);
  assert.match(card.last.content!, /25 lignes par page/);
  const controls = card.last.components.find(row => row.components.some(c => c.custom_id?.endsWith(":next")));
  assert.deepEqual(controls?.components.map(component => component.label), ["←", "→", "Retour", "Rechercher", "Annuler"]);
  await click(card, "next");
  assert.match(card.last.content!, /675 lignes · 2\/27/);
  const selector = card.last.components.flatMap(row => row.components)
    .find((component: any) => component.custom_id?.includes(":choose")) as any;
  assert.equal(selector?.options?.length, 25);
  card.collector.stop("cancelled");
});

test("numbered bus routes sort low to high and a unique search opens it directly", async () => {
  const d = fakeDiscord();
  const city = { id: "tfl:london", name: "London", label: "London · TfL", latitude: 51.5, longitude: -.1, territory: "en" as const };
  const network = { id: "tfl", title: "Transport for London", slug: "tfl", type: "public-transit",
    page_url: "https://tfl.gov.uk", resources: [{ id: 1, title: "TfL", format: "JSON", is_available: true,
      url: "https://api.tfl.gov.uk/" }] };
  const lines = Array.from({ length: 975 }, (_, i) => {
    const number = 975 - i;
    return { routeId: `tfl:${number}`, label: String(number), description: `Bus ${number}`,
      mode: "bus", nearbyStopIds: [], allStops: true, territory: "en",
      source: { name: "TfL", url: "https://tfl.gov.uk/modes/buses/" },
      resource: { id: number, title: String(number), format: "TfL JSON", is_available: true, url: "https://api.tfl.gov.uk/" } };
  });
  const index = { routeId: "tfl:906",
    metadata: { routes: new Map(), trips: new Map([["trip", { routeId: "tfl:906", headsign: "End",
      directionId: "inbound", serviceId: "live" }]]), calendars: new Map(), calendarExceptions: new Map(), timezone: "Europe/London" },
    stops: new Map([["origin", { id: "origin", name: "Beehive Lane", parent: "" }],
      ["arrival", { id: "arrival", name: "Millwell Crescent", parent: "" }]]),
    visits: new Map([["trip", [{ stopId: "origin", sequence: 0, pickup: true, dropoff: true },
      { stopId: "arrival", sequence: 1, pickup: true, dropoff: true }]]]) };
  let indexedLine = "";
  const service = {
    territories: ["en"], cities: async () => [city], networks: async () => [network],
    lines: async () => ({ lines, unavailable: 0, networkScoped: true }),
    index: async (line: { routeId: string }) => { indexedLine = line.routeId; return index; },
  } as any;
  await handleTransportCommand(d.message, ["Angleterre", "London"], "en", "!", "bus", service);
  const card = d.cards[0]!;
  const wait = async (predicate: () => boolean) => {
    for (let i = 0; i < 100 && !predicate(); i++) await new Promise(resolve => setTimeout(resolve, 5));
    assert.ok(predicate(), `Menu state was not reached: ${card.last.content}`);
  };
  await wait(() => card.last.content?.includes("Choose a route") ?? false);
  assert.match(card.last.content!, /975 routes · 1\/39/);
  const routeOptions = () => card.last.components.flatMap(row => row.components)
    .find((component: any) => component.custom_id?.includes(":choose")) as any;
  assert.equal(routeOptions()?.options?.length, 25);
  assert.match(routeOptions().options[0].label, /^1 ·/);
  assert.match(routeOptions().options[24].label, /^25 ·/);
  await click(card, "next");
  await wait(() => card.last.content?.includes("975 routes · 2/39") ?? false);
  assert.match(routeOptions().options[0].label, /^26 ·/);

  const submitted = card.interaction("filter", {
    isButton: () => true,
    async showModal() {},
    async awaitModalSubmit() {
      return { fields: { getTextInputValue: () => "906" }, async deferUpdate() {} };
    },
  });
  await card.collector.collect(submitted.value);
  await wait(() => card.last.content?.includes("arrival stop") ?? false);
  assert.equal(indexedLine, "tfl:906");
  assert.match(card.last.content!, /906/);
  assert.doesNotMatch(card.last.content!, /Choose a route/);
  card.collector.stop("cancelled");
});
