# URGENT: Strategy Schema Compliance Migration

## 🚨 Critical Issue Identified

Current strategy files in `/local_modules/db/strategies/` do NOT comply with the schema defined in `strategy.schema.json`. This will cause system breakage when schema validation is enforced.

## Schema Violations Found

### Missing Required Fields

- `signals` array with proper structure
- `risk_management` object with required properties
- `ml_models` array for ML integration
- `postprocessing` array for signal processing
- Proper `metadata` structure with version info

### Example Schema-Compliant Structure

```json
{
	"id": "strategy-001",
	"name": "EMA Crossover Strategy",
	"description": "Long/short signals based on EMA crossovers",
	"indicators": [
		{
			"type": "EMA",
			"period": 20,
			"enabled": true
		}
	],
	"signals": [
		{
			"side": "long",
			"description": "EMA 20 crosses above EMA 50"
		}
	],
	"risk_management": {
		"max_position_size": 0.1,
		"stop_loss_percentage": 0.02,
		"take_profit_percentage": 0.05
	},
	"ml_models": [],
	"postprocessing": [],
	"metadata": {
		"version": "1.0",
		"created": "2025-07-02T00:00:00Z",
		"author": "system"
	},
	"last_updated": "2025-07-02T00:00:00Z"
}
```

## Migration Required

### Immediate Action Needed

1. **Run Migration Script**: `migrate-strategies.ts` to fix all strategy files
2. **Backup Creation**: Automatic backups before modification
3. **Schema Validation**: Ensure all files pass validation after migration

### Migration Script Usage

```bash
cd /Users/maxr/Projects/trading-bot-v5
npx ts-node local_modules/utils/migrate-strategies.ts
```

## Impact if Not Fixed

- **System Crashes**: Schema validation will reject non-compliant files
- **Data Loss**: Invalid strategies won't load in the UI
- **Development Blocks**: New features depend on proper schema compliance
- **Trading Failures**: Missing risk management will prevent safe trading

## Post-Migration Tasks

1. **Update Strategy Creation UI** to support all schema fields
2. **Add Schema Validation** to strategy loading functions
3. **Test All Strategies** to ensure they load and function correctly
4. **Document New Fields** for future strategy development

## Verification Steps

After running migration:

1. Check that all strategy files validate against schema
2. Verify strategies load correctly in the UI
3. Confirm no data was lost during migration
4. Test strategy creation with new schema fields

**This migration is CRITICAL and must be completed before any other development work.**
