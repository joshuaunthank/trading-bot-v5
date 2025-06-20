/**
 * Stateful Technical Indicators for Multi-Strategy Engine
 *
 * These classes maintain internal state and can be updated incrementally
 * with new candle data, making them suitable for real-time strategy execution.
 */

import { OHLCVCandle } from "../types/index";
import {
	calcEMA,
	calcRSI,
	calcMACD,
	calcBollingerBands,
} from "./indicatorUtils";

export interface IndicatorResult {
	id: string;
	name: string;
	value: number | null;
	timestamp: number;
	metadata?: any;
}

export interface IndicatorConfig {
	id: string;
	type: string;
	parameters: Record<string, any>;
}

/**
 * Base class for all indicators
 */
export abstract class BaseIndicator {
	protected id: string;
	protected type: string;
	protected parameters: Record<string, any>;
	protected history: number[] = [];
	protected maxHistory: number = 500; // Keep last 500 values

	constructor(config: IndicatorConfig) {
		this.id = config.id;
		this.type = config.type;
		this.parameters = config.parameters;
	}

	abstract update(candle: OHLCVCandle): IndicatorResult;
	abstract getName(): string;
	abstract isReady(): boolean;

	getId(): string {
		return this.id;
	}

	getType(): string {
		return this.type;
	}

	getHistory(): number[] {
		return [...this.history];
	}

	protected addToHistory(value: number): void {
		this.history.push(value);
		if (this.history.length > this.maxHistory) {
			this.history = this.history.slice(-this.maxHistory);
		}
	}

	reset(): void {
		this.history = [];
	}
}

/**
 * RSI (Relative Strength Index) Indicator
 */
export class RSIIndicator extends BaseIndicator {
	private period: number;
	private closes: number[] = [];

	constructor(config: IndicatorConfig) {
		super(config);
		this.period = config.parameters.period || 14;
	}

	update(candle: OHLCVCandle): IndicatorResult {
		this.closes.push(candle.close);

		// Keep only what we need for calculation
		if (this.closes.length > this.period + 1) {
			this.closes = this.closes.slice(-(this.period + 1));
		}

		let rsiValue: number | null = null;

		if (this.closes.length >= this.period + 1) {
			const rsiArray = calcRSI(this.closes, this.period);
			if (rsiArray.length > 0) {
				rsiValue = rsiArray[rsiArray.length - 1];
				this.addToHistory(rsiValue);
			}
		}

		return {
			id: this.id,
			name: this.getName(),
			value: rsiValue,
			timestamp: candle.timestamp,
			metadata: {
				period: this.period,
				samplesNeeded: this.period + 1,
				samplesAvailable: this.closes.length,
			},
		};
	}

	getName(): string {
		return `RSI(${this.period})`;
	}

	isReady(): boolean {
		return this.closes.length >= this.period + 1;
	}

	reset(): void {
		super.reset();
		this.closes = [];
	}
}

/**
 * EMA (Exponential Moving Average) Indicator
 */
export class EMAIndicator extends BaseIndicator {
	private period: number;
	private source: string;
	private values: number[] = [];

	constructor(config: IndicatorConfig) {
		super(config);
		this.period = config.parameters.period || 20;
		this.source = config.parameters.source || "close"; // close, open, high, low
	}

	update(candle: OHLCVCandle): IndicatorResult {
		const sourceValue = this.getSourceValue(candle);
		this.values.push(sourceValue);

		// Keep only what we need for calculation
		if (this.values.length > this.period * 2) {
			this.values = this.values.slice(-this.period * 2);
		}

		let emaValue: number | null = null;

		if (this.values.length >= this.period) {
			const emaArray = calcEMA(this.values, this.period);
			if (emaArray.length > 0) {
				emaValue = emaArray[emaArray.length - 1];
				this.addToHistory(emaValue);
			}
		}

		return {
			id: this.id,
			name: this.getName(),
			value: emaValue,
			timestamp: candle.timestamp,
			metadata: {
				period: this.period,
				source: this.source,
				samplesNeeded: this.period,
				samplesAvailable: this.values.length,
			},
		};
	}

	private getSourceValue(candle: OHLCVCandle): number {
		switch (this.source) {
			case "open":
				return candle.open;
			case "high":
				return candle.high;
			case "low":
				return candle.low;
			case "close":
			default:
				return candle.close;
		}
	}

	getName(): string {
		return `EMA(${this.period})`;
	}

	isReady(): boolean {
		return this.values.length >= this.period;
	}

	reset(): void {
		super.reset();
		this.values = [];
	}
}

/**
 * MACD (Moving Average Convergence Divergence) Indicator
 */
export class MACDIndicator extends BaseIndicator {
	private fastPeriod: number;
	private slowPeriod: number;
	private signalPeriod: number;
	private closes: number[] = [];

	constructor(config: IndicatorConfig) {
		super(config);
		this.fastPeriod = config.parameters.fastPeriod || 12;
		this.slowPeriod = config.parameters.slowPeriod || 26;
		this.signalPeriod = config.parameters.signalPeriod || 9;
	}

	update(candle: OHLCVCandle): IndicatorResult {
		this.closes.push(candle.close);

		// Keep enough data for calculation
		const maxNeeded = this.slowPeriod + this.signalPeriod + 10;
		if (this.closes.length > maxNeeded) {
			this.closes = this.closes.slice(-maxNeeded);
		}

		let macdResult: { MACD: number; signal: number; histogram: number } | null =
			null;

		if (this.closes.length >= this.slowPeriod + this.signalPeriod) {
			const macdArray = calcMACD(
				this.closes,
				this.fastPeriod,
				this.slowPeriod,
				this.signalPeriod
			);
			if (macdArray.length > 0) {
				macdResult = macdArray[macdArray.length - 1];
				this.addToHistory(macdResult.MACD);
			}
		}

		return {
			id: this.id,
			name: this.getName(),
			value: macdResult?.MACD || null,
			timestamp: candle.timestamp,
			metadata: {
				fastPeriod: this.fastPeriod,
				slowPeriod: this.slowPeriod,
				signalPeriod: this.signalPeriod,
				macd: macdResult?.MACD || null,
				signal: macdResult?.signal || null,
				histogram: macdResult?.histogram || null,
				samplesNeeded: this.slowPeriod + this.signalPeriod,
				samplesAvailable: this.closes.length,
			},
		};
	}

	getName(): string {
		return `MACD(${this.fastPeriod},${this.slowPeriod},${this.signalPeriod})`;
	}

	isReady(): boolean {
		return this.closes.length >= this.slowPeriod + this.signalPeriod;
	}

	reset(): void {
		super.reset();
		this.closes = [];
	}
}

/**
 * Bollinger Bands Indicator
 */
export class BollingerBandsIndicator extends BaseIndicator {
	private period: number;
	private stdDev: number;
	private closes: number[] = [];

	constructor(config: IndicatorConfig) {
		super(config);
		this.period = config.parameters.period || 20;
		this.stdDev = config.parameters.stdDev || 2;
	}

	update(candle: OHLCVCandle): IndicatorResult {
		this.closes.push(candle.close);

		if (this.closes.length > this.period + 10) {
			this.closes = this.closes.slice(-(this.period + 10));
		}

		let bbResult: { upper: number; lower: number; middle: number } | null =
			null;

		if (this.closes.length >= this.period) {
			const bbArray = calcBollingerBands(this.closes, this.period, this.stdDev);
			if (bbArray.length > 0) {
				bbResult = bbArray[bbArray.length - 1];
				this.addToHistory(bbResult.middle);
			}
		}

		return {
			id: this.id,
			name: this.getName(),
			value: bbResult?.middle || null,
			timestamp: candle.timestamp,
			metadata: {
				period: this.period,
				stdDev: this.stdDev,
				upper: bbResult?.upper || null,
				middle: bbResult?.middle || null,
				lower: bbResult?.lower || null,
				samplesNeeded: this.period,
				samplesAvailable: this.closes.length,
			},
		};
	}

	getName(): string {
		return `BB(${this.period},${this.stdDev})`;
	}

	isReady(): boolean {
		return this.closes.length >= this.period;
	}

	reset(): void {
		super.reset();
		this.closes = [];
	}
}

/**
 * Factory function to create indicators from configuration
 */
export function createIndicator(config: IndicatorConfig): BaseIndicator {
	switch (config.type.toLowerCase()) {
		case "rsi":
			return new RSIIndicator(config);
		case "ema":
			return new EMAIndicator(config);
		case "macd":
			return new MACDIndicator(config);
		case "bollinger":
		case "bb":
			return new BollingerBandsIndicator(config);
		default:
			throw new Error(`Unknown indicator type: ${config.type}`);
	}
}

/**
 * Helper function to create common indicator configurations
 */
export function createCommonIndicators(): IndicatorConfig[] {
	return [
		{
			id: "rsi_14",
			type: "rsi",
			parameters: { period: 14 },
		},
		{
			id: "ema_20",
			type: "ema",
			parameters: { period: 20, source: "close" },
		},
		{
			id: "ema_50",
			type: "ema",
			parameters: { period: 50, source: "close" },
		},
		{
			id: "macd_default",
			type: "macd",
			parameters: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
		},
		{
			id: "bb_20",
			type: "bollinger",
			parameters: { period: 20, stdDev: 2 },
		},
	];
}
