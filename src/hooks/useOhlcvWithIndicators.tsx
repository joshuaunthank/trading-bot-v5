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

	// Process indicator data from shared WebSocket - now simplified since context handles accumulation
	useEffect(() => {
		console.log(
			"[useOhlcvWithIndicators] Raw indicatorData received:",
			Object.keys(indicatorData || {})
		);
		console.log(
			"[useOhlcvWithIndicators] Full indicatorData structure:",
			indicatorData
		);

		if (!indicatorData || Object.keys(indicatorData).length === 0) {
			console.log("[useOhlcvWithIndicators] No indicator data to process");
			return;
		}

		// Convert WebSocket context data to component format
		const processedIndicators: BackendIndicatorResult[] = [];

		Object.entries(indicatorData).forEach(([key, indicatorInfo]) => {
			console.log(`[useOhlcvWithIndicators] Processing indicator ${key}:`, {
				hasId: "id" in (indicatorInfo as any),
				hasData: "data" in (indicatorInfo as any),
				dataLength: (indicatorInfo as any).data?.length || 0,
				type: typeof indicatorInfo,
				keys: Object.keys(indicatorInfo as any),
			});

			// Full format with metadata (already accumulated by WebSocket context)
			if (
				indicatorInfo &&
				typeof indicatorInfo === "object" &&
				"id" in indicatorInfo &&
				"data" in indicatorInfo
			) {
				const backendIndicator = indicatorInfo as BackendIndicatorResult;
				console.log(
					`[useOhlcvWithIndicators] ✅ Processing accumulated indicator ${key}: ${backendIndicator.data.length} data points`
				);

				processedIndicators.push({
					id: backendIndicator.id,
					name: backendIndicator.name,
					type: backendIndicator.type,
					data: backendIndicator.data,
				});
			} else {
				console.warn(
					`[useOhlcvWithIndicators] ❌ Unexpected indicator format for ${key}:`,
					indicatorInfo
				);
			}
		});

		console.log(
			`[useOhlcvWithIndicators] Processed ${
				processedIndicators.length
			} indicators from ${Object.keys(indicatorData).length} received`
		);

		// Update indicators state
		if (processedIndicators.length > 0) {
			setIndicators(processedIndicators);
			console.log(
				`[useOhlcvWithIndicators] ✅ Updated indicators state with ${processedIndicators.length} indicators`
			);

			// Log the data length for each indicator
			processedIndicators.forEach((ind) => {
				const validPoints = ind.data.filter(
					(d) => d.y !== null && !isNaN(d.y)
				).length;
				console.log(
					`  - ${ind.id}: ${validPoints}/${ind.data.length} valid points`
				);
			});
		} else {
			console.log("[useOhlcvWithIndicators] ⚠️ No indicators processed");
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
