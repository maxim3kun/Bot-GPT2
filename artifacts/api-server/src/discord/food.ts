import { execFile } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { promisify } from "util";

import { Message, ButtonInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import OpenAI from "openai";
import { logger } from "../lib/logger.js";
import { saveFoodHistory, getFoodHistory, clearFoodHistory, isMongoConnected } from "../lib/db.js";

const execFileAsync = promisify(execFile);

// ── Open Food Facts API ────────────────────────────────────────────────────────

const OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";
const OFF_PRODUCT_URL = "https://world.openfoodfacts.org/api/v0/product";

// Browser-like UA required — OFF blocks generic bot UAs
const OFF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; MaximeGPT/1.0; +https://discord.com)",
  "Accept": "application/json",
};

interface OffProduct {
  product_name?: string;
  product_name_en?: string;
  product_name_fr?: string;
  brands?: string;
  quantity?: string;
  nutriscore_grade?: string;
  nova_group?: number;
  ecoscore_grade?: string;
  image_front_url?: string;
  image_url?: string;
  url?: string;
  ingredients_text_en?: string;
  ingredients_text?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    fat_100g?: number;
    saturated_fat_100g?: number;
    sugars_100g?: number;
    fiber_100g?: number;
    salt_100g?: number;
  };
  code?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const NUTRISCORE_COLORS: Record<string, number> = {
  a: 0x1e8f4e,
  b: 0x76c442,
  c: 0xffc107,
  d: 0xff9800,
  e: 0xd32f2f,
};

const NUTRISCORE_EMOJIS: Record<string, string> = {
  a: "🟢",
  b: "🟩",
  c: "🟡",
  d: "🟠",
  e: "🔴",
};

const NOVA_LABELS: Record<number, string> = {
  1: "🥦 NOVA 1 — Unprocessed / minimally processed",
  2: "🧂 NOVA 2 — Processed culinary ingredient",
  3: "🥫 NOVA 3 — Processed food",
  4: "🏭 NOVA 4 — Ultra-processed food",
};

const ECOSCORE_EMOJIS: Record<string, string> = {
  a: "🌿",
  b: "🌱",
  c: "🍃",
  d: "🍂",
  e: "🍁",
};

function fmt(val: number | undefined, unit: string, decimals = 1): string {
  if (val === undefined || val === null) return "—";
  return `${val.toFixed(decimals)} ${unit}`;
}

function isBarcode(query: string): boolean {
  return /^\d{8,14}$/.test(query.trim());
}

async function fetchByBarcode(barcode: string): Promise<OffProduct | null> {
  try {
    const res = await fetch(`${OFF_PRODUCT_URL}/${barcode}.json`, { headers: OFF_HEADERS });
    if (!res.ok) return null;
    const data = await res.json() as { status: number; product?: OffProduct };
    if (data.status !== 1 || !data.product) return null;
    return data.product;
  } catch (err) {
    logger.error({ err }, "OFF barcode fetch error");
    return null;
  }
}

async function searchProduct(query: string): Promise<OffProduct | null> {
  try {
    const params = new URLSearchParams({
      search_terms: query,
      json: "1",
      page_size: "5",
      sort_by: "popularity",
    });
    const res = await fetch(`${OFF_SEARCH_URL}?${params.toString()}`, { headers: OFF_HEADERS });
    if (!res.ok) {
      logger.warn({ status: res.status }, "OFF search non-OK response");
      return null;
    }
    const text = await res.text();
    if (text.trimStart().startsWith("<")) {
      logger.warn("OFF search returned HTML instead of JSON");
      return null;
    }
    const data = JSON.parse(text) as { products?: OffProduct[] };
    const products = (data.products ?? []).filter(
      (p) => p.product_name || p.product_name_en || p.product_name_fr,
    );
    return products[0] ?? null;
  } catch (err) {
    logger.error({ err }, "OFF search error");
    return null;
  }
}

// Tries the query AND fallback variations (brand-only, normalised spelling, etc.)
// so that AI/OCR results like "Haribo Goldbears" still find the product.
async function smartSearch(query: string): Promise<OffProduct | null> {
  const clean = query.trim();
  if (!clean) return null;

  // Build a list of progressively simpler variants to try in order
  const variants: string[] = [clean];

  const words = clean.split(/\s+/).filter((w) => w.length > 1);

  if (words.length >= 2) {
    // "Haribo Gold-Bears" → "Haribo Gold Bears"
    variants.push(clean.replace(/[-_]/g, " "));

    // First two words: "Haribo Goldbears"
    variants.push(words.slice(0, 2).join(" "));

    // Brand only (first word): "Haribo"
    variants.push(words[0]!);

    // Last word only (sometimes the product name is more distinctive): "Goldbears"
    if (words.length > 2) variants.push(words[words.length - 1]!);
  }

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const queue = variants.filter((v) => {
    const k = v.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  for (const variant of queue) {
    logger.info({ variant }, "OFF smart search variant");
    const result = await searchProduct(variant);
    if (result) return result;
  }
  return null;
}

// ── OCR (tesseract, local, no external calls, no storage) ─────────────────────

// Discord CDN supports ?width=N&height=N for server-side resize
function discordResizedUrl(url: string, maxPx = 600): string {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("discordapp.com") || u.hostname.endsWith("discordapp.net")) {
      u.searchParams.set("width", String(maxPx));
      u.searchParams.set("height", String(maxPx));
      return u.toString();
    }
  } catch { /* ignore */ }
  return url;
}

async function downloadImageBuffer(url: string, maxPx = 600): Promise<Buffer | null> {
  const resized = discordResizedUrl(url, maxPx);
  try {
    const res = await fetch(resized, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MaximeGPT/1.0)" },
    });
    if (!res.ok) { logger.warn({ status: res.status }, "Image download failed"); return null; }
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    logger.error({ err }, "downloadImageBuffer error");
    return null;
  }
}

async function preprocessForOcr(buffer: Buffer): Promise<Buffer> {
  try {
    const sharp = (await import("sharp")).default;
    const img = sharp(buffer);
    const meta = await img.metadata();
    const w = meta.width ?? 600;
    const h = meta.height ?? 600;

    // Crop to the central 65% — main product is usually centred/foreground
    const cropW = Math.round(w * 0.65);
    const cropH = Math.round(h * 0.65);
    const left  = Math.round((w - cropW) / 2);
    const top   = Math.round((h - cropH) / 2);

    return await sharp(buffer)
      .extract({ left, top, width: cropW, height: cropH })
      .grayscale()
      .normalize()
      .sharpen({ sigma: 1.2 })
      .linear(1.3, -20)
      .toBuffer();
  } catch {
    return buffer;
  }
}

async function ocrImageBuffer(buffer: Buffer): Promise<string> {
  const processed = await preprocessForOcr(buffer);
  const base = `${tmpdir()}/food_ocr_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tmpPath = `${base}.png`;

  const PSM_MODES = ["3", "6", "11", "1"];

  try {
    await writeFile(tmpPath, processed);
    const results: string[] = [];

    for (const psm of PSM_MODES) {
      try {
        const { stdout } = await execFileAsync(
          "tesseract",
          [tmpPath, "stdout", "-l", "eng+fra", "--psm", psm],
          { timeout: 12_000 },
        );
        const text = stdout.trim();
        if (text) results.push(text);
      } catch { /* skip failed PSM mode */ }
    }

    if (results.length === 0) return "";

    // Pick the result with the most meaningful words
    const scored = results.map((r) => ({
      text: r,
      score: r.split(/\s+/).filter((w) => /[a-zA-ZÀ-ÿ]{2,}/.test(w)).length,
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored[0]!.text;
  } catch (err) {
    logger.warn({ err }, "Tesseract OCR error");
    return "";
  } finally {
    await unlink(tmpPath).catch(() => null);
  }
}

function lineScore(line: string): number {
  // Count tokens that look like real words (4+ letters, no special chars)
  const realWords = line.split(/\s+/).filter((w) => /^[a-zA-ZÀ-ÿ]{4,}$/.test(w));
  const allTokens = line.split(/\s+/).filter(Boolean);
  if (allTokens.length === 0) return 0;
  // Score = real-word ratio weighted by count
  return (realWords.length / allTokens.length) * realWords.length;
}

function extractProductQuery(ocrText: string): string | null {
  if (!ocrText) return null;

  const lines = ocrText
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => {
      if (l.length < 3) return false;
      // Must contain at least one real word (4+ letters, no special chars)
      if (!/[a-zA-ZÀ-ÿ]{4,}/.test(l)) return false;
      // Reject pure numbers/units lines
      if (/^\d[\d\s,.%kKgGmMlL°]*$/.test(l)) return false;
      // Reject lines with too many special characters (price tags, garbled OCR)
      const specialRatio = (l.match(/[^a-zA-ZÀ-ÿ0-9\s]/g) ?? []).length / l.length;
      if (specialRatio > 0.3) return false;
      // Reject lines that are mostly 1-3 char tokens (garbled OCR noise)
      const tokens = l.split(/\s+/).filter(Boolean);
      const shortTokens = tokens.filter((w) => w.length <= 2).length;
      if (tokens.length > 0 && shortTokens / tokens.length > 0.6) return false;
      return true;
    });

  if (lines.length === 0) return null;

  // Pick the two highest-scoring lines (most real words)
  const scored = lines
    .map((l) => ({ line: l, score: lineScore(l) }))
    .filter((x) => x.score >= 0.5)        // must have at least some real words
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;

  const query = scored.slice(0, 2).map((x) => x.line).join(" ")
    .replace(/\s+/g, " ").trim().slice(0, 100);
  return query.length >= 4 ? query : null;
}

// ── Pending vision requests (RAM only, TTL 10 min) ────────────────────────────

interface PendingVision {
  cdnUrl: string;
  ts: number;
}

const pendingVisionMap = new Map<string, PendingVision>();

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingVisionMap) {
    if (now - val.ts > 10 * 60 * 1000) pendingVisionMap.delete(key);
  }
}, 5 * 60 * 1000).unref();

function storePendingVision(userId: string, cdnUrl: string): void {
  pendingVisionMap.set(userId, { cdnUrl, ts: Date.now() });
}

function popPendingVision(userId: string): string | null {
  const v = pendingVisionMap.get(userId);
  pendingVisionMap.delete(userId);
  if (!v || Date.now() - v.ts > 10 * 60 * 1000) return null;
  return v.cdnUrl;
}

// ── AI Vision fallback (Groq, base64 only — external URLs always return 403) ──

const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const VISION_PROMPT =
  "This is a food product photo. Identify the product and reply with ONLY the brand + product name " +
  "(examples: 'Haribo Goldbears', 'Nutella hazelnut spread', 'Coca-Cola Zero'). " +
  "If you clearly see a barcode number, reply with ONLY those digits. " +
  "No explanation. If you truly cannot identify any food product, reply exactly: UNKNOWN";

async function identifyWithAI(cdnUrl: string, openai: OpenAI): Promise<string | null> {
  const buffer = await downloadImageBuffer(cdnUrl, 400);
  if (!buffer) { logger.warn("AI vision: image download failed"); return null; }

  const mimeType = "image/jpeg";
  const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
  logger.info({ sizeKb: Math.round(buffer.length / 1024) }, "Sending base64 to Groq Vision");

  try {
    const response = await openai.chat.completions.create({
      model: VISION_MODEL,
      max_completion_tokens: 80,
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: dataUrl } },
          { type: "text", text: VISION_PROMPT },
        ],
      }],
    });
    const content = response.choices[0]?.message?.content?.trim() ?? "";
    logger.info({ content }, "Groq Vision result");
    if (content && content.toUpperCase() !== "UNKNOWN") return content;
  } catch (err) {
    logger.warn({ err }, "Groq Vision error");
  }
  return null;
}

// ── Button handler — called from bot.ts when user clicks "Try with AI" ────────

export async function handleFoodVisionButton(
  interaction: ButtonInteraction,
  openai: OpenAI | null,
): Promise<void> {
  const cdnUrl = popPendingVision(interaction.user.id);

  if (!cdnUrl) {
    await interaction.reply({ content: "❌ This request has expired. Send the photo again with `!food`.", ephemeral: true });
    return;
  }
  if (!openai) {
    await interaction.reply({ content: "❌ AI not configured (GROQ_API_KEY missing).", ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const identified = await identifyWithAI(cdnUrl, openai);
  if (!identified) {
    await interaction.editReply("❌ AI couldn't identify any food product. Try a clearer photo or type the name: `!food <name>`");
    return;
  }

  await interaction.editReply(`🤖 AI detected: **${identified}** — searching Open Food Facts…`);

  const product = isBarcode(identified)
    ? await fetchByBarcode(identified)
    : await smartSearch(identified);

  if (!product) {
    await interaction.editReply(`❌ AI detected "**${identified}**" but no match found. Try: \`!food ${identified}\``);
    return;
  }

  recordToHistory(interaction.user.id, product, `AI: "${identified}"`);
  const embed = buildProductEmbed(product, false, `🤖 AI: "${identified}"`);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("🔗 View on Open Food Facts")
      .setStyle(ButtonStyle.Link)
      .setURL(product.url ?? `https://world.openfoodfacts.org/product/${product.code ?? ""}`),
  );
  await interaction.editReply({ content: "", embeds: [embed], components: [row] });
}

// ── Embed builder ─────────────────────────────────────────────────────────────

function getProductName(product: OffProduct): string {
  return product.product_name_en || product.product_name || product.product_name_fr || "Unknown product";
}

function getIngredients(product: OffProduct): string | undefined {
  return product.ingredients_text_en || product.ingredients_text;
}

function nutriscoreLabel(grade: string): string {
  const labels: Record<string, string> = {
    a: "Excellent nutritional quality",
    b: "Good nutritional quality",
    c: "Average nutritional quality",
    d: "Poor nutritional quality",
    e: "Very poor nutritional quality",
  };
  return labels[grade] ?? "Unknown quality";
}

function buildProductEmbed(product: OffProduct, showRate = false, detectedAs?: string): EmbedBuilder {
  const name = getProductName(product);
  const brand = product.brands || "Unknown brand";
  const quantity = product.quantity ? ` — ${product.quantity}` : "";
  const nutrigrade = (product.nutriscore_grade ?? "").toLowerCase();
  const nova = product.nova_group;
  const ecoscore = (product.ecoscore_grade ?? "").toLowerCase();
  const nutriments = product.nutriments ?? {};

  const color = NUTRISCORE_COLORS[nutrigrade] ?? 0x5865f2;

  const description = detectedAs
    ? `**${brand}**${quantity}\n*📸 Identified from photo as: "${detectedAs}"*`
    : `**${brand}**${quantity}`;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`🍽️ ${name}`)
    .setURL(product.url ?? `https://world.openfoodfacts.org/product/${product.code ?? ""}`)
    .setDescription(description)
    .setFooter({ text: "Data: Open Food Facts • openfoodfacts.org" });

  const image = product.image_front_url || product.image_url;
  if (image) embed.setThumbnail(image);

  // Nutri-Score
  if (nutrigrade && NUTRISCORE_EMOJIS[nutrigrade]) {
    embed.addFields({
      name: "Nutri-Score",
      value: `${NUTRISCORE_EMOJIS[nutrigrade]} **${nutrigrade.toUpperCase()}** — ${nutriscoreLabel(nutrigrade)}`,
      inline: true,
    });
  } else {
    embed.addFields({ name: "Nutri-Score", value: "❓ Not available", inline: true });
  }

  // NOVA group
  if (nova && NOVA_LABELS[nova]) {
    embed.addFields({ name: "Processing level", value: NOVA_LABELS[nova]!, inline: true });
  } else {
    embed.addFields({ name: "Processing level", value: "❓ Not available", inline: true });
  }

  // Eco-Score
  if (ecoscore && ECOSCORE_EMOJIS[ecoscore]) {
    embed.addFields({
      name: "Eco-Score",
      value: `${ECOSCORE_EMOJIS[ecoscore]} **${ecoscore.toUpperCase()}**`,
      inline: true,
    });
  }

  // Nutritional values per 100g
  const energy = nutriments["energy-kcal_100g"];
  const proteins = nutriments.proteins_100g;
  const fat = nutriments.fat_100g;
  const saturatedFat = nutriments.saturated_fat_100g;
  const sugars = nutriments.sugars_100g;
  const fiber = nutriments.fiber_100g;
  const salt = nutriments.salt_100g;

  const hasNutrients = [energy, proteins, fat, sugars, salt].some((v) => v !== undefined);

  if (hasNutrients) {
    const lines = [
      `🔥 Energy: **${fmt(energy, "kcal")}**`,
      `💪 Protein: **${fmt(proteins, "g")}**`,
      `🧈 Fat: **${fmt(fat, "g")}** (saturated: ${fmt(saturatedFat, "g")})`,
      `🍬 Sugar: **${fmt(sugars, "g")}**`,
      fiber !== undefined ? `🌾 Fiber: **${fmt(fiber, "g")}**` : null,
      `🧂 Salt: **${fmt(salt, "g")}**`,
    ].filter(Boolean).join("\n");

    embed.addFields({ name: "📊 Nutritional values (per 100 g)", value: lines, inline: false });
  }

  // Rate verdict
  if (showRate) {
    embed.addFields({ name: "⚖️ Verdict", value: buildVerdict(nutrigrade, nova), inline: false });
  }

  // Ingredients (truncated)
  const ingredients = getIngredients(product);
  if (ingredients) {
    const truncated = ingredients.length > 300 ? ingredients.slice(0, 300) + "…" : ingredients;
    embed.addFields({ name: "🧪 Ingredients", value: truncated, inline: false });
  }

  return embed;
}

function buildVerdict(nutrigrade: string, nova: number | undefined): string {
  type VerdictKey = "great" | "good" | "meh" | "bad" | "terrible" | "unknown";

  let key: VerdictKey = "unknown";
  if (nutrigrade === "a" && (!nova || nova <= 2)) key = "great";
  else if (nutrigrade === "a" || nutrigrade === "b") key = "good";
  else if (nutrigrade === "c" || (nova && nova === 3)) key = "meh";
  else if (nutrigrade === "d" || (nova && nova === 4)) key = "bad";
  else if (nutrigrade === "e") key = "terrible";

  const verdicts: Record<VerdictKey, string[]> = {
    great: [
      "🏆 Absolute winner! This product is a nutritional gem. Go for it!",
      "⭐ Nutri-Score A and barely processed? You found the holy grail of snacks.",
      "🥇 Congrats on your excellent taste — this product is top tier!",
    ],
    good: [
      "👍 Not perfect, but genuinely solid! A good everyday option.",
      "✅ Decent Nutri-Score — you can enjoy this without too much guilt.",
      "🙂 Good without being exceptional. Balance is everything!",
    ],
    meh: [
      "😐 Average, like a Monday morning. Enjoy in moderation.",
      "⚠️ Nutri-Score C… not great, not terrible. Make it the exception, not the rule.",
      "🤷 Meh. Could be worse, could be better. Your call.",
    ],
    bad: [
      "😬 Nutri-Score D — the kind of product that makes dietitians cry.",
      "🚨 Eat this rarely! Your body deserves better.",
      "💀 D for Dangerous? Not quite, but definitely limit this one.",
    ],
    terrible: [
      "🔥 Nutri-Score E! This is basically a nutritional weapon. Save it for cheat days.",
      "❌ It probably tastes amazing — that's exactly the problem.",
      "🚫 Nutri-Score E… even junk food is embarrassed. Extreme moderation advised.",
    ],
    unknown: [
      "🔍 Incomplete nutritional data. Open Food Facts doesn't have the full picture on this one.",
      "❓ Nutri-Score not available. Trust your instincts — or the label on the box.",
    ],
  };

  const pool = verdicts[key];
  return pool[Math.floor(Math.random() * pool.length)]!;
}

// ── History helpers ────────────────────────────────────────────────────────────

function recordToHistory(discordId: string, product: OffProduct, detectedAs: string): void {
  const name = getProductName(product);
  saveFoodHistory(discordId, {
    productName: name,
    brand: product.brands ?? "Unknown brand",
    nutriscoreGrade: (product.nutriscore_grade ?? "").toLowerCase(),
    code: product.code ?? "",
    detectedAs,
    lookedUpAt: new Date(),
  }).catch(() => null);
}

const NUTRISCORE_BADGE: Record<string, string> = { a: "🟢 A", b: "🟩 B", c: "🟡 C", d: "🟠 D", e: "🔴 E" };

async function handleFoodHistory(message: Message): Promise<void> {
  if (!isMongoConnected()) {
    await message.reply("❌ History unavailable — database not connected.");
    return;
  }

  const entries = await getFoodHistory(message.author.id);

  if (entries.length === 0) {
    await message.reply("📭 No food history yet. Look up a product with `!food <name>` or a photo!");
    return;
  }

  const lines = [...entries].reverse().map((e, i) => {
    const badge = NUTRISCORE_BADGE[e.nutriscoreGrade] ?? "❓";
    const ts = `<t:${Math.floor(new Date(e.lookedUpAt).getTime() / 1000)}:R>`;
    return `**${i + 1}.** ${badge} **${e.productName}** — *${e.brand}* ${ts}`;
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🍽️ Your food history")
    .setDescription(lines.join("\n"))
    .setFooter({ text: `Last ${entries.length} products • !food clear to reset` });

  await message.reply({ embeds: [embed] });
}

// ── Core lookup (shared by both handlers) ─────────────────────────────────────

async function lookupAndReply(
  message: Message,
  query: string,
  showRate: boolean,
  openai: OpenAI | null,
  detectedAs?: string,
): Promise<void> {
  const waitMsg = await message.reply(
    showRate ? `⚖️ Analysing **${query}**…` : "🔍 Searching Open Food Facts…",
  );

  const product = isBarcode(query)
    ? await fetchByBarcode(query)
    : await smartSearch(query);

  if (!product) {
    await waitMsg.edit(`❌ No product found for **${query}**. Try a different name or use the barcode.`);
    return;
  }

  recordToHistory(message.author.id, product, detectedAs ?? "manual");

  const embed = buildProductEmbed(product, showRate, detectedAs);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("🔗 View on Open Food Facts")
      .setStyle(ButtonStyle.Link)
      .setURL(product.url ?? `https://world.openfoodfacts.org/product/${product.code ?? ""}`),
  );

  await waitMsg.delete().catch(() => null);
  await message.reply({ embeds: [embed], components: [row] });
}

// ── Public handlers ─────────────────────────────────────────────────────────────

export async function handleFood(message: Message, args: string[], openai: OpenAI | null): Promise<void> {
  const sub = args[0]?.toLowerCase();

  // !food history
  if (sub === "history") {
    await handleFoodHistory(message);
    return;
  }

  // !food clear
  if (sub === "clear") {
    if (!isMongoConnected()) {
      await message.reply("❌ History unavailable — database not connected.");
      return;
    }
    await clearFoodHistory(message.author.id);
    await message.reply("🗑️ Your food history has been cleared.");
    return;
  }

  // !food rate <product> → rate mode
  if (sub === "rate") {
    args.shift();
    await handleFoodRate(message, args, openai);
    return;
  }

  // Photo detection — image attached with no text query
  const attachment = message.attachments.first();
  const query = args.join(" ").trim();

  if (attachment && !query) {
    const isImage = attachment.contentType?.startsWith("image/") ?? false;
    if (!isImage) {
      await message.reply("❌ Please attach an image file (JPG, PNG, WEBP…).");
      return;
    }

    const waitMsg = await message.reply("📸 Reading photo with OCR…");

    // ── Step 1: OCR (local, no AI, no external calls) ─────────────────────────
    const buffer = await downloadImageBuffer(attachment.url, 600);
    if (!buffer) {
      await waitMsg.edit("❌ Couldn't download the image. Try again.");
      return;
    }

    const ocrText = await ocrImageBuffer(buffer);
    const ocrQuery = extractProductQuery(ocrText);
    logger.info({ ocrQuery, ocrLines: ocrText.split("\n").length }, "OCR result");

    if (ocrQuery) {
      await waitMsg.edit(`🔍 Read: **${ocrQuery}** — searching Open Food Facts…`);

      const product = isBarcode(ocrQuery)
        ? await fetchByBarcode(ocrQuery)
        : await smartSearch(ocrQuery);

      if (product) {
        recordToHistory(message.author.id, product, `OCR: "${ocrQuery}"`);
        const embed = buildProductEmbed(product, false, `📷 OCR: "${ocrQuery}"`);
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel("🔗 View on Open Food Facts")
            .setStyle(ButtonStyle.Link)
            .setURL(product.url ?? `https://world.openfoodfacts.org/product/${product.code ?? ""}`),
        );
        await waitMsg.delete().catch(() => null);
        await message.reply({ embeds: [embed], components: [row] });
        return;
      }

      // OCR found text but no product match — offer AI or manual search
      const noMatchMsg = `🔍 OCR read "**${ocrQuery}**" but found no match on Open Food Facts.\n` +
        `• Try manually: \`!food ${ocrQuery}\``;

      if (openai) {
        storePendingVision(message.author.id, attachment.url);
        const aiRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`food_vision_${message.author.id}`)
            .setLabel("🤖 Try with AI")
            .setStyle(ButtonStyle.Primary),
        );
        await waitMsg.edit({ content: noMatchMsg, components: [aiRow] });
      } else {
        await waitMsg.edit(noMatchMsg);
      }
      return;
    }

    // ── Step 2: OCR found nothing — offer AI button or manual search ───────────
    const noOcrMsg = "📷 OCR couldn't read any text from this photo.\n" +
      "• Type the product name: `!food <name>`";

    if (openai) {
      storePendingVision(message.author.id, attachment.url);
      const aiRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`food_vision_${message.author.id}`)
          .setLabel("🤖 Try with AI")
          .setStyle(ButtonStyle.Primary),
      );
      await waitMsg.edit({ content: noOcrMsg, components: [aiRow] });
    } else {
      await waitMsg.edit(noOcrMsg);
    }
    return;
  }

  // No query and no image → show help
  if (!query && !attachment) {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🍽️ Food Command")
      .setDescription(
        "Look up any food product on Open Food Facts!\n\n" +
        "**`!food <name or barcode>`** — Nutritional info\n" +
        "**`!food rate <name>`** — Rate & verdict for a product\n" +
        "**`!rate food <name>`** — Same thing\n" +
        "**`!food` + 📎 photo** — Detect product from a photo\n\n" +
        "**Examples:**\n" +
        "`!food nutella`\n" +
        "`!food coca-cola`\n" +
        "`!food 3017620422003`\n" +
        "`!food rate oreo`",
      )
      .setFooter({ text: "Data: Open Food Facts (openfoodfacts.org)" });
    await message.reply({ embeds: [embed] });
    return;
  }

  await lookupAndReply(message, query, false, openai);
}

export async function handleFoodRate(message: Message, args: string[], openai: OpenAI | null): Promise<void> {
  const query = args.join(" ").trim();
  if (!query) {
    await message.reply("❓ Tell me what to rate! Example: `!food rate nutella`");
    return;
  }
  await lookupAndReply(message, query, true, openai);
}
