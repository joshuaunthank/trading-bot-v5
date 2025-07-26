import { useEffect, useRef, useCallback, useState } from "react";
import { getWebSocketUrl } from "../utils/websocket";

interface IndicatorData {
	id: string;
	type: string;
	values: number[];
	timestamps: number[];
	parameters: Record<string, any>;
}

interface ChartUpdateHookProps {
	symbol: string;
	timeframe: string;
	indicators: Array<{
		id: string;
		type: string;
		parameters: Record<string, any>;
		enabled: boolean;
		visible: boolean;
	}>;
}

export const useRealTimeChartUpdates = ({
	symbol,
	timeframe,
	indicators,
}: ChartUpdateHookProps) => {
	const [chartData, setChartData] = useState<any[]>([]);
	const [indicatorData, setIndicatorData] = useState<
		Record<string, IndicatorData>
	>({});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const wsRef = useRef<WebSocket | null>(null);
	const retryCount = useRef(0);
	const maxRetries = 3;

	// Calculate indicators for current OHLCV data
	const calculateIndicators = useCallback(
		async (ohlcvData: any[]) => {
			if (!ohlcvData.length || !indicators.length) return {};

			const results: Record<string, IndicatorData> = {};

			try {
				// Calculate each enabled indicator
				for (const indicator of indicators.filter((i) => i.enabled)) {
					const response = await fetch("/api/v1/indicators/calculate", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							type: indicator.type,
							parameters: indicator.parameters,
							data: ohlcvData,
						}),
					});

					if (response.ok) {
						const result = await response.json();
						results[indicator.id] = {
							id: indicator.id,
							type: indicator.type,
							values: result.values,
							timestamps: result.timestamps,
							parameters: indicator.parameters,
						};
					}
				}
			} catch (err) {
				console.error("Failed to calculate indicators:", err);
			}

			return results;
		},
		[indicators]
	);

	// WebSocket connection for real-time data
	const connectWebSocket = useCallback(() => {
		if (wsRef.current?.readyState === WebSocket.OPEN) return;

		try {
			wsRef.current = new WebSocket(getWebSocketUrl("/ws/ohlcv"));

			wsRef.current.onopen = () => {
				console.log("[Chart Updates] WebSocket connected");
				retryCount.current = 0;
				setError(null);

				// Subscribe to symbol/timeframe
				wsRef.current?.send(
					JSON.stringify({
						action: "subscribe",
						symbol,
						timeframe,
					})
				);
			};

			wsRef.current.onmessage = async (event) => {
				try {
					const data = JSON.parse(event.data);

					if (data.type === "ohlcv_data") {
						setChartData(data.candles);

						// Calculate indicators for updated data
						if (indicators.length > 0) {
							setLoading(true);
							const indicatorResults = await calculateIndicators(data.candles);
							setIndicatorData(indicatorResults);
							setLoading(false);
						}
					}
				} catch (err) {
					console.error(
						"[Chart Updates] Failed to process WebSocket message:",
						err
					);
				}
			};

			wsRef.current.onerror = (error) => {
				console.error("[Chart Updates] WebSocket error:", error);
				setError("Connection error - retrying...");
			};

			wsRef.current.onclose = () => {
				console.log("[Chart Updates] WebSocket disconnected");

				// Retry connection if not intentional
				if (retryCount.current < maxRetries) {
					retryCount.current++;
					setTimeout(() => {
						console.log(
							`[Chart Updates] Retrying connection (${retryCount.current}/${maxRetries})`
						);
						connectWebSocket();
					}, 2000 * retryCount.current);
				} else {
					setError("Connection lost - please refresh");
				}
			};
		} catch (err) {
			console.error("[Chart Updates] Failed to create WebSocket:", err);
			setError("Failed to connect to data stream");
		}
	}, [symbol, timeframe, calculateIndicators, indicators]);

	// Initialize WebSocket connection
	useEffect(() => {
		connectWebSocket();

		return () => {
			if (wsRef.current) {
				wsRef.current.close();
				wsRef.current = null;
			}
		};
	}, [connectWebSocket]);

	// Recalculate indicators when they change
	useEffect(() => {
		if (chartData.length > 0 && indicators.length > 0) {
			setLoading(true);
			calculateIndicators(chartData).then((results) => {
				setIndicatorData(results);
				setLoading(false);
			});
		} else {
			setIndicatorData({});
		}
	}, [indicators, chartData, calculateIndicators]);

	// Manual refresh function
	const refreshData = useCallback(() => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(
				JSON.stringify({
					action: "refresh",
					symbol,
					timeframe,
				})
			);
		} else {
			connectWebSocket();
		}
	}, [symbol, timeframe, connectWebSocket]);

	// Get indicator data for chart overlay
	const getIndicatorDataForChart = useCallback(() => {
		return Object.values(indicatorData).filter((data) => {
			const indicator = indicators.find((i) => i.id === data.id);
			return indicator?.visible;
		});
	}, [indicatorData, indicators]);

	return {
		chartData,
		indicatorData: getIndicatorDataForChart(),
		loading,
		error,
		refreshData,
		isConnected: wsRef.current?.readyState === WebSocket.OPEN,
	};
};
