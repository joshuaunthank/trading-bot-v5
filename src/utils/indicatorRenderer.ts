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

	// VWAP pattern
	if (indicatorName.includes("vwap")) {
		return {
			color: indicator.color || "#8e44ad",
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

export interface IndicatorRenderConfig {
	color: string;
	strokeWidth: number;
	opacity?: number;
	yAxisID?: "price" | "oscillator" | "volume";
	renderType: "line" | "band" | "histogram";
}

/**
 * Simplified indicator renderer that uses the new hybrid getIndicatorConfig
 */
export class IndicatorRenderer {
	private svg: d3.Selection<SVGGElement, unknown, null, undefined>;
	private dimensions: { width: number; height: number };
	private priceScale: d3.ScaleLinear<number, number>;
	private oscillatorScale: d3.ScaleLinear<number, number>;
	private timeScale: d3.ScaleTime<number, number>;

	constructor(
		svg: d3.Selection<SVGGElement, unknown, null, undefined>,
		dimensions: { width: number; height: number },
		scales: {
			priceScale: d3.ScaleLinear<number, number>;
			oscillatorScale: d3.ScaleLinear<number, number>;
			timeScale: d3.ScaleTime<number, number>;
		}
	) {
		this.svg = svg;
		this.dimensions = dimensions;
		this.priceScale = scales.priceScale;
		this.oscillatorScale = scales.oscillatorScale;
		this.timeScale = scales.timeScale;
	}

	/**
	 * Render all indicators using the new hybrid configuration system
	 */
	renderIndicators(indicators: CalculatedIndicator[]): void {
		// Clear previous indicators
		this.svg.selectAll(".indicator-group").remove();

		indicators.forEach((indicator) => {
			try {
				// Use the new hybrid configuration system
				const config = getIndicatorConfig(indicator);

				console.log(
					`[IndicatorRenderer] Rendering ${
						indicator.name || indicator.id
					} with config:`,
					config
				);

				// Render based on type
				switch (config.renderType) {
					case "line":
					case "area":
						this.renderLineIndicator(indicator, config);
						break;
					case "histogram":
						this.renderHistogramIndicator(indicator, config);
						break;
					case "band":
						this.renderBandIndicator(indicator, config);
						break;
					default:
						console.warn(
							`[IndicatorRenderer] Unknown render type: ${config.renderType}`
						);
						this.renderLineIndicator(indicator, config);
				}
			} catch (error) {
				console.error(
					`[IndicatorRenderer] Error rendering indicator ${
						indicator.name || indicator.id
					}:`,
					error
				);
			}
		});
	}

	private renderLineIndicator(
		indicator: CalculatedIndicator,
		config: IndicatorConfig
	): void {
		if (!indicator.data || indicator.data.length === 0) {
			console.warn(
				`[IndicatorRenderer] No data for indicator: ${
					indicator.name || indicator.id
				}`
			);
			return;
		}

		const scale =
			config.yAxisID === "price" ? this.priceScale : this.oscillatorScale;

		const line = d3
			.line<{ x: number; y: number | null }>()
			.x((d) => this.timeScale(new Date(d.x)))
			.y((d) => (d.y !== null ? scale(d.y) : 0))
			.defined((d) => d.y !== null)
			.curve(d3.curveLinear);

		const indicatorGroup = this.svg
			.append("g")
			.attr("class", `indicator-group indicator-${indicator.id}`);

		indicatorGroup
			.append("path")
			.datum(indicator.data)
			.attr("fill", "none")
			.attr("stroke", config.color)
			.attr("stroke-width", config.strokeWidth)
			.attr("stroke-opacity", config.opacity)
			.attr(
				"stroke-dasharray",
				config.lineStyle === "dashed"
					? "5,5"
					: config.lineStyle === "dotted"
					? "2,2"
					: null
			)
			.attr("d", line);
	}

	private renderHistogramIndicator(
		indicator: CalculatedIndicator,
		config: IndicatorConfig
	): void {
		if (!indicator.data || indicator.data.length === 0) {
			console.warn(
				`[IndicatorRenderer] No data for histogram indicator: ${
					indicator.name || indicator.id
				}`
			);
			return;
		}

		const scale =
			config.yAxisID === "price" ? this.priceScale : this.oscillatorScale;
		const zeroLine = scale(0);

		const indicatorGroup = this.svg
			.append("g")
			.attr("class", `indicator-group indicator-histogram-${indicator.id}`);

		const barWidth = Math.max(1, this.dimensions.width / indicator.data.length);

		indicatorGroup
			.selectAll(".histogram-bar")
			.data(indicator.data.filter((d) => d.y !== null))
			.enter()
			.append("rect")
			.attr("class", "histogram-bar")
			.attr("x", (d) => this.timeScale(new Date(d.x)) - barWidth / 2)
			.attr("y", (d) => Math.min(scale(d.y!), zeroLine))
			.attr("width", barWidth)
			.attr("height", (d) => Math.abs(scale(d.y!) - zeroLine))
			.attr("fill", config.color)
			.attr("fill-opacity", config.opacity);
	}

	private renderBandIndicator(
		indicator: CalculatedIndicator,
		config: IndicatorConfig
	): void {
		// Placeholder for band rendering (Bollinger Bands, etc.)
		console.log(
			`[IndicatorRenderer] Band rendering not yet implemented for: ${
				indicator.name || indicator.id
			}`
		);
		this.renderLineIndicator(indicator, config);
	}
}
