export interface BotStats {
  guildCount: number;
  startedAt: number;
  botTag: string;
  botAvatarUrl: string | null;
  botId: string;
}

const stats: BotStats = {
  guildCount: 0,
  startedAt: Date.now(),
  botTag: "Bot",
  botAvatarUrl: null,
  botId: "",
};

export function setBotStats(patch: Partial<BotStats>): void {
  Object.assign(stats, patch);
}

export function getBotStats(): Readonly<BotStats> {
  return stats;
}

export function getUptimeSeconds(): number {
  return Math.floor((Date.now() - stats.startedAt) / 1000);
}

// ── Groq API call counter ─────────────────────────────────────────────────────

let _groqCalls = 0;

export function incrementGroqCalls(): void { _groqCalls++; }
export function getGroqCallCount(): number { return _groqCalls; }
