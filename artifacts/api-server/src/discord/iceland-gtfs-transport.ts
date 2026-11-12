import { NationalGtfsTransportClient } from "./national-gtfs-transport.js";
import type { TransportMetadataCache } from "./transport-metadata-cache.js";

/** Strætó is the only Icelandic feed currently included in transport search. */
export class IcelandGtfsTransportClient extends NationalGtfsTransportClient {
  constructor(fetcher: typeof fetch = fetch, now: () => number = Date.now, metadata?: TransportMetadataCache) {
    super("is", fetcher, now, metadata);
  }
}
