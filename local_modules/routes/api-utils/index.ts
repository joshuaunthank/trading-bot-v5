/**
 * API Utilities Index
 *
 * Central export point for all API utility modules.
 * This provides a clean interface for importing API handlers in route files.
 */

// Strategy execution utilities
export {
	startStrategy,
	stopStrategy,
	pauseStrategy,
	resumeStrategy,
	getAllStrategyStatus,
	getStrategyStatus,
	getAllStrategies,
	getStrategyById,
	createStrategy,
	cloneStrategy,
	updateStrategy,
	deleteStrategy,
	StrategyExecutionResponse,
} from "./strategy-execution";

// Indicator management utilities
export {
	getAllIndicators,
	getIndicatorTypes,
	getIndicatorById,
	createIndicator,
	updateIndicator,
	deleteIndicator,
	IndicatorResponse,
} from "./indicator-management";

// Performance tracking utilities
export {
	getStrategyPerformance,
	getAllPerformanceMetrics,
	PerformanceResponse,
} from "./performance-tracking";

// Future API utilities can be added here:
// export * from "./trading-operations";
// export * from "./risk-management";
// export * from "./backtesting";
