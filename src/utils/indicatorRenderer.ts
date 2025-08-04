/**
 * Comprehensive Indicator Rendering System
 * Handles all indicator types with proper validation, logging, and error handling
 */

import * as d3 from "d3";
import { CalculatedIndicator } from "../types/indicators";

export interface IndicatorRenderConfig {
	color: string;
	strokeWidth: number;
	opacity?: number;
	yAxisID?: "price" | "oscillator" | "volume";
	renderType: "line" | "band" | "histogram";
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
	 * Validate indicator data format and log issues
	 */
	private validateIndicator(indicator: CalculatedIndicator): boolean {
		if (!indicator) {
			console.warn("[IndicatorRenderer] Null indicator received");
			return false;
		}

		if (!indicator.id) {
			console.warn("[IndicatorRenderer] Indicator missing ID:", indicator);
			return false;
		}

		if (!indicator.data || !Array.isArray(indicator.data)) {
			console.warn(
				`[IndicatorRenderer] Indicator ${indicator.id} missing or invalid data:`,
				indicator.data
			);
			return false;
		}

		if (indicator.data.length === 0) {
			console.warn(
				`[IndicatorRenderer] Indicator ${indicator.id} has empty data array`
			);
			return false;
		}

		// Check data point format
		const samplePoint = indicator.data[0];
		if (
			!samplePoint ||
			typeof samplePoint.x === "undefined" ||
			typeof samplePoint.y === "undefined"
		) {
			console.warn(
				`[IndicatorRenderer] Indicator ${indicator.id} has invalid data point format:`,
				samplePoint
			);
			return false;
		}

		return true;
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
			console.warn(
				`[IndicatorRenderer] No valid data points for ${indicator.id}`
			);
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
	 * Render all indicators with comprehensive validation and error handling
	 */
	public renderIndicators(indicators: CalculatedIndicator[]): void {
		// Clear previous indicators
		this.chartGroup.selectAll(".indicator-line").remove();
		this.chartGroup.selectAll(".indicator-band").remove();
		this.chartGroup.selectAll(".indicator-histogram").remove();

		let renderedCount = 0;
		let failedCount = 0;

		indicators.forEach((indicator) => {
			try {
				if (!this.validateIndicator(indicator)) {
					failedCount++;
					return;
				}

				const config = this.styles[indicator.id];
				if (!config) {
					// Only warn once per missing indicator style
					if (!this.warnedMissingStyles.has(indicator.id)) {
						console.warn(
							`[IndicatorRenderer] No style configuration for indicator ${indicator.id}, using default line style`
						);
						this.warnedMissingStyles.add(indicator.id);
					}
					// Use default line style for unknown indicators
					this.renderLineIndicator(indicator, {
						color: "#666666",
						strokeWidth: 1.5,
						renderType: "line",
					});
				} else {
					switch (config.renderType) {
						case "line":
							this.renderLineIndicator(indicator, config);
							break;
						case "band":
							// TODO: Implement band rendering for Bollinger Bands fill areas
							this.renderLineIndicator(indicator, config);
							break;
						case "histogram":
							// TODO: Implement histogram rendering for MACD histogram
							this.renderLineIndicator(indicator, config);
							break;
						default:
							console.warn(
								`[IndicatorRenderer] Unknown render type ${config.renderType} for ${indicator.id}`
							);
							this.renderLineIndicator(indicator, config);
					}
				}

				renderedCount++;
			} catch (error) {
				console.error(
					`[IndicatorRenderer] Failed to render indicator ${indicator.id}:`,
					error
				);
				failedCount++;
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
