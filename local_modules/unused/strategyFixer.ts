/**
 * Utility functions to help fix common issues in strategy files
 */
import * as fs from "fs";
import * as path from "path";
import { Strategy } from "../types/strategy";
import { validateStrategy } from "./strategyValidator";
import { saveStrategy } from "./strategyFileUtils";

/**
 * Fixes common issues in a strategy object
 * @param strategy - The strategy to fix
 * @returns Fixed strategy object and list of fixes applied
 */
export function fixStrategyIssues(strategy: any): {
	strategy: Strategy;
	fixes: string[];
	fixed: boolean;
} {
	const fixes: string[] = [];
	let fixed = false;

	// Clone the strategy to avoid modifying the original
	const fixedStrategy = JSON.parse(JSON.stringify(strategy));

	// Fix missing ID
	if (!fixedStrategy.id && fixedStrategy.name) {
		fixedStrategy.id = fixedStrategy.name.toLowerCase().replace(/\s+/g, "_");
		fixes.push(`Added missing ID: ${fixedStrategy.id}`);
		fixed = true;
	}

	// Fix missing timestamps
	if (!fixedStrategy.created_at) {
		fixedStrategy.created_at = new Date().toISOString();
		fixes.push("Added missing created_at timestamp");
		fixed = true;
	}

	// Update last_updated
	fixedStrategy.last_updated = new Date().toISOString();
	fixes.push("Updated last_updated timestamp");
	fixed = true;

	// Ensure enabled flag is set
	if (fixedStrategy.enabled === undefined) {
		fixedStrategy.enabled = true;
		fixes.push("Set missing enabled flag to true");
		fixed = true;
	}

	// Ensure tags is an array
	if (!Array.isArray(fixedStrategy.tags)) {
		fixedStrategy.tags = fixedStrategy.tags ? [String(fixedStrategy.tags)] : [];
		fixes.push("Fixed tags format (converted to array)");
		fixed = true;
	}

	// Fix indicators array
	if (!Array.isArray(fixedStrategy.indicators)) {
		fixedStrategy.indicators = [];
		fixes.push("Created empty indicators array");
		fixed = true;
	} else {
		// Fix individual indicators
		fixedStrategy.indicators.forEach((indicator: any, index: number) => {
			if (!indicator.enabled) {
				indicator.enabled = true;
				fixes.push(
					`Set indicator ${indicator.id || index} enabled flag to true`
				);
				fixed = true;
			}

			if (!indicator.output_fields) {
				indicator.output_fields = [indicator.id || `output_${index}`];
				fixes.push(
					`Added missing output_fields for indicator ${indicator.id || index}`
				);
				fixed = true;
			}
		});
	}

	// Fix models array
	if (!Array.isArray(fixedStrategy.models)) {
		fixedStrategy.models = [];
		fixes.push("Created empty models array");
		fixed = true;
	} else {
		// Fix individual models
		fixedStrategy.models.forEach((model: any, index: number) => {
			if (!model.enabled) {
				model.enabled = true;
				fixes.push(`Set model ${model.id || index} enabled flag to true`);
				fixed = true;
			}

			if (!model.input_fields) {
				model.input_fields = [];
				fixes.push(
					`Added empty input_fields array for model ${model.id || index}`
				);
				fixed = true;
			}

			if (!model.subtype) {
				model.subtype = "default";
				fixes.push(`Added default subtype for model ${model.id || index}`);
				fixed = true;
			}
		});
	}

	// Fix signals array
	if (!Array.isArray(fixedStrategy.signals)) {
		fixedStrategy.signals = [];
		fixes.push("Created empty signals array");
		fixed = true;
	}

	// Add risk object if missing
	if (!fixedStrategy.risk) {
		fixedStrategy.risk = {
			position_size_type: "percentage",
			risk_per_trade: 1.0,
			stop_loss_percent: 5.0,
			take_profit_percent: 10.0,
			trailing_stop: false,
			max_drawdown_percent: 20.0,
		};
		fixes.push("Added default risk configuration");
		fixed = true;
	}

	return { strategy: fixedStrategy as Strategy, fixes, fixed };
}

/**
 * Attempts to fix and save a strategy file
 * @param strategyId - ID of the strategy to fix
 * @returns Result of the fix operation
 */
export function fixAndSaveStrategy(strategyId: string): {
	success: boolean;
	fixes?: string[];
	validationResult?: {
		valid: boolean;
		errors: any[] | null;
		formattedErrors?: string;
	};
	errors?: string;
} {
	try {
		// Read the strategy file
		const filePath = path.join(
			__dirname,
			"../strategies",
			`${strategyId}.json`
		);

		if (!fs.existsSync(filePath)) {
			return {
				success: false,
				errors: `Strategy file not found: ${strategyId}.json`,
			};
		}

		// Parse the strategy
		const content = fs.readFileSync(filePath, "utf8");
		const strategy = JSON.parse(content);

		// Try to fix issues
		const {
			strategy: fixedStrategy,
			fixes,
			fixed,
		} = fixStrategyIssues(strategy);

		if (!fixed) {
			return { success: false, errors: "No fixable issues found" };
		}

		// Validate the fixed strategy
		const validationResult = validateStrategy(fixedStrategy);

		// Save the fixed strategy
		const saveResult = saveStrategy(fixedStrategy);

		if (!saveResult.success) {
			return {
				success: false,
				fixes,
				validationResult,
				errors: `Failed to save fixed strategy: ${saveResult.errors}`,
			};
		}

		return {
			success: true,
			fixes,
			validationResult,
		};
	} catch (err) {
		return {
			success: false,
			errors: `Error fixing strategy: ${
				err instanceof Error ? err.message : String(err)
			}`,
		};
	}
}
