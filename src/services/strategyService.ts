// Strategy service for fetching detailed strategy data from the new API
// This handles the split between strategy summaries and detailed strategy data

export interface StrategyIndicator {
	id: string;
	type: string;
	parameters: Record<string, any>;
}

export interface StrategySignal {
	id: string;
	name: string;
	type: string;
	side: "long" | "short";
	confidence: number;
	logic: string;
	conditions: Array<{
		indicator: string;
		operator: string;
		value: any;
		lookback?: number;
	}>;
	description: string;
}

export interface StrategyRisk {
	position_size_type: string;
	risk_per_trade: number;
	stop_loss_percent: number;
	take_profit_percent: number;
	trailing_stop: boolean;
	max_drawdown_percent: number;
	overtrading_protection?: {
		enabled: boolean;
		signal_cooldown_minutes: number;
		max_trades_per_hour: number;
		max_trades_per_day: number;
		min_time_between_entries: number;
		min_time_between_exits: number;
		signal_strength_threshold: number;
		volume_spike_detection?: {
			enabled: boolean;
			min_volume_multiplier: number;
		};
	};
}

export interface DetailedStrategy {
	id: string;
	name: string;
	description: string;
	symbol: string;
	timeframe: string;
	tags: string[];
	enabled: boolean;
	meta: {
		description: string;
		tags: string[];
		version: string;
		created_at: string;
		last_updated: string;
	};
	indicators: StrategyIndicator[];
	models: any[];
	signals: StrategySignal[];
	risk: StrategyRisk;
	version: string;
	created_at: string;
	last_updated: string;
}

export interface StrategySummary {
	id: string;
	name: string;
	description: string;
	symbol: string;
	timeframe: string;
	tags?: string[];
	enabled: boolean;
}

class StrategyService {
	private baseUrl = "/api/v1";

	/**
	 * Fetch all strategy summaries (without detailed indicator data)
	 */
	async getStrategySummaries(): Promise<StrategySummary[]> {
		const response = await fetch(`${this.baseUrl}/strategies`);
		if (!response.ok) {
			throw new Error(`Failed to fetch strategies: ${response.statusText}`);
		}
		return response.json();
	}

	/**
	 * Fetch detailed strategy data including indicators, signals, and risk management
	 */
	async getDetailedStrategy(strategyId: string): Promise<DetailedStrategy> {
		const response = await fetch(`${this.baseUrl}/strategies/${strategyId}`);
		if (!response.ok) {
			throw new Error(
				`Failed to fetch strategy ${strategyId}: ${response.statusText}`
			);
		}
		return response.json();
	}

	/**
	 * Check if a strategy exists
	 */
	async strategyExists(strategyId: string): Promise<boolean> {
		try {
			const response = await fetch(`${this.baseUrl}/strategies/${strategyId}`, {
				method: "HEAD",
			});
			return response.ok;
		} catch {
			return false;
		}
	}
}

// Export singleton instance
export const strategyService = new StrategyService();
