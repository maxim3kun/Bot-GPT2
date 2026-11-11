import { unzipSync, strFromU8 } from "fflate";
import { setImmediate } from "node:timers/promises";
import type { CatalogDataset } from "./public-transport.js";
import type { JourneyIndex } from "./gtfs-journey.js";
import type { LineListing, StopGroup, TransportLine } from "./transport-browser.js";
import type { EnglandLocation } from "./england-locations.js";
import { TransportMetadataCache } from "./transport-metadata-cache.js";
import { TransportDataError } from "./transport-data-error.js";
import { EnglandHttp } from "./england-http.js";
import { appendTxc, element, elements, value, xmlDocument, type BankHoliday } from "./england-txc.js";
import { journeyPairs, scheduledJourneys } from "./gtfs-journey.js";
import { departureCards } from "./transport-presentation.js";
import { normalizeTransitText } from "./transport-query.js";

interface Dataset {
  id: number; operatorName: string; name: string; status: string; modified: string; extension: string;
  lines: string[]; localities: Array<{ gazetteer_id: string; name: string }>;
}
const datasetId = (line: TransportLine) => {
  const match = line.routeId.match(/^bods:(\d+):/);
  if (!match) throw new TransportDataError("Identifiant BODS invalide.");
  return Number(match[1]);
};

export class BodsTransportClient {
  private holidays?: { until: number; events: BankHoliday[] };
  constructor(readonly http = new EnglandHttp("bods"), readonly metadata = new TransportMetadataCache(),
    private fetcher: typeof fetch = fetch, private now = Date.now, private naptan = new EnglandHttp("nptg", fetcher, now)) {}

  async networks(city: EnglandLocation): Promise<CatalogDataset[]> {
    if (!/^\d{3}$/.test(city.area)) throw new TransportDataError("Zone administrative anglaise non vérifiée.");
    const catalog = await this.metadata.get({ territory: "en", provider: "bods", kind: "catalog",
      source: `adminArea:${city.area}`, version: "v1" }, 15 * 60_000, async () => {
      const rows: Dataset[] = [];
      for (let offset = 0; offset < 500; offset += 100) {
        const data = await this.http.json<{ count: number; results: Dataset[] }>(
          `/api/v1/dataset/?adminArea=${city.area}&status=published&limit=100&offset=${offset}`);
        if (!Array.isArray(data.results) || !Number.isInteger(data.count)) throw new TransportDataError("Catalogue BODS illisible.");
        if (data.count > 500) throw new TransportDataError("Trop de sources BODS dans cette zone pour garantir un catalogue complet.");
        rows.push(...data.results);
        if (offset + data.results.length >= data.count) break;
        if (!data.results.length) throw new TransportDataError("Catalogue BODS incomplet.");
      }
      return rows.filter(row => row.status === "published" && Number.isInteger(row.id) && ["zip", "xml"].includes(row.extension))
        .map(row => ({ id: `bods:${row.id}`, title: row.operatorName || row.name, slug: `bods-${row.id}`, type: "public-transit",
          page_url: `https://data.bus-data.dft.gov.uk/timetable/dataset/${row.id}/`, licence: "Open Government Licence",
          territory: "en" as const, modes: ["bus"], covered_area: (row.localities ?? []).map(l => ({ insee: l.gazetteer_id, nom: l.name, type: "locality" })),
          resources: [...new Set(row.lines ?? [])].map(label => ({ id: row.id, title: label, format: "TransXChange",
            url: `https://data.bus-data.dft.gov.uk/timetable/dataset/${row.id}/download/`, is_available: true, updated: row.modified })),
        }));
    });
    return catalog.filter(row => row.covered_area?.some(area => area.insee === city.id));
  }

  async lines(city: EnglandLocation, networkId: string | undefined, requested: string): Promise<LineListing> {
    const networks = await this.networks(city), selected = networks.filter(n => n.id === networkId);
    if (selected.length !== 1) throw new TransportDataError("Choisis d’abord un opérateur BODS pour cette localité.");
    const wanted = normalizeTransitText(requested), network = selected[0]!;
    return { lines: network.resources.filter(resource => !wanted || normalizeTransitText(resource.title) === wanted).map(resource => ({
      routeId: `bods:${resource.id}:${encodeURIComponent(resource.title)}`, label: resource.title,
      description: network.title, mode: "bus" as const, nearbyStopIds: [], allStops: true, territory: "en" as const,
      resource, realtime: [], source: { name: network.title, url: network.page_url, updated: resource.updated,
        attribution: "Bus Open Data Service · Open Government Licence",
        limitations: ["Inventaire de l’opérateur desservant cette localité ; les arrêts de la ligne seront vérifiés à sa sélection.",
          "Horaires TransXChange théoriques. Positions SIRI-VM et perturbations non intégrées ; aucune estimation temps réel n’est inventée."] },
    })), unavailable: 0, networkScoped: true };
  }

  private async bankHolidays() {
    if (this.holidays && this.holidays.until > this.now()) return this.holidays.events;
    try {
      const response = await this.fetcher("https://www.gov.uk/bank-holidays.json", {
        signal: AbortSignal.timeout(10_000), redirect: "error" });
      if (!response.ok) return [];
      const bytes = await this.http.bytes(response, 512_000);
      const data = JSON.parse(new TextDecoder().decode(bytes));
      const events: BankHoliday[] = data["england-and-wales"]?.events;
      if (!Array.isArray(events) || events.some(e => typeof e.date !== "string" || typeof e.title !== "string")) return [];
      this.holidays = { events, until: this.now() + 24 * 3600_000 };
      return events;
    } catch { return []; }
  }

  async index(line: TransportLine): Promise<JourneyIndex> {
    const id = datasetId(line), maximum = 32 * 1024 * 1024;
    const [response, holidays] = await Promise.all([
      this.http.response(`/timetable/dataset/${id}/download/`, maximum), this.bankHolidays(),
    ]);
    const bytes = await this.http.bytes(response, maximum);
    let files: Array<[string, Uint8Array]>;
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
      let total = 0, count = 0;
      try {
        files = Object.entries(unzipSync(bytes, { filter: file => {
          if (!/\.xml$/i.test(file.name)) return false;
          total += file.originalSize; count++;
          if (file.originalSize > 8 * 1024 * 1024 || total > 64 * 1024 * 1024 || count > 1500)
            throw new TransportDataError("Archive opérateur BODS trop volumineuse pour une lecture sûre.");
          return true;
        } }));
      } catch (error) {
        if (error instanceof TransportDataError) throw error;
        throw new TransportDataError("Archive BODS illisible. Aucun horaire confirmé.");
      }
    } else files = [["dataset.xml", bytes]];
    const index: JourneyIndex = { routeId: line.routeId, visits: new Map(), stops: new Map(), connectionsUnavailable: true,
      metadata: { routes: new Map([[line.routeId, { shortName: line.label, longName: line.description, type: 3 }]]),
        trips: new Map(), calendars: new Map(), calendarExceptions: new Map(), timezone: "Europe/London" } };
    let excluded = 0;
    for (const [name, content] of files) {
      const result = appendTxc(index, strFromU8(content), line.label, holidays, Math.floor(this.now() / 1000), name);
      excluded += result.excluded;
      await setImmediate();
    }
    if (!index.visits.size) throw new TransportDataError(excluded
      ? "Cette ligne est référencée, mais ses calendriers ou variantes ne sont pas interprétables avec assez de certitude. Aucun horaire n’est inventé."
      : "La ligne annoncée dans le catalogue n’a pas de parcours TransXChange exploitable dans le fichier actuel.");
    const used = new Set([...index.visits.values()].flatMap(visits => visits.map(v => v.stopId)));
    index.stops = new Map([...index.stops].filter(([id]) => used.has(id)));
    if (excluded) index.sourceWarning = `${excluded} course(s) non interprétables exclues : horaires affichés potentiellement incomplets.`;
    // NaPTAN's explicit stop areas establish reverse platforms; names and
    // geographical proximity never establish a return-platform relationship.
    const areas = [...new Set([...used].map(id => id.slice(0, 3)))].filter(id => /^\d{3}$/.test(id));
    if (areas.length > 6) index.sourceWarning = [index.sourceWarning, "Quais retour non vérifiés pour cette longue ligne."].filter(Boolean).join(" ");
    else for (const area of areas) {
      try {
        const stops = await this.metadata.get({ territory: "en", provider: "naptan", kind: "stops",
          source: `area:${area}`, version: "xml-v1" }, 24 * 3600_000, async () => {
          const response = await this.naptan.response(`/v1/access-nodes?dataFormat=xml&atcoAreaCodes=${area}`, 16 * 1024 * 1024);
          const xml = new TextDecoder().decode(await this.naptan.bytes(response, 16 * 1024 * 1024));
          if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new TransportDataError("Référentiel NaPTAN refusé.");
          return [...xml.matchAll(/<StopPoint\s[\s\S]*?<\/StopPoint>/g)].flatMap(match => {
            const stop = element(xmlDocument(match[0]).StopPoint), location = element(element(stop.Place).Location);
            const translation = element(location.Translation);
            const latitude = Number(value(translation, "Latitude") || value(location, "Latitude"));
            const longitude = Number(value(translation, "Longitude") || value(location, "Longitude"));
            const references = elements(element(stop.StopAreas).StopAreaRef);
            const parent = references.length === 1 ? value(element(stop.StopAreas), "StopAreaRef") : "";
            if (!latitude || !Number.isFinite(longitude) || value(stop, "$Status") === "inactive") return [];
            const descriptor = element(stop.Descriptor), place = element(stop.Place);
            return [{ id: value(stop, "AtcoCode"), name: [value(place, "LocalityName"), value(descriptor, "CommonName"),
              value(descriptor, "Indicator")].filter(Boolean).join(" · "), parent, latitude, longitude }];
          });
        });
        for (const stop of stops) {
          const old = index.stops.get(stop.id);
          if (old) { old.parent = stop.parent; if (stop.name) old.name = stop.name; }
        }
      } catch { index.sourceWarning = [index.sourceWarning, "Référentiel des quais indisponible : retour potentiellement incomplet."].filter(Boolean).join(" "); }
    }
    return index;
  }

  departures(line: TransportLine, index: JourneyIndex, origin: StopGroup, arrival: StopGroup, language: string) {
    const now = Math.floor(this.now() / 1000), french = language === "fr";
    const pairs = journeyPairs(index, new Set(origin.ids), new Set(arrival.ids));
    const times = scheduledJourneys(index, pairs, now, 7).slice(0, 6);
    return { ...departureCards({ title: `Bus ${line.label}`, origin: origin.label, arrival: arrival.label,
      multiPlatform: origin.ids.length > 1, stops: index.stops, times, timezone: "Europe/London", now, french, realtime: false,
      notes: [index.sourceWarning ?? "", "Source : Bus Open Data Service · Open Government Licence",
        french ? "Trajets directs ; temps réel et perturbations non intégrés pour cette source."
          : "Direct journeys; live predictions and disruption alerts are not integrated for this source."].filter(Boolean),
      empty: french ? "Aucun départ vérifié dans les 7 prochains jours selon les calendriers interprétables de la source. La ligne peut avoir d’autres courses non prises en charge."
        : "No verified departure within the next 7 days in supported source calendars. Other services may not be supported." }), source: line.source };
  }
}
