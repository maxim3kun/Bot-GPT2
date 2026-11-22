import test from "node:test";
import assert from "node:assert/strict";
import { IgnRoadPlanner, parseRoad, roadPlaces, ROAD_SOURCE } from "../src/discord/ign-road-planner.js";
import { RoadHttp } from "../src/discord/road-http.js";
import { TransportConversation } from "../src/discord/transport-conversation.js";
import { BIKE_SOURCE, OSM_ATTRIBUTION, OpenStreetMapBikePlanner, parseBikeRoute } from "../src/discord/osm-bike-planner.js";
import { createTransportDialogue, handleJourneyCommand, travelScope } from "../src/discord/transport-dialogue.js";
import { itineraryPages, mapsDirectionsUrl } from "../src/discord/transport-itinerary-presentation.js";
import { ItineraryControls } from "../src/discord/transport-itinerary-controls.js";
import { parseAiCommandTool, buildAiCommandTools } from "../src/discord/ai-command-tools.js";
import { selectAiCommand } from "../src/discord/ai-command-intent.js";
import { travelTurn } from "../src/discord/transport-intent.js";
import { PlannerError, type OfficialPlace, type ItineraryProvider } from "../src/discord/transport-planner-types.js";
import { renderRouteMap } from "../src/discord/transport-route-map.js";
import sharp from "sharp";
import { fakeDiscord } from "./fixtures/transport-discord.js";
const NOW = Date.UTC(2026, 10, 11, 14);
const from: OfficialPlace = { id: "ign:60057", ids: ["ign:60057"], name: "Beauvais", label: "Beauvais · 60, Oise", longitude: 2.08, latitude: 49.43 };
const to: OfficialPlace = { id: "ign:80021", ids: ["ign:80021"], name: "Amiens", label: "Amiens · 80, Somme", longitude: 2.29, latitude: 49.89 };
const routeGeometry = { type: "LineString", coordinates: [[2.08,49.43],[2.12,49.61],[2.29,49.89]] };
const body = (profile = "car", geometry?: unknown) => ({ resource: "bdtopo-osrm", profile, crs: "EPSG:4326", distanceUnit: "meter", timeUnit: "second",
  start: "2.08,49.43", end: "2.29,49.89", duration: 3600, distance: 65000, resourceVersion: "2026-11-11",
  ...(geometry ? { geometry } : {}),
  portions: [{ steps: [{ distance: 65000, duration: 3600, instruction: { type: "continue", modifier: "straight" }, attributes: { name: "D1001" } }] }] });
const bikeBody = (options: { mode?: string; code?: string } = {}) => ({
  code: options.code ?? "Ok",
  routes: [{ distance: 1200, duration: 420, legs: [{ distance: 1200, duration: 420, steps: [
    { distance: 500, duration: 180, mode: options.mode ?? "cycling", name: "Rue cyclable", maneuver: { type: "turn", modifier: "right" } },
    { distance: 700, duration: 240, mode: "cycling", name: "Piste verte", maneuver: { type: "continue" } },
  ] }] }],
  waypoints: [{ location: [from.longitude, from.latitude] }, { location: [to.longitude, to.latitude] }],
});
const geo = (city = "Beauvais", code = "60057", coordinates = [2.08,49.43], type = "municipality") => ({
  type: "Feature", geometry: { type: "Point", coordinates }, properties: { id: code, citycode: code, city, name: city,
    label: city, type, depcode: code.slice(0,2), postcode: "60000", context: code.slice(0,2) } });
function setup() {
  const calls: string[] = [], bikeCalls: string[][] = [];
  const road: ItineraryProvider = { places: async q => { calls.push(q); return /amiens/i.test(q) ? [to] : [from]; },
    journeys: async (a,b,at,rep,_fresh,mode) => [parseRoad(body(mode === "walk" ? "pedestrian" : "car"),a,b,at,rep,mode)], stations: async () => { throw Error("not a road function"); } };
  const transit: ItineraryProvider = { places: async () => { throw Error("must not call PRIM"); }, journeys: async () => { throw Error("must not call PRIM"); },
    stations: async () => ({ line: "8", count: 38 }) };
  const bike = { journeys: async (bikeFrom: OfficialPlace, bikeTo: OfficialPlace, at: number, represents: "arrival" | "departure") => {
    bikeCalls.push([bikeFrom.id, bikeTo.id]);
    const route = parseBikeRoute(bikeBody(), from, to)!;
    const duration = Math.ceil(route.durationSeconds), departure = represents === "arrival" ? at - duration : at;
    return [{ departure, arrival: departure + duration, legs: [], warning: false,
      road: { mode: "bike" as const, source: "openstreetmap" as const, distanceMeters: route.distanceMeters,
        steps: route.steps } }];
  } };
  return { service: new TransportConversation(transit, () => NOW, road, bike), road, transit, bike, calls, bikeCalls };
}
test("car grammar keeps A/B in order and strips the mode, not an address comma", () => {
  for (const q of ["Comment aller de Beauvais à Amiens en voiture ?", "Trajet voiture Beauvais -> Amiens"]) {
    const turn = travelTurn(q); assert.equal(turn.mode, "car"); assert.equal(turn.origin, "Beauvais"); assert.equal(turn.destination, "Amiens");
  }
  const t = travelTurn("Trajet voiture 10 rue A, 60000 Beauvais -> 15 rue B, Amiens");
  assert.equal(t.origin, "10 rue A, 60000 Beauvais"); assert.equal(t.destination, "15 rue B, Amiens");
});
test("walking and comparison requests keep endpoints and choose the correct mode", () => {
  const walking = travelTurn("Combien de temps à pied de Beauvais à Amiens ?");
  assert.equal(walking.mode, "walk"); assert.equal(walking.origin, "Beauvais"); assert.equal(walking.destination, "Amiens");
  const compare = travelTurn("Compare le trajet de Beauvais à Amiens à pied, en voiture ou en transports");
  assert.equal(compare.mode, "compare"); assert.equal(compare.origin, "Beauvais"); assert.equal(compare.destination, "Amiens");
  const arrow = travelTurn("Trajet à pied Beauvais -> Amiens");
  assert.equal(arrow.mode,"walk");assert.equal(arrow.origin,"Beauvais");assert.equal(arrow.destination,"Amiens");
  const cycling = travelTurn("Trajet à vélo Beauvais -> Amiens");
  assert.equal(cycling.origin,"Beauvais");assert.equal(cycling.destination,"Amiens");assert.equal(cycling.unsupportedMode,true);
  const bikeCompare = travelTurn("Compare le trajet vélo de Beauvais à Amiens");
  assert.equal(bikeCompare.mode,"compare");assert.equal(bikeCompare.origin,"Beauvais");assert.equal(bikeCompare.destination,"Amiens");
  const bikeOrCar = travelTurn("Trajet à vélo ou en voiture Beauvais -> Amiens");
  assert.equal(bikeOrCar.mode,"compare");assert.equal(bikeOrCar.origin,"Beauvais");assert.equal(bikeOrCar.destination,"Amiens");
  const compareArrow=travelTurn("Trajet comparer Beauvais -> Amiens");
  assert.equal(compareArrow.mode,"compare");assert.equal(compareArrow.origin,"Beauvais");assert.equal(compareArrow.destination,"Amiens");
  const best = travelTurn("Quel est le meilleur moyen pour aller de 10 rue A, Beauvais à 15 rue B, Amiens ?");
  assert.deepEqual({mode:best.mode,origin:best.origin,destination:best.destination},
    {mode:"compare",origin:"10 rue A, Beauvais",destination:"15 rue B, Amiens"});
  assert.equal(selectAiCommand("Quel est le meilleur moyen pour aller de Beauvais à Amiens ?",{}).kind,"action");
});
test("typed road tools reject URLs, identities, unknown modes and unknown fields", () => {
  const parse = (args: object) => parseAiCommandTool([{type:"function",function:{name:"plan_journey",arguments:JSON.stringify(args)}}],[]);
  assert.deepEqual(parse({mode:"car",origin:"Beauvais",destination:"Amiens"}),{name:"plan_journey",mode:"car",origin:"Beauvais",destination:"Amiens"});
  assert.deepEqual(parse({mode:"walk",origin:"Beauvais",destination:"Amiens"}),{name:"plan_journey",mode:"walk",origin:"Beauvais",destination:"Amiens"});
  assert.equal(parse({mode:"compare",origin:"Beauvais",destination:"Amiens"})?.name,"plan_journey");
  for(const args of [{mode:"car",origin:"https://evil.test"}, {mode:"car",userId:"x"}, {mode:"bike"}, {mode:"car",origin:"<@123>"}]) assert.equal(parse(args),null);
  assert.ok(buildAiCommandTools([]).some(t=>t.function.name==="plan_journey"));
  const intent=selectAiCommand("Comment aller de Beauvais à Amiens en voiture ?",{});
  assert.equal(intent.kind,"action"); if(intent.kind==="action")assert.equal(intent.action.name,"plan_journey");
  const compare=selectAiCommand("Compare les trajets à pied et en voiture de Beauvais à Amiens",{});
  assert.equal(compare.kind,"action"); if(compare.kind==="action")assert.equal(compare.action.name,"plan_journey");
  const cycleCompare=selectAiCommand("Compare le trajet vélo de Beauvais à Amiens",{});
  assert.equal(cycleCompare.kind,"action"); if(cycleCompare.kind==="action")assert.equal(cycleCompare.action.name,"plan_journey");
  const bikeOnly=selectAiCommand("Combien de temps à vélo de Beauvais à Amiens ?",{});
  assert.equal(bikeOnly.kind,"clarify");
});
test("a generic journey clarifies mode without using a provider, then uses the road provider", async () => {
  const s=setup(); const first=await s.service.reply("s","Quel trajet de Beauvais à Amiens ?","fr");
  assert.match(first!.content!,/à pied, en voiture ou en transports/); assert.equal(s.calls.length,0);
  const result=await s.service.reply("s","voiture","fr",true);
  assert.ok(result?.itinerary?.journey.road); assert.deepEqual(s.calls,["Beauvais","Amiens"]);
  assert.equal(await s.service.reply("someone else","voiture","fr",true),null);
});
test("a walking request uses the official pedestrian profile and gets a walking card", async () => {
  const s=setup(), result=(await s.service.reply("s","Combien de temps à pied de Beauvais à Amiens ?","fr"))!;
  assert.equal(result.itinerary?.journey.road?.mode,"walk");
  const json=JSON.stringify(itineraryPages(result.itinerary!,true));
  assert.match(json,/🚶 Beauvais → Amiens/);
  assert.match(json,/Accessibilité non vérifiée/); assert.match(json,/absence d’escaliers/); assert.match(json,/accès PMR/);
  assert.doesNotMatch(json,/itinéraire accessible/i);
  assert.doesNotMatch(json,/sans trafic en temps réel/);
  const english=JSON.stringify(itineraryPages(result.itinerary!,false));
  assert.match(english,/Accessibility not verified/); assert.match(english,/stair-free/); assert.match(english,/wheelchair-accessible/);
});
test("comparison calculates each supported mode separately and labels missing transit honestly", async () => {
  const s=setup(), result=(await s.service.reply("s","Compare les trajets de Beauvais à Amiens à pied, en voiture ou en transports","fr"))!;
  assert.equal(result.comparison?.entries.find(e=>e.mode==="walk")?.journey?.road?.mode,"walk");
  assert.equal(result.comparison?.entries.find(e=>e.mode==="car")?.journey?.road?.mode,"car");
  assert.equal(result.comparison?.entries.find(e=>e.mode==="bike")?.journey?.road?.mode,"bike");
  assert.match(result.comparison?.entries.find(e=>e.mode==="transit")?.unavailable ?? "",/indisponible/);
  const { comparisonPage }=await import("../src/discord/transport-itinerary-presentation.js");
  const content=comparisonPage(result.comparison! ,true).content;
  assert.match(content,/À pied/);assert.match(content,/En voiture/);assert.match(content,/À vélo/);assert.match(content,/Transports en commun/);
  assert.match(content,/Accessibilité non vérifiée/);assert.match(content,/absence d’escaliers/);
  assert.match(content,/Réseau vélo OpenStreetMap/);assert.match(content,/France métropolitaine/);
  assert.match(content,/Revêtement OSM : inconnu 1,2 km/);
  assert.match(content,/Aménagement cyclable OSM : inconnu 1,2 km/);
  assert.match(content,/Géoplateforme/);assert.match(content,/OpenStreetMap contributors/);assert.match(content,/Île-de-France Mobilités/);
  const english=comparisonPage(result.comparison!,false).content;
  assert.match(english,/By bike/);assert.match(english,/metropolitan France/);assert.match(english,/OpenStreetMap bike router/);
  assert.match(english,/OSM surface : unknown 1.2 km/);
  assert.match(english,/OSM cycling facility : unknown 1.2 km/);
  assert.match(english,/Accessibility not verified/);assert.match(english,/wheelchair-accessible/);
});

test("IGN pedestrian routes cannot prove accessibility and unavailable routing stays unavailable", async () => {
  const unsupportedClaim = parseRoad({
    ...body("pedestrian"),
    accessibility: "verified",
    wheelchairAccessible: true,
  }, from, to, NOW / 1000, "departure", "walk");
  assert.equal("accessibility" in unsupportedClaim.road!, false);
  assert.equal("wheelchairAccessible" in unsupportedClaim.road!, false);

  const s=setup();
  s.road.journeys=async (_from,_to,_at,_rep,_fresh,mode) => {
    if (mode === "walk") throw new PlannerError("unavailable");
    return [parseRoad(body(),from,to,NOW/1000,"departure")];
  };
  const comparison=(await s.service.reply("s","Compare les trajets de Beauvais à Amiens à pied, en voiture ou en transports","fr"))!;
  const walking=comparison.comparison!.entries.find(entry=>entry.mode==="walk")!;
  assert.equal(walking.journey,undefined);
  assert.match(walking.unavailable!,/calculateur officiel est momentanément indisponible/);
});
test("comparison ranks only journeys actually returned by their official planners", async () => {
  const s=setup();
  s.bike.journeys=async()=>[];
  s.transit.places=async query=>[{id:`id:${query}`,ids:[`id:${query}`],name:query,label:query,longitude:2.1,latitude:49.4}];
  s.transit.journeys=async(from,to,at)=>[{departure:at,arrival:at+600,legs:[{kind:"transit",from:from.label,to:to.label,departure:at,arrival:at+600,line:"Train",direction:to.label}],warning:false}];
  const result=(await s.service.reply("s","Compare les trajets de Beauvais à Amiens à pied, en voiture ou en transports","fr"))!;
  assert.equal(result.comparison?.entries.filter(entry=>entry.journey).length,3);
  assert.match(result.comparison?.entries.find(entry=>entry.mode==="bike")?.unavailable ?? "",/aucun itinéraire vélo/);
  assert.equal(result.comparison?.recommended,"transit");
});
test("comparison is delivered as a compact card with source links, including without embeds", async () => {
  const s=setup(), d=fakeDiscord({embed:false});
  const comparison=(await s.service.reply("map-check","Compare de Beauvais à Amiens à pied et en voiture","fr"))!.comparison!;
  await new ItineraryControls(s.service,async()=>true).sendComparison(d.message,comparison,"fr");
  assert.match(d.cards[0]!.last.content!,/Comparaison des trajets/);
  const urls=d.cards[0]!.last.components.flatMap(row=>row.components.map(button=>button.url));
  assert.ok(urls.some(url=>url===ROAD_SOURCE));
  assert.ok(urls.some(url=>url===BIKE_SOURCE));
  assert.ok(urls.some(url=>url===OSM_ATTRIBUTION));
  assert.ok(urls.some(url=>url?.includes("prim.iledefrance-mobilites.fr")));
  const map=new URL(urls.find(url=>url?.includes("google.com/maps/dir"))!);
  assert.equal(map.searchParams.get("origin"),"Beauvais · 60, Oise");
  assert.equal(map.searchParams.get("destination"),"Amiens · 80, Somme");
  assert.equal(map.searchParams.get("travelmode"),({walk:"walking",car:"driving",bike:"bicycling",transit:"transit"} as const)[comparison.recommended!]);
});
test("comparison preview uses only the recommended route geometry and keeps the Google Maps link", async () => {
  const s=setup(), d=fakeDiscord();
  const comparison=(await s.service.reply("map-compare","Compare les trajets de Beauvais à Amiens à pied et en voiture","fr"))!.comparison!;
  const selected=comparison.entries.find(entry=>entry.mode===comparison.recommended)!.journey!;
  selected.road!.geometry=routeGeometry.coordinates as [number,number][];
  let rendered: unknown;
  const controls=new ItineraryControls(s.service,async()=>true,async journey=>{rendered=journey.road?.geometry;return Buffer.from("verified-map");});
  await controls.sendComparison(d.message,comparison,"fr");
  assert.deepEqual(rendered,selected.road!.geometry);
  assert.equal(d.cards[0]!.last.embeds[0]!.image!.url,"attachment://route-preview.png");
  assert.doesNotMatch(d.cards[0]!.last.embeds[0]!.footer?.text ?? "",/calculateur IGN|routeur vélo OpenStreetMap|fond cartographique/);
  assert.equal(d.cards[0]!.last.files[0]!.name,"route-preview.png");
  const map=d.cards[0]!.last.components.flatMap(row=>row.components).find(button=>button.url?.includes("google.com/maps/dir"));
  assert.ok(map);
});
test("a standalone bike route is declined, while comparisons can request cycling", async () => {
  const s=setup();
  const standalone=await s.service.reply("solo","Trajet à vélo Beauvais -> Amiens","fr");
  assert.match(standalone!.content!,/pas encore calculer le vélo seul/);
  assert.equal(s.calls.length,0);
  const comparison=await s.service.reply("compare","Compare le trajet vélo de Beauvais à Amiens","fr");
  assert.equal(comparison!.comparison?.entries.find(entry=>entry.mode==="bike")?.journey?.road?.source,"openstreetmap");
});
test("road presentation and source never claim PRIM or live traffic", async () => {
  const s=setup(),result=(await s.service.reply("s","Comment aller de Beauvais à Amiens en voiture ?","fr"))!;
  const pages=itineraryPages(result.itinerary!,true), json=JSON.stringify(pages);
  assert.match(json,/65 km/); assert.match(json,/1 h/); assert.match(json,/Arrivée estimée/);
  assert.doesNotMatch(json,/sans trafic en temps réel|La carte Google peut recalculer|Aperçu · en voiture|fond cartographique ©/);
  assert.match(pages[0]!.embed.title!,/Beauvais.*Amiens/);
  assert.match(pages[0]!.embed.description!,/Oise → Somme.*1 h.*65 km.*Aujourd’hui.*Départ prévu/s);
  assert.doesNotMatch(JSON.stringify(pages[0]!.embed.fields),/Étapes/);
  assert.match(pages[1]!.embed.title!,/Le trajet/);
  assert.match(JSON.stringify(pages[1]!.embed.fields),/Étapes/);
  assert.equal(pages[0]!.embed.url,ROAD_SOURCE); assert.doesNotMatch(json,/PRIM|Île-de-France Mobilités|Horaires théoriques|Europe\/Paris|2026-11/);
  assert.ok(pages.every(p=>p.content.length<2000));
});
test("road cards start with a compact summary and reveal paginated directions on demand", async () => {
  const s=setup(), d=fakeDiscord();
  const steps=Array.from({length:7},(_,i)=>({distance:i===6?11000:9000,duration:i===6?600:500,instruction:{type:"continue",modifier:"straight"},attributes:{name:`D${i+1}`} }));
  s.road.journeys=async(a,b,at,rep,_fresh,mode)=>[parseRoad({...body(mode==="walk"?"pedestrian":"car"),portions:[{steps}]},a,b,at,rep,mode)];
  await handleJourneyCommand(d.message,["voiture","Beauvais","->","Amiens"],"fr",createTransportDialogue(s.service,async()=>true));
  const card=d.cards[0]!;
  const labels=card.last.components.flatMap(row=>row.components.map(component=>component.label));
  assert.ok(labels.includes("Le trajet"));
  assert.ok(labels.includes("Fermer"));
  assert.equal(card.last.components.length,1);
  assert.ok(card.last.components[0]!.components.some(component=>component.emoji?.name==="Maps"));
  assert.ok(!labels.includes("IGN") && !labels.includes("Carte"));
  const mapButton=card.last.components.flatMap(row=>row.components).find(component=>component.url?.includes("google.com/maps/dir/"));
  assert.equal(mapButton?.label,undefined);
  assert.deepEqual(mapButton?.emoji,{id:"1574083298232111215",name:"Maps"});
  assert.doesNotMatch(JSON.stringify(card.last.embeds[0]?.fields),/Étapes/);
  assert.ok(card.custom("details"));
  await card.collector.collect(card.interaction("details").value);
  assert.match(card.last.embeds[0]?.title ?? "",/Le trajet 1\/2/);
  assert.match(JSON.stringify(card.last.embeds[0]?.fields),/Étapes/);
  assert.ok(card.custom("next")); assert.ok(card.custom("summary"));
  await card.collector.collect(card.interaction("next").value);
  assert.match(card.last.embeds[0]?.title ?? "",/Le trajet 2\/2/);
  await card.collector.collect(card.interaction("summary").value);
  assert.match(card.last.embeds[0]?.title ?? "",/Beauvais.*Amiens/);
  assert.doesNotMatch(JSON.stringify(card.last.embeds[0]?.fields),/Étapes/);
  await card.collector.collect(card.interaction("close").value); await card.collector.endWork;
});
test("native command and natural AI request use identical cards in guilds and DMs", async () => {
  const a=setup(),b=setup(),da=fakeDiscord(),db=fakeDiscord({guildId:null});
  await handleJourneyCommand(da.message,["voiture","Beauvais","->","Amiens"],"fr",createTransportDialogue(a.service,async()=>true));
  await createTransportDialogue(b.service,async()=>true)(db.message,"Comment aller de Beauvais à Amiens en voiture ?","fr");
  assert.deepEqual(da.cards[0]!.last.embeds,db.cards[0]!.last.embeds);
  assert.equal(da.cards[0]!.last.embeds[0]?.url,ROAD_SOURCE);
  assert.doesNotMatch(da.cards[0]!.last.content!,/Aucun aperçu IGN vérifié/);
  const mapUrl=da.cards[0]!.last.components.flatMap(row=>row.components.map(button=>button.url))
    .find(url=>url?.includes("google.com/maps/dir"));
  assert.ok(mapUrl);
  assert.equal(new URL(mapUrl!).searchParams.get("travelmode"),"driving");
  da.cards[0]!.collector.stop("closed"); db.cards[0]!.collector.stop("closed");
});
test("journey preview attaches the verified route while retaining the external map button", async () => {
  const s=setup(), scope="map-control";
  s.road.journeys=async(a,b,at,rep, _fresh,mode)=>[
    parseRoad({...body(mode==="walk"?"pedestrian":"car",routeGeometry),
      start:`${a.longitude},${a.latitude}`,end:`${b.longitude},${b.latitude}`},a,b,at,rep,mode ?? "car"),
  ];
  const controls=new ItineraryControls(s.service,async()=>true,async()=>Buffer.from("verified-map"));
  const result=(await s.service.reply(scope,"Comment aller de Beauvais à Amiens en voiture ?","fr"))!;
  const other=fakeDiscord();
  await controls.send(other.message,scope,result,"fr");
  const card=other.cards[0]!;
  assert.equal(card.last.embeds[0]!.image!.url,"attachment://route-preview.png");
  assert.equal(card.last.embeds[0]!.footer,undefined);
  assert.equal(card.last.files[0]!.name,"route-preview.png");
  assert.ok(card.last.components.flatMap(row=>row.components).some(button=>button.url?.includes("google.com/maps/dir")));
  card.collector.stop("closed");
});
test("an unavailable IGN map tile never substitutes a route and keeps the external link", async () => {
  const s=setup(), scope="missing-map-tile";
  s.road.journeys=async(a,b,at,rep, _fresh,mode)=>[
    parseRoad({...body(mode==="walk"?"pedestrian":"car",routeGeometry),
      start:`${a.longitude},${a.latitude}`,end:`${b.longitude},${b.latitude}`},a,b,at,rep,mode ?? "car"),
  ];
  const result=(await s.service.reply(scope,"Comment aller de Beauvais à Amiens en voiture ?","fr"))!;
  const controls=new ItineraryControls(s.service,async()=>true,async()=>undefined), d=fakeDiscord();
  await controls.send(d.message,scope,result,"fr");
  const card=d.cards[0]!;
  assert.equal(card.last.embeds[0]!.image,undefined);
  assert.match(card.last.embeds[0]!.footer!.text,/Aperçu de la carte indisponible/);
  assert.ok(card.last.components.flatMap(row=>row.components).some(button=>button.url?.includes("google.com/maps/dir")));
  card.collector.stop("closed");
});
test("Google Maps links encode endpoints and select the requested mode without a key", () => {
  const url=new URL(mapsDirectionsUrl(
    {id:"a",ids:["a"],name:"Rue",label:"10 rue A & 2, Beauvais",latitude:49.43,longitude:2.08},
    {id:"b",ids:["b"],name:"Amiens",label:"Gare d’Amiens",latitude:49.89,longitude:2.29},
    "walk",
  ));
  assert.equal(url.origin,"https://www.google.com");
  assert.equal(url.searchParams.get("origin"),"10 rue A & 2, Beauvais");
  assert.equal(url.searchParams.get("destination"),"Gare d’Amiens");
  assert.equal(url.searchParams.get("travelmode"),"walking");
  assert.equal(new URL(mapsDirectionsUrl(from,to,"bike")).searchParams.get("travelmode"),"bicycling");
  assert.equal(new URL(mapsDirectionsUrl(from,to,"transit")).searchParams.get("travelmode"),"transit");
});
test("typed request uses literal endpoints rather than reinterpreting a field as another mode", async () => {
  const s=setup(), d=fakeDiscord();
  await createTransportDialogue(s.service,async()=>true)(d.message,"itinéraire","fr",
    {journey:{mode:"car",origin:"Beauvais",destination:"Amiens"}});
  assert.deepEqual(s.calls,["Beauvais","Amiens"]); assert.match(d.cards[0]!.last.embeds[0]!.title!,/Beauvais.*Amiens/);
  d.cards[0]!.collector.stop("closed");
});
test("municipality-only search prevents the Beauvais street in Guichen regression and retains both Breteuils", async () => {
  const requests: URL[]=[];
  const planner=new IgnRoadPlanner(async input=>{
    const u=new URL(String(input));requests.push(u);
    return Response.json({features:[geo("Breteuil","27112",[.9,48.8]),geo("Breteuil","60104",[2.28,49.63])]});
  },()=>NOW);
  assert.equal((await planner.places("Breteuil")).length,2);
  assert.equal((await planner.places("Breteuil 60"))[0]!.id,"ign:60104");
  assert.equal(requests[0]!.searchParams.get("type"),"municipality");
});
test("address coordinates are retained exactly; POIs are not guessed from a street named gare", () => {
  const address=roadPlaces({features:[geo("10 rue A","60057_123_10",[2.08501,49.42811],"housenumber")]}, "10 rue A");
  // A proper address has a municipal INSEE code and its own address id.
  const feature=geo("10 rue A","60057",[2.08501,49.42811],"housenumber");feature.properties.id="60057_123_10";
  const places=roadPlaces({features:[feature]},"10 rue A");
  assert.equal(places[0]!.longitude,2.08501);assert.equal(places[0]!.latitude,49.42811);assert.equal(address.length,0);
});
test("bad units, times, totals and mismatched endpoints cannot become a verified road journey", () => {
  for(const change of [{profile:"walking"},{distanceUnit:"kilometer"},{distance:NaN},{duration:NaN},{duration:1},{start:"1,45"},{end:"2.08,49.43"},{portions:[]}]){
    assert.throws(()=>parseRoad({...body(),...change},from,to,NOW/1000,"departure"),PlannerError);
  }
  assert.equal(parseRoad(body("pedestrian"),from,to,NOW/1000,"departure","walk").road?.mode,"walk");
  assert.throws(()=>parseRoad(body("car"),from,to,NOW/1000,"departure","walk"),PlannerError);
  const arrival=parseRoad(body(),from,to,NOW/1000+7200,"arrival");assert.equal(arrival.arrival,NOW/1000+7200);assert.equal(arrival.departure,NOW/1000+3600);
});
test("IGN keeps only bounded route geometry whose ends match the snapped route", () => {
  const journey=parseRoad(body("car",routeGeometry),from,to,NOW/1000,"departure");
  assert.deepEqual(journey.road?.geometry,routeGeometry.coordinates);
  const malformed=parseRoad(body("car",{type:"LineString",coordinates:[[2.08,49.43],[2.29,48.89]]}),from,to,NOW/1000,"departure");
  assert.equal(malformed.road?.geometry,undefined);
  assert.equal(parseRoad(body(),from,to,NOW/1000,"departure").road?.geometry,undefined);
});
test("IGN requests select the documented pedestrian or car profile and validates that profile back", async () => {
  const requests:URL[]=[];
  const planner=new IgnRoadPlanner(async input=>{
    const url=new URL(String(input));requests.push(url);
    return Response.json(body(url.searchParams.get("profile") === "pedestrian" ? "pedestrian" : "car"));
  },()=>NOW);
  const walking=await planner.journeys(from,to,NOW/1000,"departure",false,"walk");
  const driving=await planner.journeys(from,to,NOW/1000,"departure",false,"car");
  assert.equal(requests[0]!.searchParams.get("profile"),"pedestrian");
  assert.equal(requests[1]!.searchParams.get("profile"),"car");
  assert.equal(walking[0]!.road?.mode,"walk");assert.equal(driving[0]!.road?.mode,"car");
});
test("cycling routes use the public bike endpoint and accept only a cycling-profile response", async () => {
  const requests: URL[]=[];
  const planner=new OpenStreetMapBikePlanner(async input=>{
    requests.push(new URL(String(input)));
    return Response.json(bikeBody());
  },()=>NOW,0);
  const journey=(await planner.journeys(from,to,NOW/1000,"departure"))[0]!;
  assert.equal(requests[0]!.hostname,"routing.openstreetmap.de");
  assert.match(requests[0]!.pathname,/routed-bike/);
  assert.equal(journey.road?.mode,"bike");
  assert.equal(journey.road?.source,"openstreetmap");
  assert.equal(journey.arrival-journey.departure,420);
  assert.equal(parseBikeRoute({code:"NoRoute",routes:[],waypoints:[]},from,to),null);
  assert.throws(()=>parseBikeRoute(bikeBody({mode:"driving"}),from,to),PlannerError);
  assert.throws(()=>parseBikeRoute({...bikeBody(),waypoints:[{location:[-1,45]},{location:[to.longitude,to.latitude]}]},from,to),PlannerError);
  assert.equal(OSM_ATTRIBUTION,"https://www.openstreetmap.org/copyright");
});
test("bike router requests a full GeoJSON route and retains its verified geometry", async () => {
  const requests:URL[]=[];
  const geoBike={...bikeBody(),routes:[{...bikeBody().routes[0]!,geometry:routeGeometry}]};
  const planner=new OpenStreetMapBikePlanner(async input=>{
    requests.push(new URL(String(input)));
    return Response.json(geoBike);
  },()=>NOW,0);
  const journey=(await planner.journeys(from,to,NOW/1000,"departure"))[0]!;
  assert.equal(requests[0]!.searchParams.get("overview"),"full");
  assert.equal(requests[0]!.searchParams.get("geometries"),"geojson");
  assert.deepEqual(journey.road?.geometry,routeGeometry.coordinates);
});
test("route-map image uses interior geometry, stays small, and never draws a fallback line", async () => {
  const tile=await sharp({create:{width:256,height:256,channels:3,background:"#ece8dd"}}).png().toBuffer();
  const requested:URL[]=[];
  const fetcher=async (input:RequestInfo|URL)=>{
    requested.push(new URL(String(input)));
    return new Response(tile,{headers:{"content-type":"image/png","content-length":String(tile.length)}});
  };
  const journey=parseRoad(body("car",routeGeometry),from,to,NOW/1000,"departure");
  const first=await renderRouteMap(journey,fetcher as typeof fetch);
  assert.ok(first);
  const info=await sharp(first!).metadata();
  assert.equal(info.width,512);assert.equal(info.height,512);assert.ok(first!.length<1_000_000);
  const raster=await sharp(first!).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const bluePoints:{x:number;y:number}[]=[];
  for(let y=0;y<raster.info.height;y++)for(let x=0;x<raster.info.width;x++){
    const offset=(y*raster.info.width+x)*raster.info.channels;
    if(raster.data[offset]!<80&&raster.data[offset+1]!>50&&raster.data[offset+2]!>150)bluePoints.push({x,y});
  }
  assert.ok(bluePoints.length>0);
  const blueRows=bluePoints.map(point=>point.y);
  assert.ok(Math.max(...blueRows)-Math.min(...blueRows)>300,"tight crop should make the verified route fill most of the preview");
  assert.equal(requested.length,4);
  assert.equal(requested[0]!.searchParams.get("LAYER"),"GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2");
  const zoom = Number(requested[0]!.searchParams.get("TILEMATRIX"));
  assert.ok(zoom >= 9 && zoom <= 17, `expected the closer route framing, got zoom ${zoom}`);
  const alternate={...journey,road:{...journey.road!,geometry:[[2.08,49.43],[2.18,49.48],[2.29,49.89]] as [number,number][]}};
  const second=await renderRouteMap(alternate,fetcher as typeof fetch);
  assert.ok(second);assert.notDeepEqual(first,second,"different router bends must produce different map images");
  let unused=0;
  assert.equal(await renderRouteMap(parseRoad(body(),from,to,NOW/1000,"departure"),
    (async()=>{unused++;return new Response(tile);}) as typeof fetch),undefined);
  assert.equal(unused,0,"missing geometry must not trigger a straight-line preview or a tile request");
});
test("cycling surface and facility labels require explicit recognized OSM tags", async () => {
  const response = bikeBody() as ReturnType<typeof bikeBody> & { routes: Array<{ legs: Array<{ steps: Array<Record<string, unknown>> }> }> };
  response.routes[0]!.legs[0]!.steps[0]!.surface = "asphalt";
  response.routes[0]!.legs[0]!.steps[0]!.tags = { cycleway: "track" };
  response.routes[0]!.legs[0]!.steps[1]!.surface = "invented";
  response.routes[0]!.legs[0]!.steps[1]!.cycleway = "lane;track";
  const parsed = parseBikeRoute(response, from, to)!;
  assert.equal(parsed.steps[0]!.surface, "asphalt");
  assert.equal(parsed.steps[0]!.cycleway, "track");
  assert.equal(parsed.steps[1]!.surface, undefined);
  assert.equal(parsed.steps[1]!.cycleway, undefined);

  const s = setup(), result = (await s.service.reply("s","Compare les trajets à vélo de Beauvais à Amiens","fr"))!;
  result.comparison!.entries.find(entry => entry.mode === "bike")!.journey!.road!.steps = parsed.steps;
  const { comparisonPage } = await import("../src/discord/transport-itinerary-presentation.js");
  const french = comparisonPage(result.comparison!, true).content;
  assert.match(french,/Revêtement OSM : asphalte 0,5 km · inconnu 0,7 km/);
  assert.match(french,/Aménagement cyclable OSM : piste cyclable 0,5 km · inconnu 0,7 km/);
  assert.doesNotMatch(french,/Rue cyclable.*asphalte|Piste verte.*piste cyclable/s);
  const english = comparisonPage(result.comparison!, false).content;
  assert.match(english,/OSM surface : asphalt 0.5 km · unknown 0.7 km/);
  assert.match(english,/OSM cycling facility : cycle track 0.5 km · unknown 0.7 km/);
});
test("quota, malformed/oversized JSON, redirect failures and missing route are honest errors", async () => {
  for(const fetcher of [
    async()=>new Response("quota",{status:429}),async()=>new Response("bad",{status:503}),
    async()=>new Response("invalid json"), async()=>new Response("{}",{headers:{"content-length":"4000000"}}),
    async()=>{throw Error("redirect not allowed");}
  ]){
    const api=new RoadHttp(fetcher,()=>NOW);
    await assert.rejects(api.json("/navigation/itineraire",{}),PlannerError);
  }
});
test("cached route data never caches an old departure clock, while refresh fetches again", async () => {
  let calls=0;const planner=new IgnRoadPlanner(async()=>{calls++;return Response.json(body());},()=>NOW);
  const first=(await planner.journeys(from,to,NOW/1000,"departure"))[0]!;
  const later=(await planner.journeys(from,to,NOW/1000+7200,"departure"))[0]!;
  assert.equal(calls,1);assert.equal(later.departure-first.departure,7200);
  await planner.journeys(from,to,NOW/1000,"departure",true);assert.equal(calls,2);
});
test("consent denied before lookup or revoked during lookup never sends a route", async () => {
  const denied=setup(),d=fakeDiscord();
  await createTransportDialogue(denied.service,async()=>false)(d.message,"Trajet voiture Beauvais -> Amiens","fr");
  assert.equal(denied.calls.length,0);assert.equal(d.cards.length,0);
  const revoked=setup(),r=fakeDiscord();let allowed=true;
  revoked.road.journeys=async()=>{allowed=false;return[parseRoad(body(),from,to,NOW/1000,"departure")];};
  await createTransportDialogue(revoked.service,async()=>allowed)(r.message,"Trajet voiture Beauvais -> Amiens","fr");
  assert.equal(r.cards.length,0);
});
test("road controls remain owner-bound and revoke access during refresh, including after the provider returns", async () => {
  const s=setup(),d=fakeDiscord();let allowed=true;
  const handle=createTransportDialogue(s.service,async()=>allowed);
  await handle(d.message,"Trajet voiture Beauvais -> Amiens","fr",{personaId:"p"});
  const card=d.cards[0]!,outsider=card.interaction("refresh",{user:{id:"other"}});
  await card.collector.collect(outsider.value);assert.equal(outsider.replies.length,1);
  s.road.journeys=async()=>{allowed=false;return[parseRoad(body(),from,to,NOW/1000,"departure")];};
  await card.collector.collect(card.interaction("refresh").value);await card.collector.endWork;
  assert.equal(card.collector.stopped,true);
  assert.match(card.last.content!,/non autorisé/);
  assert.equal(s.service.remaining(travelScope(d.message,"p"),Symbol()),0);
});
test("Québec is not routed through a similarly named French commune", async () => {
  const s=setup();const r=await s.service.reply("s","Quel trajet de Montréal Québec à Laval en voiture ?","fr");
  assert.match(r!.content!,/France métropolitaine/);assert.equal(s.calls.length,0);
});
test("an incomplete car request retains its starting city, and several requested modes are compared", async () => {
  const s=setup();
  const question=await s.service.reply("s","Comment aller de Beauvais en voiture ?","fr");
  assert.match(question!.content!,/depuis.*Beauvais/);assert.equal(s.calls.length,0);
  const result=await s.service.reply("s","Amiens","fr",true);assert.ok(result?.itinerary?.journey.road);
  const ambiguous=setup();
  const response=await ambiguous.service.reply("s","Quel trajet de Beauvais à Amiens en voiture ou en transports ?","fr");
  assert.ok(response!.comparison);assert.equal(ambiguous.calls.length,2);
});
test("homonymous choices stay scoped and reversing keeps the selected coordinates", async () => {
  const s=setup(),bre27={...from,id:"ign:27112",name:"Breteuil",label:"Breteuil · 27 Eure",longitude:.9,latitude:48.8},
    bre60={...from,id:"ign:60104",name:"Breteuil",label:"Breteuil · 60 Oise",longitude:2.28,latitude:49.63};
  s.road.places=async q=>q==="Breteuil"?[bre27,bre60]:[to];
  const pairs: string[][]=[];
  s.road.journeys=async(a,b,at,rep)=>{
    pairs.push([a.id,b.id]);
    return[parseRoad({...body(),start:`${a.longitude},${a.latitude}`,end:`${b.longitude},${b.latitude}`},a,b,at,rep)];
  };
  const choose=await s.service.reply("s","Quel trajet de Breteuil à Amiens en voiture ?","fr");
  assert.match(choose!.content!,/27 Eure.*\n.*60 Oise/s);assert.equal(pairs.length,0);
  assert.equal(s.bikeCalls.length,0);
  assert.equal(await s.service.reply("another persona","2","fr",true),null);
  await s.service.reply("s","2","fr",true);assert.deepEqual(pairs[0],[bre60.id,to.id]);
  await s.service.reply("s","Inverse le trajet","fr",true);assert.deepEqual(pairs[1],[to.id,bre60.id]);
});

test("an ambiguous cycling comparison waits for the selected official place", async () => {
  const s=setup(), bre27={...from,id:"ign:27112",name:"Breteuil",label:"Breteuil · 27 Eure",longitude:.9,latitude:48.8},
    bre60={...from,id:"ign:60104",name:"Breteuil",label:"Breteuil · 60 Oise",longitude:2.28,latitude:49.63};
  s.road.places=async q=>q==="Breteuil"?[bre27,bre60]:[to];
  s.road.journeys=async(a,b,at,represents,_fresh,mode)=>[
    parseRoad({...body(mode==="walk"?"pedestrian":"car",),start:`${a.longitude},${a.latitude}`,end:`${b.longitude},${b.latitude}`},a,b,at,represents,mode),
  ];
  s.bike.journeys=async(a,b,at)=>{s.bikeCalls.push([a.id,b.id]);return[
    {departure:at,arrival:at+600,legs:[],warning:false,
      road:{mode:"bike",source:"openstreetmap",distanceMeters:1000,steps:[]}},
  ];};
  const prompt=await s.service.reply("s","Compare le trajet vélo de Breteuil à Amiens","fr");
  assert.match(prompt!.content!,/27 Eure.*\n.*60 Oise/s);assert.equal(s.bikeCalls.length,0);
  await s.service.reply("s","2","fr",true);
  assert.deepEqual(s.bikeCalls,[[bre60.id,to.id]]);
});
