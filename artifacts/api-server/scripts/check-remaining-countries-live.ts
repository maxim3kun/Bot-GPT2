/** Read-only live route checks for countries without a dedicated live script.
 * Logs only public source names and route counts, never feed payloads or secrets. */
import assert from "node:assert/strict";
import { arrivalOptions, originOptions, TransportBrowserClient } from "../src/discord/transport-browser.js";
import type { TransportLocation } from "../src/discord/public-transport.js";

const browser = new TransportBrowserClient();
const checks: Array<{ city: TransportLocation; mode: "bus" | "metro" | "rail"; network?: RegExp;
  timetable?: boolean }> = [
  { city: { id: "qc:laval-live", name: "Laval", label: "Laval · Québec", latitude: 45.5690,
    longitude: -73.6920, territory: "qc" }, mode: "bus", network: /stl/i },
  { city: { id: "ch:zurich-live", name: "Zürich", label: "Zürich · Suisse", latitude: 47.3769,
    longitude: 8.5417, territory: "ch" }, mode: "rail" },
  { city: { id: "no:oslo-live", name: "Oslo", label: "Oslo · Norvège", latitude: 59.9139,
    longitude: 10.7522, area: "Oslo", territory: "no" }, mode: "rail", timetable: false },
  { city: { id: "is:reykjavik-live", name: "Reykjavík", label: "Reykjavík · Islande", latitude: 64.1466,
    longitude: -21.9426, territory: "is" }, mode: "bus" },
];

const failures: string[] = [];
for (const { city, mode, network: preferredNetwork, timetable: requireTimetable = true } of checks) {
  try {
    const networks = await browser.networks(city, mode);
    const candidates = networks.filter(dataset => dataset.resources.some(resource =>
      resource.is_available && /gtfs|netex/i.test(`${resource.format} ${resource.title}`)));
    const network = preferredNetwork
      ? candidates.find(dataset => preferredNetwork.test(dataset.title))
      : candidates[0];
    assert.ok(network, `${city.territory}: no live ${mode} timetable source found near ${city.name}`);
    const listing = await browser.lines(city, mode, "", network.id);
    assert.ok(listing.lines.length, `${city.territory}: no real ${mode} route found in ${network.title}`);
    if (!requireTimetable) {
      console.log(`${city.territory}: ${network.title}; ${mode}; ${listing.lines.length} real route(s); ` +
        "no active departure in the sample timetable window");
      continue;
    }
    let verifiedLine: string | undefined;
    for (const line of listing.lines.slice(0, 10)) {
      try {
        const index = await browser.index(line);
        const origin = originOptions(index, line)[0];
        const destination = origin && arrivalOptions(index, origin)[0];
        if (!origin || !destination) continue;
        const timetable = await browser.departures(line, index, origin, destination, "fr");
        if (timetable.content.trim() && !/aucun d[eé]part exploitable|no usable departures/i.test(timetable.content)) {
          verifiedLine = line.label;
          break;
        }
      } catch { /* Another published line may have active service. */ }
    }
    assert.ok(verifiedLine, `${city.territory}: no active timetable found on the first ${Math.min(10, listing.lines.length)} ${mode} routes`);
    console.log(`${city.territory}: ${network.title}; ${mode}; ${listing.lines.length} real route(s); ` +
      `example ${verifiedLine}; timetable checked`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown source error";
    failures.push(`${city.territory}: ${message}`);
    console.log(`${city.territory}: CHECK FAILED — ${message}`);
  }
}
if (failures.length) {
  console.log(`Coverage checks failed: ${failures.join(" | ")}`);
  process.exitCode = 1;
}
