import sharp from "sharp";
import type { VerifiedJourney } from "./transport-planner-types.js";

export const ROUTE_MAP_FILENAME = "route-preview.png";
const TILE_SIZE = 256;
const IMAGE_SIZE = 512;
const ROUTE_FOCUS_PIXELS = 360;
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
  const stops = journey.mapStops?.filter(stop => Number.isFinite(stop.longitude) &&
    Number.isFinite(stop.latitude) && stop.longitude >= 1 && stop.longitude <= 4 &&
    stop.latitude >= 48 && stop.latitude <= 49.5).slice(0, 500) ?? [];
  if ((!lines?.length && stops.length < 2) || lines?.some(line => line.length < 2) ||
      (lines?.reduce((sum, line) => sum + line.length, 0) ?? 0) > 25_000) return;
  const routeLines = lines ?? [];
  const points = [...routeLines.flat(), ...stops.map(stop => [stop.longitude, stop.latitude] as const)];
  const projected = points.map(([lon, lat]) => project(lon, lat, 0));
  const xs = projected.map(point => point[0]), ys = projected.map(point => point[1]);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  if (!Number.isFinite(span)) return;
  let zoom = clamp(Math.floor(Math.log2(ROUTE_FOCUS_PIXELS / Math.max(span, 0.0001))), 3, 17);
  let atZoom: number[][][] = [];
  let atZoomStops: [number, number][] = [];
  let allAtZoom: [number, number][] = [];
  let tileX = 0, tileY = 0;
  const tileStart = (min: number, max: number, maxTile: number) => {
    const centerTile = Math.floor(((min + max) / 2) / TILE_SIZE);
    return [centerTile - 1, centerTile, centerTile - 2, centerTile + 1]
      .map(value => clamp(value, 0, maxTile - 1))
      .find(value => min >= value * TILE_SIZE && max <= (value + 2) * TILE_SIZE);
  };
  // Compose a 2x2 tile window so we can frame the whole route more closely
  // without clipping its endpoints at tile boundaries.
  for (; zoom >= 3; zoom--) {
    atZoom = routeLines.map(line => line.map(([lon, lat]) => project(lon, lat, zoom)));
    atZoomStops = stops.map(stop => project(stop.longitude, stop.latitude, zoom));
    allAtZoom = [...atZoom.flat() as [number, number][], ...atZoomStops];
    tileX = tileStart(Math.min(...allAtZoom.map(point => point[0])),
      Math.max(...allAtZoom.map(point => point[0])), 2 ** zoom)!;
    tileY = tileStart(Math.min(...allAtZoom.map(point => point[1])),
      Math.max(...allAtZoom.map(point => point[1])), 2 ** zoom)!;
    if (tileX !== undefined && tileY !== undefined) break;
  }
  if (zoom < 3 || tileX === undefined || tileY === undefined) return;
  const tileCoords = [
    [tileX, tileY], [tileX + 1, tileY], [tileX, tileY + 1], [tileX + 1, tileY + 1],
  ] as const;
  const tiles = await Promise.all(tileCoords.map(([x, y]) => loadTile(x, y, zoom, fetcher)));
  if (tiles.some(tile => !tile)) return;

  const mosaicPoints = allAtZoom.map(([x, y]) => [x - tileX * TILE_SIZE, y - tileY * TILE_SIZE] as const);
  const minX = Math.min(...mosaicPoints.map(([x]) => x)), maxX = Math.max(...mosaicPoints.map(([x]) => x));
  const minY = Math.min(...mosaicPoints.map(([, y]) => y)), maxY = Math.max(...mosaicPoints.map(([, y]) => y));
  let cropSize = Math.min(IMAGE_SIZE, Math.max(240, Math.ceil(Math.max(maxX - minX, maxY - minY) * 1.3)));
  let cropX = 0, cropY = 0;
  for (;;) {
    cropX = clamp(Math.floor((minX + maxX - cropSize) / 2), 0, IMAGE_SIZE - cropSize);
    cropY = clamp(Math.floor((minY + maxY - cropSize) / 2), 0, IMAGE_SIZE - cropSize);
    if (minX >= cropX && maxX <= cropX + cropSize && minY >= cropY && maxY <= cropY + cropSize) break;
    if (cropSize >= IMAGE_SIZE) return;
    cropSize = Math.min(IMAGE_SIZE, cropSize + 32);
  }
  const cropScale = IMAGE_SIZE / cropSize;
  const screenLines = atZoom.map(line => line.map(([x, y]) => [
    (x - tileX * TILE_SIZE - cropX) * cropScale,
    (y - tileY * TILE_SIZE - cropY) * cropScale,
  ] as const));
  if (screenLines.flat().some(([x, y]) => x < 0 || y < 0 || x > IMAGE_SIZE || y > IMAGE_SIZE)) return;
  const paths = screenLines.map(points => points.map(([x, y], index) =>
    `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" "));
  const credit = "© IGN · Géoplateforme";
  const screenStops = stops.map((stop, index) => {
    const [x, y] = atZoomStops[index]!;
    return [(x - tileX * TILE_SIZE - cropX) * cropScale, (y - tileY * TILE_SIZE - cropY) * cropScale, stop.role, stop.affected] as const;
  });
  if (screenStops.some(([x, y]) => x < 0 || y < 0 || x > IMAGE_SIZE || y > IMAGE_SIZE)) return;
  const markerColor = { departure: "#16a34a", transfer: "#f59e0b", stop: "#2563eb", arrival: "#dc2626" };
  const markers = screenStops.map(([x, y, role, affected]) => {
    const color = markerColor[role];
    const shape = role === "transfer"
      ? `<path d="M${x},${y - 9} L${x + 9},${y} L${x},${y + 9} L${x - 9},${y} Z" fill="${color}"/>`
      : role === "arrival"
        ? `<rect x="${x - 7}" y="${y - 7}" width="14" height="14" rx="2" fill="${color}"/>`
        : `<circle cx="${x}" cy="${y}" r="${role === "stop" ? 5 : 8}" fill="${color}"/>`;
    const affectedRing = affected ? `<circle cx="${x}" cy="${y}" r="12" fill="none" stroke="#9333ea" stroke-width="3"/>` : "";
    return `<g stroke="#ffffff" stroke-width="3">${shape}<circle cx="${x}" cy="${y}" r="2" fill="#ffffff" stroke="none"/>${affectedRing}</g>`;
  }).join("");
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${IMAGE_SIZE}" height="${IMAGE_SIZE}" viewBox="0 0 ${IMAGE_SIZE} ${IMAGE_SIZE}">
    ${paths.map(path => `<path d="${path}" fill="none" stroke="#ffffff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}
    ${paths.map(path => `<path d="${path}" fill="none" stroke="#1167d5" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}
    ${markers}
    <rect x="8" y="480" width="194" height="24" rx="5" fill="#ffffff" fill-opacity=".92"/>
    <text x="16" y="497" font-family="Arial,sans-serif" font-size="13" fill="#20242a">${credit}</text>
  </svg>`);
  try {
    const overlays = tileCoords.map(([x, y], index) => ({
      input: tiles[index]!, left: (x - tileX) * TILE_SIZE, top: (y - tileY) * TILE_SIZE,
    }));
    const mosaic = await sharp({ create: { width: IMAGE_SIZE, height: IMAGE_SIZE, channels: 3, background: "#f1eee8" } })
      .composite(overlays).png().toBuffer();
    const png = await sharp(mosaic).extract({ left: cropX, top: cropY, width: cropSize, height: cropSize })
      .resize(IMAGE_SIZE, IMAGE_SIZE).composite([{ input: svg }]).png().toBuffer();
    return png.length <= MAX_IMAGE_BYTES ? png : undefined;
  } catch {
    return;
  }
}
