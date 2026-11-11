/** Read-only provider verification. No credential, authenticated URL, raw live
 * payload or personal Discord data may be logged by this script. */
import { EnglandTransportClient } from "../src/discord/england-transport.js";
import { EnglandHttp } from "../src/discord/england-http.js";
import { EnglandLocations } from "../src/discord/england-locations.js";
import { TflTransportClient } from "../src/discord/england-tfl.js";
import { BodsTransportClient } from "../src/discord/england-bods.js";
import { TransportMetadataCache, publicMetadata } from "../src/discord/transport-metadata-cache.js";
import { connectDb, getTransportMetadataCollection, isMongoConnected } from "../src/lib/db.js";
import { TransportBrowserClient, originOptions, arrivalOptions } from "../src/discord/transport-browser.js";
import { TransportDataError } from "../src/discord/transport-data-error.js";

async function main() {
  const persistent = process.argv.includes("--persistent");
  if (persistent) { await connectDb(); if (!isMongoConnected()) throw Error("Shared cache unavailable"); }
  let requests = 0;
  const fetcher: typeof fetch = async (...args) => { requests++; return fetch(...args); };
  const metadata = persistent ? new TransportMetadataCache() : new TransportMetadataCache(() => null);
  const england = new EnglandTransportClient(
    new TflTransportClient(new EnglandHttp("tfl", fetcher), metadata),
    new BodsTransportClient(new EnglandHttp("bods", fetcher), metadata, fetcher),
    new EnglandLocations(new EnglandHttp("nptg", fetcher), metadata));
  const browser = new TransportBrowserClient(undefined, Date.now, undefined, undefined, england);
  const measure = async <T>(stage: string, work: () => Promise<T>) => {
    const start = performance.now(), before = requests;
    const result = await work();
    console.log(JSON.stringify({ stage, elapsedMs: Math.round(performance.now() - start), sourceRequests: requests - before, persistent }));
    return result;
  };
  const city = (await measure("London-reference", () => browser.cities("Londres", "en", "metro")))[0]!;
  for (const [mode, requested, from, to] of [
    ["metro", "bakerloo", "940GZZLUCHX", "940GZZLUWLO"],
    ["bus", "24", "490000135A", "490004695N"],
  ] as const) {
    const listing = await measure(`${mode}-routes`, () => browser.lines(city, mode, requested, "tfl"));
    const line = listing.lines[0]; if (!line) throw Error("Official London route missing");
    const index = await measure(`${mode}-topology`, () => browser.index(line));
    const origin = originOptions(index, line).find(o => o.ids.includes(from));
    const arrival = origin && arrivalOptions(index, origin).find(a => a.ids.includes(to));
    if (!origin || !arrival) throw Error("Official London stop pair missing");
    const result = await measure(`${mode}-live-result`, () => browser.departures(line, index, origin, arrival, "fr"));
    console.log(JSON.stringify({ mode, line: line.label, origin: origin.label, arrival: arrival.label,
      footer: result.embed?.footer?.text, result: result.embed?.fields?.map(f => ({ name: f.name, value: f.value })) ?? result.content }));
    const reverse = await browser.reverse(line, index, origin, arrival, "fr");
    console.log(JSON.stringify({ mode, structuralReturnVerified: !!reverse }));
    await measure(`${mode}-warm-routes`, () => browser.lines(city, mode, requested, "tfl"));
  }
  if (process.argv.includes("--line462")) {
    const listing = await measure("TfL-462-live-inventory", () => browser.lines(city, "bus", "462", "tfl"));
    const line = listing.lines[0];
    if (!line) throw Error("Official TfL 462 route missing");
    const index = await measure("TfL-462-live-topology", () => browser.index(line));
    const routeOrigins = originOptions(index, line).filter(o => /Beehive Lane/i.test(o.label));
    if (!routeOrigins.length) throw Error("TfL 462 Beehive Lane missing");
    const summary = [];
    for (const origin of routeOrigins) {
      const arrival = arrivalOptions(index, origin).find(a => /Millwell Crescent/i.test(a.label));
      if (!arrival) { summary.push({ origin: origin.label, officialMillwellRouteAvailable: false }); continue; }
      const result = await measure("TfL-462-selected-stops-live-result",
        () => browser.departures(line, index, origin, arrival, "fr"));
      summary.push({ origin: origin.label, arrival: arrival.label, originPlatforms: origin.ids.length,
        result: result.embed?.fields?.map(f => ({ name: f.name, value: f.value })) ?? result.content });
    }
    console.log(JSON.stringify({ mode: "bus", line: line.label, stops: summary,
      routeCount: listing.lines.length, branches: index.visits.size }));
  }
  if (process.argv.includes("--bods")) {
    const cities = await measure("Cambridge-official-locality", () => browser.cities("Cambridge", "en", "bus"));
    const cambridge = cities.find(c => /Cambridgeshire/.test(c.label));
    if (!cambridge) throw Error("Official Cambridge locality missing");
    const networks = await measure("Cambridge-bus-operators", () => browser.networks(cambridge, "bus"));
    const network = networks.find(n => n.resources.some(r => r.title === "132"));
    if (!network) throw Error("Official operator for Cambridge line 132 missing");
    const listing = await measure("BODS-line-inventory", () => browser.lines(cambridge, "bus", "132", network.id));
    const line = listing.lines[0]; if (!line) throw Error("Official BODS line missing");
    const index = await measure("BODS-selected-line-schedules-RAM-only", () => browser.index(line));
    const origin = originOptions(index, line).find(o => /Drummer St/i.test(o.label));
    const arrival = origin && arrivalOptions(index, origin).find(a => /High Street/i.test(a.label));
    if (!origin || !arrival) throw Error("Official BODS stop pair missing");
    const result = await browser.departures(line, index, origin, arrival, "fr");
    const reverse = await browser.reverse(line, index, origin, arrival, "fr");
    console.log(JSON.stringify({ mode: "bus", network: network.title, line: line.label, origin: origin.label,
      arrival: arrival.label, trips: index.visits.size, stops: index.stops.size, warning: index.sourceWarning,
      footer: result.embed?.footer?.text, result: result.embed?.fields ?? result.content, officialReturnVerified: !!reverse }));
    await measure("Cambridge-warm-locality", () => browser.cities("Cambridge", "en", "bus"));
    await measure("Cambridge-warm-operators", () => browser.networks(cambridge, "bus"));
  }
  if (persistent) {
    const docs = await getTransportMetadataCollection()!.find({ territory: "en" }, { timeoutMS: 3000 }).limit(200).toArray();
    for (const doc of docs) if (JSON.stringify(publicMetadata(doc.kind, doc.value)) !== JSON.stringify(doc.value))
      throw Error("Unexpected persisted English transport fields");
    console.log(JSON.stringify({ auditedEnglishDocuments: docs.length, publicMetadataOnly: true, kinds: [...new Set(docs.map(d => d.kind))] }));
  }
}
main().then(() => process.exit(0)).catch(error => {
  console.error(error instanceof TransportDataError ? error.message : "English transport verification failed; request details redacted.");
  process.exit(1);
});
