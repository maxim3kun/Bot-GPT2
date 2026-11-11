/** Manual, opt-in check. Requires the owner's actual MET terms acceptance and contact configuration. */
import { connectDb } from "../src/lib/db.js";
import { MetWeather,metAgent,metConfiguration } from "../src/discord/met-weather.js";
import { WeatherPlaces } from "../src/discord/weather-places.js";
import { weatherPeriod } from "../src/discord/weather-intent.js";
import { formatWeather } from "../src/discord/weather-presentation.js";
async function main(){
  metAgent(metConfiguration()); // Fail before even connecting unless configured by the owner.
  await connectDb();
  let requests=0;
  const fetcher:typeof fetch=async(...args)=>{requests++;return fetch(...args);};
  const provider=new MetWeather(fetcher),places=new WeatherPlaces();
  for(const [query,territory]of [["Beauvais","fr"],["Montréal","qc"]]as const){
    const candidates=await places.places(query,territory);
    const exact=candidates.filter(p=>p.name.localeCompare(query,undefined,{sensitivity:"base"})===0);
    if(exact.length!==1)throw Error("Live check requires a uniquely confirmed municipality");
    const place=exact[0]!,forecast=await provider.forecast(place),now=Date.now()/1000;
    console.log(formatWeather(place,weatherPeriod("demain",place.timezone,now),forecast,now,"fr"));
    // A fresh client must reuse the shared model cache, including across process restarts.
    const before=requests;
    await new MetWeather(fetcher).forecast(place);
    if(requests!==before)throw Error("Shared weather cache was not reused");
  }
  console.log(JSON.stringify({verified:true,sourceRequests:requests,sharedCacheReused:true}));
}
main().then(()=>process.exit(0)).catch(error=>{
  console.error(error instanceof Error?error.message:"Live weather verification failed");process.exit(1);
});
