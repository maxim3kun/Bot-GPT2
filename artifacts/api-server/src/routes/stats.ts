import { Router, type IRouter } from "express";
import { getBotStats, getUptimeSeconds } from "../lib/bot-stats.js";

const router: IRouter = Router();

router.get("/stats", (_req, res) => {
  const stats = getBotStats();
  res.json({
    guildCount: stats.guildCount,
    uptimeSeconds: getUptimeSeconds(),
    botTag: stats.botTag,
    botAvatarUrl: stats.botAvatarUrl,
    botId: stats.botId,
    commandCount: 45,
  });
});

export default router;
