import * as express from "express";
import { getAllPerformanceMetrics, getStrategyPerformance } from "../api-utils";

const performanceRoutes = (router: express.Router) => {
	const performance = express.Router();

	// GET /api/v1/performance
	performance.get("/performance", getAllPerformanceMetrics);

	// GET /api/v1/performance/:id
	performance.get("/performance/:id", getStrategyPerformance);

	router.use("/", performance);
};

export default performanceRoutes;
