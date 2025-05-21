import { Strategy } from "../strategy";
import ccxt from "ccxt";
import { EMA, RSI, BollingerBands, ATR } from "technicalindicators";
import { toNumberArray, toBBArray } from "../indicatorUtils";

// Simple in-memory state for last trade timestamp and trade history
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
			undefined, // since is undefined: fetch latest
			params.limit || 1000
		);
		if (!ohlcv || ohlcv.length === 0)
			throw new Error("No data returned from Binance");

		// Prepare data
		const closes = ohlcv.map((c) => Number(c[4])).filter((v) => !isNaN(v));
		const highs = ohlcv.map((c) => Number(c[2])).filter((v) => !isNaN(v));
		const lows = ohlcv.map((c) => Number(c[3])).filter((v) => !isNaN(v));
		const timestamps = ohlcv.map((c) => c[0]);

		// Indicators
		const emaPeriod = 21;
		const rsiPeriod = 14;
		const bbPeriod = 20;
		const bbStdDev = 2;
		const atrPeriod = 14;
		const ema = toNumberArray(
			EMA.calculate({ period: emaPeriod, values: closes })
		);
		const rsi = toNumberArray(
			RSI.calculate({ period: rsiPeriod, values: closes })
		);
		const bb = toBBArray(
			BollingerBands.calculate({
				period: bbPeriod,
				stdDev: bbStdDev,
				values: closes,
			})
		);
		const atr = toNumberArray(
			ATR.calculate({
				period: atrPeriod,
				high: highs,
				low: lows,
				close: closes,
			})
		);

		// Align all arrays
		const minLen = Math.min(ema.length, rsi.length, bb.length, atr.length);
		const offset = closes.length - minLen;
		const closesAligned = closes.slice(offset);
		const timestampsAligned = timestamps.slice(offset);
		const emaAligned = ema.slice(ema.length - minLen);
		const rsiAligned = rsi.slice(rsi.length - minLen);
		const bbAligned = bb.slice(bb.length - minLen);
		const atrAligned = atr.slice(atr.length - minLen);

		// EMA slope: true if up, false if down
		const emaSlope =
			emaAligned.length > 1
				? emaAligned[emaAligned.length - 1] > emaAligned[emaAligned.length - 2]
				: false;
		const latestClose = closesAligned[closesAligned.length - 1] ?? 0;
		const latestBB = bbAligned[bbAligned.length - 1] ?? { upper: 0, lower: 0 };
		const latestRSI = rsiAligned[rsiAligned.length - 1] ?? 0;
		const latestATR = atrAligned[atrAligned.length - 1] ?? 0;
		const latestCloseTimestamp =
			timestampsAligned[timestampsAligned.length - 1] ?? 0;

		// Config (could be user-supplied)
		const config = {
			strategy: {
				rsiOverbought: 70,
				rsiOversold: 30,
			},
			timeframe: params.timeframe,
		};

		// Evaluate trade conditions
		const longCond =
			latestClose > latestBB.upper &&
			latestRSI < config.strategy.rsiOverbought &&
			emaSlope;
		const shortCond =
			latestClose < latestBB.lower &&
			latestRSI > config.strategy.rsiOversold &&
			!emaSlope;

		// Prevent duplicate trades for same candle
		const stateKey = `${params.symbol}_${params.timeframe}`;
		if (!tradeState[stateKey]) tradeState[stateKey] = { history: [] };
		const lastTradeTimestamp = tradeState[stateKey].lastTradeTimestamp;
		let tradeExecuted = false;
		let tradeType = null;
		if (lastTradeTimestamp !== latestCloseTimestamp) {
			if (longCond) {
				tradeExecuted = true;
				tradeType = "long";
			} else if (shortCond) {
				tradeExecuted = true;
				tradeType = "short";
			}
			if (tradeExecuted) {
				tradeState[stateKey].lastTradeTimestamp = latestCloseTimestamp;
				tradeState[stateKey].history.push({
					symbol: params.symbol,
					timeframe: params.timeframe,
					timestamp: latestCloseTimestamp,
					type: tradeType,
				});
			}
		}

		// Return chart-ready and trade info
		return {
			result: {
				dates: timestampsAligned.map((t) => new Date(t ?? 0).toISOString()),
				price: closesAligned,
				ema: emaAligned,
				rsi: rsiAligned,
				bbUpper: bbAligned.map((b) => b.upper),
				bbLower: bbAligned.map((b) => b.lower),
				bbMiddle: bbAligned.map((b) => b.middle),
				atr: atrAligned,
				lastTrade: tradeExecuted
					? {
							type: tradeType,
							timestamp: latestCloseTimestamp,
							price: latestClose,
							atr: latestATR,
					  }
					: null,
				tradeHistory: tradeState[stateKey].history,
				tradeSignal: { longCond, shortCond },
			},
		};
	}
}
