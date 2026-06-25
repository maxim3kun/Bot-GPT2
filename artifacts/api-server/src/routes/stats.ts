import { Router, type IRouter } from "express";
import { getBotStats, getUptimeSeconds, getGroqCallCount } from "../lib/bot-stats.js";
import { verifyJwt } from "../lib/jwt.js";
import { getGlobalEnabledCount, ALL_FEATURES } from "../lib/features-store.js";

const router: IRouter = Router();

router.get("/stats", (req, res) => {
  const auth  = req.headers["authorization"] ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const payload = token ? verifyJwt(token) : null;
  if (!payload) { res.status(401).json({ error: "unauthorized" }); return; }

  const stats = getBotStats();
  const botOnline = stats.botId !== "";

  res.json({
    // Legacy fields (keep for backwards compat)
    guildCount:    stats.guildCount,
    uptimeSeconds: getUptimeSeconds(),
    botTag:        stats.botTag,
    botAvatarUrl:  stats.botAvatarUrl,
    botId:         stats.botId,
    commandCount:  45,
    // Dashboard display fields
    botOnline,
    enabledCount:  getGlobalEnabledCount(),
    totalCount:    ALL_FEATURES.length,
    groqCalls:     getGroqCallCount(),
  });
});

export default router;
