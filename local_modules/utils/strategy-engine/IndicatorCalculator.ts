/**
 * Indicator Calculator - Real-time Technical Indicator Calculations
 *
 * This class handles real-time calculation of technical indicators using
 * the technicalindicators library. It maintains efficient history buffers
 * and provides streaming updates.
 */

import * as technicalindicators from "technicalindicators";
import { IndicatorParam, IndicatorValue, OHLCVCandle } from "./types";

export interface IndicatorCalculatorConfig {
	type: string;
	params: Record<string, any>;
	historySize?: number;
}

export class IndicatorCalculator {
	private type: string;
	private params: Record<string, any>;
	private history: number[] = [];
	private ohlcvHistory: OHLCVCandle[] = [];
	private currentValue: number = 0;
	private valueHistory: IndicatorValue[] = [];
	private maxHistorySize: number;
	private calculator: any;

	constructor(config: IndicatorCalculatorConfig) {
		this.type = config.type.toUpperCase();
		this.params = config.params;
		this.maxHistorySize = config.historySize || 1000;

		// Initialize the calculator based on type
		this.initializeCalculator();
	}

	private initializeCalculator(): void {
		switch (this.type) {
			case "RSI":
				this.calculator = technicalindicators.RSI;
				break;
			case "EMA":
				this.calculator = technicalindicators.EMA;
				break;
			case "SMA":
				this.calculator = technicalindicators.SMA;
				break;
			case "MACD":
				this.calculator = technicalindicators.MACD;
				break;
			case "BOLLINGER":
			case "BOLLINGERBANDS":
				this.calculator = technicalindicators.BollingerBands;
				break;
			case "STOCHASTIC":
				this.calculator = technicalindicators.Stochastic;
				break;
			case "ATR":
				this.calculator = technicalindicators.ATR;
				break;
			case "ADX":
				this.calculator = technicalindicators.ADX;
				break;
			default:
				throw new Error(`Unsupported indicator type: ${this.type}`);
		}
	}

	/**
	 * Calculate indicator value from new candle data
	 */
	public calculate(candle: OHLCVCandle): number {
		// Add to OHLCV history
		this.ohlcvHistory.push(candle);

		// Maintain history size
		if (this.ohlcvHistory.length > this.maxHistorySize) {
			this.ohlcvHistory.shift();
		}

		// Extract price data based on indicator requirements
		const priceData = this.extractPriceData(candle);

		// Add to price history
		this.history.push(priceData);

		// Maintain history size
		if (this.history.length > this.maxHistorySize) {
			this.history.shift();
		}

		// Calculate indicator value
		try {
			const result = this.calculateIndicatorValue();
			this.currentValue = result;

			// Add to value history
			this.valueHistory.push({
				timestamp: candle.timestamp,
				value: result,
			});

			// Maintain value history size
			if (this.valueHistory.length > this.maxHistorySize) {
				this.valueHistory.shift();
			}

			return result;
		} catch (error) {
			console.error(`Error calculating ${this.type}:`, error);
			return this.currentValue; // Return last valid value
		}
	}

	private extractPriceData(candle: OHLCVCandle): number {
		const priceSource = this.params.price || this.params.source || "close";

		switch (priceSource) {
			case "open":
				return candle.open;
			case "high":
				return candle.high;
			case "low":
				return candle.low;
			case "close":
				return candle.close;
			case "volume":
				return candle.volume;
			case "hl2":
				return (candle.high + candle.low) / 2;
			case "hlc3":
				return (candle.high + candle.low + candle.close) / 3;
			case "ohlc4":
				return (candle.open + candle.high + candle.low + candle.close) / 4;
			default:
				return candle.close;
		}
	}

	private calculateIndicatorValue(): number {
		if (this.history.length < (this.params.period || 1)) {
			return 0; // Not enough data
		}

		let input: any = {};

		switch (this.type) {
			case "RSI":
				input = {
					period: this.params.period || 14,
					values: this.history,
				};
				break;

			case "EMA":
			case "SMA":
				input = {
					period: this.params.period || 20,
					values: this.history,
				};
				break;

			case "MACD":
				input = {
					fastPeriod: this.params.fastPeriod || 12,
					slowPeriod: this.params.slowPeriod || 26,
					signalPeriod: this.params.signalPeriod || 9,
					values: this.history,
					SimpleMAOscillator: false,
					SimpleMASignal: false,
				};
				break;

			case "BOLLINGER":
			case "BOLLINGERBANDS":
				input = {
					period: this.params.period || 20,
					stdDev: this.params.stdDev || 2,
					values: this.history,
				};
				break;

			case "STOCHASTIC":
				if (this.ohlcvHistory.length < (this.params.period || 14)) {
					return 0;
				}
				input = {
					period: this.params.period || 14,
					signalPeriod: this.params.signalPeriod || 3,
					high: this.ohlcvHistory.map((c) => c.high),
					low: this.ohlcvHistory.map((c) => c.low),
					close: this.ohlcvHistory.map((c) => c.close),
				};
				break;

			case "ATR":
				if (this.ohlcvHistory.length < (this.params.period || 14)) {
					return 0;
				}
				input = {
					period: this.params.period || 14,
					high: this.ohlcvHistory.map((c) => c.high),
					low: this.ohlcvHistory.map((c) => c.low),
					close: this.ohlcvHistory.map((c) => c.close),
				};
				break;

			case "ADX":
				if (this.ohlcvHistory.length < (this.params.period || 14)) {
					return 0;
				}
				input = {
					period: this.params.period || 14,
					high: this.ohlcvHistory.map((c) => c.high),
					low: this.ohlcvHistory.map((c) => c.low),
					close: this.ohlcvHistory.map((c) => c.close),
				};
				break;

			default:
				throw new Error(`Unsupported calculation for ${this.type}`);
		}

		const result = this.calculator.calculate(input);

		if (Array.isArray(result) && result.length > 0) {
			const lastValue = result[result.length - 1];

			// Handle different result formats
			if (typeof lastValue === "number") {
				return lastValue;
			} else if (typeof lastValue === "object") {
				// For complex indicators like MACD, return the main value
				if (this.type === "MACD") {
					return lastValue.MACD || 0;
				} else if (
					this.type === "BOLLINGER" ||
					this.type === "BOLLINGERBANDS"
				) {
					return lastValue.middle || 0;
				} else if (this.type === "STOCHASTIC") {
					return lastValue.k || 0;
				} else {
					return (Object.values(lastValue)[0] as number) || 0;
				}
			}
		}

		return 0;
	}

	/**
	 * Get current indicator value
	 */
	public getCurrentValue(): number {
		return this.currentValue;
	}

	/**
	 * Get indicator value history
	 */
	public getHistory(periods?: number): IndicatorValue[] {
		if (periods) {
			return this.valueHistory.slice(-periods);
		}
		return this.valueHistory;
	}

	/**
	 * Get indicator configuration
	 */
	public getConfig(): IndicatorCalculatorConfig {
		return {
			type: this.type,
			params: this.params,
			historySize: this.maxHistorySize,
		};
	}

	/**
	 * Reset indicator state
	 */
	public reset(): void {
		this.history = [];
		this.ohlcvHistory = [];
		this.valueHistory = [];
		this.currentValue = 0;
	}

	/**
	 * Check if indicator has enough data for calculation
	 */
	public hasEnoughData(): boolean {
		const requiredPeriod = this.params.period || 1;
		return this.history.length >= requiredPeriod;
	}
}
