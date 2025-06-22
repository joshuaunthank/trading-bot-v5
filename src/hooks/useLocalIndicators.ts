import { useMemo } from "react";

export interface OHLCVData {
	timestamp: number;
	open: number;
	high: number;
	close: number;
	low: number;
	volume: number;
}

export interface IndicatorValue {
	x: number; // timestamp
	y: number; // value
}

export interface CalculatedIndicator {
	id: string;
	name: string;
	data: IndicatorValue[];
	color: string;
	yAxisID: string;
	type: IndicatorType;
}

export type IndicatorType = "EMA" | "SMA" | "RSI" | "MACD" | "BB";

export interface IndicatorConfig {
	type: IndicatorType;
	period?: number;
	enabled: boolean;
	color?: string;
}

// Technical Analysis Calculations
const calculateSMA = (data: number[], period: number): number[] => {
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

const calculateEMA = (data: number[], period: number): number[] => {
	const result: number[] = [];
	const multiplier = 2 / (period + 1);

	// First value is SMA
	let sum = 0;
	for (let i = 0; i < Math.min(period, data.length); i++) {
		sum += data[i];
		if (i < period - 1) {
			result.push(NaN);
		} else {
			result.push(sum / period);
		}
	}

	// Subsequent values are EMA
	for (let i = period; i < data.length; i++) {
		const ema = (data[i] - result[i - 1]) * multiplier + result[i - 1];
		result.push(ema);
	}

	return result;
};

const calculateRSI = (closes: number[], period: number = 14): number[] => {
	const result: number[] = [];
	const gains: number[] = [];
	const losses: number[] = [];

	// Calculate price changes
	for (let i = 1; i < closes.length; i++) {
		const change = closes[i] - closes[i - 1];
		gains.push(change > 0 ? change : 0);
		losses.push(change < 0 ? -change : 0);
	}

	// First RSI values are NaN
	for (let i = 0; i < period; i++) {
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

const calculateMACD = (
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

	const signalLine = calculateEMA(
		macdLine.filter((v) => !isNaN(v)),
		signalPeriod
	);
	const fullSignalLine: number[] = [];
	let signalIndex = 0;

	for (let i = 0; i < macdLine.length; i++) {
		if (isNaN(macdLine[i])) {
			fullSignalLine.push(NaN);
		} else {
			fullSignalLine.push(signalLine[signalIndex] || NaN);
			signalIndex++;
		}
	}

	const histogram: number[] = [];
	for (let i = 0; i < macdLine.length; i++) {
		if (isNaN(macdLine[i]) || isNaN(fullSignalLine[i])) {
			histogram.push(NaN);
		} else {
			histogram.push(macdLine[i] - fullSignalLine[i]);
		}
	}

	return { macdLine, signalLine: fullSignalLine, histogram };
};

const calculateBollingerBands = (
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

// Color scheme for indicators
const INDICATOR_COLORS: Record<IndicatorType, string> = {
	EMA: "#00ff88", // Green
	SMA: "#3742fa", // Blue
	RSI: "#ffa726", // Orange
	MACD: "#e91e63", // Pink
	BB: "#607d8b", // Blue Grey
};

const INDICATOR_SUBCOLORS = {
	MACD_Signal: "#9c27b0", // Purple
	MACD_Histogram: "#795548", // Brown
	BB_Upper: "#ff5722", // Red
	BB_Lower: "#ff5722", // Red
};

// Y-axis assignment with dynamic support
const getYAxis = (
	indicatorType: IndicatorType,
	instanceIndex?: number
): string => {
	switch (indicatorType) {
		case "RSI":
			return `y_rsi${
				instanceIndex !== undefined && instanceIndex > 0
					? `_${instanceIndex}`
					: ""
			}`;
		case "MACD":
			return `y_macd${
				instanceIndex !== undefined && instanceIndex > 0
					? `_${instanceIndex}`
					: ""
			}`;
		case "EMA":
		case "SMA":
		case "BB":
			return "y"; // Price axis
		default:
			return `y1${
				instanceIndex !== undefined && instanceIndex > 0
					? `_${instanceIndex}`
					: ""
			}`;
	}
};

// Get scale configuration for dynamic axis creation
export const getScaleConfig = (
	indicatorType: IndicatorType,
	instanceIndex: number = 0
) => {
	const axisId = getYAxis(indicatorType, instanceIndex);

	switch (indicatorType) {
		case "RSI":
			return {
				id: axisId,
				type: "linear" as const,
				position: "left" as const,
				min: 0,
				max: 100,
				grid: { display: false },
				ticks: {
					color: "rgba(255, 200, 87, 0.7)",
					stepSize: 20,
				},
				title: {
					display: true,
					text: `RSI${instanceIndex > 0 ? ` (${instanceIndex + 1})` : ""}`,
					color: "rgba(255, 200, 87, 0.7)",
				},
			};
		case "MACD":
			return {
				id: axisId,
				type: "linear" as const,
				position: "left" as const,
				grid: { display: false },
				ticks: {
					color: "rgba(233, 30, 99, 0.7)",
				},
				title: {
					display: true,
					text: `MACD${instanceIndex > 0 ? ` (${instanceIndex + 1})` : ""}`,
					color: "rgba(233, 30, 99, 0.7)",
				},
			};
		default:
			return {
				id: axisId,
				type: "linear" as const,
				position: "left" as const,
				grid: { display: false },
				ticks: {
					color: "rgba(255, 255, 255, 0.7)",
				},
				title: {
					display: true,
					text: `Indicators${
						instanceIndex > 0 ? ` (${instanceIndex + 1})` : ""
					}`,
					color: "rgba(255, 255, 255, 0.7)",
				},
			};
	}
};

const getDefaultPeriod = (type: IndicatorType): number => {
	switch (type) {
		case "EMA":
		case "SMA":
		case "BB":
			return 20;
		case "RSI":
			return 14;
		case "MACD":
			return 12;
		default:
			return 20;
	}
};

export const useLocalIndicators = (
	ohlcvData: OHLCVData[],
	indicatorConfigs: IndicatorConfig[]
): CalculatedIndicator[] => {
	return useMemo(() => {
		if (!ohlcvData || ohlcvData.length === 0 || indicatorConfigs.length === 0) {
			return [];
		}

		const results: CalculatedIndicator[] = [];
		const closes = ohlcvData.map((candle) => candle.close);
		const timestamps = ohlcvData.map((candle) => candle.timestamp);

		// Track instances of each indicator type for unique axis assignment
		const indicatorCounts: Record<string, number> = {};

		indicatorConfigs.forEach((config, index) => {
			if (!config.enabled) return;

			const period = config.period || getDefaultPeriod(config.type);
			const color = config.color || INDICATOR_COLORS[config.type];
			const baseId = `${config.type}_${period}_${index}`;

			// Track instances for dynamic axis assignment
			const instanceIndex = indicatorCounts[config.type] || 0;
			indicatorCounts[config.type] = instanceIndex + 1;

			switch (config.type) {
				case "EMA": {
					const values = calculateEMA(closes, period);
					const data = values
						.map((value, i) => ({ x: timestamps[i], y: value }))
						.filter((point) => !isNaN(point.y));

					results.push({
						id: baseId,
						name: `EMA(${period})`,
						data,
						color,
						yAxisID: getYAxis(config.type, instanceIndex),
						type: config.type,
					});
					break;
				}

				case "SMA": {
					const values = calculateSMA(closes, period);
					const data = values
						.map((value, i) => ({ x: timestamps[i], y: value }))
						.filter((point) => !isNaN(point.y));

					results.push({
						id: baseId,
						name: `SMA(${period})`,
						data,
						color,
						yAxisID: getYAxis(config.type, instanceIndex),
						type: config.type,
					});
					break;
				}

				case "RSI": {
					const values = calculateRSI(closes, period);
					const data = values
						.map((value, i) => ({ x: timestamps[i], y: value }))
						.filter((point) => !isNaN(point.y));

					results.push({
						id: baseId,
						name: `RSI(${period})`,
						data,
						color,
						yAxisID: getYAxis(config.type, instanceIndex),
						type: config.type,
					});
					break;
				}

				case "MACD": {
					const macd = calculateMACD(closes);
					const axisId = getYAxis(config.type, instanceIndex);

					// MACD Line
					let data = macd.macdLine
						.map((value, i) => ({ x: timestamps[i], y: value }))
						.filter((point) => !isNaN(point.y));

					results.push({
						id: `${baseId}_line`,
						name: "MACD",
						data,
						color,
						yAxisID: axisId,
						type: config.type,
					});

					// Signal Line
					data = macd.signalLine
						.map((value, i) => ({ x: timestamps[i], y: value }))
						.filter((point) => !isNaN(point.y));

					results.push({
						id: `${baseId}_signal`,
						name: "MACD Signal",
						data,
						color: INDICATOR_SUBCOLORS.MACD_Signal,
						yAxisID: axisId,
						type: config.type,
					});

					// Histogram
					data = macd.histogram
						.map((value, i) => ({ x: timestamps[i], y: value }))
						.filter((point) => !isNaN(point.y));

					results.push({
						id: `${baseId}_histogram`,
						name: "MACD Histogram",
						data,
						color: INDICATOR_SUBCOLORS.MACD_Histogram,
						yAxisID: axisId,
						type: config.type,
					});
					break;
				}

				case "BB": {
					const bb = calculateBollingerBands(closes, period);
					const axisId = getYAxis(config.type, instanceIndex);

					// Middle Band (SMA)
					let data = bb.middleBand
						.map((value, i) => ({ x: timestamps[i], y: value }))
						.filter((point) => !isNaN(point.y));

					results.push({
						id: `${baseId}_middle`,
						name: `BB Middle(${period})`,
						data,
						color,
						yAxisID: axisId,
						type: config.type,
					});

					// Upper Band
					data = bb.upperBand
						.map((value, i) => ({ x: timestamps[i], y: value }))
						.filter((point) => !isNaN(point.y));

					results.push({
						id: `${baseId}_upper`,
						name: `BB Upper(${period})`,
						data,
						color: INDICATOR_SUBCOLORS.BB_Upper,
						yAxisID: axisId,
						type: config.type,
					});

					// Lower Band
					data = bb.lowerBand
						.map((value, i) => ({ x: timestamps[i], y: value }))
						.filter((point) => !isNaN(point.y));

					results.push({
						id: `${baseId}_lower`,
						name: `BB Lower(${period})`,
						data,
						color: INDICATOR_SUBCOLORS.BB_Lower,
						yAxisID: axisId,
						type: config.type,
					});
					break;
				}
			}
		});

		return results;
	}, [ohlcvData, indicatorConfigs]);
};
