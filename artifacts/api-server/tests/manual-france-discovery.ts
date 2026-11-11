/** Manual, read-only provider probe. No Discord connection, credentials or test messages. */
import { FranceTransportClient } from "../src/discord/public-transport.js";
import { TransportBrowserClient } from "../src/discord/transport-browser.js";
const provider = new FranceTransportClient();
const browser = new TransportBrowserClient(provider);
for (const input of ["60", "35", "45", "60000"]) {
  const cities = await provider.municipalities(input);
  console.log({ input, communes: cities.length, first: cities.slice(0, 3).map(c => c.name) });
}
const railway = await browser.cities("60000", "fr", "rail");
console.log({ input: "60000 rail", stations: railway.map(c => ({ name: c.name, kind: c.kind, latitude: c.latitude, longitude: c.longitude })) });
for (const [place, mode] of [["Rennes", "metro"], ["Orléans", "tram"]] as const) {
  try {
    const city = (await provider.municipalities(place)).find(c => c.name === place);
    if (!city) { console.log({ place, error: "municipality not found" }); continue; }
    const began = Date.now(), result = await browser.lines(city, mode);
    console.log({ place, mode, elapsedMs: Date.now() - began, unavailable: result.unavailable,
      issues: result.issues, lines: result.lines.map(l => ({ line: l.label, source: l.source.name })) });
  } catch (error) { console.log({ place, error: error instanceof Error ? error.message : String(error) }); }
}
if (process.argv.includes("--rail") && railway[0]) {
  const began = Date.now(), listing = await browser.lines(railway[0], "rail");
  console.log({ rail: "Beauvais", elapsedMs: Date.now() - began, unavailable: listing.unavailable,
    lines: listing.lines.map(l => ({ label: l.label, source: l.source.name })) });
}
