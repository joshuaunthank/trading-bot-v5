// src/components/plot.ts
import { OhlcvCandle } from "./websocket";
import { getChartInstance } from "./chart";

/**
 * Overlay strategy result data (e.g., forecast, signals) on the chart.
 * This is a stub; extend as needed for overlays/indicators.
 */
export function plotStrategyResult(data: any) {
	const chart = getChartInstance();
	if (!chart || !data || !data.result) return;
	// Example: overlay forecast as a line if available
	if (data.result.dates && data.result.forecast) {
		const forecast = data.result.forecast;
		const labels = data.result.dates.map((d: string) =>
			new Date(d).toISOString()
		);
		// Remove previous forecast overlay if present
		chart.data.datasets = chart.data.datasets.filter(
			(ds: any) => ds.label !== "Forecast"
		);
		chart.data.datasets.push({
			label: "Forecast",
			data: forecast,
			borderColor: "#ffb347",
			borderWidth: 2,
			pointRadius: 0,
			pointHoverRadius: 0,
			fill: false,
			yAxisID: "y",
		});
		chart.update();
	}
}
