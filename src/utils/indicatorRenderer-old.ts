/**
 * Modern Hybrid Indicator Rendering System
 * Uses backend metadata with intelligent fallbacks
 */

import * as d3 from "d3";
import { CalculatedIndicator } from "../types/indicators";

export interface IndicatorConfig {
	color: string;
	yAxisID: "price" | "oscillator" | "volume";
	renderType: "line" | "histogram" | "area" | "band";
	strokeWidth: number;
	opacity: number;
	fillColor?: string;
	lineStyle: "solid" | "dashed" | "dotted";
	zIndex: number;
}

/**
 * Get indicator configuration with priority:
 * 1. Backend metadata (user colors + intelligent defaults)
 * 2. Pattern-based fallbacks for legacy/incomplete data
 */
export function getIndicatorConfig(
	indicator: CalculatedIndicator
): IndicatorConfig {
	// Priority 1: Use complete backend metadata if available
	if (indicator.color && indicator.yAxisID && indicator.renderType) {
		return {
			color: indicator.color,
			yAxisID: indicator.yAxisID as "price" | "oscillator" | "volume",
			renderType: indicator.renderType,
			strokeWidth: indicator.strokeWidth || 2,
			opacity: indicator.opacity || 0.8,
			fillColor: indicator.fillColor,
			lineStyle: indicator.lineStyle || "solid",
			zIndex: indicator.zIndex || 1,
		};
	}

	// Priority 2: Pattern-based fallbacks for incomplete/legacy data
	console.warn(
		`[IndicatorRenderer] Using pattern fallback for: ${
			indicator.name || indicator.id
		}`
	);

	const indicatorName = (indicator.name || indicator.id || "").toLowerCase();

	// MACD component patterns
	if (indicatorName.includes("macd") && indicatorName.includes("signal")) {
		return {
			color: indicator.color || "#f39c12",
			yAxisID:
				(indicator.yAxisID as "price" | "oscillator" | "volume") ||
				"oscillator",
			renderType: indicator.renderType || "line",
			strokeWidth: indicator.strokeWidth || 2,
			opacity: indicator.opacity || 0.8,
			fillColor: indicator.fillColor,
			lineStyle: indicator.lineStyle || "dashed",
			zIndex: indicator.zIndex || 1,
		};
	}

	if (indicatorName.includes("macd") && indicatorName.includes("histogram")) {
		return {
			color: indicator.color || "#95a5a6",
			yAxisID:
				(indicator.yAxisID as "price" | "oscillator" | "volume") ||
				"oscillator",
			renderType: indicator.renderType || "histogram",
			strokeWidth: indicator.strokeWidth || 1,
			opacity: indicator.opacity || 0.8,
			fillColor: indicator.fillColor,
			lineStyle: indicator.lineStyle || "solid",
			zIndex: indicator.zIndex || 1,
		};
	}

	if (indicatorName.includes("macd")) {
		return {
			color: indicator.color || "#e74c3c",
			yAxisID:
				(indicator.yAxisID as "price" | "oscillator" | "volume") ||
				"oscillator",
			renderType: indicator.renderType || "line",
			strokeWidth: indicator.strokeWidth || 2,
			opacity: indicator.opacity || 0.8,
			fillColor: indicator.fillColor,
			lineStyle: indicator.lineStyle || "solid",
			zIndex: indicator.zIndex || 2,
		};
	}

	// RSI pattern
	if (indicatorName.includes("rsi")) {
		return {
			color: indicator.color || "#45b7d1",
			yAxisID:
				(indicator.yAxisID as "price" | "oscillator" | "volume") ||
				"oscillator",
			renderType: indicator.renderType || "line",
			strokeWidth: indicator.strokeWidth || 2,
			opacity: indicator.opacity || 0.8,
			fillColor: indicator.fillColor,
			lineStyle: indicator.lineStyle || "solid",
			zIndex: indicator.zIndex || 1,
		};
	}

	// Moving averages (EMA, SMA) - price axis
	if (indicatorName.includes("ema") || indicatorName.includes("sma")) {
		return {
			color: indicator.color || "#ff6b35",
			yAxisID:
				(indicator.yAxisID as "price" | "oscillator" | "volume") || "price",
			renderType: indicator.renderType || "line",
			strokeWidth: indicator.strokeWidth || 2,
			opacity: indicator.opacity || 0.8,
			fillColor: indicator.fillColor,
			lineStyle: indicator.lineStyle || "solid",
			zIndex: indicator.zIndex || 1,
		};
	}

	// Bollinger Bands patterns
	if (indicatorName.includes("bollinger") || indicatorName.includes("bb")) {
		return {
			color: indicator.color || "#9b59b6",
			yAxisID:
				(indicator.yAxisID as "price" | "oscillator" | "volume") || "price",
			renderType: indicator.renderType || "line",
			strokeWidth: indicator.strokeWidth || 1.5,
			opacity: indicator.opacity || 0.8,
			fillColor: indicator.fillColor,
			lineStyle: indicator.lineStyle || "solid",
			zIndex: indicator.zIndex || 1,
		};
	}

	// Ultimate fallback
	console.warn(
		`[IndicatorRenderer] No pattern match found for: ${indicatorName}, using default`
	);
	return {
		color: indicator.color || "#6B7280",
		yAxisID:
			(indicator.yAxisID as "price" | "oscillator" | "volume") || "oscillator",
		renderType: indicator.renderType || "line",
		strokeWidth: indicator.strokeWidth || 2,
		opacity: indicator.opacity || 0.8,
		fillColor: indicator.fillColor,
		lineStyle: indicator.lineStyle || "solid",
		zIndex: indicator.zIndex || 1,
	};
}

import * as d3 from "d3";
import { CalculatedIndicator } from "../types/indicators";

export interface IndicatorRenderConfig {
	color: string;
	strokeWidth: number;
	opacity?: number;
	yAxisID?: "price" | "oscillator" | "volume";
	renderType: "line" | "band" | "histogram";
}

export interface IndicatorConfig {
	color: string;
	yAxisID: "price" | "oscillator" | "volume";
	renderType: "line" | "histogram" | "area" | "band";
	strokeWidth: number;
	opacity: number;
	fillColor?: string;
	lineStyle: "solid" | "dashed" | "dotted";
	zIndex: number;
}

export interface IndicatorStyles {
	[key: string]: IndicatorRenderConfig;
}

// Default indicator styling
export const DEFAULT_INDICATOR_STYLES: IndicatorStyles = {
	ema_20: {
		color: "#ff6b35",
		strokeWidth: 2,
		yAxisID: "price",
		renderType: "line",
	},
	sma_20: {
		color: "#4ecdc4",
		strokeWidth: 2,
		yAxisID: "price",
		renderType: "line",
	},
	SMA_10: {
		color: "#2ecc71",
		strokeWidth: 2,
		yAxisID: "price",
		renderType: "line",
	},
	SMA_30: {
		color: "#3498db",
		strokeWidth: 2,
		yAxisID: "price",
		renderType: "line",
	},
	rsi_14: {
		color: "#45b7d1",
		strokeWidth: 2,
		yAxisID: "oscillator",
		renderType: "line",
	},
	ATR_14: {
		color: "#e67e22",
		strokeWidth: 2,
		yAxisID: "oscillator",
		renderType: "line",
	},
	bollingerBands_20_upper: {
		color: "#9b59b6",
		strokeWidth: 1.5,
		opacity: 0.8,
		yAxisID: "price",
		renderType: "line",
	},
	bollingerBands_20_middle: {
		color: "#9b59b6",
		strokeWidth: 2,
		yAxisID: "price",
		renderType: "line",
	},
	bollingerBands_20_lower: {
		color: "#9b59b6",
		strokeWidth: 1.5,
		opacity: 0.8,
		yAxisID: "price",
		renderType: "line",
	},
	MACD_12_26_9_macd: {
		color: "#e74c3c",
		strokeWidth: 2,
		yAxisID: "oscillator",
		renderType: "line",
	},
	MACD_12_26_9_signal: {
		color: "#f39c12",
		strokeWidth: 2,
		yAxisID: "oscillator",
		renderType: "line",
	},
	MACD_12_26_9_histogram: {
		color: "#95a5a6",
		strokeWidth: 1,
		yAxisID: "oscillator",
		renderType: "histogram",
	},
	macd_line: {
		color: "#e74c3c",
		strokeWidth: 2,
		yAxisID: "oscillator",
		renderType: "line",
	},
	signal_line: {
		color: "#f39c12",
		strokeWidth: 2,
		yAxisID: "oscillator",
		renderType: "line",
	},
	histogram: {
		color: "#95a5a6",
		strokeWidth: 1,
		yAxisID: "oscillator",
		renderType: "histogram",
	},
};

/**
 * Get indicator configuration with priority:
 * 1. Backend metadata (user colors + intelligent defaults)
 * 2. Pattern-based fallbacks for legacy/incomplete data
 */
export function getIndicatorConfig(
	indicator: CalculatedIndicator
): IndicatorConfig {
	// Priority 1: Use complete backend metadata if available
	if (indicator.color && indicator.yAxisID && indicator.renderType) {
		return {
			color: indicator.color,
			yAxisID: indicator.yAxisID as "price" | "oscillator" | "volume",
			renderType: indicator.renderType,
			strokeWidth: indicator.strokeWidth || 2,
			opacity: indicator.opacity || 0.8,
			fillColor: indicator.fillColor,
			lineStyle: indicator.lineStyle || "solid",
			zIndex: indicator.zIndex || 1,
		};
	}

	// Priority 2: Pattern-based fallbacks for incomplete/legacy data
	console.warn(
		`[IndicatorRenderer] Using pattern fallback for: ${
			indicator.name || indicator.id
		}`
	);

	const indicatorName = (indicator.name || indicator.id || "").toLowerCase();

	// Try to find existing style configuration
	const exactMatch = DEFAULT_INDICATOR_STYLES[indicatorName];
	if (exactMatch) {
		return {
			color: indicator.color || exactMatch.color,
			yAxisID:
				(indicator.yAxisID as "price" | "oscillator" | "volume") ||
				exactMatch.yAxisID ||
				"oscillator",
			renderType: indicator.renderType || (exactMatch.renderType as any),
			strokeWidth: indicator.strokeWidth || exactMatch.strokeWidth || 2,
			opacity: indicator.opacity || exactMatch.opacity || 0.8,
			fillColor: indicator.fillColor,
			lineStyle: indicator.lineStyle || "solid",
			zIndex: indicator.zIndex || 1,
		};
	}

	// Try pattern-based matching for dynamic indicators
	if (indicatorName.includes("macd") && indicatorName.includes("signal")) {
		return {
			color: indicator.color || "#f39c12",
			yAxisID:
				(indicator.yAxisID as "price" | "oscillator" | "volume") ||
				"oscillator",
			renderType: indicator.renderType || "line",
			strokeWidth: indicator.strokeWidth || 2,
			opacity: indicator.opacity || 0.8,
			fillColor: indicator.fillColor,
			lineStyle: indicator.lineStyle || "dashed",
			zIndex: indicator.zIndex || 1,
		};
	}

	if (indicatorName.includes("macd") && indicatorName.includes("histogram")) {
		return {
			color: indicator.color || "#95a5a6",
			yAxisID:
				(indicator.yAxisID as "price" | "oscillator" | "volume") ||
				"oscillator",
			renderType: indicator.renderType || "histogram",
			strokeWidth: indicator.strokeWidth || 1,
			opacity: indicator.opacity || 0.8,
			fillColor: indicator.fillColor,
			lineStyle: indicator.lineStyle || "solid",
			zIndex: indicator.zIndex || 1,
		};
	}

	if (indicatorName.includes("macd")) {
		return {
			color: indicator.color || "#e74c3c",
			yAxisID:
				(indicator.yAxisID as "price" | "oscillator" | "volume") ||
				"oscillator",
			renderType: indicator.renderType || "line",
			strokeWidth: indicator.strokeWidth || 2,
			opacity: indicator.opacity || 0.8,
			fillColor: indicator.fillColor,
			lineStyle: indicator.lineStyle || "solid",
			zIndex: indicator.zIndex || 2,
		};
	}

	// Ultimate fallback
	console.warn(
		`[IndicatorRenderer] No pattern match found for: ${indicatorName}, using default`
	);
	return {
		color: indicator.color || "#6B7280",
		yAxisID:
			(indicator.yAxisID as "price" | "oscillator" | "volume") || "oscillator",
		renderType: indicator.renderType || "line",
		strokeWidth: indicator.strokeWidth || 2,
		opacity: indicator.opacity || 0.8,
		fillColor: indicator.fillColor,
		lineStyle: indicator.lineStyle || "solid",
		zIndex: indicator.zIndex || 1,
	};
}

export class IndicatorRenderer {
	private chartGroup: d3.Selection<any, unknown, null, undefined>;
	private xScale: d3.ScaleTime<number, number>;
	private yScale: d3.ScaleLinear<number, number>;
	private styles: IndicatorStyles;
	private warnedMissingStyles = new Set<string>(); // Track warned indicators

	constructor(
		chartGroup: d3.Selection<any, unknown, null, undefined>,
		xScale: d3.ScaleTime<number, number>,
		yScale: d3.ScaleLinear<number, number>,
		customStyles?: Partial<IndicatorStyles>
	) {
		this.chartGroup = chartGroup;
		this.xScale = xScale;
		this.yScale = yScale;
		this.styles = { ...DEFAULT_INDICATOR_STYLES };

		// Merge custom styles if provided
		if (customStyles) {
			Object.keys(customStyles).forEach((key) => {
				if (customStyles[key]) {
					this.styles[key] = customStyles[key]!;
				}
			});
		}
	}

	/**
	 * Validate indicator data format
	 */
	private validateIndicator(indicator: CalculatedIndicator): boolean {
		return !!(
			indicator?.id &&
			indicator?.data &&
			Array.isArray(indicator.data) &&
			indicator.data.length > 0 &&
			indicator.data[0]?.x !== undefined &&
			indicator.data[0]?.y !== undefined
		);
	}

	/**
	 * Filter data to only valid points with non-null y values
	 */
	private filterValidData(
		data: Array<{ x: number; y: number | null }>
	): Array<{ x: number; y: number }> {
		return data.filter(
			(d): d is { x: number; y: number } => d.y !== null && !isNaN(d.y)
		);
	}

	/**
	 * Render a line indicator
	 */
	private renderLineIndicator(
		indicator: CalculatedIndicator,
		config: IndicatorRenderConfig
	): void {
		const validData = this.filterValidData(indicator.data);

		if (validData.length === 0) {
			return;
		}

		const line = d3
			.line<{ x: number; y: number }>()
			.x((d) => this.xScale(new Date(d.x)))
			.y((d) => this.yScale(d.y))
			.curve(d3.curveMonotoneX);

		this.chartGroup
			.append("path")
			.datum(validData)
			.attr("class", `indicator-line indicator-${indicator.id}`)
			.attr("fill", "none")
			.attr("stroke", config.color)
			.attr("stroke-width", config.strokeWidth)
			.attr("opacity", config.opacity || 1)
			.attr("d", line);
	}

	/**
	 * Render a histogram indicator (for MACD histogram)
	 */
	private renderHistogramIndicator(
		indicator: CalculatedIndicator,
		config: IndicatorRenderConfig
	): void {
		const validData = this.filterValidData(indicator.data);

		if (validData.length === 0) {
			return;
		}

		const barWidth = Math.max(
			1,
			((this.xScale.range()[1] - this.xScale.range()[0]) / validData.length) *
				0.8
		);
		const zeroY = this.yScale(0);

		this.chartGroup
			.selectAll(`.histogram-bar-${indicator.id}`)
			.data(validData)
			.enter()
			.append("rect")
			.attr("class", `indicator-histogram histogram-bar-${indicator.id}`)
			.attr("x", (d) => this.xScale(new Date(d.x)) - barWidth / 2)
			.attr("y", (d) => Math.min(this.yScale(d.y), zeroY))
			.attr("width", barWidth)
			.attr("height", (d) => Math.abs(this.yScale(d.y) - zeroY))
			.attr("fill", (d) => (d.y >= 0 ? config.color : config.color))
			.attr("opacity", config.opacity || 0.7);
	}

	/**
	 * Render a band indicator (for Bollinger Bands fill area)
	 */
	private renderBandIndicator(
		indicators: CalculatedIndicator[],
		config: IndicatorRenderConfig,
		bandType: string
	): void {
		// Find upper and lower band indicators
		const upperBand = indicators.find((ind) => ind.id.includes("upper"));
		const lowerBand = indicators.find((ind) => ind.id.includes("lower"));

		if (!upperBand || !lowerBand) {
			return;
		}

		const upperData = this.filterValidData(upperBand.data);
		const lowerData = this.filterValidData(lowerBand.data);

		if (upperData.length === 0 || lowerData.length === 0) {
			return;
		}

		// Create area between upper and lower bands
		const area = d3
			.area<{ x: number; upper: number; lower: number }>()
			.x((d) => this.xScale(new Date(d.x)))
			.y0((d) => this.yScale(d.lower))
			.y1((d) => this.yScale(d.upper))
			.curve(d3.curveMonotoneX);

		// Combine upper and lower data
		const combinedData = upperData
			.map((upper, i) => {
				const lower = lowerData.find((l) => l.x === upper.x);
				return lower ? { x: upper.x, upper: upper.y, lower: lower.y } : null;
			})
			.filter(Boolean) as { x: number; upper: number; lower: number }[];

		if (combinedData.length > 0) {
			this.chartGroup
				.append("path")
				.datum(combinedData)
				.attr("class", `indicator-band indicator-${bandType}`)
				.attr("d", area)
				.attr("fill", config.color)
				.attr("opacity", config.opacity || 0.1);
		}
	}

	/**
	 * Render all indicators with proper type handling
	 */
	public renderIndicators(indicators: CalculatedIndicator[]): void {
		// Clear previous indicators
		this.chartGroup.selectAll(".indicator-line").remove();
		this.chartGroup.selectAll(".indicator-band").remove();
		this.chartGroup.selectAll(".indicator-histogram").remove();

		// Group indicators for band rendering (Bollinger Bands)
		const bandGroups = new Map<string, CalculatedIndicator[]>();
		const singleIndicators: CalculatedIndicator[] = [];

		indicators.forEach((indicator) => {
			if (!this.validateIndicator(indicator)) {
				return;
			}

			// Group Bollinger Bands for area rendering
			if (indicator.id.includes("bollingerBands")) {
				const baseKey = indicator.id.replace(/_upper|_middle|_lower/, "");
				if (!bandGroups.has(baseKey)) {
					bandGroups.set(baseKey, []);
				}
				bandGroups.get(baseKey)!.push(indicator);
			} else {
				singleIndicators.push(indicator);
			}
		});

		// Render band groups first (so they appear behind lines)
		bandGroups.forEach((bandIndicators, bandKey) => {
			const config = this.styles[bandIndicators[0].id] || {
				color: "#9b59b6",
				strokeWidth: 1,
				renderType: "band",
			};
			this.renderBandIndicator(bandIndicators, config, bandKey);

			// Also render individual band lines
			bandIndicators.forEach((indicator) => {
				const lineConfig = this.styles[indicator.id];
				if (lineConfig) {
					this.renderLineIndicator(indicator, lineConfig);
				}
			});
		});

		// Render individual indicators
		singleIndicators.forEach((indicator) => {
			try {
				// Use the new hybrid configuration system
				const config = getIndicatorConfig(indicator);

				// Convert IndicatorConfig to IndicatorRenderConfig format
				const renderConfig: IndicatorRenderConfig = {
					color: config.color,
					strokeWidth: config.strokeWidth,
					opacity: config.opacity,
					yAxisID: config.yAxisID,
					renderType: config.renderType as "line" | "band" | "histogram",
				};

				switch (config.renderType) {
					case "line":
						this.renderLineIndicator(indicator, renderConfig);
						break;
					case "histogram":
						this.renderHistogramIndicator(indicator, renderConfig);
						break;
					case "band":
						// Bands are handled in groups above
						this.renderLineIndicator(indicator, config);
						break;
					default:
						this.renderLineIndicator(indicator, config);
				}
			} catch (error) {
				console.error(
					`[IndicatorRenderer] Failed to render ${indicator.id}:`,
					error
				);
			}
		});
	}

	/**
	 * Update scales for zoom/pan operations
	 */
	public updateScales(
		xScale: d3.ScaleTime<number, number>,
		yScale: d3.ScaleLinear<number, number>
	): void {
		this.xScale = xScale;
		this.yScale = yScale;
	}
}
