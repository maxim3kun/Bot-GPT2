import type { TransportLocation } from "./public-transport.js";
import { TransportMetadataCache } from "./transport-metadata-cache.js";
import { normalizeTransitText } from "./transport-query.js";
import { TransportDataError } from "./transport-data-error.js";
import { EnglandHttp } from "./england-http.js";

export interface EnglandLocation extends TransportLocation { area: string }
const text = (block: string, tag: string) => (block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`))?.[1] ?? "")
  .replace(/&amp;/g, "&").replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

/** Stream the official gazetteer; never retain its national XML or timetable data. */
export class EnglandLocations {
  private data?: { expires: number; locations: EnglandLocation[] };
  private pending?: Promise<EnglandLocation[]>;
  constructor(private http = new EnglandHttp("nptg"), private metadata = new TransportMetadataCache(), private now = Date.now) {}
  async search(query: string): Promise<EnglandLocation[]> {
    const name = normalizeTransitText(query === "Londres" ? "London" : query);
    if (name.length < 2 || name.length > 100) return [];
    return this.metadata.get({ territory: "en", provider: "nptg", kind: "locations", source: `locality:${name}`, version: "nptg-v1" },
      24 * 3600_000, async () => {
        const locations = await this.all();
        const exact = locations.filter(l => normalizeTransitText(l.name) === name);
        const choices = exact.length ? exact : locations.filter(l => normalizeTransitText(l.label).includes(name));
        if (choices.length > 100) throw new TransportDataError("Trop de localités anglaises correspondent. Précise le nom ou le comté.");
        return choices;
      });
  }
  private all(): Promise<EnglandLocation[]> {
    if (this.data && this.data.expires > this.now()) return Promise.resolve(this.data.locations);
    if (this.pending) return this.pending;
    this.pending = this.load().then(locations => {
      this.data = { locations, expires: this.now() + 24 * 3600_000 }; return locations;
    }).finally(() => { this.pending = undefined; });
    return this.pending;
  }
  private async load() {
    const response = await this.http.response("/v1/nptg", 96 * 1024 * 1024), reader = response.body?.getReader();
    if (!reader) throw new TransportDataError("Référentiel anglais des localités indisponible.");
    const decoder = new TextDecoder(), areas = new Map<string, { code: string; name: string }>(), locations: EnglandLocation[] = [];
    let buffer = "", size = 0, regionsRead = false, complete = false;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) { complete = buffer.includes("</NationalPublicTransportGazetteer>"); break; }
        size += value.length; if (size > 96 * 1024 * 1024) throw new TransportDataError("Référentiel anglais trop volumineux.");
        buffer += decoder.decode(value, { stream: true });
        if (!regionsRead) {
          const end = buffer.indexOf("</Regions>");
          if (end < 0) { if (buffer.length > 512_000) throw new TransportDataError("Régions du référentiel anglais illisibles."); continue; }
          for (const region of buffer.slice(0, end).matchAll(/<Region\s[\s\S]*?<\/Region>/g)) {
            if (text(region[0], "Country") !== "England") continue;
            for (const area of region[0].matchAll(/<AdministrativeArea\s[\s\S]*?<\/AdministrativeArea>/g)) {
              areas.set(text(area[0], "AdministrativeAreaCode"),
                { code: text(area[0], "AtcoAreaCode"), name: text(area[0], "Name") });
            }
          }
          buffer = buffer.slice(end + "</Regions>".length); regionsRead = true;
        }
        let match: RegExpExecArray | null;
        const pattern = /<NptgLocality\s[\s\S]*?<\/NptgLocality>/g; let end = 0;
        while ((match = pattern.exec(buffer))) {
          end = pattern.lastIndex;
          const block = match[0], area = areas.get(text(block, "AdministrativeAreaRef"));
          if (!area || /Modification="delete"/i.test(block)) continue;
          const latitude = Number(text(block, "Latitude")), longitude = Number(text(block, "Longitude"));
          const name = text(block, "LocalityName"), id = text(block, "NptgLocalityCode");
          if (!id || !name || !latitude || !Number.isFinite(longitude)) continue;
          const qualifier = text(block, "QualifierName");
          locations.push({ id, name, label: [name, qualifier, area.name, "Angleterre"].filter(Boolean).join(" · "),
            latitude, longitude, territory: "en", area: area.code });
        }
        if (end) buffer = buffer.slice(end);
        if (buffer.length > 256_000 || locations.length > 60_000) throw new TransportDataError("Localités anglaises hors limites.");
      }
    } catch (error) {
      if (error instanceof TransportDataError) throw error;
      throw new TransportDataError("Chargement des localités anglaises interrompu.");
    } finally { await reader.cancel().catch(() => undefined); }
    if (!complete || !locations.length) throw new TransportDataError("Référentiel anglais incomplet. Aucune localité n’est confirmée.");
    return locations;
  }
}
