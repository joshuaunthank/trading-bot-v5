// Technical Analysis Core Calculations
// These are pure functions that handle the mathematical computations

export const calculateSMA = (data: number[], period: number): number[] => {
	const result: number[] = [];
	for (let i = 0; i < data.length; i++) {
		if (i < period - 1) {
			result.push(NaN);
		} else {
			const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
			result.push(sum / period);
		}
	}
	return result;
};

export const calculateEMA = (data: number[], period: number): number[] => {
	const result: number[] = [];
	const multiplier = 2 / (period + 1);

	// Initialize result array with same length as input
	for (let i = 0; i < data.length; i++) {
		result.push(NaN);
	}

	// Find first valid data point
	let validStartIndex = 0;
	while (validStartIndex < data.length && isNaN(data[validStartIndex])) {
		validStartIndex++;
	}

	if (
		validStartIndex >= data.length ||
		validStartIndex + period > data.length
	) {
		return result; // Not enough valid data for EMA
	}

	// Calculate SMA for the first EMA value
	let sum = 0;
	let validCount = 0;

	for (let i = validStartIndex; i < data.length; i++) {
		if (!isNaN(data[i])) {
			sum += data[i];
			validCount++;

			if (validCount === period) {
				// Set the first EMA value (which is SMA)
				result[i] = sum / period;

				// Calculate subsequent EMA values
				for (let j = i + 1; j < data.length; j++) {
					if (!isNaN(data[j])) {
						result[j] = (data[j] - result[j - 1]) * multiplier + result[j - 1];
					}
					// If data[j] is NaN, result[j] stays NaN
				}
				break;
			}
		}
	}

	return result;
};

export const calculateRSI = (
	closes: number[],
	period: number = 14
): number[] => {
	const result: number[] = [];
	const gains: number[] = [];
	const losses: number[] = [];

	// First element is always NaN since we need a previous price
	result.push(NaN);

	// Calculate price changes starting from index 1
	for (let i = 1; i < closes.length; i++) {
		const change = closes[i] - closes[i - 1];
		gains.push(change > 0 ? change : 0);
		losses.push(change < 0 ? -change : 0);
	}

	// First period RSI values are NaN (need period+1 total for period calculation)
	for (let i = 1; i < period + 1; i++) {
		result.push(NaN);
	}

	if (gains.length >= period) {
		const avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
		const avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
		const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
		result.push(100 - 100 / (1 + rs));

		// Subsequent RSI calculations use smoothing
		let smoothedGain = avgGain;
		let smoothedLoss = avgLoss;

		for (let i = period; i < gains.length; i++) {
			smoothedGain = (smoothedGain * (period - 1) + gains[i]) / period;
			smoothedLoss = (smoothedLoss * (period - 1) + losses[i]) / period;
			const rs = smoothedLoss === 0 ? 100 : smoothedGain / smoothedLoss;
			result.push(100 - 100 / (1 + rs));
		}
	}

	return result;
};

export const calculateMACD = (
	closes: number[],
	fastPeriod: number = 12,
	slowPeriod: number = 26,
	signalPeriod: number = 9
) => {
	const fastEMA = calculateEMA(closes, fastPeriod);
	const slowEMA = calculateEMA(closes, slowPeriod);

	const macdLine: number[] = [];
	for (let i = 0; i < closes.length; i++) {
		if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
			macdLine.push(NaN);
		} else {
			macdLine.push(fastEMA[i] - slowEMA[i]);
		}
	}

	// Calculate signal line using MACD line directly (preserving NaN values)
	const signalLine = calculateEMA(macdLine, signalPeriod);

	const histogram: number[] = [];
	for (let i = 0; i < macdLine.length; i++) {
		if (isNaN(macdLine[i]) || isNaN(signalLine[i])) {
			histogram.push(NaN);
		} else {
			histogram.push(macdLine[i] - signalLine[i]);
		}
	}

	return { macdLine, signalLine, histogram };
};

export const calculateBollingerBands = (
	closes: number[],
	period: number = 20,
	stdDev: number = 2
) => {
	const sma = calculateSMA(closes, period);
	const upperBand: number[] = [];
	const lowerBand: number[] = [];

	for (let i = 0; i < closes.length; i++) {
		if (i < period - 1 || isNaN(sma[i])) {
			upperBand.push(NaN);
			lowerBand.push(NaN);
		} else {
			const slice = closes.slice(i - period + 1, i + 1);
			const mean = sma[i];
			const variance =
				slice.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
				period;
			const standardDeviation = Math.sqrt(variance);

			upperBand.push(mean + standardDeviation * stdDev);
			lowerBand.push(mean - standardDeviation * stdDev);
		}
	}

	return { middleBand: sma, upperBand, lowerBand };
};

// Utility function to extract different price sources from OHLCV data
export const extractPriceSource = (
	data: import("./types").OHLCVData[],
	source: string
): number[] => {
	return data.map((candle) => {
		switch (source) {
			case "open":
				return candle.open;
			case "high":
				return candle.high;
			case "low":
				return candle.low;
			case "hl2":
				return (candle.high + candle.low) / 2;
			case "hlc3":
				return (candle.high + candle.low + candle.close) / 3;
			case "ohlc4":
				return (candle.open + candle.high + candle.low + candle.close) / 4;
			case "volume":
				return candle.volume;
			default:
				return candle.close;
		}
	});
};
