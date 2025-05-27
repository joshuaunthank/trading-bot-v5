// src/components/websocket.ts
// Minimal, robust OHLCV WebSocket manager for frontend

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

export function connectOhlcvWebSocket(symbol: string, timeframe: string) {
	if (ws && wsSymbol === symbol && wsTimeframe === timeframe) return;
	if (ws) disconnectOhlcvWebSocket();
	wsSymbol = symbol;
	wsTimeframe = timeframe;
	console.log(symbol, timeframe);

	const wsUrl = `ws://${
		window.location.hostname
	}:3001/ws/ohlcv?symbol=${encodeURIComponent(
		symbol
	)}&timeframe=${encodeURIComponent(timeframe)}`;
	console.log("[frontend WS] Connecting to", wsUrl);
	ws = new WebSocket(wsUrl);
	if (statusListener) statusListener("connecting");
	ws.onopen = () => {
		console.log("[frontend WS] Connected");
		if (statusListener) statusListener("connected");
	};
	ws.onclose = () => {
		console.log("[frontend WS] Closed");
		if (statusListener) statusListener("closed");
		ws = null;
		wsSymbol = null;
		wsTimeframe = null;
	};
	ws.onerror = (e) => {
		console.error("[frontend WS] Error", e);
		if (statusListener) statusListener("error");
	};
	ws.onmessage = (event) => {
		try {
			const msg = JSON.parse(event.data);
			if (msg.type === "ohlcv" && ohlcvListener) {
				ohlcvListener(msg as OhlcvCandle);
			}
		} catch (err) {
			console.error("[frontend WS] Malformed message", err);
		}
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
		console.log("[frontend WS] Disconnected");
	}
}

export function onOhlcvUpdate(listener: OhlcvListener) {
	ohlcvListener = listener;
}

export function onOhlcvStatus(listener: StatusListener) {
	statusListener = listener;
}
