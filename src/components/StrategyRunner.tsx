import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ChartSpinner from "./ChartSpinner";

interface Strategy {
	id: string;
	name: string;
	symbol: string;
	timeframe: string;
	enabled: boolean;
	status?: "running" | "stopped" | "paused" | "error";
	lastRun?: string;
	performance?: {
		totalTrades?: number;
		winRate?: number;
		pnl?: number;
	};
}

interface StrategyRunnerProps {
	onStrategySelect?: (strategyId: string) => void;
}

const StrategyRunner: React.FC<StrategyRunnerProps> = ({
	onStrategySelect,
}) => {
	const [strategies, setStrategies] = useState<Strategy[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		const fetchStrategies = async () => {
			try {
				setLoading(true);
				const response = await fetch("/api/v1/strategies");

				if (!response.ok) {
					throw new Error(`Failed to fetch strategies: ${response.statusText}`);
				}

				const data = await response.json();

				// Get strategy status for each strategy
				const strategiesWithStatus = await Promise.all(
					data.map(async (strategy: Strategy) => {
						try {
							const statusResponse = await fetch(
								`/api/v1/strategies/${strategy.id}/status`
							);
							if (statusResponse.ok) {
								const statusData = await statusResponse.json();
								return { ...strategy, ...statusData };
							}
							return strategy;
						} catch (err) {
							console.error(
								`Error fetching status for strategy ${strategy.id}:`,
								err
							);
							return strategy;
						}
					})
				);

				setStrategies(strategiesWithStatus);
				setError(null);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "An unknown error occurred"
				);
			} finally {
				setLoading(false);
			}
		};

		fetchStrategies();

		// Poll for updates every 30 seconds
		const intervalId = setInterval(fetchStrategies, 30000);

		return () => clearInterval(intervalId);
	}, []);

	const handleStrategyAction = async (
		id: string,
		action: "start" | "stop" | "pause"
	) => {
		try {
			const response = await fetch(`/api/v1/strategies/${id}/${action}`, {
				method: "POST",
			});

			if (!response.ok) {
				throw new Error(`Failed to ${action} strategy: ${response.statusText}`);
			}

			// Update the strategy status in the list
			setStrategies(
				strategies.map((strategy) => {
					if (strategy.id === id) {
						return {
							...strategy,
							status:
								action === "start"
									? "running"
									: action === "stop"
									? "stopped"
									: "paused",
						};
					}
					return strategy;
				})
			);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : `Failed to ${action} strategy`
			);
		}
	};

	const handleEditStrategy = (id: string) => {
		navigate(`/builder/${id}`);
	};

	const handleSelectStrategy = (id: string) => {
		setSelectedStrategy(id);
		if (onStrategySelect) {
			onStrategySelect(id);
		}
	};

	if (loading && strategies.length === 0) {
		return (
			<div className="flex justify-center items-center h-64">
				<ChartSpinner size="large" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-md">
				{error}
			</div>
		);
	}

	return (
		<div className="bg-gray-800 rounded-lg shadow-lg p-4">
			<h2 className="text-xl font-semibold mb-4 flex items-center">
				Strategy Runner
				{loading && <ChartSpinner size="small" className="ml-2" />}
			</h2>

			{strategies.length === 0 ? (
				<div className="text-center py-10">
					<p className="text-xl text-gray-400">No strategies found</p>
					<button
						onClick={() => navigate("/builder")}
						className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
					>
						Create Your First Strategy
					</button>
				</div>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full text-sm text-left text-gray-300">
						<thead className="text-xs uppercase bg-gray-700">
							<tr>
								<th className="px-4 py-3">Name</th>
								<th className="px-4 py-3">Symbol</th>
								<th className="px-4 py-3">Timeframe</th>
								<th className="px-4 py-3">Status</th>
								<th className="px-4 py-3">Last Run</th>
								<th className="px-4 py-3">Performance</th>
								<th className="px-4 py-3">Actions</th>
							</tr>
						</thead>
						<tbody>
							{strategies.map((strategy) => (
								<tr
									key={strategy.id}
									className={`border-b border-gray-700 hover:bg-gray-600 cursor-pointer ${
										selectedStrategy === strategy.id ? "bg-blue-900/30" : ""
									}`}
									onClick={() => handleSelectStrategy(strategy.id)}
								>
									<td className="px-4 py-3 font-medium">{strategy.name}</td>
									<td className="px-4 py-3">{strategy.symbol}</td>
									<td className="px-4 py-3">{strategy.timeframe}</td>
									<td className="px-4 py-3">
										<span
											className={`px-2 py-1 text-xs rounded-full ${
												strategy.status === "running"
													? "bg-green-900 text-green-200"
													: strategy.status === "paused"
													? "bg-yellow-900 text-yellow-200"
													: strategy.status === "error"
													? "bg-red-900 text-red-200"
													: "bg-gray-700 text-gray-300"
											}`}
										>
											{strategy.status || "Stopped"}
										</span>
									</td>
									<td className="px-4 py-3">
										{strategy.lastRun
											? new Date(strategy.lastRun).toLocaleString()
											: "Never"}
									</td>
									<td className="px-4 py-3">
										{strategy.performance ? (
											<div className="flex flex-col">
												<span>
													Trades: {strategy.performance.totalTrades || 0}
												</span>
												<span>
													Win Rate:{" "}
													{strategy.performance.winRate
														? `${strategy.performance.winRate.toFixed(2)}%`
														: "N/A"}
												</span>
												<span
													className={`font-medium ${
														(strategy.performance.pnl || 0) > 0
															? "text-green-400"
															: (strategy.performance.pnl || 0) < 0
															? "text-red-400"
															: ""
													}`}
												>
													PnL:{" "}
													{strategy.performance.pnl
														? `${strategy.performance.pnl.toFixed(2)}%`
														: "N/A"}
												</span>
											</div>
										) : (
											<span className="text-gray-500">No data</span>
										)}
									</td>
									<td className="px-4 py-3">
										<div className="flex space-x-2">
											{strategy.status !== "running" && (
												<button
													onClick={(e) => {
														e.stopPropagation();
														handleStrategyAction(strategy.id, "start");
													}}
													className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
												>
													Start
												</button>
											)}
											{strategy.status === "running" && (
												<button
													onClick={(e) => {
														e.stopPropagation();
														handleStrategyAction(strategy.id, "pause");
													}}
													className="px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
												>
													Pause
												</button>
											)}
											{strategy.status === "running" ||
											strategy.status === "paused" ? (
												<button
													onClick={(e) => {
														e.stopPropagation();
														handleStrategyAction(strategy.id, "stop");
													}}
													className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
												>
													Stop
												</button>
											) : null}
											<button
												onClick={(e) => {
													e.stopPropagation();
													handleEditStrategy(strategy.id);
												}}
												className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
											>
												Edit
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
};

export default StrategyRunner;
