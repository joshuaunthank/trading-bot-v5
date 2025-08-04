# Global Data Availability Guide

## Overview

This document provides a comprehensive overview of the global data contexts available throughout the Trading Bot v5 application, enabling developers to understand what data is accessible from any component in the application.

## Global Context Providers

### 1. StrategyProvider (`/src/context/StrategyContext.tsx`)

**Purpose**: Global strategy selection and management
**Available Data**:

- `selectedStrategyId: string | null` - Currently selected strategy ID
- `setSelectedStrategyId: (id: string | null) => void` - Strategy selection function
- `strategies: Strategy[]` - List of all available strategies
- `loading: boolean` - Loading state for strategy operations
- `error: string | null` - Error state for strategy operations

**Access Pattern**:

```typescript
import { useStrategy } from "../context/StrategyContext";

const {
	selectedStrategyId,
	setSelectedStrategyId,
	strategies,
	loading,
	error,
} = useStrategy();
```

### 2. WebSocketProvider (`/src/context/WebSocketContext.tsx`)

**Purpose**: Global WebSocket connection management with real-time data streaming
**Available Data**:

- `connectionStatus: 'connected' | 'connecting' | 'disconnected'` - Connection state
- `sendMessage: (message: any) => void` - Send messages through WebSocket
- `ohlcvData: OHLCVData[]` - Real-time OHLCV candlestick data
- `indicators: BackendIndicator[]` - Real-time calculated indicators
- `isLoading: boolean` - Data loading state

**Key Features**:

- Strategy-aware indicator streaming
- Automatic reconnection handling
- Full/incremental data processing
- Strategy change detection and state clearing

**Access Pattern**:

```typescript
import { useWebSocketContext } from "../context/WebSocketContext";

const { connectionStatus, sendMessage, ohlcvData, indicators, isLoading } =
	useWebSocketContext();
```

## Derived Data Hooks

### 3. useOhlcvWithIndicators (`/src/hooks/useOhlcvWithIndicators.tsx`)

**Purpose**: Unified access to OHLCV and indicator data with strategy-aware processing
**Available Data**:

- `ohlcvData: OHLCVData[]` - Processed candlestick data
- `indicators: BackendIndicator[]` - Strategy-specific indicators
- `loading: boolean` - Combined loading state
- `error: string | null` - Error state

**Key Features**:

- Strategy change detection
- Automatic indicator clearing on strategy switch
- Data validation and processing

**Access Pattern**:

```typescript
import { useOhlcvWithIndicators } from "../hooks/useOhlcvWithIndicators";

const { ohlcvData, indicators, loading, error } = useOhlcvWithIndicators();
```

### 4. useDashboard (`/src/hooks/useDashboard.ts`)

**Purpose**: Dashboard-level data processing and management
**Available Data**:

- `allChartIndicators: CalculatedIndicator[]` - Processed indicators for chart display
- `detailedStrategy: DetailedStrategy | null` - Current strategy details
- `strategies: Strategy[]` - Available strategies
- `selectedStrategyId: string | null` - Selected strategy
- `loading: boolean` - Global loading state
- Strategy management functions (create, update, delete)
- Configuration management functions

**Access Pattern**:

```typescript
import { useDashboard } from "../hooks/useDashboard";

const {
	allChartIndicators,
	detailedStrategy,
	strategies,
	selectedStrategyId,
	handleStrategySelect,
	handleSaveStrategy,
	handleDeleteStrategy,
} = useDashboard();
```

## Data Flow Architecture

### Real-Time Data Flow

1. **WebSocket Connection** → Receives real-time OHLCV and indicator data
2. **WebSocketContext** → Processes and distributes data globally
3. **useOhlcvWithIndicators** → Strategy-aware data consumption
4. **Components** → Render real-time data updates

### Strategy Management Flow

1. **StrategyContext** → Global strategy selection state
2. **useDashboard** → Strategy CRUD operations and detailed data
3. **Components** → Strategy selection and management UI
4. **WebSocketContext** → Strategy-specific data streaming

## Best Practices for Data Access

### 1. Component-Level Data Access

```typescript
// ✅ Good: Use appropriate hook for your needs
const { ohlcvData, indicators } = useOhlcvWithIndicators(); // For chart components
const { strategies, selectedStrategyId } = useStrategy(); // For strategy selection
const { connectionStatus } = useWebSocketContext(); // For connection status

// ❌ Avoid: Accessing multiple contexts when one hook provides all needed data
```

### 2. Performance Optimization

```typescript
// ✅ Good: Use useMemo for expensive calculations
const processedData = useMemo(() => {
	return expensiveCalculation(ohlcvData);
}, [ohlcvData]);

// ✅ Good: Use useCallback for event handlers
const handleDataUpdate = useCallback(
	(newData) => {
		// Handle data update
	},
	[dependency]
);
```

### 3. Error Handling

```typescript
// ✅ Good: Check for loading and error states
if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
if (!data) return <NoDataMessage />;
```

## Data Types Reference

### Core Data Types

```typescript
// OHLCV Data
interface OHLCVData {
	timestamp: number;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
}

// Backend Indicator
interface BackendIndicator {
	id: string;
	name: string;
	type: string;
	data: { x: number; y: number | null }[];
	config?: {
		color?: string;
		[key: string]: any;
	};
}

// Calculated Indicator (for charts)
interface CalculatedIndicator {
	id: string;
	name: string;
	data: { x: number; y: number }[];
	color: string;
	yAxisID: "price" | "volume" | "oscillator";
	type: IndicatorType;
}

// Strategy
interface Strategy {
	id: string;
	name: string;
	description?: string;
	state?: "active" | "paused" | "stopped";
}
```

## Global State Management Summary

The application uses a combination of React Context and custom hooks to provide global data access:

1. **Context Providers** wrap the entire application at the root level
2. **Custom Hooks** provide convenient access to context data with additional processing
3. **Derived Hooks** combine multiple contexts for specific use cases
4. **Components** access data through appropriate hooks based on their needs

This architecture ensures:

- ✅ **Single Source of Truth** for all global data
- ✅ **Real-Time Updates** propagated to all components
- ✅ **Type Safety** with TypeScript interfaces
- ✅ **Performance Optimization** through proper memoization
- ✅ **Easy Testing** with isolated data providers
- ✅ **Maintainable Code** with clear data access patterns

## Usage Examples

### Chart Component

```typescript
const TradingChart = () => {
	const { ohlcvData, indicators, loading } = useOhlcvWithIndicators();

	if (loading) return <div>Loading chart data...</div>;

	return <div>{/* Render chart with ohlcvData and indicators */}</div>;
};
```

### Strategy Selection Component

```typescript
const StrategySelector = () => {
	const { strategies, selectedStrategyId, setSelectedStrategyId } =
		useStrategy();

	return (
		<select
			value={selectedStrategyId || ""}
			onChange={(e) => setSelectedStrategyId(e.target.value || null)}
		>
			<option value="">Select Strategy</option>
			{strategies.map((strategy) => (
				<option key={strategy.id} value={strategy.id}>
					{strategy.name}
				</option>
			))}
		</select>
	);
};
```

### Dashboard Component

```typescript
const Dashboard = () => {
	const {
		allChartIndicators,
		detailedStrategy,
		loading,
		handleStrategySelect,
	} = useDashboard();

	const { connectionStatus } = useWebSocketContext();

	return (
		<div>
			<div>Connection: {connectionStatus}</div>
			<div>Strategy: {detailedStrategy?.name || "None"}</div>
			<div>Indicators: {allChartIndicators.length}</div>
		</div>
	);
};
```
