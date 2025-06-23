import { EventEmitter } from "events";
import { OHLCVCandle } from "../types/index";
import { StrategyInstance, Signal } from "./StrategyInstance";
import { DataDistributor } from "./DataDistributor";
import { PerformanceTracker } from "./PerformanceTracker";
import {
	EnhancedStrategyRunner,
	EnhancedStrategyConfig,
} from "./trading/EnhancedStrategyRunner";

export interface StrategyConfig {
	id: string;
	name: string;
	symbol: string;
	timeframe: string;
	enabled: boolean;
	meta: {
		description?: string;
		tags?: string[];
		version: string;
		created_at: string;
		last_updated: string;
	};
	indicators: any[];
	models: any[];
	signals: any[];
	risk: any;
}

export interface StrategyStatus {
	id: string;
	name: string;
	status: "running" | "paused" | "stopped" | "error";
	symbol: string;
	timeframe: string;
	uptime: number;
	lastUpdate: Date;
	performance: {
		totalReturn: number;
		winRate: number;
		totalTrades: number;
		currentPosition: "long" | "short" | "none";
	};
}

/**
 * Strategy Manager - Orchestrates multiple independent strategy instances
 *
 * Key responsibilities:
 * - Strategy lifecycle management (start/stop/pause)
 * - Data distribution to active strategies
 * - Performance tracking and monitoring
 * - Strategy isolation and resource management
 */
export class StrategyManager extends EventEmitter {
	private strategies: Map<string, StrategyInstance> = new Map();
	private enhancedRunners: Map<string, EnhancedStrategyRunner> = new Map();
	private dataDistributor: DataDistributor;
	private performanceTracker: PerformanceTracker;
	private isRunning: boolean = false;

	constructor() {
		super();
		this.dataDistributor = new DataDistributor();
		this.performanceTracker = new PerformanceTracker();

		console.log("[Strategy Manager] Initialized");
	}

	/**
	 * Start a new strategy instance
	 */
	async startStrategy(config: StrategyConfig): Promise<string> {
		try {
			// Validate strategy configuration
			this.validateStrategyConfig(config);

			// Check if strategy already exists
			if (this.strategies.has(config.id)) {
				throw new Error(`Strategy with ID '${config.id}' already exists`);
			}

			// Create new strategy instance
			const strategy = new StrategyInstance(config);

			// Subscribe strategy to data distribution
			this.dataDistributor.subscribeStrategy(config.id, {
				symbol: config.symbol,
				timeframe: config.timeframe,
			});

			// Connect data distributor to strategy instance
			this.dataDistributor.on(`data:${config.id}`, (candle: OHLCVCandle) => {
				const signal = strategy.processCandle(candle);
				if (signal) {
					this.handleSignal(config.id, signal);
				}
			});

			// Register strategy
			this.strategies.set(config.id, strategy);

			// Create enhanced strategy runner if overtrading protection is enabled
			if (config.risk?.overtrading_protection?.enabled) {
				const enhancedConfig: EnhancedStrategyConfig = {
					strategyId: config.id,
					overtradingProtection: config.risk.overtrading_protection,
					signalFiltering: {
						enableTrendConfirmation: true,
						requireVolumeConfirmation:
							config.risk.overtrading_protection.volume_spike_detection
								?.enabled || false,
						minimumIndicatorAgreement: 0.6,
					},
				};

				const enhancedRunner = new EnhancedStrategyRunner(enhancedConfig);
				this.enhancedRunners.set(config.id, enhancedRunner);
				console.log(
					`[Strategy Manager] Enabled overtrading protection for ${config.id}`
				);
			}

			// Start strategy execution
			await strategy.start();

			// Track performance
			this.performanceTracker.trackStrategy(config.id);

			console.log(
				`[Strategy Manager] Started strategy: ${config.name} (${config.id})`
			);
			this.emit("strategyStarted", { id: config.id, name: config.name });

			return config.id;
		} catch (error) {
			console.error(
				`[Strategy Manager] Failed to start strategy ${config.id}:`,
				error
			);
			throw error;
		}
	}

	/**
	 * Stop a strategy instance
	 */
	async stopStrategy(strategyId: string): Promise<void> {
		try {
			const strategy = this.strategies.get(strategyId);
			if (!strategy) {
				throw new Error(`Strategy '${strategyId}' not found`);
			}

			// Stop strategy execution
			await strategy.stop();

			// Unsubscribe from data distribution
			this.dataDistributor.unsubscribeStrategy(strategyId);

			// Remove from tracking
			this.performanceTracker.untrackStrategy(strategyId);

			// Remove from registry
			this.strategies.delete(strategyId);

			// Clean up enhanced runner if it exists
			const enhancedRunner = this.enhancedRunners.get(strategyId);
			if (enhancedRunner) {
				enhancedRunner.reset();
				this.enhancedRunners.delete(strategyId);
				console.log(
					`[Strategy Manager] Cleaned up overtrading protection for ${strategyId}`
				);
			}

			console.log(`[Strategy Manager] Stopped strategy: ${strategyId}`);
			this.emit("strategyStopped", { id: strategyId });
		} catch (error) {
			console.error(
				`[Strategy Manager] Failed to stop strategy ${strategyId}:`,
				error
			);
			throw error;
		}
	}

	/**
	 * Pause a strategy instance
	 */
	async pauseStrategy(strategyId: string): Promise<void> {
		try {
			const strategy = this.strategies.get(strategyId);
			if (!strategy) {
				throw new Error(`Strategy '${strategyId}' not found`);
			}

			await strategy.pause();
			console.log(`[Strategy Manager] Paused strategy: ${strategyId}`);
			this.emit("strategyPaused", { id: strategyId });
		} catch (error) {
			console.error(
				`[Strategy Manager] Failed to pause strategy ${strategyId}:`,
				error
			);
			throw error;
		}
	}

	/**
	 * Resume a paused strategy
	 */
	async resumeStrategy(strategyId: string): Promise<void> {
		try {
			const strategy = this.strategies.get(strategyId);
			if (!strategy) {
				throw new Error(`Strategy '${strategyId}' not found`);
			}

			await strategy.resume();
			console.log(`[Strategy Manager] Resumed strategy: ${strategyId}`);
			this.emit("strategyResumed", { id: strategyId });
		} catch (error) {
			console.error(
				`[Strategy Manager] Failed to resume strategy ${strategyId}:`,
				error
			);
			throw error;
		}
	}

	/**
	 * Get list of active strategies
	 */
	getActiveStrategies(): StrategyStatus[] {
		const activeStrategies: StrategyStatus[] = [];

		for (const [id, strategy] of this.strategies) {
			const status = strategy.getStatus();
			const performance = this.performanceTracker.getPerformance(id);

			activeStrategies.push({
				id,
				name: strategy.getName(),
				status: status.status,
				symbol: strategy.getSymbol(),
				timeframe: strategy.getTimeframe(),
				uptime: status.uptime,
				lastUpdate: status.lastUpdate,
				performance: {
					totalReturn: performance?.totalReturn || 0,
					winRate: performance?.winRate || 0,
					totalTrades: performance?.totalTrades || 0,
					currentPosition: performance?.currentPosition || "none",
				},
			});
		}

		return activeStrategies;
	}

	/**
	 * Get strategy performance metrics
	 */
	getStrategyMetrics(strategyId: string) {
		const strategy = this.strategies.get(strategyId);
		if (!strategy) {
			// Return default metrics for strategies that aren't running
			return {
				status: "idle",
				performance: {
					totalSignals: 0,
					profitLoss: 0,
					winRate: 0,
					totalTrades: 0,
					winningTrades: 0,
					losingTrades: 0,
					averageReturn: 0,
					maxDrawdown: 0,
					sharpeRatio: 0,
					startTime: null,
					lastUpdate: new Date(),
				},
				signals: [],
				indicators: {},
			};
		}

		return {
			status: strategy.getStatus(),
			performance: this.performanceTracker.getPerformance(strategyId),
			signals: strategy.getRecentSignals(),
			indicators: strategy.getCurrentIndicators(),
		};
	}

	/**
	 * Distribute new market data to all relevant strategies
	 */
	onNewCandle(candle: OHLCVCandle): void {
		try {
			// Distribute data through the data distributor
			this.dataDistributor.distributeCandle(candle);
		} catch (error) {
			console.error(
				"[Strategy Manager] Error distributing candle data:",
				error
			);
		}
	}

	/**
	 * Validate strategy configuration
	 */
	private validateStrategyConfig(config: StrategyConfig): void {
		if (!config.id || !config.name || !config.symbol || !config.timeframe) {
			throw new Error(
				"Strategy config missing required fields: id, name, symbol, timeframe"
			);
		}

		if (!config.meta?.version) {
			throw new Error("Strategy config missing version in meta");
		}

		// Additional validation can be added here
	}

	/**
	 * Handle signals generated by strategies
	 */
	private handleSignal(strategyId: string, signal: Signal): void {
		try {
			// Check if enhanced runner with overtrading protection is available
			const enhancedRunner = this.enhancedRunners.get(strategyId);

			if (enhancedRunner) {
				// Get strategy instance
				const strategy = this.strategies.get(strategyId);
				if (!strategy) {
					console.error(
						`[Strategy Manager] Strategy ${strategyId} not found for signal handling`
					);
					return;
				}

				// Get current data from strategy instance
				const dataBuffer = strategy.getDataBuffer();
				const currentCandle = dataBuffer[dataBuffer.length - 1];
				const currentIndicators = strategy.getCurrentIndicators();

				// Convert indicators to object format
				const indicatorValues: { [key: string]: any } = {};
				currentIndicators.forEach((indicator: any) => {
					indicatorValues[indicator.name] = indicator.value;
				});

				// Convert signal to enhanced format
				const strategySignal = {
					id: `${strategyId}_${Date.now()}`,
					timestamp: Date.now(),
					side: signal.side as "long" | "short",
					type: signal.type as "entry" | "exit",
					confidence: signal.confidence || 0.7,
					price: signal.price,
					volume: currentCandle?.volume || 0,
					indicators: indicatorValues,
					metadata: signal.metadata,
				};

				// Process through overtrading protection
				const filteredSignal =
					enhancedRunner.processStrategySignal(strategySignal);

				if (!filteredSignal) {
					// Signal was rejected by overtrading protection
					console.log(
						`[Strategy Manager] Signal from ${strategyId} rejected by overtrading protection`
					);
					return;
				}

				// Log statistics
				const stats = enhancedRunner.getStatistics();
				console.log(
					`[Strategy Manager] Overtrading stats for ${strategyId}: ${stats.tradesLastHour}/${stats.hourlyLimit} trades/hour`
				);
			}

			console.log(
				`[Strategy Manager] Signal from ${strategyId}: ${signal.type} ${signal.side} at ${signal.price}`
			);

			// Update performance tracking
			this.performanceTracker.recordSignal(strategyId, signal);

			// Emit signal event for external listeners
			this.emit("signal", { strategyId, signal });

			// TODO: In future phases, this would trigger actual trading operations
		} catch (error) {
			console.error(
				`[Strategy Manager] Error handling signal from ${strategyId}:`,
				error
			);
		}
	}

	/**
	 * Get strategy manager status
	 */
	getStatus() {
		return {
			isRunning: this.isRunning,
			activeStrategies: this.strategies.size,
			totalUptime: Date.now(), // Placeholder
			dataDistributorStatus: this.dataDistributor.getStatus(),
		};
	}

	/**
	 * Shutdown strategy manager and all strategies
	 */
	async shutdown(): Promise<void> {
		console.log("[Strategy Manager] Shutting down...");

		// Stop all strategies
		const stopPromises = Array.from(this.strategies.keys()).map((id) =>
			this.stopStrategy(id).catch((err) =>
				console.error(`Error stopping strategy ${id}:`, err)
			)
		);

		await Promise.all(stopPromises);

		this.isRunning = false;
		console.log("[Strategy Manager] Shutdown complete");
	}

	/**
	 * Check if enhanced runner exists for strategy (for testing)
	 */
	hasEnhancedRunner(strategyId: string): boolean {
		return this.enhancedRunners.has(strategyId);
	}
}

// Singleton instance
export const strategyManager = new StrategyManager();
