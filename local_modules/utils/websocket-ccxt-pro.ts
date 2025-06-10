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

		const ohlcv = await ex.fetchOHLCV(symbol, timeframe, undefined, limit);
		return ohlcv.map(([timestamp, open, high, low, close, volume]: any[]) => ({
			timestamp,
			open,
			high,
			low,
			close,
			volume,
		}));
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

export function setupCCXTProWebSocket(server: http.Server) {
	console.log("[CCXT Pro WS] Setting up WebSocket server");

	if (wss) {
		console.log("[CCXT Pro WS] WebSocketServer already initialized");
		return;
	}

	wss = new WebSocketServer({
		server,
		path: "/ws/ohlcv",
		perMessageDeflate: false,
	});

	console.log("[CCXT Pro WS] WebSocketServer created at /ws/ohlcv");

	wss.on("connection", (ws, req) => {
		const clientId = Math.random().toString(36).substr(2, 9);
		console.log(`[CCXT Pro WS] New client connection (ID: ${clientId})`);

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
			`[CCXT Pro WS] Client ${clientId} subscribing to ${subscriptionKey}`
		);

		// Get or create subscription
		if (!activeSubscriptions.has(subscriptionKey)) {
			console.log(
				`[CCXT Pro WS] Creating new subscription for ${subscriptionKey}`
			);
			createCCXTProSubscription(symbol, timeframe, subscriptionKey);
		}

		const subscription = activeSubscriptions.get(subscriptionKey)!;
		subscription.clients.add(ws);
		console.log(
			`[CCXT Pro WS] Added client ${clientId} to ${subscriptionKey}. Total clients: ${subscription.clients.size}`
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
				`[CCXT Pro WS] Error sending initial message to client ${clientId}:`,
				e
			);
		}

		ws.on("message", (msg) => {
			try {
				const data = JSON.parse(msg.toString());
				console.log(`[CCXT Pro WS] Message from client ${clientId}:`, data);
			} catch (error) {
				console.error(
					`[CCXT Pro WS] Failed to parse message from client ${clientId}:`,
					error
				);
			}
		});

		ws.on("close", (code, reason) => {
			console.log(
				`[CCXT Pro WS] Client ${clientId} disconnected: code=${code}, reason=${reason}`
			);

			const subscription = activeSubscriptions.get(subscriptionKey);
			if (subscription) {
				subscription.clients.delete(ws);
				console.log(
					`[CCXT Pro WS] Removed client ${clientId} from ${subscriptionKey}. Remaining: ${subscription.clients.size}`
				);

				// If no more clients, stop the subscription
				if (subscription.clients.size === 0) {
					console.log(
						`[CCXT Pro WS] No more clients for ${subscriptionKey}, stopping subscription`
					);
					stopSubscription(subscriptionKey);
				}
			}
		});

		ws.on("error", (error) => {
			console.error(
				`[CCXT Pro WS] WebSocket error for client ${clientId}:`,
				error
			);
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
	console.log(`[CCXT Pro WS] Starting watch loop for ${subscriptionKey}`);

	const ex = getExchange();

	try {
		await ex.loadMarkets();
		console.log(`[CCXT Pro WS] Markets loaded for ${subscriptionKey}`);
	} catch (error) {
		console.error(
			`[CCXT Pro WS] Failed to load markets for ${subscriptionKey}:`,
			error
		);
		return;
	}

	while (!signal.aborted) {
		try {
			console.log(
				`[CCXT Pro WS] Calling watchOHLCV for ${symbol} ${timeframe}`
			);

			// This is the correct way to use CCXT Pro watchOHLCV
			const ohlcv = await ex.watchOHLCV(symbol, timeframe);

			console.log(
				`[CCXT Pro WS] Received OHLCV data for ${subscriptionKey}, ${ohlcv.length} candles`
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
						console.error(`[CCXT Pro WS] Error sending data to client:`, e);
					}
				});

				console.log(
					`[CCXT Pro WS] Broadcasted OHLCV data to ${subscription.clients.size} clients`
				);
			}
		} catch (error) {
			console.error(
				`[CCXT Pro WS] Error in watch loop for ${subscriptionKey}:`,
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
							`[CCXT Pro WS] Error sending error message to client:`,
							e
						);
					}
				});
			}

			// Wait before retrying
			await new Promise((resolve) => setTimeout(resolve, 5000));
		}
	}

	console.log(`[CCXT Pro WS] Watch loop stopped for ${subscriptionKey}`);
}

function stopSubscription(subscriptionKey: string) {
	const subscription = activeSubscriptions.get(subscriptionKey);
	if (subscription) {
		console.log(`[CCXT Pro WS] Stopping subscription for ${subscriptionKey}`);
		subscription.isRunning = false;
		subscription.controller?.abort();
		activeSubscriptions.delete(subscriptionKey);
	}
}

// Cleanup function
export async function cleanupCCXTProWebSocket() {
	console.log("[CCXT Pro WS] Cleaning up WebSocket server");

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
			console.error("[CCXT Pro WS] Error closing exchange:", error);
		}
		exchange = null;
	}

	console.log("[CCXT Pro WS] Cleanup completed");
}
