/**
 * Custom hook for Dashboard state management
 * Centralizes all state logic, data fetching, and event handlers
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useOhlcvWithIndicators } from "./useOhlcvWithIndicators";
import { useStrategies } from "./useStrategies";
import { strategyService } from "../services/strategyService";
import { storage } from "../utils/storage";
import { CONFIG } from "../utils/config";

export type TabId = "chart" | "testing";

export const useDashboard = () => {
	// UI State
	const [activeTab, setActiveTab] = useState<TabId>("chart");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Data selection state (using localStorage)
	const [symbol] = useState(() => storage.getSelectedSymbol());
	const [timeframe] = useState(() => storage.getSelectedTimeframe());
	const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(
		() => storage.getSelectedStrategy()
	);

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
		lastError: wsError,
		reconnect: reconnectOhlcvWs,
	} = useOhlcvWithIndicators(symbol, timeframe, selectedStrategyId);

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

	// Combine backend indicators with color information
	const allChartIndicators = useMemo(() => {
		if (!backendIndicators || !detailedStrategy) return backendIndicators || [];

		const strategyColors = extractColorsFromStrategy(detailedStrategy);

		return backendIndicators.map((indicator) => ({
			...indicator,
			// Add color property if it doesn't exist
			color:
				strategyColors[indicator.id] ||
				strategyColors[indicator.name] ||
				"#ffffff",
		}));
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

	// Update WebSocket error
	useEffect(() => {
		if (wsError) {
			setError(wsError.message || "WebSocket error occurred");
		}
	}, [wsError]);

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
