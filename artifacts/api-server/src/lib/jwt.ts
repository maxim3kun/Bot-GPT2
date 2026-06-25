import { createHmac } from "crypto";

const SECRET = process.env["SESSION_SECRET"];
if (!SECRET) {
  throw new Error("SESSION_SECRET env var is required but not set. Set it before starting the server.");
}

export type JwtRole = "admin" | "guild";

export interface JwtPayload {
  sub: string;         // "admin" or Discord user ID
  role: JwtRole;
  guilds?: string[];   // accessible guild IDs (guild role only)
  iat: number;
  exp: number;
}

function b64url(str: string): string {
  return Buffer.from(str).toString("base64url");
}

function hmacSign(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("base64url");
}

export function signJwt(payload: Omit<JwtPayload, "iat" | "exp">, ttlSeconds = 86400): string {
  const now = Math.floor(Date.now() / 1000);
  const full: JwtPayload = { ...payload, iat: now, exp: now + ttlSeconds };
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body   = b64url(JSON.stringify(full));
  const sig    = hmacSign(`${header}.${body}`);
  return `${header}.${body}.${sig}`;
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts as [string, string, string];
    const expected = hmacSign(`${header}.${body}`);
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as JwtPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
