import * as express from "express";
import {
	getAllIndicators,
	getIndicatorTypes,
	getIndicatorById,
} from "../api-utils";

const indicatorRoutes = (router: express.Router) => {
	const indicators = express.Router();

	// GET /api/v1/indicators
	indicators.get("/indicators", getAllIndicators);

	// GET /api/v1/indicators/types
	indicators.get("/indicators/types", getIndicatorTypes);

	// GET /api/v1/indicators/:id
	indicators.get("/indicators/:id", getIndicatorById);

	indicators.post("/indicators", (req, res) => {
		// create new indicator
		res.json({ message: "New indicator creation will be implemented here." });
	});

	indicators.put("/indicators/:id", (req, res) => {
		// update indicator by ID
		res.json({
			message: `Updating indicator with ID ${req.params.id} will be implemented here.`,
		});
	});

	indicators.delete("/indicators/:id", (req, res) => {
		// delete indicator by ID
		res.json({
			message: `Deleting indicator with ID ${req.params.id} will be implemented here.`,
		});
	});

	router.use("/", indicators);
};

export default indicatorRoutes;
