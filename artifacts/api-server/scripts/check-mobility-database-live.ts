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

  const apiUrl = new URL("https://api.mobilitydatabase.org/v1/gtfs_feeds");
  apiUrl.searchParams.set("country_code", "FR");
  apiUrl.searchParams.set("dataset_latitudes", "48.7966,48.9166");
  apiUrl.searchParams.set("dataset_longitudes", "2.2422,2.4622");
  apiUrl.searchParams.set("bounding_filter_method", "partially_enclosed");
  apiUrl.searchParams.set("limit", "1");
  const apiResponse = await fetch(apiUrl, {
    headers: { authorization: `Bearer ${tokenBody.access_token}` }, signal: controller.signal, redirect: "error",
  });
  if (!apiResponse.ok) throw new Error(`Mobility Database geographic search returned HTTP ${apiResponse.status}.`);
  const sample = await apiResponse.json() as unknown;
  if (!Array.isArray(sample)) throw new Error("Mobility Database returned an unexpected feed-list response.");
  const countriesUrl = new URL("https://api.mobilitydatabase.org/v1/locations");
  countriesUrl.searchParams.set("location_type", "country");
  countriesUrl.searchParams.set("limit", "100");
  const countriesResponse = await fetch(countriesUrl, {
    headers: { authorization: `Bearer ${tokenBody.access_token}` }, signal: controller.signal, redirect: "error",
  });
  if (!countriesResponse.ok) throw new Error(`Mobility Database country list returned HTTP ${countriesResponse.status}.`);
  const countryPage = await countriesResponse.json() as { total?: unknown; results?: unknown };
  if (!Array.isArray(countryPage.results) || typeof countryPage.total !== "number")
    throw new Error("Mobility Database returned an unexpected country-list response.");

  const mobility = new MobilityDatabaseTransportClient();
  const countries = await mobility.countries();
  const nearby = await mobility.catalogForLocation({
    id: "paris-live-check", name: "Paris", label: "Paris",
    latitude: 48.8566, longitude: 2.3522, territory: "fr",
  }, 15_000);
  console.log(`Mobility Database OAuth and catalog are reachable; ${sample.length} Paris sample record, ` +
    `${countryPage.total} country entries (${countries.length} selectable ISO country codes) and ` +
    `${nearby.length} eligible GTFS feed(s) near Paris.`);
  const sampleUrl = nearby[0]?.resources[0]?.url;
  if (sampleUrl) {
    const probeController = new AbortController();
    const probeTimeout = setTimeout(() => probeController.abort(), 10_000);
    try {
      const probe = await fetch(sampleUrl, { method: "HEAD", redirect: "manual", signal: probeController.signal });
      const location = probe.headers.get("location");
      let redirectHost = "none";
      if (location) {
        try { redirectHost = new URL(location, sampleUrl).hostname; } catch { redirectHost = "invalid"; }
      }
      console.log(`First feed download endpoint answered HTTP ${probe.status}; redirect host: ${redirectHost}.`);
    } finally {
      clearTimeout(probeTimeout);
    }
    const archiveController = new AbortController();
    const archiveTimeout = setTimeout(() => archiveController.abort(), 10_000);
    try {
      const response = await fetch(sampleUrl, {
        headers: { range: "bytes=0-3" }, redirect: "manual", signal: archiveController.signal,
      });
      const reader = response.body?.getReader();
      let startsWithZip = false;
      if (reader) {
        const chunk = await reader.read();
        startsWithZip = Boolean(chunk.value && chunk.value.length >= 4 &&
          chunk.value[0] === 0x50 && chunk.value[1] === 0x4b);
        await reader.cancel().catch(() => undefined);
      }
      console.log(`Archive range probe returned HTTP ${response.status}; ZIP signature: ${startsWithZip}.`);
    } finally {
      clearTimeout(archiveTimeout);
    }
  }
} finally {
  clearTimeout(timeout);
}
