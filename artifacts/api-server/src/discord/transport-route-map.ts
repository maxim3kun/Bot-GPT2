import sharp from "sharp";
import type { VerifiedJourney } from "./transport-planner-types.js";

export const ROUTE_MAP_FILENAME = "route-preview.png";
const TILE_SIZE = 256;
const IMAGE_SIZE = 512;
const MAX_TILE_BYTES = 250_000;
const MAX_IMAGE_BYTES = 1_000_000;
const MAX_CACHED_TILES = 128;
const TILE_URL = "https://data.geopf.fr/wmts";
const tileCache = new Map<string, { expires: number; data: Buffer }>();

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
function project(longitude: number, latitude: number, zoom: number): [number, number] {
  const scale = TILE_SIZE * 2 ** zoom;
  const lat = clamp(latitude, -85.05112878, 85.05112878) * Math.PI / 180;
  return [
    (longitude + 180) / 360 * scale,
    (1 - Math.asinh(Math.tan(lat)) / Math.PI) / 2 * scale,
  ];
}

async function loadTile(x: number, y: number, zoom: number, fetcher: typeof fetch): Promise<Buffer | undefined> {
  const url = new URL(TILE_URL);
  for (const [key, value] of Object.entries({
    SERVICE: "WMTS", REQUEST: "GetTile", VERSION: "1.0.0",
    LAYER: "GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2", STYLE: "normal", FORMAT: "image/png",
    TILEMATRIXSET: "PM", TILEMATRIX: String(zoom), TILEROW: String(y), TILECOL: String(x),
  })) url.searchParams.set(key, value);
  const key = url.href;
  const cached = tileCache.get(key);
  if (fetcher === fetch && cached && cached.expires > Date.now()) return cached.data;
  try {
    const response = await fetcher(url, {
      redirect: "error",
      headers: { accept: "image/png", "user-agent": "MaximeGPT-route-preview/1.0" },
      signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok) { await response.body?.cancel(); return; }
    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_TILE_BYTES) {
      await response.body?.cancel();
      return;
    }
    const reader = response.body?.getReader();
    if (!reader) return;
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.length;
        if (size > MAX_TILE_BYTES) { await reader.cancel(); return; }
        chunks.push(chunk.value);
      }
    } finally { reader.releaseLock(); }
    const bytes = Buffer.concat(chunks);
    if (!bytes.length) return;
    const metadata = await sharp(bytes).metadata();
    if (metadata.format !== "png" || metadata.width !== TILE_SIZE || metadata.height !== TILE_SIZE) return;
    if (fetcher === fetch) {
      for (const [cacheKey, entry] of tileCache) if (entry.expires <= Date.now()) tileCache.delete(cacheKey);
      while (tileCache.size >= MAX_CACHED_TILES) tileCache.delete(tileCache.keys().next().value!);
      tileCache.set(key, { expires: Date.now() + 6 * 60 * 60_000, data: bytes });
    }
    return bytes;
  } catch {
    return;
  }
}

/** Render only a router-provided, already validated line over an attributed IGN tile. */
export async function renderRouteMap(
  journey: VerifiedJourney,
  fetcher: typeof fetch = fetch,
): Promise<Buffer | undefined> {
  const lines = journey.road?.geometry ? [journey.road.geometry] : journey.mapGeometry;
  if (!lines?.length || lines.some(line => line.length < 2) ||
      lines.reduce((sum, line) => sum + line.length, 0) > 25_000) return;
  const points = lines.flat();
  const projected = points.map(([lon, lat]) => project(lon, lat, 0));
  const xs = projected.map(point => point[0]), ys = projected.map(point => point[1]);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  if (!Number.isFinite(span)) return;
  const zoom = clamp(Math.floor(Math.log2(110 / Math.max(span, 0.0001))), 3, 17);
  const atZoom = lines.map(line => line.map(([lon, lat]) => project(lon, lat, zoom)));
  const allAtZoom = atZoom.flat();
  const centerX = (Math.min(...allAtZoom.map(point => point[0])) + Math.max(...allAtZoom.map(point => point[0]))) / 2;
  const centerY = (Math.min(...allAtZoom.map(point => point[1])) + Math.max(...allAtZoom.map(point => point[1]))) / 2;
  const tileX = clamp(Math.floor(centerX / TILE_SIZE), 0, 2 ** zoom - 1);
  const tileY = clamp(Math.floor(centerY / TILE_SIZE), 0, 2 ** zoom - 1);
  const tile = await loadTile(tileX, tileY, zoom, fetcher);
  if (!tile) return;

  const screenLines = atZoom.map(line => line.map(([x, y]) => [(x - tileX * TILE_SIZE) * 2, (y - tileY * TILE_SIZE) * 2] as const));
  if (screenLines.flat().some(([x, y]) => x < 0 || y < 0 || x > IMAGE_SIZE || y > IMAGE_SIZE)) return;
  const paths = screenLines.map(points => points.map(([x, y], index) =>
    `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" "));
  const credit = "© IGN · Géoplateforme";
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${IMAGE_SIZE}" height="${IMAGE_SIZE}" viewBox="0 0 ${IMAGE_SIZE} ${IMAGE_SIZE}">
    ${paths.map(path => `<path d="${path}" fill="none" stroke="#ffffff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}
    ${paths.map(path => `<path d="${path}" fill="none" stroke="#1167d5" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}
    <rect x="8" y="480" width="194" height="24" rx="5" fill="#ffffff" fill-opacity=".92"/>
    <text x="16" y="497" font-family="Arial,sans-serif" font-size="13" fill="#20242a">${credit}</text>
  </svg>`);
  try {
    const png = await sharp(tile).resize(IMAGE_SIZE, IMAGE_SIZE).composite([{ input: svg }]).png().toBuffer();
    return png.length <= MAX_IMAGE_BYTES ? png : undefined;
  } catch {
    return;
  }
}
