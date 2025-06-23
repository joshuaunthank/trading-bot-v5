import { EMA, MACD, RSI, BollingerBands, ATR, SMA } from "technicalindicators";

// Indicator and array conversion helpers for trading strategies

/**
 * Convert an array of mixed values to a number[] (NaN filtered out).
 */
export function toNumberArray(arr: any[]): number[] {
	return arr
		.map((v) => (typeof v === "number" ? v : v === undefined ? NaN : Number(v)))
		.filter((v) => !isNaN(v));
}

/**
 * Convert an array of objects to an array of Bollinger Band objects (with upper, lower, middle).
 */
export function toBBArray(
	arr: any[]
): { upper: number; lower: number; middle: number }[] {
	return arr.filter(
		(v) =>
			v &&
			typeof v.upper === "number" &&
			typeof v.lower === "number" &&
			typeof v.middle === "number"
	);
}

/**
 * Calculate EMA for a given period and values.
 */
export function calcEMA(values: number[], period: number): number[] {
	return EMA.calculate({ period, values });
}

/**
 * Calculate MACD for given values and parameters.
 */
export function calcMACD(
	values: number[],
	fastPeriod = 10,
	slowPeriod = 30,
	signalPeriod = 5
): Array<{ MACD: number; signal: number; histogram: number }> {
	return MACD.calculate({
		values,
		fastPeriod,
		slowPeriod,
		signalPeriod,
		SimpleMAOscillator: false,
		SimpleMASignal: false,
	}).map((m) => ({
		MACD: typeof m.MACD === "number" ? m.MACD : 0,
		signal: typeof m.signal === "number" ? m.signal : 0,
		histogram: typeof m.histogram === "number" ? m.histogram : 0,
	}));
}

/**
 * Calculate RSI for a given period and values.
 */
export function calcRSI(values: number[], period: number): number[] {
	return RSI.calculate({ period, values });
}

/**
 * Calculate Bollinger Bands for a given period, stdDev, and values.
 */
export function calcBollingerBands(
	values: number[],
	period = 20,
	stdDev = 2
): Array<{ upper: number; lower: number; middle: number }> {
	return BollingerBands.calculate({ period, stdDev, values });
}

/**
 * Calculate ATR for a given period and OHLC arrays.
 */
export function calcATR(
	highs: number[],
	lows: number[],
	closes: number[],
	period = 14
): number[] {
	return ATR.calculate({ period, high: highs, low: lows, close: closes });
}

/**
 * Calculate SMA for a given period and values.
 */
export function calcSMA(values: number[], period: number): number[] {
	return SMA.calculate({ period, values });
}

export interface MacdHistRegressionResult {
	forecast: (number | null)[];
	coefficients: number[];
	stdErr: number[];
	pValues: number[];
	rSquared: number | null;
}

export function computeMacdHistForecast({
	ema5,
	ema10,
	ema30,
	macdHist,
	macdSignal,
	lag1,
	lag4,
}: {
	ema5: number[];
	ema10: number[];
	ema30: number[];
	macdHist: (number | undefined)[];
	macdSignal: (number | undefined)[];
	lag1: number[];
	lag4: number[];
}): MacdHistRegressionResult {
	const minLen = Math.min(
		ema5.length,
		ema10.length,
		ema30.length,
		macdHist.length,
		macdSignal.length,
		lag1.length,
		lag4.length
	);
	const features: number[][] = [];
	const target: number[] = [];
	for (let i = 2; i < minLen; i++) {
		features.push([
			1,
			ema5[i - 1],
			ema10[i - 1],
			ema30[i - 1],
			macdHist[i - 1] ?? 0,
			macdHist[i - 2] ?? 0,
			macdSignal[i - 1] ?? 0,
			macdSignal[i - 2] ?? 0,
			lag1[i - 1],
			lag4[i - 1],
		]);
		target.push(macdHist[i] ?? 0);
	}
	let forecast: (number | null)[] = [null, null];
	let coefficients: number[] = [];
	let stdErr: number[] = [];
	let pValues: number[] = [];
	let rSquared: number | null = null;
	if (features.length > 4) {
		// ...existing regression code from old file...
	}
	return { forecast, coefficients, stdErr, pValues, rSquared };
}
