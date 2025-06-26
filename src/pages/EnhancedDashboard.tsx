import React, { useState, useEffect, useMemo, useCallback } from "react";
import MultiPanelChart from "../components/MultiPanelChart";
import TableView from "../components/TableView";
import SummaryView from "../components/SummaryView";
import ConfigModal from "../components/ConfigModal";
import StrategyManager from "../components/StrategyManager";
import StrategySelect from "../components/StrategySelect";
import { useStrategies } from "../hooks/useStrategies";
import { useOhlcvWebSocket } from "../hooks/useWebSocket";
import {
	useLocalIndicators,
	IndicatorConfig,
} from "../hooks/useLocalIndicators";

interface OHLCVData {
	timestamp: number;
	open: number;
	high: number;
	close: number;
	low: number;
	volume: number;
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

	// Indicator system state
	const [indicatorConfigs, setIndicatorConfigs] = useState<IndicatorConfig[]>(
		[]
	);

	// Strategy selection for indicator management
	const [selectedIndicatorStrategyId, setSelectedIndicatorStrategyId] =
		useState<string | null>(null);
	const {
		strategies: availableStrategies,
		loading: strategiesLoading,
		error: strategiesError,
	} = useStrategies();

	// Simple symbol and timeframe state - no complex strategy execution needed
	const [symbol] = useState("BTC/USDT");
	const [timeframe] = useState("1h");

	// Symbol/timeframe initialization - simple static values for now
	useEffect(() => {
		// Track symbol/timeframe changes for debugging in development
		if (process.env.NODE_ENV === "development") {
			console.log(
				`[EnhancedDashboard] Using static symbol/timeframe: ${symbol}/${timeframe}`
			);
		}
	}, [symbol, timeframe]);

	// Strategy data - simplified, no complex WebSocket strategy execution
	// Note: Strategy indicators now come through StrategySelect component instead

	// OHLCV WebSocket for chart data
	const {
		latestCandle,
		fullDataset,
		connectionStatus: ohlcvConnectionStatus,
		reconnect: reconnectOhlcvWs,
	} = useOhlcvWebSocket(symbol, timeframe);

	// Calculate indicators from OHLCV data
	const calculatedIndicators = useLocalIndicators(ohlcvData, indicatorConfigs);

	// All indicators for the chart (simplified - just calculated indicators)
	const allChartIndicators = useMemo(() => {
		return calculatedIndicators;
	}, [calculatedIndicators]);

	// Track connection status for error handling
	useEffect(() => {
		// Log connection issues for debugging
		if (
			ohlcvConnectionStatus !== "connected" &&
			ohlcvConnectionStatus !== "open"
		) {
			console.log(
				`[EnhancedDashboard] OHLCV connection: ${ohlcvConnectionStatus}`
			);
		}
	}, [ohlcvConnectionStatus]);

	// Handle WebSocket full dataset updates
	useEffect(() => {
		if (fullDataset && fullDataset.length > 0) {
			setOhlcvData(fullDataset);
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

		// Data is now in chronological order (oldest first, newest last)
		const latestCandle = ohlcvData[ohlcvData.length - 1];
		const previous24hCandle =
			ohlcvData.find(
				(candle) =>
					candle.timestamp <= latestCandle.timestamp - 24 * 60 * 60 * 1000
			) || ohlcvData[0]; // Use oldest candle as fallback

		const priceChange24h = latestCandle.close - previous24hCandle.close;
		const priceChangePercent24h =
			(priceChange24h / previous24hCandle.close) * 100;

		// Calculate 24h volume
		const volumeIn24h = ohlcvData
			.filter(
				(candle) =>
					candle.timestamp >= latestCandle.timestamp - 24 * 60 * 60 * 1000
			)
			.reduce((sum, candle) => sum + candle.volume, 0);

		// Find 24h high and low
		const high24h = Math.max(
			...ohlcvData
				.filter(
					(candle) =>
						candle.timestamp >= latestCandle.timestamp - 24 * 60 * 60 * 1000
				)
				.map((candle) => candle.high)
		);

		const low24h = Math.min(
			...ohlcvData
				.filter(
					(candle) =>
						candle.timestamp >= latestCandle.timestamp - 24 * 60 * 60 * 1000
				)
				.map((candle) => candle.low)
		);

		// Simple trading data - no strategy signals for now
		const strategySignals = {
			entry_long: false,
			entry_short: false,
			exit_long: false,
			exit_short: false,
		};

		// Simple indicator data - no strategy indicators for now
		const strategyIndicators: Record<string, number | number[]> = {};

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

	// Handler for updating indicator configurations
	const handleUpdateIndicators = useCallback(
		(newConfigs: IndicatorConfig[]) => {
			setIndicatorConfigs(newConfigs);
		},
		[]
	);

	// Handler for strategy-based indicator changes
	const handleStrategyIndicatorsChange = useCallback(
		(indicators: IndicatorConfig[]) => {
			setIndicatorConfigs(indicators);
		},
		[]
	);

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
							onIndicatorsChange={handleStrategyIndicatorsChange}
							loading={strategiesLoading}
							error={strategiesError}
						/>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<MultiPanelChart
							data={ohlcvData}
							symbol={symbol}
							timeframe={timeframe}
							loading={loading}
							indicators={allChartIndicators}
						/>

						<TableView
							data={ohlcvData.slice(0, 10)}
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
		</div>
	);
};

export default EnhancedDashboard;
