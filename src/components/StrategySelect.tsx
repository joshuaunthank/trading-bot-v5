import React, { useEffect, useState, useCallback } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import {
	strategyService,
	StrategySummary,
	DetailedStrategy,
} from "../services/strategyService";

interface StrategySelectProps {
	strategies: StrategySummary[];
	selectedStrategyId: string | null;
	onStrategySelect: (strategyId: string | null) => void;
	onCreateStrategy?: () => void;
	onEditStrategy?: (strategyId: string) => void;
	onDeleteStrategy?: (strategyId: string) => void;
	onStartStrategy?: (strategyId: string) => void;
	onStopStrategy?: (strategyId: string) => void;
	loading?: boolean;
	error?: string | null;
}

const StrategySelect: React.FC<StrategySelectProps> = ({
	strategies,
	selectedStrategyId,
	onStrategySelect,
	onCreateStrategy,
	onEditStrategy,
	onDeleteStrategy,
	onStartStrategy,
	onStopStrategy,
	loading = false,
	error = null,
}) => {
	// State for detailed strategy data
	const [detailedStrategy, setDetailedStrategy] =
		useState<DetailedStrategy | null>(null);
	const [strategyLoading, setStrategyLoading] = useState(false);
	const [strategyError, setStrategyError] = useState<string | null>(null);

	// Find selected strategy summary - safely handle undefined/non-array strategies
	const selectedStrategySummary = Array.isArray(strategies)
		? strategies.find((s) => s.id === selectedStrategyId)
		: undefined;

	// Fetch detailed strategy data when strategy is selected
	const fetchDetailedStrategy = useCallback(async (strategyId: string) => {
		if (!strategyId) {
			setDetailedStrategy(null);
			setStrategyError(null);
			return;
		}

		try {
			setStrategyLoading(true);
			setStrategyError(null);

			const detailed = await strategyService.getDetailedStrategy(strategyId);
			console.log("Fetched detailed strategy:", detailed);

			setDetailedStrategy(detailed);
		} catch (err) {
			console.error("Error fetching detailed strategy:", err);
			setStrategyError(
				err instanceof Error ? err.message : "Failed to load strategy details"
			);
			setDetailedStrategy(null);
		} finally {
			setStrategyLoading(false);
		}
	}, []);

	// Fetch detailed strategy when selection changes
	useEffect(() => {
		if (selectedStrategyId) {
			fetchDetailedStrategy(selectedStrategyId);
		} else {
			setDetailedStrategy(null);
			setStrategyError(null);
		}
	}, [selectedStrategyId, fetchDetailedStrategy]);

	return (
		<div className="bg-gray-800 rounded-lg border border-gray-700 p-5 mt-2">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-base font-semibold text-gray-100">
					Strategy Indicators
				</h3>
				{(loading || strategyLoading) && (
					<div className="text-xs text-gray-400">
						{loading ? "Loading strategies..." : "Loading strategy details..."}
					</div>
				)}
			</div>

			{(error || strategyError) && (
				<div className="mb-4 p-2 bg-red-900/30 border border-red-700 rounded">
					<p className="text-xs text-red-300">
						Error: {error || strategyError}
					</p>
				</div>
			)}

			{/* Strategy Selector */}
			<div className="mb-4">
				<label className="block text-xs font-medium text-gray-400 mb-1">
					Select Strategy
				</label>
				<div className="flex gap-2">
					<select
						value={selectedStrategyId || ""}
						onChange={(e) => onStrategySelect(e.target.value || null)}
						className="flex-1 px-3 py-2 bg-gray-900 text-gray-100 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
						disabled={loading || strategyLoading}
					>
						<option value="">No strategy selected</option>
						{Array.isArray(strategies) &&
							strategies.map((strategy) => (
								<option
									key={strategy.id}
									value={strategy.id}
									className="bg-gray-900 text-gray-100"
								>
									{strategy.name}
								</option>
							))}
					</select>

					{/* Create New Strategy Button */}
					{onCreateStrategy && (
						<button
							onClick={onCreateStrategy}
							className="px-2 py-1 bg-green-700 hover:bg-green-600 text-white rounded text-xs flex items-center gap-1 border border-green-800"
							title="Create New Strategy"
						>
							<Plus size={14} />
							<span className="hidden sm:inline">Create</span>
						</button>
					)}

					{/* Edit Strategy Button */}
					{selectedStrategyId && onEditStrategy && (
						<button
							onClick={() => onEditStrategy(selectedStrategyId)}
							className="px-2 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs flex items-center gap-1 border border-blue-800"
							title="Edit Strategy"
						>
							<Edit size={14} />
							<span className="hidden sm:inline">Edit</span>
						</button>
					)}

					{/* Delete Strategy Button */}
					{selectedStrategyId && onDeleteStrategy && (
						<button
							onClick={() => {
								let confirmDelete = window.confirm(
									`Are you sure you want to delete the strategy "${selectedStrategySummary?.name}"? This action cannot be undone.`
								);
								if (confirmDelete) {
									// Ensure selectedStrategyId is valid before calling
									if (selectedStrategyId) {
										// Handle delete logic here
										// For now, just clear the selection
										onDeleteStrategy(selectedStrategyId);
									}
								}
							}}
							className="px-2 py-1 bg-red-700 hover:bg-red-600 text-white rounded text-xs flex items-center gap-1 border border-red-800"
							title="Delete Strategy"
						>
							<Trash2 size={14} />
							<span className="hidden sm:inline">Delete</span>
						</button>
					)}

					{selectedStrategyId && (
						<button
							onClick={() => onStrategySelect(null)}
							className="px-2 py-1 text-red-300 hover:text-red-400 border border-red-700 hover:border-red-500 rounded text-xs bg-transparent"
						>
							Clear
						</button>
					)}
				</div>
			</div>

			{/* Selected Strategy Info */}
			{selectedStrategySummary && (
				<div className="border-t border-gray-700 pt-3">
					{strategyLoading && (
						<div className="text-center py-2">
							<div className="text-xs text-gray-400">
								Loading strategy details...
							</div>
						</div>
					)}

					{!strategyLoading && detailedStrategy && (
						<>
							<div className="mb-2">
								<span className="text-xs font-semibold text-blue-300">
									{detailedStrategy.name}
								</span>
								<p className="text-xs text-gray-400 mt-0.5">
									{detailedStrategy.description}
								</p>
								{detailedStrategy.tags && detailedStrategy.tags.length > 0 && (
									<div className="flex flex-wrap gap-1 mt-1">
										{detailedStrategy.tags.map((tag) => (
											<span
												key={tag}
												className="px-2 py-0.5 bg-blue-900 text-blue-300 text-[10px] rounded-full"
											>
												{tag}
											</span>
										))}
									</div>
								)}
							</div>

							<div>
								<span className="text-xs font-medium text-blue-400 mb-1 block">
									Indicators ({detailedStrategy.indicators?.length || 0})
								</span>
								<div className="space-y-1">
									{detailedStrategy.indicators?.map((indicator) => (
										<div
											key={indicator.id}
											className="flex items-center justify-between bg-gray-900 px-2 py-1 rounded border border-gray-700 text-xs"
										>
											<div>
												<span className="font-semibold text-gray-100">
													{indicator.type?.toUpperCase() || "UNKNOWN"}
												</span>
												<span className="text-gray-400 ml-2">
													({indicator.id || "N/A"})
												</span>
											</div>
											<div className="text-gray-400">
												{indicator.parameters &&
													Object.entries(indicator.parameters)
														.map(([key, value]) => `${key}: ${value}`)
														.join(", ")}
											</div>
										</div>
									))}
								</div>
							</div>
						</>
					)}

					{/* Start and Stop strategy controls with single button which checks if the strategy is already running and updates once start/stop are clicked */}
					{!strategyLoading && detailedStrategy && (
						<div className="mt-4 flex items-center gap-2">
							{/* {JSON.stringify(detailedStrategy)} */}
							{detailedStrategy.status === "running" ? (
								<button
									onClick={() => onStopStrategy?.(detailedStrategy.id)}
									className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white rounded text-xs"
									title="Stop Strategy"
								>
									Stop Strategy
								</button>
							) : (
								<button
									onClick={() => onStartStrategy?.(detailedStrategy.id)}
									className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white rounded text-xs"
									title="Start Strategy"
								>
									Start Strategy
								</button>
							)}
						</div>
					)}

					{!strategyLoading && !detailedStrategy && strategyError && (
						<div className="text-center py-2">
							<div className="text-xs text-red-400">
								Failed to load strategy details
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default StrategySelect;
