import React, { useMemo } from "react";
import MultiPanelChart from "../MultiPanelChart";
import useOhlcvWebSocket from "../../hooks/useOhlcvWebSocket";
import {
	useLocalIndicators,
	IndicatorConfig,
	IndicatorType,
} from "../../hooks/useLocalIndicators";
import { Indicator } from "../../context/Types";

interface StrategyBuilderChartProps {
	indicators: Indicator[];
	symbol?: string;
	timeframe?: string;
}

/**
 * Chart component for Strategy Builder that shows indicators in real-time
 * as the user adds/edits them in the strategy configuration
 */
export const StrategyBuilderChart: React.FC<StrategyBuilderChartProps> = ({
	indicators,
	symbol = "BTC/USDT",
	timeframe = "1h",
}) => {
	// Get OHLCV data
	const { fullDataset, latestCandle, connectionStatus } = useOhlcvWebSocket(
		symbol,
		timeframe
	);

	// Convert strategy indicators to chart indicator format
	const chartIndicators = useMemo(() => {
		const convertStrategyToIndicators = (
			indicators: Indicator[]
		): IndicatorConfig[] => {
			return indicators
				.map((indicator) => {
					const mappedType = mapIndicatorType(indicator.type);
					if (!mappedType) return null;

					const config: IndicatorConfig = {
						id: indicator.id,
						type: mappedType,
						enabled: true,
						period: indicator.parameters?.period || 14,
						parameters: {},
					};

					// Map specific parameters based on indicator type
					switch (mappedType) {
						case "MACD":
							config.parameters = {
								fastPeriod: indicator.parameters?.fastPeriod || 12,
								slowPeriod: indicator.parameters?.slowPeriod || 26,
								signalPeriod: indicator.parameters?.signalPeriod || 9,
							};
							break;
						case "BB":
							config.parameters = {
								stdDev: indicator.parameters?.stdDev || 2,
							};
							config.period = indicator.parameters?.period || 20;
							break;
						case "STOCH":
							config.parameters = {
								kPeriod: indicator.parameters?.kPeriod || 14,
								dPeriod: indicator.parameters?.dPeriod || 3,
							};
							break;
						default:
							config.period = indicator.parameters?.period || 14;
							break;
					}

					return config;
				})
				.filter((config): config is IndicatorConfig => config !== null);
		};

		const mapIndicatorType = (type: string): IndicatorType | null => {
			const mapping: Record<string, IndicatorType> = {
				rsi: "RSI",
				ema: "EMA",
				sma: "SMA",
				macd: "MACD",
				bollinger: "BB",
				bb: "BB",
				stoch: "STOCH",
				stochastic: "STOCH",
				adx: "ADX",
				cci: "CCI",
				williams: "WILLIAMS",
				williamsr: "WILLIAMS",
				atr: "ATR",
				obv: "OBV",
			};

			return mapping[type.toLowerCase()] || null;
		};

		return convertStrategyToIndicators(indicators);
	}, [indicators]);

	// Calculate indicators from OHLCV data
	const calculatedIndicators = useLocalIndicators(fullDataset, chartIndicators);

	const isLoading =
		connectionStatus !== "connected" && connectionStatus !== "open";

	return (
		<div className="bg-gray-800 rounded-lg p-4">
			<div className="mb-3">
				<h3 className="text-lg font-semibold text-white mb-1">Live Preview</h3>
				<div className="text-xs text-gray-400">
					{symbol} • {timeframe} • {indicators.length} indicator
					{indicators.length !== 1 ? "s" : ""}
					{" • "}
					<span
						className={
							connectionStatus === "connected" || connectionStatus === "open"
								? "text-green-400"
								: "text-yellow-400"
						}
					>
						{connectionStatus === "connected" || connectionStatus === "open"
							? "Live"
							: "Connecting..."}
					</span>
				</div>
			</div>

			{indicators.length === 0 ? (
				<div className="h-80 flex items-center justify-center bg-gray-900 rounded border border-gray-700">
					<div className="text-center text-gray-500">
						<div className="text-4xl mb-3">📊</div>
						<div className="text-sm mb-1">No Indicators</div>
						<div className="text-xs">Add indicators to see live preview</div>
					</div>
				</div>
			) : (
				<div className="h-80">
					<MultiPanelChart
						data={fullDataset}
						symbol={symbol}
						timeframe={timeframe}
						loading={isLoading}
						indicators={calculatedIndicators}
					/>
				</div>
			)}

			{/* Compact Indicator Summary */}
			{indicators.length > 0 && (
				<div className="mt-3">
					<div className="flex flex-wrap gap-1">
						{indicators.map((indicator) => (
							<span
								key={indicator.id}
								className="px-2 py-1 bg-blue-900/30 text-blue-300 text-xs rounded border border-blue-500/30"
								title={`${indicator.name || indicator.type} - ${
									indicator.parameters?.period
										? `Period: ${indicator.parameters.period}`
										: "No period set"
								}`}
							>
								{indicator.type.toUpperCase()}
								{indicator.parameters?.period
									? `(${indicator.parameters.period})`
									: ""}
							</span>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

export default StrategyBuilderChart;
