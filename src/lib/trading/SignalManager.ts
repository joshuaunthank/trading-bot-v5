/**
 * Signal Manager with Overtrading Prevention
 * Handles signal filtering, cooldowns, and trade frequency limits
 */

export interface TradeRecord {
	timestamp: number;
	side: "long" | "short";
	type: "entry" | "exit";
	price: number;
	volume?: number;
	signalStrength?: number;
}

export interface OvertradingConfig {
	enabled: boolean;
	signalCooldownMinutes: number;
	maxTradesPerHour: number;
	maxTradesPerDay: number;
	minTimeBetweenEntries: number; // seconds
	minTimeBetweenExits: number; // seconds
	signalStrengthThreshold: number;
	volumeSpikeDetection: {
		enabled: boolean;
		minVolumeMultiplier: number;
	};
}

export interface Signal {
	id: string;
	timestamp: number;
	side: "long" | "short";
	type: "entry" | "exit";
	strength: number; // 0-1 signal confidence
	price: number;
	volume?: number;
	indicators: Record<string, number>;
}

export class SignalManager {
	private tradeHistory: TradeRecord[] = [];
	private lastSignalTime: Record<string, number> = {}; // Track by signal type
	private config: OvertradingConfig;

	constructor(config: OvertradingConfig) {
		this.config = config;
		this.cleanupOldRecords();
	}

	/**
	 * Filter incoming signal through overtrading protection rules
	 */
	processSignal(signal: Signal): Signal | null {
		if (!this.config.enabled) {
			return signal;
		}

		// 1. Check signal strength threshold
		if (signal.strength < this.config.signalStrengthThreshold) {
			console.log(
				`🚫 Signal rejected: strength ${signal.strength} < threshold ${this.config.signalStrengthThreshold}`
			);
			return null;
		}

		// 2. Check cooldown period
		if (this.isInCooldown(signal)) {
			console.log(`⏰ Signal rejected: cooldown period active`);
			return null;
		}

		// 3. Check frequency limits
		if (this.exceedsFrequencyLimits(signal)) {
			console.log(`📊 Signal rejected: frequency limits exceeded`);
			return null;
		}

		// 4. Check minimum time between trades
		if (this.violatesMinimumSpacing(signal)) {
			console.log(`⏱️ Signal rejected: minimum spacing violation`);
			return null;
		}

		// 5. Check volume spike (helps avoid low-liquidity periods)
		if (
			this.config.volumeSpikeDetection.enabled &&
			!this.hasValidVolume(signal)
		) {
			console.log(`📉 Signal rejected: insufficient volume`);
			return null;
		}

		// Signal passed all filters - record it
		this.recordSignal(signal);
		console.log(
			`✅ Signal accepted: ${signal.side} ${signal.type} @ ${signal.price}`
		);

		return signal;
	}

	/**
	 * Check if signal is within cooldown period
	 */
	private isInCooldown(signal: Signal): boolean {
		const signalKey = `${signal.side}_${signal.type}`;
		const lastTime = this.lastSignalTime[signalKey];

		if (!lastTime) return false;

		const cooldownMs = this.config.signalCooldownMinutes * 60 * 1000;
		return signal.timestamp - lastTime < cooldownMs;
	}

	/**
	 * Check if signal would exceed hourly/daily frequency limits
	 */
	private exceedsFrequencyLimits(signal: Signal): boolean {
		const now = signal.timestamp;
		const oneHourAgo = now - 60 * 60 * 1000;
		const oneDayAgo = now - 24 * 60 * 60 * 1000;

		// Count recent trades
		const recentHourTrades = this.tradeHistory.filter(
			(trade) => trade.timestamp > oneHourAgo
		).length;

		const recentDayTrades = this.tradeHistory.filter(
			(trade) => trade.timestamp > oneDayAgo
		).length;

		return (
			recentHourTrades >= this.config.maxTradesPerHour ||
			recentDayTrades >= this.config.maxTradesPerDay
		);
	}

	/**
	 * Check minimum time spacing between entry/exit signals
	 */
	private violatesMinimumSpacing(signal: Signal): boolean {
		const minSpacing =
			signal.type === "entry"
				? this.config.minTimeBetweenEntries * 1000
				: this.config.minTimeBetweenExits * 1000;

		const lastSameType = this.tradeHistory
			.filter((trade) => trade.type === signal.type)
			.sort((a, b) => b.timestamp - a.timestamp)[0];

		if (!lastSameType) return false;

		return signal.timestamp - lastSameType.timestamp < minSpacing;
	}

	/**
	 * Check if current volume supports the trade
	 */
	private hasValidVolume(signal: Signal): boolean {
		if (!signal.volume) return true; // Skip if no volume data

		// Calculate average volume from recent trades
		const recentTrades = this.tradeHistory.slice(-20);
		if (recentTrades.length === 0) return true;

		const avgVolume =
			recentTrades.reduce((sum, trade) => sum + (trade.volume || 0), 0) /
			recentTrades.length;

		const requiredVolume =
			avgVolume * this.config.volumeSpikeDetection.minVolumeMultiplier;
		return signal.volume >= requiredVolume;
	}

	/**
	 * Record processed signal for tracking
	 */
	private recordSignal(signal: Signal): void {
		const record: TradeRecord = {
			timestamp: signal.timestamp,
			side: signal.side,
			type: signal.type,
			price: signal.price,
			volume: signal.volume,
			signalStrength: signal.strength,
		};

		this.tradeHistory.push(record);
		this.lastSignalTime[`${signal.side}_${signal.type}`] = signal.timestamp;

		// Keep history manageable
		if (this.tradeHistory.length > 1000) {
			this.tradeHistory = this.tradeHistory.slice(-500);
		}
	}

	/**
	 * Clean up old records to prevent memory bloat
	 */
	private cleanupOldRecords(): void {
		const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
		this.tradeHistory = this.tradeHistory.filter(
			(trade) => trade.timestamp > cutoff
		);
	}

	/**
	 * Get trading statistics for monitoring
	 */
	getStatistics() {
		const now = Date.now();
		const oneHour = 60 * 60 * 1000;
		const oneDay = 24 * oneHour;

		const hourlyTrades = this.tradeHistory.filter(
			(trade) => trade.timestamp > now - oneHour
		).length;

		const dailyTrades = this.tradeHistory.filter(
			(trade) => trade.timestamp > now - oneDay
		).length;

		return {
			totalTrades: this.tradeHistory.length,
			tradesLastHour: hourlyTrades,
			tradesLastDay: dailyTrades,
			hourlyLimit: this.config.maxTradesPerHour,
			dailyLimit: this.config.maxTradesPerDay,
			utilizationHourly: (hourlyTrades / this.config.maxTradesPerHour) * 100,
			utilizationDaily: (dailyTrades / this.config.maxTradesPerDay) * 100,
		};
	}

	/**
	 * Update configuration
	 */
	updateConfig(newConfig: Partial<OvertradingConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}

	/**
	 * Reset state (useful for testing or strategy restarts)
	 */
	reset(): void {
		this.tradeHistory = [];
		this.lastSignalTime = {};
	}
}
