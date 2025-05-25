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

// Remove any duplicate or legacy OHLCV candle types from this file.
// Use only the canonical OhlcvCandle type from websocket.ts for all chart logic.
type FinancialDataPoint = {
	x: number; // timestamp
	o: number;
	h: number;
	l: number;
	c: number;
};

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
			if (type === "candlestick") {
				chart = new Chart<"candlestick", FinancialDataPoint[], number>(ctx, {
					type: "candlestick",
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
				chart = new Chart<"ohlc", FinancialDataPoint[], number>(ctx, {
					type: "ohlc",
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
			}
		} else {
			updateChartData(candles);
		}
	}
}

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
	chart.update("none");
}

export function updateChartWithCandle(candle: OhlcvCandle) {
	if (!chart) return;
	if (chartType === "line") {
		const labels = chart.data.labels as string[];
		const data = chart.data.datasets[0].data as number[];
		const iso = new Date(candle.timestamp).toISOString();
		if (labels[labels.length - 1] === iso) {
			data[data.length - 1] = candle.close;
		} else {
			labels.push(iso);
			data.push(candle.close);
		}
	} else {
		const ts = candle.timestamp;
		const ds = chart.data.datasets[0].data as FinancialDataPoint[];
		if (ds.length && ds[ds.length - 1].x === ts) {
			ds[ds.length - 1] = {
				x: ts,
				o: candle.open,
				h: candle.high,
				l: candle.low,
				c: candle.close,
			};
		} else {
			ds.push({
				x: ts,
				o: candle.open,
				h: candle.high,
				l: candle.low,
				c: candle.close,
			});
		}
		const labels = chart.data.labels as number[];
		if (labels[labels.length - 1] !== ts) {
			labels.push(ts);
		}
	}
	chart.update("none");
}

export function getChartInstance() {
	return chart;
}

export function setChartType(type: ChartType) {
	chartType = type;
}

// All chart logic below uses OhlcvCandle from websocket.ts
