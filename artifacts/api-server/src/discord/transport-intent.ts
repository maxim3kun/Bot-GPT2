import { idfmDate, plannerDate, placeKey } from "./idfm-itinerary.js";

export interface TravelTurn {
  request: boolean;
  origin?: string;
  destination?: string;
  service?: boolean;
  line?: string;
  stationQuestion?: boolean;
  paris?: boolean;
  outside?: boolean;
  unsupportedMode?: boolean;
  correction?: boolean;
  reverse?: boolean;
  cancel?: boolean;
  bare?: string;
}
const temporalTail = /\s+(?:demain|aujourd['’]hui|après[- ]demain|apres[- ]demain|ce\s+(?:soir|matin)|tomorrow|today|à\s+\d{1,2}(?:h|:)|a\s+\d{1,2}(?:h|:)|pour\s+\d{1,2}(?:h|:)|le\s+\d{1,2}\/|on\s+\d{4}-).*$/i;
const place = (s: string | undefined) => s?.split(/[?!,;]/)[0]?.replace(temporalTail, "")
  .replace(/\s+(?:quel(?:le)?|comment|peux|puis|pourrais)\b.*$/i, "")
  .replace(/\s+(?:et\s+)?je\s+.*$/i, "")
  .replace(/\s+(?:pour\s+(?:aller|me\s+rendre)|vers|en\s+direction\s+de)\s+.*$/i, "")
  .replace(/\s+en\s+(?:m[eé]tro|bus|train|tram|transports?).*$/i, "")
  .replace(/^[\s"'`]+|[\s."’'`]+$/g, "").trim().slice(0, 140) || undefined;

export function travelTurn(input: string): TravelTurn {
  const clean = input.replace(/<@!?\d+>/g, " ").replace(/\s+/g, " ").trim(), n = placeKey(clean);
  const request = /\b(?:itineraire|trajet|quel(?:le)?(?: est)?(?: le)? chemin|comment.*(?:aller|rendre|rejoindre)|chemin.*(?:prendre|suivre)|quelles? correspondances?|route from|directions to|how.*(?:get|go|travel).*(?:to|from)|(?:which|what).*(?:route|way))\b/.test(n) ||
    /\b(?:metro|rer|bus|tram|train|ligne)\b/.test(n) && /\b(?:comment.*(?:prendre|emprunter)|quell?e?s?.*(?:prendre|emprunter)|quelle direction)\b/.test(n);
  const service = /\b(?:mon service|je (?:prends?|commence) (?:mon )?service|je travaille)\b/.test(n);
  const origin = place(clean.match(/\b(?:je\s+(?:prends?|prend|vais\s+prendre|monte)|j['’]embarque)\s+(?:dans\s+)?(?:le\s+)?(?:m[eé]tro|bus|train|tram(?:way)?)\s+(?:à|a|au|depuis|de)\s+(.+)$/i)?.[1]
    ?? clean.match(/\b(?:je\s+(?:pars|suis)|d[eé]part)\s*(?:[:=]\s*|(?:de|depuis|à|a|au)\s+)(.+)$/i)?.[1]);
  const destination = place(clean.match(/\b(?:je\s+(?:prends?|prend|commence)\s+(?:mon\s+)?service|mon\s+service|je\s+travaille)\s+(?:à|a|au)\s+(?!\d)(.+)$/i)?.[1]
    ?? clean.match(/\b(?:service|je\s+travaille)\s+(?:(?:commence|commencera)\s+)?(?:à|a)\s+\d{1,2}(?:h\d{0,2}|:\d{2})\s+(?:à|a|au)\s+(.+)$/i)?.[1]
    ?? clean.match(/\b(?:pour\s+(?:aller|me\s+rendre)|je\s+(?:veux|dois)\s+(?:aller|être|etre)|aller|me\s+rendre|arriver|arriv[eé]e)\s*(?:[:=]\s*|(?:à|a|au|vers)\s+)(?!\d)(.+)$/i)?.[1]
    ?? (request ? clean.match(/\b(?:vers|pour|to)\s+(?!\d)(.+)$/i)?.[1] : undefined));
  const pair = request || /^(?:de|from|depuis)\s+/i.test(clean) || /\b(?:m[eé]tro|bus|train|tram)\b/i.test(clean)
    ? clean.match(/\b(?:depuis|au\s+d[eé]part\s+de|from|de)\s+(.+?)\s+(?:vers|à|a|to|→|->)\s+(.+)$/i) : null;
  const line = clean.match(/\b(?:ligne|line)\s*(\d{1,2}(?:bis)?)\b/i)?.[1]?.toLowerCase();
  const stationQuestion = !!line && /\b(?:stations?|arrets?|stops?)\b/.test(n) &&
    /\b(?:combien|nombre|how many|compte|y a|there are|\d+)\b/.test(n);
  const bare = clean.length >= 2 && clean.length <= 140 && !/[?!]/.test(clean) && !isTravelTimeReply(clean) &&
    !/\b(?:merci|salut|bonjour|bonsoir|hello|thanks|oui|non|yes|no|pourquoi|parle|aide|help)\b/.test(n)
    ? place(clean) : undefined;
  return {
    request: request || !!(origin && destination) || !!(pair?.[1] && pair?.[2]),
    origin: origin ?? place(pair?.[1]), destination: destination ?? place(pair?.[2]), service,
    line, stationQuestion,
    paris: /\b(?:paris|parisien(?:ne)?|ile de france|idf)\b/.test(n),
    outside: /\b(?:quebec|montreal|laval|sherbrooke|gatineau|toronto|london|londres|lyon|marseille|lille|toulouse|amiens|beauvais|breteuil)\b/.test(n.replace(/\bgare de lyon\b/g, "")),
    unsupportedMode: /\b(?:en voiture|a velo|en velo|a pied|driving|cycling|on foot)\b/.test(n),
    correction: /\b(?:tu mens|c est faux|ce n est pas vrai|tu t es trompe|reverifie|verifie|wrong|not true|check again)\b/.test(n),
    reverse: /\b(?:inverse|inverser|sens inverse|dans l autre sens|reverse|other way)\b/.test(n),
    cancel: /^(?:stop|annule|annuler|arrete|cancel|forget it)(?: (?:le |ce )?(?:trajet|itineraire|route))?$/.test(n),
    bare,
  };
}

export interface TravelTime { at: number; represents: "arrival" | "departure" }
export function isTravelTimeReply(input: string) {
  return /^(?:(?:et|non|plutot|en fait) )*(?:demain|apres demain|aujourd hui|depart|arrivee|pour|avant|a |le \d|\d)/.test(placeKey(input))
    && /(?:\d{1,2}[h:]|demain|tomorrow|\d{1,2}\/\d{1,2})/i.test(input);
}
export function requestedTravelTime(input: string, now: number, arrivalDefault = false): TravelTime | { error: string } | null {
  const n = placeKey(input), current = plannerDate(Math.floor(now / 1000));
  const clock = input.match(/\b(\d{1,2})(?:h(\d{2})?|:(\d{2}))(?!\d)\b/i);
  const explicit = input.match(/\b(\d{4})-(\d\d)-(\d\d)\b/);
  const frenchDate = input.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
  const offset = /\b(?:apres demain|day after tomorrow)\b/.test(n) ? 2 : /\b(?:demain|tomorrow)\b/.test(n) ? 1 : 0;
  if (!clock) {
    return explicit || frenchDate || offset || /\b\d{1,2}[:h]/i.test(input) || /\b(?:ce soir|ce matin|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/.test(n)
      ? { error: "Quelle heure souhaites-tu ? Indique par exemple « demain à 8h30 », en précisant départ ou arrivée." } : null;
  }
  if (/\b(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday|saturday|sunday|semaine prochaine|next week)\b/.test(n))
    return { error: "Précise la date du trajet au format jour/mois/année pour éviter de choisir le mauvais jour." };
  let day = current.slice(0, 8);
  if (explicit) day = explicit[1]! + explicit[2]! + explicit[3]!;
  else if (frenchDate) day = (frenchDate[3] ?? current.slice(0, 4)) + frenchDate[2]!.padStart(2, "0") + frenchDate[1]!.padStart(2, "0");
  else if (offset) {
    const date = new Date(`${current.slice(0, 4)}-${current.slice(4, 6)}-${current.slice(6, 8)}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    day = date.toISOString().slice(0, 10).replaceAll("-", "");
  }
  const at = idfmDate(`${day}T${clock[1]!.padStart(2, "0")}${clock[2] ?? clock[3] ?? "00"}00`);
  if (at == null) return { error: "Cette date ou cette heure n’est pas valide en Europe/Paris. Peux-tu la préciser ?" };
  if (at < now / 1000 - 60) return { error: "Cette heure est déjà passée. Précise la date souhaitée du trajet." };
  const arrival = /\b(?:arriver|arrivee|etre|service|avant|by)\b/.test(n) ||
    arrivalDefault && !/\b(?:depart|je pars|leave|departure)\b/.test(n);
  return { at, represents: arrival ? "arrival" : "departure" };
}
