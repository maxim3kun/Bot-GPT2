import test from "node:test";
import assert from "node:assert/strict";
import { IgnRoadPlanner, parseRoad, roadPlaces, ROAD_SOURCE } from "../src/discord/ign-road-planner.js";
import { RoadHttp } from "../src/discord/road-http.js";
import { TransportConversation } from "../src/discord/transport-conversation.js";
import { createTransportDialogue, handleJourneyCommand, travelScope } from "../src/discord/transport-dialogue.js";
import { itineraryPages } from "../src/discord/transport-itinerary-presentation.js";
import { parseAiCommandTool, buildAiCommandTools } from "../src/discord/ai-command-tools.js";
import { selectAiCommand } from "../src/discord/ai-command-intent.js";
import { travelTurn } from "../src/discord/transport-intent.js";
import { PlannerError, type OfficialPlace, type ItineraryProvider } from "../src/discord/transport-planner-types.js";
import { fakeDiscord } from "./fixtures/transport-discord.js";
const NOW = Date.UTC(2026, 10, 11, 14);
const from: OfficialPlace = { id: "ign:60057", ids: ["ign:60057"], name: "Beauvais", label: "Beauvais · 60, Oise", longitude: 2.08, latitude: 49.43 };
const to: OfficialPlace = { id: "ign:80021", ids: ["ign:80021"], name: "Amiens", label: "Amiens · 80, Somme", longitude: 2.29, latitude: 49.89 };
const body = () => ({ resource: "bdtopo-osrm", profile: "car", crs: "EPSG:4326", distanceUnit: "meter", timeUnit: "second",
  start: "2.08,49.43", end: "2.29,49.89", duration: 3600, distance: 65000, resourceVersion: "2026-11-11",
  portions: [{ steps: [{ distance: 65000, duration: 3600, instruction: { type: "continue", modifier: "straight" }, attributes: { name: "D1001" } }] }] });
const geo = (city = "Beauvais", code = "60057", coordinates = [2.08,49.43], type = "municipality") => ({
  type: "Feature", geometry: { type: "Point", coordinates }, properties: { id: code, citycode: code, city, name: city,
    label: city, type, depcode: code.slice(0,2), postcode: "60000", context: code.slice(0,2) } });
function setup() {
  const calls: string[] = [];
  const road: ItineraryProvider = { places: async q => { calls.push(q); return /amiens/i.test(q) ? [to] : [from]; },
    journeys: async (a,b,at,rep) => [parseRoad(body(),a,b,at,rep)], stations: async () => { throw Error("not a road function"); } };
  const transit: ItineraryProvider = { places: async () => { throw Error("must not call PRIM"); }, journeys: async () => { throw Error("must not call PRIM"); },
    stations: async () => ({ line: "8", count: 38 }) };
  return { service: new TransportConversation(transit, () => NOW, road), road, calls };
}
test("car grammar keeps A/B in order and strips the mode, not an address comma", () => {
  for (const q of ["Comment aller de Beauvais à Amiens en voiture ?", "Trajet voiture Beauvais -> Amiens"]) {
    const turn = travelTurn(q); assert.equal(turn.mode, "car"); assert.equal(turn.origin, "Beauvais"); assert.equal(turn.destination, "Amiens");
  }
  const t = travelTurn("Trajet voiture 10 rue A, 60000 Beauvais -> 15 rue B, Amiens");
  assert.equal(t.origin, "10 rue A, 60000 Beauvais"); assert.equal(t.destination, "15 rue B, Amiens");
});
test("typed road tools reject URLs, identities, unknown modes and unknown fields", () => {
  const parse = (args: object) => parseAiCommandTool([{type:"function",function:{name:"plan_journey",arguments:JSON.stringify(args)}}],[]);
  assert.deepEqual(parse({mode:"car",origin:"Beauvais",destination:"Amiens"}),{name:"plan_journey",mode:"car",origin:"Beauvais",destination:"Amiens"});
  for(const args of [{mode:"car",origin:"https://evil.test"}, {mode:"car",userId:"x"}, {mode:"bike"}, {mode:"car",origin:"<@123>"}]) assert.equal(parse(args),null);
  assert.ok(buildAiCommandTools([]).some(t=>t.function.name==="plan_journey"));
  const intent=selectAiCommand("Comment aller de Beauvais à Amiens en voiture ?",{});
  assert.equal(intent.kind,"action"); if(intent.kind==="action")assert.equal(intent.action.name,"plan_journey");
});
test("a generic journey clarifies mode without using a provider, then uses the road provider", async () => {
  const s=setup(); const first=await s.service.reply("s","Quel trajet de Beauvais à Amiens ?","fr");
  assert.match(first!.content!,/voiture ou en transports/); assert.equal(s.calls.length,0);
  const result=await s.service.reply("s","voiture","fr",true);
  assert.ok(result?.itinerary?.journey.road); assert.deepEqual(s.calls,["Beauvais","Amiens"]);
  assert.equal(await s.service.reply("someone else","voiture","fr",true),null);
});
test("road presentation and source never claim PRIM or live traffic", async () => {
  const s=setup(),result=(await s.service.reply("s","Comment aller de Beauvais à Amiens en voiture ?","fr"))!;
  const pages=itineraryPages(result.itinerary!,true), json=JSON.stringify(pages);
  assert.match(json,/65 km/); assert.match(json,/60 min/); assert.match(json,/Arrivée estimée/); assert.match(json,/sans trafic en temps réel/);
  assert.equal(pages[0]!.embed.url,ROAD_SOURCE); assert.doesNotMatch(json,/PRIM|Île-de-France Mobilités|Horaires théoriques/);
  assert.ok(pages.every(p=>p.content.length<2000));
});
test("native command and natural AI request use identical cards in guilds and DMs", async () => {
  const a=setup(),b=setup(),da=fakeDiscord(),db=fakeDiscord({guildId:null});
  await handleJourneyCommand(da.message,["voiture","Beauvais","->","Amiens"],"fr",createTransportDialogue(a.service,async()=>true));
  await createTransportDialogue(b.service,async()=>true)(db.message,"Comment aller de Beauvais à Amiens en voiture ?","fr");
  assert.deepEqual(da.cards[0]!.last.embeds,db.cards[0]!.last.embeds);
  assert.equal(da.cards[0]!.last.embeds[0]?.url,ROAD_SOURCE);
  da.cards[0]!.collector.stop("closed"); db.cards[0]!.collector.stop("closed");
});
test("typed request uses literal endpoints rather than reinterpreting a field as another mode", async () => {
  const s=setup(), d=fakeDiscord();
  await createTransportDialogue(s.service,async()=>true)(d.message,"itinéraire","fr",
    {journey:{mode:"car",origin:"Beauvais",destination:"Amiens"}});
  assert.deepEqual(s.calls,["Beauvais","Amiens"]); assert.match(d.cards[0]!.last.embeds[0]!.title!,/voiture/);
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
  const arrival=parseRoad(body(),from,to,NOW/1000+7200,"arrival");assert.equal(arrival.arrival,NOW/1000+7200);assert.equal(arrival.departure,NOW/1000+3600);
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
test("an incomplete car request retains its starting city, and ambiguous modes do not execute a provider", async () => {
  const s=setup();
  const question=await s.service.reply("s","Comment aller de Beauvais en voiture ?","fr");
  assert.match(question!.content!,/depuis.*Beauvais/);assert.equal(s.calls.length,0);
  const result=await s.service.reply("s","Amiens","fr",true);assert.ok(result?.itinerary?.journey.road);
  const ambiguous=setup();
  const response=await ambiguous.service.reply("s","Quel trajet de Beauvais à Amiens en voiture ou en transports ?","fr");
  assert.match(response!.content!,/voiture ou en transports/);assert.equal(ambiguous.calls.length,0);
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
  assert.equal(await s.service.reply("another persona","2","fr",true),null);
  await s.service.reply("s","2","fr",true);assert.deepEqual(pairs[0],[bre60.id,to.id]);
  await s.service.reply("s","Inverse le trajet","fr",true);assert.deepEqual(pairs[1],[to.id,bre60.id]);
});
