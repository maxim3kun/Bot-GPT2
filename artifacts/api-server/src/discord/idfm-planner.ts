import { PlannerError, type ItineraryProvider, type OfficialPlace } from "./transport-planner-types.js";
import { obj, list, text, display, parsePlaces, parseItineraries, plannerDate, idfmId } from "./idfm-itinerary.js";

export class IdfmPlanner implements ItineraryProvider {
  private cache = new Map<string, { until: number; value?: unknown; error?: PlannerError }>();
  private pending = new Map<string, Promise<unknown>>();
  private cooldown?: { until: number; error: PlannerError };
  constructor(private fetcher: typeof fetch = fetch, private now = Date.now,
    private key: () => string | undefined = () => process.env.IDFM_PRIM_API_KEY) {}

  private async request(path: string, params: URLSearchParams, ttl: number, fresh = false): Promise<unknown> {
    if (!this.key()) throw new PlannerError("not_configured");
    if (this.cooldown && this.cooldown.until > this.now()) throw this.cooldown.error;
    const cacheKey = `${path}?${params}`, hit = this.cache.get(cacheKey);
    if (hit && hit.until > this.now() && (!fresh || hit.error)) {
      if (hit.error) throw hit.error;
      return hit.value;
    }
    const pending = this.pending.get(cacheKey); if (pending) return pending;
    if (this.pending.size >= 6) throw new PlannerError("busy");
    const work = (async () => {
      try {
        const response = await this.fetcher(`https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia/${path}?${params}`, {
          headers: { apikey: this.key()!, accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(8000),
        });
        if (!response.ok && ![400, 404].includes(response.status)) {
          await response.body?.cancel();
          throw new PlannerError([401, 403].includes(response.status) ? "access" : response.status === 429 ? "quota" : "unavailable");
        }
        if (Number(response.headers.get("content-length")) > 4 * 1024 * 1024) {
          await response.body?.cancel(); throw new PlannerError("invalid");
        }
        const reader = response.body?.getReader(); if (!reader) throw new PlannerError("invalid");
        const chunks: Uint8Array[] = []; let size = 0;
        try {
          while (true) {
            const part = await reader.read(); if (part.done) break;
            size += part.value.length; if (size > 4 * 1024 * 1024) throw new PlannerError("invalid");
            chunks.push(part.value);
          }
        } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
        let body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (obj(body).error) {
          const code = text(obj(obj(body).error).id);
          if (code === "no_solution" && path === "journeys") body = { journeys: [] };
          else throw new PlannerError(/date|production/.test(code) ? "date" : "invalid");
        } else if (!response.ok) {
          throw new PlannerError("unavailable");
        }
        if (this.cache.size >= 100) this.cache.delete(this.cache.keys().next().value!);
        this.cache.set(cacheKey, { until: this.now() + ttl, value: body });
        return body;
      } catch (error) {
        // Never include fetch errors, query strings, headers or credentials in a log/error.
        const safe = error instanceof PlannerError ? error : new PlannerError("unavailable");
        if (["access", "quota", "unavailable"].includes(safe.code)) this.cooldown = { until: this.now() + 15000, error: safe };
        if (this.cache.size >= 100) this.cache.delete(this.cache.keys().next().value!);
        this.cache.set(cacheKey, { until: this.now() + 15000, error: safe });
        throw safe;
      }
    })().finally(() => this.pending.delete(cacheKey));
    this.pending.set(cacheKey, work); return work;
  }

  async places(query: string, fresh = false) {
    if (!query.trim() || query.length > 140) throw new PlannerError("invalid");
    return parsePlaces(await this.request("places", new URLSearchParams({
      q: query, "type[]": "stop_area", count: "10", depth: "2",
    }), 30 * 60_000, fresh));
  }

  async journeys(from: OfficialPlace, to: OfficialPlace, at: number, represents: "arrival" | "departure", fresh = false) {
    if (![from, to].every(p => idfmId(p.id) && p.id.startsWith("stop_area:")) || !Number.isFinite(at))
      throw new PlannerError("invalid");
    const body = await this.request("journeys", new URLSearchParams({
      from: from.id, to: to.id, datetime: plannerDate(at), datetime_represents: represents,
      data_freshness: "realtime", count: "2", depth: "2",
      "first_section_mode[]": "walking", "last_section_mode[]": "walking",
    }), 15000, fresh);
    return parseItineraries(body, from, to, at, represents);
  }

  async stations(code: string, fresh = false) {
    if (!/^\d{1,2}(?:bis)?$/.test(code)) throw new PlannerError("invalid");
    const root = obj(await this.request("lines", new URLSearchParams({
      filter: `line.code="${code}" and physical_mode.id="physical_mode:Metro"`, count: "100", depth: "1",
    }), 30 * 60_000, fresh));
    const lines = list(root.lines).map(obj).filter(l => l.code === code &&
      list(l.physical_modes).some(m => text(obj(m).id) === "physical_mode:Metro"));
    if (Number(obj(root.pagination).total_result) > 100 || lines.length !== 1 ||
      !/^line:IDFM:[\w:-]+$/.test(text(lines[0]!.id))) throw new PlannerError("invalid");
    const line = lines[0]!, ids = new Set<string>();
    let complete = false, received = 0, expected: number | undefined;
    for (let page = 0; page < 6; page++) {
      const data = obj(await this.request(`lines/${encodeURIComponent(text(line.id))}/stop_areas`,
        new URLSearchParams({ count: "100", start_page: String(page), depth: "0" }), 30 * 60_000, fresh));
      if (!Array.isArray(data.stop_areas)) throw new PlannerError("invalid");
      received += data.stop_areas.length;
      for (const p of data.stop_areas.map(obj)) {
        if (!idfmId(text(p.id)) || !text(p.id).startsWith("stop_area:")) throw new PlannerError("invalid");
        ids.add(text(p.id));
      }
      const total = Number(obj(data.pagination).total_result);
      if (Number.isFinite(total)) {
        if (!Number.isInteger(total) || total < 0 || total > 600 || expected != null && total !== expected)
          throw new PlannerError("invalid");
        expected = total;
      }
      if (Number.isFinite(total) ? (page + 1) * 100 >= total : data.stop_areas.length < 100) { complete = true; break; }
    }
    if (!complete || !ids.size || expected != null && expected !== received) throw new PlannerError("invalid");
    return { line: display(line.code), count: ids.size };
  }
}
