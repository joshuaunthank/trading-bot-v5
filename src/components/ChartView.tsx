import React, { useEffect, useRef, useState } from "react";
import {
	Chart,
	registerables,
	ChartTypeRegistry,
	ChartDataset,
	Point,
	ChartConfiguration,
} from "chart.js";
import {
	CandlestickController,
	CandlestickElement,
	OhlcController,
	OhlcElement,
} from "chartjs-chart-financial";
import "chartjs-chart-financial";
import "chartjs-plugin-zoom";
import ChartSpinner from "./ChartSpinner";

// Register all necessary Chart.js components
Chart.register(
	...registerables,
	CandlestickController,
	CandlestickElement,
	OhlcController,
	OhlcElement
);

interface OHLCVData {
	timestamp: number;
	open: number;
	high: number;
	close: number;
	low: number;
	volume: number;
}

interface ChartViewProps {
	data: OHLCVData[];
	symbol: string;
	timeframe: string;
	loading?: boolean;
	indicators?: {
		name: string;
		data: number[];
		color: string;
	}[];
	onTimeframeChange?: (timeframe: string) => void;
}

const ChartView: React.FC<ChartViewProps> = ({
	data,
	symbol,
	timeframe,
	loading = false,
	indicators = [],
	onTimeframeChange,
}) => {
	const chartRef = useRef<HTMLCanvasElement>(null);
	const chartInstance = useRef<Chart | null>(null);
	const [chartType, setChartType] = useState<"candlestick" | "line">(
		"candlestick"
	);
	const timeframes = ["1m", "5m", "15m", "1h", "4h", "1d"];

	// Destroy chart on component unmount
	useEffect(() => {
		return () => {
			if (chartInstance.current) {
				chartInstance.current.destroy();
				chartInstance.current = null;
			}
		};
	}, []);

	// Create or update chart when data changes
	useEffect(() => {
		if (loading || !chartRef.current || !data || data.length === 0) return;

		const ctx = chartRef.current.getContext("2d");
		if (!ctx) return;

		// Prepare data for chart
		const timestamps = data.map((candle) => new Date(candle.timestamp));

		// Prepare datasets based on chart type
		const datasets = [];

		if (chartType === "candlestick") {
			// Candlestick dataset
			datasets.push({
				type: "candlestick" as const,
				label: symbol,
				data: data.map((candle) => ({
					x: candle.timestamp,
					o: candle.open,
					h: candle.high,
					l: candle.low,
					c: candle.close,
				})),
				color: {
					up: "rgba(75, 192, 75, 1)",
					down: "rgba(255, 99, 132, 1)",
					unchanged: "rgba(90, 90, 90, 1)",
				},
			});
		} else {
			// Line chart for close prices
			datasets.push({
				type: "line" as const,
				label: `${symbol} (Close)`,
				data: data.map((candle) => ({
					x: candle.timestamp,
					y: candle.close,
				})),
				borderColor: "rgba(75, 192, 192, 1)",
				borderWidth: 1,
				pointRadius: 0,
				tension: 0.1,
			});
		}

		// Add volume as a bar chart
		datasets.push({
			type: "bar" as const,
			label: "Volume",
			data: data.map((candle) => ({
				x: candle.timestamp,
				y: candle.volume,
			})),
			backgroundColor: "rgba(128, 128, 255, 0.3)",
			yAxisID: "volume",
		});

		// Add indicator lines if provided
		indicators.forEach((indicator) => {
			datasets.push({
				type: "line" as const,
				label: indicator.name,
				data: indicator.data.map((value, index) => ({
					x: data[index]?.timestamp || 0,
					y: value,
				})),
				borderColor: indicator.color,
				borderWidth: 1,
				pointRadius: 0,
				tension: 0.1,
			});
		});

		// Destroy previous chart if it exists
		if (chartInstance.current) {
			chartInstance.current.destroy();
		}

		// Create new chart
		chartInstance.current = new Chart(ctx, {
			type: "line",
			data: {
				datasets: datasets as any[],
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
							unit: timeframe.includes("m")
								? "minute"
								: timeframe.includes("h")
								? "hour"
								: "day",
						},
						grid: {
							color: "rgba(255, 255, 255, 0.1)",
						},
					},
					y: {
						type: "linear",
						display: true,
						position: "left",
						grid: {
							color: "rgba(255, 255, 255, 0.1)",
						},
					},
					volume: {
						type: "linear",
						display: true,
						position: "right",
						grid: {
							drawOnChartArea: false,
						},
						beginAtZero: true,
					},
				},
				plugins: {
					zoom: {
						pan: {
							enabled: true,
							mode: "x",
						},
						zoom: {
							wheel: {
								enabled: true,
							},
							pinch: {
								enabled: true,
							},
							mode: "x",
						},
					},
					legend: {
						display: true,
						position: "top",
						labels: {
							color: "rgb(255, 255, 255)",
						},
					},
					tooltip: {
						mode: "index",
						intersect: false,
					},
				},
			},
		});
	}, [data, symbol, timeframe, chartType, indicators, loading]);

	return (
		<div className="bg-gray-800 rounded-lg shadow-lg p-4 h-[500px]">
			<div className="flex justify-between items-center mb-4">
				<div className="flex items-center space-x-2">
					<h3 className="text-lg font-semibold">
						{symbol} - {timeframe}
					</h3>
					{loading && <ChartSpinner />}
				</div>
				<div className="flex space-x-4">
					<div className="flex bg-gray-700 rounded-md">
						<button
							className={`px-3 py-1 rounded-l-md ${
								chartType === "candlestick"
									? "bg-blue-600"
									: "hover:bg-gray-600"
							}`}
							onClick={() => setChartType("candlestick")}
						>
							Candles
						</button>
						<button
							className={`px-3 py-1 rounded-r-md ${
								chartType === "line" ? "bg-blue-600" : "hover:bg-gray-600"
							}`}
							onClick={() => setChartType("line")}
						>
							Line
						</button>
					</div>
					{onTimeframeChange && (
						<select
							className="bg-gray-700 border border-gray-600 text-white rounded-md px-2 py-1"
							value={timeframe}
							onChange={(e) => onTimeframeChange(e.target.value)}
						>
							{timeframes.map((tf) => (
								<option key={tf} value={tf}>
									{tf}
								</option>
							))}
						</select>
					)}
				</div>
			</div>

			<div className="h-[calc(100%-2.5rem)]">
				{loading ? (
					<div className="flex h-full justify-center items-center">
						<ChartSpinner size="large" />
					</div>
				) : data.length === 0 ? (
					<div className="flex h-full justify-center items-center text-gray-400">
						No data available
					</div>
				) : (
					<canvas ref={chartRef} />
				)}
			</div>
		</div>
	);
};

export default ChartView;
