# Strategy Validation Tools

This directory contains utilities for validating strategy files to ensure they meet the requirements before being used in the trading bot.

## Features

- **JSON Schema Validation**: Validates strategy files against the JSON schema
- **Required Field Checking**: Ensures all required fields are present
- **Error Formatting**: Provides detailed error messages for validation failures
- **Automatic Fixing**: Attempts to fix common issues in strategy files
- **Command-line Validation**: Validate strategies directly from the command line
- **API Endpoints**: Validate and fix strategies via the API

## Command-line Usage

```bash
# Validate a specific strategy
node local_modules/scripts/validateStrategy.js test1

# Validate all strategies
node local_modules/scripts/validateStrategy.js --all
```

## API Endpoints

- `GET /strategies` - List all strategies with validation status
- `GET /strategies/validate/all` - Validate all strategies and return detailed results
- `GET /strategies/:id/validate` - Validate a specific strategy
- `POST /strategies/:id/fix` - Attempt to fix validation issues in a strategy

## Common Validation Issues

- Missing required fields (id, name, description, etc.)
- Invalid indicator or model configuration
- Missing or invalid risk parameters
- Array fields that should not be empty
- Type mismatches (string vs number, etc.)

## Best Practices

1. Always validate strategies before using them in trading
2. Use the fix endpoint to automatically fix common issues
3. Ensure strategy IDs match their filenames
4. Keep timestamps updated (created_at, last_updated)
5. Run validation before deploying changes to production

## Examples

### Example: Valid Strategy Structure

```json
{
	"id": "example_strategy",
	"name": "Example Strategy",
	"description": "A simple example strategy",
	"symbol": "BTC/USDT",
	"timeframe": "1h",
	"enabled": true,
	"tags": ["example", "basic"],
	"indicators": [
		{
			"id": "rsi_14",
			"name": "RSI",
			"type": "momentum",
			"source": "close",
			"parameters": { "period": 14 },
			"output_fields": ["rsi"],
			"enabled": true
		}
	],
	"models": [
		{
			"id": "simple_model",
			"type": "strategy",
			"subtype": "linear",
			"input_fields": ["rsi"],
			"output_field": "forecast",
			"parameters": {},
			"enabled": true
		}
	],
	"signals": [
		{
			"id": "entry_signal",
			"type": "entry",
			"side": "long",
			"expression": "forecast > 0.5"
		}
	],
	"risk": {
		"position_size_type": "percentage",
		"risk_per_trade": 1.0,
		"stop_loss_percent": 5.0,
		"take_profit_percent": 10.0,
		"trailing_stop": false,
		"max_drawdown_percent": 20.0
	}
}
```
