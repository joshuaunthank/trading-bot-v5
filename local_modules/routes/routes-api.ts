import * as express from "express";
import strategyRoutes from "./strategy/routes-strategy";
import indicatorRoutes from "./strategy/routes-indicators";
import performanceRoutes from "./strategy/routes-performance";
import tradingRoutes from "./trading/routes-trading-with-auth";
import authRoutes from "./auth/routes-auth";
import { optionalAuthentication } from "../utils/authMiddleware";

const apiRoutes = (app: any) => {
	const api = express.Router();

	// OHLCV data is now provided only via WebSocket - no REST endpoint needed

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
