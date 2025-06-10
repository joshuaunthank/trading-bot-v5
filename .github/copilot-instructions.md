<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Copilot Instructions: Trading Bot Project (June 2025)

## Project Overview

This project is a modular, extensible, full-stack TypeScript trading bot for Binance margin trading, built on the CCXT framework. It features a modern, maintainable frontend and a robust backend, with a focus on:

- Modular strategies and models (ARIMA, MACD, EMA, error correction, etc.)
- Real-time and historical OHLCV data integration
- WebSocket-based live price streaming using CCXT Pro
- REST API for finalized historical candles
- User-friendly, configurable UI (Chart.js, table, config modal, summary)
- Secure handling of API keys via `.env`

## ✅ **Current State (June 10, 2025) - STABLE & OPERATIONAL**

### **Frontend** ✅

- Fully modularized React/TSX UI: chart, table, config modal, summary, and helpers
- Chart.js (with chartjs-chart-financial + date adapters) for advanced charting
- Table rendering with real-time updates - **NaN display issues FIXED**
- WebSocket logic centralized in `useOhlcvWebSocket.tsx` React hook - **CONNECTION ISSUES FIXED**
- Hybrid data model: REST for historical candles, WebSocket for live updates - **FULLY FUNCTIONAL**
- Robust error handling, modern CSS, and responsive design
- All config and state managed in React context or top-level App state
- **Production-ready UI** - all debug artifacts removed

### **Backend** ✅

- Express server with CORS, modular route structure - **TYPESCRIPT ERRORS FIXED**
- `/api/v1/ohlcv` returns finalized candles with proper data formatting
- `/ws/ohlcv` WebSocket streams live updates using **CCXT Pro** - **RSV1 ERRORS FIXED**
- Strategy runner endpoint for modular strategies
- All sensitive config in `.env`
- **Stable WebSocket implementation** - no more connection loops

### **Code Quality** ✅

- TypeScript throughout, with strong types - **ALL COMPILATION ERRORS FIXED**
- DRY, maintainable, and extensible codebase - **MAJOR CLEANUP COMPLETED**
- **12+ redundant files removed**, consolidated implementations
- Proper error handling and user feedback

## Current Implementation Challenges (June 2025)

- ~~**Strategy File Format**: Standardize JSON strategy files and ensure they follow the schema~~ ✅ **COMPLETED**
- ~~**WebSocket Connectivity**: Improve reconnection logic and error handling~~ ✅ **COMPLETED**
- **Builder UI Completion**: Finish implementing all step components and validation
- **Strategy Visualization**: Implement chart overlays and table views for strategy results
- **File-based Storage**: Improve file operations with error handling and atomic writes

## Immediate Development Priorities

1. ~~**Fix Strategy Files**: Ensure all JSON files in `local_modules/strategies/` are valid~~ ✅ **COMPLETED**
2. ~~**Complete WebSocket Integration**: Ensure data flows properly from backend to frontend~~ ✅ **COMPLETED**
3. **Finish Builder UI**: Complete all step components in the strategy builder
4. **Add Visualization**: Implement chart overlays for strategy indicators/forecasts
5. **Improve Error Handling**: Add robust error handling throughout the application

## Technical Debt to Address

- ~~TypeScript errors in various files need to be fixed~~ ✅ **COMPLETED**
- TailwindCSS configuration needs to be updated
- Strategy file validation needs to be implemented
- ~~WebSocket reconnection logic needs improvement~~ ✅ **COMPLETED**
- Error handling for file operations is minimal

## Current Status (June 10, 2025) ✅

### ✅ **MAJOR FIXES COMPLETED**

- **Fixed TypeScript Compilation Errors** - All TypeScript errors resolved
- **Resolved RSV1 WebSocket Frame Errors** - Replaced with CCXT Pro implementation
- **Fixed WebSocket Connection Loops** - Stable connection with proper cleanup
- **Major Cleanup** - Removed 12+ redundant files, consolidated implementations
- **Fixed Browser Console Errors** - Resolved URL and type safety issues
- **Frontend Production Ready** - Clean, professional interface
- **Fixed Chart.js Date Adapter** - Charts render properly with date formatting
- **Fixed Table Display Issues** - No more NaN values, proper data formatting
- **End-to-End Data Flow** - REST + WebSocket integration working seamlessly

### 🚀 **SYSTEM STATUS**

- **Backend**: Express server running on port 3001 ✅
- **Frontend**: Vite dev server running on port 5173 ✅
- **WebSocket**: CCXT Pro streaming live OHLCV data ✅
- **REST API**: Historical data endpoint functional ✅
- **Chart Display**: Real-time candle charts working ✅
- **Table Display**: Live data table updates working ✅
- **Data Format**: Hybrid REST/WebSocket model implemented ✅

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

## **Single Source of Truth & Strategy Refactor Checklist (June 2025)**

**Goal:** Eliminate all direct OHLCV/data fetches from strategies and ensure all data flows through the backend (REST for historical, WebSocket for live). Strategies should only process data passed to them, not fetch it themselves.

### Checklist:

- [x] Remove all direct OHLCV/data fetches from strategy files (no more fetches in strategies)
- [x] Refactor backend to provide all OHLCV data (historical and live) via REST/WebSocket only
- [x] Ensure frontend always uses backend as the single source of truth (no direct exchange fetches)
- [x] Refactor strategies to accept data as input (not fetch it themselves)
- [x] Standardize strategy interface for config and data input
- [x] ✅ **COMPLETED**: Implement stable WebSocket connectivity using CCXT Pro
- [x] ✅ **COMPLETED**: Fix all TypeScript compilation errors
- [x] ✅ **COMPLETED**: Resolve frontend data display issues (NaN values, chart errors)
- [ ] Implement JSON file-based strategy store as a fallback (read/write `.json` in `strategies/`)
- [ ] Update tests and documentation to reflect new JSON-based data flow

**Benefits:**

- ✅ Eliminates data duplication and race conditions
- ✅ Enables overlays, live updates, and advanced features
- ✅ Prepares for modular, user-configurable strategies via JSON files
- ✅ **NEW**: Stable, production-ready WebSocket implementation
- ✅ **NEW**: Clean, maintainable TypeScript codebase

---

## **Next Development Phase: Feature Development**

**Status**: Infrastructure is now stable. Ready to focus on advanced features!

### Phase 1: Core Strategy Features

1. **Complete Strategy Builder UI** - Finish all step components and validation
2. **Chart Overlays** - Add strategy indicators and forecast visualization
3. **Trading Functions** - Implement actual order placement using CCXT

### Phase 2: Advanced Trading Features

1. **Backtesting System** - Historical strategy performance testing
2. **Risk Management** - Position sizing, stop-loss automation
3. **Multi-Exchange Support** - Expand beyond Binance using CCXT

### Phase 3: Production & Scale

1. **Database Integration** - Move from JSON files to proper database
2. **User Authentication** - Secure credential management
3. **Deployment Pipeline** - Production deployment with monitoring

**Keep this updated as development progresses!**
