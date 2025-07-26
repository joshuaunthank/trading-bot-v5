/**
 * Unified Strategy Controls Component
 *
 * Provides strategy start/stop/pause/resume controls using WebSocket communication.
 * Can be used across multiple tabs (Chart & Indicators, Strategy Testing).
 */

import React, { useState, useCallback, useEffect } from "react";
import { useWebSocket } from "../hooks/useWebSocket";

interface StrategyControlsProps {
	selectedStrategy: string;
	onStrategyStatusChange?: (strategyId: string, status: string) => void;
	className?: string;
	compact?: boolean; // For different layouts
}

interface StrategyStatus {
	id: string;
	status: "running" | "stopped" | "paused" | "error";
	lastUpdate: number;
}

const StrategyControls: React.FC<StrategyControlsProps> = ({
	selectedStrategy,
	onStrategyStatusChange,
	className = "",
	compact = false,
}) => {
	const [strategyStatus, setStrategyStatus] = useState<StrategyStatus>({
		id: selectedStrategy,
		status: "stopped",
		lastUpdate: Date.now(),
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// WebSocket connection for strategy controls
	const webSocket = useWebSocket({
		url: "ws://localhost:3001/ws/ohlcv",
		onMessage: handleWebSocketMessage,
		onStatusChange: (status: string) => {
			console.log("StrategyControls WebSocket status:", status);
		},
		onError: (error: Error) => {
			console.error("StrategyControls WebSocket error:", error);
			setError("WebSocket connection error");
		},
		maxReconnectAttempts: 5,
		reconnectInterval: 2000,
	});

	// Handle WebSocket messages
	function handleWebSocketMessage(data: any) {
		try {
			const message = data; // data is already parsed by useWebSocket hook

			switch (message.type) {
				case "strategy-control-response":
					handleStrategyControlResponse(message);
					break;
				case "strategy-status-response":
					handleStrategyStatusResponse(message.data);
					break;
				case "strategy-states":
					handleStrategyStates(message.data);
					break;
				default:
					// Ignore other message types
					break;
			}
		} catch (error) {
			console.error("Failed to handle WebSocket message:", error);
		}
	}

	// Handle strategy control response
	const handleStrategyControlResponse = useCallback(
		(response: any) => {
			console.log("Strategy Control Response:", response);
			setLoading(false);

			if (response.success) {
				setError(null);
				// Update status based on the action performed
				const newStatus =
					response.action === "start"
						? "running"
						: response.action === "stop"
						? "stopped"
						: response.action === "pause"
						? "paused"
						: response.action === "resume"
						? "running"
						: "stopped";

				setStrategyStatus((prev) => ({
					...prev,
					status: newStatus as "running" | "stopped" | "paused" | "error",
					lastUpdate: Date.now(),
				}));

				// Notify parent component
				if (onStrategyStatusChange) {
					onStrategyStatusChange(selectedStrategy, newStatus);
				}
			} else {
				setError(response.error || "Strategy control failed");
			}
		},
		[selectedStrategy, onStrategyStatusChange]
	);

	// Handle strategy status response
	const handleStrategyStatusResponse = useCallback(
		(data: any) => {
			if (data && data.length > 0) {
				const strategy = data.find((s: any) => s.id === selectedStrategy);
				if (strategy) {
					setStrategyStatus({
						id: strategy.id,
						status: strategy.status,
						lastUpdate: Date.now(),
					});

					if (onStrategyStatusChange) {
						onStrategyStatusChange(strategy.id, strategy.status);
					}
				}
			}
		},
		[selectedStrategy, onStrategyStatusChange]
	);

	// Handle strategy states
	const handleStrategyStates = useCallback(
		(data: any) => {
			if (data && data[selectedStrategy]) {
				const strategy = data[selectedStrategy];
				setStrategyStatus({
					id: selectedStrategy,
					status: strategy.status || "stopped",
					lastUpdate: Date.now(),
				});

				if (onStrategyStatusChange) {
					onStrategyStatusChange(
						selectedStrategy,
						strategy.status || "stopped"
					);
				}
			}
		},
		[selectedStrategy, onStrategyStatusChange]
	);

	// Strategy control functions
	const startStrategy = useCallback(() => {
		if (!selectedStrategy) {
			setError("No strategy selected");
			return;
		}

		setLoading(true);
		setError(null);
		webSocket.send(
			JSON.stringify({
				type: "strategy-control",
				action: "start",
				strategyId: selectedStrategy,
			})
		);
	}, [selectedStrategy, webSocket]);

	const stopStrategy = useCallback(() => {
		if (!selectedStrategy) {
			setError("No strategy selected");
			return;
		}

		setLoading(true);
		setError(null);
		webSocket.send(
			JSON.stringify({
				type: "strategy-control",
				action: "stop",
				strategyId: selectedStrategy,
			})
		);
	}, [selectedStrategy, webSocket]);

	const pauseStrategy = useCallback(() => {
		if (!selectedStrategy) {
			setError("No strategy selected");
			return;
		}

		setLoading(true);
		setError(null);
		webSocket.send(
			JSON.stringify({
				type: "strategy-control",
				action: "pause",
				strategyId: selectedStrategy,
			})
		);
	}, [selectedStrategy, webSocket]);

	const resumeStrategy = useCallback(() => {
		if (!selectedStrategy) {
			setError("No strategy selected");
			return;
		}

		setLoading(true);
		setError(null);
		webSocket.send(
			JSON.stringify({
				type: "strategy-control",
				action: "resume",
				strategyId: selectedStrategy,
			})
		);
	}, [selectedStrategy, webSocket]);

	// Request initial strategy status
	const requestStrategyStatus = useCallback(() => {
		if (webSocket.status === "Connected" && selectedStrategy) {
			webSocket.send(
				JSON.stringify({
					type: "get-strategy-status",
					strategyId: selectedStrategy,
				})
			);
		}
	}, [webSocket, selectedStrategy]);

	// Request status when WebSocket connects or strategy changes
	useEffect(() => {
		if (webSocket.status === "Connected" && selectedStrategy) {
			requestStrategyStatus();
		}
	}, [webSocket.status, selectedStrategy, requestStrategyStatus]);

	// Update strategy status when selectedStrategy changes
	useEffect(() => {
		setStrategyStatus((prev) => ({
			...prev,
			id: selectedStrategy,
		}));
	}, [selectedStrategy]);

	// Get status color
	const getStatusColor = (status: string) => {
		switch (status) {
			case "running":
				return "text-green-400";
			case "paused":
				return "text-yellow-400";
			case "error":
				return "text-red-400";
			default:
				return "text-gray-400";
		}
	};

	// Get status indicator
	const getStatusIndicator = (status: string) => {
		switch (status) {
			case "running":
				return "●";
			case "paused":
				return "⏸";
			case "error":
				return "⚠";
			default:
				return "○";
		}
	};

	if (compact) {
		// Compact layout for Chart & Indicators tab
		return (
			<div className={`flex items-center space-x-2 ${className}`}>
				{/* Status Indicator */}
				<div className="flex items-center space-x-1">
					<span className={`text-sm ${getStatusColor(strategyStatus.status)}`}>
						{getStatusIndicator(strategyStatus.status)}
					</span>
					<span className="text-xs text-gray-400 capitalize">
						{strategyStatus.status}
					</span>
				</div>

				{/* Primary Control Button */}
				{strategyStatus.status === "running" ? (
					<button
						onClick={stopStrategy}
						disabled={loading || !selectedStrategy}
						className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-md transition-colors"
					>
						{loading ? "Stopping..." : "Stop Strategy"}
					</button>
				) : strategyStatus.status === "paused" ? (
					<div className="flex space-x-1">
						<button
							onClick={resumeStrategy}
							disabled={loading || !selectedStrategy}
							className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs rounded-md transition-colors"
						>
							Resume
						</button>
						<button
							onClick={stopStrategy}
							disabled={loading || !selectedStrategy}
							className="px-2 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs rounded-md transition-colors"
						>
							Stop
						</button>
					</div>
				) : (
					<button
						onClick={startStrategy}
						disabled={loading || !selectedStrategy}
						className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-md transition-colors"
					>
						{loading ? "Starting..." : "Start Strategy"}
					</button>
				)}

				{/* Error Display */}
				{error && <span className="text-xs text-red-400">{error}</span>}
			</div>
		);
	}

	// Full layout for Strategy Testing tab
	return (
		<div
			className={`bg-gray-800 border border-gray-700 rounded-lg p-4 ${className}`}
		>
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-lg font-semibold text-white">Strategy Controls</h3>
				<div className="flex items-center space-x-2">
					<span className={`text-sm ${getStatusColor(strategyStatus.status)}`}>
						{getStatusIndicator(strategyStatus.status)}
					</span>
					<span className="text-sm text-gray-300 capitalize">
						{strategyStatus.status}
					</span>
				</div>
			</div>

			{/* Strategy Info */}
			<div className="mb-4 p-3 bg-gray-700 rounded-md">
				<div className="text-sm text-gray-300">
					<div className="flex justify-between">
						<span>Strategy:</span>
						<span className="text-white font-mono">{selectedStrategy}</span>
					</div>
					<div className="flex justify-between mt-1">
						<span>WebSocket:</span>
						<span
							className={`font-mono ${
								webSocket.status === "Connected"
									? "text-green-400"
									: "text-red-400"
							}`}
						>
							{webSocket.status}
						</span>
					</div>
				</div>
			</div>

			{/* Control Buttons */}
			<div className="flex flex-wrap gap-2">
				<button
					onClick={startStrategy}
					disabled={
						loading || strategyStatus.status === "running" || !selectedStrategy
					}
					className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors"
				>
					{loading && strategyStatus.status !== "running"
						? "Starting..."
						: "Start"}
				</button>

				<button
					onClick={stopStrategy}
					disabled={
						loading || strategyStatus.status === "stopped" || !selectedStrategy
					}
					className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors"
				>
					{loading && strategyStatus.status !== "stopped"
						? "Stopping..."
						: "Stop"}
				</button>

				<button
					onClick={pauseStrategy}
					disabled={
						loading || strategyStatus.status !== "running" || !selectedStrategy
					}
					className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors"
				>
					{loading && strategyStatus.status === "running"
						? "Pausing..."
						: "Pause"}
				</button>

				<button
					onClick={resumeStrategy}
					disabled={
						loading || strategyStatus.status !== "paused" || !selectedStrategy
					}
					className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors"
				>
					{loading && strategyStatus.status === "paused"
						? "Resuming..."
						: "Resume"}
				</button>
			</div>

			{/* Error Display */}
			{error && (
				<div className="mt-3 p-2 bg-red-900/50 border border-red-700 rounded-md">
					<p className="text-sm text-red-200">{error}</p>
				</div>
			)}

			{/* Status Footer */}
			<div className="mt-4 pt-3 border-t border-gray-600 text-xs text-gray-400">
				Last updated: {new Date(strategyStatus.lastUpdate).toLocaleTimeString()}
			</div>
		</div>
	);
};

export default StrategyControls;
