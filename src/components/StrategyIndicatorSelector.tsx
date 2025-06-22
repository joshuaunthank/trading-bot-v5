import React, { useState, useEffect } from "react";
import { IndicatorConfig, IndicatorType } from "../hooks/useLocalIndicators";

interface StrategyIndicatorDef {
	id: string;
	type: string;
	parameters: {
		period?: number;
		fastPeriod?: number;
		slowPeriod?: number;
		signalPeriod?: number;
		stdDev?: number;
		source?: string;
	};
}

// Strategy interface from useStrategyExecution
interface ExecutionStrategy {
	id: string;
	name: string;
	description: string;
	symbol: string;
	timeframe: string;
	status: "stopped" | "running" | "paused" | "error";
	indicators: Record<string, number>;
	signals: Array<{
		type: "entry" | "exit";
		side: "long" | "short";
		price: number;
		timestamp: number;
		confidence: number;
	}>;
	performance: {
		currentPrice: number;
		unrealizedPnL: number;
		position: "long" | "short" | "none";
	};
}

// Strategy file format (JSON)
interface StrategyFile {
	id: string;
	name: string;
	description: string;
	symbol: string;
	timeframe: string;
	indicators: StrategyIndicatorDef[];
	enabled: boolean;
}

interface StrategyIndicatorSelectorProps {
	onIndicatorsChange: (indicators: IndicatorConfig[]) => void;
	strategies?: ExecutionStrategy[];
	loading?: boolean;
}

// Map strategy indicator types to our IndicatorType
const mapStrategyIndicatorType = (
	strategyType: string
): IndicatorType | null => {
	switch (strategyType.toLowerCase()) {
		case "rsi":
		case "momentum":
			return "RSI";
		case "ema":
			return "EMA";
		case "sma":
			return "SMA";
		case "macd":
			return "MACD";
		case "bollinger":
		case "bb":
			return "BB";
		default:
			return null;
	}
};

// Convert strategy indicators to IndicatorConfig format
const convertStrategyIndicators = (
	strategy: StrategyFile
): IndicatorConfig[] => {
	if (!strategy.indicators) {
		return [];
	}

	const indicatorConfigs: IndicatorConfig[] = [];

	strategy.indicators.forEach((indicator) => {
		const mappedType = mapStrategyIndicatorType(indicator.type);
		if (!mappedType) return;

		// Handle different parameter structures
		let period = indicator.parameters.period;
		if (!period) {
			// For MACD, use fastPeriod as the main period
			if (mappedType === "MACD" && indicator.parameters.fastPeriod) {
				period = indicator.parameters.fastPeriod;
			} else {
				// Default periods
				period = mappedType === "RSI" ? 14 : 20;
			}
		}

		indicatorConfigs.push({
			type: mappedType,
			period,
			enabled: true,
			color: undefined, // Will use default colors
		});
	});

	// Remove duplicates (same type and period)
	const uniqueIndicators = indicatorConfigs.filter(
		(indicator, index, self) =>
			index ===
			self.findIndex(
				(i) => i.type === indicator.type && i.period === indicator.period
			)
	);

	return uniqueIndicators;
};

const StrategyIndicatorSelector: React.FC<StrategyIndicatorSelectorProps> = ({
	onIndicatorsChange,
	loading: externalLoading = false,
}) => {
	const [selectedStrategyId, setSelectedStrategyId] = useState<string>("");
	const [strategies, setStrategies] = useState<StrategyFile[]>([]);
	const [loading, setLoading] = useState(false);

	// Load strategy files from API
	useEffect(() => {
		const loadStrategies = async () => {
			setLoading(true);
			try {
				const response = await fetch("/api/v1/strategies");
				if (!response.ok) {
					throw new Error("Failed to load strategies");
				}
				const data = await response.json();
				setStrategies(data.strategies || []);
			} catch (error) {
				console.error("Error loading strategies:", error);
				setStrategies([]);
			} finally {
				setLoading(false);
			}
		};

		loadStrategies();
	}, []);

	// Load strategy indicators when a strategy is selected
	useEffect(() => {
		if (selectedStrategyId) {
			const strategy = strategies.find((s) => s.id === selectedStrategyId);
			if (strategy) {
				const indicators = convertStrategyIndicators(strategy);
				onIndicatorsChange(indicators);
			}
		} else {
			// Clear indicators when no strategy is selected
			onIndicatorsChange([]);
		}
	}, [selectedStrategyId, strategies, onIndicatorsChange]);

	const handleStrategyChange = (strategyId: string) => {
		setSelectedStrategyId(strategyId);
	};

	const clearStrategy = () => {
		setSelectedStrategyId("");
	};

	const selectedStrategy = strategies.find((s) => s.id === selectedStrategyId);

	return (
		<div className="bg-gray-800 rounded-lg p-4 mb-4">
			<div className="flex items-center justify-between mb-3">
				<h3 className="text-lg font-semibold text-white">
					Strategy Indicators
				</h3>
				{selectedStrategyId && (
					<button
						onClick={clearStrategy}
						className="text-red-400 hover:text-red-300 transition-colors text-sm"
					>
						Clear Strategy
					</button>
				)}
			</div>

			<div className="space-y-3">
				{/* Strategy Selector */}
				<div>
					<label className="block text-sm font-medium text-gray-300 mb-2">
						Select Strategy:
					</label>
					<select
						value={selectedStrategyId}
						onChange={(e) => handleStrategyChange(e.target.value)}
						className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						disabled={loading}
					>
						<option value="">-- No Strategy Selected --</option>
						{strategies.map((strategy) => (
							<option key={strategy.id} value={strategy.id}>
								{strategy.name} ({strategy.symbol} - {strategy.timeframe})
							</option>
						))}
					</select>
				</div>

				{/* Selected Strategy Info */}
				{selectedStrategy && (
					<div className="bg-gray-700 rounded-md p-3">
						<div className="flex items-start justify-between mb-2">
							<div>
								<h4 className="text-white font-medium">
									{selectedStrategy.name}
								</h4>
								<p className="text-gray-400 text-sm">
									{selectedStrategy.description}
								</p>
							</div>
							<span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
								{selectedStrategy.symbol} · {selectedStrategy.timeframe}
							</span>
						</div>

						{/* Indicators Preview */}
						<div>
							<label className="block text-sm font-medium text-gray-300 mb-1">
								Strategy Indicators:
							</label>
							<div className="flex flex-wrap gap-2">
								{convertStrategyIndicators(selectedStrategy).map(
									(indicator, index) => (
										<span
											key={`${indicator.type}_${indicator.period}_${index}`}
											className="px-2 py-1 bg-green-600 text-white text-xs rounded-md"
										>
											{indicator.type}
											{indicator.period &&
												indicator.type !== "MACD" &&
												`(${indicator.period})`}
										</span>
									)
								)}
								{convertStrategyIndicators(selectedStrategy).length === 0 && (
									<span className="text-gray-400 text-sm">
										No compatible indicators found
									</span>
								)}
							</div>
						</div>
					</div>
				)}

				{/* Loading State */}
				{loading && (
					<div className="text-center py-3 text-gray-400">
						Loading strategies...
					</div>
				)}

				{/* Empty State */}
				{!loading && strategies.length === 0 && (
					<div className="text-center py-3 text-gray-400">
						No strategies available
					</div>
				)}
			</div>
		</div>
	);
};

export default StrategyIndicatorSelector;
