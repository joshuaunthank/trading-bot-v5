/**
 * Strategy Execution API - Real indicator calculations and strategy management
 *
 * This module provides the actual connection between REST endpoints and
 * the StrategyManager for real trading bot functionality.
 */

import { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { strategyManager } from "../../utils/StrategyManager";

const strategiesPath = path.join(__dirname, "../../db/strategies");

export interface StrategyExecutionResponse {
	success: boolean;
	strategy_id?: string;
	status?: string;
	message: string;
	error?: string;
	indicators?: string[];
	signals?: number;
}

/**
 * Start a strategy with real indicator calculations
 */
export async function startStrategy(
	req: Request,
	res: Response
): Promise<void> {
	const strategyId = req.params.id;

	try {
		// Load strategy configuration from JSON file
		const strategyPath = path.join(strategiesPath, `${strategyId}.json`);

		if (!fs.existsSync(strategyPath)) {
			res.status(404).json({
				success: false,
				error: `Strategy '${strategyId}' not found`,
			} as StrategyExecutionResponse);
			return;
		}

		const strategyConfig = JSON.parse(fs.readFileSync(strategyPath, "utf8"));

		console.log(strategyConfig);

		console.log(
			`[Strategy API] Starting strategy: ${strategyConfig.name} with real indicators`
		);

		// Start strategy using the real StrategyManager with actual indicator calculations
		const startedStrategyId = await strategyManager.startStrategy(
			strategyConfig
		);

		res.json({
			success: true,
			strategy_id: startedStrategyId,
			status: "running",
			message: `Strategy '${strategyConfig.name}' started with real RSI, EMA, MACD calculations`,
			indicators: strategyConfig.indicators?.map((i: any) => i.type) || [],
			signals: strategyConfig.signals?.length || 0,
		} as StrategyExecutionResponse);
	} catch (error) {
		console.error(
			`[Strategy API] Failed to start strategy ${strategyId}:`,
			error
		);
		res.status(500).json({
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to start strategy",
		} as StrategyExecutionResponse);
	}
}

/**
 * Stop a running strategy
 */
export async function stopStrategy(req: Request, res: Response): Promise<void> {
	const strategyId = req.params.id;

	try {
		console.log(`[Strategy API] Stopping strategy: ${strategyId}`);

		await strategyManager.stopStrategy(strategyId);

		res.json({
			success: true,
			strategy_id: strategyId,
			status: "stopped",
			message: `Strategy '${strategyId}' stopped successfully`,
		} as StrategyExecutionResponse);
	} catch (error) {
		console.error(
			`[Strategy API] Failed to stop strategy ${strategyId}:`,
			error
		);
		res.status(500).json({
			success: false,
			error: error instanceof Error ? error.message : "Failed to stop strategy",
		} as StrategyExecutionResponse);
	}
}

/**
 * Pause a running strategy
 */
export async function pauseStrategy(
	req: Request,
	res: Response
): Promise<void> {
	const strategyId = req.params.id;

	try {
		console.log(`[Strategy API] Pausing strategy: ${strategyId}`);

		await strategyManager.pauseStrategy(strategyId);

		res.json({
			success: true,
			strategy_id: strategyId,
			status: "paused",
			message: `Strategy '${strategyId}' paused successfully`,
		} as StrategyExecutionResponse);
	} catch (error) {
		console.error(
			`[Strategy API] Failed to pause strategy ${strategyId}:`,
			error
		);
		res.status(500).json({
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to pause strategy",
		} as StrategyExecutionResponse);
	}
}

/**
 * Resume a paused strategy
 */
export async function resumeStrategy(
	req: Request,
	res: Response
): Promise<void> {
	const strategyId = req.params.id;

	try {
		console.log(`[Strategy API] Resuming strategy: ${strategyId}`);

		await strategyManager.resumeStrategy(strategyId);

		res.json({
			success: true,
			strategy_id: strategyId,
			status: "running",
			message: `Strategy '${strategyId}' resumed successfully`,
		} as StrategyExecutionResponse);
	} catch (error) {
		console.error(
			`[Strategy API] Failed to resume strategy ${strategyId}:`,
			error
		);
		res.status(500).json({
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to resume strategy",
		} as StrategyExecutionResponse);
	}
}

/**
 * Get the status of all running strategies
 */
export function getAllStrategyStatus(req: Request, res: Response): void {
	try {
		const statuses = strategyManager.getActiveStrategies();

		res.json({
			success: true,
			strategies: statuses,
			total: statuses.length,
			running: statuses.filter((s: any) => s.status === "running").length,
			paused: statuses.filter((s: any) => s.status === "paused").length,
			stopped: statuses.filter((s: any) => s.status === "stopped").length,
		});
	} catch (error) {
		console.error(`[Strategy API] Failed to get strategy statuses:`, error);
		res.status(500).json({
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Failed to get strategy statuses",
		});
	}
}

/**
 * Get the status of a specific strategy
 */
export function getStrategyStatus(req: Request, res: Response): void {
	const strategyId = req.params.id;

	try {
		const metrics = strategyManager.getStrategyMetrics(strategyId);

		if (!metrics || metrics.status === "idle") {
			res.status(404).json({
				success: false,
				error: `Strategy '${strategyId}' not found or not running`,
			} as StrategyExecutionResponse);
			return;
		}

		res.json({
			success: true,
			strategy_id: strategyId,
			...metrics,
		});
	} catch (error) {
		console.error(
			`[Strategy API] Failed to get strategy status ${strategyId}:`,
			error
		);
		res.status(500).json({
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Failed to get strategy status",
		} as StrategyExecutionResponse);
	}
}

/**
 * Create a new strategy
 */
export async function createStrategy(
	req: Request,
	res: Response
): Promise<void> {
	try {
		const strategyConfig = req.body;

		// Validate required fields
		if (!strategyConfig.id || !strategyConfig.name || !strategyConfig.symbol) {
			res.status(400).json({
				success: false,
				error: "Missing required fields: id, name, symbol",
			} as StrategyExecutionResponse);
			return;
		}

		// Check if strategy already exists
		const strategyPath = path.join(strategiesPath, `${strategyConfig.id}.json`);
		if (fs.existsSync(strategyPath)) {
			res.status(409).json({
				success: false,
				error: `Strategy with ID '${strategyConfig.id}' already exists`,
			} as StrategyExecutionResponse);
			return;
		}

		// Add metadata
		const newStrategy = {
			...strategyConfig,
			meta: {
				...strategyConfig.meta,
				created_at: new Date().toISOString(),
				last_updated: new Date().toISOString(),
			},
		};

		// Save strategy to file
		fs.writeFileSync(strategyPath, JSON.stringify(newStrategy, null, 2));

		// Update registry
		const registryPath = path.join(strategiesPath, "strategies.json");
		let registry = [];
		if (fs.existsSync(registryPath)) {
			registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
		}

		registry.push({
			id: newStrategy.id,
			name: newStrategy.name,
			description: newStrategy.description,
			category: newStrategy.category || "custom",
			risk_level: newStrategy.risk_level || "medium",
			complexity: newStrategy.complexity || "intermediate",
			tags: newStrategy.tags || [],
			timeframes: newStrategy.timeframes || ["1h"],
			created_at: newStrategy.meta.created_at,
			last_updated: newStrategy.meta.last_updated,
			performance: {
				backtested: false,
				win_rate: null,
				avg_return: null,
				max_drawdown: null,
			},
		});

		fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));

		console.log(`[Strategy API] Created new strategy: ${newStrategy.name}`);

		res.status(201).json({
			success: true,
			strategy_id: newStrategy.id,
			message: `Strategy '${newStrategy.name}' created successfully`,
		} as StrategyExecutionResponse);
	} catch (error) {
		console.error("[Strategy API] Failed to create strategy:", error);
		res.status(500).json({
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to create strategy",
		} as StrategyExecutionResponse);
	}
}

/**
 * Clone an existing strategy
 */
export async function cloneStrategy(
	req: Request,
	res: Response
): Promise<void> {
	const sourceStrategyId = req.params.id;
	const { newId, newName } = req.body;

	try {
		if (!newId || !newName) {
			res.status(400).json({
				success: false,
				error: "Missing required fields: newId, newName",
			} as StrategyExecutionResponse);
			return;
		}

		// Load source strategy
		const sourceStrategyPath = path.join(
			strategiesPath,
			`${sourceStrategyId}.json`
		);
		if (!fs.existsSync(sourceStrategyPath)) {
			res.status(404).json({
				success: false,
				error: `Source strategy '${sourceStrategyId}' not found`,
			} as StrategyExecutionResponse);
			return;
		}

		// Check if new strategy ID already exists
		const newStrategyPath = path.join(strategiesPath, `${newId}.json`);
		if (fs.existsSync(newStrategyPath)) {
			res.status(409).json({
				success: false,
				error: `Strategy with ID '${newId}' already exists`,
			} as StrategyExecutionResponse);
			return;
		}

		const sourceStrategy = JSON.parse(
			fs.readFileSync(sourceStrategyPath, "utf8")
		);

		// Create cloned strategy
		const clonedStrategy = {
			...sourceStrategy,
			id: newId,
			name: newName,
			description: `${sourceStrategy.description} (Cloned from ${sourceStrategy.name})`,
			meta: {
				...sourceStrategy.meta,
				created_at: new Date().toISOString(),
				last_updated: new Date().toISOString(),
				cloned_from: sourceStrategyId,
			},
		};

		// Save cloned strategy
		fs.writeFileSync(newStrategyPath, JSON.stringify(clonedStrategy, null, 2));

		console.log(
			`[Strategy API] Cloned strategy ${sourceStrategyId} as ${newId}`
		);

		res.status(201).json({
			success: true,
			strategy_id: newId,
			message: `Strategy '${newName}' cloned successfully from '${sourceStrategy.name}'`,
		} as StrategyExecutionResponse);
	} catch (error) {
		console.error(
			`[Strategy API] Failed to clone strategy ${sourceStrategyId}:`,
			error
		);
		res.status(500).json({
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to clone strategy",
		} as StrategyExecutionResponse);
	}
}

/**
 * Update an existing strategy
 */
export async function updateStrategy(
	req: Request,
	res: Response
): Promise<void> {
	const strategyId = req.params.id;

	try {
		const strategyPath = path.join(strategiesPath, `${strategyId}.json`);

		if (!fs.existsSync(strategyPath)) {
			res.status(404).json({
				success: false,
				error: `Strategy '${strategyId}' not found`,
			} as StrategyExecutionResponse);
			return;
		}

		const existingStrategy = JSON.parse(fs.readFileSync(strategyPath, "utf8"));
		const updates = req.body;

		// Merge updates with existing strategy
		const updatedStrategy = {
			...existingStrategy,
			...updates,
			id: strategyId, // Prevent ID changes
			meta: {
				...existingStrategy.meta,
				...updates.meta,
				last_updated: new Date().toISOString(),
			},
		};

		// Save updated strategy
		fs.writeFileSync(strategyPath, JSON.stringify(updatedStrategy, null, 2));

		console.log(`[Strategy API] Updated strategy: ${strategyId}`);

		res.json({
			success: true,
			strategy_id: strategyId,
			message: `Strategy '${updatedStrategy.name}' updated successfully`,
		} as StrategyExecutionResponse);
	} catch (error) {
		console.error(
			`[Strategy API] Failed to update strategy ${strategyId}:`,
			error
		);
		res.status(500).json({
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to update strategy",
		} as StrategyExecutionResponse);
	}
}

/**
 * Delete a strategy
 */
export async function deleteStrategy(
	req: Request,
	res: Response
): Promise<void> {
	const strategyId = req.params.id;

	try {
		const strategyPath = path.join(strategiesPath, `${strategyId}.json`);

		if (!fs.existsSync(strategyPath)) {
			res.status(404).json({
				success: false,
				error: `Strategy '${strategyId}' not found`,
			} as StrategyExecutionResponse);
			return;
		}

		// Check if strategy is currently running
		const metrics = strategyManager.getStrategyMetrics(strategyId);
		if (metrics && metrics.status !== "idle") {
			res.status(409).json({
				success: false,
				error: `Cannot delete strategy '${strategyId}' - it is currently running. Stop it first.`,
			} as StrategyExecutionResponse);
			return;
		}

		const strategy = JSON.parse(fs.readFileSync(strategyPath, "utf8"));

		// Delete strategy file
		fs.unlinkSync(strategyPath);

		// Update registry
		const registryPath = path.join(strategiesPath, "strategies.json");
		if (fs.existsSync(registryPath)) {
			let registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
			registry = registry.filter((s: any) => s.id !== strategyId);
			fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
		}

		console.log(`[Strategy API] Deleted strategy: ${strategyId}`);

		res.json({
			success: true,
			strategy_id: strategyId,
			message: `Strategy '${strategy.name}' deleted successfully`,
		} as StrategyExecutionResponse);
	} catch (error) {
		console.error(
			`[Strategy API] Failed to delete strategy ${strategyId}:`,
			error
		);
		res.status(500).json({
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to delete strategy",
		} as StrategyExecutionResponse);
	}
}

/**
 * Get all strategies from the registry
 */
export function getAllStrategies(req: Request, res: Response): void {
	try {
		const registryPath = path.join(strategiesPath, "strategies.json");

		if (!fs.existsSync(registryPath)) {
			res.json([]);
			return;
		}

		const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
		res.json(registry);
	} catch (error) {
		console.error("Error reading strategies registry:", error);
		res.status(500).json({
			success: false,
			error: "Failed to load strategies registry",
		});
	}
}

/**
 * Get a specific strategy by ID - returns new format directly
 */
export function getStrategyById(req: Request, res: Response): void {
	const strategyId = req.params.id;

	try {
		const strategyPath = path.join(strategiesPath, `${strategyId}.json`);

		if (!fs.existsSync(strategyPath)) {
			res.status(404).json({
				success: false,
				error: "Strategy not found",
			});
			return;
		}

		const strategy = JSON.parse(fs.readFileSync(strategyPath, "utf8"));

		// Return strategy directly in new format - no transformation
		res.json(strategy);
	} catch (error) {
		console.error(`Error reading strategy ${strategyId}:`, error);
		res.status(500).json({
			success: false,
			error: "Failed to load strategy details",
		});
	}
}
