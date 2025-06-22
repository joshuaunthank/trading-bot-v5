import { IndicatorCalculator, IndicatorResult, OHLCVData } from "../types";
import { calculateRSI, extractPriceSource } from "../calculations";

export const rsiCalculator: IndicatorCalculator = {
	type: "rsi",
	name: "Relative Strength Index",
	description:
		"RSI oscillator with overbought/oversold levels and signal detection",
	parameters: [
		{
			key: "period",
			name: "Period",
			type: "number",
			default: 14,
			min: 2,
			max: 100,
		},
		{
			key: "overbought",
			name: "Overbought Level",
			type: "number",
			default: 70,
			min: 50,
			max: 90,
		},
		{
			key: "oversold",
			name: "Oversold Level",
			type: "number",
			default: 30,
			min: 10,
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
			period = 14,
			overbought = 70,
			oversold = 30,
			source = "close",
		} = params;

		// Extract source data
		const sourceData = extractPriceSource(data, source);
		const rsiValues = calculateRSI(sourceData, period);

		return [
			{
				id: `rsi_${period}`,
				type: "rsi",
				name: `RSI(${period}) - ${source.toUpperCase()}`,
				values: rsiValues.map((value, i) => ({
					x: data[i].timestamp,
					y: isNaN(value) ? null : value,
					metadata: {
						overbought: value > overbought,
						oversold: value < oversold,
						signal:
							value > overbought
								? "sell"
								: value < oversold
								? "buy"
								: "neutral",
					},
				})),
				yAxisConfig: {
					id: `rsi_${period}`,
					type: "oscillator",
					min: 0,
					max: 100,
					position: "left",
				},
				style: {
					color: "#ffa726",
					lineWidth: 2,
					lineStyle: "solid",
				},
			},
			// Add horizontal reference lines
			{
				id: `rsi_${period}_overbought`,
				type: "reference_line",
				name: `Overbought (${overbought})`,
				values: data.map((d) => ({
					x: d.timestamp,
					y: overbought,
				})),
				yAxisConfig: {
					id: `rsi_${period}`,
					type: "oscillator",
					min: 0,
					max: 100,
					position: "left",
				},
				style: {
					color: "#ff5722",
					lineWidth: 1,
					lineStyle: "dashed",
				},
			},
			{
				id: `rsi_${period}_oversold`,
				type: "reference_line",
				name: `Oversold (${oversold})`,
				values: data.map((d) => ({
					x: d.timestamp,
					y: oversold,
				})),
				yAxisConfig: {
					id: `rsi_${period}`,
					type: "oscillator",
					min: 0,
					max: 100,
					position: "left",
				},
				style: {
					color: "#4caf50",
					lineWidth: 1,
					lineStyle: "dashed",
				},
			},
		];
	},
};
