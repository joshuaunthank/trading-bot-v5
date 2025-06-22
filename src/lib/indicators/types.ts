import { Point } from "chart.js";

export interface OHLCVData {
	timestamp: number;
	open: number;
	high: number;
	close: number;
	low: number;
	volume: number;
}

export interface BaseIndicatorConfig {
	id: string; // Unique identifier for this specific indicator instance
	type: string; // The indicator type (e.g., 'ema', 'rsi', 'macd')
	enabled: boolean;
	parameters: Record<string, any>; // Dynamic parameters
	style?: {
		color?: string;
		lineWidth?: number;
		lineStyle?: "solid" | "dashed" | "dotted";
		yAxis?: "price" | "oscillator" | "volume" | string; // Auto-assigned if not specified
	};
}

export interface IndicatorValue {
	x: number; // timestamp
	y: number | null; // value (null for missing/NaN values that Chart.js should skip)
	metadata?: Record<string, any>; // For additional info like signals, levels, etc.
}

export interface IndicatorResult {
	id: string;
	type: string;
	name: string;
	values: IndicatorValue[];
	yAxisConfig?: {
		id: string;
		type: "price" | "oscillator" | "volume" | "custom";
		min?: number;
		max?: number;
		position: "left" | "right";
	};
	style: {
		color: string;
		lineWidth: number;
		lineStyle: "solid" | "dashed" | "dotted";
	};
}

export interface IndicatorParameter {
	key: string;
	name: string;
	type: "number" | "string" | "boolean" | "select";
	default: any;
	min?: number;
	max?: number;
	options?: Array<{ value: any; label: string }>;
}

export interface IndicatorCalculator {
	type: string;
	name: string;
	description: string;
	parameters: IndicatorParameter[];
	yAxisType: "price" | "oscillator" | "volume" | "custom";
	calculate: (
		data: OHLCVData[],
		params: Record<string, any>
	) => IndicatorResult[];
}
