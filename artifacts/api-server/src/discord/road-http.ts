import { PlannerError } from "./transport-planner-types.js";

/** Fixed IGN origin, no redirects/credentials, bounded body and concurrent queue. */
export class RoadHttp {
  private tail: Promise<unknown> = Promise.resolve();
  private waiting = 0;
  private next = 0;
  private cache = new Map<string, { expires: number; data: unknown; bytes: number }>();
  private cacheBytes = 0;
  constructor(private fetcher: typeof fetch = fetch, private now = Date.now) {}
  async json(path: "/geocodage/search" | "/navigation/itineraire", params: Record<string, string>, fresh = false): Promise<unknown> {
    const url = new URL(path, "https://data.geopf.fr");
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const key = url.href, cached = this.cache.get(key);
    if (!fresh && cached && cached.expires > this.now()) return cached.data;
    if (this.waiting >= 12) throw new PlannerError("busy");
    this.waiting++;
    const deadline = Date.now() + 15_000;
    const work = this.tail.catch(() => undefined).then(async () => {
      if (Date.now() >= deadline) throw new PlannerError("busy");
      const previous = this.cache.get(key);
      if (!fresh && previous && previous.expires > this.now()) return previous.data;
      // Global per client, below the published five route requests/second/IP.
      const delay = this.next - Date.now();
      if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
      if (Date.now() >= deadline) throw new PlannerError("busy");
      this.next = Date.now() + 260;
      try {
        const response = await this.fetcher(url, { redirect: "error",
          headers: { accept: "application/json", "user-agent": "MaximeGPT-public-road/1.0" },
          signal: AbortSignal.timeout(Math.min(12_000, Math.max(1, deadline - Date.now()))) });
        const fail = response.status === 429 ? "quota" : response.status === 404 || response.status === 400 ? "date" : "unavailable";
        if (!response.ok) { await response.body?.cancel(); throw new PlannerError(fail); }
        const limit = path === "/geocodage/search" ? 300_000 : 3_000_000;
        if (Number(response.headers.get("content-length")) > limit) { await response.body?.cancel(); throw new PlannerError("invalid"); }
        const reader = response.body?.getReader();
        if (!reader) throw new PlannerError("invalid");
        const chunks: Uint8Array[] = []; let size = 0;
        try {
          for (;;) {
            const chunk = await reader.read(); if (chunk.done) break;
            size += chunk.value.length;
            if (size > limit) throw new PlannerError("invalid");
            chunks.push(chunk.value);
          }
        } catch (error) { await reader.cancel().catch(() => undefined); throw error; }
        finally { reader.releaseLock(); }
        const data: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        const drop = (k: string) => { this.cacheBytes -= this.cache.get(k)?.bytes ?? 0; this.cache.delete(k); };
        for (const [k, value] of this.cache) if (value.expires <= this.now()) drop(k);
        drop(key);
        while (this.cache.size && (this.cache.size >= 150 || this.cacheBytes + size > 12_000_000))
          drop(this.cache.keys().next().value!);
        this.cache.set(key, { data, expires: this.now() + 5 * 60_000, bytes: size }); this.cacheBytes += size;
        return data;
      } catch (error) {
        if (error instanceof PlannerError) throw error;
        throw new PlannerError("unavailable");
      }
    });
    this.tail = work;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { return await Promise.race([work, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new PlannerError("busy")), 15_000);
    })]); } finally { if (timer) clearTimeout(timer); this.waiting--; }
  }
}
