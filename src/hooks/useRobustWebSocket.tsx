import { useCallback, useEffect, useRef, useState } from "react";

export interface RobustWebSocketConfig {
	url: string;
	onMessage?: (data: any) => void;
	onStatusChange?: (status: string) => void;
	onError?: (error: Error) => void;
	enableFallback?: boolean;
	fallbackPollInterval?: number;
	maxReconnectAttempts?: number;
	reconnectInterval?: number;
}

export interface RobustWebSocketResult {
	send: (data: any) => boolean;
	disconnect: () => void;
	connect: () => void;
	status: string;
	lastError: Error | null;
	reconnectAttempts: number;
	isUsingFallback: boolean;
}

/**
 * Robust WebSocket hook that handles RSV1 errors and implements REST API fallback
 */
export function useRobustWebSocket(
	config: RobustWebSocketConfig
): RobustWebSocketResult {
	const {
		url,
		onMessage,
		onStatusChange,
		onError,
		enableFallback = false, // Disabled by default for WebSocket-only architecture
		fallbackPollInterval = 0,
		maxReconnectAttempts = 3,
		reconnectInterval = 1000, // Reduced from 2000ms for faster reconnection
	} = config;

	const [status, setStatus] = useState<string>("disconnected");
	const [lastError, setLastError] = useState<Error | null>(null);
	const [reconnectAttempts, setReconnectAttempts] = useState(0);
	const [isUsingFallback, setIsUsingFallback] = useState(false);

	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const isMountedRef = useRef(true);
	const reconnectAttemptsRef = useRef(0);

	// Use refs to store callbacks to prevent dependency loops
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

	// Extract symbol and timeframe from WebSocket URL for REST fallback
	const urlParams = new URLSearchParams(url.split("?")[1] || "");
	const symbol = urlParams.get("symbol") || "BTC/USDT";
	const timeframe = urlParams.get("timeframe") || "1h";

	const updateStatus = useCallback((newStatus: string) => {
		setStatus(newStatus);
		onStatusChangeRef.current?.(newStatus);
	}, []);

	const handleError = useCallback((error: Error) => {
		console.error(`[Robust WS] Error:`, error);
		setLastError(error);
		onErrorRef.current?.(error);
	}, []);

	// Skip REST fallback if disabled
	const fetchDataViaRest = useCallback(async () => {
		if (!enableFallback) {
			return;
		}

		try {
			const response = await fetch(
				`/api/v1/ohlcv?symbol=${encodeURIComponent(
					symbol
				)}&timeframe=${encodeURIComponent(timeframe)}&limit=100`
			);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();

			if (data.result && onMessageRef.current) {
				// Transform REST response to match WebSocket message format
				const restMessage = {
					type: "ohlcv_rest",
					symbol,
					timeframe,
					data: data.result,
					timestamp: Date.now(),
				};
				onMessageRef.current(restMessage);
			}

			return true;
		} catch (error) {
			console.error(`[Robust WS] REST fallback failed:`, error);
			handleError(
				error instanceof Error ? error : new Error("REST fallback failed")
			);
			return false;
		}
	}, [symbol, timeframe, handleError]);

	// Start REST polling fallback
	const startFallback = useCallback(() => {
		if (!enableFallback || fallbackIntervalRef.current) {
			return;
		}

		console.log(
			`[Robust WS] Starting REST fallback polling every ${fallbackPollInterval}ms`
		);
		setIsUsingFallback(true);
		updateStatus("fallback");

		// Initial fetch
		fetchDataViaRest();

		// Set up polling
		fallbackIntervalRef.current = setInterval(() => {
			if (isMountedRef.current) {
				fetchDataViaRest();
			}
		}, fallbackPollInterval);
	}, [enableFallback, fallbackPollInterval, fetchDataViaRest, updateStatus]);

	// Stop REST polling fallback
	const stopFallback = useCallback(() => {
		if (fallbackIntervalRef.current) {
			console.log(`[Robust WS] Stopping REST fallback polling`);
			clearInterval(fallbackIntervalRef.current);
			fallbackIntervalRef.current = null;
			setIsUsingFallback(false);
		}
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

		console.log(`[Robust WS] Attempting WebSocket connection to ${url}`);
		updateStatus("connecting");

		try {
			wsRef.current = new WebSocket(url);

			// Set faster connection timeout
			const connectionTimeout = setTimeout(() => {
				if (
					wsRef.current &&
					wsRef.current.readyState === WebSocket.CONNECTING
				) {
					console.log(`[Robust WS] Connection timeout, closing...`);
					wsRef.current.close();
				}
			}, 5000); // 5 second timeout instead of default

			wsRef.current.onopen = () => {
				if (!isMountedRef.current) return;

				clearTimeout(connectionTimeout);
				console.log(`[Robust WS] WebSocket connected successfully`);
				updateStatus("connected");
				setReconnectAttempts(0);
				setLastError(null);

				// Stop fallback when WebSocket is working
				stopFallback();
			};

			wsRef.current.onmessage = (event) => {
				if (!isMountedRef.current) return;

				try {
					const data = JSON.parse(event.data);
					onMessageRef.current?.(data);
				} catch (error) {
					console.warn(`[Robust WS] Failed to parse message:`, event.data);
					onMessageRef.current?.(event.data);
				}
			};

			wsRef.current.onclose = (event) => {
				if (!isMountedRef.current) return;

				console.log(
					`[Robust WS] Connection closed: code=${event.code}, reason=${event.reason}`
				);
				updateStatus("disconnected");

				// Handle RSV1 errors specifically
				if (event.code === 1002) {
					const rsv1Error = new Error(
						"WebSocket RSV1 frame error - incompatibility detected"
					);
					handleError(rsv1Error);
					console.warn(
						`[Robust WS] RSV1 error detected, switching to fallback mode`
					);

					if (enableFallback) {
						startFallback();
						return; // Don't attempt reconnection for RSV1 errors
					}
				}

				// Attempt reconnection for other errors
				if (reconnectAttemptsRef.current < maxReconnectAttempts) {
					const nextAttempt = reconnectAttemptsRef.current + 1;
					setReconnectAttempts(nextAttempt);

					const delay = reconnectInterval * Math.pow(1.5, nextAttempt - 1);
					console.log(
						`[Robust WS] Reconnection attempt ${nextAttempt}/${maxReconnectAttempts} in ${delay}ms`
					);

					updateStatus("reconnecting");
					reconnectTimeoutRef.current = setTimeout(() => {
						if (isMountedRef.current) {
							connect();
						}
					}, delay);
				} else {
					console.warn(
						`[Robust WS] Max reconnection attempts reached, switching to fallback`
					);
					handleError(new Error("Max WebSocket reconnection attempts reached"));

					if (enableFallback) {
						startFallback();
					}
				}
			};

			wsRef.current.onerror = (event) => {
				if (!isMountedRef.current) return;

				console.error(`[Robust WS] WebSocket error:`, event);
				handleError(new Error("WebSocket connection error"));
			};
		} catch (error) {
			console.error(`[Robust WS] Failed to create WebSocket:`, error);
			handleError(
				error instanceof Error ? error : new Error("Failed to create WebSocket")
			);

			if (enableFallback) {
				startFallback();
			}
		}
	}, [
		url,
		updateStatus,
		handleError,
		maxReconnectAttempts,
		reconnectInterval,
		enableFallback,
		startFallback,
		stopFallback,
	]);

	// Disconnect function
	const disconnect = useCallback(() => {
		console.log(`[Robust WS] Manually disconnecting`);

		// Clear timeouts
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}

		// Stop fallback
		stopFallback();

		// Close WebSocket
		if (wsRef.current) {
			wsRef.current.close(1000, "Manual disconnect");
		}

		// Reset state
		setReconnectAttempts(maxReconnectAttempts); // Prevent auto-reconnection
		updateStatus("disconnected");
	}, [maxReconnectAttempts, stopFallback, updateStatus]);

	// Send function
	const send = useCallback(
		(data: any) => {
			if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
				try {
					const message =
						typeof data === "string" ? data : JSON.stringify(data);
					wsRef.current.send(message);
					return true;
				} catch (error) {
					console.error(`[Robust WS] Failed to send message:`, error);
					handleError(
						error instanceof Error ? error : new Error("Failed to send message")
					);
					return false;
				}
			} else {
				console.warn(
					`[Robust WS] Cannot send message - WebSocket not connected, using fallback`
				);
				if (enableFallback && !isUsingFallback) {
					startFallback();
				}
				return false;
			}
		},
		[handleError, enableFallback, isUsingFallback, startFallback]
	);

	// Initialize connection on mount
	useEffect(() => {
		isMountedRef.current = true;
		connect();

		return () => {
			isMountedRef.current = false;
			disconnect();
		};
	}, []); // Empty dependency array to prevent loops

	return {
		send,
		disconnect,
		connect,
		status,
		lastError,
		reconnectAttempts,
		isUsingFallback,
	};
}
