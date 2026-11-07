import { recordModuleFailureState, recordModuleSuccess } from "./module-technician.js";
import { setTimeout as delay } from "node:timers/promises";

export const CLOUDFLARE_IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell";
const HF_IMAGE_ROUTE = "https://router.huggingface.co/fal-ai/fal-ai/flux/schnell?_subdomain=queue";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_PAYLOAD_BYTES = 15 * 1024 * 1024;
export type ImageProvider = "cloudflare" | "huggingface";
export type ImageFailureReason = "configuration" | "busy" | "http" | "invalid-image" | "timeout" | "network";

export class ImageProviderError extends Error {
  constructor(message: string, readonly reason: ImageFailureReason, readonly status?: number) {
    super(message);
    this.name = "ImageProviderError";
  }
}

export function configuredImageProviders(): ImageProvider[] {
  const providers: ImageProvider[] = [];
  if (process.env["ACCOUNT_ID"] && process.env["TOKEN_API"]) providers.push("cloudflare");
  if (process.env["HUGGINGFACE_TOKEN"]) providers.push("huggingface");
  return providers;
}

function imageExtension(buffer: Buffer): string | null {
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return "jpg";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

async function readBounded(response: Response): Promise<Buffer> {
  if (Number(response.headers.get("content-length")) > MAX_PAYLOAD_BYTES) {
    await response.body?.cancel();
    throw new ImageProviderError("Image response is too large", "invalid-image");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new ImageProviderError("Empty image response", "invalid-image");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_PAYLOAD_BYTES) {
        await reader.cancel();
        throw new ImageProviderError("Image response is too large", "invalid-image");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

async function imageFetch(url: string, init: RequestInit, signal: AbortSignal): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal, redirect: "error" });
  } catch (error) {
    const timeout = error instanceof Error && /TimeoutError|AbortError/.test(error.name);
    // Never include a fetch error's URL, request body or token in logs/diagnostics.
    throw new ImageProviderError("Image service request failed", timeout ? "timeout" : "network");
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new ImageProviderError(`Image service returned HTTP ${response.status}`,
      [400, 401, 402, 403, 404, 410, 422].includes(response.status) ? "configuration"
        : [429, 503].includes(response.status) ? "busy" : "http", response.status);
  }
  return response;
}

async function imageJson(response: Response): Promise<any> {
  const bytes = await readBounded(response);
  try { return JSON.parse(bytes.toString("utf8")); }
  catch { throw new ImageProviderError("Invalid image JSON response", "invalid-image"); }
}

/** HF routes this model to fal.ai, not the retired hf-inference endpoint.
 * Submit once; subsequent requests only check/read that same generation. */
async function requestHuggingFace(prompt: string, seed: number | undefined, signal: AbortSignal): Promise<Response> {
  const headers = { Authorization: `Bearer ${process.env["HUGGINGFACE_TOKEN"]!}`, "Content-Type": "application/json" };
  let payload = await imageJson(await imageFetch(HF_IMAGE_ROUTE, {
    method: "POST", headers,
    body: JSON.stringify({ prompt, num_inference_steps: 4, num_images: 1, ...(seed === undefined ? {} : { seed }) }),
  }, signal));
  if (!payload?.images) {
    // Never follow arbitrary provider URLs with our token. Reconstruct the HF
    // router URL only for a validated queue result belonging to this model.
    let resultPath: string;
    try {
      const url = new URL(payload.response_url);
      if (url.origin !== "https://queue.fal.run"
        || !/^\/fal-ai\/flux\/requests\/[A-Za-z0-9-]+$/.test(url.pathname)
        || url.search || url.hash || url.username || url.password) throw Error();
      resultPath = url.pathname;
    } catch {
      throw new ImageProviderError("Invalid image queue response", "invalid-image");
    }
    const resultUrl = `https://router.huggingface.co/fal-ai${resultPath}`;
    let status = payload.status;
    while (status !== "COMPLETED") {
      if (!["IN_QUEUE", "IN_PROGRESS"].includes(status)) {
        throw new ImageProviderError("Image generation queue failed", "http");
      }
      await delay(1000, undefined, { signal });
      const state = await imageJson(await imageFetch(`${resultUrl}/status?_subdomain=queue`, { headers }, signal));
      status = state?.status;
    }
    payload = await imageJson(await imageFetch(`${resultUrl}?_subdomain=queue`, { headers }, signal));
  }
  let imageUrl: URL;
  try {
    imageUrl = new URL(payload.images[0].url);
    if (imageUrl.protocol !== "https:" || imageUrl.port || imageUrl.username || imageUrl.password
      || !(imageUrl.hostname === "fal.media" || imageUrl.hostname.endsWith(".fal.media"))) throw Error();
  } catch {
    throw new ImageProviderError("Invalid generated image URL", "invalid-image");
  }
  // CDN downloads must never carry the Hugging Face credential.
  return imageFetch(imageUrl.href, {}, signal);
}

async function requestImage(provider: ImageProvider, prompt: string, seed?: number) {
  const cloudflare = provider === "cloudflare";
  const signal = AbortSignal.timeout(45_000);
  const response = cloudflare
    ? await imageFetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(process.env["ACCOUNT_ID"]!)}/ai/run/${CLOUDFLARE_IMAGE_MODEL}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env["TOKEN_API"]!}`, "Content-Type": "application/json" },
      // Cloudflare's strict schema does not accept the persona seed.
      body: JSON.stringify({ prompt, steps: 4 }),
    }, signal)
    : await requestHuggingFace(prompt, seed, signal);
  const bytes = await readBounded(response);
  let buffer: Buffer;
  if (cloudflare && response.headers.get("content-type")?.includes("application/json")) {
    let payload;
    try { payload = JSON.parse(bytes.toString("utf8")); }
    catch { throw new ImageProviderError("Invalid image JSON response", "invalid-image"); }
    if (payload.success === false) throw new ImageProviderError("Image service rejected generation", "http");
    const base64 = payload.result?.image ?? payload.image;
    if (typeof base64 !== "string" || !base64.length || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
      throw new ImageProviderError("Missing image in response", "invalid-image");
    }
    buffer = Buffer.from(base64, "base64");
  } else {
    if (!response.headers.get("content-type")?.startsWith("image/")) {
      throw new ImageProviderError("Image service returned a non-image response", "invalid-image");
    }
    buffer = bytes;
  }
  const extension = imageExtension(buffer);
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES || !extension) {
    throw new ImageProviderError("Image service returned an invalid image", "invalid-image");
  }
  return { buffer, extension, provider };
}

/** Cloudflare first; only a configured, actually successful alternative counts as a fallback. */
export async function generateImage(prompt: string, seed?: number) {
  if (!prompt.trim() || prompt.length > 2048) {
    throw new ImageProviderError("Image description must contain 1–2048 characters", "configuration");
  }
  const providers = configuredImageProviders();
  if (!providers.length) throw new ImageProviderError("No image provider configured", "configuration");
  let lastError: unknown;
  for (const provider of providers) {
    try {
      const result = await requestImage(provider, prompt, seed);
      recordModuleSuccess("image", provider);
      return result;
    } catch (error) {
      lastError = error instanceof ImageProviderError ? error
        : new ImageProviderError("Could not read image response",
          error instanceof Error && /TimeoutError|AbortError/.test(error.name) ? "timeout" : "network");
      recordModuleFailureState("image", lastError, provider);
    }
  }
  throw lastError;
}
