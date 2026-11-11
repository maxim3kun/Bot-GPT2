import type { WeatherForecast,WeatherPeriod,WeatherPlace } from "./weather-types.js";
import { WeatherError } from "./weather-types.js";
import { WEATHER_LICENSE,WEATHER_SOURCE } from "./met-weather.js";
import { weatherWords } from "./weather-language.js";
import { display } from "./idfm-itinerary.js";
export function formatWeather(place:WeatherPlace,period:WeatherPeriod,data:WeatherForecast,now:number,language:string):string{
  const words=weatherWords(language),locale=["fr","en","es","de","pt","it"].includes(language)?language:"en";
  if(data.updated<now-12*3600)throw new WeatherError("stale");
  const horizon=Math.max(...data.points.map(p=>p.at+Math.max(0,...p.precipitation.map(v=>v.hours))*3600));
  if(period.start>=horizon||period.end<=data.points[0]!.at)throw new WeatherError("horizon");
  const points=data.points.filter(p=>p.at>=period.start&&p.at<period.end);
  const temperatures=points.flatMap(p=>p.temperature===undefined?[]:[p.temperature]);
  let precipitation=0,coverage=0,cursor=period.start;
  for(const point of points){
    if(point.at<cursor)continue;
    const interval=point.precipitation.filter(v=>point.at+v.hours*3600<=period.end).sort((a,b)=>a.hours-b.hours)[0];
    if(!interval)continue;
    precipitation+=interval.millimeters;coverage+=interval.hours*3600;cursor=point.at+interval.hours*3600;
  }
  const number=(n:number)=>n.toLocaleString(locale,{maximumFractionDigits:1});
  const date=(at:number)=>new Intl.DateTimeFormat(locale==="en"?"en-GB":locale,{timeZone:period.timezone,day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(at*1000);
  const low=Math.min(...temperatures),high=Math.max(...temperatures);
  const temp=temperatures.length?`${number(low)}${low===high?"":`–${number(high)}`} °C`:words.missingTemperature;
  const rain=coverage?`${number(precipitation)} mm · ${number(coverage/3600)} ${words.covered}${coverage<period.end-period.start-1?` (${words.partial})`:""}`:words.missingRain;
  return `**${words.title} · ${display(place.label)}**\n${date(period.start)} → ${date(period.end)} · ${period.timezone}${period.end>horizon?` (${words.partial})`:""}${
    period.target?`\n${words.arrival} : ${date(period.target)} (${words.arrivalHint})`:""}\n`+
    `${words.temperature} : **${temp}**\n${words.precipitation} : **${rain}**\n`+
    `${words.updated} ${date(data.updated)} · ${words.checked} ${date(data.checked)}.${data.deprecated?` ${words.transitional}`:""}\n`+
    `${words.summary} [MET Norway](${WEATHER_SOURCE}) · [CC BY 4.0](${WEATHER_LICENSE}).`;
}
