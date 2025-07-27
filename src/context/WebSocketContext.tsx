import React, {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { getWebSocketUrl } from "../utils/websocket";
import { useStrategy } from "./StrategyContext";

export interface OHLCVData {
	timestamp: number;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
}

export interface IndicatorData {
	[key: string]: number | undefined;
}

export interface StrategyStatusData {
	strategyId: string;
	status: "running" | "stopped" | "error";
	lastSignal?: string;
	performance?: {
		totalTrades: number;
		winRate: number;
		totalReturn: number;
	};
}

interface WebSocketMessage {
	type: "ohlcv" | "indicators" | "strategy_status";
	data: OHLCVData[] | IndicatorData | StrategyStatusData;
	updateType?: "full" | "incremental";
}

interface WebSocketContextType {
	ohlcvData: OHLCVData[];
	indicatorData: IndicatorData;
	strategyStatus: StrategyStatusData | null;
	connectionStatus: "connecting" | "connected" | "disconnected" | "error";
	sendMessage: (message: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
	undefined
);

export const useWebSocket = () => {
	const context = useContext(WebSocketContext);
	if (!context) {
		throw new Error("useWebSocket must be used within a WebSocketProvider");
	}
	return context;
};

interface WebSocketProviderProps {
	children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
	children,
}) => {
	const { selectedStrategyId } = useStrategy();
	const [ohlcvData, setOhlcvData] = useState<OHLCVData[]>([]);
	const [indicatorData, setIndicatorData] = useState<IndicatorData>({});
	const [strategyStatus, setStrategyStatus] =
		useState<StrategyStatusData | null>(null);
	const [connectionStatus, setConnectionStatus] = useState<
		"connecting" | "connected" | "disconnected" | "error"
	>("disconnected");

	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const reconnectAttempts = useRef(0);
	const maxReconnectAttempts = 5;

	const sendMessage = (message: any) => {
		if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify(message));
		} else {
			console.warn("WebSocket not connected, cannot send message:", message);
		}
	};

	const connect = () => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			return;
		}

		setConnectionStatus("connecting");

		// Build WebSocket URL with strategy parameter
		const baseUrl = getWebSocketUrl("/ws/ohlcv");
		const url = selectedStrategyId
			? `${baseUrl}?symbol=BTC/USDT&timeframe=1h&strategy=${selectedStrategyId}`
			: `${baseUrl}?symbol=BTC/USDT&timeframe=1h`;

		console.log("[SharedWebSocket] Connecting to:", url);

		const ws = new WebSocket(url);
		wsRef.current = ws;

		ws.onopen = () => {
			console.log("[SharedWebSocket] Connected successfully");
			setConnectionStatus("connected");
			reconnectAttempts.current = 0;

			// Send initial subscription message
			ws.send(
				JSON.stringify({
					type: "subscribe",
					symbol: "BTC/USDT",
					timeframe: "1h",
					strategy: selectedStrategyId || undefined,
				})
			);
		};

		ws.onmessage = (event) => {
			try {
				const message: any = JSON.parse(event.data);

				switch (message.type) {
					case "ohlcv":
						const newOhlcvData = message.data as OHLCVData[];

						// Handle OHLCV data updates
						if (message.updateType === "full") {
							setOhlcvData(newOhlcvData);
						} else if (
							message.updateType === "incremental" &&
							newOhlcvData.length > 0
						) {
							setOhlcvData((prev) => {
								const updated = [...prev];
								const latestCandle = newOhlcvData[0];

								if (updated.length > 0) {
									// Update the last candle with new data
									updated[updated.length - 1] = latestCandle;
								} else {
									updated.push(latestCandle);
								}

								return updated;
							});
						}

						// Handle indicators data if present in the OHLCV message
						if (message.indicators && typeof message.indicators === "object") {
							console.log(
								"[WebSocket] Received indicators in OHLCV message:",
								Object.keys(message.indicators)
							);
							setIndicatorData(message.indicators as IndicatorData);
						}
						break;

					case "indicators":
						console.log("[WebSocket] Received standalone indicators message");
						setIndicatorData(message.data as IndicatorData);
						break;

					case "strategy_status":
						setStrategyStatus(message.data as StrategyStatusData);
						break;

					default:
						console.warn(
							"[SharedWebSocket] Unknown message type:",
							message.type
						);
				}
			} catch (error) {
				console.error("[SharedWebSocket] Error parsing message:", error);
			}
		};

		ws.onerror = (error) => {
			console.error("[SharedWebSocket] WebSocket error:", error);
			setConnectionStatus("error");
		};

		ws.onclose = (event) => {
			console.log(
				"[SharedWebSocket] Connection closed:",
				event.code,
				event.reason
			);
			setConnectionStatus("disconnected");

			// Attempt to reconnect unless it was a clean close
			if (
				event.code !== 1000 &&
				reconnectAttempts.current < maxReconnectAttempts
			) {
				const delay = Math.min(
					1000 * Math.pow(2, reconnectAttempts.current),
					10000
				);
				console.log(
					`[SharedWebSocket] Reconnecting in ${delay}ms (attempt ${
						reconnectAttempts.current + 1
					}/${maxReconnectAttempts})`
				);

				reconnectTimeoutRef.current = setTimeout(() => {
					reconnectAttempts.current++;
					connect();
				}, delay);
			}
		};
	};

	const disconnect = () => {
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}

		if (wsRef.current) {
			wsRef.current.close(1000, "Component unmounting");
			wsRef.current = null;
		}

		setConnectionStatus("disconnected");
	};

	// Connect on mount and when strategy changes
	useEffect(() => {
		connect();

		return () => {
			disconnect();
		};
	}, [selectedStrategyId]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			disconnect();
		};
	}, []);

	const contextValue: WebSocketContextType = {
		ohlcvData,
		indicatorData,
		strategyStatus,
		connectionStatus,
		sendMessage,
	};

	return (
		<WebSocketContext.Provider value={contextValue}>
			{children}
		</WebSocketContext.Provider>
	);
};
