import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import "chartjs-adapter-date-fns";

interface StrategyPerformanceProps {
	data: {
		labels: string[];
		pnl: number[];
		cumulativePnl: number[];
		wins: number;
		losses: number;
		dates: string[];
	};
	isLoading?: boolean;
}

const StrategyPerformanceChart: React.FC<StrategyPerformanceProps> = ({
	data,
	isLoading,
}) => {
	const chartRef = useRef<HTMLCanvasElement | null>(null);
	const chartInstance = useRef<Chart | null>(null);

	useEffect(() => {
		if (!chartRef.current || isLoading || !data.labels.length) return;

		// Destroy existing chart
		if (chartInstance.current) {
			chartInstance.current.destroy();
		}

		const ctx = chartRef.current.getContext("2d");
		if (!ctx) return;

		// Create chart
		chartInstance.current = new Chart(ctx, {
			type: "bar",
			data: {
				labels: data.dates,
				datasets: [
					{
						type: "bar",
						label: "Trade PnL",
						data: data.pnl,
						backgroundColor: data.pnl.map((value) =>
							value >= 0 ? "rgba(75, 192, 192, 0.7)" : "rgba(255, 99, 132, 0.7)"
						),
						borderColor: data.pnl.map((value) =>
							value >= 0 ? "rgba(75, 192, 192, 1)" : "rgba(255, 99, 132, 1)"
						),
						borderWidth: 1,
						order: 2,
					},
					{
						type: "line",
						label: "Cumulative PnL",
						data: data.cumulativePnl,
						borderColor: "rgba(54, 162, 235, 1)",
						borderWidth: 2,
						pointRadius: 0,
						fill: false,
						tension: 0.1,
						yAxisID: "y1",
						order: 1,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					mode: "index",
					intersect: false,
				},
				scales: {
					x: {
						type: "time",
						time: {
							unit: "day",
							tooltipFormat: "MMM d, yyyy",
							displayFormats: {
								day: "MMM d",
							},
						},
						grid: {
							display: false,
						},
						border: {
							display: false,
						},
						ticks: {
							color: "rgba(255, 255, 255, 0.7)",
						},
					},
					y: {
						grid: {
							color: "rgba(255, 255, 255, 0.1)",
						},
						border: {
							display: false,
						},
						ticks: {
							color: "rgba(255, 255, 255, 0.7)",
						},
					},
					y1: {
						position: "right",
						grid: {
							display: false,
						},
						border: {
							display: false,
						},
						ticks: {
							color: "rgba(54, 162, 235, 0.7)",
						},
					},
				},
				plugins: {
					legend: {
						labels: {
							color: "rgba(255, 255, 255, 0.7)",
						},
					},
					tooltip: {
						callbacks: {
							label: function (context: any) {
								if (context.dataset.label === "Trade PnL") {
									return `PnL: ${context.parsed.y.toFixed(2)}%`;
								} else {
									return `Cumulative: ${context.parsed.y.toFixed(2)}%`;
								}
							},
						},
					},
				},
			},
		});

		return () => {
			if (chartInstance.current) {
				chartInstance.current.destroy();
				chartInstance.current = null;
			}
		};
	}, [data, isLoading]);

	// Calculate win rate
	const winRate =
		data.wins + data.losses > 0
			? ((data.wins / (data.wins + data.losses)) * 100).toFixed(1)
			: "N/A";

	// Calculate average win and loss
	const avgWin =
		data.wins > 0
			? (
					data.pnl.filter((p) => p > 0).reduce((a, b) => a + b, 0) / data.wins
			  ).toFixed(2)
			: "N/A";

	const avgLoss =
		data.losses > 0
			? (
					data.pnl.filter((p) => p < 0).reduce((a, b) => a + b, 0) / data.losses
			  ).toFixed(2)
			: "N/A";

	// Total PnL
	const totalPnl =
		data.pnl.length > 0
			? data.pnl.reduce((a, b) => a + b, 0).toFixed(2)
			: "0.00";

	return (
		<div className="bg-gray-800 rounded-lg shadow-lg p-4">
			<h2 className="text-xl font-semibold mb-4">Strategy Performance</h2>

			{isLoading ? (
				<div className="flex items-center justify-center h-64">
					<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
				</div>
			) : !data.labels.length ? (
				<div className="flex items-center justify-center h-64 text-gray-400">
					No performance data available
				</div>
			) : (
				<>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
						<div className="bg-gray-700 p-3 rounded-md">
							<p className="text-sm text-gray-400">Win Rate</p>
							<p className="text-xl font-medium">{winRate}%</p>
						</div>
						<div className="bg-gray-700 p-3 rounded-md">
							<p className="text-sm text-gray-400">Total Trades</p>
							<p className="text-xl font-medium">{data.wins + data.losses}</p>
						</div>
						<div className="bg-gray-700 p-3 rounded-md">
							<p className="text-sm text-gray-400">Avg Win</p>
							<p
								className={`text-xl font-medium ${
									Number(avgWin) > 0 ? "text-green-400" : ""
								}`}
							>
								{avgWin}%
							</p>
						</div>
						<div className="bg-gray-700 p-3 rounded-md">
							<p className="text-sm text-gray-400">Avg Loss</p>
							<p
								className={`text-xl font-medium ${
									Number(avgLoss) < 0 ? "text-red-400" : ""
								}`}
							>
								{avgLoss}%
							</p>
						</div>
					</div>

					<div className="h-80">
						<canvas ref={chartRef}></canvas>
					</div>

					<div className="mt-4 text-right">
						<p className="text-sm text-gray-400">Total PnL</p>
						<p
							className={`text-xl font-medium ${
								Number(totalPnl) >= 0 ? "text-green-400" : "text-red-400"
							}`}
						>
							{totalPnl}%
						</p>
					</div>
				</>
			)}
		</div>
	);
};

export default StrategyPerformanceChart;
