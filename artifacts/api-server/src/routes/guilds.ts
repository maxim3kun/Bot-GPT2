import { Router, type IRouter, type Request, type Response } from "express";
import { verifyJwt } from "../lib/jwt.js";
import { getBotClient } from "../bot.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

function getPayload(req: Request) {
  const auth = req.headers["authorization"] ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token ? verifyJwt(token) : null;
}

// ── GET /api/guilds  (guilds accessible to the logged-in user) ────────────────

router.get("/guilds", async (req: Request, res: Response) => {
  const payload = getPayload(req);
  if (!payload) { res.status(401).json({ error: "unauthorized" }); return; }

  const client = getBotClient();
  if (!client) {
    res.status(503).json({ error: "bot_offline" }); return;
  }

  try {
    if (payload.role === "admin") {
      // Admin sees all guilds the bot is in
      const guilds = client.guilds.cache.map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.iconURL() ?? null,
        memberCount: g.memberCount,
      }));
      res.json(guilds);
    } else {
      // Guild role: only accessible guilds
      const allowedIds = payload.guilds ?? [];
      const guilds = allowedIds
        .map((id) => {
          const g = client.guilds.cache.get(id);
          if (!g) return null;
          return {
            id: g.id,
            name: g.name,
            icon: g.iconURL() ?? null,
            memberCount: g.memberCount,
          };
        })
        .filter(Boolean);
      res.json(guilds);
    }
  } catch (err) {
    logger.error({ err }, "GET /api/guilds failed");
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
