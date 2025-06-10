import * as express from "express";
import * as path from "path";
import * as fs from "fs";
import {
	getStrategyList,
	getStrategy,
	saveStrategy as saveStrategyToFile,
	deleteStrategy as deleteStrategyFile,
	runStrategy,
	cloneStrategy,
} from "../../utils/strategyFileUtils";
import { validateAllStrategyFiles } from "../../utils/strategyValidator";
import { fixAndSaveStrategy } from "../../utils/strategyFixer";
import * as strategyFileStore from "../../utils/strategyFileStore";

const strategyRoutes = (api: any) => {
	const strategies = express.Router();
	const strategiesDir = path.join(__dirname, "../../strategies");

	// Initialize strategy store when routes are set up
	strategyFileStore.initializeStrategyStore().catch((err) => {
		console.error("Failed to initialize strategy store:", err);
	});

	// List all JSON strategies
	strategies.get("/strategies", async (req, res) => {
		try {
			// Use both the old method and new file store to ensure backward compatibility
			const oldStrategiesList = getStrategyList();

			// Get strategies from file store
			let fileStoreStrategies: any[] = [];
			try {
				const strategyIds = await strategyFileStore.listStrategies();
				fileStoreStrategies = await Promise.all(
					strategyIds.map(async (id) => {
						try {
							return await strategyFileStore.getStrategy(id);
						} catch (e) {
							console.warn(`Error loading strategy ${id} from file store:`, e);
							return null;
						}
					})
				);
				fileStoreStrategies = fileStoreStrategies.filter(Boolean);
			} catch (e) {
				console.warn("Error listing strategies from file store:", e);
			}

			// Merge results, preferring file store versions
			const fileStoreStrategyIds = fileStoreStrategies.map((s) => s.id);
			const filteredOldStrategies = oldStrategiesList.filter(
				(s) => !fileStoreStrategyIds.includes(s.id)
			);

			const combinedStrategies = [
				...fileStoreStrategies,
				...filteredOldStrategies,
			];

			res.json(combinedStrategies);
		} catch (err) {
			console.error("Error listing strategies:", err);
			res.status(500).json({ error: "Failed to list strategies" });
		}
	});

	// Validate all strategies
	strategies.get("/strategies/validate/all", (req, res) => {
		try {
			const validationResults = validateAllStrategyFiles();

			// Convert Map to array of objects with filenames
			const results = Array.from(validationResults.entries()).map(
				([filename, result]) => ({
					filename,
					valid: result.valid,
					errors: result.valid ? null : result.formattedErrors,
				})
			);

			// Count valid and invalid strategies
			const validCount = results.filter((r) => r.valid).length;
			const invalidCount = results.filter((r) => !r.valid).length;

			res.json({
				summary: {
					total: results.length,
					valid: validCount,
					invalid: invalidCount,
				},
				results,
			});
		} catch (err) {
			console.error("Error validating strategies:", err);
			res.status(500).json({
				error: "Failed to validate strategies",
				details: err instanceof Error ? err.message : String(err),
			});
		}
	});

	// Create a new JSON strategy
	strategies.post("/strategies", (req, res) => {
		const strategy = req.body;

		if (!strategy || !strategy.name) {
			res.status(400).json({ error: "Missing required strategy data" });
			return;
		}

		// Generate ID if not provided
		if (!strategy.id) {
			strategy.id = strategy.name.toLowerCase().replace(/\s+/g, "_");
		}

		// Check if strategy already exists
		const existingStrategyResult = getStrategy(strategy.id);
		if (existingStrategyResult.strategy) {
			res.status(409).json({ error: "Strategy already exists" });
			return;
		}

		try {
			const saveResult = saveStrategyToFile(strategy);
			if (saveResult.success) {
				res.status(201).json({
					message: "Strategy created",
					strategy,
				});
			} else {
				res.status(400).json({
					error: "Failed to create strategy",
					details: saveResult.errors,
				});
			}
		} catch (err) {
			console.error("Error creating strategy:", err);
			res.status(500).json({ error: "Failed to create strategy" });
		}
	});

	// Get full strategy JSON
	strategies.get("/strategies/:id", (req, res) => {
		const { id } = req.params;
		const result = getStrategy(id);

		if (!result.strategy) {
			res.status(404).json({ error: "Strategy not found" });
			return;
		}

		if (!result.isValid) {
			res.status(422).json({
				error: "Strategy validation failed",
				details: result.errors,
				strategy: result.strategy,
			});
			return;
		}

		res.json({ strategy: result.strategy });
	});

	// Run a JSON strategy (simulate DB-driven execution)
	strategies.post("/strategies/:id/run", async (req, res) => {
		const { id } = req.params;
		const result = getStrategy(id);

		if (!result.strategy) {
			res.status(404).json({ error: "Strategy not found" });
			return;
		}

		if (!result.isValid) {
			res.status(422).json({
				error: "Cannot run invalid strategy",
				details: result.errors,
			});
			return;
		}

		try {
			// Run the strategy with the provided parameters
			const runResult = await runStrategy(id, req.body);

			if (runResult.success) {
				res.json({
					result: {
						strategy: id,
						status: "running",
						message:
							"Strategy execution started. Results will be streamed via WebSocket.",
					},
				});
			} else {
				res.status(400).json({
					error: "Failed to run strategy",
					details: runResult.errors,
				});
			}
		} catch (err) {
			console.error(`Error running strategy ${id}:`, err);
			res.status(500).json({
				error: "Internal server error while running strategy",
				details: err instanceof Error ? err.message : String(err),
			});
		}
	});

	// Get config schema for a JSON strategy
	strategies.get("/strategies/:id/config", (req, res) => {
		const { id } = req.params;
		const strategyResult = getStrategy(id);

		if (!strategyResult.strategy) {
			res.status(404).json({
				error: "Strategy not found",
				details: strategyResult.errors,
			});
			return;
		}

		res.json({
			schema: strategyResult.strategy,
			name: strategyResult.strategy.name,
			description: strategyResult.strategy.description,
		});
	});

	// Save or update existing strategy
	strategies.put("/strategies/:id", async (req, res) => {
		const { id } = req.params;
		const updatedStrategy = req.body;

		// Make sure IDs match
		if (updatedStrategy.id && updatedStrategy.id !== id) {
			res.status(400).json({ error: "Strategy ID in body does not match URL" });
			return;
		}

		// Ensure ID is set
		updatedStrategy.id = id;

		// Check if strategy exists
		const existingStrategyResult = getStrategy(id);
		if (!existingStrategyResult.strategy) {
			res.status(404).json({
				error: "Strategy not found",
				details: existingStrategyResult.errors,
			});
			return;
		}

		try {
			const saveResult = saveStrategyToFile(updatedStrategy);
			if (saveResult.success) {
				res.json({
					message: "Strategy updated successfully",
					strategy: updatedStrategy,
				});
			} else {
				res.status(400).json({
					error: "Failed to update strategy",
					details: saveResult.errors,
				});
			}
		} catch (err) {
			console.error("Error updating strategy:", err);
			res.status(500).json({
				error: "Failed to update strategy",
				details: err instanceof Error ? err.message : String(err),
			});
		}
	});

	// Delete a strategy
	strategies.delete("/strategies/:id", async (req, res) => {
		const { id } = req.params;

		const deleteResult = deleteStrategyFile(id);
		if (deleteResult.success) {
			res.json({ message: "Strategy deleted successfully" });
		} else {
			res.status(404).json({
				error: "Strategy not found or could not be deleted",
				details: deleteResult.errors,
			});
		}
	});

	// Update strategy config
	strategies.put("/strategies/:id/config", async (req, res) => {
		const { id } = req.params;
		const updatedConfig = req.body;

		// Check if strategy exists
		const existingStrategyResult = getStrategy(id);
		if (!existingStrategyResult.strategy) {
			res.status(404).json({
				error: "Strategy not found",
				details: existingStrategyResult.errors,
			});
			return;
		}

		// Update the strategy with new config
		const updatedStrategy = {
			...existingStrategyResult.strategy,
			...updatedConfig,
			id, // Ensure ID doesn't change
		};

		try {
			const saveResult = saveStrategyToFile(updatedStrategy);
			if (saveResult.success) {
				res.json({
					message: "Config updated successfully",
					strategy: updatedStrategy,
				});
			} else {
				res.status(400).json({
					error: "Failed to update config",
					details: saveResult.errors,
				});
			}
		} catch (err) {
			console.error("Error updating config:", err);
			res.status(500).json({
				error: "Failed to update config",
				details: err instanceof Error ? err.message : String(err),
			});
		}
	});

	// Stop a running strategy
	strategies.post("/strategies/:id/stop", async (req, res) => {
		const { id } = req.params;

		// Check if strategy exists
		const strategyResult = getStrategy(id);
		if (!strategyResult.strategy) {
			res.status(404).json({
				error: "Strategy not found",
				details: strategyResult.errors,
			});
			return;
		}

		// In a real implementation, this would stop the strategy execution
		// For this demo, we'll just return success
		res.json({
			result: {
				strategy: id,
				message: "Strategy execution stopped successfully.",
			},
		});
	});

	// Clone a strategy
	strategies.post("/strategies/:id/clone", (req, res) => {
		const { id } = req.params;
		const { newName } = req.body;

		if (!newName) {
			res.status(400).json({ error: "New strategy name is required" });
			return;
		}

		try {
			const cloneResult = cloneStrategy(id, newName);

			if (cloneResult.success) {
				res.status(201).json({
					message: "Strategy cloned successfully",
					strategy: cloneResult.strategy,
				});
			} else {
				res.status(400).json({
					error: "Failed to clone strategy",
					details: cloneResult.errors,
				});
			}
		} catch (err) {
			console.error(`Error cloning strategy ${id}:`, err);
			res.status(500).json({
				error: "Failed to clone strategy",
				details: err instanceof Error ? err.message : String(err),
			});
		}
	});

	// Test validation of a specific strategy
	strategies.get("/strategies/:id/validate", (req, res) => {
		const { id } = req.params;

		try {
			const filePath = path.join(strategiesDir, `${id}.json`);

			if (!fs.existsSync(filePath)) {
				res.status(404).json({ error: "Strategy file not found" });
				return;
			}

			// Import here to avoid circular dependencies
			const { validateStrategyFile } = require("../../utils/strategyValidator");
			const validationResult = validateStrategyFile(filePath);

			if (validationResult.valid) {
				res.json({
					id,
					valid: true,
					message: "Strategy validation passed",
				});
			} else {
				res.status(422).json({
					id,
					valid: false,
					errors: validationResult.formattedErrors,
				});
			}
		} catch (err) {
			console.error(`Error validating strategy ${id}:`, err);
			res.status(500).json({
				error: "Failed to validate strategy",
				details: err instanceof Error ? err.message : String(err),
			});
		}
	});

	// Attempt to fix a strategy with validation issues
	strategies.post("/strategies/:id/fix", (req, res) => {
		const { id } = req.params;

		try {
			const fixResult = fixAndSaveStrategy(id);

			if (fixResult.success) {
				res.json({
					message: "Strategy fixed successfully",
					fixes: fixResult.fixes,
					validation: fixResult.validationResult?.valid
						? "Strategy is now valid"
						: "Strategy still has validation issues",
				});
			} else {
				res.status(400).json({
					error: "Failed to fix strategy",
					details: fixResult.errors,
					fixes: fixResult.fixes,
				});
			}
		} catch (err) {
			console.error(`Error fixing strategy ${id}:`, err);
			res.status(500).json({
				error: "Failed to fix strategy",
				details: err instanceof Error ? err.message : String(err),
			});
		}
	});

	api.use("/", strategies);
};

export default strategyRoutes;
