import { randomBytes } from "node:crypto";
import type { CivicFetch } from "./civic-data.js";

const AUTHORIZATION_ENDPOINT = "https://oauth.piste.gouv.fr/api/oauth/authorize";
const TOKEN_ENDPOINT = "https://oauth.piste.gouv.fr/api/oauth/token";
const CALLBACK_PATH = "/api/civic/legifrance/callback";
const STATE_TTL_MS = 10 * 60 * 1_000;

export interface PendingLegifranceAuthorization {
  userId: string;
  redirectUri: string;
  expiresAt: number;
}

export interface LegifranceOAuthCredentials {
  clientId: string;
  clientSecret: string;
}

export interface LegifranceOAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class LegifranceOAuthError extends Error {}

const pendingAuthorizations = new Map<string, PendingLegifranceAuthorization>();

export function getLegifranceRedirectUri(): string {
  const configured = process.env.LEGIFRANCE_REDIRECT_URI?.trim();
  const domain = process.env.REPLIT_DEV_DOMAIN?.trim() || process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  const candidate = configured || (domain
    ? `${domain.includes("://") ? domain : `https://${domain}`}${CALLBACK_PATH}`
    : "");
  if (!candidate) throw new LegifranceOAuthError("The public PISTE callback URL is not configured.");

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new LegifranceOAuthError("The PISTE callback URL is invalid.");
  }
  if (
    parsed.protocol !== "https:"
    || parsed.username
    || parsed.password
    || parsed.pathname !== CALLBACK_PATH
    || parsed.search
    || parsed.hash
  ) {
    throw new LegifranceOAuthError("The PISTE callback URL must be HTTPS and use the civic callback path.");
  }
  return parsed.toString();
}

function pruneExpiredStates(now: number): void {
  for (const [state, pending] of pendingAuthorizations) {
    if (pending.expiresAt <= now) pendingAuthorizations.delete(state);
  }
  while (pendingAuthorizations.size > 100) {
    const oldest = pendingAuthorizations.keys().next().value as string | undefined;
    if (!oldest) break;
    pendingAuthorizations.delete(oldest);
  }
}

export function createLegifranceAuthorization(
  userId: string,
  clientId: string,
  now = Date.now(),
): { authorizationUrl: string; redirectUri: string } {
  const redirectUri = getLegifranceRedirectUri();
  pruneExpiredStates(now);
  const state = randomBytes(32).toString("base64url");
  pendingAuthorizations.set(state, { userId, redirectUri, expiresAt: now + STATE_TTL_MS });

  const authorizationUrl = new URL(AUTHORIZATION_ENDPOINT);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("scope", "openid");
  authorizationUrl.searchParams.set("state", state);
  return { authorizationUrl: authorizationUrl.toString(), redirectUri };
}

export function consumeLegifranceAuthorizationState(
  state: string,
  now = Date.now(),
): PendingLegifranceAuthorization | undefined {
  const pending = pendingAuthorizations.get(state);
  pendingAuthorizations.delete(state);
  return pending && pending.expiresAt > now ? pending : undefined;
}

export async function exchangeLegifranceAuthorizationCode(
  code: string,
  redirectUri: string,
  credentials: LegifranceOAuthCredentials,
  fetcher: CivicFetch = fetch,
): Promise<LegifranceOAuthTokens> {
  let response: Response;
  try {
    response = await fetcher(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      }),
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new LegifranceOAuthError("The PISTE token endpoint could not be reached.");
  }
  if (!response.ok) throw new LegifranceOAuthError(`The PISTE token endpoint returned HTTP ${response.status}.`);
  let body: { access_token?: unknown; refresh_token?: unknown };
  try {
    body = await response.json() as typeof body;
  } catch {
    throw new LegifranceOAuthError("The PISTE token response was not valid JSON.");
  }
  if (typeof body.access_token !== "string" || !body.access_token) {
    throw new LegifranceOAuthError("The PISTE response did not include an access token.");
  }
  if (typeof body.refresh_token !== "string" || !body.refresh_token) {
    throw new LegifranceOAuthError("The PISTE response did not include a refresh token.");
  }
  return { accessToken: body.access_token, refreshToken: body.refresh_token };
}

export function resetLegifranceOAuthStateForTests(): void {
  pendingAuthorizations.clear();
}
