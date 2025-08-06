# Architecture Overview

## System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend UI   │◄──►│  Express Server  │◄──►│ CCXT/Binance   │
│                 │    │                  │    │                 │
│ • D3.js Charts  │    │ • REST API       │    │ • Live Data     │
│ • React/TS UI   │    │ • WebSocket      │    │ • Trading       │
│ • Strategy Mgmt │    │ • Strategy Store │    │ • Orders        │
│ • Data Tables   │    │ • File Storage   │    │ • Positions     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Frontend Architecture (React/TypeScript)

### Component Structure

```
src/
├── components/
│   ├── TradingViewChart.tsx     # D3.js professional charts
│   ├── StrategyControls.tsx     # Strategy management UI
│   ├── DataTable.tsx           # Live OHLCV data display
│   ├── ConnectionStatus.tsx     # WebSocket status indicator
│   └── tabs/
│       ├── ChartTab.tsx        # Chart view container
│       └── TestingTab.tsx      # Strategy testing interface
├── hooks/
│   ├── useWebSocket.tsx        # OHLCV data streaming
│   ├── useStrategies.tsx       # Strategy CRUD operations
│   └── useDashboard.ts         # Main dashboard state
├── context/
│   ├── StrategyContext.tsx     # Global strategy state
│   └── WebSocketContext.tsx    # WebSocket data management
└── services/
    └── strategyService.ts      # API communication
```

### Data Flow (Frontend)

```
WebSocket → useWebSocket → Context → Components → D3.js Charts
     ↓
REST API → Services → Context → Components → UI Updates
```

## Backend Architecture (Express/TypeScript)

### Module Structure

```
local_modules/
├── routes/
│   ├── routes-api.ts           # API router setup
│   └── apiRoutes/
│       ├── routes-strategy.ts   # Strategy endpoints
│       ├── routes-indicators.ts # Indicator endpoints
│       ├── routes-trading.ts    # Trading endpoints (empty)
│       └── routes-performance.ts # Performance endpoints (stub)
├── utils/
│   ├── websocket-main.ts       # CCXT Pro WebSocket server
│   ├── strategy-engine.ts      # Strategy execution framework
│   ├── strategyIndicators.ts   # Indicator calculations
│   └── config.ts              # Configuration management
├── db/
│   ├── strategies/             # JSON strategy files
│   └── indicators/             # JSON indicator definitions
└── types/
    └── index.ts               # TypeScript definitions
```

### API Layer Architecture

```
Express Router
├── /api/v1/strategies          # Strategy CRUD & control
├── /api/v1/indicators          # Indicator metadata & calculations
├── /api/v1/performance         # Performance metrics (stub)
└── /ws/ohlcv                  # WebSocket OHLCV + strategy data
```

## Data Architecture

### WebSocket-Only Data Model

```
CCXT Pro → WebSocket Server → Frontend Components
    ↓
No REST API for OHLCV data (WebSocket-only for real-time)
```

### Storage Architecture

```
File-Based Storage (Database-Ready)
├── strategies/
│   ├── strategy1.json          # Strategy configuration
│   ├── strategy2.json          # Strategy configuration
│   └── ...
├── indicators/
│   ├── indicator1.json         # Indicator metadata
│   ├── indicator2.json         # Indicator metadata
│   └── ...
└── (Future: trades/, performance/, users/)
```

## Real-Time Data Flow

### OHLCV Data Streaming

```
Binance Exchange
    ↓ (CCXT Pro)
WebSocket Server (/ws/ohlcv)
    ↓ (WebSocket)
Frontend useWebSocket Hook
    ↓ (React Context)
TradingViewChart Component
    ↓ (D3.js)
Live Chart Rendering
```

### Strategy Data Integration

```
Strategy Configuration (JSON)
    ↓
Strategy Engine (framework)
    ↓ (WebSocket)
Frontend Strategy Controls
    ↓ (UI Updates)
Chart Overlays & Indicators
```

## Technology Stack

### Frontend Stack

- **React 19**: Component framework
- **TypeScript**: Type safety
- **D3.js**: Professional chart rendering
- **TailwindCSS**: Utility-first styling
- **Vite**: Build tool and dev server

### Backend Stack

- **Express**: Web server framework
- **CCXT Pro**: Exchange integration
- **WebSocket (ws)**: Real-time communication
- **TypeScript**: Backend type safety
- **Technical Indicators**: Calculation library

### Development Stack

- **Node.js 18+**: Runtime environment
- **npm**: Package management
- **ESLint/Prettier**: Code formatting
- **Concurrently**: Development server coordination

## Current Implementation Status

### ✅ Fully Implemented

1. **WebSocket Infrastructure**

   - CCXT Pro integration with Binance
   - Real-time OHLCV data streaming (1000+ candles)
   - Client connection management
   - Error handling and reconnection

2. **Frontend Dashboard**

   - Professional D3.js charts with TradingView styling
   - Multi-panel layout (price, volume, oscillators)
   - Real-time chart updates
   - Strategy management UI
   - Responsive design

3. **API Structure**
   - RESTful endpoint organization
   - Strategy CRUD operations
   - File-based storage system
   - TypeScript type definitions

### ⚠️ Partially Implemented

1. **Strategy Engine**

   - Framework exists in `strategy-engine.ts`
   - API endpoints structured but no execution logic
   - WebSocket integration prepared but not active

2. **Indicator System**
   - Basic calculation capability
   - Metadata management
   - Chart overlay framework ready

### ❌ Not Implemented

1. **Trading Engine**

   - No order placement logic
   - No position management
   - No risk management implementation

2. **Performance Tracking**
   - No trade logging
   - No P&L calculations
   - No performance metrics

## Security Architecture

### Current Security Measures

- Environment variable management (`.env`)
- CORS configuration
- Input validation (basic)
- File system access controls

### Missing Security Features

- User authentication
- API rate limiting
- Secure credential storage
- Audit logging

## Scalability Considerations

### Current Limitations

- File-based storage (not scalable)
- Single-process architecture
- No caching layer
- No load balancing

### Future Scaling Path

1. **Database Migration**: PostgreSQL for structured data
2. **Microservices**: Separate strategy and trading engines
3. **Caching**: Redis for performance optimization
4. **Container Deployment**: Docker for consistent environments

## Integration Points

### External Services

- **Binance API**: Market data and trading
- **CCXT**: Exchange abstraction layer
- **Technical Indicators Library**: Mathematical calculations

### Internal Services

- **WebSocket Server**: Real-time data distribution
- **Strategy Engine**: Business logic processing
- **File Storage**: Configuration and data persistence

## Development Workflow

### Current Development Setup

```bash
npm run dev  # Starts both frontend and backend
├── Frontend: http://localhost:5173 (Vite)
└── Backend: http://localhost:3001 (Express)
```

### File Organization Philosophy

- **Modular backend**: Separate concerns by domain
- **Component-based frontend**: Reusable UI components
- **Type-safe**: TypeScript throughout
- **Configuration-driven**: JSON-based strategy definitions

## Next Architecture Steps

1. **Strategy Execution Engine**: Implement core trading logic
2. **Trading Engine Integration**: Add CCXT trading functions
3. **Performance System**: Build comprehensive tracking
4. **Database Migration**: Move from files to PostgreSQL
5. **Microservice Separation**: Split into focused services
