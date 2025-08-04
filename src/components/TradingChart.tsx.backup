/**
 * Modern TradingView-Style Chart System
 * Built with D3.js for real-time charting
 *
 * Features:
 * - Historical candlestick data
 * - Multi-panel layout (price, volume, oscillators)
 * - Real-time updates with live candle transitions
 * - Zoom & pan with position retention
 * - Strategy indicator overlays & colors
 * - Shared time axis across panels
 * - Live price marker & signal annotations
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";
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
	// Refs for D3 chart instances
	const svgRefs = useRef<{ [key: string]: SVGSVGElement | null }>({});
	const chartContainerRef = useRef<HTMLDivElement>(null);

	// Chart state
	const [panels, setPanels] = useState<ChartPanel[]>([]);
	const [zoomState, setZoomState] = useState<any>(null);
	const [lastKnownPrice, setLastKnownPrice] = useState<number | null>(null);

	// Organize indicators into panels
	const organizePanels = useCallback((): ChartPanel[] => {
		const priceIndicators = indicators.filter((ind) => ind.yAxisID === "price");
		const volumeIndicators = indicators.filter(
			(ind) => ind.yAxisID === "volume"
		);
		const oscillatorIndicators = indicators.filter(
			(ind) => ind.yAxisID === "oscillator"
		);

		const panels: ChartPanel[] = [];

		// Main price panel (always present)
		panels.push({
			id: "price",
			type: "price",
			height: Math.floor(height * 0.7),
			indicators: priceIndicators,
			showTimeAxis: true,
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
			panels[0].height = Math.floor(height * 0.6);
			panels[0].showTimeAxis = false;

			const adjustedRemainingHeight = height - panels[0].height;
			const panelHeight = Math.floor(
				adjustedRemainingHeight / additionalPanels.length
			);

			additionalPanels.forEach((panel, index) => {
				panels.push({
					...panel,
					height: panelHeight,
					showTimeAxis: index === additionalPanels.length - 1,
				});
			});
		}

		return panels;
	}, [indicators, height]);

	// Update panels when indicators change
	useEffect(() => {
		setPanels(organizePanels());
	}, [organizePanels]);

	// Track last known price
	useEffect(() => {
		if (ohlcvData.length > 0) {
			const currentPrice = ohlcvData[ohlcvData.length - 1].close;
			setLastKnownPrice(currentPrice);
		}
	}, [ohlcvData]);

	// D3 Chart rendering (simplified for now)
	const renderChart = useCallback(
		(panel: ChartPanel) => {
			const svgElement = svgRefs.current[panel.id];
			if (!svgElement || ohlcvData.length === 0) return;

			const svg = d3.select(svgElement);
			svg.selectAll("*").remove(); // Clear existing content

			const margin = { top: 20, right: 50, bottom: 30, left: 50 };
			const width = svgElement.clientWidth - margin.left - margin.right;
			const panelHeight = panel.height - margin.top - margin.bottom;

			// Create scales
			const xScale = d3
				.scaleTime()
				.domain(
					d3.extent(ohlcvData, (d) => new Date(d.timestamp)) as [Date, Date]
				)
				.range([0, width]);

			const yScale = d3
				.scaleLinear()
				.domain(d3.extent(ohlcvData, (d) => d.close) as [number, number])
				.range([panelHeight, 0]);

			const g = svg
				.append("g")
				.attr("transform", `translate(${margin.left},${margin.top})`);

			// Simple line chart for now
			const line = d3
				.line<OHLCVData>()
				.x((d) => xScale(new Date(d.timestamp)))
				.y((d) => yScale(d.close))
				.curve(d3.curveLinear);

			g.append("path")
				.datum(ohlcvData)
				.attr("fill", "none")
				.attr("stroke", "#26a69a")
				.attr("stroke-width", 2)
				.attr("d", line);

			// Add indicators
			panel.indicators.forEach((indicator) => {
				if (indicator.data.length === 0) return;

				// Filter out null values for D3 line generator
				const validData = indicator.data.filter((d) => d.y !== null) as {
					x: number;
					y: number;
				}[];
				if (validData.length === 0) return;

				const indicatorLine = d3
					.line<{ x: number; y: number }>()
					.x((d) => xScale(new Date(d.x)))
					.y((d) => yScale(d.y))
					.curve(d3.curveLinear);

				g.append("path")
					.datum(validData)
					.attr("fill", "none")
					.attr("stroke", indicator.color || "#ffffff")
					.attr("stroke-width", 1)
					.attr("opacity", 0.8)
					.attr("d", indicatorLine);
			});

			// Add axes
			if (panel.showTimeAxis) {
				g.append("g")
					.attr("transform", `translate(0,${panelHeight})`)
					.call(d3.axisBottom(xScale));
			}

			g.append("g").call(d3.axisRight(yScale).tickSize(width));
		},
		[ohlcvData]
	);

	// Render all charts
	useEffect(() => {
		panels.forEach((panel) => {
			renderChart(panel);
		});
	}, [panels, renderChart]);

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
						onClick={() => {
							// Reset zoom functionality
							setZoomState(null);
							panels.forEach((panel) => renderChart(panel));
						}}
						className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded"
					>
						Reset Zoom
					</button>
				</div>
			</div>

			{/* Chart Panels */}
			<div className="relative" ref={chartContainerRef}>
				{panels.map((panel, index) => (
					<div
						key={panel.id}
						style={{ height: `${panel.height}px` }}
						className={`relative ${
							index > 0 ? "border-t border-gray-700" : ""
						}`}
					>
						<svg
							ref={(el) => {
								svgRefs.current[panel.id] = el;
							}}
							width="100%"
							height={panel.height}
							className="block"
						/>
					</div>
				))}
			</div>
		</div>
	);
};

export default TradingChart;
