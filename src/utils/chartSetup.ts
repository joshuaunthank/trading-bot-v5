import * as d3 from "d3";

// D3.js Chart Configuration and Utilities for Trading Bot

// Chart dimensions and layout configuration
export const CHART_CONFIG = {
	// Standard dimensions
	width: 1200,
	height: 600,
	margin: { top: 20, right: 80, bottom: 40, left: 60 },

	// Panel allocation (percentages)
	panels: {
		price: 0.65, // 65% for price/indicators overlay
		volume: 0.15, // 15% for volume
		oscillator: 0.2, // 20% for oscillators (RSI, etc.)
	},

	// Color scheme for candlesticks
	colors: {
		bullish: "#26a69a",
		bearish: "#ef5350",
		volume: "#90a4ae",
		grid: "#37474f",
		text: "#ffffff",
		background: "#1e1e1e",
	},

	// Animation and performance settings
	animation: {
		duration: 250,
		easing: d3.easeLinear,
	},

	// Data limits for performance
	maxCandles: 2000,
	maxIndicatorPoints: 2000,
};

// Utility functions for D3.js charts
export const ChartUtils = {
	// Calculate chart dimensions excluding margins - now accepts dynamic dimensions
	getInnerDimensions: (width?: number, height?: number) => ({
		width:
			(width || CHART_CONFIG.width) -
			CHART_CONFIG.margin.left -
			CHART_CONFIG.margin.right,
		height:
			(height || CHART_CONFIG.height) -
			CHART_CONFIG.margin.top -
			CHART_CONFIG.margin.bottom,
	}),

	// Calculate panel heights based on configuration - now accepts dynamic height
	getPanelHeights: (height?: number) => {
		const innerHeight =
			(height || CHART_CONFIG.height) -
			CHART_CONFIG.margin.top -
			CHART_CONFIG.margin.bottom;
		return {
			price: innerHeight * CHART_CONFIG.panels.price,
			volume: innerHeight * CHART_CONFIG.panels.volume,
			oscillator: innerHeight * CHART_CONFIG.panels.oscillator,
		};
	},

	// Get Y positions for each panel - now accepts dynamic height
	getPanelPositions: (height?: number) => {
		const heights = ChartUtils.getPanelHeights(height);
		return {
			price: 0,
			volume: heights.price,
			oscillator: heights.price + heights.volume,
		};
	},

	// Format price values
	formatPrice: d3.format(",.2f"),

	// Format volume values
	formatVolume: d3.format(",.0f"),

	// Format time based on timeframe
	formatTime: (timeframe: string) => {
		switch (timeframe) {
			case "1h":
				return d3.timeFormat("%H:%M");
			case "4h":
				return d3.timeFormat("%m/%d %H:%M");
			case "1d":
				return d3.timeFormat("%m/%d");
			default:
				return d3.timeFormat("%m/%d %H:%M");
		}
	},

	// Calculate candlestick width based on data density - now accepts dynamic width
	calculateCandleWidth: (xScale: any, dataLength: number, width?: number) => {
		const innerWidth =
			(width || CHART_CONFIG.width) -
			CHART_CONFIG.margin.left -
			CHART_CONFIG.margin.right;
		const availableWidth = innerWidth * 0.8; // 80% of width for candles
		return Math.max(1, Math.min(8, availableWidth / dataLength));
	},

	// Throttle function for performance
	throttle: <T extends (...args: any[]) => any>(func: T, delay: number): T => {
		let timeoutId: NodeJS.Timeout | null = null;
		let lastExecTime = 0;

		return ((...args: any[]) => {
			const currentTime = Date.now();

			if (currentTime - lastExecTime > delay) {
				func(...args);
				lastExecTime = currentTime;
			} else {
				if (timeoutId) clearTimeout(timeoutId);
				timeoutId = setTimeout(() => {
					func(...args);
					lastExecTime = Date.now();
				}, delay - (currentTime - lastExecTime));
			}
		}) as T;
	},
};

// Performance monitoring for streaming updates
export const PerformanceMonitor = {
	updateTimes: [] as number[],

	startTimer: () => performance.now(),

	endTimer: (startTime: number, operation: string) => {
		const duration = performance.now() - startTime;
		PerformanceMonitor.updateTimes.push(duration);

		// Keep only last 100 measurements
		if (PerformanceMonitor.updateTimes.length > 100) {
			PerformanceMonitor.updateTimes =
				PerformanceMonitor.updateTimes.slice(-100);
		}

		// Warn if update takes more than 16ms (60fps threshold)
		if (duration > 16) {
			console.warn(
				`[D3 Performance] Slow ${operation}: ${duration.toFixed(2)}ms`
			);
		}

		return duration;
	},

	getAverageUpdateTime: () => {
		if (PerformanceMonitor.updateTimes.length === 0) return 0;
		const sum = PerformanceMonitor.updateTimes.reduce((a, b) => a + b, 0);
		return sum / PerformanceMonitor.updateTimes.length;
	},
};

// Export D3 instance for convenience
export { d3 };
export default d3;
