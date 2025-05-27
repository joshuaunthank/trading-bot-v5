import express from "express";
import { subscribeOhlcv, getCachedOhlcv } from "../websocket";
import strategyRoutes from "./strategy/routes-strategy";
import indicatorRoutes from "./strategy/routes-indicators";

const apiRoutes = (app: any) => {
	const api = express.Router();

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

	// Initialize strategy routes (side effect)
	strategyRoutes(api);
	indicatorRoutes(api);

	// Load strategies and attach API routes
	app.use("/api/v1", api);
};

export default apiRoutes;
