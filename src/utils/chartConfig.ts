import { ChartConfiguration, ChartDataset } from "chart.js";
import { CalculatedIndicator, OHLCVData } from "../types/indicators";

export interface ChartConfig {
	type: "price" | "oscillator" | "volume";
	showPrice: boolean;
	showVolume: boolean;
	indicators: CalculatedIndicator[];
	height: number;
}

export interface SignalAnnotation {
	timestamp: number;
	type: "buy" | "sell";
	price: number;
	confidence?: number;
	note?: string;
}

/**
 * Creates a clean, optimized Chart.js configuration
 */
export const createChartConfiguration = (
	data: OHLCVData[],
	config: ChartConfig,
	symbol: string,
	signals: SignalAnnotation[] = []
): ChartConfiguration => {
	const datasets: ChartDataset<any, any>[] = [];

	// Add OHLCV price data
	if (config.showPrice && data.length > 0) {
		// Use line chart for price data (more reliable than candlestick)
		datasets.push({
			type: "line",
			label: `${symbol} Price`,
			data: data.map((d) => ({ x: d.timestamp, y: d.close })),
			borderColor: "#00D2FF",
			backgroundColor: "rgba(0, 210, 255, 0.1)",
			borderWidth: 2,
			pointRadius: 0,
			pointHoverRadius: 4,
			tension: 0.1,
			yAxisID: "y",
			fill: false,
		});
	}

	// Add volume data
	if (config.showVolume && data.length > 0) {
		datasets.push({
			type: "bar",
			label: "Volume",
			data: data.map((d) => ({ x: d.timestamp, y: d.volume })),
			borderColor: "#FFB800",
			backgroundColor: "rgba(255, 184, 0, 0.6)", // Increased opacity for better visibility
			borderWidth: 0, // Remove border for cleaner look
			yAxisID: config.type === "volume" ? "y" : "y1",
		});
	}

	// Add indicator datasets
	config.indicators.forEach((indicator, index) => {
		const yAxisID = getIndicatorYAxis(indicator, config.type, index);

		datasets.push({
			type: "line",
			label: indicator.name,
			data: indicator.data.filter((point) => point.y !== null),
			borderColor: indicator.color,
			backgroundColor: `${indicator.color}20`,
			borderWidth: 2,
			pointRadius: 0,
			pointHoverRadius: 4,
			tension: 0.1,
			yAxisID,
			fill: false,
		});
	});

	// Create scales configuration
	const scales = createScalesConfiguration(config);

	// Create signal annotations
	const annotations = createSignalAnnotations(signals, config.type === "price");

	return {
		type: "line",
		data: { datasets },
		options: {
			responsive: true,
			maintainAspectRatio: false,
			animation: {
				duration: 0, // Disable animations for better performance
			},
			interaction: {
				intersect: false,
				mode: "index",
			},
			elements: {
				point: {
					radius: 0,
					hoverRadius: 6,
				},
				line: {
					tension: 0.1,
				},
			},
			scales,
			plugins: {
				legend: {
					display: true,
					position: "top" as const,
					align: "start" as const,
					labels: {
						color: "#ffffff",
						usePointStyle: true,
						padding: 12,
						font: {
							size: 11,
						},
						filter: (legendItem) => {
							// Show only important labels to avoid clutter
							return (
								!legendItem.text?.includes("Volume") || config.type === "volume"
							);
						},
					},
				},
				tooltip: {
					backgroundColor: "rgba(0, 0, 0, 0.8)",
					titleColor: "#ffffff",
					bodyColor: "#ffffff",
					borderColor: "#333333",
					borderWidth: 1,
				},
				zoom: {
					pan: {
						enabled: true,
						mode: "x",
					},
					zoom: {
						wheel: {
							enabled: true,
							speed: 0.1,
						},
						pinch: {
							enabled: true,
						},
						mode: "x",
					},
				},
				annotation: {
					annotations,
				},
			},
		},
	};
};

/**
 * Determines the appropriate Y-axis for an indicator
 */
function getIndicatorYAxis(
	indicator: CalculatedIndicator,
	panelType: string,
	index: number
): string {
	if (panelType === "price") {
		return "y"; // Price-based indicators use main axis
	} else if (panelType === "oscillator") {
		// Each oscillator type gets its own axis for better scaling
		const baseType = indicator.type.replace(/_.*/, ""); // Remove suffixes like _line, _signal
		return `y_${baseType}`;
	} else {
		return "y"; // Volume panel uses main axis
	}
}

/**
 * Creates scales configuration based on panel type
 */
function createScalesConfiguration(config: ChartConfig) {
	const baseScale = {
		grid: {
			color: "rgba(255, 255, 255, 0.1)",
			drawBorder: false,
		},
		ticks: {
			color: "#ffffff",
			font: {
				size: 11,
			},
		},
	};

	const scales: any = {
		x: {
			type: "time",
			time: {
				displayFormats: {
					minute: "HH:mm",
					hour: "MMM d, HH:mm",
					day: "MMM d",
					week: "MMM d",
					month: "MMM yyyy",
				},
			},
			...baseScale,
		},
		y: {
			type: "linear",
			position: "right",
			...baseScale,
		},
	};

	// Add additional Y-axes for oscillators
	if (config.type === "oscillator") {
		// Create unique axes for different oscillator types
		const oscillatorTypes = Array.from(
			new Set(config.indicators.map((ind) => ind.type.replace(/_.*/, "")))
		);

		oscillatorTypes.forEach((type, index) => {
			if (index === 0) return; // First one uses main 'y' axis

			scales[`y_${type}`] = {
				type: "linear",
				position: index % 2 === 0 ? "left" : "right",
				grid: {
					display: false, // Hide grid for secondary axes
				},
				ticks: {
					color: "#888888",
					font: {
						size: 10,
					},
				},
			};
		});
	}

	return scales;
}

/**
 * Creates signal annotations for trading signals
 */
function createSignalAnnotations(
	signals: SignalAnnotation[],
	isPricePanel: boolean
) {
	if (!isPricePanel || signals.length === 0) {
		return {};
	}

	const annotations: any = {};

	signals.forEach((signal, index) => {
		const isBuy = signal.type === "buy";
		const color = isBuy ? "#00FF88" : "#FF4757";

		annotations[`signal_${index}`] = {
			type: "point",
			xValue: signal.timestamp,
			yValue: signal.price,
			backgroundColor: color,
			borderColor: color,
			borderWidth: 2,
			radius: 6,
			label: {
				content: isBuy ? "▲ BUY" : "▼ SELL",
				enabled: true,
				position: isBuy ? "start" : "end",
				backgroundColor: color,
				color: "#000000",
				font: {
					size: 10,
					weight: "bold",
				},
				padding: 4,
			},
		};
	});

	return annotations;
}

/**
 * Calculates optimal panel heights based on content
 */
export const calculatePanelHeights = (
	totalHeight: number,
	hasOscillators: boolean,
	hasVolume: boolean
) => {
	if (hasOscillators && hasVolume) {
		return {
			price: Math.floor(totalHeight * 0.6),
			oscillator: Math.floor(totalHeight * 0.25),
			volume: Math.floor(totalHeight * 0.15),
		};
	} else if (hasOscillators) {
		return {
			price: Math.floor(totalHeight * 0.7),
			oscillator: Math.floor(totalHeight * 0.3),
			volume: 0,
		};
	} else if (hasVolume) {
		return {
			price: Math.floor(totalHeight * 0.8),
			oscillator: 0,
			volume: Math.floor(totalHeight * 0.2),
		};
	} else {
		return {
			price: totalHeight,
			oscillator: 0,
			volume: 0,
		};
	}
};

/**
 * Gets default colors for indicator types
 */
export const getIndicatorColor = (type: string, index: number): string => {
	const colorMap: Record<string, string> = {
		// Moving averages
		ema: "#00D2FF",
		sma: "#FF6B6B",

		// Oscillators
		rsi: "#FFE66D",
		macd_line: "#FF6384",
		macd_signal: "#36A2EB",
		macd_histogram: "#9966FF",

		// Bollinger Bands
		bb_upper: "#EF4444",
		bb_middle: "#6B7280",
		bb_lower: "#EF4444",

		// Volume
		volume: "#FFB800",
		obv: "#F97316",

		// Others
		atr: "#9333EA",
		adx: "#A855F7",
		stoch: "#06B6D4",
	};

	return (
		colorMap[type.toLowerCase()] || `hsl(${(index * 137.5) % 360}, 70%, 60%)`
	);
};
