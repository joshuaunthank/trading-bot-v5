import { EventEmitter } from "events";
import { OHLCVCandle } from "../types/index";

export interface SubscriptionFilter {
	symbol: string;
	timeframe: string;
}

/**
 * Data Distributor - Efficiently routes market data to relevant strategies
 *
 * Responsibilities:
 * - Manage strategy subscriptions by symbol/timeframe
 * - Filter and route incoming candle data
 * - Minimize data processing overhead
 * - Handle subscription lifecycle
 */
export class DataDistributor extends EventEmitter {
	private subscriptions: Map<string, SubscriptionFilter> = new Map();

	constructor() {
		super();
		console.log("[Data Distributor] Initialized");
	}

	/**
	 * Subscribe a strategy to receive data for specific symbol/timeframe
	 */
	subscribeStrategy(strategyId: string, filter: SubscriptionFilter): void {
		this.subscriptions.set(strategyId, filter);
		console.log(
			`[Data Distributor] Strategy ${strategyId} subscribed to ${filter.symbol}/${filter.timeframe}`
		);
		this.emit("subscriptionAdded", { strategyId, filter });
	}

	/**
	 * Unsubscribe a strategy from data distribution
	 */
	unsubscribeStrategy(strategyId: string): void {
		const filter = this.subscriptions.get(strategyId);
		if (filter) {
			this.subscriptions.delete(strategyId);
			console.log(`[Data Distributor] Strategy ${strategyId} unsubscribed`);
			this.emit("subscriptionRemoved", { strategyId, filter });
		}
	}

	/**
	 * Distribute incoming candle data to relevant strategies
	 */
	distributeCandle(candle: OHLCVCandle): void {
		// For now, we'll assume candle has symbol/timeframe metadata
		// In a real implementation, this would come from the WebSocket context
		const candleWithMeta = candle as OHLCVCandle & {
			symbol?: string;
			timeframe?: string;
		};

		for (const [strategyId, filter] of this.subscriptions) {
			// Check if this candle matches the strategy's subscription
			if (this.filterForStrategy(candleWithMeta, filter)) {
				// Emit candle data to the specific strategy
				this.emit(`data:${strategyId}`, candle);
			}
		}
	}

	/**
	 * Check if a candle matches a strategy's subscription filter
	 */
	private filterForStrategy(
		candle: OHLCVCandle & { symbol?: string; timeframe?: string },
		filter: SubscriptionFilter
	): boolean {
		// For now, return true - we'll implement proper filtering when we have symbol/timeframe metadata
		// TODO: Implement proper symbol/timeframe filtering when WebSocket provides this data
		return true;
	}

	/**
	 * Get current subscription status
	 */
	getStatus() {
		const subscriptionsBySymbol = new Map<string, number>();

		for (const filter of this.subscriptions.values()) {
			const key = `${filter.symbol}/${filter.timeframe}`;
			subscriptionsBySymbol.set(key, (subscriptionsBySymbol.get(key) || 0) + 1);
		}

		return {
			totalSubscriptions: this.subscriptions.size,
			subscriptionsBySymbol: Object.fromEntries(subscriptionsBySymbol),
			activeStrategies: Array.from(this.subscriptions.keys()),
		};
	}

	/**
	 * Get all active subscriptions
	 */
	getSubscriptions(): { strategyId: string; filter: SubscriptionFilter }[] {
		return Array.from(this.subscriptions.entries()).map(
			([strategyId, filter]) => ({
				strategyId,
				filter,
			})
		);
	}
}
