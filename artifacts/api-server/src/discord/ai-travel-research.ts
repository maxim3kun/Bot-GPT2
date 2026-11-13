export type TravelResearchKind = "flight" | "visa" | "country" | null;
export type TravelEvidenceFreshness = "dated-recently" | "undated" | "stale";
const TRAVEL_SOURCE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

function normalize(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

const NATIONALITIES = [
  "francais", "francaise", "canadien", "canadienne", "quebecois", "quebecoise",
  "britannique", "anglais", "anglaise", "americain", "americaine", "etats-unien",
  "belge", "suisse", "allemand", "allemande", "italien", "italienne", "espagnol",
  "espagnole", "irlandais", "irlandaise", "marocain", "marocaine", "algerien",
  "algerienne", "tunisien", "tunisienne", "japonais", "japonaise", "chinois",
  "chinoise", "indien", "indienne", "australien", "australienne", "neerlandais",
  "neerlandaise", "portugais", "portugaise", "french", "canadian", "british",
  "american", "belgian", "swiss", "german", "italian", "spanish", "irish",
  "japanese", "chinese", "indian", "australian", "dutch", "portuguese",
];
const nationalityPattern = new RegExp(`\\b(?:${NATIONALITIES.join("|")})\\b`);
const PASSPORT_COUNTRIES = [
  "france", "canada", "quebec", "royaume uni", "united kingdom", "uk", "etats unis", "united states",
  "usa", "belgique", "suisse", "allemagne", "germany", "italie", "italy", "espagne", "spain",
  "irlande", "ireland", "maroc", "algerie", "tunisie", "japon", "japan", "chine", "china",
  "inde", "india", "australie", "australia", "pays bas", "netherlands", "portugal",
];
const passportCountryPattern = new RegExp(
  `\\b(?:passeport|passport)\\s+(?:(?:de|du|d['’]|from(?:\\s+the)?|issued\\s+(?:by|in))\\s+)?(?:${PASSPORT_COUNTRIES.join("|")})\\b`,
);

export function travelResearchKind(text: string): TravelResearchKind {
  const n = normalize(text);
  if (/\b(?:visa|visas|passeport|passport|formalites? d entree|conditions? d entree|entry requirements|immigration requirements)\b/.test(n))
    return "visa";
  if (/\b(?:flight status|flight number|track(?:ing)? (?:my )?flight|my flight|statut du vol|suivi du vol|mon vol|horaires? de vol|vol\s+(?:[a-z]{2,3}\s?\d{1,4}|n\s?\d)|vols?\s+(?:de|entre|vers|pour)|flights?\s+(?:from|between|to))\b/.test(n))
    return "flight";
  if (/\b(?:fiche\s+(?:du\s+)?pays|infos?\s+pratiques?\s+(?:pour|sur|au|en|aux|de)?|informations?\s+pratiques?\s+(?:pour|sur|au|en|aux|de)?|guide\s+(?:de\s+)?voyage|voyager?\s+(?:au|en|aux|a|vers|dans|to|in)|travel\s+(?:guide|advice|information)|country\s+profile)\b/.test(n))
    return "country";
  return null;
}

export function travelResearchClarification(text: string, language: string): string | null {
  if (travelResearchKind(text) !== "visa") return null;
  const n = normalize(text);
  if (!nationalityPattern.test(n) && !passportCountryPattern.test(n)) {
    return language === "fr"
      ? "Quelle est la nationalité du passeport (ou son pays d’émission) ? Les conditions de visa dépendent de cette nationalité et du pays de destination."
      : "What is the passport nationality or issuing country? Visa requirements depend on both passport nationality and destination.";
  }
  return null;
}

export function travelEvidenceFreshness(publishedAt: string | undefined, now = Date.now()): TravelEvidenceFreshness {
  if (!publishedAt) return "undated";
  const timestamp = Date.parse(publishedAt);
  if (!Number.isFinite(timestamp) || timestamp > now + 24 * 60 * 60 * 1000 ||
      now - timestamp > TRAVEL_SOURCE_MAX_AGE_MS) return "stale";
  return "dated-recently";
}

export function travelResearchGuidance(kind: Exclude<TravelResearchKind, null>, checkedOn: string): string {
  const common = `The lookup date is ${checkedOn} (Europe/Paris). State it as the date checked, not as the source's publication or update date. Cite source links only through the supplied source button. Do not invent facts, dates, data fields, or URLs.`;
  if (kind === "flight") return `${common}
For flight requests, use only facts explicitly present in the fetched pages for the exact flight or route and date. Include the flight number when supplied, the origin, destination and travel date only when the source confirms them. Clearly distinguish a published schedule from a live status, show the source's own timestamp only if present, and never infer a delay, cancellation, arrival time or booking availability. Do not book or claim to have tracked a flight if the page does not confirm it.`;
  if (kind === "visa") return `${common}
For visa or entry-rule requests, use only readable official government or intergovernmental pages in the supplied evidence. The answer must match the stated passport nationality and destination. If the page does not show its own update date, say that its update date was not visible and do not treat today's lookup date as proof the rule is current. State that this is general information, not legal advice or a guarantee of admission, and direct the traveler to the linked authority or airline for confirmation. If the official evidence does not establish the rule, say it could not be verified.`;
  return `${common}
For a country travel profile, use only readable official government or intergovernmental pages in the supplied evidence. Give a concise practical summary and surface the official entry-condition links through the source button. Distinguish source publication/update dates from the lookup date. Do not claim a visa rule for an unstated passport nationality; ask for it when needed.`;
}

export function travelResearchFooter(kind: Exclude<TravelResearchKind, null>, checkedOn: string, language: string): string {
  if (language === "fr") {
    const source = kind === "flight" ? "Source consultée : bouton 🔎" : "Sources officielles : bouton 🔎";
    return `\n\nRecherche effectuée le ${checkedOn} (Europe/Paris) · ${source}`;
  }
  return `\n\nChecked on ${checkedOn} (Europe/Paris) · Sources: 🔎 button`;
}
