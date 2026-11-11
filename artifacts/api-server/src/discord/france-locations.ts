import type { TransportLocation } from "./public-transport.js";
import { normalizeCityName } from "./bus-journey.js";
export interface FrenchArea { kind: "department" | "postcode"; code: string }
export function frenchArea(value: string): FrenchArea | null {
  const text = value.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim()
    .replace(/^(?:departement|dept\.?|dep\.?|code postal|cp)\s*/i, "").toUpperCase();
  if (/^\d{5}$/.test(text)) return { kind: "postcode", code: text };
  if (/^(?:\d{2}|2[AB]|97\d|98\d)$/.test(text)) return { kind: "department", code: text };
  return null;
}
type Json = (url: string, maxBytes: number) => Promise<unknown>;
interface Commune {
  nom?: string; code?: string; codeDepartement?: string; population?: number; codesPostaux?: string[];
  centre?: { coordinates?: number[] }; departement?: { code?: string; nom?: string }; region?: { nom?: string };
}
interface Station {
  nom?: string; id?: string; codeinsee?: string; codes_uic?: string;
  position_geographique?: { lat?: number; lon?: number };
}
const cityCode = (value: string) => /^(?:\d{5}|2[AB]\d{3})$/i.test(value);
const coordinates = (lon?: number, lat?: number) => Number.isFinite(lon) && Number.isFinite(lat)
  && Math.abs(lon!) <= 180 && Math.abs(lat!) <= 90;

/** Official geographic and passenger-station references; neither is evidence of today's train service. */
export class FranceLocations {
  constructor(private readonly json: Json) {}
  async named(place: string): Promise<TransportLocation[]> {
    const qualifier = place.match(/(?:\s+|\s*\()(\d{2,5}|2[ab])\)?$/i)?.[1]?.toUpperCase();
    const name = qualifier ? place.replace(/(?:\s+|\s*\()(\d{2,5}|2[ab])\)?$/i, "").trim() : place;
    const url = new URL("https://geo.api.gouv.fr/communes");
    url.searchParams.set("nom", name);
    url.searchParams.set("fields", "nom,code,codeDepartement,codesPostaux,centre,departement,region,population");
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "20");
    const result = await this.json(url.href, 1_000_000);
    if (!Array.isArray(result)) throw Error("Invalid official municipality response");
    let communes = result as Commune[];
    const exact = communes.filter(commune => normalizeCityName(commune.nom ?? "") === normalizeCityName(name));
    if (exact.length) communes = exact;
    if (qualifier) communes = communes.filter(commune => qualifier.length === 5
      ? commune.codesPostaux?.includes(qualifier)
      : (commune.departement?.code ?? commune.codeDepartement) === qualifier);
    return communes.sort((a, b) => (b.population ?? 0) - (a.population ?? 0)).flatMap(commune => {
      const [longitude, latitude] = commune.centre?.coordinates ?? [];
      if (!commune.nom || !commune.code || !cityCode(commune.code) || !coordinates(longitude, latitude)) return [];
      const context = [commune.departement?.code ?? commune.codeDepartement, commune.departement?.nom, commune.region?.nom]
        .filter(Boolean).join(", ");
      return [{ id: commune.code, name: commune.nom,
        label: `${commune.nom}${context ? ` — ${context}` : ""}`,
        latitude: latitude!, longitude: longitude!, territory: "fr" as const }];
    });
  }

  async anchor(city: TransportLocation): Promise<TransportLocation> {
    if (city.kind === "station" || !cityCode(city.id)) return city;
    const url = new URL(`https://geo.api.gouv.fr/communes/${city.id}`);
    url.searchParams.set("format", "geojson"); url.searchParams.set("geometry", "mairie"); url.searchParams.set("fields", "nom,code");
    const data = await this.json(url.href, 200_000) as { properties?: { code?: string }; geometry?: { type?: string; coordinates?: number[] } };
    const [lon, lat] = data.geometry?.coordinates ?? [];
    if (data.properties?.code !== city.id || data.geometry?.type !== "Point" || !coordinates(lon, lat))
      throw Error("Invalid municipality transport anchor");
    return { ...city, longitude: lon!, latitude: lat! };
  }
  async numeric(place: string): Promise<TransportLocation[] | null> {
    const area = frenchArea(place);
    if (!area) return null;
    const url = new URL("https://geo.api.gouv.fr/communes");
    url.searchParams.set(area.kind === "postcode" ? "codePostal" : "codeDepartement", area.code);
    url.searchParams.set("fields", "nom,code,codesPostaux,centre,departement,region,population");
    const result = await this.json(url.href, 4 * 1024 * 1024);
    if (!Array.isArray(result)) throw Error("Invalid official municipality response");
    return (result as Commune[]).sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
      .flatMap(c => {
        const [lon, lat] = c.centre?.coordinates ?? [];
        if (!c.nom || !c.code || !cityCode(c.code) || !coordinates(lon, lat)) return [];
        const context = [c.departement?.code, c.departement?.nom, c.region?.nom].filter(Boolean).join(", ");
        return [{ id: c.code, name: c.nom, label: `${c.nom}${context ? ` — ${context}` : ""}`,
          longitude: lon!, latitude: lat!, territory: "fr" as const }];
      });
  }
  async stations(place: string, cities: TransportLocation[]): Promise<TransportLocation[]> {
    const area = frenchArea(place), codes = [...new Set(cities.map(c => c.id).filter(cityCode))];
    if (!codes.length) return [];
    const where = area?.kind === "department" ? `startswith(codeinsee,"${area.code}")`
      : `codeinsee in (${codes.map(code => `"${code}"`).join(",")})`;
    const result: TransportLocation[] = [];
    for (let offset = 0; offset < 1000; offset += 100) {
      const url = new URL("https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/gares-de-voyageurs/records");
      url.searchParams.set("where", where); url.searchParams.set("limit", "100");
      url.searchParams.set("offset", String(offset)); url.searchParams.set("order_by", "nom");
      const data = await this.json(url.href, 2 * 1024 * 1024) as { results?: Station[]; total_count?: number };
      if (!Array.isArray(data.results) || !Number.isInteger(data.total_count) || data.total_count! > 1000)
        throw Error("Invalid or oversized official station response");
      for (const station of data.results) {
        const { lat, lon } = station.position_geographique ?? {};
        // Validate the returned municipality as well as the provider's query filter.
        if (!station.nom || !station.id || !station.codeinsee || !codes.includes(station.codeinsee) || !coordinates(lon, lat)) continue;
        const city = cities.find(c => c.id === station.codeinsee)!;
        result.push({ id: `sncf:${station.id}`, name: station.nom,
          label: `Gare de ${station.nom} · ${city.label}`, latitude: lat!, longitude: lon!, kind: "station" });
      }
      if (offset + data.results.length >= data.total_count!) break;
      if (!data.results.length) throw Error("Incomplete official station pagination");
    }
    return [...new Map(result.map(station => [station.id, station])).values()];
  }
}
