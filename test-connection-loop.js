/**
 * Minimal WebSocket Test - Check for Connection Loops
 */

const WebSocket = require("ws");

console.log("=== Minimal WebSocket Connection Test ===");
console.log("Testing for connection loops...\n");

const url = "ws://localhost:3001/ws/ohlcv?symbol=BTC/USDT&timeframe=1h";
let connectionCount = 0;
let messageCount = 0;
let startTime = Date.now();

function connect() {
	connectionCount++;
	console.log(
		`[${
			Date.now() - startTime
		}ms] Attempt ${connectionCount}: Connecting to ${url}`
	);

	const ws = new WebSocket(url);

	ws.on("open", () => {
		console.log(
			`[${
				Date.now() - startTime
			}ms] ✅ Connected successfully (attempt ${connectionCount})`
		);
	});

	ws.on("message", (data) => {
		messageCount++;
		try {
			const message = JSON.parse(data.toString());
			console.log(
				`[${Date.now() - startTime}ms] 📨 Message ${messageCount}: ${
					message.type
				} (${message.updateType || "N/A"})`
			);
		} catch (e) {
			console.log(
				`[${
					Date.now() - startTime
				}ms] 📨 Message ${messageCount}: [Parse Error]`
			);
		}
	});

	ws.on("close", (code, reason) => {
		console.log(
			`[${Date.now() - startTime}ms] 🔌 Connection closed: ${code} - ${
				reason || "No reason"
			}`
		);

		// Only reconnect if it's an unexpected closure and we haven't reached limit
		if (code !== 1000 && code !== 1001 && connectionCount < 3) {
			console.log(
				`[${Date.now() - startTime}ms] ⏳ Will reconnect in 2 seconds...`
			);
			setTimeout(connect, 2000);
		} else {
			console.log(
				`[${
					Date.now() - startTime
				}ms] 🛑 Not reconnecting (code: ${code}, attempts: ${connectionCount})`
			);
		}
	});

	ws.on("error", (error) => {
		console.log(`[${Date.now() - startTime}ms] ❌ Error:`, error.message);
	});
}

// Start the test
connect();

// Auto-terminate after 30 seconds
setTimeout(() => {
	console.log(`\n=== Test Summary (${Date.now() - startTime}ms) ===`);
	console.log(`Connection Attempts: ${connectionCount}`);
	console.log(`Messages Received: ${messageCount}`);
	process.exit(0);
}, 30000);
