import type { CatalogDataset } from "./public-transport.js";

export type Bounds = readonly [number, number, number, number];
export const METROPOLITAN: Bounds = [-74.7, 45.0, -72.7, 46.2];
export const QUEBEC_HOSTS = new Set([
  "www.donneesquebec.ca", "donneesquebec.ca", "donnees.artm.quebec", "geogratis.gc.ca",
  "www.stm.info", "stm.info", "stlaval.ca", "www.stlaval.ca", "cdn.rtcquebec.ca",
  "exo.quebec", "www.exo.quebec", "www.rtm.quebec", "www.stlevis.ca", "contenu.sto.ca", "www.sto.ca",
  "www.rtl-longueuil.qc.ca", "old.rtl-longueuil.qc.ca", "prod-rtl.xperience-sites.com", "gtfs.sts.qc.ca",
  "gtfs.gpmmom.ca", "www.viarail.ca", "sts.saguenay.ca", "regim.info",
  "www.orleansexpress.com", "intercar.ca",
]);
export function safeQuebecUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || !QUEBEC_HOSTS.has(url.hostname) ||
    url.port && !(url.hostname === "gtfs.sts.qc.ca" && url.port === "8443"))
    throw new Error("Unsupported Québec transport URL");
  return url;
}
export function networkBounds(name: string): Bounds | undefined {
  if (/exo|laurentides|sorel-varennes|terrebonne|chambly|lassomption|sainte-julie|presquile|richelieu|sud-ouest|vmtl-stm|stlaval|rtl|rem$/i.test(name)) return METROPOLITAN;
  if (/rtc-/.test(name)) return [-71.8, 46.6, -70.9, 47.3];
  if (/stlevis/.test(name)) return [-71.6, 46.5, -70.8, 47];
  if (/gatineau/.test(name)) return [-76.1, 45.25, -75.3, 45.8];
  if (/transport-sts/.test(name)) return [-72.2, 45.15, -71.6, 45.7];
  if (/gtsf/.test(name)) return [-72.9, 46.15, -72.2, 46.6];
  if (/saguenay/.test(name)) return [-71.8, 48.1, -70.5, 48.7];
  if (/rimouski|transport-collectif$/.test(name)) return [-68.9, 48.1, -68.1, 48.7];
  if (/rouyn|transport-en-commun-gtfs/.test(name)) return [-79.6, 47.8, -78.2, 49];
  if (/stsv/.test(name)) return [-74.4, 45.05, -73.9, 45.4];
  if (/regim/.test(name)) return [-67.8, 47, -61, 50];
  return undefined;
}
export function inBounds(bounds: Bounds, latitude: number, longitude: number) {
  return longitude >= bounds[0] && longitude <= bounds[2] && latitude >= bounds[1] && latitude <= bounds[3];
}

export interface Supplement {
  key: string; name: string; page: string; feed?: string; modes: string[]; licence: string;
  limitation: string;
}
/** Operator pages supplement, rather than replace, the province-wide CKAN catalogue.
 * Verified 2026-11-11. Missing sources are visible limitations, not invented feeds. */
export const QUEBEC_SUPPLEMENTS: Supplement[] = [
  { key: "stlevis", name: "STLévis · Lévis", page: "https://www.stlevis.ca/stlevis/donnees-ouvertes",
    feed: "https://www.stlevis.ca/sites/default/files/public/assets/gtfs/transit/gtfs_stlevis.zip", modes: ["bus"],
    licence: "CC BY 4.0 / conditions STLévis", limitation: "Horaires prévus; conditions commerciales spécifiques de STLévis." },
  { key: "gatineau-sto", name: "STO · Gatineau", page: "https://www.sto.ca/affaires/espace-developpeurs-donnees-ouvertes/",
    feed: "https://contenu.sto.ca/GTFS/GTFS.zip", modes: ["bus"], licence: "Conditions STO",
    limitation: "Temps réel soumis à une clé STO non configurée; le flux public peut être indisponible." },
  { key: "rtl", name: "RTL · Longueuil", page: "https://www.rtl-longueuil.qc.ca/donnees-ouvertes",
    feed: "https://www.rtl-longueuil.qc.ca/transit/latestfeed/RTL.zip", modes: ["bus"], licence: "Conditions RTL",
    limitation: "Temps réel Chrono soumis à un accès développeur non configuré." },
  { key: "rem", name: "REM · Réseau express métropolitain",
    page: "https://donnees.artm.quebec/catalogue/dataset/offres-de-service-planifie-du-reseau-express-metropolitain",
    feed: "https://gtfs.gpmmom.ca/gtfs/gtfs.zip", modes: ["tram"], licence: "Licence du catalogue ARTM",
    limitation: "Horaires prévus; une fréquence sans heures fixes n’est pas une prédiction de départ." },
  { key: "via", name: "VIA Rail · gares québécoises", page: "https://www.viarail.ca/en/developer-resources",
    feed: "https://www.viarail.ca/sites/all/files/gtfs/viarail.zip", modes: ["rail"], licence: "Licence du gouvernement ouvert Canada 2.0",
    limitation: "Horaires prévus; recherche limitée aux arrêts de départ québécois." },
  { key: "exo-lrrs", name: "Exo · Le Richelain-Roussillon", page: "https://exo.quebec/fr/a-propos/donnees-ouvertes",
    feed: "https://exo.quebec/uploads/ressources-telechargeables/a-propos/donnees-ouvertes/lrrs/google_transit.zip",
    modes: ["bus"], licence: "CC BY 4.0", limitation: "Temps réel Exo non configuré." },
  { key: "saguenay", name: "STS · Saguenay", page: "https://sts.saguenay.ca/planificateur-de-trajet", modes: ["bus"],
    licence: "Non déterminée", limitation: "Pas de flux GTFS public vérifié dans ce bot; consulter le planificateur officiel." },
  { key: "regim", name: "RÉGÎM · Gaspésie–Îles-de-la-Madeleine", page: "https://regim.info/", modes: ["bus"],
    licence: "Non déterminée", limitation: "Pas de flux GTFS public vérifié dans ce bot; consulter l’exploitant." },
  { key: "orleans", name: "Orléans Express · interurbain", page: "https://www.orleansexpress.com/fr/", modes: ["bus"],
    licence: "Non déterminée", limitation: "Aucun flux officiel exploitable configuré; horaires sur le site du transporteur." },
  { key: "intercar", name: "Intercar · régional", page: "https://intercar.ca/", modes: ["bus"],
    licence: "Non déterminée", limitation: "Aucun flux officiel exploitable configuré; horaires sur le site du transporteur." },
];

export function sourceLimitations(dataset: CatalogDataset): string[] {
  if (dataset.slug === "transport-sts") return ["Temps réel et alertes selon la fraîcheur des flux publics STS Sherbrooke."];
  if (dataset.slug.includes("stm")) return ["Temps réel STM non configuré; horaires prévus, sans garantie de desserte."];
  if (dataset.slug.includes("stlaval")) return ["Temps réel STL non configuré; horaires prévus."];
  if (dataset.publisher === "Exo" || /gtfs$/.test(dataset.slug) && dataset.title.includes("Exo"))
    return ["Temps réel Exo non configuré; horaires prévus."];
  return dataset.limitations ?? ["Horaires prévus; perturbations non fournies par cette source."];
}
