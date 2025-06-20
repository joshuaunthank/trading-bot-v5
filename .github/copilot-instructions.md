<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Copilot Instructions: Trading Bot Project (June 2025)

## Project Overview

This project is a modular, extensible, full-stack TypeScript trading bot for Binance margin trading, built on the CCXT framework. It features a modern, maintainable frontend and a robust backend, with a focus on:

- Modular strategies and models (ARIMA, MACD, EMA, error correction, etc.)
- Real-time OHLCV data integration via WebSocket-only architecture
- WebSocket-based live price streaming using CCXT Pro (1000 candles + real-time updates)
- User-friendly, configurable UI (Chart.js, table, config modal, summary)
- Secure handling of API keys via `.env`

## 📝 **Documentation Guidelines**

⚠️ **IMPORTANT FOR DEVELOPERS**:

- **All new `.md` files MUST be created within the `/docs` directory structure**
- **Do NOT create `.md` files in the project root** (except README.md)
- Use appropriate subdirectories:
  - `/docs/milestones/` - Major achievements and project status updates
  - `/docs/features/` - Feature implementations and enhancements
  - `/docs/fixes/` - Bug fixes and cleanup documentation
- This keeps the project root clean and maintains professional organization

## 🎉 **Current State (June 18, 2025) - PRODUCTION READY** ✅

### **Major Milestone: WebSocket-Only Architecture Complete** 🚀

**Successfully implemented single source of truth for OHLCV data with exceptional results:**

- ✅ **1000 candles on initial load** (vs previous 100)
- ✅ **Real-time incremental updates** with sub-second precision
- ✅ **Stable CCXT Pro WebSocket** with robust connection management
- ✅ **No REST API fallback complexity** - clean, unified data flow
- ✅ **Production tested and confirmed working** - live tested June 18, 2025

### **Frontend** ✅

- Fully modularized React/TSX UI: chart, table, config modal, summary, and helpers
- Chart.js (with chartjs-chart-financial + date adapters) for advanced charting
- **WebSocket-only data flow** - eliminated REST/WebSocket hybrid complexity
- WebSocket logic centralized in `useOhlcvWebSocket.tsx` React hook
- **Fixed connection status display** - now shows "Connected" properly
- **Fixed Tailwind CSS loading** - proper spinner sizes and styling
- Robust error handling, modern CSS, and responsive design
- All config and state managed in React context or top-level App state
- **Production-ready UI** - all debug artifacts removed

### **Backend** ✅

- Express server with CORS, modular route structure
- **WebSocket-only OHLCV data** - `/ws/ohlcv` streams 1000 candles + live updates
- **Removed REST OHLCV endpoint** - eliminated `/api/v1/ohlcv` redundancy
- Strategy runner endpoint for modular strategies
- All sensitive config in `.env`
- **Stable WebSocket implementation** using CCXT Pro

### **Code Quality** ✅

- TypeScript throughout, with strong types - **ALL COMPILATION ERRORS FIXED**
- DRY, maintainable, and extensible codebase - **MAJOR CLEANUP COMPLETED**
- **Single source of truth architecture** - eliminated data inconsistency
- Proper error handling and user feedback

## Current Implementation Status (June 18, 2025)

- ✅ **WebSocket-Only Architecture**: Single source of truth for OHLCV data **COMPLETED**
- ✅ **Strategy File Format**: Standardize JSON strategy files and ensure they follow the schema **COMPLETED**
- ✅ **WebSocket Connectivity**: Improve reconnection logic and error handling **COMPLETED**
- ✅ **Connection Status Display**: Fixed status mapping and UI indicators **COMPLETED**
- ✅ **Tailwind CSS Integration**: Fixed spinner sizes and styling **COMPLETED**
- 🔄 **Builder UI Completion**: Finish implementing all step components and validation
- 🔄 **Strategy Visualization**: Implement chart overlays and table views for strategy results
- 🔄 **File-based Storage**: Improve file operations with error handling and atomic writes

## Next Development Priorities (Post WebSocket-Only Implementation)

1. **Strategy Execution Engine** 🎯

   - Real indicator calculations (RSI, MACD, EMA)
   - Signal generation based on strategy logic
   - Live strategy data streaming to frontend

2. **Trading Implementation** 💰

   - Order placement through CCXT
   - Position monitoring and management
   - Basic risk management (stop-loss, take-profit)

3. **Strategy Builder UI Completion** 🛠️
   - Complete all step components in the strategy builder
   - Add visualization and chart overlays for strategy indicators/forecasts
   - Improve error handling throughout the application

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

## 🎯 **TRADING BOT SYSTEM DEVELOPMENT PLAN** (June 13, 2025)

### **Current Stable Foundation** ✅

Infrastructure is complete and operational:

- **WebSocket Infrastructure**: CCXT Pro providing stable live data streams
- **REST API**: Historical OHLCV data endpoints functional
- **Frontend**: React dashboard with real-time charts and tables
- **TypeScript**: All compilation errors resolved
- **Strategy System**: JSON-based strategy storage with validation

### **System Architecture Overview**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend UI   │◄──►│  Express Server  │◄──►│ CCXT/Binance   │
│                 │    │                  │    │                 │
│ • Dashboard     │    │ • REST API       │    │ • Live Data     │
│ • Charts        │    │ • WebSocket      │    │ • Trading       │
│ • Strategy UI   │    │ • Strategy Store │    │ • Orders        │
│ • Trading Panel │    │ • Auth System    │    │ • Positions     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### **Phase 1: Core Trading Features** 🚀

_Build upon stable foundation to add essential trading capabilities_

1. **Strategy Execution Engine**

   - Real strategy indicator calculations (RSI, MACD, EMA)
   - Signal generation based on strategy logic
   - Live strategy data streaming to frontend

2. **Trading Implementation**

   - Order placement through CCXT
   - Position monitoring and management
   - Basic risk management (stop-loss, take-profit)

3. **Strategy Builder UI Completion**
   - Finish step components with proper validation
   - Visual strategy editor improvements
   - Strategy testing and preview

### **Phase 2: Advanced Analytics** 📊

_Add sophisticated analysis and visualization_

1. **Chart Overlays & Visualization**

   - Strategy indicators overlaid on price charts
   - Entry/exit signals visualization
   - Real-time performance metrics

2. **Backtesting System**

   - Historical strategy performance testing
   - Risk/return analytics
   - Strategy comparison tools

3. **Performance Dashboard**
   - Portfolio tracking
   - P&L visualization
   - Risk metrics and alerts

### **Phase 3: Production Features** 🏭

_Scale and deploy for real trading_

1. **Multi-Strategy Management**

   - Concurrent strategy execution
   - Portfolio allocation
   - Strategy versioning

2. **User Management & Security**

   - Secure API key handling
   - User authentication system
   - Role-based permissions

3. **Production Deployment**
   - Database integration
   - Monitoring and alerting
   - CI/CD pipeline

### **Key Development Principles**

#### **1. Single Source of Truth - WebSocket Only** ✅ **IMPLEMENTED**

- Backend handles ALL data fetching via WebSocket (1000 candles + live updates)
- Strategies receive data as input, never fetch directly
- Frontend uses only WebSocket for OHLCV data - no REST fallback
- Eliminated data consistency issues and chart reloading problems

#### **2. Modular Architecture**

- Each component has clear responsibilities
- Strategies are JSON-configurable
- UI components are reusable and composable

#### **3. Progressive Enhancement**

- Build features incrementally on stable WebSocket foundation
- Maintain backward compatibility
- Test each phase thoroughly before moving forward

### **Current Focus Areas (Post WebSocket-Only Implementation)**

With the stable WebSocket-only foundation, immediate priorities are:

1. **Strategy Execution Engine** 🎯

   - Real indicator calculations and signal generation
   - Live strategy results streaming to frontend
   - Chart overlays for strategy data

2. **Trading Implementation** 💰

   - Connect to real trading functions via CCXT
   - Add position monitoring and order management
   - Implement risk management features

3. **Advanced Analytics** 📊
   - Backtesting with historical data
   - Performance metrics and visualization
   - Multi-strategy management

**This plan builds upon the stable foundation while avoiding complexity that caused previous issues. Each phase delivers working features before moving to the next level.**
