import { pro as ccxt } from "ccxt";
import { config } from "./utils/config";
import { WebSocketServer, WebSocket as WsWebSocket } from "ws";
import * as http from "http";

// In-memory cache: { [symbol_timeframe]: [ [timestamp, open, high, low, close, volume], ... ] }
const ohlcvCache: Record<string, Array<any[]>> = {};
const exchange = new ccxt.binance({
	apiKey: config.binanceApiKey,
	secret: config.binanceApiSecret,
	options: { defaultType: "margin" },
	enableRateLimit: true,
});

export async function subscribeOhlcv(
	symbol: string,
	timeframe: string,
	limit: number = 1000
) {
	const cacheKey = `${symbol}_${timeframe}`;
	if (ohlcvCache[cacheKey]) return; // Already subscribed
	ohlcvCache[cacheKey] = [];
	(async () => {
		while (true) {
			try {
				for await (const ohlcv of await exchange.watchOHLCV(
					symbol,
					timeframe
				)) {
					// ohlcv: [timestamp, open, high, low, close, volume]
					ohlcvCache[cacheKey].push(ohlcv);
					if (ohlcvCache[cacheKey].length > limit) {
						ohlcvCache[cacheKey] = ohlcvCache[cacheKey].slice(-limit);
					}
					if (ohlcvBroadcast) ohlcvBroadcast(symbol, timeframe);
				}
			} catch (err) {
				console.error("WebSocket OHLCV error:", err);
				await new Promise((r) => setTimeout(r, 5000)); // Retry after delay
			}
		}
	})();
}

export function getCachedOhlcv(
	symbol: string,
	timeframe: string,
	limit: number = 1000
) {
	const cacheKey = `${symbol}_${timeframe}`;
	const arr = ohlcvCache[cacheKey] || [];
	return arr.slice(-limit);
}

let ohlcvBroadcast: ((symbol: string, timeframe: string) => void) | undefined;

export function patchOhlcvBroadcast(
	fn: (symbol: string, timeframe: string) => void
) {
	ohlcvBroadcast = fn;
}

// --- WebSocket OHLCV relay ---
let wss: WebSocketServer | null = null;

export function setupOhlcvWebSocket(server: http.Server) {
	if (wss) return; // Prevent double-init
	wss = new WebSocketServer({ server, path: "/ws/ohlcv" });

	wss.on("connection", (ws, req) => {
		let binanceWs: WsWebSocket | null = null;
		let symbol = "BTC/USDT";
		let timeframe = "4h";
		let closed = false;

		// Accept params via query string or first message
		const url = new URL(req.url || "", "http://localhost");
		if (url.searchParams.get("symbol"))
			symbol = url.searchParams.get("symbol")!;
		if (url.searchParams.get("timeframe"))
			timeframe = url.searchParams.get("timeframe")!;

		ws.on("message", (msg) => {
			try {
				const data = JSON.parse(msg.toString());
				if (data.symbol) symbol = data.symbol;
				if (data.timeframe) timeframe = data.timeframe;
			} catch {}
		});

		// Map timeframe to Binance kline interval
		function tfToBinance(tf: string): string {
			const m = tf.match(/^([0-9]+)([mhd])$/i);
			if (!m) return "1m";
			const n = m[1];
			const unit = m[2].toLowerCase();
			if (unit === "m") return `${n}m`;
			if (unit === "h") return `${n}h`;
			if (unit === "d") return `${n}d`;
			return "1m";
		}

		// Binance kline WS endpoint
		const binanceSymbol = symbol.replace("/", "").toLowerCase();
		const binanceInterval = tfToBinance(timeframe);
		const binanceUrl = `wss://stream.binance.com:9443/ws/${binanceSymbol}@kline_${binanceInterval}`;

		function connectBinance() {
			binanceWs = new WsWebSocket(binanceUrl);
			binanceWs.on("open", () => {
				ws.send(
					JSON.stringify({
						type: "info",
						message: `Subscribed to ${symbol} ${timeframe}`,
					})
				);
			});
			binanceWs.on("message", (data: Buffer) => {
				try {
					const msg = JSON.parse(data.toString());
					if (msg.k) {
						const k = msg.k;
						const candle = {
							symbol,
							timeframe,
							timestamp: k.t,
							open: parseFloat(k.o),
							high: parseFloat(k.h),
							low: parseFloat(k.l),
							close: parseFloat(k.c),
							volume: parseFloat(k.v),
							isFinal: !!k.x,
						};
						ws.send(JSON.stringify({ type: "ohlcv", ...candle }));
					}
				} catch (err) {
					ws.send(
						JSON.stringify({
							type: "error",
							message: "Malformed Binance kline data",
						})
					);
				}
			});
			binanceWs.on("close", () => {
				if (!closed)
					ws.send(
						JSON.stringify({ type: "info", message: "Binance stream closed" })
					);
			});
			binanceWs.on("error", (err: any) => {
				ws.send(
					JSON.stringify({ type: "error", message: "Binance stream error" })
				);
			});
		}

		connectBinance();

		ws.on("close", () => {
			closed = true;
			if (binanceWs) binanceWs.close();
		});
		ws.on("error", () => {
			closed = true;
			if (binanceWs) binanceWs.close();
		});
	});
}
