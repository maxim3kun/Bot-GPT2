export type TransitMode = "bus" | "metro" | "rail" | "tram";

export interface PublicTransportQuery {
  place: string;
  mode: TransitMode | null;
  line?: string;
  direction?: string;
  allowNearbyStops?: boolean;
}

const MODE_PATTERNS: Array<[TransitMode, RegExp]> = [
  ["bus", /\b(?:bus|buses)\b/i],
  ["metro", /\b(?:m[eé]tro|subway)\b/i],
  ["tram", /\b(?:tram(?:way)?)\b/i],
  ["rail", /\b(?:rer|ter|transilien|train(?:s)?|tgv|intercites|intercités|sncf)\b/i],
];

const LIVE_INTENT = /\b(?:prochain(?:e|es|s)?|passage(?:s)?|attente|attendre|horaires?|d[eé]part(?:s)?|arriv(?:e|er|ent|[eé]e?s?)|passe(?:nt|r)?|retard(?:s)?|en\s+temps\s+r[eé]el|en\s+direct|live|next)\b/i;

export function normalizeTransitText(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function routeMatchesRequested(id: string, short: string, long: string, requested: string): boolean {
  const wanted = normalizeTransitText(requested);
  return normalizeTransitText(short || id) === wanted ||
    /^\d+$/.test(wanted) && new RegExp(`^${wanted}(?:\\s*[-–—:]|\\s*$)`).test(normalizeTransitText(long));
}

export function parsePublicTransportQuery(text: string): PublicTransportQuery | null {
  const clean = text.replace(/<@!?\d+>/g, " ").replace(/<#[\d]+>/g, " ").trim();
  if (!LIVE_INTENT.test(clean) || !MODE_PATTERNS.some(([, pattern]) => pattern.test(clean))) return null;

  const mode = MODE_PATTERNS.find(([, pattern]) => pattern.test(clean))?.[0] ?? null;
  const direction = clean.match(/\b(?:direction|vers)\s+([^?.!,;]+)/i)?.[1]?.trim();
  let place = clean
    .replace(/^\s*(?:peux[- ]tu|pourrais[- ]tu|can you|could you)\s+(?:me\s+)?(?:dire|tell|show)\s+/i, "")
    .replace(/^\s*(?:quel(?:le)?s?\s+est\s+(?:le|la|l['’]|les)\s+|quel(?:le)?s?\s+est\s+|quels?\s+sont\s+(?:les\s+)?|quelles?\s+sont\s+(?:les\s+)?|a\s+quelle\s+heure\s+|à\s+quelle\s+heure\s+)/i, "");
  place = place.replace(/\b(?:direction|vers)\s+[^?.!,;]+/i, " ");

  let line: string | undefined;
  const explicitLine = place.match(/\b(?:ligne|line)\s*(?:n[°o]\s*)?([a-z0-9][a-z0-9._-]*)/i);
  if (explicitLine) {
    line = explicitLine[1];
    place = place.replace(explicitLine[0], " ");
  } else {
    const namedLine = place.match(/\b(?:rer|transilien)\s+([a-e]|[1-9][0-9]?)\b/i);
    if (namedLine) {
      line = namedLine[1];
      place = place.replace(namedLine[0], " ");
    } else if (mode === "bus") {
      const numberedBusLine = place.match(/\b\d{2,4}\b/);
      if (numberedBusLine) {
        line = numberedBusLine[0];
        place = place.replace(numberedBusLine[0], " ");
      }
    }
  }

  place = place
    .replace(/<@!?\d+>/g, " ")
    .replace(/\b(?:m[eé]tro|subway|bus|buses|rer|ter|transilien|train(?:s)?|tram(?:way)?|tgv|intercit[eé]s|sncf)\b/gi, " ")
    .replace(/\b(?:temps\s+d['’]?attente|en\s+temps\s+r[eé]el|en\s+direct|live)\b/gi, " ")
    .replace(/\b(?:prochain(?:e|es|s)?|passage(?:s)?|attente|attendre|horaires?|d[eé]part(?:s)?|arriv(?:e|er|ent|[eé]e?s?)|passe(?:nt|r)?|retard(?:s)?|next)\b/gi, " ")
    .replace(/\b(?:peux[- ]tu|pourrais[- ]tu|est[- ]ce\s+que|dis[- ]moi|donne[- ]moi|s['’]?il\s+te\s+pla[iî]t|svp|stp|quel(?:le)?s?|combien|me|moi|the|please|what|when)\b/gi, " ")
    .replace(/^[\s,;:!?]*(?:(?:à|a|dans|sur|au|aux|du|des|de la|de l['’]|près de|from|at|near)\s+)+/i, "")
    .replace(/[?!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { place, mode, ...(line ? { line } : {}), ...(direction ? { direction } : {}) };
}

export function isPublicTransportRequest(text: string): boolean {
  return parsePublicTransportQuery(text) !== null;
}
