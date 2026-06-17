import { get as httpsGet } from "https";
import { get as httpGet } from "http";
import type { IncomingMessage } from "http";
import { logger } from "./logger.js";
import {
  getAllBrandsForRetest,
  getUntestedBrands,
  updateBrandTestResult,
  getStoreStats,
  type LogoBrandMongoDoc,
} from "../discord/logo-brand-store.js";

// ── Image fetcher ─────────────────────────────────────────────────────────────

async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; sizeBytes: number } | null> {
  return new Promise((resolve) => {
    const getter = url.startsWith("https") ? httpsGet : httpGet;
    const req = getter(url, { timeout: 12_000 }, (res: IncomingMessage) => {
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        resolve(null);
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        resolve({ buffer, sizeBytes: buffer.length });
      });
      res.on("error", () => resolve(null));
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
  });
}

// ── OCR (Tesseract.js) ────────────────────────────────────────────────────────

// logo.dev placeholder images are ≤ 450 bytes (blank SVG-like PNGs)
const MIN_VALID_BYTES = 500;

// Lazy-initialised Tesseract worker — created once, reused for the whole job
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _worker: any = null;
let _workerReady = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getOcrWorker(): Promise<any | null> {
  if (_workerReady) return _worker;
  if (_worker) return null; // initialising in progress, skip OCR for this image
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { createWorker } = (await import("tesseract.js")) as any;
    _worker = {}; // sentinel — "initialising"
    _worker = await createWorker("eng", 1, {
      logger: () => {},
      errorHandler: (e: unknown) => logger.warn({ e }, "Tesseract internal error"),
    });
    _workerReady = true;
    logger.info("Tesseract OCR worker ready");
    return _worker;
  } catch (err) {
    logger.warn({ err }, "Tesseract.js init failed — OCR disabled for this run");
    _worker = null;
    return null;
  }
}

async function runOcr(imageBuffer: Buffer): Promise<string> {
  const worker = await getOcrWorker();
  if (!worker || !_workerReady) return "";
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await worker.recognize(imageBuffer) as any;
    return (data.text as string).toLowerCase().replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

/** Returns true if any word in detectedText matches the brand name or an alias. */
function textMatchesBrand(text: string, brand: LogoBrandMongoDoc): boolean {
  if (!text) return false;
  const candidates = [brand.name, ...brand.aliases].map((s) => s.toLowerCase());
  return candidates.some((c) => c.length >= 3 && text.includes(c));
}

// ── Per-brand test ─────────────────────────────────────────────────────────────

async function testOneBrand(brand: LogoBrandMongoDoc, logoDevToken: string): Promise<void> {
  const url =
    `https://img.logo.dev/${brand.domain}?size=200&format=png` +
    (logoDevToken ? `&token=${logoDevToken}` : "");

  let imageOk = false;
  let imageSizeBytes = 0;
  let hasTextLogo = false;
  let detectedText = "";

  try {
    const res = await fetchImageBuffer(url);
    if (res && res.sizeBytes >= MIN_VALID_BYTES) {
      imageOk = true;
      imageSizeBytes = res.sizeBytes;
      // Run OCR only when the image looks valid
      detectedText = await runOcr(res.buffer);
      hasTextLogo = textMatchesBrand(detectedText, brand);
    } else {
      imageSizeBytes = res?.sizeBytes ?? 0;
    }
  } catch (err) {
    logger.debug({ err, domain: brand.domain }, "Logo test fetch error — marking invalid");
  }

  await updateBrandTestResult(brand.domain, { imageOk, imageSizeBytes, hasTextLogo, detectedText });
}

// ── Background job ─────────────────────────────────────────────────────────────

export interface TestingProgress {
  running: boolean;
  total: number;
  done: number;
  approved: number;
  textLogos: number;
  invalid: number;
}

let _running = false;
let _progress: TestingProgress = { running: false, total: 0, done: 0, approved: 0, textLogos: 0, invalid: 0 };

export function isTestingRunning(): boolean { return _running; }
export function getTestingProgress(): TestingProgress { return { ..._progress }; }

/**
 * Starts the background logo-testing pipeline.
 * @param logoDevToken  LOGO_DEV_PUBLIC_KEY — pass "" if none
 * @param retestAll     If true, re-tests brands that were already tested
 */
export function startLogoTestingJob(logoDevToken: string, retestAll = false): void {
  if (_running) return;
  _running = true;

  const brands = retestAll ? getAllBrandsForRetest() : getUntestedBrands();
  _progress = { running: true, total: brands.length, done: 0, approved: 0, textLogos: 0, invalid: 0 };

  logger.info({ total: brands.length, retestAll }, "Logo testing job started");

  const BATCH = 5;
  const DELAY_MS = 600; // be polite to logo.dev

  void (async () => {
    try {
      for (let i = 0; i < brands.length; i += BATCH) {
        const slice = brands.slice(i, i + BATCH);
        await Promise.all(slice.map((b) => testOneBrand(b, logoDevToken)));
        _progress.done += slice.length;
        if (i + BATCH < brands.length) {
          await new Promise((r) => setTimeout(r, DELAY_MS));
        }
      }
      const stats = getStoreStats();
      _progress.approved  = stats.approved;
      _progress.textLogos = stats.textLogos;
      _progress.invalid   = stats.invalid;
      logger.info({ stats }, "Logo testing job complete");
    } catch (err) {
      logger.error({ err }, "Logo testing job crashed");
    } finally {
      _running = false;
      _progress.running = false;
    }
  })();
}

/** Terminate the shared Tesseract worker (call on clean shutdown if needed). */
export async function terminateOcrWorker(): Promise<void> {
  if (_workerReady && _worker) {
    try { await _worker.terminate(); } catch { /* ignore */ }
    _worker = null;
    _workerReady = false;
  }
}
