import type { CatalogDataset, CatalogResource, StopCollection, TransportLocation } from "./public-transport.js";
import type { GtfsSelection } from "./gtfs-selective.js";
import type { ReferenceRoute, ReferenceStop } from "./transport-reference-tables.js";
import type { GtfsRouteAtStops } from "./gtfs-realtime.js";
import type { TransportMetadataCache } from "./transport-metadata-cache.js";
import type { TransitMode } from "./transport-query.js";

export type TransportTerritory = "fr" | "qc" | "en" | "ie" | "lu" | "ch" | "no";
export const TERRITORY_NAMES: Record<TransportTerritory, string> = {
  fr: "France", qc: "Québec", en: "Angleterre", ie: "Irlande", lu: "Luxembourg", ch: "Suisse", no: "Norvège",
};
export interface TransportProvider {
  getCatalog(): Promise<CatalogDataset[]>;
  municipalities(place: string): Promise<TransportLocation[]>;
  railLocations?(place: string): Promise<TransportLocation[]>;
  transportAnchor?(city: TransportLocation): Promise<TransportLocation>;
  nearbyStops(latitude: number, longitude: number, radius: number): Promise<StopCollection>;
  staticFeed(resource: CatalogResource, selection?: GtfsSelection): Promise<Uint8Array>;
  realtimeFeed(resource: CatalogResource): Promise<Uint8Array>;
  nearbyStopsForResources?(latitude: number, longitude: number, resources: CatalogResource[]): Promise<StopCollection>;
  referenceRoutes?(resource: CatalogResource): Promise<ReferenceRoute[]>;
  referenceStops?(resource: CatalogResource): Promise<ReferenceStop[]>;
  discoverRoutesAtStops?(resource: CatalogResource, stopIds: ReadonlySet<string>, mode: TransitMode,
    requestedLine?: string): Promise<GtfsRouteAtStops[]>;
  networks?(city: TransportLocation, mode: TransitMode): Promise<CatalogDataset[]>;
  availableModes?(): Promise<TransitMode[]>;
  metadata?: TransportMetadataCache;
}
