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
  - Modularized UI: chart, table, config modal, summary, and UI helpers
  - Chart.js (with chartjs-chart-financial) for advanced charting (line, candlestick, OHLC)
  - Table rendering and incremental update logic centralized in `src/components/table.ts`
  - WebSocket logic centralized in `src/components/websocket.ts` (connect/disconnect, listeners, debounce, status)
  - Hybrid data model: REST for historical candles, WebSocket for live (open) candle
  - Robust error handling, modern CSS, and responsive design
- **Backend**
  - Express server with CORS, modular route structure
  - `/api/v1/ohlcv` returns only finalized (closed) candles, using Binance server time for accuracy
  - `/ws/ohlcv` WebSocket streams live (open) candle updates
  - Strategy runner endpoint for modular strategies
  - All sensitive config in `.env`
- **Code Quality**
  - TypeScript throughout, with strong types for OHLCV, strategies, and WebSocket messages
  - DRY, maintainable, and extensible codebase

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
  - Refactor to support database-backed strategies and configurations (move away from file-based strategies)
  - Implement a robust database schema for strategies, configs, runs, trades, signals, and results
  - Update API endpoints for full CRUD on strategies/configs, and ensure data continuity for all bot operations
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
