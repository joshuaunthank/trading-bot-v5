import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useWebSocket } from "../context/WebSocketContext";

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
}

interface UseOHLCVWithIndicatorsOptions {
	symbol?: string;
	timeframe?: string;
	limit?: number;
	strategyId?: string;
}

/**
 * Enhanced hook that combines OHLCV data with real-time indicators using shared WebSocket connection
 * Uses the global WebSocket context to avoid multiple connections to the same endpoint
 */
export const useOhlcvWithIndicators = (
	options: UseOHLCVWithIndicatorsOptions = {}
): OHLCVWithIndicatorsResult => {
	const {
		symbol = "BTC/USDT",
		timeframe = "1h",
		limit = 1000,
		strategyId = null,
	} = options;

	const { ohlcvData, indicatorData, connectionStatus, sendMessage } =
		useWebSocket();

	const [indicators, setIndicators] = useState<BackendIndicatorResult[]>([]);
	const processedIndicatorsRef = useRef<Set<string>>(new Set());

	// Convert shared WebSocket OHLCV data to expected format
	const fullDataset = useMemo(() => {
		return ohlcvData.map((candle) => ({
			timestamp: candle.timestamp,
			open: candle.open,
			high: candle.high,
			low: candle.low,
			close: candle.close,
			volume: candle.volume,
		}));
	}, [ohlcvData]);

	const latestCandle = useMemo(() => {
		if (fullDataset.length === 0) return null;
		return fullDataset[fullDataset.length - 1];
	}, [fullDataset]);

	// Process indicator data from shared WebSocket - handle both full and incremental updates
	useEffect(() => {
		console.log(
			"[useOhlcvWithIndicators] Raw indicatorData received:",
			Object.keys(indicatorData || {})
		);

		if (!indicatorData || Object.keys(indicatorData).length === 0) {
			console.log("[useOhlcvWithIndicators] No indicator data to process");
			return;
		}

		// Handle both full and incremental indicator updates
		const processedIndicators: BackendIndicatorResult[] = [];

		Object.entries(indicatorData).forEach(([key, indicatorInfo]) => {
			console.log(`[useOhlcvWithIndicators] Processing indicator ${key}:`, {
				hasId: "id" in (indicatorInfo as any),
				hasData: "data" in (indicatorInfo as any),
				dataLength: (indicatorInfo as any).data?.length || 0,
				isNumber: typeof indicatorInfo === "number",
			});

			// Full format with metadata (for initial load and new candles)
			if (
				indicatorInfo &&
				typeof indicatorInfo === "object" &&
				"id" in indicatorInfo &&
				"data" in indicatorInfo
			) {
				const backendIndicator = indicatorInfo as BackendIndicatorResult;
				console.log(
					`[useOhlcvWithIndicators] Full format indicator ${key}: ${backendIndicator.data.length} data points`
				);

				processedIndicators.push({
					id: backendIndicator.id,
					name: backendIndicator.name,
					type: backendIndicator.type,
					data: backendIndicator.data,
				});
			}
			// Incremental format (single values for live updates) - handle {x, y} objects
			else if (
				typeof indicatorInfo === "object" &&
				indicatorInfo &&
				"x" in indicatorInfo &&
				"y" in indicatorInfo
			) {
				const incrementalPoint = indicatorInfo as { x: number; y: number };
				console.log(
					`[useOhlcvWithIndicators] Incremental point indicator ${key}:`,
					incrementalPoint
				);

				// Find existing indicator and update its latest value
				const existingIndicatorIndex = indicators.findIndex(
					(ind) => ind.id === key
				);
				if (existingIndicatorIndex >= 0) {
					// Update existing indicator's latest point
					const existingIndicator = { ...indicators[existingIndicatorIndex] };
					const updatedData = [...existingIndicator.data];

					// Update or add the latest point
					if (updatedData.length > 0) {
						updatedData[updatedData.length - 1] = {
							x: incrementalPoint.x,
							y: incrementalPoint.y,
						};
					} else {
						updatedData.push({
							x: incrementalPoint.x,
							y: incrementalPoint.y,
						});
					}

					existingIndicator.data = updatedData;
					processedIndicators.push(existingIndicator);
				} else {
					// Create new indicator for incremental update
					processedIndicators.push({
						id: key,
						name: key.toUpperCase(),
						type: key.includes("ema")
							? "EMA"
							: key.includes("rsi")
							? "RSI"
							: key.includes("macd")
							? "MACD"
							: key.includes("bb") || key.includes("bollinger")
							? "BOLLINGER_BANDS"
							: "OTHER",
						data: [
							{
								x: incrementalPoint.x,
								y: incrementalPoint.y,
							},
						],
					});
				}
			}
			// Simple number format (fallback)
			else if (typeof indicatorInfo === "number") {
				console.log(
					`[useOhlcvWithIndicators] Simple value indicator ${key}:`,
					indicatorInfo
				);

				const latestTimestamp = latestCandle?.timestamp || Date.now();

				// Find existing indicator and update its latest value
				const existingIndicatorIndex = indicators.findIndex(
					(ind) => ind.id === key
				);
				if (existingIndicatorIndex >= 0) {
					// Update existing indicator's latest point
					const existingIndicator = { ...indicators[existingIndicatorIndex] };
					const updatedData = [...existingIndicator.data];

					// Update or add the latest point
					if (updatedData.length > 0) {
						updatedData[updatedData.length - 1] = {
							x: latestTimestamp,
							y: indicatorInfo,
						};
					} else {
						updatedData.push({
							x: latestTimestamp,
							y: indicatorInfo,
						});
					}

					existingIndicator.data = updatedData;
					processedIndicators.push(existingIndicator);
				} else {
					// Create new indicator for incremental update
					processedIndicators.push({
						id: key,
						name: key.toUpperCase(),
						type: key.includes("ema")
							? "EMA"
							: key.includes("rsi")
							? "RSI"
							: key.includes("macd")
							? "MACD"
							: key.includes("bb") || key.includes("bollinger")
							? "BOLLINGER_BANDS"
							: "OTHER",
						data: [
							{
								x: latestTimestamp,
								y: indicatorInfo,
							},
						],
					});
				}
			} else {
				console.warn(
					`[useOhlcvWithIndicators] Unexpected indicator format for ${key}:`,
					indicatorInfo
				);
			}
		});

		console.log(
			`[useOhlcvWithIndicators] Processed ${processedIndicators.length} indicators`
		);

		if (processedIndicators.length > 0) {
			setIndicators(processedIndicators);
		}
	}, [indicatorData]);

	// Dummy functions to maintain interface compatibility
	const reconnect = useCallback(() => {
		console.log(
			"[useOhlcvWithIndicators] Reconnect handled by shared WebSocket context"
		);
	}, []);

	const disconnect = useCallback(() => {
		console.log(
			"[useOhlcvWithIndicators] Disconnect handled by shared WebSocket context"
		);
	}, []);

	return {
		latestCandle,
		fullDataset,
		indicators,
		strategyId,
		connectionStatus,
		reconnect,
		disconnect,
	};
};
