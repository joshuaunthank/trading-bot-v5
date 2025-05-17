import { Strategy } from "../strategy";
import ccxt from "ccxt";
import { MACD, EMA } from "technicalindicators";

export class ArimaMacdStrategy implements Strategy {
	name = "ARIMA_MACD";
	description = "AR(4) + MACD/EMA forecasting with error correction.";

	async run(params: {
		apiKey: string;
		secret: string;
		symbol: string;
		timeframe: string;
		since: number;
		limit?: number;
	}): Promise<any> {
		// 1. Fetch OHLCV data from Binance margin
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

		// 2. Prepare data (filter out undefined values)
		const closes = ohlcv
			.map((c) => c[4])
			.filter((v): v is number => typeof v === "number");
		const opens = ohlcv
			.map((c) => c[1])
			.filter((v): v is number => typeof v === "number");
		const timestamps = ohlcv
			.map((c) => c[0])
			.filter((v): v is number => typeof v === "number");
		const openToCloseReturn = closes.map(
			(close, i) => (close - opens[i]) / opens[i]
		);

		// 3. AR(4) forecast
		const arCoefficients = [0.25, 0.25, 0.25, 0.25];
		const forecastedDiff: number[] = [];
		for (let i = 4; i < openToCloseReturn.length; i++) {
			const diff =
				arCoefficients[0] * openToCloseReturn[i - 1] +
				arCoefficients[1] * openToCloseReturn[i - 2] +
				arCoefficients[2] * openToCloseReturn[i - 3] +
				arCoefficients[3] * openToCloseReturn[i - 4];
			forecastedDiff.push(diff);
		}
		const arimaForecast: number[] = [];
		for (let i = 4; i < closes.length; i++) {
			arimaForecast.push(closes[i - 1] * (1 + forecastedDiff[i - 4]));
		}

		// 4. MACD and EMA indicators (all values are now number[])
		const macdInput = {
			values: closes.slice(0, closes.length - 1),
			fastPeriod: 10,
			slowPeriod: 30,
			signalPeriod: 5,
			SimpleMAOscillator: false,
			SimpleMASignal: false,
		};
		const macd = MACD.calculate(macdInput);
		const ema5 = EMA.calculate({ period: 5, values: closes });
		const ema10 = EMA.calculate({ period: 10, values: closes });
		const ema30 = EMA.calculate({ period: 30, values: closes });

		// 5. Align all arrays to the same length (skip first 4 for AR, and MACD/EMA lag)
		const minLen = Math.min(
			closes.length - 4,
			arimaForecast.length,
			macd.length,
			ema5.length,
			ema10.length,
			ema30.length
		);
		const offset = closes.length - minLen;
		const result = {
			dates: timestamps.slice(offset).map((t) => new Date(t).toISOString()),
			price: closes.slice(offset),
			forecast: arimaForecast.slice(arimaForecast.length - minLen),
			macd: macd.slice(macd.length - minLen).map((m) => m.MACD),
			macdSignal: macd.slice(macd.length - minLen).map((m) => m.signal),
			macdHist: macd.slice(macd.length - minLen).map((m) => m.histogram),
			ema5: ema5.slice(ema5.length - minLen),
			ema10: ema10.slice(ema10.length - minLen),
			ema30: ema30.slice(ema30.length - minLen),
		};

		return { result };
	}
}
