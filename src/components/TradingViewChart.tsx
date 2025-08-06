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

// Chart styling constants - Optimized for better readability and spacing
const margin = { top: 5, right: 70, bottom: 25, left: 15 };
const panelGap = 2; // Minimal gap between panels
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

		// Price panel (always present, 75% of height for better readability)
		const priceHeight = Math.floor(height * 0.75);
		panelList.push({
			id: "price",
			type: "price",
			height: priceHeight,
			y: currentY,
			indicators: priceIndicators,
			showTimeAxis: false,
		});
		currentY += priceHeight + panelGap;

		// Volume panel (12% of height if we have volume data)
		if (ohlcvData.some((d) => d.volume > 0) || volumeIndicators.length > 0) {
			const volumeHeight = Math.floor(height * 0.12);
			panelList.push({
				id: "volume",
				type: "volume",
				height: volumeHeight,
				y: currentY,
				indicators: volumeIndicators,
				showTimeAxis: false,
			});
			currentY += volumeHeight + panelGap;
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

		return panelList;
	}, [indicators, ohlcvData, height]);

	// Update container dimensions
	useEffect(() => {
		const updateDimensions = () => {
			if (containerRef.current) {
				const width = containerRef.current.clientWidth;
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
		if (!svgRef.current || !ohlcvData.length || !dimensions.width) {
			return;
		}

		const svg = d3.select(svgRef.current);
		svg.selectAll("*").remove();

		const innerWidth = dimensions.width - margin.left - margin.right;

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
				// Dynamic price scale based on visible data for better chart utilization
				const visibleTimeRange = zoomedXScale.domain();
				const visibleData = ohlcvData.filter((d) => {
					const timestamp = new Date(d.timestamp);
					return (
						timestamp >= visibleTimeRange[0] && timestamp <= visibleTimeRange[1]
					);
				});

				// Use visible data if available, otherwise fall back to all data
				const dataForScale = visibleData.length > 0 ? visibleData : ohlcvData;
				const priceExtent = d3.extent(
					dataForScale.flatMap((d) => [d.high, d.low])
				) as [number, number];

				// Add padding to the price range (5% on each side)
				const priceRange = priceExtent[1] - priceExtent[0];
				const padding = priceRange * 0.05;
				const paddedExtent: [number, number] = [
					priceExtent[0] - padding,
					priceExtent[1] + padding,
				];

				yScale = d3.scaleLinear().domain(paddedExtent).range([panelHeight, 0]);
			} else if (panel.type === "volume") {
				// Dynamic volume scale based on visible data
				const visibleTimeRange = zoomedXScale.domain();
				const visibleData = ohlcvData.filter((d) => {
					const timestamp = new Date(d.timestamp);
					return (
						timestamp >= visibleTimeRange[0] && timestamp <= visibleTimeRange[1]
					);
				});

				const dataForScale = visibleData.length > 0 ? visibleData : ohlcvData;
				const maxVolume = d3.max(dataForScale, (d) => d.volume) || 1;
				const volumeExtent = [0, maxVolume * 1.05] as [number, number]; // 5% padding on top

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

			// Add background with border
			panelGroup
				.append("rect")
				.attr("width", innerWidth)
				.attr("height", panelHeight)
				.attr("fill", backgroundColor)
				.attr("stroke", gridColor)
				.attr("stroke-width", 1);

			// Create clipping path to prevent content from going outside panel bounds
			const clipId = `clip-${panel.id}-${Date.now()}`;
			panelGroup
				.append("defs")
				.append("clipPath")
				.attr("id", clipId)
				.append("rect")
				.attr("width", innerWidth)
				.attr("height", panelHeight);

			// Create content group with clipping
			const contentGroup = panelGroup
				.append("g")
				.attr("clip-path", `url(#${clipId})`);

			// Add grid lines
			const xAxis = d3
				.axisBottom(zoomedXScale)
				.tickSize(-panelHeight)
				.tickFormat(() => "");
			const yAxis = d3
				.axisRight(yScale)
				.tickSize(innerWidth)
				.tickFormat(() => "");

			contentGroup
				.append("g")
				.attr("class", "grid")
				.call(yAxis)
				.selectAll("line")
				.attr("stroke", gridColor)
				.attr("stroke-width", 0.5)
				.attr("opacity", 0.3);

			contentGroup
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
					contentGroup,
					zoomedXScale,
					yScale,
					innerWidth,
					panelHeight
				);
			} else if (panel.type === "volume") {
				renderVolumeBars(
					contentGroup,
					zoomedXScale,
					yScale,
					innerWidth,
					panelHeight
				);
			}

			// Render indicators for this panel
			if (panel.indicators.length > 0) {
				const indicatorRenderer = new IndicatorRenderer(
					contentGroup,
					zoomedXScale,
					yScale
				);
				indicatorRenderer.renderIndicators(panel.indicators);
			}

			// Add time axis only for bottom panel with better formatting
			if (panel.showTimeAxis) {
				const timeAxis = d3
					.axisBottom(zoomedXScale)
					.ticks(Math.max(4, Math.min(12, innerWidth / 100))) // Adaptive tick count
					.tickFormat((d) => d3.timeFormat("%m/%d %H:%M")(d as Date));

				panelGroup
					.append("g")
					.attr("class", "time-axis")
					.attr("transform", `translate(0, ${panelHeight})`)
					.call(timeAxis as any)
					.selectAll("text")
					.attr("fill", textColor)
					.attr("font-size", "11px")
					.style("text-anchor", "middle");
			}

			// Add right-side price scale with better formatting
			const priceAxis = d3
				.axisRight(yScale)
				.ticks(Math.max(3, Math.min(8, panelHeight / 40))) // Adaptive tick count
				.tickFormat((d) => {
					const value = d as number;
					if (panel.type === "volume") {
						return d3.format(".2s")(value); // Scientific notation for volume
					} else if (value > 1000) {
						return d3.format(".2s")(value); // K, M notation for large numbers
					} else {
						return d3.format(".2f")(value); // 2 decimal places for smaller numbers
					}
				});

			panelGroup
				.append("g")
				.attr("class", "price-axis")
				.attr("transform", `translate(${innerWidth}, 0)`)
				.call(priceAxis as any)
				.selectAll("text")
				.attr("fill", textColor)
				.attr("font-size", "10px")
				.style("text-anchor", "start")
				.attr("dx", "0.3em");

			// Panel label with better positioning
			panelGroup
				.append("text")
				.attr("x", 8)
				.attr("y", 15)
				.attr("fill", textColor)
				.attr("font-size", "10px")
				.attr("font-weight", "bold")
				.attr("opacity", 0.8)
				.text(panel.type.toUpperCase());
		});

		// Setup natural zoom behavior with minimal constraints
		const zoom = d3
			.zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.1, 200]) // Wide zoom range for detailed analysis
			.on("zoom", (event) => {
				const newTransform = event.transform;

				// Simply lock vertical translation but allow complete horizontal freedom
				const naturalTransform = d3.zoomIdentity
					.translate(newTransform.x, 0) // Lock Y to 0, allow any X
					.scale(newTransform.k);

				setZoomTransform(naturalTransform);
			});
		svg.call(zoom);
	}, [ohlcvData, panels, dimensions, zoomTransform]);

	// Candlestick rendering function
	const renderCandlesticks = (
		group: d3.Selection<SVGGElement, unknown, null, undefined>,
		xScale: d3.ScaleTime<number, number>,
		yScale: d3.ScaleLinear<number, number>,
		width: number,
		height: number
	) => {
		// Calculate adaptive candle width based on zoom level and data density
		const zoomLevel = d3.zoomTransform(group.node() || document.body).k;
		const adaptiveWidth = Math.max(
			0.5,
			Math.min(20, (width / ohlcvData.length) * 0.8 * zoomLevel)
		);
		const candleWidth = Math.max(1, adaptiveWidth);

		// Filter data to only visible candles for better performance
		const visibleData = ohlcvData.filter((d) => {
			const x = xScale(new Date(d.timestamp));
			return x >= -candleWidth && x <= width + candleWidth;
		});

		// Add candlesticks
		const candles = group
			.selectAll(".candle")
			.data(visibleData)
			.enter()
			.append("g")
			.attr("class", "candle");

		// High-low lines with improved stroke width for zoom
		const strokeWidth = Math.max(0.5, Math.min(2, zoomLevel * 0.8));
		candles
			.append("line")
			.attr("x1", (d) => xScale(new Date(d.timestamp)))
			.attr("x2", (d) => xScale(new Date(d.timestamp)))
			.attr("y1", (d) => yScale(d.high))
			.attr("y2", (d) => yScale(d.low))
			.attr("stroke", (d) => (d.close >= d.open ? "#26a69a" : "#ef5350"))
			.attr("stroke-width", strokeWidth);

		// Open-close rectangles with minimum height for better visibility
		candles
			.append("rect")
			.attr("x", (d) => xScale(new Date(d.timestamp)) - candleWidth / 2)
			.attr("y", (d) => yScale(Math.max(d.open, d.close)))
			.attr("width", candleWidth)
			.attr("height", (d) =>
				Math.max(1, Math.abs(yScale(d.open) - yScale(d.close)))
			)
			.attr("fill", (d) => (d.close >= d.open ? "#26a69a" : "#ef5350"))
			.attr("stroke", (d) => (d.close >= d.open ? "#26a69a" : "#ef5350"))
			.attr("stroke-width", Math.max(0.5, strokeWidth * 0.8))
			.attr("opacity", 0.9);
	};

	// Render volume bars
	const renderVolumeBars = (
		group: d3.Selection<SVGGElement, unknown, null, undefined>,
		xScale: d3.ScaleTime<number, number>,
		yScale: d3.ScaleLinear<number, number>,
		width: number,
		height: number
	) => {
		// Calculate adaptive bar width based on zoom level
		const zoomLevel = d3.zoomTransform(group.node() || document.body).k;
		const adaptiveBarWidth = Math.max(
			0.8,
			Math.min(12, (width / ohlcvData.length) * 0.7 * zoomLevel)
		);
		const barWidth = Math.max(1, adaptiveBarWidth);

		// Filter data to only visible bars for better performance
		const visibleData = ohlcvData.filter((d) => {
			const x = xScale(new Date(d.timestamp));
			return x >= -barWidth && x <= width + barWidth;
		});

		const bars = group
			.selectAll(".volume-bar")
			.data(visibleData)
			.enter()
			.append("rect")
			.attr("class", "volume-bar")
			.attr("x", (d) => xScale(new Date(d.timestamp)) - barWidth / 2)
			.attr("y", (d) => yScale(d.volume))
			.attr("width", barWidth)
			.attr("height", (d) => Math.max(1, height - yScale(d.volume)))
			.attr("fill", (d) => (d.close >= d.open ? "#26a69a88" : "#ef535088"))
			.attr("stroke", (d) => (d.close >= d.open ? "#26a69a" : "#ef5350"))
			.attr("stroke-width", Math.max(0.2, Math.min(0.8, zoomLevel * 0.3)))
			.attr("opacity", Math.max(0.6, Math.min(0.95, zoomLevel * 0.4 + 0.5)));
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
