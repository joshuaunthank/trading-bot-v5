/**
 * Strategy related type definitions for frontend
 */

export interface Indicator {
	id: string;
	name: string;
	type: string;
	source: string;
	parameters: Record<string, any>;
	output_fields: string[];
	modifiers?: {
		lag?: { enabled: boolean; period: number };
		normalize?: { enabled: boolean };
		rolling?: { enabled: boolean; window: number };
	};
	enabled: boolean;
}

export interface Model {
	id: string;
	type: string;
	subtype: string;
	input_fields: string[];
	output_field: string;
	parameters: Record<string, any>;
	modifiers?: Record<string, any>;
	dependencies?: string[];
	training?: Record<string, any>;
	hyperparameters?: Record<string, any>;
	framework?: string;
	enabled: boolean;
}

export interface PostProcessing {
	id: string;
	type: string;
	model_type: string;
	input_fields: string[];
	output_field: string;
	parameters: Record<string, any>;
}

export interface Signal {
	id: string;
	type: "entry" | "exit";
	side: "long" | "short";
	expression: string;
	description?: string;
}

export interface Risk {
	position_size_type: string;
	risk_per_trade: number;
	stop_loss_percent: number;
	take_profit_percent: number;
	trailing_stop: boolean;
	max_drawdown_percent: number;
}

export interface Strategy {
	id: string;
	name: string;
	description: string;
	symbol: string;
	timeframe: string;
	tags: string[];
	enabled: boolean;
	indicators: Indicator[];
	models: Model[];
	postprocessing?: PostProcessing[];
	signals: Signal[];
	risk: Risk;
	version?: string;
	created_at?: string;
	last_updated?: string;
}

export interface StrategyIndicatorData {
	date: string;
	values: Record<string, number>;
}

export interface StrategySignal {
	date: string;
	type: "entry" | "exit";
	side: "long" | "short";
}

export interface StrategyDataState {
	strategyId: string;
	indicators: StrategyIndicatorData[];
	signals: StrategySignal[];
	isConnected: boolean;
	error: string | null;
}
