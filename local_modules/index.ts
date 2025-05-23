import express from "express";
import cors from "cors";
import type { Strategy } from "./strategy";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { WebSocketServer } from "ws";
import {
	subscribeOhlcv,
	getCachedOhlcv,
	patchOhlcvBroadcast,
} from "./websocket";
import http from "http";

dotenv.config();

// Dynamic strategy loader
function loadStrategies(): Strategy[] {
	const strategies: Strategy[] = [];
	const strategiesDir = path.join(__dirname, "strategies");
	for (const file of fs.readdirSync(strategiesDir)) {
		if (file.endsWith("_strategy.ts") || file.endsWith("_strategy.js")) {
			const mod = require(path.join(strategiesDir, file));
			for (const key in mod) {
				if (typeof mod[key] === "function" && mod[key].prototype?.run) {
					try {
						const instance = new mod[key]();
						if (instance.name && instance.run) strategies.push(instance);
					} catch {}
				}
			}
		}
	}
	return strategies;
}

// Placeholder for dynamic strategy/model loading
const strategies: Strategy[] = loadStrategies();

// Express API setup
const app = express();
app.use(cors());
app.use(express.json());

// List available strategies
(app as any).get("/api/strategies", (_req: any, res: any) => {
	res.json(
		strategies.map((s) => ({ name: s.name, description: s.description }))
	);
});

// Run a strategy by name
(app as any).post("/api/strategies/:name/run", async (req: any, res: any) => {
	const { name } = req.params;
	const params = req.body;
	const strategy = strategies.find((s) => s.name === name);
	if (!strategy) return res.status(404).json({ error: "Strategy not found" });
	try {
		const result = await strategy.run(params);
		res.json(result);
	} catch (e: any) {
		res.status(500).json({ error: e.message });
	}
});

// Fetch OHLCV data for a symbol/timeframe/limit
(app as any).get("/api/ohlcv", async (req: any, res: any) => {
	try {
		const symbol =
			typeof req.query.symbol === "string" ? req.query.symbol : "BTC/USDT";
		const timeframe =
			typeof req.query.timeframe === "string" ? req.query.timeframe : "4h";
		const limit = req.query.limit ? Number(req.query.limit) : 1000;
		await subscribeOhlcv(symbol, timeframe, limit);
		const ohlcv = getCachedOhlcv(symbol, timeframe, limit);
		if (!ohlcv || !ohlcv.length) {
			return res.status(202).json({
				error:
					"WebSocket not yet connected or no data. Please retry in a few seconds.",
			});
		}
		const result = {
			dates: ohlcv.map((row) => new Date(Number(row[0])).toISOString()),
			open: ohlcv.map((row) => row[1]),
			high: ohlcv.map((row) => row[2]),
			low: ohlcv.map((row) => row[3]),
			close: ohlcv.map((row) => row[4]),
			volume: ohlcv.map((row) => row[5]),
			price: ohlcv.map((row) => row[4]), // for chart compatibility
		};
		res.json({ result });
	} catch (err) {
		if (err instanceof Error) {
			res.status(500).json({ error: err.message });
		} else {
			res.status(500).json({ error: "Failed to fetch OHLCV" });
		}
	}
});

// --- WebSocket server for live OHLCV push ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Map: client -> { symbol, timeframe, limit }
const wsSubscriptions = new Map<
	any,
	{ symbol: string; timeframe: string; limit: number }
>();

wss.on("connection", (ws: any) => {
	ws.on("message", async (msg: string) => {
		try {
			const data = JSON.parse(msg.toString());
			if (data.type === "subscribe" && data.symbol && data.timeframe) {
				const symbol = data.symbol;
				const timeframe = data.timeframe;
				const limit = typeof data.limit === "number" ? data.limit : 1000;
				wsSubscriptions.set(ws, { symbol, timeframe, limit });
				await subscribeOhlcv(symbol, timeframe, limit);
				// Immediately send current cache
				const ohlcv = getCachedOhlcv(symbol, timeframe, limit);
				ws.send(JSON.stringify({ type: "ohlcv", symbol, timeframe, ohlcv }));
			}
			if (data.type === "unsubscribe") {
				wsSubscriptions.delete(ws);
			}
		} catch (err) {
			ws.send(
				JSON.stringify({ type: "error", error: "Invalid message or params" })
			);
		}
	});
	ws.on("close", () => {
		wsSubscriptions.delete(ws);
	});
});

// Broadcast new candles to all subscribed clients
function broadcastOhlcvUpdate(symbol: string, timeframe: string) {
	for (const [ws, sub] of wsSubscriptions.entries()) {
		if (
			sub.symbol === symbol &&
			sub.timeframe === timeframe &&
			ws.readyState === 1
		) {
			const ohlcv = getCachedOhlcv(symbol, timeframe, sub.limit);
			ws.send(JSON.stringify({ type: "ohlcv", symbol, timeframe, ohlcv }));
		}
	}
}

// Patch websocket.ts to call broadcastOhlcvUpdate on new candle
patchOhlcvBroadcast(broadcastOhlcvUpdate);

// Catch-all for unmatched routes (debug)
app.use((req, res) => {
	console.warn(`[404] Unmatched route: ${req.method} ${req.url}`);
	res.status(404).json({ error: "Not found" });
});

// Serve frontend static files (after build)
app.use(express.static(path.join(process.cwd(), "dist")));
// SPA fallback: serve index.html for any unknown route (except API and WS)
app.get("*", (req: any, res: any) => {
	if (req.path.startsWith("/api") || req.path.startsWith("/ws"))
		return res.status(404).end();
	res.sendFile(path.join(process.cwd(), "dist", "index.html"));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
	console.log(
		`Backend API and WebSocket listening on port ${PORT} (try GET /api/ohlcv)`
	);
});

// Example usage (replace with your API keys)
(async () => {
	// const binance = await createBinanceMarginClient('YOUR_API_KEY', 'YOUR_SECRET');
	// console.log(await binance.fetchBalance());
})();
