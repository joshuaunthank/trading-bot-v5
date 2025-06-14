import * as express from "express";
import { getOHLCVData } from "../utils/websocket-main";
import strategyRoutes from "./strategy/routes-strategy";
import indicatorRoutes from "./strategy/routes-indicators";
import performanceRoutes from "./strategy/routes-performance";
import tradingRoutes from "./trading/routes-trading-with-auth";
import authRoutes from "./auth/routes-auth";
import { optionalAuthentication } from "../utils/authMiddleware";

const apiRoutes = (app: any) => {
	const api = express.Router();

	api.get("/ohlcv", async (req, res) => {
		try {
			const symbol =
				typeof req.query.symbol === "string" ? req.query.symbol : "BTC/USDT";
			const timeframe =
				typeof req.query.timeframe === "string" ? req.query.timeframe : "4h";
			const limit = req.query.limit ? Number(req.query.limit) : 1000;

			// Fetch OHLCV data directly using CCXT
			const ohlcvData = await getOHLCVData(symbol, timeframe, limit);

			console.log(`[OHLCV Data] Received ${ohlcvData?.length || 0} candles`);
			if (ohlcvData && ohlcvData.length > 0) {
				const first = ohlcvData[0];
				const last = ohlcvData[ohlcvData.length - 1];
				console.log(
					`[OHLCV Data] First candle: ${new Date(
						first.timestamp
					).toISOString()} (${first.timestamp})`
				);
				console.log(
					`[OHLCV Data] Last candle: ${new Date(
						last.timestamp
					).toISOString()} (${last.timestamp})`
				);
			}

			if (!ohlcvData || !ohlcvData.length) {
				res.status(202).json({
					error: "No OHLCV data available. Please try again.",
				});
				return;
			}

			// Fetch Binance server time
			let serverTime = Date.now();
			try {
				const resp = await fetch("https://api.binance.com/api/v3/time");
				const data = (await resp.json()) as { serverTime?: number };

				console.log(
					`[System time] Local system time: ${serverTime} (${new Date(
						serverTime
					).toISOString()})`
				);
				console.log(
					`[Binance time] Binance server time: ${data.serverTime} (${new Date(
						data.serverTime || 0
					).toISOString()})`
				);

				if (data && data.serverTime) {
					serverTime = Number(data.serverTime);
					console.log(`[Time sync] Using Binance time: ${serverTime}`);
				} else {
					console.log(`[Time sync] Falling back to system time: ${serverTime}`);
				}
			} catch (e) {
				console.log(
					`[Time sync] Error fetching Binance time, using system time: ${e}`
				);
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

			let finalizedOhlcv = ohlcvData;
			if (ohlcvData.length > 1 && msPerCandle > 0) {
				const lastCandle = ohlcvData[ohlcvData.length - 1];
				console.log(
					`[Time check] Server time: ${serverTime}, Last candle: ${
						lastCandle.timestamp
					}, Candle end: ${lastCandle.timestamp + msPerCandle}`
				);

				if (serverTime < lastCandle.timestamp + msPerCandle) {
					// Last candle is still open, drop it
					console.log(`[Finalization] Dropping last candle as it's still open`);
					finalizedOhlcv = ohlcvData.slice(0, -1);
				} else {
					console.log(`[Finalization] All candles are finalized`);
				}
			}

			console.log(
				`[Final data] Returning ${finalizedOhlcv.length} finalized candles`
			);
			if (finalizedOhlcv.length > 0) {
				console.log(
					`[Final data] First (newest): ${new Date(
						finalizedOhlcv[0].timestamp
					).toISOString()}`
				);
				console.log(
					`[Final data] Last (oldest): ${new Date(
						finalizedOhlcv[finalizedOhlcv.length - 1].timestamp
					).toISOString()}`
				);
			}

			const result = {
				// Array format for chart compatibility
				dates: finalizedOhlcv.map((candle) =>
					new Date(candle.timestamp).toISOString()
				),
				open: finalizedOhlcv.map((candle) => candle.open),
				high: finalizedOhlcv.map((candle) => candle.high),
				low: finalizedOhlcv.map((candle) => candle.low),
				close: finalizedOhlcv.map((candle) => candle.close),
				volume: finalizedOhlcv.map((candle) => candle.volume),
				price: finalizedOhlcv.map((candle) => candle.close), // for chart compatibility
				// Object format for table compatibility
				ohlcv: finalizedOhlcv.map((candle) => ({
					timestamp: candle.timestamp,
					open: candle.open,
					high: candle.high,
					low: candle.low,
					close: candle.close,
					volume: candle.volume,
				})),
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

	app.get(
		"/api/schemas/:type",
		(req: express.Request, res: express.Response) => {
			const type = req.params.type;
			try {
				const schema = require(`../schemas/${type}.schema.json`);
				res.json(schema);
			} catch {
				res.status(404).json({ error: "Schema not found" });
			}
		}
	);

	// Initialize strategy routes (side effect)
	strategyRoutes(api);
	indicatorRoutes(api);

	// Mount performance routes
	api.use("/strategy", performanceRoutes);

	// Mount trading routes
	api.use("/trading", tradingRoutes);

	// Mount auth routes
	api.use("/auth", authRoutes);

	// Load strategies and attach API routes
	app.use("/api/v1", optionalAuthentication, api);
};

export default apiRoutes;
