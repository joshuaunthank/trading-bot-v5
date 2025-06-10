import React, { useState } from "react";
import { useRobustWebSocket } from "../hooks/useRobustWebSocket";

const WebSocketTest: React.FC = () => {
	const [messages, setMessages] = useState<string[]>([]);
	const [isManuallyDisconnected, setIsManuallyDisconnected] = useState(false);

	const {
		send,
		disconnect,
		connect,
		status,
		lastError,
		reconnectAttempts,
		isUsingFallback,
	} = useRobustWebSocket({
		url: "ws://localhost:3001/ws/ohlcv?symbol=BTC/USDT&timeframe=1h",
		onMessage: (data) => {
			const timestamp = new Date().toLocaleTimeString();
			const messageStr =
				typeof data === "string" ? data : JSON.stringify(data, null, 2);
			setMessages((prev) => [
				...prev.slice(-20),
				`[${timestamp}] Received: ${messageStr}`,
			]);
		},
		onStatusChange: (newStatus) => {
			const timestamp = new Date().toLocaleTimeString();
			setMessages((prev) => [
				...prev.slice(-20),
				`[${timestamp}] Status: ${newStatus}`,
			]);
		},
		onError: (error) => {
			const timestamp = new Date().toLocaleTimeString();
			setMessages((prev) => [
				...prev.slice(-20),
				`[${timestamp}] Error: ${error.message}`,
			]);
		},
		enableFallback: true,
		fallbackPollInterval: 3000,
		maxReconnectAttempts: 3,
		reconnectInterval: 2000,
	});

	const handleConnect = () => {
		setIsManuallyDisconnected(false);
		setMessages((prev) => [
			...prev,
			`[${new Date().toLocaleTimeString()}] Manual connect initiated`,
		]);
		connect();
	};

	const handleDisconnect = () => {
		setIsManuallyDisconnected(true);
		setMessages((prev) => [
			...prev,
			`[${new Date().toLocaleTimeString()}] Manual disconnect initiated`,
		]);
		disconnect();
	};

	const handleSendMessage = () => {
		const testMessage = {
			type: "test",
			message: "Hello from WebSocket Test",
			timestamp: Date.now(),
		};
		const success = send(testMessage);
		const timestamp = new Date().toLocaleTimeString();
		setMessages((prev) => [
			...prev.slice(-20),
			`[${timestamp}] Send ${
				success ? "succeeded" : "failed"
			}: ${JSON.stringify(testMessage)}`,
		]);
	};

	const clearMessages = () => {
		setMessages([]);
	};

	const getStatusColor = () => {
		switch (status) {
			case "connected":
				return "text-green-600";
			case "connecting":
			case "reconnecting":
				return "text-yellow-600";
			case "fallback":
				return "text-blue-600";
			case "disconnected":
				return "text-red-600";
			default:
				return "text-gray-600";
		}
	};

	return (
		<div className="p-4 border rounded-lg bg-gray-100 dark:bg-gray-800">
			<h3 className="text-lg font-semibold mb-4">
				Robust WebSocket Connection Test
			</h3>

			<div className="mb-4 grid grid-cols-2 gap-4">
				<div>
					<span className="font-medium">Status: </span>
					<span
						className={`px-2 py-1 rounded text-sm font-semibold ${getStatusColor()}`}
					>
						{status.toUpperCase()}
					</span>
				</div>
				<div>
					<span className="font-medium">Mode: </span>
					<span
						className={`px-2 py-1 rounded text-sm ${
							isUsingFallback
								? "bg-blue-200 text-blue-800"
								: "bg-gray-200 text-gray-800"
						}`}
					>
						{isUsingFallback ? "REST FALLBACK" : "WEBSOCKET"}
					</span>
				</div>
			</div>

			{reconnectAttempts > 0 && (
				<div className="mb-4 p-2 bg-orange-100 border border-orange-300 rounded">
					<span className="text-orange-800">
						Reconnection attempts: {reconnectAttempts}
					</span>
				</div>
			)}

			{lastError && (
				<div className="mb-4 p-2 bg-red-100 border border-red-300 rounded">
					<span className="text-red-800 text-sm">
						Error: {lastError.message}
					</span>
				</div>
			)}

			<div className="mb-4 space-x-2">
				<button
					onClick={handleConnect}
					disabled={status === "connecting"}
					className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
				>
					{status === "connecting" ? "Connecting..." : "Connect"}
				</button>
				<button
					onClick={handleDisconnect}
					disabled={status === "disconnected" || isManuallyDisconnected}
					className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
				>
					Disconnect
				</button>
				<button
					onClick={handleSendMessage}
					disabled={status !== "connected"}
					className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
				>
					Send Test Message
				</button>
				<button
					onClick={clearMessages}
					className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
				>
					Clear Log
				</button>
			</div>

			<div className="border rounded p-3 bg-white dark:bg-gray-900 max-h-96 overflow-y-auto">
				<h4 className="font-medium mb-2">Message Log:</h4>
				{messages.length === 0 ? (
					<p className="text-gray-500 italic">No messages yet...</p>
				) : (
					<div className="space-y-1">
						{messages.map((message, index) => (
							<div
								key={index}
								className="text-sm font-mono bg-gray-50 dark:bg-gray-800 p-1 rounded"
							>
								{message}
							</div>
						))}
					</div>
				)}
			</div>

			<div className="mt-4 text-xs text-gray-600">
				<p>
					<strong>Testing:</strong> This component tests the robust WebSocket
					implementation that handles RSV1 frame errors.
				</p>
				<p>
					<strong>Fallback:</strong> If WebSocket fails (RSV1 error), it
					automatically switches to REST API polling every 3 seconds.
				</p>
				<p>
					<strong>URL:</strong>{" "}
					ws://localhost:3001/ws/ohlcv?symbol=BTC/USDT&timeframe=1h (CCXT Pro)
				</p>
			</div>
		</div>
	);
};

export default WebSocketTest;
