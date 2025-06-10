import React, { useState, useEffect } from "react";
import ChartView from "../components/ChartView";
import TableView from "../components/TableView";
import SummaryView from "../components/SummaryView";
import ConfigModal from "../components/ConfigModal";
import ChartSpinner from "../components/ChartSpinner";
import StrategyRunner from "../components/StrategyRunner";
import WebSocketTest from "../components/WebSocketTest";
import { useStrategyWebSocket } from "../hooks/useStrategyWebSocket";

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

const Dashboard: React.FC = () => {
	const [ohlcvData, setOhlcvData] = useState<OHLCVData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeStrategy, setActiveStrategy] = useState<string | null>(null);
	const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
	const [symbol, setSymbol] = useState("BTC/USDT");
	const [timeframe, setTimeframe] = useState("1h");
	const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);

	// Strategy data from WebSocket
	const {
		indicators: wsIndicators,
		signals: wsSignals,
		isConnected: isStrategyConnected,
	} = useStrategyWebSocket(activeStrategy);

	// Convert WebSocket data to the format our components expect
	const [indicators, setIndicators] = useState<DashboardStrategyIndicator[]>(
		[]
	);
	const [signals, setSignals] = useState<DashboardStrategySignal[]>([]);

	// Process WebSocket data
	useEffect(() => {
		if (wsIndicators.length > 0) {
			// Convert indicator data format
			const processedIndicators: DashboardStrategyIndicator[] = [];

			// Get the latest values from each indicator
			const latestData = wsIndicators[wsIndicators.length - 1];

			if (latestData) {
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
		if (ohlcvData.length === 0) return {};

		const latestCandle = ohlcvData[0];
		const previous24hCandle =
			ohlcvData.find(
				(candle) =>
					candle.timestamp <= latestCandle.timestamp - 24 * 60 * 60 * 1000
			) || ohlcvData[ohlcvData.length - 1];

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

	// Fetch OHLCV data
	useEffect(() => {
		const fetchOHLCVData = async () => {
			try {
				setLoading(true);
				const response = await fetch(
					`/api/v1/ohlcv?symbol=${symbol}&timeframe=${timeframe}`
				);

				if (!response.ok) {
					throw new Error(`Failed to fetch OHLCV data: ${response.statusText}`);
				}

				const data = await response.json();
				setOhlcvData(data);
				setError(null);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "An unknown error occurred"
				);
			} finally {
				setLoading(false);
			}
		};

		fetchOHLCVData();

		// Set up WebSocket for live data updates
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const wsUrl = `${protocol}//${window.location.host}/ws/ohlcv?symbol=${symbol}&timeframe=${timeframe}`;

		const ws = new WebSocket(wsUrl);

		ws.onopen = () => {
			console.log("OHLCV WebSocket connected");
			setIsWebSocketConnected(true);
		};

		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);

				if (data.type === "candle") {
					// Update or add the latest candle
					setOhlcvData((prevData) => {
						// Check if this candle already exists in our data
						const existingIndex = prevData.findIndex(
							(candle) => candle.timestamp === data.candle.timestamp
						);

						if (existingIndex >= 0) {
							// Update existing candle
							const newData = [...prevData];
							newData[existingIndex] = data.candle;
							return newData;
						} else {
							// Add new candle at the beginning
							return [data.candle, ...prevData];
						}
					});
				}
			} catch (err) {
				console.error("Failed to parse WebSocket message:", err);
			}
		};

		ws.onerror = (error) => {
			console.error("OHLCV WebSocket error:", error);
			setIsWebSocketConnected(false);
		};

		ws.onclose = () => {
			console.log("OHLCV WebSocket disconnected");
			setIsWebSocketConnected(false);
		};

		// Cleanup on unmount
		return () => {
			ws.close();
		};
	}, [symbol, timeframe]);

	// Handle timeframe change
	const handleTimeframeChange = (newTimeframe: string) => {
		setTimeframe(newTimeframe);
	};

	// Handle strategy selection
	const handleStrategySelect = (strategyId: string) => {
		setActiveStrategy(strategyId);
	};

	// Handle strategy config save
	const handleSaveConfig = (config: any) => {
		// Save config to API
		console.log("Saving config:", config);
		setIsConfigModalOpen(false);
	};

	// Prepare indicator overlays for chart
	const chartIndicators = indicators.map((indicator, index) => {
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

	// Summary data
	const summaryData = calculateSummaryData();

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold">Trading Dashboard</h1>
				<div className="flex space-x-2 items-center">
					{isWebSocketConnected && (
						<span className="text-green-400 text-xs flex items-center">
							<span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-1"></span>
							Live
						</span>
					)}
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

			{/* Strategy Runner */}
			<StrategyRunner onStrategySelect={handleStrategySelect} />

			{/* WebSocket Test Component */}
			<WebSocketTest />

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

export default Dashboard;
