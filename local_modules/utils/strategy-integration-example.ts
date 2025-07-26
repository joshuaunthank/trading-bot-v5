/**
 * Strategy Engine Integration Example
 *
 * This example shows how to integrate the strategy execution engine
 * with the existing WebSocket system for live trading.
 */

import { strategyEngineIntegration } from "./strategy-engine/index";
import { OHLCVCandle } from "./strategy-engine/types";

// Example: Integration with existing WebSocket handler
export async function integrateStrategyEngine() {
	// 1. Initialize the strategy engine
	console.log("Initializing strategy engine...");
	await strategyEngineIntegration.initialize();

	// 2. Load and start a specific strategy
	console.log("Starting enhanced RSI EMA strategy...");
	await strategyEngineIntegration.startStrategy("enhanced_rsi_ema_strategy");

	// 3. Set up event listeners for strategy events
	strategyEngineIntegration
		.getStrategyManager()
		.on("signal-generated", (signal) => {
			console.log(`🚨 Trading Signal Generated:`, {
				strategy: signal.strategyId,
				type: signal.type,
				side: signal.side,
				confidence: signal.confidence,
				timestamp: new Date(signal.timestamp).toISOString(),
			});

			// Here you would integrate with trading functions
			// handleTradingSignal(signal);
		});

	console.log("Strategy engine integration complete!");
}

// Example: Process OHLCV data from WebSocket
export function processMarketData(ohlcvData: any) {
	// Convert WebSocket data to strategy engine format
	const candle: OHLCVCandle = {
		timestamp: ohlcvData.timestamp,
		open: ohlcvData.open,
		high: ohlcvData.high,
		low: ohlcvData.low,
		close: ohlcvData.close,
		volume: ohlcvData.volume,
	};

	// Process the candle through all active strategies
	strategyEngineIntegration.processCandle(candle);
}

// Example: API endpoint integration
export function getStrategyStatus() {
	return {
		manager: strategyEngineIntegration.getManagerStatus(),
		strategies: strategyEngineIntegration.getStrategyList(),
		performance: Object.fromEntries(
			strategyEngineIntegration.getPerformanceMetrics()
		),
	};
}

// Example: WebSocket client integration
export function setupStrategyWebSocket(ws: any) {
	// Add WebSocket client for real-time strategy updates
	strategyEngineIntegration.addWebSocketClient(ws);

	// Send initial strategy data
	const status = getStrategyStatus();
	ws.send(
		JSON.stringify({
			type: "strategy-status",
			data: status,
		})
	);
}

// Example usage in existing WebSocket handler:
/*
import { processMarketData, setupStrategyWebSocket } from './strategy-integration-example';

// In your existing WebSocket OHLCV handler:
websocket.on('message', (data) => {
    const ohlcvData = JSON.parse(data);
    
    // Process for charts (existing functionality)
    broadcastToClients('ohlcv', ohlcvData);
    
    // NEW: Process for strategy engine
    processMarketData(ohlcvData);
});

// In your WebSocket connection handler:
websocket.on('connection', (ws) => {
    // Setup strategy updates for this client
    setupStrategyWebSocket(ws);
});
*/

export default {
	integrateStrategyEngine,
	processMarketData,
	getStrategyStatus,
	setupStrategyWebSocket,
};
