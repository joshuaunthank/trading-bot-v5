# Fresh Chart System Analysis & Requirements

**Date**: July 27, 2025  
**Status**: Starting completely fresh after removing all old chart files

## 🔍 Current Data Analysis

### WebSocket Data Structure

Based on the current WebSocket implementation:

```typescript
interface OHLCVData {
	timestamp: number;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
}

interface IndicatorData {
	[key: string]: number | undefined;
}

interface WebSocketMessage {
	type: "ohlcv" | "indicators" | "strategy_status";
	data: OHLCVData[] | IndicatorData | StrategyStatusData;
	updateType?: "full" | "incremental";
}
```

### Current Data Flow

1. **WebSocket**: Streams OHLCV data + indicators
2. **useDashboard**: Processes and transforms data
3. **ChartTab**: Receives processed data as props

## 📋 Chart System Requirements

### Core Features Needed

1. **Live & Historical Data Display**

   - Real-time candlestick charts
   - Historical data on the left
   - Current (live) candle on the right
   - Smooth transition when candle completes

2. **Multi-Panel Architecture**

   - **Main Panel**: Price chart with overlays (EMA, Bollinger Bands)
   - **Volume Panel**: Volume bars
   - **Oscillator Panels**: RSI, MACD, etc. (separate panels)
   - **Shared Time Axis**: Only show dates/times at the bottom

3. **Interactive Features**

   - Zoom & pan functionality
   - Position retention during updates
   - Live price marker on right edge
   - Signal annotations on chart

4. **Strategy Integration**
   - Use strategy colors for indicators
   - Show indicators based on selected strategy
   - Display buy/sell signals as annotations

## 🔧 WebSocket Data Structure Requirements

### Current vs Needed Data Structure

**Current Structure (Good):**

```typescript
// OHLCV data is perfect as-is
interface OHLCVData {
	timestamp: number; // ✅ Good for Chart.js time axis
	open: number; // ✅ Perfect for candlesticks
	high: number; // ✅ Perfect for candlesticks
	low: number; // ✅ Perfect for candlesticks
	close: number; // ✅ Perfect for candlesticks
	volume: number; // ✅ Good for volume bars
}
```

**Indicator Data Needs Enhancement:**

```typescript
// Current - problematic for Chart.js
interface IndicatorData {
	[key: string]: number | undefined; // ❌ No timestamp association
}

// Needed - Chart.js compatible
interface CalculatedIndicator {
	id: string;
	name: string;
	data: IndicatorValue[]; // ✅ Already correct in types/indicators.ts
	color: string;
	yAxisID: string;
	type: IndicatorType;
}

interface IndicatorValue {
	x: number; // timestamp ✅ Chart.js compatible
	y: number | null; // value ✅ Chart.js compatible
}
```

## 🎯 Implementation Plan

### Phase 1: Basic Chart Structure

1. **Chart.js Setup**

   - Import Chart.js with financial plugin
   - Configure candlestick controller
   - Set up time axis with proper formatting

2. **Multi-Panel Layout**

   - Create container with dynamic panel heights
   - Main panel (60% height) for price
   - Indicator panels (40% height split between indicators)

3. **Basic Data Display**
   - Candlestick chart for OHLCV data
   - Volume bars in separate panel
   - Time axis only on bottom panel

### Phase 2: Real-time Updates

1. **Live Candle Logic**

   - Identify last candle as "live" vs "historical"
   - Update live candle without recreating chart
   - Transition live→historical on period close

2. **WebSocket Integration**
   - Process streaming OHLCV updates
   - Handle incremental vs full updates
   - Maintain chart zoom/pan state during updates

### Phase 3: Indicators & Strategy Integration

1. **Indicator Overlays**

   - Price overlays (EMA, Bollinger Bands) on main panel
   - Oscillators (RSI, MACD) in separate panels
   - Use strategy colors for each indicator

2. **Signal Annotations**
   - Buy/sell signal markers on chart
   - Strategy-based annotation colors
   - Hover tooltips for signal details

### Phase 4: Advanced Features

1. **Interactive Controls**

   - Zoom & pan with chartjs-plugin-zoom
   - Position retention during data updates
   - Reset zoom functionality

2. **Live Price Marker**
   - Real-time price line on right edge
   - Color coding (green/red) for price movement
   - Price value display

## 🚀 Next Steps

1. **Clean Slate Confirmed** ✅

   - All old chart files removed
   - ChartTab.tsx shows "coming soon" message
   - Ready for fresh implementation

2. **Start Implementation**

   - Create new chart component structure
   - Set up Chart.js with financial plugin
   - Build multi-panel layout
   - Integrate with existing WebSocket data flow

3. **Data Structure Assessment**
   - Current OHLCV data: ✅ Perfect as-is
   - Indicator data: ⚠️ Needs review (may need timestamp association)
   - WebSocket flow: ✅ Good foundation, may need indicator data enhancement

## 💡 Key Insights

- **WebSocket data structure is mostly good** - OHLCV is perfect
- **Indicator data might need timestamps** - need to verify current backend output
- **Multi-panel architecture** - Use CSS Grid for responsive layout
- **Live candle logic** - Last candle = live, rest = historical
- **Chart.js with financial plugin** - Best choice for candlestick charts
- **Zoom preservation** - Critical for good UX during updates
