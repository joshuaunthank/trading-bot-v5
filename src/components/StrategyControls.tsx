import React from "react";
import { useWebSocket } from "../context/WebSocketContext";
import { useStrategy } from "../context/StrategyContext";

export const StrategyControls: React.FC = () => {
	const { connectionStatus, sendMessage } = useWebSocket();
	const { selectedStrategyId, setSelectedStrategyId } = useStrategy();

	const handleStart = () => {
		if (!selectedStrategyId) {
			console.warn("No strategy selected");
			return;
		}

		sendMessage({
			type: "strategy_control",
			action: "start",
			strategyId: selectedStrategyId,
		});
	};

	const handleStop = () => {
		if (!selectedStrategyId) {
			console.warn("No strategy selected");
			return;
		}

		sendMessage({
			type: "strategy_control",
			action: "stop",
			strategyId: selectedStrategyId,
		});
	};

	const handlePause = () => {
		if (!selectedStrategyId) {
			console.warn("No strategy selected");
			return;
		}

		sendMessage({
			type: "strategy_control",
			action: "pause",
			strategyId: selectedStrategyId,
		});
	};

	return (
		<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-lg font-semibold text-gray-900">
					Strategy Controls
				</h3>
				<div className="flex items-center gap-2">
					<div
						className={`w-2 h-2 rounded-full ${
							connectionStatus === "connected"
								? "bg-green-500"
								: connectionStatus === "connecting"
								? "bg-yellow-500"
								: "bg-red-500"
						}`}
					/>
					<span className="text-sm text-gray-600 capitalize">
						{connectionStatus}
					</span>
				</div>
			</div>

			{selectedStrategyId ? (
				<div className="space-y-3">
					<div className="text-sm text-gray-600 mb-3">
						Selected Strategy: <strong>{selectedStrategyId}</strong>
					</div>

					<div className="flex gap-2">
						<button
							onClick={handleStart}
							disabled={connectionStatus !== "connected"}
							className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
						>
							Start
						</button>
						<button
							onClick={handlePause}
							disabled={connectionStatus !== "connected"}
							className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
						>
							Pause
						</button>
						<button
							onClick={handleStop}
							disabled={connectionStatus !== "connected"}
							className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
						>
							Stop
						</button>
					</div>
				</div>
			) : (
				<div className="text-center py-4 text-gray-500">
					<p>No strategy selected</p>
					<p className="text-sm">Select a strategy to enable controls</p>
				</div>
			)}
		</div>
	);
};

export default StrategyControls;
