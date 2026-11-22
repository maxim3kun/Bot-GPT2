import type { RouteGeometry } from "./transport-planner-types.js";

const MAX_GEOMETRY_POINTS = 25_000;
const inFrance = (point: unknown): point is number[] => Array.isArray(point) && point.length >= 2 &&
  typeof point[0] === "number" && Number.isFinite(point[0]) && point[0] >= -5.5 && point[0] <= 10 &&
  typeof point[1] === "number" && Number.isFinite(point[1]) && point[1] >= 41 && point[1] <= 51.6;
const distanceMeters = (a: number[], b: number[]) =>
  Math.hypot((a[0]! - b[0]!) * Math.cos(a[1]! * Math.PI / 180), a[1]! - b[1]!) * 111_320;

/**
 * Keep only a bounded GeoJSON line whose ends agree with the routing response.
 * Bad/missing geometry suppresses the preview, not the already verified journey.
 */
export function verifiedRouteGeometry(value: unknown, start: unknown, end: unknown): RouteGeometry | undefined {
  if (!inFrance(start) || !inFrance(end) || !value || typeof value !== "object" || Array.isArray(value)) return;
  const geometry = value as { type?: unknown; coordinates?: unknown };
  if (geometry.type !== "LineString" || !Array.isArray(geometry.coordinates) ||
      geometry.coordinates.length < 2 || geometry.coordinates.length > MAX_GEOMETRY_POINTS) return;
  const coordinates: RouteGeometry = [];
  for (const point of geometry.coordinates) {
    if (!inFrance(point)) return;
    coordinates.push([point[0]!, point[1]!]);
  }
  if (distanceMeters(coordinates[0]!, start) > 1_000 ||
      distanceMeters(coordinates.at(-1)!, end) > 1_000) return;
  return coordinates;
}
