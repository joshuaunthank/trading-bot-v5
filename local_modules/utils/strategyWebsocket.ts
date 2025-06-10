import { WebSocketServer, WebSocket as WsWebSocket } from "ws";
import * as http from "http";
import { EventEmitter } from "events";
import { StrategyResult } from "../types/strategy";

// In-memory cache of most recent results
const strategyResultsCache: Record<string, StrategyResult[]> = {};
const MAX_CACHE_SIZE = 1000; // Store up to 1000 results per strategy

// Event emitter for pub/sub pattern
const strategyEventEmitter = new EventEmitter();
strategyEventEmitter.setMaxListeners(100);

/**
 * Add new strategy result to the cache and emit change event
 */
export function addStrategyResult(
	strategyName: string,
	result: StrategyResult
): void {
	if (!strategyResultsCache[strategyName]) {
		strategyResultsCache[strategyName] = [];
	}

	strategyResultsCache[strategyName].push(result);

	// Trim cache if too large
	if (strategyResultsCache[strategyName].length > MAX_CACHE_SIZE) {
		strategyResultsCache[strategyName] = strategyResultsCache[
			strategyName
		].slice(-MAX_CACHE_SIZE);
	}

	// Emit event with strategyName and latest result
	strategyEventEmitter.emit(`strategy-update:${strategyName}`, result);
	// Also emit a global event
	strategyEventEmitter.emit("strategy-update", { strategyName, result });
}

/**
 * Get cached results for a specific strategy, optionally limited
 */
export function getStrategyResults(
	strategyName: string,
	limit: number = MAX_CACHE_SIZE
): StrategyResult[] {
	const results = strategyResultsCache[strategyName] || [];
	return results.slice(-limit);
}

/**
 * Get names of all strategies with cached results
 */
export function getAvailableStrategies(): string[] {
	return Object.keys(strategyResultsCache);
}

// WebSocket server for strategy results
let wss: WebSocketServer | null = null;

/**
 * Set up a WebSocket server for streaming strategy results
 */
export function setupStrategyWebSocket(server: http.Server): void {
	console.log("[WS] setupStrategyWebSocket called");

	if (wss) {
		console.log("[WS] Strategy WebSocketServer already initialized");
		return; // Prevent double-init
	}

	wss = new WebSocketServer({ server, path: "/ws/strategy" });
	console.log("[WS] Strategy WebSocketServer created at /ws/strategy");

	wss.on("connection", (ws, req) => {
		console.log("[WS] New strategy client connection received");

		let strategyName: string = "";
		let closed = false;

		// Parse query params
		const url = new URL(req.url || "", "http://localhost");
		const strategyParam = url.searchParams.get("strategy");

		if (strategyParam) {
			strategyName = strategyParam;
			console.log(`[WS] Client subscribed to strategy: ${strategyName}`);

			// Send initial cached data if available
			if (strategyResultsCache[strategyName]) {
				const data = getStrategyResults(strategyName);
				ws.send(
					JSON.stringify({
						type: "history",
						strategyName,
						data,
					})
				);
			}
		}

		// Client can change subscription or request specific data
		ws.on("message", (msg) => {
			try {
				const data = JSON.parse(msg.toString());

				// Subscribe to a specific strategy
				if (data.subscribe && typeof data.subscribe === "string") {
					// Unsubscribe from previous if any
					if (strategyName) {
						strategyEventEmitter.removeListener(
							`strategy-update:${strategyName}`,
							onStrategyUpdate
						);
					}

					strategyName = data.subscribe;
					console.log(`[WS] Client subscribed to strategy: ${strategyName}`);

					// Subscribe to updates for this strategy
					strategyEventEmitter.on(
						`strategy-update:${strategyName}`,
						onStrategyUpdate
					);

					// Send initial data
					const historyData = getStrategyResults(strategyName);
					ws.send(
						JSON.stringify({
							type: "history",
							strategyName,
							data: historyData,
						})
					);
				}

				// Request history for a specific strategy
				if (data.history && typeof data.history === "string") {
					const historyStrategy = data.history;
					const limit =
						typeof data.limit === "number" ? data.limit : MAX_CACHE_SIZE;

					const historyData = getStrategyResults(historyStrategy, limit);
					ws.send(
						JSON.stringify({
							type: "history",
							strategyName: historyStrategy,
							data: historyData,
						})
					);
				}

				// Request list of available strategies
				if (data.action === "list-strategies") {
					const strategies = getAvailableStrategies();
					ws.send(
						JSON.stringify({
							type: "strategies-list",
							strategies,
						})
					);
				}
			} catch (err) {
				console.error("[WS] Failed to parse strategy client message:", err);
				ws.send(
					JSON.stringify({
						type: "error",
						message: "Failed to parse message",
					})
				);
			}
		});

		// Handler for strategy updates
		function onStrategyUpdate(result: StrategyResult) {
			if (closed) return;

			try {
				ws.send(
					JSON.stringify({
						type: "update",
						strategyName,
						data: result,
					})
				);
			} catch (err) {
				console.error("[WS] Failed to send strategy update:", err);
			}
		}

		// If no specific strategy requested, subscribe to all updates
		if (!strategyName) {
			strategyEventEmitter.on("strategy-update", (update) => {
				if (closed) return;

				try {
					ws.send(
						JSON.stringify({
							type: "global-update",
							strategyName: update.strategyName,
							data: update.result,
						})
					);
				} catch (err) {
					console.error("[WS] Failed to send global strategy update:", err);
				}
			});
		} else {
			// Subscribe to specific strategy updates
			strategyEventEmitter.on(
				`strategy-update:${strategyName}`,
				onStrategyUpdate
			);
		}

		// Cleanup on connection close
		ws.on("close", () => {
			closed = true;
			console.log("[WS] Strategy client disconnected");

			// Remove all listeners for this connection
			if (strategyName) {
				strategyEventEmitter.removeListener(
					`strategy-update:${strategyName}`,
					onStrategyUpdate
				);
			}

			strategyEventEmitter.removeAllListeners("strategy-update");
		});

		// Handle errors
		ws.on("error", (err) => {
			closed = true;
			console.error("[WS] Strategy client error:", err);

			// Remove all listeners for this connection
			if (strategyName) {
				strategyEventEmitter.removeListener(
					`strategy-update:${strategyName}`,
					onStrategyUpdate
				);
			}

			strategyEventEmitter.removeAllListeners("strategy-update");
		});
	});
}
