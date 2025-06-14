import { pro as ccxt } from "ccxt";
import { config } from "./config";
import { WebSocketServer, WebSocket as WsWebSocket } from "ws";
import * as http from "http";

interface OHLCVCandle {
	timestamp: number;
	open: number;
	high: number;
	close: number;
	low: number;
	volume: number;
}

// CCXT Pro Exchange instance with proper configuration
let exchange: any | null = null;

function getExchange(): any {
	if (!exchange) {
		exchange = new ccxt.binance({
			apiKey: config.BINANCE_API_KEY || process.env.BINANCE_API_KEY,
			secret: config.BINANCE_API_SECRET || process.env.BINANCE_API_SECRET,
			options: {
				defaultType: "spot", // Use spot instead of margin to avoid complications
				OHLCVLimit: 1000, // Set cache limit for OHLCV
				newUpdates: true, // Enable newUpdates mode for real-time data
			},
			enableRateLimit: true,
		});
	}
	return exchange;
}

// Function to get historical OHLCV data using CCXT Pro
export async function getOHLCVData(
	symbol: string = "BTC/USDT",
	timeframe: string = "1h",
	limit: number = 100
): Promise<OHLCVCandle[]> {
	try {
		const ex = getExchange();
		await ex.loadMarkets();

		// Fetch recent OHLCV data - CCXT returns in chronological order (oldest first)
		const ohlcv = await ex.fetchOHLCV(symbol, timeframe, undefined, limit);

		const result = ohlcv
			.map(([timestamp, open, high, low, close, volume]: any[]) => ({
				timestamp,
				open,
				high,
				low,
				close,
				volume,
			}))
			// Sort by timestamp descending (newest first) for frontend display
			.sort(
				(a: { timestamp: number }, b: { timestamp: number }) =>
					b.timestamp - a.timestamp
			);

		console.log(
			`[CCXT] Fetched ${result.length} candles for ${symbol} ${timeframe}`
		);
		if (result.length > 0) {
			console.log(
				`[CCXT] Latest candle: ${new Date(result[0].timestamp).toISOString()}`
			);
			console.log(
				`[CCXT] Oldest candle: ${new Date(
					result[result.length - 1].timestamp
				).toISOString()}`
			);
		}

		return result;
	} catch (error) {
		console.error("[CCXT Pro] Error fetching OHLCV data:", error);
		throw error;
	}
}

// WebSocket server for streaming OHLCV data
let wss: WebSocketServer | null = null;
const activeSubscriptions = new Map<
	string,
	{
		clients: Set<WsWebSocket>;
		isRunning: boolean;
		controller?: AbortController;
	}
>();

export function setupMainWebSocket(server: http.Server) {
	console.log("[Main WS] Setting up WebSocket server using CCXT Pro");

	if (wss) {
		console.log("[Main WS] WebSocketServer already initialized");
		return;
	}

	wss = new WebSocketServer({
		server,
		path: "/ws/ohlcv",
		perMessageDeflate: false,
	});

	console.log("[Main WS] WebSocketServer created at /ws/ohlcv (CCXT Pro)");

	wss.on("connection", (ws, req) => {
		const clientId = Math.random().toString(36).substr(2, 9);
		console.log(`[Main WS] New client connection (ID: ${clientId})`);

		let symbol = "BTC/USDT";
		let timeframe = "1h";

		// Get params from query string
		const url = new URL(req.url || "", "http://localhost");
		if (url.searchParams.get("symbol")) {
			symbol = url.searchParams.get("symbol")!;
		}
		if (url.searchParams.get("timeframe")) {
			timeframe = url.searchParams.get("timeframe")!;
		}

		const subscriptionKey = `${symbol}_${timeframe}`;
		console.log(
			`[Main WS] Client ${clientId} subscribing to ${subscriptionKey}`
		);

		// Get or create subscription
		if (!activeSubscriptions.has(subscriptionKey)) {
			console.log(`[Main WS] Creating new subscription for ${subscriptionKey}`);
			createCCXTProSubscription(symbol, timeframe, subscriptionKey);
		}

		const subscription = activeSubscriptions.get(subscriptionKey)!;
		subscription.clients.add(ws);
		console.log(
			`[Main WS] Added client ${clientId} to ${subscriptionKey}. Total clients: ${subscription.clients.size}`
		);

		// Send initial connection confirmation
		try {
			ws.send(
				JSON.stringify({
					type: "connection",
					status: "connected",
					symbol,
					timeframe,
					message: `Connected to ${symbol} ${timeframe} using CCXT Pro`,
				})
			);
		} catch (e) {
			console.error(
				`[Main WS] Error sending initial message to client ${clientId}:`,
				e
			);
		}

		ws.on("message", (msg) => {
			try {
				const data = JSON.parse(msg.toString());
				console.log(`[Main WS] Message from client ${clientId}:`, data);
			} catch (error) {
				console.error(
					`[Main WS] Failed to parse message from client ${clientId}:`,
					error
				);
			}
		});

		ws.on("close", (code, reason) => {
			console.log(
				`[Main WS] Client ${clientId} disconnected: code=${code}, reason=${reason}`
			);

			const subscription = activeSubscriptions.get(subscriptionKey);
			if (subscription) {
				subscription.clients.delete(ws);
				console.log(
					`[Main WS] Removed client ${clientId} from ${subscriptionKey}. Remaining: ${subscription.clients.size}`
				);

				// If no more clients, stop the subscription
				if (subscription.clients.size === 0) {
					console.log(
						`[Main WS] No more clients for ${subscriptionKey}, stopping subscription`
					);
					stopSubscription(subscriptionKey);
				}
			}
		});

		ws.on("error", (error) => {
			console.error(`[Main WS] WebSocket error for client ${clientId}:`, error);
			const subscription = activeSubscriptions.get(subscriptionKey);
			if (subscription) {
				subscription.clients.delete(ws);
			}
		});
	});
}

function createCCXTProSubscription(
	symbol: string,
	timeframe: string,
	subscriptionKey: string
) {
	const controller = new AbortController();
	const clients = new Set<WsWebSocket>();

	const subscription = {
		clients,
		isRunning: true,
		controller,
	};

	activeSubscriptions.set(subscriptionKey, subscription);

	// Start the CCXT Pro watch loop
	startWatchLoop(symbol, timeframe, subscriptionKey, controller.signal);
}

async function startWatchLoop(
	symbol: string,
	timeframe: string,
	subscriptionKey: string,
	signal: AbortSignal
) {
	console.log(`[Main WS] Starting watch loop for ${subscriptionKey}`);

	const ex = getExchange();

	try {
		await ex.loadMarkets();
		console.log(`[Main WS] Markets loaded for ${subscriptionKey}`);
	} catch (error) {
		console.error(
			`[Main WS] Failed to load markets for ${subscriptionKey}:`,
			error
		);
		return;
	}

	while (!signal.aborted) {
		try {
			console.log(`[Main WS] Calling watchOHLCV for ${symbol} ${timeframe}`);

			// This is the correct way to use CCXT Pro watchOHLCV
			const ohlcv = await ex.watchOHLCV(symbol, timeframe);

			console.log(
				`[Main WS] Received OHLCV data for ${subscriptionKey}, ${ohlcv.length} candles`
			);

			// Broadcast to all clients
			const subscription = activeSubscriptions.get(subscriptionKey);
			if (subscription && subscription.clients.size > 0) {
				const message = {
					type: "ohlcv",
					symbol,
					timeframe,
					data: ohlcv.map(
						([timestamp, open, high, low, close, volume]: any[]) => ({
							timestamp,
							open,
							high,
							low,
							close,
							volume,
						})
					),
					timestamp: Date.now(),
				};

				subscription.clients.forEach((ws) => {
					try {
						if (ws.readyState === WsWebSocket.OPEN) {
							ws.send(JSON.stringify(message));
						}
					} catch (e) {
						console.error(`[Main WS] Error sending data to client:`, e);
					}
				});

				console.log(
					`[Main WS] Broadcasted OHLCV data to ${subscription.clients.size} clients`
				);
			}
		} catch (error) {
			console.error(
				`[Main WS] Error in watch loop for ${subscriptionKey}:`,
				error
			);

			// Notify clients of the error
			const subscription = activeSubscriptions.get(subscriptionKey);
			if (subscription) {
				const errorMessage = {
					type: "error",
					symbol,
					timeframe,
					message: (error as Error).message || "Unknown error",
					timestamp: Date.now(),
				};

				subscription.clients.forEach((ws) => {
					try {
						if (ws.readyState === WsWebSocket.OPEN) {
							ws.send(JSON.stringify(errorMessage));
						}
					} catch (e) {
						console.error(
							`[Main WS] Error sending error message to client:`,
							e
						);
					}
				});
			}

			// Wait before retrying
			await new Promise((resolve) => setTimeout(resolve, 5000));
		}
	}

	console.log(`[Main WS] Watch loop stopped for ${subscriptionKey}`);
}

function stopSubscription(subscriptionKey: string) {
	const subscription = activeSubscriptions.get(subscriptionKey);
	if (subscription) {
		console.log(`[Main WS] Stopping subscription for ${subscriptionKey}`);
		subscription.isRunning = false;
		subscription.controller?.abort();
		activeSubscriptions.delete(subscriptionKey);
	}
}

// Cleanup function
export async function cleanupMainWebSocket() {
	console.log("[Main WS] Cleaning up WebSocket server");

	// Stop all subscriptions
	activeSubscriptions.forEach((subscription, key) => {
		stopSubscription(key);
	});

	// Close WebSocket server
	if (wss) {
		wss.close();
		wss = null;
	}

	// Close CCXT Pro exchange
	if (exchange) {
		try {
			await exchange.close();
		} catch (error) {
			console.error("[Main WS] Error closing exchange:", error);
		}
		exchange = null;
	}

	console.log("[Main WS] Cleanup completed");
}
