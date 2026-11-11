import { obj, list } from "./idfm-itinerary.js";
import { WeatherError, type WeatherForecast, type WeatherPlace, type WeatherProvider } from "./weather-types.js";
import { MongoWeatherCache,type WeatherCache } from "./weather-cache.js";
export const WEATHER_SOURCE="https://api.met.no/weatherapi/locationforecast/2.0/documentation";
export const WEATHER_LICENSE="https://creativecommons.org/licenses/by/4.0/";
export interface MetConfiguration { accepted: boolean; contactUrl?: string }
export const metConfiguration = (): MetConfiguration => ({
  accepted: process.env.MET_WEATHER_TERMS_ACCEPTED==="true", contactUrl: process.env.MET_WEATHER_CONTACT_URL,
});
export function metAgent(config: MetConfiguration): string {
  if(!config.accepted||!config.contactUrl)throw new WeatherError("configuration");
  let url: URL;try{url=new URL(config.contactUrl);}catch{throw new WeatherError("configuration");}
  if(url.protocol!=="https:"||url.username||url.password||url.hostname==="localhost"||!url.hostname.includes(".")||config.contactUrl.length>300)
    throw new WeatherError("configuration");
  return `MaximeGPT/1.0 (${url.href})`;
}
export function parseForecast(body: unknown, checked: number, deprecated=false): WeatherForecast {
  const root=obj(body), properties=obj(root.properties), meta=obj(properties.meta), units=obj(meta.units);
  const updated=Date.parse(String(meta.updated_at))/1000, series=list(properties.timeseries);
  if(root.type!=="Feature"||!Number.isFinite(updated)||updated>checked+300||!series.length||series.length>500)throw new WeatherError("invalid");
  const points=series.map(value=>{
    const item=obj(value), at=Date.parse(String(item.time))/1000, data=obj(item.data), instant=obj(obj(data.instant).details);
    if(!Number.isFinite(at))throw new WeatherError("invalid");
    const temperature=instant.air_temperature;
    if(temperature!==undefined&&(units.air_temperature!=="celsius"||typeof temperature!=="number"||!Number.isFinite(temperature)||temperature< -100||temperature>65))
      throw new WeatherError("invalid");
    const precipitation=[1,6,12].flatMap(hours=>{
      const amount=obj(obj(data[`next_${hours}_hours`]).details).precipitation_amount;
      if(amount===undefined)return[];
      if(units.precipitation_amount!=="mm"||typeof amount!=="number"||!Number.isFinite(amount)||amount<0||amount>3000)throw new WeatherError("invalid");
      return[{hours,millimeters:amount}];
    });
    return {at,...(temperature===undefined?{}:{temperature:temperature as number}),precipitation};
  }).sort((a,b)=>a.at-b.at);
  if(points.some((p,i)=>i>0&&p.at===points[i-1]!.at))throw new WeatherError("invalid");
  return {updated,checked,deprecated,points};
}
type Entry={ until:number; forecast?:WeatherForecast; modified?:string; error?:WeatherError };
/** All calls are server-side, coalesced, capped and identified. No forecasts are generated. */
export class MetWeather implements WeatherProvider {
  private pending=new Map<string,Promise<WeatherForecast>>();
  private next=0;
  private suspended=0;
  constructor(private fetcher:typeof fetch=fetch,private now=Date.now,private config=metConfiguration,private store:WeatherCache=new MongoWeatherCache()){}
  async forecast(place:WeatherPlace):Promise<WeatherForecast>{
    const agent=metAgent(this.config());
    if(!Number.isFinite(place.latitude)||!Number.isFinite(place.longitude)||Math.abs(place.latitude)>90||Math.abs(place.longitude)>180)throw new WeatherError("invalid");
    // A kilometre-scale point, not a claim of precision at someone's home.
    const lat=Math.trunc(place.latitude*100)/100,lon=Math.trunc(place.longitude*100)/100,key=`${lat},${lon}`;
    const pending=this.pending.get(key);if(pending)return pending;
    if(this.pending.size>=5)throw new WeatherError("busy");
    const work=this.lookup(key,lat,lon,agent).finally(()=>this.pending.delete(key));
    this.pending.set(key,work);return work;
  }
  private async lookup(key:string,lat:number,lon:number,agent:string):Promise<WeatherForecast>{
    const saved=await this.store.get(key);
    const old=saved?{...saved,...(saved.error?{error:new WeatherError(saved.error)}:{error:undefined})}:undefined,now=this.now();
    if(old&&old.until>now){if(old.error)throw old.error;return old.forecast!;}
    const globalQuota=await this.store.get("quota");
    if(globalQuota&&globalQuota.until>now)throw new WeatherError("quota");
    if(now<this.suspended)throw new WeatherError("quota");
    return this.load(key,lat,lon,agent,old);
  }
  private async load(key:string,lat:number,lon:number,agent:string,old?:Entry):Promise<WeatherForecast>{
    if(!await this.store.acquire(key,this.now()))throw new WeatherError("busy");
    const save=async(entry:Entry)=>{
      await this.store.put(key,{until:entry.until,...(entry.forecast?{forecast:entry.forecast}:{}),
        ...(entry.modified?{modified:entry.modified}:{}),...(entry.error?{error:entry.error.code}:{})});
    };
    const wait=Math.max(0,this.next-Date.now());this.next=Math.max(this.next,Date.now())+250;
    if(wait)await new Promise(resolve=>setTimeout(resolve,wait));
    let response:Response|undefined;
    try{
      let url=new URL("https://api.met.no/weatherapi/locationforecast/2.0/compact");url.searchParams.set("lat",String(lat));url.searchParams.set("lon",String(lon));
      const signal=AbortSignal.timeout(9000);
      for(let i=0;i<3;i++){
        response=await this.fetcher(url,{redirect:"manual",signal,headers:{accept:"application/json","accept-encoding":"gzip, deflate","user-agent":agent,
          ...(old?.modified?{"if-modified-since":old.modified}:{})}});
        if(![301,302,303,307,308].includes(response.status))break;
        const location=response.headers.get("location");await response.body?.cancel();
        if(!location)throw new WeatherError("invalid");
        url=new URL(location,url);
        if(url.protocol!=="https:"||url.hostname!=="api.met.no"||url.username||url.password||url.port||!url.pathname.startsWith("/weatherapi/locationforecast/"))
          throw new WeatherError("invalid");
        response=undefined;
      }
      if(!response)throw new WeatherError("unavailable");
      const until=Math.max(this.now()+3*3600_000,Date.parse(response.headers.get("expires")??"")||0);
      if(response.status===304&&old?.forecast){
        const forecast={...old.forecast,checked:this.now()/1000};
        await save({...old,until,forecast});return forecast;
      }
      if(response.status===429){
        const retry=response.headers.get("retry-after")??"";
        this.suspended=Math.max(this.now()+60_000,/^\d+$/.test(retry)?this.now()+Number(retry)*1000:Date.parse(retry)||0);
        await this.store.put("quota",{until:this.suspended,error:"quota"});
        throw new WeatherError("quota");
      }
      if(!response.ok)throw new WeatherError("unavailable");
      if(Number(response.headers.get("content-length"))>1_000_000)throw new WeatherError("invalid");
      const reader=response.body?.getReader();if(!reader)throw new WeatherError("invalid");
      const chunks:Uint8Array[]=[];let size=0;
      try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>1_000_000)throw new WeatherError("invalid");chunks.push(part.value);}}
      finally{await reader.cancel().catch(()=>undefined);reader.releaseLock();}
      const body:unknown=JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const coords=list(obj(obj(body).geometry).coordinates);
      if(obj(obj(body).geometry).type!=="Point"||typeof coords[0]!=="number"||typeof coords[1]!=="number"||
        Math.abs(coords[0]-lon)>.02||Math.abs(coords[1]-lat)>.02)throw new WeatherError("invalid");
      const forecast=parseForecast(body,this.now()/1000,response.status===203);
      const modified=response.headers.get("last-modified")??undefined;
      await save({forecast,until,...(modified&&Number.isFinite(Date.parse(modified))?{modified}:{})});return forecast;
    }catch(error){
      await response?.body?.cancel().catch(()=>undefined);
      const reason=error instanceof WeatherError?error:new WeatherError("unavailable");
      await save({until:this.now()+3*3600_000,error:reason});throw reason;
    }
  }
}
