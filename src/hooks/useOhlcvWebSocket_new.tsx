import { useState, useEffect, useCallback, useRef } from "react";
import { useRobustWebSocket } from "./useRobustWebSocket";

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
			console.log(
				`[OHLCV WS] Symbol/timeframe changed from ${currentSymbol.current}/${currentTimeframe.current} to ${symbol}/${timeframe}, clearing stale data`
			);
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
			console.log("[OHLCV WS] Received data:", data);

			// Handle connection confirmation messages
			if (data.type === "connection" && data.status === "connected") {
				console.log("[OHLCV WS] Connection confirmed:", data.message);
				isStableConnection.current = true;
				return;
			}

			// Handle OHLCV data messages
			if (data.type === "ohlcv") {
				if (data.mode === "full" && Array.isArray(data.data)) {
					console.log(`[OHLCV WS] Full dataset: ${data.data.length} candles`);
					setFullDataset(data.data);
					isStableConnection.current = true;
				} else if (data.mode === "incremental" && data.data) {
					console.log("[OHLCV WS] Incremental update:", data.data);
					setLatestCandle(data.data);
				}
			}
		} catch (error) {
			console.error("[OHLCV WS] Error processing message:", error);
		}
	}, []);

	const handleStatusChange = useCallback((status: string) => {
		console.log(`[OHLCV WS] Status changed to: ${status}`);
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
		enableFallback: false, // Disable REST fallback for WebSocket-only architecture
		fallbackPollInterval: 0, // Not used when fallback disabled
		maxReconnectAttempts: 3,
		reconnectInterval: 2000,
	});

	// Auto-connect when component mounts with a small delay for stability
	useEffect(() => {
		const timer = setTimeout(() => {
			if (status === "disconnected") {
				console.log(`[OHLCV WS] Auto-connecting to ${symbol}/${timeframe}`);
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
		isUsingFallback,
		reconnectAttempts,
	};
}

export default useOhlcvWebSocket;
