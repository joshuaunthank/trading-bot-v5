/**
 * TradingView-Style Chart Component
 *
 * Built with D3.js for professional trading visualization
 *
 * Features:
 * - Candlestick charts with proper OHLC rendering
 * - Multi-panel layout (price, volume, oscillators)
 * - Grid lines and professional styling
 * - Right-side price scale
 * - Volume bars in dedicated panel
 * - Indicator overlays with proper panel separation
 * - Zoom and pan functionality
 * - Real-time updates
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";
import { OHLCVData, CalculatedIndicator } from "../types/indicators";
import { IndicatorRenderer } from "../utils/indicatorRenderer";

interface TradingViewChartProps {
	ohlcvData: OHLCVData[];
	indicators: CalculatedIndicator[];
	symbol: string;
	timeframe: string;
	height?: number;
	loading?: boolean;
	error?: string | null;
}

interface ChartPanel {
	id: string;
	type: "price" | "volume" | "oscillator";
	height: number;
	y: number;
	indicators: CalculatedIndicator[];
	showTimeAxis: boolean;
}

// Chart styling constants
const margin = { top: 20, right: 60, bottom: 40, left: 10 };
const backgroundColor = "#1a1a1a";
const gridColor = "#333";
const textColor = "#ccc";

const TradingViewChart: React.FC<TradingViewChartProps> = ({
	ohlcvData,
	indicators,
	symbol,
	timeframe,
	height = 600,
	loading = false,
	error = null,
}) => {
	const svgRef = useRef<SVGSVGElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [dimensions, setDimensions] = useState({ width: 0, height });
	const [panels, setPanels] = useState<ChartPanel[]>([]);
	const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform>(
		d3.zoomIdentity
	);

	// Debug logging
	useEffect(() => {
		console.log("[TradingViewChart] Data received:", {
			ohlcvCount: ohlcvData.length,
			indicatorCount: indicators.length,
			firstCandle: ohlcvData[0],
			firstIndicator: indicators[0],
			dimensions,
		});
	}, [ohlcvData, indicators, dimensions]);

	// Organize panels based on indicator types
	const organizePanels = useCallback((): ChartPanel[] => {
		const priceIndicators = indicators.filter((ind) =>
			["SMA", "EMA", "BOLLINGER"].some((type) => ind.name.includes(type))
		);

		const volumeIndicators = indicators.filter((ind) =>
			ind.name.includes("VOLUME")
		);

		const oscillatorIndicators = indicators.filter(
			(ind) => !priceIndicators.includes(ind) && !volumeIndicators.includes(ind)
		);

		const panelList: ChartPanel[] = [];
		let currentY = 0;

		// Price panel (always present, 70% of height)
		const priceHeight = Math.floor(height * 0.7);
		panelList.push({
			id: "price",
			type: "price",
			height: priceHeight,
			y: currentY,
			indicators: priceIndicators,
			showTimeAxis: false,
		});
		currentY += priceHeight;

		// Volume panel (15% of height if we have volume data)
		if (ohlcvData.some((d) => d.volume > 0) || volumeIndicators.length > 0) {
			const volumeHeight = Math.floor(height * 0.15);
			panelList.push({
				id: "volume",
				type: "volume",
				height: volumeHeight,
				y: currentY,
				indicators: volumeIndicators,
				showTimeAxis: false,
			});
			currentY += volumeHeight;
		}

		// Oscillator panel (remaining height)
		if (oscillatorIndicators.length > 0) {
			const oscillatorHeight = height - currentY;
			panelList.push({
				id: "oscillator",
				type: "oscillator",
				height: oscillatorHeight,
				y: currentY,
				indicators: oscillatorIndicators,
				showTimeAxis: true,
			});
		} else {
			// If no oscillators, make the last panel show time axis
			if (panelList.length > 0) {
				panelList[panelList.length - 1].showTimeAxis = true;
			}
		}

		console.log("[TradingViewChart] Organized panels:", panelList);
		return panelList;
	}, [indicators, ohlcvData, height]);

	// Update container dimensions
	useEffect(() => {
		const updateDimensions = () => {
			if (containerRef.current) {
				const width = containerRef.current.clientWidth;
				console.log("[TradingViewChart] Container dimensions updated:", {
					width,
					height,
				});
				setDimensions({ width, height });
			}
		};

		updateDimensions();
		window.addEventListener("resize", updateDimensions);
		return () => window.removeEventListener("resize", updateDimensions);
	}, [height]);

	// Update panels when indicators change
	useEffect(() => {
		setPanels(organizePanels());
	}, [organizePanels]);

	// Main chart rendering function
	const renderChart = useCallback(() => {
		console.log("[TradingViewChart] renderChart called", {
			svgRef: !!svgRef.current,
			ohlcvLength: ohlcvData.length,
			dimensionsWidth: dimensions.width,
			panelsLength: panels.length,
		});

		if (!svgRef.current || !ohlcvData.length || !dimensions.width) {
			console.warn(
				"[TradingViewChart] Skipping render due to missing requirements"
			);
			return;
		}

		const svg = d3.select(svgRef.current);
		svg.selectAll("*").remove();

		const innerWidth = dimensions.width - margin.left - margin.right;

		console.log(
			"[TradingViewChart] Starting render with innerWidth:",
			innerWidth
		);

		// Create time scale (shared across all panels)
		const timeExtent = d3.extent(ohlcvData, (d) => new Date(d.timestamp)) as [
			Date,
			Date
		];
		const xScale = d3.scaleTime().domain(timeExtent).range([0, innerWidth]);

		// Apply zoom transform to X scale
		const zoomedXScale = zoomTransform.rescaleX(xScale);

		// Render each panel
		panels.forEach((panel) => {
			console.log("[TradingViewChart] Rendering panel:", panel.id, panel.type);

			const panelGroup = svg
				.append("g")
				.attr("class", `panel-${panel.id}`)
				.attr(
					"transform",
					`translate(${margin.left}, ${panel.y + margin.top})`
				);

			const panelHeight = panel.height - margin.top - margin.bottom;

			// Create Y scale based on panel type
			let yScale: d3.ScaleLinear<number, number>;

			if (panel.type === "price") {
				// Price scale based on OHLC data
				const priceExtent = d3.extent(
					ohlcvData.flatMap((d) => [d.high, d.low])
				) as [number, number];
				yScale = d3
					.scaleLinear()
					.domain(priceExtent)
					.range([panelHeight, 0])
					.nice();
			} else if (panel.type === "volume") {
				// Volume scale
				const volumeExtent = [0, d3.max(ohlcvData, (d) => d.volume) || 1] as [
					number,
					number
				];
				yScale = d3.scaleLinear().domain(volumeExtent).range([panelHeight, 0]);
			} else {
				// Oscillator scale (typically 0-100 or -1 to 1)
				const indicatorValues = panel.indicators.flatMap((ind) =>
					ind.data.filter((d) => d.y !== null).map((d) => d.y as number)
				);
				const oscillatorExtent =
					indicatorValues.length > 0
						? (d3.extent(indicatorValues) as [number, number])
						: [0, 100];
				yScale = d3
					.scaleLinear()
					.domain(oscillatorExtent)
					.range([panelHeight, 0])
					.nice();
			}

			// Add background
			panelGroup
				.append("rect")
				.attr("width", innerWidth)
				.attr("height", panelHeight)
				.attr("fill", backgroundColor)
				.attr("stroke", gridColor)
				.attr("stroke-width", 1);

			// Add grid lines
			const xAxis = d3
				.axisBottom(zoomedXScale)
				.tickSize(-panelHeight)
				.tickFormat(() => "");
			const yAxis = d3
				.axisRight(yScale)
				.tickSize(innerWidth)
				.tickFormat(() => "");

			panelGroup
				.append("g")
				.attr("class", "grid")
				.call(yAxis)
				.selectAll("line")
				.attr("stroke", gridColor)
				.attr("stroke-width", 0.5)
				.attr("opacity", 0.3);

			panelGroup
				.append("g")
				.attr("class", "grid")
				.attr("transform", `translate(0, ${panelHeight})`)
				.call(xAxis)
				.selectAll("line")
				.attr("stroke", gridColor)
				.attr("stroke-width", 0.5)
				.attr("opacity", 0.3);

			// Render content based on panel type
			if (panel.type === "price") {
				renderCandlesticks(
					panelGroup,
					zoomedXScale,
					yScale,
					innerWidth,
					panelHeight
				);
			} else if (panel.type === "volume") {
				renderVolumeBars(
					panelGroup,
					zoomedXScale,
					yScale,
					innerWidth,
					panelHeight
				);
			}

			// Render indicators for this panel
			if (panel.indicators.length > 0) {
				const indicatorRenderer = new IndicatorRenderer(
					panelGroup,
					zoomedXScale,
					yScale
				);
				indicatorRenderer.renderIndicators(panel.indicators);
			}

			// Add time axis only for bottom panel
			if (panel.showTimeAxis) {
				const timeAxis = d3
					.axisBottom(zoomedXScale)
					.tickFormat((d) => d3.timeFormat("%H:%M")(d as Date));

				panelGroup
					.append("g")
					.attr("class", "time-axis")
					.attr("transform", `translate(0, ${panelHeight})`)
					.call(timeAxis as any)
					.selectAll("text")
					.attr("fill", textColor);
			}

			// Add right-side price scale
			const priceAxis = d3
				.axisRight(yScale)
				.tickFormat((d) => d3.format(".4f")(d as number));

			panelGroup
				.append("g")
				.attr("class", "price-axis")
				.attr("transform", `translate(${innerWidth}, 0)`)
				.call(priceAxis as any)
				.selectAll("text")
				.attr("fill", textColor);

			// Panel label
			panelGroup
				.append("text")
				.attr("x", 10)
				.attr("y", 20)
				.attr("fill", textColor)
				.attr("font-size", "12px")
				.attr("font-weight", "bold")
				.text(panel.type.toUpperCase());
		});

		// Setup zoom behavior
		const zoom = d3
			.zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.5, 20])
			.on("zoom", (event) => {
				const newTransform = event.transform;
				setZoomTransform(newTransform);
			});

		svg.call(zoom);

		console.log("[TradingViewChart] Chart render complete");
	}, [ohlcvData, panels, dimensions, zoomTransform]);

	// Candlestick rendering function
	const renderCandlesticks = (
		group: d3.Selection<SVGGElement, unknown, null, undefined>,
		xScale: d3.ScaleTime<number, number>,
		yScale: d3.ScaleLinear<number, number>,
		width: number,
		height: number
	) => {
		console.log("[TradingViewChart] renderCandlesticks called", {
			dataLength: ohlcvData.length,
			width,
			height,
			firstCandle: ohlcvData[0],
		});

		const candleWidth = Math.max(1, (width / ohlcvData.length) * 0.8);

		// Add candlesticks
		const candles = group
			.selectAll(".candle")
			.data(ohlcvData)
			.enter()
			.append("g")
			.attr("class", "candle");

		console.log("[TradingViewChart] Created", candles.size(), "candle groups");

		// High-low lines
		candles
			.append("line")
			.attr("x1", (d) => xScale(new Date(d.timestamp)))
			.attr("x2", (d) => xScale(new Date(d.timestamp)))
			.attr("y1", (d) => yScale(d.high))
			.attr("y2", (d) => yScale(d.low))
			.attr("stroke", (d) => (d.close >= d.open ? "#26a69a" : "#ef5350"))
			.attr("stroke-width", 1);

		// Open-close rectangles
		candles
			.append("rect")
			.attr("x", (d) => xScale(new Date(d.timestamp)) - candleWidth / 2)
			.attr("y", (d) => yScale(Math.max(d.open, d.close)))
			.attr("width", candleWidth)
			.attr("height", (d) => Math.abs(yScale(d.open) - yScale(d.close)) || 1)
			.attr("fill", (d) => (d.close >= d.open ? "#26a69a" : "#ef5350"))
			.attr("stroke", (d) => (d.close >= d.open ? "#26a69a" : "#ef5350"))
			.attr("stroke-width", 1);

		console.log("[TradingViewChart] Candlesticks rendered");
	};

	// Render volume bars
	const renderVolumeBars = (
		group: d3.Selection<SVGGElement, unknown, null, undefined>,
		xScale: d3.ScaleTime<number, number>,
		yScale: d3.ScaleLinear<number, number>,
		width: number,
		height: number
	) => {
		const barWidth = Math.max(1, (width / ohlcvData.length) * 0.6);

		const bars = group
			.selectAll(".volume-bar")
			.data(ohlcvData)
			.enter()
			.append("rect")
			.attr("class", "volume-bar")
			.attr("x", (d) => xScale(new Date(d.timestamp)) - barWidth / 2)
			.attr("y", (d) => yScale(d.volume))
			.attr("width", barWidth)
			.attr("height", (d) => height - yScale(d.volume))
			.attr("fill", (d) => (d.close >= d.open ? "#26a69a44" : "#ef535044"))
			.attr("stroke", (d) => (d.close >= d.open ? "#26a69a" : "#ef5350"))
			.attr("stroke-width", 0.5);
	};

	// Render chart when data or dimensions change
	useEffect(() => {
		renderChart();
	}, [renderChart]);

	// Show loading state
	if (loading) {
		return (
			<div
				className="bg-gray-900 rounded-lg p-8 text-center"
				style={{ height: `${height}px` }}
			>
				<div className="text-white">Loading chart...</div>
			</div>
		);
	}

	// Show error state
	if (error) {
		return (
			<div
				className="bg-gray-900 rounded-lg p-8 text-center"
				style={{ height: `${height}px` }}
			>
				<div className="text-red-400">Error: {error}</div>
			</div>
		);
	}

	return (
		<div className="bg-gray-900 rounded-lg overflow-hidden">
			{/* Chart Header */}
			<div className="flex justify-between items-center p-4 border-b border-gray-700">
				<div className="text-white font-semibold">
					{symbol} • {timeframe}
					{ohlcvData.length > 0 && (
						<span className="ml-4 text-green-400">
							${ohlcvData[ohlcvData.length - 1].close.toFixed(4)}
						</span>
					)}
				</div>
				<div className="flex items-center space-x-4">
					<button
						onClick={() => setZoomTransform(d3.zoomIdentity)}
						className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
					>
						Reset Zoom
					</button>
					<div className="text-sm text-gray-400">
						{panels.length} panel{panels.length !== 1 ? "s" : ""} •{" "}
						{indicators.length} indicators
					</div>
				</div>
			</div>

			{/* Chart Container */}
			<div ref={containerRef} style={{ height: `${height}px` }}>
				<svg
					ref={svgRef}
					width="100%"
					height={height}
					style={{ display: "block" }}
				/>
			</div>
		</div>
	);
};

export default TradingViewChart;
