export function isAiEcologyRequest(text: string): boolean {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/₂/g, "2").toLowerCase();
  const environment = /\b(?:carbone?|co2|ecolog\w*|environn\w*|environment\w*|climat\w*|energi\w*|energy|electric\w*|electri\w*|emissions?|eau|water|pollu\w*|kwh|watts?)\b/.test(normalized);
  const ai = /\b(?:ia|ai|intelligence artificielle|artificial intelligence|chatgpt|maximegpt|gpt|llms?)\b/.test(normalized);
  const self = /\b(?:ton|ta|tes|votre|vos|your)\s+(?:(?:propre|own|carbon|environmental|ecological|water)\s+)?(?:empreinte|impact|consommation|emissions?|usage|footprint|energie|electricite|energy|water|modele|model)\b/.test(normalized) ||
    /\b(?:cette|ta|tes|votre|vos|your|this)\s+(?:reponses?|requetes?|messages?|responses?|repl(?:y|ies)|requests?)\b/.test(normalized) ||
    /\b(?:tu|vous|you)\s+(?:consomm\w*|utilis\w*|pollu\w*|emets|emit\w*|use|consume\w*)\b/.test(normalized) ||
    /\b(?:consomm\w*|utilis\w*|pollu\w*|emets|emit\w*|use|consume\w*)[- ]+(?:tu|vous|you)\b/.test(normalized);
  return environment && (ai || self);
}

const REQUEST_ONLY =
  "Do not add unsolicited AI environmental-impact estimates, counters, comparisons or disclaimers. " +
  "Discuss this topic only when the current user asks about it or clearly follows up on an existing environmental question. " +
  "A previous topic or a stored preference is not a reason to append it to unrelated replies.";

export const AI_ECOLOGY_GUIDANCE =
  "Answer only the environmental question asked; a conceptual question does not automatically request a numerical footprint. " +
  "You have no direct measurements of this bot's GPU power, runtime, datacenter electricity mix, PUE or cooling water. " +
  "Never present an exact footprint for this exchange or infer it merely from a message/token count. One Discord message may cause several inference calls. " +
  "Use relevant, dated, retrieved sources and identify their model/workload and scope. An estimate for a different model is not a measurement of this bot. " +
  "Separate inference from training, hardware manufacture and other lifecycle impacts; distinguish electricity, water and emissions. " +
  "Do not invent a universal per-AI-message emission factor or precise country multipliers. If comparable data are missing, admit the estimate cannot be established. " +
  "For an explicitly requested estimate, give sourced ranges or clearly labelled hypothetical scenarios, not false precision. " +
  "Energy in kWh multiplied by carbon intensity in gCO2e/kWh gives gCO2e; convert Wh/kWh and g/kg/t correctly using verified_calculation. " +
  "Do not double-count facility overhead if the energy estimate already includes it. CO2 and CO2e are not interchangeable. " +
  "For requested flight comparisons, specify departure/destination, return versus one-way, per-passenger scope and the treatment of non-CO2 effects. " +
  "Ask for missing route details when needed, or explicitly label an illustrative route instead of assuming one. No precise flight-equivalent message count without comparable sourced inputs.";

export function ecologyGuidanceFor(text: string): string {
  return REQUEST_ONLY + (isAiEcologyRequest(text) ? "\n" + AI_ECOLOGY_GUIDANCE : "");
}
