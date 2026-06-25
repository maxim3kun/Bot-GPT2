import { randomBytes } from "crypto";
import type { JwtRole } from "./jwt.js";

// ── In-memory 2FA session store ───────────────────────────────────────────────

interface AuthSession {
  discordId: string;
  code: string;
  role: JwtRole;
  guilds?: string[];
  expiresAt: number; // ms
}

const sessions = new Map<string, AuthSession>();

// Clean up expired sessions every minute
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (s.expiresAt < now) sessions.delete(id);
  }
}, 60_000);

export function createAuthSession(
  discordId: string,
  role: JwtRole,
  guilds?: string[],
): { state: string; code: string } {
  const state = randomBytes(16).toString("hex");
  const code  = String(Math.floor(100_000 + Math.random() * 900_000));
  sessions.set(state, {
    discordId,
    code,
    role,
    guilds,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 min
  });
  return { state, code };
}

export function consumeAuthSession(
  state: string,
  code: string,
): AuthSession | null {
  const session = sessions.get(state);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(state);
    return null;
  }
  if (session.code !== code) return null;
  sessions.delete(state);
  return session;
}

// ── Rate limiter (per IP) ─────────────────────────────────────────────────────

interface RateEntry { count: number; resetAt: number }
const rateMap = new Map<string, RateEntry>();
const RATE_WINDOW = 15 * 60 * 1000; // 15 min
const RATE_LIMIT  = 10;

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  let entry = rateMap.get(ip);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + RATE_WINDOW };
    rateMap.set(ip, entry);
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}
