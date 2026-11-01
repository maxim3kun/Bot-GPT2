import type { Message } from "discord.js";
import type { UserLang } from "./user-lang-store.js";

export type AiIntent =
  | "greeting"
  | "identity"
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
  "quel temps", "temps qu'il fait", "temps qu il fait", "prévision", "prevision",
  "weather", "forecast", "disponible", "disponibilité", "disponibilite",
  "version actuelle", "mise à jour", "mise a jour", "source", "cherche sur internet",
  "recherche sur internet", "regarde sur internet", "regarder sur internet",
  "sur internet", "sur le web", "vérifie en ligne", "verifie en ligne",
];

const TIME_TERMS = [
  "quelle heure", "quel heure", "heure à", "heure a", "heure en", "time in",
  "what time", "heure actuelle", "heure locale", "fuseau horaire", "timezone",
];

const WEATHER_TERMS = [
  "météo", "meteo", "quel temps", "temps qu'il fait", "temps qu il fait",
  "prévision", "prevision", "weather", "forecast",
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

  if (
    /^(bonjour|bonsoir|salut|coucou|hello|hi|hey|yo|hola|hallo|ciao)( bot| ia| toi| a toi)?[!?. ]*$/.test(normalized) ||
    /^(bonjour|bonsoir|salut|coucou|hello|hi|hey|yo|hola|hallo|ciao)?\s*(comment (?:va|vas)[- ]tu|comment tu vas|comment allez[- ]vous|comment ca va|ca va|how are you|how's it going)[!?. ]*$/.test(normalized)
  ) {
    return { intent: "greeting", needsResearch: false, needsConfirmation: false };
  }

  if (
    /^(quel est|c'est quoi|c est quoi|comment s'appelle|comment s appelle|what is)\s+(ton|ta|votre|your)\s+(nom|name)/.test(normalized) ||
    /^(ton|ta|votre|your)\s+(nom|name)\b/.test(normalized)
  ) {
    return { intent: "identity", needsResearch: false, needsConfirmation: false };
  }

  if (includesAny(normalized, TIME_TERMS)) {
    // A request such as "quelle heure et la météo à Paris" must not return
    // after answering only the first clause. Let the AI synthesize both parts
    // with web evidence while the time is supplied as deterministic context.
    return { intent: "time", needsResearch: includesAny(normalized, WEATHER_TERMS), needsConfirmation: false };
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
    // Stable, everyday questions can be answered by the model directly. Web
    // research is reserved for time-sensitive requests above or an explicit
    // request to check the Internet, so a question like "comment tu vas ?"
    // stays instant and does not produce irrelevant source links.
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

export function resolveTimeZone(place: string): string | null {
  const normalizedPlace = normalize(place);
  return CITY_TIMEZONES[place] ?? CITY_TIMEZONES[normalizedPlace] ?? (
    /^[a-z]+\/[a-z_]+(?:\/[a-z_]+)?$/i.test(place.trim()) ? place.trim() : null
  );
}

export function isWeatherRequest(text: string): boolean {
  return includesAny(normalize(text), WEATHER_TERMS);
}

export function requestedTimePlace(text: string): string | null {
  const normalized = normalize(text);
  const match = normalized.match(/(?:heure|time)(?: actuelle| locale)?(?:\s+est[- ]il|\s+is it|\s+is)?\s+(?:a|en|in)\s+(.+?)(?=\s+(?:et|and)\s+|[?.!,]|$)/);
  if (match?.[1]?.trim()) return match[1].trim();

  // Prefer the longest name first so "new york" is not partially matched
  // as "york", and normalize aliases such as Montréal/Montréal.
  for (const place of Object.keys(CITY_TIMEZONES).sort((a, b) => b.length - a.length)) {
    if (normalize(place) && normalized.includes(normalize(place))) return place;
  }
  return null;
}

export function currentTimeAnswer(
  text: string,
  fallbackPlace?: string | null,
  language: UserLang = "en",
): string {
  const prompts: Record<UserLang, { askPlace: string; unknownPlace: (place: string) => string; result: (time: string, place: string) => string }> = {
    en: { askPlace: "Which city or country? Reply with its name once and I'll remember it for next time.", unknownPlace: (place) => `I don't know the time zone for **${place}**.`, result: (time, place) => `It's **${time}** in **${place}**.` },
    fr: { askPlace: "Dans quelle ville ou quel pays ? Réponds avec son nom et je le retiendrai pour la prochaine fois.", unknownPlace: (place) => `Je ne connais pas le fuseau horaire de **${place}**.`, result: (time, place) => `Il est **${time}** à **${place}**.` },
    es: { askPlace: "¿En qué ciudad o país?", unknownPlace: (place) => `No conozco la zona horaria de **${place}**.`, result: (time, place) => `Son las **${time}** en **${place}**.` },
    de: { askPlace: "In welcher Stadt oder welchem Land?", unknownPlace: (place) => `Ich kenne die Zeitzone von **${place}** nicht.`, result: (time, place) => `In **${place}** ist es **${time}** Uhr.` },
    pt: { askPlace: "Em qual cidade ou país?", unknownPlace: (place) => `Não conheço o fuso horário de **${place}**.`, result: (time, place) => `São **${time}** em **${place}**.` },
    it: { askPlace: "In quale città o paese?", unknownPlace: (place) => `Non conosco il fuso orario di **${place}**.`, result: (time, place) => `Sono le **${time}** a **${place}**.` },
    ja: { askPlace: "どの都市または国ですか？", unknownPlace: (place) => `**${place}** のタイムゾーンがわかりません。`, result: (time, place) => `**${place}** は **${time}** です。` },
    nl: { askPlace: "Welke stad of welk land?", unknownPlace: (place) => `Ik ken de tijdzone van **${place}** niet.`, result: (time, place) => `Het is **${time}** in **${place}**.` },
    ru: { askPlace: "В каком городе или стране?", unknownPlace: (place) => `Я не знаю часовой пояс **${place}**.`, result: (time, place) => `В **${place}** сейчас **${time}**.` },
    pl: { askPlace: "W jakim mieście lub kraju?", unknownPlace: (place) => `Nie znam strefy czasowej **${place}**.`, result: (time, place) => `W **${place}** jest **${time}**.` },
    tr: { askPlace: "Hangi şehir veya ülke?", unknownPlace: (place) => `**${place}** saat dilimini bilmiyorum.`, result: (time, place) => `**${place}** saat **${time}**.` },
  };
  const localeNames: Record<UserLang, string> = {
    en: "en-GB", fr: "fr-FR", es: "es-ES", de: "de-DE", pt: "pt-PT",
    it: "it-IT", ja: "ja-JP", nl: "nl-NL", ru: "ru-RU", pl: "pl-PL", tr: "tr-TR",
  };
  const place = requestedTimePlace(text) ?? fallbackPlace;
  if (!place) return prompts[language].askPlace;

  const timezone = resolveTimeZone(place);
  if (!timezone) return prompts[language].unknownPlace(place);

  const now = new Date();
  const formatted = new Intl.DateTimeFormat(localeNames[language], {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);

  const displayPlace = place
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return prompts[language].result(formatted, displayPlace);
}

export function directGreeting(message: Message, language: UserLang = "en"): string {
  const greetings: Record<UserLang, (name: string) => string> = {
    en: (name) => `Hello ${name}! How can I help?`,
    fr: (name) => `Coucou ${name} ! Comment vas-tu ?`,
    es: (name) => `¡Hola ${name}! ¿Cómo puedo ayudarte?`,
    de: (name) => `Hallo ${name}! Wie kann ich dir helfen?`,
    pt: (name) => `Olá, ${name}! Como posso ajudar?`,
    it: (name) => `Ciao ${name}! Come posso aiutarti?`,
    ja: (name) => `${name}さん、こんにちは！何かお手伝いできますか？`,
    nl: (name) => `Hallo ${name}! Hoe kan ik je helpen?`,
    ru: (name) => `Привет, ${name}! Чем могу помочь?`,
    pl: (name) => `Cześć ${name}! Jak mogę pomóc?`,
    tr: (name) => `Merhaba ${name}! Nasıl yardımcı olabilirim?`,
  };
  return greetings[language](message.author.toString());
}

export function directIdentityAnswer(language: UserLang = "en"): string {
  const answers: Record<UserLang, string> = {
    en: "My name is **MaximeGPT** 🤖",
    fr: "Je m’appelle **MaximeGPT** 🤖",
    es: "Me llamo **MaximeGPT** 🤖",
    de: "Ich heiße **MaximeGPT** 🤖",
    pt: "Meu nome é **MaximeGPT** 🤖",
    it: "Mi chiamo **MaximeGPT** 🤖",
    ja: "私の名前は **MaximeGPT** です 🤖",
    nl: "Ik heet **MaximeGPT** 🤖",
    ru: "Меня зовут **MaximeGPT** 🤖",
    pl: "Mam na imię **MaximeGPT** 🤖",
    tr: "Benim adım **MaximeGPT** 🤖",
  };
  return answers[language];
}
