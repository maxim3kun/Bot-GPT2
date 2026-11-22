import type { Client } from "discord.js";
import type { Collection } from "mongodb";
import {
  decrypt, encrypt, getCryptoPaperAutopilotsCollection, hashUserId, isDbReady,
} from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { CRYPTO_ASSETS, isCryptoAsset, type CryptoAsset } from "./crypto-simulator.js";
import {
  createBinanceHourlyCandleProvider, CRYPTO_STRATEGY, type HourlyCandle,
} from "./crypto-strategy.js";
import { DISCORD_OWNER_ID } from "./owner.js";

export const CRYPTO_PAPER_AUTOPILOT_DAYS = 30;
export const CRYPTO_PAPER_AUTOPILOT_DURATION_MS = CRYPTO_PAPER_AUTOPILOT_DAYS * 24 * 60 * 60 * 1000;
export const CRYPTO_PAPER_AUTOPILOT_POLL_MS = 5 * 60_000;
const CANDLE_LOOKBACK = 800; // 30 days plus strategy warm-up.
const MAX_TRADES_RETAINED = 50;
const HOUR_MS = 60 * 60 * 1000;
const ASSETS = Object.keys(CRYPTO_ASSETS) as CryptoAsset[];

export type CryptoPaperAutopilotStatus = "running" | "stopped" | "finished";
export type CryptoPaperAutopilotTradeReason =
  | "bullish_cross" | "bearish_cross" | "stronger_trend" | "expired" | "stopped";

export interface CryptoPaperAutopilotTrade {
  side: "buy" | "sell";
  asset: CryptoAsset;
  at: number;
  priceEur: number;
  quantity: number;
  feeEur: number;
  slippageEur: number;
  reason: CryptoPaperAutopilotTradeReason;
}

export interface CryptoPaperAutopilotAccount {
  version: 1;
  ownerDiscordId: string;
  status: CryptoPaperAutopilotStatus;
  budgetEur: 10;
  cashEur: number;
  asset: CryptoAsset | null;
  quantity: number;
  startedAt: string;
  endsAt: string;
  stoppedAt?: string;
  stopReason?: string;
  lastProcessedCandleOpenTime: number;
  lastUpdatedAt: string;
  lastMarkPriceEur: number | null;
  currentValueEur: number;
  peakValueEur: number;
  maxDrawdownPercent: number;
  feeRate: number;
  slippageRate: number;
  feesEur: number;
  slippageEur: number;
  tradeCount: number;
  trades: CryptoPaperAutopilotTrade[];
}

interface CryptoPaperAutopilotDocument {
  _id: string;
  encryptedData: string;
  revision: number;
  status: CryptoPaperAutopilotStatus;
  updatedAt: Date;
}

type CryptoPaperAutopilotCollection = Pick<
  Collection<CryptoPaperAutopilotDocument>,
  "find" | "findOne" | "updateOne"
>;

export type CryptoPaperMarket = Record<CryptoAsset, HourlyCandle[]>;

type Dependencies = {
  ownerId: () => string;
  ready: () => boolean;
  collection: () => CryptoPaperAutopilotCollection | null;
  hash: (value: string) => string;
  encrypt: (value: string) => string;
  decrypt: (value: string) => string;
  market: () => Promise<CryptoPaperMarket>;
  now: () => Date;
};

export type CryptoPaperAutopilotRead =
  | { status: "ok"; account: CryptoPaperAutopilotAccount }
  | { status: "empty" | "unavailable" | "error" | "forbidden" };

export type CryptoPaperAutopilotStart =
  | { status: "created"; account: CryptoPaperAutopilotAccount }
  | { status: "exists"; account: CryptoPaperAutopilotAccount }
  | { status: "unavailable" | "market_unavailable" | "error" | "forbidden" };

export type CryptoPaperAutopilotStop =
  | { status: "stopped"; account: CryptoPaperAutopilotAccount }
  | { status: "already_stopped"; account: CryptoPaperAutopilotAccount }
  | { status: "empty" | "unavailable" | "error" | "forbidden" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTrade(value: unknown): value is CryptoPaperAutopilotTrade {
  if (!isRecord(value)) return false;
  return (value.side === "buy" || value.side === "sell") && isCryptoAsset(value.asset) &&
    Number.isFinite(value.at) && Number.isFinite(value.priceEur) && Number(value.priceEur) > 0 &&
    Number.isFinite(value.quantity) && Number(value.quantity) > 0 &&
    Number.isFinite(value.feeEur) && Number(value.feeEur) >= 0 &&
    Number.isFinite(value.slippageEur) && Number(value.slippageEur) >= 0 &&
    ["bullish_cross", "bearish_cross", "stronger_trend", "expired", "stopped"].includes(String(value.reason));
}

function isAccount(value: unknown): value is CryptoPaperAutopilotAccount {
  if (!isRecord(value)) return false;
  return value.version === 1 && typeof value.ownerDiscordId === "string" &&
    /^\d{1,24}$/.test(value.ownerDiscordId) &&
    ["running", "stopped", "finished"].includes(String(value.status)) &&
    value.budgetEur === 10 &&
    Number.isFinite(value.cashEur) && Number(value.cashEur) >= 0 && Number(value.cashEur) <= 10 &&
    (value.asset === null || isCryptoAsset(value.asset)) &&
    Number.isFinite(value.quantity) && Number(value.quantity) >= 0 &&
    ((value.asset === null && value.quantity === 0) || (isCryptoAsset(value.asset) && Number(value.quantity) > 0)) &&
    typeof value.startedAt === "string" && Number.isFinite(Date.parse(value.startedAt)) &&
    typeof value.endsAt === "string" && Number.isFinite(Date.parse(value.endsAt)) &&
    (value.stoppedAt === undefined || typeof value.stoppedAt === "string") &&
    (value.stopReason === undefined || typeof value.stopReason === "string") &&
    Number.isSafeInteger(value.lastProcessedCandleOpenTime) &&
    typeof value.lastUpdatedAt === "string" && Number.isFinite(Date.parse(value.lastUpdatedAt)) &&
    (value.lastMarkPriceEur === null || (Number.isFinite(value.lastMarkPriceEur) && Number(value.lastMarkPriceEur) > 0)) &&
    Number.isFinite(value.currentValueEur) && Number(value.currentValueEur) >= 0 &&
    Number.isFinite(value.peakValueEur) && Number(value.peakValueEur) >= 0 &&
    Number.isFinite(value.maxDrawdownPercent) && Number(value.maxDrawdownPercent) >= 0 &&
    Number.isFinite(value.feeRate) && Number(value.feeRate) >= 0 && Number(value.feeRate) <= 0.05 &&
    Number.isFinite(value.slippageRate) && Number(value.slippageRate) >= 0 && Number(value.slippageRate) <= 0.05 &&
    Number.isFinite(value.feesEur) && Number(value.feesEur) >= 0 &&
    Number.isFinite(value.slippageEur) && Number(value.slippageEur) >= 0 &&
    Number.isSafeInteger(value.tradeCount) && Number(value.tradeCount) >= 0 &&
    Array.isArray(value.trades) && value.trades.length <= MAX_TRADES_RETAINED && value.trades.every(isTrade);
}

function meanClose(candles: HourlyCandle[], end: number, window: number): number {
  let sum = 0;
  for (let index = end - window + 1; index <= end; index++) sum += candles[index]!.close;
  return sum / window;
}

function validateMarket(market: CryptoPaperMarket): HourlyCandle[] {
  const base = market.btc;
  if (!Array.isArray(base) || base.length < CRYPTO_STRATEGY.slowWindow + 2) {
    throw new Error("Insufficient common Binance candle history");
  }
  const indexes = Object.fromEntries(ASSETS.map(asset => [
    asset,
    new Map(market[asset].map((candle, index) => [candle.openTime, index])),
  ])) as Record<CryptoAsset, Map<number, number>>;
  const common = base.filter(candle => ASSETS.every(asset => indexes[asset].has(candle.openTime)));
  if (common.length < CRYPTO_STRATEGY.slowWindow + 2) throw new Error("Insufficient synchronized market history");
  for (let index = 1; index < common.length; index++) {
    if (common[index]!.openTime - common[index - 1]!.openTime !== HOUR_MS) {
      throw new Error("Synchronized market history has an hourly gap");
    }
  }
  return common;
}

function marketIndexes(market: CryptoPaperMarket) {
  return Object.fromEntries(ASSETS.map(asset => [
    asset,
    new Map(market[asset].map((candle, index) => [candle.openTime, index])),
  ])) as Record<CryptoAsset, Map<number, number>>;
}

type Signal = { asset: CryptoAsset; bullish: boolean; bearish: boolean; strength: number };
function signalAt(market: CryptoPaperMarket, indexes: Record<CryptoAsset, Map<number, number>>,
  asset: CryptoAsset, executionOpenTime: number): Signal | null {
  const candles = market[asset], index = indexes[asset].get(executionOpenTime - HOUR_MS);
  if (index === undefined || index < CRYPTO_STRATEGY.slowWindow + 1) return null;
  const fast = CRYPTO_STRATEGY.fastWindow, slow = CRYPTO_STRATEGY.slowWindow;
  const previousFast = meanClose(candles, index - 1, fast);
  const previousSlow = meanClose(candles, index - 1, slow);
  const currentFast = meanClose(candles, index, fast);
  const currentSlow = meanClose(candles, index, slow);
  return {
    asset,
    bullish: previousFast <= previousSlow && currentFast > currentSlow,
    bearish: previousFast >= previousSlow && currentFast < currentSlow,
    strength: currentFast / currentSlow - 1,
  };
}

function addTrade(account: CryptoPaperAutopilotAccount, trade: CryptoPaperAutopilotTrade) {
  account.tradeCount++;
  account.trades.push(trade);
  if (account.trades.length > MAX_TRADES_RETAINED) account.trades.splice(0, account.trades.length - MAX_TRADES_RETAINED);
}

function buy(account: CryptoPaperAutopilotAccount, asset: CryptoAsset, candle: HourlyCandle,
  reason: CryptoPaperAutopilotTradeReason) {
  if (account.cashEur <= 0) return;
  const priceEur = candle.open * (1 + account.slippageRate);
  const feeEur = account.cashEur * account.feeRate;
  const quantity = (account.cashEur - feeEur) / priceEur;
  const slippageEur = quantity * (priceEur - candle.open);
  account.feesEur += feeEur;
  account.slippageEur += slippageEur;
  account.asset = asset;
  account.quantity = quantity;
  account.cashEur = 0;
  addTrade(account, { side: "buy", asset, at: candle.openTime, priceEur, quantity, feeEur, slippageEur, reason });
}

function sell(account: CryptoPaperAutopilotAccount, candle: HourlyCandle,
  reason: CryptoPaperAutopilotTradeReason) {
  if (!account.asset || account.quantity <= 0) return;
  const asset = account.asset;
  const priceEur = candle.open * (1 - account.slippageRate);
  const quantity = account.quantity;
  const grossEur = quantity * priceEur;
  const feeEur = grossEur * account.feeRate;
  const slippageEur = quantity * (candle.open - priceEur);
  account.cashEur = grossEur - feeEur;
  account.feesEur += feeEur;
  account.slippageEur += slippageEur;
  account.asset = null;
  account.quantity = 0;
  addTrade(account, { side: "sell", asset, at: candle.openTime, priceEur, quantity, feeEur, slippageEur, reason });
}

function valueAtClose(account: CryptoPaperAutopilotAccount, market: CryptoPaperMarket, time: number): number {
  if (!account.asset) {
    account.lastMarkPriceEur = null;
    return account.cashEur;
  }
  const index = market[account.asset].findIndex(candle => candle.openTime === time);
  const candle = market[account.asset][index];
  if (!candle) throw new Error("Missing held-asset candle");
  account.lastMarkPriceEur = candle.close;
  return account.cashEur + account.quantity * candle.close * (1 - account.slippageRate) * (1 - account.feeRate);
}

function updateRisk(account: CryptoPaperAutopilotAccount, value: number) {
  account.currentValueEur = value;
  account.peakValueEur = Math.max(account.peakValueEur, value);
  if (account.peakValueEur > 0) {
    account.maxDrawdownPercent = Math.max(account.maxDrawdownPercent,
      ((account.peakValueEur - value) / account.peakValueEur) * 100);
  }
}

function closeAtExpiry(account: CryptoPaperAutopilotAccount, candle: HourlyCandle) {
  if (account.asset && account.quantity > 0) {
    const asset = account.asset;
    const priceEur = candle.close * (1 - account.slippageRate);
    const quantity = account.quantity;
    const grossEur = quantity * priceEur;
    const feeEur = grossEur * account.feeRate;
    const slippageEur = quantity * (candle.close - priceEur);
    account.cashEur = grossEur - feeEur;
    account.feesEur += feeEur;
    account.slippageEur += slippageEur;
    account.asset = null;
    account.quantity = 0;
    addTrade(account, {
      side: "sell", asset, at: candle.closeTime, priceEur, quantity, feeEur, slippageEur, reason: "expired",
    });
  }
  account.status = "finished";
  account.stoppedAt = account.endsAt;
  account.stopReason = "Période de 30 jours terminée.";
  account.lastMarkPriceEur = null;
  updateRisk(account, account.cashEur);
}

export function advanceCryptoPaperAutopilot(
  source: CryptoPaperAutopilotAccount,
  market: CryptoPaperMarket,
  nowMs: number,
  stopRequested = false,
): { account: CryptoPaperAutopilotAccount; changed: boolean } {
  const common = validateMarket(market);
  const indexes = marketIndexes(market);
  const account = structuredClone(source);
  const endsAt = Date.parse(account.endsAt);
  let changed = false;

  for (const executionCandle of common) {
    if (executionCandle.openTime <= account.lastProcessedCandleOpenTime ||
      executionCandle.closeTime > endsAt) continue;
    if (executionCandle.openTime - account.lastProcessedCandleOpenTime !== HOUR_MS) {
      throw new Error("Paper autopilot missed one or more closed candles");
    }

    const signals = ASSETS.map(asset => signalAt(market, indexes, asset, executionCandle.openTime))
      .filter((signal): signal is Signal => signal !== null);
    const bullish = signals.filter(signal => signal.bullish).sort((a, b) => b.strength - a.strength);
    let nextAsset = bullish[0];
    let rotated = false;

    if (account.asset) {
      const heldSignal = signals.find(signal => signal.asset === account.asset);
      const rotation = bullish.find(signal => signal.asset !== account.asset &&
        heldSignal !== undefined && signal.strength > heldSignal.strength);
      if (heldSignal?.bearish || rotation) {
        const heldCandleIndex = indexes[account.asset].get(executionCandle.openTime);
        const heldCandle = heldCandleIndex === undefined ? undefined : market[account.asset][heldCandleIndex];
        if (!heldCandle) throw new Error("Missing held-asset execution candle");
        sell(account, heldCandle, rotation ? "stronger_trend" : "bearish_cross");
        if (rotation) { nextAsset = rotation; rotated = true; }
      }
    }

    if (!account.asset && account.cashEur > 0 && nextAsset) {
      const buyCandleIndex = indexes[nextAsset.asset].get(executionCandle.openTime);
      const buyCandle = buyCandleIndex === undefined ? undefined : market[nextAsset.asset][buyCandleIndex];
      if (!buyCandle) throw new Error("Missing selected-asset execution candle");
      buy(account, nextAsset.asset, buyCandle, rotated ? "stronger_trend" : "bullish_cross");
    }

    account.lastProcessedCandleOpenTime = executionCandle.openTime;
    account.lastUpdatedAt = new Date(executionCandle.closeTime).toISOString();
    updateRisk(account, valueAtClose(account, market, executionCandle.openTime));
    changed = true;
  }

  if (nowMs >= endsAt) {
    const finalCandle = [...common].reverse().find(candle => candle.closeTime <= endsAt);
    if (!finalCandle) throw new Error("No verified candle available to finish the paper account");
    if (account.asset) {
      const assetCandleIndex = indexes[account.asset].get(finalCandle.openTime);
      const assetCandle = assetCandleIndex === undefined ? undefined : market[account.asset][assetCandleIndex];
      if (!assetCandle) throw new Error("Missing final held-asset candle");
      closeAtExpiry(account, assetCandle);
    } else {
      account.status = "finished";
      account.stoppedAt = account.endsAt;
      account.stopReason = "Période de 30 jours terminée.";
      updateRisk(account, account.cashEur);
    }
    account.lastUpdatedAt = new Date(nowMs).toISOString();
    changed = true;
  } else if (stopRequested && account.status === "running") {
    const latest = [...common].reverse().find(candle => candle.closeTime <= nowMs);
    if (latest && account.asset) {
      const assetCandleIndex = indexes[account.asset].get(latest.openTime);
      const assetCandle = assetCandleIndex === undefined ? undefined : market[account.asset][assetCandleIndex];
      if (!assetCandle) throw new Error("Missing held-asset candle for stop");
      const priceEur = assetCandle.close * (1 - account.slippageRate);
      const quantity = account.quantity;
      const grossEur = quantity * priceEur;
      const feeEur = grossEur * account.feeRate;
      const slippageEur = quantity * (assetCandle.close - priceEur);
      account.cashEur = grossEur - feeEur;
      account.feesEur += feeEur;
      account.slippageEur += slippageEur;
      addTrade(account, {
        side: "sell", asset: account.asset, at: assetCandle.closeTime, priceEur, quantity,
        feeEur, slippageEur, reason: "stopped",
      });
      account.asset = null;
      account.quantity = 0;
      account.lastMarkPriceEur = null;
      updateRisk(account, account.cashEur);
    }
    account.status = "stopped";
    account.stoppedAt = new Date(nowMs).toISOString();
    account.stopReason = latest
      ? "Arrêt demandé; position fictive clôturée au dernier cours horaire vérifié."
      : "Arrêt demandé; cours vérifié indisponible, position conservée.";
    account.lastUpdatedAt = new Date(nowMs).toISOString();
    changed = true;
  }

  return { account, changed };
}

function decodeDocument(document: CryptoPaperAutopilotDocument, decryptData: (value: string) => string) {
  const decoded: unknown = JSON.parse(decryptData(document.encryptedData));
  if (!isAccount(decoded) || decoded.status !== document.status ||
    !Number.isSafeInteger(document.revision) || document.revision < 0) {
    throw new Error("Invalid encrypted crypto paper autopilot account");
  }
  return { account: decoded, revision: document.revision };
}

function newAccount(ownerDiscordId: string, now: Date, lastProcessedCandleOpenTime: number): CryptoPaperAutopilotAccount {
  return {
    version: 1,
    ownerDiscordId,
    status: "running",
    budgetEur: 10,
    cashEur: 10,
    asset: null,
    quantity: 0,
    startedAt: now.toISOString(),
    endsAt: new Date(now.getTime() + CRYPTO_PAPER_AUTOPILOT_DURATION_MS).toISOString(),
    lastProcessedCandleOpenTime,
    lastUpdatedAt: now.toISOString(),
    lastMarkPriceEur: null,
    currentValueEur: 10,
    peakValueEur: 10,
    maxDrawdownPercent: 0,
    feeRate: CRYPTO_STRATEGY.defaultFeePercentPerSide / 100,
    slippageRate: CRYPTO_STRATEGY.defaultSlippagePercentPerSide / 100,
    feesEur: 0,
    slippageEur: 0,
    tradeCount: 0,
    trades: [],
  };
}

const defaultMarket = createBinanceHourlyCandleProvider(fetch, Date.now, 60_000, CANDLE_LOOKBACK);
const defaultDependencies: Dependencies = {
  ownerId: () => DISCORD_OWNER_ID,
  ready: isDbReady,
  collection: getCryptoPaperAutopilotsCollection,
  hash: hashUserId,
  encrypt,
  decrypt,
  market: async () => {
    const [btc, eth, sol] = await Promise.all(ASSETS.map(asset => defaultMarket(asset)));
    return { btc, eth, sol };
  },
  now: () => new Date(),
};

export function createCryptoPaperAutopilot(dependencies: Dependencies = defaultDependencies) {
  const keyFor = (userId: string) => dependencies.hash(`crypto-paper-autopilot:${userId}`);

  async function readDocument(userId: string) {
    if (!dependencies.ready()) return { status: "unavailable" as const };
    const collection = dependencies.collection();
    if (!collection) return { status: "unavailable" as const };
    try {
      const document = await collection.findOne({ _id: keyFor(userId) });
      if (!document) return { status: "empty" as const };
      const decoded = decodeDocument(document, dependencies.decrypt);
      if (decoded.account.ownerDiscordId !== userId) throw new Error("Paper account owner mismatch");
      return { status: "ok" as const, account: decoded.account, revision: decoded.revision, document };
    } catch (error) {
      logger.warn({ err: error }, "Could not read encrypted crypto paper autopilot");
      return { status: "error" as const };
    }
  }

  async function commit(
    userId: string,
    expectedRevision: number | null,
    account: CryptoPaperAutopilotAccount,
  ): Promise<boolean> {
    if (!dependencies.ready()) return false;
    const collection = dependencies.collection();
    if (!collection) return false;
    const updatedAt = dependencies.now();
    try {
      if (expectedRevision === null) {
        const result = await collection.updateOne(
          { _id: keyFor(userId) },
          { $setOnInsert: {
            encryptedData: dependencies.encrypt(JSON.stringify(account)),
            revision: 0,
            status: account.status,
            updatedAt,
          } },
          { upsert: true },
        );
        return result.upsertedCount === 1;
      }
      const result = await collection.updateOne(
        { _id: keyFor(userId), revision: expectedRevision },
        { $set: {
          encryptedData: dependencies.encrypt(JSON.stringify(account)),
          revision: expectedRevision + 1,
          status: account.status,
          updatedAt,
        } },
      );
      return result.matchedCount === 1;
    } catch (error) {
      logger.warn({ err: error }, "Could not save encrypted crypto paper autopilot");
      return false;
    }
  }

  async function get(userId: string): Promise<CryptoPaperAutopilotRead> {
    if (userId !== dependencies.ownerId()) return { status: "forbidden" };
    const result = await readDocument(userId);
    return result.status === "ok"
      ? { status: "ok", account: result.account }
      : { status: result.status };
  }

  async function start(userId: string): Promise<CryptoPaperAutopilotStart> {
    if (userId !== dependencies.ownerId()) return { status: "forbidden" };
    if (!dependencies.ready() || !dependencies.collection()) return { status: "unavailable" };
    const existing = await readDocument(userId);
    if (existing.status === "unavailable" || existing.status === "error") return { status: existing.status };
    if (existing.status === "ok" && existing.account.status === "running") {
      return { status: "exists", account: existing.account };
    }

    let market: CryptoPaperMarket;
    try {
      market = await dependencies.market();
      validateMarket(market);
      const now = dependencies.now();
      // Ignore the current, partly elapsed candle; the first simulated fill must be in the future.
      const currentHourOpen = Math.floor(now.getTime() / HOUR_MS) * HOUR_MS;
      const account = newAccount(userId, now, currentHourOpen);
      const inserted = await commit(userId, existing.status === "ok" ? existing.revision : null, account);
      if (inserted) return { status: "created", account };
      const current = await readDocument(userId);
      return current.status === "ok"
        ? { status: "exists", account: current.account }
        : { status: current.status === "unavailable" ? "unavailable" : "error" };
    } catch {
      return { status: "market_unavailable" };
    }
  }

  async function refresh(userId: string): Promise<CryptoPaperAutopilotRead> {
    if (userId !== dependencies.ownerId()) return { status: "forbidden" };
    const existing = await readDocument(userId);
    if (existing.status !== "ok" || existing.account.status !== "running") {
      return existing.status === "ok" ? { status: "ok", account: existing.account } : { status: existing.status };
    }
    try {
      const market = await dependencies.market();
      const advanced = advanceCryptoPaperAutopilot(existing.account, market, dependencies.now().getTime());
      if (!advanced.changed) return { status: "ok", account: existing.account };
      const saved = await commit(userId, existing.revision, advanced.account);
      if (saved) return { status: "ok", account: advanced.account };
      const current = await get(userId);
      return current;
    } catch (error) {
      logger.warn({ err: error }, "Crypto paper autopilot refresh failed");
      return { status: "ok", account: existing.account };
    }
  }

  async function stop(userId: string): Promise<CryptoPaperAutopilotStop> {
    if (userId !== dependencies.ownerId()) return { status: "forbidden" };
    const existing = await readDocument(userId);
    if (existing.status !== "ok") return { status: existing.status };
    if (existing.account.status !== "running") return { status: "already_stopped", account: existing.account };

    let account: CryptoPaperAutopilotAccount;
    try {
      const market = await dependencies.market();
      const result = advanceCryptoPaperAutopilot(existing.account, market, dependencies.now().getTime(), true);
      account = result.account;
    } catch {
      account = structuredClone(existing.account);
      account.status = "stopped";
      account.stoppedAt = dependencies.now().toISOString();
      account.stopReason = "Arrêt demandé; cours vérifié indisponible, position fictive conservée.";
      account.lastUpdatedAt = dependencies.now().toISOString();
    }
    const saved = await commit(userId, existing.revision, account);
    if (!saved) return { status: "error" };
    return { status: "stopped", account };
  }

  async function processScheduledAccounts(): Promise<void> {
    if (!dependencies.ready()) return;
    const collection = dependencies.collection();
    if (!collection) return;
    let documents: CryptoPaperAutopilotDocument[];
    try {
      documents = await collection.find({ status: "running" }).toArray();
    } catch (error) {
      logger.warn({ err: error }, "Could not list crypto paper autopilots");
      return;
    }
    if (!documents.length) return;

    let market: CryptoPaperMarket;
    try {
      market = await dependencies.market();
      validateMarket(market);
    } catch (error) {
      logger.warn({ err: error }, "Crypto paper autopilot market data unavailable");
      return;
    }

    for (const document of documents) {
      try {
        const decoded = decodeDocument(document, dependencies.decrypt);
        if (decoded.account.status !== "running") continue;
        const advanced = advanceCryptoPaperAutopilot(decoded.account, market, dependencies.now().getTime());
        if (!advanced.changed) continue;
        const saved = await commit(decoded.account.ownerDiscordId, decoded.revision, advanced.account);
        if (!saved) logger.debug({ account: document._id }, "Concurrent crypto paper autopilot update skipped");
      } catch (error) {
        logger.warn({ err: error, account: document._id }, "Crypto paper autopilot account was not advanced");
      }
    }
  }

  return { get, start, refresh, stop, processScheduledAccounts };
}

export const cryptoPaperAutopilot = createCryptoPaperAutopilot();

let schedulerRunning = false;
const startedSchedulers = new WeakSet<Client>();
export function startCryptoPaperAutopilotScheduler(client: Client): void {
  if (startedSchedulers.has(client)) return;
  startedSchedulers.add(client);
  const timer = setInterval(() => {
    if (schedulerRunning) return;
    schedulerRunning = true;
    void cryptoPaperAutopilot.processScheduledAccounts()
      .catch(error => logger.error({ err: error }, "Crypto paper autopilot scheduler failed"))
      .finally(() => { schedulerRunning = false; });
  }, CRYPTO_PAPER_AUTOPILOT_POLL_MS);
  timer.unref();
  void cryptoPaperAutopilot.processScheduledAccounts().catch(error =>
    logger.error({ err: error }, "Crypto paper autopilot startup recovery failed"));
}

export function buildCryptoPaperAutopilotEmbed(account: CryptoPaperAutopilotAccount, language: string) {
  const french = language === "fr";
  const locale = french ? "fr-FR" : "en-GB";
  const money = new Intl.NumberFormat(locale, {
    style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 4,
  });
  const percent = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
  const name = (asset: CryptoAsset) => `${CRYPTO_ASSETS[asset].name} (${CRYPTO_ASSETS[asset].ticker})`;
  const position = account.asset
    ? `${name(account.asset)} · ${account.quantity.toFixed(8)} · ${account.lastMarkPriceEur
      ? money.format(account.lastMarkPriceEur) : (french ? "cours en attente" : "waiting for quote")}`
    : french ? "En euros simulés, en attente d’un signal" : "Simulated euros, waiting for a signal";
  const status = account.status === "running"
    ? french ? "En cours" : "Running"
    : account.status === "finished"
      ? french ? "Terminé" : "Finished" : french ? "Arrêté" : "Stopped";
  const trades = account.trades.slice(-8).reverse().map(trade => {
    const when = new Date(trade.at).toLocaleString(locale, { timeZone: "Europe/Paris" });
    const side = trade.side === "buy" ? (french ? "Achat" : "Buy") : (french ? "Vente" : "Sell");
    return `${when} · ${side} ${name(trade.asset)} · ${money.format(trade.priceEur)} · ${
      french ? "frais" : "fee"} ${money.format(trade.feeEur)}`;
  }).join("\n");
  const embed = {
    color: account.currentValueEur >= account.budgetEur ? 0x26a269 : 0xe5534b,
    title: french ? "🧪 Paper trading automatique" : "🧪 Automatic paper trading",
    description: french
      ? `Simulation fictive de **10 €**, limitée à **30 jours**. Règle fixe : croisements de moyennes mobiles 24 h / 72 h sur BTC, ETH et SOL. **Aucun gain n’est promis; le résultat peut être inférieur à 10 €.**`
      : `A fictional **€10** simulation limited to **30 days**. Fixed rule: 24 h / 72 h moving-average crossovers on BTC, ETH and SOL. **No profit is promised; the result can be below €10.**`,
    fields: [
      { name: french ? "État" : "Status", value: status, inline: true },
      { name: french ? "Portefeuille estimé" : "Estimated portfolio", value: `${money.format(account.currentValueEur)} · ${percent((account.currentValueEur - account.budgetEur) / account.budgetEur * 100)}`, inline: true },
      { name: french ? "Position" : "Position", value: position, inline: false },
      { name: french ? "Ordres fictifs" : "Paper trades", value: String(account.tradeCount), inline: true },
      { name: french ? "Recul maximal" : "Maximum drawdown", value: `${account.maxDrawdownPercent.toFixed(2)}%`, inline: true },
      { name: french ? "Frais / glissement" : "Fees / slippage", value: `${money.format(account.feesEur)} / ${money.format(account.slippageEur)}`, inline: true },
      { name: french ? "Dernière actualisation" : "Last updated", value: new Date(account.lastUpdatedAt).toLocaleString(locale, { timeZone: "Europe/Paris" }), inline: false },
      { name: french ? "Période" : "Period", value: `${new Date(account.startedAt).toLocaleString(locale, { timeZone: "Europe/Paris" })} → ${new Date(account.endsAt).toLocaleString(locale, { timeZone: "Europe/Paris" })}`, inline: false },
      ...(trades ? [{ name: french ? "Derniers ordres fictifs" : "Latest paper trades", value: trades, inline: false }] : []),
      ...(account.stopReason ? [{ name: french ? "État final" : "Final status", value: account.stopReason, inline: false }] : []),
    ],
    footer: {
      text: french
        ? `Cours horaires publics Binance · frais ${account.feeRate * 100}% et glissement ${account.slippageRate * 100}% supposés par côté · aucune clé ni transaction réelle`
        : `Public Binance hourly candles · assumed ${account.feeRate * 100}% fees and ${account.slippageRate * 100}% slippage per side · no API key or real trade`,
    },
  };
  return embed;
}
