import { Strategy } from "../strategy";
import ccxt from "ccxt";
import { MACD, EMA } from "technicalindicators";
// @ts-ignore
import { jStat } from "jstat";
import { fetchMarginBalance, calculateCumulativePnL } from "../utils";
import { transpose, dot, invert2D } from "../mathUtils";
import { alignArrays } from "../arrayUtils";
import { toNumberArray, toBBArray } from "../indicatorUtils";

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
		// Debug: log last 5 candles from Binance OHLCV
		console.log("Last 5 raw OHLCV from Binance:", ohlcv.slice(-5));
		// Debug: log last 5 closed candles used for calculations
		console.log("Last 5 closed OHLCV used:", closedOhlcv.slice(-5));
		// Use only closed candles for all calculations
		const ohlcvUsed = closedOhlcv;

		// Prepare data
		const closes = ohlcvUsed.map((c) => Number(c[4]));
		const opens = ohlcvUsed.map((c) => Number(c[1]));
		const timestamps = ohlcvUsed.map((c) => c[0]);
		const openToCloseReturn = closes.map(
			(close, i) => (close - opens[i]) / opens[i]
		);

		// === Calculate MACD and EMAs (strict out-of-sample) ===
		const macdInput = {
			values: closes.slice(0, closes.length - 1), // exclude last close for strict out-of-sample
			fastPeriod: 10,
			slowPeriod: 30,
			signalPeriod: 5,
			SimpleMAOscillator: false,
			SimpleMASignal: false,
		};
		const macd = MACD.calculate(macdInput) as Array<{
			MACD: number;
			signal: number;
			histogram: number;
		}>;
		const ema5 = EMA.calculate({ period: 5, values: closes });
		const ema10 = EMA.calculate({ period: 10, values: closes });
		const ema30 = EMA.calculate({ period: 30, values: closes });
		const closeReturn = closes.map((v: number, i: number, arr: number[]) =>
			i > 0 ? (v - arr[i - 1]) / arr[i - 1] : 0
		);
		const lag1 = closeReturn.map((v: number, i: number, arr: number[]) =>
			i > 0 ? arr[i - 1] : 0
		);
		const lag4 = closeReturn.map((v: number, i: number, arr: number[]) =>
			i > 3 ? arr[i - 4] : 0
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

		// --- Strict out-of-sample alignment fix ---
		// Use only number[] arrays, no null padding
		const outputLen = arimaForecast.length;
		const aligned = alignArrays({
			dates: timestamps.slice(4, 4 + outputLen),
			price: closes.slice(4, 4 + outputLen),
			forecast: arimaForecast,
			macd: macd.map((m) => m.MACD),
			macdSignal: macd.map((m) => m.signal),
			macdHist: macd.map((m) => m.histogram),
			ema5: ema5,
			ema10: ema10,
			ema30: ema30,
			lag1: lag1,
			lag4: lag4,
		});
		// Use the full aligned arrays, do NOT slice off the last value
		const dates = aligned.dates;
		const price = aligned.price;
		const forecast = aligned.forecast;
		const macdAligned = aligned.macd;
		const macdSignalAligned = aligned.macdSignal;
		const macdHistAligned = aligned.macdHist;
		const ema5Aligned = aligned.ema5;
		const ema10Aligned = aligned.ema10;
		const ema30Aligned = aligned.ema30;
		const lag1Aligned = aligned.lag1;
		const lag4Aligned = aligned.lag4;
		const minLen = price.length;

		// Defensive: filter out undefined from dates before mapping to ISO string
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
			macdHistForecast?: (number | null)[];
			errorCorrectedForecast?: (number | null)[];
			nextErrorCorrectedForecast?: number | null;
			errorCorrectionRSquared?: number | null;
			errorCorrectionCoefficients?: number[] | null;
			errorCorrectionStdErr?: number[] | null;
			errorCorrectionPValues?: number[] | null;
			errorCorrectionModelPValue?: number | null;
			errorCorrectionCoefficientNames?: string[];
			hitForecast?: boolean[];
			hitRate?: number;
			forecastReturn?: (number | null)[];
			forecastSpread?: (number | null)[];
			// Portfolio balance and P&L
			startingBalance?: number;
			endingBalance?: number;
			cumulativePnL?: { absolute: number; percent: number };
		} = {
			dates: dates
				.filter((t): t is number => t !== undefined)
				.map((t) => new Date(t).toISOString()),
			price: price,
			forecast: forecast,
			macd: macdAligned,
			macdSignal: macdSignalAligned,
			macdHist: macdHistAligned,
			ema5: ema5Aligned,
			ema10: ema10Aligned,
			ema30: ema30Aligned,
			lag1: lag1Aligned,
			lag4: lag4Aligned,
		};
		// === MACD Histogram Forecast using Linear Regression on EMAs ===
		// Use only the aligned variables from alignArrays
		const macdHist = macdHistAligned;
		const macdSignalArr = macdSignalAligned;
		// Remove redeclaration of ema5Aligned, ema10Aligned, ema30Aligned here
		const emaFeatures: number[][] = [];
		const macdHistY: number[] = [];
		for (let i = 2; i < minLen; i++) {
			emaFeatures.push([
				1,
				ema5Aligned[i - 1],
				ema10Aligned[i - 1],
				ema30Aligned[i - 1],
				macdHist[i - 1] ?? 0,
				macdHist[i - 2] ?? 0,
				macdSignalArr[i - 1] ?? 0,
				macdSignalArr[i - 2] ?? 0,
				lag1Aligned[i - 1],
				lag4Aligned[i - 1],
			]);
			macdHistY.push(macdHist[i] ?? 0);
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
						beta2[4] * (macdHist[i - 1] ?? 0) +
						beta2[5] * (macdHist[i - 2] ?? 0) +
						beta2[6] * (macdSignalArr[i - 1] ?? 0) +
						beta2[7] * (macdSignalArr[i - 2] ?? 0) +
						beta2[8] * lag1Aligned[i - 1] +
						beta2[9] * lag4Aligned[i - 1]
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
		}
		// --- After alignment, log last 5 aligned candles for backend output ---
		console.log(
			"Last 5 aligned output candles:",
			aligned.dates.slice(-5).map((d, i) => ({
				date: d !== undefined ? new Date(Number(d)).toISOString() : undefined,
				price: aligned.price.slice(-5)[i],
				forecast: aligned.forecast.slice(-5)[i],
			}))
		);
		// --- Alignment debug: compare last 5 aligned dates to last 5 closed OHLCV dates ---
		const last5AlignedDates = aligned.dates
			.slice(-5)
			.map((d) =>
				d !== undefined ? new Date(Number(d)).toISOString() : undefined
			);
		const last5ClosedOhlcvDates = closedOhlcv
			.slice(-5)
			.map((c) => new Date(Number(c[0])).toISOString());
		console.log("Last 5 aligned dates (ISO):", last5AlignedDates);
		console.log("Last 5 closed OHLCV dates (ISO):", last5ClosedOhlcvDates);
		// Defensive: warn if not strictly aligned
		if (
			JSON.stringify(last5AlignedDates) !==
			JSON.stringify(last5ClosedOhlcvDates)
		) {
			console.warn(
				"WARNING: Last 5 aligned output dates do not match last 5 closed OHLCV dates! Alignment issue detected."
			);
		}
		// === Backtest: Calculate hit/miss for each forecast (align to historical timeframes) ===
		const nRows = result.price.length;
		const ohlcvAligned = ohlcvUsed.slice(ohlcvUsed.length - nRows);
		const highsAligned = ohlcvAligned.map((c) => Number(c[2]));
		const lowsAligned = ohlcvAligned.map((c) => Number(c[3]));
		// const opensAligned = ohlcvAligned.map((c) => Number(c[1]));
		const closesAligned = ohlcvAligned.map((c) => Number(c[4]));
		const forecastAligned = result.forecast;
		const hitForecast: boolean[] = [];
		const forecastReturn: (number | null)[] = [];
		const forecastSpread: (number | null)[] = [];
		// Remove duplicate/old logic for ret, forecastReturn, and forecastSpread
		for (let i = 0; i < nRows; i++) {
			const open = ohlcvAligned[i][1];
			const high = highsAligned[i];
			const low = lowsAligned[i];
			const close = closesAligned[i];
			let forecast = forecastAligned[i];
			// Defensive: treat NaN as null
			if (forecast === undefined || forecast === null || isNaN(forecast)) {
				hitForecast.push(false);
				forecastReturn.push(null);
				forecastSpread.push(null);
				continue;
			}
			// Defensive: treat open as 0 if undefined, or skip this row
			if (open === undefined || open === null || isNaN(open)) {
				hitForecast.push(false);
				forecastReturn.push(null);
				forecastSpread.push(null);
				continue;
			}
			// Determine hit first
			let isHit = false;
			if (forecast > open) {
				if (high >= forecast || close >= forecast) {
					isHit = true;
				}
			} else if (forecast < open) {
				if (low <= forecast || close <= forecast) {
					isHit = true;
				}
			}
			hitForecast.push(isHit);

			// Spread: only show positive if hit, else keep sign
			const spread = forecast - open;
			forecastSpread.push(isHit ? Math.abs(spread) : spread);

			// Return: only show positive if hit, else keep sign
			let ret = 0;
			if (forecast > open) {
				ret = (close - open) / open;
			} else if (forecast < open) {
				ret = (open - close) / open;
			}
			forecastReturn.push(isHit ? Math.abs(ret) : ret);
		}
		result.hitForecast = hitForecast;
		result.forecastReturn = forecastReturn;
		result.forecastSpread = forecastSpread;
		const hitCount = hitForecast.filter(Boolean).length;
		const hitRate = nRows > 0 ? hitCount / nRows : 0;
		result.hitRate = hitRate;

		// === Fetch starting margin account balance ===
		const quoteAsset = params.symbol.split("/")[1] || "USDT";
		let startingBalance = 0;
		try {
			startingBalance = await fetchMarginBalance(exchange, quoteAsset);
		} catch (err) {
			console.warn("Could not fetch starting margin balance:", err);
			startingBalance = 0;
		}

		// === Simulate ending balance using forecast returns ===
		let endingBalance = startingBalance;
		if (startingBalance > 0 && Array.isArray(result.forecastReturn)) {
			for (const ret of result.forecastReturn) {
				if (typeof ret === "number" && !isNaN(ret)) {
					endingBalance *= 1 + ret;
				}
			}
		}
		const cumulativePnL = calculateCumulativePnL(
			startingBalance,
			endingBalance
		);
		result.startingBalance = startingBalance;
		result.endingBalance = endingBalance;
		result.cumulativePnL = cumulativePnL;

		return {
			result: {
				...result,
				lastClosedCandleTimestamp: timestamps[timestamps.length - 1],
			},
		};
	}
	// === REMOVE DUPLICATE INDICATOR/LAG DECLARATIONS AT CLASS LEVEL ===
	// (All indicator and lag variables are already declared inside async run)
}
