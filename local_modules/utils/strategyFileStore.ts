/**
 * Strategy File Store - Provides CRUD operations for strategy files
 * Serves as a fallback storage mechanism for strategies
 */

import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { validateStrategy } from "./strategyValidator";
import { fixStrategyIssues } from "./strategyFixer";
import { config } from "./config";

// Check if strategy store is enabled
const isEnabled = config.strategyStoreEnabled;

// Convert callback-based fs functions to Promise-based
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);

// Path to strategies directory
const STRATEGIES_DIR = path.join(__dirname, "../strategies");

/**
 * Initialize the strategies directory if it doesn't exist
 */
export async function initializeStrategyStore(): Promise<void> {
	if (!isEnabled) {
		console.log("Strategy file store is disabled");
		return;
	}

	try {
		// Check if strategies directory exists
		try {
			await stat(STRATEGIES_DIR);
		} catch (err) {
			// Create directory if it doesn't exist
			await mkdir(STRATEGIES_DIR, { recursive: true });
			console.log(`Created strategies directory at ${STRATEGIES_DIR}`);
		}

		// Check if backup directory exists (if enabled)
		if (config.strategyStoreBackupEnabled) {
			const backupDir = path.join(
				STRATEGIES_DIR,
				config.strategyStoreBackupDir
			);
			try {
				await stat(backupDir);
			} catch (err) {
				await mkdir(backupDir, { recursive: true });
				console.log(`Created strategy backup directory at ${backupDir}`);
			}
		}
	} catch (error) {
		console.error(
			`Failed to initialize strategy store: ${
				error instanceof Error ? error.message : String(error)
			}`
		);
		throw error;
	}
}

/**
 * Get a list of all strategy files
 */
export async function listStrategies(): Promise<string[]> {
	if (!isEnabled) {
		return [];
	}

	try {
		await initializeStrategyStore();

		const files = await readdir(STRATEGIES_DIR);
		return files
			.filter(
				(file) => file.endsWith(".json") && file !== "strategy.schema.json"
			)
			.map((file) => path.basename(file, ".json"));
	} catch (error) {
		console.error(
			`Failed to list strategies: ${
				error instanceof Error ? error.message : String(error)
			}`
		);
		throw error;
	}
}

/**
 * Get a strategy by its ID
 */
export async function getStrategy(id: string): Promise<any> {
	if (!isEnabled) {
		throw new Error("Strategy file store is disabled");
	}

	try {
		const filePath = path.join(STRATEGIES_DIR, `${id}.json`);
		const data = await readFile(filePath, "utf8");
		return JSON.parse(data);
	} catch (error) {
		console.error(
			`Failed to get strategy ${id}: ${
				error instanceof Error ? error.message : String(error)
			}`
		);
		throw error;
	}
}

/**
 * Create a new strategy file
 */
export async function createStrategy(strategy: any): Promise<boolean> {
	if (!isEnabled) {
		throw new Error("Strategy file store is disabled");
	}

	try {
		// Ensure strategy has required fields
		if (!strategy.id) {
			throw new Error("Strategy must have an ID");
		}

		// Validate strategy
		const validation = validateStrategy(strategy);
		if (!validation.valid) {
			if (config.strategyAutoFix) {
				console.log(`Attempting to fix invalid strategy ${strategy.id}...`);
				const { strategy: fixedStrategy } = fixStrategyIssues(strategy);
				strategy = fixedStrategy;
			} else {
				throw new Error(`Invalid strategy: ${validation.formattedErrors}`);
			}
		}

		// Add timestamp if not present
		if (!strategy.created_at) {
			strategy.created_at = new Date().toISOString();
		}
		strategy.last_updated = new Date().toISOString();

		// Write the file atomically
		const filePath = path.join(STRATEGIES_DIR, `${strategy.id}.json`);
		const tempFilePath = `${filePath}.tmp`;

		await writeFile(tempFilePath, JSON.stringify(strategy, null, 2), "utf8");

		// Check if file system supports atomic renames
		try {
			fs.renameSync(tempFilePath, filePath);
		} catch (err) {
			// Fallback to non-atomic write
			await writeFile(filePath, JSON.stringify(strategy, null, 2), "utf8");
			try {
				fs.unlinkSync(tempFilePath);
			} catch (e) {} // Cleanup temp file
		}

		return true;
	} catch (error) {
		console.error(
			`Failed to create strategy: ${
				error instanceof Error ? error.message : String(error)
			}`
		);
		throw error;
	}
}

/**
 * Update an existing strategy
 */
export async function updateStrategy(
	id: string,
	strategy: any
): Promise<boolean> {
	if (!isEnabled) {
		throw new Error("Strategy file store is disabled");
	}

	try {
		// Ensure the ID in the strategy object matches the requested ID
		if (strategy.id !== id) {
			throw new Error(`Strategy ID mismatch: ${strategy.id} vs ${id}`);
		}

		// Check if strategy exists
		const filePath = path.join(STRATEGIES_DIR, `${id}.json`);
		try {
			await stat(filePath);
		} catch (err) {
			throw new Error(`Strategy ${id} not found`);
		}

		// Validate strategy
		const validation = validateStrategy(strategy);
		if (!validation.valid) {
			if (config.strategyAutoFix) {
				console.log(`Attempting to fix invalid strategy ${id}...`);
				const { strategy: fixedStrategy } = fixStrategyIssues(strategy);
				strategy = fixedStrategy;
			} else {
				throw new Error(`Invalid strategy: ${validation.formattedErrors}`);
			}
		}

		// Update timestamp
		strategy.last_updated = new Date().toISOString();

		// Write the file atomically
		const tempFilePath = `${filePath}.tmp`;

		await writeFile(tempFilePath, JSON.stringify(strategy, null, 2), "utf8");

		// Check if file system supports atomic renames
		try {
			fs.renameSync(tempFilePath, filePath);
		} catch (err) {
			// Fallback to non-atomic write
			await writeFile(filePath, JSON.stringify(strategy, null, 2), "utf8");
			try {
				fs.unlinkSync(tempFilePath);
			} catch (e) {} // Cleanup temp file
		}

		return true;
	} catch (error) {
		console.error(
			`Failed to update strategy ${id}: ${
				error instanceof Error ? error.message : String(error)
			}`
		);
		throw error;
	}
}

/**
 * Delete a strategy
 */
export async function deleteStrategy(id: string): Promise<boolean> {
	if (!isEnabled) {
		throw new Error("Strategy file store is disabled");
	}

	try {
		const filePath = path.join(STRATEGIES_DIR, `${id}.json`);

		// Check if file exists first
		try {
			await stat(filePath);
		} catch (err) {
			throw new Error(`Strategy ${id} not found`);
		}

		// Create a backup before deletion if backup is enabled
		if (config.strategyStoreBackupEnabled) {
			const backupDir = path.join(
				STRATEGIES_DIR,
				config.strategyStoreBackupDir
			);
			try {
				await stat(backupDir);
			} catch (err) {
				await mkdir(backupDir, { recursive: true });
			}

			const backupPath = path.join(backupDir, `${id}_${Date.now()}.json`);
			await fs.promises.copyFile(filePath, backupPath);
			console.log(`Created backup of strategy ${id} at ${backupPath}`);
		}

		// Delete the file
		await fs.promises.unlink(filePath);
		console.log(`Deleted strategy ${id}`);

		return true;
	} catch (error) {
		console.error(
			`Failed to delete strategy ${id}: ${
				error instanceof Error ? error.message : String(error)
			}`
		);
		throw error;
	}
}

/**
 * Import a strategy from a JSON file
 */
export async function importStrategyFromFile(filePath: string): Promise<any> {
	if (!isEnabled) {
		throw new Error("Strategy file store is disabled");
	}

	try {
		// Read and parse the file
		const data = await readFile(filePath, "utf8");
		const strategy = JSON.parse(data);

		// Validate the strategy
		const validation = validateStrategy(strategy);
		if (!validation.valid) {
			if (config.strategyAutoFix) {
				console.log(`Attempting to fix invalid imported strategy...`);
				const { strategy: fixedStrategy } = fixStrategyIssues(strategy);
				return fixedStrategy;
			} else {
				throw new Error(`Invalid strategy: ${validation.formattedErrors}`);
			}
		}

		return strategy;
	} catch (error) {
		console.error(
			`Failed to import strategy: ${
				error instanceof Error ? error.message : String(error)
			}`
		);
		throw error;
	}
}

/**
 * Export a strategy to a JSON file
 */
export async function exportStrategyToFile(
	id: string,
	outputPath: string
): Promise<boolean> {
	if (!isEnabled) {
		throw new Error("Strategy file store is disabled");
	}

	try {
		// Get the strategy
		const strategy = await getStrategy(id);

		// Write to the output file
		await writeFile(outputPath, JSON.stringify(strategy, null, 2), "utf8");

		return true;
	} catch (error) {
		console.error(
			`Failed to export strategy ${id}: ${
				error instanceof Error ? error.message : String(error)
			}`
		);
		throw error;
	}
}
