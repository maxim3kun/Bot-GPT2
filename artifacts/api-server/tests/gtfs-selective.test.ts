import assert from "node:assert/strict";
import test from "node:test";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { selectiveGtfs, isIdfmGtfs } from "../src/discord/gtfs-selective.js";
import { GtfsRangeArchive, type RangeRequest } from "../src/discord/gtfs-range.js";
import { FranceTransportClient } from "../src/discord/public-transport.js";
import { TransportBrowserClient, originOptions, arrivalOptions } from "../src/discord/transport-browser.js";
import { buildJourneyIndex, scanRoutesAtStops } from "../src/discord/gtfs-journey.js";
import { parseTransportCommand, handleTransportCommand } from "../src/discord/transport-menu.js";
import { EventEmitter } from "node:events";
import type { Message } from "discord.js";

const files = {
  "shapes.txt": strToU8("shape_id,shape_pt_lat,shape_pt_lon\nUNUSED,48.8,2.3\n"),
  "agency.txt": strToU8("agency_id,agency_name,agency_timezone\nA,IDFM,Europe/Paris\n"),
  "routes.txt": strToU8("route_id,route_short_name,route_long_name,route_type\nM8,8,Métro 8,1\nM9,9,Métro 9,1\nB8,8,Bus 8,3\n"),
  "trips.txt": strToU8("route_id,service_id,trip_id\nM8,S,T8\nM9,S,T9\nB8,S,TB\n"),
  "stops.txt": strToU8("stop_id,stop_name,parent_station,location_type\nO,Bastille,SO,0\nD,Créteil - Préfecture,SD,0\nSO,Bastille,,1\nSD,Créteil - Préfecture,,1\nUNUSED,Other,,0\n"),
  "stop_times.txt": strToU8('trip_id,arrival_time,departure_time,stop_id,stop_sequence,stop_headsign\nTB,08:00:00,08:00:00,UNUSED,1,"ignore\nthis"\n"T8",08:10:00,08:10:00,O,1,"Créteil,\nPréfecture"\nT8,08:45:00,08:45:00,D,2,"with ""quotes"""\nT9,08:15:00,08:15:00,UNUSED,1,Other\n'),
  "calendar.txt": strToU8("service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nS,1,1,1,1,1,1,1,20200101,20991231\n"),
  "calendar_dates.txt": strToU8("service_id,date,exception_type\nS,20261111,2\nOTHER,20261110,1\n"),
  "transfers.txt": strToU8("from_stop_id,to_stop_id,transfer_type,min_transfer_time\nO,D,2,120\n"),
};
const original = zipSync(files);
const resource = { id: 80921, title: "GTFS", format: "GTFS", is_available: true, modes: ["subway"],
  url: "https://www.data.gouv.fr/idfm", original_url: "https://eu.ftp.opendatasoft.com/stif/GTFS/IDFM-gtfs.zip" };

function rangeServer(bytes = original, options: { ignored?: boolean; changed?: boolean; truncated?: boolean; noValidator?: boolean } = {}) {
  const ranges: string[] = [];
  const request: RangeRequest = async (range, validator) => {
    ranges.push(range);
    const suffix = range.match(/^bytes=-(\d+)$/);
    const pair = range.match(/^bytes=(\d+)-(\d+)$/);
    const start = suffix ? Math.max(0, bytes.length - Number(suffix[1])) : Number(pair![1]);
    const end = suffix ? bytes.length - 1 : Number(pair![2]);
    if (!suffix && !options.noValidator) assert.equal(validator?.["if-match"], '"v1"');
    const data = bytes.slice(start, end + 1 - (options.truncated ? 1 : 0));
    return new Response(new ReadableStream({
      start(controller) {
        // Exercise headers, UTF-8 and CSV records split across tiny chunks.
        for (let i = 0; i < data.length; i += 7) controller.enqueue(data.slice(i, i + 7));
        controller.close();
      },
    }), { status: options.ignored ? 200 : 206, headers: {
      "content-range": `bytes ${start}-${end}/${bytes.length}`,
      ...(!options.noValidator ? { etag: options.changed && !suffix ? '"v2"' : '"v1"' } : {}),
    } });
  };
  return { ranges, request };
}

test("recognizes the explicit line marker before or after the city without losing qualifiers", () => {
  for (const words of [["ligne", "8", "Paris"], ["Paris", "ligne", "8"], ["Paris", "8"]]) {
    assert.deepEqual(parseTransportCommand(words), { place: "Paris", line: "8", direction: undefined });
  }
  assert.deepEqual(parseTransportCommand(["ligne", "8", "Paris", "(75)", "vers", "Créteil"]), {
    place: "Paris (75)", line: "8", direction: "Créteil",
  });
  assert.equal(isIdfmGtfs(resource), true);
  assert.equal(isIdfmGtfs({ original_url: "https://eu.ftp.opendatasoft.com.attacker.example/stif/GTFS/IDFM-gtfs.zip" }), false);
});

test("extracts only metro 8 and its service calendar, with quoted multiline CSV retained", async () => {
  const server = rangeServer();
  const selected = await selectiveGtfs(server.request, { mode: "metro", line: "8" });
  const subset = unzipSync(selected);
  assert.ok(!subset["shapes.txt"] && !subset["transfers.txt"]);
  assert.ok(!server.ranges.includes("bytes=0-29"), "shapes is the first entry and must not be decompressed");
  assert.match(strFromU8(subset["trips.txt"]!), /T8/);
  assert.doesNotMatch(strFromU8(subset["trips.txt"]!), /T9|TB/);
  assert.doesNotMatch(strFromU8(subset["stops.txt"]!), /UNUSED/);
  assert.match(strFromU8(subset["stop_times.txt"]!), /Créteil,\nPréfecture/);
  const index = await buildJourneyIndex(selected, "M8");
  assert.equal(index.visits.size, 1);
  assert.equal(index.metadata.calendarExceptions.get("20261111:S"), 2);
  assert.equal(index.stops.get("O")!.stationName, "Bastille");
});

test("a large-feed route identifier extracts only that exact route", async () => {
  const selected = await selectiveGtfs(rangeServer().request, { mode: "metro", routeId: "M8" });
  const subset = unzipSync(selected);
  assert.match(strFromU8(subset["routes.txt"]!), /M8/);
  assert.doesNotMatch(strFromU8(subset["routes.txt"]!), /M9|B8/);
  assert.match(strFromU8(subset["trips.txt"]!), /T8/);
  assert.doesNotMatch(strFromU8(subset["trips.txt"]!), /T9/);
});

test("falls back to normal CSV filtering if trip_id is not the first column", async () => {
  const bytes = zipSync({ ...files,
    "stop_times.txt": strToU8("stop_id,trip_id,arrival_time,departure_time,stop_sequence\nO,T8,08:10:00,08:10:00,1\nUNUSED,T9,08:15:00,08:15:00,1\nD,T8,08:45:00,08:45:00,2\n"),
  });
  const selected = await selectiveGtfs(rangeServer(bytes).request, { mode: "metro", line: "8" });
  const index = await buildJourneyIndex(selected, "M8");
  assert.equal(index.visits.get("T8")!.length, 2);
});

test("a missing line does not download trips or the huge stop-times table", async () => {
  const server = rangeServer();
  const selected = await selectiveGtfs(server.request, { mode: "metro", line: "99" });
  assert.deepEqual(Object.keys(unzipSync(selected)), ["routes.txt"]);
  assert.equal(server.ranges.length, 3, "only the ZIP suffix, route header and compressed route data are needed");
});

test("network discovery retains route-stop evidence rather than every departure", async () => {
  const bytes = zipSync({ ...files,
    "stop_times.txt": strToU8("trip_id,arrival_time,departure_time,stop_id,stop_sequence\nT8,08:10:00,08:10:00,O,1\nT8,08:45:00,08:45:00,D,2\nT8,09:10:00,09:10:00,O,3\nT9,08:15:00,08:15:00,UNUSED,1\n"),
  });
  const selected = await selectiveGtfs(rangeServer(bytes).request, { mode: "metro", discoveryStops: ["O"] });
  const body = strFromU8(unzipSync(selected)["stop_times.txt"]!);
  assert.equal(body.trim().split("\n").length, 2);
  assert.doesNotMatch(body, /UNUSED|08:45|09:10/);
  await assert.rejects(selectiveGtfs(rangeServer().request, { mode: "metro" }), /requires a route or nearby stops/);
});

test("national city discovery filters a large mode to trips serving the selected stops", async () => {
  const unrelated = Array.from({ length: 50_001 }, (_, i) => `B8,S,unrelated-${i},Other`)
    .join("\n");
  const bytes = zipSync({ ...files,
    "trips.txt": strToU8(`route_id,service_id,trip_id,trip_headsign\nB8,S,local,City\n${unrelated}\n`),
    "stop_times.txt": strToU8("trip_id,arrival_time,departure_time,stop_id,stop_sequence\nlocal,08:10:00,08:10:00,O,1\nlocal,08:45:00,08:45:00,D,2\n"),
  });
  const selected = await selectiveGtfs(rangeServer(bytes).request, { mode: "bus", discoveryStops: ["O"] });
  const subset = unzipSync(selected);
  assert.match(strFromU8(subset["trips.txt"]!), /local/);
  assert.doesNotMatch(strFromU8(subset["trips.txt"]!), /unrelated-/);
  assert.deepEqual((await scanRoutesAtStops(selected, new Set(["O"]))).map(route => route.routeId), ["B8"]);
});

test("refuses ignored ranges, changed revisions, truncated data and unstable versions", async () => {
  for (const options of [{ ignored: true }, { changed: true }, { truncated: true }, { noValidator: true }]) {
    await assert.rejects(selectiveGtfs(rangeServer(original, options).request, { mode: "metro", line: "8" }));
  }
});

test("refuses an expanded-size bomb and a broken table checksum", async () => {
  for (const field of ["size", "crc"]) {
    const bytes = Buffer.from(original);
    for (let i = 0; i < bytes.length - 46; i++) {
      if (bytes.readUInt32LE(i) !== 0x02014b50) continue;
      const length = bytes.readUInt16LE(i + 28);
      if (bytes.subarray(i + 46, i + 46 + length).toString() !== "routes.txt") continue;
      bytes.writeUInt32LE(field === "size" ? 801 * 1024 * 1024 : 123, i + (field === "size" ? 24 : 16));
      break;
    }
    await assert.rejects(selectiveGtfs(rangeServer(bytes).request, { mode: "metro", line: "8" }),
      field === "size" ? /streaming limits/ : /checksum/);
  }
});

test("provider caches isolated selections and browser exposes a complete direct metro journey", async () => {
  const server = rangeServer();
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url === resource.original_url) {
      const headers = new Headers(init?.headers);
      const condition = headers.get("if-match");
      return server.request(headers.get("range")!, condition ? { "if-match": condition } : {});
    }
    if (url.endsWith("/api/datasets")) return Response.json([{ id: "idfm", title: "IDFM", type: "public-transit",
      page_url: "https://transport.data.gouv.fr/datasets/idfm", resources: [resource] }]);
    if (url.includes("/api/gtfs-stops")) return Response.json({ features: [{ properties: { resource_id: 80921, stop_id: "O" } }] });
    throw new Error(`Unexpected transport request ${url}`);
  };
  let clock = Date.parse("2026-11-10T07:00:00Z");
  const now = () => clock;
  const client = new TransportBrowserClient(new FranceTransportClient(fetcher, now), now);
  const city = { id: "75056", name: "Paris", label: "Paris — 75", latitude: 48.85, longitude: 2.35 };
  const listing = await client.lines(city, "metro", "8");
  assert.deepEqual(listing.lines.map((line) => line.label), ["8"]);
  const count = server.ranges.length;
  const index = await client.index(listing.lines[0]!);
  assert.equal(server.ranges.length, count, "building the menu index must reuse the selective ZIP");
  assert.equal(index.connectionsUnavailable, true);
  clock += 40_000;
  assert.strictEqual(await client.index(listing.lines[0]!), index, "intentionally disabled transfers must not expire a healthy direct index after 30 seconds");
  const origin = originOptions(index, listing.lines[0]!)[0]!;
  const arrival = arrivalOptions(index, origin)[0]!;
  const result = await client.departures(listing.lines[0]!, index, origin, arrival, "fr");
  assert.match(result.content, /08:10/);
  assert.match(result.content, /Créteil/);
  await client.provider.staticFeed(resource, { mode: "metro", line: "9" });
  assert.ok(server.ranges.length > count, "a different selection must not receive line 8's binary cache");
  const network = await client.lines(city, "metro");
  assert.equal(network.networkScoped, true);
  assert.ok(network.lines.some((line) => line.label === "8"));
  const afterNetwork = server.ranges.length;
  await client.provider.staticFeed(resource, { mode: "metro", line: "99" });
  assert.ok(server.ranges.length > afterNetwork, "a discovery subset must not be reused as a complete journey feed");
  let searched = "";
  client.cities = async (place) => { searched = place; return [city]; };
  const collector = new EventEmitter() as EventEmitter & { stop(reason: string): void };
  collector.stop = (reason) => collector.emit("end", [], reason);
  const prompt = { content: "", async edit(value: any) { this.content = value.content; return this; },
    createMessageComponentCollector() { return collector; } };
  const message = { channelId: "metro-test", author: { id: "owner" }, async reply(value: any) { await prompt.edit(value); return prompt; } };
  await handleTransportCommand(message as unknown as Message, ["fr", "ligne", "8", "Paris"], "fr", "!", "metro", client);
  assert.equal(searched, "Paris");
  assert.match(prompt.content, /station d’arrivée/);
  assert.doesNotMatch(prompt.content, /station de départ/);
  collector.stop("cancelled");
});

