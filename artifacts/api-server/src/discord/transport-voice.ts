import { normalizeTransitText } from "./transport-query.js";

export interface SpokenTransportChoice {
  label: string;
  value: string;
}

export function matchSpokenTransportChoice(
  input: string,
  choices: readonly SpokenTransportChoice[],
): string | null {
  const query = normalizeTransitText(input)
    .replace(/^(?:je choisis|choisis|choisir|prends|prendre|la|le|ligne|bus|metro|tram|train|station|arret)\s+/u, "")
    .replace(/[^\p{Letter}\p{Number}\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  if (query.length < 2 && !/^\d$/u.test(query)) return null;

  const matches = choices.filter(({ label }) => {
    const normalized = normalizeTransitText(label).replace(/[^\p{Letter}\p{Number}\s]/gu, " ").replace(/\s+/gu, " ").trim();
    return normalized === query || normalized.startsWith(`${query} `) ||
      query.length >= 3 && normalized.includes(query);
  });
  const unique = [...new Map(matches.map(choice => [choice.value, choice])).values()];
  return unique.length === 1 ? unique[0]!.value : null;
}

export function parseSpokenTransportResultAction(input: string):
  "refresh" | "return" | "more" | "stops" | "modify" | "favorite" | "cancel" |
  "nextPage" | "previousPage" | null {
  const text = normalizeTransitText(input).replace(/[’']/g, " ").replace(/\s+/gu, " ").trim();
  if (/^(?:actualise|actualiser|rafraichis|rafraichir|relance|recherche a nouveau|refresh)$/u.test(text)) return "refresh";
  if (/^(?:retour|trajet retour|voir le retour|affiche le retour|return)$/u.test(text)) return "return";
  if (/^(?:agrandir|plus d horaires|davantage d horaires|voir plus d horaires|more)$/u.test(text)) return "more";
  if (/^(?:arrets|voir les arrets|affiche les arrets|etapes|voir les etapes|stops)$/u.test(text)) return "stops";
  if (/^(?:modifier|change les arrets|changer les arrets|modify)$/u.test(text)) return "modify";
  if (/^(?:favori|favoris|enregistre ce trajet|ajoute aux favoris|favorite)$/u.test(text)) return "favorite";
  if (/^(?:ferme|fermer|termine|terminer|annule la recherche|cancel)$/u.test(text)) return "cancel";
  if (/^(?:suivant|page suivante|next|next page)$/u.test(text)) return "nextPage";
  if (/^(?:precedent|precedente|page precedente|previous|previous page)$/u.test(text)) return "previousPage";
  return null;
}

export type SpokenTransportTimeRequest =
  | { kind: "departure" | "connection"; time: string | null }
  | { kind: "wait"; minutes: number | null };

const spokenNumbers: Record<string, number> = {
  zero: 0, zeroe: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6,
  sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14,
  quinze: 15, seize: 16, vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60,
};

function spokenInteger(value: string): number | null {
  if (/^\d{1,3}$/u.test(value)) return Number(value);
  return spokenNumbers[value] ?? null;
}

function spokenClock(value: string): string | null {
  const clock = value.match(/\b(\d{1,2})\s*(?::|h(?:eures?)?\s*)(\d{1,2})?\b/u);
  if (clock) {
    const hours = Number(clock[1]), minutes = clock[2] ? Number(clock[2]) : 0;
    return hours <= 23 && minutes <= 59 ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}` : null;
  }
  const wordClock = value.match(/\b(zero|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente|quarante|cinquante|soixante)\s+heures?(?:\s+(?:et\s+)?(demie|quart|trois\s+quarts|zero|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente|quarante|cinquante|soixante))?\b/u);
  if (!wordClock) {
    const bare = value.match(/\b(?:a|at|after|vers|around|for)\s+(\d{1,2})\b/u);
    if (!bare) return null;
    const hours = Number(bare[1]);
    return hours <= 23 ? `${String(hours).padStart(2, "0")}:00` : null;
  }
  const hours = spokenNumbers[wordClock[1]!];
  const minuteText = wordClock[2];
  const minutes = !minuteText ? 0 : minuteText === "demie" ? 30 : minuteText === "quart" ? 15 :
    minuteText === "trois quarts" ? 45 : spokenNumbers[minuteText] ?? 0;
  return hours !== undefined && hours <= 23 && minutes <= 59
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}` : null;
}

function spokenDuration(value: string): number | null {
  const duration = value.match(/\b(\d{1,3}|zero|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente|quarante|cinquante|soixante)\s*(?:minutes?|mins?|m)\b/u);
  if (duration) return spokenInteger(duration[1]!);
  const wordDuration = value.match(/\b(?:attente|attendre|attends|patienter|minimum|minimale|minimal|wait)\s+(?:de\s+|au\s+moins\s+)?(zero|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente|quarante|cinquante|soixante)\b/u);
  return wordDuration ? spokenInteger(wordDuration[1]!) : null;
}

export function parseSpokenTransportTimeRequest(input: string): SpokenTransportTimeRequest | null {
  const value = normalizeTransitText(input).replace(/[’']/gu, " ").replace(/\s+/gu, " ").trim();
  const waitIntent = /\b(?:attente|attendre|attends|patienter|wait)\b/u.test(value) ||
    /\b(?:minimum|minimale|minimal)\b.*\bminutes?\b/u.test(value);
  if (waitIntent) {
    const minutes = spokenDuration(value);
    return { kind: "wait", minutes: minutes !== null && minutes <= 360 ? minutes : null };
  }

  const connectionIntent = /\b(?:second|deuxieme|2e|2eme|correspondance|connexion|connection|next train)\b/u.test(value);
  const departureIntent = /\b(?:depart|partir|pars|quitter|leave|departure|start)\b/u.test(value);
  if (!connectionIntent && !departureIntent && !/\b(?:a|at|vers|around|for)\s+\d{1,2}\b/u.test(value)) return null;
  return {
    kind: connectionIntent ? "connection" : "departure",
    time: spokenClock(value),
  };
}

export function looksLikeNewSpokenTransportRequest(input: string): boolean {
  const text = normalizeTransitText(input);
  return /^(?:bus|metro|tram|train|rer|cherche|recherche|horaires?|trajet|itineraire|meteo|traduis|traduit|mets|joue|lance|ouvre|montre|affiche|aide)\b/u.test(text);
}
