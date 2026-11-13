import type { CatalogDataset, CatalogResource, StopCollection, TransportLocation } from "./public-transport.js";
import type { GtfsSelection } from "./gtfs-selective.js";
import type { ReferenceRoute, ReferenceStop } from "./transport-reference-tables.js";
import type { GtfsRouteAtStops } from "./gtfs-realtime.js";
import type { TransportMetadataCache } from "./transport-metadata-cache.js";
import type { TransitMode } from "./transport-query.js";

export type BuiltInTransportTerritory = "fr" | "qc" | "en" | "ie" | "lu" | "ch" | "no" | "is" | "sg" | "lv" | "cz" | "pt" | "au" | "ua";
export type TransportTerritory = BuiltInTransportTerritory | `mobility:${string}`;
export const TERRITORY_NAMES: Record<BuiltInTransportTerritory, string> = {
  fr: "France", qc: "Québec", en: "Angleterre", ie: "Irlande", lu: "Luxembourg", ch: "Suisse",
  no: "Norvège", is: "Islande", sg: "Singapour", lv: "Lettonie", cz: "Tchéquie", pt: "Portugal",
  au: "Australie", ua: "Ukraine",
};
export function mobilityCountryCodeForTerritory(territory?: TransportTerritory): string | undefined {
  const match = territory?.match(/^mobility:([a-z]{2})$/i);
  return match?.[1]?.toUpperCase();
}
export function isMobilityTerritory(territory?: TransportTerritory): boolean {
  return mobilityCountryCodeForTerritory(territory) !== undefined;
}
const ADMIN_REGION_COUNTRY_CODES: Record<BuiltInTransportTerritory, string> = {
  fr: "FR", qc: "CA", en: "GB", ie: "IE", lu: "LU", ch: "CH", no: "NO",
  is: "IS", sg: "SG", lv: "LV", cz: "CZ", pt: "PT", au: "AU", ua: "UA",
};
export function administrativeRegionCountryCode(territory?: TransportTerritory): string | undefined {
  return mobilityCountryCodeForTerritory(territory) ??
    (territory ? ADMIN_REGION_COUNTRY_CODES[territory as BuiltInTransportTerritory] : undefined);
}
export function supportsAdministrativeRegionBrowsing(territory?: TransportTerritory): boolean {
  return !!administrativeRegionCountryCode(territory) && territory !== "fr" && territory !== "ie";
}
export function administrativeRegionWithinTerritory(territory: TransportTerritory, name: string): boolean {
  const normalized = name.toLocaleLowerCase("und").normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
  const scope: Partial<Record<BuiltInTransportTerritory, string[]>> = {
    qc: ["quebec"], en: ["england"], au: ["queensland"],
    pt: ["lisbon", "lisboa"], ua: ["lviv"], cz: ["prague", "praha"],
    is: ["capital region", "reykjavik", "hofudborgarsvaedid"],
  };
  const dynamicCode = mobilityCountryCodeForTerritory(territory);
  const allowedNames = scope[territory as BuiltInTransportTerritory] ?? (dynamicCode === "GB" ? ["england"] : undefined);
  return !allowedNames || allowedNames.some(value => normalized === value || normalized.includes(value));
}
export function territoryLabel(territory: TransportTerritory, language: "fr" | "en" = "fr"): string {
  const code = mobilityCountryCodeForTerritory(territory);
  if (!code) return TERRITORY_NAMES[territory as BuiltInTransportTerritory] ?? territory;
  try {
    const name = new Intl.DisplayNames([language === "fr" ? "fr" : "en"], { type: "region" }).of(code);
    if (name && name !== code) return `${name} · Mobility Database`;
  } catch { /* The ISO code below remains an unambiguous label. */ }
  return `${code} · Mobility Database`;
}
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
