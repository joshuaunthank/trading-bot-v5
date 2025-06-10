import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { StrategyProvider, useStrategy } from "../../context/StrategyContext";
import StrategyStepper from "./StrategyStepper";

// Wrapper component that provides the strategy context
const StrategyBuilderWrapper: React.FC = () => {
	return (
		<StrategyProvider>
			<StrategyBuilderContent />
		</StrategyProvider>
	);
};

// Main content component that uses the strategy context
const StrategyBuilderContent: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { loadStrategy, resetStrategy } = useStrategy();

	useEffect(() => {
		// Reset on initial render
		resetStrategy();

		// If we have an ID, try to load the strategy
		if (id) {
			loadStrategy(id).catch((error) => {
				console.error("Failed to load strategy:", error);
				navigate("/builder", { replace: true });
			});
		}
	}, [id, loadStrategy, navigate, resetStrategy]);

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold">
					{id ? "Edit Strategy" : "Create New Strategy"}
				</h1>
				<button
					onClick={() => navigate("/library")}
					className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
				>
					Back to Library
				</button>
			</div>

			<StrategyStepper />
		</div>
	);
};

export default StrategyBuilderWrapper;
