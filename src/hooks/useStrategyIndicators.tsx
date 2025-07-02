import { useMemo } from "react";
import { CalculatedIndicator, IndicatorValue } from "../types/indicators";

interface StrategyIndicator {
	id: string;
	current_value: number;
	values?: number[];
}

interface OHLCVData {
	timestamp: number;
	open: number;
	high: number;
	close: number;
	low: number;
	volume: number;
}

// Color scheme for strategy indicators
const STRATEGY_INDICATOR_COLORS = [
	"#ff6b6b", // Red
	"#4ecdc4", // Teal
	"#45b7d1", // Blue
	"#f9ca24", // Yellow
	"#f0932b", // Orange
	"#eb4d4b", // Dark red
	"#6c5ce7", // Purple
	"#a29bfe", // Light purple
	"#fd79a8", // Pink
	"#00b894", // Green
];

/**
 * Hook to convert strategy indicators from WebSocket format to chart-compatible format
 */
export const useStrategyIndicators = (
	strategyIndicators: StrategyIndicator[],
	ohlcvData: OHLCVData[],
	enabled: boolean = true
): CalculatedIndicator[] => {
	return useMemo(() => {
		if (
			!enabled ||
			!strategyIndicators ||
			strategyIndicators.length === 0 ||
			!ohlcvData ||
			ohlcvData.length === 0
		) {
			return [];
		}

		const results: CalculatedIndicator[] = [];

		strategyIndicators.forEach((indicator, index) => {
			if (!indicator.values || indicator.values.length === 0) {
				return;
			}

			// Determine the appropriate Y-axis based on the indicator name/values
			let yAxisID = "y1"; // Default to general indicators axis
			const indicatorName = indicator.id.toLowerCase();

			// Check if this looks like an RSI (values typically between 0-100)
			const avgValue =
				indicator.values.reduce((sum, val) => sum + (val || 0), 0) /
				indicator.values.length;
			const maxValue = Math.max(...indicator.values.filter((v) => !isNaN(v)));
			const minValue = Math.min(...indicator.values.filter((v) => !isNaN(v)));

			if (
				indicatorName.includes("rsi") ||
				(maxValue <= 100 && minValue >= 0 && avgValue > 10 && avgValue < 90)
			) {
				yAxisID = "y_rsi";
			} else if (
				indicatorName.includes("macd") ||
				(maxValue < 10 && minValue > -10)
			) {
				yAxisID = "y_macd";
			} else if (
				indicatorName.includes("price") ||
				indicatorName.includes("sma") ||
				indicatorName.includes("ema") ||
				indicatorName.includes("bollinger") ||
				avgValue > 1000
			) {
				yAxisID = "y"; // Price axis
			}

			// Create data points by matching with timestamps
			const data: IndicatorValue[] = [];
			const maxDataPoints = Math.min(indicator.values.length, ohlcvData.length);

			// Use the most recent timestamps to match with indicator values
			const recentOhlcv = ohlcvData.slice(-maxDataPoints);
			const recentValues = indicator.values.slice(-maxDataPoints);

			for (let i = 0; i < maxDataPoints; i++) {
				const value = recentValues[i];
				if (!isNaN(value) && isFinite(value)) {
					data.push({
						x: recentOhlcv[i].timestamp,
						y: value,
					});
				}
			}

			if (data.length > 0) {
				results.push({
					id: `strategy_${indicator.id}`,
					name: `📊 ${indicator.id}`, // Add emoji to distinguish strategy indicators
					data,
					color:
						STRATEGY_INDICATOR_COLORS[index % STRATEGY_INDICATOR_COLORS.length],
					yAxisID,
					type: "EMA" as any, // Use EMA type as default for styling
				});
			}
		});

		return results;
	}, [strategyIndicators, ohlcvData, enabled]);
};

export default useStrategyIndicators;
