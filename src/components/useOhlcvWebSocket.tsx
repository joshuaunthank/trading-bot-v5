import { useEffect, useRef, useState, useCallback } from "react";

export type OhlcvCandle = {
	timestamp: number;
	currentPrice: number;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
};

export function useOhlcvWebSocket(symbol: string, timeframe: string) {
	const [status, setStatus] = useState<string>("disconnected");
	const [candle, setCandle] = useState<OhlcvCandle | null>(null);
	const wsRef = useRef<WebSocket | null>(null);

	const connect = useCallback(() => {
		if (wsRef.current) wsRef.current.close();
		const wsUrl = `ws://${
			window.location.hostname
		}:3001/ws/ohlcv?symbol=${encodeURIComponent(
			symbol
		)}&timeframe=${encodeURIComponent(timeframe)}`;
		const ws = new WebSocket(wsUrl);
		wsRef.current = ws;
		setStatus("connecting");
		ws.onopen = () => setStatus("connected");
		ws.onclose = () => setStatus("closed");
		ws.onerror = () => setStatus("error");
		ws.onmessage = (event) => {
			try {
				const msg = JSON.parse(event.data);
				if (msg.type === "ohlcv") setCandle(msg);
			} catch {}
		};
	}, [symbol, timeframe]);

	useEffect(() => {
		connect();
		return () => {
			if (wsRef.current) wsRef.current.close();
		};
	}, [connect]);

	return { status, candle };
}
