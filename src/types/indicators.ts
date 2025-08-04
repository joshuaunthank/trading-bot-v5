/**
 * Shared indicator types for both frontend and backend
 * This replaces the types from useLocalIndicators.tsx
 */

export interface IndicatorValue {
	x: number; // timestamp
	y: number | null; // value (null for missing/NaN values that D3.js should skip)
}

export interface CalculatedIndicator {
	id: string;
	name: string;
	data: IndicatorValue[];
	color: string;
	yAxisID: string;
	type: IndicatorType;
}

export type IndicatorType =
	| "EMA"
	| "SMA"
	| "RSI"
	| "MACD"
	| "BB"
	| "STOCH"
	| "ADX"
	| "CCI"
	| "WILLIAMS"
	| "ATR"
	| "OBV";

export interface IndicatorConfig {
	id: string;
	type: IndicatorType;
	name: string;
	period?: number;
	fastPeriod?: number;
	slowPeriod?: number;
	signalPeriod?: number;
	kPeriod?: number;
	dPeriod?: number;
	smooth?: number;
	stdDev?: number;
	isEnabled: boolean;
	parameters?: any; // Dynamic parameters for different indicator types
}

export interface OHLCVData {
	timestamp: number;
	open: number;
	high: number;
	close: number;
	low: number;
	volume: number;
}
