import { useEffect, useState, useCallback } from "react";
import {
	StrategyIndicatorData,
	StrategySignal,
	StrategyDataState,
} from "../context/Types";

/**
 * Custom hook for managing WebSocket connection to a running strategy
 */
export function useStrategyWebSocket(strategyId: string | null) {
	const [state, setState] = useState<StrategyDataState>({
		strategyId: strategyId || "",
		indicators: [],
		signals: [],
		isConnected: false,
		error: null,
	});

	const connectToStrategy = useCallback((id: string) => {
		if (!id) return;

		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const wsUrl = `${protocol}//${window.location.host}/ws/strategy?strategy=${id}`;

		const ws = new WebSocket(wsUrl);

		ws.onopen = () => {
			setState((prev) => ({
				...prev,
				strategyId: id,
				isConnected: true,
				error: null,
			}));
		};

		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);

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
			} catch (err) {
				console.error("Failed to parse strategy WebSocket message:", err);
			}
		};

		ws.onerror = (error) => {
			setState((prev) => ({
				...prev,
				error: "WebSocket connection error",
			}));
			console.error("Strategy WebSocket error:", error);
		};

		ws.onclose = () => {
			setState((prev) => ({
				...prev,
				isConnected: false,
			}));
		};

		// Return cleanup function
		return () => {
			ws.close();
		};
	}, []);

	useEffect(() => {
		let cleanup: (() => void) | undefined;

		if (strategyId) {
			cleanup = connectToStrategy(strategyId);
		}

		return () => {
			if (cleanup) cleanup();
		};
	}, [strategyId, connectToStrategy]);

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
	};
}
