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
export type RouteGeometry = Array<[longitude: number, latitude: number]>;
export type OSMBikeSurface = "asphalt" | "concrete" | "paving_stones" | "sett" | "cobblestone"
  | "compacted" | "fine_gravel" | "gravel" | "ground" | "dirt" | "earth" | "grass"
  | "grass_paver" | "sand" | "wood" | "metal" | "mud" | "snow" | "ice" | "unpaved";
export type OSMBikeFacility = "track" | "lane" | "shared_lane" | "shared" | "opposite"
  | "opposite_lane" | "opposite_track" | "share_busway" | "shoulder" | "separate" | "no";
export interface VerifiedJourney {
  departure: number;
  arrival: number;
  legs: VerifiedLeg[];
  warning: boolean;
  /** Independently verified GeoJSON sections from the public-transit planner. */
  mapGeometry?: RouteGeometry[];
  mapGeometryPartial?: boolean;
  road?: {
    mode: "car" | "walk" | "bike";
    source?: "ign" | "openstreetmap";
    distanceMeters: number;
    steps: Array<{ instruction: string; distanceMeters: number; surface?: OSMBikeSurface; cycleway?: OSMBikeFacility }>;
    geometry?: RouteGeometry;
    resourceVersion?: string;
  };
}
export type JourneyMode = "car" | "walk" | "transit" | "compare";
export interface ComparedJourney {
  mode: "car" | "walk" | "bike" | "transit";
  origin: OfficialPlace;
  destination: OfficialPlace;
  journey?: VerifiedJourney;
  unavailable?: string;
}
export interface JourneyComparison {
  entries: ComparedJourney[];
  recommended?: "car" | "walk" | "bike" | "transit";
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
export interface BikeJourneyProvider {
  journeys(from: OfficialPlace, to: OfficialPlace, at: number, represents: "arrival" | "departure",
    fresh?: boolean): Promise<VerifiedJourney[]>;
}
