import "./style.css";
import Chart from "chart.js/auto";
// @ts-ignore
import zoomPlugin from "chartjs-plugin-zoom";
Chart.register(zoomPlugin);

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
let liveFeedActive = false;
let liveFeedInterval: number | null = null;
let lastRawData: any = null;

toggleRawBtn.onclick = () => {
	const showing = rawScroll.style.display === "none";
	rawScroll.style.display = showing ? "block" : "none";
	toggleRawBtn.textContent = showing ? "Hide Raw Data" : "Show Raw Data";
	if (showing) {
		if (!liveFeedActive) {
			startLiveRawFeed();
			liveFeedActive = true;
		}
	} else {
		if (liveFeedActive) {
			stopLiveRawFeed();
			liveFeedActive = false;
		}
	}
};

document.getElementById("load-strategies")!.onclick = async () => {
	output.textContent = "Loading strategies...";
	try {
		const res = await fetch("http://localhost:3001/api/strategies");
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
	// API keys and since are no longer sent from the UI
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
			`http://localhost:3001/api/strategies/${strategy}/run`,
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
	} catch (err) {
		output.textContent = "Error: " + err;
	}
};

// Remove the auto 'since' button and start live feed automatically
// (Remove the button creation and insertion)

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
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>
`;
app!.appendChild(feedDiv);

// --- Auto-update feed logic ---
let feedTimeout: number | null = null;
const feedStatus = document.getElementById("feed-status")!;

function timeframeToMs(tf: string): number {
	const m = tf.match(/^([0-9]+)([mhd])$/i);
	if (!m) return 60000; // default 1m
	const n = parseInt(m[1], 10);
	switch (m[2].toLowerCase()) {
		case "m":
			return n * 60 * 1000;
		case "h":
			return n * 60 * 60 * 1000;
		case "d":
			return n * 24 * 60 * 60 * 1000;
		default:
			return 60000;
	}
}

function getCurrentTimeframe(): string {
	return (
		(document.getElementById("timeframe") as HTMLInputElement)?.value || "4h"
	);
}

function clearFeedTimers() {
	if (feedTimeout) clearTimeout(feedTimeout);
	feedTimeout = null;
}

async function getBinanceServerTime(): Promise<number> {
	try {
		const res = await fetch("https://api.binance.com/api/v3/time");
		const data = await res.json();
		return data.serverTime;
	} catch {
		return Date.now(); // fallback to local time
	}
}

async function scheduleFeedUpdate() {
	clearFeedTimers();
	const tf = getCurrentTimeframe();
	const ms = timeframeToMs(tf);
	const serverNow = await getBinanceServerTime();
	// Calculate ms until next candle close using server time
	let nextClose;
	if (tf.endsWith("m")) {
		const n = parseInt(tf);
		nextClose = Math.ceil(serverNow / (n * 60 * 1000)) * (n * 60 * 1000);
	} else if (tf.endsWith("h")) {
		const n = parseInt(tf);
		nextClose =
			Math.ceil(serverNow / (n * 60 * 60 * 1000)) * (n * 60 * 60 * 1000);
	} else if (tf.endsWith("d")) {
		const n = parseInt(tf);
		nextClose =
			Math.ceil(serverNow / (n * 24 * 60 * 60 * 1000)) *
			(n * 24 * 60 * 60 * 1000);
	} else {
		nextClose = serverNow + ms;
	}
	const msToNext = Math.max(nextClose - serverNow, 1000);
	feedTimeout = window.setTimeout(async () => {
		await loadFeed();
		scheduleFeedUpdate(); // Always reschedule after each refresh
	}, msToNext);
}

async function loadFeed() {
	updateFeedTitle();
	const tf = getCurrentTimeframe();
	const ms = timeframeToMs(tf);
	const serverNow = await getBinanceServerTime();
	let nextClose;
	if (tf.endsWith("m")) {
		const n = parseInt(tf);
		nextClose = Math.ceil(serverNow / (n * 60 * 1000)) * (n * 60 * 1000);
	} else if (tf.endsWith("h")) {
		const n = parseInt(tf);
		nextClose =
			Math.ceil(serverNow / (n * 60 * 60 * 1000)) * (n * 60 * 60 * 1000);
	} else if (tf.endsWith("d")) {
		const n = parseInt(tf);
		nextClose =
			Math.ceil(serverNow / (n * 24 * 60 * 60 * 1000)) *
			(n * 24 * 60 * 60 * 1000);
	} else {
		nextClose = serverNow + ms;
	}
	const msToNext = Math.max(nextClose - serverNow, 1000);
	if (msToNext > 2000) {
		feedStatus.textContent = `Next update in ${Math.round(
			msToNext / 1000
		)}s (Binance time), then every ${tf}`;
	} else {
		feedStatus.textContent = `Updating... (Binance time), then every ${tf}`;
	}
	feedStatus.textContent = feedStatus.textContent; // force update
	try {
		feedStatus.textContent = "Auto-updating...";
		const tf = getCurrentTimeframe();
		const symbol =
			(document.getElementById("symbol") as HTMLInputElement)?.value ||
			"BTC/USDT";
		const symbolApi = symbol.replace("/", "");
		const res = await fetch(
			`https://api.binance.com/api/v3/klines?symbol=${symbolApi}&interval=${tf}&limit=20`
		);
		const data = await res.json();
		const tbody = document.querySelector("#feed-table tbody")!;
		tbody.innerHTML = "";
		for (const row of data.reverse()) {
			const tr = document.createElement("tr");
			tr.innerHTML = `
        <td style=\"padding:6px 10px; border-bottom:1px solid #222; color:#fff;\">${new Date(
					row[0]
				).toLocaleString()}</td>
        <td style=\"padding:6px 10px; border-bottom:1px solid #222; color:#6cf; font-weight:600;\">${Number(
					row[1]
				).toFixed(2)}</td>
        <td style=\"padding:6px 10px; border-bottom:1px solid #222; color:#7f7; font-weight:600;\">${Number(
					row[2]
				).toFixed(2)}</td>
        <td style=\"padding:6px 10px; border-bottom:1px solid #222; color:#f77; font-weight:600;\">${Number(
					row[3]
				).toFixed(2)}</td>
        <td style=\"padding:6px 10px; border-bottom:1px solid #222; color:#fff; font-weight:600;\">${Number(
					row[4]
				).toFixed(2)}</td>
        <td style=\"padding:6px 10px; border-bottom:1px solid #222; color:#ffb347; font-weight:600;\">${Number(
					row[5]
				).toFixed(3)}</td>
      `;
			tr.style.transition = "background 0.2s";
			tr.onmouseover = () => (tr.style.background = "#222");
			tr.onmouseout = () => (tr.style.background = "");
			tbody.appendChild(tr);
		}
		feedStatus.textContent =
			`Last updated: ${new Date().toLocaleTimeString()} | ` +
			feedStatus.textContent;
		try {
			const dataObj = JSON.parse(output.textContent || "{}");
			plotStrategyResult(dataObj);
			showSummary(dataObj);
		} catch {}
	} catch {
		feedStatus.textContent = "Feed update failed";
	}
}

// Start update on page load
window.addEventListener("DOMContentLoaded", () => {
	loadFeed();
	scheduleFeedUpdate();
});

// Listen for timeframe changes and reset timer
const timeframeInput = document.getElementById("timeframe") as HTMLInputElement;
timeframeInput.addEventListener("change", () => {
	updateFeedTitle();
	loadFeed();
	scheduleFeedUpdate();
});
timeframeInput.addEventListener("blur", () => {
	updateFeedTitle();
	loadFeed();
	scheduleFeedUpdate();
});

// Stop timers on page unload
window.addEventListener("beforeunload", () => {
	clearFeedTimers();
});

// Auto-load strategies on page load
window.addEventListener("DOMContentLoaded", () => {
	document.getElementById("load-strategies")!.click();
	liveFeedActive = true;
	startLiveRawFeed();
});

// Add a chart container with modern card and flex controls
const chartDiv = document.createElement("div");
chartDiv.className = "chart-section-card";
chartDiv.style.marginTop = "2.5rem";
chartDiv.innerHTML = `
  <div class="chart-header-row">
    <h2 class="chart-title">Strategy Result Chart</h2>
    <div class="chart-controls">
      <label class="toggle-points-label">
        <input type="checkbox" id="toggle-points" /> Show Data Points
      </label>
      <button id="fullscreen-chart" class="fullscreen-btn" title="Fullscreen Chart">⛶</button>
    </div>
  </div>
  <hr class="chart-divider" />
  <div class="chart-canvas-wrap">
    <canvas id="result-chart" width="800" height="400"></canvas>
  </div>
`;
app!.appendChild(chartDiv);
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
		fullscreenBtn.textContent = "Fullscreen";
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

// Point toggle handler
const togglePoints = document.getElementById(
	"toggle-points"
) as HTMLInputElement;
let showPoints = false;
togglePoints.onchange = () => {
	showPoints = togglePoints.checked;
	try {
		const data = JSON.parse(output.textContent || "{}");
		plotStrategyResult(data);
		// After re-plot, re-apply fullscreen sizing if in fullscreen
		const canvas = document.getElementById("result-chart") as HTMLCanvasElement;
		const chartDiv = canvas.parentElement as HTMLElement;
		if (document.fullscreenElement === chartDiv) {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight - chartDiv.offsetTop - 20;
			if (chart) chart.resize();
		}
	} catch {}
};

// Helper to format time axis labels based on timeframe
function formatTimeLabels(dates: string[], timeframe: string): string[] {
	if (timeframe.endsWith("m")) {
		// e.g. 15m, 30m
		return dates.map((d) => new Date(d).toLocaleString());
	} else if (timeframe.endsWith("h")) {
		// e.g. 1h, 4h
		return dates.map((d) => new Date(d).toLocaleString());
	} else if (timeframe.endsWith("d")) {
		// e.g. 1d
		return dates.map((d) => new Date(d).toLocaleDateString());
	}
	return dates;
}

// Helper to plot results if available
function plotStrategyResult(data: any) {
	const ctx = document.getElementById("result-chart") as HTMLCanvasElement;
	if (!data || !data.result || !Array.isArray(data.result.dates)) {
		ctx.getContext("2d")!.clearRect(0, 0, ctx.width, ctx.height);
		return;
	}
	const timeframe =
		(document.getElementById("timeframe") as HTMLInputElement)?.value || "4h";
	const labels = formatTimeLabels(data.result.dates, timeframe);
	const price = data.result.price;
	const forecast = data.result.forecast;
	let errorCorrectedForecast = data.result.errorCorrectedForecast;
	const pointRadius = showPoints ? 2 : 0;
	const pointHoverRadius = showPoints ? 4 : 0;
	const pointBackgroundColor = showPoints
		? "rgba(0,0,0,0.15)"
		: "rgba(0,0,0,0)";
	const pointBorderColor = showPoints ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0)";

	// --- Preserve zoom/pan state ---
	let prevMin: any = undefined;
	let prevMax: any = undefined;
	if (chart && chart.scales && chart.scales.x) {
		prevMin = chart.scales.x.min;
		prevMax = chart.scales.x.max;
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
	if (forecast && forecast.length === price.length) {
		datasets.push({
			label: "ARIMA Forecast",
			data: forecast,
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
		errorCorrectedForecast.length === labels.length
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

	// --- Chart.js UI/UX Enhancements ---
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
	// Ensure correct sizing after chart creation
	setTimeout(() => {
		ctx.width = 800;
		ctx.height = 400;
		chart!.resize();
	}, 0);
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
	const errorCorrectedForecast: number[] = data.result.errorCorrectedForecast;
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
	// Show next error-corrected forecast if available
	let nextPrediction = null;
	if (
		errorCorrectedForecast &&
		errorCorrectedForecast.length > 0 &&
		errorCorrectedForecast[errorCorrectedForecast.length - 1] != null
	) {
		nextPrediction =
			errorCorrectedForecast[errorCorrectedForecast.length - 1].toFixed(2);
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
    ${
			nextPrediction !== null
				? `<span style='color:orange;'>Next Error-Corrected Forecast: <b>${nextPrediction}</b></span><br/>`
				: ""
		}
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
function startLiveRawFeed() {
	if (liveFeedInterval) clearInterval(liveFeedInterval);
	liveFeedInterval = window.setInterval(async () => {
		const strategy = strategyList.value;
		const apiKey = (document.getElementById("apiKey") as HTMLInputElement)
			.value;
		const secret = (document.getElementById("secret") as HTMLInputElement)
			.value;
		const symbol = (document.getElementById("symbol") as HTMLInputElement)
			.value;
		const timeframe = (document.getElementById("timeframe") as HTMLInputElement)
			.value;
		const limit = Number(
			(document.getElementById("limit") as HTMLInputElement).value
		);
		try {
			const res = await fetch(
				`http://localhost:3001/api/strategies/${strategy}/run`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						apiKey,
						secret,
						symbol,
						timeframe,
						limit,
					}),
				}
			);
			const data = await res.json();
			if (JSON.stringify(data) !== JSON.stringify(lastRawData)) {
				output.textContent = JSON.stringify(data, null, 2);
				plotStrategyResult(data);
				showSummary(data);
				lastRawData = data;
			}
		} catch (err) {
			output.textContent = "Error: " + err;
		}
	}, 10000); // update every 10 seconds
}

function stopLiveRawFeed() {
	if (liveFeedInterval) clearInterval(liveFeedInterval);
	liveFeedInterval = null;
}

// Stop live feed on page unload
window.addEventListener("beforeunload", stopLiveRawFeed);

// When output is set, always hide it by default and update summary
rawScroll.style.display = "none";
toggleRawBtn.textContent = "Show Raw Data";

// Update feed title on initial load
updateFeedTitle();
