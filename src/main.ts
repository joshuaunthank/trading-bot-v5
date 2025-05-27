import "./style.css";
import Chart from "chart.js/auto";
// @ts-ignore
import zoomPlugin from "chartjs-plugin-zoom";
Chart.register(zoomPlugin);
import {
	initChart,
	updateChartWithCandle,
	ChartType,
} from "./components/chart";
import {
	connectOhlcvWebSocket,
	disconnectOhlcvWebSocket, // <-- add this import
	onOhlcvUpdate,
	onOhlcvStatus,
} from "./components/websocket";
import { OhlcvCandle } from "./components/websocket";

const app = document.querySelector<HTMLDivElement>("#app");

app!.innerHTML = `
  <div class="top-section-card">
    <div class="strategy-row">
      <div class="strategy-select-group">
        <span class="section-label">Strategy:</span>
        <select id="strategy-list"></select>
        <button id="load-strategies" title="Reload available strategies">
          <span class="reload-icon">&#x21bb;</span>
        </button>
      </div>
      <form id="run-form" class="run-form">
        <span class="section-label">Run Parameters:</span>
        <input type="text" id="symbol" value="BTC/USDT" required placeholder="Symbol (e.g. BTC/USDT)" />
        <input type="text" id="timeframe" value="4h" required placeholder="Timeframe (e.g. 4h)" />
        <input type="number" id="limit" value="1000" required placeholder="Limit" min="10" max="1000" />
        <button type="submit">Run</button>
      </form>
    </div>
    <div id="summary" class="summary-card"></div>
    <div class="top-section-actions">
      <button id="toggle-raw" class="raw-toggle-btn">Show Raw Data</button>
    </div>
    <div id="raw-scroll" class="raw-scroll"><pre id="output"></pre></div>
  </div>
`;

const strategyList = document.getElementById(
	"strategy-list"
) as HTMLSelectElement;
const summaryDiv = document.getElementById("summary")!;
const output = document.getElementById("output") as HTMLPreElement;
const rawScroll = document.getElementById("raw-scroll")!;
const toggleRawBtn = document.getElementById("toggle-raw")!;

// --- Hybrid OHLCV State and WebSocket Integration ---
let ohlcvData: {
	dates: string[];
	open: number[];
	high: number[];
	low: number[];
	close: number[];
	volume: number[];
} | null = null;

toggleRawBtn.onclick = () => {
	const showing = rawScroll.style.display === "none";
	rawScroll.style.display = showing ? "block" : "none";
	toggleRawBtn.textContent = showing ? "Hide Raw Data" : "Show Raw Data";
};

// Load strategies on button click
document.getElementById("load-strategies")!.onclick = async () => {
	output.textContent = "Loading strategies...";
	try {
		const res = await fetch("http://localhost:3001/api/v1/strategies");
		const strategies = await res.json();
		strategyList.innerHTML = "";
		for (const s of strategies) {
			const opt = document.createElement("option");
			opt.value = s.name;
			opt.text = `${s.name} - ${s.description}`;
			strategyList.appendChild(opt);
		}
		output.textContent = "Strategies loaded.";
	} catch (err) {
		output.textContent = "Error loading strategies: " + err;
	}
};

document.getElementById("run-form")!.onsubmit = async (e) => {
	e.preventDefault();

	const symbol = (document.getElementById("symbol") as HTMLInputElement).value;
	const timeframe = (document.getElementById("timeframe") as HTMLInputElement)
		.value;
	const limit = Number(
		(document.getElementById("limit") as HTMLInputElement).value
	);
	const strategy = strategyList.value;
	output.textContent = "Running strategy...";
	try {
		const res = await fetch(
			`http://localhost:3001/api/v1/strategies/${strategy}/run`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					symbol,
					timeframe,
					limit,
				}),
			}
		);
		const data = await res.json();
		output.textContent = JSON.stringify(data, null, 2);
		// --- Ensure table/chart/summary update after run ---
		if (data && data.result && data.result.forecast) {
			plotStrategyResult(data);
			showSummary(data);
			await loadOhlcvHybrid(); // update table with new forecast/hit
		}
	} catch (err) {
		output.textContent = "Error: " + err;
	}
};

// Add a live feed of recent BTC/USDT 4h candles
const feedDiv = document.createElement("div");
feedDiv.className = "feed-section-card"; // Add card class for consistent look
function updateFeedTitle() {
	const symbol =
		(document.getElementById("symbol") as HTMLInputElement)?.value ||
		"BTC/USDT";
	const tf =
		(document.getElementById("timeframe") as HTMLInputElement)?.value || "4h";
	feedDiv.querySelector(
		".feed-title"
	)!.textContent = `${symbol} ${tf} Price Feed`;
}
feedDiv.innerHTML = `
  <div class="feed-header-row">
    <h2 class="feed-title">BTC/USDT 4h Price Feed</h2>
    <span id="feed-status" class="feed-status"></span>
  </div>
  <hr class="feed-divider" />
  <div class="feed-table-wrap">
    <table id="feed-table">
      <thead>
        <tr>
          <th>Time</th>
          <th>Open</th>
          <th>High</th>
          <th>Low</th>
          <th>Close</th>
          <th>Volume</th>
          <th>Forecast</th>
          <th>Hit?</th>
          <th>Return (%)</th>
          <th>Spread</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>
`;
app!.appendChild(feedDiv);

// --- Auto-update feed logic ---
const feedStatus = document.getElementById("feed-status")!;

function getCurrentTimeframe(): string {
	return (
		(document.getElementById("timeframe") as HTMLInputElement)?.value || "4h"
	);
}

// --- Patch: Track last closed candle timestamp to detect new finalized candle ---
let lastClosedCandleTimestamp: number | null = null;
let currentWsSymbol: string | null = null;
let currentWsTimeframe: string | null = null;

/**
 * Sets up the WebSocket integration for OHLCV updates and handles UI refresh on new candles.
 * Ensures only one active WebSocket connection per symbol/timeframe.
 */
function setupOhlcvWebSocketIntegration() {
	const symbol = getCurrentSymbol();
	const timeframe = getCurrentTimeframe();

	console.log(
		"[main] setupOhlcvWebSocketIntegration called with",
		symbol,
		timeframe
	);
	// Only reconnect if symbol/timeframe changed
	if (symbol === currentWsSymbol && timeframe === currentWsTimeframe) return;

	disconnectOhlcvWebSocket();
	currentWsSymbol = symbol;
	currentWsTimeframe = timeframe;

	console.log("[main] Connecting WebSocket for", symbol, timeframe);
	connectOhlcvWebSocket(symbol, timeframe);
	onOhlcvStatus((status) => {
		console.log("[main] WebSocket status:", status);
		if (status === "connected") feedStatus.textContent = "Live feed connected";
		else if (status === "closed")
			feedStatus.textContent = "Live feed disconnected";
		else if (status === "error") feedStatus.textContent = "Live feed error";
		else if (status === "connecting")
			feedStatus.textContent = "Connecting to live feed...";
	});
	onOhlcvUpdate((msg) => {
		console.log("[main] WebSocket OHLCV update:", msg);
		// Detect if a new finalized candle has started (timestamp increases)
		if (
			lastClosedCandleTimestamp !== null &&
			msg.timestamp > lastClosedCandleTimestamp
		) {
			// New candle started, trigger full refresh
			console.log("[main] New finalized candle detected, refreshing data");
			loadOhlcvHybrid();
		}
		lastClosedCandleTimestamp = msg.timestamp;
		if (!ohlcvData) return;
		const idx = ohlcvData.dates.findIndex(
			(d) => new Date(d).getTime() === msg.timestamp
		);
		if (idx >= 0) {
			// Update existing candle
			ohlcvData.open[idx] = msg.open;
			ohlcvData.high[idx] = msg.high;
			ohlcvData.low[idx] = msg.low;
			ohlcvData.close[idx] = msg.close;
			ohlcvData.volume[idx] = msg.volume;
		} else {
			// Append new candle
			ohlcvData.dates.push(new Date(msg.timestamp).toISOString());
			ohlcvData.open.push(msg.open);
			ohlcvData.high.push(msg.high);
			ohlcvData.low.push(msg.low);
			ohlcvData.close.push(msg.close);
			ohlcvData.volume.push(msg.volume);
		}
		updateLastOhlcvRow();
	});
}

// Remove initial loadOhlcvHybrid and updateFeedTitle from DOMContentLoaded
window.addEventListener("DOMContentLoaded", () => {
	document.getElementById("load-strategies")!.click();
});

// Remove loadOhlcvHybrid and updateFeedTitle from timeframe change/blur
const timeframeInput = document.getElementById("timeframe") as HTMLInputElement;
timeframeInput.addEventListener("change", () => {
	updateFeedTitle();
	// No data fetch here
});
timeframeInput.addEventListener("blur", () => {
	updateFeedTitle();
	// No data fetch here
});

// Only fetch OHLCV data and set up WebSocket when running a strategy
// (This is already handled in the run-form onsubmit handler)

// Remove clearFeedTimers from beforeunload
window.addEventListener("beforeunload", () => {
	// clearFeedTimers(); // REMOVE
});

// Auto-load strategies on page load
window.addEventListener("DOMContentLoaded", () => {
	document.getElementById("load-strategies")!.click();
});

// Add a chart container with modern card and flex controls
const chartDiv = document.createElement("div");
chartDiv.className = "chart-section-card";
chartDiv.style.marginTop = "2.5rem";
chartDiv.innerHTML = `
  <div class="chart-header-row">
    <h2 class="chart-title">Strategy Result Chart</h2>
    <div class="chart-controls">
      <button id="reset-zoom-chart" class="reset-zoom-btn" title="Reset Zoom">&#8634;</button>
      <button id="fullscreen-chart" class="fullscreen-btn" title="Fullscreen Chart">⛶</button>
    </div>
  </div>
  <hr class="chart-divider" />
  <div class="chart-canvas-wrap" style="position:relative;">
    <div id="chart-spinner" class="chart-spinner-overlay" style="display:none;">
      <div class="chart-spinner"></div>
    </div>
    <canvas id="result-chart" width="800" height="400"></canvas>
  </div>
`;
app!.insertBefore(chartDiv, feedDiv); // Insert chart above feed
let chart: Chart | null = null;

// Ensure chart canvas is sized correctly on initial render
setTimeout(() => {
	const canvas = document.getElementById("result-chart") as HTMLCanvasElement;
	if (canvas) {
		canvas.width = 800;
		canvas.height = 400;
		if (chart) chart.resize();
	}
}, 0);

// Fullscreen handler
const fullscreenBtn = document.getElementById(
	"fullscreen-chart"
) as HTMLButtonElement;
fullscreenBtn.onclick = () => {
	const canvas = document.getElementById("result-chart") as HTMLCanvasElement;
	const chartDiv = canvas.parentElement as HTMLElement;
	if (document.fullscreenElement === chartDiv) {
		document.exitFullscreen();
	} else if (chartDiv.requestFullscreen) {
		chartDiv.requestFullscreen();
	} else if ((chartDiv as any).webkitRequestFullscreen) {
		(chartDiv as any).webkitRequestFullscreen();
	}
};

document.addEventListener("fullscreenchange", () => {
	const canvas = document.getElementById("result-chart") as HTMLCanvasElement;
	const chartDiv = canvas.parentElement as HTMLElement;
	if (document.fullscreenElement === chartDiv) {
		fullscreenBtn.textContent = "Exit Fullscreen";
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight - chartDiv.offsetTop - 20;
	} else {
		fullscreenBtn.textContent = "⛶";
		canvas.width = 800;
		canvas.height = 400;
	}
	if (chart) chart.resize();
});

window.addEventListener("resize", () => {
	const canvas = document.getElementById("result-chart") as HTMLCanvasElement;
	const chartDiv = canvas.parentElement as HTMLElement;
	if (document.fullscreenElement === chartDiv) {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight - chartDiv.offsetTop - 20;
	} else {
		canvas.width = 800;
		canvas.height = 400;
	}
	if (chart) chart.resize();
});

// --- Config Modal HTML ---
const configModal = document.createElement("div");
configModal.id = "config-modal";
configModal.innerHTML = `
  <div class="config-modal-backdrop"></div>
  <div class="config-modal-content">
    <h2>Settings</h2>
    <form id="config-form">
      <div class="config-row">
        <label>
          <input type="checkbox" id="toggle-utc" checked />
          Display time in UTC
        </label>
      </div>
      <div class="config-row">
        <label>
          <input type="checkbox" id="toggle-modal-points" />
          Show data points on chart
        </label>
      </div>
      <div class="config-modal-actions">
        <button type="button" id="config-cancel">Cancel</button>
        <button type="submit" id="config-save">Save</button>
      </div>
    </form>
  </div>
`;
document.body.appendChild(configModal);
configModal.style.display = "none";

// --- Config Button ---
const configBtn = document.createElement("button");
configBtn.id = "config-btn";
configBtn.title = "Settings";
configBtn.innerHTML = "<span class='config-gear'>&#9881;</span>";
const topSectionActions = document.querySelector(".top-section-actions");
topSectionActions?.appendChild(configBtn);

// --- Config State ---
let useUTC = true;
let showPoints: boolean = false;

// --- Modal Logic ---
configBtn.onclick = () => {
	(document.getElementById("toggle-utc") as HTMLInputElement).checked = useUTC;
	(document.getElementById("toggle-modal-points") as HTMLInputElement).checked =
		showPoints;
	configModal.style.display = "flex";
};
const configBackdrop = configModal.querySelector(".config-modal-backdrop");
if (configBackdrop) {
	configBackdrop.addEventListener("click", () => {
		configModal.style.display = "none";
	});
}
document.getElementById("config-cancel")!.onclick = () => {
	configModal.style.display = "none";
};
document.getElementById("config-form")!.onsubmit = (e) => {
	e.preventDefault();
	useUTC = (document.getElementById("toggle-utc") as HTMLInputElement).checked;
	showPoints = (
		document.getElementById("toggle-modal-points") as HTMLInputElement
	).checked;
	configModal.style.display = "none";
	// Update all displays
	loadOhlcvHybrid();
	try {
		const data = JSON.parse(output.textContent || "{}");
		plotStrategyResult(data);
	} catch {}
};

// --- Update time formatting helpers ---
// Helper to format time axis labels based on timezone
function formatTimeLabels(dates: string[]): string[] {
	return dates.map((d) =>
		useUTC
			? new Date(d).toISOString().replace("T", " ").replace(".000Z", " UTC")
			: new Date(d).toLocaleString()
	);
}

// Patch table/next row time display in loadFeed
// (see below for further patching)

// Spinner control helpers
function showChartSpinner() {
	const spinner = document.getElementById("chart-spinner");
	if (spinner) spinner.style.display = "flex";
}
function hideChartSpinner() {
	const spinner = document.getElementById("chart-spinner");
	if (spinner) spinner.style.display = "none";
}

// Helper to plot results if available
function plotStrategyResult(data: any) {
	showChartSpinner();
	setTimeout(() => {
		const ctx = document.getElementById("result-chart") as HTMLCanvasElement;
		if (!data || !data.result || !Array.isArray(data.result.dates)) {
			ctx.getContext("2d")!.clearRect(0, 0, ctx.width, ctx.height);
			hideChartSpinner();
			return;
		}
		const timestamps = data.result.dates.map((d: string) =>
			new Date(d).getTime()
		);
		const labels = formatTimeLabels(data.result.dates);
		const price = data.result.price;
		const arimaForecast = data.result.forecast;
		let errorCorrectedForecast = data.result.errorCorrectedForecast;
		const nextErrorCorrectedForecast = data.result.nextErrorCorrectedForecast;
		const pointRadius = showPoints ? 2 : 0;
		const pointHoverRadius = showPoints ? 4 : 0;
		const pointBackgroundColor = showPoints
			? "rgba(0,0,0,0.15)"
			: "rgba(0,0,0,0)";
		const pointBorderColor = showPoints ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0)";

		// --- Calculate timeframe in ms ---
		const timeframeMs =
			timestamps.length > 1 ? timestamps[1] - timestamps[0] : 0;

		// --- Chart.js UI/UX Enhancements (define locally to avoid TS errors) ---
		const customTooltip = {
			enabled: true,
			mode: "index" as const,
			intersect: false,
			callbacks: {
				label: function (context: any) {
					let label = context.dataset.label || "";
					if (label) label += ": ";
					if (context.parsed.y != null) label += context.parsed.y.toFixed(2);
					return label;
				},
				title: function (context: any) {
					return context[0].label;
				},
			},
			backgroundColor: "rgba(30,30,30,0.95)",
			borderColor: "#fff",
			borderWidth: 1,
			bodyColor: "#fff",
			titleColor: "#fff700",
			padding: 10,
			displayColors: true,
		};
		const customLegend = {
			labels: {
				color: "#ccc",
				font: { size: 16, weight: "bold" as const },
				padding: 20,
				boxWidth: 24,
			},
		};
		const customLayout = {
			padding: {
				top: 40,
				bottom: 10,
				left: 10,
				right: 30,
			},
		};
		const customHover = {
			mode: "nearest" as const,
			intersect: false,
		};

		// --- Always plot all data, but set zoom to latest 20 points ---
		let prevMin: any = undefined;
		let prevMax: any = undefined;
		if (labels.length > 20) {
			prevMin = labels[labels.length - 20];
			prevMax = labels[labels.length - 1];
		} else {
			prevMin = labels[0];
			prevMax = labels[labels.length - 1];
		}

		const datasets = [
			{
				label: "Actual Price",
				data: price,
				borderColor: "blue",
				fill: false,
				borderWidth: 2,
				pointRadius,
				pointHoverRadius,
				pointBackgroundColor,
				pointBorderColor,
			},
		];
		if (arimaForecast && arimaForecast.length === price.length) {
			datasets.push({
				label: "ARIMA Forecast",
				data: arimaForecast,
				borderColor: "green",
				fill: false,
				borderWidth: 2,
				pointRadius,
				pointHoverRadius,
				pointBackgroundColor,
				pointBorderColor,
			});
		}
		if (
			errorCorrectedForecast &&
			errorCorrectedForecast.length === price.length
		) {
			datasets.push({
				label: "Error Corrected Forecast",
				data: errorCorrectedForecast,
				borderColor: "orange",
				fill: false,
				borderWidth: 2,
				pointRadius,
				pointHoverRadius,
				pointBackgroundColor,
				pointBorderColor,
				// @ts-ignore
				spanGaps: true,
			});
		}
		// --- Visualize the true next-step error-corrected forecast as a single point at the next candle ---
		if (
			nextErrorCorrectedForecast !== null &&
			!isNaN(nextErrorCorrectedForecast) &&
			timeframeMs > 0
		) {
			const lastClosedDate = new Date(timestamps[timestamps.length - 1]);
			const nextCandleOpen = new Date(lastClosedDate.getTime() + timeframeMs);
			const nextLabel = nextCandleOpen.toLocaleString();
			const markerData = Array(labels.length)
				.fill(null)
				.concat([nextErrorCorrectedForecast]);
			const markerLabels = [...labels, nextLabel];
			datasets.push({
				label: "Next Candle Close Forecast", // updated label for clarity and consistency
				data: markerData,
				borderColor: "#ff2d55",
				pointBackgroundColor: "#ff2d55",
				pointRadius: 8,
				pointHoverRadius: 10,
				fill: false,
				borderWidth: 2,
				pointBorderColor: "#ff2d55",
			});
			// Use markerLabels for the x-axis
			if (chart) chart.destroy();
			chart = new Chart(ctx, {
				type: "line",
				data: {
					labels: markerLabels,
					datasets,
				},
				options: {
					responsive: false,
					plugins: {
						legend: customLegend,
						tooltip: customTooltip,
						zoom: {
							pan: { enabled: true, mode: "x" },
							zoom: {
								wheel: { enabled: true },
								pinch: { enabled: true },
								mode: "x",
							},
						},
					},
					layout: customLayout,
					hover: customHover,
					scales: {
						x: {
							display: true,
							title: {
								display: true,
								text: "Time",
								color: "#ccc",
								font: { weight: "bold" as const },
							},
							ticks: { color: "#aaa", maxRotation: 45, minRotation: 20 },
							min: prevMin,
							max: prevMax,
							grid: {
								color: "#23242a", // Add vertical grid lines for readability
								drawOnChartArea: true,
								drawTicks: true,
								lineWidth: 1,
							},
						},
						y: {
							display: true,
							title: {
								display: true,
								text: "Price (USD)",
								color: "#ccc",
								font: { weight: "bold" as const },
							},
							position: "right",
							ticks: { color: "#aaa" },
							grid: { color: "rgba(255,255,255,0.08)" },
						},
					},
				},
			});
			(chart as any).__lastLabels = markerLabels;
			setTimeout(() => {
				ctx.width = 800;
				ctx.height = 400;
				chart!.resize();
				hideChartSpinner();
			}, 0);
			return;
		}

		// If no next forecast, plot as usual
		if (chart) chart.destroy();
		chart = new Chart(ctx, {
			type: "line",
			data: {
				labels: labels,
				datasets,
			},
			options: {
				responsive: false,
				plugins: {
					legend: customLegend,
					tooltip: customTooltip,
					zoom: {
						pan: { enabled: true, mode: "x" },
						zoom: {
							wheel: { enabled: true },
							pinch: { enabled: true },
							mode: "x",
						},
					},
				},
				layout: customLayout,
				hover: customHover,
				scales: {
					x: {
						display: true,
						title: {
							display: true,
							text: "Time",
							color: "#ccc",
							font: { weight: "bold" as const },
						},
						ticks: { color: "#aaa", maxRotation: 45, minRotation: 20 },
						min: prevMin,
						max: prevMax,
						grid: {
							color: "#23242a", // Add vertical grid lines for readability
							drawOnChartArea: true,
							drawTicks: true,
							lineWidth: 1,
						},
					},
					y: {
						display: true,
						title: {
							display: true,
							text: "Price (USD)",
							color: "#ccc",
							font: { weight: "bold" as const },
						},
						position: "right",
						ticks: { color: "#aaa" },
						grid: { color: "rgba(255,255,255,0.08)" },
					},
				},
			},
		});
		(chart as any).__lastLabels = labels;
		setTimeout(() => {
			ctx.width = 800;
			ctx.height = 400;
			chart!.resize();
			hideChartSpinner();
		}, 0);
	});
}

// Show result summary (date range, price stats, forecast error, next prediction)
function showSummary(data: any) {
	if (!data || !data.result || !Array.isArray(data.result.dates)) {
		summaryDiv.innerHTML = "";
		return;
	}
	const dates = data.result.dates;
	const price: number[] = data.result.price;
	const forecast: number[] = data.result.forecast;
	const n = price.length;
	const min = Math.min(...price).toFixed(2);
	const max = Math.max(...price).toFixed(2);
	const mean = (price.reduce((a: number, b: number) => a + b, 0) / n).toFixed(
		2
	);
	let forecastError = null;
	if (forecast && forecast.length === price.length) {
		forecastError = (
			price.reduce(
				(sum: number, p: number, i: number) => sum + Math.abs(p - forecast[i]),
				0
			) / n
		).toFixed(2);
	}

	// --- Cumulative P&L calculation ---
	let cumPL = null;
	let balanceHtml = "";
	if (
		data.result.cumulativePnL &&
		typeof data.result.cumulativePnL.absolute === "number" &&
		typeof data.result.cumulativePnL.percent === "number"
	) {
		const abs = data.result.cumulativePnL.absolute.toFixed(2);
		const pct = data.result.cumulativePnL.percent.toFixed(2);
		cumPL = `${abs} (${pct}%)`;
		if (
			typeof data.result.startingBalance === "number" &&
			typeof data.result.endingBalance === "number"
		) {
			balanceHtml = `<span style='color:#b0e57c;'>Starting Balance: <b>${data.result.startingBalance.toFixed(
				2
			)}</b></span><br/>
			<span style='color:#b0e57c;'>Ending Balance: <b>${data.result.endingBalance.toFixed(
				2
			)}</b></span><br/>`;
		}
	} else if (Array.isArray(data.result.forecastReturn)) {
		// Fallback: percent sum
		const returns = data.result.forecastReturn.filter(
			(r: any) => typeof r === "number"
		);
		cumPL =
			(returns.reduce((a: number, b: number) => a + b, 0) * 100).toFixed(2) +
			"%";
	}
	let nextStepPrediction = null;
	if (
		data.result.nextErrorCorrectedForecast != null &&
		!isNaN(data.result.nextErrorCorrectedForecast)
	) {
		nextStepPrediction = Number(data.result.nextErrorCorrectedForecast).toFixed(
			2
		);
	}

	// --- Show error correction regression stats if available ---
	let regressionStats = "";
	if (data.result.errorCorrectionRSquared != null) {
		regressionStats += `<br/><span style='color:#ffb347;'>Error Correction R²: <b>${data.result.errorCorrectionRSquared.toFixed(
			4
		)}</b></span>`;
	}
	if (
		Array.isArray(data.result.errorCorrectionCoefficients) &&
		data.result.errorCorrectionCoefficients.length > 0
	) {
		regressionStats += `<br/>Coefficients:<br/><span style='font-size:0.98em;'>`;
		const names = Array.isArray(data.result.errorCorrectionCoefficientNames)
			? data.result.errorCorrectionCoefficientNames
			: [
					"Intercept",
					"EMA5",
					"EMA10",
					"EMA30",
					"MACD",
					"MACD Signal",
					"MACD Hist",
					"Lag1",
					"Prev Error",
			  ];
		for (let i = 0; i < data.result.errorCorrectionCoefficients.length; ++i) {
			const name = names[i] || `Coef${i}`;
			const val = data.result.errorCorrectionCoefficients[i];
			let stderr = null;
			if (
				Array.isArray(data.result.errorCorrectionStdErr) &&
				data.result.errorCorrectionStdErr.length > i
			) {
				stderr = data.result.errorCorrectionStdErr[i];
			}
			let pval = null;
			if (
				Array.isArray(data.result.errorCorrectionPValues) &&
				data.result.errorCorrectionPValues.length > i
			) {
				pval = data.result.errorCorrectionPValues[i];
			}
			regressionStats +=
				`${name}: <b>${val.toFixed(5)}</b>` +
				(stderr != null
					? ` <span style='color:#aaa;'>(±${stderr.toFixed(5)})</span>`
					: "") +
				(pval != null
					? ` <span style='color:#b0e57c;'>(p=${
							pval < 0.0001 ? "<0.0001" : pval.toFixed(4)
					  })</span>`
					: "") +
				"<br/>";
		}
		regressionStats += `</span>`;
	}
	if (typeof data.result.errorCorrectionModelPValue === "number") {
		regressionStats += `<br/><span style='color:#b0e57c;'>Model p-value: <b>${
			data.result.errorCorrectionModelPValue < 0.0001
				? "<0.0001"
				: data.result.errorCorrectionModelPValue.toFixed(4)
		}</b></span>`;
	}

	let hitRateHtml = "";
	if (typeof data.result.hitRate === "number") {
		hitRateHtml = `<span style='color:#b0e57c;'>Hit Rate: <b>${(
			data.result.hitRate * 100
		).toFixed(1)}%</b></span><br/>`;
	}

	summaryDiv.innerHTML = `
    <b>Result Summary:</b><br/>
    Date Range: <b>${dates[0]}</b> to <b>${dates[dates.length - 1]}</b><br/>
    Price: min <b>${min}</b>, max <b>${max}</b>, mean <b>${mean}</b><br/>
    ${
			forecastError !== null
				? `Mean Forecast Error: <b>${forecastError}</b><br/>`
				: ""
		}
    Data points: <b>${n}</b><br/>
    ${balanceHtml}
    ${
			cumPL !== null
				? `<span style='color:#b0e57c;'>Cumulative P&L: <b>${cumPL}</b></span><br/>`
				: ""
		}
    ${
			// Remove 'Last Error-Corrected Forecast' as it's not useful
			""
		}
    ${
			nextStepPrediction !== null
				? `<span style='color:#ffb347;'>Next Candle Close Forecast: <b>${nextStepPrediction}</b></span><br/>`
				: ""
		}
    ${hitRateHtml}
    ${regressionStats}
  `;
}

// Patch run-form handler to plot chart and show summary if result is present
const origRunFormHandler = document.getElementById("run-form")!.onsubmit;
document.getElementById("run-form")!.onsubmit = async (e) => {
	await (origRunFormHandler as any)(e);
	try {
		const data = JSON.parse(output.textContent || "{}");
		plotStrategyResult(data);
		showSummary(data);
		// Live update raw data
		output.textContent = JSON.stringify(data, null, 2);
	} catch {}
};

// --- Live Raw Data Feed ---
// Removed: startLiveRawFeed and stopLiveRawFeed functions

// When output is set, always hide it by default and update summary
rawScroll.style.display = "none";
toggleRawBtn.textContent = "Show Raw Data";

// Update feed title on initial load
updateFeedTitle();

function getCurrentSymbol() {
	return (
		(document.getElementById("symbol") as HTMLInputElement)?.value || "BTC/USDT"
	);
}

// --- Error Banner Helper ---
function showOhlcvErrorBanner(message: string) {
	let banner = document.getElementById("ohlcv-error-banner");
	if (!banner) {
		banner = document.createElement("div");
		banner.id = "ohlcv-error-banner";
		banner.style.position = "fixed";
		banner.style.top = "0";
		banner.style.left = "0";
		banner.style.width = "100%";
		banner.style.zIndex = "1000";
		banner.style.background = "#ff2d55";
		banner.style.color = "#fff";
		banner.style.fontWeight = "bold";
		banner.style.fontSize = "1.1em";
		banner.style.padding = "1em 2em";
		banner.style.display = "flex";
		banner.style.justifyContent = "space-between";
		banner.style.alignItems = "center";
		banner.innerHTML = `
		  <span id="ohlcv-error-message"></span>
		  <button id="ohlcv-error-close" style="background:none;border:none;color:#fff;font-size:1.5em;cursor:pointer;">&times;</button>
		`;
		document.body.appendChild(banner);
		banner
			.querySelector("#ohlcv-error-close")!
			.addEventListener("click", () => {
				banner!.remove();
			});
	}
	const msgSpan = banner.querySelector("#ohlcv-error-message");
	if (msgSpan) msgSpan.textContent = message;
	banner.style.display = "flex";
}

async function loadOhlcvHybrid() {
	// Fetch historical OHLCV
	const symbol = getCurrentSymbol();
	const timeframe = getCurrentTimeframe();
	const limit =
		Number((document.getElementById("limit") as HTMLInputElement)?.value) ||
		1000;
	console.log("[main] loadOhlcvHybrid called with", symbol, timeframe, limit);
	try {
		const res = await fetch(
			`http://localhost:3001/api/v1/ohlcv?symbol=${encodeURIComponent(
				symbol
			)}&timeframe=${encodeURIComponent(timeframe)}&limit=${limit}`
		);
		const ohlcv = await res.json();
		if (ohlcv && ohlcv.result && Array.isArray(ohlcv.result.dates)) {
			console.log("[main] Received OHLCV data:", ohlcv.result);
			ohlcvData = {
				dates: [...ohlcv.result.dates],
				open: [...ohlcv.result.open],
				high: [...ohlcv.result.high],
				low: [...ohlcv.result.low],
				close: [...ohlcv.result.close],
				volume: [...ohlcv.result.volume],
			};
			renderOhlcvTableAndChart();
			setupOhlcvWebSocketIntegration();
			// Hide error banner if present
			const banner = document.getElementById("ohlcv-error-banner");
			if (banner) banner.style.display = "none";
		} else {
			console.log("[main] No backend data received");
			ohlcvData = null;
			feedStatus.textContent = "No backend data";
			showOhlcvErrorBanner(
				"No backend OHLCV data received. Please check your backend server and try again."
			);
		}
	} catch (err) {
		console.error("[main] Error fetching OHLCV:", err);
		ohlcvData = null;
		feedStatus.textContent = "No backend data";
		showOhlcvErrorBanner(
			"Error fetching OHLCV data from backend. Please check your connection and backend logs."
		);
	}
}

// --- Chart type selector (optional, can be moved to UI) ---
let currentChartType: ChartType = "line";

// --- Patch renderOhlcvTableAndChart to use unified OhlcvCandle type ---
/**
 * Renders the OHLCV table and chart from the current data.
 */
function renderOhlcvTableAndChart() {
	if (!ohlcvData) return;
	const tbody = document.querySelector("#feed-table tbody")!;
	tbody.innerHTML = "";
	const n = ohlcvData.dates.length;
	for (let i = n - 1; i >= 0; --i) {
		const tr = document.createElement("tr");
		tr.innerHTML = `
      <td>${
				useUTC
					? new Date(ohlcvData.dates[i])
							.toISOString()
							.replace("T", " ")
							.replace(".000Z", " UTC")
					: new Date(ohlcvData.dates[i]).toLocaleString()
			}</td>
      <td class="feed-td-open">${
				ohlcvData.open[i] != null ? Number(ohlcvData.open[i]).toFixed(2) : "-"
			}</td>
      <td class="feed-td-high">${
				ohlcvData.high[i] != null ? Number(ohlcvData.high[i]).toFixed(2) : "-"
			}</td>
      <td class="feed-td-low">${
				ohlcvData.low[i] != null ? Number(ohlcvData.low[i]).toFixed(2) : "-"
			}</td>
      <td class="feed-td-close">${
				ohlcvData.close[i] != null ? Number(ohlcvData.close[i]).toFixed(2) : "-"
			}</td>
      <td class="feed-td-volume">${
				ohlcvData.volume[i] != null
					? Number(ohlcvData.volume[i]).toFixed(3)
					: "-"
			}</td>
      <td class="feed-td-forecast">-</td>
      <td class="feed-td-hit">-</td>
      <td class="feed-td-return">-</td>
      <td class="feed-td-spread">-</td>
    `;
		tr.style.transition = "background 0.2s";
		tr.onmouseover = () => (tr.style.background = "#23242a");
		tr.onmouseout = () => (tr.style.background = "");
		tbody.appendChild(tr);
	}
	feedStatus.textContent = `Last updated: ${new Date(
		ohlcvData.dates[n - 1]
	).toLocaleTimeString()}`;
	// Use modular chart
	const ctx = document.getElementById("result-chart") as HTMLCanvasElement;
	if (!ohlcvData) return;
	const candles: OhlcvCandle[] = ohlcvData.dates.map((d, i) => ({
		timestamp: new Date(d).getTime(),
		open: ohlcvData!.open[i],
		high: ohlcvData!.high[i],
		low: ohlcvData!.low[i],
		close: ohlcvData!.close[i],
		volume: ohlcvData!.volume[i],
	}));
	initChart(ctx, candles, currentChartType);
}

/**
 * Updates the last row of the OHLCV table and chart with the latest data.
 */
function updateLastOhlcvRow() {
	if (!ohlcvData) return;
	const tbody = document.querySelector("#feed-table tbody")!;
	if (!tbody.firstChild) return;
	const n = ohlcvData.dates.length;
	const tr = tbody.firstChild as HTMLTableRowElement;
	tr.innerHTML = `
      <td>${
				useUTC
					? new Date(ohlcvData.dates[n - 1])
							.toISOString()
							.replace("T", " ")
							.replace(".000Z", " UTC")
					: new Date(ohlcvData.dates[n - 1]).toLocaleString()
			}</td>
      <td class="feed-td-open">${
				ohlcvData.open[n - 1] != null
					? Number(ohlcvData.open[n - 1]).toFixed(2)
					: "-"
			}</td>
      <td class="feed-td-high">${
				ohlcvData.high[n - 1] != null
					? Number(ohlcvData.high[n - 1]).toFixed(2)
					: "-"
			}</td>
      <td class="feed-td-low">${
				ohlcvData.low[n - 1] != null
					? Number(ohlcvData.low[n - 1]).toFixed(2)
					: "-"
			}</td>
      <td class="feed-td-close">${
				ohlcvData.close[n - 1] != null
					? Number(ohlcvData.close[n - 1]).toFixed(2)
					: "-"
			}</td>
      <td class="feed-td-volume">${
				ohlcvData.volume[n - 1] != null
					? Number(ohlcvData.volume[n - 1]).toFixed(3)
					: "-"
			}</td>
      <td class="feed-td-forecast">-</td>
      <td class="feed-td-hit">-</td>
      <td class="feed-td-return">-</td>
      <td class="feed-td-spread">-</td>
    `;
	tr.style.transition = "background 0.2s";
	tr.onmouseover = () => (tr.style.background = "#23242a");
	tr.onmouseout = () => (tr.style.background = "");

	// Modular chart update
	const candle: OhlcvCandle = {
		timestamp: new Date(ohlcvData.dates[n - 1]).getTime(),
		open: ohlcvData!.open[n - 1],
		high: ohlcvData!.high[n - 1],
		low: ohlcvData!.low[n - 1],
		close: ohlcvData!.close[n - 1],
		volume: ohlcvData!.volume[n - 1],
	};
	updateChartWithCandle(candle);
}

// --- Patch WebSocket message handler to only update last row
// Remove legacy ohlcvWs, wsSymbol,
