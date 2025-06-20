import { EventEmitter } from "events";
import { OHLCVCandle } from "../types/index";
import {
	BaseIndicator,
	IndicatorResult,
	IndicatorConfig,
	createIndicator,
	createCommonIndicators,
} from "./indicators";
import {
	SignalEvaluator,
	Signal,
	SignalRule,
	createCommonSignalRules,
} from "./signalEngine";

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
	indicators: IndicatorConfig[];
	models: any[];
	signals: SignalRule[];
	risk: any;
}

// Re-export for backward compatibility
export { Signal, IndicatorResult as IndicatorValue };

export interface StrategyInstanceStatus {
	status: "running" | "paused" | "stopped" | "error";
	uptime: number;
	lastUpdate: Date;
	error?: string;
}

/**
 * Strategy Instance - Individual strategy execution engine
 *
 * Responsibilities:
 * - Execute strategy logic for a specific configuration
 * - Maintain independent state and data buffers
 * - Generate trading signals based on indicators and models
 * - Track strategy-specific performance
 */
export class StrategyInstance extends EventEmitter {
	private config: StrategyConfig;
	private status: "running" | "paused" | "stopped" | "error" = "stopped";
	private startTime: Date | null = null;
	private lastUpdate: Date = new Date();
	private error: string | null = null;

	// Data management
	private dataBuffer: OHLCVCandle[] = [];
	private readonly maxBufferSize: number = 1000;

	// Indicators and signals
	private indicators: Map<string, BaseIndicator> = new Map();
	private currentIndicatorValues: Map<string, IndicatorResult> = new Map();
	private signalEvaluator: SignalEvaluator;
	private recentSignals: Signal[] = [];
	private readonly maxSignalHistory: number = 100;

	constructor(config: StrategyConfig) {
		super();
		this.config = { ...config };

		// Initialize signal evaluator with strategy rules
		const signalRules = config.signals || [];
		this.signalEvaluator = new SignalEvaluator(signalRules);

		console.log(`[Strategy Instance] Created: ${config.name} (${config.id})`);
		console.log(
			`[Strategy Instance] - Indicators: ${config.indicators.length}`
		);
		console.log(`[Strategy Instance] - Signal Rules: ${signalRules.length}`);
	}

	/**
	 * Start strategy execution
	 */
	async start(): Promise<void> {
		try {
			if (this.status === "running") {
				throw new Error("Strategy is already running");
			}

			this.status = "running";
			this.startTime = new Date();
			this.lastUpdate = new Date();
			this.error = null;

			// Initialize strategy components
			await this.initializeIndicators();
			await this.initializeModels();

			console.log(`[Strategy Instance] Started: ${this.config.name}`);
			this.emit("started", { id: this.config.id });
		} catch (error) {
			this.status = "error";
			this.error = error instanceof Error ? error.message : "Unknown error";
			console.error(
				`[Strategy Instance] Failed to start ${this.config.name}:`,
				error
			);
			throw error;
		}
	}

	/**
	 * Stop strategy execution
	 */
	async stop(): Promise<void> {
		try {
			this.status = "stopped";
			this.startTime = null;

			// Cleanup resources
			await this.cleanup();

			console.log(`[Strategy Instance] Stopped: ${this.config.name}`);
			this.emit("stopped", { id: this.config.id });
		} catch (error) {
			console.error(
				`[Strategy Instance] Error stopping ${this.config.name}:`,
				error
			);
			throw error;
		}
	}

	/**
	 * Pause strategy execution
	 */
	async pause(): Promise<void> {
		if (this.status !== "running") {
			throw new Error("Strategy is not running");
		}

		this.status = "paused";
		console.log(`[Strategy Instance] Paused: ${this.config.name}`);
		this.emit("paused", { id: this.config.id });
	}

	/**
	 * Resume strategy execution
	 */
	async resume(): Promise<void> {
		if (this.status !== "paused") {
			throw new Error("Strategy is not paused");
		}

		this.status = "running";
		this.lastUpdate = new Date();
		console.log(`[Strategy Instance] Resumed: ${this.config.name}`);
		this.emit("resumed", { id: this.config.id });
	}

	/**
	 * Process incoming market data
	 */
	processCandle(candle: OHLCVCandle): Signal | null {
		try {
			if (this.status !== "running") {
				return null;
			}

			// Add to data buffer
			this.addToBuffer(candle);

			// Update indicators
			this.updateIndicators(candle);

			// Evaluate signals
			const signal = this.evaluateSignals();

			// Update last update time
			this.lastUpdate = new Date();

			return signal;
		} catch (error) {
			console.error(
				`[Strategy Instance] Error processing candle for ${this.config.name}:`,
				error
			);
			this.status = "error";
			this.error = error instanceof Error ? error.message : "Unknown error";
			return null;
		}
	}

	/**
	 * Add candle to data buffer
	 */
	private addToBuffer(candle: OHLCVCandle): void {
		this.dataBuffer.push(candle);

		// Maintain buffer size limit
		if (this.dataBuffer.length > this.maxBufferSize) {
			this.dataBuffer = this.dataBuffer.slice(-this.maxBufferSize);
		}
	}

	/**
	 * Initialize indicators based on configuration
	 */
	private async initializeIndicators(): Promise<void> {
		console.log(
			`[Strategy Instance] Initializing ${this.config.indicators.length} indicators`
		);

		try {
			// Clear existing indicators
			this.indicators.clear();
			this.currentIndicatorValues.clear();

			// Create indicators from configuration
			for (const indicatorConfig of this.config.indicators) {
				try {
					const indicator = createIndicator(indicatorConfig);
					this.indicators.set(indicatorConfig.id, indicator);
					console.log(
						`[Strategy Instance] - Created indicator: ${indicator.getName()}`
					);
				} catch (error) {
					console.error(
						`[Strategy Instance] Failed to create indicator ${indicatorConfig.id}:`,
						error
					);
				}
			}

			// If no indicators configured, use common defaults
			if (this.indicators.size === 0) {
				console.log(
					"[Strategy Instance] No indicators configured, using defaults"
				);
				const defaultConfigs = createCommonIndicators();
				for (const config of defaultConfigs) {
					const indicator = createIndicator(config);
					this.indicators.set(config.id, indicator);
				}
			}

			console.log(
				`[Strategy Instance] Initialized ${this.indicators.size} indicators`
			);
		} catch (error) {
			console.error(
				"[Strategy Instance] Error initializing indicators:",
				error
			);
			throw error;
		}
	}

	/**
	 * Initialize models based on configuration
	 */
	private async initializeModels(): Promise<void> {
		// Placeholder for model initialization
		// This will be implemented when we add ML support
		console.log(
			`[Strategy Instance] Initializing ${this.config.models.length} models`
		);
	}

	/**
	 * Update indicators with new candle data
	 */
	private updateIndicators(candle: OHLCVCandle): void {
		for (const [id, indicator] of this.indicators) {
			try {
				const result = indicator.update(candle);
				this.currentIndicatorValues.set(id, result);
			} catch (error) {
				console.error(
					`[Strategy Instance] Error updating indicator ${id}:`,
					error
				);
			}
		}
	}

	/**
	 * Evaluate trading signals based on current indicators and models
	 */
	private evaluateSignals(): Signal | null {
		try {
			// Use signal evaluator to generate signals
			const signals = this.signalEvaluator.evaluate(
				this.dataBuffer[this.dataBuffer.length - 1],
				this.currentIndicatorValues
			);

			// Return the first signal generated (if any)
			if (signals.length > 0) {
				const signal = signals[0];
				this.addSignal(signal);
				return signal;
			}

			return null;
		} catch (error) {
			console.error("[Strategy Instance] Error evaluating signals:", error);
			return null;
		}
	}

	/**
	 * Add signal to history
	 */
	private addSignal(signal: Signal): void {
		this.recentSignals.push(signal);

		// Maintain signal history limit
		if (this.recentSignals.length > this.maxSignalHistory) {
			this.recentSignals = this.recentSignals.slice(-this.maxSignalHistory);
		}

		this.emit("signal", signal);
	}

	/**
	 * Cleanup resources
	 */
	private async cleanup(): Promise<void> {
		// Reset all indicators
		for (const indicator of this.indicators.values()) {
			indicator.reset();
		}

		// Clear data buffers
		this.dataBuffer = [];
		this.currentIndicatorValues.clear();

		// Reset signal evaluator
		this.signalEvaluator.reset();

		// Keep signal history for analysis
	}

	// Getter methods
	getName(): string {
		return this.config.name;
	}

	getId(): string {
		return this.config.id;
	}

	getSymbol(): string {
		return this.config.symbol;
	}

	getTimeframe(): string {
		return this.config.timeframe;
	}

	getStatus(): StrategyInstanceStatus {
		return {
			status: this.status,
			uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
			lastUpdate: this.lastUpdate,
			error: this.error || undefined,
		};
	}

	getCurrentIndicators(): IndicatorResult[] {
		return Array.from(this.currentIndicatorValues.values());
	}

	getRecentSignals(): Signal[] {
		return [...this.recentSignals];
	}

	getDataBuffer(): OHLCVCandle[] {
		return [...this.dataBuffer];
	}

	getConfiguration(): StrategyConfig {
		return { ...this.config };
	}
}
