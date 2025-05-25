// src/components/websocket.ts
// Centralized OHLCV WebSocket manager for frontend

export type OhlcvCandle = {
	timestamp: number;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
};

type OhlcvListener = (candle: OhlcvCandle) => void;
type StatusListener = (status: string) => void;

let ws: WebSocket | null = null;
let wsSymbol: string | null = null;
let wsTimeframe: string | null = null;
let ohlcvListener: OhlcvListener | null = null;
let statusListener: StatusListener | null = null;
let debounceTimer: number | null = null;

export function connectOhlcvWebSocket(symbol: string, timeframe: string) {
	// Debounce rapid reconnects
	if (debounceTimer) clearTimeout(debounceTimer);
	debounceTimer = window.setTimeout(() => {
		_connectOhlcvWebSocket(symbol, timeframe);
	}, 200);
}

function _connectOhlcvWebSocket(symbol: string, timeframe: string) {
	if (ws && wsSymbol === symbol && wsTimeframe === timeframe) return;
	if (ws) {
		ws.onclose = null;
		ws.onerror = null;
		ws.onmessage = null;
		ws.close();
		ws = null;
	}
	wsSymbol = symbol;
	wsTimeframe = timeframe;
	const wsUrl = `ws://${
		window.location.hostname
	}:3001/ws/ohlcv?symbol=${encodeURIComponent(
		symbol
	)}&timeframe=${encodeURIComponent(timeframe)}`;
	ws = new WebSocket(wsUrl);
	if (statusListener) statusListener("connecting");
	ws.onopen = () => {
		if (statusListener) statusListener("connected");
	};
	ws.onclose = () => {
		if (statusListener) statusListener("closed");
	};
	ws.onerror = () => {
		if (statusListener) statusListener("error");
	};
	ws.onmessage = (event) => {
		try {
			const msg = JSON.parse(event.data);
			if (msg.type === "ohlcv" && ohlcvListener) {
				ohlcvListener(msg as OhlcvCandle);
			}
		} catch {}
	};
}

export function disconnectOhlcvWebSocket() {
	if (ws) {
		ws.onclose = null;
		ws.onerror = null;
		ws.onmessage = null;
		ws.close();
		ws = null;
		wsSymbol = null;
		wsTimeframe = null;
	}
}

export function onOhlcvUpdate(listener: OhlcvListener) {
	ohlcvListener = listener;
}

export function onOhlcvStatus(listener: StatusListener) {
	statusListener = listener;
}
