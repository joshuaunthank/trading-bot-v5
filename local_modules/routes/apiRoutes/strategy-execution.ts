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
