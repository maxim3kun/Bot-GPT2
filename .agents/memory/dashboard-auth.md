---
name: Dashboard auth & per-guild features
description: Full dashboard system built on top of the Discord bot API server — JWT auth, Discord OAuth, per-guild feature toggles.
---

# Dashboard auth & per-guild features

## What was built
- `artifacts/api-server/src/lib/jwt.ts` — HMAC-SHA256 JWT using SESSION_SECRET (throws at startup if missing)
- `artifacts/api-server/src/lib/auth-store.ts` — In-memory 2FA session store (5min TTL) + per-IP rate limiter
- `artifacts/api-server/src/lib/features-store.ts` — Global feature flags (JSON fallback) + per-guild overrides in MongoDB `guilds.features`
- `artifacts/api-server/src/routes/auth.ts` — POST /api/login, GET /api/auth/discord, GET /api/auth/discord/callback, POST /api/auth/discord/verify
- `artifacts/api-server/src/routes/features.ts` — GET/POST /api/features, GET/POST /api/guilds/:id/features/:name
- `artifacts/api-server/src/routes/guilds.ts` — GET /api/guilds
- `artifacts/api-server/public/dashboard.html` — Enhanced dashboard with guild selector view

## Required env vars (secrets)
| Var | Purpose | Status |
|-----|---------|--------|
| SESSION_SECRET | JWT signing (required, server won't start without it) | ✅ Set |
| DASHBOARD_PASSWORD | Password login. Username defaults to "admin" | ❌ Not set |
| DASHBOARD_USERNAME | Optional, defaults to "admin" | not needed |
| DISCORD_CLIENT_ID | Discord OAuth redirect | ❌ Not set |
| DISCORD_CLIENT_SECRET | Discord OAuth token exchange | ❌ Not set |
| DISCORD_TOKEN | Bot (for DM 2FA sending) | set in prod |

## OAuth2 callback URL
Must be registered in Discord Developer Portal:
`https://{REPLIT_DEV_DOMAIN}/api/auth/discord/callback`

## Per-guild features
- ALL_FEATURES list in features-store.ts defines 19 toggleable features
- Guild overrides stored in MongoDB guilds collection under `features.{name}` field
- Without MongoDB, features revert to global JSON fallback (data/features.json)

## Security fixes applied
- JWT fails closed if SESSION_SECRET missing (no hardcoded fallback)
- 2FA fail-open bypass removed (bot offline = error, not direct token)
- CORS restricted to REPLIT_DEV_DOMAIN origin only
- Feature names and guild IDs validated before DB writes

## Dashboard URL
Served from Replit at `/dashboard` (same origin as API, so relative /api/... calls work)
GitHub Pages dashboard at maxim3kun.github.io/dashboard uses relative paths — won't work from there directly.
