import express from "express";
import fs from "fs";
import path from "path";
import { subscribeOhlcv, getCachedOhlcv } from "../../websocket";

const loadStrategies = () => {
	const strategies: any[] = [];
	const strategiesDir = path.join(__dirname, "../../strategies");
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

const strategyRoutes = (api: any) => {
	const strategies = express.Router();
	const strategiesData = loadStrategies();

	strategies.get("/strategies", (req, res) => {
		res.json(
			(strategiesData as any[]).map((s) => ({
				name: s.name,
				description: s.description,
			}))
		);
	});

	// @ts-ignore
	strategies.post("/strategies/:name/run", async (req, res) => {
		const { name } = req.params;
		const params = req.body;
		const strategy = strategiesData.find((s) => s.name === name);
		if (!strategy) return res.status(404).json({ error: "Strategy not found" });

		// --- If strategy supports candles param, fetch OHLCV from backend and pass as input ---
		if (
			typeof params.symbol === "string" &&
			typeof params.timeframe === "string"
		) {
			try {
				const limit = params.limit ? Number(params.limit) : 1000;
				const resp = await fetch(
					`http://localhost:3001/api/v1/ohlcv?symbol=${encodeURIComponent(
						params.symbol
					)}&timeframe=${encodeURIComponent(params.timeframe)}&limit=${limit}`
				);
				const ohlcvData = await resp.json();
				if (
					ohlcvData &&
					ohlcvData.result &&
					Array.isArray(ohlcvData.result.dates)
				) {
					const candles = ohlcvData.result.dates.map(
						(d: string, i: number) => ({
							timestamp: new Date(d).getTime(),
							open: ohlcvData.result.open[i],
							high: ohlcvData.result.high[i],
							low: ohlcvData.result.low[i],
							close: ohlcvData.result.close[i],
							volume: ohlcvData.result.volume[i],
						})
					);
					params.candles = candles;
				}
			} catch (e) {
				// fallback: let strategy fetch if backend fails
			}
		}
		Promise.resolve(strategy.run(params))
			.then((result) => res.json(result))
			.catch((e) => res.status(500).json({ error: e.message }));
	});

	// @ts-ignore
	strategies.post("/strategies/:name/config", async (req, res) => {
		const { name } = req.params;
		const params = req.body;
		const strategy = strategiesData.find((s) => s.name === name);
		if (!strategy) return res.status(404).json({ error: "Strategy not found" });
		// Validate config if the strategy has a validateConfig method
		if (
			typeof params.symbol === "string" &&
			typeof params.timeframe === "string"
		) {
			try {
				const limit = params.limit ? Number(params.limit) : 1000;
				const resp = await fetch(
					`http://localhost:3001/api/v1/ohlcv?symbol=${encodeURIComponent(
						params.symbol
					)}&timeframe=${encodeURIComponent(params.timeframe)}&limit=${limit}`
				);
				const ohlcvData = await resp.json();
				if (
					ohlcvData &&
					ohlcvData.result &&
					Array.isArray(ohlcvData.result.dates)
				) {
					const candles = ohlcvData.result.dates.map(
						(d: string, i: number) => ({
							timestamp: new Date(d).getTime(),
							open: ohlcvData.result.open[i],
							high: ohlcvData.result.high[i],
							low: ohlcvData.result.low[i],
							close: ohlcvData.result.close[i],
							volume: ohlcvData.result.volume[i],
						})
					);
					params.candles = candles;
				}
			} catch (e) {
				// fallback: let strategy fetch if backend fails
			}
		}
	});

	// Load strategies and attach API routes
	api.use("/", strategies);
};

export default strategyRoutes;
