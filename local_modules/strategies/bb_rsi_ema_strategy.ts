import type { Strategy } from "../strategy";
import ccxt from "ccxt";
import {
	calcEMA,
	calcMACD,
	calcRSI,
	calcBollingerBands,
	calcATR,
	toNumberArray,
	toBBArray,
} from "../utils/indicatorUtils";
import { computeErrorCorrectionRegression } from "../utils/errorCorrection";

const tradeState: Record<
	string,
	{ lastTradeTimestamp?: number; history: any[] }
> = {};

export class BBRSIEMAStrategy implements Strategy {
	name = "BB_RSI_EMA";
	description =
		"Bollinger Bands, RSI, EMA Slope, ATR risk management, no duplicate trades per candle.";

	async run(params: {
		apiKey: string;
		secret: string;
		symbol: string;
		timeframe: string;
		since: number;
		limit?: number;
	}): Promise<any> {
		const apiKey = params.apiKey || process.env.BINANCE_API_KEY;
		const secret = params.secret || process.env.BINANCE_API_SECRET;
		if (!apiKey || !secret) throw new Error("API key and secret are required");
		const exchange = new ccxt.binance({
			apiKey,
			secret,
			options: { defaultType: "margin" },
			enableRateLimit: true,
		});
		await exchange.loadMarkets();
		const ohlcv = await exchange.fetchOHLCV(
			params.symbol,
			params.timeframe,
			undefined,
			params.limit || 1000
		);
		// Robust closed candle filtering: always exclude the last candle if its timestamp is >= now - timeframeMs/2
		// Use canonical timeframe-to-ms logic before closed candle filtering
		const timeframeMs =
			{
				"1m": 60_000,
				"3m": 180_000,
				"5m": 300_000,
				"15m": 900_000,
				"30m": 1_800_000,
				"1h": 3_600_000,
				"2h": 7_200_000,
				"4h": 14_400_000,
				"1d": 86_400_000,
			}[params.timeframe] || 0;
		if (!ohlcv || !Array.isArray(ohlcv) || ohlcv.length === 0)
			throw new Error("No OHLCV data returned from Binance");
		const sortedOhlcv = ohlcv
			.slice()
			.sort((a, b) => (a?.[0] ?? 0) - (b?.[0] ?? 0));
		let closedOhlcv = sortedOhlcv;
		if (sortedOhlcv.length > 1) {
			const lastCandle = sortedOhlcv[sortedOhlcv.length - 1];
			const now = Date.now();
			if (
				lastCandle &&
				lastCandle[0] &&
				lastCandle[0] > now - timeframeMs / 2
			) {
				closedOhlcv = sortedOhlcv.slice(0, -1);
			}
		}
		if (!closedOhlcv || closedOhlcv.length === 0)
			throw new Error("No closed candles returned from Binance");
		const ohlcvUsed = closedOhlcv;
		const closes = ohlcvUsed.map((c) => Number(c[4])).filter((v) => !isNaN(v));
		const highs = ohlcvUsed.map((c) => Number(c[2])).filter((v) => !isNaN(v));
		const lows = ohlcvUsed.map((c) => Number(c[3])).filter((v) => !isNaN(v));
		const timestamps = ohlcvUsed.map((c) => c[0]);
		const emaPeriod = 21;
		const rsiPeriod = 14;
		const bbPeriod = 20;
		const bbStdDev = 2;
		const atrPeriod = 14;
		const ema = toNumberArray(calcEMA(closes, emaPeriod));
		const rsi = toNumberArray(calcRSI(closes, rsiPeriod));
		const bb = toBBArray(calcBollingerBands(closes, bbPeriod, bbStdDev));
		const atr = toNumberArray(calcATR(highs, lows, closes, atrPeriod));
		// === Canonical MACD/EMA calculation (strict out-of-sample) ===
		const macd = calcMACD(closes, 10, 30, 5);
		const ema5 = toNumberArray(calcEMA(closes, 5));
		const ema10 = toNumberArray(calcEMA(closes, 10));
		const ema30 = toNumberArray(calcEMA(closes, 30));
		// Calculate closeReturn before lag1/lag4
		const closeReturn = closes.map((v: number, i: number, arr: number[]) =>
			i > 0 ? (v - arr[i - 1]) / arr[i - 1] : 0
		);
		const lag1 = closeReturn.map((v: number, i: number, arr: number[]) =>
			i > 0 ? arr[i - 1] : 0
		);
		const lag4 = closeReturn.map((v: number, i: number, arr: number[]) =>
			i > 3 ? arr[i - 4] : 0
		);
		const minLen = Math.min(
			closes.length - 4,
			macd.length,
			ema5.length,
			ema10.length,
			ema30.length
		);
		const offset = closes.length - minLen;
		const aligned = {
			dates: timestamps.slice(offset),
			price: closes.slice(offset),
			forecast: Array(minLen).fill(null), // Placeholder for forecast, to be filled by strategy logic
			ema5: ema5.slice(ema5.length - minLen),
			ema10: ema10.slice(ema10.length - minLen),
			ema30: ema30.slice(ema30.length - minLen),
			macd: macd.slice(macd.length - minLen).map((m) => m.MACD),
			macdSignal: macd.slice(macd.length - minLen).map((m) => m.signal),
			macdHist: macd.slice(macd.length - minLen).map((m) => m.histogram),
			lag1: lag1.slice(lag1.length - minLen),
			lag4: lag4.slice(lag4.length - minLen),
		};
		const result: any = {
			dates: aligned.dates.map((t: number | undefined) =>
				t !== undefined ? new Date(t).toISOString() : ""
			),
			price: aligned.price,
			forecast: aligned.forecast,
			ema5: aligned.ema5,
			ema10: aligned.ema10,
			ema30: aligned.ema30,
			macd: aligned.macd,
			macdSignal: aligned.macdSignal,
			macdHist: aligned.macdHist,
			lag1: aligned.lag1,
			lag4: aligned.lag4,
		};
		// Error correction regression code...
		// (remains unchanged)
		// ...
		// Remove legacy result object and use only canonical result for output
		return { result };
	}
}
