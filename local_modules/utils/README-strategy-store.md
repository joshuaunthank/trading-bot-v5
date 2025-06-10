# JSON-Based Strategy Storage

This document describes the implementation of the JSON-based strategy storage system in the trading bot.

## Overview

The JSON-based strategy storage system provides a simple but robust mechanism for storing, retrieving, and managing trading strategies as JSON files. This implementation serves as a fallback storage method that can later be migrated to a database if needed.

## Features

- **CRUD Operations**: Create, read, update, and delete operations for strategy files
- **Validation**: All strategies are validated against a JSON schema before storage
- **Auto-fixing**: Optional automatic fixing of common validation issues
- **Atomic Writes**: Uses temporary files and atomic rename operations when possible
- **Backup Support**: Creates backups of strategies before deletion
- **Configurable**: All features can be enabled/disabled via configuration

## File Structure

Strategy files are stored in the `local_modules/strategies/` directory with the following format:

```
/local_modules/strategies/
  ├── test1.json
  ├── arima_macd_lag.json
  ├── ...
  └── backup/
      ├── test1_1622824543000.json
      └── ...
```

## Configuration

The strategy store can be configured using the following environment variables:

```
STRATEGY_STORE_ENABLED=true           # Enable/disable the entire strategy store
STRATEGY_STORE_BACKUP_ENABLED=true    # Enable/disable backup creation before deletion
STRATEGY_STORE_BACKUP_DIR=backup      # Directory name for backups (relative to strategies dir)
```

## API

The strategy store provides the following API for working with strategy files:

### `initializeStrategyStore()`

Initializes the strategy store by creating necessary directories.

### `listStrategies()`

Returns a list of all strategy IDs in the store.

### `getStrategy(id: string)`

Retrieves a strategy by its ID.

### `createStrategy(strategy: object)`

Creates a new strategy in the store.

### `updateStrategy(id: string, strategy: object)`

Updates an existing strategy.

### `deleteStrategy(id: string)`

Deletes a strategy (with backup if enabled).

### `importStrategyFromFile(filePath: string)`

Imports a strategy from an external JSON file.

### `exportStrategyToFile(id: string, outputPath: string)`

Exports a strategy to an external JSON file.

## Strategy Format

Each strategy JSON file must conform to the schema defined in `strategy.schema.json`. The basic structure is:

```json
{
  "id": "my_strategy",
  "name": "My Strategy",
  "description": "A simple trading strategy",
  "symbol": "BTC/USDT",
  "timeframe": "1h",
  "enabled": true,
  "tags": ["tag1", "tag2"],
  "indicators": [...],
  "models": [...],
  "signals": [...],
  "risk": {...},
  "created_at": "2025-06-09T00:00:00.000Z",
  "last_updated": "2025-06-09T12:00:00.000Z"
}
```

## Utilities

Several utility scripts are provided for working with strategy files:

- `convertStrategies.ts`: Converts strategies from the old format to the new file store
- `validateStrategyFiles.ts`: Validates all strategy files and generates a report
- `strategyValidator.ts`: Utilities for validating strategies against the schema
- `strategyFixer.ts`: Utilities for fixing common validation issues

## Migration

The strategy store implementation ensures backward compatibility with the existing codebase by:

1. Attempting to use the new file store first
2. Falling back to the old methods if the file store is disabled or encounters an error
3. Providing utilities for converting strategies from the old format to the new one

## Future Improvements

1. Add support for versioning and history tracking
2. Implement more sophisticated conflict resolution
3. Add support for strategy templates
4. Provide utilities for strategy performance analysis and comparison
5. Add support for strategy sharing and importing from external sources
6. Migrate to a proper database backend while maintaining the same API

## Error Handling

The strategy store implements comprehensive error handling with:

- Detailed error messages
- Logging of all operations
- Backup creation before destructive operations
- Atomic write operations when possible
- Fallback mechanisms when operations fail
