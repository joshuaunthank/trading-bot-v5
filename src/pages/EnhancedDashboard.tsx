import React, { useState, useEffect, useMemo, useCallback } from "react";
import ChartView from "../components/ChartView";
import TableView from "../components/TableView";
import SummaryView from "../components/SummaryView";
import ConfigModal from "../components/ConfigModal";
import ChartSpinner from "../components/ChartSpinner";
import StrategyRunner from "../components/StrategyRunner";
import StrategyManager from "../components/StrategyManager";
import IndicatorControls from "../components/IndicatorControls";
import { useStrategyWebSocketEnhanced } from "../hooks/useStrategyWebSocketEnhanced";
import useOhlcvWebSocket from "../hooks/useOhlcvWebSocket";
import useStrategyExecution from "../hooks/useStrategyExecution";
import {
	useLocalIndicators,
	IndicatorConfig,
} from "../hooks/useLocalIndicators";
import { useStrategyIndicators } from "../hooks/useStrategyIndicators";

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
	const [activeTab, setActiveTab] = useState<"chart" | "strategy" | "manager">(
		"chart"
	); // Start with chart tab

	// Indicator system state
	const [indicatorConfigs, setIndicatorConfigs] = useState<IndicatorConfig[]>(
		[]
	);

	// Strategy execution system
	const {
		strategies,
		selectedStrategy,
		loading: strategyLoading,
		error: strategyError,
		selectStrategy,
		controlStrategy,
		refreshSelectedStrategy,
	} = useStrategyExecution();

	// Derive symbol and timeframe from selected strategy, with fallbacks
	const symbol = selectedStrategy?.symbol || "BTC/USDT";
	const timeframe = selectedStrategy?.timeframe || "1h";

	// Symbol/timeframe initialization - derived from strategy with fallbacks
	useEffect(() => {
		// Track symbol/timeframe changes for debugging in development
		if (process.env.NODE_ENV === "development") {
			console.log(
				`[EnhancedDashboard] Symbol/Timeframe: ${symbol}, ${timeframe} (${
					selectedStrategy
						? "from strategy: " + selectedStrategy.name
						: "default"
				})`
			);
		}
	}, [symbol, timeframe, selectedStrategy]);

	// Strategy data from WebSocket with enhanced connection
	const {
		indicators: wsIndicators,
		signals: wsSignals,
		isConnected: isStrategyConnected,
		connectionStatus: strategyConnectionStatus,
		reconnect: reconnectStrategyWs,
	} = useStrategyWebSocketEnhanced(selectedStrategy?.id || null);

	// OHLCV WebSocket with enhanced connection
	const {
		latestCandle,
		fullDataset,
		connectionStatus: ohlcvConnectionStatus,
		reconnect: reconnectOhlcvWs,
	} = useOhlcvWebSocket(symbol, timeframe);

	// Convert WebSocket data to the format our components expect
	const [indicators, setIndicators] = useState<DashboardStrategyIndicator[]>(
		[]
	);
	const [signals, setSignals] = useState<DashboardStrategySignal[]>([]);

	// Calculate indicators from OHLCV data
	const calculatedIndicators = useLocalIndicators(ohlcvData, indicatorConfigs);

	// Combine with strategy indicators from WebSocket
	const strategyIndicators = useStrategyIndicators(indicators, ohlcvData, true);

	// All indicators for the chart
	const allChartIndicators = useMemo(() => {
		return [...calculatedIndicators, ...strategyIndicators];
	}, [calculatedIndicators, strategyIndicators]);

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

	// Process WebSocket data
	useEffect(() => {
		if (wsIndicators.length > 0) {
			// Convert indicator data format
			const processedIndicators: DashboardStrategyIndicator[] = [];

			// Get the latest values from each indicator
			const latestData = wsIndicators[wsIndicators.length - 1];

			if (latestData && latestData.values) {
				// Extract each indicator from the values object
				Object.entries(latestData.values).forEach(([key, value]) => {
					processedIndicators.push({
						id: key,
						current_value: value as number,
						values: wsIndicators.map((i) => (i.values[key] as number) || 0),
					});
				});
			}

			setIndicators(processedIndicators);
		}

		// Process signal data
		if (wsSignals.length > 0) {
			// Create signals based on the type and side
			const processedSignals: DashboardStrategySignal[] = [
				{ id: "entry_long", side: "long", active: false },
				{ id: "exit_long", side: "long", active: false },
				{ id: "entry_short", side: "short", active: false },
				{ id: "exit_short", side: "short", active: false },
			];

			// Check the last 5 signals to see if any are active (recent)
			const recentSignals = wsSignals.slice(-5);
			recentSignals.forEach((signal) => {
				const signalId = `${signal.type}_${signal.side}`;
				const existingSignal = processedSignals.find((s) => s.id === signalId);
				if (existingSignal) {
					existingSignal.active = true;
				}
			});

			setSignals(processedSignals);
		}
	}, [wsIndicators, wsSignals]);

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

		// Extract strategy signals
		const strategySignals = {
			entry_long: signals.some(
				(s) => s.id.includes("entry") && s.side === "long" && s.active
			),
			entry_short: signals.some(
				(s) => s.id.includes("entry") && s.side === "short" && s.active
			),
			exit_long: signals.some(
				(s) => s.id.includes("exit") && s.side === "long" && s.active
			),
			exit_short: signals.some(
				(s) => s.id.includes("exit") && s.side === "short" && s.active
			),
		};

		// Extract indicator values
		const strategyIndicators: Record<string, number | number[]> = {};
		indicators.forEach((indicator) => {
			strategyIndicators[indicator.id] = indicator.current_value;
		});

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

	// Handle strategy selection
	const handleStrategySelect = useCallback(
		(strategyId: string) => {
			selectStrategy(strategyId);
			setActiveTab("strategy");
		},
		[selectStrategy]
	);

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
						{selectedStrategy && (
							<ConnectionStatus
								status={strategyConnectionStatus}
								type="Strategy"
								onReconnect={reconnectStrategyWs}
							/>
						)}
					</div>
					{selectedStrategy && (
						<div className="text-sm text-gray-300 mr-4">
							<div>
								Strategy:{" "}
								<span className="text-white">{selectedStrategy.name}</span>
							</div>
							<div>
								Symbol: <span className="text-white">{symbol}</span> •
								Timeframe: <span className="text-white">{timeframe}</span>
							</div>
						</div>
					)}
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
					Chart & Data
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
				<button
					className={`px-4 py-2 font-medium ${
						activeTab === "strategy"
							? "text-blue-500 border-b-2 border-blue-500"
							: "text-gray-400 hover:text-gray-300"
					}`}
					onClick={() => setActiveTab("strategy")}
					disabled={!selectedStrategy}
				>
					Strategy Runner
				</button>
			</div>

			{/* Tab content */}
			{activeTab === "chart" && (
				<>
					{/* Indicator Controls */}
					<div className="mb-4">
						<IndicatorControls
							indicators={indicatorConfigs}
							onUpdateIndicators={handleUpdateIndicators}
						/>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<ChartView
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

			{activeTab === "strategy" && (
				<>
					{/* Strategy Runner */}
					<StrategyRunner onStrategySelect={handleStrategySelect} />

					{/* Strategy signals section */}
					{selectedStrategy && (
						<div className="bg-gray-800 rounded-lg shadow-lg p-4">
							<h2 className="text-xl font-semibold mb-4">Strategy Signals</h2>

							{!isStrategyConnected ? (
								<div className="flex items-center justify-center p-8">
									<ChartSpinner size="medium" />
									<span className="ml-2">Connecting to strategy...</span>
								</div>
							) : signals.length === 0 ? (
								<div className="text-gray-400 text-center p-4">
									No signals available
								</div>
							) : (
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
									{signals.map((signal) => (
										<div
											key={signal.id}
											className={`p-4 rounded-md ${
												signal.active
													? signal.side === "long"
														? "bg-green-900/30 border border-green-500"
														: "bg-red-900/30 border border-red-500"
													: "bg-gray-700 border border-gray-600"
											}`}
										>
											<div className="font-semibold">{signal.id}</div>
											<div className="text-sm text-gray-300 flex justify-between mt-1">
												<span>Side: {signal.side}</span>
												<span>
													Status:{" "}
													{signal.active ? (
														<span className="text-green-400">Active</span>
													) : (
														<span className="text-gray-400">Inactive</span>
													)}
												</span>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					)}
				</>
			)}

			{/* Config modal */}
			<ConfigModal
				isOpen={isConfigModalOpen}
				onClose={() => setIsConfigModalOpen(false)}
				onSave={handleSaveConfig}
				strategyId={selectedStrategy?.id || ""}
				title="Trading Configuration"
			/>
		</div>
	);
};

export default EnhancedDashboard;
