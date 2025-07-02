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
} from "../routes/api-utils/indicator-calculations";

export interface StrategyIndicatorConfig {
	id: string;
	type: string;
	parameters: Record<string, any>;
	name?: string;
	source?: string;
	output_fields?: string[];
	enabled?: boolean;
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
 * Get indicator configurations for a strategy
 */
export function getStrategyIndicators(
	strategyId: string
): StrategyIndicatorConfig[] {
	const strategy = loadStrategy(strategyId);
	if (!strategy || !strategy.indicators) {
		return [];
	}

	return strategy.indicators.filter(
		(indicator: any) => indicator.enabled !== false // Include enabled indicators (default to true if not specified)
	);
}

/**
 * Calculate a single indicator with proper alignment
 */
function calculateSingleIndicator(
	config: StrategyIndicatorConfig,
	ohlcvData: OHLCVData[]
): CalculatedIndicatorResult | null {
	try {
		const type = config.type.toLowerCase();
		const calculator = indicatorCalculators[type];

		if (!calculator) {
			console.warn(`[Indicators] No calculator found for type: ${type}`);
			return null;
		}

		const timestamps = ohlcvData.map((d) => d.timestamp);
		const period = config.parameters?.period || 14;
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
				const fastPeriod = config.parameters?.fastPeriod || 12;
				const slowPeriod = config.parameters?.slowPeriod || 26;
				const signalPeriod = config.parameters?.signalPeriod || 9;

				const result = calculator(closes, fastPeriod, slowPeriod, signalPeriod);

				// For MACD, return the main MACD line (could be extended to return signal and histogram)
				calculatedValues = result.macd || [];
				startIndex = slowPeriod - 1;
				break;
			}

			case "bb":
			case "bollingerbands": {
				const closes = ohlcvData.map((d) => d.close);
				const stdDev = config.parameters?.stdDev || 2;

				const result = calculator(closes, period, stdDev);

				// For Bollinger Bands, return the middle line (could be extended to return upper/lower)
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
			id: config.id,
			name: config.name || `${config.type.toUpperCase()}(${period})`,
			type: config.type,
			data: alignedData,
		};
	} catch (error) {
		console.error(
			`[Indicators] Error calculating ${config.type} for ${config.id}:`,
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
		const result = calculateSingleIndicator(indicator, ohlcvData);
		if (result) {
			results.push(result);
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
		const latestValue = result.data[result.data.length - 1];
		incrementalResults[result.id] = latestValue;
	}

	return incrementalResults;
}
