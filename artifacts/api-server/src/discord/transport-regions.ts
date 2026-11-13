import { normalizeTransitText, type TransitMode } from "./transport-query.js";
import { modeMatches, isStaticScheduleResource, type CatalogDataset } from "./public-transport.js";

export interface TransportRegion {
  code: string;
  name: string;
  departmentCodes: string[];
  epciCodes: string[];
  territory?: "ie" | "lu";
  parentName?: string;
  boundary?: GeoJsonBoundary;
}
export type GeoJsonBoundary =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };
export const regionName = (name: string) => normalizeTransitText(name).replace(/^r[eé]gion\s+/, "")
  .replace(/^(?:en|dans la|dans le)\s+/, "").replace(/[^a-z0-9]/g, "");
// Recognition only. Membership and identifiers are verified with geo.api.gouv.fr.
export const FRENCH_REGIONS = ["Île-de-France", "Centre-Val de Loire", "Bourgogne-Franche-Comté", "Normandie", "Hauts-de-France",
  "Grand Est", "Pays de la Loire", "Bretagne", "Nouvelle-Aquitaine", "Occitanie", "Auvergne-Rhône-Alpes",
  "Provence-Alpes-Côte d'Azur", "Corse", "Guadeloupe", "Martinique", "Guyane", "La Réunion", "Mayotte"] as const;
export const isRegionName = (value: string) => FRENCH_REGIONS.some(name => regionName(name) === regionName(value));

/** Region names explicitly covered by an available schedule resource for the selected mode. */
export function coveredFrenchRegions(catalog: CatalogDataset[], mode: TransitMode): string[] {
  const covered = new Set(catalog.filter(dataset => dataset.type === "public-transit" &&
    dataset.resources.some(resource => isStaticScheduleResource(resource) &&
      modeMatches(mode, resource.modes ??
        (Array.isArray(resource.metadata?.modes) ? resource.metadata.modes as string[] : undefined))))
    .flatMap(dataset => (dataset.covered_area ?? [])
      .filter(area => area.type === "region" && area.nom)
      .map(area => regionName(area.nom!))));
  return FRENCH_REGIONS.filter(name => covered.has(regionName(name)));
}

/** Official administrative memberships, not a region centroid or a name substring. */
export function regionalNetworks(catalog: CatalogDataset[], region: TransportRegion, mode: TransitMode): CatalogDataset[] {
  const seen = new Set<string>();
  return catalog.filter(d => d.type === "public-transit" &&
    d.covered_area?.some(area => area.type === "region" && area.insee === region.code ||
      area.type === "departement" && region.departmentCodes.includes(area.insee ?? "") ||
      area.type === "commune" && region.departmentCodes.some(code => area.insee?.startsWith(code)) ||
      area.type === "epci" && region.epciCodes.includes(area.insee ?? "")) &&
    d.resources.some(r => isStaticScheduleResource(r) && modeMatches(mode, r.modes ??
      (Array.isArray(r.metadata?.modes) ? r.metadata.modes as string[] : undefined))))
    .sort((a, b) => Number(/agr[eé]gat/i.test(a.title)) - Number(/agr[eé]gat/i.test(b.title)) || a.title.localeCompare(b.title, "fr"))
    .filter(d => {
      const feeds = d.resources.filter(isStaticScheduleResource).map(r => r.original_url || r.url).sort().join("|");
      if (seen.has(feeds)) return false;
      seen.add(feeds); return true;
    });
}
