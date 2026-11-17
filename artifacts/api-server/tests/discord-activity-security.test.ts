import assert from "node:assert/strict";
import test from "node:test";
import {
  discordActivityGuildKey,
  discordActivityMemberKey,
  issueDiscordActivityToken,
  verifyDiscordActivityToken,
} from "../src/discord/discord-activity-security.js";
import {
  configuredDiscordActivityOAuthClients,
  DiscordActivityOAuthError,
  exchangeDiscordActivityCode,
  resolveDiscordActivityOAuthClient,
} from "../src/discord/discord-activity-oauth.js";
import {
  createPrivateActivityStoryService,
  type PrivateActivityStoryRepository,
} from "../src/discord/discord-activity-store.js";
import type { DiscordActivityStoryDoc } from "../src/lib/db.js";

const SECRET = "test-session-signing-secret";
const GUILD_A = "123456789012345678";
const GUILD_B = "223456789012345678";
const USER_A = "323456789012345678";
const USER_B = "423456789012345678";
const NOW = 1_800_000_000_000;

test("Activity OAuth accepts only complete, exact per-application credential pairs", () => {
  const environment = {
    DISCORD_ACTIVITY_CLIENT_ID: "first-app",
    DISCORD_ACTIVITY_CLIENT_SECRET: "first-secret",
    DISCORD_ACTIVITY_CLIENT_ID_2: "second-app",
    DISCORD_ACTIVITY_CLIENT_SECRET_2: "second-secret",
  };
  assert.deepEqual(
    configuredDiscordActivityOAuthClients(environment).map((client) => client.clientId),
    ["first-app", "second-app"],
  );
  assert.deepEqual(resolveDiscordActivityOAuthClient("first-app", environment), {
    clientId: "first-app",
    clientSecret: "first-secret",
  });
  assert.deepEqual(resolveDiscordActivityOAuthClient("second-app", environment), {
    clientId: "second-app",
    clientSecret: "second-secret",
  });
  assert.equal(resolveDiscordActivityOAuthClient("unlisted-app", environment), null);
  assert.equal(
    resolveDiscordActivityOAuthClient("second-app", {
      ...environment,
      DISCORD_ACTIVITY_CLIENT_SECRET_2: "",
    }),
    null,
  );
});

test("activity tokens are short-lived, signed and isolated from dashboard JWT audiences", () => {
  const token = issueDiscordActivityToken(
    { sub: USER_A, guildId: GUILD_A, activitySessionId: "123e4567-e89b-12d3-a456-426614174000" },
    SECRET,
    NOW,
  );
  assert.equal(verifyDiscordActivityToken(token, SECRET, NOW)?.sub, USER_A);
  assert.equal(verifyDiscordActivityToken(token, "different-secret", NOW), null);
  assert.equal(verifyDiscordActivityToken(token, SECRET, NOW + 11 * 60_000), null);
  const tampered = token.replace(/.$/, token.endsWith("a") ? "b" : "a");
  assert.equal(verifyDiscordActivityToken(tampered, SECRET, NOW), null);
});

test("database keys do not store raw server or member ids and are scoped per server", () => {
  const keyA = discordActivityMemberKey(GUILD_A, USER_A);
  assert.equal(keyA.length, 64);
  assert.equal(discordActivityMemberKey(GUILD_A, USER_A), keyA);
  assert.notEqual(discordActivityMemberKey(GUILD_A, USER_A), discordActivityMemberKey(GUILD_A, USER_B));
  assert.notEqual(discordActivityMemberKey(GUILD_A, USER_A), discordActivityMemberKey(GUILD_B, USER_A));
  assert.notEqual(discordActivityGuildKey(GUILD_A), GUILD_A);
  assert.notEqual(discordActivityGuildKey(GUILD_A), discordActivityGuildKey(GUILD_B));
});

test("Discord OAuth code is exchanged server-side and the requested guild membership is verified", async () => {
  const requests: { url: string; body?: URLSearchParams; authorization?: string }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    const body = init?.body instanceof URLSearchParams
      ? init.body
      : typeof init?.body === "string" ? new URLSearchParams(init.body) : undefined;
    requests.push({ url, body, authorization: headers.get("authorization") ?? undefined });
    if (url.endsWith("/oauth2/token")) {
      return new Response(JSON.stringify({ access_token: "short-lived-discord-user-token" }), { status: 200 });
    }
    if (url.endsWith("/users/@me")) {
      return new Response(JSON.stringify({ id: USER_A, username: "member", global_name: "Member" }), { status: 200 });
    }
    return new Response(JSON.stringify([{ id: GUILD_A }]), { status: 200 });
  };
  const result = await exchangeDiscordActivityCode(
    { code: "one-time-discord-code", codeVerifier: "a".repeat(43), guildId: GUILD_A, clientId: "activity-app" },
    { clientId: "activity-app", clientSecret: "server-only-secret" },
    fetcher,
  );
  assert.equal(result.userId, USER_A);
  assert.equal(result.displayName, "Member");
  assert.equal(result.discordAccessToken, "short-lived-discord-user-token");
  assert.equal(requests.length, 3);
  assert.equal(requests[0]?.body?.get("client_secret"), "server-only-secret");
  assert.equal(requests[0]?.body?.get("code_verifier"), "a".repeat(43));
  assert.ok(requests.slice(1).every((request) => request.authorization === "Bearer short-lived-discord-user-token"));
});

test("a non-member cannot establish an Activity session for the supplied guild", async () => {
  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/oauth2/token")) return new Response(JSON.stringify({ access_token: "short-lived-discord-user-token" }), { status: 200 });
    if (url.endsWith("/users/@me")) return new Response(JSON.stringify({ id: USER_A, username: "member" }), { status: 200 });
    return new Response(JSON.stringify([{ id: GUILD_B }]), { status: 200 });
  };
  await assert.rejects(
    exchangeDiscordActivityCode(
      { code: "one-time-discord-code", codeVerifier: "a".repeat(43), guildId: GUILD_A, clientId: "activity-app" },
      { clientId: "activity-app", clientSecret: "server-only-secret" },
      fetcher,
    ),
    (error: unknown) => error instanceof DiscordActivityOAuthError && error.code === "not_a_member",
  );
});

test("private stories require explicit consent, stay member-specific, and can be erased", async () => {
  const records = new Map<string, DiscordActivityStoryDoc>();
  const repository: PrivateActivityStoryRepository = {
    async findById(id) {
      return records.get(id) ?? null;
    },
    async acceptConsent(id, now) {
      const prior = records.get(id);
      records.set(id, {
        _id: id,
        consentAccepted: true,
        consentAcceptedAt: now,
        ...(prior?.encryptedStory ? { encryptedStory: prior.encryptedStory } : {}),
        updatedAt: now,
      });
    },
    async withdrawConsent(id) {
      records.delete(id);
    },
    async saveEncryptedStoryIfConsented(id, encryptedStory, now) {
      const prior = records.get(id);
      if (!prior?.consentAccepted) return false;
      records.set(id, { ...prior, encryptedStory, updatedAt: now });
      return true;
    },
    async deleteStoryIfConsented(id, now) {
      const prior = records.get(id);
      if (!prior?.consentAccepted) return false;
      const { encryptedStory: _removed, ...rest } = prior;
      records.set(id, { ...rest, updatedAt: now });
      return true;
    },
  };
  const service = createPrivateActivityStoryService(
    repository,
    { encrypt: (value) => `encrypted:${value}`, decrypt: (value) => value.replace(/^encrypted:/, "") },
    () => true,
  );

  assert.equal((await service.get(GUILD_A, USER_A)).consentAccepted, false);
  assert.equal(await service.save(GUILD_A, USER_A, "local only"), false);
  assert.equal(records.size, 0);

  await service.setConsent(GUILD_A, USER_A, true, new Date(NOW));
  assert.equal(await service.save(GUILD_A, USER_A, "private to A", new Date(NOW + 1)), true);
  await service.setConsent(GUILD_A, USER_B, true, new Date(NOW));
  await service.save(GUILD_A, USER_B, "private to B", new Date(NOW + 1));
  await service.setConsent(GUILD_B, USER_A, true, new Date(NOW));
  await service.save(GUILD_B, USER_A, "private to another server", new Date(NOW + 1));

  assert.equal((await service.get(GUILD_A, USER_A)).story, "private to A");
  assert.equal((await service.get(GUILD_A, USER_B)).story, "private to B");
  assert.equal((await service.get(GUILD_B, USER_A)).story, "private to another server");
  assert.ok([...records.values()].every((record) => record.encryptedStory?.startsWith("encrypted:")));

  assert.equal(await service.delete(GUILD_A, USER_A, new Date(NOW + 2)), true);
  assert.equal((await service.get(GUILD_A, USER_A)).consentAccepted, true);
  assert.equal((await service.get(GUILD_A, USER_A)).story, "");
  await service.setConsent(GUILD_A, USER_A, false);
  assert.equal((await service.get(GUILD_A, USER_A)).consentAccepted, false);
  assert.equal(records.has(discordActivityMemberKey(GUILD_A, USER_A)), false);
});

