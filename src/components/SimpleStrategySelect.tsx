import React, { useState, useEffect } from "react";
import { IndicatorConfig, IndicatorType } from "../hooks/useLocalIndicators";

interface Strategy {
	id: string;
	name: string;
	description: string;
	indicators: Array<{
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
	}>;
}

interface SimpleStrategySelectProps {
	onIndicatorsChange: (indicators: IndicatorConfig[]) => void;
}

// Map strategy indicator types to our IndicatorType
const mapIndicatorType = (strategyType: string): IndicatorType | null => {
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
		case "stoch":
		case "stochastic":
			return "STOCH";
		case "adx":
			return "ADX";
		case "cci":
			return "CCI";
		case "williams":
		case "williamsr":
			return "WILLIAMS";
		case "atr":
			return "ATR";
		case "obv":
			return "OBV";
		default:
			console.warn(`Unknown indicator type: ${strategyType}`);
			return null;
	}
};

// Convert strategy indicators to IndicatorConfig format
const convertStrategyIndicators = (strategy: Strategy): IndicatorConfig[] => {
	return strategy.indicators
		.map((indicator, index) => {
			const mappedType = mapIndicatorType(indicator.type);
			if (!mappedType) return null;

			const config: IndicatorConfig = {
				id: `strategy_${indicator.id}_${index}`,
				type: mappedType,
				enabled: true,
				period: indicator.parameters.period || getDefaultPeriod(mappedType),
			};

			// Add advanced parameters if they exist
			if (
				indicator.parameters.fastPeriod ||
				indicator.parameters.slowPeriod ||
				indicator.parameters.signalPeriod ||
				indicator.parameters.stdDev
			) {
				config.parameters = {
					fastPeriod: indicator.parameters.fastPeriod,
					slowPeriod: indicator.parameters.slowPeriod,
					signalPeriod: indicator.parameters.signalPeriod,
					stdDev: indicator.parameters.stdDev,
				};
			}

			return config;
		})
		.filter((config): config is IndicatorConfig => config !== null);
};

// Get default period for indicator type
const getDefaultPeriod = (type: IndicatorType): number => {
	switch (type) {
		case "RSI":
			return 14;
		case "EMA":
		case "SMA":
			return 20;
		case "MACD":
			return 12; // fastPeriod
		case "BB":
			return 20;
		case "STOCH":
			return 14;
		case "ADX":
			return 14;
		case "CCI":
			return 20;
		case "WILLIAMS":
			return 14;
		case "ATR":
			return 14;
		case "OBV":
			return 1;
		default:
			return 14;
	}
};

const SimpleStrategySelect: React.FC<SimpleStrategySelectProps> = ({
	onIndicatorsChange,
}) => {
	const [strategies, setStrategies] = useState<Strategy[]>([]);
	const [selectedStrategyId, setSelectedStrategyId] = useState<string>("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Load strategies from API
	useEffect(() => {
		const loadStrategies = async () => {
			setLoading(true);
			setError(null);
			try {
				const response = await fetch("/api/v1/strategies");
				if (!response.ok) {
					throw new Error(`Failed to load strategies: ${response.statusText}`);
				}
				const data = await response.json();
				setStrategies(data);
			} catch (err) {
				console.error("Error loading strategies:", err);
				setError(err instanceof Error ? err.message : "Unknown error");
			} finally {
				setLoading(false);
			}
		};

		loadStrategies();
	}, []);

	// Handle strategy selection
	const handleStrategyChange = (strategyId: string) => {
		setSelectedStrategyId(strategyId);

		if (strategyId === "") {
			// Clear indicators
			onIndicatorsChange([]);
			return;
		}

		const strategy = strategies.find((s) => s.id === strategyId);
		if (strategy) {
			const indicators = convertStrategyIndicators(strategy);
			console.log(
				`Applied ${indicators.length} indicators from strategy: ${strategy.name}`
			);
			onIndicatorsChange(indicators);
		}
	};

	const selectedStrategy = strategies.find((s) => s.id === selectedStrategyId);

	return (
		<div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
			<div className="flex items-center justify-between mb-3">
				<h3 className="text-lg font-semibold text-gray-900">
					Strategy Indicators
				</h3>
				{loading && <div className="text-sm text-gray-500">Loading...</div>}
			</div>

			{error && (
				<div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
					<p className="text-sm text-red-600">Error: {error}</p>
				</div>
			)}

			{/* Strategy Selector */}
			<div className="mb-3">
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Select Strategy
				</label>
				<select
					value={selectedStrategyId}
					onChange={(e) => handleStrategyChange(e.target.value)}
					className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					disabled={loading}
				>
					<option value="">Manual indicator selection</option>
					{strategies.map((strategy) => (
						<option key={strategy.id} value={strategy.id}>
							{strategy.name}
						</option>
					))}
				</select>
			</div>

			{/* Selected Strategy Info */}
			{selectedStrategy && (
				<div className="bg-gray-50 p-3 rounded-md">
					<h4 className="text-sm font-medium text-gray-900 mb-1">
						{selectedStrategy.name}
					</h4>
					<p className="text-sm text-gray-600 mb-2">
						{selectedStrategy.description}
					</p>
					<div className="text-sm text-gray-700">
						<strong>Indicators applied:</strong>{" "}
						{selectedStrategy.indicators
							.map((ind) => ind.type.toUpperCase())
							.join(", ")}
					</div>
				</div>
			)}
		</div>
	);
};

export default SimpleStrategySelect;
