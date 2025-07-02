import React, { useState, useEffect, useMemo, useCallback } from "react";
import MultiPanelChart from "../components/MultiPanelChart";
import TableView from "../components/TableView";
import SummaryView from "../components/SummaryView";
import ConfigModal from "../components/ConfigModal";
import StrategyManager from "../components/strategy/StrategyManager";
import StrategySelect from "../components/StrategySelect";
import StrategyEditor from "../components/strategy/StrategyEditor";
import { useStrategies } from "../hooks/useStrategies";
import { useOhlcvWithIndicators } from "../hooks/useOhlcvWithIndicators";

interface OHLCVData {
	timestamp: number;
	open: number;
	high: number;
	close: number;
	low: number;
	volume: number;
}

interface DashboardStrategyIndicator {
	id: string;
	current_value: number;
	values?: number[];
}

interface DashboardStrategySignal {
	id: string;
	side: "long" | "short";
	active: boolean;
}

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
	const getStatusColor = () => {
		switch (status) {
			case "connected":
			case "open":
				return "bg-green-400";
			case "connecting":
			case "reconnecting":
				return "bg-yellow-400";
			case "disconnected":
			case "closed":
			case "closing":
			default:
				return "bg-red-400";
		}
	};

	const getStatusText = () => {
		switch (status) {
			case "connected":
			case "open":
				return "Connected";
			case "connecting":
				return "Connecting";
			case "reconnecting":
				return "Reconnecting";
			case "closing":
				return "Closing";
			case "disconnected":
			case "closed":
			default:
				return "Disconnected";
		}
	};

	return (
		<div className="flex items-center space-x-1">
			<span
				className={`inline-block w-2 h-2 rounded-full ${getStatusColor()}`}
			></span>
			<span className="text-xs">
				{type}: {getStatusText()}
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
	const [ohlcvData, setOhlcvData] = useState<OHLCVData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<"chart" | "manager">("chart"); // Start with chart tab

	// Strategy Editor state
	const [isStrategyEditorOpen, setIsStrategyEditorOpen] = useState(false);
	const [editingStrategyId, setEditingStrategyId] = useState<string | null>(
		null
	);
	const [editingStrategy, setEditingStrategy] = useState<any>(null);

	// Helper function to get indicator colors
	const getIndicatorColor = useCallback((indicatorId: string) => {
		const colorMap: Record<string, string> = {
			sma: "#3B82F6",
			ema: "#10B981",
			rsi: "#F59E0B",
			macd: "#8B5CF6",
			bb_upper: "#EF4444",
			bb_middle: "#6B7280",
			bb_lower: "#EF4444",
			stoch_k: "#EC4899",
			stoch_d: "#06B6D4",
		};
		return colorMap[indicatorId] || "#6B7280";
	}, []);

	// Strategy selection for indicator management
	const [selectedIndicatorStrategyId, setSelectedIndicatorStrategyId] =
		useState<string | null>(null); // No default strategy selected
	const {
		strategies: availableStrategies,
		loading: strategiesLoading,
		error: strategiesError,
		loadStrategies,
	} = useStrategies();

	// Simple symbol and timeframe state - no complex strategy execution needed
	const [symbol] = useState("BTC/USDT");
	const [timeframe] = useState("1h");

	// Symbol/timeframe initialization - simple static values for now
	useEffect(() => {
		// Set static symbol/timeframe for simplified trading bot operation
	}, [symbol, timeframe]);

	// Strategy data - simplified, no complex WebSocket strategy execution
	const [indicators, setIndicators] = useState<DashboardStrategyIndicator[]>(
		[]
	);
	const [signals, setSignals] = useState<DashboardStrategySignal[]>([]);

	// OHLCV + Backend Indicators WebSocket - unified data source
	const {
		latestCandle,
		fullDataset,
		indicators: backendIndicators,
		connectionStatus: ohlcvConnectionStatus,
		reconnect: reconnectOhlcvWs,
		setStrategy,
	} = useOhlcvWithIndicators(symbol, timeframe, selectedIndicatorStrategyId);

	// Convert backend indicators to chart format for compatibility
	const allChartIndicators = useMemo(() => {
		const converted = backendIndicators.map((indicator) => ({
			id: indicator.id,
			name: indicator.name,
			type: indicator.type as any, // Cast to satisfy CalculatedIndicator interface
			data: indicator.data,
			color: getIndicatorColor(indicator.id),
			yAxisID: "y1", // Default to secondary y-axis, can be customized per indicator
		}));

		return converted;
	}, [backendIndicators, getIndicatorColor]);

	// Track connection status for error handling
	useEffect(() => {
		// Monitor OHLCV connection status for error display
		if (
			ohlcvConnectionStatus !== "connected" &&
			ohlcvConnectionStatus !== "open"
		) {
			// Connection issues will be handled by error state
		}
	}, [ohlcvConnectionStatus]);

	// Handle WebSocket full dataset updates
	useEffect(() => {
		if (fullDataset && fullDataset.length > 0) {
			// Normalize data to chronological order (oldest first) for consistent calculations
			const normalizedData = [...fullDataset].sort(
				(a, b) => a.timestamp - b.timestamp
			);
			setOhlcvData(normalizedData);
			setLoading(false);
			setError(null);
		}
	}, [fullDataset]);

	// Handle WebSocket connection status for loading state
	useEffect(() => {
		if (
			(ohlcvConnectionStatus === "connected" ||
				ohlcvConnectionStatus === "open") &&
			fullDataset?.length === 0
		) {
			setLoading(true); // Connected but waiting for data
		} else if (
			ohlcvConnectionStatus === "disconnected" ||
			ohlcvConnectionStatus === "closed"
		) {
			setError("WebSocket connection lost. Reconnecting...");
		} else if (ohlcvConnectionStatus === "connecting") {
			setLoading(true);
			setError(null);
		}
	}, [ohlcvConnectionStatus, fullDataset?.length]);

	// Handle incremental updates for live data
	useEffect(() => {
		if (latestCandle) {
			setOhlcvData((prevData) => {
				const existingIndex = prevData.findIndex(
					(candle) => candle.timestamp === latestCandle.timestamp
				);

				if (existingIndex >= 0) {
					// Update existing candle (live updates)
					const existingCandle = prevData[existingIndex];
					if (
						existingCandle.close !== latestCandle.close ||
						existingCandle.high !== latestCandle.high ||
						existingCandle.low !== latestCandle.low ||
						existingCandle.volume !== latestCandle.volume
					) {
						const newData = [...prevData];
						newData[existingIndex] = { ...latestCandle };
						return newData;
					}
					return prevData; // No change
				} else {
					// Add new candle chronologically
					const newData = [...prevData, { ...latestCandle }];
					newData.sort((a, b) => a.timestamp - b.timestamp);
					return newData.slice(-1000); // Keep last 1000 candles
				}
			});
		}
	}, [latestCandle]);

	// Note: Strategy WebSocket processing removed for simplification
	// Indicators are now managed through StrategySelect component

	// Calculate summary data
	const calculateSummaryData = () => {
		if (!Array.isArray(ohlcvData) || ohlcvData.length === 0) return {};

		// Data is now normalized to chronological order (oldest first, newest last)
		const latestCandle = ohlcvData[ohlcvData.length - 1]; // Last item is newest

		// Calculate timeframe-aware 24h comparison
		const getTimeframeMilliseconds = (tf: string): number => {
			const timeframeMap: Record<string, number> = {
				"1m": 60 * 1000,
				"3m": 3 * 60 * 1000,
				"5m": 5 * 60 * 1000,
				"15m": 15 * 60 * 1000,
				"30m": 30 * 60 * 1000,
				"1h": 60 * 60 * 1000,
				"2h": 2 * 60 * 60 * 1000,
				"4h": 4 * 60 * 60 * 1000,
				"6h": 6 * 60 * 60 * 1000,
				"8h": 8 * 60 * 60 * 1000,
				"12h": 12 * 60 * 60 * 1000,
				"1d": 24 * 60 * 60 * 1000,
				"3d": 3 * 24 * 60 * 60 * 1000,
				"1w": 7 * 24 * 60 * 60 * 1000,
			};
			return timeframeMap[tf] || 60 * 60 * 1000; // Default to 1h
		};

		// Calculate how many candles back we need for 24 hours
		const timeframeMs = getTimeframeMilliseconds(timeframe);
		const candlesIn24h = Math.ceil((24 * 60 * 60 * 1000) / timeframeMs);

		// Get the candle from 24 hours ago - data is oldest first, so go backwards from latest
		const targetIndex = Math.max(0, ohlcvData.length - 1 - candlesIn24h);
		const previous24hCandle = ohlcvData[targetIndex];

		const priceChange24h = latestCandle.close - previous24hCandle.close;
		const priceChangePercent24h =
			(priceChange24h / previous24hCandle.close) * 100;

		// Use consistent array-based approach for all 24h calculations
		const last24hCandles = ohlcvData.slice(targetIndex);

		// Calculate 24h volume using the same candles
		const volumeIn24h = last24hCandles.reduce(
			(sum, candle) => sum + candle.volume,
			0
		);

		// Find 24h high and low using the same candles
		const high24h = Math.max(...last24hCandles.map((candle) => candle.high));
		const low24h = Math.min(...last24hCandles.map((candle) => candle.low));

		// Simple trading data - no strategy signals for now
		const strategySignals = {
			entry_long: false,
			entry_short: false,
			exit_long: false,
			exit_short: false,
		};

		// Simple indicator data - no strategy indicators for now
		const strategyIndicators: Record<string, number | number[]> = {};

		console.log("🔥 Current Price", latestCandle.close);

		return {
			symbol,
			timeframe,
			current_price: latestCandle.close,
			price_change_24h: priceChange24h,
			price_change_percent_24h: priceChangePercent24h,
			volume_24h: volumeIn24h,
			high_24h: high24h,
			low_24h: low24h,
			strategy_signals: strategySignals,
			strategy_indicators: strategyIndicators,
			last_updated: latestCandle.timestamp,
		};
	};

	// Handle strategy selection - simplified
	const handleStrategySelect = useCallback((strategyId: string) => {
		// For now, just switch to manager tab
		setActiveTab("manager");
	}, []);

	// Handle strategy config save
	const handleSaveConfig = useCallback((config: any) => {
		// TODO: Implement config save to API
		setIsConfigModalOpen(false);
	}, []);

	// Strategy Editor handlers
	const handleCreateStrategy = useCallback(() => {
		console.log("🔥 CREATE STRATEGY CLICKED!");
		setEditingStrategyId(null);
		setEditingStrategy(null);
		setIsStrategyEditorOpen(true);
		console.log("🔥 Modal state set to:", true);
	}, []);

	const handleEditStrategy = useCallback(async (strategyId: string) => {
		console.log("🔥 EDIT STRATEGY CLICKED!", strategyId);
		try {
			// Fetch the full strategy data
			const response = await fetch(`/api/v1/strategies/${strategyId}`);
			if (response.ok) {
				const strategy = await response.json();
				setEditingStrategyId(strategyId);
				setEditingStrategy(strategy);
				setIsStrategyEditorOpen(true);
				console.log("🔥 Modal state set to:", true, "with strategy:", strategy);
			} else {
				console.error("Failed to fetch strategy for editing");
			}
		} catch (error) {
			console.error("Error fetching strategy:", error);
		}
	}, []);

	const handleDeleteStrategy = useCallback(async (strategyId: string) => {
		console.log("🔥 DELETE STRATEGY CLICKED!", strategyId);
		try {
			const response = await fetch(`/api/v1/strategies/${strategyId}`, {
				method: "DELETE",
			});

			if (response.ok) {
				// Refresh strategies list
				await loadStrategies();
				setSelectedIndicatorStrategyId(null); // Clear selection
			} else {
				console.error("Failed to delete strategy");
			}
		} catch (error) {
			console.error("Error deleting strategy:", error);
		}
	}, []);

	const startStrategy = useCallback(async (strategyId: string) => {
		console.log("🔥 START STRATEGY CLICKED!", strategyId);
		try {
			const response = await fetch(`/api/v1/strategies/${strategyId}/start`, {
				method: "POST",
			});

			if (response.ok) {
				console.log(`Strategy ${strategyId} started successfully`);
			} else {
				console.error(`Failed to start strategy ${strategyId}`);
			}
		} catch (error) {
			console.error("Error starting strategy:", error);
		}
	}, []);

	const stopStrategy = useCallback(async (strategyId: string) => {
		console.log("🔥 STOP STRATEGY CLICKED!", strategyId);
		try {
			const response = await fetch(`/api/v1/strategies/${strategyId}/stop`, {
				method: "POST",
			});

			if (response.ok) {
				console.log(`Strategy ${strategyId} stopped successfully`);
			} else {
				console.error(`Failed to stop strategy ${strategyId}`);
			}
		} catch (error) {
			console.error("Error stopping strategy:", error);
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
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(strategyData),
				});

				if (response.ok) {
					setIsStrategyEditorOpen(false);
					setEditingStrategyId(null);
					setEditingStrategy(null);
					// Refresh strategies list
					await loadStrategies();
				} else {
					console.error("Failed to save strategy");
				}
			} catch (error) {
				console.error("Error saving strategy:", error);
			}
		},
		[editingStrategyId, loadStrategies]
	);

	const handleCloseStrategyEditor = useCallback(() => {
		setIsStrategyEditorOpen(false);
		setEditingStrategyId(null);
		setEditingStrategy(null);
	}, []);

	// Summary data
	const summaryData = calculateSummaryData();

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold">Trading Dashboard</h1>
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

			{error && (
				<div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-md">
					{error}
				</div>
			)}

			<SummaryView data={summaryData} isLoading={loading} />

			{/* Tab selector */}
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

			{/* Tab content */}
			{activeTab === "chart" && (
				<>
					{/* Strategy Indicator Controls */}
					<div className="mb-4">
						<StrategySelect
							strategies={availableStrategies}
							selectedStrategyId={selectedIndicatorStrategyId}
							onStrategySelect={setSelectedIndicatorStrategyId}
							onCreateStrategy={handleCreateStrategy}
							onEditStrategy={handleEditStrategy}
							onDeleteStrategy={handleDeleteStrategy}
							onStartStrategy={startStrategy}
							onStopStrategy={stopStrategy}
							loading={strategiesLoading}
							error={strategiesError}
						/>
					</div>

					<div className="mb-4">
						<MultiPanelChart
							data={ohlcvData}
							symbol={symbol}
							timeframe={timeframe}
							loading={loading}
							indicators={allChartIndicators}
						/>
					</div>
					<div className="">
						<TableView
							data={ohlcvData.slice().reverse()} // Show all candles, newest first
							loading={loading}
							symbol={symbol}
							timeframe={timeframe}
						/>
					</div>
				</>
			)}

			{activeTab === "manager" && <StrategyManager className="max-w-none" />}

			{/* Config modal */}
			<ConfigModal
				isOpen={isConfigModalOpen}
				onClose={() => setIsConfigModalOpen(false)}
				onSave={handleSaveConfig}
				strategyId=""
				title="Trading Configuration"
			/>

			{/* Strategy Editor modal */}
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
