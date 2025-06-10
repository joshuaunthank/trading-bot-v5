/**
 * Strategy JSON Schema Validation Improvements
 *
 * This script iterates through all strategy files in the strategies directory,
 * validates them against the schema, and outputs a detailed report.
 * It can also attempt to fix common issues automatically.
 */

import * as fs from "fs";
import * as path from "path";
import {
	validateAllStrategyFiles,
	validateStrategyFile,
} from "../utils/strategyValidator";
import { fixAndSaveStrategy } from "../utils/strategyFixer";
import { config } from "../utils/config";
import * as strategyFileStore from "../utils/strategyFileStore";

// Directory paths
const STRATEGIES_DIR = path.join(__dirname, "../strategies");

/**
 * Run validation on all strategy files and output a report
 */
async function validateAllStrategies(autoFix: boolean = false) {
	console.log("Validating all strategy files...");

	// Initialize the strategy store
	await strategyFileStore.initializeStrategyStore();

	// Get all JSON files in the strategies directory
	const files = fs.readdirSync(STRATEGIES_DIR);
	const jsonFiles = files.filter(
		(f) => f.endsWith(".json") && f !== "strategy.schema.json"
	);

	if (jsonFiles.length === 0) {
		console.log("No strategy files found to validate");
		return {
			total: 0,
			valid: 0,
			invalid: 0,
			fixed: 0,
			details: [],
		};
	}

	// Results tracking
	const results: any[] = [];
	let validCount = 0;
	let invalidCount = 0;
	let fixedCount = 0;

	// Validate each file
	for (const file of jsonFiles) {
		const id = path.basename(file, ".json");
		const filePath = path.join(STRATEGIES_DIR, file);

		console.log(`Validating strategy: ${id}`);
		const validationResult = validateStrategyFile(filePath);

		if (validationResult.valid) {
			console.log(`  ✅ ${id} is valid`);
			validCount++;
			results.push({
				id,
				file,
				valid: true,
				errors: null,
				fixed: false,
			});
		} else {
			console.log(`  ❌ ${id} is invalid: ${validationResult.formattedErrors}`);
			invalidCount++;

			// Attempt to fix if auto-fix is enabled
			if (autoFix) {
				console.log(`  🔧 Attempting to fix ${id}...`);
				try {
					const fixResult = fixAndSaveStrategy(id);

					if (fixResult.success && fixResult.validationResult?.valid) {
						console.log(`  ✅ Successfully fixed ${id}`);
						fixedCount++;
						results.push({
							id,
							file,
							valid: false,
							errors: validationResult.formattedErrors,
							fixed: true,
							fixes: fixResult.fixes,
						});
					} else {
						console.log(`  ❌ Failed to fix ${id}: ${fixResult.errors}`);
						results.push({
							id,
							file,
							valid: false,
							errors: validationResult.formattedErrors,
							fixed: false,
							fixErrors: fixResult.errors,
						});
					}
				} catch (error) {
					console.error(`  ❌ Error fixing ${id}:`, error);
					results.push({
						id,
						file,
						valid: false,
						errors: validationResult.formattedErrors,
						fixed: false,
						fixErrors: error instanceof Error ? error.message : String(error),
					});
				}
			} else {
				results.push({
					id,
					file,
					valid: false,
					errors: validationResult.formattedErrors,
					fixed: false,
				});
			}
		}
	}

	// Output summary
	console.log("\nValidation summary:");
	console.log(`  Total strategies: ${jsonFiles.length}`);
	console.log(`  Valid: ${validCount}`);
	console.log(`  Invalid: ${invalidCount}`);
	if (autoFix) {
		console.log(`  Fixed: ${fixedCount}`);
	}

	// Write report to file
	const report = {
		timestamp: new Date().toISOString(),
		summary: {
			total: jsonFiles.length,
			valid: validCount,
			invalid: invalidCount,
			fixed: fixedCount,
		},
		results,
	};

	const reportPath = path.join(__dirname, "../logs/validation-report.json");
	try {
		// Ensure logs directory exists
		const logsDir = path.dirname(reportPath);
		if (!fs.existsSync(logsDir)) {
			fs.mkdirSync(logsDir, { recursive: true });
		}

		fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
		console.log(`\nDetailed report written to: ${reportPath}`);
	} catch (error) {
		console.error("Error writing report:", error);
	}

	return report;
}

// Run if executed directly
if (require.main === module) {
	// Check if --fix flag is provided
	const autoFix = process.argv.includes("--fix");

	validateAllStrategies(autoFix)
		.then(() => {
			process.exit(0);
		})
		.catch((error) => {
			console.error("Validation failed:", error);
			process.exit(1);
		});
}

export { validateAllStrategies };
