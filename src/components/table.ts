import { OhlcvCandle } from "./websocket";

// Table rendering and update logic for OHLCV data

let tableElement: HTMLTableElement | null = null;
let ohlcvRows: OhlcvCandle[] = [];

export function initTable(table: HTMLTableElement, candles: OhlcvCandle[]) {
	tableElement = table;
	ohlcvRows = [...candles];
	renderTable();
}

export function renderTable() {
	if (!tableElement) return;
	tableElement.innerHTML = `
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
		<tbody>
			${ohlcvRows
				.map(
					(c) => `
				<tr>
					<td>${new Date(c.timestamp).toLocaleTimeString()}</td>
					<td>${c.open}</td>
					<td>${c.high}</td>
					<td>${c.low}</td>
					<td>${c.close}</td>
					<td>${c.volume}</td>
				</tr>
				`
				)
				.join("")}
		</tbody>
	`;
}

// Incrementally update the last row with currentPrice (for live table updates)
export function updateLastOhlcvRow(currentPrice: number) {
	if (ohlcvRows.length === 0) return;
	const last = ohlcvRows[ohlcvRows.length - 1];
	last.close = currentPrice;
	if (currentPrice > last.high) last.high = currentPrice;
	if (currentPrice < last.low) last.low = currentPrice;
	renderTable();
}

// For full refresh (e.g., on new finalized candle)
export function updateTableData(candles: OhlcvCandle[]) {
	ohlcvRows = [...candles];
	renderTable();
}
