/**
 * Strategy File Converter
 * Converts all existing strategy files to the new JSON-based format
 */

import * as fs from "fs";
import * as path from "path";
import { getStrategyList, getStrategy } from "../utils/strategyFileUtils";
import * as strategyFileStore from "../utils/strategyFileStore";

// Path to strategies directory
const STRATEGIES_DIR = path.join(__dirname, "../strategies");

/**
 * Convert all strategies from old format to new file store
 */
async function convertStrategies() {
	try {
		console.log("Starting strategy conversion process...");

		// Get all strategies using the old method
		const strategiesList = getStrategyList();
		console.log(`Found ${strategiesList.length} strategies to convert`);

		// Initialize the strategy store
		await strategyFileStore.initializeStrategyStore();

		// Process each strategy
		let successCount = 0;
		let failureCount = 0;

		for (const strategyInfo of strategiesList) {
			try {
				console.log(`Converting strategy: ${strategyInfo.id}`);

				// Get full strategy using old method
				const result = getStrategy(strategyInfo.id);
				if (!result.strategy) {
					console.error(`  Strategy ${strategyInfo.id} not found or invalid`);
					failureCount++;
					continue;
				}

				// Check if strategy already exists in new store
				let existsInStore = false;
				try {
					await strategyFileStore.getStrategy(strategyInfo.id);
					existsInStore = true;
				} catch (e) {
					// Strategy doesn't exist in store, which is what we want
				}

				if (existsInStore) {
					console.log(
						`  Strategy ${strategyInfo.id} already exists in file store, skipping`
					);
					successCount++;
					continue;
				}

				// Ensure timestamps are set
				if (!result.strategy.created_at) {
					result.strategy.created_at = new Date().toISOString();
				}
				result.strategy.last_updated = new Date().toISOString();

				// Save to new file store
				await strategyFileStore.createStrategy(result.strategy);
				console.log(`  Successfully converted strategy: ${strategyInfo.id}`);
				successCount++;
			} catch (error) {
				console.error(`  Error converting strategy ${strategyInfo.id}:`, error);
				failureCount++;
			}
		}

		console.log("Strategy conversion complete:");
		console.log(`  Success: ${successCount}`);
		console.log(`  Failures: ${failureCount}`);

		return {
			total: strategiesList.length,
			success: successCount,
			failure: failureCount,
		};
	} catch (error) {
		console.error("Error in strategy conversion process:", error);
		throw error;
	}
}

// Run the conversion if this script is executed directly
if (require.main === module) {
	convertStrategies()
		.then((result) => {
			console.log("Conversion results:", result);
			process.exit(0);
		})
		.catch((error) => {
			console.error("Conversion failed:", error);
			process.exit(1);
		});
}

export { convertStrategies };
