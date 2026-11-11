import type { WeatherPeriod, WeatherRequest } from "./weather-types.js";
const normalized = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[’']/g, " ").trim();
export function weatherTurn(input: string): WeatherRequest | null {
  const raw = input.replace(/<@!?\d+>/g, "").trim(), n = normalized(raw);
  const lead=n.replace(/^(?:(?:est[- ]ce que )?tu peux|peux[- ]tu|pourrais[- ]tu|can you|could you)\s+(?:me\s+)?/,"");
  if (!/^(?:(?:quelle?|quels?|what(?: s| is)?|donne[r]?(?: moi)?|affiche|montre(?: moi)?|consulte|show|tell me)(?: sera| est)?(?: la| le| les| the)?\s+)?(?:meteo|weather|temperature|temps)\b|^va t il pleuvoir\b/.test(lead)) return null;
  const atDestination = /\b(?:destination|a l arrivee|at arrival|when i arrive)\b/.test(n);
  const relative = raw.match(/\b(?:apr[eè]s[- ]demain|demain|aujourd['’]hui|today|tomorrow|maintenant|now)\b/i)?.[0];
  const date = raw.match(/\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{4})?)\b/)?.[0];
  const time = raw.match(/(?:^|\s)(?:[àa]|at|vers)\s*(\d{1,2}(?::\d{2}|h\d{0,2})?)(?!\w)|\b(\d{1,2}(?::\d{2}|h\d{0,2}))(?!\w)/i);
  const clock = time?.[1] ?? time?.[2];
  const unsupported = !date && !relative && /\b(?:semaine|week|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|dans \d+ jours)\b/.test(n);
  const when = [date ?? relative, clock ? `à ${clock}` : ""].filter(Boolean).join(" ") || (unsupported ? "date à préciser" : undefined);
  const territory = /\b(?:France|fr)\b/i.test(raw) ? "fr" : /\b(?:qu[eé]bec|canada|qc)\b/i.test(raw) ? "qc" : undefined;
  let place = atDestination ? "" : raw.match(/(?:^|\s)(?:[àa]|pour|in|at|sur)\s+(.+)$/i)?.[1] ??
    raw.replace(/^.*?\b(?:m[eé]t[eé]o|weather|temp[eé]rature)\b\s*/i, "");
  if (relative) place = place.replace(relative, "");
  if (date) place = place.replace(date, "");
  if (time) place = place.replace(time[0], "");
  place = place.replace(/^(?:[àa]|pour|sur|in|at)\s+/i, "");
  place = place.replace(/\b(?:au Qu[eé]bec|en France|au Canada|qc|fr)\b/gi, "")
    .replace(/\s+(?:pour le|pour|le)\s*$/i, "").replace(/[?!.,\s]+$/g, "").trim();
  place = place.replace(/\s+(?:Qu[eé]bec|Canada|France)$/i,"").trim();
  return { ...(place ? { place } : {}), ...(territory ? { territory } : {}), ...(when ? { when } : {}), ...(atDestination ? { atDestination: true } : {}) };
}
export const localDay = (at: number, timezone: string) => {
  const parts = new Intl.DateTimeFormat("en", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(at * 1000);
  const get = (key: string) => parts.find(p => p.type === key)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
};
/** Resolve a civil time by roundtrip, rejecting non-existent or ambiguous DST hours. */
export function weatherEpoch(day: string, hour: number, minute: number, timezone: string): number {
  const target = Date.parse(`${day}T${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}:00Z`);
  if (!Number.isFinite(target) || new Date(target).toISOString().slice(0,10) !== day || hour > 23 || minute > 59) throw Error("date");
  const parts = (at: number) => {
    const values = new Intl.DateTimeFormat("en", { timeZone: timezone, year:"numeric",month:"2-digit",day:"2-digit",
      hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23" }).formatToParts(at);
    const get = (key: string) => values.find(p => p.type === key)!.value;
    return Date.parse(`${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`);
  };
  let at = target;
  for(let i=0;i<4;i++) at += target - parts(at);
  if (parts(at)!==target || parts(at-3600_000)===target || parts(at+3600_000)===target) throw Error("date");
  return at / 1000;
}
export function weatherPeriod(when: string | undefined, timezone: string, now: number, arrival?: number): WeatherPeriod {
  const n = normalized(when ?? ""), today = localDay(now,timezone);
  if (!when && arrival !== undefined) {
    if(arrival<now-60) throw Error("past");
    const start=Math.floor(arrival/3600)*3600;
    return {start,end:start+3600,timezone,target:arrival};
  }
  let day=today;
  const iso=n.match(/\b(\d{4}-\d{2}-\d{2})\b/), fr=n.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
  if(iso)day=iso[1]!;
  else if(fr)day=`${fr[3]??today.slice(0,4)}-${fr[2]!.padStart(2,"0")}-${fr[1]!.padStart(2,"0")}`;
  else if(/\b(?:apres[- ]demain|demain|tomorrow)\b/.test(n)){
    const add=/apres[- ]demain/.test(n)?2:1;day=new Date(Date.parse(today+"T12:00:00Z")+add*86400_000).toISOString().slice(0,10);
  } else if(n && !/\b(?:aujourd hui|today|maintenant|now)\b/.test(n) && !/\b(?:a|at|vers)\s*\d/.test(n)) throw Error("date");
  const clockText=n.match(/\b(?:a|at|vers)(?:\s+|(?=\d))(\S+)/)?.[1];
  const clock=clockText?.match(/^(\d{1,2})(?:h(\d{0,2})|:(\d{2}))?$/);
  if(clockText&&!clock)throw Error("date");
  const start=weatherEpoch(day,clock?Number(clock[1]):0,clock?Number(clock[2]??clock[3]??0):0,timezone);
  const next=new Date(Date.parse(day+"T12:00:00Z")+86400_000).toISOString().slice(0,10);
  if(clock){if(start<now-60)throw Error("past");return {start,end:start+3600,timezone};}
  const end=weatherEpoch(next,0,0,timezone);if(end<=now)throw Error("past");
  return {start:Math.max(now,start),end,timezone};
}
