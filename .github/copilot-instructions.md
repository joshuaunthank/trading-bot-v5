<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Copilot Instructions: Trading Bot Project (August 2025)

## 🚨 Current Project Status: Real-Time Market Dashboard (Not Yet Trading Bot)

This is a **sophisticated real-time market data visualization dashboard** with excellent trading bot infrastructure, but **lacks core trading bot functionality**.

### ✅ What Actually Works (Foundation Complete)

- **Professional D3.js Charts**: TradingView-style interface with multi-panel layout
- **Real-time Data Streaming**: CCXT Pro WebSocket with 1000+ candles + live updates
- **Modern React/TypeScript UI**: Clean, responsive component architecture
- **Strategy Management Interface**: CRUD operations, visual strategy builder (UI only)
- **RESTful API Structure**: Clean `/api/v1/` endpoints with proper organization
- **File-based Storage**: JSON strategies/indicators ready for database migration

### ❌ What's Missing (Critical Development Needed)

- **Strategy Execution Engine**: Cannot run trading strategies (0% complete)
- **Trading Integration**: No order placement or position management (0% complete)
- **Indicator Calculations**: Static display only, no real-time calculations (0% complete)
- **Signal Generation**: No buy/sell logic implemented (0% complete)
- **Performance Tracking**: No P&L or trade history (0% complete)

**Bottom Line**: This displays live market data beautifully but cannot trade.

## 🎯 Development Priorities (In Order)

### 1. Strategy Execution Engine (Critical)

- Implement real-time indicator calculations using `technicalindicators` library
- Add signal generation logic based on strategy JSON configuration
- Build event-driven strategy processing with WebSocket integration

### 2. Trading Integration (Critical)

- Connect CCXT trading functions for actual order placement
- Implement position management and portfolio tracking
- Add real-time trade execution based on strategy signals

### 3. Performance System (Important)

- Build trade logging and P&L calculation system
- Add real-time performance metrics and visualization
- Implement strategy backtesting capabilities

## 📝 Code Style Guidelines

### Backend Development

- Use TypeScript throughout with strict type checking
- Follow existing modular API structure in `local_modules/routes/apiRoutes/`
- Integrate with existing WebSocket architecture in `websocket-main.ts`
- Use file-based JSON storage (database-ready structure)
- Follow existing strategy engine framework in `strategy-engine.ts`

### Frontend Development

- Maintain existing React/TypeScript component structure
- Use existing hooks pattern (`useWebSocket`, `useStrategies`)
- Follow TradingViewChart.tsx patterns for new chart features
- Maintain WebSocket-only data architecture (no REST/WebSocket hybrid)
- Use existing context providers for state management

### Strategy Implementation

- Build on existing JSON strategy format in `local_modules/db/strategies/`
- Use `technicalindicators` library for calculations
- Integrate with existing indicator system in `strategyIndicators.ts`
- Follow event-driven pattern with WebSocket integration

## 🏗️ Architecture Overview

### Current Working Components

```
Frontend (80% Complete)
├── TradingViewChart.tsx - Professional D3.js charts ✅
├── StrategyControls.tsx - Strategy management UI ✅
├── useWebSocket.tsx - OHLCV data streaming ✅
└── Context providers - Global state management ✅

Backend (30% Complete)
├── websocket-main.ts - CCXT Pro WebSocket server ✅
├── routes/apiRoutes/ - RESTful API structure ✅
├── db/ - JSON storage system ✅
└── strategy-engine.ts - Framework only (needs implementation) ❌
```

### Missing Core Components

```
Trading Engine (0% Complete)
├── Strategy execution logic ❌
├── Real-time indicator calculations ❌
├── Signal generation ❌
├── Order placement ❌
└── Performance tracking ❌
```

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, D3.js, TailwindCSS
- **Backend**: Express, CCXT Pro, WebSocket (ws), technicalindicators
- **Data**: File-based JSON (database-ready structure)
- **Real-time**: WebSocket-only architecture

## 📊 Available Endpoints

### REST API (`/api/v1/`)

- Strategy CRUD: `GET|POST|PUT|DELETE /strategies` ✅
- Strategy Control: `POST /strategies/:id/start|stop|pause|resume` (framework only) ⚠️
- Indicators: `GET /indicators`, `POST /indicators/calculate` (limited) ⚠️

### WebSocket (`/ws/ohlcv`)

- **URL**: `ws://localhost:3001/ws/ohlcv?symbol=BTC/USDT&timeframe=1h&strategy=strategy_id`
- **Data**: Real-time OHLCV, strategy control messages ✅
- **Features**: 1000 candles + live updates ✅

## 🚀 Quick Development Setup

```bash
npm install
cp .env.example .env  # Add Binance API keys
npm run dev          # Starts frontend (5173) + backend (3001)
```

Open `http://localhost:5173` - live BTC/USDT charts work immediately.

## 💡 Implementation Notes

- **Focus on backend trading engine** - frontend is production-ready
- **Use existing WebSocket infrastructure** - don't rebuild data streaming
- **Build on strategy-engine.ts framework** - structure exists, needs logic
- **Leverage technicalindicators library** - already included in dependencies
- **Follow existing patterns** - consistent architecture throughout

**Priority: Implement strategy execution engine to transform this from a dashboard into a trading bot.**

### **Previous Milestone: Complete API Modernization** 🚀

**Successfully modernized entire backend architecture with exceptional results:**

- ✅ **Modular API structure** - Clean `/api/v1/` endpoints with domain separation
- ✅ **File-based data management** - Strategies and indicators in JSON files
- ✅ **RESTful design** - Proper HTTP verbs and resource-based URLs
- ✅ **Database-ready architecture** - File structure mirrors future DB schema
- ✅ **WebSocket-only OHLCV data** - 1000 candles + real-time updates
- ✅ **Production tested and confirmed working** - live tested June 25, 2025

### **Frontend** ✅

- Fully modularized React/TSX UI: chart, table, config modal, summary, and helpers
- Chart.js (with chartjs-chart-financial + date adapters) for advanced charting
- **Live Chart Updates** - Real-time candlestick updates with WebSocket data
- **WebSocket-only data flow** - eliminated REST/WebSocket hybrid complexity
- WebSocket logic centralized in `useOhlcvWebSocket.tsx` React hook
- **Fixed connection status display** - now shows "Connected" properly
- **Fixed Tailwind CSS loading** - proper spinner sizes and styling
- **Accurate 24h Price Changes** - Calculations now match exchange values
- Robust error handling, modern CSS, and responsive design
- All config and state managed in React context or top-level App state
- **Professional UI** - optimized performance and clean code

### **Backend** ⚠️

- **WebSocket Data Streaming** ✅ - `/ws/ohlcv` streams 1000 candles + live updates
- **API Route Structure** ✅ - Clean separation with domain-specific routes
- **File-based Storage** ✅ - JSON storage in `local_modules/db/`
- **RESTful Design** ✅ - `/api/v1/strategies`, `/api/v1/indicators`, etc.
- **Fixed Data Ordering** ✅ - Consistent chronological sorting
- **Strategy execution endpoints** ❌ - Route structure exists but no implementation
- **Performance analytics** ❌ - Placeholder responses only
- **Trading operations** ❌ - All endpoints commented out/empty
- **Indicator calculations** ❌ - File reading only, no real calculations
- All sensitive config in `.env`
- **Stable WebSocket implementation** ✅ using CCXT Pro

### **Code Quality** ✅

- TypeScript throughout, with strong types - **ALL COMPILATION ERRORS FIXED**
- DRY, maintainable, and extensible codebase - **MAJOR CLEANUP COMPLETED**
- **Single source of truth architecture** - eliminated data inconsistency
- Proper error handling and user feedback

## Current Implementation Status (June 26, 2025)

- ✅ **Real-time Data Dashboard**: Live charts and data visualization **COMPLETED**
- ✅ **WebSocket Infrastructure**: CCXT Pro streaming with 1000 candles **COMPLETED**
- ✅ **Modern Frontend**: React/TypeScript component architecture **COMPLETED**
- ✅ **API Route Structure**: RESTful endpoints with domain separation **COMPLETED**
- ✅ **File-based Data Management**: JSON strategies and indicators **COMPLETED**
- ✅ **Data Normalization**: Fixed ordering for accurate calculations **COMPLETED**
- ❌ **API Implementation**: Most endpoints return placeholder responses **NOT IMPLEMENTED**
- ❌ **Strategy Execution Engine**: No real indicator calculations or signals **NOT IMPLEMENTED**
- ❌ **Trading Integration**: No CCXT trading functions connected **NOT IMPLEMENTED**

## Next Development Priorities (Post Documentation Cleanup)

1. **Strategy Execution Engine** 🎯

   - Complete API endpoint logic for strategy management
   - Implement real indicator calculations (RSI, MACD, EMA)
   - Build signal generation based on strategy logic
   - Add live strategy data streaming to frontend

2. **Trading Implementation** �

   - Connect API endpoints to actual CCXT trading functions
   - Add order placement and position monitoring
   - Implement risk management and stop-loss features

3. **Performance Analytics** 💰

   - Build backtesting system with historical data
   - Add strategy performance tracking
   - Create portfolio analytics and reporting

## Technical Debt to Address

- TailwindCSS configuration needs to be updated
- Strategy file validation needs to be implemented
- Error handling for file operations is minimal
- **API Implementation** - Complete endpoint logic for all route modules (most return placeholders)
- **Strategy Execution** - No real indicator calculations or signal generation
- **Trading Integration** - No actual CCXT trading functions connected

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
- **REST API**: Modular `/api/v1/` endpoints with domain separation ✅
- **Strategy Management**: File-based JSON storage in `local_modules/db/` ✅
- **Chart Display**: Real-time candle charts working ✅
- **Table Display**: Live data table updates working ✅
- **Data Architecture**: WebSocket-only model with modular API ✅

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
  - ✅ **COMPLETED**: Modular API architecture with domain separation (`/api/v1/strategies`, `/api/v1/indicators`, etc.)
  - ✅ **COMPLETED**: File-based data management using JSON files in `local_modules/db/`
  - ✅ **COMPLETED**: RESTful endpoint design with proper HTTP verbs and resource naming
  - ✅ **COMPLETED**: Database-ready file structure that mirrors intended database schema
  - 🔄 **IN PROGRESS**: Complete implementation of all API endpoint logic
  - 🔄 **PLANNED**: Connect API endpoints to actual CCXT trading functions
  - Add comprehensive input validation and error handling for all endpoints
  - Add persistent storage for trades, signals, and strategy execution results
  - Add backtesting and simulation endpoints with historical data
  - Improve WebSocket scalability and add advanced reconnection logic
  - Add support for additional exchanges via CCXT framework
  - Add monitoring/logging for API health and data integrity
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
- [x] ✅ **COMPLETED**: Implement JSON file-based strategy store in `local_modules/db/strategies/`
- [x] ✅ **COMPLETED**: Update API to use modular, database-style structure
- [x] ✅ **COMPLETED**: Implement comprehensive API reference documentation

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
