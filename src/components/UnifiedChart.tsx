import React, { useEffect, useRef, useState, useMemo } from "react";
import {
	Chart,
	registerables,
	ChartConfiguration,
	ChartDataset,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import annotationPlugin from "chartjs-plugin-annotation";
import {
	CandlestickController,
	CandlestickElement,
} from "chartjs-chart-financial";
import "chartjs-adapter-date-fns";
import { CalculatedIndicator, OHLCVData } from "../types/indicators";
import {
	createChartConfiguration,
	calculatePanelHeights,
	ChartConfig,
	SignalAnnotation,
} from "../utils/chartConfig";

// Register Chart.js components and plugins
Chart.register(
	...registerables,
	zoomPlugin,
	annotationPlugin,
	CandlestickController,
	CandlestickElement
);

interface UnifiedChartProps {
	data: OHLCVData[];
	symbol: string;
	timeframe: string;
	loading?: boolean;
	indicators?: CalculatedIndicator[];
	height?: number;
	onTimeframeChange?: (timeframe: string) => void;
	signals?: SignalAnnotation[];
}

const UnifiedChart: React.FC<UnifiedChartProps> = ({
	data,
	symbol,
	timeframe,
	loading = false,
	indicators = [],
	height = 600,
	onTimeframeChange,
	signals = [],
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const chartRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
	const chartInstances = useRef<Map<string, Chart>>(new Map());
	const [sharedZoom, setSharedZoom] = useState<any>(null);

	// Categorize indicators into panels
	const panelConfigs = useMemo((): ChartConfig[] => {
		const configs: ChartConfig[] = [];

		console.log("UnifiedChart - OHLCV data points:", data.length);
		if (data.length > 0) {
			console.log("UnifiedChart - Sample OHLCV data:", {
				first: data[0],
				last: data[data.length - 1],
			});
		}

		console.log("UnifiedChart - Total indicators received:", indicators.length);
		console.log(
			"UnifiedChart - Indicators:",
			indicators.map((ind) => ({
				id: ind.id,
				name: ind.name,
				type: ind.type,
				dataLength: ind.data.length,
			}))
		);

		// Always have a price panel
		const priceIndicators = indicators.filter(
			(ind) =>
				ind.type.includes("ema") ||
				ind.type.includes("sma") ||
				ind.type.includes("bb_")
		);
		console.log("UnifiedChart - Price indicators:", priceIndicators.length);

		// Oscillator indicators
		const oscillatorIndicators = indicators.filter(
			(ind) =>
				ind.type.includes("rsi") ||
				ind.type.includes("macd") ||
				ind.type.includes("stoch") ||
				ind.type.includes("atr") ||
				ind.type.includes("adx")
		);
		console.log(
			"UnifiedChart - Oscillator indicators:",
			oscillatorIndicators.length
		);

		// Volume indicators
		const volumeIndicators = indicators.filter(
			(ind) => ind.type.includes("volume") || ind.type.includes("obv")
		);
		console.log("UnifiedChart - Volume indicators:", volumeIndicators.length);

		// Calculate panel heights
		const heights = calculatePanelHeights(
			height,
			oscillatorIndicators.length > 0,
			volumeIndicators.length > 0 || data.some((d) => d.volume > 0)
		);
		console.log("UnifiedChart - Panel heights:", heights);

		// Price panel (always present)
		configs.push({
			type: "price",
			height: heights.price,
			indicators: priceIndicators,
			showPrice: true,
			showVolume: false,
		});

		// Oscillator panel (if needed)
		if (oscillatorIndicators.length > 0) {
			configs.push({
				type: "oscillator",
				height: heights.oscillator,
				indicators: oscillatorIndicators,
				showPrice: false,
				showVolume: false,
			});
		}

		// Volume panel (if needed)
		if (volumeIndicators.length > 0 || data.some((d) => d.volume > 0)) {
			configs.push({
				type: "volume",
				height: heights.volume,
				indicators: volumeIndicators,
				showPrice: false,
				showVolume: true,
			});
		}

		return configs;
	}, [indicators, height, data]);

	// Initialize charts
	useEffect(() => {
		if (loading || !data.length) return;

		panelConfigs.forEach((config, index) => {
			const panelId = `${config.type}_${index}`;
			const canvas = chartRefs.current.get(panelId);
			if (!canvas) return;

			// Destroy existing chart
			const existingChart = chartInstances.current.get(panelId);
			if (existingChart) {
				existingChart.destroy();
			}

			// Create new chart
			const chartConfig = createChartConfiguration(
				data,
				config,
				symbol,
				config.type === "price" ? signals : []
			);

			// Add zoom handlers
			if (chartConfig.options?.plugins?.zoom) {
				const zoomConfig = chartConfig.options.plugins.zoom;
				if (zoomConfig.pan && typeof zoomConfig.pan === "object") {
					zoomConfig.pan.onPanComplete = (ctx: any) => {
						const newZoom = {
							min: ctx.chart.scales.x.min,
							max: ctx.chart.scales.x.max,
						};
						setSharedZoom(newZoom);
					};
				}
				if (zoomConfig.zoom && typeof zoomConfig.zoom === "object") {
					zoomConfig.zoom.onZoomComplete = (ctx: any) => {
						const newZoom = {
							min: ctx.chart.scales.x.min,
							max: ctx.chart.scales.x.max,
						};
						setSharedZoom(newZoom);
					};
				}
			}

			const chart = new Chart(canvas, chartConfig);
			chartInstances.current.set(panelId, chart);
		});

		return () => {
			// Cleanup on unmount
			chartInstances.current.forEach((chart) => chart.destroy());
			chartInstances.current.clear();
		};
	}, [data, indicators, signals, panelConfigs, loading, symbol]);

	// Sync zoom across panels
	useEffect(() => {
		if (!sharedZoom) return;

		chartInstances.current.forEach((chart) => {
			if (chart.scales.x) {
				chart.scales.x.options.min = sharedZoom.min;
				chart.scales.x.options.max = sharedZoom.max;
				chart.update("none");
			}
		});
	}, [sharedZoom]);

	// Reset zoom function
	const resetZoom = () => {
		chartInstances.current.forEach((chart) => {
			if (chart.resetZoom) {
				chart.resetZoom();
			}
		});
		setSharedZoom(null);
	};

	if (loading) {
		return (
			<div
				className="flex items-center justify-center bg-gray-900 rounded-lg"
				style={{ height }}
			>
				<div className="text-white">Loading chart...</div>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className="w-full bg-gray-900 rounded-lg overflow-hidden"
		>
			{/* Chart Controls */}
			<div className="p-3 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
				<div className="flex items-center space-x-4">
					<h3 className="text-white font-semibold">
						{symbol} - {timeframe}
					</h3>
					{indicators.length > 0 && (
						<div className="text-sm text-gray-400">
							{indicators.length} indicator{indicators.length !== 1 ? "s" : ""}
						</div>
					)}
				</div>
				<div className="flex items-center space-x-2">
					{/* Timeframe selector */}
					<select
						value={timeframe}
						onChange={(e) => onTimeframeChange?.(e.target.value)}
						className="bg-gray-700 text-white px-3 py-1 rounded text-sm border border-gray-600"
					>
						{["1m", "5m", "15m", "1h", "4h", "1d"].map((tf) => (
							<option key={tf} value={tf}>
								{tf}
							</option>
						))}
					</select>
					<button
						onClick={resetZoom}
						className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
					>
						Reset Zoom
					</button>
				</div>
			</div>

			{/* Chart Panels */}
			<div className="relative">
				{panelConfigs.map((config, index) => {
					const panelId = `${config.type}_${index}`;
					return (
						<div
							key={panelId}
							className={`relative ${
								index > 0 ? "border-t border-gray-700" : ""
							}`}
							style={{ height: config.height }}
						>
							{/* Panel label */}
							<div className="absolute top-2 left-2 z-10 bg-gray-800 px-2 py-1 rounded text-xs text-gray-300 capitalize">
								{config.type} Panel
								{config.indicators.length > 0 && (
									<span className="ml-1">({config.indicators.length})</span>
								)}
							</div>

							<canvas
								ref={(canvas) => {
									if (canvas) {
										chartRefs.current.set(panelId, canvas);
									}
								}}
								className="w-full h-full"
							/>
						</div>
					);
				})}
			</div>

			{/* Chart Status */}
			<div className="p-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-400">
				Last updated:{" "}
				{data.length > 0
					? new Date(data[data.length - 1].timestamp).toLocaleTimeString()
					: "No data"}
				{signals.length > 0 && (
					<span className="ml-4">
						{signals.length} trading signal{signals.length !== 1 ? "s" : ""}
					</span>
				)}
			</div>
		</div>
	);
};

export default UnifiedChart;
