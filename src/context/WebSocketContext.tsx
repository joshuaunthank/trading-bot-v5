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
	[key: string]: {
		id: string;
		name: string;
		type: string;
		data: Array<{ x: number; y: number | null }>;
	};
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
			const subscriptionMessage = {
				type: "subscribe",
				symbol: "BTC/USDT",
				timeframe: "1h",
				strategy: selectedStrategyId || undefined,
			};

			console.log(
				"[SharedWebSocket] Sending subscription:",
				subscriptionMessage
			);
			ws.send(JSON.stringify(subscriptionMessage));

			// Request full historical data to ensure we get complete indicator datasets
			setTimeout(() => {
				if (ws.readyState === WebSocket.OPEN) {
					const refreshMessage = {
						type: "requestFullData",
						symbol: "BTC/USDT",
						timeframe: "1h",
						strategy: selectedStrategyId || undefined,
					};
					console.log(
						"[SharedWebSocket] Requesting full data refresh:",
						refreshMessage
					);
					ws.send(JSON.stringify(refreshMessage));
				}
			}, 100); // Small delay to ensure server is ready
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
							console.log(
								"[WebSocket] Raw indicators data:",
								message.indicators
							);
							console.log(
								"[WebSocket] Raw indicators type:",
								typeof message.indicators
							);

							// Enhanced validation
							const indicatorKeys = Object.keys(message.indicators);
							console.log("[WebSocket] Indicator validation:");
							indicatorKeys.forEach((key) => {
								const indicator = message.indicators[key];
								console.log(
									`  - ${key}: ${
										indicator?.data?.length || 0
									} data points, type: ${indicator?.type || "unknown"}`
								);
								if (indicator?.data?.length > 0) {
									const validPoints = indicator.data.filter(
										(d: any) => d.y !== null && !isNaN(d.y)
									).length;
									console.log(
										`    Valid points: ${validPoints}/${indicator.data.length}`
									);
								}
							});

							console.log(
								"[WebSocket] Sample indicator structure:",
								Object.values(message.indicators)[0]
							);

							// Determine if this is full or incremental indicator data
							const sampleIndicator = Object.values(
								message.indicators
							)[0] as any;
							const isFullFormat =
								sampleIndicator &&
								typeof sampleIndicator === "object" &&
								"id" in sampleIndicator &&
								"data" in sampleIndicator &&
								Array.isArray(sampleIndicator.data);

							const isIncrementalFormat =
								sampleIndicator &&
								typeof sampleIndicator === "object" &&
								"x" in sampleIndicator &&
								"y" in sampleIndicator;

							console.log(
								`[WebSocket] Indicator format: ${
									isFullFormat
										? "FULL"
										: isIncrementalFormat
										? "INCREMENTAL"
										: "UNKNOWN"
								}`
							);

							if (isFullFormat) {
								// Full format - replace all indicator data
								console.log("[WebSocket] ✅ Setting full indicator data");
								setIndicatorData(message.indicators as IndicatorData);
							} else if (isIncrementalFormat) {
								// Incremental format - merge with existing data
								console.log(
									"[WebSocket] ⚡ Merging incremental indicator data"
								);
								setIndicatorData((prevIndicators) => {
									const updatedIndicators = { ...prevIndicators };

									Object.entries(message.indicators).forEach(
										([key, incrementalValue]) => {
											if (
												typeof incrementalValue === "object" &&
												incrementalValue &&
												"x" in incrementalValue &&
												"y" in incrementalValue
											) {
												const point = incrementalValue as {
													x: number;
													y: number;
												};

												if (updatedIndicators[key]) {
													// Update existing indicator - append/update latest point
													const existingIndicator = updatedIndicators[
														key
													] as any;
													if (
														existingIndicator.data &&
														Array.isArray(existingIndicator.data)
													) {
														// Update the last point in the existing data array
														const updatedData = [...existingIndicator.data];
														if (updatedData.length > 0) {
															// Replace the last point with the new incremental value
															updatedData[updatedData.length - 1] = point;
														} else {
															// If no existing data, add the point
															updatedData.push(point);
														}

														updatedIndicators[key] = {
															...existingIndicator,
															data: updatedData,
														};
														console.log(
															`[WebSocket] Updated ${key}: ${updatedData.length} total points`
														);
													}
												} else {
													// Create new indicator from incremental data (should not normally happen)
													console.warn(
														`[WebSocket] Creating new indicator ${key} from incremental data`
													);
													updatedIndicators[key] = {
														id: key,
														name: key,
														type: "unknown",
														data: [point],
													};
												}
											}
										}
									);

									return updatedIndicators;
								});
							} else {
								// Unknown format - fallback to direct assignment
								console.warn(
									"[WebSocket] Unknown indicator format, using direct assignment"
								);
								setIndicatorData(message.indicators as IndicatorData);
							}
						}
						break;

					case "indicators":
						console.log("[WebSocket] Received standalone indicators message");
						console.log(
							"[WebSocket] Standalone indicators data:",
							message.data
						);
						console.log(
							"[WebSocket] Standalone indicators type:",
							typeof message.data
						);
						console.log(
							"[WebSocket] Standalone indicators keys:",
							Object.keys(message.data || {})
						);
						console.log(
							"[WebSocket] Sample standalone indicator structure:",
							Object.values(message.data || {})[0]
						);

						// Apply same full/incremental logic for standalone indicators
						if (message.data && typeof message.data === "object") {
							const sampleIndicator = Object.values(message.data)[0] as any;
							const isFullFormat =
								sampleIndicator &&
								typeof sampleIndicator === "object" &&
								"id" in sampleIndicator &&
								"data" in sampleIndicator &&
								Array.isArray(sampleIndicator.data);

							const isIncrementalFormat =
								sampleIndicator &&
								typeof sampleIndicator === "object" &&
								"x" in sampleIndicator &&
								"y" in sampleIndicator;

							console.log(
								`[WebSocket] Standalone format: ${
									isFullFormat
										? "FULL"
										: isIncrementalFormat
										? "INCREMENTAL"
										: "UNKNOWN"
								}`
							);

							if (isFullFormat) {
								// Full format - replace all indicator data
								console.log(
									"[WebSocket] ✅ Setting full standalone indicator data"
								);
								setIndicatorData(message.data as IndicatorData);
							} else if (isIncrementalFormat) {
								// Incremental format - merge with existing data
								console.log(
									"[WebSocket] ⚡ Merging incremental standalone indicator data"
								);
								setIndicatorData((prevIndicators) => {
									const updatedIndicators = { ...prevIndicators };

									Object.entries(message.data).forEach(
										([key, incrementalValue]) => {
											if (
												typeof incrementalValue === "object" &&
												incrementalValue &&
												"x" in incrementalValue &&
												"y" in incrementalValue
											) {
												const point = incrementalValue as {
													x: number;
													y: number;
												};

												if (updatedIndicators[key]) {
													// Update existing indicator - append/update latest point
													const existingIndicator = updatedIndicators[
														key
													] as any;
													if (
														existingIndicator.data &&
														Array.isArray(existingIndicator.data)
													) {
														// Update the last point in the existing data array
														const updatedData = [...existingIndicator.data];
														if (updatedData.length > 0) {
															// Replace the last point with the new incremental value
															updatedData[updatedData.length - 1] = point;
														} else {
															// If no existing data, add the point
															updatedData.push(point);
														}

														updatedIndicators[key] = {
															...existingIndicator,
															data: updatedData,
														};
														console.log(
															`[WebSocket] Updated standalone ${key}: ${updatedData.length} total points`
														);
													}
												} else {
													// Create new indicator from incremental data
													console.warn(
														`[WebSocket] Creating new standalone indicator ${key} from incremental data`
													);
													updatedIndicators[key] = {
														id: key,
														name: key,
														type: "unknown",
														data: [point],
													};
												}
											}
										}
									);

									return updatedIndicators;
								});
							} else {
								// Unknown format - fallback to direct assignment
								console.warn(
									"[WebSocket] Unknown standalone indicator format, using direct assignment"
								);
								setIndicatorData(message.data as IndicatorData);
							}
						}
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
