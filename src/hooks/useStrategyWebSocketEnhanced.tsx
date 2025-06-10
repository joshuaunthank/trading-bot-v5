import { useState, useEffect, useCallback } from "react";
import useWebSocketWithReconnect from "./useWebSocketWithReconnect";
import {
	StrategyIndicatorData,
	StrategySignal,
	StrategyDataState,
} from "../context/Types";

/**
 * Enhanced hook for managing WebSocket connection to a running strategy with auto-reconnect
 */
export function useStrategyWebSocketEnhanced(strategyId: string | null) {
	const [state, setState] = useState<StrategyDataState>({
		strategyId: strategyId || "",
		indicators: [],
		signals: [],
		isConnected: false,
		error: null,
	});

	// Build WebSocket URL - Connect directly to backend to bypass Vite proxy issues
	const wsUrl = strategyId
		? `ws://localhost:3001/ws/strategy?strategy=${strategyId}`
		: null;

	// Handle incoming message
	const handleMessage = useCallback((data: any) => {
		if (!data) return;

		if (data.type === "update" || data.type === "global-update") {
			// Handle real-time updates
			const result = data.data;
			if (!result) return;

			// Extract timestamp for date
			const date = new Date(result.timestamp).toISOString();

			// Extract indicator values (last value from each array)
			const indicatorValues: Record<string, number> = {};
			for (const [key, values] of Object.entries(result.indicators)) {
				if (Array.isArray(values) && values.length > 0) {
					indicatorValues[key] = values[values.length - 1];
				}
			}

			// Add model values too
			for (const [key, values] of Object.entries(result.models)) {
				if (Array.isArray(values) && values.length > 0) {
					indicatorValues[key] = values[values.length - 1];
				}
			}

			// Update state with indicator data
			if (Object.keys(indicatorValues).length > 0) {
				setState((prev) => ({
					...prev,
					indicators: [
						...prev.indicators,
						{
							date,
							values: indicatorValues,
						},
					],
				}));
			}

			// Process signals
			const newSignals: StrategySignal[] = [];
			for (const [key, value] of Object.entries(result.signals)) {
				if (value === true) {
					// Parse signal key format (usually "entry_long" or "exit_short")
					const [type, side] = key.split("_") as [
						"entry" | "exit",
						"long" | "short"
					];
					if (type && side) {
						newSignals.push({
							date,
							type,
							side,
						});
					}
				}
			}

			// Update state with signals
			if (newSignals.length > 0) {
				setState((prev) => ({
					...prev,
					signals: [...prev.signals, ...newSignals],
				}));
			}
		} else if (data.type === "history") {
			// Handle historical data
			const historyData = data.data || [];

			// Process historical data
			const processedIndicators: StrategyIndicatorData[] = [];
			const processedSignals: StrategySignal[] = [];

			historyData.forEach((result: any) => {
				const date = new Date(result.timestamp).toISOString();

				// Process indicators
				const indicatorValues: Record<string, number> = {};
				for (const [key, values] of Object.entries(result.indicators)) {
					if (Array.isArray(values) && values.length > 0) {
						indicatorValues[key] = values[values.length - 1];
					}
				}

				// Add model values too
				for (const [key, values] of Object.entries(result.models)) {
					if (Array.isArray(values) && values.length > 0) {
						indicatorValues[key] = values[values.length - 1];
					}
				}

				if (Object.keys(indicatorValues).length > 0) {
					processedIndicators.push({
						date,
						values: indicatorValues,
					});
				}

				// Process signals
				for (const [key, value] of Object.entries(result.signals)) {
					if (value === true) {
						// Parse signal key format
						const [type, side] = key.split("_") as [
							"entry" | "exit",
							"long" | "short"
						];
						if (type && side) {
							processedSignals.push({
								date,
								type,
								side,
							});
						}
					}
				}
			});

			// Update state with historical data
			setState((prev) => ({
				...prev,
				indicators: processedIndicators,
				signals: processedSignals,
			}));
		} else if (data.type === "error") {
			setState((prev) => ({
				...prev,
				error: data.message || "Unknown WebSocket error",
			}));
		}
	}, []);

	// Handle WebSocket connection open
	const handleOpen = useCallback(() => {
		setState((prev) => ({
			...prev,
			strategyId: strategyId || "",
			isConnected: true,
			error: null,
		}));
	}, [strategyId]);

	// Handle WebSocket connection error
	const handleError = useCallback((error: any) => {
		console.error("Strategy WebSocket error:", error);
		setState((prev) => ({
			...prev,
			error: "WebSocket connection error",
		}));
	}, []);

	// Initialize WebSocket with reconnection (only if we have a valid URL)
	const webSocketResult = wsUrl
		? useWebSocketWithReconnect(wsUrl, {
				onMessage: handleMessage,
				onOpen: handleOpen,
				onError: handleError,
				onClose: () => {
					setState((prev) => ({
						...prev,
						isConnected: false,
					}));
				},
				reconnectInterval: 3000,
				maxReconnectAttempts: 10,
		  })
		: {
				connectionStatus: "closed",
				disconnect: () => {},
				connect: () => {},
				readyState: WebSocket.CLOSED,
		  };

	const { connectionStatus, disconnect, connect, readyState } = webSocketResult;

	// Reset data when strategy changes
	useEffect(() => {
		setState({
			strategyId: strategyId || "",
			indicators: [],
			signals: [],
			isConnected: false,
			error: null,
		});
	}, [strategyId]);

	// Don't attempt connection without a strategy ID
	useEffect(() => {
		if (!strategyId) {
			disconnect();
		}
	}, [strategyId, disconnect]);

	// Update connected state when WebSocket state changes
	useEffect(() => {
		setState((prev) => ({
			...prev,
			isConnected: readyState === WebSocket.OPEN,
		}));
	}, [readyState]);

	// Function to clear data
	const clearData = useCallback(() => {
		setState((prev) => ({
			...prev,
			indicators: [],
			signals: [],
		}));
	}, []);

	return {
		...state,
		clearData,
		connectionStatus,
		reconnect: connect,
	};
}
