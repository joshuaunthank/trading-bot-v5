import { IndicatorCalculator, IndicatorResult, OHLCVData } from "../types";
import { calculateSMA, extractPriceSource } from "../calculations";

export const smaCalculator: IndicatorCalculator = {
	type: "sma",
	name: "Simple Moving Average",
	description:
		"Simple Moving Average with customizable period and price source",
	parameters: [
		{
			key: "period",
			name: "Period",
			type: "number",
			default: 20,
			min: 1,
			max: 200,
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
	yAxisType: "price",

	calculate: (
		data: OHLCVData[],
		params: Record<string, any>
	): IndicatorResult[] => {
		const { period = 20, source = "close" } = params;

		// Extract source data
		const sourceData = extractPriceSource(data, source);
		const smaValues = calculateSMA(sourceData, period);

		return [
			{
				id: `sma_${period}_${source}`,
				type: "sma",
				name: `SMA(${period}) - ${source.toUpperCase()}`,
				values: smaValues.map((value, i) => ({
					x: data[i].timestamp,
					y: isNaN(value) ? null : value,
				})),
				style: {
					color: "#3742fa",
					lineWidth: 2,
					lineStyle: "solid",
				},
			},
		];
	},
};
