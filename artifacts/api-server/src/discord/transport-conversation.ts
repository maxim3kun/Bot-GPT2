import { IdfmPlanner } from "./idfm-planner.js";
import { display, placeKey } from "./idfm-itinerary.js";
import { isTravelTimeReply, requestedTravelTime, travelTurn, type TravelTime } from "./transport-intent.js";
import { PlannerError, type ItineraryProvider, type OfficialPlace, type VerifiedJourney } from "./transport-planner-types.js";

type Side = "origin" | "destination";
interface Session {
  origin?: string; destination?: string; service?: boolean;
  resolvedOrigin?: OfficialPlace; resolvedDestination?: OfficialPlace;
  time?: TravelTime; timeError?: string;
  kind: "journey" | "stations"; line?: string; paris?: boolean;
  choice?: { side: Side; places: OfficialPlace[] };
  expires: number;
}
export interface TravelReply { content: string | null }
const SOURCE = "https://prim.iledefrance-mobilites.fr/fr/apis/idfm-navitia-general-v2";
const keyTokens = (s: string) => placeKey(s).split(" ").filter(t => !["de", "du", "la", "le", "les", "station", "metro"].includes(t));
function exactPlaces(query: string, places: OfficialPlace[]) {
  const tokens = keyTokens(query);
  return places.filter(p => tokens.length && tokens.every(t => keyTokens(p.label).includes(t)));
}

export function formatItinerary(journey: VerifiedJourney, origin: OfficialPlace, destination: OfficialPlace, french: boolean) {
  const clock = (at: number) => new Intl.DateTimeFormat(french ? "fr-FR" : "en-GB", {
    timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(at * 1000);
  const minutes = (s: number) => `${Math.ceil(s / 60)} min`;
  const legs = journey.legs.filter(l => l.kind === "transit" || l.arrival > l.departure && l.kind !== "wait").map((leg) =>
    leg.kind === "transit" ? `• **${leg.line}** · ${french ? "direction" : "towards"} **${leg.direction}**\n  ${leg.from} → ${leg.to}`
      : `• ${french ? leg.kind === "transfer" ? "Correspondance" : "À pied" : leg.kind === "transfer" ? "Transfer" : "Walk"} : ${
        leg.from === leg.to ? leg.from : `${leg.from} → ${leg.to}`} · ${minutes(leg.arrival - leg.departure)}`);
  const transit = journey.legs.filter(l => l.kind === "transit"), live = transit.filter(l => l.freshness === "realtime").length;
  const label = live === transit.length ? (french ? "Prévisions temps réel" : "Real-time estimates")
    : live ? (french ? "Prévisions et horaires théoriques" : "Predictions and scheduled times")
    : (french ? "Horaires théoriques" : "Scheduled times");
  const result = `**${origin.label} → ${destination.label}**\n${french ? "Départ" : "Departure"} ${clock(journey.departure)} · ${
    french ? "Arrivée" : "Arrival"} ${clock(journey.arrival)} · ${minutes(journey.arrival - journey.departure)}\n\n${legs.join("\n")}\n\n${
    journey.warning ? (french ? "Perturbation signalée; vérifie les informations de l’exploitant.\n" : "A disruption is reported; check operator information.\n") : ""}${
    label} · Europe/Paris\n[Île-de-France Mobilités](${SOURCE})`;
  return result.length <= 1950 ? result : (french
    ? "Le trajet officiel comporte trop de détails pour une réponse lisible. Précise un trajet plus court; je ne tronque pas ses correspondances."
    : "This official journey is too detailed for a readable reply. Narrow the trip; I won't omit its transfers.");
}

export class TransportConversation {
  private sessions = new Map<string, Session>();
  constructor(private provider: ItineraryProvider = new IdfmPlanner(), private now = Date.now) {}
  clear(scope: string) { this.sessions.delete(scope); }
  private get(scope: string) {
    for (const [key, value] of this.sessions) if (value.expires <= this.now()) this.sessions.delete(key);
    return this.sessions.get(scope);
  }
  canHandle(scope: string, text: string, continuationOnly = false) {
    const state = this.get(scope), turn = travelTurn(text);
    if (!continuationOnly && (turn.request || turn.stationQuestion)) return true;
    return !!state && (!!turn.origin || !!turn.destination || !!turn.correction || !!turn.reverse || !!turn.cancel ||
      !!state.choice && (!!turn.bare || /^\d+$/.test(text.trim())) ||
      (!state.origin || !state.destination) && !!turn.bare ||
      state.kind === "journey" && isTravelTimeReply(text) ||
      !!state.timeError && /\d/.test(text) || state.kind === "stations" && /^(?:oui|paris|m[eé]tro parisien|yes|non)$/i.test(text.trim()));
  }

  async reply(scope: string, input: string, language: string, continuationOnly = false): Promise<TravelReply | null> {
    if (!this.canHandle(scope, input, continuationOnly)) return null;
    const fr = language === "fr", t = (a: string, b: string) => fr ? a : b, turn = travelTurn(input), previous = this.get(scope);
    if (turn.cancel) { this.clear(scope); return { content: t("Recherche de trajet terminée.", "Journey search closed.") }; }
    const state: Session = previous ? { ...previous } : { kind: "journey", expires: 0 };
    const fresh = !!turn.correction;
    if (turn.stationQuestion) {
      state.kind = "stations"; state.line = turn.line; state.paris = turn.paris || !turn.outside && !!previous?.resolvedOrigin;
      state.choice = undefined;
    } else if (turn.origin || turn.destination) {
      if (state.kind === "stations") {
        state.origin = undefined; state.destination = undefined; state.resolvedOrigin = undefined;
        state.resolvedDestination = undefined; state.time = undefined; state.service = false;
      }
      state.kind = "journey"; state.line = undefined;
      // A newly specified pair starts a new trip, not an old arrival-time constraint.
      if (turn.origin && turn.destination) {
        state.time = undefined; state.timeError = undefined; state.choice = undefined;
        state.service = false;
      }
    }
    if (state.choice && !turn.origin && !turn.destination && !turn.request && !turn.correction) {
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
      if (!turn.origin && !turn.destination && turn.bare && !turn.request && !turn.correction && !turn.reverse &&
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
    const time = requestedTravelTime(input, this.now(), state.time ? state.time.represents === "arrival" : state.service);
    if (time && "error" in time) state.timeError = time.error;
    else if (time) { state.time = time; state.timeError = undefined; }
    state.expires = this.now() + 5 * 60_000;
    if (this.sessions.size >= 1000 && !this.sessions.has(scope)) this.sessions.delete(this.sessions.keys().next().value!);
    this.sessions.set(scope, state);
    const answer = (content: string): TravelReply => ({ content: this.get(scope) === state ? content : null });
    if (turn.unsupportedMode) { this.clear(scope); return { content: t(
      "Ce calculateur est utilisé ici pour les transports en commun. Je ne peux pas vérifier un itinéraire en voiture, à vélo ou entièrement à pied.",
      "This planner is used here for public transit. I cannot verify driving, cycling or walking-only routes.") }; }
    if (turn.outside || state.kind === "journey" && travelTurn(`${state.origin ?? ""} ${state.destination ?? ""}`).outside) return answer(t(
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
        "Quels sont ton départ et ton arrivée ? Indique les stations ou arrêts et leur ville.",
        "What are your departure and destination stops and cities?"));
      if (!state.origin) return answer(t(`D’où pars-tu pour aller à **${display(state.destination)}** ? Indique la station ou l’arrêt et la ville.`,
        `Where are you leaving from to reach **${display(state.destination)}**? Give the stop and city.`));
      if (!state.destination) return answer(t(`Où souhaites-tu aller depuis **${display(state.origin)}** ?`, `Where are you going from **${display(state.origin)}**?`));
      if (state.choice) return answer(this.choose(state.choice, fr));
      for (const side of ["origin", "destination"] as const) {
        const resolved = side === "origin" ? "resolvedOrigin" : "resolvedDestination";
        if (!state[resolved] || fresh) {
          const found = await this.provider.places(state[side]!, fresh);
          if (this.get(scope) !== state) return { content: null };
          const exact = exactPlaces(state[side]!, found);
          if (!found.length) return answer(t(`Je ne trouve pas « ${display(state[side])} » dans le référentiel francilien. Précise l’arrêt et la ville; je ne choisis pas une autre station à sa place.`,
            `I cannot find “${display(state[side])}” in the Île-de-France stop directory. Specify the stop and city.`));
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
      const requested = state.time ?? { at: Math.floor(this.now() / 1000), represents: "departure" as const };
      if (requested.at < this.now() / 1000 - 60) return answer(t("L’heure demandée est passée. Précise une nouvelle heure.", "The requested time has passed. Please give a new time."));
      const journeys = await this.provider.journeys(state.resolvedOrigin!, state.resolvedDestination!, requested.at, requested.represents, fresh);
      if (!journeys.length) return answer(t("Le calculateur officiel ne propose aucun trajet pour ces lieux et cette heure. Je ne peux pas en confirmer un.",
        "The official planner returned no journey for these places and time. I cannot confirm a route."));
      return answer((fresh ? t("Trajet revérifié auprès du calculateur officiel.\n", "Rechecked with the official planner.\n") : "") +
        formatItinerary(journeys[0]!, state.resolvedOrigin!, state.resolvedDestination!, fr));
    } catch (error) {
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
      return answer(`${reasons[code]![fr ? 0 : 1]} ${t("Je ne vais pas inventer un résultat.", "I won't invent a result.")}`);
    }
  }
  private choose(choice: NonNullable<Session["choice"]>, fr: boolean) {
    return (fr ? `Quel ${choice.side === "origin" ? "départ" : "arrêt d’arrivée"} souhaites-tu ? Réponds avec le numéro ou précise le lieu.\n`
      : "Which stop do you mean? Reply with the number or specify the place.\n") +
      choice.places.slice(0, 10).map((p, i) => `${i + 1}. ${p.label}`).join("\n");
  }
}
