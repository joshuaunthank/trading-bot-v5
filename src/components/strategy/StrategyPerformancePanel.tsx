import React, { useState, useEffect } from "react";
import StrategyPerformanceChart from "./StrategyPerformanceChart";
import ChartSpinner from "../ChartSpinner";

interface StrategyPerformancePanelProps {
	strategyId: string | null;
}

const StrategyPerformancePanel: React.FC<StrategyPerformancePanelProps> = ({
	strategyId,
}) => {
	const [performanceData, setPerformanceData] = useState<any>({
		labels: [],
		pnl: [],
		cumulativePnl: [],
		wins: 0,
		losses: 0,
		dates: [],
	});
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchPerformanceData = async () => {
			if (!strategyId) return;

			setIsLoading(true);
			setError(null);

			try {
				const response = await fetch(
					`/api/v1/strategy/${strategyId}/performance`
				);

				if (!response.ok) {
					throw new Error(
						`Failed to fetch performance data: ${response.statusText}`
					);
				}

				const result = await response.json();

				if (result.success && result.data) {
					setPerformanceData(result.data);
				} else {
					throw new Error(result.message || "Failed to fetch performance data");
				}
			} catch (err) {
				console.error("Error fetching strategy performance:", err);
				setError(
					err instanceof Error ? err.message : "An unknown error occurred"
				);
			} finally {
				setIsLoading(false);
			}
		};

		fetchPerformanceData();
	}, [strategyId]);

	if (!strategyId) {
		return (
			<div className="bg-gray-800 rounded-lg shadow-lg p-4">
				<h2 className="text-xl font-semibold mb-4">Strategy Performance</h2>
				<p className="text-gray-400 text-center p-8">
					Select a strategy to view performance metrics
				</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-gray-800 rounded-lg shadow-lg p-4">
				<h2 className="text-xl font-semibold mb-4">Strategy Performance</h2>
				<div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-md">
					{error}
				</div>
			</div>
		);
	}

	return (
		<div className="bg-gray-800 rounded-lg shadow-lg p-4">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-xl font-semibold">Strategy Performance</h2>
				<div className="text-sm text-gray-400">Strategy ID: {strategyId}</div>
			</div>

			{isLoading ? (
				<div className="flex flex-col items-center justify-center p-16">
					<ChartSpinner size="large" />
					<p className="mt-4 text-gray-400">Loading performance data...</p>
				</div>
			) : (
				<StrategyPerformanceChart data={performanceData} />
			)}
		</div>
	);
};

export default StrategyPerformancePanel;
