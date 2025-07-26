/**
 * Practical Integration Example - Complete WebSocket Integration
 *
 * This example shows how to integrate the strategy engine with your existing
 * websocket-main.ts file for live trading.
 */

import { enhancedStrategyIntegration } from "./enhanced-strategy-integration";
import { OHLCVCandle } from "../types";

/**
 * Step 1: Add this to your websocket-main.ts imports
 */
// import { enhancedStrategyIntegration } from './enhanced-strategy-integration';

/**
 * Step 2: Initialize strategy engine when starting WebSocket server
 */
export async function initializeStrategyEngine() {
	try {
		console.log("🚀 Initializing strategy engine...");
		await enhancedStrategyIntegration.initialize();

		// Start a default strategy
		const result = await enhancedStrategyIntegration.startStrategy(
			"enhanced_rsi_ema_strategy"
		);
		console.log("Strategy start result:", result);

		console.log("✅ Strategy engine initialized successfully");
		return true;
	} catch (error) {
		console.error("❌ Failed to initialize strategy engine:", error);
		return false;
	}
}

/**
 * Step 3: Add this function to process OHLCV data through strategy engine
 */
export function processOHLCVThroughStrategies(ohlcvArray: any[]): void {
	if (!enhancedStrategyIntegration.isReady()) {
		return;
	}

	try {
		// Process each OHLCV candle through the strategy engine
		for (const ohlcv of ohlcvArray) {
			const candle: OHLCVCandle = {
				timestamp: ohlcv[0], // timestamp
				open: ohlcv[1], // open
				high: ohlcv[2], // high
				low: ohlcv[3], // low
				close: ohlcv[4], // close
				volume: ohlcv[5], // volume
			};

			// Process through strategy engine
			enhancedStrategyIntegration.processCandle(candle);
		}
	} catch (error) {
		console.error("Error processing OHLCV through strategies:", error);
	}
}

/**
 * Step 4: Enhanced WebSocket connection handler
 */
export function setupEnhancedWebSocketConnection(ws: any, wss: any) {
	// Add client to strategy engine for real-time updates
	enhancedStrategyIntegration.addWebSocketClient(ws);

	// Send initial strategy status
	const status = enhancedStrategyIntegration.getAllStrategiesStatus();
	ws.send(
		JSON.stringify({
			type: "strategy-initial-status",
			data: status,
		})
	);

	// Handle strategy control messages
	ws.on("message", (data: Buffer) => {
		try {
			const message = JSON.parse(data.toString());

			if (message.type === "strategy-control") {
				handleStrategyControl(ws, message);
			}
		} catch (error) {
			console.error("WebSocket message error:", error);
		}
	});

	console.log("📡 Enhanced WebSocket connection established");
}

/**
 * Step 5: Handle strategy control messages
 */
async function handleStrategyControl(ws: any, message: any) {
	const { action, strategyId } = message;
	let result: any;

	switch (action) {
		case "start":
			result = await enhancedStrategyIntegration.startStrategy(strategyId);
			break;
		case "stop":
			result = await enhancedStrategyIntegration.stopStrategy(strategyId);
			break;
		case "pause":
			result = await enhancedStrategyIntegration.pauseStrategy(strategyId);
			break;
		case "resume":
			result = await enhancedStrategyIntegration.resumeStrategy(strategyId);
			break;
		case "status":
			result = enhancedStrategyIntegration.getStrategyStatus(strategyId);
			break;
		default:
			result = { success: false, message: `Unknown action: ${action}` };
	}

	ws.send(
		JSON.stringify({
			type: "strategy-control-response",
			action: action,
			strategyId: strategyId,
			result: result,
		})
	);
}

/**
 * Step 6: Integration with existing OHLCV streaming
 *
 * Add this to your existing streamOHLCVData function in websocket-main.ts
 */
export function integrateWithOHLCVStreaming(
	ohlcvData: any[],
	clients: Set<any>
) {
	// Existing functionality - broadcast to clients
	const message = JSON.stringify({
		type: "ohlcv-update",
		data: ohlcvData,
	});

	clients.forEach((client) => {
		if (client.readyState === 1) {
			// WebSocket.OPEN
			client.send(message);
		}
	});

	// NEW: Process through strategy engine
	processOHLCVThroughStrategies(ohlcvData);
}

/**
 * Step 7: Strategy event handling
 */
export function setupStrategyEventHandling() {
	const manager = enhancedStrategyIntegration.getStrategyManager();

	// Handle trading signals
	manager.on("signal-generated", (signal: any) => {
		console.log(`🚨 Trading Signal Generated:`, {
			strategy: signal.strategyId,
			type: signal.type,
			side: signal.side,
			confidence: signal.confidence,
			price: signal.price,
			timestamp: new Date(signal.timestamp).toISOString(),
		});

		// Here you would integrate with your trading functions
		handleTradingSignal(signal);
	});

	// Handle strategy errors
	manager.on("strategy-error", (error: any) => {
		console.error("🔴 Strategy Error:", error);
	});

	// Handle strategy status changes
	manager.on("strategy-event", (event: any) => {
		console.log("📊 Strategy Event:", event);
	});
}

/**
 * Step 8: Trading signal handler (placeholder)
 */
function handleTradingSignal(signal: any) {
	// This is where you would integrate with your trading system
	// For example, using CCXT to place orders

	console.log("📈 Processing trading signal:", signal);

	// Example integration:
	// if (signal.type === 'entry' && signal.side === 'long') {
	//     placeBuyOrder(signal);
	// } else if (signal.type === 'exit' && signal.side === 'long') {
	//     placeSellOrder(signal);
	// }
}

/**
 * Step 9: Complete integration example for websocket-main.ts
 */
export const INTEGRATION_EXAMPLE = `
// Add these imports to your websocket-main.ts
import { 
    initializeStrategyEngine, 
    setupEnhancedWebSocketConnection, 
    setupStrategyEventHandling,
    integrateWithOHLCVStreaming
} from './practical-integration-example';

// In your WebSocket server initialization:
wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Existing connection setup
    subscriptions.get(symbol)?.clients.add(ws);
    clientConfigs.set(ws, { strategyId: null });
    
    // NEW: Enhanced connection with strategy engine
    setupEnhancedWebSocketConnection(ws, wss);
    
    ws.on('close', () => {
        subscriptions.get(symbol)?.clients.delete(ws);
        clientConfigs.delete(ws);
    });
});

// In your server startup:
async function startServer() {
    // Initialize strategy engine
    await initializeStrategyEngine();
    
    // Setup strategy event handling
    setupStrategyEventHandling();
    
    // Start your existing WebSocket server
    // ... existing code ...
}

// In your OHLCV streaming function:
function broadcastOHLCVData(ohlcvData: any[]) {
    // Use the integrated function instead of manual broadcast
    integrateWithOHLCVStreaming(ohlcvData, clients);
}
`;

/**
 * Step 10: Frontend integration example
 */
export const FRONTEND_INTEGRATION_EXAMPLE = `
// Frontend WebSocket connection
const ws = new WebSocket('ws://localhost:8080');

// Listen for strategy updates
ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    
    switch (message.type) {
        case 'strategy-initial-status':
            updateStrategyStatus(message.data);
            break;
        case 'signal-generated':
            displayTradingSignal(message.data);
            break;
        case 'strategy-event':
            updateStrategyState(message.data);
            break;
    }
};

// Control strategies from frontend
function startStrategy(strategyId: string) {
    ws.send(JSON.stringify({
        type: 'strategy-control',
        action: 'start',
        strategyId: strategyId
    }));
}

function stopStrategy(strategyId: string) {
    ws.send(JSON.stringify({
        type: 'strategy-control',
        action: 'stop',
        strategyId: strategyId
    }));
}
`;

console.log("📋 Practical Integration Example Ready");
console.log("📖 Check the INTEGRATION_EXAMPLE constant for complete code");
console.log("🎯 Check the FRONTEND_INTEGRATION_EXAMPLE for frontend code");

export default {
	initializeStrategyEngine,
	setupEnhancedWebSocketConnection,
	setupStrategyEventHandling,
	processOHLCVThroughStrategies,
	integrateWithOHLCVStreaming,
	INTEGRATION_EXAMPLE,
	FRONTEND_INTEGRATION_EXAMPLE,
};
