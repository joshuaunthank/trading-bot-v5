import { useState, useEffect, useCallback, useRef } from "react";
import { useWebSocket } from "./useWebSocket";

interface OHLCVCandle {
	timestamp: number;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
}

interface OHLCVWebSocketOptions {
	autoConnect?: boolean;
	reconnectDelay?: number;
}

interface OHLCVWebSocketResult {
	latestCandle: OHLCVCandle | null;
	fullDataset: OHLCVCandle[];
	isConnected: boolean;
	connectionStatus: string;
	reconnect: () => void;
	disconnect: () => void;
	lastError: Error | null;
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

	// Use refs to track connection state and prevent rapid reconnections
	const currentSymbol = useRef(symbol);
	const currentTimeframe = useRef(timeframe);
	const isStableConnection = useRef(false);

	// Clear data when symbol or timeframe changes to prevent stale data
	useEffect(() => {
		// Only clear if this is actually a change, not initial mount
		if (
			currentSymbol.current !== symbol ||
			currentTimeframe.current !== timeframe
		) {
			if (process.env.NODE_ENV === "development") {
				console.log(
					`[OHLCV WS] Symbol/timeframe changed from ${currentSymbol.current}/${currentTimeframe.current} to ${symbol}/${timeframe}, clearing stale data`
				);
			}
			setLatestCandle(null);
			setFullDataset([]);
			isStableConnection.current = false;

			currentSymbol.current = symbol;
			currentTimeframe.current = timeframe;
		}
	}, [symbol, timeframe]);

	// Memoized callbacks to prevent dependency loops
	const handleMessage = useCallback((data: any) => {
		try {
			// Handle connection confirmation messages
			if (data.type === "connection" && data.status === "connected") {
				isStableConnection.current = true;
				return;
			}
			// Handle OHLCV data messages
			if (data.type === "ohlcv") {
				if (data.updateType === "full" && Array.isArray(data.data)) {
					setFullDataset(data.data);
					isStableConnection.current = true;
				} else if (data.updateType === "incremental" && data.data) {
					// Incremental data is now a single candle object
					setLatestCandle(data.data);
				}
			}
		} catch (error) {
			console.error("[OHLCV WS] Error processing message:", error);
		}
	}, []);

	const handleStatusChange = useCallback((status: string) => {
		// Track connection status for reconnection logic
		if (status === "disconnected" || status === "closed") {
			isStableConnection.current = false;
		}
	}, []);

	const handleError = useCallback((error: Error) => {
		console.error("[OHLCV WS] Connection error:", error);
		isStableConnection.current = false;
	}, []);

	// Build WebSocket URL
	const wsUrl = `ws://localhost:3001/ws/ohlcv?symbol=${encodeURIComponent(
		symbol
	)}&timeframe=${encodeURIComponent(timeframe)}`;

	// Setup WebSocket connection with simplified options (no REST fallback)
	const { send, disconnect, connect, status, lastError, reconnectAttempts } =
		useWebSocket({
			url: wsUrl,
			onMessage: handleMessage,
			onStatusChange: handleStatusChange,
			onError: handleError,
			maxReconnectAttempts: 10,
			reconnectInterval: 2000,
		});

	// Auto-connect when component mounts with a small delay for stability
	useEffect(() => {
		const timer = setTimeout(() => {
			if (status === "disconnected") {
				if (process.env.NODE_ENV === "development") {
					console.log(`[OHLCV WS] Auto-connecting to ${symbol}/${timeframe}`);
				}
				connect();
			}
		}, 100); // Small delay to prevent rapid connections

		return () => clearTimeout(timer);
	}, [connect, status, symbol, timeframe]);

	return {
		latestCandle,
		fullDataset,
		isConnected: status === "connected",
		connectionStatus: status,
		reconnect: connect,
		disconnect,
		lastError,
		reconnectAttempts,
	};
}

export default useOhlcvWebSocket;
