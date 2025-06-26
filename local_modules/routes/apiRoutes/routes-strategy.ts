import * as express from "express";
import {
	startStrategy,
	stopStrategy,
	pauseStrategy,
	resumeStrategy,
	getAllStrategyStatus,
	getStrategyStatus,
	getAllStrategies,
	getStrategyById,
	createStrategy,
	cloneStrategy,
	updateStrategy,
	deleteStrategy,
	getStrategyPerformance,
	getAllPerformanceMetrics,
} from "../api-utils";

const strategyRoutes = (router: express.Router) => {
	const strategies = express.Router();

	// GET /api/v1/strategies
	strategies.get("/strategies", getAllStrategies);

	// GET /api/v1/strategies/:id
	strategies.get("/strategies/:id", getStrategyById);

	// POST /api/v1/strategies - Create new strategy
	strategies.post("/strategies", createStrategy);

	// POST /api/v1/strategies/:id/clone - Clone existing strategy
	strategies.post("/strategies/:id/clone", cloneStrategy);

	// PUT /api/v1/strategies/:id - Update strategy
	strategies.put("/strategies/:id", updateStrategy);

	// DELETE /api/v1/strategies/:id - Delete strategy
	strategies.delete("/strategies/:id", deleteStrategy);

	// POST /api/v1/strategies/:id/start - Real indicator calculations
	strategies.post("/strategies/:id/start", startStrategy);

	// POST /api/v1/strategies/:id/stop - Real strategy management
	strategies.post("/strategies/:id/stop", stopStrategy);

	// POST /api/v1/strategies/:id/pause - Real strategy management
	strategies.post("/strategies/:id/pause", pauseStrategy);

	// POST /api/v1/strategies/:id/resume - Real strategy management
	strategies.post("/strategies/:id/resume", resumeStrategy);

	// GET /api/v1/strategies/status - Real strategy status
	strategies.get("/strategies/status", getAllStrategyStatus);

	// GET /api/v1/strategies/:id/status - Real strategy status
	strategies.get("/strategies/:id/status", getStrategyStatus);

	// GET /api/v1/strategies/metrics - Get metrics of all strategies
	strategies.get("/strategies/metrics", getAllPerformanceMetrics);

	// GET /api/v1/strategies/:id/metrics - Get metrics of specific strategy
	strategies.get("/strategies/:id/metrics", getStrategyPerformance);

	router.use("/", strategies);
};

export default strategyRoutes;
