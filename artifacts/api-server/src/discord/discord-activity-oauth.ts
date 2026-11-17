import { isDiscordSnowflake } from "./discord-activity-security.js";

export interface DiscordActivityOAuthConfig {
  clientId: string;
  clientSecret: string;
}

export type DiscordActivityOAuthEnvironment = Partial<Pick<
  NodeJS.ProcessEnv,
  | "DISCORD_ACTIVITY_CLIENT_ID"
  | "DISCORD_ACTIVITY_CLIENT_SECRET"
  | "DISCORD_CLIENT_ID"
  | "DISCORD_CLIENT_SECRET"
  | "VITE_DISCORD_CLIENT_ID"
  | "DISCORD_ACTIVITY_CLIENT_ID_2"
  | "DISCORD_ACTIVITY_CLIENT_SECRET_2"
>>;

export function configuredDiscordActivityOAuthClients(
  environment: DiscordActivityOAuthEnvironment = process.env,
): DiscordActivityOAuthConfig[] {
  const primaryClientId = environment.DISCORD_ACTIVITY_CLIENT_ID?.trim()
    || environment.DISCORD_CLIENT_ID?.trim()
    || environment.VITE_DISCORD_CLIENT_ID?.trim()
    || "";
  const primaryClientSecret = environment.DISCORD_ACTIVITY_CLIENT_SECRET?.trim()
    || environment.DISCORD_CLIENT_SECRET?.trim()
    || "";
  const secondaryClientId = environment.DISCORD_ACTIVITY_CLIENT_ID_2?.trim() || "";
  const secondaryClientSecret = environment.DISCORD_ACTIVITY_CLIENT_SECRET_2?.trim() || "";

  return [
    { clientId: primaryClientId, clientSecret: primaryClientSecret },
    { clientId: secondaryClientId, clientSecret: secondaryClientSecret },
  ].filter((client) => client.clientId && client.clientSecret);
}

export function resolveDiscordActivityOAuthClient(
  clientId: string,
  environment: DiscordActivityOAuthEnvironment = process.env,
): DiscordActivityOAuthConfig | null {
  if (!clientId) return null;
  return configuredDiscordActivityOAuthClients(environment)
    .find((client) => client.clientId === clientId) ?? null;
}

export interface DiscordActivityOAuthIdentity {
  userId: string;
  username: string;
  displayName: string;
  discordAccessToken: string;
}

export class DiscordActivityOAuthError extends Error {
  constructor(
    readonly code:
      | "provider_unavailable"
      | "invalid_code"
      | "invalid_identity"
      | "not_a_member"
      | "invalid_configuration",
  ) {
    super(code);
    this.name = "DiscordActivityOAuthError";
  }
}

type DiscordFetch = typeof fetch;

async function jsonOrThrow<T>(response: Response, failureCode: DiscordActivityOAuthError["code"]): Promise<T> {
  if (!response.ok) throw new DiscordActivityOAuthError(failureCode);
  try {
    return await response.json() as T;
  } catch {
    throw new DiscordActivityOAuthError(failureCode);
  }
}

export async function exchangeDiscordActivityCode(
  input: {
    code: string;
    codeVerifier: string;
    guildId: string;
    clientId: string;
  },
  config: DiscordActivityOAuthConfig,
  fetcher: DiscordFetch = fetch,
): Promise<DiscordActivityOAuthIdentity> {
  if (
    !config.clientId
    || !config.clientSecret
    || input.clientId !== config.clientId
    || !isDiscordSnowflake(input.guildId)
    || input.code.length < 8
    || input.code.length > 2048
    || !/^[A-Za-z0-9._~-]{43,128}$/.test(input.codeVerifier)
  ) {
    throw new DiscordActivityOAuthError("invalid_configuration");
  }

  let tokenResponse: Response;
  try {
    tokenResponse = await fetcher("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: "authorization_code",
        code: input.code,
        code_verifier: input.codeVerifier,
      }),
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new DiscordActivityOAuthError("provider_unavailable");
  }
  const tokenData = await jsonOrThrow<{ access_token?: unknown }>(tokenResponse, "invalid_code");
  if (typeof tokenData.access_token !== "string" || tokenData.access_token.length < 10) {
    throw new DiscordActivityOAuthError("invalid_code");
  }
  const accessToken = tokenData.access_token;

  let userResponse: Response;
  let guildsResponse: Response;
  try {
    [userResponse, guildsResponse] = await Promise.all([
      fetcher("https://discord.com/api/users/@me", {
        headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
        signal: AbortSignal.timeout(12_000),
      }),
      fetcher("https://discord.com/api/users/@me/guilds?limit=200", {
        headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
        signal: AbortSignal.timeout(12_000),
      }),
    ]);
  } catch {
    throw new DiscordActivityOAuthError("provider_unavailable");
  }
  const [user, guilds] = await Promise.all([
    jsonOrThrow<{ id?: unknown; username?: unknown; global_name?: unknown }>(userResponse, "invalid_identity"),
    jsonOrThrow<Array<{ id?: unknown }>>(guildsResponse, "invalid_identity"),
  ]);
  if (
    !isDiscordSnowflake(user.id)
    || typeof user.username !== "string"
    || !Array.isArray(guilds)
    || !guilds.some((guild) => guild.id === input.guildId)
  ) {
    throw new DiscordActivityOAuthError(
      isDiscordSnowflake(user.id) && Array.isArray(guilds) && !guilds.some((guild) => guild.id === input.guildId)
        ? "not_a_member"
        : "invalid_identity",
    );
  }

  const displayName = typeof user.global_name === "string" && user.global_name.trim()
    ? user.global_name.trim().slice(0, 80)
    : user.username.trim().slice(0, 80);
  return {
    userId: user.id,
    username: user.username.trim().slice(0, 80),
    displayName,
    discordAccessToken: accessToken,
  };
}

