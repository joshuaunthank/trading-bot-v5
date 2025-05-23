import { Router } from "express";
import fs from "fs";
import path from "path";
import { subscribeOhlcv, getCachedOhlcv } from "../websocket";

const loadStrategies = () => {
	const strategies: any[] = [];
	const strategiesDir = path.join(__dirname, "../strategies");
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
};

const strategies = loadStrategies();
const api = Router();

api.get("/strategies", (req, res) => {
	res.json(
		(strategies as any[]).map((s) => ({
			name: s.name,
			description: s.description,
		}))
	);
});

// @ts-ignore
api.post("/strategies/:name/run", (req, res) => {
	const { name } = req.params;
	const params = req.body;
	const strategy = strategies.find((s) => s.name === name);
	if (!strategy) return res.status(404).json({ error: "Strategy not found" });
	Promise.resolve(strategy.run(params))
		.then((result) => res.json(result))
		.catch((e) => res.status(500).json({ error: e.message }));
});

api.get("/ohlcv", (req, res) => {
	try {
		const symbol =
			typeof req.query.symbol === "string" ? req.query.symbol : "BTC/USDT";
		const timeframe =
			typeof req.query.timeframe === "string" ? req.query.timeframe : "4h";
		const limit = req.query.limit ? Number(req.query.limit) : 1000;
		Promise.resolve(subscribeOhlcv(symbol, timeframe, limit)).then(() => {
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
		});
	} catch (err) {
		if (err instanceof Error) {
			res.status(500).json({ error: err.message });
		} else {
			res.status(500).json({ error: "Failed to fetch OHLCV" });
		}
	}
});

export default api;
