import express, { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger.js";
import {
  answerPublicLiveTurn,
  detectPublicLiveLanguage,
} from "../discord/public-live-ai.js";
import {
  AnonymousLiveRateLimiter,
  AnonymousLiveSessionStore,
  isPublicLiveSessionId,
} from "../discord/public-live-sessions.js";
import {
  synthesizePublicLiveSpeech,
  transcribePublicLiveAudio,
} from "../discord/voice.js";

const router: IRouter = Router();
const sessions = new AnonymousLiveSessionStore();
const rateLimiter = new AnonymousLiveRateLimiter();
const MAX_AUDIO_BYTES = 1_500_000;
const MAX_SPEECH_TEXT_LENGTH = 1_800;
const AUDIO_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/m4a",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
];

router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});

function getSessionId(req: Request): string | null {
  const value = req.get("x-live-session-id");
  return isPublicLiveSessionId(value) ? value : null;
}

function allowRequest(sessionId: string, res: Response): boolean {
  if (rateLimiter.allow(sessionId)) return true;
  res.status(429).json({ error: "live_rate_limited" });
  return false;
}

router.post(
  "/live/turn",
  express.raw({ type: AUDIO_TYPES, limit: MAX_AUDIO_BYTES }),
  async (req: Request, res: Response) => {
    const sessionId = getSessionId(req);
    if (!sessionId) {
      res.status(400).json({ error: "invalid_live_session" });
      return;
    }
    if (!allowRequest(sessionId, res)) return;
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(415).json({ error: "unsupported_audio_type" });
      return;
    }
    if (req.body.length > MAX_AUDIO_BYTES) {
      res.status(413).json({ error: "audio_too_large" });
      return;
    }
    const mimeType = (req.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
    if (!AUDIO_TYPES.includes(mimeType)) {
      res.status(415).json({ error: "unsupported_audio_type" });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    timeout.unref();
    req.on("aborted", () => controller.abort());

    try {
      const transcript = (await transcribePublicLiveAudio(req.body, mimeType, controller.signal)).trim();
      if (!transcript) {
        res.status(422).json({ error: "speech_not_detected" });
        return;
      }
      if (transcript.length > 1_200) {
        res.status(413).json({ error: "transcript_too_long" });
        return;
      }
      const previous = sessions.getMessages(sessionId);
      const answer = await answerPublicLiveTurn(transcript, previous);
      sessions.appendTurn(sessionId, transcript, answer);
      res.json({ transcript, answer, language: detectPublicLiveLanguage(transcript) });
    } catch (error) {
      const errorName = error instanceof Error ? error.name : "unknown";
      logger.warn({ errorName }, "Public live voice turn failed");
      if (res.headersSent || res.destroyed) return;
      if (controller.signal.aborted) {
        res.status(504).json({ error: "live_request_timeout" });
        return;
      }
      res.status(503).json({ error: "live_voice_unavailable" });
    } finally {
      clearTimeout(timeout);
    }
  },
);

router.post("/live/speech", async (req: Request, res: Response) => {
  const { sessionId, text, language } = req.body as {
    sessionId?: unknown;
    text?: unknown;
    language?: unknown;
  };
  if (!isPublicLiveSessionId(sessionId)) {
    res.status(400).json({ error: "invalid_live_session" });
    return;
  }
  if (!allowRequest(sessionId, res)) return;
  if (
    typeof text !== "string"
    || !text.trim()
    || text.length > MAX_SPEECH_TEXT_LENGTH
    || typeof language !== "string"
    || !/^[a-z]{2}(?:-[A-Z]{2})?$/.test(language)
  ) {
    res.status(400).json({ error: "invalid_live_speech" });
    return;
  }
  const latestAnswer = sessions.getLatestAssistantMessage(sessionId);
  if (!latestAnswer || latestAnswer !== text.trim()) {
    res.status(403).json({ error: "live_speech_not_available" });
    return;
  }

  try {
    const audio = await synthesizePublicLiveSpeech(text, language);
    res
      .status(200)
      .type(/^fr(?:-|$)/i.test(language) ? "audio/wav" : "audio/mpeg")
      .send(audio);
  } catch (error) {
    logger.warn(
      { errorName: error instanceof Error ? error.name : "unknown" },
      "Public live speech synthesis failed",
    );
    res.status(503).json({ error: "live_speech_unavailable" });
  }
});

router.post("/live/close", (req: Request, res: Response) => {
  const { sessionId } = req.body as { sessionId?: unknown };
  if (!isPublicLiveSessionId(sessionId)) {
    res.status(400).json({ error: "invalid_live_session" });
    return;
  }
  sessions.clear(sessionId);
  res.json({ cleared: true });
});

router.use((error: unknown, _req: Request, res: Response, next: (error?: unknown) => void) => {
  if (
    error
    && typeof error === "object"
    && "type" in error
    && error.type === "entity.too.large"
  ) {
    res.status(413).json({ error: "audio_too_large" });
    return;
  }
  next(error);
});

export default router;
