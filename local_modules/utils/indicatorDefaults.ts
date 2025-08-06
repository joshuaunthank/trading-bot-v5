/**
 * Intelligent Indicator Defaults System
 *
 * Provides proper yAxisID, renderType, colors, and styling defaults for all indicator types.
 * This ensures indicators are displayed correctly even without user customization.
 */

export interface IndicatorDefaultConfig {
	yAxisID: "price" | "oscillator" | "volume";
	renderType: "line" | "histogram" | "area" | "band";
	color: string;
	strokeWidth: number;
	opacity?: number;
	fillColor?: string;
	lineStyle?: "solid" | "dashed" | "dotted";
	zIndex?: number;
}

/**
 * Comprehensive defaults for all indicator types
 * Maps indicator type patterns to their optimal display configuration
 */
export const INDICATOR_DEFAULTS: Record<string, IndicatorDefaultConfig> = {
	// Moving Averages - Price Axis
	ema: {
		yAxisID: "price",
		renderType: "line",
		color: "#ff6b35",
		strokeWidth: 2,
		zIndex: 3,
	},
	sma: {
		yAxisID: "price",
		renderType: "line",
		color: "#4ecdc4",
		strokeWidth: 2,
		zIndex: 3,
	},

	// Oscillators - Oscillator Axis
	rsi: {
		yAxisID: "oscillator",
		renderType: "line",
		color: "#45b7d1",
		strokeWidth: 2,
		zIndex: 2,
	},
	atr: {
		yAxisID: "oscillator",
		renderType: "line",
		color: "#e67e22",
		strokeWidth: 2,
		zIndex: 2,
	},
	cci: {
		yAxisID: "oscillator",
		renderType: "line",
		color: "#9b59b6",
		strokeWidth: 2,
		zIndex: 2,
	},
	adx: {
		yAxisID: "oscillator",
		renderType: "line",
		color: "#f39c12",
		strokeWidth: 2,
		zIndex: 2,
	},

	// MACD Components - Oscillator Axis
	macd_line: {
		yAxisID: "oscillator",
		renderType: "line",
		color: "#e74c3c",
		strokeWidth: 2,
		zIndex: 2,
	},
	macd_signal: {
		yAxisID: "oscillator",
		renderType: "line",
		color: "#f39c12",
		strokeWidth: 2,
		zIndex: 2,
	},
	macd_histogram: {
		yAxisID: "oscillator",
		renderType: "histogram",
		color: "#95a5a6",
		strokeWidth: 1,
		fillColor: "#95a5a6",
		opacity: 0.7,
		zIndex: 1,
	},

	// Bollinger Bands - Price Axis
	bb_upper: {
		yAxisID: "price",
		renderType: "line",
		color: "#9b59b6",
		strokeWidth: 1.5,
		opacity: 0.8,
		lineStyle: "dashed",
		zIndex: 2,
	},
	bb_middle: {
		yAxisID: "price",
		renderType: "line",
		color: "#9b59b6",
		strokeWidth: 2,
		zIndex: 3,
	},
	bb_lower: {
		yAxisID: "price",
		renderType: "line",
		color: "#9b59b6",
		strokeWidth: 1.5,
		opacity: 0.8,
		lineStyle: "dashed",
		zIndex: 2,
	},

	// Stochastic - Oscillator Axis
	stoch_k: {
		yAxisID: "oscillator",
		renderType: "line",
		color: "#1abc9c",
		strokeWidth: 2,
		zIndex: 2,
	},
	stoch_d: {
		yAxisID: "oscillator",
		renderType: "line",
		color: "#e67e22",
		strokeWidth: 2,
		zIndex: 2,
	},

	// Volume Indicators - Volume Axis
	vwap: {
		yAxisID: "price", // VWAP goes on price axis
		renderType: "line",
		color: "#34495e",
		strokeWidth: 2,
		zIndex: 3,
	},
	obv: {
		yAxisID: "volume",
		renderType: "line",
		color: "#34495e",
		strokeWidth: 2,
		zIndex: 2,
	},
	volume: {
		yAxisID: "volume",
		renderType: "histogram",
		color: "#34495e",
		strokeWidth: 1,
		fillColor: "#34495e",
		opacity: 0.6,
		zIndex: 1,
	},
};

/**
 * Get intelligent defaults for an indicator type
 * Uses pattern matching to handle dynamic indicator naming
 */
export function getIndicatorDefaults(
	indicatorType: string,
	indicatorId: string
): IndicatorDefaultConfig {
	const type = indicatorType.toLowerCase();

	// Direct type match
	if (INDICATOR_DEFAULTS[type]) {
		return { ...INDICATOR_DEFAULTS[type] };
	}

	// Pattern matching for dynamic naming
	if (type.includes("macd")) {
		if (indicatorId.includes("_macd") || indicatorId.includes("_line")) {
			return { ...INDICATOR_DEFAULTS["macd_line"] };
		}
		if (indicatorId.includes("_signal")) {
			return { ...INDICATOR_DEFAULTS["macd_signal"] };
		}
		if (indicatorId.includes("_histogram")) {
			return { ...INDICATOR_DEFAULTS["macd_histogram"] };
		}
		return { ...INDICATOR_DEFAULTS["macd_line"] }; // Default to line
	}

	if (type.includes("bb") || type.includes("bollinger")) {
		if (indicatorId.includes("_upper")) {
			return { ...INDICATOR_DEFAULTS["bb_upper"] };
		}
		if (indicatorId.includes("_middle")) {
			return { ...INDICATOR_DEFAULTS["bb_middle"] };
		}
		if (indicatorId.includes("_lower")) {
			return { ...INDICATOR_DEFAULTS["bb_lower"] };
		}
		return { ...INDICATOR_DEFAULTS["bb_middle"] }; // Default to middle
	}

	if (type.includes("stoch")) {
		if (indicatorId.includes("_k") || indicatorId.includes("_fast")) {
			return { ...INDICATOR_DEFAULTS["stoch_k"] };
		}
		if (indicatorId.includes("_d") || indicatorId.includes("_slow")) {
			return { ...INDICATOR_DEFAULTS["stoch_d"] };
		}
		return { ...INDICATOR_DEFAULTS["stoch_k"] }; // Default to %K
	}

	// Fallback patterns by category
	if (type.includes("ema") || type.includes("sma") || type.includes("ma")) {
		return { ...INDICATOR_DEFAULTS["ema"] };
	}

	if (
		type.includes("rsi") ||
		type.includes("atr") ||
		type.includes("cci") ||
		type.includes("adx")
	) {
		return { ...INDICATOR_DEFAULTS["rsi"] };
	}

	if (type.includes("volume") || type.includes("obv")) {
		return { ...INDICATOR_DEFAULTS["volume"] };
	}

	// Ultimate fallback - generic line indicator
	return {
		yAxisID: "price",
		renderType: "line",
		color: "#6B7280", // Gray fallback
		strokeWidth: 2,
		zIndex: 2,
	};
}

/**
 * Extract color from strategy parameter configuration
 * Looks for color fields in indicator parameters
 */
export function extractUserColor(
	indicatorParams: Record<string, any>
): string | null {
	// Check common color parameter names
	const colorFields = ["color", "lineColor", "fillColor", "strokeColor"];

	for (const field of colorFields) {
		if (indicatorParams[field] && typeof indicatorParams[field] === "string") {
			return indicatorParams[field];
		}
	}

	return null;
}

/**
 * Create complete indicator metadata by merging user settings with intelligent defaults
 */
export function createIndicatorMetadata(
	indicatorType: string,
	indicatorId: string,
	userParams: Record<string, any> = {}
): IndicatorDefaultConfig {
	// Start with intelligent defaults
	const defaults = getIndicatorDefaults(indicatorType, indicatorId);

	// Override with user color if provided
	const userColor = extractUserColor(userParams);
	if (userColor) {
		defaults.color = userColor;
		// Also set fillColor for histograms/areas if user specified a color
		if (defaults.renderType === "histogram" || defaults.renderType === "area") {
			defaults.fillColor = userColor;
		}
	}

	// Allow user overrides for other properties
	if (userParams.strokeWidth !== undefined) {
		defaults.strokeWidth = userParams.strokeWidth;
	}
	if (userParams.opacity !== undefined) {
		defaults.opacity = userParams.opacity;
	}
	if (userParams.lineStyle !== undefined) {
		defaults.lineStyle = userParams.lineStyle;
	}

	return defaults;
}
