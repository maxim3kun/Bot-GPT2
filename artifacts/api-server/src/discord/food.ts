import { execFile } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { promisify } from "util";

import { Message, ButtonInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import OpenAI from "openai";
import { logger } from "../lib/logger.js";
import { saveFoodHistory, getFoodHistory, clearFoodHistory, isMongoConnected } from "../lib/db.js";
import { getEffectiveLanguage } from "./effective-language.js";

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
  ingredients_text_fr?: string;
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

export type FoodLanguage = "en" | "fr";

export function foodText(language: FoodLanguage, english: string, french: string): string {
  return language === "fr" ? french : english;
}

function foodLanguage(message: Pick<Message, "guildId" | "author">): FoodLanguage {
  return getEffectiveLanguage(message.guildId, message.author.id) === "fr" ? "fr" : "en";
}

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

const ECOSCORE_EMOJIS: Record<string, string> = {
  a: "🌿",
  b: "🌱",
  c: "🍃",
  d: "🍂",
  e: "🍁",
};

function fmt(val: number | undefined, unit: string, language: FoodLanguage, decimals = 1): string {
  if (val === undefined || val === null) return "—";
  const formatted = val.toLocaleString(language === "fr" ? "fr-FR" : "en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${formatted} ${unit}`;
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

// ── Barcode detection (zbarimg — EAN/UPC/QR) ──────────────────────────────────

async function detectBarcode(buffer: Buffer): Promise<string | null> {
  const tmpPath = `${tmpdir()}/food_barcode_${Date.now()}_${Math.random().toString(36).slice(2)}.png`;
  try {
    // Scale up to 1600px wide — zbarimg needs high resolution to decode barcodes reliably
    const sharp = (await import("sharp")).default;
    const meta = await sharp(buffer).metadata();
    const w = meta.width ?? 800;
    const upscaled = w < 1600
      ? await sharp(buffer).resize(1600, null, { kernel: "lanczos3" }).grayscale().toBuffer()
      : await sharp(buffer).grayscale().toBuffer();

    await writeFile(tmpPath, upscaled);

    // Simple flags: just raw output and quiet — let zbar use all symbologies
    const { stdout } = await execFileAsync(
      "zbarimg",
      ["--raw", "-q", tmpPath],
      { timeout: 10_000 },
    );

    // zbarimg outputs one code per line, take first digit-only EAN/UPC (8-14 digits)
    const code = stdout.trim().split("\n")
      .map((l) => l.trim())
      .find((l) => /^\d{8,14}$/.test(l)) ?? null;

    logger.info({ code, stdout: stdout.trim().slice(0, 100) }, "zbarimg output");
    return code;
  } catch (err) {
    logger.warn({ err }, "detectBarcode error");
    return null;
  } finally {
    await unlink(tmpPath).catch(() => null);
  }
}

async function preprocessForOcr(buffer: Buffer): Promise<Buffer> {
  try {
    const sharp = (await import("sharp")).default;
    return await sharp(buffer)
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
  // Count tokens that look like real words (3+ letters, no special chars)
  const realWords = line.split(/\s+/).filter((w) => /^[a-zA-ZÀ-ÿ]{3,}$/.test(w));
  const allTokens = line.split(/\s+/).filter(Boolean);
  if (allTokens.length === 0) return 0;
  return (realWords.length / allTokens.length) * realWords.length;
}

function extractProductQuery(ocrText: string): string | null {
  if (!ocrText) return null;

  const lines = ocrText
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => {
      if (l.length < 2) return false;
      // Must contain at least one letter sequence (3+)
      if (!/[a-zA-ZÀ-ÿ]{3,}/.test(l)) return false;
      // Reject pure numbers/units lines
      if (/^\d[\d\s,.%kKgGmMlL°]*$/.test(l)) return false;
      // Reject lines with too many special characters (price tags, garbled OCR)
      const specialRatio = (l.match(/[^a-zA-ZÀ-ÿ0-9\s]/g) ?? []).length / l.length;
      if (specialRatio > 0.35) return false;
      // Reject lines that are mostly 1-2 char tokens (garbled OCR noise like "mm TN E")
      const tokens = l.split(/\s+/).filter(Boolean);
      const shortTokens = tokens.filter((w) => w.length <= 2).length;
      if (tokens.length >= 3 && shortTokens / tokens.length > 0.6) return false;
      return true;
    });

  if (lines.length === 0) return null;

  // Pick the two highest-scoring lines (most real words)
  const scored = lines
    .map((l) => ({ line: l, score: lineScore(l) }))
    .filter((x) => x.score >= 0.3)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;

  const query = scored.slice(0, 2).map((x) => x.line).join(" ")
    .replace(/\s+/g, " ").trim().slice(0, 100);
  return query.length >= 3 ? query : null;
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
  const language = getEffectiveLanguage(interaction.guildId, interaction.user.id) === "fr" ? "fr" : "en";
  const text = (en: string, fr: string) => foodText(language, en, fr);
  const cdnUrl = popPendingVision(interaction.user.id);

  if (!cdnUrl) {
    await interaction.reply({ content: text("❌ This request has expired. Send the photo again with `!food`.", "❌ Cette demande a expiré. Renvoie la photo avec `!food`."), ephemeral: true });
    return;
  }
  if (!openai) {
    await interaction.reply({ content: text("❌ AI is unavailable right now.", "❌ L’IA est indisponible pour le moment."), ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const identified = await identifyWithAI(cdnUrl, openai);
  if (!identified) {
    await interaction.editReply(text("❌ AI couldn't identify a food product. Try a clearer photo or type its name: `!food <name>`", "❌ L’IA n’a pas identifié de produit alimentaire. Essaie une photo plus nette ou saisis son nom : `!food <nom>`"));
    return;
  }

  await interaction.editReply(text(`🤖 AI detected: **${identified}** — searching Open Food Facts…`, `🤖 Produit identifié : **${identified}** — recherche sur Open Food Facts…`));

  const product = isBarcode(identified)
    ? await fetchByBarcode(identified)
    : await smartSearch(identified);

  if (!product) {
    await interaction.editReply(text(`❌ AI detected "**${identified}**" but no match was found. Try: \`!food ${identified}\``, `❌ Aucun résultat pour "**${identified}**". Essaie : \`!food ${identified}\``));
    return;
  }

  recordToHistory(interaction.user.id, product, `AI: "${identified}"`, language);
  const embed = buildProductEmbed(
    product,
    false,
    `${language === "fr" ? "🤖 IA" : "🤖 AI"} : "${identified}"`,
    language,
  );
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel(text("🔗 View on Open Food Facts", "🔗 Voir sur Open Food Facts"))
      .setStyle(ButtonStyle.Link)
      .setURL(product.url ?? `https://world.openfoodfacts.org/product/${product.code ?? ""}`),
  );
  await interaction.editReply({ content: "", embeds: [embed], components: [row] });
}

// ── Embed builder ─────────────────────────────────────────────────────────────

function getProductName(product: OffProduct, language: FoodLanguage = "en"): string {
  return language === "fr"
    ? product.product_name_fr || product.product_name || product.product_name_en || "Produit inconnu"
    : product.product_name_en || product.product_name || product.product_name_fr || "Unknown product";
}

function getIngredients(product: OffProduct, language: FoodLanguage): string | undefined {
  return language === "fr"
    ? product.ingredients_text_fr || product.ingredients_text || product.ingredients_text_en
    : product.ingredients_text_en || product.ingredients_text || product.ingredients_text_fr;
}

function nutriscoreLabel(grade: string, language: FoodLanguage): string {
  const labels: Record<string, { en: string; fr: string }> = {
    a: { en: "Excellent nutritional quality", fr: "Qualité nutritionnelle excellente" },
    b: { en: "Good nutritional quality", fr: "Bonne qualité nutritionnelle" },
    c: { en: "Average nutritional quality", fr: "Qualité nutritionnelle moyenne" },
    d: { en: "Lower nutritional quality", fr: "Qualité nutritionnelle moins favorable" },
    e: { en: "Lowest nutritional quality", fr: "Qualité nutritionnelle peu favorable" },
  };
  const label = labels[grade];
  return label ? foodText(language, label.en, label.fr) : foodText(language, "Not available", "Non disponible");
}

function novaLabel(group: number, language: FoodLanguage): string {
  const labels: Record<number, { en: string; fr: string }> = {
    1: { en: "🥦 NOVA 1 — Unprocessed or minimally processed", fr: "🥦 NOVA 1 — Non transformé ou peu transformé" },
    2: { en: "🧂 NOVA 2 — Processed culinary ingredient", fr: "🧂 NOVA 2 — Ingrédient culinaire transformé" },
    3: { en: "🥫 NOVA 3 — Processed food", fr: "🥫 NOVA 3 — Aliment transformé" },
    4: { en: "🏭 NOVA 4 — Ultra-processed food", fr: "🏭 NOVA 4 — Aliment ultra-transformé" },
  };
  const label = labels[group];
  return label ? foodText(language, label.en, label.fr) : foodText(language, "Not available", "Non disponible");
}

export function buildProductEmbed(
  product: OffProduct,
  showRate = false,
  detectedAs?: string,
  language: FoodLanguage = "en",
): EmbedBuilder {
  const text = (en: string, fr: string) => foodText(language, en, fr);
  const name = getProductName(product, language);
  const brand = product.brands || text("Unknown brand", "Marque inconnue");
  const quantity = product.quantity ? ` — ${product.quantity}` : "";
  const nutrigrade = (product.nutriscore_grade ?? "").toLowerCase();
  const nova = product.nova_group;
  const ecoscore = (product.ecoscore_grade ?? "").toLowerCase();
  const nutriments = product.nutriments ?? {};

  const color = NUTRISCORE_COLORS[nutrigrade] ?? 0x5865f2;

  const description = detectedAs
    ? `**${brand}**${quantity}\n*📸 ${text(`Identified from photo as: "${detectedAs}"`, `Identifié sur la photo : "${detectedAs}"`)}*`
    : `**${brand}**${quantity}`;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`🍽️ ${name}`)
    .setURL(product.url ?? `https://world.openfoodfacts.org/product/${product.code ?? ""}`)
    .setDescription(description)
    .setFooter({ text: text("Data: Open Food Facts • openfoodfacts.org", "Données : Open Food Facts • openfoodfacts.org") });

  const image = product.image_front_url || product.image_url;
  if (image) embed.setThumbnail(image);

  // Nutri-Score
  if (nutrigrade && NUTRISCORE_EMOJIS[nutrigrade]) {
    embed.addFields({
      name: "Nutri-Score",
      value: `${NUTRISCORE_EMOJIS[nutrigrade]} **${nutrigrade.toUpperCase()}** — ${nutriscoreLabel(nutrigrade, language)}`,
      inline: true,
    });
  } else {
    embed.addFields({ name: "Nutri-Score", value: text("❓ Not available", "❓ Non disponible"), inline: true });
  }

  // NOVA group
  if (nova && nova >= 1 && nova <= 4) {
    embed.addFields({ name: text("Processing level", "Niveau de transformation"), value: novaLabel(nova, language), inline: true });
  } else {
    embed.addFields({ name: text("Processing level", "Niveau de transformation"), value: text("❓ Not available", "❓ Non disponible"), inline: true });
  }

  // Eco-Score
  if (ecoscore && ECOSCORE_EMOJIS[ecoscore]) {
    embed.addFields({
      name: "Eco-Score",
      value: `${ECOSCORE_EMOJIS[ecoscore]} **${ecoscore.toUpperCase()}** · ${text("environmental indicator", "indicateur environnemental")}`,
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
    const colon = language === "fr" ? " : " : ": ";
    const lines = [
      `🔥 ${text("Energy", "Énergie")}${colon}**${fmt(energy, "kcal", language)}**`,
      `💪 ${text("Protein", "Protéines")}${colon}**${fmt(proteins, "g", language)}**`,
      `🧈 ${text("Fat", "Matières grasses")}${colon}**${fmt(fat, "g", language)}** (${text("saturated", "dont saturées")}${colon}${fmt(saturatedFat, "g", language)})`,
      `🍬 ${text("Sugar", "Sucres")}${colon}**${fmt(sugars, "g", language)}**`,
      fiber !== undefined ? `🌾 ${text("Fiber", "Fibres")}${colon}**${fmt(fiber, "g", language)}**` : null,
      `🧂 ${text("Salt", "Sel")}${colon}**${fmt(salt, "g", language)}**`,
    ].filter(Boolean).join("\n");

    embed.addFields({ name: text("📊 Nutritional values (per 100 g)", "📊 Valeurs nutritionnelles (pour 100 g)"), value: lines, inline: false });
  }

  // Rate verdict
  if (showRate) {
    embed.addFields({ name: text("⚖️ Summary", "⚖️ Résumé"), value: buildVerdict(nutrigrade, language), inline: false });
  }

  // Ingredients (truncated)
  const ingredients = getIngredients(product, language);
  if (ingredients) {
    const truncated = ingredients.length > 300 ? ingredients.slice(0, 300) + "…" : ingredients;
    embed.addFields({ name: text("🧪 Ingredients", "🧪 Ingrédients"), value: truncated, inline: false });
  }

  return embed;
}

function buildVerdict(nutrigrade: string, language: FoodLanguage): string {
  const labels: Record<string, { en: string; fr: string }> = {
    a: { en: "the most favorable grade in this indicator", fr: "la classe la plus favorable de cet indicateur" },
    b: { en: "a favorable grade in this indicator", fr: "une classe favorable de cet indicateur" },
    c: { en: "the middle grade in this indicator", fr: "la classe intermédiaire de cet indicateur" },
    d: { en: "a less favorable grade in this indicator", fr: "une classe moins favorable de cet indicateur" },
    e: { en: "the least favorable grade in this indicator", fr: "la classe la moins favorable de cet indicateur" },
  };
  const grade = labels[nutrigrade];
  if (!grade) {
    return foodText(
      language,
      "Nutri-Score is unavailable. The listed nutrition data may still help; product information can be incomplete.",
      "Nutri-Score indisponible. Les valeurs nutritionnelles restent consultables, mais les données du produit peuvent être incomplètes.",
    );
  }
  return foodText(
    language,
    `Nutri-Score ${nutrigrade.toUpperCase()}: ${grade.en}. This indicator alone does not assess the whole product.`,
    `Nutri-Score ${nutrigrade.toUpperCase()} : ${grade.fr}. Cet indicateur ne résume pas à lui seul l’ensemble du produit.`,
  );
}

// ── History helpers ────────────────────────────────────────────────────────────

function recordToHistory(discordId: string, product: OffProduct, detectedAs: string, language: FoodLanguage): void {
  const name = getProductName(product, language);
  saveFoodHistory(discordId, {
    productName: name,
    brand: product.brands ?? foodText(language, "Unknown brand", "Marque inconnue"),
    nutriscoreGrade: (product.nutriscore_grade ?? "").toLowerCase(),
    code: product.code ?? "",
    detectedAs,
    lookedUpAt: new Date(),
  }).catch(() => null);
}

const NUTRISCORE_BADGE: Record<string, string> = { a: "🟢 A", b: "🟩 B", c: "🟡 C", d: "🟠 D", e: "🔴 E" };

async function handleFoodHistory(message: Message): Promise<void> {
  const language = foodLanguage(message);
  const text = (en: string, fr: string) => foodText(language, en, fr);
  if (!isMongoConnected()) {
    await message.reply(text("❌ History is unavailable because the database is not connected.", "❌ L’historique est indisponible, car la base de données n’est pas connectée."));
    return;
  }

  const entries = await getFoodHistory(message.author.id);

  if (entries.length === 0) {
    await message.reply(text("📭 No food history yet. Look up a product with `!food <name>` or a photo.", "📭 Aucun historique pour le moment. Recherche un produit avec `!food <nom>` ou une photo."));
    return;
  }

  const lines = [...entries].reverse().map((e, i) => {
    const badge = NUTRISCORE_BADGE[e.nutriscoreGrade] ?? "❓";
    const ts = `<t:${Math.floor(new Date(e.lookedUpAt).getTime() / 1000)}:R>`;
    return `**${i + 1}.** ${badge} **${e.productName}** — *${e.brand}* ${ts}`;
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(text("🍽️ Your food history", "🍽️ Ton historique alimentaire"))
    .setDescription(lines.join("\n"))
    .setFooter({ text: text(`Last ${entries.length} products • !food clear to reset`, `${entries.length} derniers produits • !food clear pour effacer`) });

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
  const language = foodLanguage(message);
  const text = (en: string, fr: string) => foodText(language, en, fr);
  const waitMsg = await message.reply(
    showRate
      ? text(`⚖️ Checking **${query}**…`, `⚖️ Recherche de **${query}**…`)
      : text("🔍 Searching Open Food Facts…", "🔍 Recherche sur Open Food Facts…"),
  );

  const product = isBarcode(query)
    ? await fetchByBarcode(query)
    : await smartSearch(query);

  if (!product) {
    await waitMsg.edit(text(`❌ No product found for **${query}**. Try another name or use its barcode.`, `❌ Aucun produit trouvé pour **${query}**. Essaie un autre nom ou son code-barres.`));
    return;
  }

  recordToHistory(message.author.id, product, detectedAs ?? "manual", language);

  const embed = buildProductEmbed(product, showRate, detectedAs, language);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel(text("🔗 View on Open Food Facts", "🔗 Voir sur Open Food Facts"))
      .setStyle(ButtonStyle.Link)
      .setURL(product.url ?? `https://world.openfoodfacts.org/product/${product.code ?? ""}`),
  );

  await waitMsg.delete().catch(() => null);
  await message.reply({ embeds: [embed], components: [row] });
}

// ── Public handlers ─────────────────────────────────────────────────────────────

export async function handleFood(message: Message, args: string[], openai: OpenAI | null): Promise<void> {
  const language = foodLanguage(message);
  const text = (en: string, fr: string) => foodText(language, en, fr);
  const sub = args[0]?.toLowerCase();

  // !food history
  if (sub === "history") {
    await handleFoodHistory(message);
    return;
  }

  // !food clear
  if (sub === "clear") {
    if (!isMongoConnected()) {
      await message.reply(text("❌ History is unavailable because the database is not connected.", "❌ L’historique est indisponible, car la base de données n’est pas connectée."));
      return;
    }
    await clearFoodHistory(message.author.id);
    await message.reply(text("🗑️ Your food history has been cleared.", "🗑️ Ton historique alimentaire a été effacé."));
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
      await message.reply(text("❌ Please attach an image file (JPG, PNG, WEBP…).", "❌ Joins un fichier image (JPG, PNG, WEBP…)."));
      return;
    }

    const waitMsg = await message.reply(text("📸 Scanning photo…", "📸 Analyse de la photo…"));

    const buffer = await downloadImageBuffer(attachment.url, 2000);
    if (!buffer) {
      await waitMsg.edit(text("❌ Couldn't download the image. Try again.", "❌ Impossible de télécharger l’image. Réessaie."));
      return;
    }

    // ── Step 1: Barcode (most reliable — EAN/UPC on every food product) ────────
    const barcode = await detectBarcode(buffer);
    logger.info({ barcode }, "Barcode detection result");

    if (barcode) {
      await waitMsg.edit(text(`🔢 Barcode detected: **${barcode}** — searching Open Food Facts…`, `🔢 Code-barres détecté : **${barcode}** — recherche sur Open Food Facts…`));
      const product = await fetchByBarcode(barcode);
      if (product) {
        recordToHistory(message.author.id, product, `barcode: ${barcode}`, language);
        const embed = buildProductEmbed(product, false, `${language === "fr" ? "🔢 Code-barres" : "🔢 Barcode"} : ${barcode}`, language);
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel(text("🔗 View on Open Food Facts", "🔗 Voir sur Open Food Facts"))
            .setStyle(ButtonStyle.Link)
            .setURL(product.url ?? `https://world.openfoodfacts.org/product/${barcode}`),
        );
        await waitMsg.delete().catch(() => null);
        await message.reply({ embeds: [embed], components: [row] });
        return;
      }
      await waitMsg.edit(text(`🔢 Barcode **${barcode}** not found on Open Food Facts. Trying text recognition…`, `🔢 Code-barres **${barcode}** introuvable sur Open Food Facts. Essai de reconnaissance du texte…`));
    }

    // ── Step 2: OCR text recognition ──────────────────────────────────────────
    await waitMsg.edit(text("🔍 Trying text recognition (OCR)…", "🔍 Reconnaissance du texte (OCR)…"));
    const ocrText = await ocrImageBuffer(buffer);
    const ocrQuery = extractProductQuery(ocrText);
    logger.info({ ocrQuery, ocrLines: ocrText.split("\n").length }, "OCR result");

    if (ocrQuery) {
      await waitMsg.edit(text(`🔍 Read: **${ocrQuery}** — searching Open Food Facts…`, `🔍 Texte détecté : **${ocrQuery}** — recherche sur Open Food Facts…`));

      const product = isBarcode(ocrQuery)
        ? await fetchByBarcode(ocrQuery)
        : await smartSearch(ocrQuery);

      if (product) {
        recordToHistory(message.author.id, product, `OCR: "${ocrQuery}"`, language);
        const embed = buildProductEmbed(product, false, `📷 OCR : "${ocrQuery}"`, language);
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel(text("🔗 View on Open Food Facts", "🔗 Voir sur Open Food Facts"))
            .setStyle(ButtonStyle.Link)
            .setURL(product.url ?? `https://world.openfoodfacts.org/product/${product.code ?? ""}`),
        );
        await waitMsg.delete().catch(() => null);
        await message.reply({ embeds: [embed], components: [row] });
        return;
      }

      // OCR found text but no product match — offer AI or manual search
      const noMatchMsg = text(
        `🔍 OCR read "**${ocrQuery}**" but found no match on Open Food Facts.\n• Search manually: \`!food ${ocrQuery}\``,
        `🔍 Aucun résultat Open Food Facts pour "**${ocrQuery}**".\n• Recherche manuelle : \`!food ${ocrQuery}\``,
      );

      if (openai) {
        storePendingVision(message.author.id, attachment.url);
        const aiRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`food_vision_${message.author.id}`)
            .setLabel(text("🤖 Try with AI", "🤖 Essayer avec l’IA"))
            .setStyle(ButtonStyle.Primary),
        );
        await waitMsg.edit({ content: noMatchMsg, components: [aiRow] });
      } else {
        await waitMsg.edit(noMatchMsg);
      }
      return;
    }

    // ── Step 2: OCR found nothing — offer AI button or manual search ───────────
    const noOcrMsg = text(
      "📷 OCR couldn't read any text from this photo.\n• Type the product name: `!food <name>`",
      "📷 Aucun texte détecté sur la photo.\n• Saisis le nom du produit : `!food <nom>`",
    );

    if (openai) {
      storePendingVision(message.author.id, attachment.url);
      const aiRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`food_vision_${message.author.id}`)
          .setLabel(text("🤖 Try with AI", "🤖 Essayer avec l’IA"))
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
      .setTitle(text("🍽️ Food", "🍽️ Alimentation"))
      .setDescription(text(
        "Look up a product on Open Food Facts:\n`!food <name or barcode>` · `!food rate <name>`\n`!food` + 📎 photo · `!food history` · `!food clear`\n\nExamples: `!food nutella` · `!food 3017620422003`",
        "Recherche un produit sur Open Food Facts :\n`!food <nom ou code-barres>` · `!food rate <nom>`\n`!food` + 📎 photo · `!food history` · `!food clear`\n\nExemples : `!food nutella` · `!food 3017620422003`",
      ))
      .setFooter({ text: text("Data: Open Food Facts • openfoodfacts.org", "Données : Open Food Facts • openfoodfacts.org") });
    await message.reply({ embeds: [embed] });
    return;
  }

  await lookupAndReply(message, query, false, openai);
}

export async function handleFoodRate(message: Message, args: string[], openai: OpenAI | null): Promise<void> {
  const query = args.join(" ").trim();
  if (!query) {
    await message.reply(foodText(foodLanguage(message), "❓ Enter a product name to check. Example: `!food rate nutella`", "❓ Indique le nom d’un produit. Exemple : `!food rate nutella`"));
    return;
  }
  await lookupAndReply(message, query, true, openai);
}
