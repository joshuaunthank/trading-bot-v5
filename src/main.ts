import "./style.css";
import Chart from "chart.js/auto";
// @ts-ignore
import zoomPlugin from "chartjs-plugin-zoom";
Chart.register(zoomPlugin);
import {
	initChart,
	updateChartWithCandle,
	ChartType,
	getChartInstance,
} from "./components/chart";
import {
	connectOhlcvWebSocket,
	disconnectOhlcvWebSocket,
	onOhlcvUpdate,
	onOhlcvStatus,
} from "./components/websocket";
import { OhlcvCandle } from "./components/websocket";
import { showConfigModal } from "./components/configModal";
import {
	initTable,
	updateTableData,
	updateLastOhlcvRow,
} from "./components/table";
import { plotStrategyResult } from "./components/plot";
import { showSummary } from "./components/summary";

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
	// Merge config with form values (form values take precedence)
	const config = { ...currentStrategyConfig, symbol, timeframe, limit };
	output.textContent = "Running strategy...";
	try {
		const res = await fetch(
			`http://localhost:3001/api/v1/strategies/${strategy}/run`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(config),
			}
		);
		const data = await res.json();
		output.textContent = JSON.stringify(data, null, 2);
		// --- Ensure table/chart/summary update after run ---
		if (data && data.result && data.result.forecast) {
			plotStrategyResult(data);
			showSummary(data);
			// Update table/chart with result data if available
			if (data.result.dates && data.result.open) {
				const candles = data.result.dates.map((date: string, i: number) => ({
					timestamp: new Date(date).getTime(),
					open: data.result.open[i],
					high: data.result.high[i],
					low: data.result.low[i],
					close: data.result.close[i],
					volume: data.result.volume[i],
				}));
				updateTableData(candles);
				const ctx = document.getElementById(
					"result-chart"
				) as HTMLCanvasElement;
				if (ctx && candles.length) initChart(ctx, candles);
			}
		}
	} catch (err) {
		output.textContent = "Error: " + err;
	}
};

// Helper to get the current symbol from the input
function getCurrentSymbol(): string {
	return (
		(document.getElementById("symbol") as HTMLInputElement)?.value || "BTC/USDT"
	);
}

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
			// Instead of loadOhlcvHybrid, just refresh table/chart if needed
			if (ohlcvData) {
				// Convert ohlcvData to OhlcvCandle[]
				const candles = ohlcvData.dates.map((date, i) => ({
					timestamp: new Date(date).getTime(),
					open: ohlcvData.open[i],
					high: ohlcvData.high[i],
					low: ohlcvData.low[i],
					close: ohlcvData.close[i],
					volume: ohlcvData.volume[i],
				}));
				updateTableData(candles);
				const ctx = document.getElementById(
					"result-chart"
				) as HTMLCanvasElement;
				if (ctx && candles.length) initChart(ctx, candles);
			}
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
		// updateLastOhlcvRow expects a price argument
		updateLastOhlcvRow(msg.close);
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
	const chartInstance = getChartInstance();
	if (chartInstance) chartInstance.resize();
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
	const chartInstance = getChartInstance();
	if (chartInstance) chartInstance.resize();
});

// --- Strategy config state ---
let currentStrategyConfig: Record<string, any> = {};

// Add a Configure button next to the strategy selector if not present
let configBtn = document.getElementById(
	"strategy-config-btn"
) as HTMLButtonElement | null;
if (!configBtn) {
	configBtn = document.createElement("button");
	configBtn.id = "strategy-config-btn";
	configBtn.textContent = "Configure";
	configBtn.style.marginLeft = "0.5em";
	const strategyGroup = document.querySelector(".strategy-select-group");
	if (strategyGroup) strategyGroup.appendChild(configBtn);
}

configBtn.onclick = async () => {
	const strategy = (
		document.getElementById("strategy-list") as HTMLSelectElement
	).value;
	await showConfigModal(strategy, (config) => {
		currentStrategyConfig = config;
		output.textContent = `Config saved for ${strategy}`;
	});
};

// Patch run-form handler to include config
const origRunFormHandler = document.getElementById("run-form")!.onsubmit;
document.getElementById("run-form")!.onsubmit = async (e) => {
	e.preventDefault();
	const symbol = (document.getElementById("symbol") as HTMLInputElement).value;
	const timeframe = (document.getElementById("timeframe") as HTMLInputElement)
		.value;
	const limit = Number(
		(document.getElementById("limit") as HTMLInputElement).value
	);
	const strategy = strategyList.value;
	// Merge config with form values (form values take precedence)
	const config = { ...currentStrategyConfig, symbol, timeframe, limit };
	output.textContent = "Running strategy...";
	try {
		const res = await fetch(
			`/api/v1/strategies/${encodeURIComponent(strategy)}/run`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(config),
			}
		);
		const data = await res.json();
		output.textContent = JSON.stringify(data, null, 2);
		if (data && data.result && data.result.forecast) {
			plotStrategyResult(data);
			showSummary(data);
			// Update table/chart with result data if available
			if (data.result.dates && data.result.open) {
				const candles = data.result.dates.map((date: string, i: number) => ({
					timestamp: new Date(date).getTime(),
					open: data.result.open[i],
					high: data.result.high[i],
					low: data.result.low[i],
					close: data.result.close[i],
					volume: data.result.volume[i],
				}));
				updateTableData(candles);
				const ctx = document.getElementById(
					"result-chart"
				) as HTMLCanvasElement;
				if (ctx && candles.length) initChart(ctx, candles);
			}
		}
	} catch (err) {
		output.textContent = "Error: " + err;
	}
};
