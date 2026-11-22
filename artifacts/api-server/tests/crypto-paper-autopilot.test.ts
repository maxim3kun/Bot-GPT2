import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceCryptoPaperAutopilot,
  buildCryptoPaperAutopilotEmbed,
  createCryptoPaperAutopilot,
  CRYPTO_PAPER_AUTOPILOT_DURATION_MS,
  type CryptoPaperAutopilotAccount,
  type CryptoPaperMarket,
} from "../src/discord/crypto-paper-autopilot.js";
import type { CryptoAsset } from "../src/discord/crypto-simulator.js";
import type { HourlyCandle } from "../src/discord/crypto-strategy.js";

const hour = 60 * 60 * 1000;
const startTime = Date.parse("2026-11-01T00:00:00.000Z");

function makeCandles(prices: number[], start = startTime): HourlyCandle[] {
  return prices.map((close, index) => {
    const openTime = start + index * hour;
    return { openTime, closeTime: openTime + hour - 1, open: close, high: close, low: close, close };
  });
}

function flatMarket(count = 100): CryptoPaperMarket {
  const candles = makeCandles(Array.from({ length: count }, () => 100));
  return { btc: candles, eth: candles, sol: candles };
}

function account(
  lastProcessedCandleOpenTime: number,
  overrides: Partial<CryptoPaperAutopilotAccount> = {},
): CryptoPaperAutopilotAccount {
  return {
    version: 1,
    ownerDiscordId: "123456789012345678",
    status: "running",
    budgetEur: 10,
    cashEur: 10,
    asset: null,
    quantity: 0,
    startedAt: new Date(startTime).toISOString(),
    endsAt: new Date(startTime + CRYPTO_PAPER_AUTOPILOT_DURATION_MS).toISOString(),
    lastProcessedCandleOpenTime,
    lastUpdatedAt: new Date(startTime).toISOString(),
    lastMarkPriceEur: null,
    currentValueEur: 10,
    peakValueEur: 10,
    maxDrawdownPercent: 0,
    feeRate: 0.001,
    slippageRate: 0.0015,
    feesEur: 0,
    slippageEur: 0,
    tradeCount: 0,
    trades: [],
    ...overrides,
  };
}

function fakeStore() {
  type Doc = { _id: string; encryptedData: string; revision: number; status: string; updatedAt: Date };
  const documents = new Map<string, Doc>();
  const collection = {
    findOne: async ({ _id }: { _id: string }) => documents.get(_id) ?? null,
    find: ({ status }: { status: string }) => ({
      toArray: async () => [...documents.values()].filter(document => document.status === status),
    }),
    updateOne: async (
      filter: { _id: string; revision?: number },
      update: {
        $setOnInsert?: Omit<Doc, "_id">;
        $set?: Omit<Doc, "_id">;
      },
      options?: { upsert?: boolean },
    ) => {
      const current = documents.get(filter._id);
      if (update.$setOnInsert) {
        if (current) return { matchedCount: 0, upsertedCount: 0 };
        if (!options?.upsert) throw new Error("expected upsert");
        documents.set(filter._id, { _id: filter._id, ...update.$setOnInsert });
        return { matchedCount: 0, upsertedCount: 1 };
      }
      if (!current || current.revision !== filter.revision || !update.$set) {
        return { matchedCount: 0, upsertedCount: 0 };
      }
      documents.set(filter._id, { _id: filter._id, ...update.$set });
      return { matchedCount: 1, upsertedCount: 0 };
    },
  };
  return { documents, collection };
}

function makeSimulator(args: {
  now: () => Date;
  market: () => Promise<CryptoPaperMarket>;
  collection: ReturnType<typeof fakeStore>["collection"];
  ready?: () => boolean;
  ownerId?: string;
}) {
  return createCryptoPaperAutopilot({
    ownerId: () => args.ownerId ?? "123456789012345678",
    ready: args.ready ?? (() => true),
    collection: () => args.collection as never,
    hash: value => `hashed:${value}`,
    encrypt: value => `sealed:${Buffer.from(value).toString("base64")}`,
    decrypt: value => Buffer.from(value.replace(/^sealed:/, ""), "base64").toString("utf8"),
    market: args.market,
    now: args.now,
  });
}

test("flat hourly data advances the private paper account without inventing trades", () => {
  const candles = makeCandles(Array.from({ length: 100 }, () => 100));
  const source = account(candles[94]!.openTime);
  const result = advanceCryptoPaperAutopilot(
    source,
    { btc: candles, eth: candles, sol: candles },
    candles[99]!.closeTime + 1,
  );
  assert.equal(result.changed, true);
  assert.equal(result.account.lastProcessedCandleOpenTime, candles[99]!.openTime);
  assert.equal(result.account.status, "running");
  assert.equal(result.account.currentValueEur, 10);
  assert.equal(result.account.tradeCount, 0);
  assert.equal(result.account.asset, null);
});

test("the 30-day finish liquidates a simulated position with both assumed costs", () => {
  const candles = makeCandles(Array.from({ length: 100 }, () => 100));
  const end = candles[99]!.closeTime;
  const source = account(candles[98]!.openTime, {
    asset: "btc",
    cashEur: 0,
    quantity: 0.1,
    lastMarkPriceEur: 100,
    currentValueEur: 9.98,
    endsAt: new Date(end).toISOString(),
  });
  const result = advanceCryptoPaperAutopilot(
    source, { btc: candles, eth: candles, sol: candles }, end + 1,
  );
  assert.equal(result.account.status, "finished");
  assert.equal(result.account.asset, null);
  assert.equal(result.account.quantity, 0);
  assert.equal(result.account.trades.at(-1)?.reason, "expired");
  assert.ok(result.account.feesEur > 0);
  assert.ok(result.account.slippageEur > 0);
  assert.ok(result.account.currentValueEur < 10);
});

test("explicit stop ends the test and closes any simulated position at a verified hourly close", () => {
  const candles = makeCandles(Array.from({ length: 100 }, () => 100));
  const source = account(candles[98]!.openTime, {
    asset: "eth",
    cashEur: 0,
    quantity: 0.1,
    lastMarkPriceEur: 100,
    currentValueEur: 9.98,
  });
  const result = advanceCryptoPaperAutopilot(
    source, { btc: candles, eth: candles, sol: candles }, candles[99]!.closeTime + 1, true,
  );
  assert.equal(result.account.status, "stopped");
  assert.equal(result.account.asset, null);
  assert.equal(result.account.trades.at(-1)?.reason, "stopped");
  assert.match(result.account.stopReason ?? "", /position fictive clôturée/);
});

test("start is private per Discord ID, lasts 30 days and never stores the ID in plaintext", async () => {
  const store = fakeStore();
  const market = flatMarket();
  const now = new Date(market.btc.at(-1)!.closeTime + 1);
  const simulator = makeSimulator({ now: () => now, market: async () => market, collection: store.collection });

  const started = await simulator.start("123456789012345678");
  assert.equal(started.status, "created");
  if (started.status !== "created") return;
  assert.equal(Date.parse(started.account.endsAt) - Date.parse(started.account.startedAt), CRYPTO_PAPER_AUTOPILOT_DURATION_MS);
  assert.equal(started.account.cashEur, 10);
  assert.equal(started.account.asset, null);
  assert.equal((await simulator.get("another-user")).status, "forbidden");
  assert.equal((await simulator.start("another-user")).status, "forbidden");
  assert.equal((await simulator.start("123456789012345678")).status, "exists");
  const stored = [...store.documents.values()][0]!;
  assert.ok(stored._id.startsWith("hashed:crypto-paper-autopilot:"));
  assert.ok(stored.encryptedData.startsWith("sealed:"));
  assert.ok(!stored.encryptedData.includes(started.account.ownerDiscordId));
});

test("concurrent scheduler passes use revision checks and do not replay a candle", async () => {
  const store = fakeStore();
  let currentMarket = flatMarket();
  let now = new Date(currentMarket.btc.at(-1)!.closeTime + 1);
  const first = makeSimulator({ now: () => now, market: async () => currentMarket, collection: store.collection });
  const second = makeSimulator({ now: () => now, market: async () => currentMarket, collection: store.collection });
  await first.start("123456789012345678");
  const started = await first.get("123456789012345678");
  assert.equal(started.status, "ok");
  if (started.status !== "ok") return;

  currentMarket = flatMarket(102);
  now = new Date(currentMarket.btc.at(-1)!.closeTime + 1);
  await Promise.all([first.processScheduledAccounts(), second.processScheduledAccounts()]);
  const stored = [...store.documents.values()][0]!;
  const current = await first.get("123456789012345678");
  assert.equal(current.status, "ok");
  assert.equal(stored.revision, 1);
  if (current.status === "ok") {
    assert.equal(current.account.lastProcessedCandleOpenTime, currentMarket.btc.at(-1)!.openTime);
    assert.equal(current.account.tradeCount, 0);
  }
});

test("status embed states that automation is fictional and reports cost and stop controls", () => {
  const candles = flatMarket().btc;
  const embed = buildCryptoPaperAutopilotEmbed(account(candles[98]!.openTime), "fr");
  assert.match(embed.description, /fictive/);
  assert.match(embed.footer.text, /aucune clé ni transaction réelle/);
  assert.ok(embed.fields.some(field => field.name === "Ordres fictifs"));
  assert.ok(embed.fields.some(field => field.name === "Frais / glissement"));
});

