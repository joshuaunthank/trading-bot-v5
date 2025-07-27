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

	// Process indicator data from shared WebSocket
	useEffect(() => {
		if (!indicatorData || Object.keys(indicatorData).length === 0) {
			return;
		}

		// Convert indicatorData object to BackendIndicatorResult format
		const processedIndicators: BackendIndicatorResult[] = [];

		// Get latest timestamp for alignment
		const latestTimestamp = latestCandle?.timestamp || Date.now();

		Object.entries(indicatorData).forEach(([key, value]) => {
			if (value !== undefined && !processedIndicatorsRef.current.has(key)) {
				// Create indicator result with single latest value
				const indicatorResult: BackendIndicatorResult = {
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
							y: typeof value === "number" ? value : null,
						},
					],
				};

				processedIndicators.push(indicatorResult);
				processedIndicatorsRef.current.add(key);
			}
		});

		if (processedIndicators.length > 0) {
			setIndicators((prev) => {
				// Update existing indicators or add new ones
				const updated = [...prev];

				processedIndicators.forEach((newIndicator) => {
					const existingIndex = updated.findIndex(
						(ind) => ind.id === newIndicator.id
					);
					if (existingIndex >= 0) {
						// Update existing indicator data
						const existing = updated[existingIndex];
						updated[existingIndex] = {
							...existing,
							data: [...existing.data, ...newIndicator.data],
						};
					} else {
						// Add new indicator
						updated.push(newIndicator);
					}
				});

				return updated;
			});
		}
	}, [indicatorData, latestCandle]);

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
