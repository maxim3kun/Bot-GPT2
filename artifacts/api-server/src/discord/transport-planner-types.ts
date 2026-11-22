export type PlannerFailure = "not_configured" | "access" | "quota" | "unavailable" | "invalid" | "date" | "busy";
export class PlannerError extends Error {
  constructor(readonly code: PlannerFailure) { super(`Transport planner: ${code}`); }
}
export interface OfficialPlace {
  id: string;
  name: string;
  label: string;
  ids: string[];
  latitude?: number;
  longitude?: number;
}
export interface VerifiedLeg {
  kind: "transit" | "walk" | "transfer" | "wait";
  from: string;
  to: string;
  departure: number;
  arrival: number;
  line?: string;
  direction?: string;
  freshness?: string;
}
export interface VerifiedJourney {
  departure: number;
  arrival: number;
  legs: VerifiedLeg[];
  warning: boolean;
  road?: {
    mode: "car" | "walk";
    distanceMeters: number;
    steps: Array<{ instruction: string; distanceMeters: number }>;
    resourceVersion: string;
  };
}
export type JourneyMode = "car" | "walk" | "transit" | "compare";
export interface ComparedJourney {
  mode: "car" | "walk" | "transit";
  origin: OfficialPlace;
  destination: OfficialPlace;
  journey?: VerifiedJourney;
  unavailable?: string;
}
export interface JourneyComparison {
  entries: ComparedJourney[];
  recommended?: "car" | "walk" | "transit";
}
export interface JourneyRequest {
  mode: JourneyMode | null;
  origin?: string;
  destination?: string;
  time?: string;
}
export interface ItineraryProvider {
  places(query: string, fresh?: boolean): Promise<OfficialPlace[]>;
  journeys(from: OfficialPlace, to: OfficialPlace, at: number, represents: "arrival" | "departure",
    fresh?: boolean, mode?: "car" | "walk"): Promise<VerifiedJourney[]>;
  stations(line: string, fresh?: boolean): Promise<{ line: string; count: number }>;
}
