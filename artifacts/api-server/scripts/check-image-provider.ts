import sharp from "sharp";
import { configuredImageProviders, generateImage, ImageProviderError } from "../src/discord/image-provider.js";
import { generatePersonaIllustration, stablePersonaImageSeed } from "../src/discord/persona-image-provider.js";

// One real generation, kept only in memory. Never print credentials, URLs or raw provider responses.
try {
  const fallback = process.argv.includes("--fallback");
  const expectedProvider = fallback ? "huggingface" : "cloudflare";
  if (!configuredImageProviders().includes(expectedProvider)) throw new Error("Provider credentials are missing");
  if (fallback) {
    // Simulate only the Cloudflare outage. HF calls and CDN downloads stay real.
    const realFetch = globalThis.fetch;
    globalThis.fetch = ((url, init) => String(url).startsWith("https://api.cloudflare.com/")
      ? Promise.resolve(new Response(null, { status: 503 }))
      : realFetch(url, init)) as typeof fetch;
  }
  const persona = process.argv.includes("--persona");
  const image = persona
    ? await generatePersonaIllustration({
      name: "Test character",
      description: "A friendly adult fictional character.",
      visualDescription: "Silver hair, blue eyes, warm smile, blue casual clothing.",
      visualSeed: stablePersonaImageSeed("image-service-check"), purpose: "selfie",
    })
    : await generateImage("A small friendly orange robot reading a book, clean illustration, no text.");
  const metadata = await sharp(image.buffer).metadata();
  console.log(JSON.stringify({
    ok: true, purpose: persona ? "persona-selfie" : "image", provider: image.provider, format: metadata.format,
    width: metadata.width, height: metadata.height, bytes: image.buffer.length,
  }));
  if (image.provider !== expectedProvider) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    reason: error instanceof ImageProviderError ? error.reason : "verification",
    status: error instanceof ImageProviderError ? error.status : undefined,
  }));
  process.exitCode = 1;
}
