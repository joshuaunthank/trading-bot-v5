# Multi-Strategy Engine Architecture

## Overview

This document outlines the design and implementation plan for a concurrent, independent multi-strategy execution engine. This represents a major architectural enhancement that will enable running multiple trading strategies simultaneously while maintaining complete isolation between them.

## Current State vs. Target State

### **Current Architecture** ✅

- Single WebSocket OHLCV data feed (1000 candles + real-time updates)
- JSON-based strategy storage and validation
- Frontend dashboard with real-time charts and tables
- Strategy execution API endpoints (basic implementation)

### **Target Architecture** 🎯

- **Multi-Strategy Manager**: Orchestrates multiple independent strategy instances
- **Strategy Instance Isolation**: Each strategy maintains its own state, indicators, and performance
- **Concurrent Execution**: Strategies run simultaneously without interference
- **Shared Data Distribution**: Single WebSocket feed serves all strategies efficiently
- **Independent Signal Generation**: Each strategy produces its own trading signals

## Architecture Design

### **Core Components**

#### 1. Strategy Manager Service

```typescript
class StrategyManager {
	private strategies: Map<string, StrategyInstance>;
	private dataDistributor: DataDistributor;
	private performanceTracker: PerformanceTracker;

	// Strategy lifecycle management
	startStrategy(config: StrategyConfig): string;
	stopStrategy(strategyId: string): void;
	pauseStrategy(strategyId: string): void;
	restartStrategy(strategyId: string): void;

	// Real-time data distribution
	onNewCandle(candle: OHLCVCandle): void;
	broadcastToStrategies(data: MarketData): void;
}
```

#### 2. Strategy Instance (Isolated Execution)

```typescript
class StrategyInstance {
	private id: string;
	private config: StrategyConfig;
	private state: StrategyState;
	private indicators: IndicatorManager;
	private dataBuffer: CircularBuffer<OHLCVCandle>;
	private performanceMetrics: StrategyMetrics;

	// Independent processing
	processCandle(candle: OHLCVCandle): Signal | null;
	updateIndicators(candle: OHLCVCandle): void;
	evaluateSignals(): Signal | null;

	// State management
	getMetrics(): StrategyMetrics;
	updateConfig(params: Partial<StrategyConfig>): void;
	reset(): void;
}
```

#### 3. Data Distribution System

```typescript
class DataDistributor {
	private subscriptions: Map<string, SubscriptionFilter>;

	// Efficient data routing
	distributeCandle(candle: OHLCVCandle): void;
	subscribeStrategy(strategyId: string, filter: SubscriptionFilter): void;
	unsubscribeStrategy(strategyId: string): void;

	// Symbol/timeframe filtering
	filterForStrategy(candle: OHLCVCandle, filter: SubscriptionFilter): boolean;
}
```

### **Data Flow Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    WebSocket OHLCV Feed                     │
│                  (Single Source of Truth)                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 Strategy Manager                            │
│  • Data Distribution  • Lifecycle Management               │
│  • Performance Tracking  • Resource Allocation             │
└─────┬───────────────┬───────────────┬─────────────────────┘
      │               │               │
┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
│Strategy A │  │Strategy B │  │Strategy C │
│BTC/USDT   │  │ETH/USDT   │  │BTC/USDT   │
│15m MACD   │  │5m RSI     │  │1h EMA     │
│           │  │           │  │           │
│State:     │  │State:     │  │State:     │
│• Own P&L  │  │• Own P&L  │  │• Own P&L  │
│• Own Risk │  │• Own Risk │  │• Own Risk │
│• Own Pos  │  │• Own Pos  │  │• Own Pos  │
└─────┬─────┘  └─────┬─────┘  └─────┬─────┘
      │               │               │
┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
│ Signal A  │  │ Signal B  │  │ Signal C  │
│BUY @67000 │  │SELL @3500 │  │HOLD       │
└───────────┘  └───────────┘  └───────────┘
      │               │               │
      └───────────────┼───────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Order Management System                      │
│          (Handles concurrent signals independently)         │
└─────────────────────────────────────────────────────────────┘
```

## Updated Implementation Plan

### **Phase 1: Strategy Manager Foundation** 🏗️

**Target: 3-4 days**

#### Backend Tasks:

- [ ] Create `StrategyManager` class with basic lifecycle methods
- [ ] Implement strategy instance registry and management
- [ ] Build data distribution system with symbol/timeframe filtering
- [ ] Add concurrent strategy execution support
- [ ] Create strategy isolation boundaries
- [ ] Extend schema system for ML model support

#### API Endpoints:

- [ ] `POST /api/v1/strategies/start` - Start new strategy instance
- [ ] `DELETE /api/v1/strategies/:id` - Stop strategy instance
- [ ] `PUT /api/v1/strategies/:id/pause` - Pause strategy
- [ ] `GET /api/v1/strategies/active` - List active strategies
- [ ] `GET /api/v1/strategies/:id/metrics` - Get strategy performance
- [ ] `GET /api/v1/strategies/:id/signals` - Get strategy signals with ML outputs

#### Schema Enhancement:

- [ ] Expand `model.schema.json` with ML configurations
- [ ] Add expression parser for complex signal logic
- [ ] Implement validation for ML model parameters

#### Testing:

- [ ] Unit tests for strategy manager
- [ ] Integration tests for concurrent execution
- [ ] Performance tests for data distribution

### **Phase 2: Independent Strategy Instances** ⚙️

**Target: 4-5 days**

#### Core Features:

- [ ] Isolated strategy state management
- [ ] Independent indicator calculations (RSI, MACD, EMA)
- [ ] Per-strategy data buffers and circular arrays
- [ ] Individual signal generation logic
- [ ] Separate performance tracking per strategy

#### Indicator System:

- [ ] Base `Indicator` class with update/calculate methods
- [ ] `RSIIndicator` class with configurable periods
- [ ] `MACDIndicator` class with signal line calculations
- [ ] `EMAIndicator` class with exponential moving averages
- [ ] `IndicatorManager` to coordinate multiple indicators

#### Strategy Logic:

- [ ] Signal evaluation engine with expression parsing
- [ ] Rule-based condition checking for complex logic
- [ ] Confidence scoring for signals (including ML confidence)
- [ ] Risk management integration

#### ML Model Framework:

- [ ] Base classes for traditional and ML models
- [ ] Model output integration with signal generation
- [ ] Framework for future ML model implementations

### **Phase 3: Enhanced Multi-Strategy Frontend** 🎨

**Target: 4-5 days**

#### Core Dashboard Enhancement:

- [ ] **Strategy Selector Dropdown**: Raw price vs strategy-specific views
- [ ] **Chart Mode Switching**: Clean price chart vs strategy overlay mode
- [ ] **Strategy Status Indicators**: Active/paused/stopped with visual cues
- [ ] **Real-time Strategy Cards**: Performance metrics per strategy

#### Strategy-Specific Chart Features:

- [ ] **Indicator Overlays**: RSI, MACD, moving averages on charts
- [ ] **Signal Markers**: Buy/sell arrows with confidence levels
- [ ] **ML Model Outputs**: Prediction lines, confidence bands
- [ ] **Performance Annotations**: Entry/exit points, P&L tracking

#### Advanced UI Components:

- [ ] **Multi-Strategy Grid View**: Side-by-side strategy comparison
- [ ] **Strategy Detail Panel**: Deep dive into individual strategy performance
- [ ] **Model Output Visualization**: Charts for ML predictions and confidence
- [ ] **Real-time Signal Feed**: Live strategy decisions and reasoning

#### Real-time Updates:

- [ ] WebSocket integration for strategy events
- [ ] Live performance metric updates
- [ ] Signal visualization on charts
- [ ] Strategy status indicators

### **Phase 4: Advanced Strategy Builder** 🛠️

**Target: 5-6 days**

#### Visual Strategy Builder:

- [ ] **Multi-Step Wizard**: Meta → Indicators → Models → Signals → Risk → Review
- [ ] **Drag-and-Drop Expression Builder**: Visual logic construction
- [ ] **ML Model Configuration Panel**: Hyperparameters, training settings
- [ ] **Strategy Preview**: Real-time validation and preview

#### Expression Builder Features:

- [ ] **Visual Logic Editor**: Drag-and-drop conditions and operators
- [ ] **Autocomplete**: Model outputs, indicators, and functions
- [ ] **Syntax Highlighting**: Expression validation and error highlighting
- [ ] **Testing Interface**: Test expressions against historical data

#### ML Model Configuration:

- [ ] **Model Type Selection**: LSTM, ARIMA, Linear Regression, etc.
- [ ] **Hyperparameter Tuning**: Visual sliders and input validation
- [ ] **Training Configuration**: Data sources, validation splits, schedules
- [ ] **Performance Metrics**: Model accuracy, confidence tracking

#### Advanced Features:

- [ ] **Strategy Templates**: Pre-built strategy configurations
- [ ] **Strategy Cloning**: Copy and modify existing strategies
- [ ] **Backtesting Integration**: Test strategies before deployment
- [ ] **Strategy Versioning**: Track and rollback strategy changes

**Target: 2-3 days**

#### Dashboard Components:

- [ ] **Strategy Grid**: Visual overview of all active strategies
- [ ] **Independent Controls**: Start/stop/pause per strategy
- [ ] **Performance Cards**: Real-time metrics for each strategy
- [ ] **Multi-Strategy Chart**: Overlays showing all strategy signals

#### Real-time Updates:

- [ ] WebSocket integration for strategy events
- [ ] Live performance metric updates
- [ ] Signal visualization on charts
- [ ] Strategy status indicators

#### User Experience:

- [ ] Strategy creation wizard
- [ ] Parameter configuration forms
- [ ] Performance comparison tools
- [ ] Risk monitoring dashboard

### **Phase 4: Advanced Features** 🚀

**Target: 3-4 days**

#### Portfolio Management:

- [ ] Cross-strategy position sizing
- [ ] Portfolio-level risk limits
- [ ] Strategy correlation analysis
- [ ] Dynamic allocation adjustments

#### Performance Analytics:

- [ ] Strategy backtesting integration
- [ ] Performance attribution analysis
- [ ] Risk-adjusted returns calculation
- [ ] Strategy optimization suggestions

#### Production Features:

- [ ] Strategy versioning and rollback
- [ ] A/B testing framework for strategies
- [ ] Automated strategy health monitoring
- [ ] Alert system for strategy anomalies

## Technical Specifications

### **Strategy Configuration Schema**

```json
{
	"id": "macd_btc_15m",
	"name": "MACD BTC 15m Strategy",
	"symbol": "BTC/USDT",
	"timeframe": "15m",
	"indicators": {
		"macd": {
			"fastPeriod": 12,
			"slowPeriod": 26,
			"signalPeriod": 9
		},
		"rsi": {
			"period": 14,
			"overbought": 70,
			"oversold": 30
		}
	},
	"rules": {
		"entry": {
			"condition": "macd_crossover_bullish AND rsi < 70",
			"confidence": 0.75
		},
		"exit": {
			"condition": "macd_crossover_bearish OR rsi > 80",
			"confidence": 0.8
		}
	},
	"risk": {
		"maxPositionSize": 0.1,
		"stopLoss": 0.02,
		"takeProfit": 0.04
	}
}
```

### **Strategy Metrics Tracking**

```typescript
interface StrategyMetrics {
	id: string;
	name: string;
	status: "running" | "paused" | "stopped";
	performance: {
		totalReturn: number;
		winRate: number;
		sharpeRatio: number;
		maxDrawdown: number;
		totalTrades: number;
	};
	current: {
		position: Position | null;
		unrealizedPnL: number;
		lastSignal: Signal | null;
		lastUpdate: Date;
	};
	risk: {
		currentExposure: number;
		riskScore: number;
		violatedLimits: string[];
	};
}
```

## Benefits of This Architecture

### **🔄 True Independence**

- Strategies cannot interfere with each other's state
- One strategy failure doesn't affect others
- Independent risk management per strategy
- Isolated performance tracking and optimization

### **📈 Scalable Performance**

- Add/remove strategies without system restart
- Dynamic resource allocation based on strategy needs
- Efficient data distribution to minimize overhead
- Parallel processing of strategy calculations

### **🎯 Flexible Portfolio Management**

- Mix conservative and aggressive strategies
- Different timeframes and symbols simultaneously
- Diversified signal generation approaches
- Easy strategy comparison and optimization

### **👥 Enhanced User Experience**

- Visual multi-strategy dashboard
- Independent strategy controls and monitoring
- Real-time performance comparison
- Comprehensive strategy analytics

## Risk Considerations

### **Resource Management**

- **Memory usage**: Each strategy maintains its own data buffers
- **CPU load**: Concurrent indicator calculations
- **Solution**: Implement resource limits and monitoring

### **Data Consistency**

- **Challenge**: Ensuring all strategies receive same market data
- **Solution**: Centralized data distribution with atomic updates

### **Strategy Conflicts**

- **Challenge**: Multiple strategies trading same symbol
- **Solution**: Portfolio-level position management and limits

### **System Complexity**

- **Challenge**: More complex debugging and monitoring
- **Solution**: Comprehensive logging and strategy health monitoring

## Success Metrics

### **Performance Targets**

- [ ] Support 10+ concurrent strategies without performance degradation
- [ ] Sub-100ms latency for strategy signal generation
- [ ] 99.9% uptime for individual strategy instances
- [ ] Zero cross-strategy data contamination

### **User Experience Goals**

- [ ] Intuitive multi-strategy dashboard
- [ ] Easy strategy creation and management
- [ ] Clear performance visualization and comparison
- [ ] Responsive real-time updates

## Next Steps

1. **Review and approve** this architectural design
2. **Begin Phase 1** implementation with strategy manager foundation
3. **Establish testing framework** for concurrent strategy execution
4. **Create development milestones** for each phase
5. **Design frontend mockups** for multi-strategy dashboard

---

_This document will be updated as implementation progresses. Each phase completion will be documented with lessons learned and architectural refinements._

**Created**: June 19, 2025  
**Status**: Planning Phase  
**Next Review**: After Phase 1 completion

# Multi-Strategy Monitoring & User Interface

### **Dashboard Layout Strategy**

#### **Main Dashboard Design**

```
┌─────────────────────────────────────────────────────────────┐
│  Trading Bot Dashboard                                      │
├─────────────────────────────────────────────────────────────┤
│  Strategy Selector: [Dropdown: Raw Price ▼] [+ New Strategy]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                Chart Area                               │ │
│  │  • Raw Price (when no strategy selected)               │ │
│  │  • Strategy overlays (indicators, signals, ML outputs) │ │
│  │  • Entry/exit markers                                  │ │
│  │  • Performance overlays                                │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌──────────────┬──────────────┬──────────────┬────────────┐ │
│  │Strategy Info │ Performance  │   Controls   │   Status   │ │
│  │• P&L: +2.3%  │• Win Rate    │• ▶️ Start    │• 🟢 Active │ │
│  │• Trades: 12  │• Sharpe      │• ⏸️ Pause    │• Signals   │ │
│  │• Position    │• Drawdown    │• ⚙️ Config   │• Health    │ │
│  └──────────────┴──────────────┴──────────────┴────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### **Strategy Selector Dropdown**

```
Dropdown Menu:
├── 📊 Raw Price Chart (BTC/USDT 1h)
├── ─────────────────────────────
├── 🤖 MACD Strategy (BTC/USDT 15m) [🟢 Active]
├── 📈 RSI Mean Reversion (ETH/USDT 5m) [🟡 Paused]
├── 🧠 LSTM Prediction (BTC/USDT 1h) [🔴 Stopped]
├── ⚡ Multi-Indicator (BNB/USDT 30m) [🟢 Active]
└── ─────────────────────────────
    └── ➕ Create New Strategy...
```

#### **Chart Visualization Modes**

**Raw Price Mode** (No strategy selected):

- Clean OHLCV candlestick chart
- Basic volume indicator
- Symbol/timeframe selector
- Zoom and pan controls

**Strategy Mode** (Strategy selected):

- Base OHLCV chart
- **Indicator overlays**: Moving averages, RSI, MACD lines
- **Signal markers**: Buy/sell arrows with confidence levels
- **ML model outputs**: Prediction lines, confidence bands
- **Performance tracking**: Entry/exit points, P&L annotations
- **Real-time updates**: Live strategy decisions

**Performance Mode**:

- Entry/exit markers with trade performance
- P&L tracking on the chart
- Signal strength indicators

**Comparison Mode**:

- Side-by-side strategy performance
- Correlation analysis
- Risk/return profile comparison

#### **Multi-Strategy Grid Dashboard** (Advanced View)

```
┌────────────┬────────────┬────────────┬────────────┐
│Strategy A  │Strategy B  │Strategy C  │Strategy D  │
│MACD+RSI    │LSTM Pred   │Hybrid ML   │Arbitrage   │
│BTC/USDT    │ETH/USDT    │BTC/USDT    │Multi-pair  │
│🟢 +2.3%    │🟡 -0.5%    │🟢 +5.1%    │🔴 -1.2%    │
│12 trades   │3 trades    │8 trades    │45 trades   │
└────────────┴────────────┴────────────┴────────────┘
```

## Advanced Strategy Configuration Architecture

### **ML-Ready Schema System**

#### **Modular Schema Structure**

```typescript
// Master strategy configuration
interface StrategyConfig {
	meta: MetaConfig; // Basic info, tags, versioning
	indicators: IndicatorConfig[]; // Technical indicators + modifiers
	models: ModelConfig[]; // Traditional + ML models
	postprocessing: PostProcessingConfig[]; // Error correction, ensembling
	signals: SignalConfig[]; // Entry/exit logic with expressions
	risk: RiskConfig; // Position sizing, stop-loss, limits
}
```

#### **Schema Files** (Backend-Driven)

```
local_modules/schemas/
├── strategy.schema.json      ← Master schema (combines all others)
├── meta.schema.json          ← Strategy metadata
├── indicator.schema.json     ← Technical indicators + modifiers
├── model.schema.json         ← ML-ready model configurations
├── postprocessing.schema.json ← Error correction layers
├── signal.schema.json        ← Signal generation logic
└── risk.schema.json          ← Risk management rules
```

#### **ML Model Configuration Examples**

```json
{
	"models": [
		{
			"id": "lstm_price_predictor",
			"type": "ml",
			"subtype": "lstm",
			"framework": "tensorflow",
			"config": {
				"sequence_length": 60,
				"hidden_units": 128,
				"dropout": 0.2,
				"epochs": 100,
				"batch_size": 32
			},
			"inputs": ["close", "volume", "rsi_14", "macd_signal"],
			"outputs": ["price_prediction", "confidence"],
			"training": {
				"lookback_days": 365,
				"validation_split": 0.2,
				"retrain_frequency": "weekly"
			}
		},
		{
			"id": "arima_trend",
			"type": "traditional",
			"subtype": "arima",
			"config": {
				"order": [2, 1, 2],
				"seasonal_order": [1, 1, 1, 24]
			}
		}
	]
}
```

#### **Advanced Signal Logic**

```json
{
	"signals": [
		{
			"id": "ml_enhanced_entry",
			"type": "entry",
			"side": "long",
			"expression": "(lstm_price_predictor.confidence > 0.8) AND (macd_crossover_bullish) AND (rsi_14 < 70)",
			"confidence_weight": {
				"lstm_confidence": 0.6,
				"technical_confirmation": 0.4
			}
		}
	]
}
```

### **Strategy Builder UI for Complex Configurations**

#### **Multi-Step Visual Builder**

```
Step 1: Meta Information
├── Name, Description, Tags
├── Symbol/Timeframe selection
└── Strategy type (Technical/ML/Hybrid)

Step 2: Data Sources & Indicators
├── Technical indicators (RSI, MACD, etc.)
├── Feature engineering modifiers
└── Custom data feeds

Step 3: Models & Predictions
├── Traditional models (ARIMA, Linear)
├── ML models (LSTM, MLP, CNN)
└── Model training configuration

Step 4: Signal Generation
├── Entry/exit logic builder
├── Expression editor with autocomplete
└── Confidence scoring setup

Step 5: Risk Management
├── Position sizing rules
├── Stop-loss/take-profit
└── Portfolio limits

Step 6: Review & Deploy
├── Configuration preview
├── Backtesting options
└── Production deployment
```

#### **Visual Expression Builder Component**

```tsx
// Drag-and-drop logic builder
<ExpressionBuilder>
	<Condition>
		<ModelOutput model="lstm_predictor" output="confidence" />
		<Operator type="greater_than" />
		<Value>0.8</Value>
	</Condition>
	<LogicalOperator type="AND" />
	<Condition>
		<Indicator type="macd" modifier="crossover_bullish" />
	</Condition>
</ExpressionBuilder>
```

#### **ML Model Configuration Panel**

```tsx
<ModelConfigPanel>
	<ModelTypeSelector />
	<HyperparameterTuner />
	<DataSourceSelector />
	<TrainingScheduler />
	<PerformanceMetrics />
</ModelConfigPanel>
```

### **Strategy Detail Monitoring View**

```
┌─ LSTM Price Predictor Strategy ─────────────────────┐
│ Status: 🟢 Active | P&L: +5.1% | Confidence: 87%   │
├─────────────────────────────────────────────────────┤
│ Model Outputs:                                      │
│ • Price Prediction: $67,250 (↗️ +2.1%)             │
│ • Confidence Score: 0.87/1.00                      │
│ • Signal Strength: Strong Buy                       │
├─────────────────────────────────────────────────────┤
│ Technical Confirmation:                             │
│ • MACD: Bullish crossover ✅                        │
│ • RSI(14): 45.2 (Neutral) ⚪                       │
│ • Volume: Above average ✅                          |
```
