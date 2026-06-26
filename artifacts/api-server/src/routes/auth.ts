import { Router, type IRouter, type Request, type Response } from "express";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { createAuthSession, consumeAuthSession, checkRateLimit } from "../lib/auth-store.js";
import { logger } from "../lib/logger.js";
import { getBotClient } from "../bot.js";

const router: IRouter = Router();

// ── Config ────────────────────────────────────────────────────────────────────

const DASHBOARD_USERNAME = process.env["DASHBOARD_USERNAME"] ?? "admin";
const DASHBOARD_PASSWORD = process.env["DASHBOARD_PASSWORD"] ?? "";
const ADMIN_DISCORD_ID   = process.env["DASHBOARD_DISCORD_ID"] ?? "";

const DISCORD_CLIENT_ID     = process.env["DISCORD_CLIENT_ID"] ?? "";
const DISCORD_CLIENT_SECRET = process.env["DISCORD_CLIENT_SECRET"] ?? "";

function getRedirectUri(req: Request): string {
  const host = process.env["REPLIT_DEV_DOMAIN"]
    ? `https://${process.env["REPLIT_DEV_DOMAIN"]}`
    : `${req.protocol}://${req.get("host")}`;
  return `${host}/api/auth/discord/callback`;
}

function dashboardUrl(req: Request): string {
  const host = process.env["REPLIT_DEV_DOMAIN"]
    ? `https://${process.env["REPLIT_DEV_DOMAIN"]}`
    : `${req.protocol}://${req.get("host")}`;
  return `${host}/dashboard`;
}

// ── POST /api/login  (username + password) ────────────────────────────────────

router.post("/login", async (req: Request, res: Response) => {
  const ip = req.ip ?? "unknown";
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: "rate_limited" });
    return;
  }

  const { username, password } = req.body as { username?: string; password?: string };

  if (!DASHBOARD_PASSWORD) {
    logger.warn("DASHBOARD_PASSWORD not set — password login disabled");
    res.status(503).json({ error: "password_login_not_configured" });
    return;
  }

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    username.trim().toLowerCase() !== DASHBOARD_USERNAME.toLowerCase() ||
    password !== DASHBOARD_PASSWORD
  ) {
    res.status(401).json({ error: "invalid_credentials" });
    return;
  }

  // Issue admin JWT directly (no 2FA for password login)
  const token = signJwt({ sub: "admin", role: "admin" });
  res.json({ token });
});

// ── Allowed return URLs (whitelist to prevent open-redirect) ─────────────────
const ALLOWED_RETURN_HOSTS = new Set([
  "www.maximegpt.com",
  "maxim3kun.github.io",
  "www.maxim3kun.com",
]);

function isSafeReturnUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && ALLOWED_RETURN_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

// ── GET /api/auth/discord  (redirect to OAuth) ────────────────────────────────

router.get("/auth/discord", (req: Request, res: Response) => {
  if (!DISCORD_CLIENT_ID) {
    res.status(503).send("Discord OAuth not configured (missing DISCORD_CLIENT_ID)");
    return;
  }
  // Optional returnUrl — where to send the user after OAuth (must be whitelisted)
  const returnUrl = typeof req.query["returnUrl"] === "string" && isSafeReturnUrl(req.query["returnUrl"])
    ? req.query["returnUrl"]
    : null;

  // Encode returnUrl in the Discord OAuth state param (base64 JSON)
  const statePayload = Buffer.from(JSON.stringify({ returnUrl })).toString("base64url");

  const redirectUri = getRedirectUri(req);
  const scope = "identify guilds";
  const url = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${statePayload}`;
  res.redirect(url);
});

// ── GET /api/auth/discord/callback  (OAuth code exchange) ─────────────────────

router.get("/auth/discord/callback", async (req: Request, res: Response) => {
  const { code, error: oauthError, state: discordState } = req.query as { code?: string; error?: string; state?: string };

  // Decode the returnUrl we encoded in the state param
  let returnUrl: string | null = null;
  if (typeof discordState === "string") {
    try {
      const decoded = JSON.parse(Buffer.from(discordState, "base64url").toString());
      if (decoded.returnUrl && isSafeReturnUrl(decoded.returnUrl)) returnUrl = decoded.returnUrl;
    } catch { /* ignore malformed state */ }
  }
  const baseUrl = returnUrl ?? dashboardUrl(req);

  if (oauthError || !code) {
    res.redirect(`${baseUrl}?error=no_code`);
    return;
  }

  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    res.redirect(`${baseUrl}?error=server_error`);
    return;
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type:    "authorization_code",
        code,
        redirect_uri:  getRedirectUri(req),
      }),
    });

    if (!tokenRes.ok) {
      logger.warn({ status: tokenRes.status }, "Discord token exchange failed");
      res.redirect(`${baseUrl}?error=token_exchange`);
      return;
    }

    const tokenData = await tokenRes.json() as { access_token: string };

    // Fetch user identity
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userRes.json() as { id: string; username: string };

    // Fetch user's guilds
    const guildsRes = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userGuilds = await guildsRes.json() as Array<{ id: string; owner: boolean; permissions: number }>;

    // Filter: guilds where user is admin (ADMINISTRATOR = 0x8) or owner
    const ADMIN_PERM = 0x8;
    const adminGuildIds = userGuilds
      .filter((g) => g.owner || (Number(g.permissions) & ADMIN_PERM) !== 0)
      .map((g) => g.id);

    // Also allow the bot owner to access all guilds
    const isOwner = ADMIN_DISCORD_ID && user.id === ADMIN_DISCORD_ID;
    const role: "admin" | "guild" = isOwner ? "admin" : "guild";

    if (!isOwner && adminGuildIds.length === 0) {
      res.redirect(`${baseUrl}?error=not_allowed`);
      return;
    }

    // Send 2FA DM code via bot
    const client = getBotClient();
    if (client) {
      try {
        const { state, code: dmCode } = createAuthSession(user.id, role, isOwner ? undefined : adminGuildIds);
        const dmUser = await client.users.fetch(user.id);
        await dmUser.send(
          `🔐 **MaximeGPT Dashboard** — Code de vérification : \`${dmCode}\`\nExpire dans **5 minutes**.`,
        );
        res.redirect(`${baseUrl}?step=2fa&state=${state}`);
        return;
      } catch (err) {
        logger.warn({ err }, "Failed to send DM — issuing token directly");
      }
    }

    // Bot offline or DM failed — fail closed, require Discord DM access
    res.redirect(`${baseUrl}?error=bot_offline`);
  } catch (err) {
    logger.error({ err }, "Discord OAuth callback error");
    res.redirect(`${dashboardUrl(req)}?error=server_error`);
  }
});

// ── POST /api/auth/discord/verify  (2FA code) ────────────────────────────────

router.post("/auth/discord/verify", (req: Request, res: Response) => {
  const { state, code } = req.body as { state?: string; code?: string };

  if (!state || !code) {
    res.status(400).json({ error: "missing_params" });
    return;
  }

  const session = consumeAuthSession(state, code);
  if (!session) {
    res.status(401).json({ error: "invalid_or_expired_code" });
    return;
  }

  const token = signJwt({ sub: session.discordId, role: session.role, guilds: session.guilds });
  res.json({ token });
});

// ── GET /api/auth/me  (validate token + return info) ─────────────────────────

router.get("/auth/me", (req: Request, res: Response) => {
  const auth = req.headers["authorization"] ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const payload = verifyJwt(token);
  if (!payload) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  res.json({ sub: payload.sub, role: payload.role, guilds: payload.guilds ?? null });
});

export default router;
