import { WebSocketServer, WebSocket as WsWebSocket } from "ws";
import * as http from "http";

/**
 * Simple WebSocket server implementation to test basic connectivity
 * This version avoids complex message forwarding and focuses on connection stability
 */

let wss: WebSocketServer | null = null;

export function setupSimpleOhlcvWebSocket(server: http.Server) {
	console.log("[WS Simple] Setting up simple WebSocket server");

	if (wss) {
		console.log("[WS Simple] WebSocketServer already initialized");
		return;
	}

	wss = new WebSocketServer({
		server,
		path: "/ws/ohlcv",
		perMessageDeflate: false, // Disable compression
		clientTracking: true,
	});

	console.log("[WS Simple] Simple WebSocketServer created at /ws/ohlcv");

	wss.on("connection", (ws, req) => {
		const clientId = Math.random().toString(36).substr(2, 9);
		console.log(`[WS Simple] New client connection (ID: ${clientId})`);

		// Extract connection parameters
		const url = new URL(req.url || "", "http://localhost");
		const symbol = url.searchParams.get("symbol") || "BTC/USDT";
		const timeframe = url.searchParams.get("timeframe") || "1h";

		console.log(
			`[WS Simple] Client ${clientId} connected for ${symbol} ${timeframe}`
		);

		// COMPLETELY DISABLE INITIAL MESSAGE - Test if this prevents RSV1 error
		console.log(
			`[WS Simple] Client ${clientId} connection established, staying silent initially`
		);

		// Send a simple test message immediately to verify connection
		// const testMessage = "hello"; // Send plain string instead of JSON

		// try {
		//	ws.send(testMessage);
		//	console.log(`[WS Simple] Simple test message sent to client ${clientId}`);
		// } catch (error) {
		//	console.error(
		//		`[WS Simple] Error sending test message to ${clientId}:`,
		//		error
		//	);
		// }

		// TEMPORARILY DISABLE HEARTBEAT - Keep connection completely quiet
		// Send periodic heartbeat messages
		/*
		const heartbeatInterval = setInterval(() => {
			if (ws.readyState === WsWebSocket.OPEN) {
				try {
					const heartbeat = JSON.stringify({
						type: "heartbeat",
						timestamp: Date.now(),
						clientId,
					});
					ws.send(heartbeat);
					console.log(`[WS Simple] Heartbeat sent to client ${clientId}`);
				} catch (error) {
					console.error(
						`[WS Simple] Error sending heartbeat to ${clientId}:`,
						error
					);
					clearInterval(heartbeatInterval);
				}
			} else {
				console.log(
					`[WS Simple] Client ${clientId} not open, stopping heartbeat`
				);
				clearInterval(heartbeatInterval);
			}
		}, 5000); // Send heartbeat every 5 seconds
		*/

		let heartbeatInterval: NodeJS.Timeout | null = null; // Placeholder for cleanup

		// Handle incoming messages - JUST LOG, NO RESPONSE to test RSV1 timing
		ws.on("message", (data) => {
			try {
				const message = JSON.parse(data.toString());
				console.log(`[WS Simple] Message from client ${clientId}:`, message);

				// COMPLETELY DISABLE RESPONSE - just log
				console.log(
					`[WS Simple] Message received, not sending response to avoid RSV1`
				);
			} catch (error) {
				console.error(
					`[WS Simple] Error processing message from ${clientId}:`,
					error
				);
			}
		});

		// Handle connection close
		ws.on("close", (code, reason) => {
			console.log(
				`[WS Simple] Client ${clientId} disconnected: code=${code}, reason=${reason.toString()}`
			);
			if (heartbeatInterval) clearInterval(heartbeatInterval);
		});

		// Handle errors
		ws.on("error", (error) => {
			console.error(`[WS Simple] Error for client ${clientId}:`, error);
			if (heartbeatInterval) clearInterval(heartbeatInterval);
		});
	});

	wss.on("error", (error) => {
		console.error("[WS Simple] WebSocket server error:", error);
	});
}

export function getSimpleWebSocketServer() {
	return wss;
}

// Default export for compatibility
export default {
	setupSimpleOhlcvWebSocket,
	getSimpleWebSocketServer,
};
