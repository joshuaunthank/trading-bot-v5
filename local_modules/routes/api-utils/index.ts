/**
 * API Utilities Index
 *
 * Central export point for all API utility modules.
 * This provides a clean interface for importing API handlers in route files.
 */

// Strategy execution utilities - WebSocket-Only Architecture
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
} from "./strategy-execution-websocket";

// Legacy indicator management utilities (REST API) removed for WebSocket-only architecture
// If needed for admin/config UI, import directly from './indicator-management'

// Performance tracking utilities - WebSocket-Only Architecture
export {
	getStrategyPerformance,
	getAllPerformanceMetrics,
	getPortfolioPerformance,
	getRiskMetrics,
	PerformanceResponse,
} from "./performance-tracking-websocket";

// Future API utilities can be added here:
// export * from "./trading-operations";
// export * from "./risk-management";
// export * from "./backtesting";
