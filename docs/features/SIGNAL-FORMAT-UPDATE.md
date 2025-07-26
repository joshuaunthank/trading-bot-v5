# Signal Format Update - Frontend Integration

## Overview

Updated the frontend StrategyEditor to support the new structured signal format with conditions arrays while maintaining backward compatibility with the old expression format.

## Changes Made

### 1. Updated Interface Definitions

**New `SignalData` interface** in `StrategyEditor.tsx`:

```typescript
interface SignalCondition {
	indicator: string;
	operator: string;
	value: any;
	description: string;
}

interface SignalData {
	id: string;
	name?: string;
	type: "entry" | "exit";
	side: "long" | "short";
	expression?: string; // Legacy format support
	conditions?: SignalCondition[]; // New format
	logic?: "and" | "or";
	confidence?: number;
	description: string;
}
```

### 2. Format Conversion Functions

**Added conversion helpers**:

- `conditionsToExpression()` - Converts conditions array to expression string
- `expressionToConditions()` - Parses expression string back to conditions array

### 3. Enhanced Signal Editor UI

**New fields added**:

- **Name field** - Display signal name instead of generic "Signal X"
- **Logic selector** - Choose between AND/OR for multiple conditions
- **Confidence slider** - Set confidence level (0-1)
- **Smart expression field** - Auto-generates from conditions, editable

**Expression Field Features**:

- Displays auto-generated expression from conditions
- Editable - updates conditions when modified
- Shows helpful hint text
- Supports both old and new formats

### 4. Updated Signal Creation

**New signals created with**:

- Default conditions array (empty)
- AND logic
- 0.5 confidence
- Proper name field

## Testing Your Strategy

### Current Strategy Status

Your `simple_ema_rsi.json` strategy now has **8 complete signals**:

1. **RSI Oversold Entry** - Long when RSI < 30 and price > EMA
2. **RSI Overbought Exit** - Exit long when RSI > 70
3. **RSI Overbought Short Entry** - Short when RSI > 70 and price < EMA
4. **RSI Oversold Short Exit** - Exit short when RSI < 30
5. **Bollinger Breakout Entry** - Long when price breaks above upper band
6. **Bollinger Breakdown Entry** - Short when price breaks below lower band
7. **EMA Trend Reversal Exit** - Exit long when price crosses below EMA
8. **EMA Trend Reversal Short Exit** - Exit short when price crosses above EMA

### Testing Steps

1. **Open the application** at `http://localhost:5173`
2. **Navigate to Strategy Editor**
3. **Load your strategy** - Select "simple_ema_rsi" from the list
4. **Go to Signals tab** - You should now see all 8 signals with proper expressions
5. **Test expression generation** - Each signal should show a readable expression like:
   - `rsi < 30 && close > ema`
   - `rsi > 70`
   - `close > bollingerBands_upper && rsi > 50`

### What You Should See

**Expression Field Examples**:

- RSI Oversold Entry: `rsi < 30 && close > ema`
- RSI Overbought Exit: `rsi > 70`
- Bollinger Breakout: `close > bollingerBands_upper && rsi > 50`

**New Fields Visible**:

- Signal name (e.g., "RSI Oversold Entry")
- Logic dropdown (AND/OR)
- Confidence value (0.6-0.9)
- Auto-generated expression

## Next Steps

### Strategy Engine Testing

With signals properly formatted, you can now:

1. **Test with Strategy Engine** - Use the `StrategyEngineTestPanel` component
2. **Real-time signal generation** - Signals should trigger with live market data
3. **Visual feedback** - See which conditions are met for each signal

### Further Enhancements

- **Visual condition builder** - Drag-and-drop interface for conditions
- **Condition validation** - Real-time validation of indicator references
- **Preview mode** - Show how conditions evaluate with current market data

## Troubleshooting

### If expressions are empty:

1. Check that strategy has `conditions` array in signals
2. Verify conversion functions are working
3. Check browser console for errors

### If new fields don't appear:

1. Refresh the page to load updated code
2. Check TypeScript compilation succeeded
3. Verify all imports are correct

### If signals don't save:

1. Ensure `updateSignal` function handles new fields
2. Check API endpoint accepts new format
3. Verify JSON structure matches expected format

## Implementation Notes

### Backward Compatibility

- Old strategies with `expression` field still work
- New strategies use `conditions` array
- Automatic conversion between formats

### Performance Considerations

- Expression generation is cached
- Only recalculates when conditions change
- Minimal impact on UI responsiveness

### Code Quality

- TypeScript strict mode compliance
- Comprehensive error handling
- Clean separation of concerns

This update provides a seamless transition from the old expression format to the new structured signal format while maintaining full backward compatibility and adding powerful new features for signal configuration.
