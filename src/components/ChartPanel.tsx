import React, {
	useEffect,
	useRef,
	useImperativeHandle,
	forwardRef,
} from "react";
import {
	Chart,
	registerables,
	ChartDataset,
	ChartTypeRegistry,
	Point,
	BubbleDataPoint,
	ScatterDataPoint,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import "chartjs-adapter-date-fns";
import Loader from "./Loader";
import {
	CalculatedIndicator,
	OHLCVData,
	IndicatorValue,
} from "../types/indicators";

// Register Chart.js components and plugins
Chart.register(...registerables, zoomPlugin);

// Define chart data point type - matches IndicatorValue from indicators.ts
type ChartPoint = IndicatorValue;

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

// Export Chart.js handle for external control
export interface ChartPanelHandle {
	chartInstance: React.MutableRefObject<Chart<any, any, any> | null>;
	resetZoom: () => void;
}

const ChartPanel = forwardRef<ChartPanelHandle, ChartPanelProps>(
	(
		{
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
		},
		ref
	) => {
		// Helper to determine if chart needs full recreation vs just a data update
		const shouldRecreateChart = (force = false) => {
			if (force) return true;
			if (!chartInstance.current) return true;

			const now = Date.now();
			// Don't recreate too frequently
			if (now - lastChartRecreation.current < chartRecreationThreshold) {
				return false;
			}

			// Check if dataset count changed - indicates indicator structure changes
			const expectedDatasetCount =
				indicators.length +
				(showPrice && panelType === "price" ? 1 : 0) +
				(panelType === "volume" ? 1 : 0);

			if (chartInstance.current.data.datasets.length !== expectedDatasetCount) {
				return true;
			}

			// Check if indicator types/names changed
			const currentIndicatorNames = chartInstance.current.data.datasets
				.slice(panelType === "price" && showPrice ? 1 : 0)
				.slice(panelType === "volume" ? 1 : 0)
				.map((ds) => ds.label || "");

			const newIndicatorNames = indicators.map((ind) => ind.name);

			if (currentIndicatorNames.length !== newIndicatorNames.length) {
				return true;
			}

			return !currentIndicatorNames.every(
				(name, i) => name === newIndicatorNames[i]
			);
		};

		const chartRef = useRef<HTMLCanvasElement>(null);
		const chartInstance = useRef<Chart<any, any, any> | null>(null);
		const previousDataLength = useRef<number>(0);
		const lastUpdateTime = useRef<number>(0);
		const minUpdateInterval = 50; // ~20 FPS for smooth updates

		// Track chart recreation to avoid too frequent rebuilds
		const lastChartRecreation = useRef<number>(0);
		const chartRecreationThreshold = 2000; // Min ms between full chart recreations

		// Performance monitoring for chart updates
		const updateCount = useRef<number>(0);
		const recreateCount = useRef<number>(0);
		const logPerformance = () => {
			// Only log occasionally to avoid console spam
			if (updateCount.current % 50 === 0) {
				console.log(
					`Chart ${panelType} performance: ${updateCount.current} updates, ${recreateCount.current} recreations`
				);
			}
		};

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
					const oscillatorTypes = [
						...new Set(indicators.map((ind) => ind.type)),
					];

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
		const createDatasets = (
			validData: OHLCVData[]
		): ChartDataset<"line" | "bar", ChartPoint[]>[] => {
			const datasets: ChartDataset<"line" | "bar", ChartPoint[]>[] = [];

			// Add price data if this is the price panel
			if (panelType === "price" && showPrice) {
				datasets.push({
					type: "line",
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
					type: "bar",
					label: "Volume",
					data: validData.map((candle) => ({
						x: candle.timestamp,
						y: candle.volume,
					})),
					borderColor: "rgba(255, 206, 84, 0.8)",
					backgroundColor: "rgba(255, 206, 84, 0.4)",
					borderWidth: 1,
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

				// Ensure indicator data is in {x, y} format that Chart.js expects
				let formattedData: ChartPoint[] = [];

				// Check if this is already in {x, y} format
				if (indicator.data && indicator.data.length > 0) {
					if (
						typeof indicator.data[0] === "object" &&
						"x" in indicator.data[0] &&
						"y" in indicator.data[0]
					) {
						// Already in {x, y} format
						formattedData = indicator.data as ChartPoint[];
					} else if (
						typeof indicator.data[0] === "number" &&
						validData.length === indicator.data.length
					) {
						// Convert from number[] to {x, y}[] using timestamps from validData
						formattedData = (indicator.data as unknown as number[]).map(
							(value, i) => ({
								x: validData[i].timestamp,
								y: value,
							})
						);
					} else {
						// Can't determine format, use as is but log warning
						console.warn(`Unknown data format for indicator ${indicator.name}`);
						formattedData = [];
					}
				}

				datasets.push({
					type: "line",
					label: indicator.name,
					data: formattedData,
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

			// Save current zoom state if chart exists
			let savedZoomState = null;
			if (chartInstance.current) {
				// Save zoom/pan state
				const xScale = chartInstance.current.scales.x;
				if (xScale && xScale.min !== undefined && xScale.max !== undefined) {
					savedZoomState = {
						min: xScale.min,
						max: xScale.max,
					};
				}

				// Destroy previous chart
				chartInstance.current.destroy();
			}

			const scales = createScales();
			const datasets = createDatasets(validData);

			// Apply saved zoom state if exists
			if (savedZoomState) {
				if (scales.x) {
					scales.x.min = savedZoomState.min;
					scales.x.max = savedZoomState.max;
				}
			}

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

				// Track chart recreation time
				lastChartRecreation.current = Date.now();
				previousDataLength.current = validData.length;

				// Track recreations for performance monitoring
				recreateCount.current++;
				logPerformance();

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
				// Only update the data points, not the entire datasets
				// This helps preserve any Chart.js internal state and is more efficient

				let datasetIndex = 0;

				// Update price dataset if this is the price panel
				if (panelType === "price" && showPrice) {
					const priceData: ChartPoint[] = validData.map((candle) => ({
						x: candle.timestamp,
						y: candle.close,
					}));

					if (chartInstance.current.data.datasets[datasetIndex]) {
						chartInstance.current.data.datasets[datasetIndex].data = priceData;
						datasetIndex++;
					}
				}

				// Update volume dataset if this is the volume panel
				if (panelType === "volume") {
					const volumeData: ChartPoint[] = validData.map((candle) => ({
						x: candle.timestamp,
						y: candle.volume,
					}));

					if (chartInstance.current.data.datasets[datasetIndex]) {
						chartInstance.current.data.datasets[datasetIndex].data = volumeData;
						datasetIndex++;
					}
				}

				// Update indicator datasets
				indicators.forEach((indicator) => {
					if (datasetIndex < chartInstance.current!.data.datasets.length) {
						// Ensure indicator data is in {x, y} format that Chart.js expects
						let formattedData: ChartPoint[] = [];

						// Check if this is already in {x, y} format
						if (indicator.data && indicator.data.length > 0) {
							if (
								typeof indicator.data[0] === "object" &&
								"x" in indicator.data[0] &&
								"y" in indicator.data[0]
							) {
								// Already in {x, y} format
								formattedData = indicator.data as ChartPoint[];
							} else if (
								typeof indicator.data[0] === "number" &&
								validData.length === indicator.data.length
							) {
								// Convert from number[] to {x, y}[] using timestamps from validData
								formattedData = (indicator.data as unknown as number[]).map(
									(value, i) => ({
										x: validData[i].timestamp,
										y: value,
									})
								);
							} else {
								// Can't determine format, use as is
								formattedData = indicator.data;
							}
						} else {
							formattedData = [];
						}

						// Only update the data, not the entire dataset
						chartInstance.current!.data.datasets[datasetIndex].data =
							formattedData;
						datasetIndex++;
					}
				});

				// Update chart with no animation for real-time updates
				chartInstance.current.update("none");

				// Track updates for performance monitoring
				updateCount.current++;
				logPerformance();
			} catch (error) {
				console.error("Chart.js update error in panel:", panelType, error);

				// If update fails, try to recreate the chart
				try {
					if (validData.length > 0) {
						createChart(validData);
					}
				} catch (recreateError) {
					console.error(
						"Failed to recreate chart after update error:",
						recreateError
					);
				}
			}
		};

		// Expose chartInstance and resetZoom method to parent component
		useImperativeHandle(
			ref,
			() => ({
				chartInstance,
				resetZoom: () => {
					try {
						if (chartInstance.current?.resetZoom) {
							chartInstance.current.resetZoom();
						}
					} catch (error) {
						console.error("Error resetting zoom:", error);
						// If reset fails, try to recreate the chart
						if (chartRef.current && data.length > 0) {
							const validData = data
								.filter(
									(c) =>
										c.timestamp > 0 &&
										!isNaN(c.open) &&
										!isNaN(c.high) &&
										!isNaN(c.low) &&
										!isNaN(c.close)
								)
								.sort((a, b) => a.timestamp - b.timestamp);

							if (validData.length > 0) {
								try {
									if (chartInstance.current) {
										chartInstance.current.destroy();
									}
									createChart(validData);
								} catch (recreateError) {
									console.error("Failed to recreate chart:", recreateError);
								}
							}
						}
					}
				},
			}),
			[chartInstance, data]
		);

		// Sync zoom state across panels
		useEffect(() => {
			if (chartInstance.current && zoomState && onZoomChange) {
				// Don't update if we're already at this zoom state to prevent loops
				const xScale = chartInstance.current.scales.x;
				if (
					xScale &&
					(xScale.min !== zoomState.min || xScale.max !== zoomState.max) &&
					zoomState.min !== undefined &&
					zoomState.max !== undefined
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
			const dataLengthChanged =
				previousDataLength.current !== currentDataLength;
			const now = Date.now();
			const shouldThrottle = now - lastUpdateTime.current < minUpdateInterval;

			// Track live price for price panel
			if (panelType === "price" && validData.length > 0) {
				const currentPrice = validData[validData.length - 1].close;
				const priceChanged = lastKnownPrice.current !== currentPrice;

				if (priceChanged) {
					previousPrice.current = lastKnownPrice.current;
					lastKnownPrice.current = currentPrice;
				}
			}

			// Create chart if it doesn't exist
			if (!chartInstance.current) {
				createChart(validData);
				previousDataLength.current = currentDataLength;
				lastUpdateTime.current = now;
				return;
			}

			// Check if we need to recreate the chart (indicator config changed)
			if (shouldRecreateChart()) {
				createChart(validData);
				previousDataLength.current = currentDataLength;
				lastUpdateTime.current = now;
				return;
			} // From here, we're just updating data, not recreating the chart
			if (!shouldThrottle) {
				// Update the chart data without recreating the chart
				updateChart(validData);
				previousDataLength.current = currentDataLength;
				lastUpdateTime.current = now;
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
	}
);

export default React.memo(ChartPanel);
