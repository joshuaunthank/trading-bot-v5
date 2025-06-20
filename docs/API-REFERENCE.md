# Strategy Manager API Quick Reference

**Last Updated:** June 20, 2025  
**Version:** Phase 2 Complete

## 🚀 Multi-Strategy Manager Endpoints

All endpoints are prefixed with `/api/v1/strategies/manager`

### Strategy Lifecycle Management

| Method | Endpoint      | Description                | Parameters         |
| ------ | ------------- | -------------------------- | ------------------ |
| `POST` | `/:id/start`  | Start a strategy instance  | `id` - Strategy ID |
| `POST` | `/:id/stop`   | Stop a strategy instance   | `id` - Strategy ID |
| `POST` | `/:id/pause`  | Pause a strategy instance  | `id` - Strategy ID |
| `POST` | `/:id/resume` | Resume a strategy instance | `id` - Strategy ID |

### Monitoring & Status

| Method | Endpoint       | Description                 | Returns                          |
| ------ | -------------- | --------------------------- | -------------------------------- |
| `GET`  | `/active`      | Get all active strategies   | Array of running strategies      |
| `GET`  | `/status`      | Get strategy manager status | Manager health & stats           |
| `GET`  | `/:id/metrics` | Get strategy performance    | Performance metrics for strategy |

## 📝 Example Usage

### Start a Strategy

```bash
curl -X POST http://localhost:3001/api/v1/strategies/manager/enhanced_rsi_ema_strategy/start
```

### Get All Active Strategies

```bash
curl http://localhost:3001/api/v1/strategies/manager/active
```

### Pause a Strategy

```bash
curl -X POST http://localhost:3001/api/v1/strategies/manager/enhanced_rsi_ema_strategy/pause
```

### Get Strategy Metrics

```bash
curl http://localhost:3001/api/v1/strategies/manager/enhanced_rsi_ema_strategy/metrics
```

## 🎯 Response Format

All endpoints return JSON in this format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response

```json
{
	"success": false,
	"error": "Error description",
	"details": "Detailed error message"
}
```

## 🔄 Strategy States

- **stopped** - Strategy is not running
- **starting** - Strategy is being initialized
- **running** - Strategy is actively processing data
- **paused** - Strategy is paused (can be resumed)
- **error** - Strategy encountered an error

## 📊 Metrics Response Example

```json
{
	"success": true,
	"data": {
		"status": {
			"status": "running",
			"uptime": 1234567,
			"lastUpdate": "2025-06-20T00:00:00.000Z"
		},
		"performance": {
			"totalReturn": 0.05,
			"winRate": 0.65,
			"sharpeRatio": 1.2,
			"maxDrawdown": -0.03,
			"totalTrades": 15,
			"currentPosition": "long",
			"unrealizedPnL": 150.25,
			"realizedPnL": 1250.75
		},
		"indicators": [
			{
				"id": "rsi_14",
				"name": "RSI(14)",
				"value": 45.23,
				"timestamp": 1750374345758
			}
		],
		"signals": [
			{
				"id": "signal_123",
				"timestamp": 1750374345758,
				"type": "entry",
				"side": "long",
				"confidence": 0.8,
				"price": 50000.0,
				"reason": "RSI oversold with EMA confirmation"
			}
		]
	}
}
```

## 🛠️ Implementation Notes

- All strategy IDs must match existing strategy configuration files
- Endpoints are idempotent where possible (e.g., starting an already running strategy returns success)
- Real-time updates are available via WebSocket (see WebSocket documentation)
- Performance metrics are calculated in real-time as strategies process market data

## 🔗 Related Documentation

- [Multi-Strategy Engine Architecture](../docs/features/MULTI-STRATEGY-ENGINE-ARCHITECTURE.md)
- [Phase 2 Complete: Real Indicators & Signals](../docs/milestones/PHASE-2-COMPLETE-REAL-INDICATORS-SIGNALS.md)
- [Strategy Configuration Schema](../local_modules/schemas/strategy.schema.json)

---

**For Support:** Check the main README.md or documentation in `/docs/` directory
