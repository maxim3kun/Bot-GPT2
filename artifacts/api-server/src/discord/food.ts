import { Message, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import OpenAI from "openai";
import { logger } from "../lib/logger.js";

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

// ── Vision: identify product from photo ───────────────────────────────────────

async function imageUrlToBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MaximeGPT/1.0)" },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const mimeType = contentType.split(";")[0]!.trim();
    const buffer = await res.arrayBuffer();
    const data = Buffer.from(buffer).toString("base64");
    return { data, mimeType };
  } catch (err) {
    logger.error({ err }, "Failed to download image for Vision");
    return null;
  }
}

async function identifyProductFromImage(
  imageUrl: string,
  openai: OpenAI,
): Promise<string | null> {
  try {
    // Download the image and encode as base64 — Groq Vision cannot reach Discord CDN URLs
    const encoded = await imageUrlToBase64(imageUrl);
    if (!encoded) {
      logger.warn("Could not download image for Vision");
      return null;
    }

    const dataUrl = `data:${encoded.mimeType};base64,${encoded.data}`;

    const response = await openai.chat.completions.create({
      model: "llama-3.2-11b-vision-preview",
      max_completion_tokens: 120,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
            {
              type: "text",
              text:
                "Look at this food product image. " +
                "Reply with ONLY the brand name and product name (e.g. 'Nutella hazelnut spread' or 'Haribo Goldbears' or 'Coca-Cola Zero'). " +
                "If you can read a barcode number clearly, reply with ONLY the barcode digits. " +
                "Do not add any explanation. If you cannot identify any food product at all, reply with exactly: UNKNOWN",
            },
          ],
        },
      ],
    });
    const content = response.choices[0]?.message?.content?.trim() ?? "";
    logger.info({ content }, "Vision product identification");
    if (!content || content.toUpperCase() === "UNKNOWN") return null;
    return content;
  } catch (err) {
    logger.error({ err }, "Vision API error");
    return null;
  }
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
    : await searchProduct(query);

  if (!product) {
    await waitMsg.edit(`❌ No product found for **${query}**. Try a different name or use the barcode.`);
    return;
  }

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
  // !food rate <product> → rate mode
  if (args[0]?.toLowerCase() === "rate") {
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
    if (!openai) {
      await message.reply("❌ AI features are not configured — image detection requires GROQ_API_KEY.");
      return;
    }

    const waitMsg = await message.reply("📸 Analysing your photo with AI…");

    const identified = await identifyProductFromImage(attachment.url, openai);
    if (!identified) {
      await waitMsg.edit("❌ Couldn't identify any food product in this photo. Try a clearer picture or type the name: `!food coca-cola`");
      return;
    }

    await waitMsg.edit(`🔍 Detected **${identified}** — searching Open Food Facts…`);
    await new Promise((r) => setTimeout(r, 800));

    const searchQuery = identified;
    const product = isBarcode(searchQuery)
      ? await fetchByBarcode(searchQuery)
      : await searchProduct(searchQuery);

    if (!product) {
      await waitMsg.edit(`❌ AI detected "**${identified}**" but found no match on Open Food Facts. Try typing the name manually: \`!food ${identified}\``);
      return;
    }

    const embed = buildProductEmbed(product, false, identified);
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
