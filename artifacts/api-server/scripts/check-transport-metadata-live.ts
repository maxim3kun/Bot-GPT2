/** Manual public-source check. Never logs credentials, timetable payloads or Discord identities. */
import { connectDb, isMongoConnected, getTransportMetadataCollection } from "../src/lib/db.js";
import { FranceTransportClient } from "../src/discord/public-transport.js";
import { TransportBrowserClient, originOptions, arrivalOptions } from "../src/discord/transport-browser.js";
import { TransportMetadataCache, publicMetadata } from "../src/discord/transport-metadata-cache.js";

async function main() {
  await connectDb();
  if (!isMongoConnected()) throw Error("Shared MongoDB is required for the restart benchmark");
  if (process.argv.includes("--audit")) {
    const docs = await getTransportMetadataCollection()!.find({}, { timeoutMS: 3000 }).limit(1025).toArray();
    for (const doc of docs) {
      if (JSON.stringify(publicMetadata(doc.kind, doc.value)) !== JSON.stringify(doc.value))
        throw Error("A persisted document contains fields outside the closed public schema");
      if (!(doc.expiresAt instanceof Date)) throw Error("A persisted document lacks its expiry");
    }
    console.log(JSON.stringify({ auditedDocuments: docs.length, publicFieldsOnly: true,
      kinds: [...new Set(docs.map(d => d.kind))], noScheduleOrIdentityFields: true }));
    return;
  }
  const persistent = process.argv.includes("--persistent");
  let requests = 0, downloaded = 0;
  const fetcher: typeof fetch = async (...args) => {
    requests++;
    const response = await fetch(...args);
    downloaded += Number(response.headers.get("content-length")) || 0;
    return response;
  };
  const metadata = persistent ? new TransportMetadataCache() : new TransportMetadataCache(() => null);
  const provider = new FranceTransportClient(fetcher, Date.now, metadata), browser = new TransportBrowserClient(provider);
  const measure = async (stage: string, work: () => Promise<unknown>) => {
    const before = requests, bytes = downloaded, start = performance.now();
    const value = await work();
    console.log(JSON.stringify({ stage, sharedCache: persistent, elapsedMs: Math.round(performance.now() - start),
      sourceRequests: requests - before, declaredBytes: downloaded - bytes }));
    return value;
  };
  if (process.argv.includes("--local")) {
    const cities = await provider.municipalities("Breteuil 27");
    if (cities.length !== 1 || cities[0]!.id !== "27112") throw Error("Breteuil Eure must resolve uniquely");
    const listing = await measure("local-route-discovery", () => browser.lines(cities[0]!, "bus", "212")) as
      Awaited<ReturnType<typeof browser.lines>>;
    if (!listing.lines.length) throw Error("Expected official route 212 missing");
    console.log(JSON.stringify({ city: cities[0]!.label, localLines: listing.lines.length }));
    return;
  }
  const region = await measure("regional-network-discovery", async () => {
    const region = await browser.region("Normandie", "fr");
    if (!region || region.departmentCodes.join(",") === "") throw Error("Official Normandy scope missing");
    const networks = await browser.regionNetworks(region, "bus");
    const network = networks.find(n => /nomad car/i.test(n.title));
    if (!network) throw Error("Official Nomad Car source missing");
    console.log(JSON.stringify({ region: region.name, networks: networks.length, network: network.title }));
    return { region, network };
  }) as { region: NonNullable<Awaited<ReturnType<typeof browser.region>>>; network: Awaited<ReturnType<typeof browser.regionNetworks>>[number] };
  const listing = await measure("selected-network-route-catalogue", () => browser.regionLines(region.network, "bus")) as
    Awaited<ReturnType<typeof browser.regionLines>>;
  if (!listing.lines.length || listing.unavailable) throw Error("Official route inventory unavailable");
  console.log(JSON.stringify({ routes: listing.lines.length, sample: listing.lines.slice(0, 5).map(l => l.label) }));
  await measure("warm-metadata-discovery", async () => {
    const scope = await browser.region("Normandie");
    const networks = await browser.regionNetworks(scope!, "bus");
    await browser.regionLines(networks.find(n => n.id === region.network.id)!, "bus");
  });
  if (process.argv.includes("--schedules")) {
    const line = listing.lines.find(l => l.label === "212") ?? listing.lines[0]!;
    await measure("selected-line-schedules-not-persisted", async () => {
      const index = await browser.index(line), origins = originOptions(index, line);
      const origin = origins[0], arrival = origin && arrivalOptions(index, origin)[0];
      if (!origin || !arrival) throw Error("No verified stop pair in selected line");
      const result = await browser.departures(line, index, origin, arrival, "fr");
      if (!result.content) throw Error("No timetable response");
      console.log(JSON.stringify({ selectedLine: line.label, origin: origin.label, destination: arrival.label,
        scheduleStatus: result.embed?.footer?.text ?? "source-confirmed result" }));
    });
  }
}
main().then(() => process.exit(0)).catch(error => {
  console.error(error instanceof Error ? error.message : "Transport live check failed"); process.exit(1);
});
