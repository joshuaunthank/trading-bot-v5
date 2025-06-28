import React, { useState, useEffect } from "react";

interface Strategy {
	id: string;
	name: string;
	description: string;
	status: "idle" | "running" | "paused" | "stopped" | "error";
	symbol: string;
	timeframe: string;
	startTime?: Date;
	metrics?: {
		totalSignals: number;
		profitLoss: number;
		winRate: number;
		lastSignal?: Date;
	};
}

interface StrategyManagerProps {
	className?: string;
}

const StrategyManager: React.FC<StrategyManagerProps> = ({ className }) => {
	const [strategies, setStrategies] = useState<Strategy[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);

	// Fetch available strategies
	const fetchStrategies = async () => {
		try {
			setLoading(true);
			setError(null);

			// Get strategy list
			const response = await fetch("/api/v1/strategies");
			if (!response.ok) throw new Error("Failed to fetch strategies");

			const strategyList = await response.json();

			// Get status for each strategy
			const strategiesWithStatus = await Promise.all(
				strategyList.map(async (strategy: any) => {
					try {
						const statusResponse = await fetch(
							`/api/v1/strategies/${strategy.id}/status`
						);
						const statusData = statusResponse.ok
							? await statusResponse.json()
							: { status: "idle" };

						const metricsResponse = await fetch(
							`/api/v1/strategies/${strategy.id}/metrics`
						);
						const metricsData = metricsResponse.ok
							? await metricsResponse.json()
							: null;

						return {
							id: strategy.id,
							name: strategy.meta?.name || strategy.id,
							description: strategy.meta?.description || "No description",
							status: statusData.status || "idle",
							symbol: strategy.meta?.symbol || "BTC/USDT",
							timeframe: strategy.meta?.timeframe || "1h",
							startTime: statusData.startTime
								? new Date(statusData.startTime)
								: undefined,
							metrics: metricsData?.success ? metricsData.data : null,
						};
					} catch (error) {
						console.error(`Error fetching status for ${strategy.id}:`, error);
						return {
							id: strategy.id,
							name: strategy.meta?.name || strategy.id,
							description: strategy.meta?.description || "No description",
							status: "error" as const,
							symbol: strategy.meta?.symbol || "BTC/USDT",
							timeframe: strategy.meta?.timeframe || "1h",
						};
					}
				})
			);

			setStrategies(strategiesWithStatus);
		} catch (error) {
			console.error("Error fetching strategies:", error);
			setError(error instanceof Error ? error.message : "Unknown error");
		} finally {
			setLoading(false);
		}
	};

	// Strategy actions
	const startStrategy = async (strategyId: string) => {
		try {
			setError(null);
			const response = await fetch(
				`/api/v1/strategies/manager/${strategyId}/start`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
				}
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to start strategy");
			}

			// Refresh strategies after action
			await fetchStrategies();
		} catch (error) {
			console.error("Error starting strategy:", error);
			setError(
				error instanceof Error ? error.message : "Failed to start strategy"
			);
		}
	};

	const stopStrategy = async (strategyId: string) => {
		try {
			setError(null);
			const response = await fetch(
				`/api/v1/strategies/manager/${strategyId}/stop`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
				}
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to stop strategy");
			}

			await fetchStrategies();
		} catch (error) {
			console.error("Error stopping strategy:", error);
			setError(
				error instanceof Error ? error.message : "Failed to stop strategy"
			);
		}
	};

	const pauseStrategy = async (strategyId: string) => {
		try {
			setError(null);
			const response = await fetch(
				`/api/v1/strategies/manager/${strategyId}/pause`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
				}
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to pause strategy");
			}

			await fetchStrategies();
		} catch (error) {
			console.error("Error pausing strategy:", error);
			setError(
				error instanceof Error ? error.message : "Failed to pause strategy"
			);
		}
	};

	const resumeStrategy = async (strategyId: string) => {
		try {
			setError(null);
			const response = await fetch(
				`/api/v1/strategies/manager/${strategyId}/resume`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
				}
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to resume strategy");
			}

			await fetchStrategies();
		} catch (error) {
			console.error("Error resuming strategy:", error);
			setError(
				error instanceof Error ? error.message : "Failed to resume strategy"
			);
		}
	};

	// Auto-refresh every 10 seconds
	useEffect(() => {
		fetchStrategies();
		const interval = setInterval(fetchStrategies, 10000);
		return () => clearInterval(interval);
	}, []);

	const getStatusColor = (status: string) => {
		switch (status) {
			case "running":
				return "bg-green-500";
			case "paused":
				return "bg-yellow-500";
			case "stopped":
				return "bg-gray-500";
			case "error":
				return "bg-red-500";
			default:
				return "bg-gray-400";
		}
	};

	const getStatusText = (status: string) => {
		switch (status) {
			case "running":
				return "Running";
			case "paused":
				return "Paused";
			case "stopped":
				return "Stopped";
			case "error":
				return "Error";
			default:
				return "Idle";
		}
	};

	return (
		<div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
			<div className="flex justify-between items-center mb-6">
				<h2 className="text-2xl font-bold text-white">Strategy Manager</h2>
				<button
					onClick={fetchStrategies}
					disabled={loading}
					className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
				>
					{loading ? "Refreshing..." : "Refresh"}
				</button>
			</div>

			{error && (
				<div className="mb-4 p-4 bg-red-600 text-white rounded">
					Error: {error}
				</div>
			)}

			{loading && strategies.length === 0 ? (
				<div className="text-center py-8 text-gray-400">
					Loading strategies...
				</div>
			) : strategies.length === 0 ? (
				<div className="text-center py-8 text-gray-400">
					No strategies found. Create one in the Strategy Builder.
				</div>
			) : (
				<div className="grid gap-4">
					{strategies.map((strategy) => (
						<div
							key={strategy.id}
							className="bg-gray-700 rounded-lg p-4 border border-gray-600"
						>
							<div className="flex justify-between items-start mb-3">
								<div>
									<h3 className="text-lg font-semibold text-white mb-1">
										{strategy.name}
									</h3>
									<p className="text-gray-300 text-sm mb-2">
										{strategy.description}
									</p>
									<div className="flex items-center gap-4 text-sm text-gray-400">
										<span>{strategy.symbol}</span>
										<span>{strategy.timeframe}</span>
										{strategy.startTime && (
											<span>
												Started: {strategy.startTime.toLocaleTimeString()}
											</span>
										)}
									</div>
								</div>
								<div className="flex items-center gap-2">
									<span
										className={`px-2 py-1 rounded text-xs font-medium text-white ${getStatusColor(
											strategy.status
										)}`}
									>
										{getStatusText(strategy.status)}
									</span>
								</div>
							</div>

							{strategy.metrics && (
								<div className="grid grid-cols-3 gap-4 mb-3 p-3 bg-gray-800 rounded">
									<div className="text-center">
										<div className="text-white font-semibold">
											{strategy.metrics.totalSignals || 0}
										</div>
										<div className="text-xs text-gray-400">Signals</div>
									</div>
									<div className="text-center">
										<div
											className={`font-semibold ${
												(strategy.metrics.profitLoss || 0) >= 0
													? "text-green-400"
													: "text-red-400"
											}`}
										>
											{(strategy.metrics.profitLoss || 0) >= 0 ? "+" : ""}
											{(strategy.metrics.profitLoss || 0).toFixed(2)}%
										</div>
										<div className="text-xs text-gray-400">P&L</div>
									</div>
									<div className="text-center">
										<div className="text-white font-semibold">
											{(strategy.metrics.winRate || 0).toFixed(1)}%
										</div>
										<div className="text-xs text-gray-400">Win Rate</div>
									</div>
								</div>
							)}

							<div className="flex gap-2">
								{strategy.status === "idle" ||
								strategy.status === "stopped" ||
								strategy.status === "error" ? (
									<button
										onClick={() => startStrategy(strategy.id)}
										className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
									>
										Start
									</button>
								) : null}

								{strategy.status === "running" ? (
									<>
										<button
											onClick={() => pauseStrategy(strategy.id)}
											className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
										>
											Pause
										</button>
										<button
											onClick={() => stopStrategy(strategy.id)}
											className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
										>
											Stop
										</button>
									</>
								) : null}

								{strategy.status === "paused" ? (
									<>
										<button
											onClick={() => resumeStrategy(strategy.id)}
											className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
										>
											Resume
										</button>
										<button
											onClick={() => stopStrategy(strategy.id)}
											className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
										>
											Stop
										</button>
									</>
								) : null}

								<button
									onClick={() =>
										setSelectedStrategy(
											selectedStrategy === strategy.id ? null : strategy.id
										)
									}
									className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-500"
								>
									{selectedStrategy === strategy.id
										? "Hide Details"
										: "Details"}
								</button>
							</div>

							{selectedStrategy === strategy.id && (
								<div className="mt-4 p-4 bg-gray-800 rounded border border-gray-600">
									<h4 className="text-white font-semibold mb-2">
										Strategy Details
									</h4>
									<div className="grid grid-cols-2 gap-4 text-sm">
										<div>
											<span className="text-gray-400">ID:</span>
											<span className="text-white ml-2">{strategy.id}</span>
										</div>
										<div>
											<span className="text-gray-400">Status:</span>
											<span className="text-white ml-2">
												{getStatusText(strategy.status)}
											</span>
										</div>
										<div>
											<span className="text-gray-400">Symbol:</span>
											<span className="text-white ml-2">{strategy.symbol}</span>
										</div>
										<div>
											<span className="text-gray-400">Timeframe:</span>
											<span className="text-white ml-2">
												{strategy.timeframe}
											</span>
										</div>
										{strategy.metrics?.lastSignal && (
											<div className="col-span-2">
												<span className="text-gray-400">Last Signal:</span>
												<span className="text-white ml-2">
													{new Date(
														strategy.metrics.lastSignal
													).toLocaleString()}
												</span>
											</div>
										)}
									</div>
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default StrategyManager;
