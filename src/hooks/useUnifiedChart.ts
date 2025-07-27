import { useState, useEffect, useMemo, useCallback } from "react";
import { CalculatedIndicator } from "../types/indicators";

interface ChartState {
	zoomState: {
		min?: number;
		max?: number;
	} | null;
	selectedTimeframe: string;
	signals: Array<{
		timestamp: number;
		type: "buy" | "sell";
		price: number;
		confidence?: number;
		note?: string;
	}>;
	isZoomed: boolean;
}

interface UseUnifiedChartOptions {
	initialTimeframe?: string;
	enableSignals?: boolean;
}

export const useUnifiedChart = (options: UseUnifiedChartOptions = {}) => {
	const { initialTimeframe = "1h", enableSignals = true } = options;

	const [chartState, setChartState] = useState<ChartState>({
		zoomState: null,
		selectedTimeframe: initialTimeframe,
		signals: [],
		isZoomed: false,
	});

	// Timeframe change handler
	const handleTimeframeChange = useCallback((timeframe: string) => {
		setChartState((prev) => ({
			...prev,
			selectedTimeframe: timeframe,
			zoomState: null, // Reset zoom when timeframe changes
			isZoomed: false,
		}));
	}, []);

	// Zoom state handler
	const handleZoomChange = useCallback((zoomState: any) => {
		setChartState((prev) => ({
			...prev,
			zoomState,
			isZoomed: Boolean(zoomState?.min || zoomState?.max),
		}));
	}, []);

	// Reset zoom
	const resetZoom = useCallback(() => {
		setChartState((prev) => ({
			...prev,
			zoomState: null,
			isZoomed: false,
		}));
	}, []);

	// Add trading signal
	const addSignal = useCallback(
		(signal: {
			timestamp: number;
			type: "buy" | "sell";
			price: number;
			confidence?: number;
			note?: string;
		}) => {
			if (!enableSignals) return;

			setChartState((prev) => ({
				...prev,
				signals: [...prev.signals, signal],
			}));
		},
		[enableSignals]
	);

	// Clear all signals
	const clearSignals = useCallback(() => {
		setChartState((prev) => ({
			...prev,
			signals: [],
		}));
	}, []);

	// Remove specific signal
	const removeSignal = useCallback((timestamp: number) => {
		setChartState((prev) => ({
			...prev,
			signals: prev.signals.filter((s) => s.timestamp !== timestamp),
		}));
	}, []);

	// Chart height calculator based on indicators
	const getOptimalHeight = useCallback(
		(indicators: CalculatedIndicator[] = []) => {
			const hasOscillators = indicators.some(
				(ind) =>
					ind.type.includes("rsi") ||
					ind.type.includes("macd") ||
					ind.type.includes("stoch")
			);

			const hasVolume = indicators.some(
				(ind) => ind.type.includes("volume") || ind.type.includes("obv")
			);

			// Base height for price panel
			let height = 400;

			// Add height for additional panels
			if (hasOscillators) height += 150;
			if (hasVolume) height += 100;

			return Math.min(height, 800); // Cap at 800px
		},
		[]
	);

	// Categorize indicators for display
	const categorizeIndicators = useCallback(
		(indicators: CalculatedIndicator[] = []) => {
			const categories = {
				price: [] as CalculatedIndicator[],
				oscillator: [] as CalculatedIndicator[],
				volume: [] as CalculatedIndicator[],
			};

			indicators.forEach((indicator) => {
				const type = indicator.type.toLowerCase();

				if (
					type.includes("rsi") ||
					type.includes("macd") ||
					type.includes("stoch") ||
					type.includes("atr") ||
					type.includes("adx")
				) {
					categories.oscillator.push(indicator);
				} else if (type.includes("volume") || type.includes("obv")) {
					categories.volume.push(indicator);
				} else {
					categories.price.push(indicator);
				}
			});

			return categories;
		},
		[]
	);

	// Get panel heights based on content
	const getPanelHeights = useCallback(
		(totalHeight: number, indicators: CalculatedIndicator[] = []) => {
			const categorized = categorizeIndicators(indicators);
			const hasOscillators = categorized.oscillator.length > 0;
			const hasVolume = categorized.volume.length > 0;

			// Calculate proportional heights
			if (hasOscillators && hasVolume) {
				return {
					price: Math.floor(totalHeight * 0.6), // 60%
					oscillator: Math.floor(totalHeight * 0.25), // 25%
					volume: Math.floor(totalHeight * 0.15), // 15%
				};
			} else if (hasOscillators) {
				return {
					price: Math.floor(totalHeight * 0.7), // 70%
					oscillator: Math.floor(totalHeight * 0.3), // 30%
					volume: 0,
				};
			} else if (hasVolume) {
				return {
					price: Math.floor(totalHeight * 0.8), // 80%
					oscillator: 0,
					volume: Math.floor(totalHeight * 0.2), // 20%
				};
			} else {
				return {
					price: totalHeight, // 100%
					oscillator: 0,
					volume: 0,
				};
			}
		},
		[categorizeIndicators]
	);

	return {
		// State
		chartState,

		// Handlers
		handleTimeframeChange,
		handleZoomChange,
		resetZoom,

		// Signal management
		addSignal,
		clearSignals,
		removeSignal,

		// Utilities
		getOptimalHeight,
		categorizeIndicators,
		getPanelHeights,

		// Computed values
		isZoomed: chartState.isZoomed,
		signals: chartState.signals,
		selectedTimeframe: chartState.selectedTimeframe,
	};
};
