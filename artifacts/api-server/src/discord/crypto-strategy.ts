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
  defaultSlippagePercentPerSide: 0.15,
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
  slippageEur: number;
}

export interface BacktestPeriodResult {
  periodStart: number;
  periodEnd: number;
  candleCount: number;
  finalValueEur: number;
  returnPercent: number;
  buyAndHoldValueEur: number;
  buyAndHoldReturnPercent: number;
  maxDrawdownPercent: number;
  tradeCount: number;
  feesEur: number;
  slippageEur: number;
}

export interface CrossoverBacktestResult {
  asset: CryptoAsset;
  initialEur: number;
  feeRate: number;
  slippageRate: number;
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
  slippageEur: number;
  trades: StrategyTrade[];
  validation?: BacktestPeriodResult;
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

function simulatePeriod(
  candles: HourlyCandle[],
  startIndex: number,
  options: { initialEur: number; feeRate: number; slippageRate: number; fastWindow: number; slowWindow: number },
): BacktestPeriodResult & { trades: StrategyTrade[] } {
  const { initialEur, feeRate, slippageRate, fastWindow, slowWindow } = options;
  let cash = initialEur;
  let quantity = 0;
  let feesEur = 0;
  let slippageEur = 0;
  const trades: StrategyTrade[] = [];
  let peakEquity = initialEur;
  let maxDrawdownPercent = 0;

  for (let index = Math.max(1, startIndex); index < candles.length; index++) {
    const signalIndex = index - 1;
    if (signalIndex >= slowWindow) {
      const previousFast = meanClose(candles, signalIndex - 1, fastWindow);
      const previousSlow = meanClose(candles, signalIndex - 1, slowWindow);
      const currentFast = meanClose(candles, signalIndex, fastWindow);
      const currentSlow = meanClose(candles, signalIndex, slowWindow);
      const candle = candles[index]!;

      if (quantity === 0 && cash > 0 && previousFast <= previousSlow && currentFast > currentSlow) {
        const priceEur = candle.open * (1 + slippageRate);
        const feeEur = cash * feeRate;
        quantity = (cash - feeEur) / priceEur;
        const tradeSlippage = quantity * (priceEur - candle.open);
        feesEur += feeEur;
        slippageEur += tradeSlippage;
        trades.push({ side: "buy", at: candle.openTime, priceEur, feeEur, slippageEur: tradeSlippage });
        cash = 0;
      } else if (quantity > 0 && previousFast >= previousSlow && currentFast < currentSlow) {
        const priceEur = candle.open * (1 - slippageRate);
        const gross = quantity * priceEur;
        const feeEur = gross * feeRate;
        const tradeSlippage = quantity * (candle.open - priceEur);
        cash = gross - feeEur;
        quantity = 0;
        feesEur += feeEur;
        slippageEur += tradeSlippage;
        trades.push({ side: "sell", at: candle.openTime, priceEur, feeEur, slippageEur: tradeSlippage });
      }
    }

    const mark = candles[index]!.close;
    const liquidationValue = quantity > 0
      ? quantity * mark * (1 - slippageRate) * (1 - feeRate)
      : cash;
    const equity = quantity > 0 ? liquidationValue : cash;
    peakEquity = Math.max(peakEquity, equity);
    if (peakEquity > 0) maxDrawdownPercent = Math.max(maxDrawdownPercent, ((peakEquity - equity) / peakEquity) * 100);
  }

  const firstCandle = candles[startIndex]!;
  const lastCandle = candles.at(-1)!;
  let finalValueEur = cash;
  if (quantity > 0) {
    const exitPrice = lastCandle.close * (1 - slippageRate);
    const liquidationGross = quantity * exitPrice;
    const finalLiquidationFee = liquidationGross * feeRate;
    feesEur += finalLiquidationFee;
    slippageEur += quantity * (lastCandle.close - exitPrice);
    finalValueEur += liquidationGross - finalLiquidationFee;
  }
  peakEquity = Math.max(peakEquity, initialEur);
  if (peakEquity > 0) maxDrawdownPercent = Math.max(maxDrawdownPercent, ((peakEquity - finalValueEur) / peakEquity) * 100);

  const holdEntryPrice = firstCandle.open * (1 + slippageRate);
  const holdEntryFee = initialEur * feeRate;
  const holdQuantity = (initialEur - holdEntryFee) / holdEntryPrice;
  const holdExitPrice = lastCandle.close * (1 - slippageRate);
  const buyAndHoldExitGross = holdQuantity * holdExitPrice;
  const buyAndHoldExitFee = buyAndHoldExitGross * feeRate;
  const buyAndHoldValueEur = buyAndHoldExitGross - buyAndHoldExitFee;
  const periodStart = firstCandle.openTime;

  return {
    periodStart,
    periodEnd: lastCandle.closeTime,
    candleCount: candles.length - startIndex,
    finalValueEur,
    returnPercent: percentageChange(finalValueEur, initialEur),
    buyAndHoldValueEur,
    buyAndHoldReturnPercent: percentageChange(buyAndHoldValueEur, initialEur),
    maxDrawdownPercent,
    tradeCount: trades.length,
    feesEur,
    slippageEur,
    trades,
  };
}

export function runSmaCrossoverBacktest(
  asset: CryptoAsset,
  candles: HourlyCandle[],
  options: { initialEur?: number; feeRate?: number; slippageRate?: number; fastWindow?: number; slowWindow?: number } = {},
): CrossoverBacktestResult {
  const initialEur = options.initialEur ?? 10;
  const feeRate = options.feeRate ?? CRYPTO_STRATEGY.defaultFeePercentPerSide / 100;
  const slippageRate = options.slippageRate ?? CRYPTO_STRATEGY.defaultSlippagePercentPerSide / 100;
  const fastWindow = options.fastWindow ?? CRYPTO_STRATEGY.fastWindow;
  const slowWindow = options.slowWindow ?? CRYPTO_STRATEGY.slowWindow;

  if (!Number.isFinite(initialEur) || initialEur <= 0) throw new Error("Initial amount must be positive");
  if (!Number.isFinite(feeRate) || feeRate < 0 || feeRate > 0.05) throw new Error("Fee rate must be between 0% and 5%");
  if (!Number.isFinite(slippageRate) || slippageRate < 0 || slippageRate > 0.05) {
    throw new Error("Slippage rate must be between 0% and 5%");
  }
  if (!Number.isInteger(fastWindow) || fastWindow < 2 || !Number.isInteger(slowWindow) || slowWindow <= fastWindow) {
    throw new Error("Moving-average windows are invalid");
  }
  if (candles.length < slowWindow + 2) throw new Error("Not enough hourly candles for this backtest");
  for (let index = 1; index < candles.length; index++) {
    if (candles[index]!.openTime - candles[index - 1]!.openTime !== HOUR_MS) {
      throw new Error("Backtest candles must be continuous hourly data");
    }
  }

  const full = simulatePeriod(candles, 0, { initialEur, feeRate, slippageRate, fastWindow, slowWindow });
  const splitIndex = Math.floor(candles.length * 0.8);
  const validation = splitIndex >= slowWindow + 2 && candles.length - splitIndex >= slowWindow + 2
    ? simulatePeriod(candles, splitIndex, { initialEur, feeRate, slippageRate, fastWindow, slowWindow })
    : undefined;

  return {
    asset,
    initialEur,
    feeRate,
    slippageRate,
    fastWindow,
    slowWindow,
    candleCount: full.candleCount,
    periodStart: full.periodStart,
    periodEnd: full.periodEnd,
    finalValueEur: full.finalValueEur,
    returnPercent: full.returnPercent,
    buyAndHoldValueEur: full.buyAndHoldValueEur,
    buyAndHoldReturnPercent: full.buyAndHoldReturnPercent,
    maxDrawdownPercent: full.maxDrawdownPercent,
    tradeCount: full.tradeCount,
    feesEur: full.feesEur,
    slippageEur: full.slippageEur,
    trades: full.trades,
    ...(validation ? { validation } : {}),
  };
}

export function buildCrossoverBacktestEmbed(result: CrossoverBacktestResult, language: string): EmbedBuilder {
  const french = language === "fr";
  const locale = french ? "fr-FR" : "en-GB";
  const asset = STRATEGY_ASSETS[result.asset];
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const percent = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
  const date = (value: number) => new Date(value).toLocaleDateString(locale, { timeZone: "Europe/Paris" });
  const validation = result.validation;
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
      { name: french ? "Glissement estimé" : "Estimated slippage", value: `${money.format(result.slippageEur)} · ${(result.slippageRate * 100).toFixed(2)}% / côté`, inline: true },
      { name: french ? "Période" : "Period", value: `${date(result.periodStart)} → ${date(result.periodEnd)} · ${result.candleCount} bougies`, inline: true },
      ...(validation ? [{
        name: french ? "Validation chronologique · 20 % final" : "Chronological holdout · final 20%",
        value: `${french ? "Règle" : "Rule"} ${money.format(validation.finalValueEur)} (${percent(validation.returnPercent)}) · ${
          french ? "achat conservé" : "buy and hold"} ${money.format(validation.buyAndHoldValueEur)} (${percent(validation.buyAndHoldReturnPercent)}) · ${
          french ? "recul max." : "max drawdown"} ${validation.maxDrawdownPercent.toFixed(2)}% · ${
          french ? "frais" : "fees"} ${money.format(validation.feesEur)} · ${
          french ? "glissement" : "slippage"} ${money.format(validation.slippageEur)} · ${
          date(validation.periodStart)} → ${date(validation.periodEnd)}`,
        inline: false,
      }] : []),
    )
    .setFooter({ text: french
      ? `Binance public · 1 h · coûts hypothétiques : frais ${(result.feeRate * 100).toFixed(2)} % et glissement ${(result.slippageRate * 100).toFixed(2)} % par côté · validation finale non optimisée · test passé, pas une prévision · aucun ordre réel`
      : `Public Binance data · 1 h · assumed costs: ${(result.feeRate * 100).toFixed(2)}% fees and ${(result.slippageRate * 100).toFixed(2)}% slippage per side · final holdout not optimized · historical test, not a forecast · no real orders` });
}

export const getBinanceHourlyCandles = createBinanceHourlyCandleProvider();
