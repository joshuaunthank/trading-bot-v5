/**
 * Performance Tracking API Utilities
 *
 * Provides API handlers for performance metrics, analytics,
 * and reporting functionality for trading strategies.
 */

import { Request, Response } from "express";
import { strategyManager } from "../../utils/StrategyManager";

export interface PerformanceResponse {
	success: boolean;
	metrics?: any;
	performance?: any;
	error?: string;
}

/**
 * Get performance metrics for a specific strategy
 */
export function getStrategyPerformance(req: Request, res: Response): void {
	const strategyId = req.params.id;

	try {
		const metrics = strategyManager.getStrategyMetrics(strategyId);

		if (!metrics || metrics.status === "idle") {
			res.status(404).json({
				success: false,
				error: `Strategy '${strategyId}' not found or not running`,
			} as PerformanceResponse);
			return;
		}

		res.json({
			success: true,
			strategy_id: strategyId,
			performance: metrics.performance,
			signals: metrics.signals.length,
			indicators: Array.isArray(metrics.indicators)
				? metrics.indicators.length
				: 0,
			status: metrics.status,
		} as PerformanceResponse);
	} catch (error) {
		console.error(
			`[Performance API] Failed to get metrics for ${strategyId}:`,
			error
		);
		res.status(500).json({
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Failed to get performance metrics",
		} as PerformanceResponse);
	}
}

/**
 * Get aggregated performance across all strategies
 */
export function getAllPerformanceMetrics(req: Request, res: Response): void {
	try {
		const activeStrategies = strategyManager.getActiveStrategies();

		const aggregatedMetrics = {
			totalStrategies: activeStrategies.length,
			runningStrategies: activeStrategies.filter((s) => s.status === "running")
				.length,
			pausedStrategies: activeStrategies.filter((s) => s.status === "paused")
				.length,
			totalReturn: 0,
			totalTrades: 0,
			averageWinRate: 0,
			strategies: activeStrategies.map((strategy) => ({
				id: strategy.id,
				name: strategy.name,
				status: strategy.status,
				performance: strategy.performance,
			})),
		};

		// Calculate aggregated metrics
		if (activeStrategies.length > 0) {
			const totalReturn = activeStrategies.reduce(
				(sum, s) => sum + (s.performance?.totalReturn || 0),
				0
			);
			const totalTrades = activeStrategies.reduce(
				(sum, s) => sum + (s.performance?.totalTrades || 0),
				0
			);
			const averageWinRate =
				activeStrategies.reduce(
					(sum, s) => sum + (s.performance?.winRate || 0),
					0
				) / activeStrategies.length;

			aggregatedMetrics.totalReturn = totalReturn;
			aggregatedMetrics.totalTrades = totalTrades;
			aggregatedMetrics.averageWinRate = averageWinRate;
		}

		res.json({
			success: true,
			metrics: aggregatedMetrics,
		} as PerformanceResponse);
	} catch (error) {
		console.error("[Performance API] Failed to get aggregated metrics:", error);
		res.status(500).json({
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Failed to get performance metrics",
		} as PerformanceResponse);
	}
}
