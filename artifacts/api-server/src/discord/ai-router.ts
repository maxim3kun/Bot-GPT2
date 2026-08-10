import type { Message } from "discord.js";

export type AiIntent =
  | "greeting"
  | "time"
  | "research"
  | "discord_action"
  | "creative"
  | "personal"
  | "factual"
  | "general";

export interface AiRoute {
  intent: AiIntent;
  needsResearch: boolean;
  needsConfirmation: boolean;
}

const RESEARCH_TERMS = [
  "actualité", "actualites", "actualité", "aujourd'hui", "aujourd’hui", "maintenant",
  "dernier", "dernière", "dernieres", "récent", "recente", "en ce moment",
  "current", "today", "latest", "recent", "right now", "news", "breaking",
  "prix actuel", "cours actuel", "score", "résultat", "resultat", "météo", "meteo",
  "weather", "forecast", "disponible", "disponibilité", "disponibilite",
  "version actuelle", "mise à jour", "mise a jour", "source", "cherche sur internet",
  "recherche sur internet", "vérifie en ligne", "verifie en ligne",
];

const TIME_TERMS = [
  "quelle heure", "quel heure", "heure à", "heure a", "heure en", "time in",
  "what time", "heure actuelle", "heure locale", "fuseau horaire", "timezone",
];

const ACTION_TERMS = [
  "supprime", "supprimer", "efface", "effacer", "ban", "bannis", "bannir",
  "kick", "exclure", "timeout", "mute", "réagis", "reagis", "envoie dans",
  "change le préfixe", "change le prefixe", "modifie le serveur",
];

const CREATIVE_TERMS = [
  "écris", "ecris", "rédige", "redige", "invente", "imagine", "compose",
  "poème", "poeme", "histoire", "blague", "paroles", "logo", "crée", "cree",
];

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(normalize(term)));
}

export function classifyAiMessage(text: string): AiRoute {
  const normalized = normalize(text);

  if (/^(bonjour|bonsoir|salut|coucou|hello|hi|hey|yo|hola|hallo|ciao)( bot| ia| toi| a toi)?[!?. ]*$/.test(normalized)) {
    return { intent: "greeting", needsResearch: false, needsConfirmation: false };
  }

  if (includesAny(normalized, TIME_TERMS)) {
    return { intent: "time", needsResearch: false, needsConfirmation: false };
  }

  if (includesAny(normalized, ACTION_TERMS)) {
    return {
      intent: "discord_action",
      needsResearch: false,
      needsConfirmation: true,
    };
  }

  if (includesAny(normalized, RESEARCH_TERMS)) {
    return { intent: "research", needsResearch: true, needsConfirmation: false };
  }

  if (includesAny(normalized, CREATIVE_TERMS)) {
    return { intent: "creative", needsResearch: false, needsConfirmation: false };
  }

  if (/\b(mon|ma|mes|moi|je suis|j'ai|j’ai|my|me|i am|i'm)\b/.test(normalized)) {
    return { intent: "personal", needsResearch: false, needsConfirmation: false };
  }

  if (/^(qui|que|quoi|comment|pourquoi|quand|où|ou|who|what|how|why|when|where)\b/.test(normalized) || normalized.endsWith("?")) {
    return { intent: "factual", needsResearch: false, needsConfirmation: false };
  }

  return { intent: "general", needsResearch: false, needsConfirmation: false };
}

const CITY_TIMEZONES: Record<string, string> = {
  "paris": "Europe/Paris",
  "france": "Europe/Paris",
  "londres": "Europe/London",
  "london": "Europe/London",
  "new york": "America/New_York",
  "new-york": "America/New_York",
  "montreal": "America/Toronto",
  "montréal": "America/Toronto",
  "toronto": "America/Toronto",
  "los angeles": "America/Los_Angeles",
  "san francisco": "America/Los_Angeles",
  "mexico": "America/Mexico_City",
  "mexico city": "America/Mexico_City",
  "sao paulo": "America/Sao_Paulo",
  "são paulo": "America/Sao_Paulo",
  "buenos aires": "America/Argentina/Buenos_Aires",
  "reykjavik": "Atlantic/Reykjavik",
  "lisbonne": "Europe/Lisbon",
  "lisbon": "Europe/Lisbon",
  "berlin": "Europe/Berlin",
  "rome": "Europe/Rome",
  "madrid": "Europe/Madrid",
  "athenes": "Europe/Athens",
  "athens": "Europe/Athens",
  "moscou": "Europe/Moscow",
  "moscow": "Europe/Moscow",
  "dubai": "Asia/Dubai",
  "delhi": "Asia/Kolkata",
  "mumbai": "Asia/Kolkata",
  "bangkok": "Asia/Bangkok",
  "singapour": "Asia/Singapore",
  "singapore": "Asia/Singapore",
  "tokyo": "Asia/Tokyo",
  "japon": "Asia/Tokyo",
  "japan": "Asia/Tokyo",
  "séoul": "Asia/Seoul",
  "seoul": "Asia/Seoul",
  "coree du sud": "Asia/Seoul",
  "south korea": "Asia/Seoul",
  "pekin": "Asia/Shanghai",
  "beijing": "Asia/Shanghai",
  "chine": "Asia/Shanghai",
  "china": "Asia/Shanghai",
  "sydney": "Australia/Sydney",
  "australie": "Australia/Sydney",
  "australia": "Australia/Sydney",
  "auckland": "Pacific/Auckland",
  "nouvelle zelande": "Pacific/Auckland",
  "new zealand": "Pacific/Auckland",
};

function requestedPlace(text: string): string | null {
  const normalized = normalize(text);
  const match = normalized.match(/(?:heure|time)(?: actuelle| locale)?(?:\s+est[- ]il|\s+is it|\s+is)?\s+(?:a|en|in)\s+(.+?)(?:[?.!]|$)/);
  if (match?.[1]?.trim()) return match[1].trim();

  for (const place of Object.keys(CITY_TIMEZONES)) {
    if (normalized.includes(place)) return place;
  }
  return null;
}

export function currentTimeAnswer(text: string): string | null {
  const place = requestedPlace(text);
  if (!place) {
    return "Dans quelle ville ou quel pays veux-tu connaître l’heure ? Exemple : `@Bot quelle heure est-il à Tokyo ?`";
  }

  const timezone = CITY_TIMEZONES[place];
  if (!timezone) {
    return `Je ne connais pas encore le fuseau horaire de **${place}**. Donne-moi une grande ville proche et je pourrai te donner l’heure exacte.`;
  }

  const now = new Date();
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZoneName: "short",
  }).format(now);

  return `Il est actuellement **${formatted}** à **${place}**.`;
}

export function directGreeting(message: Message): string {
  const language = normalize(message.content);
  if (/\b(hola|buenos dias|buenas tardes|buenas noches)\b/.test(language)) {
    return `¡Hola ${message.author}! ¿Cómo estás?`;
  }
  if (/\b(hello|hi|hey)\b/.test(language)) {
    return `Hello ${message.author}! How can I help?`;
  }
  return `Coucou ${message.author} ! Comment vas-tu ?`;
}
