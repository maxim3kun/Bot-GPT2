export function isPersonaPickerRequest(text: string): boolean {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /\b(?:parle|parler|discute|discuter|choisis|choisir|selectionne|selectionner|propose|proposer|utilise|utiliser)\b[\s\S]{0,70}\b(?:persona|personnage)s?\b/.test(normalized)
    || /\b(?:persona|personnage)s?\b[\s\S]{0,70}\b(?:parle|parler|discute|discuter|choisis|choisir|selectionne|selectionner)\b/.test(normalized)
    || /\b(?:talk|speak|chat)\s+(?:to|with)\s+(?:(?:a|an|the|my)\s+)?personas?\b/.test(normalized)
    || /\b(?:choose|select|use)\b[\s\S]{0,70}\bpersonas?\b/.test(normalized)
    || /\b(?:want|would like)\s+to\s+(?:talk|speak|chat)\s+(?:to|with)\s+(?:(?:a|the|my)\s+)?personas?\b/.test(normalized)
    || /\bpersonas?\b[\s\S]{0,70}\b(?:talk|speak|chat|choose|select)\b/.test(normalized);
}

export function isPersonaCreationRequest(text: string): boolean {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const creationVerb = /(?:cree(?:r)?|fais(?:-moi|\s+moi)?|fabrique(?:r)?|construis(?:re)?|create|make(?:\s+me)?|build)/;
  return new RegExp(`\\b${creationVerb.source}\\b[\\s\\S]{0,80}\\b(?:persona|personnage)\\b`).test(normalized)
    || /\b(?:je\s+veux|je\s+voudrais|j'aimerais|peux[-\s]+tu|tu\s+peux|i\s+want|i'd\s+like|can\s+you|could\s+you)\b[\s\S]{0,45}\b(?:cree(?:r)?|fais(?:-moi|\s+moi)?|fabrique(?:r)?|construis(?:re)?|create|make(?:\s+me)?|build)\b[\s\S]{0,40}\b(?:persona|personnage)\b/.test(normalized)
    || /^persona\s+(?:create|cree|creer)\b/.test(normalized);
}
