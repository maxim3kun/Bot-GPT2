import { EmbedBuilder } from "discord.js";
import type { CryptoAsset } from "./crypto-simulator.js";

const HOUR_MS = 60 * 60 * 1000;
const KLINE_LIMIT = 721;
const MAX_KLINES = 1_000;
const STRATEGY_ASSETS: Record<CryptoAsset, { symbol: string; label: string }> = {
  btc: { symbol: "BTCEUR", label: "Bitcoin (BTC/EUR)" },
  eth: { symbol: "ETHEUR", label: "Ethereum (ETH/EUR)" },
  sol: { symbol: "SOLEUR", label: "Solana (SOL/EUR)" },
};

export const CRYPTO_STRATEGY = {
  interval: "1h",
  fastWindow: 24,
  slowWindow: 72,
  lookbackCandles: 720,
  defaultFeePercentPerSide: 0.1,
} as const;

export interface HourlyCandle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  closeTime: number;
}

export interface StrategyTrade {
  side: "buy" | "sell";
  at: number;
  priceEur: number;
  feeEur: number;
}

export interface CrossoverBacktestResult {
  asset: CryptoAsset;
  initialEur: number;
  feeRate: number;
  fastWindow: number;
  slowWindow: number;
  candleCount: number;
  periodStart: number;
  periodEnd: number;
  finalValueEur: number;
  returnPercent: number;
  buyAndHoldValueEur: number;
  buyAndHoldReturnPercent: number;
  maxDrawdownPercent: number;
  tradeCount: number;
  feesEur: number;
  trades: StrategyTrade[];
}

function finitePositive(value: unknown): number | null {
  const parsed = typeof value === "number" || typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function parseBinanceHourlyCandles(value: unknown, nowMs = Date.now()): HourlyCandle[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_KLINES) {
    throw new Error("Binance returned an invalid candle list");
  }

  const candles: HourlyCandle[] = [];
  for (const row of value) {
    if (!Array.isArray(row) || row.length < 7) throw new Error("Binance returned an incomplete candle");
    const openTime = Number(row[0]);
    const open = finitePositive(row[1]);
    const high = finitePositive(row[2]);
    const low = finitePositive(row[3]);
    const close = finitePositive(row[4]);
    const closeTime = Number(row[6]);
    if (
      !Number.isSafeInteger(openTime) ||
      !Number.isSafeInteger(closeTime) ||
      open === null ||
      high === null ||
      low === null ||
      close === null ||
      closeTime <= openTime ||
      high < Math.max(open, close) ||
      low > Math.min(open, close) ||
      high < low
    ) {
      throw new Error("Binance returned invalid candle values");
    }

    // Do not trade on an unfinished hourly candle.
    if (closeTime >= nowMs) continue;
    const previous = candles.at(-1);
    if (previous && openTime <= previous.openTime) throw new Error("Binance candles are not in chronological order");
    candles.push({ openTime, open, high, low, close, closeTime });
  }

  if (candles.length === 0) throw new Error("Binance returned no completed candles");
  for (let index = 1; index < candles.length; index++) {
    if (candles[index]!.openTime - candles[index - 1]!.openTime !== HOUR_MS) {
      throw new Error("Binance candle history contains an hourly gap");
    }
  }
  const last = candles.at(-1)!;
  if (nowMs - last.closeTime > 2 * HOUR_MS) throw new Error("Binance candle history is stale");
  return candles;
}

export function createBinanceHourlyCandleProvider(
  fetcher: typeof fetch = fetch,
  now: () => number = Date.now,
  cacheMs = 60_000,
) {
  const cache = new Map<CryptoAsset, { candles: HourlyCandle[]; expiresAt: number }>();
  const inFlight = new Map<CryptoAsset, Promise<HourlyCandle[]>>();

  return async (asset: CryptoAsset): Promise<HourlyCandle[]> => {
    const cached = cache.get(asset);
    if (cached && cached.expiresAt > now()) return cached.candles;
    const pending = inFlight.get(asset);
    if (pending) return pending;

    const request = (async () => {
      const symbol = STRATEGY_ASSETS[asset].symbol;
      const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${CRYPTO_STRATEGY.interval}&limit=${KLINE_LIMIT}`;
      const response = await fetcher(url, {
        signal: AbortSignal.timeout(8_000),
        redirect: "error",
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Binance HTTP ${response.status}`);
      const body: unknown = await response.json();
      const candles = parseBinanceHourlyCandles(body, now());
      cache.set(asset, { candles, expiresAt: now() + cacheMs });
      return candles;
    })();
    inFlight.set(asset, request);
    try {
      return await request;
    } finally {
      inFlight.delete(asset);
    }
  };
}

function meanClose(candles: HourlyCandle[], endIndex: number, window: number): number {
  let sum = 0;
  for (let index = endIndex - window + 1; index <= endIndex; index++) {
    sum += candles[index]!.close;
  }
  return sum / window;
}

function percentageChange(value: number, initial: number): number {
  return ((value - initial) / initial) * 100;
}

export function runSmaCrossoverBacktest(
  asset: CryptoAsset,
  candles: HourlyCandle[],
  options: { initialEur?: number; feeRate?: number; fastWindow?: number; slowWindow?: number } = {},
): CrossoverBacktestResult {
  const initialEur = options.initialEur ?? 10;
  const feeRate = options.feeRate ?? CRYPTO_STRATEGY.defaultFeePercentPerSide / 100;
  const fastWindow = options.fastWindow ?? CRYPTO_STRATEGY.fastWindow;
  const slowWindow = options.slowWindow ?? CRYPTO_STRATEGY.slowWindow;

  if (!Number.isFinite(initialEur) || initialEur <= 0) throw new Error("Initial amount must be positive");
  if (!Number.isFinite(feeRate) || feeRate < 0 || feeRate > 0.05) throw new Error("Fee rate must be between 0% and 5%");
  if (!Number.isInteger(fastWindow) || fastWindow < 2 || !Number.isInteger(slowWindow) || slowWindow <= fastWindow) {
    throw new Error("Moving-average windows are invalid");
  }
  if (candles.length < slowWindow + 2) throw new Error("Not enough hourly candles for this backtest");
  for (let index = 1; index < candles.length; index++) {
    if (candles[index]!.openTime - candles[index - 1]!.openTime !== HOUR_MS) {
      throw new Error("Backtest candles must be continuous hourly data");
    }
  }

  let cash = initialEur;
  let quantity = 0;
  let feesEur = 0;
  const trades: StrategyTrade[] = [];
  let peakEquity = initialEur;
  let maxDrawdownPercent = 0;

  for (let index = 1; index < candles.length; index++) {
    const signalIndex = index - 1;
    if (signalIndex >= slowWindow) {
      const previousFast = meanClose(candles, signalIndex - 1, fastWindow);
      const previousSlow = meanClose(candles, signalIndex - 1, slowWindow);
      const currentFast = meanClose(candles, signalIndex, fastWindow);
      const currentSlow = meanClose(candles, signalIndex, slowWindow);
      const candle = candles[index]!;

      if (quantity === 0 && cash > 0 && previousFast <= previousSlow && currentFast > currentSlow) {
        const fee = cash * feeRate;
        quantity = (cash - fee) / candle.open;
        feesEur += fee;
        trades.push({ side: "buy", at: candle.openTime, priceEur: candle.open, feeEur: fee });
        cash = 0;
      } else if (quantity > 0 && previousFast >= previousSlow && currentFast < currentSlow) {
        const gross = quantity * candle.open;
        const fee = gross * feeRate;
        cash = gross - fee;
        quantity = 0;
        feesEur += fee;
        trades.push({ side: "sell", at: candle.openTime, priceEur: candle.open, feeEur: fee });
      }
    }

    const equity = cash + quantity * candles[index]!.close;
    peakEquity = Math.max(peakEquity, equity);
    if (peakEquity > 0) maxDrawdownPercent = Math.max(maxDrawdownPercent, ((peakEquity - equity) / peakEquity) * 100);
  }

  const lastCandle = candles.at(-1)!;
  const finalLiquidationFee = quantity * lastCandle.close * feeRate;
  feesEur += finalLiquidationFee;
  const finalValueEur = cash + quantity * lastCandle.close - finalLiquidationFee;
  peakEquity = Math.max(peakEquity, initialEur);
  if (peakEquity > 0) {
    maxDrawdownPercent = Math.max(maxDrawdownPercent, ((peakEquity - finalValueEur) / peakEquity) * 100);
  }

  const holdEntryFee = initialEur * feeRate;
  const holdQuantity = (initialEur - holdEntryFee) / candles[0]!.open;
  const buyAndHoldExitGross = holdQuantity * lastCandle.close;
  const buyAndHoldExitFee = buyAndHoldExitGross * feeRate;
  const buyAndHoldValueEur = buyAndHoldExitGross - buyAndHoldExitFee;

  return {
    asset,
    initialEur,
    feeRate,
    fastWindow,
    slowWindow,
    candleCount: candles.length,
    periodStart: candles[0]!.openTime,
    periodEnd: lastCandle.closeTime,
    finalValueEur,
    returnPercent: percentageChange(finalValueEur, initialEur),
    buyAndHoldValueEur,
    buyAndHoldReturnPercent: percentageChange(buyAndHoldValueEur, initialEur),
    maxDrawdownPercent,
    tradeCount: trades.length,
    feesEur,
    trades,
  };
}

export function buildCrossoverBacktestEmbed(result: CrossoverBacktestResult, language: string): EmbedBuilder {
  const french = language === "fr";
  const locale = french ? "fr-FR" : "en-GB";
  const asset = STRATEGY_ASSETS[result.asset];
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const percent = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
  const date = (value: number) => new Date(value).toLocaleDateString(locale, { timeZone: "Europe/Paris" });
  return new EmbedBuilder()
    .setColor(result.returnPercent >= 0 ? 0x26a269 : 0xe5534b)
    .setTitle(french ? `🧪 Test historique · ${asset.label}` : `🧪 Historical paper test · ${asset.label}`)
    .setDescription(french
      ? `Règle illustrative : moyenne mobile **${result.fastWindow} h** contre **${result.slowWindow} h**. Achat au croisement haussier, vente au croisement baissier, exécutés à l’ouverture de la bougie suivante.`
      : `Illustrative rule: **${result.fastWindow} h** vs **${result.slowWindow} h** moving averages. Buy on an upward crossover and sell on a downward crossover, filled at the next candle open.`)
    .addFields(
      { name: french ? "Résultat de la règle" : "Rule result", value: `${money.format(result.finalValueEur)} · ${percent(result.returnPercent)}`, inline: true },
      { name: french ? "Achat conservé" : "Buy and hold", value: `${money.format(result.buyAndHoldValueEur)} · ${percent(result.buyAndHoldReturnPercent)}`, inline: true },
      { name: french ? "Recul maximal" : "Maximum drawdown", value: `${result.maxDrawdownPercent.toFixed(2)}%`, inline: true },
      { name: french ? "Ordres simulés" : "Simulated orders", value: `${result.tradeCount}`, inline: true },
      { name: french ? "Frais estimés" : "Estimated fees", value: `${money.format(result.feesEur)} · ${(result.feeRate * 100).toFixed(2)}% / côté`, inline: true },
      { name: french ? "Période" : "Period", value: `${date(result.periodStart)} → ${date(result.periodEnd)} · ${result.candleCount} bougies`, inline: true },
    )
    .setFooter({ text: french
      ? "Binance public · 1 h · frais hypothétiques, glissement exclu · test passé, pas une prévision · aucun ordre réel"
      : "Public Binance data · 1 h · assumed fees, slippage excluded · historical test, not a forecast · no real orders" });
}

export const getBinanceHourlyCandles = createBinanceHourlyCandleProvider();
