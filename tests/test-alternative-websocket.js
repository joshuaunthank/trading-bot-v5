#!/usr/bin/env node

// Test WebSocket using the built-in Node.js WebSocket client with different configuration
const WebSocket = require("ws");

console.log(
	"[Alternative Client] Testing with different WebSocket configuration"
);

// Try with different WebSocket client options to isolate RSV1 issue
const ws = new WebSocket(
	"ws://localhost:3001/ws/ohlcv?symbol=BTC/USDT&timeframe=1h",
	{
		perMessageDeflate: false, // Disable compression
		maxPayload: 1024, // Small payload limit
		followRedirects: false, // No redirects
		handshakeTimeout: 5000, // 5 second timeout
		protocolVersion: 13, // Explicit WebSocket version
	}
);

let connectionOpen = false;

ws.on("open", function open() {
	console.log("[Alternative Client] Connection opened successfully");
	connectionOpen = true;

	// Wait a moment before sending message
	setTimeout(() => {
		if (connectionOpen) {
			console.log("[Alternative Client] Sending simple string message");
			try {
				// Send the simplest possible message
				ws.send("hello");
				console.log("[Alternative Client] Message sent successfully");
			} catch (error) {
				console.error("[Alternative Client] Error sending message:", error);
			}
		}
	}, 100);

	// Auto close after 3 seconds
	setTimeout(() => {
		if (connectionOpen) {
			console.log("[Alternative Client] Closing connection gracefully");
			ws.close(1000, "Normal closure");
		}
	}, 3000);
});

ws.on("message", function message(data) {
	console.log("[Alternative Client] Received message:", data.toString());
});

ws.on("close", function close(code, reason) {
	connectionOpen = false;
	console.log(
		`[Alternative Client] Connection closed: code=${code}, reason=${reason.toString()}`
	);
});

ws.on("error", function error(err) {
	connectionOpen = false;
	console.error("[Alternative Client] WebSocket error:", err);
	console.log("[Alternative Client] Error details:");
	console.log("  - Error code:", err.code);
	console.log("  - Error message:", err.message);
	console.log("  - Stack trace:", err.stack);
});

// Add a safety timeout
setTimeout(() => {
	if (connectionOpen) {
		console.log("[Alternative Client] Safety timeout - forcing close");
		ws.terminate();
	}
	process.exit(0);
}, 5000);
