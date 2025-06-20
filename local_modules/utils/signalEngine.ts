/**
 * Signal Evaluation Engine for Multi-Strategy Trading
 *
 * This module provides signal generation logic based on technical indicators
 * and configurable trading rules.
 */

import { OHLCVCandle } from "../types/index";
import { IndicatorResult } from "./indicators";

export interface Signal {
	id: string;
	timestamp: number;
	type: "entry" | "exit";
	side: "long" | "short";
	confidence: number;
	price: number;
	reason: string;
	metadata?: any;
}

export interface SignalRule {
	id: string;
	name: string;
	type: "entry" | "exit";
	conditions: SignalCondition[];
	logic: "AND" | "OR"; // How to combine conditions
	side?: "long" | "short"; // For entry signals
	confidence?: number; // Base confidence level
}

export interface SignalCondition {
	indicator: string; // Indicator ID
	operator: "gt" | "lt" | "eq" | "gte" | "lte" | "crossover" | "crossunder";
	value: number | string; // Value to compare against, or another indicator ID
	lookback?: number; // For crossover/crossunder conditions
}

/**
 * Signal Evaluator - Generates trading signals based on indicator values and rules
 */
export class SignalEvaluator {
	private rules: SignalRule[];
	private indicatorHistory: Map<string, IndicatorResult[]> = new Map();
	private maxHistoryLength: number = 100;

	constructor(rules: SignalRule[] = []) {
		this.rules = rules;
		console.log(`[Signal Evaluator] Initialized with ${rules.length} rules`);
	}

	/**
	 * Update with new indicator results and evaluate signals
	 */
	evaluate(
		candle: OHLCVCandle,
		indicators: Map<string, IndicatorResult>
	): Signal[] {
		// Update indicator history
		this.updateIndicatorHistory(indicators);

		const signals: Signal[] = [];

		// Evaluate each signal rule
		for (const rule of this.rules) {
			const signal = this.evaluateRule(rule, candle, indicators);
			if (signal) {
				signals.push(signal);
			}
		}

		return signals;
	}

	/**
	 * Update indicator history for crossover/trend analysis
	 */
	private updateIndicatorHistory(
		indicators: Map<string, IndicatorResult>
	): void {
		for (const [id, result] of indicators) {
			if (!this.indicatorHistory.has(id)) {
				this.indicatorHistory.set(id, []);
			}

			const history = this.indicatorHistory.get(id)!;
			history.push(result);

			// Maintain history length
			if (history.length > this.maxHistoryLength) {
				history.splice(0, history.length - this.maxHistoryLength);
			}
		}
	}

	/**
	 * Evaluate a single signal rule
	 */
	private evaluateRule(
		rule: SignalRule,
		candle: OHLCVCandle,
		indicators: Map<string, IndicatorResult>
	): Signal | null {
		// Check if all required indicators are available
		const requiredIndicators = this.getRequiredIndicators(rule);
		for (const indicatorId of requiredIndicators) {
			if (
				!indicators.has(indicatorId) ||
				indicators.get(indicatorId)!.value === null
			) {
				return null; // Not ready yet
			}
		}

		// Evaluate all conditions
		const conditionResults = rule.conditions.map((condition) =>
			this.evaluateCondition(condition, indicators)
		);

		// Apply logic (AND/OR)
		let ruleMatches: boolean;
		if (rule.logic === "AND") {
			ruleMatches = conditionResults.every((result) => result);
		} else {
			ruleMatches = conditionResults.some((result) => result);
		}

		if (!ruleMatches) {
			return null;
		}

		// Generate signal
		const signal: Signal = {
			id: `${rule.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			timestamp: candle.timestamp,
			type: rule.type,
			side: rule.side || "long",
			confidence: rule.confidence || 0.5,
			price: candle.close,
			reason: this.generateReason(rule, indicators),
			metadata: {
				ruleId: rule.id,
				ruleName: rule.name,
				indicators: this.getIndicatorSnapshot(requiredIndicators, indicators),
			},
		};

		console.log(
			`[Signal Evaluator] Generated signal: ${signal.type} ${signal.side} - ${signal.reason}`
		);
		return signal;
	}

	/**
	 * Evaluate a single condition
	 */
	private evaluateCondition(
		condition: SignalCondition,
		indicators: Map<string, IndicatorResult>
	): boolean {
		const indicator = indicators.get(condition.indicator);
		if (!indicator || indicator.value === null) {
			return false;
		}

		const indicatorValue = indicator.value;
		let compareValue: number;

		// Determine comparison value
		if (typeof condition.value === "string") {
			// Another indicator
			const otherIndicator = indicators.get(condition.value);
			if (!otherIndicator || otherIndicator.value === null) {
				return false;
			}
			compareValue = otherIndicator.value;
		} else {
			compareValue = condition.value;
		}

		// Evaluate based on operator
		switch (condition.operator) {
			case "gt":
				return indicatorValue > compareValue;
			case "lt":
				return indicatorValue < compareValue;
			case "gte":
				return indicatorValue >= compareValue;
			case "lte":
				return indicatorValue <= compareValue;
			case "eq":
				return Math.abs(indicatorValue - compareValue) < 0.0001;
			case "crossover":
				return this.checkCrossover(
					condition.indicator,
					compareValue,
					true,
					condition.lookback || 2
				);
			case "crossunder":
				return this.checkCrossover(
					condition.indicator,
					compareValue,
					false,
					condition.lookback || 2
				);
			default:
				return false;
		}
	}

	/**
	 * Check for crossover/crossunder conditions
	 */
	private checkCrossover(
		indicatorId: string,
		compareValue: number,
		isOver: boolean,
		lookback: number
	): boolean {
		const history = this.indicatorHistory.get(indicatorId);
		if (!history || history.length < lookback) {
			return false;
		}

		const currentValue = history[history.length - 1].value;
		const previousValue = history[history.length - 2].value;

		if (currentValue === null || previousValue === null) {
			return false;
		}

		if (isOver) {
			// Crossover: was below, now above
			return previousValue <= compareValue && currentValue > compareValue;
		} else {
			// Crossunder: was above, now below
			return previousValue >= compareValue && currentValue < compareValue;
		}
	}

	/**
	 * Get all required indicators for a rule
	 */
	private getRequiredIndicators(rule: SignalRule): string[] {
		const indicators = new Set<string>();

		for (const condition of rule.conditions) {
			indicators.add(condition.indicator);
			if (typeof condition.value === "string") {
				indicators.add(condition.value);
			}
		}

		return Array.from(indicators);
	}

	/**
	 * Generate human-readable reason for signal
	 */
	private generateReason(
		rule: SignalRule,
		indicators: Map<string, IndicatorResult>
	): string {
		const conditions = rule.conditions.map((condition) => {
			const indicator = indicators.get(condition.indicator);
			const value = indicator?.value?.toFixed(2) || "N/A";

			let compareStr: string;
			if (typeof condition.value === "string") {
				const otherIndicator = indicators.get(condition.value);
				compareStr = otherIndicator?.value?.toFixed(2) || "N/A";
			} else {
				compareStr = condition.value.toString();
			}

			return `${condition.indicator}(${value}) ${condition.operator} ${compareStr}`;
		});

		return `${rule.name}: ${conditions.join(` ${rule.logic} `)}`;
	}

	/**
	 * Get snapshot of indicator values for metadata
	 */
	private getIndicatorSnapshot(
		indicatorIds: string[],
		indicators: Map<string, IndicatorResult>
	): Record<string, number | null> {
		const snapshot: Record<string, number | null> = {};

		for (const id of indicatorIds) {
			const indicator = indicators.get(id);
			snapshot[id] = indicator?.value || null;
		}

		return snapshot;
	}

	/**
	 * Add a new signal rule
	 */
	addRule(rule: SignalRule): void {
		this.rules.push(rule);
		console.log(`[Signal Evaluator] Added rule: ${rule.name}`);
	}

	/**
	 * Remove a signal rule
	 */
	removeRule(ruleId: string): boolean {
		const initialLength = this.rules.length;
		this.rules = this.rules.filter((rule) => rule.id !== ruleId);
		return this.rules.length < initialLength;
	}

	/**
	 * Get all rules
	 */
	getRules(): SignalRule[] {
		return [...this.rules];
	}

	/**
	 * Clear indicator history
	 */
	reset(): void {
		this.indicatorHistory.clear();
		console.log("[Signal Evaluator] Reset indicator history");
	}
}

/**
 * Predefined signal rules for common trading strategies
 */
export function createCommonSignalRules(): SignalRule[] {
	return [
		// RSI Oversold/Overbought
		{
			id: "rsi_oversold_entry",
			name: "RSI Oversold Entry",
			type: "entry",
			side: "long",
			confidence: 0.7,
			logic: "AND",
			conditions: [{ indicator: "rsi_14", operator: "lt", value: 30 }],
		},
		{
			id: "rsi_overbought_entry",
			name: "RSI Overbought Entry",
			type: "entry",
			side: "short",
			confidence: 0.7,
			logic: "AND",
			conditions: [{ indicator: "rsi_14", operator: "gt", value: 70 }],
		},

		// EMA Crossover
		{
			id: "ema_crossover_long",
			name: "EMA Golden Cross",
			type: "entry",
			side: "long",
			confidence: 0.8,
			logic: "AND",
			conditions: [
				{ indicator: "ema_20", operator: "crossover", value: "ema_50" },
			],
		},
		{
			id: "ema_crossunder_short",
			name: "EMA Death Cross",
			type: "entry",
			side: "short",
			confidence: 0.8,
			logic: "AND",
			conditions: [
				{ indicator: "ema_20", operator: "crossunder", value: "ema_50" },
			],
		},

		// MACD Bullish/Bearish
		{
			id: "macd_bullish",
			name: "MACD Bullish Signal",
			type: "entry",
			side: "long",
			confidence: 0.75,
			logic: "AND",
			conditions: [
				{ indicator: "macd_default", operator: "crossover", value: 0 },
			],
		},
		{
			id: "macd_bearish",
			name: "MACD Bearish Signal",
			type: "entry",
			side: "short",
			confidence: 0.75,
			logic: "AND",
			conditions: [
				{ indicator: "macd_default", operator: "crossunder", value: 0 },
			],
		},

		// Combined Strategy
		{
			id: "combined_bullish",
			name: "Combined Bullish Entry",
			type: "entry",
			side: "long",
			confidence: 0.9,
			logic: "AND",
			conditions: [
				{ indicator: "rsi_14", operator: "lt", value: 50 },
				{ indicator: "ema_20", operator: "gt", value: "ema_50" },
				{ indicator: "macd_default", operator: "gt", value: 0 },
			],
		},
	];
}
