import type { Collection } from "mongodb";
import { EmbedBuilder } from "discord.js";
import { decrypt, encrypt, getCryptoPaperAccountsCollection, hashUserId, isDbReady } from "../lib/db.js";
import { logger } from "../lib/logger.js";

export const CRYPTO_PAPER_BUDGET_EUR = 10;
export const CRYPTO_ASSETS = {
  btc: { name: "Bitcoin", ticker: "BTC", pair: "XBTEUR", resultKey: "XXBTZEUR" },
  eth: { name: "Ethereum", ticker: "ETH", pair: "ETHEUR", resultKey: "XETHZEUR" },
  sol: { name: "Solana", ticker: "SOL", pair: "SOLEUR", resultKey: "SOLEUR" },
} as const;

export type CryptoAsset = keyof typeof CRYPTO_ASSETS;
export interface KrakenQuote {
  bidEur: number;
  askEur: number;
  observedAt: string;
}
export interface CryptoPaperAccount {
  version: 1;
  asset: CryptoAsset;
  budgetEur: 10;
  quantity: number;
  buyPriceEur: number;
  startedAt: string;
}
export interface PaperValuation {
  currentValueEur: number;
  profitEur: number;
  profitPercent: number;
}

interface CryptoPaperAccountDocument {
  _id: string;
  encryptedData: string;
  updatedAt: Date;
}
type CryptoPaperCollection = Pick<Collection<CryptoPaperAccountDocument>, "findOne" | "updateOne" | "deleteOne">;

export type PaperAccountRead =
  | { status: "ok"; account: CryptoPaperAccount }
  | { status: "empty" }
  | { status: "unavailable" }
  | { status: "error" };

export type PaperStartResult =
  | { status: "created"; account: CryptoPaperAccount; quote: KrakenQuote }
  | { status: "exists"; account: CryptoPaperAccount }
  | { status: "unavailable" }
  | { status: "price_unavailable" }
  | { status: "error" };

export type PaperResetResult = "deleted" | "empty" | "unavailable" | "error";

type SimulatorOptions = {
  ready: () => boolean;
  collection: () => CryptoPaperCollection | null;
  hash: (value: string) => string;
  encrypt: (value: string) => string;
  decrypt: (value: string) => string;
  quote: (asset: CryptoAsset) => Promise<KrakenQuote>;
  now?: () => Date;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isCryptoAsset(value: unknown): value is CryptoAsset {
  return typeof value === "string" && Object.hasOwn(CRYPTO_ASSETS, value);
}

export function parseKrakenQuote(value: unknown, asset: CryptoAsset, observedAt = new Date().toISOString()): KrakenQuote {
  if (!isRecord(value) || !Array.isArray(value.error) || value.error.length > 0 || !isRecord(value.result)) {
    throw new Error("Kraken returned an invalid ticker response");
  }
  const ticker = value.result[CRYPTO_ASSETS[asset].resultKey];
  if (!isRecord(ticker) || !Array.isArray(ticker.b) || !Array.isArray(ticker.a)) {
    throw new Error("Kraken omitted the requested EUR market");
  }
  const bidEur = Number(ticker.b[0]);
  const askEur = Number(ticker.a[0]);
  if (!Number.isFinite(bidEur) || bidEur <= 0 || !Number.isFinite(askEur) || askEur <= 0 || askEur < bidEur) {
    throw new Error("Kraken returned invalid market prices");
  }
  return { bidEur, askEur, observedAt };
}

export function createKrakenPriceProvider(
  fetcher: typeof fetch = fetch,
  now: () => number = Date.now,
  cacheMs = 5_000,
) {
  const cache = new Map<CryptoAsset, { quote: KrakenQuote; expiresAt: number }>();
  const inFlight = new Map<CryptoAsset, Promise<KrakenQuote>>();

  return async (asset: CryptoAsset): Promise<KrakenQuote> => {
    const cached = cache.get(asset);
    if (cached && cached.expiresAt > now()) return cached.quote;
    const pending = inFlight.get(asset);
    if (pending) return pending;

    const request = (async () => {
      const pair = CRYPTO_ASSETS[asset].pair;
      const response = await fetcher(`https://api.kraken.com/0/public/Ticker?pair=${encodeURIComponent(pair)}`, {
        signal: AbortSignal.timeout(8_000),
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Kraken HTTP ${response.status}`);
      const body: unknown = await response.json();
      const quote = parseKrakenQuote(body, asset, new Date(now()).toISOString());
      cache.set(asset, { quote, expiresAt: now() + cacheMs });
      return quote;
    })();
    inFlight.set(asset, request);
    try {
      return await request;
    } finally {
      inFlight.delete(asset);
    }
  };
}

export function valuePaperAccount(account: CryptoPaperAccount, quote: KrakenQuote): PaperValuation {
  if (!Number.isFinite(quote.bidEur) || quote.bidEur <= 0) throw new Error("A valid current bid price is required");
  const currentValueEur = account.quantity * quote.bidEur;
  const profitEur = currentValueEur - account.budgetEur;
  return {
    currentValueEur,
    profitEur,
    profitPercent: (profitEur / account.budgetEur) * 100,
  };
}

function isPaperAccount(value: unknown): value is CryptoPaperAccount {
  if (!isRecord(value)) return false;
  return value.version === 1 && isCryptoAsset(value.asset) && value.budgetEur === CRYPTO_PAPER_BUDGET_EUR &&
    typeof value.quantity === "number" && Number.isFinite(value.quantity) && value.quantity > 0 &&
    typeof value.buyPriceEur === "number" && Number.isFinite(value.buyPriceEur) && value.buyPriceEur > 0 &&
    typeof value.startedAt === "string" && Number.isFinite(Date.parse(value.startedAt));
}

export function createCryptoPaperSimulator(options: SimulatorOptions) {
  const now = options.now ?? (() => new Date());
  const keyFor = (discordId: string) => options.hash(`crypto-paper:${discordId}`);

  async function get(discordId: string): Promise<PaperAccountRead> {
    if (!options.ready()) return { status: "unavailable" };
    const collection = options.collection();
    if (!collection) return { status: "unavailable" };
    try {
      const document = await collection.findOne({ _id: keyFor(discordId) });
      if (!document) return { status: "empty" };
      const decoded: unknown = JSON.parse(options.decrypt(document.encryptedData));
      if (!isPaperAccount(decoded)) throw new Error("Invalid crypto paper account");
      return { status: "ok", account: decoded };
    } catch (error) {
      logger.warn({ err: error }, "Could not read encrypted crypto simulation account");
      return { status: "error" };
    }
  }

  async function start(discordId: string, asset: CryptoAsset): Promise<PaperStartResult> {
    if (!options.ready()) return { status: "unavailable" };
    const collection = options.collection();
    if (!collection) return { status: "unavailable" };
    const existing = await get(discordId);
    if (existing.status === "unavailable" || existing.status === "error") return existing;
    if (existing.status === "ok") return { status: "exists", account: existing.account };

    let quote: KrakenQuote;
    try {
      quote = await options.quote(asset);
    } catch {
      return { status: "price_unavailable" };
    }
    if (!Number.isFinite(quote.askEur) || quote.askEur <= 0) return { status: "price_unavailable" };

    const account: CryptoPaperAccount = {
      version: 1,
      asset,
      budgetEur: CRYPTO_PAPER_BUDGET_EUR,
      quantity: CRYPTO_PAPER_BUDGET_EUR / quote.askEur,
      buyPriceEur: quote.askEur,
      startedAt: now().toISOString(),
    };
    try {
      const result = await collection.updateOne(
        { _id: keyFor(discordId) },
        { $setOnInsert: { encryptedData: options.encrypt(JSON.stringify(account)), updatedAt: now() } },
        { upsert: true },
      );
      if (result.upsertedCount === 1) return { status: "created", account, quote };
      const raced = await get(discordId);
      return raced.status === "ok" ? { status: "exists", account: raced.account } : { status: "error" };
    } catch (error) {
      logger.warn({ err: error }, "Could not save crypto simulation account");
      return { status: "error" };
    }
  }

  async function reset(discordId: string): Promise<PaperResetResult> {
    if (!options.ready()) return "unavailable";
    const collection = options.collection();
    if (!collection) return "unavailable";
    try {
      const result = await collection.deleteOne({ _id: keyFor(discordId) });
      return result.deletedCount ? "deleted" : "empty";
    } catch (error) {
      logger.warn({ err: error }, "Could not reset crypto simulation account");
      return "error";
    }
  }

  return { get, start, reset };
}

export const getKrakenQuote = createKrakenPriceProvider();
export const cryptoPaperSimulator = createCryptoPaperSimulator({
  ready: isDbReady,
  collection: getCryptoPaperAccountsCollection,
  hash: hashUserId,
  encrypt,
  decrypt,
  quote: getKrakenQuote,
});

export function buildCryptoPaperEmbed(account: CryptoPaperAccount, quote: KrakenQuote, language: string): EmbedBuilder {
  const french = language === "fr";
  const locale = french ? "fr-FR" : "en-GB";
  const asset = CRYPTO_ASSETS[account.asset];
  const valuation = valuePaperAccount(account, quote);
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 8 });
  const signedProfit = `${valuation.profitEur > 0 ? "+" : ""}${money.format(valuation.profitEur)}`;
  const signedPercent = `${valuation.profitPercent > 0 ? "+" : ""}${valuation.profitPercent.toFixed(2)}%`;
  const startedAt = new Date(account.startedAt).toLocaleString(locale, { timeZone: "Europe/Paris" });
  const observedAt = new Date(quote.observedAt).toLocaleTimeString(locale, { timeZone: "Europe/Paris" });

  return new EmbedBuilder()
    .setColor(valuation.profitEur >= 0 ? 0x26a269 : 0xe5534b)
    .setTitle(french ? "🧪 Portefeuille crypto fictif" : "🧪 Simulated crypto portfolio")
    .setDescription(french
      ? `Achat fictif unique de **10,00 €** en **${asset.name} (${asset.ticker})**.`
      : `One simulated **€10.00** purchase of **${asset.name} (${asset.ticker})**.`)
    .addFields(
      { name: french ? "Valeur actuelle estimée" : "Estimated current value", value: money.format(valuation.currentValueEur), inline: true },
      { name: french ? "Gain / perte fictif" : "Simulated gain / loss", value: `${signedProfit} (${signedPercent})`, inline: true },
      { name: french ? "Quantité simulée" : "Simulated quantity", value: `${number.format(account.quantity)} ${asset.ticker}`, inline: true },
      { name: french ? "Cours d’achat / cours actuel" : "Buy price / current price", value: `${money.format(account.buyPriceEur)} / ${money.format(quote.bidEur)}`, inline: false },
      { name: french ? "Démarré le" : "Started", value: startedAt, inline: true },
    )
    .setFooter({ text: french
      ? `Cours Kraken · relevé à ${observedAt} · frais non inclus · aucune transaction réelle`
      : `Kraken quote · checked at ${observedAt} · fees excluded · no real transaction` });
}
