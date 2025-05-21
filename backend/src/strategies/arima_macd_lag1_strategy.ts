import { Strategy } from "../strategy";
import ccxt from "ccxt";
import { MACD, EMA } from "technicalindicators";
// @ts-ignore
import { jStat } from "jstat";
import { transpose, dot, invert2D } from "../mathUtils";

export class ArimaMacdLag1Strategy implements Strategy {
	name = "ARIMA_MACD_LAG1";
	description =
		"ARIMA+MACD with error correction using only LAG1 and Prev Error.";

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
		const closedOhlcv = ohlcv.filter(
			(c) => typeof c[0] === "number" && c[0] < now - timeframeMs
		);
		if (!closedOhlcv || closedOhlcv.length === 0)
			throw new Error("No closed candles returned from Binance");
		const ohlcvUsed = closedOhlcv;

		const closes = ohlcvUsed.map((c) => Number(c[4]));
		const opens = ohlcvUsed.map((c) => Number(c[1]));
		const timestamps = ohlcvUsed.map((c) => c[0]);
		const openToCloseReturn = closes.map(
			(close, i) => (close - opens[i]) / opens[i]
		);

		// === Dynamically fit AR(4) coefficients using linear regression ===
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
		const Xmat = X.map((row) => [1, ...row]);
		const Xt = transpose(Xmat);
		const XtX = dot(Xt, Xmat);
		const XtXinv = invert2D(XtX);
		const Xty = dot(
			Xt,
			y.map((v) => [v])
		);
		const beta = dot(XtXinv, Xty).map((b) => b[0]);
		const arCoefficients = beta.slice(1, 5);

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

		const closeReturn = closes.map((v, i, arr) =>
			i > 0 ? (v - arr[i - 1]) / arr[i - 1] : 0
		);
		const lag1 = closeReturn.map((v, i, arr) => (i > 0 ? arr[i - 1] : 0));

		const minLen = Math.min(
			closes.length - 4,
			arimaForecast.length,
			lag1.length
		);
		const offset = closes.length - minLen;
		const result: {
			dates: string[];
			price: number[];
			forecast: (number | null)[];
			lag1: number[];
			errorCorrectedForecast?: (number | null)[];
			nextErrorCorrectedForecast?: number | null;
			errorCorrectionRSquared?: number | null;
			errorCorrectionCoefficients?: number[] | null;
			errorCorrectionStdErr?: number[] | null;
			errorCorrectionPValues?: number[] | null;
			errorCorrectionModelPValue?: number | null;
			errorCorrectionCoefficientNames?: string[];
		} = {
			dates: timestamps
				.slice(offset)
				.filter((t): t is number => t !== undefined)
				.map((t) => new Date(t).toISOString()),
			price: closes.slice(offset),
			forecast: arimaForecast.slice(arimaForecast.length - minLen),
			lag1: lag1.slice(lag1.length - minLen),
		};
		// === Error Correction Linear Regression (LAG1 and Prev Error only) ===
		const forecast = result.forecast;
		const price = result.price;
		const n = forecast.length;
		const error: number[] = [];
		for (let i = 0; i < n; i++) {
			const f = forecast[i];
			const p = price[i];
			error.push(f != null && p != null ? p - f : 0);
		}
		const lag1F = result.lag1;
		const errorFeatures: number[][] = [];
		const errorY: number[] = [];
		for (let i = 1; i < n; i++) {
			if (lag1F[i] != null && error[i - 1] != null) {
				errorFeatures.push([1, lag1F[i] ?? 0, error[i - 1] ?? 0]);
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
		if (errorFeatures.length > 2) {
			const XtE = transpose(errorFeatures);
			const XtXE = dot(XtE, errorFeatures);
			const XtXinvE = invert2D(XtXE);
			const XtyE = dot(
				XtE,
				errorY.map((v) => [v])
			);
			const betaE = dot(XtXinvE, XtyE).map((b) => b[0]);
			const yPred = errorFeatures.map((row) =>
				row.reduce((sum, v, j) => sum + v * betaE[j], 0)
			);
			const yTrue = errorY;
			const nObs = yTrue.length;
			const p = betaE.length;
			const meanY = yTrue.reduce((a, b) => a + b, 0) / nObs;
			const ssTot = yTrue.reduce((sum, v) => sum + (v - meanY) ** 2, 0);
			const ssRes = yTrue.reduce((sum, v, i) => sum + (v - yPred[i]) ** 2, 0);
			errorCorrectionRSquared = ssTot === 0 ? null : 1 - ssRes / ssTot;
			const sigma2 = ssRes / (nObs - p);
			errorCorrectionStdErr = XtXinvE.map((row, j) =>
				Math.sqrt(Math.abs(row[j]) * sigma2)
			);
			errorCorrectionCoefficients = betaE;
			const df = nObs - p;
			errorCorrectionPValues = betaE.map((coef, j) => {
				const stderr = errorCorrectionStdErr ? errorCorrectionStdErr[j] : 0;
				if (!stderr || stderr === 0) return 1;
				const t = coef / stderr;
				const pval = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));
				return pval;
			});
			if (ssRes > 0 && ssTot > 0 && nObs > p && p > 1) {
				const msr = (ssTot - ssRes) / (p - 1);
				const mse = ssRes / (nObs - p);
				const f = msr / mse;
				const modelPval = 1 - jStat.centralF.cdf(f, p - 1, nObs - p);
				errorCorrectionModelPValue = modelPval;
			}
			for (let i = 1; i < n; i++) {
				errorForecast[i] =
					betaE[0] +
					betaE[1] * (lag1F[i] ?? 0) +
					betaE[2] * (error[i - 1] ?? 0);
			}
			const i = n - 1;
			nextErrorCorrectedForecast = null;
			if (lag1F[i] != null && error[i - 1] != null && forecast[i] != null) {
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
				const nextError =
					betaE[0] + betaE[1] * (lag1F[i] ?? 0) + betaE[2] * (error[i] ?? 0);
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
			// Add coefficient names for frontend display
			result.errorCorrectionCoefficientNames = [
				"Intercept",
				"Lag1",
				"Prev Error",
			];
		}
		return {
			result: {
				...result,
				lastClosedCandleTimestamp: timestamps[timestamps.length - 1],
			},
		};
	}
}
