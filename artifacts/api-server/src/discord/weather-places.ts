import { find, setCache } from "geo-tz/all";
import { FranceTransportClient } from "./public-transport.js";
import { QuebecTransportClient } from "./quebec-transport.js";
import { TransportMetadataCache } from "./transport-metadata-cache.js";
import { queueMobilityGeocode } from "./mobility-database-transport.js";
import { metAgent, metConfiguration } from "./met-weather.js";
import type { WeatherPlace } from "./weather-types.js";
import type { OfficialPlace } from "./transport-planner-types.js";
import type { MetadataKey } from "./transport-metadata-cache.js";
class ZoneCache extends Map {
  override set(key:unknown,value:unknown){
    if(!this.has(key)&&this.size>=24)this.delete(this.keys().next().value);
    return super.set(key,value);
  }
}
setCache({store:new ZoneCache()});
export function weatherPlace(place: OfficialPlace): WeatherPlace {
  const {latitude,longitude}=place;
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude!)>90||Math.abs(longitude!)>180) throw Error("coordinates");
  const zones=find(latitude!,longitude!);
  if(zones.length!==1)throw Error("Unconfirmed timezone at boundary");
  let timezone=zones[0]!;
  // Québec Legal Time Act, sections 1–2: the whole Minganie MRC uses Eastern time,
  // and Listuguj uses Atlantic DST. Some geographic timezone polygons miss these exceptions.
  // https://www.legisquebec.gouv.qc.ca/fr/document/lc/T-5.1?langCont=en
  if(place.id.startsWith("qc:")){
    const parts=place.label.split(/[—;·,]/).map(s=>s.trim().toLowerCase());
    if(parts.includes("minganie"))timezone="America/Toronto";
    if(/^listuguj(?:\b|$)/i.test(place.name))timezone="America/Halifax";
  }
  new Intl.DateTimeFormat("en",{timeZone:timezone}).format(0);
  return {...place,latitude:latitude!,longitude:longitude!,timezone};
}

interface GlobalWeatherGeocoder {
  places(query:string):Promise<OfficialPlace[]>;
}
interface OSMPlaceResult {
  place_id?:unknown; lat?:unknown; lon?:unknown; name?:unknown; type?:unknown; class?:unknown; category?:unknown; addresstype?:unknown;
  address?:{city?:unknown;town?:unknown;village?:unknown;municipality?:unknown;state?:unknown;county?:unknown;country?:unknown;country_code?:unknown};
}
const DAY=24*60*60_000;
const normalizePlace=(value:string)=>value.normalize("NFD").replace(/\p{Diacritic}/gu,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
let pendingGeocodes:Promise<unknown>=Promise.resolve();
export class NominatimWeatherGeocoder implements GlobalWeatherGeocoder {
  constructor(
    private readonly cache=new TransportMetadataCache(),
    private readonly fetcher:typeof fetch=fetch,
    private readonly agent=()=>metAgent(metConfiguration()),
  ){}
  places(query:string):Promise<OfficialPlace[]>{
    const normalized=normalizePlace(query);
    if(normalized.length<2||normalized.length>120)return Promise.resolve([]);
    const key:MetadataKey={territory:"global",provider:"nominatim",kind:"locations",
      source:`weather-cities:${normalized}`,version:"weather-city-search-v1"};
    return this.cache.get(key,DAY,()=>this.search(query,normalized));
  }
  private search(query:string,normalized:string):Promise<OfficialPlace[]>{
    const work=pendingGeocodes.catch(()=>undefined).then(()=>queueMobilityGeocode(async()=>{
      const url=new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q",query.trim());
      url.searchParams.set("format","jsonv2");
      url.searchParams.set("addressdetails","1");
      url.searchParams.set("limit","10");
      let response:Response;
      try{
        response=await this.fetcher(url,{redirect:"manual",signal:AbortSignal.timeout(8_000),
          headers:{accept:"application/json","user-agent":this.agent()}});
      }catch{throw new Error("Global weather geocoding failed");}
      if(!response.ok||response.status>=300)throw new Error("Global weather geocoding unavailable");
      const raw=await response.text();
      if(raw.length>1_000_000)throw new Error("Global weather geocoding response too large");
      let body:unknown;
      try{body=JSON.parse(raw);}catch{throw new Error("Invalid global weather geocoding response");}
      if(!Array.isArray(body))throw new Error("Invalid global weather geocoding list");
      return (body as OSMPlaceResult[]).flatMap(result=>{
        const type=String(result.type),category=result.class??result.category;
        const settlement=["city","town","village","municipality"].includes(type);
        const administrativeSettlement=category==="boundary"&&type==="administrative"&&
          ["city","town","village","municipality"].includes(String(result.addresstype));
        if(!(category==="place"&&settlement)&&!administrativeSettlement)return[];
        const address=result.address??{};
        const name=[address.city,address.town,address.village,address.municipality,result.name]
          .find(value=>typeof value==="string"&&value.trim()) as string|undefined;
        const country=typeof address.country==="string"?address.country.trim():"";
        const code=typeof address.country_code==="string"?address.country_code.toUpperCase():"";
        const latitude=Number(result.lat),longitude=Number(result.lon),id=String(result.place_id??"");
        if(!name||!country||!/^[A-Z]{2}$/.test(code)||!/^\d+$/.test(id)||
          !Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180)return[];
        const searchable=normalizePlace([name,address.state,address.county,country].filter(v=>typeof v==="string").join(" "));
        if(!normalized.split(" ").every(token=>searchable.split(" ").includes(token)))return[];
        const region=[address.state,address.county].find(value=>typeof value==="string"&&value.trim());
        const label=[name,region,country].filter((value,index,array):value is string=>
          typeof value==="string"&&value.trim().length>0&&array.findIndex(other=>
            typeof other==="string"&&normalizePlace(other)===normalizePlace(value))===index).join(" · ");
        return[{id:`osm:${id}`,name,label,ids:[`osm:${id}`],latitude,longitude}];
      }).slice(0,10);
    }));
    pendingGeocodes=work.catch(()=>undefined);
    return work;
  }
}
export class WeatherPlaces {
  constructor(private fr=new FranceTransportClient(), private qc=new QuebecTransportClient(),
    private global:GlobalWeatherGeocoder=new NominatimWeatherGeocoder()) {}
  async places(query: string, territory?: "fr"|"qc"): Promise<WeatherPlace[]> {
    const jobs = territory==="fr" ? [this.fr.municipalities(query)] : territory==="qc" ? [this.qc.municipalities(query)]
      : [this.fr.municipalities(query),this.qc.municipalities(query)];
    // Do not hide a failed territory behind the other one's similarly named town.
    const values=(await Promise.all(jobs)).flat();
    if(values.length)return values.map(p=>weatherPlace({...p,ids:[p.id]}));
    if(territory)return [];
    const global=await this.global.places(query),confirmed:WeatherPlace[]=[];
    for(const candidate of global){
      try{confirmed.push(weatherPlace(candidate));}catch{/* Ignore geocodes on ambiguous or invalid timezone boundaries. */}
    }
    return confirmed;
  }
}
