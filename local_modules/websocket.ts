import { pro as ccxt } from "ccxt";
import { config } from "./utils/config";

// In-memory cache: { [symbol_timeframe]: [ [timestamp, open, high, low, close, volume], ... ] }
const ohlcvCache: Record<string, Array<any[]>> = {};
const exchange = new ccxt.binance({
	apiKey: config.binanceApiKey,
	secret: config.binanceApiSecret,
	options: { defaultType: "margin" },
	enableRateLimit: true,
});

export async function subscribeOhlcv(
	symbol: string,
	timeframe: string,
	limit: number = 1000
) {
	const cacheKey = `${symbol}_${timeframe}`;
	if (ohlcvCache[cacheKey]) return; // Already subscribed
	ohlcvCache[cacheKey] = [];
	(async () => {
		while (true) {
			try {
				for await (const ohlcv of await exchange.watchOHLCV(
					symbol,
					timeframe
				)) {
					// ohlcv: [timestamp, open, high, low, close, volume]
					ohlcvCache[cacheKey].push(ohlcv);
					if (ohlcvCache[cacheKey].length > limit) {
						ohlcvCache[cacheKey] = ohlcvCache[cacheKey].slice(-limit);
					}
					if (ohlcvBroadcast) ohlcvBroadcast(symbol, timeframe);
				}
			} catch (err) {
				console.error("WebSocket OHLCV error:", err);
				await new Promise((r) => setTimeout(r, 5000)); // Retry after delay
			}
		}
	})();
}

export function getCachedOhlcv(
	symbol: string,
	timeframe: string,
	limit: number = 1000
) {
	const cacheKey = `${symbol}_${timeframe}`;
	const arr = ohlcvCache[cacheKey] || [];
	return arr.slice(-limit);
}

let ohlcvBroadcast: ((symbol: string, timeframe: string) => void) | undefined;

export function patchOhlcvBroadcast(
	fn: (symbol: string, timeframe: string) => void
) {
	ohlcvBroadcast = fn;
}
