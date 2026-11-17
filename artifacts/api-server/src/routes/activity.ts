import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger.js";
import { isDbReady, isMongoConnected } from "../lib/db.js";
import {
  DiscordActivityOAuthError,
  exchangeDiscordActivityCode,
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

function activityClientId(): string {
  return process.env.DISCORD_ACTIVITY_CLIENT_ID?.trim()
    || process.env.DISCORD_CLIENT_ID?.trim()
    || process.env.VITE_DISCORD_CLIENT_ID?.trim()
    || "";
}

function activityClientSecret(): string {
  return process.env.DISCORD_ACTIVITY_CLIENT_SECRET?.trim()
    || process.env.DISCORD_CLIENT_SECRET?.trim()
    || "";
}

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
  const checks = {
    discordOAuth: Boolean(activityClientId() && activityClientSecret()),
    sessionSigning: Boolean(process.env.SESSION_SECRET),
    mongo: isMongoConnected(),
    encryption: isDbReady(),
  };
  const requestedClientId = typeof req.query.clientId === "string" ? req.query.clientId : "";
  const clientIdMatches = !requestedClientId || requestedClientId === activityClientId();
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

  const configuredClientId = activityClientId();
  const clientSecret = activityClientSecret();
  if (!configuredClientId || !clientSecret || !process.env.SESSION_SECRET) {
    res.status(503).json({ error: "activity_oauth_not_configured" });
    return;
  }

  try {
    const identity = await exchangeDiscordActivityCode(
      { code, codeVerifier, guildId, clientId },
      { clientId: configuredClientId, clientSecret },
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

