import * as express from "express";
import strategyRoutes from "./apiRoutes/routes-strategy";
import indicatorRoutes from "./apiRoutes/routes-indicators";
import performanceRoutes from "./apiRoutes/routes-performance";
import tradingRoutes from "./apiRoutes/routes-trading";

const apiRoutes = (app: express.Application) => {
	const api = express.Router();

	strategyRoutes(api);
	indicatorRoutes(api);
	performanceRoutes(api);
	tradingRoutes(api);

	// Load strategies and attach API routes
	app.use("/api/v1", api);
};

export default apiRoutes;
