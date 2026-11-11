import { IdfmPlanner } from "./idfm-planner.js";
import { display, placeKey } from "./idfm-itinerary.js";
import { isTravelTimeReply, requestedTravelTime, travelTurn, type TravelTime } from "./transport-intent.js";
import { PlannerError, type ItineraryProvider, type OfficialPlace, type JourneyRequest } from "./transport-planner-types.js";
import { IgnRoadPlanner } from "./ign-road-planner.js";
import { formatItinerary, ITINERARY_SOURCE, type ItineraryView } from "./transport-itinerary-presentation.js";
export { formatItinerary } from "./transport-itinerary-presentation.js";

type Side = "origin" | "destination";
interface Session {
  mode?: "car" | "transit";
  origin?: string; destination?: string; service?: boolean;
  resolvedOrigin?: OfficialPlace; resolvedDestination?: OfficialPlace;
  time?: TravelTime; timeError?: string;
  kind: "journey" | "stations"; line?: string; paris?: boolean;
  choice?: { side: Side; places: OfficialPlace[] };
  expires: number;
  ticket?: symbol;
}
export interface TravelReply { content: string | null; itinerary?: ItineraryView & { ticket: symbol } }
const SOURCE = ITINERARY_SOURCE;
const keyTokens = (s: string) => placeKey(s).split(" ").filter(t => !["de", "du", "la", "le", "les", "station", "metro"].includes(t));
function exactPlaces(query: string, places: OfficialPlace[]) {
  const tokens = keyTokens(query);
  return places.filter(p => tokens.length && tokens.every(t => keyTokens(p.label).includes(t)));
}

export class TransportConversation {
  private sessions = new Map<string, Session>();
  constructor(private provider: ItineraryProvider = new IdfmPlanner(), private now = Date.now,
    private road: ItineraryProvider = new IgnRoadPlanner(fetch, now)) {}
  clear(scope: string) { this.sessions.delete(scope); }
  remaining(scope: string, ticket: symbol): number {
    const state = this.get(scope);
    return state?.ticket === ticket ? Math.max(0, state.expires - this.now()) : 0;
  }
  close(scope: string, ticket: symbol) {
    if (this.remaining(scope, ticket)) this.clear(scope);
  }
  async refresh(scope: string, ticket: symbol, language: string): Promise<TravelReply | null> {
    const current = this.get(scope);
    if (!current || current.ticket !== ticket) return null;
    const state = { ...current };
    this.sessions.set(scope, state);
    return this.calculate(scope, state, language, true);
  }
  private get(scope: string) {
    for (const [key, value] of this.sessions) if (value.expires <= this.now()) this.sessions.delete(key);
    return this.sessions.get(scope);
  }
  canHandle(scope: string, text: string, continuationOnly = false) {
    const state = this.get(scope), turn = travelTurn(text);
    if (!continuationOnly && (turn.request || turn.stationQuestion)) return true;
    return !!state && (!!turn.mode || !!turn.modeAmbiguous || !!turn.origin || !!turn.destination || !!turn.correction || !!turn.reverse || !!turn.cancel ||
      !!state.choice && (!!turn.bare || /^\d+$/.test(text.trim())) ||
      (!state.origin || !state.destination) && !!turn.bare ||
      state.kind === "journey" && isTravelTimeReply(text) ||
      !!state.timeError && /\d/.test(text) || state.kind === "stations" && /^(?:oui|paris|m[eé]tro parisien|yes|non)$/i.test(text.trim()));
  }

  async reply(scope: string, input: string, language: string, continuationOnly = false, request?: JourneyRequest): Promise<TravelReply | null> {
    if (!this.canHandle(scope, input, continuationOnly)) return null;
    const fr = language === "fr", t = (a: string, b: string) => fr ? a : b,
      turn = request ? { ...travelTurn("itinéraire"), origin: request.origin, destination: request.destination, mode: request.mode ?? undefined }
        : travelTurn(input), previous = this.get(scope);
    if (turn.cancel) { this.clear(scope); return { content: t("Recherche de trajet terminée.", "Journey search closed.") }; }
    const state: Session = previous ? { ...previous, ticket: undefined } : { kind: "journey", expires: 0 };
    const fresh = !!turn.correction;
    if (turn.stationQuestion) {
      state.mode = "transit";
      state.kind = "stations"; state.line = turn.line; state.paris = turn.paris || !turn.outside && !!previous?.resolvedOrigin;
      state.choice = undefined;
    } else if (turn.origin || turn.destination || turn.mode && state.kind === "stations") {
      if (state.kind === "stations") {
        state.origin = undefined; state.destination = undefined; state.resolvedOrigin = undefined;
        state.resolvedDestination = undefined; state.time = undefined; state.service = false;
      }
      state.kind = "journey"; state.line = undefined;
      // A newly specified pair starts a new trip, not an old arrival-time constraint.
      if (turn.origin && turn.destination) {
        state.time = undefined; state.timeError = undefined; state.choice = undefined;
        state.service = false;
        state.mode = undefined;
      }
    }
    if (turn.mode && turn.mode !== state.mode) {
      state.mode = turn.mode; state.resolvedOrigin = undefined; state.resolvedDestination = undefined; state.choice = undefined;
    }
    if (turn.modeAmbiguous) { state.mode = undefined; state.resolvedOrigin = undefined; state.resolvedDestination = undefined; state.choice = undefined; }
    if (state.choice && !turn.origin && !turn.destination && !turn.request && !turn.correction && !turn.mode) {
      const choice = state.choice;
      const number = /^\d+$/.test(input.trim()) ? Number(input.trim()) - 1 : -1;
      const candidates = number >= 0 ? choice.places[number] ? [choice.places[number]!] : [] : exactPlaces(input, choice.places);
      if (candidates.length === 1) {
        state[choice.side] = candidates[0]!.label;
        state[choice.side === "origin" ? "resolvedOrigin" : "resolvedDestination"] = candidates[0];
        state.choice = undefined;
      }
    } else {
      for (const side of ["origin", "destination"] as const) if (turn[side]) {
        state[side] = turn[side]; state[side === "origin" ? "resolvedOrigin" : "resolvedDestination"] = undefined; state.choice = undefined;
      }
      if (!turn.mode && !turn.modeAmbiguous && !turn.origin && !turn.destination && turn.bare && !turn.request && !turn.correction && !turn.reverse &&
        state.kind === "journey") {
        if (!state.origin) state.origin = turn.bare; else if (!state.destination) state.destination = turn.bare;
      }
    }
    if (turn.reverse) {
      [state.origin, state.destination] = [state.destination, state.origin];
      [state.resolvedOrigin, state.resolvedDestination] = [state.resolvedDestination, state.resolvedOrigin];
      state.choice = undefined;
    }
    state.service ||= turn.service;
    const time = requestedTravelTime(request?.time ?? input, this.now(), state.time ? state.time.represents === "arrival" : state.service);
    if (time && "error" in time) state.timeError = time.error;
    else if (time) { state.time = time; state.timeError = undefined; }
    state.expires = this.now() + 5 * 60_000;
    if (this.sessions.size >= 1000 && !this.sessions.has(scope)) this.sessions.delete(this.sessions.keys().next().value!);
    this.sessions.set(scope, state);
    const answer = (content: string): TravelReply => ({ content: this.get(scope) === state ? content : null });
    if (turn.unsupportedMode) { this.clear(scope); return { content: t(
      "Je peux vérifier un trajet en voiture ou en transports collectifs, pas encore un trajet à vélo ou entièrement à pied.",
      "I can check driving or public transit routes, not cycling or walking-only routes yet.") }; }
    if (state.mode !== "car" && (turn.outside || state.kind === "journey" && travelTurn(`${state.origin ?? ""} ${state.destination ?? ""}`).outside) && state.mode) return answer(t(
      "Le calculateur d’itinéraires connecté couvre l’Île-de-France, pas ce territoire. Utilise les commandes de transport pour ses horaires disponibles; je ne vais pas inventer de correspondances.",
      "The connected route planner covers Île-de-France, not that region. Transport commands can show available schedules; I won't invent transfers."));
    try {
      if (state.kind === "stations") {
        if (/^non$/i.test(input.trim())) { this.clear(scope); return { content: t("Précise la ville et le réseau souhaités.", "Please specify the city and network.") }; }
        if (/^(?:oui|paris|m[eé]tro parisien|yes)$/i.test(input.trim())) state.paris = true;
        if (!state.paris) return answer(t(`Tu parles de la ligne ${state.line} du métro parisien ?`, `Do you mean Paris Métro line ${state.line}?`));
        const count = await this.provider.stations(state.line!, fresh);
        return answer(`${t("La ligne", "Line")} **${display(count.line)}** ${t("du métro parisien compte", "of the Paris Métro has")} **${count.count}** ${
          t("stations sur son tracé", "stations on its route")}.\n${t(
          "Ce nombre ne garantit pas qu’elles soient toutes desservies aujourd’hui : les fermetures temporaires sont distinctes.",
          "This does not guarantee all are served today; temporary closures are separate.")}\n[Île-de-France Mobilités](${SOURCE})`);
      }
      if (state.timeError) return answer(fr ? state.timeError : "Please specify a valid travel date and time, with departure or arrival.");
      if (!state.origin && !state.destination) return answer(t(
        "Quels sont ton départ et ton arrivée ? Indique les communes, arrêts ou adresses.",
        "What are your departure and destination? Give towns, stops or addresses."));
      if (!state.origin) return answer(t(`D’où pars-tu pour aller à **${display(state.destination)}** ? Indique la commune, l’arrêt ou l’adresse.`,
        `Where are you leaving from to reach **${display(state.destination)}**? Give a town, stop or address.`));
      if (!state.destination) return answer(t(`Où souhaites-tu aller depuis **${display(state.origin)}** ?`, `Where are you going from **${display(state.origin)}**?`));
      if (!state.mode) return answer(t("Souhaites-tu faire ce trajet en voiture ou en transports collectifs ? Réponds « voiture » ou « transports ».",
        "Would you like to drive or use public transit? Reply “car” or “transit”."));
      const foreignOrUnclear = [state.origin, state.destination].some(query => {
        const key = placeKey(query);
        return /^(?:quebec|canada|montreal|toronto|londres|london)$/.test(key) ||
          /\b(?:quebec|canada)$/.test(key) && !/\b(?:rue|avenue|boulevard|chemin|route)\b/.test(key);
      });
      if (state.mode === "car" && foreignOrUnclear)
        return answer(t("Le calcul routier connecté couvre la France métropolitaine, pas le Canada ou l’étranger. Pour une commune française homonyme, précise le département. Les horaires Québec restent disponibles via la commande transport.",
          "Driving covers metropolitan France, not Canada or other countries. For a similarly named French town, specify the department. Québec timetables remain available through the transport command."));
      if (state.choice) return answer(this.choose(state.choice, fr));
      for (const side of ["origin", "destination"] as const) {
        const resolved = side === "origin" ? "resolvedOrigin" : "resolvedDestination";
        if (!state[resolved] || fresh) {
          const found = await (state.mode === "car" ? this.road : this.provider).places(state[side]!, fresh);
          if (this.get(scope) !== state) return { content: null };
          const exact = exactPlaces(state[side]!, found);
          if (!found.length) return answer(state.mode === "car" ? t(`Je ne trouve pas « ${display(state[side])} » dans le géocodage routier de France métropolitaine. Précise la commune, le département ou l’adresse.`,
            `No driving location found for “${display(state[side])}” in metropolitan France. Specify the town, department or address.`) : t(`Je ne trouve pas « ${display(state[side])} » dans le référentiel francilien. Précise l’arrêt et la ville; je ne choisis pas une autre station à sa place. Le calcul de correspondances est francilien ; les horaires France/Québec restent accessibles via la commande transport.`,
            `I cannot find “${display(state[side])}” in the Île-de-France stop directory. Specify the stop and city. Connected journey planning covers Île-de-France; France/Québec timetables remain available through the transport command.`));
          if (exact.length !== 1) {
            state.choice = { side, places: exact.length ? exact : found };
            return answer(this.choose(state.choice, fr));
          }
          state[resolved] = exact[0];
        }
      }
      if (state.resolvedOrigin!.id === state.resolvedDestination!.id) return answer(t(
        "Les deux lieux correspondent à la même station officielle. Vérifie le départ et l’arrivée.",
        "Both places resolve to the same official station. Please check the endpoints."));
      return this.calculate(scope, state, language, fresh);
    } catch (error) {
      return answer(this.failure(error, fr, state.mode));
    }
  }
  private async calculate(scope: string, state: Session, language: string, fresh: boolean): Promise<TravelReply> {
    const fr = language === "fr", answer = (content: string): TravelReply => ({
      content: this.get(scope) === state ? content : null,
    });
    try {
      const requested = state.time ?? { at: Math.floor(this.now() / 1000), represents: "departure" as const };
      if (requested.at < this.now() / 1000 - 60) return answer(fr ? "L’heure demandée est passée. Précise une nouvelle heure." : "The requested time has passed. Please give a new time.");
      const origin = state.resolvedOrigin!, destination = state.resolvedDestination!;
      const journeys = await (state.mode === "car" ? this.road : this.provider).journeys(origin, destination, requested.at, requested.represents, fresh);
      if (this.get(scope) !== state) return { content: null };
      if (!journeys.length) return answer(fr ? "Le calculateur officiel ne propose aucun trajet pour ces lieux et cette heure. Je ne peux pas en confirmer un."
        : "The official planner returned no journey for these places and time. I cannot confirm a route.");
      const journey = journeys[0]!;
      state.ticket ??= Symbol("verified-trip");
      return { content: (fresh ? (fr ? "Trajet revérifié auprès du calculateur officiel.\n" : "Rechecked with the official planner.\n") : "") +
        formatItinerary(journey, origin, destination, fr),
      itinerary: { journey, origin, destination, now: Math.floor(this.now() / 1000), ticket: state.ticket } };
    } catch (error) { return answer(this.failure(error, fr, state.mode)); }
  }
  private failure(error: unknown, fr: boolean, mode?: "car" | "transit") {
    const code = error instanceof PlannerError ? error.code : "unavailable";
    const reasons: Record<string, [string, string]> = {
      not_configured: ["L’accès au calculateur officiel n’est pas configuré.", "Official planner access is not configured."],
      access: ["L’accès PRIM au calculateur est refusé; son autorisation doit être vérifiée.", "PRIM planner access was denied; authorization needs checking."],
      quota: ["Le quota du calculateur officiel est atteint. Réessaie plus tard.", "The official planner quota has been reached. Try later."],
      date: ["La date demandée n’est pas couverte par les horaires du calculateur.", "The requested date is outside the planner's schedule coverage."],
      invalid: ["La réponse du calculateur est incomplète ou incohérente; je ne peux pas confirmer ce trajet.", "The planner response is incomplete or contradictory; I cannot confirm this route."],
      busy: ["Trop de calculs sont en cours. Réessaie dans un instant.", "Too many route calculations are running. Try shortly."],
      unavailable: ["Le calculateur officiel est momentanément indisponible.", "The official planner is temporarily unavailable."],
    };
    const reason = mode === "car" && code === "date" ? (fr ? "La source routière ne peut pas calculer ce parcours ou l’heure de départ estimée est passée." : "No driving route is available or its estimated departure is in the past.")
      : reasons[code]![fr ? 0 : 1];
    return `${reason} ${fr ? "Je ne vais pas inventer un résultat." : "I won't invent a result."}`;
  }
  private choose(choice: NonNullable<Session["choice"]>, fr: boolean) {
    return (fr ? `Quel ${choice.side === "origin" ? "départ" : "arrêt d’arrivée"} souhaites-tu ? Réponds avec le numéro ou précise le lieu.\n`
      : "Which stop do you mean? Reply with the number or specify the place.\n") +
      choice.places.slice(0, 10).map((p, i) => `${i + 1}. ${p.label}`).join("\n");
  }
}
