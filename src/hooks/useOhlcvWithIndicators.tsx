import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useWebSocket } from "../context/WebSocketContext";
import { useStrategy } from "../context/StrategyContext";

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
	const { symbol = "BTC/USDT", timeframe = "1h", limit = 1000 } = options;

	const { selectedStrategyId } = useStrategy();
	const { ohlcvData, indicatorData, connectionStatus, sendMessage } =
		useWebSocket();

	const [indicators, setIndicators] = useState<BackendIndicatorResult[]>([]);
	const processedIndicatorsRef = useRef<Set<string>>(new Set());
	const lastStrategyIdRef = useRef<string | null>(null);

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

	// Clear indicators when strategy changes
	useEffect(() => {
		if (lastStrategyIdRef.current !== selectedStrategyId) {
			setIndicators([]);
			processedIndicatorsRef.current.clear();
			lastStrategyIdRef.current = selectedStrategyId;
		}
	}, [selectedStrategyId]);

	// Process indicator data from shared WebSocket
	useEffect(() => {
		if (!indicatorData || Object.keys(indicatorData).length === 0) {
			setIndicators([]);
			return;
		}

		// Convert WebSocket context data to component format
		const processedIndicators: BackendIndicatorResult[] = [];

		Object.entries(indicatorData).forEach(([key, indicatorInfo]) => {
			// Full format with metadata (already accumulated by WebSocket context)
			if (
				indicatorInfo &&
				typeof indicatorInfo === "object" &&
				"id" in indicatorInfo &&
				"data" in indicatorInfo
			) {
				const backendIndicator = indicatorInfo as BackendIndicatorResult;
				processedIndicators.push({
					id: backendIndicator.id,
					name: backendIndicator.name,
					type: backendIndicator.type,
					data: backendIndicator.data,
				});
			}
		});

		// Update indicators state
		if (processedIndicators.length > 0) {
			setIndicators(processedIndicators);
		}
	}, [indicatorData]);

	// Dummy functions to maintain interface compatibility
	const reconnect = useCallback(() => {
		// Handled by shared WebSocket context
	}, []);

	const disconnect = useCallback(() => {
		// Handled by shared WebSocket context
	}, []);

	return {
		latestCandle,
		fullDataset,
		indicators,
		strategyId: selectedStrategyId,
		connectionStatus,
		reconnect,
		disconnect,
	};
};
