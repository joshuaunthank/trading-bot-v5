import Chart from "chart.js/auto";
// @ts-ignore
import {
	CandlestickController,
	CandlestickElement,
	OhlcController,
	OhlcElement,
} from "chartjs-chart-financial";
import { OhlcvCandle } from "./websocket";

Chart.register(
	CandlestickController,
	CandlestickElement,
	OhlcController,
	OhlcElement
);

// Use only OhlcvCandle from websocket.ts for all chart logic.
export type ChartType = "line" | "candlestick" | "ohlc";

let chart: Chart<any, any, any> | null = null;
let chartType: ChartType = "line";

export function initChart(
	ctx: HTMLCanvasElement,
	candles: OhlcvCandle[],
	type: ChartType = "line"
) {
	const needsNewChart = !chart || chartType !== type;
	chartType = type;
	if (type === "line") {
		const labels = candles.map((c) => new Date(c.timestamp).toISOString());
		const datasets = [
			{
				label: "Price",
				data: candles.map((c) => c.close),
				borderColor: "blue",
				fill: false,
				borderWidth: 2,
				pointRadius: 0,
				pointHoverRadius: 0,
			},
		];
		if (needsNewChart) {
			if (chart) chart.destroy();
			chart = new Chart<"line", number[], string>(ctx, {
				type: "line",
				data: { labels, datasets },
				options: {
					responsive: false,
					plugins: {
						legend: { labels: { color: "#ccc" } },
						tooltip: { enabled: true },
						zoom: {
							pan: { enabled: true, mode: "x" },
							zoom: {
								wheel: { enabled: true },
								pinch: { enabled: true },
								mode: "x",
							},
						},
					},
					scales: {
						x: { display: true, ticks: { color: "#aaa" } },
						y: { display: true, ticks: { color: "#aaa" } },
					},
				},
			});
		} else {
			updateChartData(candles);
		}
	} else {
		const labels = candles.map((c) => c.timestamp);
		const data = candles.map((c) => ({
			x: c.timestamp,
			o: c.open,
			h: c.high,
			l: c.low,
			c: c.close,
		}));
		const datasets = [
			{
				label: type === "candlestick" ? "Candlestick" : "OHLC",
				data: data,
				color: {
					up: "#26a69a",
					down: "#ef5350",
					unchanged: "#888",
				},
			},
		];
		if (needsNewChart) {
			if (chart) chart.destroy();
			chart = new Chart(ctx, {
				type: type,
				data: { labels, datasets },
				options: {
					responsive: false,
					plugins: {
						legend: { labels: { color: "#ccc" } },
						tooltip: { enabled: true },
						zoom: {
							pan: { enabled: true, mode: "x" },
							zoom: {
								wheel: { enabled: true },
								pinch: { enabled: true },
								mode: "x",
							},
						},
					},
					scales: {
						x: { display: true, ticks: { color: "#aaa" } },
						y: { display: true, ticks: { color: "#aaa" } },
					},
				},
			});
		} else {
			updateChartData(candles);
		}
	}
}

// Update chart data with new candles (full refresh)
export function updateChartData(candles: OhlcvCandle[]) {
	if (!chart) return;
	if (chartType === "line") {
		chart.data.labels = candles.map((c) => new Date(c.timestamp).toISOString());
		chart.data.datasets[0].data = candles.map((c) => c.close);
	} else {
		chart.data.labels = candles.map((c) => c.timestamp);
		chart.data.datasets[0].data = candles.map((c) => ({
			x: c.timestamp,
			o: c.open,
			h: c.high,
			l: c.low,
			c: c.close,
		}));
	}
	chart.update();
}

// Incrementally update the last candle with currentPrice (for live chart updates)
export function updateChartWithCurrentPrice(currentPrice: number) {
	if (!chart) return;
	if (chartType === "line") {
		const ds = chart.data.datasets[0];
		if (ds && Array.isArray(ds.data) && ds.data.length > 0) {
			ds.data[ds.data.length - 1] = currentPrice;
			chart.update("none");
		}
	} else {
		const ds = chart.data.datasets[0];
		if (ds && Array.isArray(ds.data) && ds.data.length > 0) {
			const last = ds.data[ds.data.length - 1];
			if (last && typeof last === "object") {
				last.c = currentPrice;
				if (currentPrice > last.h) last.h = currentPrice;
				if (currentPrice < last.l) last.l = currentPrice;
				chart.update("none");
			}
		}
	}
}

// Incrementally update the last candle with new OhlcvCandle data
export function updateChartWithCandle(candle: OhlcvCandle) {
	// For incremental chart update: update the last candle's close/high/low
	if (!chart) return;
	if (chartType === "line") {
		const ds = chart.data.datasets[0];
		if (ds && Array.isArray(ds.data) && ds.data.length > 0) {
			ds.data[ds.data.length - 1] = candle.close;
			chart.update("none");
		}
	} else {
		const ds = chart.data.datasets[0];
		if (ds && Array.isArray(ds.data) && ds.data.length > 0) {
			const last = ds.data[ds.data.length - 1];
			if (last && typeof last === "object") {
				last.c = candle.close;
				if (candle.close > last.h) last.h = candle.close;
				if (candle.close < last.l) last.l = candle.close;
				chart.update("none");
			}
		}
	}
}
