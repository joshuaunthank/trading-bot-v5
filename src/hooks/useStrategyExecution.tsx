import { useState, useEffect, useCallback } from "react";

interface Strategy {
	id: string;
	name: string;
	description: string;
	symbol: string;
	timeframe: string;
	status: "stopped" | "running" | "paused" | "error";
	indicators: Record<string, number>;
	signals: Array<{
		type: "entry" | "exit";
		side: "long" | "short";
		price: number;
		timestamp: number;
		confidence: number;
	}>;
	performance: {
		currentPrice: number;
		unrealizedPnL: number;
		position: "long" | "short" | "none";
	};
}

interface StrategyExecutionState {
	strategies: Strategy[];
	selectedStrategy: Strategy | null;
	loading: boolean;
	error: string | null;
	isRefreshing: boolean;
}

const useStrategyExecution = () => {
	const [state, setState] = useState<StrategyExecutionState>({
		strategies: [],
		selectedStrategy: null,
		loading: true,
		error: null,
		isRefreshing: false,
	});

	// Load all available strategies
	const loadStrategies = useCallback(async () => {
		try {
			setState((prev) => ({ ...prev, loading: true, error: null }));

			const response = await fetch("/api/v1/strategies-execution");
			if (!response.ok) {
				throw new Error(`Failed to load strategies: ${response.statusText}`);
			}

			const data = await response.json();

			if (data.success && data.strategies) {
				setState((prev) => ({
					...prev,
					strategies: data.strategies,
					loading: false,
				}));
			} else {
				throw new Error(data.error || "Failed to load strategies");
			}
		} catch (error) {
			console.error("Error loading strategies:", error);
			setState((prev) => ({
				...prev,
				error: error instanceof Error ? error.message : "Unknown error",
				loading: false,
			}));
		}
	}, []);

	// Select and load specific strategy data
	const selectStrategy = useCallback(async (strategyId: string | null) => {
		if (!strategyId) {
			setState((prev) => ({ ...prev, selectedStrategy: null }));
			return;
		}

		try {
			setState((prev) => ({ ...prev, isRefreshing: true, error: null }));

			const response = await fetch(
				`/api/v1/strategies-execution/${strategyId}`
			);
			if (!response.ok) {
				throw new Error(`Failed to load strategy: ${response.statusText}`);
			}

			const data = await response.json();

			if (data.success && data.strategy) {
				setState((prev) => ({
					...prev,
					selectedStrategy: data.strategy,
					isRefreshing: false,
				}));
			} else {
				throw new Error(data.error || "Failed to load strategy data");
			}
		} catch (error) {
			console.error("Error loading strategy:", error);
			setState((prev) => ({
				...prev,
				error: error instanceof Error ? error.message : "Unknown error",
				isRefreshing: false,
				selectedStrategy: null,
			}));
		}
	}, []);

	// Control strategy execution (start/stop/pause)
	const controlStrategy = useCallback(
		async (strategyId: string, action: "start" | "stop" | "pause") => {
			try {
				setState((prev) => ({ ...prev, error: null }));

				const response = await fetch(
					`/api/v1/strategies-execution/${strategyId}/control`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({ action }),
					}
				);

				if (!response.ok) {
					throw new Error(
						`Failed to ${action} strategy: ${response.statusText}`
					);
				}

				const data = await response.json();

				if (data.success) {
					// Refresh the selected strategy data to get updated status
					if (state.selectedStrategy?.id === strategyId) {
						await selectStrategy(strategyId);
					}
					// Also refresh the strategies list to update status
					await loadStrategies();
				} else {
					throw new Error(data.error || `Failed to ${action} strategy`);
				}
			} catch (error) {
				console.error(`Error controlling strategy (${action}):`, error);
				setState((prev) => ({
					...prev,
					error: error instanceof Error ? error.message : "Unknown error",
				}));
			}
		},
		[state.selectedStrategy?.id, selectStrategy, loadStrategies]
	);

	// Refresh selected strategy data (for live updates)
	const refreshSelectedStrategy = useCallback(async () => {
		if (state.selectedStrategy?.id) {
			await selectStrategy(state.selectedStrategy.id);
		}
	}, [state.selectedStrategy?.id, selectStrategy]);

	// Auto-refresh strategy data every 30 seconds (less aggressive than before)
	useEffect(() => {
		if (state.selectedStrategy?.id) {
			const interval = setInterval(refreshSelectedStrategy, 30000);
			return () => clearInterval(interval);
		}
	}, [state.selectedStrategy?.id, refreshSelectedStrategy]);

	// Load strategies on mount
	useEffect(() => {
		loadStrategies();
	}, [loadStrategies]);

	return {
		// State
		strategies: state.strategies,
		selectedStrategy: state.selectedStrategy,
		loading: state.loading,
		error: state.error,
		isRefreshing: state.isRefreshing,

		// Actions
		loadStrategies,
		selectStrategy,
		controlStrategy,
		refreshSelectedStrategy,

		// Computed values
		hasStrategies: state.strategies.length > 0,
		hasSelectedStrategy: state.selectedStrategy !== null,
		selectedStrategyId: state.selectedStrategy?.id || null,

		// Strategy-specific data for OHLCV connections
		currentSymbol: state.selectedStrategy?.symbol || "BTC/USDT",
		currentTimeframe: state.selectedStrategy?.timeframe || "1h",
	};
};

export default useStrategyExecution;
