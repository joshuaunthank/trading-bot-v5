/**
 * Strategy Manager - Coordinates Multiple Strategy Execution
 *
 * This class manages multiple strategy instances, handles strategy lifecycle,
 * and coordinates data flow between WebSocket data and strategy execution.
 */

import { EventEmitter } from "events";
import { StrategyInstance } from "./StrategyInstance";
import { StrategyLoader } from "./StrategyLoader";
import {
	StrategyConfig,
	OHLCVCandle,
	StrategyState,
	PerformanceMetrics,
	Signal,
	IndicatorResult,
	StrategyExecutionEvent,
} from "./types";

export class StrategyManager extends EventEmitter {
	private strategies: Map<string, StrategyInstance> = new Map();
	private strategyLoader: StrategyLoader;
	private isRunning: boolean = false;
	private candles: OHLCVCandle[] = [];
	private maxCandleHistory: number = 1000;

	constructor() {
		super();
		this.strategyLoader = new StrategyLoader();
		console.log("[StrategyManager] Initialized");
	}

	/**
	 * Load strategy from file
	 */
	public async loadStrategy(
		strategyId: string
	): Promise<StrategyInstance | null> {
		try {
			const config = await this.strategyLoader.loadStrategy(strategyId);
			if (!config) {
				console.error(`[StrategyManager] Strategy ${strategyId} not found`);
				return null;
			}

			const instance = new StrategyInstance(config);

			// Set up event forwarding
			this.setupStrategyEventHandlers(instance);

			this.strategies.set(strategyId, instance);

			console.log(`[StrategyManager] Loaded strategy: ${strategyId}`);
			this.emit("strategy-loaded", {
				strategyId: strategyId,
				timestamp: Date.now(),
			});

			return instance;
		} catch (error) {
			console.error(
				`[StrategyManager] Failed to load strategy ${strategyId}:`,
				error
			);
			return null;
		}
	}

	/**
	 * Load all available strategies
	 */
	public async loadAllStrategies(): Promise<void> {
		try {
			const strategyIds = await this.strategyLoader.listStrategies();

			for (const strategyId of strategyIds) {
				await this.loadStrategy(strategyId);
			}

			console.log(`[StrategyManager] Loaded ${strategyIds.length} strategies`);
		} catch (error) {
			console.error("[StrategyManager] Failed to load strategies:", error);
		}
	}

	/**
	 * Start strategy execution
	 */
	public startStrategy(strategyId: string): boolean {
		const strategy = this.strategies.get(strategyId);
		if (!strategy) {
			console.error(`[StrategyManager] Strategy ${strategyId} not found`);
			return false;
		}

		strategy.start();

		// If manager is running, feed historical data to the strategy
		if (this.isRunning && this.candles.length > 0) {
			this.feedHistoricalData(strategy);
		}

		return true;
	}

	/**
	 * Stop strategy execution
	 */
	public stopStrategy(strategyId: string): boolean {
		const strategy = this.strategies.get(strategyId);
		if (!strategy) {
			console.error(`[StrategyManager] Strategy ${strategyId} not found`);
			return false;
		}

		strategy.stop();
		return true;
	}

	/**
	 * Pause strategy execution
	 */
	public pauseStrategy(strategyId: string): boolean {
		const strategy = this.strategies.get(strategyId);
		if (!strategy) {
			console.error(`[StrategyManager] Strategy ${strategyId} not found`);
			return false;
		}

		strategy.pause();
		return true;
	}

	/**
	 * Resume strategy execution
	 */
	public resumeStrategy(strategyId: string): boolean {
		const strategy = this.strategies.get(strategyId);
		if (!strategy) {
			console.error(`[StrategyManager] Strategy ${strategyId} not found`);
			return false;
		}

		strategy.resume();
		return true;
	}

	/**
	 * Start all strategies
	 */
	public startAll(): void {
		for (const [strategyId, strategy] of this.strategies) {
			try {
				strategy.start();

				// Feed historical data
				if (this.candles.length > 0) {
					this.feedHistoricalData(strategy);
				}
			} catch (error) {
				console.error(
					`[StrategyManager] Failed to start strategy ${strategyId}:`,
					error
				);
			}
		}

		this.isRunning = true;
		console.log(
			`[StrategyManager] Started all strategies (${this.strategies.size} strategies)`
		);
	}

	/**
	 * Stop all strategies
	 */
	public stopAll(): void {
		for (const [strategyId, strategy] of this.strategies) {
			try {
				strategy.stop();
			} catch (error) {
				console.error(
					`[StrategyManager] Failed to stop strategy ${strategyId}:`,
					error
				);
			}
		}

		this.isRunning = false;
		console.log("[StrategyManager] Stopped all strategies");
	}

	/**
	 * Process new market data candle
	 */
	public processCandle(candle: OHLCVCandle): void {
		// Add to candle history
		this.candles.push(candle);

		// Maintain max history
		if (this.candles.length > this.maxCandleHistory) {
			this.candles.shift();
		}

		// Process candle for all running strategies
		for (const [strategyId, strategy] of this.strategies) {
			try {
				strategy.processCandle(candle);
			} catch (error) {
				console.error(
					`[StrategyManager] Error processing candle for ${strategyId}:`,
					error
				);
			}
		}

		// Emit candle processed event
		this.emit("candle-processed", {
			timestamp: candle.timestamp,
			price: candle.close,
			strategiesCount: this.strategies.size,
		});
	}

	/**
	 * Feed historical data to a strategy
	 */
	private feedHistoricalData(strategy: StrategyInstance): void {
		const state = strategy.getState();
		if (state.status !== "running") {
			return;
		}

		// Feed last 100 candles for indicator warm-up
		const warmupCandles = this.candles.slice(-100);

		console.log(
			`[StrategyManager] Feeding ${
				warmupCandles.length
			} historical candles to ${strategy.getConfig().id}`
		);

		for (const candle of warmupCandles) {
			strategy.processCandle(candle);
		}
	}

	/**
	 * Set up event handlers for strategy instance
	 */
	private setupStrategyEventHandlers(strategy: StrategyInstance): void {
		// Forward all strategy events to manager
		strategy.on("event", (event: StrategyExecutionEvent) => {
			this.emit("strategy-event", event);
		});

		// Handle specific events
		strategy.on("signal-generated", (signal: Signal) => {
			this.emit("signal-generated", signal);
			console.log(
				`[StrategyManager] Signal: ${signal.side} ${signal.type} from ${signal.strategyId}`
			);
		});

		strategy.on("error", (error: any) => {
			this.emit("strategy-error", error);
			console.error(`[StrategyManager] Strategy error:`, error);
		});
	}

	/**
	 * Get strategy instance
	 */
	public getStrategy(strategyId: string): StrategyInstance | null {
		return this.strategies.get(strategyId) || null;
	}

	/**
	 * Get all strategy states
	 */
	public getAllStates(): Map<string, StrategyState> {
		const states = new Map<string, StrategyState>();

		for (const [strategyId, strategy] of this.strategies) {
			states.set(strategyId, strategy.getState());
		}

		return states;
	}

	/**
	 * Get all performance metrics
	 */
	public getAllPerformanceMetrics(): Map<string, PerformanceMetrics> {
		const metrics = new Map<string, PerformanceMetrics>();

		for (const [strategyId, strategy] of this.strategies) {
			metrics.set(strategyId, strategy.getPerformanceMetrics());
		}

		return metrics;
	}

	/**
	 * Get all indicator results
	 */
	public getAllIndicatorResults(): Map<string, IndicatorResult[]> {
		const results = new Map<string, IndicatorResult[]>();

		for (const [strategyId, strategy] of this.strategies) {
			results.set(strategyId, strategy.getIndicatorResults());
		}

		return results;
	}

	/**
	 * Get strategy list
	 */
	public getStrategyList(): { id: string; name: string; status: string }[] {
		const list: { id: string; name: string; status: string }[] = [];

		for (const [strategyId, strategy] of this.strategies) {
			const config = strategy.getConfig();
			const state = strategy.getState();

			list.push({
				id: strategyId,
				name: config.name,
				status: state.status,
			});
		}

		return list;
	}

	/**
	 * Get current candle count
	 */
	public getCandleCount(): number {
		return this.candles.length;
	}

	/**
	 * Get strategy count
	 */
	public getStrategyCount(): number {
		return this.strategies.size;
	}

	/**
	 * Get running strategy count
	 */
	public getRunningStrategyCount(): number {
		let count = 0;
		for (const strategy of this.strategies.values()) {
			if (strategy.getState().status === "running") {
				count++;
			}
		}
		return count;
	}

	/**
	 * Get manager status
	 */
	public getManagerStatus(): {
		isRunning: boolean;
		strategyCount: number;
		runningStrategies: number;
		candleCount: number;
		lastUpdate: number;
	} {
		return {
			isRunning: this.isRunning,
			strategyCount: this.strategies.size,
			runningStrategies: this.getRunningStrategyCount(),
			candleCount: this.candles.length,
			lastUpdate: Date.now(),
		};
	}

	/**
	 * Get debug information
	 */
	public getDebugInfo(): any {
		const strategies: any = {};

		for (const [strategyId, strategy] of this.strategies) {
			strategies[strategyId] = strategy.getDebugInfo();
		}

		return {
			manager: {
				isRunning: this.isRunning,
				strategyCount: this.strategies.size,
				runningStrategies: this.getRunningStrategyCount(),
				candleCount: this.candles.length,
			},
			strategies: strategies,
		};
	}
}
