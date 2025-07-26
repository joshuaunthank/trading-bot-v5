# Strategy Engine Usage Guide

## 🚀 **How to Use the Strategy Engine**

The strategy engine is now ready to use! Here's how to integrate it with your existing trading bot.

## 📋 **Quick Start**

### 1. **Initialize the Strategy Engine**

```typescript
import { enhancedStrategyIntegration } from "./local_modules/utils/enhanced-strategy-integration";

// Initialize the enhanced strategy engine
async function initializeBot() {
	await enhancedStrategyIntegration.initialize();
	console.log("Strategy engine ready!");
}

// Start the bot
initializeBot();
```

### 2. **Connect to WebSocket Data Stream**

```typescript
// In your existing websocket-main.ts, add strategy processing
import { enhancedStrategyIntegration } from "./enhanced-strategy-integration";

// Process OHLCV data through strategy engine
function processOHLCVData(ohlcvData: any) {
	// Convert to strategy engine format
	const candle = {
		timestamp: ohlcvData.timestamp,
		open: ohlcvData.open,
		high: ohlcvData.high,
		low: ohlcvData.low,
		close: ohlcvData.close,
		volume: ohlcvData.volume,
	};

	// Process through strategy engine
	enhancedStrategyIntegration.processCandle(candle);
}

// Add to your WebSocket message handler
websocket.on("message", (data) => {
	const ohlcvData = JSON.parse(data);

	// Existing functionality (charts, etc.)
	broadcastToClients("ohlcv", ohlcvData);

	// NEW: Process through strategy engine
	processOHLCVData(ohlcvData);
});
```

### 3. **Control Strategies via API**

```typescript
// Start a strategy
const result = await enhancedStrategyIntegration.startStrategy(
	"enhanced_rsi_ema_strategy"
);
console.log(result);
// Output: { success: true, strategy_id: 'enhanced_rsi_ema_strategy', status: 'started', message: '...' }

// Stop a strategy
await enhancedStrategyIntegration.stopStrategy("enhanced_rsi_ema_strategy");

// Pause a strategy
await enhancedStrategyIntegration.pauseStrategy("enhanced_rsi_ema_strategy");

// Resume a strategy
await enhancedStrategyIntegration.resumeStrategy("enhanced_rsi_ema_strategy");
```

### 4. **Get Strategy Status and Performance**

```typescript
// Get specific strategy status
const status = enhancedStrategyIntegration.getStrategyStatus(
	"enhanced_rsi_ema_strategy"
);
console.log(status);
// Output: { success: true, strategy_id: '...', status: 'running', performance: {...}, indicators: {...} }

// Get all strategies status
const allStatus = enhancedStrategyIntegration.getAllStrategiesStatus();
console.log(allStatus);
// Output: { success: true, strategies: [...], states: {...}, performance: {...}, manager: {...} }
```

### 5. **Listen to Strategy Events**

```typescript
// Listen to trading signals
enhancedStrategyIntegration
	.getStrategyManager()
	.on("signal-generated", (signal) => {
		console.log(`🚨 Trading Signal:`, {
			strategy: signal.strategyId,
			type: signal.type, // 'entry' or 'exit'
			side: signal.side, // 'long' or 'short'
			confidence: signal.confidence,
			price: signal.price,
			timestamp: signal.timestamp,
		});

		// Handle the trading signal
		handleTradingSignal(signal);
	});

// Listen to strategy errors
enhancedStrategyIntegration
	.getStrategyManager()
	.on("strategy-error", (error) => {
		console.error("Strategy error:", error);
	});
```

### 6. **WebSocket Client Integration**

```typescript
// Add WebSocket client for real-time strategy updates
websocket.on("connection", (ws) => {
	// Connect client to strategy engine
	enhancedStrategyIntegration.addWebSocketClient(ws);

	// Client will automatically receive:
	// - Strategy status updates
	// - Performance metrics
	// - Trading signals
	// - Indicator results
});
```

## 🔧 **Integration with Existing API Endpoints**

### **Replace Placeholder Responses**

Update your existing API endpoints to use real strategy engine data:

```typescript
// In your routes/api-utils/strategy-execution-websocket.ts
import { enhancedStrategyIntegration } from "../../utils/enhanced-strategy-integration";

// Replace placeholder startStrategy function
export const startStrategy = async (
	req: Request,
	res: Response
): Promise<void> => {
	const { id: strategy_id } = req.params;

	// Use real strategy engine instead of placeholder
	const result = await enhancedStrategyIntegration.startStrategy(strategy_id);

	if (result.success) {
		res.status(200).json(result);
	} else {
		res.status(400).json(result);
	}
};

// Replace placeholder getStrategyStatus function
export const getStrategyStatus = async (
	req: Request,
	res: Response
): Promise<void> => {
	const { id: strategy_id } = req.params;

	// Use real strategy engine instead of placeholder
	const result = enhancedStrategyIntegration.getStrategyStatus(strategy_id);

	if (result.success) {
		res.status(200).json(result);
	} else {
		res.status(404).json(result);
	}
};
```

### **Performance Tracking Integration**

```typescript
// In your routes/api-utils/performance-tracking-websocket.ts
import { enhancedStrategyIntegration } from "../../utils/enhanced-strategy-integration";

// Replace placeholder performance function
export const getStrategyPerformance = async (
	req: Request,
	res: Response
): Promise<void> => {
	const { strategy_id } = req.params;

	// Use real strategy engine performance data
	const strategyStatus =
		enhancedStrategyIntegration.getStrategyStatus(strategy_id);

	if (strategyStatus.success) {
		res.status(200).json({
			success: true,
			strategy_id: strategy_id,
			metrics: strategyStatus.performance,
			message: "Real performance data from strategy engine",
		});
	} else {
		res.status(404).json({
			success: false,
			error: "Strategy not found",
			message: strategyStatus.message,
		});
	}
};
```

## 🎯 **Complete Integration Example**

Here's a complete integration example for your main server file:

```typescript
// In your main server.ts
import { enhancedStrategyIntegration } from "./local_modules/utils/enhanced-strategy-integration";
import { WebSocketServer } from "ws";

async function startTradingBot() {
	// 1. Initialize strategy engine
	console.log("Initializing strategy engine...");
	await enhancedStrategyIntegration.initialize();

	// 2. Start WebSocket server
	const wss = new WebSocketServer({ port: 8080 });

	// 3. Handle WebSocket connections
	wss.on("connection", (ws) => {
		console.log("WebSocket client connected");

		// Connect to strategy engine
		enhancedStrategyIntegration.addWebSocketClient(ws);

		// Handle client messages
		ws.on("message", (data) => {
			const message = JSON.parse(data.toString());

			if (message.type === "start-strategy") {
				enhancedStrategyIntegration.startStrategy(message.strategyId);
			} else if (message.type === "stop-strategy") {
				enhancedStrategyIntegration.stopStrategy(message.strategyId);
			}
		});
	});

	// 4. Set up market data processing
	// (This would be integrated with your existing CCXT Pro WebSocket)

	// 5. Set up strategy event handling
	enhancedStrategyIntegration
		.getStrategyManager()
		.on("signal-generated", (signal) => {
			console.log(`🚨 Trading Signal Generated:`, signal);

			// Integration with your trading functions
			if (signal.type === "entry" && signal.side === "long") {
				// placeBuyOrder(signal);
			} else if (signal.type === "exit" && signal.side === "long") {
				// placeSellOrder(signal);
			}
		});

	console.log("✅ Trading bot started successfully!");
}

// Start the trading bot
startTradingBot().catch(console.error);
```

## 🔄 **Avoiding Code Duplication**

The enhanced strategy integration reuses existing code:

### **✅ Reused Components**

- **Existing indicator calculations** (`api-utils/indicator-calculations.ts`)
- **Existing API endpoint structure** (`api-utils/strategy-execution-websocket.ts`)
- **Existing WebSocket system** (`websocket-main.ts`)
- **Existing strategy file storage** (`local_modules/db/strategies/`)

### **✅ New Components**

- **Real-time strategy execution engine**
- **Signal generation and evaluation**
- **Multi-strategy coordination**
- **Performance tracking and metrics**
- **Event-driven architecture**

## 📊 **Strategy Configuration**

Your existing strategy files (like `enhanced_rsi_ema_strategy.json`) work directly with the strategy engine:

```json
{
	"id": "enhanced_rsi_ema_strategy",
	"name": "Enhanced RSI EMA Strategy",
	"version": "1.0.0",
	"description": "RSI and EMA based trading strategy",
	"indicators": [
		{
			"rsi": {
				"params": [{ "name": "period", "type": "number", "default": 14 }]
			},
			"ema": {
				"params": [{ "name": "period", "type": "number", "default": 20 }]
			}
		}
	],
	"signals": [
		{
			"id": "rsi_oversold_entry",
			"type": "entry",
			"side": "long",
			"conditions": [
				{
					"indicator": "rsi",
					"operator": "less_than",
					"value": 30
				}
			]
		}
	]
}
```

## 🎉 **Summary**

The strategy engine is now fully integrated and ready to use! It:

- ✅ **Reuses existing indicator calculations** to avoid duplication
- ✅ **Enhances existing API endpoints** with real functionality
- ✅ **Integrates with existing WebSocket system** for real-time updates
- ✅ **Provides real-time strategy execution** with signal generation
- ✅ **Maintains existing architecture** while adding new capabilities

**Next step**: Start using it by initializing the enhanced strategy integration and connecting it to your OHLCV data stream!
