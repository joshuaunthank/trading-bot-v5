/**
 * Complete Testing Setup - Server Integration
 *
 * This file shows how to integrate the strategy engine with your existing server
 * to enable frontend testing.
 */

import express from "express";
import { WebSocketServer } from "ws";
import { enhancedStrategyIntegration } from "./enhanced-strategy-integration";
import {
	initializeStrategyEngine,
	setupEnhancedWebSocketConnection,
} from "./practical-integration-example";

/**
 * Step 1: Add to your main server.ts
 */
export async function setupStrategyEngineForTesting() {
	const app = express();
	const server = app.listen(3001, () => {
		console.log("Server running on port 3001");
	});

	// Initialize WebSocket server
	const wss = new WebSocketServer({
		server,
		path: "/ws", // WebSocket endpoint: ws://localhost:3001/ws
	});

	// Initialize strategy engine
	console.log("🚀 Initializing strategy engine...");
	await initializeStrategyEngine();

	// Setup WebSocket connections
	wss.on("connection", (ws) => {
		console.log("📡 WebSocket client connected");

		// Setup enhanced WebSocket connection with strategy engine
		setupEnhancedWebSocketConnection(ws, wss);

		// Handle client disconnect
		ws.on("close", () => {
			console.log("📡 WebSocket client disconnected");
		});
	});

	// Test API endpoint
	app.get("/api/test/strategy-engine", async (req, res) => {
		try {
			const status = enhancedStrategyIntegration.getAllStrategiesStatus();
			res.json({
				success: true,
				message: "Strategy engine is working!",
				data: status,
			});
		} catch (error: any) {
			res.status(500).json({
				success: false,
				message: "Strategy engine error",
				error: error.message,
			});
		}
	});

	console.log("✅ Strategy engine testing setup complete");
	console.log("📡 WebSocket server: ws://localhost:3001/ws");
	console.log("🔗 Test API: http://localhost:3001/api/test/strategy-engine");
}

/**
 * Step 2: Simulate market data for testing
 */
export function simulateMarketDataForTesting() {
	// Simulate OHLCV data every 5 seconds
	setInterval(() => {
		const now = Date.now();
		const basePrice = 50000; // Base BTC price
		const randomMove = (Math.random() - 0.5) * 1000; // Random price movement

		const simulatedCandle = {
			timestamp: now,
			open: basePrice + randomMove,
			high: basePrice + randomMove + Math.random() * 500,
			low: basePrice + randomMove - Math.random() * 500,
			close: basePrice + randomMove + (Math.random() - 0.5) * 200,
			volume: Math.random() * 100,
		};

		// Process through strategy engine
		enhancedStrategyIntegration.processCandle(simulatedCandle);

		console.log("📊 Simulated candle processed:", {
			timestamp: new Date(simulatedCandle.timestamp).toISOString(),
			close: simulatedCandle.close.toFixed(2),
		});
	}, 5000); // Every 5 seconds
}

/**
 * Step 3: Complete test server setup
 */
export async function startTestServer() {
	try {
		// Setup strategy engine
		await setupStrategyEngineForTesting();

		// Start market data simulation
		simulateMarketDataForTesting();

		// Start a test strategy
		setTimeout(async () => {
			console.log("🎯 Starting test strategy...");
			const result = await enhancedStrategyIntegration.startStrategy(
				"enhanced_rsi_ema_strategy"
			);
			console.log("Strategy start result:", result);
		}, 2000);

		console.log("🎉 Test server fully operational!");
		console.log("");
		console.log("Frontend testing instructions:");
		console.log(
			"1. Update your frontend WebSocket URL to: ws://localhost:3001/ws"
		);
		console.log("2. Add the StrategyEngineTestPanel component to your app");
		console.log("3. Open your browser and test the strategy controls");
		console.log("");
	} catch (error) {
		console.error("❌ Failed to start test server:", error);
	}
}

/**
 * Step 4: Frontend configuration
 */
export const FRONTEND_CONFIG = {
	// Update your WebSocket URL in the test panel
	webSocketUrl: "ws://localhost:3001/ws",

	// API endpoints for testing
	apiEndpoints: {
		testEngine: "http://localhost:3001/api/test/strategy-engine",
		strategies: "http://localhost:3001/api/v1/strategies",
	},
};

/**
 * Step 5: Testing checklist
 */
export const TESTING_CHECKLIST = `
🧪 Strategy Engine Testing Checklist:

1. ✅ Server Setup:
   - Run: npm run dev or node server.ts
   - Check: Server running on port 3001
   - Check: WebSocket server on ws://localhost:3001/ws

2. ✅ Strategy Engine:
   - Check: Strategy engine initialized
   - Check: Strategies loaded from JSON files
   - Check: Market data simulation running

3. ✅ Frontend Setup:
   - Add StrategyEngineTestPanel to your app
   - Update WebSocket URL to ws://localhost:3001/ws
   - Build and run frontend: npm run dev

4. ✅ Test Strategy Controls:
   - Click "Start" on enhanced_rsi_ema_strategy
   - Watch for signal generation in console and UI
   - Test "Stop", "Pause", "Resume" buttons
   - Check real-time status updates

5. ✅ Verify Features:
   - Real-time strategy status updates
   - Signal generation and display
   - Performance metrics tracking
   - WebSocket connection stability

6. ✅ Check Logs:
   - Server console for strategy events
   - Browser console for WebSocket messages
   - Network tab for WebSocket traffic

If everything works, you have a fully functional strategy engine! 🎉
`;

// Export for use in your server
export default {
	setupStrategyEngineForTesting,
	simulateMarketDataForTesting,
	startTestServer,
	FRONTEND_CONFIG,
	TESTING_CHECKLIST,
};

// Example usage in your server.ts:
/*
import { startTestServer } from './complete-testing-setup';

// Start the test server
startTestServer();
*/
