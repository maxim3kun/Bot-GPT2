import { obj, list, text, display, placeKey } from "./idfm-itinerary.js";
import { PlannerError, type OfficialPlace, type ItineraryProvider, type VerifiedJourney } from "./transport-planner-types.js";
import { RoadHttp } from "./road-http.js";
export const ROAD_SOURCE = "https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/calcul-itineraire";
const coordinate = (p: number[]) => p.length >= 2 && p.every(Number.isFinite) && p[0]! >= -5.5 && p[0]! <= 10 && p[1]! >= 41 && p[1]! <= 51.6;
const point = (p: unknown) => typeof p === "string" ? p.split(",").map(Number) : [];
const near = (a: number[], b: number[]) => coordinate(a) && coordinate(b) &&
  Math.hypot((a[0]! - b[0]!) * Math.cos(a[1]! * Math.PI / 180), a[1]! - b[1]!) * 111_320 <= 1000;
export function roadPlaces(body: unknown, query: string): OfficialPlace[] {
  if (!Array.isArray(obj(body).features)) throw new PlannerError("invalid");
  const qualifier = query.match(/\s+(\d{2,5}|2[ab])$/i)?.[1]?.toUpperCase();
  const name = qualifier ? query.slice(0, -qualifier.length).trim() : query;
  const features = list(obj(body).features).map(obj).filter(f => obj(f.geometry).type === "Point");
  const municipal = features.filter(f => obj(f.properties).type === "municipality");
  const exact = municipal.filter(f => placeKey(text(obj(f.properties).city || obj(f.properties).name)) === placeKey(name));
  return [...new Map((exact.length ? exact : features).flatMap(f => {
    const p = obj(f.properties), c = list(obj(f.geometry).coordinates), poi = p._type === "poi";
    const first = (v: unknown) => text(Array.isArray(v) ? v[0] : v);
    if (!coordinate(c as number[]) || !/^(?:\d{5}|2[AB]\d{3})$/i.test(first(p.citycode))) return [];
    if (qualifier && (qualifier.length === 5 ? first(p.postcode) !== qualifier : first(p.depcode) !== qualifier)) return [];
    const name = display(poi ? p.toponym || first(p.name) : p.name || p.city || p.label);
    const label = display(`${poi ? `${name} · ${first(p.city)}` : text(p.label)} ${first(p.postcode)} · ${first(p.context) || first(p.depcode)}`);
    const id = poi ? text(obj(p.extrafields).cleabs) : text(p.id);
    if (!id || !label) return [];
    return [{ id: `ign:${id}`, ids: [`ign:${id}`], name, label,
      longitude: c[0] as number, latitude: c[1] as number }];
  }).map(p => [p.id, p])).values()];
}
const turns: Record<string, string> = { left: "à gauche", right: "à droite", straight: "tout droit",
  "slight left": "légèrement à gauche", "slight right": "légèrement à droite", "sharp left": "franchement à gauche", "sharp right": "franchement à droite", uturn: "en demi-tour" };
const verbs: Record<string, string> = { depart: "Partir", arrive: "Arriver", turn: "Tourner", continue: "Continuer",
  merge: "Rejoindre", "on ramp": "Prendre la bretelle", "off ramp": "Sortir", fork: "À la bifurcation",
  roundabout: "Prendre le rond-point", rotary: "Prendre le rond-point", "exit roundabout": "Sortir du rond-point", "new name": "Continuer" };
export function parseRoad(body: unknown, from: OfficialPlace, to: OfficialPlace, at: number, represents: "arrival" | "departure"): VerifiedJourney {
  const root = obj(body), distance = root.distance, duration = root.duration;
  if (root.profile !== "car" || root.resource !== "bdtopo-osrm" || root.crs !== "EPSG:4326" ||
    root.distanceUnit !== "meter" || root.timeUnit !== "second" || typeof distance !== "number" || !Number.isFinite(distance) || distance <= 0 || distance > 3_000_000 ||
    typeof duration !== "number" || !Number.isFinite(duration) || duration <= 0 || duration > 48 * 3600 ||
    !near(point(root.start), [from.longitude!, from.latitude!]) || !near(point(root.end), [to.longitude!, to.latitude!]))
    throw new PlannerError("invalid");
  const portions = list(root.portions).map(obj), raw = portions.flatMap(p => list(p.steps).map(obj));
  if (!portions.length || !raw.length || raw.length > 2000) throw new PlannerError("invalid");
  const steps = raw.map(step => {
    if (typeof step.distance !== "number" || !Number.isFinite(step.distance) || step.distance < 0 ||
      typeof step.duration !== "number" || !Number.isFinite(step.duration) || step.duration < 0) throw new PlannerError("invalid");
    const instruction = obj(step.instruction), verb = verbs[text(instruction.type)] ?? "Continuer";
    const modifier = turns[text(instruction.modifier)] ?? "", road = display(obj(step.attributes).name);
    const exit = typeof instruction.exit === "number" && instruction.exit > 0 && instruction.exit < 50 ? ` · sortie ${instruction.exit}` : "";
    return { instruction: `${verb}${modifier ? ` ${modifier}` : ""}${road ? ` · ${road}` : ""}${exit}`, distanceMeters: step.distance };
  });
  if (Math.abs(steps.reduce((sum, s) => sum + s.distanceMeters, 0) - distance) > Math.max(50, distance * .02))
    throw new PlannerError("invalid");
  if (Math.abs(raw.reduce((sum, s) => sum + (s.duration as number), 0) - duration) > Math.max(5, duration * .02))
    throw new PlannerError("invalid");
  const seconds = Math.ceil(duration), departure = represents === "arrival" ? at - seconds : at;
  return { departure, arrival: departure + seconds, legs: [], warning: false,
    road: { distanceMeters: distance, steps, resourceVersion: display(root.resourceVersion) } };
}
export class IgnRoadPlanner implements ItineraryProvider {
  private http: RoadHttp;
  constructor(fetcher: typeof fetch = fetch, private now = Date.now) { this.http = new RoadHttp(fetcher, now); }
  async places(query: string, fresh = false) {
    const poi = /\b(?:gare|a[eé]roport|h[oô]pital)\b/i.test(query);
    const address = /\d|\b(?:rue|avenue|boulevard|chemin|place|route|street|road)\b/i.test(query.replace(/\s+(?:\d{2,5}|2[ab])$/i, ""));
    const qualifier = query.match(/\s+(\d{2,5}|2[ab])$/i)?.[1];
    const q = !address && qualifier ? query.slice(0, -qualifier.length).trim() : query;
    const body = await this.http.json("/geocodage/search", { q, index: poi ? "poi" : "address", limit: "20", ...(!address && !poi ? { type: "municipality" } : {}) }, fresh);
    return roadPlaces(body, query);
  }
  async journeys(from: OfficialPlace, to: OfficialPlace, at: number, represents: "arrival" | "departure", fresh = false) {
    if (!coordinate([from.longitude!, from.latitude!]) || !coordinate([to.longitude!, to.latitude!])) throw new PlannerError("invalid");
    const body = await this.http.json("/navigation/itineraire", { resource: "bdtopo-osrm", profile: "car", optimization: "fastest",
      start: `${from.longitude},${from.latitude}`, end: `${to.longitude},${to.latitude}`, getSteps: "true",
      getBbox: "false", distanceUnit: "meter", timeUnit: "second", geometryFormat: "geojson" }, fresh);
    const result = parseRoad(body, from, to, at, represents);
    if (result.departure < this.now() / 1000 - 60) throw new PlannerError("date");
    return [result];
  }
  async stations(): Promise<{ line: string; count: number }> { throw new PlannerError("invalid"); }
}
