import { pro as ccxt } from "ccxt";
import { config } from "./config";
import { WebSocketServer, WebSocket as WsWebSocket } from "ws";
import * as http from "http";

// In-memory cache: { [symbol_timeframe]: [ [timestamp, open, high, low, close, volume], ... ] }
const ohlcvCache: Record<string, Array<any[]>> = {};
const exchange = new ccxt.binance({
	apiKey: config.BINANCE_API_KEY || process.env.BINANCE_API_KEY,
	secret: config.BINANCE_API_SECRET || process.env.BINANCE_API_SECRET,
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
	// Eagerly fetch historical candles first
	try {
		const initial = await exchange.fetchOHLCV(
			symbol,
			timeframe,
			undefined,
			limit
		);
		if (Array.isArray(initial) && initial.length > 0) {
			ohlcvCache[cacheKey] = initial;
		} else {
			ohlcvCache[cacheKey] = [];
		}
	} catch (err) {
		console.error(
			`[ohlcv] Failed to fetch initial OHLCV for ${symbol} ${timeframe}:`,
			err
		);
		ohlcvCache[cacheKey] = [];
	}
	// Now start websocket subscription for live updates
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
const binanceConnections = new Map<
	string,
	{ ws: WsWebSocket; clients: Set<any>; timeout?: NodeJS.Timeout }
>();

export function setupOhlcvWebSocket(server: http.Server) {
	console.log("[WS] setupOhlcvWebSocket called");
	if (wss) {
		console.log("[WS] WebSocketServer already initialized");
		return; // Prevent double-init
	}
	wss = new WebSocketServer({
		server,
		path: "/ws/ohlcv",
		perMessageDeflate: false, // Disable compression to avoid frame issues
	});
	console.log("[WS] WebSocketServer created at /ws/ohlcv");

	wss.on("connection", (ws, req) => {
		const clientId = Math.random().toString(36).substr(2, 9);
		console.log(
			`[WS Backend] New client connection received (ID: ${clientId})`
		);
		let symbol = "BTC/USDT";
		let timeframe = "4h";
		let connectionKey = "";

		// Accept params via query string or first message
		const url = new URL(req.url || "", "http://localhost");
		if (url.searchParams.get("symbol"))
			symbol = url.searchParams.get("symbol")!;
		if (url.searchParams.get("timeframe"))
			timeframe = url.searchParams.get("timeframe")!;

		connectionKey = `${symbol}_${timeframe}`;

		console.log(
			`[WS Backend] Client connected (ID: ${clientId}): symbol=${symbol}, timeframe=${timeframe}, connectionKey=${connectionKey}`
		);

		// TEMPORARILY DISABLE initial message to test connection stability
		/*
		try {
			ws.send(
				JSON.stringify({
					type: "connection",
					message: `Connected to ${symbol} ${timeframe}`,
					status: "connected"
				})
			);
			console.log(`[WS Backend] Sent initial connection message to client ${clientId}`);
		} catch (e) {
			console.error(`[WS Backend] Error sending initial message to client ${clientId}:`, e);
		}
		*/

		// Get or create shared Binance connection
		if (!binanceConnections.has(connectionKey)) {
			console.log(
				`[WS Backend] Creating new Binance connection for ${connectionKey}`
			);
			createBinanceConnection(symbol, timeframe, connectionKey);
		} else {
			console.log(
				`[WS Backend] Reusing existing Binance connection for ${connectionKey}`
			);
		}

		const connection = binanceConnections.get(connectionKey)!;
		connection.clients.add(ws);
		console.log(
			`[WS Backend] Added client ${clientId} to connection ${connectionKey}. Total clients: ${connection.clients.size}`
		);

		// Clear any pending cleanup timeout
		if (connection.timeout) {
			clearTimeout(connection.timeout);
			connection.timeout = undefined;
			console.log(`[WS Backend] Cleared cleanup timeout for ${connectionKey}`);
		}

		ws.on("message", (msg) => {
			try {
				const data = JSON.parse(msg.toString());
				console.log(
					`[WS Backend] Message received from client ${clientId}:`,
					data
				);
				if (data.symbol || data.timeframe) {
					// Handle symbol/timeframe changes if needed
					console.log(
						`[WS Backend] Client ${clientId} param update ignored (not implemented)`
					);
				}
			} catch (error) {
				console.error(
					`[WS Backend] Failed to parse message from client ${clientId}:`,
					error,
					msg.toString()
				);
			}
		});

		ws.on("close", (code, reason) => {
			console.log(
				`[WS Backend] Client ${clientId} disconnected: code=${code}, reason=${reason}, symbol=${symbol}, timeframe=${timeframe}`
			);

			const connection = binanceConnections.get(connectionKey);
			if (connection) {
				connection.clients.delete(ws);
				console.log(
					`[WS Backend] Removed client ${clientId} from connection ${connectionKey}. Remaining clients: ${connection.clients.size}`
				);

				// If no more clients, schedule cleanup
				if (connection.clients.size === 0) {
					console.log(
						`[WS Backend] No more clients for ${connectionKey}, scheduling cleanup in 5 seconds`
					);
					connection.timeout = setTimeout(() => {
						console.log(`[WS Backend] Executing cleanup for ${connectionKey}`);
						console.log(
							`[WS Backend] Cleaning up Binance connection for ${connectionKey}`
						);
						connection.ws.close();
						binanceConnections.delete(connectionKey);
					}, 5000); // 5 second delay before cleanup
				}
			}
		});

		ws.on("error", (error) => {
			console.error(
				`[WS Backend] WebSocket error for client ${clientId}:`,
				error
			);
			console.error(
				`[WS Backend] Error details - Type: ${
					error.constructor.name
				}, Message: ${error.message}, Code: ${(error as any).code || "N/A"}`
			);
			const connection = binanceConnections.get(connectionKey);
			if (connection) {
				connection.clients.delete(ws);
			}
		});
	});
}

function createBinanceConnection(
	symbol: string,
	timeframe: string,
	connectionKey: string
) {
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

	console.log(
		`[WS Backend] Creating shared Binance connection: ${binanceUrl} for key: ${connectionKey}`
	);

	const binanceWs = new WsWebSocket(binanceUrl, {
		perMessageDeflate: false, // Disable compression
	});
	const clients = new Set<any>();

	binanceConnections.set(connectionKey, { ws: binanceWs, clients });

	binanceWs.on("open", () => {
		console.log(
			`[WS Backend] Binance WS open for ${symbol} ${timeframe} (${connectionKey})`
		);
		// Notify all clients
		clients.forEach((ws) => {
			try {
				ws.send(
					JSON.stringify({
						type: "info",
						message: `Subscribed to ${symbol} ${timeframe}`,
					})
				);
			} catch (e) {
				console.error(
					`[WS Backend] Error notifying client of subscription:`,
					e
				);
			}
		});
	});

	binanceWs.on("message", async (data: Buffer) => {
		try {
			const msg = JSON.parse(data.toString());
			if (msg.k) {
				const k = msg.k;
				// Only broadcast finalized candles that are in the cache
				if (k.x) {
					const cacheKey = `${symbol}_${timeframe}`;
					const arr = ohlcvCache[cacheKey] || [];
					const found = arr.find((row) => row[0] === k.t);
					if (found) {
						const candle = {
							symbol,
							timeframe,
							timestamp: k.t,
							open: parseFloat(k.o),
							high: parseFloat(k.h),
							low: parseFloat(k.l),
							close: parseFloat(k.c),
							volume: parseFloat(k.v),
							isFinal: true,
						};

						// Broadcast to all clients
						clients.forEach((ws) => {
							try {
								ws.send(JSON.stringify({ type: "ohlcv", ...candle }));
							} catch (e) {
								// Client might be closed
							}
						});
					}
				}
			}
		} catch (err) {
			console.error(`[WS] Malformed Binance kline data:`, err);
		}
	});

	binanceWs.on("close", (code, reason) => {
		console.log(
			`[WS Backend] Binance WS closed for ${symbol} ${timeframe} (${connectionKey}): code=${code}, reason=${reason}`
		);
		// Notify all clients
		clients.forEach((ws) => {
			try {
				ws.send(
					JSON.stringify({ type: "info", message: "Binance stream closed" })
				);
			} catch (e) {
				console.error(
					`[WS Backend] Error notifying client of stream closure:`,
					e
				);
			}
		});
	});

	binanceWs.on("error", (err: any) => {
		console.error(
			`[WS Backend] Binance WS error for ${symbol} ${timeframe} (${connectionKey}):`,
			err
		);
		// Notify all clients
		clients.forEach((ws) => {
			try {
				ws.send(
					JSON.stringify({ type: "error", message: "Binance stream error" })
				);
			} catch (e) {
				console.error(
					`[WS Backend] Error notifying client of stream error:`,
					e
				);
			}
		});
	});
}
