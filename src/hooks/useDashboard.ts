/**
 * Custom hook for Dashboard state management
 * Centralizes all state logic, data fetching, and event handlers
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useOhlcvWithIndicators } from "./useOhlcvWithIndicators";
import { useStrategies } from "./useStrategies";
import { useStrategy } from "../context/StrategyContext";
import { strategyService } from "../services/strategyService";
import { storage } from "../utils/storage";
import { CONFIG } from "../utils/config";
import { CalculatedIndicator, IndicatorType } from "../types/indicators";

export type TabId = "chart" | "testing";

export const useDashboard = () => {
	// UI State
	const [activeTab, setActiveTab] = useState<TabId>("chart");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Data selection state (using localStorage)
	const [symbol] = useState(() => storage.getSelectedSymbol());
	const [timeframe] = useState(() => storage.getSelectedTimeframe());

	// Use global strategy context instead of local state
	const { selectedStrategyId, setSelectedStrategyId } = useStrategy();

	// Modal states
	const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
	const [isStrategyEditorOpen, setIsStrategyEditorOpen] = useState(false);
	const [editingStrategyId, setEditingStrategyId] = useState<string | null>(
		null
	);
	const [editingStrategy, setEditingStrategy] = useState<any>(null);

	// Strategy details
	const [detailedStrategy, setDetailedStrategy] = useState<any>(null);
	const [strategyStatus, setStrategyStatus] = useState<string>("stopped");

	// Data hooks
	const {
		fullDataset,
		latestCandle,
		indicators: backendIndicators,
		connectionStatus: ohlcvConnectionStatus,
		reconnect: reconnectOhlcvWs,
		disconnect: disconnectOhlcvWs,
	} = useOhlcvWithIndicators({
		symbol,
		timeframe,
		strategyId: selectedStrategyId || undefined,
	});

	const { strategies: availableStrategies, loadStrategies } = useStrategies();

	// Helper function to extract colors from strategy indicator params
	const extractColorsFromStrategy = useCallback(
		(strategy: any): Record<string, string> => {
			const colorMap: Record<string, string> = {};

			if (!strategy?.indicators || !Array.isArray(strategy.indicators)) {
				return colorMap;
			}

			strategy.indicators.forEach((indicatorGroup: any) => {
				Object.entries(indicatorGroup).forEach(
					([indicatorName, indicatorDef]: [string, any]) => {
						if (indicatorDef?.params && Array.isArray(indicatorDef.params)) {
							// For multi-component indicators like MACD, map each parameter to specific components
							if (indicatorName === "MACD") {
								indicatorDef.params.forEach((param: any) => {
									if (param.color) {
										switch (param.name) {
											case "fastPeriod":
												colorMap["macd_line"] = param.color;
												colorMap["macd"] = param.color;
												break;
											case "slowPeriod":
												colorMap["signal_line"] = param.color;
												colorMap["signal"] = param.color;
												break;
											case "signalPeriod":
												colorMap["histogram"] = param.color;
												break;
											default:
												colorMap[param.name] = param.color;
										}
									}
								});
							} else {
								// For other indicators, use the first color found
								const colorParam = indicatorDef.params.find(
									(p: any) => p.color
								);
								if (colorParam) {
									colorMap[indicatorName.toLowerCase()] = colorParam.color;
								}
							}
						}
					}
				);
			});

			return colorMap;
		},
		[]
	);

	// Transform backend indicators to CalculatedIndicator format
	const allChartIndicators = useMemo(() => {
		console.log("🔄 useDashboard - Transforming indicators:");
		console.log("- backendIndicators:", backendIndicators?.length || 0);
		console.log("- detailedStrategy:", !!detailedStrategy);

		if (!backendIndicators || !detailedStrategy) return [];

		const strategyColors = extractColorsFromStrategy(detailedStrategy);
		console.log("- strategyColors:", strategyColors);

		const transformed = backendIndicators.map(
			(indicator): CalculatedIndicator => {
				// Determine yAxisID based on indicator type
				const getYAxisID = (type: string): string => {
					const lowerType = type.toLowerCase();
					if (
						lowerType.includes("rsi") ||
						lowerType.includes("stoch") ||
						lowerType.includes("williams") ||
						lowerType.includes("cci")
					) {
						return "oscillator";
					}
					if (lowerType.includes("volume") || lowerType.includes("obv")) {
						return "volume";
					}
					return "price";
				};

				// Map string type to IndicatorType
				const getIndicatorType = (type: string): IndicatorType => {
					const lowerType = type.toLowerCase();
					if (lowerType.includes("ema")) return "EMA";
					if (lowerType.includes("sma")) return "SMA";
					if (lowerType.includes("rsi")) return "RSI";
					if (lowerType.includes("macd")) return "MACD";
					if (lowerType.includes("bb") || lowerType.includes("bollinger"))
						return "BB";
					if (lowerType.includes("stoch")) return "STOCH";
					if (lowerType.includes("adx")) return "ADX";
					if (lowerType.includes("cci")) return "CCI";
					if (lowerType.includes("williams")) return "WILLIAMS";
					if (lowerType.includes("atr")) return "ATR";
					if (lowerType.includes("obv")) return "OBV";
					return "EMA"; // Default fallback
				};

				const result = {
					id: indicator.id,
					name: indicator.name,
					data: indicator.data,
					color:
						strategyColors[indicator.id] ||
						strategyColors[indicator.name] ||
						"#ffffff",
					yAxisID: getYAxisID(indicator.type),
					type: getIndicatorType(indicator.type),
				};

				console.log(`- Transformed ${indicator.name}:`, {
					originalType: indicator.type,
					mappedType: result.type,
					yAxisID: result.yAxisID,
					color: result.color,
					dataLength: result.data.length,
				});

				return result;
			}
		);

		console.log(
			"✅ Transformation complete, returning:",
			transformed.length,
			"indicators"
		);
		return transformed;
	}, [backendIndicators, detailedStrategy, extractColorsFromStrategy]);

	// Event handlers
	const handleStrategySelect = useCallback(
		async (strategyId: string | null) => {
			setSelectedStrategyId(strategyId);
			storage.setSelectedStrategy(strategyId);

			if (strategyId) {
				setLoading(true);
				try {
					const detailed = await strategyService.getDetailedStrategy(
						strategyId
					);
					setDetailedStrategy(detailed);
				} catch (error) {
					console.error("Failed to load detailed strategy:", error);
					setError("Failed to load strategy details");
				} finally {
					setLoading(false);
				}
			} else {
				setDetailedStrategy(null);
			}
		},
		[]
	);

	const handleEditStrategy = useCallback(
		(strategyId: string) => {
			const strategy = availableStrategies?.find((s) => s.id === strategyId);
			if (strategy) {
				setEditingStrategyId(strategyId);
				setEditingStrategy(strategy);
				setIsStrategyEditorOpen(true);
			}
		},
		[availableStrategies]
	);

	const handleDeleteStrategy = useCallback(
		async (strategyId: string) => {
			if (!confirm("Are you sure you want to delete this strategy?")) return;

			setLoading(true);
			try {
				// TODO: Implement delete strategy API call
				console.log("Delete strategy:", strategyId);
				await loadStrategies();

				// If we deleted the currently selected strategy, clear selection
				if (selectedStrategyId === strategyId) {
					setSelectedStrategyId(null);
					storage.setSelectedStrategy(null);
				}
			} catch (error) {
				console.error("Failed to delete strategy:", error);
				setError("Failed to delete strategy");
			} finally {
				setLoading(false);
			}
		},
		[selectedStrategyId, loadStrategies]
	);

	const handleSaveStrategy = useCallback(
		async (strategyData: any) => {
			setLoading(true);
			try {
				if (editingStrategyId) {
					// TODO: Implement update strategy API call
					console.log("Update strategy:", editingStrategyId, strategyData);
				} else {
					// TODO: Implement create strategy API call
					console.log("Create strategy:", strategyData);
				}

				await loadStrategies();
				setIsStrategyEditorOpen(false);
				setEditingStrategyId(null);
				setEditingStrategy(null);
			} catch (error) {
				console.error("Failed to save strategy:", error);
				setError("Failed to save strategy");
			} finally {
				setLoading(false);
			}
		},
		[editingStrategyId, loadStrategies]
	);

	const handleCloseStrategyEditor = useCallback(() => {
		setIsStrategyEditorOpen(false);
		setEditingStrategyId(null);
		setEditingStrategy(null);
	}, []);

	const handleSaveConfig = useCallback((configData: any) => {
		// Implementation for saving configuration
		console.log("Saving config:", configData);
		setIsConfigModalOpen(false);
	}, []);

	// Clear error after some time
	useEffect(() => {
		if (error) {
			const timer = setTimeout(() => setError(null), 5000);
			return () => clearTimeout(timer);
		}
	}, [error]);

	// Update WebSocket error (removed as wsError is no longer available from useOhlcvWithIndicators)
	// WebSocket errors are now handled by the shared WebSocket context

	return {
		// UI State
		activeTab,
		setActiveTab,
		loading,
		error,
		setError,

		// Data
		symbol,
		timeframe,
		selectedStrategyId,
		availableStrategies,
		detailedStrategy,
		strategyStatus,

		// OHLCV Data
		ohlcvData: fullDataset,
		latestCandle,
		indicators: allChartIndicators,
		connectionStatus: ohlcvConnectionStatus,
		reconnectOhlcvWs,

		// Modal states
		isConfigModalOpen,
		setIsConfigModalOpen,
		isStrategyEditorOpen,
		editingStrategyId,
		editingStrategy,

		// Event handlers
		handleStrategySelect,
		handleEditStrategy,
		handleDeleteStrategy,
		handleSaveStrategy,
		handleCloseStrategyEditor,
		handleSaveConfig,
		onCreateStrategy: () => setIsStrategyEditorOpen(true),
	};
};
