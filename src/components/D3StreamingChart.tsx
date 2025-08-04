import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import {
	CHART_CONFIG,
	ChartUtils,
	PerformanceMonitor,
} from "../utils/chartSetup";
import { OHLCVData, CalculatedIndicator } from "../types/indicators";

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
	const [isInitialized, setIsInitialized] = useState(false);
	const lastUpdateRef = useRef<number>(0);
	const updateCountRef = useRef<number>(0);

	// Chart dimensions
	const width = CHART_CONFIG.width;
	const margin = CHART_CONFIG.margin;
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	// Initialize chart ONCE
	useEffect(() => {
		if (!svgRef.current || isInitialized) return;

		console.log("[D3StreamingChart] Initializing HIGH-FREQUENCY chart ONCE");
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

		// Add background rectangle for chart area
		chartGroup
			.append("rect")
			.attr("width", innerWidth)
			.attr("height", innerHeight)
			.attr("fill", "rgba(0,0,0,0.1)")
			.attr("stroke", "#333")
			.attr("stroke-width", 1);

		setIsInitialized(true);
	}, []); // Initialize only once

	// INSTANT D3.js candlestick chart rendering - high-frequency trading optimized
	useEffect(() => {
		if (!isInitialized || !svgRef.current || ohlcvData.length === 0) return;

		updateCountRef.current += 1;
		const now = Date.now();
		const timeSinceLastUpdate = now - lastUpdateRef.current;
		lastUpdateRef.current = now;

		// Minimal performance logging (only every 100th update)
		if (updateCountRef.current % 100 === 0) {
			console.log(
				`[D3Chart] Render #${updateCountRef.current}: ${ohlcvData.length} candles, ${indicators.length} indicators (${timeSinceLastUpdate}ms)`
			);
		}

		const svg = d3.select(svgRef.current);
		const chartGroup = svg.select(".chart-group");

		// Remove existing chart content for fresh render
		chartGroup.selectAll("*").remove();

		// Setup scales
		const xExtent = d3.extent(ohlcvData, (d) => new Date(d.timestamp));
		const yExtent = d3.extent(ohlcvData, (d) => Math.max(d.high, d.low));

		if (!xExtent[0] || !xExtent[1] || !yExtent[0] || !yExtent[1]) return;

		const xScale = d3
			.scaleTime()
			.domain(xExtent as [Date, Date])
			.range([0, innerWidth]);

		const yScale = d3
			.scaleLinear()
			.domain(yExtent as [number, number])
			.nice()
			.range([innerHeight, 0]);

		// Draw candlesticks
		const candleWidth = Math.max(1, (innerWidth / ohlcvData.length) * 0.8);

		// Candlestick bodies
		chartGroup
			.selectAll(".candle-body")
			.data(ohlcvData)
			.enter()
			.append("rect")
			.attr("class", "candle-body")
			.attr("x", (d) => xScale(new Date(d.timestamp)) - candleWidth / 2)
			.attr("y", (d) => yScale(Math.max(d.open, d.close)))
			.attr("width", candleWidth)
			.attr("height", (d) => Math.abs(yScale(d.open) - yScale(d.close)))
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

		// Candlestick wicks
		chartGroup
			.selectAll(".candle-wick")
			.data(ohlcvData)
			.enter()
			.append("line")
			.attr("class", "candle-wick")
			.attr("x1", (d) => xScale(new Date(d.timestamp)))
			.attr("x2", (d) => xScale(new Date(d.timestamp)))
			.attr("y1", (d) => yScale(d.high))
			.attr("y2", (d) => yScale(d.low))
			.attr("stroke", (d) =>
				d.close >= d.open
					? CHART_CONFIG.colors.bullish
					: CHART_CONFIG.colors.bearish
			)
			.attr("stroke-width", 1);

		// Draw EMA indicator if available
		const emaIndicator = indicators.find((ind) => ind.id === "ema_20");
		if (emaIndicator && emaIndicator.data.length > 0) {
			const line = d3
				.line<any>()
				.x((d) => xScale(new Date(d.x)))
				.y((d) => yScale(d.y))
				.curve(d3.curveMonotoneX);

			chartGroup
				.append("path")
				.datum(emaIndicator.data)
				.attr("fill", "none")
				.attr("stroke", "#ff6b35")
				.attr("stroke-width", 2)
				.attr("d", line);
		}

		// Add axes
		const xAxis = d3.axisBottom(xScale).ticks(6);
		const yAxis = d3.axisLeft(yScale).ticks(8);

		chartGroup
			.append("g")
			.attr("transform", `translate(0,${innerHeight})`)
			.call(xAxis)
			.attr("color", CHART_CONFIG.colors.text);

		chartGroup.append("g").call(yAxis).attr("color", CHART_CONFIG.colors.text);
	}, [ohlcvData, indicators, isInitialized, innerWidth, innerHeight]);

	return (
		<div
			className={`d3-streaming-chart ${className}`}
			style={{ position: "relative" }}
		>
			<svg
				ref={svgRef}
				style={{
					width: "100%",
					height: "100%",
					cursor: "crosshair",
				}}
			/>

			{/* High-frequency trading info overlay */}
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
				<div style={{ fontSize: "12px", color: "#888" }}>
					INSTANT STREAMING • NO DELAYS
				</div>
			</div>
		</div>
	);
};

export default D3StreamingChart;
