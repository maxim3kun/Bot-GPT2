import type { CatalogDataset, CatalogResource, StopCollection, TransportLocation } from "./public-transport.js";
import type { GtfsSelection } from "./gtfs-selective.js";

export type TransportTerritory = "fr" | "qc";
export const TERRITORY_NAMES: Record<TransportTerritory, string> = { fr: "France", qc: "Québec" };
export interface TransportProvider {
  getCatalog(): Promise<CatalogDataset[]>;
  municipalities(place: string): Promise<TransportLocation[]>;
  railLocations?(place: string): Promise<TransportLocation[]>;
  transportAnchor?(city: TransportLocation): Promise<TransportLocation>;
  nearbyStops(latitude: number, longitude: number, radius: number): Promise<StopCollection>;
  staticFeed(resource: CatalogResource, selection?: GtfsSelection): Promise<Uint8Array>;
  realtimeFeed(resource: CatalogResource): Promise<Uint8Array>;
  nearbyStopsForResources?(latitude: number, longitude: number, resources: CatalogResource[]): Promise<StopCollection>;
}
