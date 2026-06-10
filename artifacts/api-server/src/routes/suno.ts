import { Router, type IRouter } from "express";
import { generateSong, pollSong, getCredits } from "../lib/suno-client";

const callbackStore = new Map<string, unknown>();

function callbackUrl(): string {
  const override = process.env.SUNO_CALLBACK_URL;
  if (override) return override;
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) {
    const first = domains.split(",")[0]?.trim();
    if (first) return `https://${first}/api/suno/callback`;
  }
  return "";
}

const router: IRouter = Router();

router.post("/suno/generate", async (req, res): Promise<void> => {
  const { prompt, make_instrumental, tags, title } = req.body as {
    prompt?: string;
    make_instrumental?: boolean;
    tags?: string;
    title?: string;
  };

  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "Field 'prompt' is required and must be a string" });
    return;
  }

  const cbUrl = callbackUrl();
  req.log.info({ prompt, make_instrumental, cbUrl }, "Submitting generate request to Suno API");

  let taskId: string;
  try {
    taskId = await generateSong({
      prompt,
      instrumental: make_instrumental ?? false,
      tags: tags ?? undefined,
      title: title ?? undefined,
      callBackUrl: cbUrl || undefined,
    });
  } catch (err) {
    req.log.error({ err }, "Suno generate error");
    res.status(502).json({ error: String(err) });
    return;
  }

  req.log.info({ taskId }, "Suno task submitted");
  res.json({ taskId });
});

router.get("/suno/songs", async (req, res): Promise<void> => {
  const taskId = req.query.taskId;
  if (!taskId || typeof taskId !== "string") {
    res.status(400).json({ error: "Query param 'taskId' is required" });
    return;
  }

  if (callbackStore.has(taskId)) {
    res.json(callbackStore.get(taskId));
    return;
  }

  req.log.info({ taskId }, "Polling Suno record-info");

  try {
    const result = await pollSong(taskId);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Suno poll error");
    res.status(502).json({ error: String(err) });
  }
});

router.get("/suno/credits", async (req, res): Promise<void> => {
  req.log.info("Fetching Suno credit balance");

  try {
    const credits = await getCredits();
    res.json({ credits_left: credits });
  } catch (err) {
    req.log.error({ err }, "Suno credits error");
    res.status(502).json({ error: String(err) });
  }
});

router.post("/suno/callback", (req, res): void => {
  const body = req.body as { taskId?: string; status?: string; clips?: unknown[] };
  const { taskId, status, clips } = body;

  if (taskId) {
    const result = { taskId, status: status ?? "complete", clips: clips ?? [], done: true };
    callbackStore.set(taskId, result);
    req.log.info({ taskId, status, clipCount: clips?.length }, "Suno callback stored");
  }

  res.json({ status: "ok" });
});

export default router;
