/**
 * AI Language Guard
 * Ensures the AI responds in the same language as the user without switching unnecessarily
 */

/**
 * Detect user's language from their message
 * Returns: 'fr', 'es', 'de', 'it', 'pt', 'ja', 'en', etc.
 */
export function detectUserLanguage(text: string): string {
  const normalized = text.toLowerCase();
  
  // French indicators
  if (/\b(je|tu|il|elle|nous|vous|ils|elles|c'est|qu'est|ça|où|comment|pourquoi|bonjour|oui|non|s'il|merci|de|et|ou|mais)\b/.test(normalized) &&
      /[àâäéèêëïîôöùûüœç]/.test(text)) {
    return "fr";
  }
  
  // Spanish indicators
  if (/\b(yo|tu|él|ella|nosotros|vosotros|ellos|está|son|tengo|qué|cuál|dónde|cómo|hola|sí|no|por|para|gracias)\b/.test(normalized) &&
      /[áéíóúñ¿¡]/.test(text)) {
    return "es";
  }
  
  // German indicators
  if (/\b(ich|du|er|sie|wir|ihr|sie|das|der|die|ein|eine|einen|einem|zu|und|oder|aber|hallo|ja|nein|danke)\b/.test(normalized) &&
      /[äöüß]/.test(text)) {
    return "de";
  }
  
  // Italian indicators
  if (/\b(io|tu|lui|lei|noi|voi|loro|è|sono|ho|che|cosa|dove|come|ciao|sì|no|per|grazie)\b/.test(normalized) &&
      /[àèéìòù]/.test(text)) {
    return "it";
  }
  
  // Portuguese indicators
  if (/\b(eu|tu|ele|ela|nós|vós|eles|elas|é|são|tenho|que|qual|onde|como|oi|olá|sim|não|obrigado)\b/.test(normalized) &&
      /[ãõáéíóúâêô]/.test(text)) {
    return "pt";
  }
  
  // Japanese indicators
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text)) {
    return "ja";
  }
  
  // Default to English
  return "en";
}

/**
 * Build the language guard prompt
 * Instructs AI to NEVER switch language without explicit request
 */
export function buildLanguageGuardPrompt(userLanguage: string): string {
  const langNames: Record<string, string> = {
    fr: "French",
    es: "Spanish",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ja: "Japanese",
    en: "English",
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
