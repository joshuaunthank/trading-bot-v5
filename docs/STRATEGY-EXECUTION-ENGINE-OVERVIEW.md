# Strategy Execution Engine - Architecture Overview

## 🎯 **Core Concept**

The strategy execution engine will be a **real-time, event-driven system** that:

1. **Processes live market data** from WebSocket streams
2. **Calculates technical indicators** in real-time
3. **Evaluates trading signals** based on strategy rules
4. **Manages strategy state** and performance tracking
5. **Streams results** to the frontend for visualization

## 🏗️ **Architecture Components**

### **1. Strategy Engine Core**

```typescript
// Main execution engine
class StrategyExecutionEngine {
	private activeStrategies: Map<string, StrategyInstance>;
	private dataStream: WebSocketDataStream;
	private signalBus: EventEmitter;

	// Core methods
	startStrategy(strategyId: string): Promise<void>;
	stopStrategy(strategyId: string): Promise<void>;
	pauseStrategy(strategyId: string): Promise<void>;
	processMarketData(candle: OHLCVCandle): void;
}
```

### **2. Strategy Instance**

```typescript
// Individual strategy execution
class StrategyInstance {
	private config: StrategyConfig;
	private indicators: Map<string, IndicatorCalculator>;
	private signalEvaluator: SignalEvaluator;
	private state: StrategyState;
	private dataBuffer: CircularBuffer<OHLCVCandle>;

	// Core methods
	processCandle(candle: OHLCVCandle): void;
	updateIndicators(candle: OHLCVCandle): void;
	evaluateSignals(): Signal[];
	getPerformanceMetrics(): PerformanceMetrics;
}
```

### **3. Indicator Calculators**

```typescript
// Real-time indicator calculation
class IndicatorCalculator {
	private calculator: Function; // from technicalindicators library
	private params: IndicatorParams;
	private history: number[];
	private currentValue: number;

	// Core methods
	calculate(newData: number): number;
	getHistory(periods: number): number[];
	getCurrentValue(): number;
}
```

### **4. Signal Evaluator**

```typescript
// Signal generation logic
class SignalEvaluator {
	private signalRules: SignalRule[];
	private indicatorValues: Map<string, number>;

	// Core methods
	evaluateRules(): Signal[];
	checkCondition(condition: SignalCondition): boolean;
	calculateConfidence(signal: Signal): number;
}
```

## 🔄 **Data Flow Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WebSocket     │───▶│  Strategy       │───▶│  Frontend       │
│   Market Data   │    │  Engine         │    │  Charts         │
│   (OHLCV)       │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Individual    │
                    │   Strategy      │
                    │   Instances     │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Indicator     │
                    │   Calculations  │
                    │   (RSI, EMA,    │
                    │   MACD, etc.)   │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Signal        │
                    │   Evaluation    │
                    │   (Buy/Sell     │
                    │   Logic)        │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Performance   │
                    │   Tracking &    │
                    │   WebSocket     │
                    │   Broadcast     │
                    └─────────────────┘
```

## 📊 **Strategy Configuration Structure**

Based on the existing strategy files, here's how strategies are configured:

```json
{
	"id": "enhanced_rsi_ema_strategy",
	"name": "Enhanced RSI + EMA Strategy",
	"description": "Advanced strategy combining RSI with EMA trend confirmation",

	"indicators": [
		{
			"RSI": {
				"description": "Relative Strength Index",
				"params": [
					{ "name": "period", "default": 14, "type": "number" },
					{ "name": "price", "default": "close", "type": "string" }
				]
			}
		},
		{
			"EMA": {
				"description": "Exponential Moving Average",
				"params": [{ "name": "period", "default": 20, "type": "number" }]
			}
		}
	],

	"signals": [
		{
			"id": "rsi_oversold_long",
			"name": "RSI Oversold Long Entry",
			"type": "entry",
			"side": "long",
			"confidence": 0.7,
			"logic": "AND",
			"conditions": [
				{
					"indicator": "rsi_14",
					"operator": "lt",
					"value": 30
				},
				{
					"indicator": "ema_20",
					"operator": "gt",
					"value": "ema_50"
				}
			]
		}
	]
}
```

## 🚀 **Implementation Strategy**

### **Phase 1: Core Engine (Week 2)**

#### **Day 1-2: Strategy Instance Management**

```typescript
// /local_modules/utils/strategy-engine/StrategyInstance.ts
export class StrategyInstance {
	constructor(config: StrategyConfig) {
		this.config = config;
		this.indicators = new Map();
		this.signalEvaluator = new SignalEvaluator(config.signals);
		this.state = { status: "stopped", startTime: null };
		this.dataBuffer = new CircularBuffer(1000);
	}

	start(): void {
		this.state.status = "running";
		this.state.startTime = Date.now();
		console.log(`Strategy ${this.config.id} started`);
	}

	processCandle(candle: OHLCVCandle): void {
		// Add to buffer
		this.dataBuffer.add(candle);

		// Update all indicators
		this.updateIndicators(candle);

		// Evaluate signals
		const signals = this.evaluateSignals();

		// Emit signals if any
		if (signals.length > 0) {
			this.emitSignals(signals);
		}
	}
}
```

#### **Day 3: Real Indicator Calculations**

```typescript
// /local_modules/utils/strategy-engine/IndicatorCalculator.ts
export class IndicatorCalculator {
	constructor(type: string, params: IndicatorParams) {
		this.calculator = getIndicatorFunction(type); // from technicalindicators
		this.params = params;
		this.history = [];
		this.currentValue = 0;
	}

	calculate(price: number): number {
		this.history.push(price);

		// Keep only required history
		if (this.history.length > this.params.period * 2) {
			this.history = this.history.slice(-this.params.period * 2);
		}

		// Calculate indicator value
		const result = this.calculator.calculate({
			period: this.params.period,
			values: this.history,
		});

		this.currentValue = result[result.length - 1] || 0;
		return this.currentValue;
	}
}
```

### **Phase 2: Signal Generation (Week 2)**

#### **Day 4-5: Signal Evaluation Engine**

```typescript
// /local_modules/utils/strategy-engine/SignalEvaluator.ts
export class SignalEvaluator {
	constructor(signalRules: SignalRule[]) {
		this.signalRules = signalRules;
		this.indicatorValues = new Map();
	}

	evaluateRules(): Signal[] {
		const signals: Signal[] = [];

		for (const rule of this.signalRules) {
			if (this.checkRule(rule)) {
				const signal: Signal = {
					id: rule.id,
					type: rule.type,
					side: rule.side,
					confidence: rule.confidence,
					timestamp: Date.now(),
					price: this.getCurrentPrice(),
					indicators: Object.fromEntries(this.indicatorValues),
				};
				signals.push(signal);
			}
		}

		return signals;
	}

	private checkRule(rule: SignalRule): boolean {
		// Check all conditions with AND/OR logic
		return rule.conditions.every((condition) => this.checkCondition(condition));
	}

	private checkCondition(condition: SignalCondition): boolean {
		const indicatorValue = this.indicatorValues.get(condition.indicator);
		const targetValue =
			typeof condition.value === "string"
				? this.indicatorValues.get(condition.value)
				: condition.value;

		switch (condition.operator) {
			case "gt":
				return indicatorValue > targetValue;
			case "lt":
				return indicatorValue < targetValue;
			case "gte":
				return indicatorValue >= targetValue;
			case "lte":
				return indicatorValue <= targetValue;
			case "eq":
				return indicatorValue === targetValue;
			default:
				return false;
		}
	}
}
```

### **Phase 3: API Integration (Week 3)**

#### **Day 6-7: API Endpoints**

```typescript
// /local_modules/routes/apiRoutes/routes-strategy.ts
export const startStrategy = async (req: Request, res: Response) => {
	const { id } = req.params;

	try {
		const success = await strategyEngine.startStrategy(id);

		if (success) {
			res.json({
				success: true,
				strategy_id: id,
				status: "running",
				message: `Strategy ${id} started successfully`,
			});
		} else {
			res.status(400).json({
				success: false,
				error: "Failed to start strategy",
			});
		}
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};
```

#### **Day 8-10: WebSocket Integration**

```typescript
// /local_modules/utils/websocket-main.ts
// Add strategy results to existing WebSocket stream
export function broadcastStrategyUpdate(strategyId: string, data: any) {
	const message = JSON.stringify({
		type: "strategy-update",
		strategyId,
		data,
		timestamp: Date.now(),
	});

	// Broadcast to all connected clients
	wss.clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(message);
		}
	});
}
```

## 🔧 **Key Technical Decisions**

### **1. Event-Driven Architecture**

- **WebSocket data triggers strategy processing**
- **Signal generation emits events to frontend**
- **Loose coupling between components**

### **2. Real-Time Calculations**

- **Streaming indicator calculations** (not batch)
- **Efficient circular buffers** for data history
- **Incremental updates** to minimize CPU usage

### **3. Strategy Isolation**

- **Each strategy runs independently**
- **Separate state management** per strategy
- **Resource isolation** and error handling

### **4. Configuration-Driven**

- **JSON strategy definitions** (no code changes)
- **Dynamic indicator loading** based on strategy
- **Flexible signal rule system**

## 📈 **Performance Considerations**

### **Memory Management**

- **Circular buffers** limit memory usage
- **Indicator history** kept to minimum required
- **Garbage collection** of old data

### **CPU Optimization**

- **Only calculate needed indicators** per strategy
- **Batch calculations** where possible
- **Efficient data structures** for lookups

### **WebSocket Efficiency**

- **Throttled updates** to prevent spam
- **Compressed data** for network efficiency
- **Selective broadcasting** based on client needs

## 🎯 **Success Metrics**

### **Week 2 Goals**

- [ ] Strategy instances can be started/stopped
- [ ] Real indicator calculations working (RSI, EMA, MACD)
- [ ] Basic signal generation from existing strategy files
- [ ] Strategy status tracking and persistence

### **Week 3 Goals**

- [ ] Full signal evaluation engine working
- [ ] WebSocket streaming of strategy results
- [ ] Frontend displays live strategy signals
- [ ] Performance metrics collection

## 🎉 **Expected Outcome**

By Week 3, you'll have:

- **Fully functional strategy execution engine**
- **Real-time indicator calculations**
- **Live signal generation** displayed on charts
- **Foundation for trading integration** (Phase 3)

The engine will process live market data, calculate indicators in real-time, generate trading signals, and stream all results to the frontend dashboard for visualization.

---

**Next Step**: Begin implementation with StrategyInstance class and basic indicator calculations
