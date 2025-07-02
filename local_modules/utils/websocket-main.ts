import { pro as ccxt } from "ccxt";
import { config } from "./config";
import { WebSocketServer, WebSocket as WsWebSocket } from "ws";
import * as http from "http";
import { strategyManager } from "./StrategyManager";
import { OHLCVCandle } from "../types/index";
import { calculateIndicators } from "../routes/api-utils/indicator-management";
import { IndicatorConfig } from "../routes/api-utils/indicator-management";
import {
	calculateStrategyIndicators,
	calculateStrategyIndicatorsIncremental,
} from "./strategyIndicators";

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

// --- SESSION CONFIGURATION FOR STRATEGY-BASED STREAMING ---
// Map to store per-client strategy ID for indicator calculations
const clientConfigs = new Map<WsWebSocket, { strategyId: string | null }>();

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
			// Sort by timestamp ascending (oldest first) for proper time series calculations
			.sort(
				(a: { timestamp: number }, b: { timestamp: number }) =>
					a.timestamp - b.timestamp
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

// Strategy WebSocket functionality integrated into main server
interface StrategyResult {
	timestamp: number;
	indicators: Record<string, number[]>;
	models: Record<string, number[]>;
	signals: Record<string, boolean>;
}

// Strategy results cache - maps strategy ID to recent results
const strategyResultsCache: Record<string, StrategyResult[]> = {};
const MAX_STRATEGY_CACHE_SIZE = 1000;

// Strategy WebSocket clients management
const strategyClients: Map<string, Set<WsWebSocket>> = new Map();

/**
 * Add strategy result to cache and broadcast to clients
 */
export function addStrategyResult(
	strategyId: string,
	result: StrategyResult
): void {
	// Add to cache
	if (!strategyResultsCache[strategyId]) {
		strategyResultsCache[strategyId] = [];
	}

	strategyResultsCache[strategyId].push(result);

	// Limit cache size
	if (strategyResultsCache[strategyId].length > MAX_STRATEGY_CACHE_SIZE) {
		strategyResultsCache[strategyId].shift();
	}

	// Broadcast to connected clients for this strategy (via OHLCV WebSocket with strategy param)
	const clients = strategyClients.get(strategyId);
	if (clients && clients.size > 0) {
		const message = JSON.stringify({
			type: "strategy-update",
			strategyId,
			data: result,
			timestamp: Date.now(),
		});

		clients.forEach((ws) => {
			try {
				if (ws.readyState === WsWebSocket.OPEN) {
					ws.send(message);
				}
			} catch (error) {
				console.error(`[Strategy WS] Error sending update to client:`, error);
			}
		});

		console.log(
			`[Strategy WS] Broadcasted strategy update to ${clients.size} OHLCV clients`
		);
	}
}

/**
 * Get strategy results from cache
 */
export function getStrategyResults(
	strategyId: string,
	limit?: number
): StrategyResult[] {
	const results = strategyResultsCache[strategyId] || [];
	if (limit && limit > 0) {
		return results.slice(-limit);
	}
	return results;
}

/**
 * Get list of available strategies
 */
export function getAvailableStrategies(): string[] {
	return Object.keys(strategyResultsCache);
}

export function setupMainWebSocket(server: http.Server) {
	console.log(
		"[Main WS] Setting up unified WebSocket server (OHLCV + Strategy)"
	);

	if (wss) {
		console.log("[Main WS] WebSocketServer already initialized");
		return;
	}

	// Create WebSocket server for OHLCV data with optional strategy integration
	wss = new WebSocketServer({
		server,
		path: "/ws/ohlcv",
		perMessageDeflate: false,
	});

	console.log(
		"[Main WS] WebSocketServer created at /ws/ohlcv with strategy support"
	);

	// Connect to strategy manager events for strategy data integration
	strategyManager.on("signal", ({ strategyId, signal }) => {
		console.log(`[Strategy Integration] Signal from ${strategyId}:`, signal);

		// Create a strategy result with the signal
		const strategyResult: StrategyResult = {
			timestamp: signal.timestamp || Date.now(),
			indicators: {}, // Will be populated by strategy
			models: {}, // Will be populated by strategy
			signals: {
				[`${signal.type}_${signal.side}`]: true,
			},
		};

		// Add to cache and broadcast to strategy subscribers
		addStrategyResult(strategyId, strategyResult);
	});

	// Listen for strategy results (we'll add this event to strategy manager)
	strategyManager.on("strategyResult", ({ strategyId, result }) => {
		console.log(`[Strategy Integration] Result from ${strategyId}`);
		addStrategyResult(strategyId, result);
	});

	wss.on("connection", (ws: WsWebSocket, req: http.IncomingMessage) => {
		const clientId = Math.random().toString(36).substr(2, 9);
		const url = new URL(req.url || "", "http://localhost");

		if (process.env.NODE_ENV === "development") {
			console.log(`[OHLCV WS] New client connection (ID: ${clientId})`);
		}

		handleOhlcvConnection(ws, req, clientId, url);
	});
}

/**
 * Handle OHLCV WebSocket connections with optional strategy integration
 */
function handleOhlcvConnection(
	ws: WsWebSocket,
	req: http.IncomingMessage,
	clientId: string,
	url: URL
) {
	let symbol = "BTC/USDT";
	let timeframe = "1h";
	let strategyId: string | null = null; // Optional strategy subscription

	// Get params from query string
	if (url.searchParams.get("symbol")) {
		symbol = url.searchParams.get("symbol")!;
	}
	if (url.searchParams.get("timeframe")) {
		timeframe = url.searchParams.get("timeframe")!;
	}
	if (url.searchParams.get("strategy")) {
		strategyId = url.searchParams.get("strategy")!;
		console.log(
			`[OHLCV WS] Client ${clientId} also subscribing to strategy: ${strategyId}`
		);
	}

	const subscriptionKey = `${symbol}_${timeframe}`;
	console.log(
		`[OHLCV WS] Client ${clientId} subscribing to ${subscriptionKey}`
	);

	// Get or create subscription
	if (!subscriptions.has(subscriptionKey)) {
		console.log(`[OHLCV WS] Creating new subscription for ${subscriptionKey}`);
		createCCXTProSubscription(symbol, timeframe, subscriptionKey);
	}

	const subscription = subscriptions.get(subscriptionKey)!;
	subscription.clients.add(ws);
	console.log(
		`[OHLCV WS] Added client ${clientId} to ${subscriptionKey}. Total clients: ${subscription.clients.size}`
	);

	// Initialize client config
	clientConfigs.set(ws, { strategyId: null });

	// Send initial connection confirmation
	try {
		const connectionMessage: any = {
			type: "connection",
			status: "connected",
			symbol,
			timeframe,
			message: `Connected to ${symbol} ${timeframe} using CCXT Pro`,
		};

		if (strategyId) {
			connectionMessage.strategyId = strategyId;
			connectionMessage.message += ` with strategy ${strategyId}`;
		}

		ws.send(JSON.stringify(connectionMessage));

		// If client wants strategy data, add them to strategy client management
		if (strategyId) {
			if (!strategyClients.has(strategyId)) {
				strategyClients.set(strategyId, new Set());
			}
			strategyClients.get(strategyId)!.add(ws);
			console.log(
				`[Strategy WS] Added client ${clientId} to strategy ${strategyId} updates`
			);

			// Send any cached strategy results
			const cachedResults = getStrategyResults(strategyId!);
			if (cachedResults.length > 0) {
				ws.send(
					JSON.stringify({
						type: "strategy-history",
						strategyId,
						data: cachedResults,
					})
				);
			}
		}

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

	ws.on("message", async (msg) => {
		try {
			const data = JSON.parse(msg.toString());
			console.log(`[OHLCV WS] Message from client ${clientId}:`, data);

			// Handle strategy config registration
			if (data.type === "config" && data.strategyId) {
				const config = clientConfigs.get(ws);
				if (config) {
					config.strategyId = data.strategyId;
					clientConfigs.set(ws, config);
				}
				ws.send(
					JSON.stringify({
						type: "config-ack",
						success: true,
						strategyId: data.strategyId,
					})
				);
				return;
			}

			// Handle strategy subscription changes
			if (data.type === "subscribe-strategy" && data.strategyId) {
				const newStrategyId = data.strategyId;

				// Remove from old strategy if exists
				if (strategyId) {
					const oldClients = strategyClients.get(strategyId);
					if (oldClients) {
						oldClients.delete(ws);
						if (oldClients.size === 0) {
							strategyClients.delete(strategyId);
						}
					}
				}

				// Add to new strategy
				strategyId = newStrategyId;
				if (strategyId !== null) {
					if (!strategyClients.has(strategyId)) {
						strategyClients.set(strategyId, new Set());
					}
					strategyClients.get(strategyId)!.add(ws);

					console.log(
						`[Strategy WS] Client ${clientId} switched to strategy: ${strategyId}`
					);

					// Send cached strategy results
					const cachedResults = getStrategyResults(strategyId);
					if (cachedResults.length > 0) {
						ws.send(
							JSON.stringify({
								type: "strategy-history",
								strategyId,
								data: cachedResults,
							})
						);
					}
				}
			} else if (data.type === "unsubscribe-strategy") {
				// Remove from strategy updates
				if (strategyId) {
					const clients = strategyClients.get(strategyId);
					if (clients) {
						clients.delete(ws);
						if (clients.size === 0) {
							strategyClients.delete(strategyId);
						}
					}
					console.log(
						`[Strategy WS] Client ${clientId} unsubscribed from strategy: ${strategyId}`
					);
					strategyId = null;
				}
			}
		} catch (error) {
			console.error(
				`[OHLCV WS] Failed to parse message from client ${clientId}:`,
				error
			);
		}
	});

	ws.on("close", (code, reason) => {
		console.log(
			`[OHLCV WS] Client ${clientId} disconnected: code=${code}, reason=${reason}`
		);

		// Clean up OHLCV subscription
		const subscription = subscriptions.get(subscriptionKey);
		if (subscription) {
			subscription.clients.delete(ws);
			console.log(
				`[OHLCV WS] Removed client ${clientId} from ${subscriptionKey}. Remaining: ${subscription.clients.size}`
			);

			// If no more clients, stop the subscription
			if (subscription.clients.size === 0) {
				console.log(
					`[OHLCV WS] No more clients for ${subscriptionKey}, stopping subscription`
				);
				stopSubscription(subscriptionKey);
			}
		}

		// Clean up strategy subscription
		if (strategyId) {
			const clients = strategyClients.get(strategyId);
			if (clients) {
				clients.delete(ws);
				if (clients.size === 0) {
					strategyClients.delete(strategyId);
				}
				console.log(
					`[Strategy WS] Removed client ${clientId} from strategy ${strategyId}`
				);
			}
		}

		clientConfigs.delete(ws); // Clean up config on disconnect
	});

	ws.on("error", (error) => {
		console.error(`[OHLCV WS] WebSocket error for client ${clientId}:`, error);

		// Clean up subscriptions on error
		const subscription = subscriptions.get(subscriptionKey);
		if (subscription) {
			subscription.clients.delete(ws);
		}

		if (strategyId) {
			const clients = strategyClients.get(strategyId);
			if (clients) {
				clients.delete(ws);
				if (clients.size === 0) {
					strategyClients.delete(strategyId);
				}
			}
		}

		clientConfigs.delete(ws); // Clean up config on error
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
						.sort((a, b) => a.timestamp - b.timestamp); // Sort oldest first for consistent frontend handling
				}

				// --- NEW: Always build full dataset for indicator calculation ---
				let formattedDataForIndicators: OHLCVCandle[];
				if (updateType === "full") {
					formattedDataForIndicators = formattedData;
				} else {
					// For incremental, get the full dataset from cache or ohlcv
					if (
						subscription.cachedFullDataset &&
						subscription.cachedFullDataset.length > 0
					) {
						formattedDataForIndicators =
							subscription.cachedFullDataset as OHLCVCandle[];
					} else {
						// Fallback: try to reconstruct from ex.ohlcvs or ohlcv
						try {
							const ex = getExchange();
							const cachedOhlcv =
								ex.ohlcvs && ex.ohlcvs[symbol] && ex.ohlcvs[symbol][timeframe];
							if (cachedOhlcv && cachedOhlcv.length > 0) {
								formattedDataForIndicators = cachedOhlcv.map(
									([timestamp, open, high, low, close, volume]: any[]) => ({
										timestamp,
										open,
										high,
										low,
										close,
										volume,
									})
								);
							} else {
								// As a last resort, use ohlcv (may be only latest candle)
								formattedDataForIndicators = formattedData;
							}
						} catch (e) {
							formattedDataForIndicators = formattedData;
						}
					}
				}

				// Track the latest candle for next update comparison
				if (formattedData.length > 0) {
					const latestCandle = formattedData[formattedData.length - 1]; // Last item is newest in chronological order
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
					data: formattedData, // Always send full dataset - frontend will handle updates efficiently
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

				// --- Strategy-based indicator calculation and streaming ---
				subscription.clients.forEach(async (ws) => {
					try {
						if (ws.readyState === WsWebSocket.OPEN) {
							const config = clientConfigs.get(ws);
							let indicatorResults: any = {};
							let indicatorUpdateType: "full" | "incremental" = updateType;

							// Calculate indicators if strategy is selected
							if (
								config &&
								config.strategyId &&
								formattedDataForIndicators.length > 0
							) {
								try {
									if (updateType === "incremental") {
										// For incremental updates, get only latest values
										indicatorResults = calculateStrategyIndicatorsIncremental(
											config.strategyId,
											formattedDataForIndicators
										);
										indicatorUpdateType = "incremental";
										console.log(
											`[Indicators] Sending incremental indicators for strategy: ${config.strategyId}`
										);
									} else {
										// For full updates, get complete historical arrays
										const fullResults = calculateStrategyIndicators(
											config.strategyId,
											formattedDataForIndicators
										);

										// Convert to format expected by frontend
										indicatorResults = {};
										for (const result of fullResults) {
											indicatorResults[result.id] = result.data;
										}

										indicatorUpdateType = "full";
										console.log(
											`[Indicators] Calculating and sending full indicators for strategy: ${config.strategyId}`
										);
									}
								} catch (e) {
									console.error(
										`[Indicators] Error calculating indicators for strategy ${config.strategyId}:`,
										e
									);
									indicatorResults = { error: "Indicator calculation failed" };
								}
							}

							const dataToSend =
								updateType === "incremental"
									? [formattedData[formattedData.length - 1]]
									: formattedData;

							ws.send(
								JSON.stringify({
									type: "ohlcv",
									symbol,
									timeframe,
									updateType,
									data: dataToSend,
									timestamp: Date.now(),
									indicators: indicatorResults,
									indicatorUpdateType,
									strategyId: config?.strategyId || null,
								})
							);
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

	// Clear strategy clients
	strategyClients.clear();

	// Remove strategy manager listeners
	strategyManager.removeAllListeners("signal");
	strategyManager.removeAllListeners("strategyResult");

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
