# Strategy File Storage Improvements - June 2025

## Overview

This update introduces a robust JSON file-based strategy storage system that serves as a fallback storage mechanism for trading strategies. It provides a clean API for storing, retrieving, and managing strategy files with improved error handling and data integrity features.

## Key Improvements

### 1. JSON-Based Strategy Store

- **CRUD Operations**: Full create, read, update, delete functionality for strategies
- **Validation Integration**: All strategies are validated before storage
- **Error Handling**: Comprehensive error handling with detailed error messages
- **Backup Support**: Automatic backups before destructive operations

### 2. Improved File Operations

- **Atomic Writes**: Uses temporary files and atomic rename operations to prevent data corruption
- **Directory Management**: Automatic creation of necessary directories
- **Backup Management**: Configurable backup creation and storage

### 3. Migration Support

- **Backward Compatibility**: Seamless integration with existing code
- **Strategy Conversion**: Tools for converting strategies to the new format
- **Graceful Fallbacks**: Falls back to old methods if operations fail

### 4. Configuration Options

Added to `.env.example`:

```
# File-based strategy store settings
STRATEGY_STORE_ENABLED=true           # Enable/disable the entire strategy store
STRATEGY_STORE_BACKUP_ENABLED=true    # Enable/disable backup creation before deletion
STRATEGY_STORE_BACKUP_DIR=backup      # Directory name for backups
```

## Usage Examples

### API Usage

```typescript
import * as strategyFileStore from "./utils/strategyFileStore";

// List all strategies
const strategyIds = await strategyFileStore.listStrategies();

// Get a specific strategy
const strategy = await strategyFileStore.getStrategy("test1");

// Create a new strategy
await strategyFileStore.createStrategy({
	id: "my_strategy",
	name: "My Strategy",
	// ... other required fields
});

// Update a strategy
await strategyFileStore.updateStrategy("my_strategy", updatedStrategy);

// Delete a strategy
await strategyFileStore.deleteStrategy("my_strategy");

// Import/export
const strategy = await strategyFileStore.importStrategyFromFile(
	"/path/to/strategy.json"
);
await strategyFileStore.exportStrategyToFile(
	"my_strategy",
	"/path/to/export.json"
);
```

### Command Line

```bash
# Convert existing strategies to the new format
node local_modules/scripts/convertStrategies.js

# Validate all strategy files and generate a report
node local_modules/scripts/validateStrategyFiles.js

# Validate and auto-fix all strategy files
node local_modules/scripts/validateStrategyFiles.js --fix
```

## Integration with Other Components

The strategy file store integrates with:

1. **Strategy Validator**: All strategies are validated before storage
2. **Strategy Fixer**: Auto-fixing of common validation issues
3. **Strategy API Routes**: Used by API endpoints for strategy management
4. **Strategy WebSocket**: Provides data for WebSocket streaming

## Documentation

See [Strategy Store Documentation](local_modules/utils/README-strategy-store.md) for detailed usage information and examples.
