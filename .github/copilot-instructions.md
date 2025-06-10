<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Copilot Instructions: Trading Bot Project (May 2025)

## Project Overview

This project is a modular, extensible, full-stack TypeScript trading bot for Binance margin trading, built on the CCXT framework. It features a modern, maintainable frontend and a robust backend, with a focus on:

- Modular strategies and models (ARIMA, MACD, EMA, error correction, etc.)
- Real-time and historical OHLCV data integration
- WebSocket-based live price streaming
- REST API for finalized historical candles
- User-friendly, configurable UI (Chart.js, table, config modal, summary)
- Secure handling of API keys via `.env`

## Current State (May 2025)

- **Frontend**
  - Fully modularized React/TSX UI: chart, table, config modal, summary, and helpers
  - Chart.js (with chartjs-chart-financial) for advanced charting (line, candlestick, OHLC)
  - Table rendering and incremental update logic in `TableView.tsx`
  - WebSocket logic centralized in `useOhlcvWebSocket.tsx` React hook
  - Hybrid data model: REST for historical candles, WebSocket for live (open) candle
  - Robust error handling, modern CSS, and responsive design
  - All config and state managed in React context or top-level App state
- **Backend**
  - Express server with CORS, modular route structure
  - `/api/v1/ohlcv` returns only finalized (closed) candles, using Binance server time for accuracy
  - `/ws/ohlcv` WebSocket streams live (open) candle updates
  - Strategy runner endpoint for modular strategies
  - All sensitive config in `.env`
- **Code Quality**

  - TypeScript throughout, with strong types for OHLCV, strategies, and WebSocket messages
  - DRY, maintainable, and extensible codebase

## Current Implementation Challenges (June 2025)

- **Strategy File Format**: Standardize JSON strategy files and ensure they follow the schema
- **WebSocket Connectivity**: Improve reconnection logic and error handling
- **Builder UI Completion**: Finish implementing all step components and validation
- **Strategy Visualization**: Implement chart overlays and table views for strategy results
- **File-based Storage**: Improve file operations with error handling and atomic writes

## Immediate Development Priorities

1. **Fix Strategy Files**: Ensure all JSON files in `local_modules/strategies/` are valid
2. **Complete WebSocket Integration**: Ensure data flows properly from backend to frontend
3. **Finish Builder UI**: Complete all step components in the strategy builder
4. **Add Visualization**: Implement chart overlays for strategy indicators/forecasts
5. **Improve Error Handling**: Add robust error handling throughout the application

## Technical Debt to Address

- TypeScript errors in various files need to be fixed
- TailwindCSS configuration needs to be updated
- Strategy file validation needs to be implemented
- WebSocket reconnection logic needs improvement
- Error handling for file operations is minimal

## Future Plans

- **Frontend**
  - Build a full configuration module/UI for creating, editing, starting, pausing, and stopping strategies (and other controls as needed)
  - Make all strategy parameters and bot settings fully configurable from the UI
  - Support dynamic strategy creation and management (no more hardcoded strategy files)
  - Improve error/status reporting and user feedback throughout the UI
  - Add advanced chart overlays, indicators, and real-time strategy result overlays
  - Add user authentication and secure credential management
  - Enhance modularity and separation of concerns for all UI components
- **Backend**
  - Refactor to support JSON file-based strategies and configurations (use `.json` files in `strategies/` as our primary store)
  - Implement a robust file schema for strategies, configs, runs, trades, signals, and results
  - Update API endpoints for full CRUD on strategies/configs using file IO, and ensure data continuity for all bot operations
  - Ensure JSON files-based strategies and configurations can be later converted to a database schema if needed
  - Add endpoints for starting, pausing, resuming, and stopping strategies dynamically
  - Improve and modularize data streaming (WebSocket/REST) for reliability and scalability
  - Add support for additional exchanges via CCXT
  - Add persistent storage for trades, signals, and strategy results
  - Add backtesting and simulation endpoints
  - Improve WebSocket scalability, reconnection, and error handling
  - **Implement actual trading functions (order placement, management, etc.) using CCXT.**
    - Reference and adapt from [CCXT official examples](https://github.com/ccxt/ccxt/tree/master/examples/js) for best practices and robust error handling.
- **DevOps/Testing**
  - Add automated tests for strategies, endpoints, and UI
  - Add CI/CD pipeline for deployment, linting, and database migrations
  - Add monitoring/logging for bot health and data integrity
- **General/Architecture**
  - Heavy refactoring to support modular, extensible, and database-driven architecture
  - Ensure all new features follow the established modular/component pattern
  - Prioritize maintainability, extensibility, and DRY codebase
  - Address and resolve current issues with data fetching, API, and WebSocket reliability

---

## **Single Source of Truth & Strategy Refactor Checklist (May 2025)**

**Goal:** Eliminate all direct OHLCV/data fetches from strategies and ensure all data flows through the backend (REST for historical, WebSocket for live). Strategies should only process data passed to them, not fetch it themselves.

### Checklist:

- [x] Remove all direct OHLCV/data fetches from strategy files (no more fetches in strategies)
- [x] Refactor backend to provide all OHLCV data (historical and live) via REST/WebSocket only
- [x] Ensure frontend always uses backend as the single source of truth (no direct exchange fetches)
- [x] Refactor strategies to accept data as input (not fetch it themselves)
- [x] Standardize strategy interface for config and data input
- [ ] Implement JSON file-based strategy store as a fallback (read/write `.json` in `strategies/`)
- [ ] Update tests and documentation to reflect new JSON-based data flow

**Benefits:**

- Eliminates data duplication and race conditions
- Enables overlays, live updates, and advanced features
- Prepares for modular, user-configurable strategies via JSON files

---

**Keep this checklist up to date as you progress!**
