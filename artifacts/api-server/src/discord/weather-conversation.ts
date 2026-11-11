import { display,placeKey } from "./idfm-itinerary.js";
import { weatherPeriod } from "./weather-intent.js";
import { WeatherPlaces,weatherPlace } from "./weather-places.js";
import { MetWeather } from "./met-weather.js";
import { formatWeather } from "./weather-presentation.js";
import { WeatherError,type WeatherPlace,type WeatherRequest,type WeatherProvider } from "./weather-types.js";
import type { OfficialPlace } from "./transport-planner-types.js";
import { weatherWords } from "./weather-language.js";
interface Pending { request:WeatherRequest; place?:WeatherPlace; choices?:WeatherPlace[]; need?:"place"|"time"; arrival?:number; expires:number; promptId?:string }
export interface WeatherReply { content:string|null; question:boolean }
export type WeatherDestination = {place:OfficialPlace;arrival:number}|null;
const key=(s:string)=>placeKey(s).replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
export class WeatherConversation {
  private pending=new Map<string,Pending>();
  constructor(private provider:WeatherProvider=new MetWeather(),private places:Pick<WeatherPlaces,"places">=new WeatherPlaces(),private now=Date.now){}
  clear(scope:string){this.pending.delete(scope);}
  private get(scope:string){for(const[k,p]of this.pending)if(p.expires<=this.now())this.pending.delete(k);return this.pending.get(scope);}
  expects(scope:string,reference?:string|null){const p=this.get(scope);return !!p&&!!p.promptId&&(!!p.need||!!p.choices)&&reference===p.promptId;}
  bind(scope:string,promptId:string){const p=this.get(scope);if(p&&(p.need||p.choices))p.promptId=promptId;}
  needsDestination(scope:string,request?:WeatherRequest){return (request??this.get(scope)?.request)?.atDestination===true;}
  async reply(scope:string,input:string,language:string,request?:WeatherRequest,destination:WeatherDestination=null):Promise<WeatherReply>{
    const words=weatherWords(language),previous=this.get(scope);
    const state:Pending=request?{request:{...request},expires:this.now()+5*60_000}:previous?{...previous,request:{...previous.request}}:{request:{},expires:this.now()+5*60_000};
    const answer=(content:string,question=false):WeatherReply=>({content:this.get(scope)===state?content:null,question});
    if(this.pending.size>=1000&&!this.pending.has(scope))this.pending.delete(this.pending.keys().next().value!);
    this.pending.set(scope,state);
    if(/^(?:stop|annule|annuler|cancel)$/i.test(input.trim())){this.clear(scope);return {content:words.closed,question:false};}
    try{
      if(!request){
        if(state.need==="time")state.request.when=input.trim();
        else if(state.choices){
          const number=/^\d+$/.test(input.trim())?Number(input)-1:-1;
          const matches=number>=0?state.choices[number]?[state.choices[number]!]:[]:state.choices.filter(p=>key(p.label)===key(input)||key(p.name)===key(input));
          if(matches.length===1){state.place=matches[0];state.choices=undefined;}
          else if(number>=0)return answer(this.choose(state.choices,language),true);
          else{state.request.place=input.trim();state.choices=undefined;state.place=undefined;}
        }else if(state.need==="place"){state.request.place=input.trim();state.request.atDestination=false;}
      }
      state.need=undefined;
      if(state.request.atDestination){
        if(!destination){state.need="place";return answer(words.noDestination,true);}
        state.place=weatherPlace(destination.place);state.arrival=destination.arrival;
      }
      if(!state.place){
        if(!state.request.place){state.need="place";return answer(words.which,true);}
        const candidates=await this.places.places(state.request.place,state.request.territory);
        if(this.get(scope)!==state)return{content:null,question:false};
        if(!candidates.length){state.need="place";return answer(words.noPlace,true);}
        const tokens=key(state.request.place).split(" ").filter(x=>!["de","du","la","le","les"].includes(x));
        const exact=candidates.filter(p=>tokens.length&&tokens.every(token=>key(p.label).split(" ").includes(token)));
        if(exact.length!==1){state.choices=(exact.length?exact:candidates).slice(0,10);return answer(this.choose(state.choices,language),true);}
        state.place=exact[0];
      }
      let period;
      try{period=weatherPeriod(state.request.when,state.place!.timezone,this.now()/1000,state.arrival);}
      catch{state.need="time";return answer(words.date,true);}
      if(period.start>this.now()/1000+10*86400)throw new WeatherError("horizon");
      const forecast=await this.provider.forecast(state.place!);
      if(this.get(scope)!==state)return{content:null,question:false};
      return answer(formatWeather(state.place!,period,forecast,this.now()/1000,language));
    }catch(error){
      const code=error instanceof WeatherError?error.code:"unavailable";
      return answer(words[code]);
    }
  }
  private choose(places:WeatherPlace[],language:string){return weatherWords(language).choose+"\n"+places.map((p,i)=>`${i+1}. ${display(p.label)}`).join("\n");}
}
