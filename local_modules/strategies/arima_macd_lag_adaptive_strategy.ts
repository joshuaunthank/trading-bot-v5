import type { Strategy } from "../strategy";
import ccxt from "ccxt";
import { MACD, EMA } from "technicalindicators";
// @ts-ignore
import { jStat } from "jstat";
import { transpose, dot, invert2D } from "../utils/mathUtils";
import { computeErrorCorrectionRegression } from "../utils/errorCorrection";

export class ArimaMacdLagAdaptiveStrategy implements Strategy {
	name = "ARIMA_MACD_LAG_ADAPTIVE";
	description =
		"ARIMA+MACD with lag/error correction and adaptive parameter optimization.";

	async run(params: {
		apiKey?: string;
		secret?: string;
		symbol: string;
		timeframe: string;
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
		const now = Date.now();
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
		const closes = ohlcvUsed.map((c) => Number(c[4]));
		const opens = ohlcvUsed.map((c) => Number(c[1]));
		const timestamps = ohlcvUsed.map((c) => c[0]);
		const openToCloseReturn = closes.map(
			(close, i) => (close - opens[i]) / opens[i]
		);

		// Adaptive Parameter Optimization
		const trainWindow = Math.max(100, Math.floor(closes.length * 0.7));
		const valWindow = Math.min(40, closes.length - trainWindow);
		let bestParams = {
			arOrder: 4,
			ema5: 5,
			ema10: 10,
			ema30: 30,
			macdFast: 10,
			macdSlow: 30,
			macdSignal: 5,
		};
		let bestMSE = Number.POSITIVE_INFINITY;
		for (let arOrder = 2; arOrder <= 4; arOrder++) {
			for (let ema5 = 5; ema5 <= 9; ema5 += 2) {
				for (let ema10 = 10; ema10 <= 14; ema10 += 2) {
					for (let ema30 = 20; ema30 <= 30; ema30 += 5) {
						for (let macdFast = 8; macdFast <= 12; macdFast += 2) {
							for (let macdSlow = 26; macdSlow <= 34; macdSlow += 4) {
								for (let macdSignal = 4; macdSignal <= 6; macdSignal++) {
									const X: number[][] = [];
									const y: number[] = [];
									for (let i = trainWindow; i < trainWindow + valWindow; i++) {
										if (i < arOrder) continue;
										X.push([
											...Array.from(
												{ length: arOrder },
												(_, k) => openToCloseReturn[i - 1 - k]
											),
										]);
										y.push(openToCloseReturn[i]);
									}
									if (X.length < 10) continue;
									const Xmat = X.map((row) => [1, ...row]);
									const Xt = Xmat[0].map((_, i) => Xmat.map((row) => row[i]));
									const XtX = Xt.map((row, i) =>
										Xt.map((_, j) =>
											row.reduce((sum, v, k) => sum + v * Xmat[k][j], 0)
										)
									);
									const XtXinv = invert2D(XtX);
									const Xty = Xt.map((row) =>
										y.reduce((sum, v, k) => sum + v * row[k], 0)
									);
									const beta = XtXinv.map((row) =>
										row.reduce((sum, v, k) => sum + v * Xty[k], 0)
									);
									const arCoefficients = beta.slice(1, 1 + arOrder);
									let mse = 0;
									for (let i = trainWindow; i < trainWindow + valWindow; i++) {
										if (i < arOrder) continue;
										let pred = 0;
										for (let k = 0; k < arOrder; k++) {
											pred += arCoefficients[k] * openToCloseReturn[i - 1 - k];
										}
										mse += (openToCloseReturn[i] - pred) ** 2;
									}
									mse /= valWindow;
									if (mse < bestMSE) {
										bestMSE = mse;
										bestParams = {
											arOrder,
											ema5,
											ema10,
											ema30,
											macdFast,
											macdSlow,
											macdSignal,
										};
									}
								}
							}
						}
					}
				}
			}
		}
		// === Use bestParams for all calculations ===
		const arOrder = bestParams.arOrder;
		const ema5 = EMA.calculate({ period: bestParams.ema5, values: closes });
		const ema10 = EMA.calculate({ period: bestParams.ema10, values: closes });
		const ema30 = EMA.calculate({ period: bestParams.ema30, values: closes });
		const macdInput = {
			values: closes.slice(0, closes.length - 1),
			fastPeriod: bestParams.macdFast,
			slowPeriod: bestParams.macdSlow,
			signalPeriod: bestParams.macdSignal,
			SimpleMAOscillator: false,
			SimpleMASignal: false,
		};
		const macd = MACD.calculate(macdInput) as Array<{
			MACD: number;
			signal: number;
			histogram: number;
		}>;
		const closeReturn = closes.map((v, i, arr) =>
			i > 0 ? (v - arr[i - 1]) / arr[i - 1] : 0
		);
		const lag1 = closeReturn.map((v, i, arr) => (i > 0 ? arr[i - 1] : 0));
		const lag4 = closeReturn.map((v, i, arr) => (i > 3 ? arr[i - 4] : 0));
		// === ARIMA forecast with bestParams.arOrder ===
		const X: number[][] = [];
		const y: number[] = [];
		for (let i = arOrder; i < openToCloseReturn.length; i++) {
			X.push([
				...Array.from(
					{ length: arOrder },
					(_, k) => openToCloseReturn[i - 1 - k]
				),
			]);
			y.push(openToCloseReturn[i]);
		}
		const Xmat = X.map((row) => [1, ...row]);
		const Xt = transpose(Xmat);
		const XtX = dot(Xt, Xmat);
		const XtXinv = invert2D(XtX);
		const Xty = dot(
			Xt,
			y.map((v) => [v])
		);
		const beta = dot(XtXinv, Xty).map((b) => b[0]);
		const arCoefficients = beta.slice(1, 1 + arOrder);
		const forecastedDiff: number[] = [];
		for (let i = arOrder; i < openToCloseReturn.length; i++) {
			let diff = 0;
			for (let k = 0; k < arOrder; k++) {
				diff += arCoefficients[k] * openToCloseReturn[i - 1 - k];
			}
			forecastedDiff.push(diff);
		}
		const arimaForecast: number[] = [];
		for (let i = arOrder; i < closes.length; i++) {
			arimaForecast.push(closes[i - 1] * (1 + forecastedDiff[i - arOrder]));
		}
		const outputLen = arimaForecast.length;
		const aligned = {
			dates: timestamps.slice(arOrder, arOrder + outputLen),
			price: closes.slice(arOrder, arOrder + outputLen),
			forecast: arimaForecast,
			ema5: ema5.slice(ema5.length - outputLen),
			ema10: ema10.slice(ema10.length - outputLen),
			ema30: ema30.slice(ema30.length - outputLen),
			macd: macd.map((m) => m.MACD).slice(macd.length - outputLen),
			macdSignal: macd.map((m) => m.signal).slice(macd.length - outputLen),
			macdHist: macd.map((m) => m.histogram).slice(macd.length - outputLen),
			lag1: lag1.slice(lag1.length - outputLen),
			lag4: lag4.slice(lag4.length - outputLen),
		};
		const safeDates = aligned.dates.map((t) =>
			t !== undefined ? new Date(t).toISOString() : ""
		);
		const result: any = {
			dates: safeDates,
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
			selectedParams: bestParams,
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
