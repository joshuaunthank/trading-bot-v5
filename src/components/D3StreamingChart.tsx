import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import {
	CHART_CONFIG,
	ChartUtils,
	PerformanceMonitor,
} from "../utils/chartSetup";
import { OHLCVData, CalculatedIndicator } from "../types/indicators";
import { IndicatorRenderer } from "../utils/indicatorRenderer";

interface StreamingChartProps {
	symbol: string;
	timeframe: string;
	ohlcvData: OHLCVData[];
	indicators: CalculatedIndicator[];
	onZoomChange?: (min: Date, max: Date) => void;
	height?: number;
	className?: string;
}

export const D3StreamingChart: React.FC<StreamingChartProps> = ({
	symbol,
	timeframe,
	ohlcvData,
	indicators,
	onZoomChange,
	height = 600,
	className = "",
}) => {
	const svgRef = useRef<SVGSVGElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [isInitialized, setIsInitialized] = useState(false);
	const lastUpdateRef = useRef<number>(0);
	const updateCountRef = useRef<number>(0);

	// Responsive dimensions
	const [dimensions, setDimensions] = useState({ width: 1200, height: height });

	// Zoom state management
	const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform>(
		d3.zoomIdentity
	);
	const zoomBehaviorRef = useRef<d3.ZoomBehavior<
		SVGSVGElement,
		unknown
	> | null>(null);

	// Auto-scale toggle state
	const [isAutoScale, setIsAutoScale] = useState(true); // Start with auto-scale enabled

	// Responsive resize observer
	useEffect(() => {
		if (!containerRef.current) return;

		const resizeObserver = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (entry) {
				const { width } = entry.contentRect;
				setDimensions({ width, height });
			}
		});

		resizeObserver.observe(containerRef.current);

		return () => {
			resizeObserver.disconnect();
		};
	}, [height]);

	// Auto-fit function to show all data (full reset)
	const fitToData = () => {
		if (!svgRef.current || !zoomBehaviorRef.current || ohlcvData.length === 0)
			return;

		const svg = d3.select(svgRef.current);
		svg
			.transition()
			.duration(750)
			.call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
	};

	// Toggle auto-scale mode
	const toggleAutoScale = () => {
		const newAutoScale = !isAutoScale;
		setIsAutoScale(newAutoScale);
		// Auto-scale doesn't reset zoom - it just changes how Y-axis scaling works
	};

	// Chart dimensions - responsive
	const width = dimensions.width;
	const margin = CHART_CONFIG.margin;
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	// Initialize chart ONCE with zoom behavior
	useEffect(() => {
		if (!svgRef.current) return;

		const svg = d3.select(svgRef.current);
		svg.selectAll("*").remove();

		svg
			.attr("width", width)
			.attr("height", height)
			.style("background-color", CHART_CONFIG.colors.background);

		// Create main chart group with margins
		const chartGroup = svg
			.append("g")
			.attr("class", "chart-group")
			.attr("transform", `translate(${margin.left},${margin.top})`);

		// Add background rectangle for chart area (with zoom interaction)
		chartGroup
			.append("rect")
			.attr("class", "chart-background")
			.attr("width", innerWidth)
			.attr("height", innerHeight)
			.attr("fill", "rgba(0,0,0,0.1)")
			.attr("stroke", "#333")
			.attr("stroke-width", 1)
			.style("cursor", "crosshair");

		// Create zoom behavior
		const zoom = d3
			.zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.1, 50]) // Allow 10x zoom out, 50x zoom in
			.extent([
				[0, 0],
				[width, height],
			])
			.on("zoom", (event) => {
				const transform = event.transform;
				setZoomTransform(transform);

				// Notify parent of zoom changes if callback provided
				if (onZoomChange && ohlcvData.length > 0) {
					const xExtent = d3.extent(ohlcvData, (d) => new Date(d.timestamp));
					if (xExtent[0] && xExtent[1]) {
						const xScale = d3
							.scaleTime()
							.domain(xExtent as [Date, Date])
							.range([0, innerWidth]);

						const transformedScale = transform.rescaleX(xScale);
						const domain = transformedScale.domain();
						onZoomChange(domain[0], domain[1]);
					}
				}
			});

		// Add double-click to reset zoom
		svg.on("dblclick.zoom", () => {
			svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
		});

		// Apply zoom behavior to SVG
		svg.call(zoom);
		zoomBehaviorRef.current = zoom;

		setIsInitialized(true);
	}, [width, height, innerWidth, innerHeight]); // Re-initialize when dimensions change

	// INSTANT D3.js candlestick chart rendering with ZOOM/PAN support
	useEffect(() => {
		if (!isInitialized || !svgRef.current || ohlcvData.length === 0) return;

		updateCountRef.current += 1;
		const now = Date.now();
		const timeSinceLastUpdate = now - lastUpdateRef.current;
		lastUpdateRef.current = now;

		// Removed verbose indicator logging for production

		const svg = d3.select(svgRef.current);
		const chartGroup = svg.select(".chart-group");

		// Remove existing chart content but keep background
		chartGroup.selectAll("*:not(.chart-background)").remove();

		// Setup base scales
		const xExtent = d3.extent(ohlcvData, (d) => new Date(d.timestamp));
		const yExtentHigh = d3.extent(ohlcvData, (d) => d.high);
		const yExtentLow = d3.extent(ohlcvData, (d) => d.low);

		if (
			!xExtent[0] ||
			!xExtent[1] ||
			!yExtentHigh[0] ||
			!yExtentHigh[1] ||
			!yExtentLow[0] ||
			!yExtentLow[1]
		)
			return;

		// Base X scale
		const xScale = d3
			.scaleTime()
			.domain(xExtent as [Date, Date])
			.range([0, innerWidth]);

		// Apply zoom transform to X scale to get visible time range
		const transformedXScale = zoomTransform.rescaleX(xScale);
		const visibleTimeRange = transformedXScale.domain();

		// Filter data to only visible candles for auto-scaling Y-axis
		const visibleData = ohlcvData.filter((d) => {
			const date = new Date(d.timestamp);
			return date >= visibleTimeRange[0] && date <= visibleTimeRange[1];
		});

		// Calculate Y-axis domain based on auto-scale mode
		let yMin, yMax;
		if (isAutoScale && visibleData.length > 0) {
			// Auto-scale: fit Y-axis to visible data only
			const visibleYExtentHigh = d3.extent(visibleData, (d) => d.high);
			const visibleYExtentLow = d3.extent(visibleData, (d) => d.low);

			if (
				visibleYExtentHigh[0] &&
				visibleYExtentHigh[1] &&
				visibleYExtentLow[0] &&
				visibleYExtentLow[1]
			) {
				let dataYMin = visibleYExtentLow[0];
				let dataYMax = visibleYExtentHigh[1];

				// Also consider EMA indicator values in the visible range
				const emaIndicator = indicators.find((ind) => ind.id === "ema_20");
				if (emaIndicator && emaIndicator.data.length > 0) {
					const visibleEmaData = emaIndicator.data.filter((d) => {
						const date = new Date(d.x);
						return date >= visibleTimeRange[0] && date <= visibleTimeRange[1];
					});

					if (visibleEmaData.length > 0) {
						const emaExtent = d3.extent(visibleEmaData, (d) => d.y);
						if (emaExtent[0] && emaExtent[1]) {
							dataYMin = Math.min(dataYMin, emaExtent[0]);
							dataYMax = Math.max(dataYMax, emaExtent[1]);
						}
					}
				}

				// Increased padding for better visibility
				yMin = dataYMin * 0.995; // 0.5% padding below
				yMax = dataYMax * 1.005; // 0.5% padding above
			} else {
				// Fallback to full data
				yMin = yExtentLow[0] * 0.995;
				yMax = yExtentHigh[1] * 1.005;
			}
		} else {
			// Fixed scale: use full data range and apply zoom transform
			yMin = yExtentLow[0] * 0.995;
			yMax = yExtentHigh[1] * 1.005;
		}

		// Create Y scale
		const yScale = d3
			.scaleLinear()
			.domain([yMin, yMax])
			.range([innerHeight, 0]);

		// Apply zoom transform to Y scale only if NOT in auto-scale mode
		const transformedYScale = isAutoScale
			? yScale
			: zoomTransform.rescaleY(yScale);

		// Calculate dynamic candle width based on zoom level
		const candleWidth = Math.max(
			0.5,
			Math.min(20, (innerWidth / Math.max(visibleData.length, 1)) * 0.8)
		);

		// Draw candlesticks with zoom-aware positioning
		chartGroup
			.selectAll(".candle-body")
			.data(ohlcvData)
			.enter()
			.append("rect")
			.attr("class", "candle-body")
			.attr(
				"x",
				(d) => transformedXScale(new Date(d.timestamp)) - candleWidth / 2
			)
			.attr("y", (d) => transformedYScale(Math.max(d.open, d.close)))
			.attr("width", candleWidth)
			.attr(
				"height",
				(d) =>
					Math.abs(transformedYScale(d.open) - transformedYScale(d.close)) || 1
			)
			.attr("fill", (d) =>
				d.close >= d.open
					? CHART_CONFIG.colors.bullish
					: CHART_CONFIG.colors.bearish
			)
			.attr("stroke", (d) =>
				d.close >= d.open
					? CHART_CONFIG.colors.bullish
					: CHART_CONFIG.colors.bearish
			);

		// Candlestick wicks with zoom-aware positioning
		chartGroup
			.selectAll(".candle-wick")
			.data(ohlcvData)
			.enter()
			.append("line")
			.attr("class", "candle-wick")
			.attr("x1", (d) => transformedXScale(new Date(d.timestamp)))
			.attr("x2", (d) => transformedXScale(new Date(d.timestamp)))
			.attr("y1", (d) => transformedYScale(d.high))
			.attr("y2", (d) => transformedYScale(d.low))
			.attr("stroke", (d) =>
				d.close >= d.open
					? CHART_CONFIG.colors.bullish
					: CHART_CONFIG.colors.bearish
			)
			.attr("stroke-width", 1);

		// ✅ COMPREHENSIVE INDICATOR RENDERING SYSTEM
		const indicatorRenderer = new IndicatorRenderer(
			chartGroup,
			transformedXScale,
			transformedYScale
		);

		// Render all indicators with proper validation and error handling
		indicatorRenderer.renderIndicators(indicators);

		// Add zoom-aware axes
		const xAxis = d3.axisBottom(transformedXScale).ticks(6);
		const yAxis = d3.axisLeft(transformedYScale).ticks(8);

		chartGroup
			.append("g")
			.attr("class", "x-axis")
			.attr("transform", `translate(0,${innerHeight})`)
			.call(xAxis)
			.attr("color", CHART_CONFIG.colors.text);

		chartGroup
			.append("g")
			.attr("class", "y-axis")
			.call(yAxis)
			.attr("color", CHART_CONFIG.colors.text);
	}, [
		ohlcvData,
		indicators,
		isInitialized,
		innerWidth,
		innerHeight,
		zoomTransform,
		isAutoScale,
	]);

	return (
		<div
			ref={containerRef}
			className={`d3-streaming-chart ${className}`}
			style={{ position: "relative", width: "100%", height: `${height}px` }}
		>
			<svg
				ref={svgRef}
				style={{
					width: "100%",
					height: "100%",
					cursor: "crosshair",
				}}
			/>

			{/* High-frequency trading info overlay with zoom controls */}
			<div
				style={{
					position: "absolute",
					top: 10,
					left: 10,
					background: "rgba(0,0,0,0.8)",
					color: CHART_CONFIG.colors.text,
					padding: "8px 12px",
					borderRadius: "4px",
					fontSize: "14px",
					fontFamily: "monospace",
					border: "1px solid #00ff00",
				}}
			>
				<div style={{ color: "#00ff00", fontWeight: "bold" }}>
					⚡ HF TRADING: {symbol} - {timeframe}
				</div>
				<div>
					📊 {ohlcvData.length} candles | 📈 {indicators.length} indicators
				</div>
				<div>🔄 Updates: #{updateCountRef.current}</div>
				{ohlcvData.length > 0 && (
					<div>
						💰 Last:{" "}
						{ChartUtils.formatPrice(ohlcvData[ohlcvData.length - 1].close)}
					</div>
				)}
				<div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
					INSTANT STREAMING • NO DELAYS
				</div>
				<div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>
					{isAutoScale
						? "� Auto-Scale: ON | Toggle to enable zoom/pan"
						: "�🖱️ Scroll: Zoom | Drag: Pan | Double-click: Reset"}
				</div>
				<div
					style={{
						marginTop: "6px",
						display: "flex",
						alignItems: "center",
						gap: "8px",
					}}
				>
					<span style={{ fontSize: "11px", color: "#ccc" }}>Auto-Scale:</span>
					<button
						onClick={toggleAutoScale}
						style={{
							padding: "3px 6px",
							background: isAutoScale ? "#00ff00" : "#666",
							color: isAutoScale ? "#000" : "#fff",
							border: "none",
							borderRadius: "12px",
							fontSize: "10px",
							cursor: "pointer",
							fontWeight: "bold",
							minWidth: "45px",
							transition: "all 0.2s ease",
						}}
					>
						{isAutoScale ? "ON" : "OFF"}
					</button>
					{!isAutoScale && (
						<button
							onClick={fitToData}
							style={{
								padding: "3px 6px",
								background: "#ff6b35",
								color: "white",
								border: "none",
								borderRadius: "3px",
								fontSize: "10px",
								cursor: "pointer",
								fontWeight: "bold",
							}}
						>
							📐 Fit
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

export default D3StreamingChart;
