#!/usr/bin/env node
/**
 * Command-line utility for validating strategy files
 *
 * Usage:
 *   node validateStrategy.js <strategy-id>
 *   node validateStrategy.js --all
 */

const path = require("path");
const fs = require("fs");
const {
	validateStrategyFile,
	validateAllStrategyFiles,
} = require("../utils/strategyValidator");

// Directory paths
const STRATEGIES_DIR = path.join(__dirname, "../strategies");

// Command line args
const args = process.argv.slice(2);

/**
 * Print validation results with formatting
 */
function printValidationResult(fileName, result) {
	console.log("\n" + "-".repeat(50));
	console.log(`Strategy: ${fileName}`);
	console.log(`Valid: ${result.valid ? "✅ YES" : "❌ NO"}`);

	if (!result.valid) {
		console.log("\nErrors:");
		console.log(result.formattedErrors || "Unknown validation error");
	}
	console.log("-".repeat(50));
}

// Validate all strategies
if (args.includes("--all")) {
	console.log("Validating all strategy files...");

	const results = validateAllStrategyFiles();

	if (results.size === 0) {
		console.log("No strategy files found.");
		process.exit(0);
	}

	// Count valid/invalid strategies
	let validCount = 0;
	let invalidCount = 0;

	// Print results for each file
	for (const [file, result] of results.entries()) {
		printValidationResult(file, result);
		if (result.valid) {
			validCount++;
		} else {
			invalidCount++;
		}
	}

	// Print summary
	console.log(
		`\nSummary: ${validCount} valid, ${invalidCount} invalid strategies.`
	);

	// Exit with error code if any invalid strategies found
	process.exit(invalidCount > 0 ? 1 : 0);
}
// Validate a specific strategy
else if (args.length > 0) {
	const strategyId = args[0];
	const filePath = path.join(STRATEGIES_DIR, `${strategyId}.json`);

	if (!fs.existsSync(filePath)) {
		console.error(`Error: Strategy file not found: ${filePath}`);
		process.exit(1);
	}

	console.log(`Validating strategy: ${strategyId}`);
	const result = validateStrategyFile(filePath);

	printValidationResult(strategyId, result);

	// Exit with error code if validation failed
	process.exit(result.valid ? 0 : 1);
}
// Show usage
else {
	console.log("Usage:");
	console.log("  node validateStrategy.js <strategy-id>");
	console.log("  node validateStrategy.js --all");
	process.exit(1);
}
