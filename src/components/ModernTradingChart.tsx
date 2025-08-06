/**
 * Modern Trading Chart System - Clean Rebuild (August 2025)
 *
 * Features:
 * - Clean multi-panel architecture
 * - Proper hybrid indicator integration
 * - Responsive zoom and pan
 * - TradingView-style professional layout
 * - Real-time updates optimized
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";
import { OHLCVData, CalculatedIndicator } from "../types/indicators";
import {
	IndicatorRenderer,
	getIndicatorConfig,
} from "../utils/indicatorRenderer";

interface ModernChartProps {
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
	yOffset: number;
	indicators: CalculatedIndicator[];
}

// Clean chart configuration
const CHART_CONFIG = {
	margin: { top: 10, right: 80, bottom: 30, left: 20 },
	panelGap: 3,
	colors: {
		background: "#1a1a1a",
		grid: "#333333",
		text: "#cccccc",
		candleUp: "#26a69a",
		candleDown: "#ef5350",
		border: "#404040",
	},
	zoom: {
		scaleExtent: [0.1, 100] as [number, number],
		panConstraint: true,
	},
};

const ModernTradingChart: React.FC<ModernChartProps> = ({
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
	const [zoomTransform, setZoomTransform] = useState(d3.zoomIdentity);

	// Panel organization - clean and predictable
	const organizePanels = useCallback((): ChartPanel[] => {
		const panels: ChartPanel[] = [];
		let currentY = 0;

		// Categorize indicators by their axis
		const priceIndicators = indicators.filter((ind) => {
			const config = getIndicatorConfig(ind);
			console.log(
				`[ModernChart] Indicator "${
					ind.name
				}": Backend metadata complete = ${!!(
					ind.color &&
					ind.yAxisID &&
					ind.renderType
				)}`
			);
			return config.yAxisID === "price";
		});

		const volumeIndicators = indicators.filter((ind) => {
			const config = getIndicatorConfig(ind);
			return config.yAxisID === "volume";
		});

		// Group oscillators by type for separate panels
		const rsiIndicators = indicators.filter((ind) => {
			const config = getIndicatorConfig(ind);
			return (
				config.yAxisID === "oscillator" &&
				(ind.id?.includes("rsi") || ind.name?.toLowerCase().includes("rsi"))
			);
		});

		const macdIndicators = indicators.filter((ind) => {
			const config = getIndicatorConfig(ind);
			return (
				config.yAxisID === "oscillator" &&
				(ind.id?.includes("macd") || ind.name?.toLowerCase().includes("macd"))
			);
		});

		const otherOscillators = indicators.filter((ind) => {
			const config = getIndicatorConfig(ind);
			return (
				config.yAxisID === "oscillator" &&
				!rsiIndicators.includes(ind) &&
				!macdIndicators.includes(ind)
			);
		});

		// Price panel (60% of height)
		const priceHeight = Math.floor(height * 0.6);
		panels.push({
			id: "price",
			type: "price",
			height: priceHeight,
			yOffset: currentY,
			indicators: priceIndicators,
		});
		currentY += priceHeight + CHART_CONFIG.panelGap;

		// Volume panel (10% if needed)
		const hasVolumeData = ohlcvData.some((d) => d.volume > 0);
		if (hasVolumeData || volumeIndicators.length > 0) {
			const volumeHeight = Math.floor(height * 0.1);
			panels.push({
				id: "volume",
				type: "volume",
				height: volumeHeight,
				yOffset: currentY,
				indicators: volumeIndicators,
			});
			currentY += volumeHeight + CHART_CONFIG.panelGap;
		}

		// Calculate remaining space for oscillators
		const remainingHeight = height - currentY - CHART_CONFIG.margin.bottom;
		const oscillatorPanelCount =
			(rsiIndicators.length > 0 ? 1 : 0) +
			(macdIndicators.length > 0 ? 1 : 0) +
			(otherOscillators.length > 0 ? 1 : 0);

		if (oscillatorPanelCount > 0) {
			const oscillatorHeight =
				Math.floor(remainingHeight / oscillatorPanelCount) -
				CHART_CONFIG.panelGap;

			// RSI Panel
			if (rsiIndicators.length > 0) {
				panels.push({
					id: "rsi",
					type: "oscillator",
					height: oscillatorHeight,
					yOffset: currentY,
					indicators: rsiIndicators,
				});
				currentY += oscillatorHeight + CHART_CONFIG.panelGap;
			}

			// MACD Panel
			if (macdIndicators.length > 0) {
				panels.push({
					id: "macd",
					type: "oscillator",
					height: oscillatorHeight,
					yOffset: currentY,
					indicators: macdIndicators,
				});
				currentY += oscillatorHeight + CHART_CONFIG.panelGap;
			}

			// Other Oscillators Panel
			if (otherOscillators.length > 0) {
				panels.push({
					id: "other_oscillators",
					type: "oscillator",
					height: oscillatorHeight,
					yOffset: currentY,
					indicators: otherOscillators,
				});
			}
		}

		return panels;
	}, [indicators, ohlcvData, height]);

	// Responsive dimensions
	useEffect(() => {
		const updateDimensions = () => {
			if (containerRef.current) {
				const width = containerRef.current.clientWidth;
				setDimensions({ width, height });
			}
		};

		updateDimensions();
		const resizeObserver = new ResizeObserver(updateDimensions);
		if (containerRef.current) {
			resizeObserver.observe(containerRef.current);
		}

		return () => resizeObserver.disconnect();
	}, [height]);

	// Main render function - clean and focused
	const renderChart = useCallback(() => {
		if (!svgRef.current || !ohlcvData.length || !dimensions.width) return;

		const svg = d3.select(svgRef.current);
		svg.selectAll("*").remove();

		const panels = organizePanels();
		const innerWidth =
			dimensions.width - CHART_CONFIG.margin.left - CHART_CONFIG.margin.right;

		// Time scale (shared across all panels)
		const timeExtent = d3.extent(ohlcvData, (d) => new Date(d.timestamp)) as [
			Date,
			Date
		];
		const baseTimeScale = d3
			.scaleTime()
			.domain(timeExtent)
			.range([0, innerWidth]);

		const timeScale = zoomTransform.rescaleX(baseTimeScale);

		// Render each panel
		panels.forEach((panel, panelIndex) => {
			const isLastPanel = panelIndex === panels.length - 1;
			renderPanel(svg, panel, timeScale, innerWidth, isLastPanel);
		});

		// Setup zoom behavior
		setupZoomBehavior(svg);
	}, [ohlcvData, indicators, dimensions, zoomTransform, organizePanels]);

	// Render individual panel
	const renderPanel = (
		svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
		panel: ChartPanel,
		timeScale: d3.ScaleTime<number, number>,
		innerWidth: number,
		showTimeAxis: boolean
	) => {
		const panelGroup = svg
			.append("g")
			.attr("class", `panel-${panel.type}`)
			.attr(
				"transform",
				`translate(${CHART_CONFIG.margin.left}, ${
					panel.yOffset + CHART_CONFIG.margin.top
				})`
			);

		// Create Y scale based on panel type
		const yScale = createYScale(panel, timeScale);

		// Background and borders
		panelGroup
			.append("rect")
			.attr("width", innerWidth)
			.attr("height", panel.height)
			.attr("fill", CHART_CONFIG.colors.background)
			.attr("stroke", CHART_CONFIG.colors.border)
			.attr("stroke-width", 1);

		// Clipping path
		const clipId = `clip-${panel.id}`;
		panelGroup
			.append("defs")
			.append("clipPath")
			.attr("id", clipId)
			.append("rect")
			.attr("width", innerWidth)
			.attr("height", panel.height);

		const contentGroup = panelGroup
			.append("g")
			.attr("clip-path", `url(#${clipId})`);

		// Grid
		renderGrid(contentGroup, timeScale, yScale, innerWidth, panel.height);

		// Panel content
		if (panel.type === "price") {
			renderCandlesticks(contentGroup, timeScale, yScale, innerWidth);
		} else if (panel.type === "volume") {
			renderVolumeBars(contentGroup, timeScale, yScale, innerWidth);
		}

		// Indicators using our hybrid system
		if (panel.indicators.length > 0) {
			const indicatorRenderer = new IndicatorRenderer(
				contentGroup,
				{ width: innerWidth, height: panel.height },
				{
					priceScale: yScale,
					oscillatorScale: yScale,
					timeScale: timeScale,
				}
			);
			indicatorRenderer.renderIndicators(panel.indicators);
		}

		// Axes
		if (showTimeAxis) {
			renderTimeAxis(panelGroup, timeScale, panel.height, innerWidth);
		}
		renderPriceAxis(panelGroup, yScale, innerWidth, panel.type);

		// Panel label
		panelGroup
			.append("text")
			.attr("x", 10)
			.attr("y", 20)
			.attr("fill", CHART_CONFIG.colors.text)
			.attr("font-size", "12px")
			.attr("font-weight", "bold")
			.text(panel.id.toUpperCase().replace("_", " "));
	};

	// Create appropriate Y scale for panel type
	const createYScale = (
		panel: ChartPanel,
		timeScale: d3.ScaleTime<number, number>
	): d3.ScaleLinear<number, number> => {
		const visibleTimeRange = timeScale.domain();
		const visibleData = ohlcvData.filter((d) => {
			const timestamp = new Date(d.timestamp);
			return (
				timestamp >= visibleTimeRange[0] && timestamp <= visibleTimeRange[1]
			);
		});
		const dataForScale = visibleData.length > 0 ? visibleData : ohlcvData;

		let domain: [number, number];

		switch (panel.type) {
			case "price": {
				const priceValues = dataForScale.flatMap((d) => [d.high, d.low]);
				const extent = d3.extent(priceValues) as [number, number];
				const padding = (extent[1] - extent[0]) * 0.05;
				domain = [extent[0] - padding, extent[1] + padding];
				break;
			}
			case "volume": {
				const maxVolume = d3.max(dataForScale, (d) => d.volume) || 1;
				domain = [0, maxVolume * 1.1];
				break;
			}
			case "oscillator": {
				const indicatorValues = panel.indicators.flatMap((ind) =>
					ind.data.filter((d) => d.y !== null).map((d) => d.y as number)
				);
				domain =
					indicatorValues.length > 0
						? (d3.extent(indicatorValues) as [number, number])
						: [0, 100];
				break;
			}
			default:
				domain = [0, 100];
		}

		return d3.scaleLinear().domain(domain).range([panel.height, 0]).nice();
	};

	// Grid rendering
	const renderGrid = (
		group: d3.Selection<SVGGElement, unknown, null, undefined>,
		timeScale: d3.ScaleTime<number, number>,
		yScale: d3.ScaleLinear<number, number>,
		width: number,
		height: number
	) => {
		// Horizontal grid lines
		const yAxis = d3
			.axisRight(yScale)
			.tickSize(width)
			.tickFormat(() => "")
			.ticks(6);

		group
			.append("g")
			.attr("class", "grid-y")
			.call(yAxis)
			.selectAll("line")
			.attr("stroke", CHART_CONFIG.colors.grid)
			.attr("stroke-width", 0.5)
			.attr("opacity", 0.3);

		// Vertical grid lines
		const xAxis = d3
			.axisBottom(timeScale)
			.tickSize(-height)
			.tickFormat(() => "")
			.ticks(8);

		group
			.append("g")
			.attr("class", "grid-x")
			.attr("transform", `translate(0, ${height})`)
			.call(xAxis)
			.selectAll("line")
			.attr("stroke", CHART_CONFIG.colors.grid)
			.attr("stroke-width", 0.5)
			.attr("opacity", 0.3);
	};

	// Candlestick rendering - optimized
	const renderCandlesticks = (
		group: d3.Selection<SVGGElement, unknown, null, undefined>,
		timeScale: d3.ScaleTime<number, number>,
		yScale: d3.ScaleLinear<number, number>,
		width: number
	) => {
		// Calculate candle width based on zoom level and time range
		const timeRange = timeScale.domain();
		const visibleDuration = timeRange[1].getTime() - timeRange[0].getTime();
		const candlesInView = ohlcvData.filter((d) => {
			const time = new Date(d.timestamp).getTime();
			return time >= timeRange[0].getTime() && time <= timeRange[1].getTime();
		}).length;

		// Responsive candle width: wider when zoomed in, thinner when zoomed out
		const candleWidth = Math.max(
			2, // Minimum width for visibility
			Math.min(40, (width / Math.max(candlesInView, 10)) * 0.7) // Dynamic based on visible candles
		);

		// Filter visible data for performance
		const visibleData = ohlcvData.filter((d) => {
			const x = timeScale(new Date(d.timestamp));
			return x >= -candleWidth && x <= width + candleWidth;
		});

		const candles = group
			.selectAll(".candle")
			.data(visibleData)
			.enter()
			.append("g")
			.attr("class", "candle");

		// High-low lines
		candles
			.append("line")
			.attr("x1", (d) => timeScale(new Date(d.timestamp)))
			.attr("x2", (d) => timeScale(new Date(d.timestamp)))
			.attr("y1", (d) => yScale(d.high))
			.attr("y2", (d) => yScale(d.low))
			.attr("stroke", (d) =>
				d.close >= d.open
					? CHART_CONFIG.colors.candleUp
					: CHART_CONFIG.colors.candleDown
			)
			.attr("stroke-width", 1);

		// Open-close bodies
		candles
			.append("rect")
			.attr("x", (d) => timeScale(new Date(d.timestamp)) - candleWidth / 2)
			.attr("y", (d) => yScale(Math.max(d.open, d.close)))
			.attr("width", candleWidth)
			.attr("height", (d) =>
				Math.max(1, Math.abs(yScale(d.open) - yScale(d.close)))
			)
			.attr("fill", (d) =>
				d.close >= d.open
					? CHART_CONFIG.colors.candleUp
					: CHART_CONFIG.colors.candleDown
			)
			.attr("stroke", (d) =>
				d.close >= d.open
					? CHART_CONFIG.colors.candleUp
					: CHART_CONFIG.colors.candleDown
			)
			.attr("stroke-width", 0.5);
	};

	// Volume bars rendering - optimized
	const renderVolumeBars = (
		group: d3.Selection<SVGGElement, unknown, null, undefined>,
		timeScale: d3.ScaleTime<number, number>,
		yScale: d3.ScaleLinear<number, number>,
		width: number
	) => {
		const barWidth = Math.max(
			1,
			Math.min(15, (width / ohlcvData.length) * 0.7)
		);

		const visibleData = ohlcvData.filter((d) => {
			const x = timeScale(new Date(d.timestamp));
			return x >= -barWidth && x <= width + barWidth;
		});

		group
			.selectAll(".volume-bar")
			.data(visibleData)
			.enter()
			.append("rect")
			.attr("class", "volume-bar")
			.attr("x", (d) => timeScale(new Date(d.timestamp)) - barWidth / 2)
			.attr("y", (d) => yScale(d.volume))
			.attr("width", barWidth)
			.attr("height", (d) => Math.max(1, yScale(0) - yScale(d.volume)))
			.attr("fill", (d) =>
				d.close >= d.open
					? `${CHART_CONFIG.colors.candleUp}80`
					: `${CHART_CONFIG.colors.candleDown}80`
			)
			.attr("opacity", 0.7);
	};

	// Time axis rendering
	const renderTimeAxis = (
		group: d3.Selection<SVGGElement, unknown, null, undefined>,
		timeScale: d3.ScaleTime<number, number>,
		height: number,
		width: number
	) => {
		const timeAxis = d3
			.axisBottom(timeScale)
			.ticks(Math.max(4, Math.min(10, width / 100)))
			.tickFormat((d) => d3.timeFormat("%m/%d %H:%M")(d as Date));

		group
			.append("g")
			.attr("class", "time-axis")
			.attr("transform", `translate(0, ${height})`)
			.call(timeAxis)
			.selectAll("text")
			.attr("fill", CHART_CONFIG.colors.text)
			.attr("font-size", "11px");
	};

	// Price axis rendering
	const renderPriceAxis = (
		group: d3.Selection<SVGGElement, unknown, null, undefined>,
		yScale: d3.ScaleLinear<number, number>,
		width: number,
		panelType: string
	) => {
		const formatter =
			panelType === "volume" ? d3.format(".2s") : d3.format(".2f");

		const priceAxis = d3
			.axisRight(yScale)
			.ticks(5)
			.tickFormat((d) => formatter(d as number));

		group
			.append("g")
			.attr("class", "price-axis")
			.attr("transform", `translate(${width}, 0)`)
			.call(priceAxis)
			.selectAll("text")
			.attr("fill", CHART_CONFIG.colors.text)
			.attr("font-size", "10px")
			.attr("dx", "0.3em");
	};

	// Zoom behavior setup
	const setupZoomBehavior = (
		svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
	) => {
		const zoom = d3
			.zoom<SVGSVGElement, unknown>()
			.scaleExtent(CHART_CONFIG.zoom.scaleExtent)
			.on("zoom", (event) => {
				const transform = event.transform;
				// Lock vertical movement, allow horizontal zoom/pan
				const lockedTransform = d3.zoomIdentity
					.translate(transform.x, 0)
					.scale(transform.k);
				setZoomTransform(lockedTransform);
			});

		svg.call(zoom);
	};

	// Render on data changes
	useEffect(() => {
		renderChart();
	}, [renderChart]);

	// Loading state
	if (loading) {
		return (
			<div
				className="bg-gray-900 rounded-lg flex items-center justify-center"
				style={{ height: `${height}px` }}
			>
				<div className="text-white">Loading chart...</div>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div
				className="bg-gray-900 rounded-lg flex items-center justify-center"
				style={{ height: `${height}px` }}
			>
				<div className="text-red-400">Error: {error}</div>
			</div>
		);
	}

	// Main render
	return (
		<div className="bg-gray-900 rounded-lg overflow-hidden">
			{/* Header */}
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
						{indicators.length} indicators
					</div>
				</div>
			</div>

			{/* Chart */}
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

export default ModernTradingChart;
