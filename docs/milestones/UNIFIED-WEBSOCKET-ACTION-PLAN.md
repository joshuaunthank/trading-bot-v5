# Unified WebSocket Implementation - Analysis & Action Plan

**Date:** June 26, 2025  
**Status:** 🔄 **IN PROGRESS** - Backend Complete, Frontend Partial  
**Objective:** Complete unified WebSocket implementation and cleanup

## 🔍 **Current State Analysis**

### **✅ Backend - UNIFIED WEBSOCKET COMPLETE**

The backend has been successfully unified into a single WebSocket endpoint:

```typescript
// Unified endpoint: /ws/ohlcv
// Handles both OHLCV data AND strategy data
// Path: local_modules/utils/websocket-main.ts
```

**Features:**

- ✅ **Single WebSocket Server**: `/ws/ohlcv` handles both data types
- ✅ **Strategy Integration**: Optional `?strategy=strategyId` parameter
- ✅ **CCXT Pro**: Real-time OHLCV data streaming
- ✅ **Strategy Results**: Cached and broadcasted to subscribers
- ✅ **Auto-cleanup**: Proper client management and cleanup

### **🔄 Frontend - PARTIALLY UPDATED**

The frontend hooks are **partially updated** but still use separate approaches:

#### **OHLCV Hook** ✅ **CORRECT**

```typescript
// File: src/hooks/useOhlcvWebSocket.tsx
// Connects to: ws://localhost:3001/ws/ohlcv
// Status: ✅ Already using unified endpoint
```

#### **Strategy Hook** ⚠️ **NEEDS UPDATE**

```typescript
// File: src/hooks/useStrategyWebSocketEnhanced.tsx
// Connects to: ws://localhost:3001/ws/ohlcv?strategy=${strategyId}
// Status: ⚠️ Partially correct but complex logic
```

### **📂 Data Structure - CORRECT**

Data is properly organized in the new structure:

```
local_modules/db/
├── strategies/ ✅ (8 strategy files)
├── indicators/ ✅ (5 indicator files)
└── db.ts ✅ (database interface)
```

## 🎯 **Action Plan**

### **Phase 1: Frontend WebSocket Unification** 🔄

#### **1.1 Create Unified Frontend Hook**

Create a single `useUnifiedWebSocket.tsx` that handles both OHLCV and strategy data:

```typescript
// New file: src/hooks/useUnifiedWebSocket.tsx
interface UnifiedWebSocketOptions {
	symbol: string;
	timeframe: string;
	strategyId?: string | null;
}

export function useUnifiedWebSocket(options: UnifiedWebSocketOptions) {
	// Single WebSocket connection
	// Handles both OHLCV and strategy data
	// Returns separated data streams
}
```

#### **1.2 Update Dashboard Integration**

Replace multiple WebSocket hooks with single unified hook:

```typescript
// In EnhancedDashboard.tsx - BEFORE
const { latestCandle, fullDataset } = useOhlcvWebSocket(symbol, timeframe);
const { indicators, signals } = useStrategyWebSocketEnhanced(strategyId);

// AFTER
const {
	ohlcvData: { latestCandle, fullDataset },
	strategyData: { indicators, signals },
} = useUnifiedWebSocket({ symbol, timeframe, strategyId });
```

### **Phase 2: Legacy File Cleanup** 🧹

#### **2.1 Remove Legacy WebSocket Files**

```bash
# Files to remove (if they exist):
- local_modules/utils/strategyWebsocket.ts ❓ (check if exists)
- Any duplicate WebSocket utilities
```

#### **2.2 Update Frontend Hooks**

```bash
# Keep and update:
- src/hooks/useOhlcvWebSocket.tsx ✅ (already correct)
- src/hooks/useStrategyWebSocketEnhanced.tsx ➡️ Simplify or deprecate

# Create new:
- src/hooks/useUnifiedWebSocket.tsx 🆕 (unified approach)
```

### **Phase 3: Strategy System Integration** 🎯

#### **3.1 Verify Strategy API Endpoints**

Ensure these endpoints work with frontend:

```
GET /api/v1/strategies ✅
GET /api/v1/indicators ✅
POST /api/v1/strategies ✅
PUT /api/v1/strategies/:id ✅
```

#### **3.2 Fill Missing Backend Components**

Complete any missing strategy processing in backend:

```typescript
// Ensure these work:
- Strategy indicator calculations
- Signal generation
- Real-time strategy execution
- Strategy result caching
```

### **Phase 4: Documentation & Testing** 📚

#### **4.1 Document Unified Architecture**

Create comprehensive documentation of the new unified system.

#### **4.2 Test All Integrations**

- WebSocket connectivity
- Strategy selection and visualization
- Indicator application
- Real-time updates

## 🚨 **Immediate Actions Needed**

### **Priority 1: Frontend WebSocket Simplification**

The current `useStrategyWebSocketEnhanced` is complex and may have redundant logic. We should:

1. **Simplify or replace** with direct unified WebSocket usage
2. **Test strategy data flow** from backend to frontend
3. **Verify indicator application** in Strategy Studio

### **Priority 2: Strategy Studio Chart Integration**

The Strategy Studio indicator issue is likely related to:

1. **Incorrect indicator type mapping** (strategy format → chart format)
2. **Missing WebSocket data flow** for real-time updates
3. **Chart component not receiving** converted indicators

### **Priority 3: Backend Strategy Processing**

Ensure the backend can:

1. **Process strategy files** correctly
2. **Generate indicator data** for selected strategies
3. **Broadcast strategy results** via unified WebSocket

## 📊 **Files That Need Attention**

### **High Priority**

1. `src/hooks/useStrategyWebSocketEnhanced.tsx` - Simplify or replace
2. `src/components/strategy-studio/StrategyStudio.tsx` - Fix indicator application
3. Backend strategy processing - Verify signal generation

### **Medium Priority**

1. Legacy file cleanup (find and remove old WebSocket files)
2. Documentation updates
3. API endpoint verification

### **Low Priority**

1. Performance optimization
2. Error handling improvements
3. Additional testing

## ✅ **Success Criteria**

1. **Single WebSocket Connection**: Both OHLCV and strategy data via one connection
2. **Strategy Studio Working**: Indicators appear when creating/editing strategies
3. **Clean Codebase**: No duplicate or legacy WebSocket files
4. **Complete Documentation**: Clear architecture documentation
5. **Stable Performance**: No regression in existing functionality

---

**Next Step**: Start with frontend WebSocket simplification and Strategy Studio indicator fix.
