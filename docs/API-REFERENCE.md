# API Reference

## REST API Endpoints

Base URL: `http://localhost:3001/api/v1`

### Strategy Management

#### Get All Strategies

```
GET /strategies
```

**Status**: ✅ Working  
**Response**: Array of strategy summaries

#### Get Strategy by ID

```
GET /strategies/:id
```

**Status**: ✅ Working  
**Response**: Detailed strategy configuration

#### Create Strategy

```
POST /strategies
```

**Status**: ✅ Working  
**Body**: Strategy configuration JSON

#### Update Strategy

```
PUT /strategies/:id
```

**Status**: ✅ Working  
**Body**: Updated strategy configuration

#### Delete Strategy

```
DELETE /strategies/:id
```

**Status**: ✅ Working

#### Strategy Control

```
POST /strategies/:id/start
POST /strategies/:id/stop
POST /strategies/:id/pause
POST /strategies/:id/resume
```

**Status**: ⚠️ Framework only - no actual execution logic
**Response**: Control operation status

#### Strategy Status

```
GET /strategies/status
GET /strategies/:id/status
```

**Status**: ⚠️ Framework only - returns file-based data

### Indicators

#### Get Indicator Metadata

```
GET /indicators
```

**Status**: ✅ Working  
**Response**: Available indicator types and parameters

#### Calculate Indicators

```
POST /indicators/calculate
```

**Status**: ⚠️ Limited functionality  
**Body**: `{ type, parameters, data }`

### Performance (Not Implemented)

#### Get Performance Metrics

```
GET /performance
GET /performance/:id
```

**Status**: ❌ Stub only - returns placeholder data

## WebSocket API

### Primary WebSocket Endpoint

**URL**: `ws://localhost:3001/ws/ohlcv`

**Query Parameters**:

- `symbol` - Trading pair (default: BTC/USDT)
- `timeframe` - Chart timeframe (default: 1h)
- `strategy` - Optional strategy ID for strategy-specific data

**Example**:

```
ws://localhost:3001/ws/ohlcv?symbol=BTC/USDT&timeframe=1h&strategy=simple_ema_rsi
```

### Message Types

#### Incoming (Client → Server)

**Strategy Configuration**:

```json
{
	"type": "config",
	"strategyId": "strategy_id"
}
```

**Strategy Control**:

```json
{
	"type": "strategy-control",
	"action": "start|stop|pause|resume",
	"strategyId": "strategy_id"
}
```

#### Outgoing (Server → Client)

**Connection Confirmation**:

```json
{
	"type": "connection",
	"status": "connected",
	"symbol": "BTC/USDT",
	"timeframe": "1h",
	"strategyId": "strategy_id",
	"message": "Connected to BTC/USDT 1h with strategy simple_ema_rsi"
}
```

**OHLCV Data**:

```json
{
	"type": "ohlcv",
	"updateType": "full|incremental",
	"data": [
		{
			"timestamp": 1691337600000,
			"open": 29000.5,
			"high": 29100.25,
			"low": 28950.75,
			"close": 29075.0,
			"volume": 1250.5
		}
	],
	"symbol": "BTC/USDT",
	"timeframe": "1h"
}
```

**Strategy Control Response**:

```json
{
	"type": "strategy-control-response",
	"success": true,
	"action": "start",
	"strategyId": "simple_ema_rsi",
	"message": "Strategy start initiated"
}
```

**Strategy History** (cached results):

```json
{
	"type": "strategy-history",
	"strategyId": "simple_ema_rsi",
	"data": []
}
```

## Data Structures

### OHLCV Data

```typescript
interface OHLCVData {
	timestamp: number;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
}
```

### Strategy Configuration

```typescript
interface Strategy {
	id: string;
	name: string;
	description: string;
	symbol: string;
	timeframe: string;
	indicators: StrategyIndicator[];
	signals: StrategySignal[];
	risk: RiskManagement;
	enabled: boolean;
	meta: {
		version: string;
		created_at: string;
		last_updated: string;
	};
}
```

### Calculated Indicator

```typescript
interface CalculatedIndicator {
	id: string;
	name: string;
	type: string;
	data: Array<{ x: number; y: number | null }>;
	color?: string;
	panel?: "price" | "volume" | "oscillator";
}
```

## Current Limitations

- **Strategy execution**: Control endpoints exist but don't run actual trading logic
- **Indicator calculations**: Limited to basic calculations, no real-time processing
- **Performance tracking**: No implementation of trade logging or P&L calculations
- **Trading operations**: All trading endpoints are commented out/not implemented

## Next Steps

1. **Implement strategy execution engine** - Add real indicator calculations and signal generation
2. **Add trading integration** - Connect CCXT trading functions to strategy signals
3. **Build performance system** - Implement trade logging and metrics calculation
