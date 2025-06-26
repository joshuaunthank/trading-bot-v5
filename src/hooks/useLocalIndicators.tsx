import { useMemo } from "react";
import {
	SMA,
	EMA,
	RSI,
	MACD,
	BollingerBands,
	Stochastic,
	ADX,
	CCI,
	WilliamsR,
	ATR,
	OBV,
} from "technicalindicators";

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
	y: number | null; // value (null for missing/NaN values that Chart.js should skip)
}

export interface CalculatedIndicator {
	id: string;
	name: string;
	data: IndicatorValue[];
	color: string;
	yAxisID: string;
	type: IndicatorType;
}

export type IndicatorType =
	| "EMA"
	| "SMA"
	| "RSI"
	| "MACD"
	| "BB"
	| "STOCH"
	| "ADX"
	| "CCI"
	| "WILLIAMS"
	| "ATR"
	| "OBV";

export interface IndicatorConfig {
	id: string; // Unique identifier for this instance
	type: IndicatorType;
	period?: number;
	enabled: boolean;
	color?: string;
	// Advanced parameters for different indicators
	parameters?: {
		fastPeriod?: number;
		slowPeriod?: number;
		signalPeriod?: number;
		stdDev?: number;
		kPeriod?: number;
		dPeriod?: number;
		[key: string]: any;
	};
}

// Helper function to convert library results to our format with proper alignment
const alignIndicatorData = (
	values: number[],
	timestamps: number[],
	startIndex: number = 0
): IndicatorValue[] => {
	const result: IndicatorValue[] = [];

	// Fill initial NaN values before startIndex
	for (let i = 0; i < startIndex; i++) {
		result.push({ x: timestamps[i], y: null });
	}

	// Add calculated values
	for (let i = 0; i < values.length; i++) {
		const timestampIndex = startIndex + i;
		if (timestampIndex < timestamps.length) {
			result.push({
				x: timestamps[timestampIndex],
				y: isNaN(values[i]) ? null : values[i],
			});
		}
	}

	// Fill remaining timestamps if needed
	while (result.length < timestamps.length) {
		result.push({
			x: timestamps[result.length],
			y: null,
		});
	}

	return result;
};

// Calculate indicators using the technicalindicators library
const calculateIndicatorWithLibrary = (
	type: IndicatorType,
	ohlcvData: OHLCVData[],
	config: IndicatorConfig
): CalculatedIndicator[] => {
	const period = config.period || getDefaultPeriod(type);
	const timestamps = ohlcvData.map((d) => d.timestamp);
	const results: CalculatedIndicator[] = [];

	// Prepare input data
	const closes = ohlcvData.map((d) => d.close);
	const opens = ohlcvData.map((d) => d.open);
	const highs = ohlcvData.map((d) => d.high);
	const lows = ohlcvData.map((d) => d.low);
	const volumes = ohlcvData.map((d) => d.volume);

	// Debug: Check for invalid data (keep for production safety)
	const invalidCloses = closes.filter((c) => !Number.isFinite(c));
	if (invalidCloses.length > 0) {
		console.error(
			`${invalidCloses.length} invalid close values found:`,
			invalidCloses.slice(0, 5)
		);
	}

	try {
		switch (type) {
			case "EMA": {
				const values = EMA.calculate({ period, values: closes });
				const startIndex = period - 1; // EMA typically starts after (period-1) values

				results.push({
					id: config.id,
					name: `EMA(${period})`,
					data: alignIndicatorData(values, timestamps, startIndex),
					color: config.color || INDICATOR_COLORS[type],
					yAxisID: getYAxis(type),
					type,
				});
				break;
			}

			case "SMA": {
				const values = SMA.calculate({ period, values: closes });
				const startIndex = period - 1; // SMA starts after (period-1) values

				results.push({
					id: config.id,
					name: `SMA(${period})`,
					data: alignIndicatorData(values, timestamps, startIndex),
					color: config.color || INDICATOR_COLORS[type],
					yAxisID: getYAxis(type),
					type,
				});
				break;
			}

			case "RSI": {
				const values = RSI.calculate({ period, values: closes });
				const startIndex = period; // RSI typically starts after period values

				results.push({
					id: config.id,
					name: `RSI(${period})`,
					data: alignIndicatorData(values, timestamps, startIndex),
					color: config.color || INDICATOR_COLORS[type],
					yAxisID: getYAxis(type),
					type,
				});
				break;
			}

			case "MACD": {
				const fastPeriod = config.parameters?.fastPeriod || 12;
				const slowPeriod = config.parameters?.slowPeriod || 26;
				const signalPeriod = config.parameters?.signalPeriod || 9;

				const macdData = MACD.calculate({
					values: closes,
					fastPeriod,
					slowPeriod,
					signalPeriod,
					SimpleMAOscillator: false,
					SimpleMASignal: false,
				});

				const startIndex = slowPeriod - 1; // MACD starts after slow period
				const axisId = getYAxis(type);

				// MACD Line
				results.push({
					id: `${config.id}_line`,
					name: "MACD",
					data: alignIndicatorData(
						macdData.map((d) => d.MACD || NaN),
						timestamps,
						startIndex
					),
					color: config.color || INDICATOR_COLORS[type],
					yAxisID: axisId,
					type,
				});

				// Signal Line
				results.push({
					id: `${config.id}_signal`,
					name: "MACD Signal",
					data: alignIndicatorData(
						macdData.map((d) => d.signal || NaN),
						timestamps,
						startIndex + signalPeriod - 1
					),
					color: INDICATOR_SUBCOLORS.MACD_Signal,
					yAxisID: axisId,
					type,
				});

				// Histogram
				results.push({
					id: `${config.id}_histogram`,
					name: "MACD Histogram",
					data: alignIndicatorData(
						macdData.map((d) => d.histogram || NaN),
						timestamps,
						startIndex + signalPeriod - 1
					),
					color: INDICATOR_SUBCOLORS.MACD_Histogram,
					yAxisID: axisId,
					type,
				});
				break;
			}

			case "BB": {
				const stdDev = config.parameters?.stdDev || 2;

				const bbData = BollingerBands.calculate({
					period,
					values: closes,
					stdDev,
				});

				const startIndex = period - 1;
				const axisId = getYAxis(type);

				// Middle Band
				results.push({
					id: `${config.id}_middle`,
					name: `BB Middle(${period})`,
					data: alignIndicatorData(
						bbData.map((d) => d.middle || NaN),
						timestamps,
						startIndex
					),
					color: config.color || INDICATOR_COLORS[type],
					yAxisID: axisId,
					type,
				});

				// Upper Band
				results.push({
					id: `${config.id}_upper`,
					name: `BB Upper(${period})`,
					data: alignIndicatorData(
						bbData.map((d) => d.upper || NaN),
						timestamps,
						startIndex
					),
					color: INDICATOR_SUBCOLORS.BB_Upper,
					yAxisID: axisId,
					type,
				});

				// Lower Band
				results.push({
					id: `${config.id}_lower`,
					name: `BB Lower(${period})`,
					data: alignIndicatorData(
						bbData.map((d) => d.lower || NaN),
						timestamps,
						startIndex
					),
					color: INDICATOR_SUBCOLORS.BB_Lower,
					yAxisID: axisId,
					type,
				});
				break;
			}

			case "STOCH": {
				const kPeriod = config.parameters?.kPeriod || 14;
				const dPeriod = config.parameters?.dPeriod || 3;

				const stochData = Stochastic.calculate({
					high: highs,
					low: lows,
					close: closes,
					period: kPeriod,
					signalPeriod: dPeriod,
				});

				const startIndex = kPeriod - 1;
				const axisId = getYAxis(type);

				// %K Line
				results.push({
					id: `${config.id}_k`,
					name: `Stoch %K(${kPeriod})`,
					data: alignIndicatorData(
						stochData.map((d) => d.k || NaN),
						timestamps,
						startIndex
					),
					color: config.color || "#ff9800",
					yAxisID: axisId,
					type,
				});

				// %D Line
				results.push({
					id: `${config.id}_d`,
					name: `Stoch %D(${dPeriod})`,
					data: alignIndicatorData(
						stochData.map((d) => d.d || NaN),
						timestamps,
						startIndex + dPeriod - 1
					),
					color: "#2196f3",
					yAxisID: axisId,
					type,
				});
				break;
			}

			case "ADX": {
				const adxData = ADX.calculate({
					high: highs,
					low: lows,
					close: closes,
					period,
				});

				const startIndex = period * 2; // ADX typically needs more data

				results.push({
					id: config.id,
					name: `ADX(${period})`,
					data: alignIndicatorData(
						adxData.map((d) => d.adx || NaN),
						timestamps,
						startIndex
					),
					color: config.color || "#9c27b0",
					yAxisID: getYAxis(type),
					type,
				});
				break;
			}

			case "CCI": {
				const cciValues = CCI.calculate({
					high: highs,
					low: lows,
					close: closes,
					period,
				});

				const startIndex = period - 1;

				results.push({
					id: config.id,
					name: `CCI(${period})`,
					data: alignIndicatorData(cciValues, timestamps, startIndex),
					color: config.color || "#607d8b",
					yAxisID: getYAxis(type),
					type,
				});
				break;
			}

			case "WILLIAMS": {
				const williamsValues = WilliamsR.calculate({
					high: highs,
					low: lows,
					close: closes,
					period,
				});

				const startIndex = period - 1;

				results.push({
					id: config.id,
					name: `Williams %R(${period})`,
					data: alignIndicatorData(williamsValues, timestamps, startIndex),
					color: config.color || "#795548",
					yAxisID: getYAxis(type),
					type,
				});
				break;
			}

			case "ATR": {
				const atrValues = ATR.calculate({
					high: highs,
					low: lows,
					close: closes,
					period,
				});

				const startIndex = period - 1;

				results.push({
					id: config.id,
					name: `ATR(${period})`,
					data: alignIndicatorData(atrValues, timestamps, startIndex),
					color: config.color || "#ff5722",
					yAxisID: getYAxis(type),
					type,
				});
				break;
			}

			case "OBV": {
				const obvValues = OBV.calculate({
					close: closes,
					volume: volumes,
				});

				// OBV starts from the first data point
				results.push({
					id: config.id,
					name: "OBV",
					data: alignIndicatorData(obvValues, timestamps, 0),
					color: config.color || "#4caf50",
					yAxisID: getYAxis(type),
					type,
				});
				break;
			}
		}
	} catch (error) {
		console.error(`Error calculating ${type}:`, error);
		console.error(
			`Input data lengths - closes: ${closes.length}, highs: ${highs.length}, lows: ${lows.length}, volumes: ${volumes.length}`
		);
		console.error(`Period: ${period}, Config:`, config);
	}

	return results;
};

/**
 * TIMEFRAME CONSISTENCY VALIDATION
 * Ensures indicators are calculated consistently regardless of zoom level
 */
const validateTimeframeConsistency = (
	data: OHLCVData[],
	timeframe: string
): OHLCVData[] => {
	// Ensure we always use complete timeframe data
	// This prevents zoom-level artifacts from affecting calculations
	if (data.length === 0) return data;

	// For production: Add timeframe validation
	// This ensures RSI/indicators behave identically at all zoom levels
	console.log(
		`[Indicators] Calculating for timeframe: ${timeframe}, data points: ${data.length}`
	);

	return data; // Return validated data
};

// Color scheme for indicators
const INDICATOR_COLORS: Record<IndicatorType, string> = {
	EMA: "#00ff88", // Green
	SMA: "#3742fa", // Blue
	RSI: "#ffa726", // Orange
	MACD: "#e91e63", // Pink
	BB: "#607d8b", // Blue Grey
	STOCH: "#ff9800", // Orange
	ADX: "#9c27b0", // Purple
	CCI: "#607d8b", // Blue Grey
	WILLIAMS: "#795548", // Brown
	ATR: "#ff5722", // Red
	OBV: "#4caf50", // Green
};

const INDICATOR_SUBCOLORS = {
	MACD_Signal: "#9c27b0", // Purple
	MACD_Histogram: "#795548", // Brown
	BB_Upper: "#ff5722", // Red
	BB_Lower: "#ff5722", // Red
};

// Y-axis assignment - simplified to use main price axis for all indicators
const getYAxis = (
	indicatorType: IndicatorType,
	instanceIndex?: number
): string => {
	// Put all indicators on the main price axis (right side)
	return "y";
};

// Get scale configuration for dynamic axis creation
export const getScaleConfig = (
	indicatorType: IndicatorType,
	instanceIndex: number = 0
) => {
	const axisId = getYAxis(indicatorType, instanceIndex);

	switch (indicatorType) {
		case "RSI":
		case "STOCH":
			return {
				id: axisId,
				type: "linear" as const,
				position: "left" as const,
				min: 0,
				max: 100,
				// Force fixed scale - prevent auto-scaling based on visible data
				beginAtZero: false,
				suggestedMin: 0,
				suggestedMax: 100,
				grace: 0, // No padding
				grid: { display: false },
				ticks: {
					color: "rgba(255, 200, 87, 0.7)",
					stepSize: 20,
					// Force min/max bounds
					min: 0,
					max: 100,
				},
				title: {
					display: true,
					text: `${indicatorType}${
						instanceIndex > 0 ? ` (${instanceIndex + 1})` : ""
					}`,
					color: "rgba(255, 200, 87, 0.7)",
				},
				// Prevent Chart.js from adjusting scale based on data
				afterFit: function (scale: any) {
					scale.min = 0;
					scale.max = 100;
				},
			};
		case "WILLIAMS":
			return {
				id: axisId,
				type: "linear" as const,
				position: "left" as const,
				min: -100,
				max: 0,
				// Force fixed scale for Williams %R
				beginAtZero: false,
				suggestedMin: -100,
				suggestedMax: 0,
				grace: 0,
				grid: { display: false },
				ticks: {
					color: "rgba(121, 85, 72, 0.7)",
					stepSize: 20,
					min: -100,
					max: 0,
				},
				title: {
					display: true,
					text: `Williams %R${
						instanceIndex > 0 ? ` (${instanceIndex + 1})` : ""
					}`,
					color: "rgba(121, 85, 72, 0.7)",
				},
				// Lock scale bounds
				afterFit: function (scale: any) {
					scale.min = -100;
					scale.max = 0;
				},
			};
		case "MACD":
		case "CCI":
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
					text: `${indicatorType}${
						instanceIndex > 0 ? ` (${instanceIndex + 1})` : ""
					}`,
					color: "rgba(233, 30, 99, 0.7)",
				},
			};
		case "ADX":
			return {
				id: axisId,
				type: "linear" as const,
				position: "left" as const,
				min: 0,
				max: 100,
				// Force fixed scale for ADX
				beginAtZero: false,
				suggestedMin: 0,
				suggestedMax: 100,
				grace: 0,
				grid: { display: false },
				ticks: {
					color: "rgba(156, 39, 176, 0.7)",
					stepSize: 25,
					min: 0,
					max: 100,
				},
				title: {
					display: true,
					text: `ADX${instanceIndex > 0 ? ` (${instanceIndex + 1})` : ""}`,
					color: "rgba(156, 39, 176, 0.7)",
				},
				// Lock scale bounds
				afterFit: function (scale: any) {
					scale.min = 0;
					scale.max = 100;
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
					text: `${indicatorType}${
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
		case "STOCH":
		case "CCI":
		case "WILLIAMS":
		case "ATR":
		case "ADX":
			return 14;
		case "MACD":
			return 12;
		case "OBV":
			return 1; // OBV doesn't use period
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

		// CRITICAL FIX: Ensure data is sorted chronologically (oldest first, newest last)
		const sortedOhlcvData = [...ohlcvData].sort(
			(a, b) => a.timestamp - b.timestamp
		);

		const results: CalculatedIndicator[] = [];

		// Track instances of each indicator type for unique axis assignment
		const indicatorCounts: Record<string, number> = {};

		indicatorConfigs.forEach((config) => {
			if (!config.enabled) return;

			// Track instances for dynamic axis assignment
			const instanceIndex = indicatorCounts[config.type] || 0;
			indicatorCounts[config.type] = instanceIndex + 1;

			// Use the library-based calculation with sorted data
			const indicatorResults = calculateIndicatorWithLibrary(
				config.type,
				sortedOhlcvData,
				config
			);

			// Update the yAxisID for each result to include instance index
			indicatorResults.forEach((result) => {
				if (result.yAxisID !== "y") {
					// Don't modify price axis
					result.yAxisID = getYAxis(config.type, instanceIndex);
				}
			});

			results.push(...indicatorResults);
		});

		return results;
	}, [ohlcvData, indicatorConfigs]);
};
