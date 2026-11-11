import test from "node:test";
import assert from "node:assert/strict";
import { MetWeather,parseForecast,metAgent } from "../src/discord/met-weather.js";
import { MemoryWeatherCache,weatherCachePurge } from "../src/discord/weather-cache.js";
import { WeatherConversation } from "../src/discord/weather-conversation.js";
import { createWeatherDialogue,handleWeatherCommand } from "../src/discord/weather-dialogue.js";
import { weatherTurn,weatherPeriod,weatherEpoch } from "../src/discord/weather-intent.js";
import { weatherPlace,WeatherPlaces } from "../src/discord/weather-places.js";
import { formatWeather } from "../src/discord/weather-presentation.js";
import { WeatherError,type WeatherProvider,type WeatherPlace } from "../src/discord/weather-types.js";
import { parseAiCommandTool } from "../src/discord/ai-command-tools.js";
import { selectAiCommand } from "../src/discord/ai-command-intent.js";
import { TransportConversation } from "../src/discord/transport-conversation.js";
import { travelScope } from "../src/discord/transport-dialogue.js";
import { fakeDiscord } from "./fixtures/transport-discord.js";
const NOW=Date.UTC(2026,10,11,12);
const place:WeatherPlace={id:"60057",name:"Beauvais",label:"Beauvais · 60 Oise · France",latitude:49.430123,longitude:2.080111,timezone:"Europe/Paris"};
const config=()=>({accepted:true,contactUrl:"https://example.test/mock-only-contact"});
function body(lat=49.43,lon=2.08){
  return {type:"Feature",geometry:{type:"Point",coordinates:[lon,lat,0]},properties:{meta:{updated_at:new Date(NOW-3600_000).toISOString(),
    units:{air_temperature:"celsius",precipitation_amount:"mm"}},timeseries:Array.from({length:100},(_,i)=>({
      time:new Date(NOW+i*3600_000).toISOString(),data:{instant:{details:{air_temperature:10+i%3}},
        next_1_hours:{details:{precipitation_amount:.1}},next_6_hours:{details:{precipitation_amount:.6}},next_12_hours:{details:{precipitation_amount:1.2}}}
    }))}};
}
function setup(){
  let forecasts=0,lookups=0;
  const provider:WeatherProvider={forecast:async()=>{forecasts++;return parseForecast(body(),NOW/1000);}};
  const places={places:async()=>{lookups++;return[place];}};
  return {provider,places,service:new WeatherConversation(provider,places,()=>NOW),get forecasts(){return forecasts;},get lookups(){return lookups;}};
}
test("natural and explicit weather grammar preserve the town and date without intercepting music",()=>{
  assert.deepEqual(weatherTurn("Quelle météo à Beauvais demain ?"),{place:"Beauvais",when:"demain"});
  assert.deepEqual(weatherTurn("Météo Beauvais demain"),{place:"Beauvais",when:"demain"});
  assert.deepEqual(weatherTurn("Météo Laval Québec demain"),{place:"Laval",territory:"qc",when:"demain"});
  assert.deepEqual(weatherTurn("Weather in Beauvais tomorrow at 14:00"),{place:"Beauvais",when:"tomorrow à 14:00"});
  assert.equal(weatherTurn("Joue Weather Report sur YouTube"),null);
  assert.equal(weatherTurn("Explique la météo"),null);
  const selected=selectAiCommand("Quelle météo à Beauvais demain ?",{});assert.equal(selected.kind,"action");
  if(selected.kind==="action")assert.equal(selected.action.name,"get_weather");
});
test("weather tools reject coordinates, URLs, identities, conflicting places and arbitrary fields",()=>{
  const parse=(args:object)=>parseAiCommandTool([{type:"function",function:{name:"get_weather",arguments:JSON.stringify(args)}}],[]);
  assert.deepEqual(parse({place:"Beauvais",when:"demain"}),{name:"get_weather",place:"Beauvais",when:"demain"});
  for(const args of [{latitude:49},{url:"https://evil.test"},{place:"https://evil.test"},{userId:"other"},{place:"<@123>"},{territory:"world"},{place:"Beauvais",atDestination:true}])
    assert.equal(parse(args),null);
});
test("civil periods use the place timezone, not the server date, and account for DST day length",()=>{
  const nearMidnight=Date.UTC(2026,10,11,23,30)/1000;
  assert.equal(new Date(weatherPeriod("tomorrow","Europe/Paris",nearMidnight).start*1000).toISOString(),"2026-11-12T23:00:00.000Z");
  assert.equal(new Date(weatherPeriod("tomorrow","America/Toronto",nearMidnight).start*1000).toISOString(),"2026-11-12T05:00:00.000Z");
  const spring=weatherPeriod("2027-03-28","Europe/Paris",NOW/1000);assert.equal(spring.end-spring.start,23*3600);
  const autumn=weatherPeriod("2027-10-31","Europe/Paris",NOW/1000);assert.equal(autumn.end-autumn.start,25*3600);
});
test("French and ISO date-only requests keep a whole local day through native and natural handlers",async()=>{
  for(const date of ["15/11/2026","2026-11-15"]){
    for(const text of [`Météo Beauvais ${date}`,`Quelle météo à Beauvais le ${date} ?`]){
      const request=weatherTurn(text)!;
      assert.equal(request.place,"Beauvais");assert.equal(request.when,date);
      const period=weatherPeriod(request.when,place.timezone,NOW/1000);assert.equal(period.end-period.start,24*3600);
      const s=setup(),d=fakeDiscord();
      await createWeatherDialogue(s.service,async()=>true,()=>null)(d.message,text,"fr");
      assert.match(d.replies[0]!.content!,/15\/11 00:00 → 16\/11 00:00/);
      assert.equal(s.forecasts,1);
    }
    const native=setup(),d=fakeDiscord();
    await handleWeatherCommand(d.message,["Beauvais",date],"fr",createWeatherDialogue(native.service,async()=>true,()=>null));
    assert.match(d.replies[0]!.content!,/15\/11 00:00 → 16\/11 00:00/);
  }
});
test("an explicitly marked clock after a complete date changes the period without replacing the town",async()=>{
  for(const date of ["15/11/2026","2026-11-15"]){
    const text=`Météo Beauvais le ${date} à 14:00`,request=weatherTurn(text)!;
    assert.equal(request.place,"Beauvais");assert.equal(request.when,`${date} à 14:00`);
    const s=setup(),d=fakeDiscord();
    await createWeatherDialogue(s.service,async()=>true,()=>null)(d.message,text,"fr");
    assert.match(d.replies[0]!.content!,/15\/11 14:00 → 15\/11 15:00/);assert.equal(s.forecasts,1);
  }
});
test("bad dates, past times, non-existent and ambiguous DST hours are not silently normalized",()=>{
  for(const when of ["2026-02-31","2025-01-01","tomorrow at 25:00","tomorrow at 14:3","date à préciser"])
    assert.throws(()=>weatherPeriod(when,"Europe/Paris",NOW/1000));
  assert.throws(()=>weatherEpoch("2027-03-28",2,30,"Europe/Paris"));
  assert.throws(()=>weatherEpoch("2027-10-31",2,30,"Europe/Paris"));
});
test("today and the day after tomorrow are not confused with the French clock prefix",()=>{
  assert.equal(weatherPeriod("aujourd'hui",place.timezone,NOW/1000).start,NOW/1000);
  assert.equal(new Date(weatherPeriod("après-demain",place.timezone,NOW/1000).start*1000).toISOString(),"2026-11-12T23:00:00.000Z");
  assert.equal(weatherPeriod("demain à14h",place.timezone,NOW/1000).end-weatherPeriod("demain à14h",place.timezone,NOW/1000).start,3600);
});
test("timezones are resolved from coordinates, including Québec's different clock areas",()=>{
  for(const [lat,lon,tz]of [[45.5,-73.6,"America/Toronto"],[51.43,-57.13,"America/Blanc-Sablon"],[47.4,-61.8,"America/Halifax"],[50.19,-61.82,"America/Toronto"]]as const){
    const city=weatherPlace({id:"qc:test",ids:["qc:test"],name:"Town",label:lon===-61.82?"Natashquan — Minganie; Côte-Nord · Québec":"Town · Québec",latitude:lat,longitude:lon});
    assert.equal(city.timezone,tz);
  }
});
test("Québec's legal Atlantic DST exception for Listuguj overrides the general regional polygon",()=>{
  assert.equal(weatherPlace({id:"qc:listuguj",ids:["qc:listuguj"],name:"Listuguj",label:"Listuguj · Québec",latitude:48.02,longitude:-66.70}).timezone,"America/Halifax");
});
test("daily precipitation uses disjoint intervals and does not double-count 1/6/12 hour totals",()=>{
  const forecast=parseForecast(body(),NOW/1000),period=weatherPeriod("demain",place.timezone,NOW/1000);
  const text=formatWeather(place,period,forecast,NOW/1000,"fr");
  assert.match(text,/2,4 mm · 24 h couvertes/);assert.match(text,/MET Norway/);assert.match(text,/CC BY 4.0/);assert.match(text,/Modèle actualisé/);
  assert.ok(text.length<1200);assert.doesNotMatch(text,/temps réel/);
});
test("missing variables stay missing, partial periods are disclosed, and wrong units are rejected",()=>{
  const data=body();data.properties.timeseries.forEach(p=>{p.data.instant.details={}as never;p.data.next_1_hours.details={}as never;p.data.next_6_hours.details={}as never;p.data.next_12_hours.details={}as never;});
  const text=formatWeather(place,weatherPeriod("demain",place.timezone,NOW/1000),parseForecast(data,NOW/1000),NOW/1000,"fr");
  assert.match(text,/non communiquée/);assert.match(text,/non communiquées/);assert.doesNotMatch(text,/\*\*0 mm/);
  const bad=body();bad.properties.meta.units.air_temperature="kelvin";assert.throws(()=>parseForecast(bad,NOW/1000),WeatherError);
});
test("expired forecasts and dates beyond actual source horizon are honest failures",()=>{
  const forecast=parseForecast(body(),NOW/1000);
  assert.throws(()=>formatWeather(place,weatherPeriod("20/11/2026",place.timezone,NOW/1000),forecast,NOW/1000,"fr"),e=>e instanceof WeatherError&&e.code==="horizon");
  assert.throws(()=>formatWeather(place,weatherPeriod("demain",place.timezone,NOW/1000),{...forecast,updated:NOW/1000-13*3600},NOW/1000,"fr"),e=>e instanceof WeatherError&&e.code==="stale");
});
test("the provider is never contacted without human terms approval and a real configured identity",async()=>{
  let calls=0;
  for(const settings of [{accepted:false,contactUrl:"https://example.test"}, {accepted:true}, {accepted:true,contactUrl:"http://localhost"}]){
    const client=new MetWeather(async()=>{calls++;return Response.json(body());},()=>NOW,()=>settings,new MemoryWeatherCache());
    await assert.rejects(client.forecast(place),e=>e instanceof WeatherError&&e.code==="configuration");
  }
  assert.equal(calls,0);assert.match(metAgent(config()),/^MaximeGPT\/1\.0/);
});
test("cache persists across clients, coalesces callers and respects the longer three-hour floor",async()=>{
  let now=NOW,calls=0;const store=new MemoryWeatherCache(),fetcher=async()=>{calls++;return Response.json(body(),{headers:{expires:new Date(now+60_000).toUTCString(),"last-modified":new Date(NOW-3600_000).toUTCString()}});};
  const a=new MetWeather(fetcher,()=>now,config,store);
  await Promise.all([a.forecast(place),a.forecast(place)]);assert.equal(calls,1);
  now+=2*3600_000;await new MetWeather(fetcher,()=>now,config,store).forecast(place);assert.equal(calls,1);
  assert.equal(store.values.get("49.43,2.08")!.until,NOW+3*3600_000);
});
test("Expires and If-Modified-Since are honoured and 304 retains the original model freshness",async()=>{
  let now=NOW,calls=0,conditional:string|undefined;
  const modified=new Date(NOW-3600_000).toUTCString(),store=new MemoryWeatherCache();
  const client=new MetWeather(async(_u,init)=>{
    calls++;conditional=(init?.headers as Record<string,string>)["if-modified-since"];
    return calls===1?Response.json(body(),{headers:{expires:new Date(NOW+4*3600_000).toUTCString(),"last-modified":modified}})
      :new Response(null,{status:304,headers:{expires:new Date(now+5*3600_000).toUTCString()}});
  },()=>now,config,store);
  const first=await client.forecast(place);now+=3*3600_000;await client.forecast(place);assert.equal(calls,1);
  now+=3600_001;const next=await client.forecast(place);assert.equal(calls,2);assert.equal(conditional,modified);assert.equal(next.updated,first.updated);assert.ok(next.checked>first.checked);
});
test("database cleanup cannot delete a forecast before a long provider Expires deadline",()=>{
  const until=NOW+7*86400_000;
  assert.ok(weatherCachePurge(until,NOW).getTime()>until);
  assert.equal(weatherCachePurge(NOW+3*3600_000,NOW).getTime(),NOW+48*3600_000);
});
test("request coordinates are bounded and kilometre-scale, not addresses; redirects stay on the provider",async()=>{
  let requested:URL|undefined;
  const client=new MetWeather(async input=>{requested=new URL(String(input));return Response.json(body());},()=>NOW,config,new MemoryWeatherCache());
  await client.forecast(place);assert.equal(requested!.hostname,"api.met.no");assert.equal(requested!.searchParams.get("lat"),"49.43");
  const redirect=new MetWeather(async()=>new Response(null,{status:302,headers:{location:"https://evil.test/steal"}}),()=>NOW,config,new MemoryWeatherCache());
  await assert.rejects(redirect.forecast(place),WeatherError);
});
test("quota is shared across clients and errors do not create invented weather",async()=>{
  let calls=0;const store=new MemoryWeatherCache();
  const limited=new MetWeather(async()=>{calls++;return new Response(null,{status:429,headers:{"retry-after":"300"}});},()=>NOW,config,store);
  await assert.rejects(limited.forecast(place),WeatherError);
  await assert.rejects(new MetWeather(async()=>{calls++;return Response.json(body());},()=>NOW,config,store).forecast({...place,latitude:50}),WeatherError);
  assert.equal(calls,1);
  for(const fetcher of [async()=>new Response("broken"),async()=>new Response(null,{status:503}),async()=>Response.json(body(),{headers:{"content-length":"2000000"}})]){
    await assert.rejects(new MetWeather(fetcher,()=>NOW,config,new MemoryWeatherCache()).forecast(place),WeatherError);
  }
});
test("a response for another coordinate cannot be attributed to the requested city",async()=>{
  const client=new MetWeather(async()=>Response.json(body(45,-70)),()=>NOW,config,new MemoryWeatherCache());
  await assert.rejects(client.forecast(place),e=>e instanceof WeatherError&&e.code==="invalid");
});
test("homonymous towns require an explicit choice; nobody else's reply consumes that choice",async()=>{
  const s=setup();s.places.places=async()=>[place,{...place,id:"qc:other",label:"Beauvais · Québec",longitude:-73,latitude:45,timezone:"America/Toronto"}];
  const question=await s.service.reply("a","","fr",{place:"Beauvais",when:"demain"});assert.ok(question.question);assert.equal(s.forecasts,0);
  s.service.bind("a","prompt");assert.equal(s.service.expects("b","prompt"),false);
  assert.equal(s.service.expects("a","prompt"),true);
  await s.service.reply("a","2","fr");assert.equal(s.forecasts,1);
});
test("failed territory lookup is not hidden behind a similarly named town in the other territory",async()=>{
  const places=new WeatherPlaces({municipalities:async()=>[place]}as never,{municipalities:async()=>{throw Error("QC down");}}as never);
  await assert.rejects(places.places("Beauvais"));assert.equal((await places.places("Beauvais","fr")).length,1);
});
test("native and natural requests have the same short response and honour all six display languages",async()=>{
  const a=setup(),b=setup(),da=fakeDiscord(),db=fakeDiscord();
  await handleWeatherCommand(da.message,["Beauvais","demain"],"fr",createWeatherDialogue(a.service,async()=>true,()=>null));
  await createWeatherDialogue(b.service,async()=>true,()=>null)(db.message,"Quelle météo à Beauvais demain ?","fr");
  assert.deepEqual(da.replies,db.replies);assert.match(da.replies[0]!.content!,/Prévisions météo/);
  for(const [language,title]of [["en","Weather forecast"],["es","Previsión meteorológica"],["de","Wettervorhersage"],["pt","Previsão meteorológica"],["it","Previsioni meteo"]]){
    assert.match((await setup().service.reply(language,"",language,{place:"Beauvais",when:"demain"})).content!,new RegExp(title!));
  }
});
test("destination weather reads only explicitly requested, same-user same-channel same-persona route context",async()=>{
  const s=setup(),d=fakeDiscord();let reads=0;
  const handle=createWeatherDialogue(s.service,async()=>true,(message,persona)=>{
    reads++;return message.author.id==="u"&&persona==="p"?{place:{...place,ids:[place.id]},arrival:NOW/1000+7200}:null;
  });
  await handle(d.message,"Météo à destination","fr",{personaId:"p"});assert.match(d.replies[0]!.content!,/Arrivée du trajet/);assert.equal(s.lookups,0);
  const other=fakeDiscord({userId:"another"});await handle(other.message,"Météo à destination","fr",{personaId:"p"});assert.match(other.replies[0]!.content!,/pas de destination/);assert.equal(s.forecasts,1);
  const generic=fakeDiscord();await handle(generic.message,"Météo Beauvais demain","fr");assert.equal(reads,2);
});
test("authorization before work and after provider completion prevents denied or revoked weather responses",async()=>{
  const denied=setup(),d=fakeDiscord();
  await createWeatherDialogue(denied.service,async()=>false,()=>null)(d.message,"Météo Beauvais demain","fr");assert.equal(denied.forecasts+denied.lookups,0);
  const revoked=setup(),r=fakeDiscord();let allowed=true;
  revoked.provider.forecast=async()=>{allowed=false;return parseForecast(body(),NOW/1000);};
  await createWeatherDialogue(revoked.service,async()=>allowed,()=>null)(r.message,"Météo Beauvais demain","fr");assert.equal(r.replies.length,0);
});
test("ambient messages, quoted requests and multi-action requests do not launch a forecast",async()=>{
  const s=setup(),handle=createWeatherDialogue(s.service,async()=>true,()=>null);
  for(const text of ['"Quelle météo à Beauvais demain ?"',"Quelle météo à Beauvais demain et joue NRJ"]){
    await handle(fakeDiscord().message,text,"fr");
  }
  await handle(fakeDiscord().message,"Météo Beauvais demain","fr",{continuationOnly:true});
  assert.equal(s.forecasts+s.lookups,0);
});
test("a verified journey exposes weather context only in its original unexpired scope",async()=>{
  let now=NOW;const origin={...place,id:"from",ids:["from"]},destination={...place,id:"to",ids:["to"],name:"Amiens",label:"Amiens"};
  const travel=new TransportConversation({places:async q=>q==="Beauvais"?[origin]:[destination],journeys:async()=>[{
    departure:NOW/1000,arrival:NOW/1000+3600,legs:[],warning:false}],stations:async()=>({line:"8",count:38})},()=>now);
  const d=fakeDiscord(),scope=travelScope(d.message,"p");
  await travel.reply(scope,"Trajet de Beauvais à Amiens en transports","fr");
  // Outside-IDFM journeys are deliberately rejected; use a verified official pair for this context test.
  const verified=new TransportConversation({places:async q=>q==="Dugommier"?[origin]:[destination],journeys:async()=>[{
    departure:NOW/1000,arrival:NOW/1000+3600,legs:[],warning:false}],stations:async()=>({line:"8",count:38})},()=>now);
  origin.name=origin.label="Dugommier";destination.name=destination.label="Daumesnil";
  await verified.reply(scope,"Trajet de Dugommier à Daumesnil en transports","fr");
  assert.equal(verified.verifiedWeatherDestination(scope)!.arrival,NOW/1000+3600);
  assert.equal(verified.verifiedWeatherDestination(travelScope(d.message,"other")),null);
  for(const message of [{...d.message,guildId:"other-guild"},{...d.message,channelId:"other-channel"},
    {...d.message,author:{...d.message.author,id:"other-user"}}])
    assert.equal(verified.verifiedWeatherDestination(travelScope(message as never,"p")),null);
  now+=5*60_000+1;assert.equal(verified.verifiedWeatherDestination(scope),null);
});
