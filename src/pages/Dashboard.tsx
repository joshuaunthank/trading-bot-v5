import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useOhlcvWithIndicators } from "../hooks/useOhlcvWithIndicators";
import StrategySelect from "../components/StrategySelect";
import MultiPanelChart from "../components/MultiPanelChart";
import SummaryView from "../components/SummaryView";
import ConfigModal from "../components/ConfigModal";
import StrategyEditor from "../components/strategy/StrategyEditor";
import StrategyManager from "../components/strategy/StrategyManager";
import { useStrategies } from "../hooks/useStrategies";
import { strategyService } from "../services/strategyService";

// Types
interface OHLCVData {
	timestamp: number;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
}

// Connection status component
interface ConnectionStatusProps {
	status: string;
	type: string;
	onReconnect?: () => void;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
	status,
	type,
	onReconnect,
}) => {
	const getStatusColor = (status: string) => {
		switch (status) {
			case "connected":
			case "open":
				return "text-green-400";
			case "connecting":
				return "text-yellow-400";
			case "disconnected":
			case "closed":
			case "closing":
				return "text-red-400";
			default:
				return "text-gray-400";
		}
	};

	const getStatusText = (status: string) => {
		switch (status) {
			case "connected":
			case "open":
				return "Connected";
			case "connecting":
				return "Connecting...";
			case "disconnected":
			case "closed":
				return "Disconnected";
			case "closing":
				return "Closing...";
			default:
				return "Unknown";
		}
	};

	return (
		<div className="flex items-center space-x-1">
			<span className="text-xs text-gray-400">{type}:</span>
			<span className={`text-xs font-medium ${getStatusColor(status)}`}>
				{getStatusText(status)}
			</span>
			{(status === "disconnected" ||
				status === "closed" ||
				status === "closing") &&
				onReconnect && (
					<button
						onClick={onReconnect}
						className="text-xs text-blue-400 hover:text-blue-300 ml-1"
					>
						Reconnect
					</button>
				)}
		</div>
	);
};

const EnhancedDashboard: React.FC = () => {
	// State management
	const [ohlcvData, setOhlcvData] = useState<OHLCVData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<"chart" | "manager">("chart");

	// Strategy selection state
	const [selectedIndicatorStrategyId, setSelectedIndicatorStrategyId] =
		useState<string | null>(() => {
			const savedStrategy = localStorage.getItem("selectedIndicatorStrategy");
			return savedStrategy || null;
		});
	const [detailedStrategy, setDetailedStrategy] = useState<any>(null);

	// Strategy Editor state
	const [isStrategyEditorOpen, setIsStrategyEditorOpen] = useState(false);
	const [editingStrategyId, setEditingStrategyId] = useState<string | null>(
		null
	);
	const [editingStrategy, setEditingStrategy] = useState<any>(null);

	// WebSocket hook for OHLCV data
	const {
		fullDataset,
		latestCandle,
		indicators: backendIndicators,
		connectionStatus: ohlcvConnectionStatus,
		lastError: wsError,
		reconnect: reconnectOhlcvWs,
	} = useOhlcvWithIndicators("BTCUSDT", "1h", selectedIndicatorStrategyId);

	// Strategies hook
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
												colorMap["macd_signal"] = param.color;
												break;
											case "signalPeriod":
												colorMap["macd_histogram"] = param.color;
												break;
										}
									}
								});
							} else if (indicatorName === "BB") {
								// Handle Bollinger Bands
								indicatorDef.params.forEach((param: any) => {
									if (param.color) {
										switch (param.name) {
											case "period":
												colorMap["bb_upper"] = param.color;
												colorMap["bb_middle"] = param.color;
												colorMap["bb_lower"] = param.color;
												colorMap["bb"] = param.color;
												break;
											case "stdDev":
												// Use a slightly different color for standard deviation bands
												colorMap["bb_upper"] = param.color;
												colorMap["bb_lower"] = param.color;
												break;
										}
									}
								});
							} else {
								// For single-component indicators, find the first non-price color parameter
								const colorParam = indicatorDef.params.find(
									(p: any) => p.color && p.name !== "price"
								);
								if (colorParam) {
									const baseKey = indicatorName.toLowerCase();
									colorMap[baseKey] = colorParam.color;

									// Handle period-specific variations (e.g., EMA_20, SMA_14)
									const periodParam = indicatorDef.params.find(
										(p: any) => p.name === "period"
									);
									if (periodParam) {
										colorMap[`${baseKey}_${periodParam.default}`] =
											colorParam.color;
										colorMap[`${baseKey}${periodParam.default}`] =
											colorParam.color;
									}
								}
							}
						}
					}
				);
			});

			console.log("Extracted color map from strategy:", colorMap);
			return colorMap;
		},
		[]
	);

	// Color mapping function that uses strategy colors with smart fallbacks
	const getIndicatorColor = useCallback(
		(indicatorId: string, indicatorName?: string) => {
			// Extract colors from current strategy
			const strategyColors = detailedStrategy
				? extractColorsFromStrategy(detailedStrategy)
				: {};

			console.log(
				`Getting color for indicator: ${indicatorId}, available colors:`,
				strategyColors
			);

			// Handle multi-component indicators with specific component IDs
			const lowerIndicatorId = indicatorId.toLowerCase();

			// Try exact match first
			if (strategyColors[lowerIndicatorId]) {
				console.log(
					`Found exact match: ${indicatorId} -> ${strategyColors[lowerIndicatorId]}`
				);
				return strategyColors[lowerIndicatorId];
			}

			// Handle MACD components
			if (lowerIndicatorId.includes("macd")) {
				if (lowerIndicatorId.includes("signal")) {
					return strategyColors["macd_signal"] || "#36a2eb"; // Blue
				}
				if (lowerIndicatorId.includes("histogram")) {
					return strategyColors["macd_histogram"] || "#9966ff"; // Purple
				}
				if (
					lowerIndicatorId.includes("macd") ||
					lowerIndicatorId.includes("line")
				) {
					return (
						strategyColors["macd_line"] || strategyColors["macd"] || "#ff6384"
					); // Red
				}
			}

			// Handle Bollinger Bands components
			if (lowerIndicatorId.includes("bb_")) {
				if (lowerIndicatorId.includes("upper")) {
					return strategyColors["bb_upper"] || "#EF4444";
				}
				if (lowerIndicatorId.includes("middle")) {
					return strategyColors["bb_middle"] || "#6B7280";
				}
				if (lowerIndicatorId.includes("lower")) {
					return strategyColors["bb_lower"] || "#EF4444";
				}
			}

			// Try pattern matching for complex indicator names
			for (const [colorKey, color] of Object.entries(strategyColors)) {
				if (lowerIndicatorId.includes(colorKey)) {
					console.log(
						`Found pattern match: ${indicatorId} includes ${colorKey} -> ${color}`
					);
					return color;
				}
			}

			// Organized fallback color map by category
			const fallbackColorMap: Record<string, string> = {
				// Moving Averages - Blue/Green family
				sma: "#3B82F6",
				ema: "#10B981",
				wma: "#06B6D4",

				// Oscillators - Warmer colors
				rsi: "#ffcd56", // Yellow
				cci: "#84CC16",
				mfi: "#F59E0B",
				stochastic: "#A855F7",

				// MACD fallbacks
				macd: "#ff6384",
				macd_line: "#ff6384",
				macd_signal: "#36a2eb",
				macd_histogram: "#9966ff",

				// Bollinger Bands fallbacks
				bb_upper: "#EF4444",
				bb_middle: "#6B7280",
				bb_lower: "#EF4444",
				bb: "#EF4444",

				// Volume indicators
				volume: "#F59E0B",
				obv: "#F97316",

				// Other technical indicators
				atr: "#9333EA",
				adx: "#A855F7",
				sar: "#EC4899",
				roc: "#8B5CF6",
				tsi: "#06B6D4",
				trix: "#84CC16",
				keltnerchannel: "#EF4444",
				donchian: "#6B7280",
				ichimoku: "#10B981",
				vwap: "#8B5CF6",
				ppo: "#F59E0B",
				ultimateoscillator: "#A855F7",
			};

			const fallbackColor = fallbackColorMap[lowerIndicatorId] || "#6B7280";
			console.log(`Using fallback color for ${indicatorId}: ${fallbackColor}`);
			return fallbackColor;
		},
		[detailedStrategy, extractColorsFromStrategy]
	);

	// Convert backend indicators to chart format with strategy colors
	const allChartIndicators = useMemo(() => {
		console.log("=== Indicator Processing Debug ===");
		console.log("detailedStrategy:", detailedStrategy);
		console.log("backendIndicators from WebSocket:", backendIndicators);

		const strategyColors = detailedStrategy
			? extractColorsFromStrategy(detailedStrategy)
			: {};
		console.log("Extracted strategy colors:", strategyColors);

		const chartIndicators = backendIndicators.map((indicator: any) => {
			console.log(`Processing indicator:`, indicator);

			// Get color from strategy config
			const color = getIndicatorColor(indicator.id, indicator.name);
			console.log(`Indicator ${indicator.id}: color = ${color}`);

			return {
				id: indicator.id,
				name: indicator.name,
				type: indicator.type,
				data: indicator.data,
				color: color,
				yAxisID: "y1", // Default to secondary y-axis for indicators
			};
		});

		console.log("Final chartIndicators:", chartIndicators);
		return chartIndicators;
	}, [
		backendIndicators,
		getIndicatorColor,
		detailedStrategy,
		extractColorsFromStrategy,
	]);

	// Handle strategy selection with detailed data
	const handleStrategySelect = useCallback(
		async (strategyId: string | null, detailedStrategyData: any = null) => {
			setSelectedIndicatorStrategyId(strategyId);
			setDetailedStrategy(detailedStrategyData);

			if (!strategyId) {
				setError(null);
				setLoading(false);
			} else {
				setLoading(true);
				setError(null);
			}
		},
		[]
	);

	// Handle WebSocket full dataset updates
	useEffect(() => {
		if (fullDataset && fullDataset.length > 0) {
			setOhlcvData(fullDataset);
			setLoading(false);
			setError(null);
		}
	}, [fullDataset]);

	// Handle WebSocket connection status
	useEffect(() => {
		if (wsError) {
			setError(wsError.message || "WebSocket error occurred");
		} else if (
			(ohlcvConnectionStatus === "connected" ||
				ohlcvConnectionStatus === "open") &&
			fullDataset?.length === 0
		) {
			setLoading(true);
		} else if (
			ohlcvConnectionStatus === "disconnected" ||
			ohlcvConnectionStatus === "closed"
		) {
			setError("WebSocket connection lost. Reconnecting...");
		} else if (ohlcvConnectionStatus === "connecting") {
			setLoading(true);
			setError(null);
		}
	}, [ohlcvConnectionStatus, fullDataset?.length, wsError]);

	// Handle incremental updates for live data
	useEffect(() => {
		if (latestCandle) {
			setOhlcvData((prevData) => {
				if (!prevData || prevData.length === 0) return [latestCandle];

				const lastIndex = prevData.length - 1;
				const lastCandle = prevData[lastIndex];

				if (lastCandle && lastCandle.timestamp === latestCandle.timestamp) {
					// Update existing candle
					const updatedData = [...prevData];
					updatedData[lastIndex] = latestCandle;
					return updatedData;
				} else {
					// Add new candle
					return [...prevData, latestCandle];
				}
			});
		}
	}, [latestCandle]);

	// Strategy management handlers
	const handleEditStrategy = useCallback(
		async (strategyId: string) => {
			try {
				// Use the detailed strategy data that's already loaded via StrategySelect
				// instead of making another API call
				if (detailedStrategy && detailedStrategy.id === strategyId) {
					// Transform strategy data to match StrategyEditor format
					const transformedStrategy = {
						...detailedStrategy,
						// Transform indicators format if needed
						indicators: detailedStrategy.indicators
							? detailedStrategy.indicators.flatMap((indicatorGroup: any) => {
									// If it's already in the correct format (array of single-key objects), return as is
									if (Object.keys(indicatorGroup).length === 1) {
										return [indicatorGroup];
									}
									// If it's a single object with multiple indicators, split it
									return Object.entries(indicatorGroup).map(([key, value]) => ({
										[key]: value,
									}));
							  })
							: [],
						// Map risk_management to risk if needed
						risk: detailedStrategy.risk_management ||
							detailedStrategy.risk || {
								position_size_type: "percent_equity",
								risk_per_trade: 2,
								stop_loss_percent: 1.5,
								take_profit_percent: 3,
								trailing_stop: false,
								max_drawdown_percent: 10,
							},
						// Ensure other required fields
						enabled:
							detailedStrategy.status === "active" ||
							detailedStrategy.enabled ||
							true,
					};

					console.log("Using cached strategy data:", detailedStrategy);
					console.log("Transformed strategy:", transformedStrategy);

					setEditingStrategyId(strategyId);
					setEditingStrategy(transformedStrategy);
					setIsStrategyEditorOpen(true);
				} else {
					// Fallback to API call if detailed strategy isn't available
					const strategy = await strategyService.getDetailedStrategy(
						strategyId
					);

					const transformedStrategy = {
						...strategy,
						indicators: strategy.indicators
							? strategy.indicators.flatMap((indicatorGroup: any) => {
									if (Object.keys(indicatorGroup).length === 1) {
										return [indicatorGroup];
									}
									return Object.entries(indicatorGroup).map(([key, value]) => ({
										[key]: value,
									}));
							  })
							: [],
						risk: strategy.risk_management ||
							strategy.risk || {
								position_size_type: "percent_equity",
								risk_per_trade: 2,
								stop_loss_percent: 1.5,
								take_profit_percent: 3,
								trailing_stop: false,
								max_drawdown_percent: 10,
							},
						enabled: strategy.status === "active" || strategy.enabled || true,
					};

					console.log("Fetched strategy from API:", strategy);
					console.log("Transformed strategy:", transformedStrategy);

					setEditingStrategyId(strategyId);
					setEditingStrategy(transformedStrategy);
					setIsStrategyEditorOpen(true);
				}
			} catch (error) {
				console.error("Failed to load strategy for editing:", error);
			}
		},
		[detailedStrategy]
	);

	// Delete strategy handler
	const handleDeleteStrategy = useCallback(
		async (strategyId: string) => {
			try {
				const response = await fetch(`/api/v1/strategies/${strategyId}`, {
					method: "DELETE",
				});

				if (response.ok) {
					// Clear the current selection if we deleted the selected strategy
					if (selectedIndicatorStrategyId === strategyId) {
						setSelectedIndicatorStrategyId(null);
						setDetailedStrategy(null);
					}
					// Refresh the strategies list
					loadStrategies();
					console.log(`Strategy ${strategyId} deleted successfully`);
				} else {
					const errorData = await response.json();
					console.error("Failed to delete strategy:", errorData);
					alert(
						`Failed to delete strategy: ${errorData.message || errorData.error}`
					);
				}
			} catch (error) {
				console.error("Error deleting strategy:", error);
				alert("Failed to delete strategy. Please try again.");
			}
		},
		[selectedIndicatorStrategyId, loadStrategies]
	);

	const handleSaveConfig = useCallback(async (configData: any) => {
		try {
			console.log("Saving config:", configData);
			setIsConfigModalOpen(false);
		} catch (error) {
			console.error("Error saving config:", error);
		}
	}, []);

	const handleSaveStrategy = useCallback(
		async (strategyData: any) => {
			try {
				const url = editingStrategyId
					? `/api/v1/strategies/${editingStrategyId}`
					: "/api/v1/strategies";
				const method = editingStrategyId ? "PUT" : "POST";

				const response = await fetch(url, {
					method,
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(strategyData),
				});

				if (response.ok) {
					// If we're saving an edited strategy and it's the currently selected one,
					// make sure we keep it selected
					const savedStrategyData = await response.json();
					const savedStrategyId = savedStrategyData.id || editingStrategyId;

					// If we're editing the currently selected strategy, update the selection
					// Or if we have no selection yet, select the newly created strategy
					if (
						editingStrategyId === selectedIndicatorStrategyId ||
						(!selectedIndicatorStrategyId && !editingStrategyId)
					) {
						setSelectedIndicatorStrategyId(savedStrategyId);
					}

					setIsStrategyEditorOpen(false);
					setEditingStrategyId(null);
					setEditingStrategy(null);
					await loadStrategies();
				} else {
					console.error("Failed to save strategy");
				}
			} catch (error) {
				console.error("Error saving strategy:", error);
			}
		},
		[editingStrategyId, loadStrategies, selectedIndicatorStrategyId]
	);

	const handleCloseStrategyEditor = useCallback(() => {
		setIsStrategyEditorOpen(false);
		setEditingStrategyId(null);
		setEditingStrategy(null);
	}, []);

	// Summary data calculation
	const calculateSummaryData = useCallback(() => {
		if (!ohlcvData || ohlcvData.length === 0) {
			return {
				current_price: 0,
				price_change_24h: 0,
				price_change_percent_24h: 0,
				volume_24h: 0,
				high_24h: 0,
				low_24h: 0,
			};
		}

		const latest = ohlcvData[ohlcvData.length - 1];
		const dayAgo = ohlcvData[Math.max(0, ohlcvData.length - 24)];

		const current_price = latest?.close || 0;
		const previousPrice = dayAgo?.close || current_price;
		const price_change_24h = current_price - previousPrice;
		const price_change_percent_24h =
			previousPrice !== 0 ? (price_change_24h / previousPrice) * 100 : 0;

		const recent24h = ohlcvData.slice(-24);
		const volume_24h = recent24h.reduce(
			(sum, candle) => sum + (candle?.volume || 0),
			0
		);
		const high_24h = Math.max(...recent24h.map((candle) => candle?.high || 0));
		const low_24h = Math.min(
			...recent24h.map((candle) => candle?.low || Infinity)
		);

		return {
			current_price,
			price_change_24h,
			price_change_percent_24h,
			volume_24h,
			high_24h,
			low_24h: low_24h === Infinity ? 0 : low_24h,
		};
	}, [ohlcvData]);

	const summaryData = calculateSummaryData();

	// Save selected indicator strategy to localStorage
	useEffect(() => {
		if (selectedIndicatorStrategyId) {
			localStorage.setItem(
				"selectedIndicatorStrategy",
				selectedIndicatorStrategyId
			);
		} else {
			localStorage.removeItem("selectedIndicatorStrategy");
		}
	}, [selectedIndicatorStrategyId]);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<h1 className="text-xl md:text-2xl font-bold">Trading Dashboard</h1>
				<div className="flex space-x-2 items-center">
					<div className="flex flex-col space-y-1 mr-4">
						<ConnectionStatus
							status={ohlcvConnectionStatus}
							type="OHLCV"
							onReconnect={reconnectOhlcvWs}
						/>
					</div>
					<button
						onClick={() => setIsConfigModalOpen(true)}
						className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
					>
						Configure
					</button>
				</div>
			</div>

			{/* Error Display */}
			{error && (
				<div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-md">
					{error}
				</div>
			)}

			{/* Summary View */}
			<SummaryView data={summaryData} isLoading={loading} />

			{/* Tab Selector */}
			<div className="flex border-b border-gray-700 mb-4">
				<button
					className={`px-4 py-2 font-medium ${
						activeTab === "chart"
							? "text-blue-500 border-b-2 border-blue-500"
							: "text-gray-400 hover:text-gray-300"
					}`}
					onClick={() => setActiveTab("chart")}
				>
					Chart & Indicators
				</button>
				<button
					className={`px-4 py-2 font-medium ${
						activeTab === "manager"
							? "text-blue-500 border-b-2 border-blue-500"
							: "text-gray-400 hover:text-gray-300"
					}`}
					onClick={() => setActiveTab("manager")}
				>
					Strategy Manager
				</button>
			</div>

			{/* Chart Tab */}
			{activeTab === "chart" && (
				<div className="space-y-6">
					{/* Strategy Selection */}
					<StrategySelect
						strategies={availableStrategies || []}
						selectedStrategyId={selectedIndicatorStrategyId}
						onStrategySelect={handleStrategySelect}
						onCreateStrategy={() => setIsStrategyEditorOpen(true)}
						onEditStrategy={handleEditStrategy}
						onDeleteStrategy={handleDeleteStrategy}
						onStartStrategy={async () => {}}
						onStopStrategy={async () => {}}
						loading={loading}
						error={error}
					/>

					{/* Chart */}
					<MultiPanelChart
						data={ohlcvData}
						indicators={allChartIndicators}
						loading={loading}
						symbol="BTC/USDT"
						timeframe="1h"
					/>

					{/* Data Table - Simple implementation since DataTable doesn't exist */}
					<div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
						<h3 className="text-lg font-semibold mb-4">Recent Data</h3>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-gray-700">
										<th className="text-left p-2 cursor-pointer hover:bg-gray-700">
											Time ↓
										</th>
										<th className="text-left p-2">Open</th>
										<th className="text-left p-2">High</th>
										<th className="text-left p-2">Low</th>
										<th className="text-left p-2">Close</th>
										<th className="text-left p-2">Volume</th>
									</tr>
								</thead>
								<tbody>
									{ohlcvData
										.slice()
										.sort((a, b) => b.timestamp - a.timestamp)
										.slice(0, 10)
										.map((candle, index) => (
											<tr key={index} className="border-b border-gray-700">
												<td className="p-2">
													{new Date(candle.timestamp).toLocaleString()}
												</td>
												<td className="p-2">{candle.open.toFixed(2)}</td>
												<td className="p-2">{candle.high.toFixed(2)}</td>
												<td className="p-2">{candle.low.toFixed(2)}</td>
												<td className="p-2">{candle.close.toFixed(2)}</td>
												<td className="p-2">{candle.volume.toFixed(0)}</td>
											</tr>
										))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			)}

			{/* Strategy Manager Tab */}
			{activeTab === "manager" && <StrategyManager className="max-w-none" />}

			{/* Modals */}
			<ConfigModal
				isOpen={isConfigModalOpen}
				onClose={() => setIsConfigModalOpen(false)}
				onSave={handleSaveConfig}
				strategyId=""
				title="Trading Configuration"
			/>

			<StrategyEditor
				isOpen={isStrategyEditorOpen}
				onClose={handleCloseStrategyEditor}
				onSave={handleSaveStrategy}
				strategyId={editingStrategyId}
				existingStrategy={editingStrategy}
			/>
		</div>
	);
};

export default EnhancedDashboard;
