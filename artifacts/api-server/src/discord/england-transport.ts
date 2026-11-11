import type { CatalogDataset, TransportLocation } from "./public-transport.js";
import type { TransportLine, StopGroup } from "./transport-browser.js";
import type { JourneyIndex } from "./gtfs-journey.js";
import type { TransitMode } from "./transport-query.js";
import { TransportDataError } from "./transport-data-error.js";
import { EnglandLocations, type EnglandLocation } from "./england-locations.js";
import { BodsTransportClient } from "./england-bods.js";
import { TflTransportClient } from "./england-tfl.js";

export class EnglandTransportClient {
  constructor(readonly tfl = new TflTransportClient(), readonly bods = new BodsTransportClient(), readonly locations = new EnglandLocations()) {}
  cities(place: string, mode?: TransitMode | null): Promise<TransportLocation[]> {
    if (mode === "rail") throw new TransportDataError("Trains anglais : accès National Rail en attente de validation. Aucun horaire train n’est confirmé.");
    return /^(?:londres|london)$/i.test(place.trim()) ? this.tfl.london() : this.locations.search(place);
  }
  private london(city: TransportLocation) { return (city as EnglandLocation).area === "490"; }
  async networks(city: TransportLocation, mode: TransitMode): Promise<CatalogDataset[]> {
    if (this.london(city)) return [{ id: "tfl", title: "Transport for London", slug: "tfl", type: "public-transit",
      page_url: "https://tfl.gov.uk/", licence: "TfL Open Data", territory: "en",
      resources: [{ id: 0, title: "TfL Unified API", format: "JSON", is_available: true, url: "https://api.tfl.gov.uk/" }] }];
    if (mode !== "bus") throw new TransportDataError("Hors Londres, seuls les bus BODS sont intégrés pour le moment. Les autres métros et les trains ne sont pas encore disponibles.");
    const networks = await this.bods.networks(city as EnglandLocation);
    if (!networks.length) throw new TransportDataError("Aucun opérateur BODS correspondant à cette localité n’a pu être confirmé. La couverture ouverte peut être incomplète.");
    return networks;
  }
  async lines(city: TransportLocation, mode: TransitMode, requested: string, networkId?: string) {
    if (this.london(city)) {
      if (networkId && networkId !== "tfl") throw new TransportDataError("Réseau TfL invalide.");
      return this.tfl.lines(mode, requested);
    }
    if (mode !== "bus") throw new TransportDataError("Ce mode n’est pas intégré dans cette localité anglaise.");
    return this.bods.lines(city as EnglandLocation, networkId, requested);
  }
  index(line: TransportLine) { return line.routeId.startsWith("tfl:") ? this.tfl.index(line) : this.bods.index(line); }
  departures(line: TransportLine, index: JourneyIndex, origin: StopGroup, arrival: StopGroup, language: string) {
    return line.routeId.startsWith("tfl:") ? this.tfl.departures(line, index, origin, arrival, language)
      : Promise.resolve(this.bods.departures(line, index, origin, arrival, language));
  }
}
