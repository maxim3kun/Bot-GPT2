export type PublicLiveMessage = {
  role: "user" | "assistant";
  content: string;
};

type PublicLiveSession = {
  messages: PublicLiveMessage[];
  expiresAt: number;
};

export class AnonymousLiveSessionStore {
  private readonly sessions = new Map<string, PublicLiveSession>();

  constructor(
    private readonly ttlMs = 15 * 60_000,
    private readonly maxSessions = 2_000,
    private readonly maxMessages = 8,
  ) {}

  getMessages(sessionId: string, now = Date.now()): PublicLiveMessage[] {
    this.evictExpired(now);
    const session = this.sessions.get(sessionId);
    if (!session || session.expiresAt <= now) {
      this.sessions.delete(sessionId);
      return [];
    }
    this.sessions.delete(sessionId);
    session.expiresAt = now + this.ttlMs;
    this.sessions.set(sessionId, session);
    return session.messages.map((message) => ({ ...message }));
  }

  getLatestAssistantMessage(sessionId: string, now = Date.now()): string | null {
    const messages = this.getMessages(sessionId, now);
    return messages.at(-1)?.role === "assistant" ? messages.at(-1)?.content ?? null : null;
  }

  appendTurn(
    sessionId: string,
    userText: string,
    assistantText: string,
    now = Date.now(),
  ): void {
    this.evictExpired(now);
    const messages = this.getMessages(sessionId, now);
    messages.push(
      { role: "user", content: userText },
      { role: "assistant", content: assistantText },
    );
    const session: PublicLiveSession = {
      messages: messages.slice(-this.maxMessages),
      expiresAt: now + this.ttlMs,
    };
    this.sessions.delete(sessionId);
    this.sessions.set(sessionId, session);
    while (this.sessions.size > this.maxSessions) {
      const oldest = this.sessions.keys().next().value as string | undefined;
      if (!oldest) break;
      this.sessions.delete(oldest);
    }
  }

  clear(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  get size(): number {
    return this.sessions.size;
  }

  private evictExpired(now: number): void {
    for (const [sessionId, session] of this.sessions) {
      if (session.expiresAt <= now) this.sessions.delete(sessionId);
    }
  }
}

type RequestWindow = { count: number; resetsAt: number };

export class AnonymousLiveRateLimiter {
  private readonly windows = new Map<string, RequestWindow>();
  private globalWindow: RequestWindow = { count: 0, resetsAt: 0 };

  constructor(
    private readonly perSessionLimit = 5,
    private readonly globalLimit = 120,
    private readonly windowMs = 60_000,
    private readonly maxTrackedSessions = 5_000,
  ) {}

  allow(sessionId: string, now = Date.now()): boolean {
    if (this.globalWindow.resetsAt <= now) {
      this.globalWindow = { count: 0, resetsAt: now + this.windowMs };
    }
    const current = this.windows.get(sessionId);
    if (!current || current.resetsAt <= now) {
      this.windows.set(sessionId, { count: 1, resetsAt: now + this.windowMs });
      this.globalWindow.count += 1;
      this.cleanup(now);
      return this.globalWindow.count <= this.globalLimit;
    }
    current.count += 1;
    this.globalWindow.count += 1;
    this.cleanup(now);
    return current.count <= this.perSessionLimit && this.globalWindow.count <= this.globalLimit;
  }

  private cleanup(now: number): void {
    if (this.windows.size > this.maxTrackedSessions) {
      for (const [sessionId, window] of this.windows) {
        if (window.resetsAt <= now) this.windows.delete(sessionId);
      }
    }
  }
}

export function isPublicLiveSessionId(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
