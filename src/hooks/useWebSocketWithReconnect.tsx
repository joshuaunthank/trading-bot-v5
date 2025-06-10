import { useState, useEffect, useRef, useCallback } from "react";

interface WebSocketHookOptions {
	reconnectInterval?: number;
	maxReconnectAttempts?: number;
	onMessage?: (data: any) => void;
	onOpen?: () => void;
	onClose?: () => void;
	onError?: (event: Event) => void;
	protocols?: string | string[];
}

interface WebSocketHookResult {
	sendMessage: (data: any) => void;
	lastMessage: any;
	readyState: number;
	connectionStatus:
		| "connecting"
		| "open"
		| "closing"
		| "closed"
		| "reconnecting";
	reconnectAttempts: number;
	disconnect: () => void;
	connect: () => void;
}

const useWebSocketWithReconnect = (
	url: string,
	options: WebSocketHookOptions = {}
): WebSocketHookResult => {
	const {
		reconnectInterval = 3000, // Increased interval
		maxReconnectAttempts = 5,
		onMessage,
		onOpen,
		onClose,
		onError,
		protocols,
	} = options;

	const [lastMessage, setLastMessage] = useState<any>(null);
	const [readyState, setReadyState] = useState<number>(WebSocket.CLOSED);
	const [connectionStatus, setConnectionStatus] = useState<
		"connecting" | "open" | "closing" | "closed" | "reconnecting"
	>("closed");
	const [reconnectAttempts, setReconnectAttempts] = useState(0);

	const webSocketRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const manuallyDisconnected = useRef<boolean>(false);
	const isConnecting = useRef<boolean>(false);
	const isMounted = useRef<boolean>(true);

	// Connection function
	const connect = useCallback(() => {
		// Prevent multiple simultaneous connection attempts
		if (isConnecting.current || !isMounted.current) {
			console.log(
				`[WS] Connect blocked - isConnecting: ${isConnecting.current}, isMounted: ${isMounted.current}`
			);
			return;
		}

		console.log(`[WS] Attempting to connect to ${url}`);

		// Clear any existing timeouts
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}

		// Reset manual disconnect flag
		manuallyDisconnected.current = false;
		isConnecting.current = true;

		try {
			// Close existing connection if any
			if (
				webSocketRef.current &&
				webSocketRef.current.readyState !== WebSocket.CLOSED
			) {
				console.log(
					`[WS] Closing existing connection (state: ${webSocketRef.current.readyState})`
				);
				webSocketRef.current.close();
			}

			// Create new connection
			console.log(`[WS] Creating new WebSocket connection to ${url}`);
			setConnectionStatus("connecting");
			webSocketRef.current = new WebSocket(url, protocols);

			webSocketRef.current.onopen = (event) => {
				if (!isMounted.current) {
					console.log(`[WS] Connection opened but component unmounted`);
					return;
				}

				console.log(`[WS] Connection opened successfully to ${url}`);
				isConnecting.current = false;
				setReadyState(WebSocket.OPEN);
				setConnectionStatus("open");
				setReconnectAttempts(0);
				if (onOpen) onOpen();
			};

			webSocketRef.current.onclose = (event) => {
				if (!isMounted.current) {
					console.log(`[WS] Connection closed but component unmounted`);
					return;
				}

				console.log(
					`[WS] Connection closed - Code: ${event.code}, Reason: ${event.reason}, Clean: ${event.wasClean}`
				);
				isConnecting.current = false;
				setReadyState(WebSocket.CLOSED);
				setConnectionStatus("closed");
				if (onClose) onClose();

				// If not manually disconnected and haven't exceeded max attempts, try to reconnect
				if (!manuallyDisconnected.current) {
					setReconnectAttempts((prev) => {
						const newAttempts = prev + 1;
						console.log(
							`[WS] Reconnect attempt ${newAttempts}/${maxReconnectAttempts} for ${url}`
						);
						if (newAttempts <= maxReconnectAttempts && isMounted.current) {
							setConnectionStatus("reconnecting");
							reconnectTimeoutRef.current = setTimeout(() => {
								if (isMounted.current) {
									console.log(
										`[WS] Executing reconnect attempt ${newAttempts} for ${url}`
									);
									connect();
								}
							}, reconnectInterval);
						} else {
							console.log(
								`[WS] Max reconnection attempts (${maxReconnectAttempts}) reached for ${url}`
							);
						}
						return newAttempts;
					});
				} else {
					console.log(
						`[WS] Not reconnecting - manually disconnected from ${url}`
					);
				}
			};

			webSocketRef.current.onmessage = (event) => {
				if (!isMounted.current) return;

				try {
					const data = JSON.parse(event.data);
					setLastMessage(data);
					if (onMessage) onMessage(data);
				} catch (error) {
					console.error(
						`[WS] Failed to parse WebSocket message from ${url}:`,
						error,
						event.data
					);
					setLastMessage(event.data);
					if (onMessage) onMessage(event.data);
				}
			};

			webSocketRef.current.onerror = (event) => {
				if (!isMounted.current) return;

				console.error(`[WS] WebSocket error for ${url}:`, event);
				isConnecting.current = false;
				if (onError) onError(event);
			};
		} catch (error) {
			console.error(`[WS] WebSocket connection error for ${url}:`, error);
			isConnecting.current = false;
			if (!isMounted.current) return;

			setConnectionStatus("closed");

			// Try to reconnect on error
			if (!manuallyDisconnected.current) {
				setReconnectAttempts((prev) => {
					const newAttempts = prev + 1;
					console.log(
						`[WS] Reconnect on error attempt ${newAttempts}/${maxReconnectAttempts} for ${url}`
					);
					if (newAttempts <= maxReconnectAttempts && isMounted.current) {
						setConnectionStatus("reconnecting");
						reconnectTimeoutRef.current = setTimeout(() => {
							if (isMounted.current) {
								console.log(
									`[WS] Executing error reconnect attempt ${newAttempts} for ${url}`
								);
								connect();
							}
						}, reconnectInterval);
					}
					return newAttempts;
				});
			}
		}
	}, [
		url,
		protocols,
		reconnectInterval,
		maxReconnectAttempts,
		onOpen,
		onClose,
		onMessage,
		onError,
	]);

	// Disconnect function
	const disconnect = useCallback(() => {
		console.log(`[WS] Manually disconnecting from ${url}`);
		manuallyDisconnected.current = true;
		isConnecting.current = false;

		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}

		if (
			webSocketRef.current &&
			webSocketRef.current.readyState !== WebSocket.CLOSED
		) {
			setConnectionStatus("closing");
			webSocketRef.current.close();
		}
	}, [url]);

	// Send message function
	const sendMessage = useCallback((data: any) => {
		if (
			webSocketRef.current &&
			webSocketRef.current.readyState === WebSocket.OPEN
		) {
			const message = typeof data === "string" ? data : JSON.stringify(data);
			webSocketRef.current.send(message);
			return true;
		}
		return false;
	}, []);

	// Connect on mount, disconnect on unmount
	useEffect(() => {
		isMounted.current = true;

		// Add a small delay to prevent immediate reconnection loops
		const connectTimeout = setTimeout(() => {
			if (isMounted.current) {
				connect();
			}
		}, 100);

		return () => {
			isMounted.current = false;
			clearTimeout(connectTimeout);
			disconnect();
		};
	}, [connect, disconnect]);

	// Update readyState when webSocketRef changes
	useEffect(() => {
		if (webSocketRef.current) {
			setReadyState(webSocketRef.current.readyState);
		}
	}, [webSocketRef.current?.readyState]);

	return {
		sendMessage,
		lastMessage,
		readyState,
		connectionStatus,
		reconnectAttempts,
		disconnect,
		connect,
	};
};

export default useWebSocketWithReconnect;
