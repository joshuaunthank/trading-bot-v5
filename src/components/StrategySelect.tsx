import React, { useEffect, useState, useCallback } from "react";
import { IndicatorConfig, IndicatorType } from "../hooks/useLocalIndicators";
import {
	strategyService,
	StrategySummary,
	DetailedStrategy,
} from "../services/strategyService";

interface StrategySelectProps {
	strategies: StrategySummary[];
	selectedStrategyId: string | null;
	onStrategySelect: (strategyId: string | null) => void;
	onIndicatorsChange: (indicators: IndicatorConfig[]) => void;
	loading?: boolean;
	error?: string | null;
}

const StrategySelect: React.FC<StrategySelectProps> = ({
	strategies,
	selectedStrategyId,
	onStrategySelect,
	onIndicatorsChange,
	loading = false,
	error = null,
}) => {
	// State for detailed strategy data
	const [detailedStrategy, setDetailedStrategy] =
		useState<DetailedStrategy | null>(null);
	const [strategyLoading, setStrategyLoading] = useState(false);
	const [strategyError, setStrategyError] = useState<string | null>(null);

	// Find selected strategy summary
	const selectedStrategySummary = strategies.find(
		(s) => s.id === selectedStrategyId
	);

	// Fetch detailed strategy data when strategy is selected
	const fetchDetailedStrategy = useCallback(async (strategyId: string) => {
		if (!strategyId) {
			setDetailedStrategy(null);
			setStrategyError(null);
			return;
		}

		try {
			setStrategyLoading(true);
			setStrategyError(null);

			const detailed = await strategyService.getDetailedStrategy(strategyId);
			setDetailedStrategy(detailed);
		} catch (err) {
			console.error("Error fetching detailed strategy:", err);
			setStrategyError(
				err instanceof Error ? err.message : "Failed to load strategy details"
			);
			setDetailedStrategy(null);
		} finally {
			setStrategyLoading(false);
		}
	}, []);

	// Fetch detailed strategy when selection changes
	useEffect(() => {
		if (selectedStrategyId) {
			fetchDetailedStrategy(selectedStrategyId);
		} else {
			setDetailedStrategy(null);
			setStrategyError(null);
		}
	}, [selectedStrategyId, fetchDetailedStrategy]);

	// Map strategy indicator types to our IndicatorType
	const mapStrategyIndicatorType = (
		strategyType: string
	): IndicatorType | null => {
		switch (strategyType.toLowerCase()) {
			case "rsi":
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
				return null;
		}
	};

	// Convert strategy indicators to IndicatorConfig format
	const convertStrategyToIndicators = useCallback(
		(strategy: DetailedStrategy): IndicatorConfig[] => {
			if (!strategy.indicators) return [];

			return strategy.indicators
				.map((indicator) => {
					const mappedType = mapStrategyIndicatorType(indicator.type);
					if (!mappedType) return null;

					const config: IndicatorConfig = {
						id: indicator.id,
						type: mappedType,
						enabled: true,
						period: indicator.parameters.period || 14, // Default period
						parameters: {},
					};

					// Map specific parameters based on indicator type
					switch (mappedType) {
						case "MACD":
							config.parameters = {
								fastPeriod: indicator.parameters.fastPeriod || 12,
								slowPeriod: indicator.parameters.slowPeriod || 26,
								signalPeriod: indicator.parameters.signalPeriod || 9,
							};
							break;
						case "BB":
							config.parameters = {
								stdDev: indicator.parameters.stdDev || 2,
							};
							config.period = indicator.parameters.period || 20;
							break;
						case "STOCH":
							config.parameters = {
								kPeriod: indicator.parameters.kPeriod || 14,
								dPeriod: indicator.parameters.dPeriod || 3,
							};
							break;
						default:
							// For simple indicators, just use the period
							config.period = indicator.parameters.period || 14;
							break;
					}

					return config;
				})
				.filter((config): config is IndicatorConfig => config !== null);
		},
		[]
	);

	// Apply indicators when detailed strategy data is loaded
	useEffect(() => {
		if (detailedStrategy) {
			const indicators = convertStrategyToIndicators(detailedStrategy);
			onIndicatorsChange(indicators);
		} else {
			// Clear indicators when no strategy is selected
			onIndicatorsChange([]);
		}
	}, [detailedStrategy, onIndicatorsChange, convertStrategyToIndicators]);

	return (
		<div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-lg font-semibold text-gray-900">
					Strategy Indicators
				</h3>
				{(loading || strategyLoading) && (
					<div className="text-sm text-gray-500">
						{loading ? "Loading strategies..." : "Loading strategy details..."}
					</div>
				)}
			</div>

			{(error || strategyError) && (
				<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
					<p className="text-sm text-red-600">
						Error: {error || strategyError}
					</p>
				</div>
			)}

			{/* Strategy Selector */}
			<div className="mb-4">
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Select Strategy
				</label>
				<div className="flex gap-2">
					<select
						value={selectedStrategyId || ""}
						onChange={(e) => onStrategySelect(e.target.value || null)}
						className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						disabled={loading || strategyLoading}
					>
						<option value="">No strategy selected</option>
						{strategies.map((strategy) => (
							<option key={strategy.id} value={strategy.id}>
								{strategy.name}
							</option>
						))}
					</select>
					{selectedStrategyId && (
						<button
							onClick={() => onStrategySelect(null)}
							className="px-3 py-2 text-red-600 hover:text-red-700 border border-red-300 hover:border-red-400 rounded-md transition-colors"
						>
							Clear
						</button>
					)}
				</div>
			</div>

			{/* Selected Strategy Info */}
			{selectedStrategySummary && (
				<div className="border-t border-gray-200 pt-4">
					{strategyLoading && (
						<div className="text-center py-4">
							<div className="text-sm text-gray-500">
								Loading strategy details...
							</div>
						</div>
					)}

					{!strategyLoading && detailedStrategy && (
						<>
							<div className="mb-3">
								<h4 className="text-sm font-medium text-gray-900 mb-1">
									{detailedStrategy.name}
								</h4>
								<p className="text-sm text-gray-600">
									{detailedStrategy.description}
								</p>
								{detailedStrategy.tags && detailedStrategy.tags.length > 0 && (
									<div className="flex flex-wrap gap-1 mt-2">
										{detailedStrategy.tags.map((tag) => (
											<span
												key={tag}
												className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
											>
												{tag}
											</span>
										))}
									</div>
								)}
							</div>

							<div>
								<h5 className="text-sm font-medium text-gray-700 mb-2">
									Indicators ({detailedStrategy.indicators?.length || 0})
								</h5>
								<div className="space-y-2">
									{detailedStrategy.indicators?.map((indicator) => (
										<div
											key={indicator.id}
											className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded"
										>
											<div>
												<span className="text-sm font-medium text-gray-900">
													{indicator.type.toUpperCase()}
												</span>
												<span className="text-sm text-gray-500 ml-2">
													({indicator.id})
												</span>
											</div>
											<div className="text-xs text-gray-600">
												{Object.entries(indicator.parameters)
													.map(([key, value]) => `${key}: ${value}`)
													.join(", ")}
											</div>
										</div>
									))}
								</div>
							</div>
						</>
					)}

					{!strategyLoading && !detailedStrategy && strategyError && (
						<div className="text-center py-4">
							<div className="text-sm text-red-600">
								Failed to load strategy details
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default StrategySelect;
