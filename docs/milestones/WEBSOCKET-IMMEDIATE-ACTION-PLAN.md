# Unified WebSocket Implementation - Immediate Action Plan

**Date:** June 26, 2025  
**Priority:** 🔥 **HIGH** - Fix Strategy Builder & Complete Unification

## 🎯 **Main Issues Identified**

### **1. Strategy Builder Missing Chart Integration** 🚨

- **Problem**: StrategyBuilder has no chart component
- **Impact**: Users can't see indicators visually while building strategies
- **Solution**: Add live chart with real-time indicator preview

### **2. Frontend WebSocket Architecture** 🔄

- **Current State**: Two separate hooks using unified backend endpoint
- **Status**: Working but could be simplified
- **Action**: Keep current approach (it's working) but document properly

### **3. Backend Data Structure** ✅

- **Status**: Complete and correct
- **Location**: `local_modules/db/strategies/` and `local_modules/db/indicators/`
- **Action**: Verify API endpoints serve this data correctly

## 🚀 **Immediate Actions**

### **Action 1: Add Chart to Strategy Builder** 🎯

Create a split-screen layout in StrategyStepper:

```tsx
// Left: Strategy Builder Steps (Current)
// Right: Live Chart with Indicators (NEW)
```

**Implementation Plan:**

1. **Add chart component** to StrategyStepper
2. **Convert strategy indicators** to IndicatorConfig format
3. **Pass to chart** for real-time visualization
4. **Update on every indicator change**

### **Action 2: Create Enhanced StrategyStepper Layout**

```tsx
// New layout: src/components/builder/StrategyStepper.tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
	{/* Left Panel: Strategy Builder */}
	<div className="space-y-6">{/* Current stepper content */}</div>

	{/* Right Panel: Live Chart */}
	<div className="sticky top-4">
		<StrategyBuilderChart
			indicators={convertedIndicators}
			symbol="BTC/USDT"
			timeframe="1h"
		/>
	</div>
</div>
```

### **Action 3: Test Backend API Endpoints**

Verify these work correctly:

```bash
GET /api/v1/strategies          # List all strategies
GET /api/v1/indicators          # List all indicators
GET /api/v1/indicators/types    # List indicator types
POST /api/v1/strategies         # Create strategy
PUT /api/v1/strategies/:id      # Update strategy
```

### **Action 4: Verify WebSocket Data Flow**

Test the unified WebSocket:

```typescript
// Test URL: ws://localhost:3001/ws/ohlcv?symbol=BTC/USDT&timeframe=1h&strategy=enhanced_rsi_ema_strategy
// Should return: OHLCV data + strategy data
```

## 📋 **Implementation Steps**

### **Step 1: Create StrategyBuilderChart Component**

```typescript
// File: src/components/builder/StrategyBuilderChart.tsx
interface StrategyBuilderChartProps {
	indicators: IndicatorConfig[];
	symbol: string;
	timeframe: string;
}

export const StrategyBuilderChart: React.FC<StrategyBuilderChartProps> = ({
	indicators,
	symbol,
	timeframe,
}) => {
	// Use existing MultiPanelChart
	// Connect to useOhlcvWebSocket for data
	// Display indicators in real-time
	// Show preview text when no indicators
};
```

### **Step 2: Add Indicator Conversion Logic**

```typescript
// In StrategyStepper.tsx
const convertStrategyToIndicators = (
	indicators: Indicator[]
): IndicatorConfig[] => {
	return indicators.map((indicator) => ({
		id: indicator.id,
		type: mapIndicatorType(indicator.type),
		enabled: true,
		period: indicator.parameters?.period || 14,
		parameters: indicator.parameters || {},
	}));
};

const mapIndicatorType = (type: string): IndicatorType => {
	const mapping = {
		rsi: "RSI",
		ema: "EMA",
		sma: "SMA",
		macd: "MACD",
		bollinger: "BB",
		// ... etc
	};
	return mapping[type.toLowerCase()] || "RSI";
};
```

### **Step 3: Update StrategyStepper Layout**

Replace single column with split-screen layout showing:

- **Left**: Strategy building steps (current functionality)
- **Right**: Live chart with indicators (new functionality)

### **Step 4: Test & Verify**

1. **Start servers**: `npm run dev`
2. **Go to Strategy Builder**: `/builder`
3. **Add indicators**: Should appear on chart immediately
4. **Edit parameters**: Chart should update in real-time
5. **Switch steps**: Chart should persist indicator state

## 🧹 **Quick Cleanup Actions**

### **Files to Remove** (if they exist):

```bash
# Search for legacy files
find . -name "*strategyWebsocket*" -not -path "./node_modules/*"
find . -name "*websocket*" -not -path "./node_modules/*" | grep -v websocket-main
```

### **Files to Keep**:

```bash
✅ src/hooks/useWebSocket.tsx           # Base WebSocket hook
✅ src/hooks/useOhlcvWebSocket.tsx      # OHLCV data hook
✅ src/hooks/useStrategyWebSocketEnhanced.tsx # Strategy data hook
✅ local_modules/utils/websocket-main.ts # Unified backend
```

## 🎯 **Expected Results**

After implementation:

1. **Strategy Builder** shows live chart with indicators
2. **Real-time feedback** when adding/editing indicators
3. **Visual confirmation** of strategy configuration
4. **Unified WebSocket** documented and optimized
5. **Clean codebase** with no legacy files

## ⚡ **Quick Win Priority**

**Start with:** Adding chart to Strategy Builder (1-2 hours)
**This will:** Immediately solve the main UX issue
**Then:** Clean up any legacy files and document architecture

---

**Next Action:** Implement StrategyBuilderChart component and update StrategyStepper layout.
