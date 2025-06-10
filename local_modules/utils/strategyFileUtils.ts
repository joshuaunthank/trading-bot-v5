/**
 * Utility functions for JSON file-based strategy operations
 */
import * as fs from "fs";
import * as path from "path";
import { Strategy } from "../types/strategy";
import { addStrategyResult } from "./strategyWebsocket";
import { validateStrategyFile, validateStrategy } from "./strategyValidator";
import { fixStrategyIssues } from "./strategyFixer";
import { config } from "./config";

const STRATEGIES_DIR = path.join(__dirname, "../strategies");

/**
 * Ensure strategies directory exists
 */
export const ensureStrategiesDir = (): void => {
	if (!fs.existsSync(STRATEGIES_DIR)) {
		fs.mkdirSync(STRATEGIES_DIR, { recursive: true });
	}
};

/**
 * Get list of available strategies
 */
export const getStrategyList = (): {
	id: string;
	name: string;
	description: string;
	valid: boolean;
	errors?: string;
}[] => {
	ensureStrategiesDir();

	const files = fs.readdirSync(STRATEGIES_DIR);
	const jsonFiles = files.filter(
		(f) => f.endsWith(".json") && f !== "strategy.schema.json"
	);

	return jsonFiles.map((file) => {
		try {
			const filePath = path.join(STRATEGIES_DIR, file);
			const content = fs.readFileSync(filePath, "utf8");
			const strategy = JSON.parse(content);

			// Validate the strategy file
			const validationResult = validateStrategyFile(filePath);

			return {
				id: strategy.id || file.replace(/\.json$/, ""),
				name: strategy.name || file.replace(/\.json$/, ""),
				description: strategy.description || "",
				valid: validationResult.valid,
				errors: validationResult.valid
					? undefined
					: validationResult.formattedErrors,
			};
		} catch (err) {
			console.error(`Error reading strategy file ${file}:`, err);
			return {
				id: file.replace(/\.json$/, ""),
				name: file.replace(/\.json$/, ""),
				description: "Error: Invalid JSON format",
				valid: false,
				errors: `Error parsing JSON: ${
					err instanceof Error ? err.message : String(err)
				}`,
			};
		}
	});
};

/**
 * Get a strategy by ID
 */
export const getStrategy = (
	id: string
): { strategy: Strategy | null; isValid: boolean; errors?: string } => {
	try {
		const filePath = path.join(STRATEGIES_DIR, `${id}.json`);

		if (!fs.existsSync(filePath)) {
			return {
				strategy: null,
				isValid: false,
				errors: "Strategy file not found",
			};
		}

		const content = fs.readFileSync(filePath, "utf8");
		const strategy = JSON.parse(content);

		// Validate the strategy
		const validationResult = validateStrategyFile(filePath);

		return {
			strategy: strategy,
			isValid: validationResult.valid,
			errors: validationResult.valid
				? undefined
				: validationResult.formattedErrors,
		};
	} catch (err) {
		console.error(`Error reading strategy ${id}:`, err);
		return {
			strategy: null,
			isValid: false,
			errors: `Error reading strategy: ${
				err instanceof Error ? err.message : String(err)
			}`,
		};
	}
};

/**
 * Save a strategy to file
 */
export const saveStrategy = (
	strategy: Strategy
): { success: boolean; errors?: string } => {
	try {
		ensureStrategiesDir();

		// Make sure strategy has an ID
		if (!strategy.id) {
			return { success: false, errors: "Strategy must have an ID" };
		}

		// Add timestamps
		const now = new Date().toISOString();
		if (!strategy.created_at) {
			strategy.created_at = now;
		}
		strategy.last_updated = now;

		// Validate the strategy before saving
		const validationResult = validateStrategy(strategy);
		if (!validationResult.valid) {
			// If auto-fix is enabled, try to fix the strategy
			if (config.strategyAutoFix) {
				const { strategy: fixedStrategy, fixed } = fixStrategyIssues(strategy);

				if (fixed) {
					const fixedValidationResult = validateStrategy(fixedStrategy);
					if (fixedValidationResult.valid) {
						// Use the fixed strategy
						strategy = fixedStrategy;
					} else {
						return {
							success: false,
							errors: `Failed to auto-fix strategy: ${
								fixedValidationResult.formattedErrors ||
								"Unknown validation error"
							}`,
						};
					}
				} else {
					return {
						success: false,
						errors:
							validationResult.formattedErrors || "Invalid strategy format",
					};
				}
			} else {
				return {
					success: false,
					errors: validationResult.formattedErrors || "Invalid strategy format",
				};
			}
		}

		// Use atomic write to ensure file integrity
		const filePath = path.join(STRATEGIES_DIR, `${strategy.id}.json`);
		const tempPath = `${filePath}.tmp`;

		// Write to temp file first
		fs.writeFileSync(tempPath, JSON.stringify(strategy, null, 2));

		// Rename temp file to actual file (atomic operation)
		fs.renameSync(tempPath, filePath);

		return { success: true };
	} catch (err) {
		console.error("Error saving strategy:", err);
		return {
			success: false,
			errors: `Error saving strategy: ${
				err instanceof Error ? err.message : String(err)
			}`,
		};
	}
};

/**
 * Delete a strategy by ID
 */
export const deleteStrategy = (
	id: string
): { success: boolean; errors?: string } => {
	try {
		const filePath = path.join(STRATEGIES_DIR, `${id}.json`);

		if (!fs.existsSync(filePath)) {
			return { success: false, errors: `Strategy ${id} not found` };
		}

		fs.unlinkSync(filePath);
		return { success: true };
	} catch (err) {
		console.error(`Error deleting strategy ${id}:`, err);
		return {
			success: false,
			errors: `Error deleting strategy: ${
				err instanceof Error ? err.message : String(err)
			}`,
		};
	}
};

/**
 * Clone a strategy with a new name
 */
export const cloneStrategy = (
	id: string,
	newName: string
): { success: boolean; strategy?: Strategy; errors?: string } => {
	try {
		const strategyResult = getStrategy(id);

		if (!strategyResult.strategy) {
			return {
				success: false,
				errors: strategyResult.errors || `Strategy ${id} not found`,
			};
		}

		// Create new strategy based on original
		const newId = newName.toLowerCase().replace(/\s+/g, "_");
		const clonedStrategy: Strategy = {
			...strategyResult.strategy,
			id: newId,
			name: newName,
			created_at: new Date().toISOString(),
			last_updated: new Date().toISOString(),
		};

		// Save the cloned strategy
		const saveResult = saveStrategy(clonedStrategy);
		if (!saveResult.success) {
			return { success: false, errors: saveResult.errors };
		}

		return { success: true, strategy: clonedStrategy };
	} catch (err) {
		console.error(`Error cloning strategy ${id}:`, err);
		return {
			success: false,
			errors: `Error cloning strategy: ${
				err instanceof Error ? err.message : String(err)
			}`,
		};
	}
};

/**
 * Run a strategy (simulate execution based on JSON config)
 */
export const runStrategy = async (
	id: string,
	params: any = {}
): Promise<{ success: boolean; errors?: string }> => {
	try {
		const strategyResult = getStrategy(id);

		if (!strategyResult.strategy) {
			return {
				success: false,
				errors: strategyResult.errors || `Strategy ${id} not found`,
			};
		}

		// Check if strategy is valid
		if (!strategyResult.isValid) {
			return {
				success: false,
				errors: `Cannot run invalid strategy: ${
					strategyResult.errors || "Unknown validation error"
				}`,
			};
		}

		console.log(`Running strategy ${id} with params:`, params);

		// Simulate strategy execution with a simple result
		const now = Date.now();
		const result = {
			timestamp: now,
			strategy: id,
			indicators: {
				rsi_14: [30, 35, 40, 45],
				macd_histogram: [-0.1, -0.05, 0.0, 0.05],
			},
			models: {
				forecast_return: [0.02, 0.03, 0.035, 0.04],
			},
			postprocessing: {},
			signals: {
				entry_long: true,
				exit_short: false,
			},
		};

		// Add result to WebSocket cache
		addStrategyResult(id, result);

		return { success: true };
	} catch (err) {
		console.error(`Error running strategy ${id}:`, err);
		return {
			success: false,
			errors: `Error running strategy: ${
				err instanceof Error ? err.message : String(err)
			}`,
		};
	}
};
