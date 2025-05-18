import { Strategy } from "../strategy";
import ccxt from "ccxt";
import { MACD, EMA } from "technicalindicators";
// @ts-ignore
import { jStat } from "jstat";

export class ArimaMacdLagStrategy implements Strategy {
	name = "ARIMA_MACD_LAG";
	description = "ARIMA+MACD with lag/error correction and model comparison.";

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
		// === REMOVE IN-PROGRESS CANDLE (DATA LEAKAGE GUARD) ===
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
		// Strictly filter to only closed candles (timestamp < now - timeframeMs)
		const closedOhlcv = ohlcv.filter(
			(c) => typeof c[0] === "number" && c[0] < now - timeframeMs
		);
		if (!closedOhlcv || closedOhlcv.length === 0)
			throw new Error("No closed candles returned from Binance");
		// Debug: log last 3 closed candle timestamps and closes
		console.log(
			"Last 3 closed candle timestamps:",
			closedOhlcv.slice(-3).map((c) => c[0])
		);
		console.log(
			"Last 3 closed candle closes:",
			closedOhlcv.slice(-3).map((c) => c[4])
		);
		// Use only closed candles for all calculations
		const ohlcvUsed = closedOhlcv;

		// Prepare data
		const closes = ohlcvUsed.map((c) => Number(c[4]));
		const opens = ohlcvUsed.map((c) => Number(c[1]));
		const timestamps = ohlcvUsed.map((c) => c[0]);
		const openToCloseReturn = closes.map(
			(close, i) => (close - opens[i]) / opens[i]
		);

		// === Dynamically fit AR(4) coefficients using linear regression ===
		// Prepare lagged returns matrix for regression
		const arOrder = 4;
		const X: number[][] = [];
		const y: number[] = [];
		for (let i = arOrder; i < openToCloseReturn.length; i++) {
			X.push([
				openToCloseReturn[i - 1],
				openToCloseReturn[i - 2],
				openToCloseReturn[i - 3],
				openToCloseReturn[i - 4],
			]);
			y.push(openToCloseReturn[i]);
		}
		// Add bias column for intercept
		const Xmat = X.map((row) => [1, ...row]);
		// OLS: beta = (X^T X)^-1 X^T y
		function transpose(m: number[][]) {
			return m[0].map((_, i) => m.map((row) => row[i]));
		}
		function dot(a: number[][], b: number[][]) {
			return a.map((row) =>
				b[0].map((_, j) => row.reduce((sum, v, k) => sum + v * b[k][j], 0))
			);
		}
		function invert2D(m: number[][]) {
			// Only for small matrices, use numeric.js or mathjs for production
			const size = m.length;
			const I = Array.from({ length: size }, (_, i) =>
				Array(size)
					.fill(0)
					.map((_, j) => (i === j ? 1 : 0))
			);
			// Gaussian elimination
			const M = m.map((row) => row.slice());
			for (let i = 0; i < size; i++) {
				let maxRow = i;
				for (let k = i + 1; k < size; k++)
					if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
				[M[i], M[maxRow]] = [M[maxRow], M[i]];
				[I[i], I[maxRow]] = [I[maxRow], I[i]];
				const div = M[i][i];
				for (let j = 0; j < size; j++) {
					M[i][j] /= div;
					I[i][j] /= div;
				}
				for (let k = 0; k < size; k++) {
					if (k !== i) {
						const factor = M[k][i];
						for (let j = 0; j < size; j++) {
							M[k][j] -= factor * M[i][j];
							I[k][j] -= factor * I[i][j];
						}
					}
				}
			}
			return I;
		}
		const Xt = transpose(Xmat);
		const XtX = dot(Xt, Xmat);
		const XtXinv = invert2D(XtX);
		const Xty = dot(
			Xt,
			y.map((v) => [v])
		);
		const beta = dot(XtXinv, Xty).map((b) => b[0]); // [intercept, ar1, ar2, ar3, ar4]
		// Use fitted AR coefficients (ignore intercept for AR forecast)
		const arCoefficients = beta.slice(1, 5);

		// ARIMA forecast
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

		// MACD and EMA
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

		// Lagged returns and EMAs
		const closeReturn = closes.map((v, i, arr) =>
			i > 0 ? (v - arr[i - 1]) / arr[i - 1] : 0
		);
		const lag1 = closeReturn.map((v, i, arr) => (i > 0 ? arr[i - 1] : 0));
		const lag4 = closeReturn.map((v, i, arr) => (i > 3 ? arr[i - 4] : 0));

		// MACD diff and lags
		const macdArr = macd.map((m) => m.MACD ?? 0);
		const macdDiff = macdArr.map((v, i, arr) => (i > 0 ? v - arr[i - 1] : 0));
		const macdLag1 = macdDiff.map((v, i, arr) => (i > 0 ? arr[i - 1] : 0));
		const macdLag4 = macdDiff.map((v, i, arr) => (i > 3 ? arr[i - 4] : 0));

		// Align all arrays
		const minLen = Math.min(
			closes.length - 4,
			arimaForecast.length,
			macd.length,
			ema5.length,
			ema10.length,
			ema30.length
		);
		const offset = closes.length - minLen;
		const result: {
			dates: string[];
			price: number[];
			forecast: (number | null)[];
			macd: (number | undefined)[];
			macdSignal: (number | undefined)[];
			macdHist: (number | undefined)[];
			ema5: number[];
			ema10: number[];
			ema30: number[];
			lag1: number[];
			lag4: number[];
			macdLag1: number[];
			macdLag4: number[];
			macdHistForecast?: (number | null)[];
			errorCorrectedForecast?: (number | null)[];
			nextErrorCorrectedForecast?: number | null;
			errorCorrectionRSquared?: number | null;
			errorCorrectionCoefficients?: number[] | null;
			errorCorrectionStdErr?: number[] | null;
			errorCorrectionPValues?: number[] | null;
			errorCorrectionModelPValue?: number | null;
		} = {
			dates: timestamps
				.slice(offset)
				.filter((t): t is number => t !== undefined)
				.map((t) => new Date(t).toISOString()),
			price: closes.slice(offset),
			forecast: arimaForecast.slice(arimaForecast.length - minLen),
			macd: macd.slice(macd.length - minLen).map((m) => m.MACD),
			macdSignal: macd.slice(macd.length - minLen).map((m) => m.signal),
			macdHist: macd.slice(macd.length - minLen).map((m) => m.histogram),
			ema5: ema5.slice(ema5.length - minLen),
			ema10: ema10.slice(ema10.length - minLen),
			ema30: ema30.slice(ema30.length - minLen),
			lag1: lag1.slice(lag1.length - minLen),
			lag4: lag4.slice(lag4.length - minLen),
			macdLag1: macdLag1.slice(macdLag1.length - minLen),
			macdLag4: macdLag4.slice(macdLag4.length - minLen),
		};
		// === MACD Histogram Forecast using Linear Regression on EMAs ===
		const macdHist = macd
			.slice(macd.length - minLen)
			.map((m) => m.histogram ?? 0);
		const ema5Aligned = ema5.slice(ema5.length - minLen);
		const ema10Aligned = ema10.slice(ema10.length - minLen);
		const ema30Aligned = ema30.slice(ema30.length - minLen);
		const macdSignalArr = macd
			.slice(macd.length - minLen)
			.map((m) => m.signal ?? 0);
		const emaFeatures: number[][] = [];
		const macdHistY: number[] = [];
		for (let i = 2; i < minLen; i++) {
			// Use lagged EMAs, lagged MACD_HIST, lagged MACD, lagged MACD signal, lagged returns
			emaFeatures.push([
				1,
				ema5Aligned[i - 1],
				ema10Aligned[i - 1],
				ema30Aligned[i - 1],
				macdHist[i - 1],
				macdHist[i - 2],
				macdArr[i - 1],
				macdArr[i - 2],
				macdSignalArr[i - 1],
				macdSignalArr[i - 2],
				lag1[i - 1],
				lag4[i - 1],
			]);
			macdHistY.push(macdHist[i]);
		}
		if (emaFeatures.length > 4) {
			const Xt2 = transpose(emaFeatures);
			const XtX2 = dot(Xt2, emaFeatures);
			const XtXinv2 = invert2D(XtX2);
			const Xty2 = dot(
				Xt2,
				macdHistY.map((v) => [v])
			);
			const beta2 = dot(XtXinv2, Xty2).map((b) => b[0]);
			// Forecast MACD histogram (out-of-sample, using only lagged features)
			const macdHistForecast: (number | null)[] = [null, null]; // first two values can't be forecasted
			for (let i = 2; i < minLen; i++) {
				macdHistForecast.push(
					beta2[0] +
						beta2[1] * ema5Aligned[i - 1] +
						beta2[2] * ema10Aligned[i - 1] +
						beta2[3] * ema30Aligned[i - 1] +
						beta2[4] * macdHist[i - 1] +
						beta2[5] * macdHist[i - 2] +
						beta2[6] * macdArr[i - 1] +
						beta2[7] * macdArr[i - 2] +
						beta2[8] * macdSignalArr[i - 1] +
						beta2[9] * macdSignalArr[i - 2] +
						beta2[10] * lag1[i - 1] +
						beta2[11] * lag4[i - 1]
				);
			}
			result.macdHistForecast = macdHistForecast;

			// === Error Correction Linear Regression (hybrid: current + lag1 features) ===
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
			let errorForecast: (number | null)[] = Array(n).fill(null);
			let nextErrorCorrectedForecast: number | null = null;
			let errorCorrectionRSquared: number | null = null;
			let errorCorrectionCoefficients: number[] | null = null;
			let errorCorrectionStdErr: number[] | null = null;
			let errorCorrectionPValues: number[] | null = null;
			let errorCorrectionModelPValue: number | null = null;
			if (errorFeatures.length > 4) {
				const XtE = transpose(errorFeatures);
				const XtXE = dot(XtE, errorFeatures);
				const XtXinvE = invert2D(XtXE);
				const XtyE = dot(
					XtE,
					errorY.map((v) => [v])
				);
				const betaE = dot(XtXinvE, XtyE).map((b) => b[0]);
				// Compute predictions for R^2 and std errors
				const yPred = errorFeatures.map((row) =>
					row.reduce((sum, v, j) => sum + v * betaE[j], 0)
				);
				const yTrue = errorY;
				const nObs = yTrue.length;
				const p = betaE.length;
				const meanY = yTrue.reduce((a, b) => a + b, 0) / nObs;
				const ssTot = yTrue.reduce((sum, v) => sum + (v - meanY) ** 2, 0);
				const ssRes = yTrue.reduce((sum, v, i) => sum + (v - yPred[i]) ** 2, 0);
				const errorCorrectionRSquared = ssTot === 0 ? null : 1 - ssRes / ssTot;
				const sigma2 = ssRes / (nObs - p);
				const errorCorrectionStdErr = XtXinvE.map((row, j) =>
					Math.sqrt(Math.abs(row[j]) * sigma2)
				);
				const errorCorrectionCoefficients = betaE;
				// --- Compute p-values using jStat ---
				const df = nObs - p;
				errorCorrectionPValues = betaE.map((coef, j) => {
					const stderr = errorCorrectionStdErr ? errorCorrectionStdErr[j] : 0;
					if (!stderr || stderr === 0) return 1;
					const t = coef / stderr;
					// Two-sided p-value from t-distribution
					const pval = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));
					return pval;
				});
				// --- Compute overall model p-value (F-test) ---
				if (ssRes > 0 && ssTot > 0 && nObs > p && p > 1) {
					const msr = (ssTot - ssRes) / (p - 1);
					const mse = ssRes / (nObs - p);
					const f = msr / mse;
					const modelPval = 1 - jStat.centralF.cdf(f, p - 1, nObs - p);
					errorCorrectionModelPValue = modelPval;
				}
				// Forecast error (out-of-sample, using only lagged features)
				for (let i = 1; i < n; i++) {
					errorForecast[i] =
						betaE[0] +
						betaE[1] * (ema5F[i] ?? 0) +
						betaE[2] * (ema10F[i] ?? 0) +
						betaE[3] * (ema30F[i] ?? 0) +
						betaE[4] * (macdF[i] ?? 0) +
						betaE[5] * (macdSignalF[i] ?? 0) +
						betaE[6] * (macdHistF[i] ?? 0) +
						betaE[7] * (lag1F[i] ?? 0) +
						betaE[8] * (error[i - 1] ?? 0);
				}
				// --- True next-step error-corrected forecast ---
				const i = n - 1;
				nextErrorCorrectedForecast = null;
				if (
					ema5F[i] != null &&
					ema10F[i] != null &&
					ema30F[i] != null &&
					macdF[i] != null &&
					macdSignalF[i] != null &&
					macdHistF[i] != null &&
					lag1F[i] != null &&
					error[i - 1] != null &&
					forecast[i] != null
				) {
					// For a true next-step forecast, use only information available up to i (i.e., do not use any info from the current close)
					// Predict the next ARIMA forecast using the AR coefficients and the last 4 openToCloseReturn values
					const lastReturns = openToCloseReturn.slice(
						openToCloseReturn.length - 4
					);
					const nextForecastedDiff =
						arCoefficients[0] * lastReturns[3] +
						arCoefficients[1] * lastReturns[2] +
						arCoefficients[2] * lastReturns[1] +
						arCoefficients[3] * lastReturns[0];
					const nextArimaForecast =
						closes[closes.length - 1] * (1 + nextForecastedDiff);
					// For error correction, use the latest available features (all lagged, i.e., up to i)
					const nextError =
						betaE[0] +
						betaE[1] * (ema5F[i] ?? 0) +
						betaE[2] * (ema10F[i] ?? 0) +
						betaE[3] * (ema30F[i] ?? 0) +
						betaE[4] * (macdF[i] ?? 0) +
						betaE[5] * (macdSignalF[i] ?? 0) +
						betaE[6] * (macdHistF[i] ?? 0) +
						betaE[7] * (lag1F[i] ?? 0) +
						betaE[8] * (error[i] ?? 0);
					nextErrorCorrectedForecast = nextArimaForecast + nextError;
				}
				const errorCorrectedForecast: (number | null)[] = forecast.map((f, i) =>
					f != null && errorForecast[i] != null ? f + errorForecast[i]! : null
				);
				result.errorCorrectedForecast = errorCorrectedForecast;
				result.nextErrorCorrectedForecast = nextErrorCorrectedForecast;
				result.errorCorrectionRSquared = errorCorrectionRSquared;
				result.errorCorrectionCoefficients = errorCorrectionCoefficients;
				result.errorCorrectionStdErr = errorCorrectionStdErr;
				result.errorCorrectionPValues = errorCorrectionPValues;
				result.errorCorrectionModelPValue = errorCorrectionModelPValue;
			}
		}
		return {
			result: {
				...result,
				lastClosedCandleTimestamp: timestamps[timestamps.length - 1],
			},
		};
	}
}
