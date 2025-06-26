import * as express from "express";
import {
	getAllIndicators,
	getIndicatorTypes,
	getIndicatorById,
	createIndicator,
	updateIndicator,
	deleteIndicator,
} from "../api-utils";

const indicatorRoutes = (router: express.Router) => {
	const indicators = express.Router();

	// GET /api/v1/indicators
	indicators.get("/indicators", getAllIndicators);

	// GET /api/v1/indicators/types
	indicators.get("/indicators/types", getIndicatorTypes);

	// GET /api/v1/indicators/:id
	indicators.get("/indicators/:id", getIndicatorById);

	// POST /api/v1/indicators
	indicators.post("/indicators", createIndicator);

	// PUT /api/v1/indicators/:id
	indicators.put("/indicators/:id", updateIndicator);

	// DELETE /api/v1/indicators/:id
	indicators.delete("/indicators/:id", deleteIndicator);

	router.use("/", indicators);
};

export default indicatorRoutes;
