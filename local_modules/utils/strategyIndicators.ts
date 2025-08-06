/**
 * Strategy-based indicator calculation for WebSocket streaming
 *
 * This module handles loading strategy configurations and calculating
 * only the indicators specified for each strategy, using the backend
 * calculation utilities and alignment functions.
 */

import * as fs from "fs";
import * as path from "path";
import { alignIndicatorData, IndicatorValue } from "./indicatorUtils";
import { indicatorCalculatorsByCategory } from "../routes/api-utils/indicator-calculations";
import {
	createIndicatorMetadata,
	IndicatorDefaultConfig,
} from "./indicatorDefaults";

export interface IndicatorParam {
	name: string;
	default: any;
	type: string;
	color: string;
}

export interface IndicatorDefinition {
	description: string;
	params: IndicatorParam[];
}

export interface StrategyIndicatorGroup {
	[indicatorName: string]: IndicatorDefinition;
}

export interface ProcessedIndicator {
	id: string;
	name: string;
	type: string;
	parameters: Record<string, any>;
	color: string;
}

export interface OHLCVData {
	timestamp: number;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
}

export interface CalculatedIndicatorResult {
	id: string;
	name: string;
	type: string;
	data: IndicatorValue[];
	// Complete styling metadata
	color?: string;
	yAxisID?: "price" | "oscillator" | "volume";
	renderType?: "line" | "histogram" | "area" | "band";
	strokeWidth?: number;
	opacity?: number;
	fillColor?: string;
	lineStyle?: "solid" | "dashed" | "dotted";
	dashArray?: string;
	zIndex?: number;
}
const STRATEGIES_DIR = path.join(__dirname, "../db/strategies");

// Dynamic indicator calculator lookup
function getIndicatorCalculator(type: string): Function | null {
	for (const category of Object.keys(indicatorCalculatorsByCategory) as Array<
		keyof typeof indicatorCalculatorsByCategory
	>) {
		const calculators = indicatorCalculatorsByCategory[category];
		if (
			calculators &&
			Object.prototype.hasOwnProperty.call(calculators, type)
		) {
			const fn = (calculators as Record<string, Function>)[type];
			if (typeof fn === "function") {
				return fn;
			}
		}
	}
	return null;
}

/**
 * Load strategy configuration from file
 */
export function loadStrategy(strategyId: string): any | null {
	try {
		console.log(`[Strategy] Loading strategy: ${strategyId}`);
		const strategyPath = path.join(STRATEGIES_DIR, `${strategyId}.json`);
		if (!fs.existsSync(strategyPath)) {
			console.error(
				`[Strategy] Strategy file not found: ${strategyId} at ${strategyPath}`
			);
			return null;
		}

		const strategyData = JSON.parse(fs.readFileSync(strategyPath, "utf8"));
		console.log(
			`[Strategy] ✅ Loaded strategy: ${strategyId} with ${
				strategyData.indicators?.length || 0
			} indicators`
		);

		// Debug: Log the actual indicators being loaded
		if (strategyData.indicators) {
			console.log(
				`[Strategy] Indicators for ${strategyId}:`,
				strategyData.indicators.map((ind: any) => Object.keys(ind)).flat()
			);
		}

		return strategyData;
	} catch (error) {
		console.error(`[Strategy] Error loading strategy ${strategyId}:`, error);
		return null;
	}
}

/**
 * Get processed indicators for a strategy (new format only)
 */
export function getStrategyIndicators(
	strategyId: string
): ProcessedIndicator[] {
	const strategy = loadStrategy(strategyId);
	if (
		!strategy ||
		!strategy.indicators ||
		!Array.isArray(strategy.indicators)
	) {
		return [];
	}

	return processIndicatorsFromNewFormat(strategy.indicators);
}

/**
 * Process indicators from the new comprehensive format
 */
function processIndicatorsFromNewFormat(
	indicators: StrategyIndicatorGroup[]
): ProcessedIndicator[] {
	const processed: ProcessedIndicator[] = [];

	indicators.forEach((indicatorGroup) => {
		Object.keys(indicatorGroup).forEach((indicatorName) => {
			const definition = indicatorGroup[indicatorName];

			// Extract parameters with defaults
			const parameters: Record<string, any> = {};
			let primaryColor = "#6B7280"; // Default color

			if (definition.params) {
				definition.params.forEach((param) => {
					parameters[param.name] = param.default;
					// Use the first color we find as primary
					if (param.color && primaryColor === "#6B7280") {
						primaryColor = param.color;
					}
				});
			}

			// Map indicator names to calculator types
			const type = mapIndicatorNameToCalculatorType(indicatorName);
			if (!type) {
				console.warn(
					`[Strategy] No calculator mapping for indicator: ${indicatorName}`
				);
				return;
			}

			// Generate descriptive ID
			const id = generateIndicatorId(indicatorName, parameters);

			processed.push({
				id,
				name: definition.description,
				type,
				parameters,
				color: primaryColor,
			});
		});
	});

	return processed;
}

// Dynamic mapping: indicatorName is used directly as type (lowercase)
function mapIndicatorNameToCalculatorType(
	indicatorName: string
): string | null {
	return indicatorName.toLowerCase();
}

/**
 * Generate descriptive indicator ID
 */
function generateIndicatorId(
	indicatorName: string,
	parameters: Record<string, any>
): string {
	switch (indicatorName) {
		case "RSI":
			return `RSI_${parameters.period || 14}`;
		case "MACD":
			return `MACD_${parameters.fastPeriod || 12}_${
				parameters.slowPeriod || 26
			}_${parameters.signalPeriod || 9}`;
		case "BB":
			return `BB_${parameters.period || 20}_${parameters.stdDev || 2}`;
		case "SMA":
			return `SMA_${parameters.period || 20}`;
		case "EMA":
			return `EMA_${parameters.period || 20}`;
		case "ATR":
			return `ATR_${parameters.period || 14}`;
		case "CCI":
			return `CCI_${parameters.period || 20}`;
		case "ADX":
			return `ADX_${parameters.period || 14}`;
		case "STOCH":
			return `STOCH_${parameters.kPeriod || 14}_${parameters.dPeriod || 3}`;
		case "VWAP":
			return "VWAP";
		case "OBV":
			return "OBV";
		case "AD":
			return "AD";
		default:
			return `${indicatorName}_${parameters.period || "default"}`;
	}
}

/**
 * Calculate indicators and handle multi-component indicators like MACD
 */
export function calculateIndicatorsForStrategy(
	indicator: ProcessedIndicator,
	ohlcvData: OHLCVData[]
): CalculatedIndicatorResult[] {
	try {
		const type = indicator.type.toLowerCase();
		const calculator = getIndicatorCalculator(type);

		if (!calculator) {
			console.warn(`[Indicators] No calculator found for type: ${type}`);
			return [];
		}

		const timestamps = ohlcvData.map((d) => d.timestamp);
		const params = indicator.parameters || {};
		const results: CalculatedIndicatorResult[] = [];

		// Dynamic argument construction based on indicator type
		// For most indicators, pass closes and period; for others, pass OHLCV or custom
		// This can be further improved by using a config map for argument structure
		let calculatedValues: any;
		switch (type) {
			case "sma":
			case "ema":
			case "rsi": {
				const closes = ohlcvData.map((d) => d.close);
				calculatedValues = calculator(closes, params.period || 14);
				const startIndex = (params.period || 14) - 1;
				const alignedData = alignIndicatorData(
					calculatedValues,
					timestamps,
					startIndex
				);

				// Create complete metadata including user colors and intelligent defaults
				const metadata = createIndicatorMetadata(
					indicator.type,
					indicator.id,
					indicator.parameters
				);

				results.push({
					id: indicator.id,
					name: indicator.name,
					type: indicator.type,
					data: alignedData,
					...metadata, // Include all styling metadata
				});
				break;
			}
			case "macd": {
				const closes = ohlcvData.map((d) => d.close);
				calculatedValues = calculator(
					closes,
					params.fastPeriod || 12,
					params.slowPeriod || 26,
					params.signalPeriod || 9
				);
				const macdLine = (calculatedValues.macd || []).filter(
					(v: number | undefined) => v !== undefined && !isNaN(v)
				);
				const signalLine = (calculatedValues.signal || []).filter(
					(v: number | undefined) => v !== undefined && !isNaN(v)
				);
				const histogram = (calculatedValues.histogram || []).filter(
					(v: number | undefined) => v !== undefined && !isNaN(v)
				);
				const macdStartIndex = (params.slowPeriod || 26) - 1;
				const signalStartIndex =
					macdStartIndex + (macdLine.length - signalLine.length);
				const histogramStartIndex =
					macdStartIndex + (macdLine.length - histogram.length);
				if (macdLine.length) {
					const macdMetadata = createIndicatorMetadata(
						"macd_line",
						`${indicator.id}_macd`,
						indicator.parameters
					);
					results.push({
						id: `${indicator.id}_macd`,
						name: `MACD Line (${params.fastPeriod || 12})`,
						type: "macd_line",
						data: alignIndicatorData(macdLine, timestamps, macdStartIndex),
						...macdMetadata,
					});
				}
				if (signalLine.length) {
					const signalMetadata = createIndicatorMetadata(
						"macd_signal",
						`${indicator.id}_signal`,
						indicator.parameters
					);
					results.push({
						id: `${indicator.id}_signal`,
						name: `MACD Signal (${params.signalPeriod || 9})`,
						type: "macd_signal",
						data: alignIndicatorData(signalLine, timestamps, signalStartIndex),
						...signalMetadata,
					});
				}
				if (histogram.length) {
					const histogramMetadata = createIndicatorMetadata(
						"macd_histogram",
						`${indicator.id}_histogram`,
						indicator.parameters
					);
					results.push({
						id: `${indicator.id}_histogram`,
						name: `MACD Histogram`,
						type: "macd_histogram",
						data: alignIndicatorData(
							histogram,
							timestamps,
							histogramStartIndex
						),
						...histogramMetadata,
					});
				}
				break;
			}
			case "bb":
			case "bollingerbands": {
				const closes = ohlcvData.map((d) => d.close);
				calculatedValues = calculator(
					closes,
					params.period || 20,
					params.stdDev || 2
				);
				const startIndex = (params.period || 20) - 1;
				if (calculatedValues.upper) {
					const upperMetadata = createIndicatorMetadata(
						"bb_upper",
						`${indicator.id}_upper`,
						indicator.parameters
					);
					results.push({
						id: `${indicator.id}_upper`,
						name: `BB Upper (${params.period || 20})`,
						type: "bb_upper",
						data: alignIndicatorData(
							calculatedValues.upper,
							timestamps,
							startIndex
						),
						...upperMetadata,
					});
				}
				if (calculatedValues.middle) {
					const middleMetadata = createIndicatorMetadata(
						"bb_middle",
						`${indicator.id}_middle`,
						indicator.parameters
					);
					results.push({
						id: `${indicator.id}_middle`,
						name: `BB Middle (${params.period || 20})`,
						type: "bb_middle",
						data: alignIndicatorData(
							calculatedValues.middle,
							timestamps,
							startIndex
						),
						...middleMetadata,
					});
				}
				if (calculatedValues.lower) {
					const lowerMetadata = createIndicatorMetadata(
						"bb_lower",
						`${indicator.id}_lower`,
						indicator.parameters
					);
					results.push({
						id: `${indicator.id}_lower`,
						name: `BB Lower (${params.period || 20})`,
						type: "bb_lower",
						data: alignIndicatorData(
							calculatedValues.lower,
							timestamps,
							startIndex
						),
						...lowerMetadata,
					});
				}
				break;
			}
			case "atr":
			case "cci":
			case "adx": {
				const ohlcFormat = ohlcvData.map((d) => ({
					high: d.high,
					low: d.low,
					close: d.close,
				}));
				calculatedValues = calculator(ohlcFormat, params.period || 14);
				const startIndex = (params.period || 14) - 1;
				const alignedData = alignIndicatorData(
					calculatedValues,
					timestamps,
					startIndex
				);

				// Create complete metadata including user colors and intelligent defaults
				const metadata = createIndicatorMetadata(
					indicator.type,
					indicator.id,
					indicator.parameters
				);

				results.push({
					id: indicator.id,
					name: indicator.name,
					type: indicator.type,
					data: alignedData,
					...metadata, // Include all styling metadata
				});
				break;
			}
			case "vwap": {
				const vwapFormat = ohlcvData.map((d) => ({
					high: d.high,
					low: d.low,
					close: d.close,
					volume: d.volume,
				}));
				calculatedValues = calculator(vwapFormat);
				const startIndex = 0;
				const alignedData = alignIndicatorData(
					calculatedValues,
					timestamps,
					startIndex
				);

				// Create complete metadata including user colors and intelligent defaults
				const metadata = createIndicatorMetadata(
					indicator.type,
					indicator.id,
					indicator.parameters
				);

				results.push({
					id: indicator.id,
					name: indicator.name,
					type: indicator.type,
					data: alignedData,
					...metadata, // Include all styling metadata
				});
				break;
			}
			// Add dynamic support for all other indicators
			default: {
				// Try to pass closes and period if possible
				const closes = ohlcvData.map((d) => d.close);
				try {
					// Try closes, period
					calculatedValues = calculator(closes, params.period || 14);
				} catch {
					// Try OHLCV
					calculatedValues = calculator(ohlcvData, params.period || 14);
				}
				const startIndex = (params.period || 14) - 1;
				const alignedData = alignIndicatorData(
					calculatedValues,
					timestamps,
					startIndex
				);

				// Create complete metadata including user colors and intelligent defaults
				const metadata = createIndicatorMetadata(
					indicator.type,
					indicator.id,
					indicator.parameters
				);

				results.push({
					id: indicator.id,
					name: indicator.name,
					type: indicator.type,
					data: alignedData,
					...metadata, // Include all styling metadata
				});
				break;
			}
		}
		return results;
	} catch (error) {
		console.error(
			`[Indicators] Error calculating ${indicator.type} for ${indicator.id}:`,
			error
		);
		return [];
	}
}

/**
 * Calculate all indicators for a strategy
 */
export function calculateStrategyIndicators(
	strategyId: string,
	ohlcvData: OHLCVData[]
): CalculatedIndicatorResult[] {
	const indicators = getStrategyIndicators(strategyId);

	if (indicators.length === 0) {
		console.log(`[Indicators] No indicators found for strategy: ${strategyId}`);
		return [];
	}

	console.log(
		`[Indicators] Calculating ${indicators.length} indicators for strategy: ${strategyId}`
	);

	const results: CalculatedIndicatorResult[] = [];

	for (const indicator of indicators) {
		const indicatorResults = calculateIndicatorsForStrategy(
			indicator,
			ohlcvData
		);
		results.push(...indicatorResults);
	}

	console.log(
		`[Indicators] Successfully calculated ${results.length} indicators for strategy: ${strategyId}`
	);
	return results;
}

/**
 * Calculate indicators for incremental updates (latest values only)
 */
export function calculateStrategyIndicatorsIncremental(
	strategyId: string,
	ohlcvData: OHLCVData[]
): Record<string, IndicatorValue> {
	const fullResults = calculateStrategyIndicators(strategyId, ohlcvData);
	const incrementalResults: Record<string, IndicatorValue> = {};

	for (const result of fullResults) {
		// Get the latest non-null value
		let latestValue: IndicatorValue | null = null;

		// Search backwards to find the latest non-null value
		for (let i = result.data.length - 1; i >= 0; i--) {
			if (result.data[i].y !== null) {
				latestValue = result.data[i];
				break;
			}
		}

		// If no non-null value found, use the last element anyway
		if (!latestValue) {
			latestValue = result.data[result.data.length - 1];
		}

		incrementalResults[result.id] = latestValue;
	}

	return incrementalResults;
}
