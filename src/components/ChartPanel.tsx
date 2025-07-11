import React, { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import "chartjs-adapter-date-fns";
import Loader from "./Loader";
import { CalculatedIndicator, OHLCVData } from "../types/indicators";

// Register Chart.js components and plugins
Chart.register(...registerables, zoomPlugin);

interface ChartPanelProps {
	data: OHLCVData[];
	symbol: string;
	timeframe: string;
	loading?: boolean;
	indicators: CalculatedIndicator[];
	panelType: "price" | "oscillator" | "volume";
	// height: string;
	heightPx?: number; // <-- add this
	showPrice?: boolean; // For price panel
	zoomState?: any; // Shared zoom state across panels
	onZoomChange?: (zoomState: any) => void;
}

const ChartPanel: React.FC<ChartPanelProps> = ({
	data,
	symbol,
	timeframe,
	loading = false,
	indicators = [],
	panelType,
	// height,
	heightPx, // <-- add this
	showPrice = false,
	zoomState,
	onZoomChange,
}) => {
	const chartRef = useRef<HTMLCanvasElement>(null);
	const chartInstance = useRef<Chart | null>(null);
	const previousDataLength = useRef<number>(0);
	const lastUpdateTime = useRef<number>(0);
	const minUpdateInterval = 50; // ~20 FPS for smooth updates

	// Live price tracking (only for price panel)
	const lastKnownPrice = useRef<number | null>(null);
	const previousPrice = useRef<number | null>(null);

	// TradingView-style live price marker plugin (only for price panel)
	const livePriceMarkerPlugin = {
		id: "livePriceMarker",
		afterDraw: (chart: Chart) => {
			// Only show live price marker on price panel
			if (panelType !== "price" || !lastKnownPrice.current || !chart.scales.y)
				return;

			const ctx = chart.ctx;
			const yScale = chart.scales.y;
			const chartArea = chart.chartArea;

			// Get current price and determine color based on price movement
			const currentPrice = lastKnownPrice.current;
			const prevPrice = previousPrice.current;
			let priceColor = "#ffffff"; // Default white
			let backgroundColor = "rgba(255, 255, 255, 0.1)";

			if (prevPrice !== null && currentPrice !== prevPrice) {
				if (currentPrice > prevPrice) {
					priceColor = "#00ff88"; // Green for price increase
					backgroundColor = "rgba(0, 255, 136, 0.2)";
				} else if (currentPrice < prevPrice) {
					priceColor = "#ff4757"; // Red for price decrease
					backgroundColor = "rgba(255, 71, 87, 0.2)";
				}
			}

			// Calculate Y position for the current price
			const yPosition = yScale.getPixelForValue(currentPrice);

			// Only draw if price is within visible chart area
			if (yPosition < chartArea.top || yPosition > chartArea.bottom) return;

			ctx.save();

			// Draw horizontal dotted line across the chart
			ctx.setLineDash([5, 5]); // Dotted line pattern
			ctx.strokeStyle = priceColor;
			ctx.lineWidth = 1;
			ctx.globalAlpha = 0.8;

			ctx.beginPath();
			ctx.moveTo(chartArea.left, yPosition);
			ctx.lineTo(chartArea.right, yPosition);
			ctx.stroke();

			// Draw price box on the right side
			const priceText = `$${currentPrice.toFixed(4)}`;
			ctx.font =
				'12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
			const textMetrics = ctx.measureText(priceText);
			const boxWidth = textMetrics.width + 12; // Padding
			const boxHeight = 20;
			const boxX = chartArea.right + 2; // Right side of chart
			const boxY = yPosition - boxHeight / 2;

			// Draw background box
			ctx.setLineDash([]); // Reset line dash
			ctx.fillStyle = backgroundColor;
			ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

			// Draw border
			ctx.strokeStyle = priceColor;
			ctx.lineWidth = 1;
			ctx.globalAlpha = 0.9;
			ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

			// Draw price text
			ctx.fillStyle = priceColor;
			ctx.globalAlpha = 1;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.fillText(priceText, boxX + 6, yPosition);

			ctx.restore();
		},
	};

	// Create scales based on panel type
	const createScales = () => {
		const scales: any = {
			x: {
				type: "time",
				time: {
					displayFormats: {
						minute: "HH:mm",
						hour: "MMM dd HH:mm",
						day: "MMM dd",
					},
					tooltipFormat: "MMM dd, yyyy HH:mm:ss",
				},
				grid: {
					color: "rgba(255, 255, 255, 0.1)",
				},
				ticks: {
					color: "rgb(255, 255, 255)",
					display: panelType === "price" || panelType === "volume", // Only show x-axis labels on bottom panels
				},
			},
		};

		// Add appropriate Y-axis based on panel type
		switch (panelType) {
			case "price":
				scales.y = {
					type: "linear",
					position: "right",
					grid: {
						color: "rgba(255, 255, 255, 0.1)",
					},
					ticks: {
						color: "rgb(255, 255, 255)",
					},
					title: {
						display: true,
						text: "Price",
						color: "rgb(255, 255, 255)",
					},
				};
				break;
			case "oscillator":
				// Add scales for different oscillator types
				const oscillatorTypes = [...new Set(indicators.map((ind) => ind.type))];

				oscillatorTypes.forEach((type, index) => {
					const scaleId =
						index === 0 ? "y" : `y_${type.toLowerCase()}_${index}`;
					if (type.toUpperCase().includes("RSI")) {
						scales[scaleId] = {
							type: "linear",
							position: index % 2 === 0 ? "left" : "right",
							min: 0,
							max: 100,
							grid: {
								color: "rgba(255, 255, 255, 0.1)",
								drawOnChartArea: index === 0, // Only first oscillator shows grid
							},
							ticks: {
								color: "rgb(255, 255, 255)",
								stepSize: 25,
							},
							title: {
								display: true,
								text: type.toUpperCase(),
								color: "rgb(255, 255, 255)",
							},
						};
					} else if (type.toUpperCase().includes("MACD")) {
						scales[scaleId] = {
							type: "linear",
							position: index % 2 === 0 ? "left" : "right",
							grid: {
								color: "rgba(255, 255, 255, 0.1)",
								drawOnChartArea: index === 0,
							},
							ticks: {
								color: "rgb(255, 255, 255)",
							},
							title: {
								display: true,
								text: type.toUpperCase(),
								color: "rgb(255, 255, 255)",
							},
						};
					} else {
						// Generic oscillator scale
						scales[scaleId] = {
							type: "linear",
							position: index % 2 === 0 ? "left" : "right",
							grid: {
								color: "rgba(255, 255, 255, 0.1)",
								drawOnChartArea: index === 0,
							},
							ticks: {
								color: "rgb(255, 255, 255)",
							},
							title: {
								display: true,
								text: type.toUpperCase(),
								color: "rgb(255, 255, 255)",
							},
						};
					}
				});
				break;
			case "volume":
				scales.y = {
					type: "linear",
					position: "right",
					grid: {
						color: "rgba(255, 255, 255, 0.1)",
					},
					ticks: {
						color: "rgb(255, 255, 255)",
					},
					title: {
						display: true,
						text: "Volume",
						color: "rgb(255, 255, 255)",
					},
				};
				break;
		}

		return scales;
	};

	// Create datasets based on panel type
	const createDatasets = (validData: OHLCVData[]) => {
		const datasets: any[] = [];

		// Add price data if this is the price panel
		if (panelType === "price" && showPrice) {
			datasets.push({
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
				yAxisID: "y",
				fill: false,
			});
		}

		// Add volume data if this is the volume panel
		if (panelType === "volume") {
			datasets.push({
				label: "Volume",
				data: validData.map((candle) => ({
					x: candle.timestamp,
					y: candle.volume,
				})),
				borderColor: "rgba(255, 206, 84, 0.8)",
				backgroundColor: "rgba(255, 206, 84, 0.4)",
				borderWidth: 1,
				type: "bar",
				yAxisID: "y",
			});
		}

		// Add indicator datasets
		indicators.forEach((indicator, index) => {
			let yAxisID = "y";

			// For oscillator panel, use specific scale for each indicator type
			if (panelType === "oscillator") {
				const uniqueTypes = [...new Set(indicators.map((ind) => ind.type))];
				const typeIndex = uniqueTypes.findIndex(
					(type) => type === indicator.type
				);
				yAxisID =
					typeIndex === 0
						? "y"
						: `y_${indicator.type.toLowerCase()}_${typeIndex}`;
			}

			datasets.push({
				label: indicator.name,
				data: indicator.data,
				borderColor: indicator.color,
				backgroundColor: indicator.color + "20",
				borderWidth: 2,
				pointRadius: 0,
				pointHoverRadius: 3,
				tension: 0.1,
				fill: false,
				yAxisID: yAxisID,
			});
		});

		return datasets;
	};

	// Create chart
	const createChart = (validData: OHLCVData[]) => {
		if (!chartRef.current) return;
		const ctx = chartRef.current.getContext("2d");
		if (!ctx) return;

		// Destroy previous chart if it exists
		if (chartInstance.current) {
			chartInstance.current.destroy();
		}

		const scales = createScales();
		const datasets = createDatasets(validData);

		try {
			chartInstance.current = new Chart(ctx, {
				type: "line",
				plugins: panelType === "price" ? [livePriceMarkerPlugin] : [], // Only add live price marker to price panel
				data: { datasets },
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
					scales,
					plugins: {
						legend: {
							display: true,
							position: "top",
							labels: {
								color: "rgb(255, 255, 255)",
								boxWidth: 12,
								boxHeight: 12,
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
									const value = context.parsed.y;
									if (typeof value === "number") {
										return `${context.dataset.label}: ${value.toFixed(4)}`;
									}
									return `${context.dataset.label}: ${value}`;
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
									// Sync zoom across all panels
									if (onZoomChange) {
										const xScale = chart.scales.x;
										const newZoomState = {
											min: xScale.min,
											max: xScale.max,
										};
										onZoomChange(newZoomState);
									}
								},
							},
							pan: {
								enabled: true,
								mode: "x",
								scaleMode: "x",
								onPan: function ({ chart }) {
									// Sync pan across all panels
									if (onZoomChange) {
										const xScale = chart.scales.x;
										const newZoomState = {
											min: xScale.min,
											max: xScale.max,
										};
										onZoomChange(newZoomState);
									}
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

			// Initialize price tracking for price panel
			if (panelType === "price" && validData.length > 0) {
				const currentPrice = validData[validData.length - 1].close;
				previousPrice.current = lastKnownPrice.current; // Save previous price if exists
				lastKnownPrice.current = currentPrice;
			}
		} catch (error) {
			console.error("Chart.js error in panel:", panelType, error);
		}
	};

	// Update existing chart with new data
	const updateChart = (validData: OHLCVData[]) => {
		if (!chartInstance.current) return;

		try {
			// Update datasets with new data
			const newDatasets = createDatasets(validData);

			// Replace chart data
			chartInstance.current.data.datasets = newDatasets;

			// Update chart with reduced animation for live updates
			chartInstance.current.update("none"); // No animation for real-time updates
		} catch (error) {
			console.error("Chart.js update error in panel:", panelType, error);
		}
	};

	// Sync zoom state across panels
	useEffect(() => {
		if (chartInstance.current && zoomState && onZoomChange) {
			const xScale = chartInstance.current.scales.x;
			if (
				xScale &&
				(xScale.min !== zoomState.min || xScale.max !== zoomState.max)
			) {
				xScale.options.min = zoomState.min;
				xScale.options.max = zoomState.max;
				chartInstance.current.update("none");
			}
		}
	}, [zoomState]);

	// Create or update chart when data changes
	useEffect(() => {
		if (loading || !chartRef.current || !data || data.length === 0) return;

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

		if (validData.length === 0) return;

		// Check if this is a live update vs new data
		const currentDataLength = validData.length;
		const dataLengthChanged = previousDataLength.current !== currentDataLength;
		const now = Date.now();
		const shouldThrottle = now - lastUpdateTime.current < minUpdateInterval;

		// Check if data actually changed (not just repeated identical data)
		const latestCandle = validData[validData.length - 1];
		const dataActuallyChanged = (() => {
			if (dataLengthChanged) return true;

			// Compare with last known data to detect real changes
			const lastKnownData = chartInstance.current?.data?.datasets?.[0]?.data;
			if (!lastKnownData || lastKnownData.length === 0) return true;

			const lastKnownPoint = lastKnownData[lastKnownData.length - 1] as any;
			const priceChanged = lastKnownPoint?.y !== latestCandle?.close;
			const timestampChanged = lastKnownPoint?.x !== latestCandle?.timestamp;

			return priceChanged || timestampChanged;
		})();

		// Create chart if it doesn't exist or indicators changed
		const needsNewChart =
			!chartInstance.current ||
			chartInstance.current.data.datasets.length !==
				(showPrice ? 1 : 0) + indicators.length;

		if (needsNewChart) {
			createChart(validData);
			previousDataLength.current = currentDataLength;
			lastUpdateTime.current = now;
		} else if (chartInstance.current && dataActuallyChanged) {
			// Update existing chart data only if data actually changed
			if (!shouldThrottle) {
				// Update the chart data directly
				updateChart(validData);
				previousDataLength.current = currentDataLength;
				lastUpdateTime.current = now;
			}

			// Update price tracking for live price marker (price panel only)
			if (panelType === "price" && validData.length > 0) {
				const currentPrice = validData[validData.length - 1].close;
				const priceChanged = lastKnownPrice.current !== currentPrice;

				if (priceChanged) {
					previousPrice.current = lastKnownPrice.current;
					lastKnownPrice.current = currentPrice;

					// Trigger chart redraw to show updated price marker
					chartInstance.current.update("none");
				}
			}
		}
	}, [data, symbol, timeframe, indicators, loading, panelType, showPrice]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (chartInstance.current) {
				chartInstance.current.destroy();
				chartInstance.current = null;
			}
		};
	}, []);

	return (
		<div className={`bg-gray-700 rounded-lg shadow-lg p-4`}>
			{/* Panel header */}
			<div className="flex justify-between items-center mb-2">
				<h4 className="text-sm font-medium text-gray-300">
					{panelType === "price"
						? "Price Chart"
						: panelType === "oscillator"
						? "Oscillators"
						: "Volume"}
				</h4>
			</div>

			{/* Chart area: set height here, accounting for padding (p-4 = 32px vertical) */}
			<div
				className="relative w-full"
				style={
					panelType === "price" && heightPx
						? { minHeight: heightPx - 32, height: heightPx - 32 }
						: {}
				}
			>
				{loading ? (
					<div className="flex h-full justify-center items-center">
						<Loader size="large" />
					</div>
				) : data.length === 0 ? (
					<div className="flex h-full justify-center items-center text-gray-400 text-sm">
						No data available
					</div>
				) : indicators.length === 0 && !showPrice ? (
					<div className="flex h-full justify-center items-center text-gray-400 text-sm">
						No {panelType} indicators
					</div>
				) : (
					<canvas ref={chartRef} />
				)}
			</div>
		</div>
	);
};

export default React.memo(ChartPanel);
