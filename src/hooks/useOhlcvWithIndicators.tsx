import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useWebSocket } from "./useWebSocket";

interface OHLCVCandle {
	timestamp: number;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
}

interface IndicatorValue {
	x: number; // timestamp
	y: number | null; // value
}

interface BackendIndicatorResult {
	id: string;
	name: string;
	type: string;
	data: IndicatorValue[];
}

export interface OHLCVWithIndicatorsResult {
	// OHLCV Data
	latestCandle: OHLCVCandle | null;
	fullDataset: OHLCVCandle[];

	// Indicator Data
	indicators: BackendIndicatorResult[];

	// Strategy Info
	strategyId: string | null;

	// Connection Status
	connectionStatus: string;
	reconnect: () => void;
	disconnect: () => void;
	lastError: Error | null;
	reconnectAttempts: number;

	// Strategy Selection
	setStrategy: (strategyId: string | null) => void;
}

/**
 * Enhanced OHLCV WebSocket hook that also handles backend-calculated indicators
 * This replaces the need for local indicator calculations
 */
export function useOhlcvWithIndicators(
	symbol: string,
	timeframe: string,
	strategyId: string | null = null
): OHLCVWithIndicatorsResult {
	// Helper function to infer indicator type from ID
	const getIndicatorTypeFromId = (id: string): string => {
		const lowerId = id.toLowerCase();
		if (lowerId.includes("rsi")) return "rsi";
		if (lowerId.includes("macd")) return "macd";
		if (lowerId.includes("ema")) return "ema";
		if (lowerId.includes("sma")) return "sma";
		if (lowerId.includes("volume")) return "volume";
		if (lowerId.includes("bb") || lowerId.includes("bollinger")) return "bb";
		if (lowerId.includes("atr")) return "atr";
		if (lowerId.includes("cci")) return "cci";
		if (lowerId.includes("adx")) return "adx";
		return "unknown";
	};

	// OHLCV State
	const [latestCandle, setLatestCandle] = useState<OHLCVCandle | null>(null);
	const [fullDataset, setFullDataset] = useState<OHLCVCandle[]>([]);

	// Indicator State
	const [indicators, setIndicators] = useState<BackendIndicatorResult[]>([]);

	// Strategy State - sync with prop
	const [currentStrategyId, setCurrentStrategyId] = useState<string | null>(
		strategyId
	);

	// Update strategy when prop changes
	useEffect(() => {
		if (currentStrategyId !== strategyId) {
			console.log(
				`[OHLCV+Indicators] Strategy prop changed: ${currentStrategyId} -> ${strategyId}`
			);
			setCurrentStrategyId(strategyId);
			setIndicators([]); // Clear indicators when strategy changes
		}
	}, [strategyId, currentStrategyId]);

	// Connection State
	const currentSymbol = useRef(symbol);
	const currentTimeframe = useRef(timeframe);
	const isStableConnection = useRef(false);
	const wsRef = useRef<any>(null);

	// Clear data when symbol or timeframe changes
	useEffect(() => {
		if (
			currentSymbol.current !== symbol ||
			currentTimeframe.current !== timeframe
		) {
			console.log(`[OHLCV+Indicators] Symbol/timeframe changed, clearing data`);
			setLatestCandle(null);
			setFullDataset([]);
			setIndicators([]);
			isStableConnection.current = false;

			currentSymbol.current = symbol;
			currentTimeframe.current = timeframe;
		}
	}, [symbol, timeframe]);

	// Handle incoming WebSocket messages
	const handleMessage = useCallback((data: any) => {
		try {
			// Handle connection confirmation
			if (data.type === "connection" && data.status === "connected") {
				isStableConnection.current = true;
				console.log(
					`[OHLCV+Indicators] Connected to ${data.symbol}/${data.timeframe}`
				);
				return;
			}

			// Handle OHLCV + Indicator data
			if (data.type === "ohlcv") {
				// Update OHLCV data
				if (data.updateType === "full" && Array.isArray(data.data)) {
					setFullDataset(data.data);
					if (data.data.length > 0) {
						setLatestCandle(data.data[data.data.length - 1]);
					}
					isStableConnection.current = true;
				} else if (
					data.updateType === "incremental" &&
					Array.isArray(data.data)
				) {
					if (data.data.length > 0) {
						const latestCandle = data.data[data.data.length - 1];
						setLatestCandle(latestCandle);

						// Update full dataset with latest candle
						setFullDataset((prev) => {
							const newDataset = [...prev];
							// Replace or add the latest candle
							if (
								newDataset.length > 0 &&
								newDataset[newDataset.length - 1].timestamp ===
									latestCandle.timestamp
							) {
								newDataset[newDataset.length - 1] = latestCandle;
							} else {
								newDataset.push(latestCandle);
							}
							return newDataset;
						});
					}
				}

				// Update indicators if present
				if (data.indicators && typeof data.indicators === "object") {
					if (data.indicatorUpdateType === "full") {
						// Full indicator update - convert backend format to frontend format
						const indicatorResults: BackendIndicatorResult[] = [];

						for (const [indicatorId, indicatorData] of Object.entries(
							data.indicators
						)) {
							// Check if indicatorData is an object with data array (backend format)
							if (
								indicatorData &&
								typeof indicatorData === "object" &&
								"data" in indicatorData &&
								Array.isArray((indicatorData as any).data)
							) {
								const backendIndicator = indicatorData as any;
								const result = {
									id: indicatorId,
									name: backendIndicator.name || indicatorId,
									type: backendIndicator.type || "unknown",
									data: backendIndicator.data as IndicatorValue[],
								};
								indicatorResults.push(result);
							}
						}

						setIndicators(indicatorResults);
						console.log(
							`[OHLCV+Indicators] Updated ${indicatorResults.length} indicators (full)`
						);
					} else if (data.indicatorUpdateType === "incremental") {
						// Incremental indicator update - update latest values or create new indicators
						setIndicators((prev) => {
							const updated = [...prev];

							for (const [indicatorId, latestValue] of Object.entries(
								data.indicators
							)) {
								const existingIndex = updated.findIndex(
									(ind) => ind.id === indicatorId
								);

								if (
									existingIndex >= 0 &&
									latestValue &&
									typeof latestValue === "object"
								) {
									// Update the latest value in the existing indicator
									const existingIndicator = updated[existingIndex];
									const newData = [...existingIndicator.data];

									// Add or update the latest value
									if (newData.length > 0) {
										const latestTimestamp = (latestValue as IndicatorValue).x;
										const lastDataPoint = newData[newData.length - 1];

										if (lastDataPoint.x === latestTimestamp) {
											// Update existing timestamp
											newData[newData.length - 1] =
												latestValue as IndicatorValue;
										} else {
											// Add new timestamp
											newData.push(latestValue as IndicatorValue);
										}
									} else {
										newData.push(latestValue as IndicatorValue);
									}

									updated[existingIndex] = {
										...existingIndicator,
										data: newData,
									};
								} else if (latestValue && typeof latestValue === "object") {
									// Create new indicator if it doesn't exist
									const inferredType = getIndicatorTypeFromId(indicatorId);
									const newIndicator: BackendIndicatorResult = {
										id: indicatorId,
										name: indicatorId, // Use ID as name for now
										type: inferredType, // Infer type from ID
										data: [latestValue as IndicatorValue],
									};
									updated.push(newIndicator);
								}
							}

							return updated;
						});

						console.log(`[OHLCV+Indicators] Updated indicators (incremental)`);
					}
				}
			}
		} catch (error) {
			console.error("[OHLCV+Indicators] Error processing message:", error);
		}
	}, []);

	const handleStatusChange = useCallback((status: string) => {
		if (status === "disconnected" || status === "closed") {
			isStableConnection.current = false;
		}
	}, []);

	const handleError = useCallback((error: Error) => {
		console.error("[OHLCV+Indicators] Connection error:", error);
		isStableConnection.current = false;
	}, []);

	// Build WebSocket URL with strategy parameter - memoized to prevent reconnections
	const wsUrl = useMemo(() => {
		const url = `ws://localhost:3001/ws/ohlcv?symbol=${encodeURIComponent(
			symbol
		)}&timeframe=${encodeURIComponent(timeframe)}${
			currentStrategyId
				? `&strategy=${encodeURIComponent(currentStrategyId)}`
				: ""
		}`;
		console.log(`[OHLCV+Indicators] WebSocket URL: ${url}`);
		return url;
	}, [symbol, timeframe, currentStrategyId]);

	// Setup WebSocket connection
	const { send, disconnect, connect, status, lastError, reconnectAttempts } =
		useWebSocket({
			url: wsUrl,
			onMessage: handleMessage,
			onStatusChange: handleStatusChange,
			onError: handleError,
			maxReconnectAttempts: 10,
			reconnectInterval: 2000,
		});

	// Store WebSocket reference for sending config updates
	wsRef.current = { send };

	// Send strategy configuration when strategy changes
	useEffect(() => {
		if (status === "connected" && wsRef.current && currentStrategyId) {
			console.log(
				`[OHLCV+Indicators] Sending strategy config: ${currentStrategyId}`
			);
			wsRef.current.send({
				type: "config",
				strategyId: currentStrategyId,
			});
		}
	}, [status, currentStrategyId]);

	// Note: Auto-connect is handled by useWebSocket hook, no need to duplicate here

	// Strategy setter function
	const setStrategy = useCallback(
		(newStrategyId: string | null) => {
			// Only update if the strategy actually changed
			if (currentStrategyId === newStrategyId) {
				return;
			}

			console.log(
				`[OHLCV+Indicators] Setting strategy: ${currentStrategyId} -> ${newStrategyId}`
			);
			setCurrentStrategyId(newStrategyId);
			setIndicators([]); // Clear indicators when strategy changes

			// Send new strategy config if connected
			if (status === "connected" && wsRef.current) {
				console.log(
					`[OHLCV+Indicators] Sending strategy config via WebSocket: ${newStrategyId}`
				);
				wsRef.current.send({
					type: "config",
					strategyId: newStrategyId,
				});
			} else {
				console.log(
					`[OHLCV+Indicators] Will reconnect with new strategy URL: ${newStrategyId}`
				);
			}
		},
		[status, currentStrategyId]
	);

	return {
		// OHLCV Data
		latestCandle,
		fullDataset,

		// Indicator Data (calculated on backend)
		indicators,

		// Strategy Info
		strategyId: currentStrategyId,

		// Connection Status
		connectionStatus: status,
		reconnect: connect,
		disconnect,
		lastError,
		reconnectAttempts,

		// Strategy Selection
		setStrategy,
	};
}
