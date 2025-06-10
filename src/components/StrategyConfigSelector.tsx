import React, { useState, useEffect } from "react";
import ConfigModal from "./ConfigModal";

interface StrategyConfigSelectorProps {
	onStrategyRun: (strategyId: string, config: any) => void;
}

const StrategyConfigSelector: React.FC<StrategyConfigSelectorProps> = ({
	onStrategyRun,
}) => {
	const [strategies, setStrategies] = useState<{ id: string; name: string }[]>(
		[]
	);
	const [selectedStrategy, setSelectedStrategy] = useState<string>("");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Fetch available strategies
	useEffect(() => {
		const fetchStrategies = async () => {
			setLoading(true);
			setError(null);

			try {
				const response = await fetch("/api/v1/strategies");

				if (!response.ok) {
					throw new Error(`Failed to fetch strategies: ${response.statusText}`);
				}

				const data = await response.json();
				setStrategies(
					data.map((s: any) => ({
						id: s.id || s.name.toLowerCase().replace(/\s+/g, "_"),
						name: s.name,
					}))
				);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to load strategies"
				);
			} finally {
				setLoading(false);
			}
		};

		fetchStrategies();
	}, []);

	const handleOpenModal = () => {
		if (!selectedStrategy) {
			setError("Please select a strategy first");
			return;
		}

		setError(null);
		setIsModalOpen(true);
	};

	const handleSaveConfig = async (config: any) => {
		try {
			// Call the provided callback
			onStrategyRun(selectedStrategy, config);

			// Close the modal
			setIsModalOpen(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to run strategy");
		}
	};

	return (
		<div className="bg-gray-800 rounded-lg p-4 shadow-md">
			<h3 className="text-lg font-medium mb-4">Run Strategy</h3>

			{error && (
				<div className="bg-red-900/50 border border-red-500 text-red-200 px-3 py-2 rounded text-sm mb-4">
					{error}
				</div>
			)}

			<div className="space-y-4">
				<div>
					<label className="block text-sm font-medium text-gray-400 mb-1">
						Select Strategy
					</label>
					<select
						value={selectedStrategy}
						onChange={(e) => setSelectedStrategy(e.target.value)}
						className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
						disabled={loading}
					>
						<option value="">Choose a strategy</option>
						{strategies.map((strategy) => (
							<option key={strategy.id} value={strategy.id}>
								{strategy.name}
							</option>
						))}
					</select>
				</div>

				<button
					onClick={handleOpenModal}
					disabled={!selectedStrategy || loading}
					className={`w-full py-2 rounded-md ${
						!selectedStrategy || loading
							? "bg-gray-700 text-gray-500 cursor-not-allowed"
							: "bg-blue-600 text-white hover:bg-blue-700"
					}`}
				>
					{loading ? "Loading..." : "Configure & Run"}
				</button>
			</div>

			<ConfigModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onSave={handleSaveConfig}
				strategyId={selectedStrategy}
				title={`Run ${
					strategies.find((s) => s.id === selectedStrategy)?.name || "Strategy"
				}`}
			/>
		</div>
	);
};

export default StrategyConfigSelector;
