/** Refreshes and reports every Mobility Database country without printing credentials. */
import assert from "node:assert/strict";
import { connectDb, getTransportMetadataCollection, isMongoConnected } from "../src/lib/db.js";
import { MobilityDatabaseTransportClient, type MobilityCountryCoverage } from "../src/discord/mobility-database-transport.js";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  await connectDb();
  assert.ok(isMongoConnected(), "MongoDB is required to verify and cache Mobility Database coverage.");

  const client = new MobilityDatabaseTransportClient();
  const deadline = Date.now() + 15 * 60_000;
  let coverage: MobilityCountryCoverage | undefined;
  let lastCount = -1;
  while (Date.now() < deadline) {
    coverage = await client.countryCoverage();
    if (coverage.countries.length !== lastCount) {
      lastCount = coverage.countries.length;
      console.log(`Country coverage refresh: ${lastCount} country record(s) available; waiting for a complete scan.`);
    }
    if (coverage.complete && coverage.countries.length > 0) break;
    await wait(2_500);
  }
  assert.ok(coverage?.complete && coverage.countries.length > 0,
    "The full Mobility Database country coverage scan did not complete within 15 minutes.");

  const collection = getTransportMetadataCollection();
  assert.ok(collection, "MongoDB transport metadata collection is unavailable.");
  const document = await collection.findOne({
    territory: "mobility", provider: "mobilitydatabase", kind: "mobilityCoverage",
    source: "active-open-static-gtfs-by-country", version: "v1",
  }, { timeoutMS: 3_000 });
  assert.ok(document?.fetchedAt instanceof Date, "Complete country coverage was not persisted in MongoDB.");
  const stored = document.value as MobilityCountryCoverage;
  assert.equal(stored.complete, true);
  assert.equal(stored.countries.length, coverage.countries.length);

  const covered = stored.countries.filter(country => country.covered)
    .map(({ code, name }) => ({ code, name }));
  const notCovered = stored.countries.filter(country => !country.covered)
    .map(({ code, name }) => ({ code, name }));
  console.log(JSON.stringify({
    checkedCountries: stored.countries.length,
    countriesWithUsableOpenStaticGtfs: covered.length,
    countriesWithoutUsableOpenStaticGtfs: notCovered.length,
    included: covered,
    excluded: notCovered,
    cachedInMongoAt: document.fetchedAt.toISOString(),
  }, null, 2));
}

main().then(() => process.exit(0)).catch(error => {
  console.error(error instanceof Error ? error.message : "Mobility coverage check failed.");
  process.exit(1);
});
