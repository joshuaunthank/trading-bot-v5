import { pro as ccxt } from "ccxt";
import { config } from "./config";
import { WebSocketServer, WebSocket as WsWebSocket } from "ws";
import * as http from "http";
import { strategyManager } from "./StrategyManager";

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

// WebSocket subscriptions management
const subscriptions = new Map<
	string,
	{
		clients: Set<WsWebSocket>;
		isRunning: boolean;
		controller?: AbortController;
		lastSentCandle?: { timestamp: number; close: number; volume: number }; // Track last sent candle for incremental updates
		cachedFullDataset?: OHLCVCandle[]; // Cache full dataset for immediate response
	}
>();

// Function to get historical OHLCV data using CCXT Pro
export async function getOHLCVData(
	symbol: string = "BTC/USDT",
	timeframe: string = "1h",
	limit: number = 1000
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

	wss.on("connection", (ws: WsWebSocket, req: http.IncomingMessage) => {
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
		if (!subscriptions.has(subscriptionKey)) {
			console.log(`[Main WS] Creating new subscription for ${subscriptionKey}`);
			createCCXTProSubscription(symbol, timeframe, subscriptionKey);
		}

		const subscription = subscriptions.get(subscriptionKey)!;
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

			// Send immediate data if available (cached full dataset)
			if (
				subscription.cachedFullDataset &&
				subscription.cachedFullDataset.length > 0
			) {
				console.log(
					`[Main WS] Sending immediate cached data to new client: ${subscription.cachedFullDataset.length} candles`
				);

				ws.send(
					JSON.stringify({
						type: "ohlcv",
						updateType: "full",
						data: subscription.cachedFullDataset,
						symbol,
						timeframe,
					})
				);
			}
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

			const subscription = subscriptions.get(subscriptionKey);
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
			const subscription = subscriptions.get(subscriptionKey);
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
		lastSentCandle: undefined, // Track last sent candle
		cachedFullDataset: undefined, // Pre-cached full dataset for fast initial response
	};

	subscriptions.set(subscriptionKey, subscription);

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

		// Pre-fetch initial dataset to reduce first connection delay
		console.log(
			`[Main WS] Pre-fetching historical data for ${symbol} ${timeframe}`
		);
		try {
			const initialData = await getOHLCVData(symbol, timeframe, 1000);
			const subscription = subscriptions.get(subscriptionKey);
			if (subscription) {
				subscription.cachedFullDataset = initialData;
				console.log(
					`[Main WS] Pre-fetched ${initialData.length} candles for fast initial response`
				);
			}
		} catch (error) {
			console.log(`[Main WS] Pre-fetch failed, will fetch on demand:`, error);
		}
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

			// Get subscription to check for changes
			const subscription = subscriptions.get(subscriptionKey);
			if (!subscription || subscription.clients.size === 0) {
				continue;
			}

			// Convert raw CCXT data to our format for comparison
			const formattedCurrentData = ohlcv.map(
				([timestamp, open, high, low, close, volume]: any[]) => ({
					timestamp,
					open,
					high,
					low,
					close,
					volume,
				})
			);

			// Check if this is a meaningful update by comparing with last sent candle
			let shouldSendUpdate = true;
			let updateType: "full" | "incremental" = "incremental";

			if (formattedCurrentData.length > 0) {
				// Get the latest candle (CCXT returns chronological order, so last element is newest)
				const latestCandle =
					formattedCurrentData[formattedCurrentData.length - 1];

				// Check if we should send incremental or full update
				if (!subscription.lastSentCandle) {
					// First connection - send full dataset
					updateType = "full";
					console.log(`[Main WS] First connection, sending full dataset`);
				} else {
					// Compare with last sent candle to see if there's a meaningful change
					const lastSent = subscription.lastSentCandle;
					const priceChanged =
						Math.abs(latestCandle.close - lastSent.close) > 0.001; // More sensitive
					const volumeChanged =
						Math.abs(latestCandle.volume - lastSent.volume) > 0.0001; // More sensitive
					const timestampChanged =
						latestCandle.timestamp !== lastSent.timestamp;

					if (timestampChanged) {
						// New candle - send full update to show the new candle
						updateType = "full";
						console.log(`[Main WS] New candle detected, sending full update`);
					} else if (priceChanged || volumeChanged) {
						// Same candle, but price/volume changed - send incremental
						updateType = "incremental";
						console.log(
							`[Main WS] Price/volume changed on current candle, sending incremental update`
						);
					} else {
						shouldSendUpdate = false;
						console.log(`[Main WS] No significant changes, skipping update`);
					}
				}
			}

			if (!shouldSendUpdate) {
				continue; // Skip this iteration
			}

			// Get the appropriate dataset to send
			let fullOhlcv = ohlcv;

			if (updateType === "full") {
				// Send full dataset on first connection - use cached data if available
				if (
					subscription.cachedFullDataset &&
					subscription.cachedFullDataset.length > 0
				) {
					fullOhlcv = subscription.cachedFullDataset;
					console.log(
						`[Main WS] Using pre-cached dataset: ${fullOhlcv.length} candles`
					);
				} else {
					// Fallback: try cache or fetch fresh data
					try {
						const cachedOhlcv =
							ex.ohlcvs && ex.ohlcvs[symbol] && ex.ohlcvs[symbol][timeframe];
						if (cachedOhlcv && cachedOhlcv.length > ohlcv.length) {
							fullOhlcv = cachedOhlcv;
							console.log(
								`[Main WS] Using exchange cached data: ${fullOhlcv.length} candles`
							);
						} else {
							console.log(
								`[Main WS] Fetching fresh OHLCV data for complete dataset`
							);
							fullOhlcv = await ex.fetchOHLCV(
								symbol,
								timeframe,
								undefined,
								1000
							);
						}
					} catch (error) {
						console.log(
							`[Main WS] Could not get full OHLCV data, using incremental: ${
								error instanceof Error ? error.message : String(error)
							}`
						);
						fullOhlcv = ohlcv;
					}
				}
			} else {
				// For incremental updates, just send the latest candle
				fullOhlcv = [ohlcv[0]]; // Send only the most recent candle
				console.log(`[Main WS] Sending incremental update with latest candle`);
			}

			// Send data to clients
			const dataToSend = fullOhlcv;

			// Debug logging to check data length
			console.log(
				`[Main WS] Sending ${updateType} OHLCV array length: ${dataToSend.length} candles`
			);

			// Broadcast to all clients immediately - no throttling for financial data
			if (subscription.clients.size > 0) {
				let formattedData: OHLCVCandle[];

				// Check if dataToSend is already in our format (from cache) or needs conversion (from CCXT)
				if (
					dataToSend.length > 0 &&
					typeof dataToSend[0] === "object" &&
					"timestamp" in dataToSend[0]
				) {
					// Data is already in our OHLCVCandle format (from cache)
					formattedData = dataToSend as OHLCVCandle[];
				} else {
					// Data is in CCXT format [timestamp, open, high, low, close, volume][], needs conversion
					formattedData = (dataToSend as any[][])
						.map(([timestamp, open, high, low, close, volume]: any[]) => ({
							timestamp,
							open,
							high,
							low,
							close,
							volume,
						}))
						.sort((a, b) => b.timestamp - a.timestamp); // Sort newest first
				}

				// Track the latest candle for next update comparison
				if (formattedData.length > 0) {
					const latestCandle = formattedData[0];
					subscription.lastSentCandle = {
						timestamp: latestCandle.timestamp,
						close: latestCandle.close,
						volume: latestCandle.volume,
					};
				}

				const message = {
					type: "ohlcv",
					symbol,
					timeframe,
					updateType, // "full" or "incremental"
					data: updateType === "incremental" ? formattedData[0] : formattedData, // Send single candle for incremental
					timestamp: Date.now(),
				};

				// Debug logging for live data
				if (formattedData.length > 0) {
					const latestCandle = formattedData[0]; // Now it's properly formatted
					console.log(
						`[Main WS] Sending ${updateType} update - ${
							formattedData.length
						} candles, Latest: ${new Date(
							latestCandle.timestamp
						).toISOString()}, Close: ${latestCandle.close}, Volume: ${
							latestCandle.volume
						}`
					);

					// Distribute data to Strategy Manager for strategy processing
					try {
						if (updateType === "incremental") {
							// For incremental updates, send the latest candle to strategy manager
							strategyManager.onNewCandle(latestCandle);
						}
						// For full updates, we don't send to strategy manager as it's just initial load
					} catch (error) {
						console.error(
							"[Main WS] Error distributing data to Strategy Manager:",
							error
						);
					}
				}

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
					`[Main WS] Broadcasted ${updateType} OHLCV data (${formattedData.length} candles) to ${subscription.clients.size} clients`
				);
			}
		} catch (error) {
			console.error(
				`[Main WS] Error in watch loop for ${subscriptionKey}:`,
				error
			);

			// Notify clients of the error
			const subscription = subscriptions.get(subscriptionKey);
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
	const subscription = subscriptions.get(subscriptionKey);
	if (subscription) {
		console.log(`[Main WS] Stopping subscription for ${subscriptionKey}`);
		subscription.isRunning = false;
		subscription.controller?.abort();
		subscriptions.delete(subscriptionKey);
	}
}

// Cleanup function
export async function cleanupMainWebSocket() {
	console.log("[Main WS] Cleaning up WebSocket server");

	// Stop all subscriptions
	subscriptions.forEach((subscription, key) => {
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
