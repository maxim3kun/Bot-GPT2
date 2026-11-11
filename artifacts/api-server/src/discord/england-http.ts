import { TransportDataError } from "./transport-data-error.js";

/** Public provider requests only. Never retain or log authenticated URLs/errors. */
export class EnglandHttp {
  private requests: number[] = [];
  private blockedUntil = 0;
  constructor(readonly provider: "tfl" | "bods" | "nptg", private fetcher: typeof fetch = fetch,
    private now = Date.now, private key: () => string | undefined = () =>
      provider === "tfl" ? process.env.TFL_API_KEY : provider === "bods" ? process.env.BODS_API_KEY : undefined) {}

  async response(path: string, maximum = 8 * 1024 * 1024) {
    const host = this.provider === "tfl" ? "api.tfl.gov.uk" : this.provider === "bods"
      ? "data.bus-data.dft.gov.uk" : "naptan.api.dft.gov.uk";
    const url = new URL(path, `https://${host}`);
    if (url.protocol !== "https:" || url.hostname !== host || url.username || url.password)
      throw new TransportDataError("Adresse du fournisseur anglais refusée.");
    const now = this.now();
    this.requests = this.requests.filter(t => now - t < 24 * 3600_000);
    if (now < this.blockedUntil || this.requests.filter(t => now - t < 60_000).length >= 30 ||
      this.provider === "tfl" && this.requests.length >= 400)
      throw new TransportDataError("Limite de requêtes de la source anglaise atteinte. Réessaie plus tard.");
    if (this.provider !== "nptg") {
      const key = this.key()?.trim();
      if (!key) throw new TransportDataError(`Accès ${this.provider.toUpperCase()} indisponible : clé non configurée.`);
      url.searchParams.set(this.provider === "tfl" ? "app_key" : "api_key", key);
    }
    this.requests.push(now);
    let response: Response;
    try {
      response = await this.fetcher(url.href, { signal: AbortSignal.timeout(25_000), redirect: "error",
        headers: { Accept: "application/json, application/xml, text/csv, application/zip" } });
    } catch { throw new TransportDataError(`La source ${this.provider.toUpperCase()} n’a pas répondu. Aucun résultat n’est confirmé.`); }
    if (!response.ok) {
      const text = new TextDecoder().decode(await this.bytes(response, 4096).catch(() => new Uint8Array()));
      // Some TfL authentication failures misleadingly use HTTP 429.
      if ([401, 403].includes(response.status) || /invalid app_key/i.test(text))
        throw new TransportDataError(`La source ${this.provider.toUpperCase()} refuse sa clé d’accès.`);
      if (response.status === 429) this.blockedUntil = now + 60_000;
      throw new TransportDataError(`Source ${this.provider.toUpperCase()} indisponible (HTTP ${response.status}). Cela ne signifie pas qu’aucune ligne n’existe.`);
    }
    if (Number(response.headers.get("content-length")) > maximum) {
      await response.body?.cancel();
      throw new TransportDataError("Le fichier anglais dépasse la taille prise en charge pour cette recherche.");
    }
    return response;
  }

  async bytes(response: Response, maximum: number): Promise<Uint8Array> {
    const reader = response.body?.getReader();
    if (!reader) throw new TransportDataError("Réponse vide du fournisseur anglais.");
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        size += value.length;
        if (size > maximum) throw new TransportDataError("Données anglaises trop volumineuses pour cette recherche.");
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => undefined); }
    const result = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
    return result;
  }

  async json<T>(path: string): Promise<T> {
    const response = await this.response(path);
    try { return JSON.parse(new TextDecoder().decode(await this.bytes(response, 8 * 1024 * 1024))) as T; }
    catch (error) {
      if (error instanceof TransportDataError) throw error;
      throw new TransportDataError(`Réponse ${this.provider.toUpperCase()} illisible. Aucun résultat n’est confirmé.`);
    }
  }
}
