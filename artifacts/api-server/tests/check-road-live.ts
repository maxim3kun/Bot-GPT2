/** Opt-in public-provider smoke check. No Discord messages and no credential output. */
import assert from "node:assert/strict";
import { IgnRoadPlanner } from "../src/discord/ign-road-planner.js";
import { IdfmPlanner } from "../src/discord/idfm-planner.js";
const road = new IgnRoadPlanner();
const a = (await road.places("Beauvais")).find(p => p.name === "Beauvais");
const b = (await road.places("Amiens")).find(p => p.name === "Amiens");
assert.ok(a && b);
const start = Date.now(), routes = await road.journeys(a,b,Math.floor(Date.now()/1000),"departure");
assert.ok(routes[0]?.road && routes[0].road.distanceMeters > 50000 && routes[0].road.steps.length > 2);
console.log(JSON.stringify({source:"IGN",route:"Beauvais → Amiens",distanceKm:routes[0].road!.distanceMeters/1000,
  minutes:Math.ceil((routes[0].arrival-routes[0].departure)/60),instructions:routes[0].road!.steps.length,requestMs:Date.now()-start}));
const transit = new IdfmPlanner();
const origin = (await transit.places("Dugommier")).find(p => /dugommier/i.test(p.name));
const destination = (await transit.places("Créteil Pointe du Lac")).find(p => /pointe du lac/i.test(p.name));
assert.ok(origin && destination);
const journeys = await transit.journeys(origin,destination,Math.floor(Date.now()/1000),"departure");
assert.ok(journeys.length && journeys[0]!.legs.some(l=>l.kind==="transit"));
assert.ok(!journeys[0]!.road);
console.log(JSON.stringify({source:"IDFM",route:"Dugommier → Pointe du Lac",journeys:journeys.length,
  transitLegs:journeys[0]!.legs.filter(l=>l.kind==="transit").map(l=>l.line)}));
