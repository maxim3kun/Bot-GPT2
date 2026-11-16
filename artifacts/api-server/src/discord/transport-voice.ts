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

export function looksLikeNewSpokenTransportRequest(input: string): boolean {
  const text = normalizeTransitText(input);
  return /^(?:bus|metro|tram|train|rer|cherche|recherche|horaires?|trajet|itineraire|meteo|traduis|traduit|mets|joue|lance|ouvre|montre|affiche|aide)\b/u.test(text);
}
