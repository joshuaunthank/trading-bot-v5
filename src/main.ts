import "./style.css";
import Chart from "chart.js/auto";
// @ts-ignore
import zoomPlugin from "chartjs-plugin-zoom";
Chart.register(zoomPlugin);

const app = document.querySelector<HTMLDivElement>("#app");

app!.innerHTML = `
  <h1>Trading Bot Control Panel</h1>
  <div style="margin-bottom: 1em;">
    <button id="load-strategies">Load Strategies</button>
    <select id="strategy-list"></select>
  </div>
  <form id="run-form" style="margin-bottom: 1em;">
    <h2>Run Strategy</h2>
    <!-- API Key and Secret fields removed for security -->
    <label>Symbol: <input type="text" id="symbol" value="BTC/USDT" required /></label><br/>
    <label>Timeframe: <input type="text" id="timeframe" value="4h" required /></label><br/>
    <label>Limit: <input type="number" id="limit" value="1000" required /></label><br/>
    <button type="submit">Run</button>
  </form>
  <div id="summary"></div>
  <button id="toggle-raw" style="margin:0.5em 0;">Show Raw Data</button>
  <div id="raw-scroll" style="max-height:300px;overflow:auto;border:1px solid #444;background:#181818;padding:0.5em 0.5em 0.5em 0.5em;display:none;">
    <pre id="output" style="margin:0;"></pre>
  </div>
`;

const strategyList = document.getElementById(
	"strategy-list"
) as HTMLSelectElement;
const summaryDiv = document.getElementById("summary")!;
const output = document.getElementById("output") as HTMLPreElement;
const rawScroll = document.getElementById("raw-scroll")!;
const toggleRawBtn = document.getElementById("toggle-raw")!;
toggleRawBtn.onclick = () => {
	rawScroll.style.display =
		rawScroll.style.display === "none" ? "block" : "none";
	toggleRawBtn.textContent =
		rawScroll.style.display === "none" ? "Show Raw Data" : "Hide Raw Data";
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
feedDiv.innerHTML = `
  <h2>BTC/USDT 4h Price Feed</h2>
  <button id="load-feed">Refresh Feed</button>
  <table id="feed-table" border="1" style="margin-top:0.5em;">
    <thead><tr><th>Time</th><th>Open</th><th>High</th><th>Low</th><th>Close</th><th>Volume</th></tr></thead>
    <tbody></tbody>
  </table>
`;
app!.appendChild(feedDiv);

async function loadFeed() {
	const res = await fetch(
		"https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=4h&limit=20"
	);
	const data = await res.json();
	const tbody = document.querySelector("#feed-table tbody")!;
	tbody.innerHTML = "";
	for (const row of data.reverse()) {
		const tr = document.createElement("tr");
		tr.innerHTML = `
      <td>${new Date(row[0]).toLocaleString()}</td>
      <td>${Number(row[1]).toFixed(2)}</td>
      <td>${Number(row[2]).toFixed(2)}</td>
      <td>${Number(row[3]).toFixed(2)}</td>
      <td>${Number(row[4]).toFixed(2)}</td>
      <td>${Number(row[5]).toFixed(3)}</td>
    `;
		tbody.appendChild(tr);
	}
}

document.getElementById("load-feed")!.onclick = loadFeed;
// Auto-load feed on page load
window.addEventListener("DOMContentLoaded", loadFeed);

// Auto-load strategies on page load
window.addEventListener("DOMContentLoaded", () => {
	document.getElementById("load-strategies")!.click();
	liveFeedActive = true;
	liveFeedBtn.textContent = "Stop Live Feed";
	startLiveRawFeed();
});

// Add a chart container
const chartDiv = document.createElement("div");
chartDiv.innerHTML = `
  <h2>Strategy Result Chart</h2>
  <canvas id="result-chart" width="800" height="400"></canvas>
`;
app!.appendChild(chartDiv);
let chart: Chart | null = null;

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
	const errorCorrectedForecast = data.result.errorCorrectedForecast;
	const datasets = [
		{
			label: "Actual Price",
			data: price,
			borderColor: "blue",
			fill: false,
		},
	];
	if (forecast && forecast.length === price.length) {
		datasets.push({
			label: "ARIMA Forecast",
			data: forecast,
			borderColor: "green",
			fill: false,
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
			// @ts-ignore
			spanGaps: true,
			// @ts-ignore
			borderWidth: 2,
		});
	}
	// Remove MACD_HIST Forecast overlay from chart
	// if (macdHistForecast && macdHistForecast.length === price.length) {
	// 	datasets.push({
	// 		label: "MACD_HIST Forecast",
	// 		data: macdHistForecast,
	// 		borderColor: "#00ff99",
	// 		fill: false,
	// 		pointRadius: 1,
	// 		spanGaps: true,
	// 		borderWidth: 2,
	// 		borderDash: [6, 4] as any,
	// 		segment: {
	// 			borderDash: [6, 4],
	// 		},
	// 		yAxisID: "y",
	// 	} as any);
	// }
	if (chart) chart.destroy();
	chart = new Chart(ctx, {
		type: "line",
		data: {
			labels,
			datasets,
		},
		options: {
			responsive: false,
			plugins: {
				legend: { display: true },
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
				x: { display: true, title: { display: true, text: "Time" } },
				y: { display: true, title: { display: true, text: "Price (USD)" } },
			},
		},
	});
}

// Show result summary (date range, price stats, forecast error)
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
	summaryDiv.innerHTML = `
    <b>Result Summary:</b><br/>
    Date Range: <b>${dates[0]}</b> to <b>${dates[dates.length - 1]}</b><br/>
    Price: min <b>${min}</b>, max <b>${max}</b>, mean <b>${mean}</b><br/>
    ${
			forecastError !== null
				? `Mean Forecast Error: <b>${forecastError}</b><br/>`
				: ""
		}
    Data points: <b>${n}</b>
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
let lastRawData: any = null;
let liveFeedInterval: number | null = null;

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

// Add a toggle for live feed
const liveFeedBtn = document.createElement("button");
liveFeedBtn.textContent = "Start Live Feed";
liveFeedBtn.style.margin = "0.5em";
let liveFeedActive = false;
liveFeedBtn.onclick = () => {
	liveFeedActive = !liveFeedActive;
	if (liveFeedActive) {
		liveFeedBtn.textContent = "Stop Live Feed";
		startLiveRawFeed();
	} else {
		liveFeedBtn.textContent = "Start Live Feed";
		stopLiveRawFeed();
	}
};
app!.insertBefore(liveFeedBtn, document.getElementById("summary"));

// Stop live feed on page unload
window.addEventListener("beforeunload", stopLiveRawFeed);

// When output is set, always hide it by default and update summary
rawScroll.style.display = "none";
toggleRawBtn.textContent = "Show Raw Data";
