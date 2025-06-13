#!/usr/bin/env node

const WebSocket = require("ws");

console.log("[Simple Test] Testing WebSocket with different configurations...");

// Test 1: Basic connection with no extensions
console.log("[Test 1] Basic connection test");
const ws1 = new WebSocket("ws://localhost:3001/ws/ohlcv", {
	perMessageDeflate: false,
	extensions: {},
	protocolVersion: 13,
});

ws1.on("open", () => {
	console.log("[Test 1] ✅ Connection opened successfully");
	ws1.close();
});

ws1.on("error", (err) => {
	console.log("[Test 1] ❌ Error:", err.message);
});

ws1.on("close", (code, reason) => {
	console.log(
		`[Test 1] Connection closed: code=${code}, reason=${reason.toString()}`
	);

	// Test 2: Connection with message after delay
	setTimeout(() => {
		console.log("\n[Test 2] Connection with delayed message");
		const ws2 = new WebSocket("ws://localhost:3001/ws/ohlcv", {
			perMessageDeflate: false,
			extensions: {},
		});

		ws2.on("open", () => {
			console.log("[Test 2] ✅ Connection opened");

			// Send message after a longer delay
			setTimeout(() => {
				console.log("[Test 2] Sending message after 2 second delay...");
				try {
					ws2.send("delayed_test_message");
					console.log("[Test 2] ✅ Message sent successfully");

					// Close after another delay
					setTimeout(() => {
						ws2.close();
					}, 1000);
				} catch (error) {
					console.log("[Test 2] ❌ Error sending message:", error.message);
				}
			}, 2000);
		});

		ws2.on("message", (data) => {
			console.log("[Test 2] Received:", data.toString());
		});

		ws2.on("error", (err) => {
			console.log("[Test 2] ❌ Error:", err.message);
		});

		ws2.on("close", (code, reason) => {
			console.log(
				`[Test 2] Connection closed: code=${code}, reason=${reason.toString()}`
			);
			console.log("[Test 2] Test completed");
		});
	}, 1000);
});

// Handle process exit
process.on("SIGINT", () => {
	console.log("\nReceived SIGINT, closing connections...");
	if (ws1.readyState === WebSocket.OPEN) ws1.close();
	process.exit(0);
});
