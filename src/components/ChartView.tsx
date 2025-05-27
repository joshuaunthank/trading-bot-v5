import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
// @ts-ignore
import {
	CandlestickController,
	CandlestickElement,
	OhlcController,
	OhlcElement,
} from "chartjs-chart-financial";
import { OhlcvCandle } from "./useOhlcvWebSocket";

Chart.register(
	CandlestickController,
	CandlestickElement,
	OhlcController,
	OhlcElement
);

export type ChartType = "line" | "candlestick" | "ohlc";

export interface ChartViewProps {
	candles: OhlcvCandle[];
	type?: ChartType;
	style?: React.CSSProperties;
}

export default function ChartView({
	candles,
	type = "line",
	style,
}: ChartViewProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const chartRef = useRef<Chart | null>(null);

	useEffect(() => {
		const ctx = canvasRef.current;
		if (!ctx) return;
		if (chartRef.current) {
			chartRef.current.destroy();
		}
		let chart: Chart;
		if (type === "line") {
			chart = new Chart(ctx, {
				type: "line",
				data: {
					labels: candles.map((c) => new Date(c.timestamp).toISOString()),
					datasets: [
						{
							label: "Price",
							data: candles.map((c) => c.close),
							borderColor: "blue",
							fill: false,
							borderWidth: 2,
							pointRadius: 0,
							pointHoverRadius: 0,
						},
					],
				},
				options: {
					responsive: true,
					plugins: {
						legend: { labels: { color: "#ccc" } },
						// @ts-ignore
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
			const labels = candles.map((c) => c.timestamp);
			const data = candles.map((c) => ({
				x: c.timestamp,
				o: c.open,
				h: c.high,
				l: c.low,
				c: c.close,
			}));
			chart = new Chart(ctx, {
				type: type,
				data: {
					labels,
					datasets: [
						{
							label: type === "candlestick" ? "Candlestick" : "OHLC",
							data: data,
							borderColor: "#26a69a",
							backgroundColor: "#26a69a",
						},
					],
				},
				options: {
					responsive: true,
					plugins: {
						legend: { labels: { color: "#ccc" } },
						// @ts-ignore
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
		chartRef.current = chart;
		return () => {
			chartRef.current?.destroy();
		};
	}, [candles, type]);

	return (
		<div style={style}>
			<canvas ref={canvasRef} width={800} height={400} />
		</div>
	);
}
