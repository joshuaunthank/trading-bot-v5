/**
 * Strategy Instance - Individual Strategy Execution
 *
 * This class manages the execution of a single trading strategy. It handles
 * indicator calculations, signal generation, and performance tracking.
 */

import { EventEmitter } from "events";
import { IndicatorCalculator } from "./IndicatorCalculator";
import { SignalEvaluator } from "./SignalEvaluator";
import {
	StrategyConfig,
	OHLCVCandle,
	StrategyState,
	PerformanceMetrics,
	Signal,
	IndicatorResult,
	StrategyExecutionEvent,
} from "./types";

export class StrategyInstance extends EventEmitter {
	private config: StrategyConfig;
	private indicators: Map<string, IndicatorCalculator> = new Map();
	private signalEvaluator: SignalEvaluator;
	private state: StrategyState;
	private performanceMetrics: PerformanceMetrics;

	constructor(config: StrategyConfig) {
		super();
		this.config = config;
		this.signalEvaluator = new SignalEvaluator(config.id, config.signals);

		// Initialize state
		this.state = {
			status: "stopped",
			startTime: null,
			pauseTime: null,
			totalCandles: 0,
			totalSignals: 0,
			lastUpdate: Date.now(),
		};

		// Initialize performance metrics
		this.performanceMetrics = {
			strategyId: config.id,
			totalSignals: 0,
			entrySignals: 0,
			exitSignals: 0,
			longSignals: 0,
			shortSignals: 0,
			avgConfidence: 0,
			lastSignalTime: null,
			uptime: 0,
			candlesProcessed: 0,
		};

		// Initialize indicators
		this.initializeIndicators();
	}

	/**
	 * Initialize indicator calculators based on strategy configuration
	 */
	private initializeIndicators(): void {
		for (const indicatorGroup of this.config.indicators) {
			for (const [indicatorType, indicatorConfig] of Object.entries(
				indicatorGroup
			)) {
				// Create indicator ID with parameters
				const params = this.extractIndicatorParams(indicatorConfig.params);
				const indicatorId = `${indicatorType.toLowerCase()}_${
					params.period || "default"
				}`;

				try {
					const calculator = new IndicatorCalculator({
						type: indicatorType,
						params: params,
					});

					this.indicators.set(indicatorId, calculator);
					console.log(
						`[Strategy] Initialized indicator: ${indicatorId} for ${this.config.id}`
					);
				} catch (error) {
					console.error(
						`[Strategy] Failed to initialize indicator ${indicatorType}:`,
						error
					);
				}
			}
		}
	}

	/**
	 * Extract parameters from indicator configuration
	 */
	private extractIndicatorParams(params: any[]): Record<string, any> {
		const result: Record<string, any> = {};

		for (const param of params) {
			result[param.name] = param.default;
		}

		return result;
	}

	/**
	 * Start strategy execution
	 */
	public start(): void {
		if (this.state.status === "running") {
			console.warn(`[Strategy] ${this.config.id} is already running`);
			return;
		}

		this.state.status = "running";
		this.state.startTime = Date.now();
		this.state.pauseTime = null;
		this.state.lastUpdate = Date.now();

		console.log(`[Strategy] Started: ${this.config.id}`);
		this.emitEvent("strategy-started", {
			strategyId: this.config.id,
			timestamp: this.state.startTime,
		});
	}

	/**
	 * Stop strategy execution
	 */
	public stop(): void {
		this.state.status = "stopped";
		this.state.startTime = null;
		this.state.pauseTime = null;
		this.state.lastUpdate = Date.now();

		// Reset all indicators
		for (const calculator of this.indicators.values()) {
			calculator.reset();
		}

		// Reset signal evaluator
		this.signalEvaluator.reset();

		console.log(`[Strategy] Stopped: ${this.config.id}`);
		this.emitEvent("strategy-stopped", {
			strategyId: this.config.id,
			timestamp: Date.now(),
		});
	}

	/**
	 * Pause strategy execution
	 */
	public pause(): void {
		if (this.state.status !== "running") {
			console.warn(`[Strategy] Cannot pause ${this.config.id}, not running`);
			return;
		}

		this.state.status = "paused";
		this.state.pauseTime = Date.now();
		this.state.lastUpdate = Date.now();

		console.log(`[Strategy] Paused: ${this.config.id}`);
		this.emitEvent("strategy-paused", {
			strategyId: this.config.id,
			timestamp: this.state.pauseTime,
		});
	}

	/**
	 * Resume strategy execution
	 */
	public resume(): void {
		if (this.state.status !== "paused") {
			console.warn(`[Strategy] Cannot resume ${this.config.id}, not paused`);
			return;
		}

		this.state.status = "running";
		this.state.pauseTime = null;
		this.state.lastUpdate = Date.now();

		console.log(`[Strategy] Resumed: ${this.config.id}`);
		this.emitEvent("strategy-resumed", {
			strategyId: this.config.id,
			timestamp: Date.now(),
		});
	}

	/**
	 * Process new market data candle
	 */
	public processCandle(candle: OHLCVCandle): void {
		if (this.state.status !== "running") {
			return; // Don't process if not running
		}

		try {
			// Update candle count
			this.state.totalCandles++;
			this.state.lastUpdate = Date.now();
			this.performanceMetrics.candlesProcessed++;

			// Update indicators
			this.updateIndicators(candle);

			// Update signal evaluator with current market data
			this.signalEvaluator.updateMarketData(candle.close, candle.timestamp);

			// Evaluate signals
			const signals = this.signalEvaluator.evaluateSignals();

			// Process generated signals
			if (signals.length > 0) {
				this.processSignals(signals);
			}

			// Update performance metrics
			this.updatePerformanceMetrics();
		} catch (error) {
			console.error(
				`[Strategy] Error processing candle for ${this.config.id}:`,
				error
			);
			this.handleError(error);
		}
	}

	/**
	 * Update all indicators with new candle data
	 */
	private updateIndicators(candle: OHLCVCandle): void {
		for (const [indicatorId, calculator] of this.indicators.entries()) {
			try {
				const value = calculator.calculate(candle);
				const history = calculator.getHistory();

				// Update signal evaluator with new indicator values
				this.signalEvaluator.updateIndicators(
					indicatorId,
					value,
					candle.timestamp,
					history
				);

				// Emit indicator update event
				this.emitEvent("indicator-updated", {
					strategyId: this.config.id,
					indicatorId: indicatorId,
					value: value,
					timestamp: candle.timestamp,
				});
			} catch (error) {
				console.error(
					`[Strategy] Error updating indicator ${indicatorId}:`,
					error
				);
			}
		}
	}

	/**
	 * Process generated signals
	 */
	private processSignals(signals: Signal[]): void {
		for (const signal of signals) {
			this.state.totalSignals++;
			this.performanceMetrics.totalSignals++;

			// Update signal type counters
			if (signal.type === "entry") {
				this.performanceMetrics.entrySignals++;
			} else {
				this.performanceMetrics.exitSignals++;
			}

			// Update side counters
			if (signal.side === "long") {
				this.performanceMetrics.longSignals++;
			} else {
				this.performanceMetrics.shortSignals++;
			}

			this.performanceMetrics.lastSignalTime = signal.timestamp;

			// Emit signal event
			this.emitEvent("signal-generated", signal);

			console.log(
				`[Strategy] Signal generated: ${signal.side} ${signal.type} for ${this.config.id} (confidence: ${signal.confidence})`
			);
		}
	}

	/**
	 * Update performance metrics
	 */
	private updatePerformanceMetrics(): void {
		// Calculate uptime
		if (this.state.startTime) {
			this.performanceMetrics.uptime = Date.now() - this.state.startTime;
		}

		// Calculate average confidence
		if (this.performanceMetrics.totalSignals > 0) {
			// This is a simplified calculation - in a real system, you'd track individual signal confidences
			this.performanceMetrics.avgConfidence = 0.7; // Placeholder
		}
	}

	/**
	 * Handle errors
	 */
	private handleError(error: any): void {
		this.state.status = "error";
		this.state.errorMessage = error.message;
		this.state.lastUpdate = Date.now();

		this.emitEvent("error", {
			strategyId: this.config.id,
			error: error.message,
			timestamp: Date.now(),
		});
	}

	/**
	 * Emit strategy execution event
	 */
	private emitEvent(type: string, data: any): void {
		const event: StrategyExecutionEvent = {
			type: type as any,
			strategyId: this.config.id,
			timestamp: Date.now(),
			data: data,
		};

		this.emit(type, event);
		this.emit("event", event); // General event for listeners
	}

	/**
	 * Get current strategy state
	 */
	public getState(): StrategyState {
		return { ...this.state };
	}

	/**
	 * Get performance metrics
	 */
	public getPerformanceMetrics(): PerformanceMetrics {
		this.updatePerformanceMetrics();
		return { ...this.performanceMetrics };
	}

	/**
	 * Get current indicator results
	 */
	public getIndicatorResults(): IndicatorResult[] {
		const results: IndicatorResult[] = [];

		for (const [indicatorId, calculator] of this.indicators.entries()) {
			results.push({
				id: indicatorId,
				name: indicatorId,
				type: calculator.getConfig().type,
				currentValue: calculator.getCurrentValue(),
				history: calculator.getHistory(),
			});
		}

		return results;
	}

	/**
	 * Get strategy configuration
	 */
	public getConfig(): StrategyConfig {
		return { ...this.config };
	}

	/**
	 * Get signal evaluator debug info
	 */
	public getDebugInfo(): any {
		return {
			strategy: {
				id: this.config.id,
				name: this.config.name,
				state: this.state,
				indicators: this.indicators.size,
				signals: this.config.signals.length,
			},
			signalEvaluator: this.signalEvaluator.getDebugInfo(),
			performance: this.performanceMetrics,
		};
	}
}
