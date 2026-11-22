import assert from "node:assert/strict";
import test from "node:test";
import {
  createBinanceHourlyCandleProvider,
  parseBinanceHourlyCandles,
  runSmaCrossoverBacktest,
  type HourlyCandle,
} from "../src/discord/crypto-strategy.js";

const hour = 60 * 60 * 1000;
const now = 1_800_000_000_000;

function row(openTime: number, open: number, high: number, low: number, close: number, closeTime = openTime + hour - 1) {
  return [openTime, String(open), String(high), String(low), String(close), "1", closeTime, "1", 1, "1", "1", "0"];
}

function candle(index: number, close: number, open = close): HourlyCandle {
  return {
    openTime: now - (12 - index) * hour,
    open,
    high: Math.max(open, close) + 1,
    low: Math.min(open, close) - 1,
    close,
    closeTime: now - (12 - index) * hour + hour - 1,
  };
}

test("Binance parser keeps only complete, ordered, continuous hourly EUR candles", () => {
  const completed = row(now - 2 * hour, 10, 12, 9, 11);
  const partial = row(now - hour, 11, 12, 10, 11, now + hour);
  assert.deepEqual(parseBinanceHourlyCandles([completed, partial], now), [{
    openTime: now - 2 * hour,
    open: 10,
    high: 12,
    low: 9,
    close: 11,
    closeTime: now - hour - 1,
  }]);

  assert.throws(() => parseBinanceHourlyCandles({ error: "bad" }, now), /invalid candle list/i);
  assert.throws(() => parseBinanceHourlyCandles([row(now - 3 * hour, 10, 9, 8, 10)], now), /invalid candle values/i);
  assert.throws(() => parseBinanceHourlyCandles([
    row(now - 4 * hour, 10, 12, 9, 11),
    row(now - 2 * hour, 11, 12, 10, 11),
  ], now), /hourly gap/i);
});

test("public Binance candle provider uses a fixed EUR symbol and short cache", async () => {
  let calls = 0;
  let requested = "";
  const provider = createBinanceHourlyCandleProvider(async input => {
    calls++;
    requested = String(input);
    return new Response(JSON.stringify([
      row(now - 2 * hour, 10, 12, 9, 11),
      row(now - hour, 11, 12, 10, 11, now + hour),
    ]), { status: 200 });
  }, () => now, 5_000);

  const first = await provider("btc");
  const cached = await provider("btc");
  assert.equal(calls, 1);
  assert.match(requested, /api\.binance\.com\/api\/v3\/klines\?symbol=BTCEUR&interval=1h&limit=721/);
  assert.equal(first.length, 1);
  assert.equal(cached[0]?.close, 11);
});

test("moving-average crossover waits for completed candles and fills on the next open", () => {
  const closes = [10, 10, 10, 11, 12, 13, 14, 10, 8, 6, 6, 6];
  const candles = closes.map((close, index) => candle(index, close, close));
  const result = runSmaCrossoverBacktest("btc", candles, {
    initialEur: 10,
    feeRate: 0,
    fastWindow: 2,
    slowWindow: 3,
  });

  assert.deepEqual(result.trades.map(trade => trade.side), ["buy", "sell"]);
  assert.equal(result.trades[0]?.at, candles[4]?.openTime);
  assert.equal(result.trades[0]?.priceEur, candles[4]?.open);
  assert.equal(result.trades[1]?.at, candles[8]?.openTime);
  assert.equal(result.tradeCount, 2);
  assert.ok(result.finalValueEur < 10);
  assert.ok(result.maxDrawdownPercent > 0);
});

test("backtest includes assumed fees and rejects insufficient or invalid input", () => {
  const candles = [10, 10, 10, 11, 12, 13, 14, 10, 8, 6, 6, 6].map((close, index) => candle(index, close));
  const result = runSmaCrossoverBacktest("eth", candles, {
    feeRate: 0.001,
    fastWindow: 2,
    slowWindow: 3,
  });
  assert.ok(result.feesEur > 0);
  assert.equal(result.asset, "eth");
  assert.throws(() => runSmaCrossoverBacktest("btc", candles.slice(0, 4), { fastWindow: 2, slowWindow: 3 }), /not enough/i);
  assert.throws(() => runSmaCrossoverBacktest("btc", candles, { feeRate: -0.1 }), /fee rate/i);
  const discontinuous = candles.slice(0, 5);
  discontinuous[1] = { ...discontinuous[1]!, openTime: discontinuous[1]!.openTime + 10 };
  assert.throws(() => runSmaCrossoverBacktest("btc", discontinuous, {
    fastWindow: 2,
    slowWindow: 3,
  }), /continuous hourly data/i);
});
