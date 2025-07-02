# RSI Null Values Fix - July 2, 2025

## Problem Summary

**Issue**: RSI indicator values were showing as `null` in the frontend oscillator panel, despite successful backend calculations.

**Symptoms**:

- RSI calculations in backend were working correctly (producing values like 66.7, 66.53, 67.53)
- Frontend received `null` values for RSI via WebSocket
- EMA and Volume SMA indicators worked fine
- RSI panel in the chart remained empty

## Root Cause Analysis

### Investigation Process

1. **WebSocket Debug**: Created debug scripts to monitor indicator data flow
2. **Backend Logging**: Added debug logs to track RSI calculation flow
3. **Calculation Testing**: Verified RSI calculations work with sample data
4. **Data Flow Analysis**: Traced data from calculation → alignment → incremental processing → frontend

### Root Causes (Multiple Issues Found)

#### 1. Backend: Latest Value Selection Issue

The **incremental indicator processing function** (`calculateStrategyIndicatorsIncremental`):

```typescript
// PROBLEMATIC CODE:
const latestValue = result.data[result.data.length - 1];
```

**Problem**: This always took the very last value from the aligned data array, but for RSI:

- RSI requires a warmup period (14 candles for RSI-14)
- The latest candle might not have a valid RSI value yet (still `null`)
- The function was returning `null` instead of the latest valid RSI value

#### 2. Frontend: Data Format Mismatch

The **frontend indicator processing** expected arrays but received objects:

**Problem**: Backend sent indicators as objects with `{id, name, type, data}` structure, but frontend only processed arrays:

```typescript
// PROBLEMATIC CODE:
if (Array.isArray(indicatorData)) {
	// Only processed arrays, ignored backend objects
}
```

This caused the frontend to:

- Ignore the full historical RSI data (1000 points)
- Only process incremental updates (1 point each)
- Charts couldn't render with insufficient data points

## Solution

### Backend Fix: Latest Non-Null Value Selection

Modified the incremental function to find the **latest non-null value** instead of just the last value:

```typescript
// FIXED CODE:
export function calculateStrategyIndicatorsIncremental(
	strategyId: string,
	ohlcvData: OHLCVData[]
): Record<string, IndicatorValue> {
	const fullResults = calculateStrategyIndicators(strategyId, ohlcvData);
	const incrementalResults: Record<string, IndicatorValue> = {};

	for (const result of fullResults) {
		// Find the latest non-null value (traverse backwards)
		let latestValue: IndicatorValue | null = null;
		for (let i = result.data.length - 1; i >= 0; i--) {
			if (result.data[i].y !== null) {
				latestValue = result.data[i];
				break;
			}
		}

		// Fallback to last value if no non-null value found
		if (!latestValue) {
			latestValue = result.data[result.data.length - 1];
		}

		incrementalResults[result.id] = latestValue;
	}

	return incrementalResults;
}
```

### Frontend Fix: Proper Data Format Handling

Updated the frontend to handle both object and array formats from the backend:

```typescript
// FIXED CODE:
// Check if indicatorData is an object with data array (backend format)
if (
	indicatorData &&
	typeof indicatorData === "object" &&
	"data" in indicatorData &&
	Array.isArray((indicatorData as any).data)
) {
	const backendIndicator = indicatorData as any;
	const result = {
		id: indicatorId,
		name: backendIndicator.name || indicatorId,
		type: backendIndicator.type || "unknown",
		data: backendIndicator.data as IndicatorValue[],
	};
	indicatorResults.push(result);
}
// Legacy: Check if indicatorData is directly an array
else if (Array.isArray(indicatorData)) {
	// Handle array format
}
```

## Verification

### Before Fix

```
rsi:
  Value: null
  Timestamp: 1751450400000
  Type: object
  ⚠️ RSI is NULL - this might be why it's not displaying
```

### After Fix

```
rsi:
  Value: 66.95
  Timestamp: 1751446800000
  Type: number
  ✅ RSI value looks good: 66.95
```

## Impact

✅ **Fixed**: RSI now displays correctly in the oscillator panel
✅ **Fixed**: All indicators properly categorized into their panels
✅ **Maintained**: EMA and Volume SMA continue working as before
✅ **Improved**: System now handles indicators with warmup periods correctly

## Files Modified

- `/local_modules/utils/strategyIndicators.ts` - Fixed incremental processing logic to find latest non-null values
- `/src/hooks/useOhlcvWithIndicators.tsx` - Fixed frontend data format handling for backend indicator objects

## Testing

- ✅ WebSocket debug script confirms RSI values are valid (66.95)
- ✅ Frontend now processes full historical RSI data (1000 points)
- ✅ RSI displays correctly in the oscillator panel
- ✅ Multi-panel chart layout working correctly
- ✅ No regression in other indicators (EMA, Volume SMA)
- ✅ Debug logs cleaned up for production

## Notes

This fix addresses fundamental issues with how indicators that have warmup periods are processed for real-time display. The solution ensures that:

1. **Latest valid values** are always sent to the frontend (backend fix)
2. **Full historical data** is properly processed from backend objects (frontend fix)
3. **Indicator panels** receive sufficient data for visualization
4. **Real-time updates** continue working for all indicator types
5. **Backward compatibility** is maintained for indicators without warmup periods

The fixes are generic and will benefit any future indicators that require warmup periods (MACD, Bollinger Bands, etc.) or use the backend's structured data format.
