/**
 * Enhanced Strategy Runner with Overtrading Prevention
 * Integrates SignalManager with strategy execution
 */

import { SignalManager, Signal, OvertradingConfig } from "./SignalManager";

export interface StrategySignal {
	id: string;
	timestamp: number;
	side: "long" | "short";
	type: "entry" | "exit";
	confidence: number;
	price: number;
	volume?: number;
	indicators: Record<string, number>;
	metadata?: Record<string, any>;
}

export interface EnhancedStrategyConfig {
	strategyId: string;
	overtradingProtection: OvertradingConfig;
	signalFiltering: {
		enableTrendConfirmation: boolean;
		requireVolumeConfirmation: boolean;
		minimumIndicatorAgreement: number; // 0-1, percentage of indicators that must agree
	};
}

export class EnhancedStrategyRunner {
	private signalManager: SignalManager;
	private config: EnhancedStrategyConfig;
	private activePosition: "long" | "short" | null = null;

	constructor(config: EnhancedStrategyConfig) {
		this.config = config;
		this.signalManager = new SignalManager(config.overtradingProtection);
	}

	/**
	 * Process strategy signals with enhanced filtering
	 */
	processStrategySignal(strategySignal: StrategySignal): Signal | null {
		// Convert strategy signal to signal manager format
		const signal: Signal = {
			id: strategySignal.id,
			timestamp: strategySignal.timestamp,
			side: strategySignal.side,
			type: strategySignal.type,
			strength: this.calculateSignalStrength(strategySignal),
			price: strategySignal.price,
			volume: strategySignal.volume,
			indicators: strategySignal.indicators,
		};

		// Additional strategy-level filtering
		if (!this.passesStrategyFilters(strategySignal)) {
			console.log(`🔍 Signal rejected at strategy level`);
			return null;
		}

		// Process through signal manager (overtrading protection)
		const filteredSignal = this.signalManager.processSignal(signal);

		// Update position tracking
		if (filteredSignal) {
			this.updatePositionState(filteredSignal);
		}

		return filteredSignal;
	}

	/**
	 * Calculate overall signal strength from multiple factors
	 */
	private calculateSignalStrength(strategySignal: StrategySignal): number {
		let strength = strategySignal.confidence;

		// Enhance strength calculation with additional factors
		const indicators = strategySignal.indicators;

		// Factor 1: Indicator agreement (how many indicators support the signal)
		if (this.config.signalFiltering.minimumIndicatorAgreement > 0) {
			const agreementScore = this.calculateIndicatorAgreement(
				indicators,
				strategySignal.side
			);
			strength *= agreementScore;
		}

		// Factor 2: Volume confirmation
		if (
			this.config.signalFiltering.requireVolumeConfirmation &&
			strategySignal.volume
		) {
			const volumeScore = this.calculateVolumeScore(strategySignal.volume);
			strength *= volumeScore;
		}

		// Factor 3: Trend confirmation
		if (this.config.signalFiltering.enableTrendConfirmation) {
			const trendScore = this.calculateTrendAlignment(
				indicators,
				strategySignal.side
			);
			strength *= trendScore;
		}

		return Math.min(1.0, Math.max(0.0, strength));
	}

	/**
	 * Check if signal passes strategy-level filters
	 */
	private passesStrategyFilters(signal: StrategySignal): boolean {
		// Don't open opposite position if already in a trade
		if (
			this.activePosition &&
			signal.type === "entry" &&
			signal.side !== this.activePosition
		) {
			console.log(
				`📍 Cannot open ${signal.side} position while holding ${this.activePosition}`
			);
			return false;
		}

		// Don't exit if no position
		if (!this.activePosition && signal.type === "exit") {
			console.log(`📍 Cannot exit: no active position`);
			return false;
		}

		// Exit signal must match current position
		if (
			this.activePosition &&
			signal.type === "exit" &&
			signal.side !== this.activePosition
		) {
			console.log(
				`📍 Exit signal side ${signal.side} doesn't match position ${this.activePosition}`
			);
			return false;
		}

		return true;
	}

	/**
	 * Calculate how well indicators agree with the signal direction
	 */
	private calculateIndicatorAgreement(
		indicators: Record<string, number>,
		side: "long" | "short"
	): number {
		const indicatorNames = Object.keys(indicators);
		if (indicatorNames.length === 0) return 1.0;

		let agreements = 0;
		let total = 0;

		indicatorNames.forEach((name) => {
			const value = indicators[name];
			if (typeof value !== "number" || isNaN(value)) return;

			total++;

			// Simplified agreement logic - can be enhanced per indicator type
			if (name.toLowerCase().includes("rsi")) {
				// RSI agreement: oversold supports long, overbought supports short
				if (
					(side === "long" && value < 30) ||
					(side === "short" && value > 70)
				) {
					agreements++;
				}
			} else if (name.toLowerCase().includes("macd")) {
				// MACD agreement: positive supports long, negative supports short
				if ((side === "long" && value > 0) || (side === "short" && value < 0)) {
					agreements++;
				}
			} else if (
				name.toLowerCase().includes("ema") ||
				name.toLowerCase().includes("sma")
			) {
				// Moving average agreement: price above MA supports long, below supports short
				// This would need current price context - simplified for now
				agreements += 0.5; // Neutral weight
			} else {
				// Default neutral weight for unknown indicators
				agreements += 0.5;
			}
		});

		const agreementRatio = total > 0 ? agreements / total : 1.0;

		// Only proceed if agreement meets minimum threshold
		return agreementRatio >=
			this.config.signalFiltering.minimumIndicatorAgreement
			? agreementRatio
			: 0;
	}

	/**
	 * Calculate volume-based signal strength modifier
	 */
	private calculateVolumeScore(volume: number): number {
		// This should use historical volume context
		// For now, return neutral score
		// TODO: Implement volume percentile calculation
		return 1.0;
	}

	/**
	 * Calculate trend alignment score
	 */
	private calculateTrendAlignment(
		indicators: Record<string, number>,
		side: "long" | "short"
	): number {
		// Look for trend indicators (EMAs, SMAs)
		const trendIndicators = Object.entries(indicators).filter(
			([name]) =>
				name.toLowerCase().includes("ema") || name.toLowerCase().includes("sma")
		);

		if (trendIndicators.length === 0) return 1.0;

		// Simplified trend alignment - would need price context for proper implementation
		// TODO: Implement proper trend analysis with price/MA relationships
		return 1.0;
	}

	/**
	 * Update internal position tracking
	 */
	private updatePositionState(signal: Signal): void {
		if (signal.type === "entry") {
			this.activePosition = signal.side;
			console.log(`📊 Position opened: ${signal.side} @ ${signal.price}`);
		} else if (signal.type === "exit") {
			console.log(
				`📊 Position closed: ${this.activePosition} @ ${signal.price}`
			);
			this.activePosition = null;
		}
	}

	/**
	 * Get current trading statistics
	 */
	getStatistics() {
		return {
			...this.signalManager.getStatistics(),
			activePosition: this.activePosition,
			strategyId: this.config.strategyId,
		};
	}

	/**
	 * Update configuration
	 */
	updateConfig(newConfig: Partial<EnhancedStrategyConfig>): void {
		this.config = { ...this.config, ...newConfig };
		if (newConfig.overtradingProtection) {
			this.signalManager.updateConfig(newConfig.overtradingProtection);
		}
	}

	/**
	 * Reset strategy state
	 */
	reset(): void {
		this.signalManager.reset();
		this.activePosition = null;
	}
}
