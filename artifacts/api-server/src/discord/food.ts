import { Message, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { logger } from "../lib/logger.js";

// ── Open Food Facts API ────────────────────────────────────────────────────────

const OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";
const OFF_PRODUCT_URL = "https://world.openfoodfacts.org/api/v0/product";

interface OffProduct {
  product_name?: string;
  product_name_fr?: string;
  brands?: string;
  quantity?: string;
  nutriscore_grade?: string;
  nova_group?: number;
  ecoscore_grade?: string;
  image_front_url?: string;
  image_url?: string;
  url?: string;
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
    sodium_100g?: number;
  };
  categories_tags?: string[];
  labels_tags?: string[];
  _id?: string;
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
  1: "🥦 NOVA 1 — Non transformé",
  2: "🧂 NOVA 2 — Ingrédient culinaire",
  3: "🥫 NOVA 3 — Transformé",
  4: "🏭 NOVA 4 — Ultra-transformé",
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
    const res = await fetch(`${OFF_PRODUCT_URL}/${barcode}.json`, {
      headers: { "User-Agent": "MaximeGPT-DiscordBot/1.0 (discord)" },
    });
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
      fields: [
        "product_name", "product_name_fr", "brands", "quantity",
        "nutriscore_grade", "nova_group", "ecoscore_grade",
        "image_front_url", "image_url", "url", "code",
        "ingredients_text_fr", "ingredients_text",
        "nutriments", "categories_tags", "labels_tags",
      ].join(","),
    });
    const res = await fetch(`${OFF_SEARCH_URL}?${params.toString()}`, {
      headers: { "User-Agent": "MaximeGPT-DiscordBot/1.0 (discord)" },
    });
    if (!res.ok) return null;
    const data = await res.json() as { products?: OffProduct[] };
    const products = data.products ?? [];

    // Prefer products that have a nutriscore or at least a name
    const ranked = products.filter((p) => p.product_name || p.product_name_fr);
    return ranked[0] ?? null;
  } catch (err) {
    logger.error({ err }, "OFF search error");
    return null;
  }
}

function buildProductEmbed(product: OffProduct, showRate = false): EmbedBuilder {
  const name = product.product_name_fr || product.product_name || "Produit inconnu";
  const brand = product.brands || "Marque inconnue";
  const quantity = product.quantity ? ` — ${product.quantity}` : "";
  const nutrigrade = (product.nutriscore_grade ?? "").toLowerCase();
  const nova = product.nova_group;
  const ecoscore = (product.ecoscore_grade ?? "").toLowerCase();
  const nutriments = product.nutriments ?? {};

  const color = NUTRISCORE_COLORS[nutrigrade] ?? 0x5865f2;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`🍽️ ${name}`)
    .setURL(product.url ?? `https://fr.openfoodfacts.org/produit/${product.code ?? ""}`)
    .setDescription(`**${brand}**${quantity}`)
    .setFooter({ text: "Source : Open Food Facts • openfoodfacts.org" });

  const image = product.image_front_url || product.image_url;
  if (image) embed.setThumbnail(image);

  // Nutriscore
  if (nutrigrade && NUTRISCORE_EMOJIS[nutrigrade]) {
    const emoji = NUTRISCORE_EMOJIS[nutrigrade]!;
    embed.addFields({
      name: "Nutri-Score",
      value: `${emoji} **${nutrigrade.toUpperCase()}** — ${nutriscoreLabel(nutrigrade)}`,
      inline: true,
    });
  } else {
    embed.addFields({ name: "Nutri-Score", value: "❓ Non disponible", inline: true });
  }

  // NOVA
  if (nova && NOVA_LABELS[nova]) {
    embed.addFields({ name: "Degré de transformation", value: NOVA_LABELS[nova]!, inline: true });
  } else {
    embed.addFields({ name: "Degré de transformation", value: "❓ Non disponible", inline: true });
  }

  // Ecoscore
  if (ecoscore && ECOSCORE_EMOJIS[ecoscore]) {
    embed.addFields({
      name: "Éco-Score",
      value: `${ECOSCORE_EMOJIS[ecoscore]} **${ecoscore.toUpperCase()}**`,
      inline: true,
    });
  }

  // Nutritional values
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
      `🔥 Énergie : **${fmt(energy, "kcal")}**`,
      `💪 Protéines : **${fmt(proteins, "g")}**`,
      `🧈 Matières grasses : **${fmt(fat, "g")}** (dont saturées : ${fmt(saturatedFat, "g")})`,
      `🍬 Sucres : **${fmt(sugars, "g")}**`,
      fiber !== undefined ? `🌾 Fibres : **${fmt(fiber, "g")}**` : null,
      `🧂 Sel : **${fmt(salt, "g")}**`,
    ].filter(Boolean).join("\n");

    embed.addFields({ name: "📊 Valeurs nutritionnelles (pour 100 g)", value: lines, inline: false });
  }

  // Rate verdict
  if (showRate) {
    const verdict = buildVerdict(nutrigrade, nova);
    embed.addFields({ name: "⚖️ Verdict", value: verdict, inline: false });
  }

  // Ingredients (truncated)
  const ingredients = product.ingredients_text_fr || product.ingredients_text;
  if (ingredients) {
    const truncated = ingredients.length > 300 ? ingredients.slice(0, 300) + "…" : ingredients;
    embed.addFields({ name: "🧪 Ingrédients", value: truncated, inline: false });
  }

  return embed;
}

function nutriscoreLabel(grade: string): string {
  const labels: Record<string, string> = {
    a: "Excellente qualité nutritionnelle",
    b: "Bonne qualité nutritionnelle",
    c: "Qualité nutritionnelle moyenne",
    d: "Mauvaise qualité nutritionnelle",
    e: "Très mauvaise qualité nutritionnelle",
  };
  return labels[grade] ?? "Qualité inconnue";
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
      "🏆 Champion du placard ! Ce produit est une pépite nutritionnelle. Fonce !",
      "⭐ Nutriscore A et peu transformé ? Tu as trouvé la perle rare. Profites-en !",
      "🥇 Félicitations, t'as un goût de champion. Ce produit est top !",
    ],
    good: [
      "👍 Pas parfait, mais franchement bien ! Une bonne option au quotidien.",
      "✅ Nutriscore correct — tu peux consommer sans culpabiliser (presque).",
      "🙂 C'est bon sans être exceptionnel. L'équilibre, c'est ça !",
    ],
    meh: [
      "😐 Moyen, comme un lundi matin. À consommer avec modération.",
      "⚠️ Nutriscore C… c'est ni bon ni mauvais. L'exception, pas la règle.",
      "🤷 Bof. On a vu mieux, on a vu pire. À toi de voir.",
    ],
    bad: [
      "😬 Hmm. Nutriscore D, c'est le genre de produit qui fait pleurer les diéteticiens.",
      "🚨 À consommer rarement ! Ton corps mérite mieux que ça.",
      "💀 D comme Dangereux? Non, mais… à limiter sérieusement.",
    ],
    terrible: [
      "🔥 Nutriscore E ! C'est presque une arme alimentaire. Mange ça le jour de ta triche !",
      "❌ Ce produit a l'air délicieux et c'est exactement le problème.",
      "🚫 Nutriscore E… Même Mc Do en a honte. Modération extrême conseillée.",
    ],
    unknown: [
      "🔍 Données nutritionnelles incomplètes. Open Food Facts n'a pas tout sur ce produit.",
      "❓ Le Nutriscore n'est pas disponible pour ce produit. Méfiance ou confiance ? À toi de choisir.",
    ],
  };

  const pool = verdicts[key];
  return pool[Math.floor(Math.random() * pool.length)]!;
}

// ── Public handlers ─────────────────────────────────────────────────────────────

export async function handleFood(message: Message, args: string[]): Promise<void> {
  // !food rate <product> → rate mode
  if (args[0]?.toLowerCase() === "rate") {
    args.shift();
    await handleFoodRate(message, args);
    return;
  }

  const query = args.join(" ").trim();
  if (!query) {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🍽️ Commande Food")
      .setDescription(
        "Recherche n'importe quel aliment sur Open Food Facts !\n\n" +
        "**`!food <nom ou code-barres>`** — Infos nutritionnelles\n" +
        "**`!food rate <nom>`** — Note et verdict du produit\n" +
        "**`!rate food <nom>`** — Même chose\n\n" +
        "**Exemples :**\n" +
        "`!food nutella`\n" +
        "`!food coca-cola`\n" +
        "`!food 3017620422003`\n" +
        "`!food rate oreo`",
      )
      .setFooter({ text: "Données : Open Food Facts (openfoodfacts.org)" });
    await message.reply({ embeds: [embed] });
    return;
  }

  const waitMsg = await message.reply("🔍 Recherche en cours sur Open Food Facts…");

  let product: OffProduct | null = null;

  if (isBarcode(query)) {
    product = await fetchByBarcode(query);
  } else {
    product = await searchProduct(query);
  }

  if (!product) {
    await waitMsg.edit(`❌ Aucun produit trouvé pour **${query}**. Essaie avec un autre nom ou le code-barres.`);
    return;
  }

  const embed = buildProductEmbed(product);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("🔗 Voir sur Open Food Facts")
      .setStyle(ButtonStyle.Link)
      .setURL(product.url ?? `https://fr.openfoodfacts.org/produit/${product.code ?? ""}`),
  );

  await waitMsg.delete().catch(() => null);
  await message.reply({ embeds: [embed], components: [row] });
}

export async function handleFoodRate(message: Message, args: string[]): Promise<void> {
  const query = args.join(" ").trim();
  if (!query) {
    await message.reply("❓ Donne-moi un produit à noter ! Exemple : `!food rate nutella`");
    return;
  }

  const waitMsg = await message.reply(`⚖️ Analyse de **${query}** en cours…`);

  let product: OffProduct | null = null;

  if (isBarcode(query)) {
    product = await fetchByBarcode(query);
  } else {
    product = await searchProduct(query);
  }

  if (!product) {
    await waitMsg.edit(`❌ Aucun produit trouvé pour **${query}**. Essaie avec un autre nom ou le code-barres.`);
    return;
  }

  const embed = buildProductEmbed(product, true);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("🔗 Voir sur Open Food Facts")
      .setStyle(ButtonStyle.Link)
      .setURL(product.url ?? `https://fr.openfoodfacts.org/produit/${product.code ?? ""}`),
  );

  await waitMsg.delete().catch(() => null);
  await message.reply({ embeds: [embed], components: [row] });
}
