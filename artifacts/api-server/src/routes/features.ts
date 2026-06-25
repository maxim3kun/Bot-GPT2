import { Router, type IRouter, type Request, type Response } from "express";
import { verifyJwt } from "../lib/jwt.js";
import {
  getGlobalFeatures,
  setGlobalFeature,
  getGuildFeatures,
  setGuildFeature,
  ALL_FEATURES,
} from "../lib/features-store.js";

const VALID_FEATURES = new Set<string>(ALL_FEATURES);
const GUILD_ID_RE = /^\d{17,20}$/;
function isValidFeature(name: string): boolean { return VALID_FEATURES.has(name); }
function isValidGuildId(id: string): boolean { return GUILD_ID_RE.test(id); }

const router: IRouter = Router();

// ── Auth middleware helper ─────────────────────────────────────────────────────

function getPayload(req: Request) {
  const auth = req.headers["authorization"] ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token ? verifyJwt(token) : null;
}

// ── GET /api/features  (global defaults, auth required) ──────────────────────

router.get("/features", (_req: Request, res: Response) => {
  const payload = getPayload(_req);
  if (!payload) { res.status(401).json({ error: "unauthorized" }); return; }
  res.json(getGlobalFeatures());
});

// ── POST /api/features/:name  (toggle global feature, admin only) ─────────────

router.post("/features/:name", async (req: Request, res: Response) => {
  const payload = getPayload(req);
  if (!payload) { res.status(401).json({ error: "unauthorized" }); return; }
  if (payload.role !== "admin") { res.status(403).json({ error: "forbidden" }); return; }

  const name = String(req.params["name"] ?? "");
  if (!isValidFeature(name)) { res.status(400).json({ error: "unknown_feature" }); return; }
  const { enabled } = req.body as { enabled?: boolean };
  if (typeof enabled !== "boolean") {
    res.status(400).json({ error: "enabled must be boolean" }); return;
  }

  setGlobalFeature(name, enabled);
  res.json({ name, enabled });
});

// ── GET /api/guilds/:id/features  (per-guild features) ───────────────────────

router.get("/guilds/:id/features", async (req: Request, res: Response) => {
  const payload = getPayload(req);
  if (!payload) { res.status(401).json({ error: "unauthorized" }); return; }

  const id = String(req.params["id"] ?? "");
  if (!isValidGuildId(id)) { res.status(400).json({ error: "invalid_guild_id" }); return; }

  // Admin can access any guild; guild role must have the guild in their list
  if (payload.role !== "admin" && !(payload.guilds ?? []).includes(id)) {
    res.status(403).json({ error: "forbidden" }); return;
  }

  const features = await getGuildFeatures(id);
  res.json(features);
});

// ── POST /api/guilds/:id/features/:name  (toggle per-guild feature) ───────────

router.post("/guilds/:id/features/:name", async (req: Request, res: Response) => {
  const payload = getPayload(req);
  if (!payload) { res.status(401).json({ error: "unauthorized" }); return; }

  const id   = String(req.params["id"]   ?? "");
  const name = String(req.params["name"] ?? "");
  if (!isValidGuildId(id))  { res.status(400).json({ error: "invalid_guild_id" }); return; }
  if (!isValidFeature(name)) { res.status(400).json({ error: "unknown_feature" }); return; }
  if (payload.role !== "admin" && !(payload.guilds ?? []).includes(id)) {
    res.status(403).json({ error: "forbidden" }); return;
  }

  const { enabled } = req.body as { enabled?: boolean };
  if (typeof enabled !== "boolean") {
    res.status(400).json({ error: "enabled must be boolean" }); return;
  }

  await setGuildFeature(id, name, enabled);
  res.json({ guildId: id, name, enabled });
});

export default router;
