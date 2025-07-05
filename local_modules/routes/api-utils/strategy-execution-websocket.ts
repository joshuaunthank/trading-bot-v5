/**
 * Strategy Execution API - WebSocket-Only Architecture
 *
 * This module provides file-based strategy CRUD operations without
 * legacy StrategyManager dependencies. Strategy execution happens
 * through the WebSocket system only.
 */

import { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";

const strategiesPath = path.join(__dirname, "../../db/strategies");

export interface StrategyExecutionResponse {
	success: boolean;
	strategy_id?: string;
	status?: string;
	message: string;
	error?: string;
}

/**
 * Start Strategy - WebSocket-Only Version
 * Returns success but actual execution happens through WebSocket system
 */
export const startStrategy = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { id: strategy_id } = req.params; // Extract 'id' parameter as 'strategy_id'
		const strategyPath = path.join(strategiesPath, `${strategy_id}.json`);

		if (!fs.existsSync(strategyPath)) {
			res.status(404).json({
				success: false,
				error: "Strategy not found",
				message: `Strategy with ID '${strategy_id}' does not exist`,
			});
			return;
		}

		// In WebSocket-only architecture, strategy execution is handled by the WebSocket system
		// This endpoint acknowledges the start request but actual execution is elsewhere
		res.status(200).json({
			success: true,
			strategy_id,
			status: "acknowledged",
			message: `Strategy '${strategy_id}' start request acknowledged. Execution handled by WebSocket system.`,
		});
	} catch (error: any) {
		res.status(500).json({
			success: false,
			error: error.message,
			message: "Failed to start strategy",
		});
	}
};

/**
 * Stop Strategy - WebSocket-Only Version
 */
export const stopStrategy = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { id: strategy_id } = req.params; // Extract 'id' parameter as 'strategy_id'

		res.status(200).json({
			success: true,
			strategy_id,
			status: "acknowledged",
			message: `Strategy '${strategy_id}' stop request acknowledged. Execution handled by WebSocket system.`,
		});
	} catch (error: any) {
		res.status(500).json({
			success: false,
			error: error.message,
			message: "Failed to stop strategy",
		});
	}
};

/**
 * Pause Strategy - WebSocket-Only Version
 */
export const pauseStrategy = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { id: strategy_id } = req.params; // Extract 'id' parameter as 'strategy_id'

		res.status(200).json({
			success: true,
			strategy_id,
			status: "acknowledged",
			message: `Strategy '${strategy_id}' pause request acknowledged. Execution handled by WebSocket system.`,
		});
	} catch (error: any) {
		res.status(500).json({
			success: false,
			error: error.message,
			message: "Failed to pause strategy",
		});
	}
};

/**
 * Resume Strategy - WebSocket-Only Version
 */
export const resumeStrategy = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { id: strategy_id } = req.params; // Extract 'id' parameter as 'strategy_id'

		res.status(200).json({
			success: true,
			strategy_id,
			status: "acknowledged",
			message: `Strategy '${strategy_id}' resume request acknowledged. Execution handled by WebSocket system.`,
		});
	} catch (error: any) {
		res.status(500).json({
			success: false,
			error: error.message,
			message: "Failed to resume strategy",
		});
	}
};

/**
 * Get All Strategy Status - WebSocket-Only Version
 */
export const getAllStrategyStatus = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		// In WebSocket-only architecture, return file-based strategy list
		// Actual execution status comes from WebSocket system
		const strategies = await getAllStrategies(req, res);
		// This will be handled by the getAllStrategies function
	} catch (error: any) {
		res.status(500).json({
			success: false,
			error: error.message,
			message: "Failed to get strategy statuses",
		});
	}
};

/**
 * Get Strategy Status - WebSocket-Only Version
 */
export const getStrategyStatus = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { id: strategy_id } = req.params; // Extract 'id' parameter as 'strategy_id'
		const strategyPath = path.join(strategiesPath, `${strategy_id}.json`);

		if (!fs.existsSync(strategyPath)) {
			res.status(404).json({
				success: false,
				error: "Strategy not found",
				message: `Strategy with ID '${strategy_id}' does not exist`,
			});
			return;
		}

		const strategy = JSON.parse(fs.readFileSync(strategyPath, "utf8"));

		res.status(200).json({
			success: true,
			strategy_id,
			status: "file-based",
			strategy: strategy,
			message: `Strategy '${strategy_id}' configuration loaded. Live status available through WebSocket.`,
		});
	} catch (error: any) {
		res.status(500).json({
			success: false,
			error: error.message,
			message: "Failed to get strategy status",
		});
	}
};

/**
 * Get All Strategies - File-based only
 */
export const getAllStrategies = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		if (!fs.existsSync(strategiesPath)) {
			fs.mkdirSync(strategiesPath, { recursive: true });
		}

		const files = fs.readdirSync(strategiesPath);
		const strategies = files
			.filter((file) => file.endsWith(".json"))
			.filter(
				(file) => !["strategies.json", "strategy.schema.json"].includes(file)
			) // Exclude registry and schema files
			.map((file) => {
				const filePath = path.join(strategiesPath, file);
				const content = fs.readFileSync(filePath, "utf8");
				return JSON.parse(content);
			});

		res.status(200).json({
			success: true,
			strategies,
			count: strategies.length,
			message: "All strategies retrieved successfully",
		});
	} catch (error: any) {
		res.status(500).json({
			success: false,
			error: error.message,
			message: "Failed to retrieve strategies",
		});
	}
};

/**
 * Get Strategy By ID - File-based only
 */
export const getStrategyById = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { id: strategy_id } = req.params; // Extract 'id' parameter as 'strategy_id'
		const strategyPath = path.join(strategiesPath, `${strategy_id}.json`);

		if (!fs.existsSync(strategyPath)) {
			res.status(404).json({
				success: false,
				error: "Strategy not found",
				message: `Strategy with ID '${strategy_id}' does not exist`,
			});
			return;
		}

		const strategy = JSON.parse(fs.readFileSync(strategyPath, "utf8"));

		res.status(200).json({
			success: true,
			strategy,
			message: `Strategy '${strategy_id}' retrieved successfully`,
		});
	} catch (error: any) {
		res.status(500).json({
			success: false,
			error: error.message,
			message: "Failed to retrieve strategy",
		});
	}
};

/**
 * Create Strategy - File-based only
 */
export const createStrategy = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const strategyConfig = req.body;

		if (!strategyConfig.id) {
			res.status(400).json({
				success: false,
				error: "Missing strategy ID",
				message: "Strategy configuration must include an 'id' field",
			});
			return;
		}

		const strategyPath = path.join(strategiesPath, `${strategyConfig.id}.json`);

		if (fs.existsSync(strategyPath)) {
			res.status(409).json({
				success: false,
				error: "Strategy already exists",
				message: `Strategy with ID '${strategyConfig.id}' already exists`,
			});
			return;
		}

		if (!fs.existsSync(strategiesPath)) {
			fs.mkdirSync(strategiesPath, { recursive: true });
		}

		// Add metadata
		strategyConfig.created_at = new Date().toISOString();
		strategyConfig.updated_at = new Date().toISOString();

		fs.writeFileSync(strategyPath, JSON.stringify(strategyConfig, null, 2));

		res.status(201).json({
			success: true,
			strategy: strategyConfig,
			message: `Strategy '${strategyConfig.id}' created successfully`,
		});
	} catch (error: any) {
		res.status(500).json({
			success: false,
			error: error.message,
			message: "Failed to create strategy",
		});
	}
};

/**
 * Update Strategy - File-based only
 */
export const updateStrategy = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { id: strategy_id } = req.params; // Extract 'id' parameter as 'strategy_id'
		const strategyConfig = req.body;
		const strategyPath = path.join(strategiesPath, `${strategy_id}.json`);

		if (!fs.existsSync(strategyPath)) {
			res.status(404).json({
				success: false,
				error: "Strategy not found",
				message: `Strategy with ID '${strategy_id}' does not exist`,
			});
			return;
		}

		const existingStrategy = JSON.parse(fs.readFileSync(strategyPath, "utf8"));
		const updatedStrategy = {
			...existingStrategy,
			...strategyConfig,
			id: strategy_id, // Ensure ID doesn't change
			created_at: existingStrategy.created_at,
			updated_at: new Date().toISOString(),
		};

		fs.writeFileSync(strategyPath, JSON.stringify(updatedStrategy, null, 2));

		res.status(200).json({
			success: true,
			strategy: updatedStrategy,
			message: `Strategy '${strategy_id}' updated successfully`,
		});
	} catch (error: any) {
		res.status(500).json({
			success: false,
			error: error.message,
			message: "Failed to update strategy",
		});
	}
};

/**
 * Delete Strategy - File-based only
 */
export const deleteStrategy = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { id: strategy_id } = req.params; // Extract 'id' parameter as 'strategy_id'
		const strategyPath = path.join(strategiesPath, `${strategy_id}.json`);

		if (!fs.existsSync(strategyPath)) {
			res.status(404).json({
				success: false,
				error: "Strategy not found",
				message: `Strategy with ID '${strategy_id}' does not exist`,
			});
			return;
		}

		fs.unlinkSync(strategyPath);

		res.status(200).json({
			success: true,
			message: `Strategy '${strategy_id}' deleted successfully`,
		});
	} catch (error: any) {
		res.status(500).json({
			success: false,
			error: error.message,
			message: "Failed to delete strategy",
		});
	}
};

/**
 * Clone Strategy - File-based only
 */
export const cloneStrategy = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { id: strategy_id } = req.params; // Extract 'id' parameter as 'strategy_id'
		const { new_id } = req.body;

		if (!new_id) {
			res.status(400).json({
				success: false,
				error: "Missing new strategy ID",
				message: "Request body must include 'new_id' field",
			});
			return;
		}

		const sourceStrategyPath = path.join(strategiesPath, `${strategy_id}.json`);
		const newStrategyPath = path.join(strategiesPath, `${new_id}.json`);

		if (!fs.existsSync(sourceStrategyPath)) {
			res.status(404).json({
				success: false,
				error: "Source strategy not found",
				message: `Strategy with ID '${strategy_id}' does not exist`,
			});
			return;
		}

		if (fs.existsSync(newStrategyPath)) {
			res.status(409).json({
				success: false,
				error: "Target strategy already exists",
				message: `Strategy with ID '${new_id}' already exists`,
			});
			return;
		}

		const sourceStrategy = JSON.parse(
			fs.readFileSync(sourceStrategyPath, "utf8")
		);
		const clonedStrategy = {
			...sourceStrategy,
			id: new_id,
			name: `${sourceStrategy.name} (Copy)`,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		fs.writeFileSync(newStrategyPath, JSON.stringify(clonedStrategy, null, 2));

		res.status(201).json({
			success: true,
			strategy: clonedStrategy,
			message: `Strategy '${strategy_id}' cloned as '${new_id}' successfully`,
		});
	} catch (error: any) {
		res.status(500).json({
			success: false,
			error: error.message,
			message: "Failed to clone strategy",
		});
	}
};

/**
 * Get Strategy Performance - WebSocket-Only Version
 */
export const getStrategyPerformance = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { strategy_id } = req.params;

		// In WebSocket-only architecture, performance data comes from WebSocket system
		res.status(200).json({
			success: true,
			strategy_id,
			performance: {
				status: "websocket-only",
				message: "Performance data available through WebSocket system",
				total_return: 0,
				daily_return: 0,
				win_rate: 0,
				trades_count: 0,
			},
			message: "Performance data placeholder for WebSocket-only architecture",
		});
	} catch (error: any) {
		res.status(500).json({
			success: false,
			error: error.message,
			message: "Failed to get strategy performance",
		});
	}
};

/**
 * Get All Performance Metrics - WebSocket-Only Version
 */
export const getAllPerformanceMetrics = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		// In WebSocket-only architecture, performance data comes from WebSocket system
		res.status(200).json({
			success: true,
			metrics: {
				status: "websocket-only",
				message: "Performance metrics available through WebSocket system",
				total_strategies: 0,
				active_strategies: 0,
				total_return: 0,
				daily_return: 0,
			},
			message:
				"Performance metrics placeholder for WebSocket-only architecture",
		});
	} catch (error: any) {
		res.status(500).json({
			success: false,
			error: error.message,
			message: "Failed to get performance metrics",
		});
	}
};
