import { find, setCache } from "geo-tz/all";
import { FranceTransportClient } from "./public-transport.js";
import { QuebecTransportClient } from "./quebec-transport.js";
import type { WeatherPlace } from "./weather-types.js";
import type { OfficialPlace } from "./transport-planner-types.js";
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
export class WeatherPlaces {
  constructor(private fr=new FranceTransportClient(), private qc=new QuebecTransportClient()) {}
  async places(query: string, territory?: "fr"|"qc"): Promise<WeatherPlace[]> {
    const jobs = territory==="fr" ? [this.fr.municipalities(query)] : territory==="qc" ? [this.qc.municipalities(query)]
      : [this.fr.municipalities(query),this.qc.municipalities(query)];
    // Do not hide a failed territory behind the other one's similarly named town.
    const values=(await Promise.all(jobs)).flat();
    return values.map(p=>weatherPlace({...p,ids:[p.id]}));
  }
}
