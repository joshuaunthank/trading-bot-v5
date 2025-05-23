import { Strategy } from "../strategy";
import ccxt from "ccxt";
import { MACD, EMA } from "technicalindicators";
import { computeErrorCorrectionRegression } from "../utils/errorCorrection";

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
		// Use canonical timeframe-to-ms logic
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
		// Robust closed candle filtering: always exclude the last candle if its timestamp is >= now - timeframeMs/2
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
		const closes = ohlcvUsed
			.map((c) => c[4])
			.filter((v): v is number => typeof v === "number");
		const opens = ohlcvUsed
			.map((c) => c[1])
			.filter((v): v is number => typeof v === "number");
		const timestamps = ohlcvUsed
			.map((c) => c[0])
			.filter((v): v is number => typeof v === "number");
		const openToCloseReturn = closes.map(
			(close, i) => (close - opens[i]) / opens[i]
		);
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
		const minLen = Math.min(
			closes.length - 4,
			arimaForecast.length,
			macd.length,
			ema5.length,
			ema10.length,
			ema30.length
		);
		const offset = closes.length - minLen;
		const closeReturn = closes
			.slice(1)
			.map((c, i) => (c - closes[i]) / closes[i]);
		const lag1 = closeReturn.map((v, i, arr) => (i > 0 ? arr[i - 1] : 0));
		const lag4 = closeReturn.map((v, i, arr) => (i > 3 ? arr[i - 4] : 0));
		const aligned: {
			dates: number[];
			price: number[];
			forecast: number[];
			macd: number[];
			macdSignal: number[];
			macdHist: number[];
			ema5: number[];
			ema10: number[];
			ema30: number[];
		} = {
			dates: timestamps.slice(offset),
			price: closes.slice(offset),
			forecast: arimaForecast.slice(arimaForecast.length - minLen),
			macd: macd
				.slice(macd.length - minLen)
				.map((m) => (m && typeof m.MACD === "number" ? m.MACD : 0)),
			macdSignal: macd
				.slice(macd.length - minLen)
				.map((m) => (m && typeof m.signal === "number" ? m.signal : 0)),
			macdHist: macd
				.slice(macd.length - minLen)
				.map((m) => (m && typeof m.histogram === "number" ? m.histogram : 0)),
			ema5: ema5.slice(ema5.length - minLen),
			ema10: ema10.slice(ema10.length - minLen),
			ema30: ema30.slice(ema30.length - minLen),
		};
		const result: any = {
			dates: aligned.dates.map((t) =>
				t !== undefined ? new Date(t).toISOString() : ""
			),
			price: aligned.price,
			forecast: aligned.forecast,
			ema5: aligned.ema5,
			ema10: aligned.ema10,
			ema30: aligned.ema30,
			macd: macd
				.slice(macd.length - minLen)
				.map((m) => (m && typeof m.MACD === "number" ? m.MACD : 0)),
			macdSignal: macd
				.slice(macd.length - minLen)
				.map((m) => (m && typeof m.signal === "number" ? m.signal : 0)),
			macdHist: macd
				.slice(macd.length - minLen)
				.map((m) => (m && typeof m.histogram === "number" ? m.histogram : 0)),
			lag1: lag1.slice(lag1.length - aligned.price.length),
			lag4: lag4.slice(lag4.length - aligned.price.length),
		};
		// === Error Correction Linear Regression (canonical pattern) ===
		const forecast = result.forecast;
		const price = result.price;
		const n = forecast.length;
		const error: number[] = [];
		for (let i = 0; i < n; i++) {
			const f = forecast[i];
			const p = price[i];
			error.push(f != null && p != null ? p - f : 0);
		}
		const ema5F = result.ema5;
		const ema10F = result.ema10;
		const ema30F = result.ema30;
		const macdF = result.macd;
		const macdSignalF = result.macdSignal;
		const macdHistF = result.macdHist;
		const lag1F = result.lag1;
		const errorFeatures: number[][] = [];
		const errorY: number[] = [];
		for (let i = 1; i < n; i++) {
			if (
				ema5F[i] != null &&
				ema10F[i] != null &&
				ema30F[i] != null &&
				macdF[i] != null &&
				macdSignalF[i] != null &&
				macdHistF[i] != null &&
				lag1F[i] != null &&
				error[i - 1] != null
			) {
				errorFeatures.push([
					1,
					ema5F[i] ?? 0,
					ema10F[i] ?? 0,
					ema30F[i] ?? 0,
					macdF[i] ?? 0,
					macdSignalF[i] ?? 0,
					macdHistF[i] ?? 0,
					lag1F[i] ?? 0,
					error[i - 1] ?? 0,
				]);
				errorY.push(error[i]);
			}
		}
		let nextFeatures: number[] | undefined = undefined;
		if (
			ema5F[n - 1] != null &&
			ema10F[n - 1] != null &&
			ema30F[n - 1] != null &&
			macdF[n - 1] != null &&
			macdSignalF[n - 1] != null &&
			macdHistF[n - 1] != null &&
			lag1F[n - 1] != null &&
			error[n - 2] != null
		) {
			nextFeatures = [
				1,
				ema5F[n - 1] ?? 0,
				ema10F[n - 1] ?? 0,
				ema30F[n - 1] ?? 0,
				macdF[n - 1] ?? 0,
				macdSignalF[n - 1] ?? 0,
				macdHistF[n - 1] ?? 0,
				lag1F[n - 1] ?? 0,
				error[n - 2] ?? 0,
			];
		}
		if (errorFeatures.length > 4) {
			const regression = computeErrorCorrectionRegression({
				features: errorFeatures,
				target: errorY,
				nextFeatures,
			});
			const errorCorrectedForecast: (number | null)[] = (
				forecast as (number | null)[]
			).map((f: number | null, i: number) =>
				f != null && regression.errorForecast[i - 1] != null
					? f + regression.errorForecast[i - 1]!
					: null
			);
			result.errorCorrectedForecast = errorCorrectedForecast;
			result.nextErrorCorrectedForecast =
				regression.nextErrorCorrectedForecast != null && forecast[n - 1] != null
					? (forecast[n - 1] ?? 0) +
					  (regression.nextErrorCorrectedForecast ?? 0)
					: null;
			result.errorCorrectionRSquared = regression.errorCorrectionRSquared;
			result.errorCorrectionCoefficients =
				regression.errorCorrectionCoefficients;
			result.errorCorrectionStdErr = regression.errorCorrectionStdErr;
			result.errorCorrectionPValues = regression.errorCorrectionPValues;
			result.errorCorrectionModelPValue = regression.errorCorrectionModelPValue;
			result.errorCorrectionCoefficientNames = [
				"Intercept",
				"EMA5",
				"EMA10",
				"EMA30",
				"MACD",
				"MACD Signal",
				"MACD Hist",
				"Lag1",
				"Prev Error",
			];
		}
		return { result };
	}
}
