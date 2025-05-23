import { Strategy } from "../strategy";
import ccxt from "ccxt";
import {
	calcEMA,
	calcMACD,
	computeMacdHistForecast,
} from "../utils/indicatorUtils";
// @ts-ignore
import { jStat } from "jstat";
import { fetchMarginBalance, calculateCumulativePnL } from "../utils/utils";
import { transpose, dot, invert2D } from "../utils/mathUtils";
import { alignArrays } from "../utils/arrayUtils";
import { computeErrorCorrectionRegression } from "../utils/errorCorrection";
import { config } from "../utils/config";

export class ArimaMacdLagStrategy implements Strategy {
	name = "ARIMA_MACD_LAG";
	description = "ARIMA+MACD with lag/error correction and model comparison.";

	async run(params: {
		apiKey?: string;
		secret?: string;
		symbol?: string;
		timeframe?: string;
		limit?: number;
	}): Promise<any> {
		const apiKey = params.apiKey || config.binanceApiKey;
		const secret = params.secret || config.binanceApiSecret;
		const symbol = params.symbol || config.defaultSymbol;
		const timeframe = params.timeframe || config.defaultTimeframe;
		const limit = params.limit || config.defaultLimit;
		if (!apiKey || !secret) throw new Error("API key and secret are required");
		const exchange = new ccxt.binance({
			apiKey,
			secret,
			options: { defaultType: "margin" },
			enableRateLimit: true,
		});
		await exchange.loadMarkets();
		const ohlcv = await exchange.fetchOHLCV(
			symbol,
			timeframe,
			undefined,
			limit
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
			}[timeframe] || 0;
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
		// Essential debug output for alignment only
		console.log("Last 5 closed OHLCV used:", closedOhlcv.slice(-5));
		const ohlcvUsed = closedOhlcv;

		// Prepare data
		const closes = ohlcvUsed.map((c) => Number(c[4]));
		const opens = ohlcvUsed.map((c) => Number(c[1]));
		const timestamps = ohlcvUsed.map((c) => c[0]);
		const openToCloseReturn = closes.map(
			(close, i) => (close - opens[i]) / opens[i]
		);

		// === Calculate MACD and EMAs (strict out-of-sample, canonical utility) ===
		const macd = calcMACD(
			closes,
			config.macdFast,
			config.macdSlow,
			config.macdSignal
		);
		const ema5 = calcEMA(closes, config.ema5Window);
		const ema10 = calcEMA(closes, config.ema10Window);
		const ema30 = calcEMA(closes, config.ema30Window);
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
			macdHistRegressionCoefficients?: number[];
			macdHistRegressionStdErr?: number[];
			macdHistRegressionPValues?: number[];
			macdHistRegressionRSquared?: number | null;
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
		// === MACD Histogram Forecast using Linear Regression on EMAs (modular utility) ===
		const macdHist = macdHistAligned;
		const macdSignalArr = macdSignalAligned;
		const macdHistRegression = computeMacdHistForecast({
			ema5: ema5Aligned,
			ema10: ema10Aligned,
			ema30: ema30Aligned,
			macdHist: macdHist,
			macdSignal: macdSignalArr,
			lag1: lag1Aligned,
			lag4: lag4Aligned,
		});
		result.macdHistForecast = macdHistRegression.forecast;
		result.macdHistRegressionCoefficients = macdHistRegression.coefficients;
		result.macdHistRegressionStdErr = macdHistRegression.stdErr;
		result.macdHistRegressionPValues = macdHistRegression.pValues;
		result.macdHistRegressionRSquared = macdHistRegression.rSquared;

		// === Error Correction Linear Regression (hybrid: current + lag1 features) ===
		// Use canonical variables from aligned/result only, do not redeclare 'forecast' or 'price' here
		const n = result.forecast.length;
		const error: number[] = [];
		for (let i = 0; i < n; i++) {
			const f = result.forecast[i];
			const p = result.price[i];
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
			const errorCorrectedForecast: (number | null)[] = forecast.map((f, i) =>
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
		// Alignment debug: compare last 5 aligned dates to last 5 closed OHLCV dates
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
		const closesAligned = ohlcvAligned.map((c) => Number(c[4]));
		const forecastAligned = result.forecast;
		const hitForecast: boolean[] = [];
		const forecastReturn: (number | null)[] = [];
		const forecastSpread: (number | null)[] = [];
		for (let i = 0; i < nRows; i++) {
			const open = ohlcvAligned[i][1];
			const high = highsAligned[i];
			const low = lowsAligned[i];
			const close = closesAligned[i];
			let forecast = forecastAligned[i];
			if (forecast === undefined || forecast === null || isNaN(forecast)) {
				hitForecast.push(false);
				forecastReturn.push(null);
				forecastSpread.push(null);
				continue;
			}
			if (open === undefined || open === null || isNaN(open)) {
				hitForecast.push(false);
				forecastReturn.push(null);
				forecastSpread.push(null);
				continue;
			}
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
			const spread = forecast - open;
			forecastSpread.push(isHit ? Math.abs(spread) : spread);
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

		const quoteAsset = symbol.split("/")[1] || "USDT";
		let startingBalance = 0;
		try {
			startingBalance = await fetchMarginBalance(exchange, quoteAsset);
		} catch (err) {
			console.warn("Could not fetch starting margin balance:", err);
			startingBalance = 0;
		}
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
				usedSymbol: symbol,
				usedTimeframe: timeframe,
				usedLimit: limit,
			},
		};
	}
}
