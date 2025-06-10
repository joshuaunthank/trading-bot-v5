import React from "react";
import { useStrategyWebSocket } from "../../hooks/useStrategyWebSocket";

interface StrategyDataViewerProps {
	strategyId: string | null;
}

const StrategyDataViewer: React.FC<StrategyDataViewerProps> = ({
	strategyId,
}) => {
	const { indicators, signals, isConnected, error } =
		useStrategyWebSocket(strategyId);

	if (!strategyId) {
		return (
			<div className="p-4 bg-gray-800 rounded-lg text-center">
				<p className="text-gray-400">No strategy selected</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4 bg-red-900/50 border border-red-500 rounded-lg">
				<p className="text-red-200">Error: {error}</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-medium">Live Strategy Data</h3>
				<div
					className={`px-2 py-1 rounded-full text-xs ${
						isConnected
							? "bg-green-900 text-green-200"
							: "bg-gray-700 text-gray-300"
					}`}
				>
					{isConnected ? "Connected" : "Disconnected"}
				</div>
			</div>

			{/* Indicators */}
			<div className="bg-gray-800 rounded-lg p-4">
				<h4 className="text-md font-medium mb-2">Indicator Values</h4>
				{indicators.length === 0 ? (
					<p className="text-gray-400 text-sm">No data available yet</p>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-700">
							<thead>
								<tr>
									<th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
										Date
									</th>
									{/* Dynamic columns based on indicator keys */}
									{Object.keys(
										indicators[indicators.length - 1]?.values || {}
									).map((key) => (
										<th
											key={key}
											className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
										>
											{key}
										</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-700">
								{/* Only show last 5 indicator values */}
								{indicators.slice(-5).map((item, index) => (
									<tr
										key={index}
										className={index % 2 === 0 ? "bg-gray-800" : "bg-gray-900"}
									>
										<td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">
											{new Date(item.date).toLocaleTimeString()}
										</td>
										{Object.entries(item.values).map(([key, value]) => (
											<td
												key={key}
												className="px-4 py-2 whitespace-nowrap text-sm text-gray-300"
											>
												{typeof value === "number" ? value.toFixed(4) : value}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Signals */}
			<div className="bg-gray-800 rounded-lg p-4">
				<h4 className="text-md font-medium mb-2">Trading Signals</h4>
				{signals.length === 0 ? (
					<p className="text-gray-400 text-sm">No signals generated yet</p>
				) : (
					<div className="space-y-2">
						{signals.slice(-5).map((signal, index) => (
							<div
								key={index}
								className={`p-2 rounded ${
									signal.type === "entry"
										? signal.side === "long"
											? "bg-green-900/30 border-l-4 border-green-500"
											: "bg-red-900/30 border-l-4 border-red-500"
										: "bg-gray-700 border-l-4 border-gray-500"
								}`}
							>
								<div className="flex justify-between">
									<span className="font-medium">
										{signal.type === "entry" ? "Enter" : "Exit"} {signal.side}
									</span>
									<span className="text-gray-400 text-sm">
										{new Date(signal.date).toLocaleString()}
									</span>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default StrategyDataViewer;
