import React, { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import "chartjs-adapter-date-fns";
import ChartSpinner from "./ChartSpinner";

// Register Chart.js components
Chart.register(...registerables, zoomPlugin);

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
	const [chartType, setChartType] = useState<"line">("line");
	const [isZoomed, setIsZoomed] = useState(false);
	const timeframes = ["1m", "5m", "15m", "1h", "4h", "1d"];
	const previousDataLength = useRef<number>(0);
	const lastKnownPrice = useRef<number | null>(null);
	const zoomState = useRef<any>(null); // Store zoom state

	// Destroy chart on component unmount
	useEffect(() => {
		return () => {
			if (chartInstance.current) {
				chartInstance.current.destroy();
				chartInstance.current = null;
			}
		};
	}, []);

	// Helper functions to preserve zoom state
	const saveZoomState = () => {
		if (chartInstance.current && chartInstance.current.scales) {
			const scales = chartInstance.current.scales;
			const xScale = scales.x;
			const yScale = scales.y;

			// Check if chart is actually zoomed or panned
			const hasZoom =
				xScale &&
				xScale.min !== undefined &&
				xScale.max !== undefined &&
				typeof xScale.options?.min === "number" &&
				typeof xScale.options?.max === "number" &&
				(xScale.min > xScale.options.min || xScale.max < xScale.options.max);

			if (hasZoom) {
				const newZoomState = {
					x: {
						min: xScale.min,
						max: xScale.max,
					},
					y: yScale
						? {
								min: yScale.min,
								max: yScale.max,
						  }
						: null,
				};

				// Only update if the zoom state actually changed
				if (
					!zoomState.current ||
					zoomState.current.x.min !== newZoomState.x.min ||
					zoomState.current.x.max !== newZoomState.x.max
				) {
					zoomState.current = newZoomState;
					setIsZoomed(true);
					console.log("Saved zoom state:", zoomState.current);
				}
			} else {
				// No zoom detected, but keep existing zoom state if user just reset
				if (zoomState.current) {
					console.log("Chart not zoomed but zoom state exists, keeping it");
				}
				setIsZoomed(false);
			}
		}
	};

	const restoreZoomState = () => {
		if (chartInstance.current && zoomState.current) {
			console.log("Attempting to restore zoom state:", zoomState.current);

			// Use multiple attempts with different delays to ensure chart is ready
			const attemptRestore = (attempt = 0) => {
				if (attempt > 5) {
					console.warn("Failed to restore zoom state after multiple attempts");
					return;
				}

				setTimeout(() => {
					if (
						chartInstance.current &&
						zoomState.current &&
						chartInstance.current.scales
					) {
						try {
							const chart = chartInstance.current;

							// Method 1: Direct scale manipulation (most reliable)
							const xScale = chart.scales.x;
							if (xScale && zoomState.current.x) {
								xScale.options.min = zoomState.current.x.min;
								xScale.options.max = zoomState.current.x.max;
								chart.update("none");
								console.log(
									"Successfully restored zoom state via direct scale manipulation"
								);
								setIsZoomed(true);
								return;
							}

							// Method 2: Use zoomScale plugin method
							chart.zoomScale(
								"x",
								{
									min: zoomState.current.x.min,
									max: zoomState.current.x.max,
								},
								"none"
							);
							console.log("Restored zoom state using zoomScale()");
							setIsZoomed(true);
						} catch (error) {
							console.warn(
								`Zoom restore attempt ${attempt + 1} failed:`,
								error
							);
							// Try again with longer delay
							attemptRestore(attempt + 1);
						}
					} else {
						// Chart not ready, try again
						console.log(
							`Chart not ready for zoom restore, attempt ${attempt + 1}`
						);
						attemptRestore(attempt + 1);
					}
				}, 10 + attempt * 20); // Shorter initial delay, increasing for each attempt
			};

			attemptRestore();
		}
	};

	// Helper function to create initial chart
	const createChart = (validData: OHLCVData[]) => {
		if (!chartRef.current) return;
		const ctx = chartRef.current.getContext("2d");
		if (!ctx) return;

		// Destroy previous chart if it exists
		if (chartInstance.current) {
			chartInstance.current.destroy();
		}

		try {
			chartInstance.current = new Chart(ctx, {
				type: "line",
				data: {
					datasets: [
						{
							label: `${symbol} (Close)`,
							data: validData.map((candle) => ({
								x: candle.timestamp,
								y: candle.close,
							})),
							borderColor: "rgba(75, 192, 192, 1)",
							backgroundColor: "rgba(75, 192, 192, 0.1)",
							borderWidth: 2,
							pointRadius: 0,
							pointHoverRadius: 4,
							tension: 0.1,
						},
						// Add indicator datasets
						...indicators.map((indicator) => ({
							label: indicator.name,
							data: indicator.data.map((value, index) => ({
								x: validData[index]?.timestamp || 0,
								y: value,
							})),
							borderColor: indicator.color,
							borderWidth: 1,
							pointRadius: 0,
							pointHoverRadius: 3,
							tension: 0.1,
							fill: false,
						})),
					],
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					animation: {
						duration: 0, // Disable animation for performance
					},
					interaction: {
						mode: "index",
						intersect: false,
					},
					scales: {
						x: {
							type: "time",
							time: {
								displayFormats: {
									minute: "HH:mm",
									hour: "HH:mm",
									day: "MMM dd",
								},
							},
							grid: {
								color: "rgba(255, 255, 255, 0.1)",
							},
							ticks: {
								color: "rgb(255, 255, 255)",
							},
						},
						y: {
							type: "linear",
							position: "right", // Move Y-axis to right side
							grid: {
								color: "rgba(255, 255, 255, 0.1)",
							},
							ticks: {
								color: "rgb(255, 255, 255)",
							},
						},
					},
					plugins: {
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
							backgroundColor: "rgba(0, 0, 0, 0.8)",
							titleColor: "rgb(255, 255, 255)",
							bodyColor: "rgb(255, 255, 255)",
							borderColor: "rgba(75, 192, 192, 1)",
							borderWidth: 1,
							cornerRadius: 6,
							displayColors: true,
							callbacks: {
								title: function (tooltipItems) {
									if (tooltipItems.length > 0) {
										const timestamp =
											validData[tooltipItems[0].dataIndex]?.timestamp;
										if (timestamp) {
											return new Date(timestamp).toLocaleString();
										}
									}
									return "";
								},
								label: function (context) {
									const dataIndex = context.dataIndex;
									const candleData = validData[dataIndex];
									if (candleData && context.dataset.label?.includes("Close")) {
										return [
											`Open: $${candleData.open.toFixed(4)}`,
											`High: $${candleData.high.toFixed(4)}`,
											`Low: $${candleData.low.toFixed(4)}`,
											`Close: $${candleData.close.toFixed(4)}`,
											`Volume: ${candleData.volume.toLocaleString()}`,
										];
									}
									return `${context.dataset.label}: ${context.parsed.y.toFixed(
										4
									)}`;
								},
							},
						},
						zoom: {
							zoom: {
								wheel: {
									enabled: true,
								},
								pinch: {
									enabled: true,
								},
								mode: "x",
								scaleMode: "x",
								onZoom: function ({ chart }) {
									// Update zoom state when zoom occurs
									const scales = chart.scales;
									const xScale = scales.x;
									const hasZoom =
										xScale &&
										xScale.min !== undefined &&
										xScale.max !== undefined &&
										typeof xScale.options?.min === "number" &&
										typeof xScale.options?.max === "number" &&
										(xScale.min > xScale.options.min ||
											xScale.max < xScale.options.max);
									setIsZoomed(!!hasZoom);
								},
							},
							pan: {
								enabled: true,
								mode: "x",
								scaleMode: "x",
								onPan: function ({ chart }) {
									// Update zoom state when pan occurs
									const scales = chart.scales;
									const xScale = scales.x;
									const hasZoom =
										xScale &&
										xScale.min !== undefined &&
										xScale.max !== undefined &&
										typeof xScale.options?.min === "number" &&
										typeof xScale.options?.max === "number" &&
										(xScale.min > xScale.options.min ||
											xScale.max < xScale.options.max);
									setIsZoomed(!!hasZoom);
								},
							},
							limits: {
								x: { min: "original", max: "original" },
							},
						},
					},
				},
			});

			previousDataLength.current = validData.length;
			if (validData.length > 0) {
				lastKnownPrice.current = validData[validData.length - 1].close;
			}
		} catch (error) {
			console.error("Chart.js error:", error);
		}
	};

	// Helper function to update chart incrementally
	const updateChart = (validData: OHLCVData[]) => {
		if (!chartInstance.current || validData.length === 0) return;

		const chart = chartInstance.current;
		const latestCandle = validData[validData.length - 1];

		// Check if this is just a price update for the same candle (WebSocket live update)
		const isSameCandleUpdate =
			validData.length === previousDataLength.current &&
			lastKnownPrice.current !== latestCandle.close;

		if (isSameCandleUpdate) {
			// Update only the last data point (live WebSocket update)
			const lastIndex = chart.data.datasets[0].data.length - 1;
			if (lastIndex >= 0) {
				(chart.data.datasets[0].data[lastIndex] as any).y = latestCandle.close;
			}
			lastKnownPrice.current = latestCandle.close;

			// Update without animation for smooth live updates
			// Use 'none' mode to avoid triggering zoom reset
			chart.update("none");
		} else if (validData.length > previousDataLength.current) {
			// New candle added - add new data point
			chart.data.datasets[0].data.push({
				x: latestCandle.timestamp,
				y: latestCandle.close,
			} as any);

			// Update indicators if they exist
			indicators.forEach((indicator, index) => {
				if (
					chart.data.datasets[index + 1] &&
					indicator.data[validData.length - 1] !== undefined
				) {
					chart.data.datasets[index + 1].data.push({
						x: latestCandle.timestamp,
						y: indicator.data[validData.length - 1],
					} as any);
				}
			});

			previousDataLength.current = validData.length;
			lastKnownPrice.current = latestCandle.close;

			// Update with minimal animation, use 'none' to preserve zoom
			chart.update("none");
		} else if (validData.length < previousDataLength.current) {
			// Data array got smaller - this might happen on timeframe switches
			// Full recreation is needed, zoom should be handled by caller
			console.log("Data array decreased, full chart recreation needed");
			saveZoomState();
			createChart(validData);
			restoreZoomState();
		} else {
			// Data structure changed significantly but same length
			// Replace all data while preserving zoom
			console.log("Data structure changed, replacing chart data");

			// Update the dataset data directly
			chart.data.datasets[0].data = validData.map((candle) => ({
				x: candle.timestamp,
				y: candle.close,
			})) as any;

			// Update indicators
			indicators.forEach((indicator, index) => {
				if (chart.data.datasets[index + 1]) {
					chart.data.datasets[index + 1].data = indicator.data.map(
						(value, i) => ({
							x: validData[i]?.timestamp || 0,
							y: value,
						})
					) as any;
				}
			});

			previousDataLength.current = validData.length;
			if (validData.length > 0) {
				lastKnownPrice.current = validData[validData.length - 1].close;
			}

			// Update without animation to preserve zoom
			chart.update("none");
		}
	};

	// Create or update chart when data changes
	useEffect(() => {
		if (loading || !chartRef.current || !data || data.length === 0) return;

		// Data validation and cleaning
		const validData = data
			.filter(
				(candle) =>
					candle.timestamp > 0 &&
					candle.timestamp < Date.now() + 86400000 &&
					!isNaN(candle.open) &&
					!isNaN(candle.high) &&
					!isNaN(candle.low) &&
					!isNaN(candle.close)
			)
			.sort((a, b) => a.timestamp - b.timestamp);

		if (validData.length === 0) {
			return;
		}

		// Check if chart exists and is for the same symbol/timeframe
		const currentSymbol =
			chartInstance.current?.data.datasets[0]?.label?.split(" ")[0];
		const currentTimeframe = chartInstance.current?.canvas?.dataset?.timeframe;
		const needsNewChart =
			!chartInstance.current ||
			symbol !== currentSymbol ||
			timeframe !== currentTimeframe;

		if (needsNewChart) {
			// Save zoom state before recreating chart for timeframe changes
			const wasTimeframeChange =
				chartInstance.current &&
				timeframe !== currentTimeframe &&
				symbol === currentSymbol;

			if (wasTimeframeChange) {
				saveZoomState(); // Preserve zoom when only timeframe changes
				console.log("Saving zoom state for timeframe change");
			} else {
				zoomState.current = null; // Clear zoom state for symbol changes
				console.log("Clearing zoom state for symbol change");
			}

			createChart(validData);
			if (chartInstance.current?.canvas) {
				chartInstance.current.canvas.dataset.timeframe = timeframe;
			}

			// Restore zoom state if it was a timeframe change
			if (wasTimeframeChange) {
				console.log("Restoring zoom state after timeframe change");
				restoreZoomState();
			}
		} else {
			// Chart exists for same symbol/timeframe - just update data
			console.log("Updating existing chart with new data");

			// Save current zoom state before any updates
			if (chartInstance.current && (isZoomed || zoomState.current)) {
				saveZoomState();
			}

			updateChart(validData);

			// Restore zoom state after update if we had one
			if (zoomState.current) {
				// Use a short timeout to ensure chart update is complete
				setTimeout(() => {
					if (zoomState.current) {
						restoreZoomState();
					}
				}, 10);
			}
		}
	}, [data, symbol, timeframe, chartType, indicators, loading]);

	return (
		<div className="bg-gray-800 rounded-lg shadow-lg p-4 h-[700px]">
			<div className="flex justify-between items-center mb-4">
				<div className="flex items-center space-x-2">
					<h3 className="text-lg font-semibold">
						{symbol} - {timeframe}
					</h3>
					{loading && <ChartSpinner />}
				</div>
				<div className="flex space-x-4">
					{/* Zoom Reset Button */}
					<button
						onClick={() => {
							if (chartInstance.current) {
								chartInstance.current.resetZoom();
								zoomState.current = null; // Clear saved zoom state
								setIsZoomed(false);
							}
						}}
						className={`text-sm px-3 py-1 rounded-md transition-colors ${
							isZoomed || zoomState.current
								? "bg-orange-600 hover:bg-orange-700 text-white"
								: "bg-gray-600 hover:bg-gray-700 text-gray-300"
						}`}
						disabled={loading}
						title={
							isZoomed || zoomState.current
								? "Reset zoom and pan"
								: "No zoom applied"
						}
					>
						{isZoomed || zoomState.current ? "🔍 Reset Zoom" : "Reset Zoom"}
					</button>
					{/* Zoom status indicator */}
					{(isZoomed || zoomState.current) && (
						<span className="text-xs text-orange-300 self-center">
							📍 Zoomed
						</span>
					)}
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

			<div style={{ height: "30vh" }}>
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

export default React.memo(ChartView, (prevProps, nextProps) => {
	// Custom comparison function for optimal performance
	return (
		prevProps.symbol === nextProps.symbol &&
		prevProps.timeframe === nextProps.timeframe &&
		prevProps.loading === nextProps.loading &&
		prevProps.data === nextProps.data && // Reference equality check (optimized by parent)
		JSON.stringify(prevProps.indicators) ===
			JSON.stringify(nextProps.indicators)
	);
});
