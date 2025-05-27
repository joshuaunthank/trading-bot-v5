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
	console.log("[WS] setupOhlcvWebSocket called");
	if (wss) {
		console.log("[WS] WebSocketServer already initialized");
		return; // Prevent double-init
	}
	wss = new WebSocketServer({ server, path: "/ws/ohlcv" });
	console.log("[WS] WebSocketServer created at /ws/ohlcv");

	wss.on("connection", (ws, req) => {
		console.log("[WS] New client connection received");
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

		console.log(
			`[WS] Client connected: symbol=${symbol}, timeframe=${timeframe}`
		);

		ws.on("message", (msg) => {
			try {
				const data = JSON.parse(msg.toString());
				if (data.symbol) symbol = data.symbol;
				if (data.timeframe) timeframe = data.timeframe;
				console.log(
					`[WS] Client updated params: symbol=${symbol}, timeframe=${timeframe}`
				);
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

		console.log(`[WS] Connecting to Binance WS: ${binanceUrl}`);

		function connectBinance() {
			binanceWs = new WsWebSocket(binanceUrl);
			binanceWs.on("open", () => {
				console.log(`[WS] Binance WS open for ${symbol} ${timeframe}`);
				ws.send(
					JSON.stringify({
						type: "info",
						message: `Subscribed to ${symbol} ${timeframe}`,
					})
				);
			});
			binanceWs.on("message", async (data: Buffer) => {
				try {
					console.log(`[WS] Binance kline raw:`, data.toString());
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

						const currentPrice = candle.close;
						const payload = { type: "ohlcv", ...candle, currentPrice };
						console.log(`[WS] Sending to frontend:`, payload);
						ws.send(JSON.stringify(payload));
					}
				} catch (err) {
					console.error(`[WS] Malformed Binance kline data:`, err);
					ws.send(
						JSON.stringify({
							type: "error",
							message: "Malformed Binance kline data",
						})
					);
				}
			});
			binanceWs.on("close", () => {
				console.log(`[WS] Binance WS closed for ${symbol} ${timeframe}`);
				if (!closed)
					ws.send(
						JSON.stringify({ type: "info", message: "Binance stream closed" })
					);
			});
			binanceWs.on("error", (err: any) => {
				console.error(`[WS] Binance WS error:`, err);
				ws.send(
					JSON.stringify({ type: "error", message: "Binance stream error" })
				);
			});
		}

		connectBinance();

		ws.on("close", () => {
			closed = true;
			console.log(
				`[WS] Client disconnected: symbol=${symbol}, timeframe=${timeframe}`
			);
			if (binanceWs) binanceWs.close();
		});
		ws.on("error", (err) => {
			closed = true;
			console.error(`[WS] Client error:`, err);
			if (binanceWs) binanceWs.close();
		});
	});
}
