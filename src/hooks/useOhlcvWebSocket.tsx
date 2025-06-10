import { useState, useEffect, useCallback } from "react";
import { useRobustWebSocket } from "./useRobustWebSocket";

interface OHLCVCandle {
	timestamp: number;
	open: number;
	high: number;
	close: number;
	low: number;
	volume: number;
}

interface OHLCVWebSocketOptions {
	onStatusChange?: (status: string) => void;
	onError?: (error: any) => void;
	autoReconnect?: boolean;
}

interface OHLCVWebSocketResult {
	latestCandle: OHLCVCandle | null;
	isConnected: boolean;
	connectionStatus: string;
	reconnect: () => void;
	disconnect: () => void;
	lastError: Error | null;
	isUsingFallback: boolean;
	reconnectAttempts: number;
}

/**
 * OHLCV WebSocket hook with RSV1 error handling and REST fallback
 * Automatically falls back to REST API polling when WebSocket fails with RSV1 errors
 */
export function useOhlcvWebSocket(
	symbol: string,
	timeframe: string,
	options: OHLCVWebSocketOptions = {}
): OHLCVWebSocketResult {
	const [latestCandle, setLatestCandle] = useState<OHLCVCandle | null>(null);

	// Memoized callbacks to prevent dependency loops
	const handleMessage = useCallback((data: any) => {
		try {
			console.log("[OHLCV WS] Received data:", data);

			// Handle both WebSocket and REST data formats
			if (data.type === "ohlcv_rest" && data.data) {
				// REST API fallback data
				const restData = data.data;
				if (restData.dates && restData.dates.length > 0) {
					const lastIndex = restData.dates.length - 1;
					const candle: OHLCVCandle = {
						timestamp: new Date(restData.dates[lastIndex]).getTime(),
						open: Number(restData.open[lastIndex]),
						high: Number(restData.high[lastIndex]),
						low: Number(restData.low[lastIndex]),
						close: Number(restData.close[lastIndex]),
						volume: Number(restData.volume[lastIndex]),
					};
					console.log("[OHLCV WS] Processed REST candle:", candle);
					setLatestCandle(candle);
				}
			} else if (
				data.type === "ohlcv" &&
				data.data &&
				Array.isArray(data.data)
			) {
				// WebSocket live data - data.data is an array of candles
				const candleArray = data.data;
				console.log("[OHLCV WS] Received WebSocket candle array:", candleArray);
				if (candleArray.length > 0) {
					// Get the latest (most recent) candle
					const latestCandleData = candleArray[candleArray.length - 1];
					const candle: OHLCVCandle = {
						timestamp: latestCandleData.timestamp || Date.now(),
						open: Number(latestCandleData.open),
						high: Number(latestCandleData.high),
						low: Number(latestCandleData.low),
						close: Number(latestCandleData.close),
						volume: Number(latestCandleData.volume),
					};
					console.log("[OHLCV WS] Processed WebSocket candle:", candle);
					setLatestCandle(candle);
				}
			} else {
				console.warn("[OHLCV WS] Unknown message format:", data);
			}
		} catch (error) {
			console.error("[OHLCV WS] Error processing message:", error);
			options.onError?.(error);
		}
	}, []); // Remove dependency on options.onError to prevent loops

	const handleStatusChange = useCallback((status: string) => {
		console.log(`[OHLCV WS] Status changed to: ${status}`);
		options.onStatusChange?.(status);
	}, []); // Remove dependency on options.onStatusChange to prevent loops

	const handleError = useCallback((error: Error) => {
		console.error(`[OHLCV WS] Error:`, error);
		options.onError?.(error);
	}, []); // Remove dependency on options.onError to prevent loops

	// Create WebSocket URL
	const wsUrl = `ws://localhost:3001/ws/ohlcv?symbol=${encodeURIComponent(
		symbol
	)}&timeframe=${encodeURIComponent(timeframe)}`;

	// Use robust WebSocket with fallback
	const {
		send,
		disconnect,
		connect,
		status,
		lastError,
		reconnectAttempts,
		isUsingFallback,
	} = useRobustWebSocket({
		url: wsUrl,
		onMessage: handleMessage,
		onStatusChange: handleStatusChange,
		onError: handleError,
		enableFallback: true,
		fallbackPollInterval: 5000, // Poll every 5 seconds when using REST fallback
		maxReconnectAttempts: 3,
		reconnectInterval: 2000,
	});

	return {
		latestCandle,
		isConnected: status === "connected",
		connectionStatus: status,
		reconnect: connect,
		disconnect,
		lastError,
		isUsingFallback,
		reconnectAttempts,
	};
}

export default useOhlcvWebSocket;
