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

	// Helper function to extract colors from strategy indicator params - optimized for performance
	const extractColorsFromStrategy = useCallback(
		(strategy: any): Record<string, string> => {
			if (!strategy?.indicators?.length) return {};

			const colorMap: Record<string, string> = {};

			// Flatten and process in single pass for better performance
			strategy.indicators.forEach((indicatorGroup: any) => {
				Object.entries(indicatorGroup).forEach(
					([indicatorName, indicatorDef]: [string, any]) => {
						if (!indicatorDef?.params?.length) return;

						// Special handling for MACD (multi-component)
						if (indicatorName === "MACD") {
							indicatorDef.params.forEach((param: any) => {
								if (!param.color) return;

								// Direct mapping for performance
								const mappings = {
									fastPeriod: ["macd_line", "macd"],
									slowPeriod: ["signal_line", "signal"],
									signalPeriod: ["histogram"],
								};

								const keys = mappings[param.name as keyof typeof mappings] || [
									param.name,
								];
								keys.forEach((key) => (colorMap[key] = param.color));
							});
						} else {
							// Simple color assignment for other indicators
							const colorParam = indicatorDef.params.find((p: any) => p.color);
							if (colorParam) {
								colorMap[indicatorName.toLowerCase()] = colorParam.color;
							}
						}
					}
				);
			});

			return colorMap;
		},
		[]
	);

	// Transform backend indicators to CalculatedIndicator format - optimized for real-time updates
	const allChartIndicators = useMemo(() => {
		// Process indicators for chart display
		if (!backendIndicators || backendIndicators.length === 0) {
			return [];
		}

		// Cache strategy colors to avoid recalculation
		const strategyColors = detailedStrategy
			? extractColorsFromStrategy(detailedStrategy)
			: {};

		// Enhanced validation and mapping
		const result = backendIndicators
			.filter((indicator) => {
				// Comprehensive validation
				if (!indicator) {
					return false;
				}
				if (!indicator.id) {
					return false;
				}
				if (!indicator.data || !Array.isArray(indicator.data)) {
					return false;
				}
				if (indicator.data.length === 0) {
					return false;
				}

				return true;
			})
			.map((indicator): CalculatedIndicator => {
				const lowerType = indicator.type.toLowerCase();

				// Optimized yAxisID determination
				const yAxisID =
					lowerType.includes("rsi") ||
					lowerType.includes("stoch") ||
					lowerType.includes("williams") ||
					lowerType.includes("cci")
						? "oscillator"
						: lowerType.includes("volume") || lowerType.includes("obv")
						? "volume"
						: "price";

				// Optimized type mapping
				const type = lowerType.includes("ema")
					? ("EMA" as IndicatorType)
					: lowerType.includes("sma")
					? ("SMA" as IndicatorType)
					: lowerType.includes("rsi")
					? ("RSI" as IndicatorType)
					: lowerType.includes("macd")
					? ("MACD" as IndicatorType)
					: lowerType.includes("bb") || lowerType.includes("bollinger")
					? ("BB" as IndicatorType)
					: ("EMA" as IndicatorType); // Default fallback

				return {
					id: indicator.id,
					name: indicator.name,
					data: indicator.data, // Direct assignment for performance
					color:
						strategyColors[indicator.id] ||
						strategyColors[indicator.name] ||
						"#ffffff",
					yAxisID,
					type,
				};
			});

		return result;
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
				} else {
					// TODO: Implement create strategy API call
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
		setIsConfigModalOpen(false);
	}, []);

	// Performance monitoring for real-time updates (inspired by video optimization)
	useEffect(() => {
		const startTime = performance.now();
		if (allChartIndicators.length > 0) {
			const processingTime = performance.now() - startTime;
			if (processingTime > 16) {
				// More than one frame (60fps)
				console.warn(
					`[useDashboard] Slow indicator processing: ${processingTime.toFixed(
						2
					)}ms`
				);
			}
		}
	}, [allChartIndicators]);

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
