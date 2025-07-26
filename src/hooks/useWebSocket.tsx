import { useEffect, useState, useRef, useCallback } from "react";
import { getWebSocketUrl } from "../utils/websocket";

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

		// Don't connect if already connected to the same URL
		if (
			wsRef.current &&
			wsRef.current.readyState === WebSocket.OPEN &&
			wsRef.current.url === url
		) {
			if (process.env.NODE_ENV === "development") {
				console.log(`[WebSocket] Already connected to ${url}`);
			}
			return;
		}

		// Don't connect if currently connecting
		if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
			if (process.env.NODE_ENV === "development") {
				console.log(`[WebSocket] Already connecting to ${url}`);
			}
			return;
		}

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
						`[WebSocket] Connection closed (code: ${event.code}, reason: ${
							event.reason || "no reason"
						})`
					);
				}

				updateStatus("disconnected");

				// Don't reconnect for normal closures or if we're exceeding max attempts
				// Code 1005 indicates no status received (common when server closes immediately)
				if (
					event.code === 1000 || // Normal closure
					event.code === 1001 || // Going away
					event.code === 1005 || // No status received (server closed immediately)
					reconnectAttemptsRef.current >= maxReconnectAttempts
				) {
					if (process.env.NODE_ENV === "development") {
						console.log(
							`[WebSocket] Not attempting reconnection (code: ${event.code})`
						);
					}
					return;
				}

				// Exponential backoff for reconnection attempts
				const nextAttempt = reconnectAttemptsRef.current + 1;
				setReconnectAttempts(nextAttempt);
				reconnectAttemptsRef.current = nextAttempt;

				const delay = Math.min(
					reconnectInterval * Math.pow(2, nextAttempt - 1),
					30000
				);

				if (process.env.NODE_ENV === "development") {
					console.log(
						`[WebSocket] Scheduling reconnection attempt ${nextAttempt}/${maxReconnectAttempts} in ${delay}ms`
					);
				}
				updateStatus("reconnecting");

				reconnectTimeoutRef.current = setTimeout(() => {
					if (isMountedRef.current) {
						connect();
					}
				}, delay);
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

	// Auto-connect on mount and reconnect when URL changes
	useEffect(() => {
		// Don't reconnect if we're already connected to the same URL
		if (
			wsRef.current &&
			wsRef.current.readyState === WebSocket.OPEN &&
			wsRef.current.url === url
		) {
			if (process.env.NODE_ENV === "development") {
				console.log(
					`[WebSocket] Already connected to ${url}, skipping reconnect`
				);
			}
			return;
		}

		if (process.env.NODE_ENV === "development") {
			console.log(
				`[WebSocket] URL changed or initial mount, will connect to: ${url}`
			);
		}

		// Disconnect from previous URL first
		disconnect();

		// Small delay to ensure proper cleanup of previous connection
		const timer = setTimeout(() => {
			if (
				isMountedRef.current &&
				(!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)
			) {
				if (process.env.NODE_ENV === "development") {
					console.log(`[WebSocket] Connecting to: ${url}`);
				}
				connect();
			}
		}, 200); // Increased delay to prevent rapid reconnections

		return () => {
			clearTimeout(timer);
		};
	}, [url]); // Only depend on URL, not connect/disconnect functions

	// Cleanup on unmount only
	useEffect(() => {
		return () => {
			isMountedRef.current = false;
		};
	}, []); // Empty dependency array - only runs on unmount

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
				} else if (
					data.updateType === "incremental" &&
					Array.isArray(data.data)
				) {
					// Server now sends full dataset for both full and incremental updates
					// Extract the latest candle for incremental updates
					if (data.data.length > 0) {
						const latestCandle = data.data[data.data.length - 1]; // Last item is newest
						setLatestCandle(latestCandle);
					}
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
	const wsUrl = `${getWebSocketUrl("/ws/ohlcv")}?symbol=${encodeURIComponent(
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
