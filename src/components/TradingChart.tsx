/**
 * Modern Trading Chart - Built for Excellence (August 2025)
 *
 * Features:
 * - True responsive design that scales with container
 * - Smooth zoom/pan across entire chart area
 * - No cut-off axes on any device
 * - Modular panel system
 * - Cohesive UI design
 * - Optimized performance
 */

import React, {
	useRef,
	useEffect,
	useState,
	useCallback,
	useMemo,
} from "react";
import * as d3 from "d3";
import { OHLCVData, CalculatedIndicator } from "../types/indicators";
import {
	IndicatorRenderer,
	getIndicatorConfig,
} from "../utils/indicatorRenderer";

interface TradingChartProps {
	ohlcvData: OHLCVData[];
	indicators: CalculatedIndicator[];
	symbol: string;
	timeframe: string;
	height?: number;
	loading?: boolean;
	error?: string | null;
	isFullscreen?: boolean;
	onToggleFullscreen?: () => void;
}

interface ChartPanel {
	id: string;
	type: "price" | "volume" | "oscillator";
	height: number;
	yOffset: number;
	indicators: CalculatedIndicator[];
	title: string;
}

interface ChartDimensions {
	containerWidth: number;
	containerHeight: number;
	chartWidth: number;
	chartHeight: number;
	margin: {
		top: number;
		right: number;
		bottom: number;
		left: number;
	};
}

const TradingChart: React.FC<TradingChartProps> = ({
	ohlcvData,
	indicators,
	symbol,
	timeframe,
	height = 600,
	loading = false,
	error = null,
	isFullscreen = false,
	onToggleFullscreen,
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const svgRef = useRef<SVGSVGElement>(null);

	// State management
	const [dimensions, setDimensions] = useState({
		containerWidth: 320, // Start with mobile minimum
		containerHeight: height,
		chartWidth: 250,
		chartHeight: height - 60,
		margin: { top: 15, right: 30, bottom: 25, left: 25 }, // Mobile-first margins
	});

	const [zoomTransform, setZoomTransform] = useState(d3.zoomIdentity);
	const [isReady, setIsReady] = useState(false);

	// Get responsive configuration based on current dimensions
	const config = useMemo(() => {
		const isMobile = dimensions.containerWidth < 640;
		const isTablet =
			dimensions.containerWidth >= 640 && dimensions.containerWidth < 1024;

		return {
			panelGap: isMobile ? 4 : 8, // Tighter gaps on mobile
			colors: {
				background: "#1a1a1a",
				panel: "#262626",
				grid: "#404040",
				text: "#e5e5e5",
				textSecondary: "#a3a3a3",
				candleUp: "#22c55e",
				candleDown: "#ef4444",
				border: "#525252",
				accent: "#3b82f6",
			},
			text: {
				title: isMobile ? "12px" : "16px", // Smaller text on mobile
				axis: isMobile ? "10px" : "12px",
				label: isMobile ? "9px" : "11px",
			},
			panels: {
				price: isMobile ? 0.6 : 0.55, // More space for price on mobile
				volume: isMobile ? 0.12 : 0.15, // Less space for volume on mobile
				oscillator: isMobile ? 0.28 : 0.3, // Adjust oscillator space
			},
			zoom: {
				scaleExtent: [0.1, 50] as [number, number],
			},
			responsive: {
				isMobile,
				isTablet,
				candleMinWidth: isMobile ? 1 : 2,
				candleMaxWidth: isMobile ? 6 : 20, // Smaller max width on mobile
			},
		};
	}, [dimensions.containerWidth]);

	// Enhanced resize observer that properly calculates dimensions
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const updateDimensions = () => {
			const rect = container.getBoundingClientRect();
			const containerWidth = Math.max(320, rect.width); // Minimum 320px width

			// Responsive height - smaller on mobile
			const isMobile = containerWidth < 640;
			const responsiveHeight = isMobile ? Math.min(height, 500) : height;

			// Calculate responsive margins
			const rightMargin = isMobile
				? Math.max(20, containerWidth * 0.08) // Increased for mobile Y-axis
				: Math.max(60, containerWidth * 0.08);
			const leftMargin = isMobile
				? Math.max(15, containerWidth * 0.04) // Minimal left margin on mobile
				: Math.max(50, containerWidth * 0.06);
			const bottomMargin = isMobile
				? Math.max(20, responsiveHeight * 0.05) // Minimal bottom margin
				: Math.max(40, responsiveHeight * 0.08);
			const topMargin = isMobile ? 10 : 20; // Very tight top margin on mobile

			const chartWidth = containerWidth - leftMargin - rightMargin;
			const chartHeight = responsiveHeight - topMargin - bottomMargin;

			const newDimensions = {
				containerWidth,
				containerHeight: responsiveHeight,
				chartWidth: Math.max(200, chartWidth), // Ensure minimum chart width
				chartHeight: Math.max(150, chartHeight), // Ensure minimum chart height
				margin: {
					top: topMargin,
					right: rightMargin,
					bottom: bottomMargin,
					left: leftMargin,
				},
			};

			console.log(
				`[TradingChart] Responsive update - Mobile: ${isMobile}, Dimensions:`,
				newDimensions
			);
			setDimensions(newDimensions);
			setIsReady(true);
		};

		// ResizeObserver for real responsive behavior
		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				updateDimensions();
			}
		});

		resizeObserver.observe(container);

		// Initial measurement with delay to ensure container is rendered
		const timeoutId = setTimeout(() => {
			updateDimensions();
		}, 100);

		// Also try immediate measurement
		requestAnimationFrame(updateDimensions);

		return () => {
			resizeObserver.disconnect();
			clearTimeout(timeoutId);
		};
	}, [height]); // Remove config.margin dependency

	// Force re-initialization when data becomes available
	useEffect(() => {
		if (ohlcvData.length > 0 && !isReady) {
			console.log("[TradingChart] Data available, triggering initialization");
			setIsReady(true);
		}
	}, [ohlcvData.length, isReady]);

	// Organize panels with proper responsive heights
	const panels = useMemo((): ChartPanel[] => {
		if (!isReady) return [];

		const panelList: ChartPanel[] = [];
		let currentY = 0;

		// Categorize indicators
		const priceIndicators = indicators.filter((ind) => {
			const cfg = getIndicatorConfig(ind);
			return cfg.yAxisID === "price";
		});

		const volumeIndicators = indicators.filter((ind) => {
			const cfg = getIndicatorConfig(ind);
			return cfg.yAxisID === "volume";
		});

		const rsiIndicators = indicators.filter((ind) => {
			const cfg = getIndicatorConfig(ind);
			return (
				cfg.yAxisID === "oscillator" &&
				(ind.id?.includes("rsi") || ind.name?.toLowerCase().includes("rsi"))
			);
		});

		const macdIndicators = indicators.filter((ind) => {
			const cfg = getIndicatorConfig(ind);
			return (
				cfg.yAxisID === "oscillator" &&
				(ind.id?.includes("macd") || ind.name?.toLowerCase().includes("macd"))
			);
		});

		// Calculate available height for panels
		const availableHeight = dimensions.chartHeight;

		// Price panel
		const priceHeight = Math.floor(availableHeight * config.panels.price);
		panelList.push({
			id: "price",
			type: "price",
			height: priceHeight,
			yOffset: currentY,
			indicators: priceIndicators,
			title: `${symbol} ${timeframe}`,
		});
		currentY += priceHeight + config.panelGap;

		// Volume panel (if we have volume data)
		const hasVolume = ohlcvData.some((d) => d.volume > 0);
		if (hasVolume || volumeIndicators.length > 0) {
			const volumeHeight = Math.floor(availableHeight * config.panels.volume);
			panelList.push({
				id: "volume",
				type: "volume",
				height: volumeHeight,
				yOffset: currentY,
				indicators: volumeIndicators,
				title: "Volume",
			});
			currentY += volumeHeight + config.panelGap;
		}

		// Oscillator panels
		const oscillatorPanelCount =
			(rsiIndicators.length > 0 ? 1 : 0) + (macdIndicators.length > 0 ? 1 : 0);

		if (oscillatorPanelCount > 0) {
			const remainingHeight = availableHeight - currentY;
			const oscillatorHeight =
				Math.floor(remainingHeight / oscillatorPanelCount) - config.panelGap;

			if (rsiIndicators.length > 0) {
				panelList.push({
					id: "rsi",
					type: "oscillator",
					height: oscillatorHeight,
					yOffset: currentY,
					indicators: rsiIndicators,
					title: "RSI",
				});
				currentY += oscillatorHeight + config.panelGap;
			}

			if (macdIndicators.length > 0) {
				panelList.push({
					id: "macd",
					type: "oscillator",
					height: oscillatorHeight,
					yOffset: currentY,
					indicators: macdIndicators,
					title: "MACD",
				});
			}
		}

		return panelList;
	}, [indicators, ohlcvData, dimensions, config, isReady, symbol, timeframe]);

	// Create time scale
	const timeScale = useMemo(() => {
		if (!ohlcvData.length || !isReady) return null;

		const timeExtent = d3.extent(ohlcvData, (d) => new Date(d.timestamp)) as [
			Date,
			Date
		];
		const baseScale = d3
			.scaleTime()
			.domain(timeExtent)
			.range([0, dimensions.chartWidth]);

		return zoomTransform.rescaleX(baseScale);
	}, [ohlcvData, dimensions.chartWidth, zoomTransform, isReady]);

	// Render chart function
	const renderChart = useCallback(() => {
		if (!svgRef.current || !timeScale || !panels.length || !isReady) return;

		const svg = d3.select(svgRef.current);
		svg.selectAll("*").remove();

		// Create main chart group
		const chartGroup = svg
			.append("g")
			.attr(
				"transform",
				`translate(${dimensions.margin.left}, ${dimensions.margin.top})`
			);

		// Render each panel
		panels.forEach((panel, index) => {
			renderPanel(chartGroup, panel, timeScale, index === panels.length - 1);
		});

		// Setup zoom behavior that works across entire chart
		setupZoomBehavior(svg);
	}, [timeScale, panels, config, isReady]);

	// Panel rendering function
	const renderPanel = (
		chartGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
		panel: ChartPanel,
		timeScale: d3.ScaleTime<number, number>,
		isLastPanel: boolean
	) => {
		const panelGroup = chartGroup
			.append("g")
			.attr("class", `panel-${panel.id}`)
			.attr("transform", `translate(0, ${panel.yOffset})`);

		// Panel background
		panelGroup
			.append("rect")
			.attr("width", dimensions.chartWidth)
			.attr("height", panel.height)
			.attr("fill", config.colors.panel)
			.attr("stroke", config.colors.border)
			.attr("stroke-width", 1)
			.attr("rx", 4);

		// Panel title
		panelGroup
			.append("text")
			.attr("x", 12)
			.attr("y", 20)
			.attr("fill", config.colors.text)
			.attr("font-size", config.text.label)
			.attr("font-weight", "600")
			.text(panel.title);

		// Create Y scale for this panel
		const yScale = createYScale(panel, timeScale);

		// Debug logging for oscillator panels
		if (panel.type === "oscillator" && panel.indicators.length > 0) {
			const domain = yScale.domain();
			console.log(
				`[TradingChart] ${panel.id} Y-scale domain:`,
				domain,
				`Range: [${domain[0].toFixed(2)} - ${domain[1].toFixed(2)}]`,
				`Indicators: ${panel.indicators.map((i) => i.name || i.id).join(", ")}`
			);
		}

		// Clipping path
		const clipId = `clip-${panel.id}`;
		panelGroup
			.append("defs")
			.append("clipPath")
			.attr("id", clipId)
			.append("rect")
			.attr("width", dimensions.chartWidth)
			.attr("height", panel.height);

		const contentGroup = panelGroup
			.append("g")
			.attr("clip-path", `url(#${clipId})`);

		// Grid
		renderGrid(contentGroup, timeScale, yScale, panel.height);

		// Panel-specific content
		if (panel.type === "price") {
			renderCandlesticks(contentGroup, timeScale, yScale);
		} else if (panel.type === "volume") {
			renderVolumeBars(contentGroup, timeScale, yScale);
		}

		// Indicators
		if (panel.indicators.length > 0) {
			renderIndicators(contentGroup, panel.indicators, timeScale, yScale);
		}

		// Axes
		renderYAxis(panelGroup, yScale, panel.type);
		if (isLastPanel) {
			renderXAxis(panelGroup, timeScale, panel.height);
		}
	};

	// Create Y scale based on panel type and visible data
	const createYScale = (
		panel: ChartPanel,
		timeScale: d3.ScaleTime<number, number>
	): d3.ScaleLinear<number, number> => {
		const visibleTimeRange = timeScale.domain();
		const visibleData = ohlcvData.filter((d) => {
			const time = new Date(d.timestamp);
			return time >= visibleTimeRange[0] && time <= visibleTimeRange[1];
		});

		// Always use visible data if available, otherwise fall back to all data
		const dataToUse = visibleData.length > 0 ? visibleData : ohlcvData;
		let domain: [number, number];

		switch (panel.type) {
			case "price": {
				// For price, use only visible OHLCV data to fit the zoom level
				const values = dataToUse.flatMap((d) => [d.high, d.low]);
				const extent = d3.extent(values) as [number, number];
				const range = extent[1] - extent[0];

				// Minimal padding for tight fit to visible data
				const padding = range * 0.01; // Reduced to just 1% padding for tighter fit
				domain = [extent[0] - padding, extent[1] + padding];
				break;
			}
			case "volume": {
				// For volume, use only visible data for tight fit
				const maxVolume = d3.max(dataToUse, (d) => d.volume) || 1;
				domain = [0, maxVolume * 1.05]; // Minimal top padding
				break;
			}
			case "oscillator": {
				// For oscillators, filter indicator data to ONLY visible time range
				const visibleIndicatorValues: number[] = [];

				panel.indicators.forEach((ind) => {
					// Filter indicator data points to only those in visible time range
					const visibleIndicatorData = ind.data.filter((dataPoint) => {
						if (dataPoint.x === null || dataPoint.y === null) return false;
						if (typeof dataPoint.y !== "number" || isNaN(dataPoint.y))
							return false;

						const pointTime = new Date(dataPoint.x);
						return (
							pointTime >= visibleTimeRange[0] &&
							pointTime <= visibleTimeRange[1]
						);
					});

					// Collect all Y values from visible data
					visibleIndicatorData.forEach((point) => {
						visibleIndicatorValues.push(point.y as number);
					});
				});

				if (visibleIndicatorValues.length > 0) {
					const extent = d3.extent(visibleIndicatorValues) as [number, number];
					const range = extent[1] - extent[0];

					console.log(
						`[TradingChart] ${panel.id} visible range calculation:`,
						`Values: ${visibleIndicatorValues.length}`,
						`Extent: [${extent[0].toFixed(3)} - ${extent[1].toFixed(3)}]`,
						`Range: ${range.toFixed(3)}`
					);

					if (range === 0 || range < 0.001) {
						// All values are the same or very close - create a minimal meaningful range
						const value = extent[0];
						let minOffset = 0.1; // Default minimum visual range

						// Adjust minimum offset based on indicator type
						const indicatorName = (
							panel.indicators[0]?.name || ""
						).toLowerCase();
						if (indicatorName.includes("rsi")) {
							minOffset = 5; // RSI gets 5-point range minimum
						} else if (indicatorName.includes("macd")) {
							minOffset = Math.max(0.001, Math.abs(value) * 0.1); // MACD gets 10% of value as range
						}

						domain = [value - minOffset, value + minOffset];
						console.log(
							`[TradingChart] ${panel.id} flat data detected, using minimum range:`,
							domain
						);
					} else {
						// Use MINIMAL padding to maximize use of panel height
						const padding = Math.max(range * 0.02, 0.005); // Reduced to 2% padding or minimum 0.005
						domain = [extent[0] - padding, extent[1] + padding];

						// Special constraints for known oscillator types
						const indicatorName = (
							panel.indicators[0]?.name || ""
						).toLowerCase();
						if (indicatorName.includes("rsi")) {
							// RSI: constrain to meaningful bounds but prioritize visible data
							domain = [Math.max(0, domain[0]), Math.min(100, domain[1])];
							// If visible range is very small, expand slightly for readability
							if (domain[1] - domain[0] < 5) {
								const center = (domain[0] + domain[1]) / 2;
								domain = [
									Math.max(0, center - 2.5),
									Math.min(100, center + 2.5),
								];
							}
						} else if (indicatorName.includes("macd")) {
							// MACD: no constraints, use full visible range for maximum height utilization
							// This allows MACD to use the full panel height effectively
						}
					}

					console.log(
						`[TradingChart] ${panel.id} final domain:`,
						`[${domain[0].toFixed(3)} - ${domain[1].toFixed(3)}]`,
						`Panel height: ${panel.height}px`,
						`Y-scale range: [${panel.height - 10} - 10]`,
						`Utilization: ${(
							((extent[1] - extent[0]) / (domain[1] - domain[0])) *
							100
						).toFixed(1)}%`
					);
				} else {
					// Fallback: no visible indicator data
					console.log(
						`[TradingChart] ${panel.id} no visible indicator data, using fallback`
					);

					// Try to use all indicator data as last resort
					const allValues = panel.indicators.flatMap((ind) =>
						ind.data
							.filter(
								(d) => d.y !== null && typeof d.y === "number" && !isNaN(d.y)
							)
							.map((d) => d.y as number)
					);

					if (allValues.length > 0) {
						const extent = d3.extent(allValues) as [number, number];
						const range = extent[1] - extent[0];
						const padding = range > 0 ? range * 0.1 : 1;
						domain = [extent[0] - padding, extent[1] + padding];
					} else {
						// Last resort: default range
						const indicatorName = (
							panel.indicators[0]?.name || ""
						).toLowerCase();
						if (indicatorName.includes("rsi")) {
							domain = [0, 100];
						} else {
							domain = [-1, 1];
						}
					}
				}
				break;
			}
			default:
				domain = [0, 100];
		}

		// Create scale with full panel height utilization
		return d3
			.scaleLinear()
			.domain(domain)
			.range([panel.height - 10, 10]) // Use almost full height (10px margins top/bottom for tighter fit)
			.clamp(true); // Ensure values stay within range
	};

	// Grid rendering with adaptive tick density
	const renderGrid = (
		group: d3.Selection<SVGGElement, unknown, null, undefined>,
		timeScale: d3.ScaleTime<number, number>,
		yScale: d3.ScaleLinear<number, number>,
		height: number
	) => {
		// Adaptive Y-axis tick count based on panel height and domain range
		const domain = yScale.domain();
		const range = domain[1] - domain[0];
		let yTickCount: number;

		if (height < 100) {
			yTickCount = 3; // Small panels get fewer ticks
		} else if (range < 1) {
			yTickCount = 8; // Very tight ranges get more granular ticks
		} else if (range < 10) {
			yTickCount = 6; // Small ranges get moderate ticks
		} else {
			yTickCount = 5; // Normal ranges get standard ticks
		}

		const yTicks = yScale.ticks(yTickCount);
		group
			.selectAll(".grid-y")
			.data(yTicks)
			.enter()
			.append("line")
			.attr("class", "grid-y")
			.attr("x1", 0)
			.attr("x2", dimensions.chartWidth)
			.attr("y1", (d) => yScale(d))
			.attr("y2", (d) => yScale(d))
			.attr("stroke", config.colors.grid)
			.attr("stroke-width", 0.5)
			.attr("opacity", 0.4); // Slightly more visible for better reference

		// Adaptive X-axis tick count based on zoom level
		const visibleTimeRange = timeScale.domain();
		const timeRangeHours =
			(visibleTimeRange[1].getTime() - visibleTimeRange[0].getTime()) /
			(1000 * 60 * 60);
		let xTickCount: number;

		if (timeRangeHours < 24) {
			xTickCount = Math.min(12, Math.max(4, Math.floor(timeRangeHours / 2))); // More ticks when zoomed in
		} else if (timeRangeHours < 168) {
			// Less than a week
			xTickCount = 8;
		} else {
			xTickCount = 6;
		}

		const xTicks = timeScale.ticks(xTickCount);
		group
			.selectAll(".grid-x")
			.data(xTicks)
			.enter()
			.append("line")
			.attr("class", "grid-x")
			.attr("x1", (d) => timeScale(d))
			.attr("x2", (d) => timeScale(d))
			.attr("y1", 0)
			.attr("y2", height)
			.attr("stroke", config.colors.grid)
			.attr("stroke-width", 0.5)
			.attr("opacity", 0.3);
	};

	// Candlestick rendering
	const renderCandlesticks = (
		group: d3.Selection<SVGGElement, unknown, null, undefined>,
		timeScale: d3.ScaleTime<number, number>,
		yScale: d3.ScaleLinear<number, number>
	) => {
		const visibleData = getVisibleData(timeScale);
		const candleWidth = calculateCandleWidth(timeScale, visibleData.length);

		const candles = group
			.selectAll(".candle")
			.data(visibleData)
			.enter()
			.append("g")
			.attr("class", "candle");

		// Wicks
		candles
			.append("line")
			.attr("x1", (d) => timeScale(new Date(d.timestamp)))
			.attr("x2", (d) => timeScale(new Date(d.timestamp)))
			.attr("y1", (d) => yScale(d.high))
			.attr("y2", (d) => yScale(d.low))
			.attr("stroke", (d) =>
				d.close >= d.open ? config.colors.candleUp : config.colors.candleDown
			)
			.attr("stroke-width", 1);

		// Bodies
		candles
			.append("rect")
			.attr("x", (d) => timeScale(new Date(d.timestamp)) - candleWidth / 2)
			.attr("y", (d) => yScale(Math.max(d.open, d.close)))
			.attr("width", candleWidth)
			.attr("height", (d) =>
				Math.max(1, Math.abs(yScale(d.open) - yScale(d.close)))
			)
			.attr("fill", (d) =>
				d.close >= d.open ? config.colors.candleUp : config.colors.candleDown
			)
			.attr("stroke", (d) =>
				d.close >= d.open ? config.colors.candleUp : config.colors.candleDown
			)
			.attr("stroke-width", 0.5);
	};

	// Volume bars rendering
	const renderVolumeBars = (
		group: d3.Selection<SVGGElement, unknown, null, undefined>,
		timeScale: d3.ScaleTime<number, number>,
		yScale: d3.ScaleLinear<number, number>
	) => {
		const visibleData = getVisibleData(timeScale);
		const barWidth = calculateCandleWidth(timeScale, visibleData.length) * 0.8;

		group
			.selectAll(".volume-bar")
			.data(visibleData)
			.enter()
			.append("rect")
			.attr("class", "volume-bar")
			.attr("x", (d) => timeScale(new Date(d.timestamp)) - barWidth / 2)
			.attr("y", (d) => yScale(d.volume))
			.attr("width", barWidth)
			.attr("height", (d) => yScale(0) - yScale(d.volume))
			.attr("fill", (d) => {
				const color =
					d.close >= d.open ? config.colors.candleUp : config.colors.candleDown;
				return `${color}60`; // Add transparency
			});
	};

	// Indicators rendering
	const renderIndicators = (
		group: d3.Selection<SVGGElement, unknown, null, undefined>,
		indicators: CalculatedIndicator[],
		timeScale: d3.ScaleTime<number, number>,
		yScale: d3.ScaleLinear<number, number>
	) => {
		// Debug logging for indicator rendering
		if (indicators.length > 0) {
			console.log(
				`[TradingChart] Rendering ${indicators.length} indicators with Y-scale domain:`,
				yScale.domain()
			);
			indicators.forEach((ind) => {
				const sampleData = ind.data.slice(0, 3);
				console.log(
					`  - ${ind.name || ind.id}: ${
						sampleData.length > 0
							? `Sample Y values: ${sampleData.map((d) => d.y).join(", ")}`
							: "No data"
					}`
				);
			});
		}

		const renderer = new IndicatorRenderer(
			group,
			{ width: dimensions.chartWidth, height: 200 }, // Height doesn't matter here
			{
				priceScale: yScale, // For price panels, this will be the price scale
				oscillatorScale: yScale, // For oscillator panels, this will be the oscillator scale
				timeScale: timeScale,
			}
		);
		renderer.renderIndicators(indicators);
	};

	// Axis rendering with adaptive formatting and tick count
	const renderYAxis = (
		group: d3.Selection<SVGGElement, unknown, null, undefined>,
		yScale: d3.ScaleLinear<number, number>,
		panelType: string
	) => {
		const domain = yScale.domain();
		const range = domain[1] - domain[0];
		let formatter: (d: number) => string;
		let tickCount: number;

		switch (panelType) {
			case "volume":
				formatter = d3.format(".2s"); // Short format for volume (K, M, B)
				tickCount = 4; // Volume panels are usually smaller
				break;
			case "oscillator":
				// Adaptive formatting for oscillators based on range
				if (range < 1) {
					formatter = d3.format(".4f"); // 4 decimal places for very small ranges
					tickCount = 8; // More ticks for detailed view
				} else if (range < 10) {
					formatter = d3.format(".3f"); // 3 decimal places for small ranges
					tickCount = 6;
				} else if (range < 100) {
					formatter = d3.format(".2f"); // 2 decimal places for medium ranges
					tickCount = 5;
				} else {
					formatter = d3.format(".1f"); // 1 decimal place for large ranges
					tickCount = 5;
				}
				break;
			default: // price
				if (range < 10) {
					formatter = d3.format(".3f"); // More precision for tight price ranges
				} else if (range < 1000) {
					formatter = d3.format(".2f");
				} else {
					formatter = d3.format(".1f");
				}
				tickCount = 6;
		}

		const axis = d3
			.axisRight(yScale)
			.ticks(tickCount)
			.tickFormat((d) => formatter(d.valueOf()))
			.tickSize(0);

		const axisGroup = group
			.append("g")
			.attr("class", "y-axis")
			.attr("transform", `translate(${dimensions.chartWidth}, 0)`);

		axisGroup.call(axis);

		axisGroup
			.selectAll("text")
			.attr("fill", config.colors.textSecondary)
			.attr("font-size", config.text.axis)
			.attr("dx", "0.5em");

		axisGroup.select(".domain").remove();
	};

	const renderXAxis = (
		group: d3.Selection<SVGGElement, unknown, null, undefined>,
		timeScale: d3.ScaleTime<number, number>,
		panelHeight: number
	) => {
		const tickCount = config.responsive.isMobile ? 4 : 8;
		const axis = d3
			.axisBottom(timeScale)
			.ticks(tickCount)
			.tickFormat((d) => {
				const format = config.responsive.isMobile ? "%m/%d" : "%m/%d %H:%M";
				return d3.timeFormat(format)(d as Date);
			})
			.tickSize(0);

		const axisGroup = group
			.append("g")
			.attr("class", "x-axis")
			.attr("transform", `translate(0, ${panelHeight})`)
			.call(axis);

		axisGroup
			.selectAll("text")
			.attr("fill", config.colors.textSecondary)
			.attr("font-size", config.text.axis)
			.attr("dy", "1.2em");

		axisGroup.select(".domain").remove();
	};

	// Helper functions
	const getVisibleData = (timeScale: d3.ScaleTime<number, number>) => {
		const domain = timeScale.domain();
		return ohlcvData.filter((d) => {
			const time = new Date(d.timestamp);
			return time >= domain[0] && time <= domain[1];
		});
	};

	const calculateCandleWidth = (
		timeScale: d3.ScaleTime<number, number>,
		visibleCount: number
	) => {
		const availableWidth = dimensions.chartWidth;
		const idealWidth = availableWidth / Math.max(visibleCount, 10);
		return Math.max(
			config.responsive.candleMinWidth,
			Math.min(config.responsive.candleMaxWidth, idealWidth * 0.7)
		);
	};

	// Setup zoom behavior that works across entire chart
	const setupZoomBehavior = (
		svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
	) => {
		const zoom = d3
			.zoom<SVGSVGElement, unknown>()
			.scaleExtent(config.zoom.scaleExtent)
			.filter((event) => {
				// Allow all standard zoom/pan interactions
				return (
					event.type === "wheel" ||
					event.type === "mousedown" ||
					event.type === "touchstart" ||
					event.type === "touchmove"
				);
			})
			.on("zoom", (event) => {
				const transform = event.transform;
				// Lock to horizontal movement only
				const newTransform = d3.zoomIdentity
					.translate(transform.x, 0)
					.scale(transform.k);

				console.log(
					`[TradingChart] Zoom changed - Scale: ${transform.k.toFixed(
						2
					)}, Translate: ${transform.x.toFixed(0)}`
				);
				setZoomTransform(newTransform);
			});

		// Apply zoom to entire SVG
		svg.call(zoom);

		// Create overlay for better interaction
		svg
			.append("rect")
			.attr("width", "100%")
			.attr("height", "100%")
			.attr("fill", "transparent")
			.style("cursor", "grab")
			.on("mousedown", function () {
				d3.select(this).style("cursor", "grabbing");
			})
			.on("mouseup", function () {
				d3.select(this).style("cursor", "grab");
			});
	};

	// Render effect
	useEffect(() => {
		if (isReady) {
			renderChart();
		}
	}, [renderChart, isReady]);

	// Loading state
	if (loading || (!isReady && ohlcvData.length > 0)) {
		const responsiveHeight =
			dimensions.containerWidth < 640 ? Math.min(height, 500) : height;
		return (
			<div
				className="bg-gray-900 rounded-lg flex items-center justify-center border border-gray-700"
				style={{ height: `${responsiveHeight}px` }}
			>
				<div className="text-gray-400 text-sm">
					{loading ? "Loading chart..." : "Initializing chart..."}
				</div>
			</div>
		);
	}

	// Error state
	if (error) {
		const responsiveHeight =
			dimensions.containerWidth < 640 ? Math.min(height, 500) : height;
		return (
			<div
				className="bg-gray-900 rounded-lg flex items-center justify-center border border-gray-700"
				style={{ height: `${responsiveHeight}px` }}
			>
				<div className="text-red-400 text-sm">Error: {error}</div>
			</div>
		);
	}

	// No data state
	if (!ohlcvData.length) {
		const responsiveHeight =
			dimensions.containerWidth < 640 ? Math.min(height, 500) : height;
		return (
			<div
				className="bg-gray-900 rounded-lg flex items-center justify-center border border-gray-700"
				style={{ height: `${responsiveHeight}px` }}
			>
				<div className="text-gray-400 text-sm">No data available</div>
			</div>
		);
	}

	return (
		<div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
			{/* Header */}
			<div className="flex items-center justify-between p-2 sm:p-4 border-b border-gray-700">
				<div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
					<h3 className="text-white font-semibold text-sm sm:text-lg truncate">
						{symbol} • {timeframe}
					</h3>
					{ohlcvData.length > 0 && (
						<div className="text-green-400 font-mono text-sm sm:text-base">
							${ohlcvData[ohlcvData.length - 1].close.toFixed(2)}
						</div>
					)}
				</div>

				<div className="flex items-center space-x-1 sm:space-x-3">
					<button
						onClick={() => setZoomTransform(d3.zoomIdentity)}
						className="px-2 py-1 sm:px-3 bg-gray-700 hover:bg-gray-600 text-white text-xs sm:text-sm rounded transition-colors"
					>
						Reset
					</button>

					{onToggleFullscreen && (
						<button
							onClick={onToggleFullscreen}
							className="px-2 py-1 sm:px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm rounded transition-colors"
							title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
						>
							{isFullscreen ? "Exit" : "⛶"}
						</button>
					)}

					<div className="text-gray-400 text-xs sm:text-sm hidden sm:block">
						{indicators.length} indicators
					</div>
				</div>
			</div>

			{/* Chart Container */}
			<div
				ref={containerRef}
				className="w-full relative overflow-hidden"
				style={{
					height: `${dimensions.containerHeight}px`,
					width: "100%",
					minHeight: config.responsive.isMobile ? "300px" : "400px", // Ensure minimum height
				}}
			>
				<svg
					ref={svgRef}
					width="100%"
					height="100%"
					style={{
						display: "block",
						touchAction: "none",
						backgroundColor: config.colors.background,
					}}
				/>
			</div>
		</div>
	);
};

export default TradingChart;
