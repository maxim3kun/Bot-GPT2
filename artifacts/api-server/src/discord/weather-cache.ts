import type { WeatherForecast,WeatherFailure } from "./weather-types.js";
export interface WeatherCacheEntry {until:number;forecast?:WeatherForecast;modified?:string;error?:WeatherFailure}
export interface WeatherCache {
  get(key:string):Promise<WeatherCacheEntry|undefined>;
  acquire(key:string,now:number):Promise<boolean>;
  put(key:string,entry:WeatherCacheEntry):Promise<void>;
}
export const weatherCachePurge=(until:number,now=Date.now())=>
  new Date(Math.min(8.64e15,Math.max(now+48*3600_000,until+3600_000)));
/** Shared across bot processes and restarts; public model data, no participant/address history. */
export class MongoWeatherCache implements WeatherCache {
  private ready?:Promise<unknown>;
  private async collection(){
    const {getWeatherCacheCollection}=await import("../lib/db.js");
    const collection=getWeatherCacheCollection<WeatherCacheEntry&{_id:string;purgeAt:Date}>();
    if(!collection)throw Error("Weather cache unavailable");
    this.ready??=collection.createIndex({purgeAt:1},{expireAfterSeconds:0}).catch(error=>{this.ready=undefined;throw error;});
    await this.ready;return collection;
  }
  async get(key:string){const row=await(await this.collection()).findOne({_id:key});return row??undefined;}
  async acquire(key:string,now:number){
    try{
      const result=await(await this.collection()).updateOne({_id:key,until:{$lte:now}},
        {$set:{until:now+3*3600_000,error:"busy",purgeAt:new Date(now+48*3600_000)}},{upsert:true});
      return result.modifiedCount===1||result.upsertedCount===1;
    }catch(error){if((error as {code?:number}).code===11000)return false;throw error;}
  }
  async put(key:string,entry:WeatherCacheEntry){
    await(await this.collection()).replaceOne({_id:key},{...entry,purgeAt:weatherCachePurge(entry.until)},{upsert:true});
  }
}
/** Explicitly injected by offline tests; production always uses the shared cache. */
export class MemoryWeatherCache implements WeatherCache {
  values=new Map<string,WeatherCacheEntry>();
  async get(key:string){return this.values.get(key);}
  async acquire(key:string,now:number){if((this.values.get(key)?.until??0)>now)return false;this.values.set(key,{until:now+3*3600_000,error:"busy"});return true;}
  async put(key:string,entry:WeatherCacheEntry){this.values.set(key,entry);}
}
