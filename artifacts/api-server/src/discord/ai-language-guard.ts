import type { UserLang } from "./user-lang-store.js";

/**
 * AI Language Guard
 * Ensures the AI responds in the same language as the user without switching unnecessarily
 */

const LANGUAGE_MARKERS: Record<UserLang, readonly string[]> = {
  en: ["the", "you", "what", "how", "why", "with", "this", "that", "have", "can", "would", "because", "please", "from", "for", "and", "but", "your", "are", "not"],
  fr: ["je", "tu", "il", "elle", "nous", "vous", "est", "que", "quoi", "comment", "pourquoi", "avec", "mais", "pas", "dans", "mon", "ma", "pour", "sur", "cette", "les", "des", "une", "qui", "parce", "suis", "fais", "peux", "trop", "merci", "bonjour", "salut", "coucou"],
  es: ["yo", "ella", "nosotros", "está", "como", "qué", "cuál", "dónde", "hola", "gracias", "para", "pero", "con", "una", "los", "las", "porque", "quiero", "puedes", "tengo", "por"],
  de: ["ich", "du", "wir", "das", "der", "die", "ein", "eine", "und", "oder", "aber", "hallo", "danke", "nicht", "mit", "für", "wie", "warum", "bitte", "bin", "habe"],
  it: ["io", "lui", "lei", "noi", "sono", "che", "cosa", "dove", "come", "ciao", "grazie", "per", "con", "una", "gli", "non", "voglio", "puoi", "perché", "ma"],
  pt: ["você", "voce", "nós", "não", "nao", "para", "com", "uma", "muito", "obrigado", "olá", "ola", "está", "quero", "pode", "isso", "porque", "vocês", "também"],
  ja: [],
  nl: ["ik", "jij", "niet", "een", "het", "deze", "graag", "hallo", "waarom", "maar", "met", "zijn", "kan", "als", "omdat", "wat", "hoe", "voor"],
  ru: [],
  pl: [],
  tr: ["ben", "sen", "için", "icin", "nasıl", "nasil", "değil", "degil", "ve", "ama", "teşekkür", "tesekkur", "istiyorum", "merhaba", "lütfen", "lutfen", "neden"],
};

/** Return a language only when the message has enough reliable signals. */
export function detectUserLanguage(text: string): UserLang | null {
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text)) return "ja";
  if (/[\u0400-\u04FF]/.test(text)) {
    return /[ąćęłńóśźż]/i.test(text) ? "pl" : "ru";
  }

  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .toLowerCase();
  const strongPhrases: Partial<Record<UserLang, RegExp>> = {
    en: /\b(?:hello|hi|hey|thanks|thank you)\b/,
    fr: /\b(?:bonjour|bonsoir|salut|coucou|merci|ca va|comment ca va|qu en penses[- ]tu|tu en penses quoi|tu peux|est[- ]ce que|je suis|je veux|j ai|j aimerais|c est|s il te plait|bonne nuit|bonne journee)\b/,
    es: /\b(?:hola|gracias|buenos dias|buenas tardes)\b/,
    de: /\b(?:hallo|danke|guten tag)\b/,
    pt: /\b(?:oi|ola|obrigado|obrigada)\b/,
    it: /\b(?:ciao|grazie|buongiorno)\b/,
    nl: /\b(?:hallo|bedankt|dank je)\b/,
    pl: /\b(?:czesc|dziekuje|dzien dobry)\b/,
    tr: /\b(?:merhaba|tesekkurler|tesekkur ederim)\b/,
  };
  for (const [language, pattern] of Object.entries(strongPhrases) as [UserLang, RegExp][]) {
    if (pattern.test(normalized)) return language;
  }

  const words = new Set(normalized.match(/\p{L}+/gu) ?? []);
  const scores = new Map<UserLang, number>();

  for (const [language, markers] of Object.entries(LANGUAGE_MARKERS) as [UserLang, readonly string[]][]) {
    scores.set(language, markers.reduce((score, marker) => {
      const normalizedMarker = marker.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      return score + (words.has(normalizedMarker) ? 1 : 0);
    }, 0));
  }

  const addScore = (language: UserLang, amount: number) => scores.set(language, (scores.get(language) ?? 0) + amount);
  if (/\bj\s+\p{L}+/u.test(normalized) || /\b(?:il y a|c est|qu est ce)\b/.test(normalized)) addScore("fr", 2);
  if (/[ñ¿¡]/i.test(text)) addScore("es", 2);
  if (/[ãõ]/i.test(text)) addScore("pt", 2);
  if (/[äöüß]/i.test(text)) addScore("de", 2);
  if (/[ıİşŞğĞ]/.test(text)) addScore("tr", 2);
  if (/[ąćęłńóśźż]/i.test(text)) addScore("pl", 2);

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [bestLanguage, bestScore] = ranked[0] ?? [];
  const nextScore = ranked[1]?.[1] ?? 0;
  if (!bestLanguage || bestScore < 2 || bestScore === nextScore) return null;
  return bestLanguage;
}

/**
 * Build the language guard prompt
 * Instructs AI to NEVER switch language without explicit request
 */
export function buildLanguageGuardPrompt(userLanguage: string): string {
  const langNames: Record<string, string> = {
    en: "English",
    fr: "French",
    es: "Spanish",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ja: "Japanese",
    nl: "Dutch",
    ru: "Russian",
    pl: "Polish",
    tr: "Turkish",
  };
  
  return `🔒 **LANGUAGE PROTOCOL — CRITICAL & NON-NEGOTIABLE**:
• User's language: ${langNames[userLanguage] || userLanguage}
• RESPOND ONLY IN ${userLanguage.toUpperCase()} unless user explicitly asks otherwise (e.g., "reply in French", "réponse en anglais")
• NEVER switch language mid-conversation without a clear user request
• If unsure about translations, use original language
• Keep command names and technical terms in original language when clear
• NEVER add translations in other languages unless the user asks for them
• Example of WRONG: Responding to French user in English when not requested
• Example of RIGHT: Staying in French throughout, mentioning command names when helpful

The user wrote to you in ${langNames[userLanguage] || userLanguage}. Maintain this language throughout your response.`;
}

/**
 * Check if user is explicitly requesting a language switch
 */
export function isExplicitLanguageSwitchRequest(text: string): string | null {
  const normalized = text.toLowerCase();
  
  const patterns: Record<string, string[]> = {
    fr: ["en français", "reply in french", "parle en français", "réponds en français", "in french please"],
    es: ["en español", "reply in spanish", "habla en español", "responde en español", "in spanish please"],
    en: ["in english", "en anglais", "reply in english", "habla en inglés", "speak english"],
    de: ["auf deutsch", "in german", "reply in german", "sprich deutsch"],
    it: ["in italiano", "in italian", "reply in italian", "parla italiano"],
    pt: ["em português", "in portuguese", "reply in portuguese", "fale em português"],
    ja: ["日本語で", "in japanese", "reply in japanese", "speak japanese"],
  };
  
  for (const [lang, triggers] of Object.entries(patterns)) {
    if (triggers.some(trigger => normalized.includes(trigger))) {
      return lang;
    }
  }
  
  return null;
}
