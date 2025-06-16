import React, { useState, useEffect, useMemo, useCallback } from "react";
import ChartView from "../components/ChartView";
import TableView from "../components/TableView";
import SummaryView from "../components/SummaryView";
import ConfigModal from "../components/ConfigModal";
import ChartSpinner from "../components/ChartSpinner";
import StrategyRunner from "../components/StrategyRunner";
import { useStrategyWebSocketEnhanced } from "../hooks/useStrategyWebSocketEnhanced";
import useOhlcvWebSocket from "../hooks/useOhlcvWebSocket";

console.log("[EnhancedDashboard] Module loaded");

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
			case "open":
				return "bg-green-400";
			case "connecting":
				return "bg-yellow-400";
			case "reconnecting":
				return "bg-yellow-400";
			case "closed":
			case "closing":
			default:
				return "bg-red-400";
		}
	};

	const getStatusText = () => {
		switch (status) {
			case "open":
				return "Connected";
			case "connecting":
				return "Connecting";
			case "reconnecting":
				return "Reconnecting";
			case "closing":
				return "Closing";
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
			{(status === "closed" || status === "closing") && onReconnect && (
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
	const [activeStrategy, setActiveStrategy] = useState<string | null>(null);
	const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
	const [symbol, setSymbol] = useState("BTC/USDT");
	const [timeframe, setTimeframe] = useState("1h");
	const [activeTab, setActiveTab] = useState<"chart" | "strategy">("chart"); // Start with chart tab

	// Log initialization only once when symbol/timeframe changes
	useEffect(() => {
		console.log(
			`[EnhancedDashboard] Initializing with symbol: ${symbol}, timeframe: ${timeframe}`
		);
	}, [symbol, timeframe]);

	// Strategy data from WebSocket with enhanced connection
	const {
		indicators: wsIndicators,
		signals: wsSignals,
		isConnected: isStrategyConnected,
		connectionStatus: strategyConnectionStatus,
		reconnect: reconnectStrategyWs,
	} = useStrategyWebSocketEnhanced(activeStrategy);

	// OHLCV WebSocket with enhanced connection
	const {
		latestCandle,
		fullDataset,
		connectionStatus: ohlcvConnectionStatus,
		reconnect: reconnectOhlcvWs,
	} = useOhlcvWebSocket(symbol, timeframe);

	// Log connection status changes only
	useEffect(() => {
		console.log(
			`[EnhancedDashboard] OHLCV connection status: ${ohlcvConnectionStatus}`
		);
	}, [ohlcvConnectionStatus]);

	// Convert WebSocket data to the format our components expect
	const [indicators, setIndicators] = useState<DashboardStrategyIndicator[]>(
		[]
	);
	const [signals, setSignals] = useState<DashboardStrategySignal[]>([]);

	// Update OHLCV data when we receive fullDataset (for full updates) or latestCandle (for incremental updates)
	useEffect(() => {
		// Prioritize fullDataset for full updates
		if (fullDataset && fullDataset.length > 0) {
			console.log(
				`[EnhancedDashboard] Using WebSocket fullDataset: ${fullDataset.length} candles`
			);
			setOhlcvData(fullDataset);
		} else if (latestCandle) {
			console.log(
				"[EnhancedDashboard] Processing incremental update:",
				latestCandle
			);
			setOhlcvData((prevData) => {
				// Check if this candle already exists in our data
				const existingIndex = prevData.findIndex(
					(candle) => candle.timestamp === latestCandle.timestamp
				);

				if (existingIndex >= 0) {
					// Update existing candle (live candle updating) - optimized for Chart.js
					const existingCandle = prevData[existingIndex];
					if (
						existingCandle.close !== latestCandle.close ||
						existingCandle.high !== latestCandle.high ||
						existingCandle.low !== latestCandle.low ||
						existingCandle.volume !== latestCandle.volume
					) {
						console.log("[EnhancedDashboard] Updating existing candle");
						const newData = [...prevData];
						newData[existingIndex] = { ...latestCandle };
						return newData;
					}
					// No change, return same reference to prevent re-render
					return prevData;
				} else {
					console.log("[EnhancedDashboard] Adding new candle to data");
					// Add new candle in chronological order
					const newData = [...prevData, { ...latestCandle }];
					// Sort chronologically (oldest first, newest last) for Chart.js compatibility
					newData.sort((a, b) => a.timestamp - b.timestamp);
					// Keep only the most recent candles (limit to prevent memory issues)
					return newData.slice(-1000); // Keep last 1000 candles
				}
			});
		}
	}, [latestCandle, fullDataset]);

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

	// Initialize data from REST API fallback only when WebSocket is not connected
	useEffect(() => {
		const initializeOHLCVData = async () => {
			// Only use REST API if WebSocket is not connected and we have no fullDataset
			if (
				ohlcvConnectionStatus !== "connected" &&
				(!fullDataset || fullDataset.length === 0)
			) {
				console.log(
					"[EnhancedDashboard] WebSocket not connected, fetching from REST API"
				);
				try {
					setLoading(true);
					const response = await fetch(
						`/api/v1/ohlcv?symbol=${symbol}&timeframe=${timeframe}`
					);

					if (!response.ok) {
						throw new Error(
							`Failed to fetch OHLCV data: ${response.statusText}`
						);
					}

					const data = await response.json();
					console.log("[EnhancedDashboard] Received REST OHLCV data:", data);

					// Transform REST data to our format
					let ohlcvArray: OHLCVData[] = [];

					if (
						data.result &&
						data.result.ohlcv &&
						Array.isArray(data.result.ohlcv)
					) {
						ohlcvArray = data.result.ohlcv;
					} else if (
						data.result &&
						data.result.dates &&
						Array.isArray(data.result.dates)
					) {
						const { dates, open, high, low, close, volume } = data.result;
						ohlcvArray = dates.map((dateStr: string, index: number) => ({
							timestamp: new Date(dateStr).getTime(),
							open: open[index] || 0,
							high: high[index] || 0,
							low: low[index] || 0,
							close: close[index] || 0,
							volume: volume[index] || 0,
						}));
					} else if (Array.isArray(data.result)) {
						ohlcvArray = data.result;
					} else if (Array.isArray(data)) {
						ohlcvArray = data;
					}

					console.log(
						"[EnhancedDashboard] Transformed REST OHLCV data:",
						ohlcvArray.slice(0, 3)
					);
					setOhlcvData(ohlcvArray);
					setError(null);
				} catch (err) {
					setError(
						err instanceof Error ? err.message : "An unknown error occurred"
					);
				} finally {
					setLoading(false);
				}
			}
		};

		initializeOHLCVData();
	}, [symbol, timeframe, fullDataset, ohlcvConnectionStatus]);

	// Handle timeframe change with memoization to prevent unnecessary chart redraws
	const handleTimeframeChange = useCallback(
		(newTimeframe: string) => {
			console.log(
				`[EnhancedDashboard] Changing timeframe from ${timeframe} to ${newTimeframe}`
			);
			setLoading(true); // Set loading state to show spinner during timeframe change
			setTimeframe(newTimeframe);
		},
		[timeframe]
	);

	// Handle strategy selection
	const handleStrategySelect = useCallback((strategyId: string) => {
		setActiveStrategy(strategyId);
		setActiveTab("strategy");
	}, []);

	// Handle strategy config save
	const handleSaveConfig = useCallback((config: any) => {
		// Save config to API
		console.log("Saving config:", config);
		setIsConfigModalOpen(false);
	}, []);

	// Prepare indicator overlays for chart with memoization
	const chartIndicators = useMemo(() => {
		return indicators.map((indicator, index) => {
			// Generate a color based on index
			const colors = [
				"rgba(255, 99, 132, 1)",
				"rgba(54, 162, 235, 1)",
				"rgba(255, 206, 86, 1)",
				"rgba(75, 192, 192, 1)",
				"rgba(153, 102, 255, 1)",
				"rgba(255, 159, 64, 1)",
			];
			const color = colors[index % colors.length];

			return {
				name: indicator.id,
				data: Array.isArray(indicator.values)
					? indicator.values
					: Array(ohlcvData.length).fill(indicator.current_value),
				color,
			};
		});
	}, [indicators, ohlcvData.length]);

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
						{activeStrategy && (
							<ConnectionStatus
								status={strategyConnectionStatus}
								type="Strategy"
								onReconnect={reconnectStrategyWs}
							/>
						)}
					</div>
					<select
						className="bg-gray-700 text-white px-3 py-2 rounded-md"
						value={symbol}
						onChange={(e) => setSymbol(e.target.value)}
					>
						<option value="BTC/USDT">BTC/USDT</option>
						<option value="ETH/USDT">ETH/USDT</option>
						<option value="SOL/USDT">SOL/USDT</option>
						<option value="BNB/USDT">BNB/USDT</option>
					</select>
					<select
						className="bg-gray-700 text-white px-3 py-2 rounded-md"
						value={timeframe}
						onChange={(e) => handleTimeframeChange(e.target.value)}
					>
						<option value="1m">1m</option>
						<option value="5m">5m</option>
						<option value="15m">15m</option>
						<option value="1h">1h</option>
						<option value="4h">4h</option>
						<option value="1d">1d</option>
					</select>
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
						activeTab === "strategy"
							? "text-blue-500 border-b-2 border-blue-500"
							: "text-gray-400 hover:text-gray-300"
					}`}
					onClick={() => setActiveTab("strategy")}
					disabled={!activeStrategy}
				>
					Strategy
				</button>
			</div>

			{/* Tab content */}
			{activeTab === "chart" && (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<ChartView
						data={ohlcvData}
						symbol={symbol}
						timeframe={timeframe}
						loading={loading}
						indicators={chartIndicators}
						onTimeframeChange={handleTimeframeChange}
					/>

					<TableView
						data={ohlcvData.slice(0, 10)}
						loading={loading}
						symbol={symbol}
						timeframe={timeframe}
					/>
				</div>
			)}

			{activeTab === "strategy" && (
				<>
					{/* Strategy Runner */}
					<StrategyRunner onStrategySelect={handleStrategySelect} />

					{/* Strategy signals section */}
					{activeStrategy && (
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
				strategyId={activeStrategy || ""}
				title="Trading Configuration"
			/>
		</div>
	);
};

export default EnhancedDashboard;
