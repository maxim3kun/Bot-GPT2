import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export interface DiscordActivityClaims {
  aud: "maximegpt-discord-activity";
  sub: string;
  guildId: string;
  activitySessionId: string;
  iat: number;
  exp: number;
}

const TOKEN_TTL_SECONDS = 10 * 60;
const AUDIENCE = "maximegpt-discord-activity";

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signature(content: string, secret: string): Buffer {
  return createHmac("sha256", secret)
    .update(`discord-activity-v1:${content}`)
    .digest();
}

export function issueDiscordActivityToken(
  input: Omit<DiscordActivityClaims, "aud" | "iat" | "exp">,
  secret: string,
  nowMs = Date.now(),
): string {
  if (!secret) throw new Error("Activity signing secret is not configured.");
  const now = Math.floor(nowMs / 1000);
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({
    ...input,
    aud: AUDIENCE,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  } satisfies DiscordActivityClaims);
  const content = `${header}.${payload}`;
  return `${content}.${signature(content, secret).toString("base64url")}`;
}

export function verifyDiscordActivityToken(
  token: string,
  secret: string,
  nowMs = Date.now(),
): DiscordActivityClaims | null {
  if (!secret || token.length > 4096) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerPart, payloadPart, signaturePart] = parts as [string, string, string];
    const header = JSON.parse(Buffer.from(headerPart, "base64url").toString("utf8")) as { alg?: string; typ?: string };
    if (header.alg !== "HS256" || header.typ !== "JWT") return null;

    const expected = signature(`${headerPart}.${payloadPart}`, secret);
    const actual = Buffer.from(signaturePart, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

    const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as Partial<DiscordActivityClaims>;
    const now = Math.floor(nowMs / 1000);
    if (
      payload.aud !== AUDIENCE
      || typeof payload.sub !== "string"
      || !/^\d{17,20}$/.test(payload.sub)
      || typeof payload.guildId !== "string"
      || !/^\d{17,20}$/.test(payload.guildId)
      || typeof payload.activitySessionId !== "string"
      || !/^[0-9a-f-]{36}$/i.test(payload.activitySessionId)
      || typeof payload.iat !== "number"
      || typeof payload.exp !== "number"
      || payload.iat > now + 30
      || payload.exp <= now
      || payload.exp - payload.iat > TOKEN_TTL_SECONDS
    ) {
      return null;
    }
    return payload as DiscordActivityClaims;
  } catch {
    return null;
  }
}

export function isDiscordSnowflake(value: unknown): value is string {
  return typeof value === "string" && /^\d{17,20}$/.test(value);
}

export function discordActivityGuildKey(guildId: string): string {
  return createHash("sha256")
    .update(`discord-activity:guild:${guildId}`)
    .digest("hex");
}

export function discordActivityMemberKey(guildId: string, userId: string): string {
  return createHash("sha256")
    .update(`${guildId}:${userId}`)
    .digest("hex");
}

