import { IndicatorCalculator, IndicatorResult, OHLCVData } from "../types";
import { calculateMACD, extractPriceSource } from "../calculations";

export const macdCalculator: IndicatorCalculator = {
	type: "macd",
	name: "MACD (Moving Average Convergence Divergence)",
	description:
		"MACD indicator with customizable fast, slow, and signal periods",
	parameters: [
		{
			key: "fastPeriod",
			name: "Fast Period",
			type: "number",
			default: 12,
			min: 1,
			max: 50,
		},
		{
			key: "slowPeriod",
			name: "Slow Period",
			type: "number",
			default: 26,
			min: 1,
			max: 100,
		},
		{
			key: "signalPeriod",
			name: "Signal Period",
			type: "number",
			default: 9,
			min: 1,
			max: 50,
		},
		{
			key: "source",
			name: "Price Source",
			type: "select",
			default: "close",
			options: [
				{ value: "close", label: "Close" },
				{ value: "open", label: "Open" },
				{ value: "high", label: "High" },
				{ value: "low", label: "Low" },
				{ value: "hl2", label: "HL2 (High+Low)/2" },
				{ value: "hlc3", label: "HLC3 (High+Low+Close)/3" },
				{ value: "ohlc4", label: "OHLC4 (Open+High+Low+Close)/4" },
			],
		},
	],
	yAxisType: "oscillator",

	calculate: (
		data: OHLCVData[],
		params: Record<string, any>
	): IndicatorResult[] => {
		const {
			fastPeriod = 12,
			slowPeriod = 26,
			signalPeriod = 9,
			source = "close",
		} = params;

		// Extract source data
		const sourceData = extractPriceSource(data, source);
		const macd = calculateMACD(
			sourceData,
			fastPeriod,
			slowPeriod,
			signalPeriod
		);

		const axisId = `macd_${fastPeriod}_${slowPeriod}_${signalPeriod}`;

		return [
			// MACD Line
			{
				id: `macd_line_${fastPeriod}_${slowPeriod}`,
				type: "macd",
				name: `MACD(${fastPeriod},${slowPeriod})`,
				values: macd.macdLine.map((value, i) => ({
					x: data[i].timestamp,
					y: isNaN(value) ? null : value,
					metadata: {
						type: "macd_line",
						bullish: value > 0,
						bearish: value < 0,
					},
				})),
				yAxisConfig: {
					id: axisId,
					type: "oscillator",
					position: "left",
				},
				style: {
					color: "#e91e63",
					lineWidth: 2,
					lineStyle: "solid",
				},
			},
			// Signal Line
			{
				id: `macd_signal_${signalPeriod}`,
				type: "macd",
				name: `MACD Signal(${signalPeriod})`,
				values: macd.signalLine.map((value, i) => ({
					x: data[i].timestamp,
					y: isNaN(value) ? null : value,
					metadata: {
						type: "signal_line",
					},
				})),
				yAxisConfig: {
					id: axisId,
					type: "oscillator",
					position: "left",
				},
				style: {
					color: "#9c27b0",
					lineWidth: 2,
					lineStyle: "solid",
				},
			},
			// Histogram
			{
				id: `macd_histogram_${fastPeriod}_${slowPeriod}_${signalPeriod}`,
				type: "macd",
				name: "MACD Histogram",
				values: macd.histogram.map((value, i) => ({
					x: data[i].timestamp,
					y: isNaN(value) ? null : value,
					metadata: {
						type: "histogram",
						bullish: value > 0,
						bearish: value < 0,
						signal:
							i > 0 && macd.histogram[i - 1] !== undefined
								? value > macd.histogram[i - 1]
									? "strengthening"
									: "weakening"
								: "neutral",
					},
				})),
				yAxisConfig: {
					id: axisId,
					type: "oscillator",
					position: "left",
				},
				style: {
					color: "#795548",
					lineWidth: 1,
					lineStyle: "solid",
				},
			},
			// Zero line reference
			{
				id: `macd_zero_line`,
				type: "reference_line",
				name: "Zero Line",
				values: data.map((d) => ({
					x: d.timestamp,
					y: 0,
				})),
				yAxisConfig: {
					id: axisId,
					type: "oscillator",
					position: "left",
				},
				style: {
					color: "#666666",
					lineWidth: 1,
					lineStyle: "dashed",
				},
			},
		];
	},
};
