import { PlannerError, type BikeJourneyProvider, type OfficialPlace, type OSMBikeFacility, type OSMBikeSurface, type VerifiedJourney } from "./transport-planner-types.js";

export const BIKE_SOURCE = "https://routing.openstreetmap.de/";
export const OSM_ATTRIBUTION = "https://www.openstreetmap.org/copyright";
const API = "https://routing.openstreetmap.de/routed-bike/route/v1/driving";
const MAX_RESPONSE_BYTES = 2_000_000;
const MAX_DISTANCE_METERS = 3_000_000;
const MAX_DURATION_SECONDS = 48 * 60 * 60;

type BikeStep = { instruction: string; distanceMeters: number; surface?: OSMBikeSurface; cycleway?: OSMBikeFacility };
interface BikeRoute {
  distanceMeters: number;
  durationSeconds: number;
  steps: BikeStep[];
}
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const surfaces = new Set<OSMBikeSurface>(["asphalt", "concrete", "paving_stones", "sett", "cobblestone",
  "compacted", "fine_gravel", "gravel", "ground", "dirt", "earth", "grass", "grass_paver", "sand",
  "wood", "metal", "mud", "snow", "ice", "unpaved"]);
const facilities = new Set<OSMBikeFacility>(["track", "lane", "shared_lane", "shared", "opposite",
  "opposite_lane", "opposite_track", "share_busway", "shoulder", "separate", "no"]);
const osmTag = <T extends string>(value: unknown, allowed: Set<T>): T | undefined =>
  typeof value === "string" && allowed.has(value.trim().toLowerCase() as T) ? value.trim().toLowerCase() as T : undefined;
const validPoint = (value: unknown) => Array.isArray(value) && value.length >= 2 &&
  finite(value[0]) && finite(value[1]) && value[0] >= -5.5 && value[0] <= 10 && value[1] >= 41 && value[1] <= 51.6;
const pointDistance = (a: number[], b: number[]) =>
  Math.hypot((a[0]! - b[0]!) * Math.cos(a[1]! * Math.PI / 180), a[1]! - b[1]!) * 111_320;
const closeTo = (value: number, expected: number) =>
  Math.abs(value - expected) <= Math.max(50, expected * .02);

/** Accept only an OSRM response whose route and every traversed step identify cycling. */
export function parseBikeRoute(body: unknown, from: OfficialPlace, to: OfficialPlace): BikeRoute | null {
  const root = record(body);
  if (root.code === "NoRoute") return null;
  const routes = array(root.routes), waypoints = array(root.waypoints);
  if (root.code !== "Ok" || routes.length !== 1 || waypoints.length !== 2 ||
      !validPoint([from.longitude, from.latitude]) || !validPoint([to.longitude, to.latitude]))
    throw new PlannerError("invalid");

  const snapped = waypoints.map(value => record(value).location);
  if (!snapped.every(validPoint) ||
      pointDistance(snapped[0] as number[], [from.longitude!, from.latitude!]) > 1000 ||
      pointDistance(snapped[1] as number[], [to.longitude!, to.latitude!]) > 1000)
    throw new PlannerError("invalid");

  const route = record(routes[0]);
  if (!finite(route.distance) || route.distance <= 0 || route.distance > MAX_DISTANCE_METERS ||
      !finite(route.duration) || route.duration <= 0 || route.duration > MAX_DURATION_SECONDS)
    throw new PlannerError("invalid");
  const legs = array(route.legs).map(record);
  if (legs.length !== 1 || !finite(legs[0]!.distance) || !finite(legs[0]!.duration) ||
      !closeTo(legs[0]!.distance as number, route.distance) ||
      !closeTo(legs[0]!.duration as number, route.duration))
    throw new PlannerError("invalid");

  const rawSteps = array(legs[0]!.steps).map(record);
  if (!rawSteps.length || rawSteps.length > 2000 ||
      !rawSteps.every(step => ["cycling", "pushing bike", "ferry"].includes(String(step.mode)) &&
        finite(step.distance) && (step.distance as number) >= 0 &&
        finite(step.duration) && (step.duration as number) >= 0) ||
      !rawSteps.some(step => step.mode === "cycling"))
    throw new PlannerError("invalid");

  const stepDistance = rawSteps.reduce((sum, step) => sum + (step.distance as number), 0);
  const stepDuration = rawSteps.reduce((sum, step) => sum + (step.duration as number), 0);
  if (!closeTo(stepDistance, route.distance) || !closeTo(stepDuration, route.duration))
    throw new PlannerError("invalid");

  return {
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    steps: rawSteps.map(step => {
      const name = typeof step.name === "string" ? step.name.trim() : "";
      const maneuver = record(step.maneuver);
      const type = typeof maneuver.type === "string" ? maneuver.type : "";
      const modifier = typeof maneuver.modifier === "string" ? maneuver.modifier : "";
      const action = [type, modifier].filter(Boolean).join(" ");
      // The router does not normally include OSM way tags. Keep only explicit,
      // recognized values when a response does include them; names/profile are not evidence.
      const tags = record(step.tags);
      const surface = osmTag(step.surface ?? tags.surface, surfaces);
      const cycleway = osmTag(step.cycleway ?? tags.cycleway, facilities);
      return { instruction: [action, name].filter(Boolean).join(" · ") || "Cycling route",
        distanceMeters: step.distance as number, ...(surface ? { surface } : {}), ...(cycleway ? { cycleway } : {}) };
    }),
  };
}

/** Public OSM bike router. It is intentionally used only for metropolitan-France comparisons. */
export class OpenStreetMapBikePlanner implements BikeJourneyProvider {
  private queue: Promise<unknown> = Promise.resolve();
  private waiting = 0;
  private nextRequestAt = 0;
  private cache = new Map<string, { expires: number; route: BikeRoute }>();

  constructor(private fetcher: typeof fetch = fetch, private now = Date.now, private minIntervalMs = 1000) {}

  async journeys(from: OfficialPlace, to: OfficialPlace, at: number, represents: "arrival" | "departure",
    fresh = false): Promise<VerifiedJourney[]> {
    if (!validPoint([from.longitude, from.latitude]) || !validPoint([to.longitude, to.latitude]))
      throw new PlannerError("invalid");
    const key = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
    const cached = this.cache.get(key);
    if (!fresh && cached && cached.expires > this.now()) return [this.journey(cached.route, at, represents)];
    if (this.waiting >= 8) throw new PlannerError("busy");
    this.waiting++;
    const deadline = Date.now() + 15_000;
    const work = this.queue.catch(() => undefined).then(async () => {
      if (Date.now() >= deadline) throw new PlannerError("busy");
      const previous = this.cache.get(key);
      if (!fresh && previous && previous.expires > this.now()) return previous.route;
      const delay = this.nextRequestAt - Date.now();
      if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
      if (Date.now() >= deadline) throw new PlannerError("busy");
      this.nextRequestAt = Date.now() + this.minIntervalMs;
      const coordinates = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
      const url = `${API}/${coordinates}?alternatives=false&steps=true&overview=false&annotations=false`;
      let response: Response;
      try {
        response = await this.fetcher(url, {
          redirect: "error",
          headers: { accept: "application/json", "user-agent": "MaximeGPT-public-bike-router/1.0" },
          signal: AbortSignal.timeout(Math.min(12_000, Math.max(1, deadline - Date.now()))),
        });
      } catch {
        throw new PlannerError("unavailable");
      }
      if (response.status === 429) { await response.body?.cancel(); throw new PlannerError("quota"); }
      if (!response.ok) { await response.body?.cancel(); throw new PlannerError("unavailable"); }
      const contentLength = Number(response.headers.get("content-length"));
      if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
        await response.body?.cancel();
        throw new PlannerError("invalid");
      }
      const reader = response.body?.getReader();
      if (!reader) throw new PlannerError("invalid");
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.length;
          if (size > MAX_RESPONSE_BYTES) throw new PlannerError("invalid");
          chunks.push(chunk.value);
        }
      } catch (error) {
        await reader.cancel().catch(() => undefined);
        throw error;
      } finally { reader.releaseLock(); }
      let body: unknown;
      try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
      catch { throw new PlannerError("invalid"); }
      const route = parseBikeRoute(body, from, to);
      if (!route) return null;
      for (const [cacheKey, entry] of this.cache) if (entry.expires <= this.now()) this.cache.delete(cacheKey);
      while (this.cache.size >= 100) this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(key, { expires: this.now() + 5 * 60_000, route });
      return route;
    });
    this.queue = work;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const route = await Promise.race([work, new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new PlannerError("busy")), 15_000);
      })]);
      return route ? [this.journey(route, at, represents)] : [];
    } finally {
      if (timer) clearTimeout(timer);
      this.waiting--;
    }
  }

  private journey(route: BikeRoute, at: number, represents: "arrival" | "departure"): VerifiedJourney {
    const duration = Math.ceil(route.durationSeconds);
    const departure = represents === "arrival" ? at - duration : at;
    return {
      departure,
      arrival: departure + duration,
      legs: [],
      warning: false,
      road: {
        mode: "bike",
        source: "openstreetmap",
        distanceMeters: route.distanceMeters,
        steps: route.steps,
      },
    };
  }
}
