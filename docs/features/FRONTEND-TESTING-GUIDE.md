# Complete Frontend Testing Guide

## 🧪 **How to Test the Strategy Engine with Frontend**

Follow these steps to test the strategy engine with your frontend:

## 📋 **Step 1: Server Setup (Backend)**

### **Option A: Quick Test Setup**

```bash
# 1. Create a simple test server file
touch test-server.js

# 2. Add this content to test-server.js:
```

```javascript
const {
	startTestServer,
} = require("./local_modules/utils/complete-testing-setup");

// Start the complete test server
startTestServer();
```

### **Option B: Integrate with Existing Server**

Add to your existing `server.ts`:

```typescript
import { enhancedStrategyIntegration } from "./local_modules/utils/enhanced-strategy-integration";

// Initialize strategy engine when server starts
async function initServer() {
	// Initialize strategy engine
	await enhancedStrategyIntegration.initialize();

	// Start a test strategy
	await enhancedStrategyIntegration.startStrategy("enhanced_rsi_ema_strategy");

	console.log("✅ Strategy engine ready for testing");
}

// Call during server startup
initServer();
```

## 📋 **Step 2: Frontend Integration**

### **Add Test Panel to Your App**

Update your `src/app.tsx`:

```typescript
import React from "react";
import StrategyEngineTestPanel from "./components/StrategyEngineTestPanel";

function App() {
	return (
		<div className="min-h-screen bg-gray-100">
			<div className="container mx-auto px-4 py-8">
				<h1 className="text-3xl font-bold mb-8">Trading Bot Dashboard</h1>

				{/* Your existing components */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
					{/* Existing chart, table, etc. */}
				</div>

				{/* NEW: Strategy Engine Test Panel */}
				<StrategyEngineTestPanel className="mb-8" />
			</div>
		</div>
	);
}

export default App;
```

### **Update WebSocket URL**

In `StrategyEngineTestPanel.tsx`, update the WebSocket URL:

```typescript
const webSocket = useWebSocket({
	url: "ws://localhost:3001/ws", // Update to match your server port
	// ... rest of config
});
```

## 📋 **Step 3: Test Execution**

### **1. Start the Backend**

```bash
# Start your server (with strategy engine)
npm run dev
# or
node test-server.js

# You should see:
# 🚀 Initializing strategy engine...
# ✅ Strategy engine initialized successfully
# 📡 WebSocket server: ws://localhost:3001/ws
```

### **2. Start the Frontend**

```bash
# In another terminal
npm run dev

# Frontend should be available at:
# http://localhost:5173 (Vite default)
```

### **3. Test in Browser**

1. Open `http://localhost:5173`
2. Look for the "Strategy Engine Test Panel"
3. Check WebSocket connection status (should show "Connected")
4. Try strategy controls:
   - Click "Start" on enhanced_rsi_ema_strategy
   - Watch for real-time status updates
   - Check console for signal generation

## 📋 **Step 4: What to Test**

### **✅ WebSocket Connection**

- Status should show "Connected"
- Check browser console for WebSocket messages
- Try refreshing - should reconnect automatically

### **✅ Strategy Controls**

- **Start Strategy**: Click "Start" button

  - Status should change to "RUNNING"
  - Candles processed should increase
  - Watch for signals in "Recent Trading Signals"

- **Stop Strategy**: Click "Stop" button

  - Status should change to "STOPPED"
  - Processing should halt

- **Pause/Resume**: Test pause and resume functionality

### **✅ Real-time Updates**

- Strategy status updates automatically
- Signal generation appears in real-time
- Performance metrics update live

### **✅ Signal Generation**

With simulated market data, you should see:

- Trading signals appear in the "Recent Trading Signals" section
- Console logs showing signal generation
- Signal details: type (entry/exit), side (long/short), confidence

## 📋 **Step 5: Advanced Testing**

### **Test with Real Market Data**

Replace simulation with real CCXT data:

```typescript
// In your server, replace simulation with real data
import { getOHLCVData } from "./local_modules/utils/websocket-main";

// Get real BTC/USDT data
const realData = await getOHLCVData("BTC/USDT", "1m", 100);
realData.forEach((candle) => {
	enhancedStrategyIntegration.processCandle({
		timestamp: candle[0],
		open: candle[1],
		high: candle[2],
		low: candle[3],
		close: candle[4],
		volume: candle[5],
	});
});
```

### **Test Multiple Strategies**

Create additional strategy files and test concurrent execution:

```typescript
// Start multiple strategies
await enhancedStrategyIntegration.startStrategy("enhanced_rsi_ema_strategy");
await enhancedStrategyIntegration.startStrategy("another_strategy");
```

## 🚨 **Troubleshooting**

### **WebSocket Connection Issues**

- Check server is running on correct port
- Verify WebSocket URL in frontend matches server
- Check browser console for connection errors
- Try different port if 3001 is in use

### **Strategy Not Starting**

- Check strategy JSON file exists in `local_modules/db/strategies/`
- Verify strategy ID matches filename
- Check server console for initialization errors
- Ensure strategy file is valid JSON

### **No Signals Generated**

- Check market data is being processed (candles count should increase)
- Verify strategy conditions are met
- Check signal generation logic in strategy JSON
- Enable debug logging in strategy engine

### **Frontend Errors**

- Check all imports are correct
- Verify TypeScript compilation
- Check browser console for React errors
- Ensure WebSocket hook is properly configured

## 📊 **Expected Results**

When everything works correctly, you should see:

### **Backend Console:**

```
🚀 Initializing strategy engine...
✅ Strategy engine initialized successfully
📡 WebSocket server: ws://localhost:3001/ws
🎯 Starting test strategy...
Strategy start result: { success: true, strategy_id: 'enhanced_rsi_ema_strategy', status: 'started' }
📊 Simulated candle processed: { timestamp: '2025-07-15T...', close: '49876.23' }
🚨 [Enhanced] Trading Signal: { strategy: 'enhanced_rsi_ema_strategy', type: 'entry', side: 'long', confidence: 0.75 }
```

### **Frontend UI:**

- ✅ WebSocket Status: Connected
- ✅ Strategy Status: RUNNING
- ✅ Candles Processed: 15 (and counting)
- ✅ Recent Trading Signals: Shows generated signals
- ✅ Real-time updates working

## 🎉 **Success!**

If you see trading signals being generated and displayed in real-time, your strategy engine is working perfectly!

You now have:

- ✅ **Real-time strategy execution**
- ✅ **Live signal generation**
- ✅ **WebSocket-based updates**
- ✅ **Interactive frontend controls**
- ✅ **Production-ready architecture**

**Your trading bot foundation is complete and ready for advanced features!** 🚀
