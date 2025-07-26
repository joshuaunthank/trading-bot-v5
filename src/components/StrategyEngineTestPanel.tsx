/**
 * Strategy Engine Test Panel - Frontend Testing Component
 *
 * This component provides a comprehensive testing interface for the strategy engine
 * with real-time updates, controls, and status monitoring.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useWebSocket } from "../hooks/useWebSocket";

interface StrategyStatus {
	id: string;
	name: string;
	status: "running" | "stopped" | "paused" | "error";
	performance: {
		totalSignals: number;
		entrySignals: number;
		exitSignals: number;
		avgConfidence: number;
		uptime: number;
		candlesProcessed: number;
	};
	state: {
		startTime: number | null;
		totalCandles: number;
		totalSignals: number;
		lastUpdate: number;
	};
}

interface TradingSignal {
	id: string;
	strategyId: string;
	type: "entry" | "exit";
	side: "long" | "short";
	price: number;
	confidence: number;
	timestamp: number;
	conditions: string[];
	indicators: Record<string, number>;
}

interface StrategyEngineTestPanelProps {
	className?: string;
}

const StrategyEngineTestPanel: React.FC<StrategyEngineTestPanelProps> = ({
	className = "",
}) => {
	const [strategies, setStrategies] = useState<StrategyStatus[]>([]);
	const [signals, setSignals] = useState<TradingSignal[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedStrategy, setSelectedStrategy] = useState<string>(
		"enhanced_rsi_ema_strategy"
	);

	// WebSocket connection for real-time strategy updates
	const webSocket = useWebSocket({
		url: "ws://localhost:3001/ws/ohlcv", // Use the same unified WebSocket as the rest of the app
		onMessage: handleWebSocketMessage,
		onStatusChange: (status: string) =>
			console.log("WebSocket status:", status),
		onError: (error: Error) => console.error("WebSocket error:", error),
		maxReconnectAttempts: 10,
		reconnectInterval: 3000,
	});

	// Handle WebSocket messages
	function handleWebSocketMessage(data: any) {
		try {
			const message = JSON.parse(data);

			switch (message.type) {
				case "strategy-initial-status":
					handleInitialStrategyStatus(message.data);
					break;
				case "strategy-states":
					handleStrategyStates(message.data);
					break;
				case "signal-generated":
					handleSignalGenerated(message.data);
					break;
				case "strategy-event":
					handleStrategyEvent(message.data);
					break;
				case "strategy-control-response":
					handleStrategyControlResponse(message);
					break;
				case "strategy-status-response":
					handleStrategyStatusResponse(message.data);
					break;
				default:
					console.log("Unknown message type:", message.type);
			}
		} catch (error) {
			console.error("Failed to parse WebSocket message:", error);
		}
	}

	// Handle initial strategy status
	const handleInitialStrategyStatus = useCallback((data: any) => {
		if (data.success && data.strategies) {
			const strategyList = data.strategies.map((strategy: any) => ({
				id: strategy.id,
				name: strategy.name,
				status: strategy.status,
				performance: data.performance[strategy.id] || {},
				state: data.states[strategy.id] || {},
			}));
			setStrategies(strategyList);
		}
	}, []);

	// Handle strategy states update
	const handleStrategyStates = useCallback((data: any) => {
		setStrategies((prev) =>
			prev.map((strategy) => ({
				...strategy,
				state: data[strategy.id] || strategy.state,
			}))
		);
	}, []);

	// Handle signal generation
	const handleSignalGenerated = useCallback((signal: TradingSignal) => {
		setSignals((prev) => [signal, ...prev.slice(0, 49)]); // Keep last 50 signals
		console.log("🚨 Trading Signal:", signal);
	}, []);

	// Handle strategy events
	const handleStrategyEvent = useCallback((event: any) => {
		console.log("📊 Strategy Event:", event);
	}, []);

	// Handle strategy control response
	const handleStrategyControlResponse = useCallback((response: any) => {
		console.log("Strategy Control Response:", response);
		if (response.result.success) {
			// Refresh strategy status
			requestStrategyStatus();
		} else {
			setError(response.result.message);
		}
	}, []);

	// Handle strategy status response
	const handleStrategyStatusResponse = useCallback(
		(data: any) => {
			if (data.success) {
				if (data.strategies) {
					// All strategies status
					handleInitialStrategyStatus(data);
				} else {
					// Single strategy status
					setStrategies((prev) =>
						prev.map((strategy) =>
							strategy.id === data.strategy_id
								? {
										...strategy,
										status: data.status,
										performance: data.performance,
										state: data.state,
								  }
								: strategy
						)
					);
				}
			}
		},
		[handleInitialStrategyStatus]
	);

	// Request strategy status
	const requestStrategyStatus = useCallback(() => {
		webSocket.send(
			JSON.stringify({
				type: "get-strategy-status",
			})
		);
	}, [webSocket]);

	// Strategy control functions
	const startStrategy = useCallback(
		(strategyId: string) => {
			setLoading(true);
			setError(null);
			webSocket.send(
				JSON.stringify({
					type: "strategy-control",
					action: "start",
					strategyId: strategyId,
				})
			);
		},
		[webSocket]
	);

	const stopStrategy = useCallback(
		(strategyId: string) => {
			setLoading(true);
			setError(null);
			webSocket.send(
				JSON.stringify({
					type: "strategy-control",
					action: "stop",
					strategyId: strategyId,
				})
			);
		},
		[webSocket]
	);

	const pauseStrategy = useCallback(
		(strategyId: string) => {
			setLoading(true);
			setError(null);
			webSocket.send(
				JSON.stringify({
					type: "strategy-control",
					action: "pause",
					strategyId: strategyId,
				})
			);
		},
		[webSocket]
	);

	const resumeStrategy = useCallback(
		(strategyId: string) => {
			setLoading(true);
			setError(null);
			webSocket.send(
				JSON.stringify({
					type: "strategy-control",
					action: "resume",
					strategyId: strategyId,
				})
			);
		},
		[webSocket]
	);

	// Initial load
	useEffect(() => {
		if (webSocket.status === "Connected") {
			requestStrategyStatus();
		}
	}, [webSocket.status, requestStrategyStatus]);

	// Auto-refresh every 30 seconds
	useEffect(() => {
		const interval = setInterval(() => {
			if (webSocket.status === "Connected") {
				requestStrategyStatus();
			}
		}, 30000);

		return () => clearInterval(interval);
	}, [webSocket.status, requestStrategyStatus]);

	// Format time
	const formatTime = (timestamp: number) => {
		return new Date(timestamp).toLocaleTimeString();
	};

	// Format duration
	const formatDuration = (ms: number) => {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
	};

	// Get status color
	const getStatusColor = (status: string) => {
		switch (status) {
			case "running":
				return "text-green-400";
			case "stopped":
				return "text-red-400";
			case "paused":
				return "text-yellow-400";
			case "error":
				return "text-red-300";
			default:
				return "text-gray-400";
		}
	};

	return (
		<div className={`strategy-engine-test-panel ${className}`}>
			<div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
				<div className="flex justify-between items-center mb-6">
					<h2 className="text-2xl font-bold text-white">
						Strategy Engine Test Panel
					</h2>
					<div className="flex items-center space-x-4">
						<span
							className={`text-sm ${
								webSocket.status === "Connected"
									? "text-green-400"
									: "text-red-400"
							}`}
						>
							WebSocket: {webSocket.status}
						</span>
						<button
							onClick={requestStrategyStatus}
							disabled={webSocket.status !== "Connected"}
							className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
						>
							Refresh
						</button>
					</div>
				</div>

				{error && (
					<div className="mb-4 p-4 bg-red-900/50 border border-red-500 text-red-200 rounded">
						{error}
					</div>
				)}

				{/* Strategy Controls */}
				<div className="mb-6">
					<h3 className="text-lg font-semibold mb-4 text-white">
						Strategy Controls
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{strategies.map((strategy) => (
							<div
								key={strategy.id}
								className="border border-gray-600 rounded-lg p-4 bg-gray-700"
							>
								<div className="flex justify-between items-start mb-3">
									<div>
										<h4 className="font-medium text-white">{strategy.name}</h4>
										<p className="text-sm text-gray-400">{strategy.id}</p>
									</div>
									<span
										className={`text-sm font-medium ${getStatusColor(
											strategy.status
										)}`}
									>
										{strategy.status.toUpperCase()}
									</span>
								</div>

								<div className="mb-3 text-sm text-gray-300">
									<div>Signals: {strategy.performance?.totalSignals || 0}</div>
									<div>Candles: {strategy.state?.totalCandles || 0}</div>
									<div>
										Uptime:{" "}
										{strategy.performance?.uptime
											? formatDuration(strategy.performance.uptime)
											: "N/A"}
									</div>
								</div>

								<div className="flex space-x-2">
									<button
										onClick={() => startStrategy(strategy.id)}
										disabled={loading || strategy.status === "running"}
										className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
									>
										Start
									</button>
									<button
										onClick={() => stopStrategy(strategy.id)}
										disabled={loading || strategy.status === "stopped"}
										className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
									>
										Stop
									</button>
									<button
										onClick={() => pauseStrategy(strategy.id)}
										disabled={loading || strategy.status !== "running"}
										className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
									>
										Pause
									</button>
									<button
										onClick={() => resumeStrategy(strategy.id)}
										disabled={loading || strategy.status !== "paused"}
										className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
									>
										Resume
									</button>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Recent Signals */}
				<div className="mb-6">
					<h3 className="text-lg font-semibold mb-4 text-white">
						Recent Trading Signals
					</h3>
					<div className="max-h-96 overflow-y-auto">
						{signals.length === 0 ? (
							<div className="text-center py-8 text-gray-400">
								No signals generated yet. Start a strategy to begin receiving
								signals.
							</div>
						) : (
							<div className="space-y-2">
								{signals.map((signal, index) => (
									<div
										key={`${signal.strategyId}-${signal.timestamp}-${index}`}
										className="border border-gray-600 rounded-lg p-3 bg-gray-700"
									>
										<div className="flex justify-between items-start mb-2">
											<div>
												<span className="font-medium text-white">
													{signal.strategyId}
												</span>
												<span
													className={`ml-2 px-2 py-1 text-xs rounded ${
														signal.type === "entry"
															? "bg-green-700 text-green-200"
															: "bg-red-700 text-red-200"
													}`}
												>
													{signal.type.toUpperCase()}
												</span>
												<span
													className={`ml-2 px-2 py-1 text-xs rounded ${
														signal.side === "long"
															? "bg-blue-700 text-blue-200"
															: "bg-purple-700 text-purple-200"
													}`}
												>
													{signal.side.toUpperCase()}
												</span>
											</div>
											<div className="text-right text-sm text-gray-400">
												<div>{formatTime(signal.timestamp)}</div>
												<div>
													Confidence: {(signal.confidence * 100).toFixed(1)}%
												</div>
											</div>
										</div>

										<div className="text-sm text-gray-300">
											<div>Price: ${signal.price.toFixed(2)}</div>
											{signal.conditions.length > 0 && (
												<div>Conditions: {signal.conditions.join(", ")}</div>
											)}
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Connection Status */}
				<div className="text-sm text-gray-400 border-t border-gray-600 pt-4">
					<div className="flex justify-between">
						<span>WebSocket Status: {webSocket.status}</span>
						<span>Strategies Loaded: {strategies.length}</span>
						<span>Signals Received: {signals.length}</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default StrategyEngineTestPanel;
