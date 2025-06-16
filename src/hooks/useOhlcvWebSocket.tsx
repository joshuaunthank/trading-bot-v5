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
	fullDataset: OHLCVCandle[];
	isConnected: boolean;
	connectionStatus: string;
	reconnect: () => void;
	disconnect: () => void;
	lastError: Error | null;
	isUsingFallback: boolean;
	reconnectAttempts: number;
}

/**
 * OHLCV WebSocket hook with incremental update support
 * Handles both full and incremental updates from the WebSocket
 */
export function useOhlcvWebSocket(
	symbol: string,
	timeframe: string,
	options: OHLCVWebSocketOptions = {}
): OHLCVWebSocketResult {
	const [latestCandle, setLatestCandle] = useState<OHLCVCandle | null>(null);
	const [fullDataset, setFullDataset] = useState<OHLCVCandle[]>([]);

	// Clear data when symbol or timeframe changes to prevent stale data
	useEffect(() => {
		console.log(
			`[OHLCV WS] Symbol/timeframe changed to ${symbol}/${timeframe}, clearing stale data`
		);
		setLatestCandle(null);
		setFullDataset([]);
	}, [symbol, timeframe]);

	// Memoized callbacks to prevent dependency loops
	const handleMessage = useCallback((data: any) => {
		try {
			console.log("[OHLCV WS] Received data:", data);

			// Handle connection confirmation messages
			if (data.type === "connection" && data.status === "connected") {
				console.log("[OHLCV WS] Connection confirmed:", data.message);
				return; // Don't process as candle data
			}

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
				console.log("[OHLCV WS] Update type:", data.updateType);

				if (candleArray.length > 0) {
					// Handle full vs incremental updates
					if (data.updateType === "full") {
						// Full update - replace entire dataset
						console.log("[OHLCV WS] Processing full update");
						const formattedCandles = candleArray.map((candleData: any) => ({
							timestamp: candleData.timestamp || Date.now(),
							open: Number(candleData.open),
							high: Number(candleData.high),
							low: Number(candleData.low),
							close: Number(candleData.close),
							volume: Number(candleData.volume),
						}));
						setFullDataset(formattedCandles);
						setLatestCandle(formattedCandles[0]); // Newest first
					} else {
						// Incremental update - update only the latest candle
						console.log("[OHLCV WS] Processing incremental update");
						const latestCandleData = candleArray[0];
						const candle: OHLCVCandle = {
							timestamp: latestCandleData.timestamp || Date.now(),
							open: Number(latestCandleData.open),
							high: Number(latestCandleData.high),
							low: Number(latestCandleData.low),
							close: Number(latestCandleData.close),
							volume: Number(latestCandleData.volume),
						};
						console.log("[OHLCV WS] Processed incremental candle:", candle);
						setLatestCandle(candle);
					}
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
		fullDataset,
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
