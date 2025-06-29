import React from "react";
import { CalculatedIndicator } from "../hooks/useLocalIndicators";

interface OHLCVData {
	timestamp: number;
	open: number;
	high: number;
	close: number;
	low: number;
	volume: number;
}

interface ChartPanelProps {
	data: OHLCVData[];
	symbol: string;
	timeframe: string;
	loading?: boolean;
	indicators: CalculatedIndicator[];
	panelType: "price" | "oscillator" | "volume";
	height: string;
	onTimeframeChange?: (timeframe: string) => void;
}

/**
 * Categorizes indicators by their display type
 */
export const categorizeIndicators = (indicators: CalculatedIndicator[]) => {
	const categories = {
		price: [] as CalculatedIndicator[],
		oscillator: [] as CalculatedIndicator[],
		volume: [] as CalculatedIndicator[],
	};

	indicators.forEach((indicator) => {
		const type = indicator.type.toLowerCase();

		// Oscillators that should be in their own panel (0-100 range typically)
		if (
			type.includes("rsi") ||
			type.includes("macd") ||
			type.includes("stoch") ||
			type.includes("cci") ||
			type.includes("williams") ||
			type.includes("momentum")
		) {
			categories.oscillator.push(indicator);
		}
		// Volume indicators
		else if (
			type.includes("volume") ||
			type.includes("obv") ||
			type.includes("ad")
		) {
			categories.volume.push(indicator);
		}
		// Price-based indicators (EMA, SMA, BB, etc.)
		else {
			categories.price.push(indicator);
		}
	});

	return categories;
};

/**
 * Gets appropriate height for each panel type
 */
export const getPanelHeight = (
	panelType: "price" | "oscillator" | "volume",
	hasOscillators: boolean,
	hasVolume: boolean
): string => {
	// If we only have price indicators, use full height
	if (!hasOscillators && !hasVolume) {
		return "h-[600px]";
	}

	// If we have oscillators/volume, distribute height
	switch (panelType) {
		case "price":
			if (hasOscillators && hasVolume) return "h-[350px]"; // ~60% when 3 panels
			if (hasOscillators || hasVolume) return "h-[400px]"; // ~70% when 2 panels
			return "h-[600px]"; // Full height if alone
		case "oscillator":
			return "h-[150px]"; // ~25% when present
		case "volume":
			return "h-[100px]"; // ~15% when present
		default:
			return "h-[200px]";
	}
};

export default categorizeIndicators;
