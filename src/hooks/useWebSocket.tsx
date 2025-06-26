import { useCallback, useEffect, useRef, useState } from "react";

interface OHLCVCandle {
	timestamp: number;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
}

export interface WebSocketConfig {
	url: string;
	onMessage?: (data: any) => void;
	onStatusChange?: (status: string) => void;
	onError?: (error: Error) => void;
	maxReconnectAttempts?: number;
	reconnectInterval?: number;
}

export interface WebSocketResult {
	send: (data: any) => boolean;
	disconnect: () => void;
	connect: () => void;
	status: string;
	lastError: Error | null;
	reconnectAttempts: number;
}

export interface OHLCVWebSocketResult {
	latestCandle: OHLCVCandle | null;
	fullDataset: OHLCVCandle[];
	connectionStatus: string;
	reconnect: () => void;
	disconnect: () => void;
	lastError: Error | null;
	reconnectAttempts: number;
}

/**
 * Unified WebSocket hook for all trading bot WebSocket connections
 * Handles OHLCV data, strategy data, and provides robust reconnection
 */
export function useWebSocket(config: WebSocketConfig): WebSocketResult {
	const {
		url,
		onMessage,
		onStatusChange,
		onError,
		maxReconnectAttempts = 10,
		reconnectInterval = 2000,
	} = config;

	const [status, setStatus] = useState<string>("disconnected");
	const [lastError, setLastError] = useState<Error | null>(null);
	const [reconnectAttempts, setReconnectAttempts] = useState(0);

	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const isMountedRef = useRef(true);
	const reconnectAttemptsRef = useRef(0);

	// Store callbacks in refs to prevent stale closures
	const onMessageRef = useRef(onMessage);
	const onStatusChangeRef = useRef(onStatusChange);
	const onErrorRef = useRef(onError);

	// Update refs when callbacks change
	useEffect(() => {
		onMessageRef.current = onMessage;
		onStatusChangeRef.current = onStatusChange;
		onErrorRef.current = onError;
	}, [onMessage, onStatusChange, onError]);

	// Keep reconnectAttemptsRef in sync
	useEffect(() => {
		reconnectAttemptsRef.current = reconnectAttempts;
	}, [reconnectAttempts]);

	const updateStatus = useCallback((newStatus: string) => {
		setStatus(newStatus);
		onStatusChangeRef.current?.(newStatus);
	}, []);

	const handleError = useCallback((error: Error) => {
		if (process.env.NODE_ENV === "development") {
			console.error(`[WebSocket] Error:`, error);
		}
		setLastError(error);
		onErrorRef.current?.(error);
	}, []);

	// WebSocket connection function
	const connect = useCallback(() => {
		if (!isMountedRef.current) return;

		// Clear any existing timeouts
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}

		// Close existing connection
		if (wsRef.current) {
			wsRef.current.close();
		}

		if (process.env.NODE_ENV === "development") {
			console.log(`[WebSocket] Attempting connection to ${url}`);
		}
		updateStatus("connecting");

		try {
			wsRef.current = new WebSocket(url);

			// Set connection timeout
			const connectionTimeout = setTimeout(() => {
				if (
					wsRef.current &&
					wsRef.current.readyState === WebSocket.CONNECTING
				) {
					if (process.env.NODE_ENV === "development") {
						console.log(`[WebSocket] Connection timeout, closing...`);
					}
					wsRef.current.close();
				}
			}, 10000); // 10 second timeout

			wsRef.current.onopen = () => {
				if (!isMountedRef.current) return;

				clearTimeout(connectionTimeout);
				if (process.env.NODE_ENV === "development") {
					console.log(`[WebSocket] Connected successfully`);
				}
				updateStatus("connected");
				setReconnectAttempts(0);
				setLastError(null);
			};

			wsRef.current.onmessage = (event) => {
				if (!isMountedRef.current) return;

				try {
					const data = JSON.parse(event.data);
					onMessageRef.current?.(data);
				} catch (error) {
					if (process.env.NODE_ENV === "development") {
						console.error("[WebSocket] Failed to parse message:", error);
					}
					handleError(
						error instanceof Error ? error : new Error("Message parse error")
					);
				}
			};

			wsRef.current.onerror = (event) => {
				if (!isMountedRef.current) return;

				clearTimeout(connectionTimeout);
				const error = new Error("WebSocket connection error");
				handleError(error);
			};

			wsRef.current.onclose = (event) => {
				if (!isMountedRef.current) return;

				clearTimeout(connectionTimeout);

				if (process.env.NODE_ENV === "development") {
					console.log(
						`[WebSocket] Connection closed (code: ${event.code}, reason: ${event.reason})`
					);
				}

				updateStatus("disconnected");

				// Attempt reconnection if not max attempts reached
				if (reconnectAttemptsRef.current < maxReconnectAttempts) {
					const nextAttempt = reconnectAttemptsRef.current + 1;
					setReconnectAttempts(nextAttempt);
					reconnectAttemptsRef.current = nextAttempt;

					if (process.env.NODE_ENV === "development") {
						console.log(
							`[WebSocket] Scheduling reconnection attempt ${nextAttempt}/${maxReconnectAttempts} in ${reconnectInterval}ms`
						);
					}
					updateStatus("reconnecting");

					reconnectTimeoutRef.current = setTimeout(() => {
						if (isMountedRef.current) {
							connect();
						}
					}, reconnectInterval);
				} else {
					if (process.env.NODE_ENV === "development") {
						console.log(`[WebSocket] Max reconnection attempts reached`);
					}
					handleError(new Error("Max reconnection attempts reached"));
				}
			};
		} catch (error) {
			handleError(
				error instanceof Error ? error : new Error("Connection failed")
			);
		}
	}, [url, maxReconnectAttempts, reconnectInterval, updateStatus, handleError]);

	// Disconnect function
	const disconnect = useCallback(() => {
		if (process.env.NODE_ENV === "development") {
			console.log(`[WebSocket] Manually disconnecting`);
		}

		// Clear timeouts
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}

		// Close WebSocket
		if (wsRef.current) {
			wsRef.current.close();
			wsRef.current = null;
		}

		updateStatus("disconnected");
		setReconnectAttempts(0);
		reconnectAttemptsRef.current = 0;
	}, [updateStatus]);

	// Send function
	const send = useCallback(
		(data: any) => {
			if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
				try {
					wsRef.current.send(JSON.stringify(data));
					return true;
				} catch (error) {
					handleError(
						error instanceof Error ? error : new Error("Send failed")
					);
					return false;
				}
			}
			return false;
		},
		[handleError]
	);

	// Auto-connect on mount
	useEffect(() => {
		connect();

		return () => {
			isMountedRef.current = false;
			disconnect();
		};
	}, [connect, disconnect]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	return {
		send,
		disconnect,
		connect,
		status,
		lastError,
		reconnectAttempts,
	};
}

/**
 * OHLCV WebSocket hook with incremental update support
 * Consolidated version that handles OHLCV data from the unified WebSocket
 */
export function useOhlcvWebSocket(
	symbol: string,
	timeframe: string
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
		connectionStatus: status,
		reconnect: connect,
		disconnect,
		lastError,
		reconnectAttempts,
	};
}

export default useOhlcvWebSocket;
