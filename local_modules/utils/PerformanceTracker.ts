import { EventEmitter } from "events";

export interface PerformanceMetrics {
	totalReturn: number;
	winRate: number;
	sharpeRatio: number;
	maxDrawdown: number;
	totalTrades: number;
	currentPosition: "long" | "short" | "none";
	unrealizedPnL: number;
	realizedPnL: number;
}

export interface TradeRecord {
	id: string;
	strategyId: string;
	timestamp: number;
	type: "entry" | "exit";
	side: "long" | "short";
	price: number;
	quantity: number;
	pnl?: number;
}

/**
 * Performance Tracker - Monitors and calculates strategy performance metrics
 *
 * Responsibilities:
 * - Track individual strategy performance
 * - Calculate real-time metrics (P&L, win rate, Sharpe ratio)
 * - Maintain trade history
 * - Risk monitoring and alerts
 */
export class PerformanceTracker extends EventEmitter {
	private strategyMetrics: Map<string, PerformanceMetrics> = new Map();
	private tradeHistory: Map<string, TradeRecord[]> = new Map();
	private positions: Map<
		string,
		{ side: "long" | "short" | "none"; quantity: number; entryPrice?: number }
	> = new Map();

	constructor() {
		super();
		console.log("[Performance Tracker] Initialized");
	}

	/**
	 * Start tracking a strategy's performance
	 */
	trackStrategy(strategyId: string): void {
		if (!this.strategyMetrics.has(strategyId)) {
			const initialMetrics: PerformanceMetrics = {
				totalReturn: 0,
				winRate: 0,
				sharpeRatio: 0,
				maxDrawdown: 0,
				totalTrades: 0,
				currentPosition: "none",
				unrealizedPnL: 0,
				realizedPnL: 0,
			};

			this.strategyMetrics.set(strategyId, initialMetrics);
			this.tradeHistory.set(strategyId, []);
			this.positions.set(strategyId, { side: "none", quantity: 0 });

			console.log(
				`[Performance Tracker] Started tracking strategy: ${strategyId}`
			);
		}
	}

	/**
	 * Stop tracking a strategy
	 */
	untrackStrategy(strategyId: string): void {
		this.strategyMetrics.delete(strategyId);
		this.tradeHistory.delete(strategyId);
		this.positions.delete(strategyId);
		console.log(
			`[Performance Tracker] Stopped tracking strategy: ${strategyId}`
		);
	}

	/**
	 * Record a trade for a strategy
	 */
	recordTrade(trade: TradeRecord): void {
		const trades = this.tradeHistory.get(trade.strategyId);
		if (!trades) {
			console.warn(
				`[Performance Tracker] Strategy ${trade.strategyId} not being tracked`
			);
			return;
		}

		// Add trade to history
		trades.push(trade);

		// Update position
		this.updatePosition(trade);

		// Recalculate metrics
		this.calculateMetrics(trade.strategyId);

		console.log(
			`[Performance Tracker] Recorded ${trade.type} trade for ${trade.strategyId}: ${trade.side} ${trade.quantity} at ${trade.price}`
		);
		this.emit("tradeRecorded", trade);
	}

	/**
	 * Update current position for a strategy
	 */
	private updatePosition(trade: TradeRecord): void {
		const position = this.positions.get(trade.strategyId);
		if (!position) return;

		if (trade.type === "entry") {
			position.side = trade.side;
			position.quantity = trade.quantity;
			position.entryPrice = trade.price;
		} else if (trade.type === "exit") {
			// Calculate realized P&L
			if (position.entryPrice) {
				const pnl =
					trade.side === "long"
						? (trade.price - position.entryPrice) * position.quantity
						: (position.entryPrice - trade.price) * position.quantity;

				trade.pnl = pnl;
			}

			// Close position
			position.side = "none";
			position.quantity = 0;
			position.entryPrice = undefined;
		}
	}

	/**
	 * Calculate performance metrics for a strategy
	 */
	private calculateMetrics(strategyId: string): void {
		const metrics = this.strategyMetrics.get(strategyId);
		const trades = this.tradeHistory.get(strategyId);
		const position = this.positions.get(strategyId);

		if (!metrics || !trades || !position) return;

		// Calculate basic metrics
		const completedTrades = trades.filter(
			(t) => t.type === "exit" && t.pnl !== undefined
		);
		metrics.totalTrades = completedTrades.length;

		if (completedTrades.length > 0) {
			// Total return
			const totalPnL = completedTrades.reduce(
				(sum, trade) => sum + (trade.pnl || 0),
				0
			);
			metrics.realizedPnL = totalPnL;
			metrics.totalReturn = totalPnL; // Simplified - would need initial capital in real implementation

			// Win rate
			const winningTrades = completedTrades.filter(
				(trade) => (trade.pnl || 0) > 0
			);
			metrics.winRate = winningTrades.length / completedTrades.length;

			// Max drawdown (simplified calculation)
			let runningPnL = 0;
			let peak = 0;
			let maxDrawdown = 0;

			for (const trade of completedTrades) {
				runningPnL += trade.pnl || 0;
				if (runningPnL > peak) {
					peak = runningPnL;
				}
				const drawdown = peak - runningPnL;
				if (drawdown > maxDrawdown) {
					maxDrawdown = drawdown;
				}
			}
			metrics.maxDrawdown = maxDrawdown;

			// Sharpe ratio (simplified - would need risk-free rate and proper calculation)
			const returns = completedTrades.map((t) => t.pnl || 0);
			const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
			const variance =
				returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
				returns.length;
			const stdDev = Math.sqrt(variance);
			metrics.sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
		}

		// Current position
		metrics.currentPosition = position.side;

		// Update unrealized P&L (would need current market price)
		metrics.unrealizedPnL = 0; // Placeholder
	}

	/**
	 * Get performance metrics for a strategy
	 */
	getPerformance(strategyId: string): PerformanceMetrics | null {
		return this.strategyMetrics.get(strategyId) || null;
	}

	/**
	 * Get trade history for a strategy
	 */
	getTradeHistory(strategyId: string): TradeRecord[] {
		return this.tradeHistory.get(strategyId) || [];
	}

	/**
	 * Record a signal generated by a strategy
	 */
	recordSignal(strategyId: string, signal: any): void {
		// For now, just log the signal
		// In future phases, this would be used for signal analysis and tracking
		console.log(
			`[Performance Tracker] Signal recorded for ${strategyId}: ${signal.type} ${signal.side}`
		);
		this.emit("signalRecorded", { strategyId, signal });
	}

	/**
	 * Get current position for a strategy
	 */
	getCurrentPosition(strategyId: string) {
		return this.positions.get(strategyId) || { side: "none", quantity: 0 };
	}

	/**
	 * Update unrealized P&L based on current market price
	 */
	updateUnrealizedPnL(strategyId: string, currentPrice: number): void {
		const metrics = this.strategyMetrics.get(strategyId);
		const position = this.positions.get(strategyId);

		if (
			!metrics ||
			!position ||
			position.side === "none" ||
			!position.entryPrice
		) {
			return;
		}

		const unrealizedPnL =
			position.side === "long"
				? (currentPrice - position.entryPrice) * position.quantity
				: (position.entryPrice - currentPrice) * position.quantity;

		metrics.unrealizedPnL = unrealizedPnL;
	}

	/**
	 * Get performance summary across all tracked strategies
	 */
	getOverallPerformance() {
		const allMetrics = Array.from(this.strategyMetrics.values());

		if (allMetrics.length === 0) {
			return {
				totalStrategies: 0,
				totalReturn: 0,
				averageWinRate: 0,
				totalTrades: 0,
			};
		}

		return {
			totalStrategies: allMetrics.length,
			totalReturn: allMetrics.reduce((sum, m) => sum + m.totalReturn, 0),
			averageWinRate:
				allMetrics.reduce((sum, m) => sum + m.winRate, 0) / allMetrics.length,
			totalTrades: allMetrics.reduce((sum, m) => sum + m.totalTrades, 0),
		};
	}
}
