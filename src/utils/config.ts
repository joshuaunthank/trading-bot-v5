/**
 * Centralized configuration for the trading bot frontend
 * Eliminates hard-coded values scattered throughout components
 */

export const CONFIG = {
	// Default trading parameters
	DEFAULT_SYMBOL: "BTCUSDT",
	DEFAULT_TIMEFRAME: "1h",
	DEFAULT_LIMIT: 1000,

	// Available timeframes for selection
	TIMEFRAMES: [
		{ value: "1m", label: "1 Minute" },
		{ value: "5m", label: "5 Minutes" },
		{ value: "15m", label: "15 Minutes" },
		{ value: "30m", label: "30 Minutes" },
		{ value: "1h", label: "1 Hour" },
		{ value: "4h", label: "4 Hours" },
		{ value: "1d", label: "1 Day" },
	],

	// Available symbols for trading
	SYMBOLS: [
		{ value: "BTCUSDT", label: "BTC/USDT" },
		{ value: "ETHUSDT", label: "ETH/USDT" },
		{ value: "BNBUSDT", label: "BNB/USDT" },
		{ value: "ADAUSDT", label: "ADA/USDT" },
		{ value: "DOTUSDT", label: "DOT/USDT" },
	],

	// Chart configuration
	CHART: {
		DEFAULT_HEIGHT: 400,
		RESPONSIVE_HEIGHTS: {
			mobile: 300,
			tablet: 400,
			desktop: 520,
		},
		DEFAULT_PANEL_COUNT: 2,
		MAX_PANELS: 4,
	},

	// WebSocket configuration
	WEBSOCKET: {
		RECONNECT_DELAY: 1000,
		MAX_RECONNECT_ATTEMPTS: 5,
		PING_INTERVAL: 30000,
	},

	// Local storage keys
	STORAGE_KEYS: {
		SELECTED_SYMBOL: "selectedSymbol",
		SELECTED_TIMEFRAME: "selectedTimeframe",
		SELECTED_STRATEGY: "selectedIndicatorStrategy",
		CHART_CONFIG: "chartConfig",
		UI_PREFERENCES: "uiPreferences",
	},

	// UI preferences
	UI: {
		SIDEBAR_WIDTH: 300,
		MOBILE_BREAKPOINT: 768,
		TABLET_BREAKPOINT: 1024,
	},
} as const;

// Type helpers
export type Timeframe = (typeof CONFIG.TIMEFRAMES)[number]["value"];
export type Symbol = (typeof CONFIG.SYMBOLS)[number]["value"];

// Utility functions
export const getTimeframeLabel = (value: string): string => {
	return CONFIG.TIMEFRAMES.find((tf) => tf.value === value)?.label || value;
};

export const getSymbolLabel = (value: string): string => {
	return CONFIG.SYMBOLS.find((s) => s.value === value)?.label || value;
};

export const getResponsiveChartHeight = (): number => {
	if (typeof window !== "undefined") {
		if (window.innerWidth >= CONFIG.UI.TABLET_BREAKPOINT)
			return CONFIG.CHART.RESPONSIVE_HEIGHTS.desktop;
		if (window.innerWidth >= CONFIG.UI.MOBILE_BREAKPOINT)
			return CONFIG.CHART.RESPONSIVE_HEIGHTS.tablet;
		return CONFIG.CHART.RESPONSIVE_HEIGHTS.mobile;
	}
	return CONFIG.CHART.DEFAULT_HEIGHT;
};
