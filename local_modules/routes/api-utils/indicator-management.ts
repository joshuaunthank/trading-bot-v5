/**
 * Indicator Management API Utilities
 *
 * Provides API handlers for indicator-related operations, including
 * retrieving available indicators, calculating custom indicators,
 * and managing indicator configurations.
 */

import { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import {
	calculatedSMA,
	calculatedEMA,
	calculatedRSI,
	calculatedMACD,
	calculatedATR,
	calculatedBollingerBands,
	calculatedVWAP,
	calculatedCCI,
	calculatedADX,
} from "./indicator-calculations";

const indicatorsPath = path.join(__dirname, "../../db/indicators");

export interface IndicatorResponse {
	success: boolean;
	indicators?: any[];
	indicator?: any;
	error?: string;
	message?: string;
}

export interface IndicatorConfig {
	id: string;
	name: string;
	description: string;
	category: string;
	type: string;
	default_parameters: Record<string, any>;
	output_fields: string[];
	scale?: {
		min?: number;
		max?: number;
		overbought?: number;
		oversold?: number;
	};
	panel?: string;
}

/**
 * Get all available indicators
 */
export function getAllIndicators(req: Request, res: Response): void {
	try {
		const registryPath = path.join(indicatorsPath, "indicators.json");
		const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));

		res.json({
			success: true,
			indicators: registry,
		} as IndicatorResponse);
	} catch (error) {
		console.error("Error reading indicators registry:", error);
		res.status(500).json({
			success: false,
			error: "Failed to load indicators registry",
		} as IndicatorResponse);
	}
}

/**
 * Get indicator types for dropdowns
 */
export function getIndicatorTypes(req: Request, res: Response): void {
	try {
		const registryPath = path.join(indicatorsPath, "indicators.json");
		const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
		const types = registry.map((indicator: any) => ({
			id: indicator.id,
			name: indicator.name,
			type: indicator.type,
			parameters: indicator.parameters,
		}));

		res.json({
			success: true,
			indicators: types,
		} as IndicatorResponse);
	} catch (error) {
		console.error("Error reading indicator types:", error);
		res.status(500).json({
			success: false,
			error: "Failed to load indicator types",
		} as IndicatorResponse);
	}
}

/**
 * Get specific indicator details
 */
export function getIndicatorById(req: Request, res: Response): void {
	const indicatorId = req.params.id;

	try {
		const indicatorPath = path.join(indicatorsPath, `${indicatorId}.json`);

		if (!fs.existsSync(indicatorPath)) {
			res.status(404).json({
				success: false,
				error: `Indicator '${indicatorId}' not found`,
			} as IndicatorResponse);
			return;
		}

		const indicator = JSON.parse(fs.readFileSync(indicatorPath, "utf8"));

		res.json({
			success: true,
			indicator: indicator,
		} as IndicatorResponse);
	} catch (error) {
		console.error(`Error reading indicator ${indicatorId}:`, error);
		res.status(500).json({
			success: false,
			error: "Failed to load indicator details",
		} as IndicatorResponse);
	}
}

/**
 * Create a new indicator
 */
export function createIndicator(req: Request, res: Response): void {
	try {
		const indicatorData: IndicatorConfig = req.body;

		// Validate required fields
		if (!indicatorData.id || !indicatorData.name || !indicatorData.type) {
			res.status(400).json({
				success: false,
				error: "Missing required fields: id, name, or type",
			} as IndicatorResponse);
			return;
		}

		// Check if indicator already exists
		const indicatorPath = path.join(indicatorsPath, `${indicatorData.id}.json`);
		if (fs.existsSync(indicatorPath)) {
			res.status(409).json({
				success: false,
				error: `Indicator '${indicatorData.id}' already exists`,
			} as IndicatorResponse);
			return;
		}

		// Ensure indicators directory exists
		if (!fs.existsSync(indicatorsPath)) {
			fs.mkdirSync(indicatorsPath, { recursive: true });
		}

		// Create the indicator file
		fs.writeFileSync(indicatorPath, JSON.stringify(indicatorData, null, 2));

		// Update the indicators registry
		updateIndicatorsRegistry();

		res.status(201).json({
			success: true,
			indicator: indicatorData,
			message: `Indicator '${indicatorData.id}' created successfully`,
		} as IndicatorResponse);
	} catch (error) {
		console.error("Error creating indicator:", error);
		res.status(500).json({
			success: false,
			error: "Failed to create indicator",
		} as IndicatorResponse);
	}
}

/**
 * Update an existing indicator
 */
export function updateIndicator(req: Request, res: Response): void {
	const indicatorId = req.params.id;

	try {
		const indicatorPath = path.join(indicatorsPath, `${indicatorId}.json`);

		// Check if indicator exists
		if (!fs.existsSync(indicatorPath)) {
			res.status(404).json({
				success: false,
				error: `Indicator '${indicatorId}' not found`,
			} as IndicatorResponse);
			return;
		}

		// Read existing indicator
		const existingIndicator = JSON.parse(
			fs.readFileSync(indicatorPath, "utf8")
		);

		// Merge with updates (preserve ID)
		const updatedIndicator = {
			...existingIndicator,
			...req.body,
			id: indicatorId, // Ensure ID cannot be changed
		};

		// Validate required fields
		if (!updatedIndicator.name || !updatedIndicator.type) {
			res.status(400).json({
				success: false,
				error: "Missing required fields: name or type",
			} as IndicatorResponse);
			return;
		}

		// Write updated indicator
		fs.writeFileSync(indicatorPath, JSON.stringify(updatedIndicator, null, 2));

		// Update the indicators registry
		updateIndicatorsRegistry();

		res.json({
			success: true,
			indicator: updatedIndicator,
			message: `Indicator '${indicatorId}' updated successfully`,
		} as IndicatorResponse);
	} catch (error) {
		console.error(`Error updating indicator ${indicatorId}:`, error);
		res.status(500).json({
			success: false,
			error: "Failed to update indicator",
		} as IndicatorResponse);
	}
}

/**
 * Delete an indicator
 */
export function deleteIndicator(req: Request, res: Response): void {
	const indicatorId = req.params.id;

	try {
		const indicatorPath = path.join(indicatorsPath, `${indicatorId}.json`);

		// Check if indicator exists
		if (!fs.existsSync(indicatorPath)) {
			res.status(404).json({
				success: false,
				error: `Indicator '${indicatorId}' not found`,
			} as IndicatorResponse);
			return;
		}

		// Delete the indicator file
		fs.unlinkSync(indicatorPath);

		// Update the indicators registry
		updateIndicatorsRegistry();

		res.json({
			success: true,
			message: `Indicator '${indicatorId}' deleted successfully`,
		} as IndicatorResponse);
	} catch (error) {
		console.error(`Error deleting indicator ${indicatorId}:`, error);
		res.status(500).json({
			success: false,
			error: "Failed to delete indicator",
		} as IndicatorResponse);
	}
}

export function getStrategyIndicators(req: Request, res: Response): void {
	const strategyId = req.params.id;

	try {
		const strategyPath = path.join(
			__dirname,
			"../../db/strategies",
			`${strategyId}.json`
		);

		if (!fs.existsSync(strategyPath)) {
			res.status(404).json({
				success: false,
				error: `Strategy '${strategyId}' not found`,
			} as IndicatorResponse);
			return;
		}

		const strategyConfig = JSON.parse(fs.readFileSync(strategyPath, "utf8"));
		const indicators = strategyConfig.indicators || [];

		res.json({
			success: true,
			indicators: indicators,
		} as IndicatorResponse);
	} catch (error) {
		console.error(
			`Error getting indicators for strategy ${strategyId}:`,
			error
		);
		res.status(500).json({
			success: false,
			error: "Failed to get strategy indicators",
		} as IndicatorResponse);
	}
}

// Map of indicator calculation functions
const indicatorFunctionMap: Record<string, Function> = {
	sma: calculatedSMA,
	ema: calculatedEMA,
	rsi: calculatedRSI,
	macd: calculatedMACD,
	atr: calculatedATR,
	bollingerbands: calculatedBollingerBands,
	vwap: calculatedVWAP,
	cci: calculatedCCI,
	adx: calculatedADX,
};

/**
 * Calculate indicators dynamically based on request
 */
export function calculateIndicators(req: Request, res: Response): void {
	try {
		const { indicators, ohlcv } = req.body;
		if (!Array.isArray(indicators) || !ohlcv) {
			res
				.status(400)
				.json({ success: false, error: "Missing indicators or ohlcv data" });
			return;
		}

		const results: Record<string, any> = {};
		for (const ind of indicators) {
			const type = ind.type?.toLowerCase();
			const params = ind.params || {};
			const calcFn = indicatorFunctionMap[type];
			let result;
			try {
				let args: any[] = [];
				if (!calcFn) {
					result = { error: `Unknown indicator type: ${type}` };
				} else {
					// Dynamically build argument list based on function signature
					switch (type) {
						case "sma":
						case "ema":
						case "rsi":
							args = [ohlcv.close, params.period];
							break;
						case "macd":
							args = [
								ohlcv.close,
								params.shortPeriod,
								params.longPeriod,
								params.signalPeriod,
							];
							break;
						case "atr":
						case "cci":
						case "adx":
							args = [ohlcv, params.period];
							break;
						case "bollingerbands":
							args = [ohlcv.close, params.period, params.stdDev];
							break;
						case "vwap":
							args = [ohlcv];
							break;
						default:
							args = [];
					}
					result = calcFn(...args);
				}
			} catch (err) {
				result = { error: `Calculation error for ${type}: ${err}` };
			}
			results[type] = result;
		}
		res.json({ success: true, results });
	} catch (error) {
		res
			.status(500)
			.json({ success: false, error: "Failed to calculate indicators" });
	}
}

/**
 * Helper function to update the indicators registry
 */
function updateIndicatorsRegistry(): void {
	try {
		const registryPath = path.join(indicatorsPath, "indicators.json");
		const indicators: IndicatorConfig[] = [];

		// Read all indicator files
		const files = fs.readdirSync(indicatorsPath);
		for (const file of files) {
			if (file.endsWith(".json") && file !== "indicators.json") {
				const indicatorPath = path.join(indicatorsPath, file);
				const indicator = JSON.parse(fs.readFileSync(indicatorPath, "utf8"));
				indicators.push(indicator);
			}
		}

		// Write updated registry
		fs.writeFileSync(registryPath, JSON.stringify(indicators, null, 2));
	} catch (error) {
		console.error("Error updating indicators registry:", error);
	}
}
