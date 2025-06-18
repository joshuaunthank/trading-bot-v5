# Strategy Validation Improvements - June 2025

## Overview

This update enhances the trading bot with comprehensive strategy validation capabilities to ensure strategy files meet the required format and contain all necessary data before being used for trading.

## Key Improvements

### 1. Robust Validation

- **JSON Schema Validation**: All strategies are validated against a JSON schema
- **Required Field Checking**: Ensures all required fields are present
- **Type Validation**: Verifies that all fields have the correct data types
- **Error Formatting**: Provides detailed, user-friendly error messages

### 2. Auto-fixing Capabilities

- **Common Issue Detection**: Identifies and fixes common strategy file issues
- **Missing Field Population**: Automatically adds missing required fields with sensible defaults
- **Format Correction**: Fixes array/object format issues
- **Config-driven**: Enable/disable auto-fixing via environment variables

### 3. Improved File Operations

- **Atomic Writes**: Uses temp files and atomic rename operations to prevent data corruption
- **Better Error Handling**: Detailed error messages for file operations
- **Validation Before Save**: Ensures only valid strategies are saved

### 4. New API Endpoints

- `GET /strategies/validate/all` - Validate all strategies
- `GET /strategies/:id/validate` - Validate a specific strategy
- `POST /strategies/:id/fix` - Attempt to fix validation issues

### 5. Command-line Tools

- Script to validate strategies from the command line
- Options to validate individual strategies or all strategies
- Detailed error reporting

## Configuration Options

Added to `.env.example`:

```
# Validation settings
VALIDATION_ENABLED=true  # Set to false to bypass validation (development only)
STRATEGY_AUTO_FIX=false  # Set to true to enable automatic fixing of common issues
```

## Usage Examples

### API

```javascript
// Get validation status of all strategies
fetch("/strategies/validate/all")
	.then((response) => response.json())
	.then((data) => console.log(data));

// Validate a specific strategy
fetch("/strategies/test1/validate")
	.then((response) => response.json())
	.then((data) => console.log(data));

// Attempt to fix a strategy
fetch("/strategies/test1/fix", { method: "POST" })
	.then((response) => response.json())
	.then((data) => console.log(data));
```

### Command Line

```bash
# Validate a specific strategy
node local_modules/scripts/validateStrategy.js test1

# Validate all strategies
node local_modules/scripts/validateStrategy.js --all
```

## Documentation

See [Validation Documentation](local_modules/utils/README-validation.md) for detailed usage information and examples.
