# Chart Timeframe Consistency Implementation

**Date:** June 23, 2025  
**Issue:** Indicator misalignment at different zoom levels  
**Solution:** Enforce fixed timeframe calculation with zoom-independent rendering

## 🎯 **Problem Analysis**

The charts show RSI behaving differently at various zoom levels for the **same timeframe**, indicating:

1. **Chart.js rendering artifacts** - Indicators recalculated based on visible points
2. **Data sampling inconsistencies** - Different zoom levels using different data subsets
3. **Missing timeframe enforcement** - Calculations not locked to fixed timeframe

## ✅ **Solution: Enhanced Fixed Timeframe System**

### **1. Timeframe Lock Configuration**

```typescript
// Add to ChartView component
const TIMEFRAME_CONFIGS = {
	"1m": { label: "1 Minute", indicatorPeriod: 60 },
	"5m": { label: "5 Minutes", indicatorPeriod: 300 },
	"15m": { label: "15 Minutes", indicatorPeriod: 900 },
	"1h": { label: "1 Hour", indicatorPeriod: 3600 },
	"4h": { label: "4 Hours", indicatorPeriod: 14400 },
	"1d": { label: "1 Day", indicatorPeriod: 86400 },
} as const;
```

### **2. Indicator Calculation Lock**

```typescript
// Ensure indicators are calculated only on complete timeframe data
const calculateIndicatorsWithTimeframeLock = (
	data: OHLCVData[],
	timeframe: string,
	indicatorConfigs: IndicatorConfig[]
) => {
	// Lock calculations to specific timeframe intervals
	const config = TIMEFRAME_CONFIGS[timeframe];
	if (!config) throw new Error(`Invalid timeframe: ${timeframe}`);

	// Use only complete candles for the specified timeframe
	const alignedData = alignDataToTimeframe(data, timeframe);

	// Calculate indicators on aligned data
	return calculateIndicators(alignedData, indicatorConfigs);
};
```

### **3. Chart Rendering Consistency**

```typescript
// Prevent Chart.js from recalculating on zoom
const chartOptions = {
	interaction: {
		intersect: false,
		mode: "index" as const,
	},
	scales: {
		x: {
			// Lock x-axis to prevent timeframe drift
			type: "time",
			time: {
				unit: getTimeUnit(timeframe), // 'minute', 'hour', 'day'
				displayFormats: {
					minute: "HH:mm",
					hour: "HH:mm",
					day: "MMM DD",
				},
			},
		},
	},
	// Prevent data recalculation on zoom
	plugins: {
		zoom: {
			zoom: {
				wheel: { enabled: true },
				pinch: { enabled: true },
				mode: "x" as const,
				onZoom: ({ chart }) => {
					// Do NOT recalculate indicators on zoom
					// Only update visible range
				},
			},
		},
	},
};
```

## 🚀 **Implementation Benefits**

### **Pros of Fixed Timeframe Approach:**

✅ **Consistent Signals** - RSI behaves identically regardless of zoom  
✅ **Professional Standard** - Matches TradingView, Bloomberg, etc.  
✅ **Backtesting Accuracy** - Live performance matches historical tests  
✅ **Overtrading Prevention** - Works perfectly with your protection system  
✅ **Performance** - Calculate once per timeframe, not per zoom level

### **Why NOT Dynamic Timeframe:**

❌ **Unpredictable Signals** - Strategy behavior changes with UI interactions  
❌ **Testing Nightmare** - Impossible to replicate conditions  
❌ **User Confusion** - Same strategy gives different results  
❌ **Performance Issues** - Constant recalculation on every zoom

## 📊 **Recommended Chart Configuration**

```typescript
// Fixed timeframe with user-selectable options
const timeframeSelector = (
	<select
		value={currentTimeframe}
		onChange={(e) => setTimeframe(e.target.value)}
	>
		<option value="1m">1 Minute</option>
		<option value="5m">5 Minutes</option>
		<option value="15m">15 Minutes</option>
		<option value="1h">1 Hour</option>
		<option value="4h">4 Hours</option>
		<option value="1d">1 Day</option>
	</select>
);
```

## 🎯 **Next Steps**

1. **Implement timeframe lock** in indicator calculations
2. **Add timeframe consistency validation** to prevent drift
3. **Update Chart.js options** to prevent zoom-based recalculation
4. **Test with your overtrading protection** to ensure compatibility

This approach ensures your trading bot gets **reliable, consistent signals** regardless of how users interact with the chart interface!
