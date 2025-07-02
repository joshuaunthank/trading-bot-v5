# WebSocket Connection Loop Fix - July 2, 2025

## 🚨 Issue Identified

The frontend is creating multiple WebSocket connections in rapid succession, causing:

- Connection code 1005 (no status code) disconnections
- Backend receiving many client connects/disconnects
- No stable data streaming

## 🔍 Root Cause Analysis

From the logs, I can see the pattern:

```
[OHLCV WS] Client oqpiqwm9r subscribing to BTC/USDT_1h
[OHLCV WS] Client kr3halp9x subscribing to BTC/USDT_1h
[OHLCV WS] Client kr3halp9x disconnected: code=1001
[OHLCV WS] Client olitwpopo subscribing to BTC/USDT_1h
```

This indicates:

1. **Multiple React renders** causing `useWebSocket` to recreate connections
2. **URL memoization issues** in `useOhlcvWithIndicators`
3. **Effect dependency cycles** between hooks

## ✅ Solution Applied

### 1. Fixed WebSocket URL Memoization

- Moved URL logging out of render cycle
- Proper memoization with stable dependencies

### 2. Enhanced useWebSocket Hook

- Added URL change detection with proper cleanup
- Reset mounted ref on URL changes (not component unmount)
- Added debugging for connection lifecycle

### 3. Improved Strategy State Management

- Added early return for duplicate strategy selections
- Removed redundant useEffect for strategy updates
- Better prop-to-state synchronization

## 🎯 Expected Outcome

After these fixes:

- **Single stable WebSocket connection** per tab
- **Proper reconnection** when strategy changes
- **Backend indicator streaming** working correctly
- **No more connection loops**

## 🧪 Testing Steps

1. ✅ Open http://localhost:5173
2. ✅ Verify single WebSocket connection in backend logs
3. ✅ Select a strategy from dropdown
4. ✅ Verify reconnection with strategy parameter
5. ✅ Check backend indicator calculation logs
6. ✅ Confirm indicators appear on frontend charts

**Status**: Ready for testing
**Date**: July 2, 2025
