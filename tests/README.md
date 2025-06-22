# Tests Directory

This directory contains all testing and debugging utilities for the trading bot project.

## Structure

- `/debug/` - Debug scripts for troubleshooting specific issues
- `/manual/` - Manual test scripts for specific components
- `/` (root) - Automated test files for core functionality

## Debug Scripts

### `debug/debug-indicator-alignment.ts`

Tests indicator alignment with OHLCV data to ensure all indicators end at the latest candle timestamp.

**Usage:**

```bash
npx ts-node tests/debug/debug-indicator-alignment.ts
```

## Manual Test Scripts

### `manual/test-indicator-library.mjs`

Tests the technicalindicators library integration with mock data.

**Usage:**

```bash
node tests/manual/test-indicator-library.mjs
```

### `manual/test-simple-indicators.js`

Simple test of basic indicator calculations.

**Usage:**

```bash
node tests/manual/test-simple-indicators.js
```

## Automated Tests

The root level contains TypeScript test files that can be run with Jest or similar testing frameworks:

- `test-enhanced-strategy.ts` - Strategy execution tests
- `test-signal-generation.ts` - Signal generation tests
- `test-strategy-manager.ts` - Strategy management tests

## Running Tests

To run all tests:

```bash
npm test
```

To run specific debug scripts:

```bash
npm run test:debug
```

To run manual tests:

```bash
npm run test:manual
```
