import test from "node:test";
import assert from "node:assert/strict";
import {
  createCryptoPaperSimulator,
  createKrakenPriceProvider,
  isCryptoAsset,
  parseKrakenQuote,
  valuePaperAccount,
  type CryptoAsset,
} from "../src/discord/crypto-simulator.js";

const observedAt = "2026-11-22T16:00:00.000Z";
function ticker(asset: CryptoAsset, bid: string, ask: string) {
  const resultKey = asset === "btc" ? "XXBTZEUR" : asset === "eth" ? "XETHZEUR" : "SOLEUR";
  return { error: [], result: { [resultKey]: { b: [bid], a: [ask] } } };
}

test("Kraken quote parsing accepts only a valid requested EUR market", () => {
  assert.deepEqual(parseKrakenQuote(ticker("btc", "55472.4", "55472.9"), "btc", observedAt), {
    bidEur: 55472.4, askEur: 55472.9, observedAt,
  });
  assert.throws(() => parseKrakenQuote({ error: ["EAPI:Rate limit exceeded"], result: {} }, "btc"), /invalid ticker/i);
  assert.throws(() => parseKrakenQuote(ticker("eth", "100", "101"), "btc"), /omitted/i);
  assert.throws(() => parseKrakenQuote(ticker("sol", "101", "100"), "sol"), /invalid market prices/i);
  assert.equal(isCryptoAsset("btc"), true);
  assert.equal(isCryptoAsset("doge"), false);
});

test("public ticker requests use the fixed Kraken EUR market and cache briefly", async () => {
  let calls = 0, now = Date.parse(observedAt), requested = "";
  const provider = createKrakenPriceProvider(async input => {
    calls++;
    requested = String(input);
    return new Response(JSON.stringify(ticker("btc", "99", "100")), { status: 200 });
  }, () => now, 5_000);
  const first = await provider("btc");
  const cached = await provider("btc");
  assert.equal(calls, 1);
  assert.match(requested, /api\.kraken\.com\/0\/public\/Ticker\?pair=XBTEUR/);
  assert.equal(first.askEur, 100);
  assert.equal(cached.observedAt, observedAt);
  now += 5_001;
  await provider("btc");
  assert.equal(calls, 2);
});

test("paper account starts with exactly €10, stays private, persists encrypted and resets", async () => {
  type Document = { _id: string; encryptedData: string; updatedAt: Date };
  const documents = new Map<string, Document>();
  const collection = {
    findOne: async ({ _id }: { _id: string }) => documents.get(_id) ?? null,
    updateOne: async ({ _id }: { _id: string }, update: { $setOnInsert: Omit<Document, "_id"> }) => {
      if (documents.has(_id)) return { upsertedCount: 0 };
      documents.set(_id, { _id, ...update.$setOnInsert });
      return { upsertedCount: 1 };
    },
    deleteOne: async ({ _id }: { _id: string }) => ({ deletedCount: documents.delete(_id) ? 1 : 0 }),
  };
  const simulator = createCryptoPaperSimulator({
    ready: () => true,
    collection: () => collection as never,
    hash: value => `hash:${value}`,
    encrypt: value => `encrypted:${value}`,
    decrypt: value => value.replace(/^encrypted:/, ""),
    quote: async () => ({ bidEur: 99, askEur: 100, observedAt }),
    now: () => new Date(observedAt),
  });

  const started = await simulator.start("user-one", "btc");
  assert.equal(started.status, "created");
  if (started.status !== "created") return;
  assert.equal(started.account.budgetEur, 10);
  assert.equal(started.account.quantity, 0.1);
  const valuation = valuePaperAccount(started.account, started.quote);
  assert.ok(Math.abs(valuation.currentValueEur - 9.9) < 1e-10);
  assert.ok(Math.abs(valuation.profitEur + 0.1) < 1e-10);
  assert.ok(Math.abs(valuation.profitPercent + 1) < 1e-10);
  assert.equal((await simulator.get("user-two")).status, "empty");
  const stored = documents.get("hash:crypto-paper:user-one");
  assert.ok(stored?.encryptedData.startsWith("encrypted:"));
  assert.ok(!stored?.encryptedData.includes("user-one"));
  assert.equal((await simulator.start("user-one", "eth")).status, "exists");
  assert.equal((await simulator.reset("user-one")), "deleted");
  assert.equal((await simulator.get("user-one")).status, "empty");
});

test("simulator fails closed when persistence or current price is unavailable", async () => {
  const unavailable = createCryptoPaperSimulator({
    ready: () => false, collection: () => null, hash: value => value,
    encrypt: value => value, decrypt: value => value,
    quote: async () => ({ bidEur: 1, askEur: 1, observedAt }),
  });
  assert.equal((await unavailable.start("u", "btc")).status, "unavailable");

  const failedQuote = createCryptoPaperSimulator({
    ready: () => true,
    collection: () => ({
      findOne: async () => null,
      updateOne: async () => ({ upsertedCount: 0 }),
      deleteOne: async () => ({ deletedCount: 0 }),
    }) as never,
    hash: value => value, encrypt: value => value, decrypt: value => value,
    quote: async () => { throw new Error("offline"); },
  });
  assert.equal((await failedQuote.start("u", "btc")).status, "price_unavailable");
});
