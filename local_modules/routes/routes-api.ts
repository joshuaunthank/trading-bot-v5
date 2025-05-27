import express from "express";
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

const apiRoutes = (app: any) => {
	const api = express.Router();
	const strategies = loadStrategies();

	api.get("/strategies", (req, res) => {
		res.json(
			(strategies as any[]).map((s) => ({
				name: s.name,
				description: s.description,
			}))
		);
	});

	// @ts-ignore
	api.post("/strategies/:name/run", async (req, res) => {
		const { name } = req.params;
		const params = req.body;
		const strategy = strategies.find((s) => s.name === name);
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

	api.get("/ohlcv", async (req, res) => {
		try {
			const symbol =
				typeof req.query.symbol === "string" ? req.query.symbol : "BTC/USDT";
			const timeframe =
				typeof req.query.timeframe === "string" ? req.query.timeframe : "4h";
			const limit = req.query.limit ? Number(req.query.limit) : 1000;
			await Promise.resolve(subscribeOhlcv(symbol, timeframe, limit));
			let ohlcv = getCachedOhlcv(symbol, timeframe, limit);
			if (!ohlcv || !ohlcv.length) {
				res.status(202).json({
					error:
						"WebSocket not yet connected or no data. Please retry in a few seconds.",
				});
				return;
			}

			// Fetch Binance server time
			let serverTime = Date.now();
			try {
				const resp = await fetch("https://api.binance.com/api/v3/time");
				const data = await resp.json();
				if (data && data.serverTime) serverTime = Number(data.serverTime);
			} catch (e) {
				// fallback to local time
			}

			// Only return finalized candles: drop last if it's not finalized
			const msPerCandle = (() => {
				const m = timeframe.match(/(\d+)([mhdw])/);
				if (!m) return 0;
				const n = parseInt(m[1], 10);
				switch (m[2]) {
					case "m":
						return n * 60 * 1000;
					case "h":
						return n * 60 * 60 * 1000;
					case "d":
						return n * 24 * 60 * 60 * 1000;
					case "w":
						return n * 7 * 24 * 60 * 60 * 1000;
					default:
						return 0;
				}
			})();
			let finalizedOhlcv = ohlcv;
			if (ohlcv.length > 1 && msPerCandle > 0) {
				const lastOpen = ohlcv[ohlcv.length - 1][0];
				if (serverTime < lastOpen + msPerCandle) {
					// Last candle is still open, drop it
					finalizedOhlcv = ohlcv.slice(0, -1);
				}
			}

			const result = {
				dates: finalizedOhlcv.map((row) =>
					new Date(Number(row[0])).toISOString()
				),
				open: finalizedOhlcv.map((row) => row[1]),
				high: finalizedOhlcv.map((row) => row[2]),
				low: finalizedOhlcv.map((row) => row[3]),
				close: finalizedOhlcv.map((row) => row[4]),
				volume: finalizedOhlcv.map((row) => row[5]),
				price: finalizedOhlcv.map((row) => row[4]), // for chart compatibility
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

	// Load strategies and attach API routes
	app.use("/api/v1", api);
};

export default apiRoutes;
