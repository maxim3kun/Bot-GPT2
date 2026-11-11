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
}
export interface ItineraryProvider {
  places(query: string, fresh?: boolean): Promise<OfficialPlace[]>;
  journeys(from: OfficialPlace, to: OfficialPlace, at: number, represents: "arrival" | "departure",
    fresh?: boolean): Promise<VerifiedJourney[]>;
  stations(line: string, fresh?: boolean): Promise<{ line: string; count: number }>;
}
