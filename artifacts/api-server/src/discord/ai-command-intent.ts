import { parseAiCommandTool, safeSearchText, type AiCommandAction } from "./ai-command-tools.js";
import { extractRadioStationRequest } from "./radio-intent.js";
import { parseTransportCommand } from "./transport-command-query.js";
import { travelTurn } from "./transport-intent.js";

export type CommandParameter = "youtube" | "youtube_search" | "radio" | "game";
export type CommandIntent = { kind: "action"; action: AiCommandAction } | { kind: "clarify"; fr: string; en: string; parameter?: CommandParameter } | { kind: "none" };
export const actionText = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’']/g, " ").replace(/\s+/g, " ").trim();
const starters = "(?:lance|demarre|joue|mets|cherche|recherche|ouvre|affiche|montre|arrete|stop|pause|reprends|reprend|passe|itineraire|trajet|play|start|show|search|resume|skip)";
export function commandSafety(text: string): "quoted" | "multiple" | null {
  const n = actionText(text);
  if (/^[>"'«`]|```/.test(text.trim()) ||
    /^(?:explique|traduis|cite|repete|imagine|suppose|si |quand |il a dit|elle a dit|on m a dit|comment (?:faire|utiliser|lancer|jouer))/.test(n) ||
    /\b(?:si tu|si je|si on|si nous|if you|if i|if we|quand tu|when you|par exemple|a titre d exemple)\b/.test(n) ||
    /\b(?:ne pas|ne jamais|pas maintenant|not now)\b/.test(n) ||
    /^(?:ne |n )(?:lance|execute|ouvre|mets|joue|demarre|arrete|cherche).*\b(?:pas|jamais)\b/.test(n) ||
    /^(?:mets|joue|lance|demarre|arrete)\s+(?:pas|jamais)\b/.test(n)) return "quoted";
  const primary = actionText(requestBody(text));
  const startsAction = new RegExp(`^(?:${starters}|donne|quels?|quelle|bus|metro|tram|train|horaires?)\\b`).test(primary) ||
    hasRouteRequest(primary) || /^(?:je (?:pars|prends|prend|dois)|mon service)\b/.test(primary);
  if (startsAction && (new RegExp(`(?:\\b(?:et|puis|ensuite|and|then)\\s+(?:(?:aussi|apres|me|un|une|le|la)\\s+)*|[;,.\\n]\\s*)${starters}\\b`).test(n) ||
    /\b(?:et|ou|and|or)\s+(?:un |une |le |la )?(?:demineur|puissance\s*4|geoguessr|trivia|radio|bus|metro|tram|train)\b/.test(n))) return "multiple";
  return null;
}
function requestBody(text: string) {
  return text.trim().replace(/^(?:stp|s['’]il te pla[iî]t|please)[,\s]+/i, "")
    .replace(/^(?:(?:est[- ]ce que )?tu peux|peux[- ]tu|pourrais[- ]tu|est[- ]ce que tu pourrais|can you|could you|je (?:veux|voudrais|souhaite))\s+/i, "")
    .replace(/^(?:me|moi)\s+/i, "").replace(/[?!.\s]+$/, "").replace(/\s+(?:stp|s['’]il te pla[iî]t|please|merci)$/i, "").trim();
}
const clarify = (fr: string, en: string, parameter?: CommandParameter): CommandIntent => ({ kind: "clarify", fr, en, ...(parameter ? { parameter } : {}) });
const none: CommandIntent = { kind: "none" };
export const hasRouteRequest = (text: string) => /\b(?:itineraire|trajet|correspondance|chemin|comment.*(?:aller|rendre|rejoindre)|quel(?:le)?s?.*(?:prendre|emprunter)|quelle direction|route from|how.*get)\b/.test(actionText(text));
export function isTimetableSearch(text: string) {
  const n = actionText(requestBody(text));
  return !hasRouteRequest(n) && /^(?:(?:quels? (?:sont )?(?:les? )?|donne[r]?(?: moi)? |montre[r]?(?: moi)? |affiche[r]?(?: moi)? |cherche[r]? |recherche[r]? |consulte[r]? |ouvre |ouvrir |trouve[r]? |show |search )?(?:les? |une? |la |des? )?)(?:horaires?|prochains? (?:passages?|departs?|bus|metros?|trains?|trams?)|recherche (?:de )?transports?|autobus|bus|metro|tram|train|rer)\b/.test(n);
}
export function selectAiCommand(text: string, stations: Readonly<Record<string, { name: string }>>): CommandIntent {
  const safety = commandSafety(text);
  if (safety === "quoted") return none;
  if (safety === "multiple") return clarify("Demande une seule action à la fois, pour que je n’en exécute pas seulement une partie.", "Request one action at a time so I do not execute only part of it.");
  const body = requestBody(text), n = actionText(body);
  const action = (value: AiCommandAction): CommandIntent => {
    const { name, ...args } = value;
    const checked = parseAiCommandTool([{ type: "function", function: { name, arguments: JSON.stringify(args) } }], Object.keys(stations));
    return checked ? { kind: "action", action: checked } : clarify("Précise des paramètres valides, sans commande, lien externe ni identifiant de membre ou de salon.", "Use valid arguments without commands, external links, or member/channel identifiers.");
  };
  const station = extractRadioStationRequest(body, stations);
  if (station) return action({ name: "play_radio", station });
  if (/^(?:(?:mets|mettre|lance|lancer|joue|jouer|ecoute|ecouter|play|start)\s+(?:la |une |le )?)?(?:radio|station)\b/.test(n))
    return clarify(`Quelle radio connue souhaites-tu ? Par exemple : ${Object.values(stations).slice(0, 6).map(s => s.name).join(", ")}.`, "Which configured radio station would you like?", "radio");
  if (/^(?:(?:mets|mettre|fais|faire)\s+(?:la |le |en )?)?pause(?: (?:la |le |de la )?(?:musique|lecture|son|radio))?$/.test(n) ||
    /^(?:mets|mettre) (?:la |le )?(?:musique|lecture|son|radio) en pause$/.test(n)) return action({ name: "music_pause" });
  if (/^(?:reprends|reprendre|reprend|relance|resume)(?: (?:la |le |de la )?(?:musique|lecture|son|radio))?$/.test(n)) return action({ name: "music_resume" });
  if (/^(?:suivant|suivante|skip|passe (?:au |a la )?(?:morceau |titre |chanson )?suivant(?:e)?|(?:morceau|titre|chanson) suivant(?:e)?)$/.test(n)) return action({ name: "music_skip" });
  if (/^(?:arrete|arreter|stop|stoppe|coupe|couper)(?: (?:la |le |de la )?(?:musique|lecture|son|radio))$/.test(n)) return action({ name: "music_stop" });
  if (/^(?:(?:montre|affiche|voir|show) (?:moi )?(?:la |le )?)?(?:file d attente|queue)(?: (?:musicale|musique))?$/.test(n)) return action({ name: "music_queue" });
  if (/^(?:quel(?:le)? (?:est |est le |est la )?(?:le |la )?(?:titre|morceau|chanson|musique)(?: (?:actuel(?:le)?|en cours|qui joue|joue))?|qu est ce qui joue|what s playing|now playing|titre en cours)$/.test(n)) return action({ name: "music_current" });
  const youtube = body.match(/^(?:joue[r]?|mets|mettre|lance[r]?|[eé]coute[r]?|play)\s+(?:(?:sur\s+)?YouTube\s+)?(.+?)(?:\s+sur\s+YouTube)?$/i);
  const search = body.match(/^(?:cherche[r]?|recherche[r]?|search)\s+(?:sur\s+YouTube\s+(.+)|(.+?)\s+sur\s+YouTube)$/i);
  if (/^(?:cherche[r]?|recherche[r]?|search)\s+(?:sur\s+)?YouTube$/i.test(body))
    return clarify("Quel titre ou artiste veux-tu rechercher sur YouTube ?", "Which title or artist should I search for on YouTube?", "youtube_search");
  const musicVerb = !/^lance[r]?\b/.test(n) || /\b(?:musique|chanson|morceau|titre|youtube)\b/.test(n);
  if (search || youtube && musicVerb && (/\byoutube\b/.test(n) || !/\b(?:jeu|game|partie|echecs|chess|sudoku|poker|uno|fortnite|minecraft|demineur|puissance ?4|connect ?4|puissance|connect|minesweeper|geo|geoguessr|guess ?number|guess ?logo|guessthelogo|devinelelogo|trivia|quiz|devine|logo|nombre|blindtest|tierlist|milliongame|shellgame|bus|metro|tram|train|aide|help|trajet|itineraire|chemin|correspondance)\b/.test(n) && !/^(?:joue[r]?|play) (?:a |au |aux |a la )/.test(n))) {
    const query = (search?.[1] ?? search?.[2] ?? youtube?.[1] ?? "").trim();
    if (/^(?:la |de la |une? )?(?:musique|chanson|son|youtube)$/i.test(query))
      return clarify("Quel titre ou artiste veux-tu rechercher sur YouTube ?", "Which title or artist would you like on YouTube?", search ? "youtube_search" : "youtube");
    return action({ name: search ? "search_youtube" : "play_youtube", query });
  }
  const game = n.match(/^(?:lance[r]?|demarre[r]?|joue[r]?|mets|mettre|start|launch|play|ouvre)\s+(?:(?:une partie de|une partie du|a la|aux|au|a|un|une|le|la)\s+)?(.+)$/);
  if (game) {
    const g = game[1]!, difficulty = g.match(/\s+(?:en |mode |niveau )?(facile|moyen|moyenne|difficile|easy|medium|hard)$/)?.[1];
    const clean = difficulty ? g.replace(/\s+(?:en |mode |niveau )?(facile|moyen|moyenne|difficile|easy|medium|hard)$/, "") : g;
    const diff = difficulty && /facile|easy/.test(difficulty) ? "easy" : difficulty && /difficile|hard/.test(difficulty) ? "hard" : "medium";
    if (/^(?:demineur|minesweeper)$/.test(clean)) return action({ name: "start_minesweeper", difficulty: diff });
    if (/^(?:geo|geoguessr|geo guessr)$/.test(clean)) return action({ name: "start_geoguessr", difficulty: difficulty ? diff : "easy" });
    if (/^(?:devine (?:le )?logo|devinelelogo|guess ?logo|guessthelogo)$/.test(clean)) return action({ name: "start_guess_logo", difficulty: difficulty ? diff : "easy" });
    if (/^(?:puissance ?4|connect ?4)(?: solo| avec (?:moi|le bot|toi))?$/.test(g)) return action({ name: "start_connect4" });
    if (/^(?:trivia|quiz|quiz trivia)$/.test(g)) return action({ name: "start_trivia" });
    if (/^(?:devine (?:le )?nombre|guess ?number)$/.test(g)) return action({ name: "start_guess_number" });
    if (/\b(?:jeu|game|demineur|minesweeper|geoguessr|trivia|quiz|echecs|chess|sudoku|poker|uno|puissance|connect|logo|nombre)\b/.test(g))
      return clarify("Je peux lancer démineur, Puissance 4 solo, GeoGuessr, trivia, devine le nombre (1 à 100) ou devine le logo. Pour démineur, GeoGuessr et les logos : facile, moyen ou difficile. Lequel souhaites-tu ?", "Choose minesweeper, solo Connect Four, GeoGuessr, trivia, guess the number (1–100) or guess the logo. Only minesweeper, GeoGuessr and logos accept easy, medium or hard.", "game");
  }
  if (isTimetableSearch(text)) {
    const match = body.match(/\b(autobus|bus|m[eé]tros?|tram(?:way)?s?|trains?|RER)\b/i);
    let query = match ? body.slice(match.index! + match[0].length) : "";
    const key = match ? actionText(match[0]).replace(/(?<!bu)s$/, "") : null;
    const modes = { autobus: "bus", bus: "bus", metro: "metro", tram: "tram", tramway: "tram", train: "rail", rer: "rail" } as const;
    const mode = key ? modes[key as keyof typeof modes] : null;
    const territory = /\b(?:au|du|pour le|en)\s+Qu[eé]bec\b|\bqc\b/i.test(query) ? "qc" :
      /\b(?:en|de|pour la)\s+France\b|\bfr\b/i.test(query) ? "fr" : undefined;
    query = query.replace(/\b(?:(?:au|du|pour le|en)\s+Qu[eé]bec|(?:en|de|pour la)\s+France|qc|fr)\b/gi, "")
      .replace(/^\s*(?:[àa]|au|de|du|des|dans)\s+/i, "").trim();
    const parsed = parseTransportCommand(query.split(/\s+/));
    // A leading number is commonly the route, not part of the locality.
    const leading = parsed.place.match(/^(\d{1,4}(?:bis)?)\s+(.+)$/i);
    if (!parsed.line && leading) { parsed.line = leading[1]; parsed.place = leading[2]!; }
    if (!safeSearchText(query, 240) || /\b(?:ligne|line)\s*$/i.test(query)) return clarify("Précise la localité et, si tu la connais, la ligne recherchée.", "Specify the locality and optionally its route.");
    return action({ name: "search_transport", mode, place: parsed.place, ...(parsed.direction ? { direction: parsed.direction } : {}),
      ...(parsed.line ? { line: parsed.line } : {}), ...(territory ? { territory } : {}) });
  }
  const travel = travelTurn(body);
  if (travel.request && travel.mode === "car" && !travel.unsupportedMode)
    return action({ name: "plan_journey", mode: "car", ...(travel.origin ? { origin: travel.origin } : {}),
      ...(travel.destination ? { destination: travel.destination } : {}) });
  if (/^(?:affiche[r]?|montre[r]?|ouvre|show)\s+(?:l |la |le )?(?:aide|help)$/.test(n)) return action({ name: "show_help" });
  if (/^(?:(?:affiche[r]?|montre[r]?|consulte[r]?|verifie[r]?) (?:le |les )?)?(?:diagnostic(?: des modules)?|module diagnostics|tech status)$/.test(n)) return action({ name: "module_diagnostic" });
  return none;
}
/** Complete only a parameter of an earlier explicit request, never arbitrary command text. */
export function completeAiCommand(parameter: CommandParameter, text: string, stations: Readonly<Record<string, { name: string }>>): CommandIntent {
  if (commandSafety(text) || !safeSearchText(text, 200) || !text.trim() ||
    /^(?:non|pas|aucun|rien|annule|stop|arrete|cancel|no|nothing|never)\b/.test(actionText(text))) return none;
  if (parameter === "youtube" || parameter === "youtube_search")
    return { kind: "action", action: { name: parameter === "youtube" ? "play_youtube" : "search_youtube", query: text.trim() } };
  if (parameter === "radio") {
    const key = Object.keys(stations).find(k => actionText(k) === actionText(text) || actionText(stations[k]!.name) === actionText(text));
    return key ? { kind: "action", action: { name: "play_radio", station: key } } : clarify("Cette radio n’est pas dans les stations configurées. Donne son nom exact.", "That station is not configured. Give its exact name.", "radio");
  }
  // The local grammar resolves game names and accepted difficulty, not prefix commands.
  const result = selectAiCommand(`Lance ${text}`, stations);
  return result.kind === "action" && result.action.name.startsWith("start_") || result.kind === "clarify" && result.parameter === "game" ? result
    : clarify("Choisis l’un des jeux proposés.", "Choose one of the listed games.", "game");
}
