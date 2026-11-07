import sharp from "sharp";
import { configuredImageProviders, generateImage, ImageProviderError } from "../src/discord/image-provider.js";
import { generatePersonaIllustration, stablePersonaImageSeed } from "../src/discord/persona-image-provider.js";

// One real generation, kept only in memory. Never print credentials, URLs or raw provider responses.
try {
  if (configuredImageProviders()[0] !== "cloudflare") throw new Error("Cloudflare credentials are missing");
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
  if (image.provider !== "cloudflare") process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    reason: error instanceof ImageProviderError ? error.reason : "verification",
    status: error instanceof ImageProviderError ? error.status : undefined,
  }));
  process.exitCode = 1;
}
