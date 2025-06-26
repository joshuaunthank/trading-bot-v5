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

const indicatorsPath = path.join(__dirname, "../../db/indicators");

export interface IndicatorResponse {
	success: boolean;
	indicators?: any[];
	indicator?: any;
	error?: string;
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
