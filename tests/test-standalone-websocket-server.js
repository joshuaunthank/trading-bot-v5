#!/usr/bin/env node

// Standalone WebSocket server to test RSV1 issue in isolation
const { WebSocketServer } = require("ws");
const http = require("http");

console.log("[Standalone WS] Creating standalone WebSocket server...");

// Create a simple HTTP server
const server = http.createServer((req, res) => {
	res.writeHead(200, { "Content-Type": "text/plain" });
	res.end("WebSocket test server running\n");
});

// Create WebSocket server with minimal configuration
const wss = new WebSocketServer({
	server,
	path: "/test",
	perMessageDeflate: false,
	clientTracking: false,
});

console.log("[Standalone WS] WebSocket server created");

wss.on("connection", function connection(ws, req) {
	const clientId = Math.random().toString(36).substr(2, 5);
	console.log(`[Standalone WS] New client ${clientId} connected`);

	// Stay completely silent initially
	console.log(`[Standalone WS] Client ${clientId} connected, staying silent`);

	ws.on("message", function message(data) {
		console.log(`[Standalone WS] Message from ${clientId}:`, data.toString());
		// Don't send any response
	});

	ws.on("close", function close(code, reason) {
		console.log(
			`[Standalone WS] Client ${clientId} disconnected: ${code} ${reason}`
		);
	});

	ws.on("error", function error(err) {
		console.error(`[Standalone WS] Error for ${clientId}:`, err);
	});
});

wss.on("error", function error(err) {
	console.error("[Standalone WS] Server error:", err);
});

const PORT = 3002;
server.listen(PORT, function listening() {
	console.log(`[Standalone WS] Server listening on http://localhost:${PORT}`);
	console.log(
		`[Standalone WS] WebSocket endpoint: ws://localhost:${PORT}/test`
	);
});

// Keep server running
process.on("SIGINT", () => {
	console.log("[Standalone WS] Shutting down...");
	server.close();
	process.exit(0);
});
