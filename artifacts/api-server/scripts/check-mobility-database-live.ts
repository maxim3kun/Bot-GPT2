import { MobilityDatabaseTransportClient } from "../src/discord/mobility-database-transport.js";

const refreshToken = process.env.MOBILITY_DATABASE_REFRESH_TOKEN?.trim();
if (!refreshToken) throw new Error("MOBILITY_DATABASE_REFRESH_TOKEN is not configured in Replit Secrets.");

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10_000);
try {
  const tokenResponse = await fetch("https://api.mobilitydatabase.org/v1/tokens/access", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    signal: controller.signal,
    redirect: "error",
  });
  if (!tokenResponse.ok) throw new Error(`Mobility Database OAuth returned HTTP ${tokenResponse.status}.`);
  const tokenBody = await tokenResponse.json() as { access_token?: unknown };
  if (typeof tokenBody.access_token !== "string" || !tokenBody.access_token)
    throw new Error("Mobility Database OAuth did not return a usable access token.");

  const url = new URL("https://api.mobilitydatabase.org/v1/gtfs_feeds");
  url.searchParams.set("country_code", "FR");
  url.searchParams.set("status", "active");
  url.searchParams.set("limit", "1");
  const catalogResponse = await fetch(url, {
    headers: { authorization: `Bearer ${tokenBody.access_token}` },
    signal: controller.signal,
    redirect: "error",
  });
  if (!catalogResponse.ok) throw new Error(`Mobility Database catalog returned HTTP ${catalogResponse.status}.`);
  const catalog = await catalogResponse.json() as Array<Record<string, any>>;
  if (!Array.isArray(catalog)) throw new Error("Mobility Database returned an unexpected feed-list response.");
  console.log(`Mobility Database OAuth and catalog are reachable; ${catalog.length} active French sample record(s) returned.`);
  const sample = catalog[0];
  if (sample) {
    const latest = sample.latest_dataset;
    let hostedStorage = false;
    try {
      const host = new URL(String(latest?.hosted_url ?? ""));
      hostedStorage = host.hostname === "storage.googleapis.com";
    } catch { /* Report only whether the published host is the expected storage service. */ }
    console.log(`Sample checks: status=${String(sample.status)}; country=${Array.isArray(sample.locations) &&
      sample.locations.some((location: { country_code?: string }) => location.country_code === "FR")}; ` +
      `license=${String(sample.license_id)}; bounds=${Boolean(latest?.bounding_box ?? sample.bounding_box)}; hostedStorage=${hostedStorage}.`);
  }
  const geographicUrl = new URL("https://api.mobilitydatabase.org/v1/gtfs_feeds");
  geographicUrl.searchParams.set("country_code", "FR");
  geographicUrl.searchParams.set("status", "active");
  geographicUrl.searchParams.set("dataset_latitudes", "48.7966,48.9166");
  geographicUrl.searchParams.set("dataset_longitudes", "2.2422,2.4622");
  geographicUrl.searchParams.set("bounding_filter_method", "partially_enclosed");
  geographicUrl.searchParams.set("limit", "250");
  const geographicResponse = await fetch(geographicUrl, {
    headers: { authorization: `Bearer ${tokenBody.access_token}` }, signal: controller.signal, redirect: "error",
  });
  if (!geographicResponse.ok) throw new Error(`Mobility Database geographic search returned HTTP ${geographicResponse.status}.`);
  const geographicRecords = await geographicResponse.json() as unknown;
  if (!Array.isArray(geographicRecords)) throw new Error("Mobility Database returned an unexpected geographic-search response.");
  console.log(`Official API returned ${geographicRecords.length} active feed record(s) for the Paris bounding box.`);
  for (const item of geographicRecords.slice(0, 5) as Array<Record<string, any>>) {
    const latest = item.latest_dataset;
    let hostedHost = "";
    let hostedPath = "";
    try {
      const hosted = new URL(String(latest?.hosted_url ?? ""));
      hostedHost = hosted.hostname;
      hostedPath = hosted.pathname.startsWith("/mobilitydata-datasets-prod/") ? "dataset bucket"
        : hosted.pathname.startsWith("/storage/v1/b/mdb-latest/o/") ? "latest bucket" : "other";
    } catch { /* Keep the diagnostic limited to safe host/path classifications. */ }
    console.log(`Feed metadata: status=${String(item.status)}; licenseId=${String(item.license_id)}; ` +
      `spdx=${String(item.license_is_spdx)}; bounds=${Boolean(latest?.bounding_box ?? item.bounding_box)}; ` +
      `latest=${Boolean(latest)}; hosted=${hostedHost || "none"} (${hostedPath || "none"}).`);
  }

  const nearby = await new MobilityDatabaseTransportClient().catalogForLocation({
    id: "paris-live-check", name: "Paris", label: "Paris",
    latitude: 48.8566, longitude: 2.3522, territory: "fr",
  }, 15_000);
  console.log(`Eligible GTFS catalog entries near Paris: ${nearby.length}.`);
} finally {
  clearTimeout(timeout);
}
