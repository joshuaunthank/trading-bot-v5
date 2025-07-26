/**
 * Signal Evaluator - Trading Signal Generation Logic
 *
 * This class evaluates trading signals based on strategy rules and indicator values.
 * It supports complex conditions with AND/OR logic and crossover detection.
 */

import { SignalRule, SignalCondition, Signal, IndicatorValue } from "./types";

export class SignalEvaluator {
	private signalRules: SignalRule[];
	private indicatorValues: Map<string, number> = new Map();
	private indicatorHistory: Map<string, IndicatorValue[]> = new Map();
	private strategyId: string;
	private currentPrice: number = 0;
	private currentTimestamp: number = 0;

	constructor(strategyId: string, signalRules: SignalRule[]) {
		this.strategyId = strategyId;
		this.signalRules = signalRules;
	}

	/**
	 * Update indicator values and history
	 */
	public updateIndicators(
		indicatorId: string,
		value: number,
		timestamp: number,
		history?: IndicatorValue[]
	): void {
		this.indicatorValues.set(indicatorId, value);

		if (history) {
			this.indicatorHistory.set(indicatorId, history);
		} else {
			// Add to existing history
			if (!this.indicatorHistory.has(indicatorId)) {
				this.indicatorHistory.set(indicatorId, []);
			}
			const existingHistory = this.indicatorHistory.get(indicatorId)!;
			existingHistory.push({ timestamp, value });

			// Keep only last 1000 values
			if (existingHistory.length > 1000) {
				existingHistory.shift();
			}
		}
	}

	/**
	 * Set current market price and timestamp
	 */
	public updateMarketData(price: number, timestamp: number): void {
		this.currentPrice = price;
		this.currentTimestamp = timestamp;
	}

	/**
	 * Evaluate all signal rules and return generated signals
	 */
	public evaluateSignals(): Signal[] {
		const signals: Signal[] = [];

		for (const rule of this.signalRules) {
			if (this.evaluateRule(rule)) {
				const signal: Signal = {
					id: rule.id,
					strategyId: this.strategyId,
					type: rule.type,
					side: rule.side,
					confidence: rule.confidence,
					timestamp: this.currentTimestamp,
					price: this.currentPrice,
					indicators: Object.fromEntries(this.indicatorValues),
					metadata: {
						ruleName: rule.name,
						ruleDescription: rule.description,
					},
				};

				signals.push(signal);
				console.log(
					`[Signal] Generated: ${signal.side} ${signal.type} for ${this.strategyId} at ${signal.price}`
				);
			}
		}

		return signals;
	}

	/**
	 * Evaluate a single signal rule
	 */
	private evaluateRule(rule: SignalRule): boolean {
		if (rule.logic === "and") {
			return rule.conditions.every((condition) =>
				this.evaluateCondition(condition)
			);
		} else if (rule.logic === "or") {
			return rule.conditions.some((condition) =>
				this.evaluateCondition(condition)
			);
		}

		return false;
	}

	/**
	 * Evaluate a single condition
	 */
	private evaluateCondition(condition: SignalCondition): boolean {
		const indicatorValue = this.indicatorValues.get(condition.indicator);

		if (indicatorValue === undefined) {
			console.warn(
				`[Signal] Indicator ${condition.indicator} not found for condition evaluation`
			);
			return false;
		}

		let targetValue: number;

		// Handle different value types
		if (typeof condition.value === "string") {
			// Reference to another indicator
			const refValue = this.indicatorValues.get(condition.value);
			if (refValue === undefined) {
				console.warn(
					`[Signal] Reference indicator ${condition.value} not found`
				);
				return false;
			}
			targetValue = refValue;
		} else {
			targetValue = condition.value;
		}

		// Handle crossover conditions
		if (
			condition.operator === "crossover_above" ||
			condition.operator === "crossover_below"
		) {
			return this.evaluateCrossover(condition, indicatorValue, targetValue);
		}

		// Handle standard comparisons
		switch (condition.operator) {
			case "greater_than":
				return indicatorValue > targetValue;
			case "less_than":
				return indicatorValue < targetValue;
			case "greater_than_or_equal":
				return indicatorValue >= targetValue;
			case "less_than_or_equal":
				return indicatorValue <= targetValue;
			case "equals":
				return Math.abs(indicatorValue - targetValue) < 0.0001; // Handle floating point precision
			default:
				console.warn(`[Signal] Unknown operator: ${condition.operator}`);
				return false;
		}
	}

	/**
	 * Evaluate crossover conditions
	 */
	private evaluateCrossover(
		condition: SignalCondition,
		currentValue: number,
		targetValue: number
	): boolean {
		const history = this.indicatorHistory.get(condition.indicator);
		if (!history || history.length < 2) {
			return false; // Not enough history for crossover
		}

		const lookback = 1; // Fixed lookback of 1 for crossover
		if (history.length < lookback + 1) {
			return false;
		}

		const previousValue = history[history.length - 1 - lookback].value;

		if (condition.operator === "crossover_above") {
			// Current value crosses above target value
			return previousValue <= targetValue && currentValue > targetValue;
		} else if (condition.operator === "crossover_below") {
			// Current value crosses below target value
			return previousValue >= targetValue && currentValue < targetValue;
		}

		return false;
	}

	/**
	 * Get current indicator values
	 */
	public getIndicatorValues(): Map<string, number> {
		return new Map(this.indicatorValues);
	}

	/**
	 * Get indicator history
	 */
	public getIndicatorHistory(indicatorId: string): IndicatorValue[] {
		return this.indicatorHistory.get(indicatorId) || [];
	}

	/**
	 * Add or update a signal rule
	 */
	public addSignalRule(rule: SignalRule): void {
		const existingIndex = this.signalRules.findIndex((r) => r.id === rule.id);
		if (existingIndex >= 0) {
			this.signalRules[existingIndex] = rule;
		} else {
			this.signalRules.push(rule);
		}
	}

	/**
	 * Remove a signal rule
	 */
	public removeSignalRule(ruleId: string): void {
		this.signalRules = this.signalRules.filter((rule) => rule.id !== ruleId);
	}

	/**
	 * Get all signal rules
	 */
	public getSignalRules(): SignalRule[] {
		return [...this.signalRules];
	}

	/**
	 * Clear all indicator data
	 */
	public reset(): void {
		this.indicatorValues.clear();
		this.indicatorHistory.clear();
		this.currentPrice = 0;
		this.currentTimestamp = 0;
	}

	/**
	 * Get debug information about current state
	 */
	public getDebugInfo(): any {
		return {
			strategyId: this.strategyId,
			rulesCount: this.signalRules.length,
			indicatorsCount: this.indicatorValues.size,
			currentPrice: this.currentPrice,
			currentTimestamp: this.currentTimestamp,
			indicatorValues: Object.fromEntries(this.indicatorValues),
			rules: this.signalRules.map((rule) => ({
				id: rule.id,
				name: rule.name,
				type: rule.type,
				side: rule.side,
				conditionsCount: rule.conditions.length,
			})),
		};
	}
}
