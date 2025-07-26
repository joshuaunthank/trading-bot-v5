/**
 * Strategy Execution Engine - Core Types and Interfaces
 *
 * This module defines all the TypeScript types and interfaces used
 * throughout the strategy execution engine.
 */

export interface OHLCVCandle {
	timestamp: number;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
}

export interface StrategyConfig {
	id: string;
	name: string;
	description: string;
	symbol: string;
	timeframe: string;
	enabled: boolean;
	tags: string[];
	indicators: IndicatorConfig[];
	signals: SignalRule[];
	risk: RiskConfig;
	ml_models: any[];
	postprocessing: any[];
	metadata: {
		version: string;
		created: string;
		author: string;
	};
	created_at: string;
	updated_at: string;
}

export interface IndicatorConfig {
	[key: string]: {
		description: string;
		params: IndicatorParam[];
	};
}

export interface IndicatorParam {
	name: string;
	default: any;
	type: string;
	color?: string;
}

export interface SignalRule {
	id: string;
	name: string;
	type: "entry" | "exit";
	side: "long" | "short";
	description: string;
	conditions: SignalCondition[];
	logic: "and" | "or";
	confidence: number;
}

export interface SignalCondition {
	indicator: string;
	operator:
		| "less_than"
		| "greater_than"
		| "equals"
		| "crossover_above"
		| "crossover_below"
		| "greater_than_or_equal"
		| "less_than_or_equal";
	value: number | string;
	description: string;
}

export interface Signal {
	id: string;
	strategyId: string;
	type: "entry" | "exit";
	side: "long" | "short";
	confidence: number;
	timestamp: number;
	price: number;
	volume?: number;
	indicators: Record<string, number>;
	metadata?: Record<string, any>;
}

export interface StrategyState {
	status: "stopped" | "running" | "paused" | "error";
	startTime: number | null;
	pauseTime: number | null;
	errorMessage?: string;
	totalCandles: number;
	totalSignals: number;
	lastUpdate: number;
}

export interface PerformanceMetrics {
	strategyId: string;
	totalSignals: number;
	entrySignals: number;
	exitSignals: number;
	longSignals: number;
	shortSignals: number;
	avgConfidence: number;
	lastSignalTime: number | null;
	uptime: number;
	candlesProcessed: number;
}

export interface IndicatorValue {
	timestamp: number;
	value: number;
}

export interface IndicatorResult {
	id: string;
	name: string;
	type: string;
	currentValue: number;
	history: IndicatorValue[];
}

export interface RiskConfig {
	position_size_type: string;
	risk_per_trade: number;
	stop_loss_percent: number;
	take_profit_percent: number;
	trailing_stop: boolean;
	max_drawdown_percent: number;
}

export interface StrategyExecutionEvent {
	type:
		| "strategy-started"
		| "strategy-stopped"
		| "strategy-paused"
		| "signal-generated"
		| "indicator-updated"
		| "error";
	strategyId: string;
	timestamp: number;
	data: any;
}
