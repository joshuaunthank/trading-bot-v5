/**
 * Modern TradingView-Style Chart System
 * Built from scratch with Chart.js + chartjs-chart-financial
 *
 * Features:
 * - Live & historical candlestick data
 * - Multi-panel layout (price, volume, oscillators)
 * - Real-time updates with live candle transitions
 * - Zoom & pan with position retention
 * - Strategy indicator overlays & colors
 * - Shared time axis across panels
 * - Live price marker & signal annotations
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import Chart from "../utils/chartSetup";
import { OHLCVData, CalculatedIndicator } from "../types/indicators";

interface TradingChartProps {
	// Data
	ohlcvData: OHLCVData[];
	indicators: CalculatedIndicator[];

	// Configuration
	symbol: string;
	timeframe: string;
	height?: number;

	// State
	loading?: boolean;
	error?: string | null;

	// Event handlers
	onZoomChange?: (zoomState: any) => void;
	onSignalClick?: (signal: any) => void;
}

interface ChartPanel {
	id: string;
	type: "price" | "volume" | "oscillator";
	height: number;
	indicators: CalculatedIndicator[];
	showTimeAxis: boolean;
}

const TradingChart: React.FC<TradingChartProps> = ({
	ohlcvData,
	indicators,
	symbol,
	timeframe,
	height = 600,
	loading = false,
	error = null,
	onZoomChange,
	onSignalClick,
}) => {
	// Refs for chart instances
	const chartRefs = useRef<{ [key: string]: Chart | null }>({});
	const canvasRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});
	const chartIdCounter = useRef(0);

	// Chart state
	const [panels, setPanels] = useState<ChartPanel[]>([]);
	const [zoomState, setZoomState] = useState<any>(null);
	const [lastKnownPrice, setLastKnownPrice] = useState<number | null>(null);

	// Organize indicators into panels
	const organizePanels = useCallback((): ChartPanel[] => {
		console.log(
			"[TradingChart] Organizing panels with indicators:",
			indicators.length
		);

		const priceIndicators = indicators.filter((ind) => ind.yAxisID === "price");
		const volumeIndicators = indicators.filter(
			(ind) => ind.yAxisID === "volume"
		);
		const oscillatorIndicators = indicators.filter(
			(ind) => ind.yAxisID === "oscillator"
		);

		console.log("[TradingChart] Indicator breakdown:", {
			price: priceIndicators.length,
			volume: volumeIndicators.length,
			oscillator: oscillatorIndicators.length,
		});

		const panels: ChartPanel[] = [];

		// Main price panel (always present)
		panels.push({
			id: "price",
			type: "price",
			height: Math.floor(height * 0.7), // Increase to 70% when no other panels
			indicators: priceIndicators,
			showTimeAxis: true, // Default to showing time axis
		});

		// Additional panels only if we have indicators
		const remainingHeight = height - panels[0].height;
		const additionalPanels = [];

		if (volumeIndicators.length > 0) {
			additionalPanels.push({
				id: "volume",
				type: "volume" as const,
				indicators: volumeIndicators,
			});
		}

		if (oscillatorIndicators.length > 0) {
			additionalPanels.push({
				id: "oscillators",
				type: "oscillator" as const,
				indicators: oscillatorIndicators,
			});
		}

		// If we have additional panels, adjust heights
		if (additionalPanels.length > 0) {
			// Reduce main panel to 60%
			panels[0].height = Math.floor(height * 0.6);
			panels[0].showTimeAxis = false; // Don't show time on main panel

			const adjustedRemainingHeight = height - panels[0].height;
			const panelHeight = Math.floor(
				adjustedRemainingHeight / additionalPanels.length
			);

			additionalPanels.forEach((panel, index) => {
				panels.push({
					...panel,
					height: panelHeight,
					showTimeAxis: index === additionalPanels.length - 1, // Only last panel shows time
				});
			});
		}

		console.log(
			"[TradingChart] Final panels:",
			panels.map((p) => ({
				id: p.id,
				height: p.height,
				showTimeAxis: p.showTimeAxis,
			}))
		);
		return panels;
	}, [indicators, height]);

	// Update panels when indicators change
	useEffect(() => {
		setPanels(organizePanels());
	}, [organizePanels]);

	// Track last known price for live price marker and handle smooth updates
	useEffect(() => {
		console.log(
			"[TradingChart] OHLCV data updated:",
			ohlcvData.length,
			"candles"
		);
		if (ohlcvData.length > 0) {
			const currentPrice = ohlcvData[ohlcvData.length - 1].close;
			console.log("[TradingChart] Latest price:", currentPrice);
			setLastKnownPrice(currentPrice);

			// Update existing charts with new data instead of recreating them
			updateChartsData();
		}
	}, [ohlcvData]);

	// Function to update chart data without recreating charts
	const updateChartsData = useCallback(() => {
		if (ohlcvData.length === 0) return;

		Object.entries(chartRefs.current).forEach(([panelId, chart]) => {
			if (!chart) return;

			try {
				// Find panel using current panels state
				const currentPanels = organizePanels();
				const panel = currentPanels.find((p) => p.id === panelId);
				if (!panel) return;

				console.log(`[TradingChart] Updating data for panel: ${panelId}`);

				// Update OHLCV data for price panels
				if (panel.type === "price" && ohlcvData.length > 0) {
					const candlestickDataset = chart.data.datasets.find(
						(d: any) => d.type === "candlestick" || d.label?.includes("Price")
					);

					if (candlestickDataset) {
						candlestickDataset.data = ohlcvData.map((candle) => ({
							x: candle.timestamp,
							o: candle.open,
							h: candle.high,
							l: candle.low,
							c: candle.close,
						}));
					}
				}

				// Update indicator data
				panel.indicators.forEach((indicator) => {
					const dataset = chart.data.datasets.find(
						(d: any) => d.label === indicator.name
					);
					if (dataset && indicator.data) {
						// Filter out null values and ensure proper typing
						dataset.data = indicator.data
							.filter((point) => point.y !== null)
							.map((point) => ({
								x: point.x,
								y: point.y as number,
							}));
					}
				});

				// Smooth update without animation for live data
				chart.update("none");
			} catch (error) {
				console.error(
					`[TradingChart] Error updating chart data for panel ${panelId}:`,
					error
				);
			}
		});
	}, [ohlcvData, organizePanels]);

	// Debug indicators
	useEffect(() => {
		console.log("[TradingChart] Indicators updated:", indicators.length);
		indicators.forEach((ind) => {
			console.log(`[TradingChart] Indicator ${ind.name}:`, {
				type: ind.type,
				yAxisID: ind.yAxisID,
				dataPoints: ind.data.length,
				color: ind.color,
			});
		});
	}, [indicators]);

	// Create chart configuration for a panel
	const createChartConfig = useCallback(
		(panel: ChartPanel) => {
			console.log(`[TradingChart] Creating config for panel ${panel.id}:`, {
				type: panel.type,
				ohlcvLength: ohlcvData.length,
				indicatorsLength: panel.indicators.length,
			});

			const datasets: any[] = [];

			// Add price data for price panel
			if (panel.type === "price" && ohlcvData.length > 0) {
				console.log(`[TradingChart] Adding candlestick data for ${symbol}:`, {
					firstCandle: {
						timestamp: ohlcvData[0].timestamp,
						open: ohlcvData[0].open,
						high: ohlcvData[0].high,
						low: ohlcvData[0].low,
						close: ohlcvData[0].close,
					},
					lastCandle: {
						timestamp: ohlcvData[ohlcvData.length - 1].timestamp,
						close: ohlcvData[ohlcvData.length - 1].close,
					},
				});

				datasets.push({
					type: "candlestick",
					label: `${symbol} Price`,
					data: ohlcvData.map((candle) => ({
						x: candle.timestamp,
						o: candle.open,
						h: candle.high,
						l: candle.low,
						c: candle.close,
					})),
					borderColor: {
						up: "#26a69a",
						down: "#ef5350",
						unchanged: "#999999",
					},
					backgroundColor: {
						up: "rgba(38, 166, 154, 0.8)",
						down: "rgba(239, 83, 80, 0.8)",
						unchanged: "rgba(153, 153, 153, 0.8)",
					},
				});
			}

			// Add volume data for price panel (as ghost bars) or volume panel
			if (
				(panel.type === "price" || panel.type === "volume") &&
				ohlcvData.length > 0
			) {
				const isGhost = panel.type === "price";
				datasets.push({
					type: "bar",
					label: "Volume",
					data: ohlcvData.map((candle) => ({
						x: candle.timestamp,
						y: candle.volume,
					})),
					backgroundColor: isGhost
						? "rgba(255, 184, 0, 0.1)"
						: "rgba(255, 184, 0, 0.6)",
					borderColor: isGhost
						? "rgba(255, 184, 0, 0.3)"
						: "rgba(255, 184, 0, 0.8)",
					yAxisID: isGhost ? "volume" : "y",
					order: 10, // Render behind price data
				});
			}

			// Add indicator datasets
			panel.indicators.forEach((indicator) => {
				datasets.push({
					type: "line",
					label: indicator.name,
					data: indicator.data,
					borderColor: indicator.color,
					backgroundColor: "transparent",
					borderWidth: 2,
					pointRadius: 0,
					pointHoverRadius: 4,
					tension: 0.1,
					yAxisID: panel.type === "price" ? "y" : "y",
				});
			});

			// Create scales
			const scales: any = {};

			// Time axis (X)
			scales.x = {
				type: "time",
				time: {
					displayFormats: {
						minute: "HH:mm",
						hour: "MMM d, HH:mm",
						day: "MMM d",
						week: "MMM d",
						month: "MMM yyyy",
					},
				},
				display: panel.showTimeAxis,
				grid: {
					color: "rgba(255, 255, 255, 0.1)",
					drawBorder: false,
				},
				ticks: {
					color: "#ffffff",
					font: { size: 11 },
				},
			};

			// Y axis based on panel type
			switch (panel.type) {
				case "price":
					scales.y = {
						type: "linear",
						position: "right",
						grid: {
							color: "rgba(255, 255, 255, 0.1)",
							drawBorder: false,
						},
						ticks: {
							color: "#ffffff",
							font: { size: 11 },
						},
					};

					// Volume axis for ghost volume
					if (ohlcvData.length > 0) {
						const maxVolume = Math.max(...ohlcvData.map((d) => d.volume));
						scales.volume = {
							type: "linear",
							position: "left",
							display: false,
							max: maxVolume * 4, // Scale to 25% of chart height
							grid: { display: false },
						};
					}
					break;

				case "volume":
					scales.y = {
						type: "linear",
						position: "right",
						min: 0,
						grid: {
							color: "rgba(255, 255, 255, 0.1)",
							drawBorder: false,
						},
						ticks: {
							color: "#ffffff",
							font: { size: 11 },
						},
					};
					break;

				case "oscillator":
					// Check if RSI-type (0-100) or other oscillator
					const hasRSI = panel.indicators.some(
						(ind) =>
							ind.type === "RSI" || ind.name.toLowerCase().includes("rsi")
					);

					scales.y = {
						type: "linear",
						position: "right",
						min: hasRSI ? 0 : undefined,
						max: hasRSI ? 100 : undefined,
						grid: {
							color: "rgba(255, 255, 255, 0.1)",
							drawBorder: false,
						},
						ticks: {
							color: "#ffffff",
							font: { size: 11 },
						},
					};
					break;
			}

			return {
				type: "candlestick" as any, // Use candlestick as primary type when we have OHLCV data
				data: { datasets },
				options: {
					responsive: true,
					maintainAspectRatio: false,
					animation: { duration: 0 },
					interaction: {
						intersect: false,
						mode: "index",
					},
					scales,
					plugins: {
						legend: {
							display: true,
							position: "top",
							align: "start",
							labels: {
								color: "#ffffff",
								usePointStyle: true,
								padding: 8,
								font: { size: 11 },
								filter: (legendItem: any) => {
									// Hide volume from legend unless it's volume panel
									return (
										panel.type === "volume" ||
										!legendItem.text?.toLowerCase().includes("volume")
									);
								},
							},
						},
						tooltip: {
							backgroundColor: "rgba(0, 0, 0, 0.9)",
							titleColor: "#ffffff",
							bodyColor: "#ffffff",
							borderColor: "#333333",
							borderWidth: 1,
							callbacks: {
								title: (items: any[]) => {
									if (items.length > 0) {
										const timestamp = items[0].parsed.x;
										return new Date(timestamp).toLocaleString();
									}
									return "";
								},
							},
						},
						zoom: {
							zoom: {
								wheel: { enabled: true },
								pinch: { enabled: true },
								mode: "x",
								onZoom: ({ chart }: any) => {
									const newZoomState = {
										min: chart.scales.x.min,
										max: chart.scales.x.max,
									};
									setZoomState(newZoomState);
									onZoomChange?.(newZoomState);
								},
							},
							pan: {
								enabled: true,
								mode: "x",
								onPan: ({ chart }: any) => {
									const newZoomState = {
										min: chart.scales.x.min,
										max: chart.scales.x.max,
									};
									setZoomState(newZoomState);
									onZoomChange?.(newZoomState);
								},
							},
						},
					},
				},
			};
		},
		[ohlcvData, symbol, onZoomChange]
	);

	// Create/update charts - only recreate when necessary
	useEffect(() => {
		// Only recreate charts if panels have changed or if charts don't exist
		const needsRecreation =
			panels.some((panel) => !chartRefs.current[panel.id]) ||
			Object.keys(chartRefs.current).length !== panels.length;

		if (!needsRecreation && ohlcvData.length > 0) {
			console.log("[TradingChart] Charts exist, updating data only");
			updateChartsData();
			return;
		}

		if (loading || ohlcvData.length === 0) return;

		console.log(
			"[TradingChart] Creating charts for panels:",
			panels.map((p) => p.id)
		);

		// Cleanup existing charts first
		Object.entries(chartRefs.current).forEach(([panelId, chart]) => {
			if (chart) {
				console.log(
					`[TradingChart] Cleaning up existing chart for panel: ${panelId}`
				);
				try {
					chart.destroy();
				} catch (error) {
					console.warn(`Error destroying chart for panel ${panelId}:`, error);
				}
				chartRefs.current[panelId] = null;
			}
		});

		// Clear canvas contexts to prevent reuse errors
		Object.entries(canvasRefs.current).forEach(([panelId, canvas]) => {
			if (canvas) {
				const ctx = canvas.getContext("2d");
				if (ctx) {
					ctx.clearRect(0, 0, canvas.width, canvas.height);
				}
			}
		});

		// Create chart configuration for a panel with fallback support
		const createChartConfigSafe = (panel: ChartPanel) => {
			try {
				const config = createChartConfig(panel);
				// For price panels, verify candlestick support
				if (panel.type === "price" && ohlcvData.length > 0) {
					// Test if candlestick is truly available
					const hasCandlestickController =
						Chart.registry.getController("candlestick");
					const hasCandlestickElement =
						Chart.registry.getElement("candlestick");

					if (!hasCandlestickController || !hasCandlestickElement) {
						console.warn(
							"[TradingChart] Candlestick not fully registered, falling back to line chart"
						);
						// Convert to line chart fallback
						config.type = "line";
						config.data.datasets = config.data.datasets.map((dataset: any) => {
							if (dataset.type === "candlestick") {
								return {
									...dataset,
									type: "line",
									data: dataset.data.map((point: any) => ({
										x: point.x,
										y: point.c, // Use close price
									})),
									borderColor: "#26a69a",
									backgroundColor: "transparent",
									borderWidth: 2,
									pointRadius: 0,
								};
							}
							return dataset;
						});
					}
				}
				return config;
			} catch (error) {
				console.error(`Error creating config for panel ${panel.id}:`, error);
				throw error;
			}
		};

		// Small delay to ensure Canvas cleanup
		const timer = setTimeout(() => {
			panels.forEach((panel) => {
				const canvas = canvasRefs.current[panel.id];
				if (!canvas) {
					console.log(`[TradingChart] Canvas not found for panel: ${panel.id}`);
					return;
				}

				// Assign unique ID to canvas to prevent reuse errors
				const uniqueId = `chart-${
					panel.id
				}-${Date.now()}-${++chartIdCounter.current}`;
				canvas.id = uniqueId;

				const ctx = canvas.getContext("2d");
				if (!ctx) {
					console.log(
						`[TradingChart] Context not found for panel: ${panel.id}`
					);
					return;
				}

				try {
					console.log(
						`[TradingChart] Creating chart for panel: ${panel.id} with ID: ${uniqueId}`
					);
					const config = createChartConfigSafe(panel);
					chartRefs.current[panel.id] = new Chart(ctx, config);
					console.log(
						`[TradingChart] Successfully created chart for panel: ${panel.id}`
					);
				} catch (error) {
					console.error(`Error creating chart for panel ${panel.id}:`, error);
				}
			});
		}, 100); // Increased delay for better cleanup

		// Cleanup function
		return () => {
			console.log("[TradingChart] Effect cleanup");
			clearTimeout(timer);
			Object.entries(chartRefs.current).forEach(([panelId, chart]) => {
				if (chart) {
					console.log(`[TradingChart] Destroying chart for panel: ${panelId}`);
					try {
						chart.destroy();
					} catch (error) {
						console.warn(`Cleanup error for panel ${panelId}:`, error);
					}
					chartRefs.current[panelId] = null;
				}
			});
		};
	}, [panels, createChartConfig, loading]); // Removed updateChartsData to prevent unnecessary recreations

	// Sync zoom across all charts
	useEffect(() => {
		if (!zoomState) return;

		Object.entries(chartRefs.current).forEach(([panelId, chart]) => {
			if (chart && chart.scales.x) {
				const xScale = chart.scales.x;
				if (xScale.min !== zoomState.min || xScale.max !== zoomState.max) {
					xScale.options.min = zoomState.min;
					xScale.options.max = zoomState.max;
					chart.update("none");
				}
			}
		});
	}, [zoomState]);

	// Reset zoom function
	const resetZoom = useCallback(() => {
		Object.values(chartRefs.current).forEach((chart) => {
			chart?.resetZoom();
		});
		setZoomState(null);
	}, []);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			console.log("[TradingChart] Component unmounting - final cleanup");
			Object.entries(chartRefs.current).forEach(([panelId, chart]) => {
				if (chart) {
					console.log(`[TradingChart] Final cleanup for panel: ${panelId}`);
					try {
						chart.destroy();
					} catch (error) {
						console.warn(`Final cleanup error for panel ${panelId}:`, error);
					}
				}
			});
			chartRefs.current = {};
			canvasRefs.current = {};
		};
	}, []);

	if (loading) {
		return (
			<div
				className="flex items-center justify-center bg-gray-800 rounded-lg"
				style={{ height: `${height}px` }}
			>
				<div className="text-white">Loading chart...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div
				className="flex items-center justify-center bg-red-900/50 border border-red-700 rounded-lg"
				style={{ height: `${height}px` }}
			>
				<div className="text-red-200">Error: {error}</div>
			</div>
		);
	}

	if (ohlcvData.length === 0) {
		return (
			<div
				className="flex items-center justify-center bg-gray-800 rounded-lg"
				style={{ height: `${height}px` }}
			>
				<div className="text-gray-400">No data available</div>
			</div>
		);
	}

	return (
		<div className="bg-gray-800 rounded-lg overflow-hidden">
			{/* Chart Header */}
			<div className="flex justify-between items-center p-4 border-b border-gray-700">
				<div className="text-white font-semibold">
					{symbol} • {timeframe}
					{lastKnownPrice && (
						<span className="ml-4 text-green-400">
							${lastKnownPrice.toFixed(4)}
						</span>
					)}
				</div>

				<div className="flex space-x-2">
					<button
						onClick={resetZoom}
						className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded"
					>
						Reset Zoom
					</button>
				</div>
			</div>

			{/* Chart Panels */}
			<div className="relative">
				{panels.map((panel, index) => (
					<div
						key={panel.id}
						style={{ height: `${panel.height}px` }}
						className={`relative ${
							index > 0 ? "border-t border-gray-700" : ""
						}`}
					>
						<canvas
							ref={(el) => {
								canvasRefs.current[panel.id] = el;
							}}
							className="w-full h-full"
						/>
					</div>
				))}
			</div>
		</div>
	);
};

export default TradingChart;
