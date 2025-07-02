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
import {
	calculatedSMA,
	calculatedEMA,
	calculatedRSI,
	calculatedMACD,
	calculatedBollingerBands,
	calculatedATR,
	calculatedCCI,
	calculatedADX,
	calculatedVWAP,
} from "../routes/api-utils/indicator-calculations";

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
	data: IndicatorValue[]; // Aligned with timestamps
}

const STRATEGIES_DIR = path.join(__dirname, "../db/strategies");

// Map indicator types to calculation functions
const indicatorCalculators: Record<string, Function> = {
	sma: calculatedSMA,
	ema: calculatedEMA,
	rsi: calculatedRSI,
	macd: calculatedMACD,
	bb: calculatedBollingerBands,
	bollingerbands: calculatedBollingerBands,
	atr: calculatedATR,
	cci: calculatedCCI,
	adx: calculatedADX,
	vwap: calculatedVWAP,
};

/**
 * Load strategy configuration from file
 */
export function loadStrategy(strategyId: string): any | null {
	try {
		const strategyPath = path.join(STRATEGIES_DIR, `${strategyId}.json`);
		if (!fs.existsSync(strategyPath)) {
			console.error(`[Strategy] Strategy file not found: ${strategyId}`);
			return null;
		}

		const strategyData = JSON.parse(fs.readFileSync(strategyPath, "utf8"));
		console.log(
			`[Strategy] Loaded strategy: ${strategyId} with ${
				strategyData.indicators?.length || 0
			} indicators`
		);
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

/**
 * Map indicator names to backend calculator types
 */
function mapIndicatorNameToCalculatorType(
	indicatorName: string
): string | null {
	const mapping: Record<string, string> = {
		RSI: "rsi",
		MACD: "macd",
		BB: "bb",
		SMA: "sma",
		EMA: "ema",
		ATR: "atr",
		CCI: "cci",
		ADX: "adx",
		VWAP: "vwap",
		STOCH: "stoch",
		OBV: "obv",
		WILLIAMS_R: "williams",
		MFI: "mfi",
		PSAR: "sar",
		AD: "ad",
	};

	return mapping[indicatorName] || null;
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
 * Calculate a single indicator with proper alignment
 */
function calculateSingleIndicator(
	indicator: ProcessedIndicator,
	ohlcvData: OHLCVData[]
): CalculatedIndicatorResult | null {
	try {
		const type = indicator.type.toLowerCase();
		const calculator = indicatorCalculators[type];

		if (!calculator) {
			console.warn(`[Indicators] No calculator found for type: ${type}`);
			return null;
		}

		const timestamps = ohlcvData.map((d) => d.timestamp);
		const period = indicator.parameters?.period || 14;
		let calculatedValues: number[] = [];
		let startIndex = 0;

		// Prepare data based on indicator type
		switch (type) {
			case "sma":
			case "ema":
			case "rsi": {
				const closes = ohlcvData.map((d) => d.close);
				calculatedValues = calculator(closes, period);
				startIndex = period - 1;
				break;
			}

			case "macd": {
				const closes = ohlcvData.map((d) => d.close);
				const fastPeriod = indicator.parameters?.fastPeriod || 12;
				const slowPeriod = indicator.parameters?.slowPeriod || 26;
				const signalPeriod = indicator.parameters?.signalPeriod || 9;

				const result = calculator(closes, fastPeriod, slowPeriod, signalPeriod);
				calculatedValues = result.macd || [];
				startIndex = slowPeriod - 1;
				break;
			}

			case "bb": {
				const closes = ohlcvData.map((d) => d.close);
				const stdDev = indicator.parameters?.stdDev || 2;

				const result = calculator(closes, period, stdDev);
				calculatedValues = result.middle || [];
				startIndex = period - 1;
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

				calculatedValues = calculator(ohlcFormat, period);
				startIndex = period - 1;
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
				startIndex = 0;
				break;
			}

			default:
				console.warn(`[Indicators] Unhandled indicator type: ${type}`);
				return null;
		}

		// Align the calculated values with timestamps
		const alignedData = alignIndicatorData(
			calculatedValues,
			timestamps,
			startIndex
		);

		return {
			id: indicator.id,
			name: indicator.name,
			type: indicator.type,
			data: alignedData,
		};
	} catch (error) {
		console.error(
			`[Indicators] Error calculating ${indicator.type} for ${indicator.id}:`,
			error
		);
		return null;
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
		// Only calculate if we have a calculator for this type
		if (indicatorCalculators[indicator.type]) {
			const result = calculateSingleIndicator(indicator, ohlcvData);
			if (result) {
				results.push(result);
			}
		} else {
			console.warn(`[Indicators] No calculator for type: ${indicator.type}`);
		}
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
