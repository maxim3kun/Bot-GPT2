import { Router, type IRouter, type Request, type Response } from "express";
import { createHash } from "node:crypto";
import { logger } from "../lib/logger.js";
import { isDbReady, isMongoConnected } from "../lib/db.js";
import { getConsent, setConsent } from "../discord/ai-consent.js";
import { answerDiscordActivityTurn } from "../discord/discord-activity-ai.js";
import { clearActivityConversationsForMember } from "../discord/discord-activity-conversations.js";
import {
  getActivityAvatarEvent,
  subscribeToActivityAvatar,
  type ActivityAvatarEvent,
} from "../discord/discord-activity-events.js";
import { synthesizeActivitySpeech } from "../discord/voice.js";
import { getEffectiveLanguage } from "../discord/effective-language.js";
import {
  configuredDiscordActivityOAuthClients,
  DiscordActivityOAuthError,
  exchangeDiscordActivityCode,
  resolveDiscordActivityOAuthClient,
} from "../discord/discord-activity-oauth.js";
import {
  issueDiscordActivityToken,
  isDiscordSnowflake,
  verifyDiscordActivityToken,
  type DiscordActivityClaims,
} from "../discord/discord-activity-security.js";
import {
  deletePrivateActivityStory,
  ensureDiscordActivitySession,
  getPrivateActivityStory,
  isCurrentDiscordActivitySession,
  savePrivateActivityStory,
  setPrivateActivityStoryConsent,
} from "../discord/discord-activity-store.js";

const router: IRouter = Router();
const STORY_MAX_LENGTH = 4_000;
const authRateLimits = new Map<string, { count: number; resetAt: number }>();
const aiRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkAuthRateLimit(ip: string): boolean {
  const now = Date.now();
  const current = authRateLimits.get(ip);
  if (!current || current.resetAt <= now) {
    authRateLimits.set(ip, { count: 1, resetAt: now + 60_000 });
    if (authRateLimits.size > 5_000) {
      for (const [key, entry] of authRateLimits) {
        if (entry.resetAt <= now) authRateLimits.delete(key);
      }
    }
    return true;
  }
  current.count += 1;
  return current.count <= 25;
}

function checkAiRateLimit(guildId: string, userId: string): boolean {
  const key = createHash("sha256").update(`${guildId}:${userId}`).digest("hex");
  const now = Date.now();
  const current = aiRateLimits.get(key);
  if (!current || current.resetAt <= now) {
    aiRateLimits.set(key, { count: 1, resetAt: now + 60_000 });
    if (aiRateLimits.size > 5_000) {
      for (const [entryKey, entry] of aiRateLimits) {
        if (entry.resetAt <= now) aiRateLimits.delete(entryKey);
      }
    }
    return true;
  }
  current.count += 1;
  return current.count <= 12;
}

function getClaims(req: Request): DiscordActivityClaims | null {
  const authorization = req.headers.authorization ?? "";
  if (!authorization.startsWith("Bearer ")) return null;
  const secret = process.env.SESSION_SECRET ?? "";
  return verifyDiscordActivityToken(authorization.slice(7), secret);
}

async function requireCurrentSession(
  req: Request,
  res: Response,
): Promise<DiscordActivityClaims | null> {
  const claims = getClaims(req);
  if (!claims) {
    res.status(401).json({ error: "unauthorized" });
    return null;
  }
  try {
    if (!await isCurrentDiscordActivitySession(claims.guildId, claims.activitySessionId)) {
      res.status(401).json({ error: "activity_session_expired" });
      return null;
    }
  } catch (error) {
    logger.warn({ errorName: error instanceof Error ? error.name : "unknown" }, "Discord Activity session check failed");
    res.status(503).json({ error: "activity_storage_unavailable" });
    return null;
  }
  return claims;
}

function requireStoryStorage(res: Response): boolean {
  if (!isMongoConnected()) {
    res.status(503).json({ error: "activity_storage_unavailable" });
    return false;
  }
  if (!isDbReady()) {
    res.status(503).json({ error: "activity_encryption_unavailable" });
    return false;
  }
  return true;
}

router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  next();
});

// This public status exposes no credentials. The browser still cannot establish
// a session unless the server can exchange Discord codes and encrypt user data.
router.get("/activity/config", (req: Request, res: Response) => {
  const requestedClientId = typeof req.query.clientId === "string" ? req.query.clientId : "";
  const configuredClients = configuredDiscordActivityOAuthClients();
  const checks = {
    discordOAuth: configuredClients.length > 0,
    sessionSigning: Boolean(process.env.SESSION_SECRET),
    mongo: isMongoConnected(),
    encryption: isDbReady(),
  };
  const clientIdMatches = requestedClientId
    ? Boolean(resolveDiscordActivityOAuthClient(requestedClientId))
    : configuredClients.length > 0;
  res.json({
    ready: checks.discordOAuth && checks.sessionSigning && checks.mongo && checks.encryption && clientIdMatches,
    checks,
    clientIdMatches,
  });
});

router.post("/activity/auth", async (req: Request, res: Response) => {
  if (!checkAuthRateLimit(req.ip ?? "unknown")) {
    res.status(429).json({ error: "rate_limited" });
    return;
  }
  if (!isDbReady()) {
    res.status(503).json({ error: isMongoConnected() ? "activity_encryption_unavailable" : "activity_storage_unavailable" });
    return;
  }

  const { code, codeVerifier, guildId, clientId } = req.body as {
    code?: unknown;
    codeVerifier?: unknown;
    guildId?: unknown;
    clientId?: unknown;
  };
  if (
    typeof code !== "string"
    || typeof codeVerifier !== "string"
    || !isDiscordSnowflake(guildId)
    || typeof clientId !== "string"
  ) {
    res.status(400).json({ error: "invalid_activity_authorization" });
    return;
  }

  const oauthClient = resolveDiscordActivityOAuthClient(clientId);
  if (!oauthClient || !process.env.SESSION_SECRET) {
    res.status(503).json({ error: "activity_oauth_not_configured" });
    return;
  }

  try {
    const identity = await exchangeDiscordActivityCode(
      { code, codeVerifier, guildId, clientId },
      oauthClient,
    );
    const session = await ensureDiscordActivitySession(guildId);
    const activityToken = issueDiscordActivityToken(
      { sub: identity.userId, guildId, activitySessionId: session.sessionId },
      process.env.SESSION_SECRET,
    );
    res.json({
      activityToken,
      discordAccessToken: identity.discordAccessToken,
      userId: identity.userId,
      displayName: identity.displayName,
      sessionId: session.sessionId,
      sessionExpiresAt: session.expiresAt,
    });
  } catch (error) {
    if (error instanceof DiscordActivityOAuthError) {
      const status = error.code === "not_a_member" ? 403
        : error.code === "provider_unavailable" ? 502
          : error.code === "invalid_configuration" ? 503 : 401;
      res.status(status).json({ error: error.code });
      return;
    }
    logger.warn({ errorName: error instanceof Error ? error.name : "unknown" }, "Discord Activity authorization failed");
    res.status(503).json({ error: "activity_storage_unavailable" });
  }
});

router.get("/activity/ai-consent", async (req: Request, res: Response) => {
  const claims = await requireCurrentSession(req, res);
  if (!claims) return;
  try {
    res.json({ status: await getConsent(claims.sub) });
  } catch {
    res.status(503).json({ error: "activity_ai_consent_unavailable" });
  }
});

router.put("/activity/ai-consent", async (req: Request, res: Response) => {
  const claims = await requireCurrentSession(req, res);
  if (!claims) return;
  const body = typeof req.body === "object" && req.body !== null ? req.body as { status?: unknown } : {};
  const { status } = body;
  if (status !== "accepted" && status !== "declined") {
    res.status(400).json({ error: "invalid_ai_consent" });
    return;
  }
  await setConsent(claims.sub, status);
  if (status === "declined") {
    clearActivityConversationsForMember(claims.guildId, claims.sub);
  }
  res.json({ status });
});

router.post("/activity/chat", async (req: Request, res: Response) => {
  const claims = await requireCurrentSession(req, res);
  if (!claims) return;
  const consent = await getConsent(claims.sub);
  if (consent !== "accepted") {
    res.status(403).json({ error: consent === "declined" ? "ai_consent_declined" : "ai_consent_required" });
    return;
  }
  if (!checkAiRateLimit(claims.guildId, claims.sub)) {
    res.status(429).json({ error: "activity_ai_rate_limited" });
    return;
  }
  const body = typeof req.body === "object" && req.body !== null
    ? req.body as { text?: unknown; conversationId?: unknown }
    : {};
  const { text, conversationId } = body;
  if (
    typeof text !== "string"
    || !text.trim()
    || text.trim().length > 2_000
    || typeof conversationId !== "string"
    || !/^[0-9a-f-]{36}$/i.test(conversationId)
  ) {
    res.status(400).json({ error: "invalid_activity_message", maxLength: 2_000 });
    return;
  }
  try {
    const answer = await answerDiscordActivityTurn({
      guildId: claims.guildId,
      userId: claims.sub,
      sessionId: claims.activitySessionId,
      conversationId,
      text: text.trim(),
    });
    res.json({ answer, intentionallySilent: !answer });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_activity_message") {
      res.status(400).json({ error: "invalid_activity_message", maxLength: 2_000 });
      return;
    }
    logger.warn({ errorName: error instanceof Error ? error.name : "unknown" }, "Discord Activity AI turn failed");
    res.status(503).json({ error: "activity_ai_unavailable" });
  }
});

router.post("/activity/speech", async (req: Request, res: Response) => {
  const claims = await requireCurrentSession(req, res);
  if (!claims) return;
  if (await getConsent(claims.sub) !== "accepted") {
    res.status(403).json({ error: "ai_consent_required" });
    return;
  }
  if (!checkAiRateLimit(claims.guildId, claims.sub)) {
    res.status(429).json({ error: "activity_ai_rate_limited" });
    return;
  }
  const body = typeof req.body === "object" && req.body !== null ? req.body as { text?: unknown } : {};
  const { text } = body;
  if (typeof text !== "string" || !text.trim() || text.trim().length > 1_500) {
    res.status(400).json({ error: "invalid_activity_speech", maxLength: 1_500 });
    return;
  }
  try {
    const language = getEffectiveLanguage(claims.guildId, claims.sub);
    const audio = await synthesizeActivitySpeech(claims.guildId, text.trim(), language);
    const contentType = audio.toString("ascii", 0, 4) === "RIFF" ? "audio/wav" : "audio/mpeg";
    res.status(200).set({
      "Content-Type": contentType,
      "Content-Length": String(audio.length),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    }).end(audio);
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_activity_speech") {
      res.status(400).json({ error: "invalid_activity_speech", maxLength: 1_500 });
      return;
    }
    logger.warn({ errorName: error instanceof Error ? error.name : "unknown" }, "Discord Activity speech synthesis failed");
    res.status(503).json({ error: "activity_speech_unavailable" });
  }
});

router.get("/activity/events", async (req: Request, res: Response) => {
  const claims = await requireCurrentSession(req, res);
  if (!claims) return;
  let streamReady = false;
  let pendingEvent: ActivityAvatarEvent | null = null;
  const sendEvent = (event: ActivityAvatarEvent) => {
    if (!streamReady) {
      pendingEvent = event;
      return;
    }
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
  };
  const unsubscribe = subscribeToActivityAvatar(claims.guildId, sendEvent);
  if (!unsubscribe) {
    res.status(429).json({ error: "activity_too_many_viewers" });
    return;
  }
  res.status(200).set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-store, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  streamReady = true;
  sendEvent(getActivityAvatarEvent(claims.guildId));
  if (pendingEvent) sendEvent(pendingEvent);
  const heartbeat = setInterval(() => {
    if (!res.writableEnded) res.write(": keep-alive\n\n");
  }, 20_000);
  const maxLifetime = setTimeout(() => res.end(), 4 * 60 * 1_000);
  res.on("close", () => {
    clearInterval(heartbeat);
    clearTimeout(maxLifetime);
    unsubscribe();
  });
});

router.get("/activity/me", async (req: Request, res: Response) => {
  if (!requireStoryStorage(res)) return;
  const claims = await requireCurrentSession(req, res);
  if (!claims) return;
  try {
    const story = await getPrivateActivityStory(claims.guildId, claims.sub);
    res.json({ guildSessionId: claims.activitySessionId, story });
  } catch (error) {
    logger.warn({ errorName: error instanceof Error ? error.name : "unknown" }, "Discord Activity private state could not be loaded");
    res.status(503).json({ error: "activity_storage_unavailable" });
  }
});

router.post("/activity/pulse", async (req: Request, res: Response) => {
  const claims = getClaims(req);
  if (!claims) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const session = await ensureDiscordActivitySession(claims.guildId);
    if (session.sessionId !== claims.activitySessionId) {
      res.status(401).json({ error: "activity_session_expired" });
      return;
    }
    const activityToken = issueDiscordActivityToken(
      { sub: claims.sub, guildId: claims.guildId, activitySessionId: session.sessionId },
      process.env.SESSION_SECRET ?? "",
    );
    res.json({ activityToken, sessionExpiresAt: session.expiresAt });
  } catch (error) {
    logger.warn({ errorName: error instanceof Error ? error.name : "unknown" }, "Discord Activity heartbeat failed");
    res.status(503).json({ error: "activity_storage_unavailable" });
  }
});

router.post("/activity/consent", async (req: Request, res: Response) => {
  if (!requireStoryStorage(res)) return;
  const claims = await requireCurrentSession(req, res);
  if (!claims) return;
  const { accepted } = req.body as { accepted?: unknown };
  if (accepted !== true) {
    res.status(400).json({ error: "explicit_acceptance_required" });
    return;
  }
  try {
    await setPrivateActivityStoryConsent(claims.guildId, claims.sub, true);
    res.json({ consentAccepted: true, story: "" });
  } catch (error) {
    logger.warn({ errorName: error instanceof Error ? error.name : "unknown" }, "Discord Activity consent could not be saved");
    res.status(503).json({ error: "activity_storage_unavailable" });
  }
});

router.delete("/activity/consent", async (req: Request, res: Response) => {
  if (!requireStoryStorage(res)) return;
  const claims = await requireCurrentSession(req, res);
  if (!claims) return;
  try {
    await setPrivateActivityStoryConsent(claims.guildId, claims.sub, false);
    res.json({ consentAccepted: false, storyDeleted: true });
  } catch (error) {
    logger.warn({ errorName: error instanceof Error ? error.name : "unknown" }, "Discord Activity consent withdrawal failed");
    res.status(503).json({ error: "activity_storage_unavailable" });
  }
});

router.put("/activity/story", async (req: Request, res: Response) => {
  if (!requireStoryStorage(res)) return;
  const claims = await requireCurrentSession(req, res);
  if (!claims) return;
  const { story } = req.body as { story?: unknown };
  if (typeof story !== "string" || !story.trim() || story.trim().length > STORY_MAX_LENGTH) {
    res.status(400).json({ error: "invalid_activity_story", maxLength: STORY_MAX_LENGTH });
    return;
  }
  try {
    const saved = await savePrivateActivityStory(claims.guildId, claims.sub, story);
    if (!saved) {
      res.status(403).json({ error: "story_consent_required" });
      return;
    }
    res.json({ saved: true });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_activity_story") {
      res.status(400).json({ error: "invalid_activity_story", maxLength: STORY_MAX_LENGTH });
      return;
    }
    logger.warn({ errorName: error instanceof Error ? error.name : "unknown" }, "Discord Activity story could not be saved");
    res.status(503).json({ error: "activity_storage_unavailable" });
  }
});

router.delete("/activity/story", async (req: Request, res: Response) => {
  if (!requireStoryStorage(res)) return;
  const claims = await requireCurrentSession(req, res);
  if (!claims) return;
  try {
    const deleted = await deletePrivateActivityStory(claims.guildId, claims.sub);
    res.json({ deleted });
  } catch (error) {
    logger.warn({ errorName: error instanceof Error ? error.name : "unknown" }, "Discord Activity story deletion failed");
    res.status(503).json({ error: "activity_storage_unavailable" });
  }
});

export default router;

