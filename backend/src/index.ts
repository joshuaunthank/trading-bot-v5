import ccxt from "ccxt";
import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import { Strategy } from "./strategy";
import { Model } from "./model";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

// Example: Binance margin trading setup
async function createBinanceMarginClient(apiKey: string, secret: string) {
	const exchange = new ccxt.binance({
		apiKey,
		secret,
		options: { defaultType: "margin" },
		enableRateLimit: true,
	});
	await exchange.loadMarkets();
	return exchange;
}

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
const models: Model[] = [];

// Express API setup
const app = express();
app.use(cors());
app.use(express.json());

// List available strategies
(app as any).get("/api/strategies", (req: any, res: any) => {
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
		const binance = new ccxt.binance({ enableRateLimit: true });
		await binance.loadMarkets();
		const ohlcv = await binance.fetchOHLCV(symbol, timeframe, undefined, limit);
		if (!ohlcv || !ohlcv.length) {
			return res.status(404).json({ error: "No OHLCV data returned" });
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
(app as any).get("/api/ohlcv/", async (req: any, res: any) => {
	try {
		const symbol =
			typeof req.query.symbol === "string" ? req.query.symbol : "BTC/USDT";
		const timeframe =
			typeof req.query.timeframe === "string" ? req.query.timeframe : "4h";
		const limit = req.query.limit ? Number(req.query.limit) : 1000;
		const binance = new ccxt.binance({ enableRateLimit: true });
		await binance.loadMarkets();
		const ohlcv = await binance.fetchOHLCV(symbol, timeframe, undefined, limit);
		if (!ohlcv || !ohlcv.length) {
			return res.status(404).json({ error: "No OHLCV data returned" });
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

// Catch-all for unmatched routes (debug)
app.use((req, res) => {
	console.warn(`[404] Unmatched route: ${req.method} ${req.url}`);
	res.status(404).json({ error: "Not found" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
	console.log(`Backend API listening on port ${PORT} (try GET /api/ohlcv)`);
});

// Example usage (replace with your API keys)
(async () => {
	// const binance = await createBinanceMarginClient('YOUR_API_KEY', 'YOUR_SECRET');
	// console.log(await binance.fetchBalance());
})();
