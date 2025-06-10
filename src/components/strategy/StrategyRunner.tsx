import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import StrategyDataViewer from "./StrategyDataViewer";

interface RunningStrategy {
	id: string;
	name: string;
	symbol: string;
	timeframe: string;
	startTime: Date;
	status: "running" | "paused" | "stopped";
}

const StrategyRunner: React.FC = () => {
	const navigate = useNavigate();
	const [strategies, setStrategies] = useState<RunningStrategy[]>([]);
	const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Start a strategy by ID
	const startStrategy = async (id: string) => {
		try {
			setLoading(true);
			setError(null);

			const response = await fetch(`/api/v1/strategies/${id}/run`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({}), // No special params for now
			});

			if (!response.ok) {
				throw new Error(`Failed to start strategy: ${response.statusText}`);
			}

			const result = await response.json();

			// Add to running strategies if successful
			setStrategies((prev) => {
				// Check if already exists
				const existing = prev.findIndex((s) => s.id === id);
				if (existing >= 0) {
					// Update existing entry
					const updated = [...prev];
					updated[existing] = {
						...updated[existing],
						startTime: new Date(),
						status: "running",
					};
					return updated;
				}

				// Add new entry
				return [
					...prev,
					{
						id,
						name: id, // We'll fetch the actual name later
						symbol: "Unknown", // We'll fetch the actual symbol later
						timeframe: "Unknown", // We'll fetch the actual timeframe later
						startTime: new Date(),
						status: "running",
					},
				];
			});

			// Select the strategy to view its data
			setSelectedStrategy(id);

			// Update strategy details asynchronously
			fetchStrategyDetails(id);

			setLoading(false);
		} catch (error) {
			setError(
				error instanceof Error ? error.message : "Failed to start strategy"
			);
			setLoading(false);
		}
	};

	// Fetch strategy details to update the UI
	const fetchStrategyDetails = async (id: string) => {
		try {
			const response = await fetch(`/api/v1/strategies/${id}`);

			if (!response.ok) {
				throw new Error(
					`Failed to fetch strategy details: ${response.statusText}`
				);
			}

			const { strategy } = await response.json();

			setStrategies((prev) =>
				prev.map((s) =>
					s.id === id
						? {
								...s,
								name: strategy.name || s.name,
								symbol: strategy.symbol || s.symbol,
								timeframe: strategy.timeframe || s.timeframe,
						  }
						: s
				)
			);
		} catch (error) {
			console.error("Error fetching strategy details:", error);
		}
	};

	// Stop a running strategy
	const stopStrategy = async (id: string) => {
		try {
			setLoading(true);

			const response = await fetch(`/api/v1/strategies/${id}/stop`, {
				method: "POST",
			});

			if (!response.ok) {
				throw new Error(`Failed to stop strategy: ${response.statusText}`);
			}

			// Update strategy status
			setStrategies((prev) =>
				prev.map((s) => (s.id === id ? { ...s, status: "stopped" } : s))
			);

			setLoading(false);
		} catch (error) {
			setError(
				error instanceof Error ? error.message : "Failed to stop strategy"
			);
			setLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold">Strategy Runner</h1>
				<div className="space-x-2">
					<button
						onClick={() => navigate("/library")}
						className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
					>
						Strategy Library
					</button>
					<button
						onClick={() => navigate("/builder")}
						className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
					>
						Create New Strategy
					</button>
				</div>
			</div>

			{error && (
				<div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
					{error}
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Strategy List */}
				<div className="lg:col-span-1 bg-gray-800 rounded-lg p-4">
					<h2 className="text-lg font-medium mb-4">Running Strategies</h2>

					{strategies.length === 0 ? (
						<div className="text-center py-6">
							<p className="text-gray-400 mb-4">No running strategies</p>
							<button
								onClick={() => navigate("/library")}
								className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
							>
								Start a Strategy
							</button>
						</div>
					) : (
						<div className="space-y-3">
							{strategies.map((strategy) => (
								<div
									key={strategy.id}
									className={`p-3 rounded-lg cursor-pointer ${
										selectedStrategy === strategy.id
											? "bg-blue-900/30 border border-blue-700"
											: "bg-gray-700 hover:bg-gray-600"
									}`}
									onClick={() => setSelectedStrategy(strategy.id)}
								>
									<div className="flex justify-between items-start">
										<div>
											<h3 className="font-medium">{strategy.name}</h3>
											<div className="text-sm text-gray-400 mt-1">
												{strategy.symbol} / {strategy.timeframe}
											</div>
											<div className="text-xs text-gray-500 mt-1">
												Started: {strategy.startTime.toLocaleTimeString()}
											</div>
										</div>
										<div
											className={`px-2 py-1 text-xs rounded-full ${
												strategy.status === "running"
													? "bg-green-900 text-green-200"
													: strategy.status === "paused"
													? "bg-yellow-900 text-yellow-200"
													: "bg-red-900 text-red-200"
											}`}
										>
											{strategy.status}
										</div>
									</div>

									<div className="mt-3 flex justify-end space-x-2">
										{strategy.status === "running" && (
											<button
												onClick={(e) => {
													e.stopPropagation();
													stopStrategy(strategy.id);
												}}
												className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
												disabled={loading}
											>
												Stop
											</button>
										)}
										{strategy.status === "stopped" && (
											<button
												onClick={(e) => {
													e.stopPropagation();
													startStrategy(strategy.id);
												}}
												className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
												disabled={loading}
											>
												Restart
											</button>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Strategy Data Viewer */}
				<div className="lg:col-span-2">
					<StrategyDataViewer strategyId={selectedStrategy} />
				</div>
			</div>
		</div>
	);
};

export default StrategyRunner;
