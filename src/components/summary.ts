// src/components/summary.ts

export function showSummary(data: any) {
	const summaryDiv = document.getElementById("summary");
	if (!summaryDiv) return;
	if (!data || !data.result) {
		summaryDiv.innerHTML = "<em>No summary available.</em>";
		return;
	}
	// Example: show basic stats, can be extended
	const r = data.result;
	let html = `<h3>Strategy Summary</h3>`;
	if (r.strategy) html += `<div><b>Strategy:</b> ${r.strategy}</div>`;
	if (r.config)
		html += `<div><b>Config:</b> <pre>${JSON.stringify(
			r.config,
			null,
			2
		)}</pre></div>`;
	if (r.message) html += `<div><b>Message:</b> ${r.message}</div>`;
	if (r.endingBalance !== undefined && r.startingBalance !== undefined) {
		html += `<div><b>Starting Balance:</b> ${r.startingBalance}</div>`;
		html += `<div><b>Ending Balance:</b> ${r.endingBalance}</div>`;
	}
	if (r.cumulativePnL && r.cumulativePnL.percent !== undefined) {
		html += `<div><b>Cumulative PnL:</b> ${r.cumulativePnL.percent.toFixed(
			2
		)}%</div>`;
	}
	summaryDiv.innerHTML = html;
}

// You can extend this to show more detailed stats, trades, etc.
