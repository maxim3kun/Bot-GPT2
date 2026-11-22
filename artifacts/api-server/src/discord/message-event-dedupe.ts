/** Claims each Discord message event once per process, with bounded memory. */
export class MessageEventDeduper {
  private readonly seen = new Map<string, number>();

  constructor(private readonly ttlMs = 5 * 60_000, private readonly maxEntries = 10_000) {}

  claim(messageId: string, now = Date.now()): boolean {
    for (const [id, expiresAt] of this.seen) {
      if (expiresAt > now) break;
      this.seen.delete(id);
    }
    const existingExpiry = this.seen.get(messageId);
    if (existingExpiry !== undefined && existingExpiry > now) return false;
    this.seen.delete(messageId);
    while (this.seen.size >= this.maxEntries) this.seen.delete(this.seen.keys().next().value!);
    this.seen.set(messageId, now + this.ttlMs);
    return true;
  }
}
